import mongoose from "mongoose";
import { PartSchema } from "../interfaces.js";

const partSchema = new mongoose.Schema({
    nxid: { type: String, required: true, unique: true },
    manufacturer: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    serialized: { type: Boolean, required: true },
    consumable: { type: Boolean, default: false },
    frequency: { type: Number },
    chipset: { type: String },
    socket: { type: Array<String>||String },
    size: { type: String },
    active: { type: Boolean },
    memory_type: { type: String },
    // new
    memory_gen: { type: String },
    mem_rank: { type: String },
    rack_num: { type: Number },
    shelf_location: { type: String },
    peripheral_type: { type: String },
    mainboard_con: { type: String },
    storage_interface: { type: String },
    storage_type: { type: String },
    capacity: { type: Number },
    capacity_unit: { type: String },
    num_ports: { type: Number },
    port_type: { type: Array<String>||String },
    cable_end1: { type: String },
    cable_end2: { type: String },
    created_by: { type: String, default: null },
    date_created: { type: Date, default: Date.now() },
    threshold: { type: Number, required: true, default: 5 },
    audited: { type: Date },
    notes: { type: String }
});
partSchema.index({
    '$**': 'text',
});
export default mongoose.model<PartSchema>("part", partSchema);
