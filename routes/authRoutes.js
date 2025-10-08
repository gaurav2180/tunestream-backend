const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs-extra");
const path = require("path");

const USERS_FILE = path.join(__dirname, "../data/users.json");
const LIKED_SONGS_FILE = path.join(__dirname, "../data/likedSongs.json"); 
const JWT_SECRET = "tunestream_secret_key_2025"; 

fs.ensureDirSync(path.dirname(USERS_FILE));

const loadUsers = () => {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return fs.readJsonSync(USERS_FILE);
    }
    return [];
  } catch (error) {
    return [];
  }
};

const saveUsers = (users) => {
  fs.writeJsonSync(USERS_FILE, users, { spaces: 2 });
};

const loadLikedSongs = () => {
  try {
    if (fs.existsSync(LIKED_SONGS_FILE)) {
      return fs.readJsonSync(LIKED_SONGS_FILE);
    }
    return {};
  } catch (error) {
    return {};
  }
};

const saveLikedSongs = (likedSongs) => {
  fs.writeJsonSync(LIKED_SONGS_FILE, likedSongs, { spaces: 2 });
};

router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // Validation
    if (!fullName || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const users = loadUsers();

    // Check if user already exists
    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = {
      id: Date.now().toString(),
      fullName,
      email,
      password: hashedPassword,
      profilePicture: null,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);

    // INITIALIZE EMPTY LIKED SONGS FOR NEW USER
    const likedSongs = loadLikedSongs();
    if (!likedSongs[newUser.id]) {
      likedSongs[newUser.id] = [];
      saveLikedSongs(likedSongs);
      console.log(`Initialized empty liked songs for new user: ${newUser.id}`);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = newUser;

    res.json({
      message: "Registration successful",
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Server error during registration" });
  }
});

// Login route - UPDATED TO ALSO INITIALIZE LIKED SONGS IF MISSING
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const users = loadUsers();

    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Update last login
    user.lastLogin = new Date().toISOString();
    saveUsers(users);

    // ENSURE LIKED SONGS EXISTS FOR EXISTING USERS (backward compatibility)
    const likedSongs = loadLikedSongs();
    if (!likedSongs[user.id]) {
      likedSongs[user.id] = [];
      saveLikedSongs(likedSongs);
      console.log(`Initialized liked songs for existing user: ${user.id}`);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: "Login successful",
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error during login" });
  }
});

// Verify token middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: "Invalid token" });
  }
};

// Get current user profile
router.get("/profile", verifyToken, (req, res) => {
  try {
    const users = loadUsers();
    const user = users.find(u => u.id === req.user.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Update user profile
router.put("/profile", verifyToken, async (req, res) => {
  try {
    const { fullName, currentPassword, newPassword } = req.body;
    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === req.user.userId);

    if (userIndex === -1) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = users[userIndex];

    // Update full name
    if (fullName) {
      user.fullName = fullName;
    }

    // Update password if provided
    if (currentPassword && newPassword) {
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters" });
      }

      user.password = await bcrypt.hash(newPassword, 10);
    }

    user.updatedAt = new Date().toISOString();
    saveUsers(users);

    const { password: _, ...userWithoutPassword } = user;
    res.json({
      message: "Profile updated successfully",
      user: userWithoutPassword
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Verify token route
router.get("/verify", verifyToken, (req, res) => {
  res.json({ 
    valid: true, 
    user: { 
      userId: req.user.userId, 
      email: req.user.email 
    } 
  });
});

module.exports = router;
