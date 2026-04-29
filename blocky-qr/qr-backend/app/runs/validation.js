const Joi = require('joi')

const patchRunSchema = Joi.object({
    status: Joi.string().valid('pending', 'running', 'successful', 'error').required(),
    errorMessage: Joi.when('status', {
        is: 'error',
        then: Joi.string().min(1).required(),
        otherwise: Joi.string().optional().allow(null, '')
    }),
    processedRecords: Joi.number().integer().min(0).optional(),
    finishTime: Joi.string().isoDate().optional()
})

module.exports = { patchRunSchema }