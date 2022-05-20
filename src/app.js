require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const passport = require('./config/passport');
const { helmetConfig, corsOptions, xssProtection, requestId } = require('./middleware/security');
const { generalLimiter, authLimiter, passwordResetLimiter } = require('./middleware/rateLimiter');
const { auditMiddleware } = require('./middleware/auditMiddleware');
const authRoutes = require('./routes/auth');
const passwordRoutes = require('./routes/password');
const oauthRoutes = require('./routes/oauth');
const userRoutes = require('./routes/users');
const verificationRoutes = require('./routes/verification');
const adminRoutes = require('./routes/admin');
const sessionRoutes = require('./routes/sessions');
const twoFactorRoutes = require('./routes/twoFactor');
const apiKeyRoutes = require('./routes/apiKeys');
const docsRoutes = require('./routes/docs');

const app = express();

// Security middleware
app.use(helmetConfig);
app.use(cors(corsOptions));
app.use(requestId);
app.use(xssProtection);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));
app.use(passport.initialize());

// Apply general rate limiter to all routes
app.use(generalLimiter);

// Audit logging
app.use(auditMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'auth-service',
    timestamp: new Date().toISOString()
  });
});

// Routes with specific rate limiters
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/password', passwordResetLimiter, passwordRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/2fa', twoFactorRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/docs', docsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Auth Service API',
    version: '1.0.0',
    docs: '/api/docs'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Auth Service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
