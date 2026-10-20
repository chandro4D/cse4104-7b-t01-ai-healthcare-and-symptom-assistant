const mongoose = require("mongoose");

const connectDB = async (retries = 5, delay = 3000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 MongoDB connection attempt ${attempt}/${retries}...`);

      const conn = await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
      });

      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

      return conn;
    } catch (error) {
      console.error(
        `❌ MongoDB Connection Failed (attempt ${attempt}/${retries}):`,
        error.message,
      );

      if (attempt === retries) {
        throw error;
      }

      console.log(`⏳ Retrying in ${delay / 1000} seconds...`);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

module.exports = connectDB;
