const express = require("express");
const router = express.Router();
const musicService = require("../services/musicService");

// Search songs
router.get("/songs", async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    if (q.length < 2) {
      return res.status(400).json({ error: "Query must be at least 2 characters long" });
    }

    const songs = await musicService.searchSongs(q, parseInt(limit));
    res.json(songs);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

// Search suggestions (autocomplete)
router.get("/suggestions", async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }

    // Simple suggestions based on popular artists/songs
    const suggestions = [
      "Coldplay", "Ed Sheeran", "The Beatles", "Queen", "Adele",
      "Taylor Swift", "Bruno Mars", "Eminem", "Drake", "Rihanna"
    ].filter(item => 
      item.toLowerCase().includes(q.toLowerCase())
    ).slice(0, 5);

    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: "Failed to get suggestions" });
  }
});

module.exports = router;
