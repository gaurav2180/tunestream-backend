const { jamendoApi, iTunesApi } = require("../config/apis");
const NodeCache = require("node-cache");

// Cache for 1 hour
const cache = new NodeCache({ stdTTL: 3600 });

class MusicService {
  // Get trending songs from Jamendo
  async getTrendingSongs(limit = 20) {
    const cacheKey = `trending_${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await jamendoApi.get("tracks/", {
        params: {
          order: "popularity_total",
          limit,
          include: "musicinfo",
          audioformat: "mp32",
          imagesize: "300"
        }
      });

      const songs = response.data.results.map(track => ({
        id: track.id,
        title: track.name,
        artist: track.artist_name,
        album: track.album_name,
        duration: track.duration,
        audio_url: track.audio,
        cover_url: track.album_image || track.image,
        genre: track.musicinfo?.tags?.genres?.[0]?.genre_name || "Unknown",
        release_date: track.releasedate,
        source: "jamendo"
      }));

      cache.set(cacheKey, songs);
      return songs;
    } catch (error) {
      console.error("Error fetching trending songs:", error.message);
      // Return fallback data if API fails
      return this.getFallbackSongs();
    }
  }

  // Search songs from multiple sources
  async searchSongs(query, limit = 20) {
    try {
      const [jamendoResults, itunesResults] = await Promise.all([
        this.searchJamendo(query, Math.ceil(limit * 0.7)),
        this.searchItunes(query, Math.ceil(limit * 0.3))
      ]);

      return [...jamendoResults, ...itunesResults].slice(0, limit);
    } catch (error) {
      console.error("Error searching songs:", error.message);
      return [];
    }
  }

  // Search Jamendo
  async searchJamendo(query, limit = 15) {
    try {
      const response = await jamendoApi.get("tracks/", {
        params: {
          search: query,
          limit,
          include: "musicinfo",
          audioformat: "mp32",
          imagesize: "300"
        }
      });

      return response.data.results.map(track => ({
        id: `jamendo_${track.id}`,
        title: track.name,
        artist: track.artist_name,
        album: track.album_name,
        duration: track.duration,
        audio_url: track.audio,
        cover_url: track.album_image || track.image,
        genre: track.musicinfo?.tags?.genres?.[0]?.genre_name || "Unknown",
        source: "jamendo"
      }));
    } catch (error) {
      console.error("Jamendo search error:", error.message);
      return [];
    }
  }

  // Search iTunes
  async searchItunes(query, limit = 10) {
    try {
      const response = await iTunesApi.get("search", {
        params: {
          term: query,
          media: "music",
          entity: "song",
          limit
        }
      });

      return response.data.results.map(track => ({
        id: `itunes_${track.trackId}`,
        title: track.trackName,
        artist: track.artistName,
        album: track.collectionName,
        duration: Math.floor(track.trackTimeMillis / 1000),
        audio_url: track.previewUrl,
        cover_url: track.artworkUrl100?.replace("100x100", "300x300"),
        genre: track.primaryGenreName,
        source: "itunes"
      }));
    } catch (error) {
      console.error("iTunes search error:", error.message);
      return [];
    }
  }

  // Get songs by genre
  async getSongsByGenre(genre, limit = 20) {
    const cacheKey = `genre_${genre}_${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await jamendoApi.get("tracks/", {
        params: {
          tags: genre,
          order: "popularity_total",
          limit,
          include: "musicinfo",
          audioformat: "mp32",
          imagesize: "300"
        }
      });

      const songs = response.data.results.map(track => ({
        id: track.id,
        title: track.name,
        artist: track.artist_name,
        album: track.album_name,
        duration: track.duration,
        audio_url: track.audio,
        cover_url: track.album_image || track.image,
        genre: genre,
        source: "jamendo"
      }));

      cache.set(cacheKey, songs);
      return songs;
    } catch (error) {
      console.error("Error fetching songs by genre:", error.message);
      return [];
    }
  }

  // Fallback songs if API fails
  getFallbackSongs() {
    return [
      {
        id: "fallback_1",
        title: "Demo Song 1",
        artist: "Demo Artist",
        album: "Demo Album",
        duration: 180,
        audio_url: "https://www.soundjay.com/misc/sounds/sample.mp3",
        cover_url: "https://via.placeholder.com/300x300/1db954/ffffff?text=♪",
        genre: "Demo",
        source: "fallback"
      }
    ];
  }
}

module.exports = new MusicService();
