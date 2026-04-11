const router = require('express').Router()
const { pipelinesSchema } = require('./validation')

// POST /pipelines — create a new pipeline
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = pipelinesSchema.validate(req.body, { abortEarly: false })
    if (error) {
      return res.status(400).json({ errors: error.details.map(d => d.message) })
    }

    // TODO: save value to DB
    res.status(201).json({ status: 'OK', message: 'Pipeline created', data: value })
  } catch (err) {
    next(err)
  }
})

// GET /pipelines — list all pipelines
router.get('/', async (req, res, next) => {
  try {
    // TODO: fetch all from DB
    res.json({ status: 'OK', data: [] })
  } catch (err) {
    next(err)
  }
})

// GET /pipelines/:id — get a single pipeline
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    // TODO: fetch by id from DB
    // if (!pipeline) return res.status(404).json({ error: 'Not found' })

    res.json({ status: 'OK', data: { id } })
  } catch (err) {
    next(err)
  }
})

// POST /pipelines/:id/run — manually trigger a pipeline run
router.post('/:id/run', async (req, res, next) => {
  try {
    const { id } = req.params

    // TODO: fetch pipeline by id from DB
    // if (!pipeline) return res.status(404).json({ error: 'Not found' })

    // TODO: create a new run for this pipeline
    res.status(202).json({ status: 'OK', message: 'Pipeline run triggered', data: { pipelineId: id } })
  } catch (err) {
    next(err)
  }
})

module.exports = router