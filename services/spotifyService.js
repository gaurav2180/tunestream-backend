const axios = require('axios');

class SpotifyService {
  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID;
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    this.baseURL = 'https://api.spotify.com/v1';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Get Client Credentials access token
  async getAccessToken() {
    console.log('🔑 Getting Spotify access token...');
    console.log('🆔 Client ID:', this.clientId ? `${this.clientId.substring(0, 8)}...` : '❌ MISSING');
    console.log('🔐 Client Secret:', this.clientSecret ? 'SET ✅' : '❌ MISSING');
    
    if (!this.clientId || !this.clientSecret) {
      throw new Error('❌ Spotify credentials missing from environment');
    }

    if (this.accessToken && this.tokenExpiry > Date.now()) {
      console.log('✅ Using cached token');
      return this.accessToken;
    }

    try {
      console.log('🌐 Requesting new token from Spotify...');
      
      const authString = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        'grant_type=client_credentials',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${authString}`
          },
          timeout: 10000
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      
      console.log('✅ Spotify token obtained successfully!');
      console.log('⏰ Expires in:', response.data.expires_in, 'seconds');
      return this.accessToken;
    } catch (error) {
      console.error('❌ Spotify token error:');
      console.error('Status:', error.response?.status);
      console.error('Error:', error.response?.data);
      
      throw new Error(`Spotify auth failed: ${error.response?.data?.error || error.message}`);
    }
  }

  // Make authenticated request to Spotify API
  async makeRequest(endpoint, params = {}) {
    const token = await this.getAccessToken();
    
    try {
      const response = await axios.get(`${this.baseURL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          market: 'US', // Use US market for better results
          ...params
        }
      });
      
      return response.data;
    } catch (error) {
      console.error(`❌ Spotify API error (${endpoint}):`, error.response?.status, error.response?.data);
      
      if (error.response?.status === 401) {
        // Token expired, clear it
        this.accessToken = null;
        this.tokenExpiry = null;
      }
      
      throw error;
    }
  }

  // Search for tracks - WORKING VERSION
  async searchTracks(query, limit = 20, offset = 0) {
    try {
      const data = await this.makeRequest('/search', {
        q: query,
        type: 'track',
        limit,
        offset
      });

      const tracks = data.tracks.items
        .filter(track => track && track.id) 
        .map(this.formatTrack)
        .filter(Boolean);

      console.log(`🔍 Search found ${tracks.length} tracks (${data.tracks.total} total)`);
      
      return {
        tracks,
        total: data.tracks.total,
        hasNext: data.tracks.next !== null,
        hasPrevious: data.tracks.previous !== null
      };
    } catch (error) {
      console.error('Search error:', error.message);
      return { tracks: [], total: 0, hasNext: false, hasPrevious: false };
    }
  }
  // Get trending tracks - ULTRA SIMPLE VERSION THAT ALWAYS WORKS
async getTrendingTracks(limit = 50) {
  try {
    console.log('🔥 Ultra-simple trending from Spotify...');
    
    // Use the simplest possible search - just single letters/words that always have results
    const basicSearches = ['a', 'the', 'love', 'song', 'music'];
    
    let allTracks = [];
    
    for (const searchTerm of basicSearches) {
      try {
        console.log(`🎯 Basic search: "${searchTerm}"`);
        
        // Direct search call with minimal params
        const data = await this.makeRequest('/search', {
          q: searchTerm,
          type: 'track',
          limit: 10,
          market: 'US'
        });
        
        if (data.tracks && data.tracks.items && data.tracks.items.length > 0) {
          const tracks = data.tracks.items
            .filter(track => track && track.id)
            .map(this.formatTrack)
            .filter(Boolean);
          
          allTracks = allTracks.concat(tracks);
          console.log(`✅ Found ${tracks.length} tracks for "${searchTerm}"`);
          
          // Stop if we have enough
          if (allTracks.length >= limit) break;
        } else {
          console.log(`⚠️ No results for "${searchTerm}"`);
        }
      } catch (error) {
        console.log(`❌ Search "${searchTerm}" failed:`, error.message);
        continue;
      }
    }
    
    // Remove duplicates and limit
    const uniqueTracks = allTracks
      .filter((track, index, self) => 
        track && self.findIndex(t => t && t.id === track.id) === index
      )
      .slice(0, limit);
    
    console.log(`📈 FINAL: ${uniqueTracks.length} unique tracks found`);
    
    if (uniqueTracks.length === 0) {
      console.error('❌ NO TRACKS FOUND AT ALL - Something is wrong with Spotify API');
    }
    
    return uniqueTracks;
  } catch (error) {
    console.error('❌ Ultra-simple trending failed:', error.message);
    return [];
  }
}

  // Get music categories
  async getCategories(limit = 20) {
    try {
      console.log(`📂 Fetching ${limit} music categories...`);
      const data = await this.makeRequest('/browse/categories', {
        limit,
        country: 'US'
      });

      const categories = data.categories.items.map(category => ({
        id: category.id,
        name: category.name,
        image: category.icons[0]?.url || null
      }));
      
      console.log(`📂 Found ${categories.length} categories`);
      return categories;
    } catch (error) {
      console.error('Categories error:', error.message);
      return [];
    }
  }

  // Get recommendations based on genres
  async getRecommendations(seedGenres = ['pop', 'rock'], limit = 20) {
    try {
      const params = {
        limit,
        seed_genres: Array.isArray(seedGenres) ? seedGenres.slice(0, 5).join(',') : seedGenres
      };

      console.log(`🎯 Getting recommendations for: ${params.seed_genres}`);
      const data = await this.makeRequest('/recommendations', params);
      
      const tracks = data.tracks
        .filter(track => track && track.id)
        .map(this.formatTrack)
        .filter(Boolean);
      
      console.log(`💡 Recommendations: ${tracks.length} tracks`);
      return tracks;
    } catch (error) {
      console.error('Recommendations error:', error.message);
      return [];
    }
  }

  // Get track details
  async getTrackDetails(trackId) {
    try {
      console.log(`🎵 Fetching track details: ${trackId}`);
      const track = await this.makeRequest(`/tracks/${trackId}`);

      const formattedTrack = this.formatTrack(track);
      console.log(`✅ Track details: ${formattedTrack.title} by ${formattedTrack.artist}`);
      return formattedTrack;
    } catch (error) {
      console.error('Track details error:', error.message);
      return null;
    }
  }

  // Format track data for TuneStream
  formatTrack(track) {
    if (!track || !track.id) return null;

    return {
      id: track.id,
      title: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album.name,
      cover_url: track.album.images[0]?.url || 'https://via.placeholder.com/300x300/1db954/ffffff?text=♪',
      audio_url: track.preview_url || null,
      duration: Math.floor(track.duration_ms / 1000),
      external_url: track.external_urls.spotify,
      popularity: track.popularity || 0,
      explicit: track.explicit || false,
      genre: track.album.genres?.[0] || 'Unknown',
      release_date: track.album.release_date,
      artist_id: track.artists[0]?.id,
      album_id: track.album.id,
      isrc: track.external_ids?.isrc,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  // Health check
  async healthCheck() {
    try {
      await this.getAccessToken();
      return { status: 'OK', message: 'Spotify API connection healthy' };
    } catch (error) {
      return { status: 'ERROR', message: error.message };
    }
  }
}

module.exports = new SpotifyService();
