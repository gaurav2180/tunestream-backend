const express = require('express');
const router = express.Router();

// 🎛️ SMART SERVICE SWITCHING - Environment controlled
const USE_DEMO_MODE = process.env.USE_DEMO_MODE === 'true';

let musicService;
let serviceInfo;

console.log('🎛️ Music Service Initialization...');
console.log(`📋 Environment USE_DEMO_MODE: ${process.env.USE_DEMO_MODE}`);
console.log(`🎯 Resolved Demo Mode: ${USE_DEMO_MODE}`);

try {
  if (USE_DEMO_MODE) {
    console.log('🎭 Loading Demo Music Service...');
    musicService = require('../services/demoMusicService');
    serviceInfo = {
      name: 'Demo Music Service',
      type: 'demo',
      description: 'Perfect for development and testing - no API keys required!',
      icon: '🎭',
      mode: 'Development'
    };
    console.log('✅ Demo Music Service loaded successfully');
  } else {
    console.log('🎵 Loading Spotify Web API Service...');
    console.log(`🔑 Spotify Client ID: ${process.env.SPOTIFY_CLIENT_ID ? 'SET' : 'MISSING'}`);
    console.log(`🔐 Spotify Client Secret: ${process.env.SPOTIFY_CLIENT_SECRET ? 'SET' : 'MISSING'}`);
    
    musicService = require('../services/spotifyService');
    serviceInfo = {
      name: 'Spotify Web API',
      type: 'spotify',
      description: 'Real-time music data from millions of songs',
      icon: '🎵',
      mode: 'Production'
    };
    console.log('✅ Spotify Web API service loaded');
  }
} catch (error) {
  console.error('❌ Error loading primary music service:', error.message);
  console.log('🔄 Emergency fallback to demo service...');
  
  // Emergency fallback to demo service
  musicService = require('../services/demoMusicService');
  serviceInfo = {
    name: 'Demo Music Service (Emergency Fallback)',
    type: 'demo-fallback',
    description: 'Emergency fallback - Primary service unavailable',
    icon: '🛡️',
    mode: 'Resilient'
  };
  console.log('✅ Emergency fallback service loaded');
}

console.log(`🎯 Active Music Service: ${serviceInfo.name} (${serviceInfo.mode} Mode)`);

// Health check with comprehensive service information
router.get('/health', async (req, res) => {
  try {
    console.log('🔍 Health check requested');
    const health = await musicService.healthCheck();
    
    const response = {
      status: health.status,
      message: `TuneStream Music API - ${serviceInfo.mode} Mode`,
      service: {
        name: serviceInfo.name,
        type: serviceInfo.type,
        description: serviceInfo.description,
        icon: serviceInfo.icon,
        mode: serviceInfo.mode
      },
      environment: {
        demoMode: USE_DEMO_MODE,
        spotifyConfigured: !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET),
        nodeEnv: process.env.NODE_ENV || 'development'
      },
      features: USE_DEMO_MODE 
        ? ['Demo data', 'No API limits', 'Instant response', 'Development ready', 'Offline capable']
        : ['Real Spotify data', 'Millions of songs', '30-second previews', 'Production ready', 'Live updates'],
      capabilities: {
        search: true,
        trending: true,
        categories: true,
        recommendations: true,
        trackDetails: true,
        realTimeData: !USE_DEMO_MODE,
        previewPlayback: !USE_DEMO_MODE
      },
      timestamp: new Date().toISOString(),
      version: '2.0.0-smart',
      uptime: process.uptime()
    };
    
    console.log('✅ Health check completed successfully');
    res.json(response);
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(500).json({ 
      error: 'Health check failed',
      service: serviceInfo.name,
      type: serviceInfo.type,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Mode switching endpoint
router.post('/switch-mode', async (req, res) => {
  try {
    const { mode } = req.body;
    
    if (!['demo', 'spotify'].includes(mode)) {
      return res.status(400).json({ 
        error: 'Invalid mode', 
        validModes: ['demo', 'spotify'],
        current: serviceInfo.type
      });
    }
    
    console.log(`🔄 Mode switch requested: ${serviceInfo.type} → ${mode}`);
    
    // Update environment variable
    const oldMode = USE_DEMO_MODE;
    process.env.USE_DEMO_MODE = mode === 'demo' ? 'true' : 'false';
    
    // Reload service
    try {
      if (mode === 'demo') {
        musicService = require('../services/demoMusicService');
        serviceInfo = {
          name: 'Demo Music Service',
          type: 'demo',
          description: 'Switched to development mode',
          icon: '🎭',
          mode: 'Development'
        };
      } else {
        musicService = require('../services/spotifyService');
        serviceInfo = {
          name: 'Spotify Web API',
          type: 'spotify', 
          description: 'Switched to production mode',
          icon: '🎵',
          mode: 'Production'
        };
      }
      
      console.log(`✅ Successfully switched to ${serviceInfo.name}`);
      
      res.json({
        success: true,
        message: `Successfully switched from ${oldMode ? 'demo' : 'spotify'} to ${mode} mode`,
        service: serviceInfo,
        timestamp: new Date().toISOString()
      });
    } catch (switchError) {
      console.error('❌ Mode switch failed:', switchError.message);
      res.status(500).json({
        error: 'Mode switch failed',
        message: switchError.message,
        currentService: serviceInfo.name
      });
    }
  } catch (error) {
    console.error('❌ Mode switch error:', error);
    res.status(500).json({ 
      error: 'Mode switch failed',
      message: error.message
    });
  }
});

// Search tracks with enhanced logging
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 20, offset = 0 } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Search query is required and cannot be empty',
        example: '/api/music/search?q=shape+of+you'
      });
    }

    const query = q.trim();
    console.log(`🔍 ${serviceInfo.type.toUpperCase()} Search: "${query}" (limit: ${limit})`);
    
    const startTime = Date.now();
    const results = await musicService.searchTracks(query, parseInt(limit));
    const responseTime = Date.now() - startTime;
    
    // Handle different response formats
    const tracks = results.tracks || results;
    console.log(`📊 Search results: ${tracks.length} tracks found in ${responseTime}ms`);
    
    res.json({
      tracks,
      meta: {
        query,
        count: tracks.length,
        limit: parseInt(limit),
        service: serviceInfo.type,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Search endpoint error:', error);
    res.status(500).json({ 
      error: 'Search failed',
      message: 'Unable to search tracks at this time',
      service: serviceInfo.type,
      timestamp: new Date().toISOString()
    });
  }
});

// Get trending music with performance tracking
router.get('/trending', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    console.log(`📈 Fetching ${limit} trending tracks via ${serviceInfo.name}...`);
    const startTime = Date.now();
    
    const tracks = await musicService.getTrendingTracks(parseInt(limit));
    const responseTime = Date.now() - startTime;
    
    console.log(`🎵 Trending: ${tracks.length} tracks delivered in ${responseTime}ms via ${serviceInfo.type}`);
    
    res.json({
      tracks,
      meta: {
        count: tracks.length,
        requested: parseInt(limit),
        service: serviceInfo.type,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Trending endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to get trending music',
      message: 'Unable to fetch trending tracks at this time',
      service: serviceInfo.type,
      timestamp: new Date().toISOString()
    });
  }
});

// Get music categories
router.get('/categories', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    console.log(`📂 Fetching ${limit} categories via ${serviceInfo.type}...`);
    const startTime = Date.now();
    
    const categories = await musicService.getCategories(parseInt(limit));
    const responseTime = Date.now() - startTime;
    
    console.log(`📂 Categories: ${categories.length} found in ${responseTime}ms`);
    
    res.json({
      categories,
      meta: {
        count: categories.length,
        service: serviceInfo.type,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Categories endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to get categories',
      message: 'Unable to fetch music categories at this time',
      service: serviceInfo.type
    });
  }
});

// Get recommendations with genre tracking
router.get('/recommendations', async (req, res) => {
  try {
    const { genres, limit = 20 } = req.query;
    
    const seedGenres = genres ? genres.split(',').map(g => g.trim()) : ['pop', 'rock'];
    
    console.log(`🎯 Getting ${limit} recommendations for [${seedGenres.join(', ')}] via ${serviceInfo.type}`);
    const startTime = Date.now();
    
    const recommendations = await musicService.getRecommendations(seedGenres, parseInt(limit));
    const responseTime = Date.now() - startTime;
    
    console.log(`💡 Recommendations: ${recommendations.length} tracks in ${responseTime}ms`);
    
    res.json({
      tracks: recommendations,
      meta: {
        seedGenres,
        count: recommendations.length,
        service: serviceInfo.type,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Recommendations endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to get recommendations',
      message: 'Unable to fetch recommendations at this time',
      service: serviceInfo.type
    });
  }
});

// Get track details with service-specific handling
router.get('/track/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ 
        error: 'Track ID is required',
        example: '/api/music/track/4iV5W9uYEdYUVa79Axb7Rh'
      });
    }
    
    console.log(`🎵 Fetching track details: ${id} via ${serviceInfo.type}`);
    
    let track;
    if (typeof musicService.getTrackDetails === 'function') {
      track = await musicService.getTrackDetails(id);
    } else {
      // Fallback for services without getTrackDetails method
      track = {
        id: id,
        title: `Demo Track ${id}`,
        artist: 'Demo Artist',
        album: 'Demo Album',
        cover_url: `https://picsum.photos/300/300?random=${id}`,
        audio_url: null,
        duration: 180 + Math.floor(Math.random() * 120),
        external_url: 'https://open.spotify.com',
        popularity: Math.floor(Math.random() * 50) + 50,
        explicit: false,
        genre: 'Pop',
        service: serviceInfo.type
      };
    }
    
    if (!track) {
      return res.status(404).json({ 
        error: 'Track not found',
        message: 'The requested track could not be found',
        trackId: id,
        service: serviceInfo.type
      });
    }
    
    console.log(`✅ Track details retrieved: ${track.title} by ${track.artist}`);
    res.json(track);
  } catch (error) {
    console.error('❌ Track details endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to get track details',
      message: 'Unable to fetch track information at this time',
      service: serviceInfo.type,
      trackId: req.params.id
    });
  }
});

// Service information endpoint
router.get('/service-info', (req, res) => {
  res.json({
    current: serviceInfo,
    environment: {
      demoMode: USE_DEMO_MODE,
      spotifyConfigured: !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET),
      nodeEnv: process.env.NODE_ENV || 'development'
    },
    switching: {
      available: ['demo', 'spotify'],
      current: serviceInfo.type,
      canSwitch: true
    },
    performance: {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    },
    version: '2.0.0-smart'
  });
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('❌ Music routes error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: 'Something went wrong with the music service',
    service: serviceInfo?.type || 'unknown',
    endpoint: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
