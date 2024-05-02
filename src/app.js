const express = require('express');
const fs = require('fs');
const readline = require('readline');
const path = require('path');
const mongoose = require('mongoose');
const dbConfig = require('./config/db');
const Dictionary = require('./api/models/dictionary');
const Usuari = require('./api/models/usuari');
const Partida = require('./api/models/partida');
const Action = require('./api/models/action');
const app = express();
const port = process.env.PORT || 80;

const Schema = mongoose.Schema;
const directoryPath = path.join(__dirname, '../data/dicts');

app.use(express.json());
app.set('json spaces', 2);
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
})

console.log("Creating conneccion to MongoDB...");
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
    console.log("Collections ready to work with them.");

  })
  .catch(err => console.error("Could not connect to MongoDB", err));

// General and example endpoints
app.get('/api/health', (req, res) => {
  console.log(`Recived API request: API health, For: ${req.ip}`);
  res.json({ status: "OK" });
  console.log(`Compleated API request: API health, For: ${req.ip}`);
});

// Endpoints to interact with dictionaris collection
app.get('/api/words/:language/:page', async (req, res) => {
  try {
    const language = req.params.language;
    const page = parseInt(req.params.page) || 1;
    console.log(`Recived API request: Get words of dict ${language} from page ${page}, For: ${req.ip}`);
    const limit = 13;
    const skip = (page - 1) * limit;

    const words = await Dictionary.find({ language: language })
      .skip(skip)
      .limit(limit);

    res.send(words);
    console.log(`Compleated API request: Get words in dict ${language} and page ${page}, For: ${req.ip}`);
  } catch (err) {
    console.log(`Error: ${err}`);
    res.status(500).send(err.message);
  }
});

app.get('/api/letter/:language/:letter', async (req, res) => {
  try {
    const language = req.params.language;
    const letter = req.params.letter;
    console.log(`Recived API request: Get words of dict ${language} statrting from letter ${letter}, For: ${req.ip}`);
    const limit = 13;

    // Find the first word that starts with the letter
    const firstMatch = await Dictionary.findOne({
      language: language,
      word: new RegExp('^' + letter, 'i')
    }).sort({ word: 1 });

    if (!firstMatch) {
      return res.status(404).send('No words found that start with ' + letter);
    }

    // Count the number of words that precede the first match in the sorted list
    const precedingWordsCount = await Dictionary.countDocuments({
      language: language,
      word: { $lt: firstMatch.word }
    });

    // Calculate the page number
    const page = Math.floor(precedingWordsCount / limit) + 1;

    // Get the words for the calculated page
    const words = await Dictionary.find({
      language: language,
      word: { $regex: '^' + letter, $options: 'i', $gte: firstMatch.word },
    })
      .sort({ word: 1 })
      .limit(limit);

    res.send({ 'words': words, 'page': page });
    console.log(`Compleated API request: Get words of dict ${language} statrting from letter ${letter}, For: ${req.ip}`);
  } catch (err) {
    console.log(`Error: ${err}`);
    res.status(500).send(err.message);
  }
});

// Endpoints to interact with users collections
app.get('/api/user/user_list', async (req, res) => {
  try {
    console.log(`Recived API request: Get list of all users, For: ${req.ip}`);
    const users = await Usuari.find({});

    res.json(users);
    console.log(`Compleated API request: Get list of all users, For: ${req.ip}`);
  } catch (err) {
    console.log(`Error: ${err}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/user/register', async (req, res) => {
  try {
    console.log(`Recived API request: Introduce a new user, For: ${req.ip}`);
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
    res.status(201).json({ status: 'OK', message: 'User added', data: { "api_key": "abc123xyz456" } });
    console.log(`Completed API request: Introduce a new user, For: ${req.ip}`);
  } catch (err) {
    console.log(`Error: ${err}`);
    res.status(500).json({ status: 'ERROR', message: err });
  }
});


async function processFile(filePath, language) {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let words = [];
  for await (const line of rl) {
    words.push({ word: line, language: language, times_used: 0 });

    if (words.length >= 500) {
      await Dictionary.insertMany(words);
      words = [];
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
    console.log(`Starting to process: ${files[i]}...`);
    processFile(filePath, language)
      .then(() => console.log(`File processed: ${files[i]}`))
      .catch(err => console.error(err));
  }
}

module.exports = app;
