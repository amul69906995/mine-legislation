const mongoose = require("mongoose");

mongoose.set("strictQuery", true);

const connectToDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ MongoDB connection established");
  } catch (error) {
    console.error("❌ MongoDB connection failed");
    console.error(error);

    // Exit process if DB fails (important in production)
    process.exit(1);
  }
};

module.exports = connectToDb;