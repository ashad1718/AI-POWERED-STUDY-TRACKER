'use strict';

const mongoose = require('mongoose');

/**
 * Connects to MongoDB using the MONGO_URI from .env
 * Called once from server.js at startup.
 * Mongoose maintains the connection pool automatically after this.
 */
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    console.log('🔄 Reusing existing MongoDB connection');
    return;
  }

  try {
    let mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/studyai';
    console.log("MONGO_URI =", process.env.MONGO_URI);

    try {
      // Try to connect to primary MongoDB with a short timeout to fail quickly if down
      console.log("Connecting to:", mongoUri);

      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000,
      });
      console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    } catch (e) {
      console.error("========== MONGODB ERROR ==========");
      console.error("Name:", e.name);
      console.error("Message:", e.message);
      console.error("===================================");

      if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
        console.error("❌ MongoDB connection failed. Memory server fallback disabled in production/Vercel.");
        throw e;
      }

      console.warn(`⚠️ Failed to connect to primary MongoDB at ${mongoUri}. Starting in-memory MongoDB fallback...`);
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
    if (process.env.VERCEL) {
      throw err;
    }
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
