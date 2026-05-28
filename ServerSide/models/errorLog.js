const mongoose = require('mongoose');

const errorLogSchema = new mongoose.Schema({
    message: { type: String, required: true },
    stack: { type: String },
    url: { type: String },
    browser: { type: String },
    screenshot: { type: String }, // Legacy: single Base64 string (backwards compat)
    screenshots: [{ type: String }], // New: array of Base64 strings
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'fixed', 'ignored'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ErrorLog', errorLogSchema);
