const router = require('express').Router()
const { getChannel } = require('../rabbitmq')
const { calcStatsSchema } = require('./validation')

router.post('/calcStatsAsync', async (req, res, next) => {
  try {
    const { error, value } = calcStatsSchema.validate(req.body, { abortEarly: false })
    if (error) {
      return res.status(400).json({ errors: error.details.map(d => d.message) })
    }

    const channel = await getChannel()
    channel.sendToQueue('computations', Buffer.from(JSON.stringify(value)), { persistent: true })

    res.json({ status: 'queued', message: value })
  } catch (err) {
    next(err)
  }
})

module.exports = router
