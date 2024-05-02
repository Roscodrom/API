const mongoose = require('mongoose');

const actionSchema = new Schema({
    id_partida: Number,
    tipus_accio: String,
    uuid_jugador: String,
    data: Date,
    dades_adicionals: {
        paraula_enviada: String,
        puntuacio_obtinguda: Number
    }
});

const Action = mongoose.model('Action', actionSchema);

module.exports = Action;