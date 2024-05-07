const app = require('./app');
const WebSocket = require('ws');
const http = require('http');
const mongoose = require('mongoose');
const Partida = require('./api/models/partida');
const Dictionary = require('./api/models/dictionary');
const Action = require('./api/models/action');

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const port = process.env.PORT || 80;
server.listen(port, () => console.log(`Escoltant en el port ${port}...`));

class Joc {
  constructor(partidaDuracio, pausaDuracio) {
    this.flutterConnections = [];
    this.playersInGame = [];
    this.playersInQueue = [];
    this.roscoLetters = [];
    this.gameInfo = {};
    this.countA = 0;
    this.countB = 0;
    this.partidaDuracio = partidaDuracio;
    this.pausaDuracio = pausaDuracio;
    this.properInici = Date.now() + this.pausaDuracio;
    this.enPartida = false;
    this.iniciarCicle();
  }

  async iniciarCicle() {
    this.roscoLetters = this.generateRoscoLetters();
    setInterval(() => {
      if (this.playersInQueue != null && this.playersInQueue.length >= 1 && !this.enPartida) {
        console.log("Iniciando partida");
        this.startGame();
        this.properInici = Date.now() + this.pausaDuracio;
        this.enPartida = true;
      } else if (this.enPartida) {
        console.log("Finalizando partida");
        this.endGame();
        this.properInici = Date.now() + this.partidaDuracio + this.pausaDuracio;
        this.enPartida = false;
      } else {
        this.properInici = Date.now() + this.pausaDuracio;
      }
    }, this.enPartida ? this.partidaDuracio : this.pausaDuracio);
  }

  consultaTempsRestant() {
    const tempsRestant = this.properInici - Date.now();
    return { tempsRestant: tempsRestant, enPartida: this.enPartida };
  }

  async startGame() {
    const idCount = await Partida.countDocuments().exec();
    this.gameInfo = {
      "tipus": "multijugador",
      "id_partida": idCount + 1,
      "usuaris": {},
      "data_inici": Date.now(),
      "data_fi": Date.now(),
      "paraules_puntuades": [],
      "lletres_inici": this.roscoLetters,
      "puntuacio_usuaris": {}
    };
    console.log("Enviando informacion a los jugadores");
    for (let player of this.playersInQueue) {
      this.playersInGame.push(player);
      this.gameInfo.usuaris[player.nickname] = player.id;
      player.socket.send(JSON.stringify({ type: 'GAME_START', data: { roscoLetters: this.roscoLetters } }));
    }
    console.log("Enviando informacion a los espectadores");
    for (let client of this.flutterConnections) {
      client.send(JSON.stringify({ type: 'GAME_INFO', data: { enPartida: joc.enPartida, message: joc.cleanPlayersList() } }));
    }
    this.playersInQueue.splice(0, this.playersInQueue.length);
    console.log("Añadiendo partida a la base de datos");
    const newPartida = new Partida(this.gameInfo);
    await newPartida.save();
  }

  async endGame() {
    console.log("Eliminando a los jugadores de la partida");
    for (let player of this.playersInGame) {
      this.gameInfo.puntuacio_usuaris[player.nickname] = player.points;
      player.socket.send(JSON.stringify({ type: 'GAME_FINISHED', data: { points: player.points } }));
      player.socket.terminate();
    }

    for (let client of this.flutterConnections) {
      client.send(JSON.stringify({ type: 'GAME_FINISHED', data: { enPartida: false, message: joc.cleanPlayersList() } }));
    }

    console.log("Actualizando datos de partida");
    this.gameInfo.data_fi = Date.now();
    this.playersInGame.splice(0, this.playersInGame.length);

    const nuevosDatos = {
      $set: {
        data_fi: Date.now(),
        paraules_puntuades: this.gameInfo.paraules_puntuades,
        puntuacio_usuaris: this.gameInfo.puntuacio_usuaris
      }
    };

    await Partida.updateOne(
      { id_partida: this.gameInfo.id_partida },
      nuevosDatos
    )
  }

  async checkUserWord(player_word) {
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

  generateRosco() {
    console.log("Generando rosco");
    let lettersList = ["E", "A", "O", "I", "N", "Y", "R", "N", "D", "G", "Q"];
    return lettersList;
  }

  generateRoscoLetters() {
    let rosco_letters = [];
    let countVocales = 0;

    for (let i = 0; i < 10; i++) {
      let isVocal = false;
      if (i < 3) { // Las tres primeras letras son vocales
        isVocal = true;
        countVocales++;
      } else if (i < 5) { // Aqui se calcula si hay vocales extra o consonantes extra
        if (countVocales == 3 && Math.random() < 0.5) {
          isVocal = true;
          countVocales++;
        } else if (countVocales == 4 && Math.random() < 0.5) {
          isVocal = true;
          countVocales++;
        }
      }
      rosco_letters[i] = this.getRandomLetter(isVocal, rosco_letters);
    }
    return rosco_letters;
  }

  getRandomLetter(isVocal, rosco_letters) {
    let newLetter = "";
    let letterInRosco = true;
    let badLetter = true;
    let vocales = ["A", "E", "I", "O", "U"];
    let consonantes = [
      "B", "C", "D", "F", "G", "H", "J", "K", "L", "M",
      "N", "NY", "P", "Q", "R", "S", "T", "V", "W", "X", "Z"];

    while (letterInRosco) {
      newLetter = isVocal ? vocales[Math.floor(Math.random() * vocales.length)]
        : consonantes[Math.floor(Math.random() * consonantes.length)];
      letterInRosco = this.checkLettersInRosco(newLetter, rosco_letters);
    }

    return newLetter;
  }

  checkLettersInRosco(newLetter, rosco_letters) {
    for (let letter of rosco_letters) {
      if (letter == newLetter) {
        return true;
      }
    }
    return false;
  }

  cleanPlayersList() {
    let listaDeJugadores = []
    for (let player of this.playersInGame) {
      listaDeJugadores.push({
        nickname: player.nickname,
        points: player.points
      });
    }
    return listaDeJugadores;
  }
}

const joc = new Joc(60000, 60000);  // 1 minut de partida, 1 minut de pausa

wss.on('connection', (socket) => {
  console.log('Usuario conectado');
  const client_id = generateClientId();
  socket.send(JSON.stringify({ type: 'HANDSHAKE', data: { connection: 201 } }));

  const intervalId = setInterval(() => {
    const respuesta = joc.consultaTempsRestant();
    socket.send(JSON.stringify({ type: 'TIEMPO_PARA_INICIO', data: respuesta }));
    if (joc.enPartida) {
      socket.send(JSON.stringify({ type: 'PARTIDA_INICIADA', data: 'La partida ha comenzado' }));
    }
  }, 1000);  // Envía el tiempo restante cada 10 segundos

  socket.on('message', async (message) => {
    const data = JSON.parse(message);

    if (data.type === 'HANDSHAKE') {
      console.log('Handshacke recivido de:');
      if (data.data.client == 'flutter') {
        console.log('Flutter');
        joc.flutterConnections.push(socket);
        if (joc.enPartida) {
          socket.send(JSON.stringify({ type: 'GAME_INFO', data: { enPartida: joc.enPartida, message: joc.cleanPlayersList() } }));
        } else {
          socket.send(JSON.stringify({ type: 'WELLCUM', data: { enPartida: false, message: "Alex guapo!" } }));
        }
      } else {
        console.log('Android');
        joc.playersInQueue.push({
          id: data.data.id,
          socket: socket,
          nickname: data.data.nickname,
          client_id: client_id,
          points: 0
        });
        socket.send(JSON.stringify({ type: 'WELLCUM', data: { connection: 201, message: "Añadido a la lista de espera!" } }));
      }
    }

    else if (data.type === 'TIEMPO_INICIO_ANDROID') {
      console.log("Recivida peticion 'TIEMPO_INICIO_ANDROID'");
      const respuesta = joc.consultaTempsRestant();
      socket.send(JSON.stringify({ type: 'TIEMPO_INICIO_ANDROID', data: respuesta }));
    }

    else if (data.type == 'CHECK_WORD') {
      console.log("Se ha recivido la palabra: " + data.data.word)
      const word_points = await joc.checkUserWord(data.data.word);
      socket.send(JSON.stringify({ type: 'WORD_POINTS', data: { word: data.data.word, points: word_points } }));

      if (word_points != 0) {
        console.log(word_points);
        joc.gameInfo['paraules_puntuades'].push(data.data.word);
        for (player of joc.playersInGame) {
          if (player.client_id == client_id) {
            player.points += word_points;
          } else {
            player.socket.send(JSON.stringify({ type: 'NEW_WORD', data: { word: data.data.word, points: word_points } }));
          }
        }
        for (client of joc.flutterConnections) {
          client.send(JSON.stringify({ type: 'NEW_WORD', data: { word: data.data.word, points: word_points } }));
          client.send(JSON.stringify({ type: 'GAME_INFO', data: { enPartida: joc.enPartida, message: joc.cleanPlayersList() } }));
        }
      }

      // Guardar la accion en mongo
      const newAction = new Action({
        id_partida: joc.gameInfo.id_partida,
        tipus_accio: "paraula",
        uuid_jugador: "",
        data: Date.now(),
        dades_adicionals: {
          paraula_enviada: data.data.word,
          puntuacio_obtinguda: word_points
        }
      });
      await newAction.save();
    }

    else {
      console.log(`Comando no reconocido: ${data.type}`);
    }
  });

  socket.on('close', () => {
    console.log('Usuario desconectado');
    clearInterval(intervalId);  // Detiene el envío periódico cuando el usuario se desconecta
  });
});

function generateClientId() {
  return Math.random().toString(36).substring(7);
}
