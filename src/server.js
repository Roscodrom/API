const app = require('./app');
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server);

class Joc {
  constructor(partidaDuracio, pausaDuracio) {
    this.partidaDuracio = partidaDuracio;
    this.pausaDuracio = pausaDuracio;
    this.properInici = Date.now() + this.partidaDuracio + this.pausaDuracio;
    this.enPartida = false;
    this.iniciarCicle();
  }

  iniciarCicle() {
    setInterval(() => {
      if (this.enPartida) {
        this.properInici = Date.now() + this.pausaDuracio;
        this.enPartida = false;
      } else {
        this.properInici = Date.now() + this.partidaDuracio + this.pausaDuracio;
        this.enPartida = true;
      }
    }, this.partidaDuracio + this.pausaDuracio);
  }

  consultaTempsRestant() {
    const tempsRestant = this.properInici - Date.now();
    return { tempsRestant, enPartida: this.enPartida };
  }
}

const joc = new Joc(60000, 60000);  // 1 minut de partida, 1 minut de pausa

io.on('connection', (socket) => {
  console.log('Usuari connectat');

  const intervalId = setInterval(() => {
    const resposta = joc.consultaTempsRestant();
    socket.emit('TEMPS_PER_INICI', resposta);
    if (joc.enPartida) {
      socket.emit('PARTIDA_INICIADA', 'La partida ha començat');
  }
  }, 10000);  // Envia el temps restant cada 10 segons

  socket.on('TEMPS_PER_INICI', () => {
    const resposta = joc.consultaTempsRestant();
    socket.emit('TEMPS_PER_INICI', resposta);
  });

  socket.on('ALTA', (data) => {
    console.log('Usuari donat d\'alta');
    socket.emit('ALTA_CONFIRMADA', `Usuari ${data.alta} donat d\'alta`); 
  })

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

const port = process.env.PORT || 80;
server.listen(port, () => console.log(`Escoltant en el port ${port}...`));
