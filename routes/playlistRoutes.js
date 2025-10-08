const express = require("express");
const router = express.Router();
const fs = require("fs-extra");
const path = require("path");

const PLAYLISTS_FILE = path.join(__dirname, "../data/playlists.json");
const LIKED_SONGS_FILE = path.join(__dirname, "../data/likedSongs.json");

// Ensure data directory exists
fs.ensureDirSync(path.dirname(PLAYLISTS_FILE));
fs.ensureDirSync(path.dirname(LIKED_SONGS_FILE));

const loadPlaylists = () => {
  try {
    if (fs.existsSync(PLAYLISTS_FILE)) {
      return fs.readJsonSync(PLAYLISTS_FILE);
    }
    return {};
  } catch (error) {
    return {};
  }
};

const savePlaylists = (playlists) => {
  fs.writeJsonSync(PLAYLISTS_FILE, playlists, { spaces: 2 });
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

// Get user playlists (including liked songs) - UPDATED
router.get("/:userId", (req, res) => {
  const playlists = loadPlaylists();
  const likedSongs = loadLikedSongs();
  const userPlaylists = playlists[req.params.userId] || [];
  const userLikedSongs = likedSongs[req.params.userId] || [];

  // ALWAYS add Liked Songs as first playlist (even if empty)
  const allPlaylists = [{
    id: "liked-songs",
    name: "Liked Songs",
    songs: userLikedSongs,
    isLikedSongs: true,
    created_at: new Date().toISOString()
  }, ...userPlaylists];

  res.json(allPlaylists);
});

// Create playlist
router.post("/create", (req, res) => {
  const { userId, name } = req.body;
  const playlists = loadPlaylists();
  
  if (!playlists[userId]) {
    playlists[userId] = [];
  }

  const newPlaylist = {
    id: Date.now().toString(),
    name,
    songs: [],
    created_at: new Date().toISOString()
  };

  playlists[userId].push(newPlaylist);
  savePlaylists(playlists);
  
  res.json({ message: "Playlist created", playlist: newPlaylist });
});

// Add song to playlist
router.post("/add-song", (req, res) => {
  const { userId, playlistId, song } = req.body;
  const playlists = loadPlaylists();
  
  if (playlists[userId]) {
    const playlist = playlists[userId].find(p => p.id === playlistId);
    if (playlist) {
      playlist.songs.push(song);
      savePlaylists(playlists);
      res.json({ message: "Song added to playlist" });
    } else {
      res.status(404).json({ error: "Playlist not found" });
    }
  } else {
    res.status(404).json({ error: "User not found" });
  }
});

// Like a song (add to liked songs)
router.post("/like-song", (req, res) => {
  const { userId, song } = req.body;
  const likedSongs = loadLikedSongs();
  
  if (!likedSongs[userId]) {
    likedSongs[userId] = [];
  }

  // Check if song is already liked
  const isAlreadyLiked = likedSongs[userId].some(likedSong => likedSong.id === song.id);
  
  if (!isAlreadyLiked) {
    likedSongs[userId].push({
      ...song,
      likedAt: new Date().toISOString()
    });
    saveLikedSongs(likedSongs);
    res.json({ message: "Song liked", liked: true });
  } else {
    res.json({ message: "Song already liked", liked: true });
  }
});

// Unlike a song (remove from liked songs)
router.post("/unlike-song", (req, res) => {
  const { userId, songId } = req.body;
  const likedSongs = loadLikedSongs();
  
  if (likedSongs[userId]) {
    likedSongs[userId] = likedSongs[userId].filter(song => song.id !== songId);
    saveLikedSongs(likedSongs);
    res.json({ message: "Song unliked", liked: false });
  } else {
    res.json({ message: "No liked songs found", liked: false });
  }
});

// Check if song is liked
router.get("/:userId/liked/:songId", (req, res) => {
  const { userId, songId } = req.params;
  const likedSongs = loadLikedSongs();
  
  const isLiked = likedSongs[userId] ? 
    likedSongs[userId].some(song => song.id === songId) : false;
  
  res.json({ liked: isLiked });
});

// Get all liked songs
router.get("/:userId/liked-songs", (req, res) => {
  const likedSongs = loadLikedSongs();
  const userLikedSongs = likedSongs[req.params.userId] || [];
  res.json(userLikedSongs);
});

// DELETE playlist route using POST
router.post("/delete", (req, res) => {
  try {
    const { userId, playlistId } = req.body;
    console.log(`Attempting to delete playlist ${playlistId} for user ${userId}`);
    
    const playlists = loadPlaylists();
    
    if (!playlists[userId]) {
      return res.status(404).json({ error: "User not found" });
    }

    const playlistIndex = playlists[userId].findIndex(p => p.id === playlistId);
    
    if (playlistIndex === -1) {
      return res.status(404).json({ error: "Playlist not found" });
    }

    // Remove the playlist
    const deletedPlaylist = playlists[userId].splice(playlistIndex, 1)[0];
    savePlaylists(playlists);
    
    console.log(`Playlist "${deletedPlaylist.name}" deleted successfully`);
    res.json({ 
      message: "Playlist deleted successfully",
      deletedPlaylist: deletedPlaylist.name
    });
  } catch (error) {
    console.error("Error deleting playlist:", error);
    res.status(500).json({ error: "Failed to delete playlist" });
  }
});

// DELETE PLAYLIST using DELETE method (alternative)
router.delete("/:userId/:playlistId", (req, res) => {
  try {
    const { userId, playlistId } = req.params;
    console.log(`DELETE route: Attempting to delete playlist ${playlistId} for user ${userId}`);
    
    const playlists = loadPlaylists();
    
    if (!playlists[userId]) {
      return res.status(404).json({ error: "User not found" });
    }

    // Find the playlist to delete
    const playlistIndex = playlists[userId].findIndex(p => p.id === playlistId);
    
    if (playlistIndex === -1) {
      return res.status(404).json({ error: "Playlist not found" });
    }

    // Remove the playlist
    const deletedPlaylist = playlists[userId].splice(playlistIndex, 1)[0];
    savePlaylists(playlists);
    
    console.log(`Playlist "${deletedPlaylist.name}" deleted successfully`);
    res.json({ 
      message: "Playlist deleted successfully",
      deletedPlaylist: deletedPlaylist.name
    });
  } catch (error) {
    console.error("Error deleting playlist:", error);
    res.status(500).json({ error: "Failed to delete playlist" });
  }
});

// Remove song from playlist - FIXED
router.post("/remove-song", (req, res) => {
  const { playlistId, songId, userId } = req.body;
  
  // Handle liked songs removal
  if (playlistId === "liked-songs") {
    const likedSongs = loadLikedSongs();
    if (likedSongs[userId]) {
      likedSongs[userId] = likedSongs[userId].filter(song => song.id !== songId);
      saveLikedSongs(likedSongs);
      res.json({ message: "Song removed from liked songs" });
    } else {
      res.status(404).json({ error: "No liked songs found" });
    }
    return;
  }

  // Handle regular playlist removal
  const playlists = loadPlaylists();
  if (playlists[userId]) {
    const playlist = playlists[userId].find(p => p.id === playlistId);
    if (playlist) {
      playlist.songs = playlist.songs.filter(song => song.id !== songId);
      savePlaylists(playlists);
      res.json({ message: "Song removed from playlist" });
    } else {
      res.status(404).json({ error: "Playlist not found" });
    }
  } else {
    res.status(404).json({ error: "User not found" });
  }
});

module.exports = router;
