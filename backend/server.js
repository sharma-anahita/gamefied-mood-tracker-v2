const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const moodRoutes = require('./routes/moodRoutes');

// --- Express App Initialization ---
const app = express();
const PORT = process.env.PORT || 5001;

// --- Middleware ---
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies

// --- MongoDB Connection ---
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('Error: MONGO_URI is not defined. Please check your .env file.');
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server is running on port: ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// --- API Routes ---
// All authentication routes will be prefixed with /api/auth
app.use('/api/auth', authRoutes);

// All mood entry routes will be prefixed with /api/moods
app.use('/api/moods', moodRoutes);

// --- Default Route ---
app.get('/', (req, res) => {
  res.send('Gamified Mood Tracker Backend is running!');
});
