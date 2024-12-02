const express = require('express');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');

const secretKey = process.env.JWT_SECRET || 'yourSecretKey';

router.get('/test-route', (req, res) => {
    res.json({ message: 'User routes are working' });
});

router.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        user = new User({ 
            username, 
            email, 
            password,
            balances: { checking: 0, savings: 0 }
        });
        
        await user.save();
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Error creating user: ' + error.message });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        console.log('Login attempt for email:', email);

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user._id }, secretKey, { expiresIn: '1h' });

        console.log('Login successful for user:', user.username);

        res.status(200).json({ 
            token,
            username: user.username,
            userId: user._id
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error during login: ' + error.message });
    }
});

router.get('/balance', authMiddleware, async (req, res) => {
    try {
        console.log('Balance request for user:', req.user._id);
        console.log('User balances:', req.user.balances);
        res.json({ balances: req.user.balances });
    } catch (error) {
        console.error('Balance fetch error:', error);
        res.status(500).json({ message: 'Error fetching balance: ' + error.message });
    }
});

router.post('/deposit', authMiddleware, async (req, res) => {
    const { amount, accountType } = req.body;

    try {
        console.log('Deposit request:', {
            amount,
            accountType,
            userId: req.user._id
        });

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        if (!['checking', 'savings'].includes(accountType)) {
            return res.status(400).json({ message: 'Invalid account type' });
        }

        req.user.balances[accountType] += parseFloat(amount);
        await req.user.save();

        const transaction = new Transaction({
            userId: req.user._id,
            type: 'Deposit',
            amount: parseFloat(amount),
            accountType,
            date: new Date()
        });
        await transaction.save();

        console.log('Deposit successful, new balances:', req.user.balances);

        res.json({ 
            message: 'Deposit successful',
            balances: req.user.balances
        });
    } catch (error) {
        console.error('Deposit error:', error);
        res.status(500).json({ message: 'Error processing deposit: ' + error.message });
    }
});

router.post('/withdraw', authMiddleware, async (req, res) => {
    const { amount, accountType } = req.body;

    try {
        console.log('Withdrawal request:', {
            amount,
            accountType,
            userId: req.user._id
        });

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        if (!['checking', 'savings'].includes(accountType)) {
            return res.status(400).json({ message: 'Invalid account type' });
        }

        if (req.user.balances[accountType] < amount) {
            return res.status(400).json({ message: 'Insufficient funds' });
        }

        req.user.balances[accountType] -= parseFloat(amount);
        await req.user.save();

        const transaction = new Transaction({
            userId: req.user._id,
            type: 'Withdraw',
            amount: parseFloat(amount),
            accountType,
            date: new Date()
        });
        await transaction.save();

        console.log('Withdrawal successful, new balances:', req.user.balances);

        res.json({ 
            message: 'Withdrawal successful',
            balances: req.user.balances
        });
    } catch (error) {
        console.error('Withdrawal error:', error);
        res.status(500).json({ message: 'Error processing withdrawal: ' + error.message });
    }
});

router.post('/transfer', authMiddleware, async (req, res) => {
    const { amount, fromAccount, toAccount } = req.body;

    try {
        console.log('Transfer request:', {
            amount,
            fromAccount,
            toAccount,
            userId: req.user._id
        });

        if (fromAccount === toAccount) {
            return res.status(400).json({ message: 'Cannot transfer to the same account' });
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        if (!['checking', 'savings'].includes(fromAccount) || 
            !['checking', 'savings'].includes(toAccount)) {
            return res.status(400).json({ message: 'Invalid account type' });
        }

        if (req.user.balances[fromAccount] < amount) {
            return res.status(400).json({ message: 'Insufficient funds' });
        }

        req.user.balances[fromAccount] -= parseFloat(amount);
        req.user.balances[toAccount] += parseFloat(amount);
        await req.user.save();

        const transaction = new Transaction({
            userId: req.user._id,
            type: 'Transfer',
            amount: parseFloat(amount),
            accountType: fromAccount,
            fromAccount,
            toAccount,
            date: new Date()
        });
        await transaction.save();

        console.log('Transfer successful, new balances:', req.user.balances);

        res.json({ 
            message: 'Transfer successful',
            balances: req.user.balances
        });
    } catch (error) {
        console.error('Transfer error:', error);
        res.status(500).json({ message: 'Error processing transfer: ' + error.message });
    }
});

router.get('/transactions', authMiddleware, async (req, res) => {
    try {
        console.log('Fetching transactions for user:', req.user._id);
        const transactions = await Transaction.find({ userId: req.user._id })
            .sort({ date: -1 });
        console.log('Found transactions:', transactions.length);
        res.json(transactions);
    } catch (error) {
        console.error('Transaction fetch error:', error);
        res.status(500).json({ message: 'Error fetching transactions: ' + error.message });
    }
});

module.exports = router;