const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AbbreviationSchema = new Schema({
    _id: { type: String, required: true}, //Mã viết tắt
    name_group: { type: String, required: true}
})

module.exports = mongoose.model('Abbreviation', AbbreviationSchema);