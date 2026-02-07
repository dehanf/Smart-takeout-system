const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // You can use a local DB or MongoDB Atlas (Cloud)
    // For now, we use a local one named 'jit_logistics'
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/jit_logistics');

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;