// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const userRoutes = require('./routes/userRoutes');
const rateLimit = require('express-rate-limit');

// Create Express app
const app = express();
const PORT = process.env.PORT || 5001;

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Set timeout for all requests
app.use((req, res, next) => {
    res.setTimeout(30000, () => {
        res.status(408).send('Request Timeout');
    });
    next();
});

// Debug middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Request Headers:', req.headers);
    next();
});

// CORS configuration
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? 'https://betterbank2024.netlify.app'
        : 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Health check routes
app.get('/test', (req, res) => {
    res.json({ message: 'Server is working', timestamp: new Date().toISOString() });
});

app.head('/test', (req, res) => {
    res.status(200).end();
});

// Mount user routes
app.use('/api/users', userRoutes);

// MongoDB connection with retry logic
const MONGODB_URI = process.env.NODE_ENV === 'production'
    ? 'mongodb+srv://ethanmiles93:IdejFG9kIc2OiB3y@badbank-cluster.bn7e4.mongodb.net/badbank?retryWrites=true&w=majority'
    : 'mongodb://localhost:27017/badbank';

const connectWithRetry = async () => {
    try {
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('Connected to MongoDB');
        startServer();
    } catch (err) {
        console.error('MongoDB connection error:', err);
        console.log('Retrying in 5 seconds...');
        setTimeout(connectWithRetry, 5000);
    }
};

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected! Attempting to reconnect...');
    setTimeout(connectWithRetry, 5000);
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB error:', err);
    if (err.name === 'MongoNetworkError') {
        setTimeout(connectWithRetry, 5000);
    }
});

// Start server function
const startServer = () => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    }).on('error', (err) => {
        console.error('Server error:', err);
        process.exit(1);
    });
};

// Initial connection attempt
connectWithRetry();

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Performing graceful shutdown...');
    mongoose.connection.close(() => {
        console.log('MongoDB connection closed.');
        process.exit(0);
    });
});

// 404 handler
app.use((req, res) => {
    console.log('404 - Route not found:', req.url);
    res.status(404).json({ 
        message: 'API route not found',
        path: req.url,
        timestamp: new Date().toISOString()
    });
});

// Enhanced error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // Determine error status
    const status = err.status || err.statusCode || 500;
    
    // Create error response
    const errorResponse = {
        message: err.message || 'Something went wrong!',
        status,
        timestamp: new Date().toISOString(),
    };

    // Add stack trace in development
    if (process.env.NODE_ENV !== 'production') {
        errorResponse.stack = err.stack;
    }

    res.status(status).json(errorResponse);
});