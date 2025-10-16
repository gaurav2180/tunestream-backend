const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 9000;

console.log('🚀 Starting TuneStream Backend with NPM...');
console.log('📦 Node.js version:', process.version);
console.log('🔧 NPM mode: production install');

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://tunestream.vercel.app',
    'https://tunestream-frontend.vercel.app',
    /https:\/\/.*\.vercel\.app$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  console.log('✅ Root endpoint accessed');
  res.json({
    message: 'TuneStream Backend is LIVE on Railway! 🚀',
    status: 'OK',
    platform: 'Railway',
    deployment: 'NPM + Node.js',
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    port: PORT,
    uptime: Math.floor(process.uptime())
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('🏥 Health check accessed');
  res.json({
    status: 'healthy',
    platform: 'Railway',
    deployment: 'NPM + Node.js Success',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpuUsage: process.cpuUsage()
  });
});

// Basic auth endpoints (stubs for frontend)
app.post('/api/auth/login', (req, res) => {
  console.log('🔐 Login endpoint accessed');
  const { email, password } = req.body;
  res.json({
    success: true,
    user: { 
      id: email || 'test@example.com', 
      email: email || 'test@example.com', 
      fullName: 'Railway Test User' 
    },
    token: 'railway-npm-token-' + Date.now()
  });
});

app.post('/api/auth/register', (req, res) => {
  console.log('📝 Register endpoint accessed');
  const { fullName, email, password } = req.body;
  res.json({
    success: true,
    user: { 
      id: email || 'new@example.com', 
      email: email || 'new@example.com', 
      fullName: fullName || 'New Railway User' 
    },
    token: 'railway-npm-token-' + Date.now()
  });
});

app.get('/api/auth/verify', (req, res) => {
  console.log('✅ Auth verify accessed');
  res.json({ 
    success: true,
    platform: 'Railway',
    deployment: 'NPM + Node.js'
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Railway NPM deployment test successful!',
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint
app.get('/api/debug', (req, res) => {
  res.json({
    environment: process.env.NODE_ENV,
    port: PORT,
    nodeVersion: process.version,
    platform: process.platform,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    loadedModules: Object.keys(require.cache).length,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error.message);
  res.status(500).json({
    error: 'Internal Server Error',
    message: error.message,
    platform: 'Railway',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log('❓ 404 - Route not found:', req.originalUrl);
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET /',
      'GET /api/health', 
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET /api/auth/verify',
      'GET /api/test',
      'GET /api/debug'
    ],
    platform: 'Railway',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, '0.0.0.0', (err) => {
  if (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
  
  console.log('\n🎉 ========================================');
  console.log('🚀 TUNESTREAM BACKEND STARTED ON RAILWAY!');
  console.log('==========================================');
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(`📦 Deployment: NPM + Node.js`);
  console.log(`🔧 Node.js: ${process.version}`);
  console.log(`🏗️  Platform: Railway`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`⏱️  Started at: ${new Date().toLocaleString()}`);
  console.log('✅ Server is healthy and ready for requests!');
  console.log('==========================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Error handlers
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('💥 Unhandled Promise Rejection:', err);
  process.exit(1);
});

module.exports = app;
