require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const User = require("./model/usermodel");
const Post = require("./model/uploadmodel");

const app = express();
const PORT = process.env.PORT || 5001;


mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/blogApp")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("MongoDB Error:", err));

app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const JWT_SECRET = process.env.JWT_SECRET || "jwtsecretekey";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = file.mimetype.startsWith("image/") ? "uploads/images" : "uploads/videos";
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

app.post("/signup", async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (await User.findOne({ username })) return res.status(400).json({ message: "User already exists" });

    const user = new User(req.body);
    await user.save();
    res.status(201).json({ message: "Signup successful", user });
  } catch (error) {
    res.status(500).json({ message: "Error during signup", error });
  }
});
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(req.body)
    const user = await User.findOne({ username });
    if (!user || user.password !== password) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ message: "Login successful", token, user });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/upload", upload.fields([{ name: "image" }, { name: "video" }]), async (req, res) => {
  try {
    const { title, content } = req.body;
    const imageUrl = req.files.image ? `/uploads/images/${req.files.image[0].filename}` : "";
    const videoUrl = req.files.video ? `/uploads/videos/${req.files.video[0].filename}` : "";

    const newPost = new Post({ title, content, image: imageUrl, video: videoUrl, likes: 0, comments: [] });
    await newPost.save();

    res.status(201).json({ message: "Blog uploaded successfully", post: newPost });
  } catch (error) {
    res.status(500).json({ message: "Error uploading blog", error });
  }
});

app.get("/blogs", async (req, res) => {
  try {
    const blogs = await Post.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ message: "Error fetching blogs" });
  }
});

app.put("/blogs/:id/like", async (req, res) => {
  try {
    const blog = await Post.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    blog.likes += 1;
    await blog.save();

    res.json({ message: "Liked successfully", likes: blog.likes });
  } catch (error) {
    res.status(500).json({ message: "Error liking post" });
  }
});

app.put("/blogs/:id/unlike", async (req, res) => {
  try {
    const blog = await Post.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    if (blog.likes > 0) {
      blog.likes -= 1;
      await blog.save();
    }

    res.json({ message: "Unliked successfully", likes: blog.likes });
  } catch (error) {
    res.status(500).json({ message: "Error unliking post" });
  }
});

app.post("/blogs/:id/comment", async (req, res) => {
  try {
    const { user, text } = req.body;
    const blog = await Post.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    blog.comments.push({ user, text, timestamp: new Date() });
    await blog.save();

    res.status(201).json({ message: "Comment added", comments: blog.comments });
  } catch (error) {
    res.status(500).json({ message: "Error adding comment" });
  }
});

app.delete("/blogs/:id", async (req, res) => {
  try {
    const blog = await Post.findByIdAndDelete(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    res.json({ message: "Blog deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting blog" });
  }
});

app.put("/blogs/:id", async (req, res) => {
  try {
    const { title, content } = req.body;
    const updatedBlog = await Post.findByIdAndUpdate(
      req.params.id,
      { title, content },
      { new: true }
    );

    if (!updatedBlog) return res.status(404).json({ message: "Blog not found" });

    res.json({ message: "Blog updated successfully", blog: updatedBlog });
  } catch (error) {
    res.status(500).json({ message: "Error updating blog" });
  }
});
app.get("/", async(req, res) => {
  const totalData=await User.find()
  res.send(totalData)
});

app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
