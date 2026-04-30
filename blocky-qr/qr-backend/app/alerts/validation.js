const Joi = require('joi')

/** Body for GET /alerts — {} = all; { pipelineOid } filters when non-empty */
const listAlertsBodySchema = Joi.object({
  pipelineOid: Joi.string().trim().allow('', null).optional()
})
  .unknown(false)

module.exports = { listAlertsBodySchema }
