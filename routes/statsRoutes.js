const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');

const STATS_FILE = path.join(__dirname, '../data/userStats.json');

// Ensure data directory exists
fs.ensureDirSync(path.dirname(STATS_FILE));

const loadStats = () => {
  try {
    return fs.existsSync(STATS_FILE) ? fs.readJsonSync(STATS_FILE) : {};
  } catch (error) {
    return {};
  }
};

const saveStats = (stats) => {
  fs.writeJsonSync(STATS_FILE, stats, { spaces: 2 });
};

// Track play
router.post('/track-play', (req, res) => {
  try {
    const { userId, songId, duration = 0 } = req.body;
    
    if (!userId || !songId) {
      return res.status(400).json({ error: 'userId and songId required' });
    }

    const stats = loadStats();
    
    if (!stats[userId]) {
      stats[userId] = {
        songsPlayed: 0,
        totalListeningTime: 0,
        artistsDiscovered: new Set(),
        lastActivity: new Date().toISOString()
      };
    }

    stats[userId].songsPlayed += 1;
    stats[userId].totalListeningTime += duration;
    stats[userId].lastActivity = new Date().toISOString();

    saveStats(stats);
    
    console.log(`📊 Play tracked: User ${userId} played song ${songId}`);
    res.json({ success: true, message: 'Play tracked successfully' });
  } catch (error) {
    console.error('Error tracking play:', error);
    res.status(500).json({ error: 'Failed to track play' });
  }
});

// Track artist
router.post('/track-artist', (req, res) => {
  try {
    const { userId, artist } = req.body;
    
    if (!userId || !artist) {
      return res.status(400).json({ error: 'userId and artist required' });
    }

    const stats = loadStats();
    
    if (!stats[userId]) {
      stats[userId] = {
        songsPlayed: 0,
        totalListeningTime: 0,
        artistsDiscovered: new Set(),
        lastActivity: new Date().toISOString()
      };
    }

    // Convert Set to Array for JSON storage
    if (stats[userId].artistsDiscovered instanceof Set) {
      stats[userId].artistsDiscovered = Array.from(stats[userId].artistsDiscovered);
    }
    if (!Array.isArray(stats[userId].artistsDiscovered)) {
      stats[userId].artistsDiscovered = [];
    }

    // Add artist if not already discovered
    if (!stats[userId].artistsDiscovered.includes(artist)) {
      stats[userId].artistsDiscovered.push(artist);
    }

    saveStats(stats);
    
    console.log(`🎤 Artist tracked: User ${userId} discovered ${artist}`);
    res.json({ success: true, message: 'Artist tracked successfully' });
  } catch (error) {
    console.error('Error tracking artist:', error);
    res.status(500).json({ error: 'Failed to track artist' });
  }
});

// Get user stats
router.get('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const stats = loadStats();
    
    const userStats = stats[userId] || {
      songsPlayed: 0,
      totalListeningTime: 0,
      artistsDiscovered: [],
      lastActivity: null
    };

    // Ensure artistsDiscovered is array
    if (!Array.isArray(userStats.artistsDiscovered)) {
      userStats.artistsDiscovered = [];
    }

    // Calculate listening time in readable format
    const minutes = Math.floor(userStats.totalListeningTime / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    const listeningTime = hours > 0 
      ? `${hours}h ${remainingMinutes}m`
      : `${remainingMinutes}m`;

    res.json({
      songsPlayed: userStats.songsPlayed,
      listeningTime,
      artistsDiscovered: userStats.artistsDiscovered.length,
      lastActivity: userStats.lastActivity
    });
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({ error: 'Failed to get user stats' });
  }
});

module.exports = router;
