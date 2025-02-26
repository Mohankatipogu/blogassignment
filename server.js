require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const User = require("./model/usermodel");
const Post = require("./model/uploadmodel");

const app = express();
const PORT = process.env.PORT || 5001;

// ✅ Improved MongoDB Connection Handling
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: "blogDB", // Optional: Specify DB name
    });
    console.log("✅ MongoDB Connected Successfully");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1); // Stop the app if MongoDB fails to connect
  }
};

connectDB();

// ✅ Middleware
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const JWT_SECRET = process.env.JWT_SECRET || "jwtsecretekey";

// ✅ Multer Storage
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

// ✅ Routes

// 🔹 User Signup
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

// 🔹 User Login
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || user.password !== password) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ message: "Login successful", token, user });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// 🔹 Upload Blog
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

// 🔹 Fetch Blogs
app.get("/blogs", async (req, res) => {
  try {
    const blogs = await Post.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ message: "Error fetching blogs" });
  }
});

// 🔹 Like a Blog
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

// 🔹 Unlike a Blog
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

// 🔹 Add Comment
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

// 🔹 Delete Blog
app.delete("/blogs/:id", async (req, res) => {
  try {
    const blog = await Post.findByIdAndDelete(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });
    res.json({ message: "Blog deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting blog" });
  }
});

// 🔹 Default Route
app.get("/", async (req, res) => {
  const totalData = await User.find();
  res.send(totalData);
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
}).on("error", (err) => {
  console.error("❌ Server Error:", err);
});
