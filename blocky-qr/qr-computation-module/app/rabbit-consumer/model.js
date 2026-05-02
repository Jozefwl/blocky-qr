const mongoose = require('mongoose')

const computationJobSchema = new mongoose.Schema({
  runId:        { type: String, required: true },
  frequency:    { type: String },
  timeInterval: { type: Object },
  cmds:         { type: [String] },
  receivedAt:   { type: String, default: () => new Date().toISOString() },
  receiveCount: { type: Number, default: 1 }
}, { versionKey: false })

module.exports = mongoose.model('ComputationJob', computationJobSchema, 'computationmodule')