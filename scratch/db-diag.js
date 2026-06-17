const mongoose = require('mongoose');
require('dotenv').config({ path: '/home/denver/ashad/Study-session/BackEnd/.env' });

async function testConnection() {
  const mongoUri = process.env.MONGO_URI;
  console.log('Testing connection to:', mongoUri);
  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('SUCCESSFULLY CONNECTED TO ATLAS:', conn.connection.host);
    
    // Check if the user rodenver17@gmail.com exists
    const db = conn.connection.db;
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ email: 'rodenver17@gmail.com' });
    console.log('User check result:', user);
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('CONNECTION ERROR:', err);
  }
}

testConnection();
