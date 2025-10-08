require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');

const app = express();

// Production configuration
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 9000;

console.log(`🚀 Starting TuneStream Backend (${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'})`);

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
    
    if (isAllowed || !isProduction) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      callback(null, false);
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
try {
  fs.ensureDirSync(path.join(__dirname, 'data'));
  console.log('✅ Data directory created/verified');
} catch (error) {
  console.log('⚠️ Data directory creation failed:', error.message);
}

// Create uploads directory for profile pictures
const uploadsDir = path.join(__dirname, 'uploads', 'profile-pictures');
try {
  console.log('📁 Creating uploads directory:', uploadsDir);
  fs.ensureDirSync(uploadsDir);
  console.log('✅ Uploads directory created/verified');
} catch (error) {
  console.log('⚠️ Uploads directory creation failed:', error.message);
}

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
  maxAge: isProduction ? '7d' : '1d',
  setHeaders: (res, path) => {
    if (path.endsWith('.jpg') || path.endsWith('.png') || path.endsWith('.gif')) {
      res.setHeader('Cache-Control', 'public, max-age=604800');
    }
  }
}));

// Enhanced request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const origin = req.headers.origin || 'no-origin';
  
  console.log(`${timestamp} - ${req.method} ${req.path} - Origin: ${origin}`);
  next();
});

// Root endpoint - MUST BE FIRST
app.get('/', (req, res) => {
  console.log('🏠 Root endpoint hit');
  res.json({
    message: 'TuneStream API Server v2.0',
    version: '2.0.0-smart',
    status: 'OK',
    architecture: 'Smart Service Factory',
    environment: isProduction ? 'Production' : 'Development',
    platform: isProduction ? 'Railway' : 'Local',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      profilePictureUpload: '/api/users/upload-profile-picture (POST)',
      getUserProfile: '/api/users/profile/:userId (GET)',
      deleteUserProfile: '/api/users/profile-picture/:userId (DELETE)',
      testUpload: '/api/test-upload (POST)'
    },
    features: [
      'Profile picture uploads', 
      'Persistent storage',
      'CORS enabled',
      'Production ready'
    ],
    deployment: {
      backend: 'Railway',
      status: 'Live and healthy'
    }
  });
});

// Health check endpoint - MUST WORK
app.get('/api/health', (req, res) => {
  console.log('🏥 Health check endpoint hit');
  
  try {
    const healthData = {
      status: 'OK',
      message: 'TuneStream Backend v2.0 - Healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      platform: isProduction ? 'Railway Production' : 'Local Development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      features: [
        'Profile Picture Upload', 
        'Persistent Storage',
        'Production Ready'
      ],
      uploadsDirectory: uploadsDir,
      uploadsEnabled: fs.existsSync(uploadsDir),
      server: {
        port: PORT,
        host: isProduction ? 'Railway' : 'localhost',
        protocol: isProduction ? 'HTTPS' : 'HTTP'
      }
    };
    
    res.json(healthData);
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Profile picture upload endpoint
app.post('/api/users/upload-profile-picture', (req, res, next) => {
  console.log('\n🚀 === PROFILE PICTURE UPLOAD STARTED ===');
  console.log('Environment:', isProduction ? 'PRODUCTION' : 'DEVELOPMENT');
  next();
}, upload.single('profilePicture'), async (req, res) => {
  console.log('🔍 After multer processing');
  console.log('File object:', req.file ? 'EXISTS' : 'MISSING');
  console.log('Body:', req.body);
  
  try {
    const { userId } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID is required' 
      });
    }

    const baseUrl = isProduction ? 
      `https://${req.get('host')}` : 
      `${req.protocol}://${req.get('host')}`;
    
    const profilePictureUrl = `${baseUrl}/uploads/profile-pictures/${req.file.filename}`;

    // SAVE TO PERSISTENT STORAGE
    try {
      const usersDir = path.join(__dirname, 'data');
      const usersFilePath = path.join(usersDir, 'users-profiles.json');
      
      fs.ensureDirSync(usersDir);
      
      let users = {};
      
      if (fs.existsSync(usersFilePath)) {
        const fileContent = fs.readFileSync(usersFilePath, 'utf8');
        users = fileContent ? JSON.parse(fileContent) : {};
      }
      
      // Delete old profile picture if exists
      if (users[userId] && users[userId].filename) {
        const oldFilePath = path.join(uploadsDir, users[userId].filename);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          console.log('🗑️ Deleted old profile picture');
        }
      }
      
      users[userId] = {
        userId: userId,
        profilePicture: profilePictureUrl,
        filename: req.file.filename,
        uploadedAt: new Date().toISOString(),
        environment: isProduction ? 'production' : 'development'
      };
      
      fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
      console.log('💾 Profile picture saved to storage');
      
    } catch (saveError) {
      console.error('💾 Storage save error:', saveError);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to save profile picture info' 
      });
    }
    
    console.log('✅ Profile picture upload completed');
    
    res.json({ 
      success: true, 
      message: 'Profile picture updated successfully',
      profilePictureUrl: profilePictureUrl,
      filename: req.file.filename,
      environment: isProduction ? 'production' : 'development'
    });
    
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload profile picture',
      error: isProduction ? 'Internal server error' : error.message
    });
  }
});

// GET user profile endpoint
app.get('/api/users/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const usersFilePath = path.join(__dirname, 'data', 'users-profiles.json');
    
    let users = {};
    if (fs.existsSync(usersFilePath)) {
      const fileContent = fs.readFileSync(usersFilePath, 'utf8');
      users = fileContent ? JSON.parse(fileContent) : {};
    }
    
    const userProfile = users[userId];
    
    if (userProfile && userProfile.profilePicture) {
      const filename = userProfile.filename;
      const filePath = path.join(uploadsDir, filename);
      
      if (fs.existsSync(filePath)) {
        let profilePictureUrl = userProfile.profilePicture;
        if (isProduction && profilePictureUrl.includes('http://')) {
          const baseUrl = `https://${req.get('host')}`;
          profilePictureUrl = profilePictureUrl.replace(/^https?:\/\/[^\/]+/, baseUrl);
        }
        
        res.json({
          success: true,
          profilePicture: profilePictureUrl,
          uploadedAt: userProfile.uploadedAt
        });
      } else {
        delete users[userId];
        fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
        res.json({ success: true, profilePicture: null });
      }
    } else {
      res.json({ success: true, profilePicture: null });
    }
    
  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to get user profile' });
  }
});

// DELETE user profile endpoint
app.delete('/api/users/profile-picture/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const usersFilePath = path.join(__dirname, 'data', 'users-profiles.json');
    
    let users = {};
    if (fs.existsSync(usersFilePath)) {
      const fileContent = fs.readFileSync(usersFilePath, 'utf8');
      users = fileContent ? JSON.parse(fileContent) : {};
    }
    
    const userProfile = users[userId];
    
    if (userProfile && userProfile.filename) {
      const filePath = path.join(uploadsDir, userProfile.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      delete users[userId];
      fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
    }
    
    res.json({ success: true, message: 'Profile picture deleted successfully' });
    
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete profile picture' });
  }
});

// Simple auth endpoints (basic stubs)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  // Basic stub - replace with real auth later
  res.json({
    success: true,
    user: { id: email, email: email, fullName: 'Test User' },
    token: 'dummy-token-' + Date.now()
  });
});

app.post('/api/auth/register', (req, res) => {
  const { fullName, email, password } = req.body;
  // Basic stub - replace with real auth later
  res.json({
    success: true,
    user: { id: email, email: email, fullName: fullName },
    token: 'dummy-token-' + Date.now()
  });
});

app.get('/api/auth/verify', (req, res) => {
  // Basic stub - replace with real auth later
  res.json({ success: true });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.log('🚨 Error middleware triggered:', error.message);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB.'
      });
    }
  }
  
  if (error.message === 'Only image files are allowed') {
    return res.status(400).json({
      success: false,
      message: 'Only image files (JPG, PNG, GIF) are allowed.'
    });
  }
  
  console.error('💥 General server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: isProduction ? 'Something went wrong' : error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log('❓ 404 - Route not found:', req.originalUrl);
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Start server
app.listen(PORT, '0.0.0.0', (err) => {
  if (err) {
    console.error('❌ Server failed to start:', err);
    process.exit(1);
  }
  
  console.log('\n🚀 =======================================');
  console.log('🎵 TUNESTREAM BACKEND v2.0 STARTED!');
  console.log('=========================================');
  console.log(`🌐 Server: ${isProduction ? 'HTTPS' : 'HTTP'}://localhost:${PORT}`);
  console.log(`🏗️  Platform: ${isProduction ? 'Railway Production' : 'Local'}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📁 Uploads: ${uploadsDir}`);
  console.log(`📸 Profile uploads: ENABLED`);
  console.log('\n✅ Server is healthy and ready!');
  console.log('=========================================\n');
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  process.exit(1);
});

module.exports = app;
