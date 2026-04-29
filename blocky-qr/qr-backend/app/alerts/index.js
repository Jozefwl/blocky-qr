const router = require('express').Router()

// GET /alerts — list all alerts
router.get('/', async (req, res, next) => {
  try {
    // TODO: fetch all alerts from DB
    res.json({ status: 'OK', data: [] })
  } catch (err) {
    next(err)
  }
})

// GET /alerts/:id — get a single alert
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    // TODO: fetch alert by id from DB
    // if (!alert) return res.status(404).json({ error: 'Not found' })

    res.json({ status: 'OK', data: { id } })
  } catch (err) {
    next(err)
  }
})

// POST /alerts/:id/acknowledge — acknowledge an alert
router.post('/:id/acknowledge', async (req, res, next) => {
  try {
    const { id } = req.params

    // TODO: find alert by id and set status to acknowledged
    // if (!alert) return res.status(404).json({ error: 'Not found' })

    res.json({ status: 'OK', message: 'Alert acknowledged', data: { id } })
  } catch (err) {
    next(err)
  }
})

module.exports = router