const Joi = require('joi')

/** GET /alerts: optional filter — ?pipelineOid= or JSON body { pipelineOid } when non-empty */
const listAlertsBodySchema = Joi.object({
  pipelineOid: Joi.string().trim().allow('', null).optional()
})
  .unknown(false)

module.exports = { listAlertsBodySchema }
