const Joi = require('joi')

const pipelinesSchema = Joi.object({
  name:       Joi.string().trim().min(1).max(100).required(),
  datasetOid: Joi.string().hex().length(24).required(), // mongo ObjectId
  schedule:   Joi.string().optional(),                  // cron string, optional
  active:     Joi.boolean().default(false),
  createdAt:  Joi.string().isoDate().default(() => new Date().toISOString()),
  pipelineVersion: Joi.number().integer().min(1).default(1),
  lastRunTime: Joi.string().isoDate().optional(),
  lastStatus:  Joi.string().valid('successful', 'error', 'running').optional()
})

module.exports = { pipelinesSchema }