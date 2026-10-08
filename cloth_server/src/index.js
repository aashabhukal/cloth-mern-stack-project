import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { router } from './routes/routes.js';

// Load environment variables
dotenv.config({ quiet: true });

// Constants
const port = process.env.PORT || 9090;
const isProduction = process.env.NODE_ENV === 'production';

// Initialize express app
const app = express();

// ============ SECURITY MIDDLEWARE ============

// Helmet - Security headers
app.use(helmet({
    // Content Security Policy
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    // Prevent clickjacking
    frameguard: { action: 'deny' },
    // Hide powered by
    hidePoweredBy: true,
    // Prevent MIME type sniffing
    noSniff: true,
    // Strict Transport Security (HSTS)
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
    // XSS protection
    xssFilter: true,
    // Referrer policy
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// ============ RATE LIMITING ============

// Global rate limiter - 1000 requests per second
const globalLimiter = rateLimit({
    windowMs: 1000, // 1 second
    max: 1000, // 1000 requests per window
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
    message: {
        success: false,
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again after 1 second.',
        retryAfter: 1,
        timestamp: new Date().toISOString()
    },
    statusCode: 429,
    keyGenerator: (req) => {
        // Use X-Forwarded-For for proxy/cloudflare
        return req.headers['x-forwarded-for'] || req.ip;
    },
    skip: (req) => {
        // Skip rate limiting for health check endpoints
        return req.path === '/health' || req.path === '/ping';
    },
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json(options.message);
    },
});

// Apply global rate limiter to all routes
app.use(globalLimiter);

// Specific rate limiter for sensitive routes (login, registration, etc.)
const sensitiveLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many requests',
        message: 'Too many login attempts. Please try again after 1 minute.',
        retryAfter: 60,
        timestamp: new Date().toISOString()
    },
    statusCode: 429,
});

// Apply sensitive rate limiter to specific routes
// app.use('/api/login', sensitiveLimiter);
// app.use('/api/register', sensitiveLimiter);

// ============ PARSING MIDDLEWARE ============

// JSON parser with size limits
app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf) => {
        // Store raw body for signature verification
        req.rawBody = buf.toString();
    }
}));

// URL encoded parser
app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb' 
}));

// ============ CORS CONFIGURATION ============

// CORS options
// const corsOptions = {
//     // Allow specific origins (comma separated in .env)
//     origin: process.env.ALLOWED_ORIGINS 
//         ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
//         : '*',
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//     allowedHeaders: [
//         'Content-Type',
//         'Authorization',
//         'X-Requested-With',
//         'Accept',
//         'Origin',
//         'Access-Control-Allow-Origin'
//     ],
//     exposedHeaders: ['Content-Range', 'X-Content-Range'],
//     credentials: true,
//     optionsSuccessStatus: 200,
//     maxAge: 86400, // 24 hours
// };

// Apply CORS
app.use(cors());

// ============ REQUEST LOGGING ============

// Logging middleware
// app.use((req, res, next) => {
//     const start = Date.now();
//     res.on('finish', () => {
//         const duration = Date.now() - start;
//         const log = `[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} - ${duration}ms`;
//         if (res.statusCode >= 400) {
//             console.error(log);
//         } else {
//             console.log(log);
//         }
//     });
//     next();
// });

// ============ HEALTH CHECK ============

// Health check endpoint
// app.get('/health', (req, res) => {
//     res.status(200).json({
//         status: 'ok',
//         timestamp: new Date().toISOString(),
//         uptime: process.uptime(),
//         environment: process.env.NODE_ENV || 'development',
//         memory: process.memoryUsage(),
//         version: process.version
//     });
// });

// ============ ROUTES ============

// Main router
app.use('/', router);

// ============ ERROR HANDLING ============

// 404 handler
// app.use((req, res) => {
//     res.status(404).json({
//         success: false,
//         error: 'Not Found',
//         message: `Route ${req.method} ${req.path} not found`,
//         status: 404,
//         timestamp: new Date().toISOString()
//     });
// });

// Global error handler
// app.use((err, req, res, next) => {
//     // Log error
//     console.error(`[${new Date().toISOString()}] Error:`, {
//         message: err.message,
//         stack: isProduction ? undefined : err.stack,
//         path: req.path,
//         method: req.method,
//         ip: req.ip,
//         userAgent: req.get('user-agent')
//     });

//     // Handle specific error types
//     if (err.type === 'entity.too.large') {
//         return res.status(413).json({
//             success: false,
//             error: 'Payload Too Large',
//             message: 'Request body size exceeds limit',
//             status: 413,
//             timestamp: new Date().toISOString()
//         });
//     }

//     // Default error response
//     const statusCode = err.statusCode || 500;
//     const message = isProduction 
//         ? 'Internal Server Error' 
//         : err.message || 'Something went wrong';
    
//     res.status(statusCode).json({
//         success: false,
//         error: message,
//         status: statusCode,
//         timestamp: new Date().toISOString(),
//         ...(isProduction ? {} : { stack: err.stack })
//     });
// });

// ============ START SERVER ============

// const server = app.listen(port, () => {
//     console.log(`🚀 Server running on port ${port}`);
//     console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
//     console.log(`🔗 Health check: http://localhost:${port}/health`);
//     console.log(`⏱️  Rate limit: 1000 requests per second per IP`);
//     console.log(`🔒 Security: Helmet enabled with CSP`);
//     console.log(`📊 CORS: ${corsOptions.origin === '*' ? 'All origins allowed' : 'Restricted origins'}`);
// });

// ============ GRACEFUL SHUTDOWN ============

// const shutdown = (signal) => {
//     console.log(`\n📡 Received ${signal}. Shutting down gracefully...`);
//     server.close(() => {
//         console.log('👋 Server closed successfully');
//         process.exit(0);
//     });
    
//     // Force shutdown after 10 seconds
//     setTimeout(() => {
//         console.error('⚠️  Force shutdown after timeout');
//         process.exit(1);
//     }, 10000);
// };

// Handle termination signals
// process.on('SIGTERM', () => shutdown('SIGTERM'));
// process.on('SIGINT', () => shutdown('SIGINT'));

// // ============ UNCAUGHT EXCEPTIONS ============

// process.on('uncaughtException', (error) => {
//     console.error('💥 Uncaught Exception:', error);
//     shutdown('uncaughtException');
// });

// process.on('unhandledRejection', (reason, promise) => {
//     console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
//     shutdown('unhandledRejection');
// });

// export default app;

app.listen(port,()=> console.log(`server is running port  = ${port}`))