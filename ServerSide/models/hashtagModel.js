const mongoose = require('mongoose');
const { generateId } = require('../utils/autoIncrement');
const Schema = mongoose.Schema;

const HashtagSchema = new Schema({
  hashtag_id: { type: String, unique: true },
  name: { type: String, required: true, unique: true }, // e.g., '#VanDeMoiTruong'
  description: { type: String },
  created_by: { type: String, ref: 'User' },
  created_at: { type: Date, default: Date.now },
  updated_by: { type: String, ref: 'User' },
  updated_at: { type: Date, default: Date.now },
  deleted_by: { type: String, ref: 'User' },
  deleted_at: { type: Date }
});

// Pre-save: Generate id
HashtagSchema.pre('save', async function (next) {
  if (this.isNew && !this.hashtag_id) {
    this.hashtag_id = await generateId('hashtag', 'HASH');
  }
  next();
});

module.exports = mongoose.model('Hashtag', HashtagSchema);