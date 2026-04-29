const router = require('express').Router()

// GET /runs — list all runs
router.get('/', async (req, res, next) => {
  try {
    // TODO: fetch all from DB
    res.json({ status: 'OK', data: [] })
  } catch (err) {
    next(err)
  }
})

// GET /runs/:id — get a single run
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    // TODO: fetch by id from DB
    // if (!run) return res.status(404).json({ error: 'Not found' })

    res.json({ status: 'OK', data: { id } })
  } catch (err) {
    next(err)
  }
})

// PATCH /runs/:id — manually patch run state
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    // TODO: fetch pipeline by id from DB
    // if (!pipeline) return res.status(404).json({ error: 'Not found' })

    // TODO: create a new run for this pipeline
    res.status(202).json({ status: 'OK', message: 'Run patched', data: { runId: id } })
  } catch (err) {
    next(err)
  }
})

module.exports = router