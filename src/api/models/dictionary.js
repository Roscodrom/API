const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const dictionarySchema = new Schema({
    word: String,
    language: String,
    times_used: Number
});

const Dictionary = mongoose.model('Dictionary', dictionarySchema);

module.exports = Dictionary;