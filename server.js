const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

// 1. Initialize Express App
const app = express();

// 2. Import Route Handlers
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const bidRoutes = require('./routes/bidRoutes');
const publicRoutes = require('./routes/publicRoutes');

// 3. Import Background Tasks
const startCronJobs = require('./utils/cronJobs');
const initBidCron = require('./crons/bidResolver');

// 4. Import Swagger Documentation (Ensure docs/swagger.json exists)
const swaggerDocument = require('./docs/swagger.json');

// --- GLOBAL MIDDLEWARE & SECURITY[cite: 1] ---

// Secure HTTP headers with Helmet.js[cite: 1]
app.use(helmet());

// Cross-Origin Resource Sharing (CORS) Configuration[cite: 1]
const corsOptions = {
    origin: process.env.CLIENT_ORIGIN || '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Body Parsing Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting Protection on sensitive endpoints[cite: 1]
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: { error: 'Too many requests from this IP, please try again later.' },
    standardHeaders: true, 
    legacyHeaders: false, 
});
app.use(globalLimiter);

// --- API DOCUMENTATION ---

// Serve full Swagger/OpenAPI documentation with interactive UI at /api-docs[cite: 1]
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// --- ROUTE MOUNTING ---

// Base Health Check Route
app.get('/', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Phantasmagoria API is running securely.' });
});

// Mount modular feature routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/public', publicRoutes);

// Make the 'uploads' folder publicly accessible for profile image viewing
app.use('/uploads', express.static('uploads'));

// Global 404 Handler (Catch-all for unknown routes)
app.use((req, res, next) => {
    res.status(404).json({ error: 'API endpoint not found.' });
});

// Global Error Handler (Catches unhandled errors so the server doesn't crash with HTML)
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err.stack);
    res.status(500).json({ error: 'An unexpected internal server error occurred.' });
});

// --- INITIALIZATION ---

// Start the midnight automated winner selection cron job
initBidCron();
startCronJobs();

// Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`Swagger Documentation available at http://localhost:${PORT}/api-docs`);
});