const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CounterSchema = new Schema({
  _id: { type: String, required: true },
  sequence_value: { type: Number, required: true, default: 0 },
  digits: { type: Number, default: 3 }
});

module.exports = mongoose.model('Counter', CounterSchema);