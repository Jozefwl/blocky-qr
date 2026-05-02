const mongoose = require('mongoose')

const alertRuleSchema = new mongoose.Schema({
  name:              { type: String, required: true },
  pipelineOid:       { type: String, required: true },
  reportWhenState:   { type: String, enum: ['successful', 'error', 'pending', 'running'], required: true },
  createdAt:         { type: String, default: () => new Date().toISOString() }
}, { versionKey: false })

module.exports = mongoose.model('AlertRule', alertRuleSchema)
