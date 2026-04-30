const Joi = require('joi')

const reportWhenStates = ['successful', 'error', 'pending', 'running']

const alertRuleCreateSchema = Joi.object({
  name:            Joi.string().min(1).required(),
  pipelineOid:     Joi.string().required(),
  reportWhenState: Joi.string().valid(...reportWhenStates).required()
})

const alertRulePatchSchema = Joi.object({
  name:            Joi.string().min(1),
  pipelineOid:     Joi.string(),
  reportWhenState: Joi.string().valid(...reportWhenStates)
})
  .min(1)

module.exports = {
  alertRuleCreateSchema,
  alertRulePatchSchema,
  reportWhenStates
}
