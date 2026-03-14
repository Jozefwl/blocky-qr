const mongoose = require('mongoose')

const auditLogSchema = new mongoose.Schema({
  action: String,        // e.g. 'getReceipt'
  endpoint: String,      // e.g. 'GET /qr-app/getReceipt'
  requestBody: Object,
  requestQuery: Object,
  ip: String,
  status: Number,
  timestamp: { type: Date, default: Date.now }
})

module.exports = mongoose.model('AuditLog', auditLogSchema, 'auditlogs')
