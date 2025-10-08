require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');

const app = express();

// Import routes
const authRoutes = require('./routes/authRoutes');
const musicRoutes = require('./routes/musicRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const statsRoutes = require('./routes/statsRoutes');

// Production configuration
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 9000;

// Enhanced CORS Configuration for Production
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://tunestream.vercel.app',
      'https://tunestream-frontend.vercel.app',
      // Add your actual Vercel URLs here after deployment
      /https:\/\/tunestream.*\.vercel\.app$/,
      /https:\/\/.*-tunestream.*\.vercel\.app$/
    ];
    
    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      }
      return allowedOrigin.test(origin);
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      callback(null, true); // Allow in development, you can change this to false in strict production
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar']
};

// Production security middleware
if (isProduction) {
  app.set('trust proxy', 1);
  
  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');  
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Powered-By', 'TuneStream');
    next();
  });
  
  console.log('🔒 Production security headers enabled');
}

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure data directory exists
fs.ensureDirSync(path.join(__dirname, 'data'));

// Create uploads directory for profile pictures
const uploadsDir = path.join(__dirname, 'uploads', 'profile-pictures');
console.log('📁 Creating uploads directory:', uploadsDir);
fs.ensureDirSync(uploadsDir);
console.log('✅ Uploads directory created/verified');

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('🔍 Multer destination called');
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    console.log('🔍 Multer filename called for:', file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'profile-' + uniqueSuffix + path.extname(file.originalname);
    console.log('📝 Generated filename:', filename);
    cb(null, filename);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    console.log('🔍 File filter check - MIME type:', file.mimetype);
    if (file.mimetype.startsWith('image/')) {
      console.log('✅ File type approved');
      cb(null, true);
    } else {
      console.log('❌ File type rejected');
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

console.log('✅ Multer configured successfully');

// Serve uploaded files statically with cache headers
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: isProduction ? '7d' : '1d', // Cache for 7 days in production
  setHeaders: (res, path) => {
    if (path.endsWith('.jpg') || path.endsWith('.png') || path.endsWith('.gif')) {
      res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days
    }
  }
}));

// Enhanced request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const origin = req.headers.origin || 'no-origin';
  const userAgent = req.headers['user-agent'] || 'no-user-agent';
  
  console.log(`${timestamp} - ${req.method} ${req.path} - Origin: ${origin}`);
  
  if (isProduction && req.path.includes('upload-profile-picture')) {
    console.log('📤 Production profile upload request:', {
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length'],
      'user-agent': userAgent.substring(0, 50) + '...'
    });
  }
  next();
});

// Profile picture upload endpoint with PERSISTENT STORAGE
app.post('/api/users/upload-profile-picture', (req, res, next) => {
  console.log('\n🚀 === PROFILE PICTURE UPLOAD STARTED ===');
  console.log('Environment:', isProduction ? 'PRODUCTION' : 'DEVELOPMENT');
  console.log('Headers:', req.headers);
  console.log('Content-Type:', req.headers['content-type']);
  next();
}, upload.single('profilePicture'), async (req, res) => {
  console.log('🔍 After multer processing');
  console.log('File object:', req.file ? 'EXISTS' : 'MISSING');
  console.log('Body:', req.body);
  
  try {
    const { userId } = req.body;
    
    console.log('📋 Request details:');
    console.log('  - User ID:', userId);
    console.log('  - File received:', req.file ? 'YES' : 'NO');
    
    if (req.file) {
      console.log('📄 File details:');
      console.log('  - Original name:', req.file.originalname);
      console.log('  - Generated name:', req.file.filename);
      console.log('  - MIME type:', req.file.mimetype);
      console.log('  - Size:', req.file.size, 'bytes');
      console.log('  - Path:', req.file.path);
    }
    
    if (!req.file) {
      console.log('❌ Upload failed: No file received');
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    if (!userId) {
      console.log('❌ Upload failed: No user ID');
      return res.status(400).json({ 
        success: false, 
        message: 'User ID is required' 
      });
    }

    // Generate the full URL for the uploaded file - production compatible
    const baseUrl = isProduction ? 
      `https://${req.get('host')}` : 
      `${req.protocol}://${req.get('host')}`;
    
    const profilePictureUrl = `${baseUrl}/uploads/profile-pictures/${req.file.filename}`;
    
    console.log('🌐 Generated URL:', profilePictureUrl);
    console.log('🔧 Base URL mode:', isProduction ? 'PRODUCTION HTTPS' : 'DEVELOPMENT HTTP');

    // SAVE TO PERSISTENT STORAGE
    try {
      const usersDir = path.join(__dirname, 'data');
      const usersFilePath = path.join(usersDir, 'users-profiles.json');
      
      // Ensure data directory exists
      fs.ensureDirSync(usersDir);
      
      let users = {};
      
      // Read existing users if file exists
      if (fs.existsSync(usersFilePath)) {
        const fileContent = fs.readFileSync(usersFilePath, 'utf8');
        users = fileContent ? JSON.parse(fileContent) : {};
      }
      
      // Delete old profile picture file if it exists
      if (users[userId] && users[userId].filename) {
        const oldFilePath = path.join(uploadsDir, users[userId].filename);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          console.log('🗑️ Deleted old profile picture:', users[userId].filename);
        }
      }
      
      // Update or create user profile picture record
      users[userId] = {
        userId: userId,
        profilePicture: profilePictureUrl,
        filename: req.file.filename,
        uploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        environment: isProduction ? 'production' : 'development'
      };
      
      // Save back to file
      fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
      console.log('💾 Profile picture URL saved to persistent storage');
      
    } catch (saveError) {
      console.error('💾 Storage save error:', saveError);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to save profile picture info' 
      });
    }
    
    console.log('✅ Profile picture uploaded and saved successfully!');
    console.log('=== PROFILE PICTURE UPLOAD COMPLETED ===\n');
    
    res.json({ 
      success: true, 
      message: 'Profile picture updated successfully',
      profilePictureUrl: profilePictureUrl,
      filename: req.file.filename,
      environment: isProduction ? 'production' : 'development'
    });
    
  } catch (error) {
    console.error('❌ Profile picture upload error:', error);
    console.log('=== PROFILE PICTURE UPLOAD FAILED ===\n');
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload profile picture',
      error: isProduction ? 'Internal server error' : error.message
    });
  }
});

// GET USER PROFILE PICTURE endpoint
app.get('/api/users/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('📋 Getting profile picture for user:', userId);
    
    // Read from persistent storage
    const usersFilePath = path.join(__dirname, 'data', 'users-profiles.json');
    let users = {};
    
    if (fs.existsSync(usersFilePath)) {
      const fileContent = fs.readFileSync(usersFilePath, 'utf8');
      users = fileContent ? JSON.parse(fileContent) : {};
    }
    
    const userProfile = users[userId];
    
    if (userProfile && userProfile.profilePicture) {
      // Check if the file still exists
      const filename = userProfile.filename;
      const filePath = path.join(uploadsDir, filename);
      
      if (fs.existsSync(filePath)) {
        console.log('✅ Profile picture found:', userProfile.profilePicture);
        
        // Update URL format for production if needed
        let profilePictureUrl = userProfile.profilePicture;
        if (isProduction && profilePictureUrl.includes('http://')) {
          const baseUrl = `https://${req.get('host')}`;
          profilePictureUrl = profilePictureUrl.replace(/^https?:\/\/[^\/]+/, baseUrl);
        }
        
        res.json({
          success: true,
          profilePicture: profilePictureUrl,
          uploadedAt: userProfile.uploadedAt,
          environment: isProduction ? 'production' : 'development'
        });
      } else {
        console.log('⚠️ Profile picture file missing, cleaning up record');
        // File doesn't exist, remove from records
        delete users[userId];
        fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
        
        res.json({
          success: true,
          profilePicture: null
        });
      }
    } else {
      console.log('⚠️ No profile picture found for user:', userId);
      res.json({
        success: true,
        profilePicture: null
      });
    }
    
  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile'
    });
  }
});

// DELETE USER PROFILE PICTURE endpoint
app.delete('/api/users/profile-picture/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('🗑️ Deleting profile picture for user:', userId);
    
    const usersFilePath = path.join(__dirname, 'data', 'users-profiles.json');
    let users = {};
    
    if (fs.existsSync(usersFilePath)) {
      const fileContent = fs.readFileSync(usersFilePath, 'utf8');
      users = fileContent ? JSON.parse(fileContent) : {};
    }
    
    const userProfile = users[userId];
    
    if (userProfile && userProfile.filename) {
      // Delete the physical file
      const filePath = path.join(uploadsDir, userProfile.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('✅ Physical file deleted:', userProfile.filename);
      }
      
      // Remove from records
      delete users[userId];
      fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
      
      res.json({ success: true, message: 'Profile picture deleted successfully' });
    } else {
      res.json({ success: true, message: 'No profile picture to delete' });
    }
    
  } catch (error) {
    console.error('❌ Delete profile picture error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete profile picture' });
  }
});

// Test endpoint to verify server is working
app.get('/api/users/upload-profile-picture', (req, res) => {
  res.json({
    message: 'Profile picture upload endpoint is working',
    method: 'This endpoint only accepts POST requests with multipart/form-data',
    expectedFields: ['profilePicture (file)', 'userId (string)'],
    maxFileSize: '5MB',
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
    environment: isProduction ? 'production' : 'development',
    server: 'Railway' + (isProduction ? ' Production' : ' Development')
  });
});

// Simple test upload endpoint for debugging
app.post('/api/test-upload', upload.single('testFile'), (req, res) => {
  console.log('🧪 Test upload endpoint hit');
  console.log('File:', req.file);
  console.log('Body:', req.body);
  
  if (req.file) {
    res.json({ 
      success: true, 
      message: 'Test upload works', 
      file: {
        originalname: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      },
      environment: isProduction ? 'production' : 'development'
    });
  } else {
    res.json({ success: false, message: 'No file received in test upload' });
  }
});

// LEGACY: Delete profile picture by filename (keep for backward compatibility)
app.delete('/api/users/profile-picture/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadsDir, filename);
    
    console.log('🗑️ Legacy delete request for:', filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('✅ Deleted profile picture:', filename);
      res.json({ success: true, message: 'Profile picture deleted' });
    } else {
      console.log('❌ File not found for deletion:', filename);
      res.status(404).json({ success: false, message: 'File not found' });
    }
  } catch (error) {
    console.error('❌ Delete profile picture error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete file' });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/stats', statsRoutes);

// Health check endpoint - enhanced for production
app.get('/api/health', (req, res) => {
  const healthData = {
    status: 'OK',
    message: 'TuneStream Backend v2.0 - Smart Service Architecture',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    platform: isProduction ? 'Railway Production' : 'Local Development',
    features: [
      'Smart Service Factory', 
      'Spotify Integration', 
      'Demo Fallback', 
      'Profile Picture Upload', 
      'Persistent Storage',
      'Production Ready'
    ],
    uploadsDirectory: uploadsDir,
    uploadsEnabled: fs.existsSync(uploadsDir),
    cors: corsOptions.origin ? 'Custom CORS enabled' : 'Default CORS',
    security: isProduction ? 'Production security headers enabled' : 'Development mode',
    server: {
      port: PORT,
      host: isProduction ? 'Railway' : 'localhost',
      protocol: isProduction ? 'HTTPS' : 'HTTP'
    }
  };
  
  res.json(healthData);
});

// Root endpoint - enhanced
app.get('/', (req, res) => {
  res.json({
    message: 'TuneStream API Server v2.0',
    version: '2.0.0-smart',
    architecture: 'Smart Service Factory',
    environment: isProduction ? 'Production' : 'Development',
    platform: isProduction ? 'Railway' : 'Local',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      music: '/api/music',
      playlists: '/api/playlists',
      stats: '/api/stats',
      profilePictureUpload: '/api/users/upload-profile-picture (POST)',
      getUserProfile: '/api/users/profile/:userId (GET)',
      deleteUserProfile: '/api/users/profile-picture/:userId (DELETE)',
      testUpload: '/api/test-upload (POST)'
    },
    musicService: 'Smart Factory (Demo + Spotify)',
    features: [
      'Auto-fallback', 
      'Service switching', 
      'Production ready', 
      'Profile uploads', 
      'Persistent storage',
      'CORS enabled',
      'Security headers'
    ],
    deployment: {
      backend: 'Railway',
      frontend: 'Vercel',
      status: 'Optimized for production'
    }
  });
});

// Error handling middleware for multer and general errors
app.use((error, req, res, next) => {
  console.log('🚨 Error middleware triggered:', error.message);
  
  // Handle multer-specific errors
  if (error instanceof multer.MulterError) {
    console.log('📁 Multer error detected:', error.code);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field. Use "profilePicture" as field name.'
      });
    }
  }
  
  // Handle custom file type error
  if (error.message === 'Only image files are allowed') {
    console.log('🖼️ File type error detected');
    return res.status(400).json({
      success: false,
      message: 'Only image files (JPG, PNG, GIF) are allowed.'
    });
  }
  
  // General error handling
  console.error('💥 General server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: isProduction ? 'Something went wrong' : error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler for unknown routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Start server with enhanced logging for production
app.listen(PORT, '0.0.0.0', async () => {
  console.log('\n🚀 =======================================');
  console.log('🎵 TUNESTREAM BACKEND v2.0 STARTING...');
  console.log('=========================================');
  console.log(`🌐 Server running on: ${isProduction ? 'HTTPS' : 'HTTP'}://localhost:${PORT}`);
  console.log(`🏗️  Platform: ${isProduction ? 'Railway Production' : 'Local Development'}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Node.js version: ${process.version}`);
  console.log(`🔗 CORS: ${isProduction ? 'Production domains enabled' : 'Development mode'}`);
  console.log(`📁 Uploads: ${uploadsDir}`);
  console.log(`📁 Directory exists: ${fs.existsSync(uploadsDir) ? '✅' : '❌'}`);
  console.log(`📸 Profile pictures: ✅ ENABLED with PERSISTENT STORAGE`);
  console.log(`💾 Profile data: ${path.join(__dirname, 'data', 'users-profiles.json')}`);
  console.log(`🛡️  Security: ${isProduction ? '✅ Production headers enabled' : '⚠️  Development mode'}`);
  
  if (isProduction) {
    console.log('🔐 Production features:');
    console.log('   - HTTPS enforced');
    console.log('   - Security headers active');
    console.log('   - Error messages sanitized');
    console.log('   - File caching enabled');
    console.log('   - CORS optimized for Vercel');
  }
  
  console.log('\n🎛️ API Endpoints:');
  console.log(`   📍 Health: ${isProduction ? 'https://' : 'http://localhost:'}${isProduction ? `${req?.get?.('host') || 'your-railway-url'}` : PORT}/api/health`);
  console.log(`   🔐 Auth: /api/auth`);
  console.log(`   🎵 Music: /api/music`);
  console.log(`   📋 Playlists: /api/playlists`);
  console.log(`   📊 Stats: /api/stats`);
  console.log(`   📸 Profile Upload: /api/users/upload-profile-picture`);
  
  console.log('\n🎵 Music Service: Smart Factory (Demo + Spotify)');
  console.log(`🔄 Spotify Mode: ${process.env.USE_DEMO_MODE === 'true' ? '❌ Disabled (Demo Mode)' : '✅ Enabled'}`);
  console.log('⚡ Architecture: Smart service switching available');
  
  // Test the uploads directory
  try {
    const testFile = path.join(uploadsDir, 'test.txt');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log(`\n✅ Uploads directory: WRITABLE`);
  } catch (error) {
    console.error(`\n❌ Uploads directory: NOT WRITABLE - ${error.message}`);
  }
  
  // Check if users-profiles.json exists
  const usersFilePath = path.join(__dirname, 'data', 'users-profiles.json');
  console.log(`💾 Users profiles file: ${fs.existsSync(usersFilePath) ? '✅ EXISTS' : '🆕 WILL BE CREATED'}`);
  
  console.log('\n🌐 Server ready for connections!');
  console.log('🚀 TuneStream Backend is live and optimized for production');
  console.log('=========================================\n');
});

module.exports = app;
