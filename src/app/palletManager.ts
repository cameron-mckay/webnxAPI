import { PalletSchema, CartItem, AssetSchema, PartRecordSchema } from "./interfaces.js"
import { Request, Response } from "express";
import handleError from "../config/handleError.js";
import Pallet from "../model/pallet.js";
import { objectSanitize, stringSanitize } from "../config/sanitize.js";
import { isValidObjectId, MongooseError } from "mongoose";
import PartRecord from "../model/partRecord.js";
import Asset from "../model/asset.js";
import { getAddedAndRemoved, isValidAssetTag, partRecordsToCartItemsWithInfoAsync, updatePartsAsync, userHasInInventoryAsync } from "./methods/assetMethods.js";
import { CallbackError } from "mongoose";
import { sanitizeCartItems } from "./methods/partMethods.js";
import callbackHandler from "../middleware/callbackHandlers.js";
import { getNumPages, getPageNumAndSize, getTextSearchParams } from "./methods/genericMethods.js";

function isValidPalletTag(id: string) {
    return /PAL([0-9]{7})+/.test(id)
}

function isLocationValid(location: string) {
    return location && location != ""
}

function cleansePallet(pallet: PalletSchema) {
    let newPallet = {
        pallet_tag: pallet.pallet_tag,
        location: pallet.location,
        building: pallet.building,
        notes: pallet.notes,
        by: pallet.by,
        date_created: pallet.date_created,
        next: pallet.next,
        prev: pallet.prev
    }
    return objectSanitize(newPallet, false) as PalletSchema
}

function returnPallet(res: Response) {
    return (err: MongooseError, pallet: PalletSchema) => {
        if(err) {
            handleError(err)
            return res.status(500).send("API could not handle your request: " + err);
        }
        return res.status(200).json(pallet)
    }
}

function returnPalletSearch(res: Response, numPages: number, numAssets: number) {
    return (err: CallbackError | null, pallets: PalletSchema[])  => {
        if (err) {
            // Database err
            handleError(err)
            return res.status(500).send("API could not handle your request: " + err);
        }
        return res.status(200).json({numPages, numAssets, pallets});
    }
}

export function getPalletSearchRegex(searchString: string) {
    let keywords = [searchString]
    keywords = keywords.concat(searchString.split(" ")).filter((s)=>s!='')
    let searchOptions = [] as any
    let relevanceConditions = [] as any
    // Add regex of keywords to all search options
    keywords.map((key) => {
        // Why was this even here to begin with?
            searchOptions.push({ "pallet_tag": { $regex: key, $options: "i" } })
            relevanceConditions.push({ $cond: [{ $regexMatch: { input: "$pallet_tag", regex: new RegExp(key, "i") } }, 3, 0] })
            searchOptions.push({ "location": { $regex: key, $options: "i" } })
            relevanceConditions.push({ $cond: [{ $regexMatch: { input: "$pallet_tag", regex: new RegExp(key, "i") } }, 3, 0] })
            searchOptions.push({ "notes": { $regex: key, $options: "is" } })
            relevanceConditions.push({ $cond: [{ $regexMatch: { input: "$notes", regex: new RegExp(key, "i") } }, 1, 0] })
    })
    return { regexKeywords: searchOptions, relevanceScore: relevanceConditions }
}

function palletsAreSimilar(pallet1: PalletSchema, pallet2: PalletSchema) {
    let copy1 = JSON.parse(JSON.stringify(pallet1))
    let copy2 = JSON.parse(JSON.stringify(pallet2))
    // Delete unimportant information for comparison
    delete copy1.prev
    delete copy1._id
    delete copy1.next
    delete copy1.date_created
    delete copy1.date_replaced
    delete copy1.date_updated
    delete copy1.by
    delete copy1.__v
    // Delete unimportant information for comparison
    delete copy2.prev
    delete copy2._id
    delete copy2.next
    delete copy2.date_created
    delete copy2.date_replaced
    delete copy2.date_updated
    delete copy2.by
    delete copy2.__v
    // Return results of comparison
    return JSON.stringify(copy1) == JSON.stringify(copy2)
}

function getPalletUpdateDates(pallet_tag: string) {
    return new Promise<Date[]>(async(res)=>{
        let dates = [] as Date[]
        // Get all the dates of asset related events
        dates = dates.concat(await PartRecord.find({pallet_tag}).distinct("date_created") as Date[])
        dates = dates.concat(await PartRecord.find({pallet_tag}).distinct("date_replaced") as Date[])
        dates = dates.concat(await Asset.find({pallet: pallet_tag, prevPallet: { $ne: pallet_tag }}).distinct("date_created") as Date[])
        dates = dates.concat(await Asset.find({pallet: pallet_tag, nextPallet: { $ne: pallet_tag }}).distinct("date_replaced") as Date[])
        dates = dates.concat(await Pallet.find({pallet_tag}).distinct("date_created") as Date[])
        dates = dates.concat(await Pallet.find({pallet_tag}).distinct("date_replaced") as Date[])
        // Get rid of duplicates
        // Sort
        dates = dates.sort((a: Date, b: Date) => { 
            if (a < b)
                return 1
            return -1
        })
        // Get rid of duplicates
        dates = dates
            .filter((d)=>d!=null)
            .map((d)=>d.getTime())
            .filter((date, index, arr) => arr.indexOf(date) === index && date != null)
            .map((d)=>new Date(d))
        res(dates)
    })
}

export function getAddedPartsPallet(pallet_tag: string, date: Date) {
    return PartRecord.aggregate([
        {
            $match: { pallet_tag, date_created: date }
        },
        {
            $group: { 
                _id: { nxid: "$nxid", serial: "$serial", by: "$by" },
                quantity: { $sum: 1 }
            }
        },
        {
            $project: {
                nxid: "$_id.nxid",
                serial: "$_id.serial",
                by: "$_id.by",
                quantity: {$cond: [{$eq: ["$_id.serial", "$arbitraryNonExistentField"]},"$quantity", "$$REMOVE"]}
            }
        }
    ])
}

export function getRemovedPartsPallet(pallet_tag: string, date: Date) {
    return PartRecord.aggregate([
        {
            $match: { pallet_tag, date_replaced: date }
        },
        {
            $group: { 
                _id: { nxid: "$nxid", serial: "$serial", next_owner: "$next_owner" },
                next: { $push: "$next" },
                quantity: { $sum: 1 }
            }
        },
        {
            $project: {
                nxid: "$_id.nxid",
                serial: "$_id.serial",
                next_owner: "$_id.next_owner",
                quantity: {$cond: [{$eq: ["$_id.serial", "$arbitraryNonExistentField"]},"$quantity", "$$REMOVE"]}
            }
        }
    ])
}

export function getExistingPartsPallet(pallet_tag: string, date: Date) {
    return PartRecord.aggregate([
        {
            $match: { pallet_tag, date_created: { $lt: date }, $or: [
                    {date_replaced: null}, 
                    {date_replaced: { $gt: date }}
                ]
            }
        },
        {
            $group: { 
                _id: { nxid: "$nxid", serial: "$serial" },
                quantity: { $sum: 1 }
            }
        },
        {
            $project: {
                nxid: "$_id.nxid",
                serial: "$_id.serial",
                quantity: {$cond: [{$eq: ["$_id.serial", "$arbitraryNonExistentField"]},"$quantity", "$$REMOVE"]}
            }
        }
    ])
}

export function getAddedAssetsPallet(pallet_tag: string, date: Date) {
    return Asset.find({pallet: pallet_tag, date_created: date, prev_pallet: {$ne: pallet_tag} })
}

export function getRemovedAssetsPallet(pallet_tag: string, date: Date) {
    return Asset.find({pallet: pallet_tag, date_replaced: date, next_pallet: {$ne: pallet_tag} })
}

export function getExistingAssetsPallet(pallet_tag: string, date: Date) {
    return Asset.find({pallet: pallet_tag, date_created: { $lt: date }, $or: [
            {date_replaced: null}, 
            {date_replaced: { $gt: date }}
        ]
     })
}

function getPalletEvent(pallet_tag: string, date: Date) {
    return new Promise<void>(async (res)=>{
        // Get part info
        let addedParts = await getAddedPartsPallet(pallet_tag, date)
        let removedParts = await getRemovedPartsPallet(pallet_tag, date)
        let existingParts = await getExistingPartsPallet(pallet_tag, date)
        // Get asset info
        let addedAssets = await getAddedAssetsPallet(pallet_tag, date)
        let removedAssets = await getRemovedAssetsPallet(pallet_tag, date)
        let existingAssets = await getExistingAssetsPallet(pallet_tag, date)
        let by = ""
        // Get current pallet
        let pallet = await Pallet.findOne({pallet_tag, date_created: { $lte: date }, $or: [
            { date_replaced: { $gt: date } },
            { date_replaced: null }
        ]})
        // If pallet was updated
        if(date.getTime()==pallet?.date_created.getTime())
            by = pallet.by

        let added = [] as CartItem[]
        // Remap removed parts, find by attribute
        if(Array.isArray(addedParts))
            added = addedParts.map((a)=>{
                if(by==""&&a.by)
                    by = a.by
                return { nxid: a.nxid, serial: a.serial, quantity: a.quantity } as CartItem
            })
        let removed = [] as CartItem[]
        // Remap removed parts, find by attribute
        if(Array.isArray(removedParts))
            removed = removedParts.map((a)=>{
                if(by==""&&a.next_owner) {
                    by = a.next_owner
                }
                return { nxid: a.nxid, serial: a.serial, quantity: a.quantity } as CartItem
            })
         
        /**
         *
         *
         *  @TODO: find "by" and map parts to cart items
         *
         *
         */
    })
}

function returnPalletHistory(pageNum: number, pageSize: number, res: Response) {
    return async (err: CallbackError, pallet: PalletSchema) => {
        if (err)
            return res.status(500).send("API could not handle your request: " + err);

        let dates = await getPalletUpdateDates(pallet.pallet_tag!)
        let pageSkip = pageSize * (pageNum - 1)
        let totalEvents = dates.length
        
        dates = dates
            .splice(pageSkip, pageSize)
        // Get history
        let history = await Promise.all(dates.map((d)=>{
            return getPalletEvent(pallet.pallet_tag!, d)
        }))
        let pages = Math.ceil(totalEvents/pageSize)
        // Return to client
        res.status(200).json({total: totalEvents, pages, events: history})
    }
}

const palletManager = {

    createPallet: async (req: Request, res: Response) => {
        try {
            // Cleanse pallet
            let pallet = cleansePallet(req.body.pallet as PalletSchema)
            // Get parts on pallet
            let parts = sanitizeCartItems(req.body.parts)
            // Get assets on pallet
            let assets = req.body.assets.map((a: string)=>stringSanitize(a, false)) as string[]
            // Check if input is valid
            if(!pallet||!isValidPalletTag(pallet.pallet_tag)||!isLocationValid(pallet.location))
                return res.status(400).send("Invalid request");
            // Try and find existing pallet
            let existingPallet = await Pallet.findOne({pallet_tag: pallet.pallet_tag})
            // Return error if pallet already exists
            if(existingPallet!=null)
                return res.status(400).send("Pallet already exists.");
            // Get user info
            pallet.by = req.user.user_id as string
            // Get current date
            pallet.date_created = new Date()
            // Create pallet
            Pallet.create(cleansePallet(pallet), async (err, newPallet)=>{
                if(err) {
                    handleError(err)
                    return res.status(500).send("API could not handle your request: " + err);
                }
                let date = newPallet.date_created
                // Create all part records
                let createOptions = {
                    building: newPallet.building,
                    location: "Pallet",
                    pallet_tag: newPallet.pallet_tag,
                    by: req.user.user_id,
                    date_created: date,
                    prev: null,
                    next: null
                }
                await updatePartsAsync(createOptions, {}, parts, true)
                // Create/update all assets on pallet
                await Promise.all(assets.map((a)=>{
                    return new Promise<void>(async (res)=>{
                        // Return if invalid asset tag
                        if(!isValidAssetTag(a))
                            return res()
                        // Check if asset already exists
                        let existingAsset = await Asset.findOne({asset_tag: a, next: null}) as AssetSchema
                        // If asset already exists
                        if(existingAsset) {
                            existingAsset.prev = existingAsset._id
                            delete existingAsset._id
                            delete existingAsset.date_updated
                        }
                        else {
                            // Create new empty asset
                            existingAsset = {
                                asset_tag: a,
                                prev: null,
                                next: null
                            } as AssetSchema
                        }
                        // Delete any locatin details
                        delete existingAsset.public_port;
                        delete existingAsset.private_port;
                        delete existingAsset.ipmi_port;
                        delete existingAsset.power_port;
                        delete existingAsset.sid;
                        existingAsset.in_rack = false
                        // Copy pallet information
                        existingAsset.building = newPallet.building
                        // existingAsset.prev_pallet = existingAsset.pallet
                        existingAsset.pallet = newPallet.pallet_tag
                        existingAsset.date_created = date
                        if(existingAsset.prev!=null)
                            Asset.create(existingAsset, callbackHandler.updateAsset)
                        else
                            Asset.create(existingAsset, callbackHandler.callbackHandleError)
                    })
                }))
            })
        } catch(err) {
            handleError(err)
            return res.status(500).send("API could not handle your request: " + err);
        }
    },

    getPallets: async (req: Request, res: Response) => {
        try {
            // Parse search info
            let { pageSize, pageSkip } = getPageNumAndSize(req)
            // Get asset object from request
            let pallet = cleansePallet(req.query as unknown as PalletSchema);
            pallet.next = null;
            let numAssets = await Pallet.count(pallet)
            let numPages = getNumPages(pageSize, numAssets)
            // Send request to database
            Pallet.find(pallet)
                .skip(pageSkip)
                .limit(pageSize)
                .exec(returnPalletSearch(res, numPages, numAssets))
        } catch(err) {
            handleError(err)
            return res.status(500).send("API could not handle your request: "+err);
        }
    },
    getPalletByID: async (req: Request, res: Response) => {
        try {
            let id = req.query.id as string
            // Check if it is a pallet tag
            if(isValidPalletTag(id))
                Pallet.find({pallet_id: id}, returnPallet(res))
            // Try to find by ID
            else
                Pallet.findById(id, returnPallet(res))
        } catch(err) {
            handleError(err)
            return res.status(500).send("API could not handle your request: " + err);
        }
    },

    searchPallets: async (req: Request, res: Response) => {
        try {
            // Search data
            // Limit
            // Page skip
            let { searchString, pageSize, pageSkip } = getTextSearchParams(req);
            // Find parts
            if(searchString == "") {
                // Count all parts
                let numPallets = await Pallet.count()
                // Calc number of pages
                let numPages = getNumPages(pageSize, numPallets)
                // Get all parts
                Pallet.find({})
                    // Skip - gets requested page number
                    .skip(pageSkip)
                    // Limit - returns only enough elements to fill page
                    .limit(pageSize)
                    // Return search to user
                    .exec(returnPalletSearch(res, numPages, numPallets))
                return
            }
            // Get keyword regex
            let { regexKeywords, relevanceScore } = getPalletSearchRegex(searchString)
            // Create aggregate pipeline query
            let aggregateQuery = [
                {
                    $match: {
                        $or: regexKeywords
                    }
                },
                {
                    $addFields: {
                        relevance: {
                            $sum: relevanceScore
                        }
                    }
                },
                {
                    $sort: { relevance: -1 }
                },
                {
                    $project: { relevance: 0 }
                }
            ] as any
            // Aggregate count
            let countQuery = await Pallet.aggregate(aggregateQuery).count("numPallets")
            // This is stupid but it works
            let numPallets = countQuery.length > 0&&countQuery[0].numPallets ? countQuery[0].numPallets : 0
            // Get num pages
            let numPages = getNumPages(pageSize, numPallets)
            // Find pallets
            Pallet.aggregate(aggregateQuery)
                .skip(pageSkip)
                .limit(pageSize)
                .exec(returnPalletSearch(res, numPages, numPallets))
        } catch (err) {
            handleError(err)
            return res.status(500).send("API could not handle your request: "+err);
        }
    },

    updatePallet: async (req: Request, res: Response) => {
        try {
            // Get data from request body
            let { pallet, parts, correction } = req.body;
            // Check if asset is valid
            if (!isValidPalletTag(pallet.pallet_tag)||!(pallet.pallet_tag)) {
                // Send response if request is invalid
                return res.status(400).send("Invalid request");
            }
            // Save current time for updates
            let current_date = Date.now();
            pallet = pallet as PalletSchema
            // Prep pallet for updates
            pallet.by = req.user.user_id;
            pallet.date_updated = current_date;
            pallet = cleansePallet(pallet)
            // Find an existing pallet
            let existingPallet = await Pallet.findOne({pallet_tag: pallet.pallet_tag, next: null})
            // Check if existing pallet is null
            if(existingPallet==null) {
                // Return error
                return res.status(400).send("Could not find pallet to update");
            }
            // Get part records that are currently on asset
            let existingParts = await PartRecord.find({ pallet_tag: pallet.pallet_tag, next: null})

            let { added, removed, error } = getAddedAndRemoved(parts, existingParts)
            if(error==true)
                return res.status(400).send("Error in updated parts list");
            // Make sure user has parts in their inventory
            if(correction!=true) {
                let hasInventory = await userHasInInventoryAsync(req.user.user_id, added)
                if(!hasInventory)
                    return res.status(400).send("Added parts on request not found in user inventory");
            }
            // Put removed parts into user inventory
            let removedOptions = {
                owner: req.user.user_id,
                building: req.user.building,
                location: "Tech Inventory",
                by: req.user.user_id,
                date_created: current_date,
                next: null,
            } as PartRecordSchema
            // Put added parts on pallet
            let addedOptions = {
                pallet_tag: pallet.pallet_tag,
                building: pallet.building,
                location: "Pallet",
                date_created: current_date,
                by: req.user.user_id,
                next: null,
            } as PartRecordSchema
            // Filter by pallet tag
            let palletSearchOptions = {
                pallet_tag: pallet.pallet_tag,
                next: null
            }
            // Filter by user id
            let userSearchOptions = {
                owner: req.user.user_id,
                next: null
            }
            // Mark removed parts as deleted
            if(correction==true) {
                // Delete removed parts
                delete removedOptions.owner
                removedOptions.location = 'deleted'
                removedOptions.next = 'deleted'
            }
            // Update removed parts
            await updatePartsAsync(removedOptions, palletSearchOptions, removed, false)
            // Update added parts
            await updatePartsAsync(addedOptions, userSearchOptions, added, correction==true ? true : false)
    
            // Update the asset object and return to user before updating parts records
            let getPallet = JSON.parse(JSON.stringify(await Asset.findOne({pallet_tag: pallet.pallet_tag, next: null}))) as PalletSchema
            // Check if pallets are similar
            if(!palletsAreSimilar(pallet, getPallet)) {
                // Pallets are not similar
                delete pallet._id
                pallet.prev = getPallet._id
                pallet.date_created = current_date
                pallet.by = req.user.user_id
                delete pallet.date_updated
                // Create new pallet
                Pallet.create(pallet, (err: CallbackError, new_pallet: PalletSchema) => {
                    if (err) {
                        handleError(err)
                        return res.status(500).send("API could not handle your request: " + err);
                    }
                    // Update old pallet
                    Pallet.findByIdAndUpdate(new_pallet.prev, { next: new_pallet._id, date_replaced: current_date }, returnPallet(res))
                })
            }
            else {
                // Pallets are similar
                // Check if parts were added or removed
                if(added.length>0||removed.length>0) {
                    // If parts were added or removed, set date_updated to current date
                    await Pallet.findByIdAndUpdate(pallet._id, { date_updated: current_date })
                    pallet.date_updated = current_date
                }
                // Return pallet
                res.status(200).json(pallet)
            }
        } catch(err) {
            handleError(err)
            return res.status(500).send("API could not handle your request: "+err);
        }
    },

    getPartsAndAssetsOnPallet: async (req: Request, res: Response) => {
        try {
            // Parse asset_tag
            const pallet_tag = req.query.pallet_tag as string
            // Check if valid
            if (!pallet_tag||!isValidPalletTag(pallet_tag))
                return res.status(400).send("Invalid request");
            // Find all parts records associated with asset tag
            PartRecord.find({pallet_tag, next: null}, async (err: CallbackError, pRecords: PartRecordSchema[]) => {
                // If mongoose returns error
                if (err) {
                    // Handle error
                    handleError(err)
                    // Return to client
                    return res.status(500).send("API could not handle your request: " + err);
                }
                let { parts, records } = await partRecordsToCartItemsWithInfoAsync(pRecords)
                // Return to client
                Asset.find({pallet: pallet_tag, next: null}, (err: CallbackError, assets: AssetSchema[]) => {
                    // If mongoose returns error
                    if (err) {
                        // Handle error
                        handleError(err)
                        // Return to client
                        return res.status(500).send("API could not handle your request: " + err);
                    }
                    res.status(200).json({parts, records, assets})
                })
            })
        } catch(err) {
            handleError(err)
            return res.status(500).send("API could not handle your request: " + err);
        }
    },

    deletePallet: async (req: Request, res: Response) => {

    },
    
    getPalletHistory: async (req: Request, res: Response) => {
        try {
            // Get ID from query string
            let id = req.query.id as string
            // Get page num and page size
            let { pageNum, pageSize } = getPageNumAndSize(req)
            // Check if ID is null or doesn't match ID type
            if (!id||(!isValidPalletTag(id)&&!isValidObjectId(id)))
                return res.status(400).send("Invalid request");
            // If NXID
            if (isValidPalletTag(id)) {
                Pallet.findOne({pallet_tag: id, next: null}, returnPalletHistory(pageNum, pageSize, res))
            }
            // If mongo ID
            else {
                Pallet.findById(id, returnPalletHistory(pageNum, pageSize, res))
            }
        } catch (err) {
            handleError(err)
            return res.status(500).send("API could not handle your request: " + err);
        }
    }
}

export default palletManager
