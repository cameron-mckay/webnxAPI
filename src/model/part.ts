import mongoose from "mongoose";
import { PartSchema } from "../app/interfaces.js";

const partSchema = new mongoose.Schema({
    nxid: { type: String, required: true, unique: true },
    manufacturer: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    serialized: { type: Boolean, required: true},
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
    storage_interface: { type: String },
    capacity: { type: Number },
    capacity_unit: { type: String },
    num_ports: { type: Number },
    port_type: { type: String },
    cable_end1: { type: String },
    cable_end2: { type: String },
    created_by: { type: String, default: null },
    date_created: { type: Date, default: Date.now() },
});
partSchema.index({
    'manufacturer': 'text',
    'name': 'text',
    'type': 'text',
    'chipset': 'text',
    'memory_type': 'text',
    'memory_gen': 'text',
    'shelf_location': 'text',
    'peripheral_type': 'text',
    'storage_interface': 'text',
    'port_type': 'text',
    'cable_end1': 'text',
    'cable_end2': 'text',
});
export default mongoose.model<PartSchema>("part", partSchema);
