const Joi = require('joi')

const alertsSchema = Joi.object({
//   frequency: Joi.string().valid('h', 'min', 'd').required(),
//   timeInterval: Joi.object({
//     start: Joi.string().isoDate().required(),
//     end: Joi.string().isoDate().required()
//   }).required(),
//   cmds: Joi.array().items(Joi.string()).min(1).required()
})

module.exports = { alertsSchema }
