const mongoose = require('mongoose')

const alertSchema = new mongoose.Schema({
  name:             { type: String, required: true },
  status:           { type: String, enum: ['successful', 'error', 'pending', 'running'], required: true },
  message:          { type: String, required: true },
  pipelineOid:      { type: String, required: true },
  runId:            { type: String, required: true },
  alertRuleId:      { type: String, default: null },
  createdAt:        { type: String, default: () => new Date().toISOString() },
  acknowledgedAt: { type: String, default: null }
}, { versionKey: false })

module.exports = mongoose.model('Alert', alertSchema)
