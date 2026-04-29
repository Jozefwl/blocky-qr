const mongoose = require('mongoose')

const pipelineSchema = new mongoose.Schema({
  name:            { type: String, required: true },
  datasetOid:      { type: String, required: true },
  schedule:        { type: String },
  active:          { type: Boolean, default: false },
  createdAt:       { type: String, default: () => new Date().toISOString() },
  pipelineVersion: { type: Number, default: 1 },
  lastRunTime:     { type: String },
  lastStatus:      { type: String, enum: ['successful', 'error', 'running'] }
}, { versionKey: false })

module.exports = mongoose.model('Pipeline', pipelineSchema)