const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Connect using only the URI without IP whitelist restrictions
    // Setting serverSelectionTimeoutMS to give more time for connection
    // and useNewUrlParser and useUnifiedTopology to use new connection string parser
    const options = {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of 30
    };
    
    await mongoose.connect(process.env.MONGO_URI, options);
    console.log("MongoDB Connected Successfully");
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
