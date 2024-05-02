const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const partidaSchema = new Schema({
    tipus: String,
    id_partida: Number,
    usuaris: {
        String: String
    },
    data_inici: Date,
    data_fi: Date,
    paraules_puntuades: [String],
    lletres_inici: [String],
    puntuacio_usuaris: {
        String: String
    },
});

const Partida = mongoose.model('Partida', partidaSchema);

module.exports = Partida;