'use strict';

const mongoose = require('mongoose');

/**
 * Connects to MongoDB using the MONGO_URI from .env
 * Called once from server.js at startup.
 * Mongoose maintains the connection pool automatically after this.
 */
const connectDB = async () => {
  try {
    let mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/studyai';
    
    try {
      // Try to connect to primary MongoDB with a short timeout to fail quickly if down
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 2000,
      });
      console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    } catch (err) {
      console.warn(`⚠️  Failed to connect to primary MongoDB at ${mongoUri}. Starting in-memory MongoDB fallback...`);
      
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create({
        instance: {
          dbName: 'studyai',
        },
      });
      
      mongoUri = mongoServer.getUri();
      process.env.MONGO_URI = mongoUri;
      
      const conn = await mongoose.connect(mongoUri);
      console.log(`✅ In-memory MongoDB connected: ${conn.connection.host} (${mongoUri})`);
      
      mongoose.connection.mongoServer = mongoServer;
    }
  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}`);
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

mongoose.connection.on('close', async () => {
  if (mongoose.connection.mongoServer) {
    await mongoose.connection.mongoServer.stop();
    console.log('🛑 In-memory MongoDB server stopped');
  }
});

module.exports = connectDB;
