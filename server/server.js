// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const userRoutes = require('./routes/userRoutes');
console.log('Routes loaded:', Object.keys(userRoutes));

// Create Express app
const app = express();
const PORT = process.env.PORT || 5001;

// Debug middleware to log requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Request Headers:', req.headers);
    next();
});

// Middleware
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? 'https://spectacular-starburst-5c92ac.netlify.app'
        : 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight requests

app.use(express.json());

// Mount user routes
app.use('/api/users', userRoutes);

// Test route
app.get('/test', (req, res) => {
    res.json({ message: 'Server is working' });
});

// MongoDB connection
const MONGODB_URI = process.env.NODE_ENV === 'production'
    ? 'mongodb+srv://ethanmiles93:IdejFG9kIc2OiB3y@badbank-cluster.bn7e4.mongodb.net/badbank?retryWrites=true&w=majority'
    : 'mongodb://localhost:27017/badbank';

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error);
        process.exit(1);
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

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
    });
});