const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ProductSchema = new Schema({
  product_name: { type: String, required: true },
  capacity: { type: String },
  quantity: { 
    type: Number,
    min: [0, 'Quantity must be a positive number']
  },
  unit: { type: String }
});

const MaterialSchema = new Schema({
  material_type: { type: String },
  material_quantity: { type: Number, min: [0, 'Material quantity must be a positive number'] },
  material_unit: { type: String },
  chemical_type: { type: String },
  chemical_quantity: { type: Number, min: [0, 'Chemical quantity must be a positive number'] },
  chemical_unit: { type: String }
});

const PurchasedWasteSchema = new Schema({
  waste_type: { type: String },
  quantity: { type: Number, min: [0, 'Quantity must be a positive number'] },
  unit: { type: String }
});

const FuelUsageSchema = new Schema({
  fuel_type: { type: String },
  quantity: { type: Number, min: [0, 'Quantity must be a positive number'] },
  unit: { type: String },
  purpose: { type: String }
});

const WaterUsageSchema = new Schema({
  water_source: { type: String },
  supply_quantity: { type: Number, min: [0, 'Supply quantity must be a positive number'] },
  supply_unit: { type: String },
  supply_purpose: { type: String },
  well_quantity: { type: Number, min: [0, 'Well quantity must be a positive number'] },
  well_unit: { type: String },
  well_purpose: { type: String },
  rain_quantity: { type: Number, min: [0, 'Rain quantity must be a positive number'] },
  rain_unit: { type: String },
  rain_purpose: { type: String },
  recycled_quantity: { type: Number, min: [0, 'Recycled quantity must be a positive number'] },
  recycled_unit: { type: String },
  recycled_purpose: { type: String }
});

const RecycledWasteSchema = new Schema({
  waste_type: { type: String },
  quantity: { type: Number, min: [0, 'Quantity must be a positive number'] },
  unit: { type: String }
});

const WasteGenerationSchema = new Schema({
  industrial_waste: { type: Number, min: [0, 'Industrial waste must be a positive number'] },
  industrial_waste_unit: { type: String },
  hazardous_waste: { type: Number, min: [0, 'Hazardous waste must be a positive number'] },
  hazardous_waste_unit: { type: String },
  total_waste: { type: Number, min: [0, 'Total waste must be a positive number'] },
  total_waste_unit: { type: String },
  collection_cost: { type: Number, min: [0, 'Collection cost must be a positive number'] },
  collection_unit: { type: String },
  collector_name: { type: String },
  collector_address: { type: String },
  collection_note: { type: String }
});

const ResourceRecordSchema = new Schema({
  company_id: { type: String, required: true, ref: 'Company' }, // Liên kết với Company
  record_date: { 
    type: Date, 
    required: true, 
    index: true // Index để hỗ trợ bộ lọc theo thời gian
  },
  products: [ProductSchema],
  materials: [MaterialSchema],
  purchased_waste: [PurchasedWasteSchema],
  fuel_usage: [FuelUsageSchema],
  water_usage: [WaterUsageSchema],
  recycled_waste: [RecycledWasteSchema],
  waste_generation: [WasteGenerationSchema],
  created_at: { type: Date, default: Date.now },
  created_by: { type: String },
  updated_at: { type: Date, default: Date.now },
  updated_by: { type: String }
});

ResourceRecordSchema.index({ company_id: 1, record_date: -1 }); // Index compound để lọc nhanh

module.exports = mongoose.model('ResourceRecord', ResourceRecordSchema);