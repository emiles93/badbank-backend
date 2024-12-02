// models/Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['Deposit', 'Withdraw', 'Transfer'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  accountType: {
    type: String,
    enum: ['checking', 'savings'],
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  fromAccount: {
    type: String,
    enum: ['checking', 'savings'],
    required: function () {
      return this.type === 'Transfer';
    },
  },
  toAccount: {
    type: String,
    enum: ['checking', 'savings'],
    required: function () {
      return this.type === 'Transfer';
    },
  },
});

module.exports = mongoose.model('Transaction', transactionSchema);