const mongoose = require('mongoose');

// Defineix l'esquema per User
const UserSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true // Assegura que cada usuari te un ID únic
  },
  displayName: String,
  reputation: Number,
  creationDate: Date,
  location: String,
  aboutMe: String,
});

// Compila i exporta el model User
const User = mongoose.model('User', UserSchema);

module.exports = User;
