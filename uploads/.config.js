require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 5001,
  MONGO_URI: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/blogApp",
  JWT_SECRET: process.env.JWT_SECRET || "jwtsecretekey",
};
