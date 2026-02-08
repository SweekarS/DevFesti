import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { addUser, findUserByUsername } from "../db.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Register: POST /auth/register
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    // Check if user exists
    if (findUserByUsername(username)) {
      return res.status(409).json({ error: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Add user
    const user = addUser(username, hashedPassword);
    
    res.status(201).json({ 
      message: "User created", 
      user: { user_id: user.user_id, username: user.username } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login: POST /auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const user = findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Compare password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { user_id: user.user_id, username: user.username },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({ 
      message: "Login successful", 
      token,
      user: { user_id: user.user_id, username: user.username } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
