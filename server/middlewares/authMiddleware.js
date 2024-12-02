// middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const secretKey = process.env.JWT_SECRET || 'yourSecretKey';

const authMiddleware = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  
  if (!authHeader) {
    console.error('Auth Middleware: No token provided');
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, secretKey);
    
    // Fetch the complete user object from database
    const user = await User.findById(decoded.userId);
    if (!user) {
      console.error('Auth Middleware: User not found');
      return res.status(401).json({ message: 'User not found' });
    }

    // Initialize balances if they don't exist
    if (!user.balances) {
      user.balances = { checking: 0, savings: 0 };
      await user.save();
    }

    // Attach complete user object to request
    req.user = user;
    console.log('Auth Middleware: Token valid for user:', user.username);
    console.log('User balances:', user.balances);
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.error('Auth Middleware: Token expired');
      return res.status(401).json({ message: 'Token expired. Please log in again.' });
    }
    console.error('Auth Middleware: Invalid token:', error.message);
    res.status(401).json({ message: 'Invalid token.' });
  }
};

module.exports = authMiddleware;