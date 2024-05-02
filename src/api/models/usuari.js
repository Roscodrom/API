const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
    nickname: String,
    email: String,
    phone_number: String,
    uuid: String,
    api_key: String,
    avatar: String,
    historial_partides: [String],
    configuracions: {
        idioma: String,
        notificacions: Boolean
    }
});

const Usuari = mongoose.model('Usuari', userSchema);

module.exports = Usuari;