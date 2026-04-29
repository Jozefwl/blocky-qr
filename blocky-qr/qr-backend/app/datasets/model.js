const mongoose = require('mongoose')

const datasetSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  owner:         { type: String, required: true },
  type:          { type: String, enum: ['aggregation', 'file'], required: true },
  schemaVersion: { type: Number, default: 1 },
  createdAt:     { type: String, default: () => new Date().toISOString() },
  fileType:      { type: Object },
  fileLink:      { type: String },
  aggregation:   { type: Object }  // { timeFrom, timeTo }
}, { versionKey: false })

module.exports = mongoose.model('Dataset', datasetSchema)