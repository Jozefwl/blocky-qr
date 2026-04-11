const router = require('express').Router()
const { pipelinesSchema } = require('./validation')

router.post('/test', async (req, res, next) => {
  try {
    // const { error, value } = pipelinesSchema.validate(req.body, { abortEarly: false })
    // if (error) {
    //   return res.status(400).json({ errors: error.details.map(d => d.message) })
    // }

    res.json({ status: 'OK', message: "pipelines" })
  } catch (err) {
    next(err)
  }
})

module.exports = router
