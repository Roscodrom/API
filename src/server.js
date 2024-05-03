const app = require('./app');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const Partida = require('./api/models/partida');

const server = http.createServer(app);
const io = new Server(server);

const port = process.env.PORT || 80;
server.listen(port, () => console.log(`Escoltant en el port ${port}...`));

class Joc {
  constructor(partidaDuracio, pausaDuracio) {
    let playersInGame = [];
    let playersInQueue = [];
    let roscoLetters = [];
    let gameInfo = {};
    this.partidaDuracio = partidaDuracio;
    this.pausaDuracio = pausaDuracio;
    this.properInici = Date.now() + this.pausaDuracio;
    this.enPartida = false;
    this.iniciarCicle();
  }

  iniciarCicle() {
    setInterval(() => {
      if (this.enPartida) {
        this.endGame(this.playersInGame, this.gameInfo);
        this.properInici = Date.now() + this.partidaDuracio + this.pausaDuracio;
        this.enPartida = false;
      } else {
        this.startGame(this.playersInQueue, this.playersInGame, this.gameInfo);
        this.properInici = Date.now() + this.pausaDuracio;
        this.enPartida = true;
      }
    }, this.enPartida ? this.partidaDuracio : this.pausaDuracio);
  }

  consultaTempsRestant() {
    const tempsRestant = this.properInici - Date.now();
    return { tempsRestant: tempsRestant, enPartida: this.enPartida };
  }

  startGame(playersInQueue, playersInGame, gameInfo) {
    const idCount = Partida.countDocuments;
    this.roscoLetters = generateRosco();
    gameInfo = {
      "tipus": "multijugador",
      "id_partida": idCount + 1,
      "usuaris": {},
      "data_inici": Date.now(),
      "data_fi": None,
      "paraules_puntuades": [],
      "lletres_inici": this.roscoLetters,
      "puntuacio_usuaris": {}
    };
    for (let player of playersInQueue) {
      playersInGame.push(player);
      gameInfo.usuaris[player.nickname] = player.id;
      player.socket.emit('GAME_SATART', { roscoLetters: roscoLetters })
    }
    playersInQueue.splice(0, playersInQueue.length);
    const newPartida = new Partida(gameInfo);
    newPartida.save();
  }

  endGame(playersInGame, gameInfo) {
    for (let player of playersInGame) {
      gameInfo.puntuacio_usuaris[player.nickname] = player.points;
      player.socket.emit('GAME_FINISHED', { points: player.points });
      player.socket.disconnect(true);
    }
    gameInfo.data_fi = Date.now();
    playersInGame.splice(0, playersInGame.length);

    const nuevosDatos = {
      $set: {
        data_fi: Date.now(),
        paraules_puntuades: gameInfo.paraules_puntuades,
        puntuacio_usuaris: gameInfo.puntuacio_usuaris
      }
    };

    Partida.updateOne(
      { id_partida: gameInfo.id_partida },
      nuevosDatos
    )
  }

  generateRosco() {
    lettersList = [];
    return lettersList;
  }
}

const joc = new Joc(60000, 60000);  // 1 minut de partida, 1 minut de pausa

io.on('connection', (socket) => {
  console.log('Usuari connectat');
  socket.emit('HANDSHAKE', { connection: 201 });

  const intervalId = setInterval(() => {
    const resposta = joc.consultaTempsRestant();
    socket.emit('TEMPS_PER_INICI', resposta);
    if (joc.enPartida) {
      socket.emit('PARTIDA_INICIADA', 'La partida ha començat');
    }
  }, 10000);  // Envia el temps restant cada 10 segons

  socket.on('HANDSHAKE', (data) => {
    juego.playersInQueue.push({
      id: data.id,
      socket: socket,
      nickname: data.nickname,
      points: 0
    });
    socket.emit('HANDSHAKE', { connection: 201, message: "Añadido a la lista de espera!" });
  });

  socket.on('TEMPS_PER_INICI', () => {
    const resposta = joc.consultaTempsRestant();
    socket.emit('TEMPS_PER_INICI', resposta);
  });

  socket.onAny((event, ...args) => {
    // if (event !== 'consulta temps' && event !== 'disconnect' && event !== 'connect') {
    //   console.log(`Comanda no reconeguda: ${event}`);
    // const resposta = joc.consultaTempsRestant();
    // socket.emit('TEMPS_PER_INICI', resposta);
  });

  socket.on('PARAULA', (data) => {
    console.log(`Paraula rebuda: ${data.paraula}`);
    socket.emit('PARAULA_REBUDA', `Paraula ${data.paraula} rebuda`);
  });

  socket.on('disconnect', () => {
    console.log('Usuari desconnectat');
    clearInterval(intervalId);  // Atura l'enviament periòdic quan l'usuari es desconnecta
  });
});
