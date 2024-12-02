// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    balances: {
        checking: { type: Number, default: 0 },
        savings: { type: Number, default: 0 }
    }
}, {
    timestamps: true // Adds createdAt and updatedAt fields
});

// Middleware to hash password before saving to the database
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password for login
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw error;
    }
};

// Method to safely get user data without sensitive information
userSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.password;
    return user;
};

// Static method to find user by email
userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email });
};

// Add validation for minimum balance
userSchema.path('balances.checking').validate(function(value) {
    return value >= 0;
}, 'Checking balance cannot be negative');

userSchema.path('balances.savings').validate(function(value) {
    return value >= 0;
}, 'Savings balance cannot be negative');

module.exports = mongoose.model('User', userSchema);