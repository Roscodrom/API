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

const Dictionary = mongoose.model('Dictionary', dictionarySchema);

mongoose.connect(dbConfig.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");

    const collectionName = Dictionary.collection.collectionName;
    return mongoose.connection.db.listCollections({name: collectionName}).next();
  })
  .then(collection => {
    if (!collection) {
      console.log("Collection does not exist. Inserting words...");
      insertWords();
    } else {
      console.log("Collection already exists.");
    }
  })
  .catch(err => console.error("Could not connect to MongoDB", err));

  
app.get('/api/health', (req, res) => {
  res.json({ status: "OK" });
});

app.use('/api', userRoutes);

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

app.get('/api/words/:language/:page', async (req, res) => {
  try {
    const language = req.params.language;
    const page = parseInt(req.params.page) || 1;
    const limit = 13;
    const skip = (page - 1) * limit;

    const words = await Dictionary.find({ language: language })
      .skip(skip)
      .limit(limit);

    res.send(words);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/api/letter/:language/:letter', async (req, res) => {
  try {
    const language = req.params.language;
    const letter = req.params.letter;
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
    
    res.send({'words': words, 'page': page});
  } catch (err) {
    res.status(500).send(err.message);
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
  for await (const line of rl) {
    words.push({word: line, language: language, times_used: 0});

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
    processFile(filePath, language)
      .then(() => console.log(`File processed: ${files[i]}`))
      .catch(err => console.error(err));
  }
}
