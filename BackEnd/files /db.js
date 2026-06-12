'use strict';

const mongoose = require('mongoose');

/**
 * Connects to MongoDB using the MONGO_URI from .env
 * Called once from server.js at startup.
 * Mongoose maintains the connection pool automatically after this.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // These are the recommended options for Mongoose 8.x
      // (useNewUrlParser and useUnifiedTopology are no longer needed)
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}`);
    // Exit process with failure — no point running without DB
    process.exit(1);
  }
};

// Log subsequent connection events
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB reconnected');
});

module.exports = connectDB;
