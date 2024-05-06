const Dictionary = require('../models/dictionary');

async function checkUserWord(player_word) {
    const resultado = await Dictionary.findOne({ word: player_word });
    if (resultado) {
        console.log(`La palabra "${player_word}" existe en el diccionario.`);
        let word_points = 0;
        for (let letter of player_word) {
            if ("EAIRSNOTLU".indexOf(letter) != -1) {
                word_points += 1;
            } else if ("CDM".indexOf(letter) != -1) {
                word_points += 2;
            } else if ("BGP".indexOf(letter) != -1) {
                word_points += 3;
            } else if ("FV".indexOf(letter) != -1) {
                word_points += 4;
            } else if ("HJQZ".indexOf(letter) != -1) {
                word_points += 8;
            } else {
                word_points += 10;
            }
        }
        return word_points * Math.floor(player_word.length / 2);
    } else {
        console.log(`La palabra "${player_word}" no existe en el diccionario.`);
        return 0;
    }
}