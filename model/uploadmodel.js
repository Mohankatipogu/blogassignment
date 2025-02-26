const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  user: String,
  text: String,
  createdAt: { type: Date, default: Date.now },
});

const blogSchema = new mongoose.Schema({
  title: String,
  content: String,
  image: String,
  video: String,
  comments: [commentSchema],
  likes: { type: Number, default: 0 }, // ✅ Added likes field
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Blog", blogSchema);
