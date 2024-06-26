import { Types } from 'mongoose'
import { PushSubscription } from 'web-push';

export interface ResetToken {
    userId: string | Types.ObjectId,
    token: string,
    createdAt: Date
}

export interface ReqUser {
    user_id: string | Types.ObjectId,
    email: string,
    building: number
}

export interface LoadedPartRecord {
    record: PartRecordSchema,
    by: UserSchema,
    owner?: UserSchema
}

// Database part schema
export interface PartSchema {
    [index: string]: any,
    _id?: any,
    nxid?: string,
    manufacturer?: string,
    name?: string,
    type?: string,
    quantity?: number,
    total_quantity?: number,
    shelf_location?: string,
    rack_num?: number,
    frequency?: number,
    chipset?: string,
    socket?: string | string[],
    size?: string;
    active?: boolean;
    memory_type?: string,
    memory_gen?: string,
    mem_rank?: string,
    peripheral_type?: string,
    mainboard_con?: string,
    storage_interface?: string,
    storage_type?: string|string[],
    capacity?: number,
    capacity_unit?: string,
    num_ports?: number,
    port_type?: string,
    cable_end1?: string,
    cable_end2?: string,
    serialized?: boolean,
    consumable?: boolean
    audited?: string | number | Date,
    notes?: string
}

export interface PartQuery {
    [index: string]: any,
}

export interface AssetSchema {
    [index: string]: any,
    _id?: any,
    asset_tag?: string,
    prev?: string|null | Types.ObjectId,
    next?: string|null | Types.ObjectId,
    building?: number,
    asset_type?: string,
    chassis_type?: string,
    manufacturer?: string,
    model?: string,
    serial?: string,
    rails?: Boolean,
    cheat?: Boolean,
    live?: Boolean,
    in_rack?: Boolean,
    bay?: string | number,
    power_port?: string,
    public_port?: string,
    private_port?: string,
    ipmi_port?: string,
    by?: string | Types.ObjectId,
    sid?: number,
    notes?: string,
    ebay?: string,

    units?: number,
    num_psu?: number,
    psu_model?: string,
    parent?: string,
    cable_type?: string,
    num_bays?: number,
    bay_type?: string,
    pallet?: string,
    fw_rev?: string,
    old_by?: string,
    migrated?: boolean,

    prev_pallet?: string,
    next_pallet?: string,

    date_created?: Date,
    date_updated?: string | number | Date,
    date_replaced?: string | number | Date,
}

export interface PartRecordSchema {
    _id?: any,
    nxid?: string,
    prev?: string|null | Types.ObjectId,
    next?: string|null | Types.ObjectId,
    building?: Number,
    location?: string,
    asset_tag?: string,
    pallet_tag?: string,
    box_tag?: string,
    part_request?: string,
    kit_name?: string,
    serial?: string,
    owner?: string | Types.ObjectId,
    ebay?: string,
    by?: string | Types.ObjectId,
    date_created?: string | number | Date,
    date_replaced?: string | number | Date,
    buy_price?: number,
    sale_price?: number,
    order_id?: string
}

// User state interface
export interface CartItem {
    nxid: string,
    quantity?: number,
    serial?: string,
    location?: string,
    building?: number
}

export interface InventoryEntry {
    nxid?: string,
    unserialized: number,
    serials: string[],
}

// User schema
export interface UserSchema {
    roles?: string[],
    subscriptions?: PushSubscription[],
    date_created?: Date,
    email?: string,
    first_name?: string,
    last_name?: string,
    building?: number,
    password?: string,
    enabled?: boolean,
    _v?: number,
    _id?: any 
}

export type AssetHistory = AssetEvent[]

export interface AssetEvent {
    date_begin: Date,
    asset_id: string | Types.ObjectId,
    by: string | Types.ObjectId,
    info_updated: boolean,
    existing: CartItem[],
    added: CartItem[],
    removed: CartItem[]
}

export interface PalletEvent {
    date_begin: Date,
    pallet_id: string | Types.ObjectId,
    by: string | Types.ObjectId,
    info_updated: boolean,
    existingParts: CartItem[],
    addedParts: CartItem[],
    removedParts: CartItem[],
    existingAssets: string[],
    addedAssets: string[],
    removedAssets: string[]
}

export interface BoxEvent {
    date_begin: Date,
    box_id: string | Types.ObjectId,
    by: string | Types.ObjectId,
    info_updated: boolean,
    existingParts: CartItem[],
    addedParts: CartItem[],
    removedParts: CartItem[],
}

export interface CheckInQueuePart extends CartItem {
  approved?: boolean,
  approvedCount?: number,
  newLocation?: string
}

export interface AssetUpdate {
    asset_tag: string,
    date: Date,
    by: string
}

export interface BoxUpdate {
    box_tag: string,
    date: Date,
    by: string
}

export interface PalletUpdate {
    pallet_tag: string,
    date: Date,
    by: string,
    prevPallet?: string,
    nextPallet?: string
}

export interface PalletSchema {
    _id: Types.ObjectId,
    pallet_tag: string,
    location: string,
    building: number,
    by: string,
    date_created: Date,
    date_replaced: Date,
    notes: string,
    prev: string|null | Types.ObjectId,
    next: string|null | Types.ObjectId,
}

export interface BoxSchema {
    _id?: Types.ObjectId,
    box_tag: string,
    building: number,
    by: string,
    date_created: Date,
    date_replaced: Date,
    notes: string,
    prev: string|null | Types.ObjectId,
    next: string|null | Types.ObjectId,

    location: string,
    prev_location?: string,
    next_location?: string,

}

export interface PartRequestSchema {
    _id?: Types.ObjectId,
    requested_by: string,
    building: number,
    parts: CartItem[],
    fulfilled_list: any[],
    boxes: any[],
    date_created: Date,
    date_fulfilled?: Date,
    fullfilled_by?: string,
    cancelled?: boolean
    build_kit_id?: string,
}

export interface PartOrderSchema {
    _id?: Types.ObjectId,
    building: number,
    per_unit_costs: {nxid: string, cost: number}[],
    // Order info
    ordered_parts: CartItem[],
    created_by: string,
    create_notes: string,
    date_created: Date,
    cancelled: boolean,
    // Received info
    received_by: string,
    received_notes: string,
    date_received: Date,
    received_parts: CartItem[],
}

export interface BuildKitSchema {
    _id?: Types.ObjectId,
    kit_name: string,
    building: number,
    claimed_parts?: CartItem[],
    date_created: Date,
    date_claimed?: Date
    created_by: string,
    requested_by?: string,
    claimed_by?: string,
    notes: string,
    deleted: boolean,
    kiosk: string
}

export enum PushTypes {
    Notification = "Notification",
    Payload = "Payload",
}

export enum NotificationTypes {
  Warning = "Warning",
  Error = "Error",
  Info = "Info",
  Alert = "Alert",
}

export interface Push {
    type: PushTypes
    payload: NotificationSchema | any
}

export interface NotificationSchema {
    user: string,
    type: NotificationTypes,
    text: string,
    date: Date,
    date_read?: Date,
    title?: string,
    link?: string,
}

export interface AuditRecordSchema {
    // NXID of the associated part
    nxid: string,
    building: number,
    // Quantity in the kiosk
    kiosk_quantities: Array<any>,
    // All of the parts in the building?
    total_quantity: number,
    // ID of the user who's request created the part record
    by: string,
    notes: string,
    // Date the part was created
    date: Date,
}
