const router = require('express').Router()
const { ObjectId } = require('mongodb')
const { listAlertsBodySchema } = require('./validation')
const Alert = require('./model')

// GET /alerts — body: {} = all alerts; { "pipelineOid": "<id>" } = filter by pipeline (JSON body)
router.get('/', async (req, res, next) => {
  try {
    const rawBody =
      req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {}
    const { error, value } = listAlertsBodySchema.validate(rawBody, { abortEarly: false })
    if (error) {
      return res.status(400).json({ errors: error.details.map(d => d.message) })
    }

    const filter = {}
    const oid = value.pipelineOid
    if (oid != null && String(oid).trim() !== '') {
      const id = String(oid).trim()
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid pipelineOid' })
      }
      filter.pipelineOid = id
    }

    const alerts = await Alert.find(filter).sort({ createdAt: -1 })
    res.json({ status: 'OK', data: alerts })
  } catch (err) {
    next(err)
  }
})

// POST /alerts/:id/acknowledge
router.post('/:id/acknowledge', async (req, res, next) => {
  try {
    const { id } = req.params
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid alert id' })
    }

    const now = new Date().toISOString()
    const alert = await Alert.findByIdAndUpdate(
      id,
      { acknowledgedAt: now },
      { new: true }
    )
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' })
    }

    res.json({ status: 'OK', message: 'Alert acknowledged', data: alert })
  } catch (err) {
    next(err)
  }
})

// GET /alerts/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid alert id' })
    }

    const alert = await Alert.findById(id).lean()
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' })
    }

    res.json({ status: 'OK', data: alert })
  } catch (err) {
    next(err)
  }
})

module.exports = router
