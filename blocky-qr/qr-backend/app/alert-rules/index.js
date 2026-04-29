const router = require('express').Router()
const { alertRulesSchema } = require('./validation')

// POST /alert-rules - Create a new alert rule
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = alertRulesSchema.validate(req.body, { abortEarly: false })
    if (error) {
      return res.status(400).json({ errors: error.details.map(d => d.message) })
    }

    // TODO: save value to DB
    res.status(201).json({ status: 'OK', message: 'Alert rule created', data: value })
  } catch (err) {
    next(err)
  }
})

// GET /alert-rules - List all alert rules
router.get('/', async (req, res, next) => {
  try {
    // TODO: fetch all from DB
    res.json({ status: 'OK', data: [] })
  } catch (err) {
    next(err)
  }
})

// GET /alert-rules/:id — Get a single alert rule
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    // TODO: fetch by id from DB
    // if (!rule) return res.status(404).json({ error: 'Not found' })

    res.json({ status: 'OK', data: { id } })
  } catch (err) {
    next(err)
  }
})

// PATCH /alert-rules/:id — Partially update an alert rule (optional)
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const { error, value } = alertRulesSchema.validate(req.body, {
      abortEarly: false,
      allowUnknown: false,  // adjust to your schema
    })
    if (error) {
      return res.status(400).json({ errors: error.details.map(d => d.message) })
    }

    // TODO: update record by id in DB
    // if (!rule) return res.status(404).json({ error: 'Not found' })

    res.json({ status: 'OK', message: 'Alert rule updated', data: { id, ...value } })
  } catch (err) {
    next(err)
  }
})

// DELETE /alert-rules/:id — Delete an alert rule (optional)
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    // TODO: delete record by id from DB
    // if (!rule) return res.status(404).json({ error: 'Not found' })

    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

module.exports = router