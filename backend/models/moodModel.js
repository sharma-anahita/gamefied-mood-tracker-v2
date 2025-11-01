const mongoose = require('mongoose');

const moodEntrySchema = new mongoose.Schema({
  // --- Link to the User ---
  // This is the crucial part for a multi-user app.
  // It stores the unique ID of the user who created this entry.
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User', // This links it to the 'User' model
  },
  mood: {
    type: String,
    required: [true, 'Mood is required'],
    enum: ['happy', 'good', 'neutral', 'sad', 'upset'],
  },
  journal: {
    type: String,
    trim: true,
    default: '',
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now,
  },
}, {
  timestamps: true
});

const MoodEntry = mongoose.model('MoodEntry', moodEntrySchema);

module.exports = MoodEntry;
