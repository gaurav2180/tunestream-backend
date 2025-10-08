// Demo music service for testing - Works without API keys
class DemoMusicService {
  async getTrendingTracks(limit = 50) {
    console.log('🎵 Loading DEMO trending tracks...');
    
    const popularSongs = [
      { title: 'Shape of You', artist: 'Ed Sheeran', album: '÷ (Divide)' },
      { title: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours' },
      { title: 'Watermelon Sugar', artist: 'Harry Styles', album: 'Fine Line' },
      { title: 'Good 4 U', artist: 'Olivia Rodrigo', album: 'SOUR' },
      { title: 'Levitating', artist: 'Dua Lipa', album: 'Future Nostalgia' },
      { title: 'Stay', artist: 'The Kid LAROI', album: 'F*CK LOVE 3' },
      { title: 'Heat Waves', artist: 'Glass Animals', album: 'Dreamland' },
      { title: 'As It Was', artist: 'Harry Styles', album: 'Harrys House' },
      { title: 'Anti-Hero', artist: 'Taylor Swift', album: 'Midnights' },
      { title: 'Flowers', artist: 'Miley Cyrus', album: 'Endless Summer Vacation' },
      { title: 'Unholy', artist: 'Sam Smith', album: 'Gloria' },
      { title: 'Bad Habit', artist: 'Steve Lacy', album: 'Gemini Rights' },
      { title: 'About Damn Time', artist: 'Lizzo', album: 'About Damn Time' },
      { title: 'Running Up That Hill', artist: 'Kate Bush', album: 'Hounds of Love' },
      { title: 'Glimpse of Us', artist: 'Joji', album: 'Glimpse of Us' },
      { title: 'Left and Right', artist: 'Charlie Puth', album: 'Left and Right' },
      { title: 'First Class', artist: 'Jack Harlow', album: 'Come Home The Kids Miss You' },
      { title: 'Break My Soul', artist: 'Beyoncé', album: 'Renaissance' },
      { title: 'Sunroof', artist: 'Nicky Youre', album: 'Sunroof' },
      { title: 'Late Night Talking', artist: 'Harry Styles', album: 'Harrys House' }
    ];
    
    const demoTracks = [];
    for (let i = 0; i < limit; i++) {
      const song = popularSongs[i % popularSongs.length];
      demoTracks.push({
        id: `demo_${i + 1}`,
        title: song.title,
        artist: song.artist,
        album: song.album,
        cover_url: `https://picsum.photos/300/300?random=${i + 1}&blur=1`,
        audio_url: null, // No preview in demo mode
        duration: 180 + Math.floor(Math.random() * 120), // Random duration 3-5 mins
        external_url: 'https://open.spotify.com',
        popularity: Math.floor(Math.random() * 30) + 70, // 70-100
        explicit: Math.random() > 0.8,
        genre: ['Pop', 'Rock', 'Hip-Hop', 'Electronic', 'Indie'][Math.floor(Math.random() * 5)],
        release_date: `202${Math.floor(Math.random() * 4)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-01`,
        artist_id: `artist_${i % 10}`,
        album_id: `album_${i % 15}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    
    console.log(`✅ Generated ${demoTracks.length} demo tracks`);
    return demoTracks;
  }
  
  async searchTracks(query, limit = 20) {
    console.log(`🔍 DEMO search for: "${query}"`);
    
    const allTracks = await this.getTrendingTracks(100);
    const filteredTracks = allTracks.filter(track => 
      track.title.toLowerCase().includes(query.toLowerCase()) ||
      track.artist.toLowerCase().includes(query.toLowerCase()) ||
      track.album.toLowerCase().includes(query.toLowerCase())
    );
    
    const resultTracks = filteredTracks.slice(0, limit);
    console.log(`📊 Found ${resultTracks.length} matching demo tracks for "${query}"`);
    
    return {
      tracks: resultTracks,
      total: filteredTracks.length,
      hasNext: filteredTracks.length > limit,
      hasPrevious: false
    };
  }
  
  async getCategories(limit = 20) {
    console.log('📂 Loading demo categories...');
    
    const categories = [
      { id: 'pop', name: 'Pop', image: 'https://picsum.photos/300/300?random=cat1' },
      { id: 'rock', name: 'Rock', image: 'https://picsum.photos/300/300?random=cat2' },
      { id: 'hip-hop', name: 'Hip-Hop', image: 'https://picsum.photos/300/300?random=cat3' },
      { id: 'electronic', name: 'Electronic', image: 'https://picsum.photos/300/300?random=cat4' },
      { id: 'indie', name: 'Indie', image: 'https://picsum.photos/300/300?random=cat5' },
      { id: 'r-b', name: 'R&B', image: 'https://picsum.photos/300/300?random=cat6' },
      { id: 'country', name: 'Country', image: 'https://picsum.photos/300/300?random=cat7' },
      { id: 'jazz', name: 'Jazz', image: 'https://picsum.photos/300/300?random=cat8' }
    ];
    
    return categories.slice(0, limit);
  }
  
  async getRecommendations(seedGenres = ['pop'], limit = 20) {
    console.log(`🎯 Getting demo recommendations for: ${seedGenres.join(', ')}`);
    
    const tracks = await this.getTrendingTracks(50);
    return tracks.slice(0, limit);
  }
  
  async healthCheck() {
    return { 
      status: 'OK', 
      message: 'Demo Music Service - No API keys required!' 
    };
  }
}

module.exports = new DemoMusicService();
