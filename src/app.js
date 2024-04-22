const express = require('express');
const fs = require('fs');
const readline = require('readline');
const path = require('path');
const mongoose = require('mongoose');
const dbConfig = require('./config/db');
const userRoutes = require('./api/routes/userRoutes');
const Event = require('./api/models/event');
const app = express();
const port = process.env.PORT || 3000;

const Schema = mongoose.Schema;
const directoryPath = path.join(__dirname, '../data/dicts');

app.use(express.json());
app.set('json spaces', 2);
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
})

const dictionarySchema = new Schema({
  word: String,
  language: String,
  times_used: Number
});

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

const Dictionary = mongoose.model('Dictionary', dictionarySchema);
const Usuari = mongoose.model('Usuari', userSchema);

mongoose.connect(dbConfig.MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB");

    // Get an array with all the collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    let collectionsDict = {};

    // Get us collections names
    const userCollectionName = Usuari.collection.collectionName;
    const dictionaryCollectionName = Dictionary.collection.collectionName;

    // Check for all the collections data and save it in a dictionary
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;

      const collectionDetails = await mongoose.connection.db.listCollections({ name: collectionName }).next();
      collectionsDict[collectionName] = collectionDetails;
    }

    // Check if all the collections are createds
    console.log("Check if all the collection are created")
    if (!(dictionaryCollectionName in collectionsDict)) {
      console.log("Collection dictionay does not exist. Inserting words...");
      insertWords();
    }
    if (!(userCollectionName in collectionsDict)) {
      console.log("Collection usuari does not exist. Inserting user...");
      const firstUsuari = new Usuari({
        "nickname": "Usuari1",
        "email": "usuari1@example.com",
        "phone_number": "+34612345678",
        "uuid": "ASDF097A9FSDHLUOIPFADA709870AFD",
        "api_key": "abc123xyz456",
        "avatar": "url_a_imatge",
        "historial_partides": ["id_partida1", "id_partida2"],
        "configuracions": {
          "idioma": "català",
          "notificacions": true
        }
      });
      try {
        await firstUsuari.save();
        console.log("Collection usuaris created!");
      } catch (error) {
        console.error("Error saving new user:", error);
      }
    }
    console.log("Collection ready to work with them.");

  })
  .catch(err => console.error("Could not connect to MongoDB", err));

app.use('/api', userRoutes);

// General and example endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: "OK" });
});

app.post('/api/events', async (req, res) => {
  try {
    const event = new Event(req.body);
    await event.save();
    res.status(201).send(event);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

app.get('/api/events/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).send("L'esdeveniment no s'ha trobat.");
    }
    res.send(event);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Endpoints to interact with dictionaris collection
app.get('/api/words/:language', async (req, res) => {
  try {
    const language = req.params.language;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const words = await Dictionary.find({ language: language })
      .skip(skip)
      .limit(limit);

    res.send(words);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Endpoints to interact with users collections
app.get('/api/user/user_list', async (req, res) => {
  try {
    const users = await Usuari.find({});

    res.json(users);
  } catch (err) {
    console.error('Error retrieving user list:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/user/register', async (req, res) => {
  try {
    const userData = req.body;
    const newUser = new Usuari({
      "nickname": userData.name,
      "email": userData.email,
      "phone_number": userData.phone_number,
      "uuid": "ASDF097A9FSDHLUOIPFADA709870AFD",
      "api_key": "abc123xyz456",
      "avatar": userData.avatar,
      "historial_partides": [],
      "configuracions": {
        "idioma": "català",
        "notificacions": true
      }
    });

    // Add the user to the data base
    await newUser.save();
    console.log('User added:\n' + newUser)
    res.status(201).json({ status: 'OK', message: 'User added', data: { "api_key": "abc123xyz456" } });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ status: 'ERROR', message: err });
  }
});

module.exports = app;

async function processFile(filePath, language) {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let words = [];
  let count = 0;
  for await (const line of rl) {
    words.push({ word: line, language: language, times_used: 0 });

    if (words.length >= 500) {
      await Dictionary.insertMany(words);
      words = [];
      count += 1;
    }
    if (count >= 10) {
      console.log('Pushed arround ' + count * 10);
    }
  }

  if (words.length > 0) {
    await Dictionary.insertMany(words);
  }
}

function insertWords() {
  const files = fs.readdirSync(directoryPath);

  for (let i = 0; i < files.length; i++) {
    const filePath = path.join(directoryPath, files[i]);
    const language = files[i].split('_')[0];
    console.log(`Starting to process: ${files[i]}`);
    processFile(filePath, language)
      .then(() => console.log(`File processed: ${files[i]}`))
      .catch(err => console.error(err));
  }
}
