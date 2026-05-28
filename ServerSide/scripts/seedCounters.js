const mongoose = require('mongoose');
const Counter = require('./models/counterModel');
require('dotenv').config();

const seedCounters = async () => {
  try {
    await mongoose.connect(process.env.ATLAS_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB Atlas');

    const counters = [
      { _id: 'admin', sequence_value: 0 },   // AM001
      { _id: 'manager', sequence_value: 0 }, // MG001
      { _id: 'kcn', sequence_value: 0 },     // KCN001
      { _id: 'kcx', sequence_value: 0 }      // KCX001
    ];

    for (const counter of counters) {
      const existingCounter = await Counter.findById(counter._id);
      if (!existingCounter) {
        await Counter.create(counter);
        console.log(`Counter ${counter._id} initialized`);
      }
    }
  } catch (error) {
    console.error('Error seeding counters:', error);
  } finally {
    await mongoose.connection.close();
  }
};

// seedCounters();