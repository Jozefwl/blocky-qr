const Joi = require('joi')

const datasetsSchema = Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),
    owner: Joi.string().trim().min(1).max(100).required(),
    type: Joi.string().valid('aggregation', 'file').required(),
    schemaVersion: Joi.number().integer().min(1).default(1),
    createdAt: Joi.string().isoDate().default(() => new Date().toISOString()),

    fileType: Joi.when('type', {
        is: 'file',
        then: Joi.object({ format: Joi.string().valid('json').required(), structure: Joi.string().optional() }).required(),
        otherwise: Joi.forbidden()
    }),

    fileLink: Joi.when('type', {
        is: 'file',
        then: Joi.string().uri().optional(),
        otherwise: Joi.forbidden()
    }),

    aggregation: Joi.when('type', {
        is: 'aggregation',
        then: Joi.object({
            timeFrom: Joi.string().isoDate().required(),
            timeTo: Joi.string().isoDate().required()
        }).required(),
        otherwise: Joi.forbidden()
    })
})

module.exports = { datasetsSchema }