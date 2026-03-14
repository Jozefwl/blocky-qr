const mongoose = require('mongoose')

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/toughbook')
  console.log('MongoDB connected')
}

module.exports = { connectDB }
