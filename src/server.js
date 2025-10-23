const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const config = require('./config/config');
const connectDB = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const swaggerSpec = require('./config/swagger');

// Import routes
const authRoutes = require('./routes/auth.routes');
const companyRoutes = require('./routes/company.routes');
const userRoutes = require('./routes/user.routes');

// Initialize express app
const app = express();

// Connect to database
connectDB();

// Start Redis consumer for analysis results
const analysisConsumer = require('./services/analysisConsumer');
analysisConsumer.connect().catch(err => {
  console.error('Failed to start analysis consumer:', err);
});

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Compression
app.use(compression());

// Logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customSiteTitle: 'CA Management API Documentation',
  customCss: '.swagger-ui .topbar { display: none }',
}));

// API routes
const documentRoutes = require('./routes/document.routes');
const analysisRoutes = require('./routes/analysis.routes');
const benchmarkRoutes = require('./routes/benchmark.routes');
const analysisNoteRoutes = require('./routes/analysisNote.routes');
const pdfRoutes = require('./routes/pdf.routes');
const adminRoutes = require('./routes/admin.routes');
const caRoutes = require('./routes/ca.routes');

app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/benchmarks', benchmarkRoutes);
app.use('/api/analysis-notes', analysisNoteRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ca', caRoutes);

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
  console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

module.exports = app;
