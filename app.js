const mongoose = require("mongoose");
mongoose.set("strictQuery", true); // A

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
      // userCreateIndex: true,
    });
    console.log("MongoDB is connected");
  } catch (error) {
    console.log(error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
