const mongoose = require('mongoose')

const jobRunSchema = new mongoose.Schema({
    pipelineOid: { type: String, required: true },
    pipelineVersion: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'running', 'successful', 'error'], default: 'pending' },
    createdAt: { type: String, default: () => new Date().toISOString() },
    startTime: { type: String, default: null },
    finishTime: { type: String, default: null },
    errorMessage: { type: String, default: null },
    processedRecords: { type: Number, default: 0 },
    totalRecords: { type: Number, default: 0 }
}, { versionKey: false })

module.exports = mongoose.model('JobRun', jobRunSchema)