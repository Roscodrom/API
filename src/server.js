const app = require('./app');
const WebSocket = require('ws');
const http = require('http');
const mongoose = require('mongoose');
const Partida = require('./api/models/partida');

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

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
      if (this.playersInQueue != null && this.playersInQueue.length >= 1 && !this.enPartida) {
        this.startGame();
        this.properInici = Date.now() + this.pausaDuracio;
        this.enPartida = true;
      } else if (this.enPartida) {
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

  startGame() {
    const idCount = Partida.countDocuments;
    this.roscoLetters = this.generateRosco();
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
    for (let player of this.playersInQueue) {
      this.playersInGame.push(player);
      this.gameInfo.usuaris[player.nickname] = player.id;
      player.socket.send(JSON.stringify({ type: 'GAME_START', data: { roscoLetters: this.roscoLetters } }));
    }
    this.playersInQueue.splice(0, this.playersInQueue.length);
    const newPartida = new Partida(this.gameInfo);
    newPartida.save();
  }

  endGame() {
    for (let player of this.playersInGame) {
      this.gameInfo.puntuacio_usuaris[player.nickname] = player.points;
      player.socket.send(JSON.stringify({ type: 'GAME_FINISHED', data: { points: player.points } }));
      player.socket.terminate();
    }
    this.gameInfo.data_fi = Date.now();
    this.playersInGame.splice(0, this.playersInGame.length);

    const nuevosDatos = {
      $set: {
        data_fi: Date.now(),
        paraules_puntuades: this.gameInfo.paraules_puntuades,
        puntuacio_usuaris: this.gameInfo.puntuacio_usuaris
      }
    };

    Partida.updateOne(
      { id_partida: this.gameInfo.id_partida },
      nuevosDatos
    )
  }

  generateRosco() {
    let lettersList = [];
    return lettersList;
  }
}

const joc = new Joc(60000, 60000);  // 1 minut de partida, 1 minut de pausa

wss.on('connection', (socket) => {
  console.log('Usuario conectado');
  socket.send(JSON.stringify({ type: 'HANDSHAKE', data: { connection: 201 } }));

  const intervalId = setInterval(() => {
    const respuesta = joc.consultaTiempoRestante();
    socket.send(JSON.stringify({ type: 'TIEMPO_PARA_INICIO', data: respuesta }));
    if (joc.enPartida) {
      socket.send(JSON.stringify({ type: 'PARTIDA_INICIADA', data: 'La partida ha comenzado' }));
    }
  }, 10000);  // Envía el tiempo restante cada 10 segundos

  socket.on('message', (message) => {
    const data = JSON.parse(message);
    if (data.type === 'HANDSHAKE') {
      joc.playersInQueue.push({
        id: data.data.id,
        socket: socket,
        nickname: data.data.nickname,
        points: 0
      });
      socket.send(JSON.stringify({ type: 'HANDSHAKE', data: { connection: 201, message: "Añadido a la lista de espera!" } }));
    } else if (data.type === 'TIEMPO_PARA_INICIO') {
      const respuesta = joc.consultaTiempoRestante();
      socket.send(JSON.stringify({ type: 'TIEMPO_PARA_INICIO', data: respuesta }));
    } else {
      // Comando no reconocido
      console.log(`Comando no reconocido: ${data.type}`);
    }
  });

  socket.on('close', () => {
    console.log('Usuario desconectado');
    clearInterval(intervalId);  // Detiene el envío periódico cuando el usuario se desconecta
  });
});
