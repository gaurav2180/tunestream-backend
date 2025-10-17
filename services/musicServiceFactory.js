class MusicServiceFactory {
  constructor() {
    this.currentService = null;
    this.serviceType = null;
  }

  async createService() {
    const useDemoMode = process.env.USE_DEMO_MODE === 'true';
    
    console.log('🏭 Music Service Factory initializing...');
    console.log(`🎛️ Demo Mode Environment: ${useDemoMode ? 'TRUE' : 'FALSE'}`);
    console.log(`🔑 Spotify Client ID: ${process.env.SPOTIFY_CLIENT_ID ? 'SET' : 'MISSING'}`);
    console.log(`🔐 Spotify Client Secret: ${process.env.SPOTIFY_CLIENT_SECRET ? 'SET' : 'MISSING'}`);
    
    // If explicitly demo mode, use demo
    if (useDemoMode) {
      console.log('🎭 Demo mode requested - Loading demo service');
      return this.loadDemoService();
    }
    
    // Try Spotify first
    try {
      console.log('🎵 Testing Spotify Web API connection...');
      return await this.trySpotifyService();
    } catch (error) {
      console.error('⚠️ Spotify failed:', error.message);
      console.log('🔄 Auto-falling back to demo service...');
      return this.loadDemoService('fallback');
    }
  }

  async trySpotifyService() {
    const spotifyService = require('./spotifyService');
    
    // Test Spotify connection
    console.log('🧪 Testing Spotify health check...');
    const health = await spotifyService.healthCheck();
    
    if (health.status === 'OK') {
      console.log('🎉 SUCCESS! Spotify Web API is working!');
      this.currentService = spotifyService;
      this.serviceType = 'spotify';
      return this.currentService;
    } else {
      throw new Error(`Spotify health check failed: ${health.message}`);
    }
  }

  loadDemoService(reason = 'requested') {
    console.log(`🎭 Loading Demo Music Service (${reason})...`);
    this.currentService = require('./demoMusicService');
    this.serviceType = reason === 'fallback' ? 'demo-fallback' : 'demo';
    console.log('✅ Demo Music Service loaded successfully');
    return this.currentService;
  }

  getServiceInfo() {
    const serviceMap = {
      'demo': {
        name: 'Demo Music Service',
        description: 'Development mode with curated sample data',
        features: ['Instant response', 'No API limits', '100% uptime'],
        icon: '🎭',
        mode: 'Development'
      },
      'spotify': {
        name: 'Spotify Web API',
        description: 'Real-time music data from millions of songs',
        features: ['Real tracks', '30-second previews', 'Live data'],
        icon: '🎵',
        mode: 'Production'
      },
      'demo-fallback': {
        name: 'Demo Service (Auto-Fallback)',
        description: 'Automatic failover when external APIs unavailable',
        features: ['Always available', 'Graceful degradation', 'Error resilience'],
        icon: '🛡️',
        mode: 'Resilient'
      }
    };

    return {
      type: this.serviceType,
      ...serviceMap[this.serviceType],
      timestamp: new Date().toISOString()
    };
  }

  async getService() {
    if (!this.currentService) {
      await this.createService();
    }
    return this.currentService;
  }
}

module.exports = new MusicServiceFactory();
