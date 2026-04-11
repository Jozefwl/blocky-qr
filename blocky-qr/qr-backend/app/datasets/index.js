const router = require('express').Router()
const { datasetsSchema } = require('./validation')

// POST /datasets — create a new dataset
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = datasetsSchema.validate(req.body, { abortEarly: false })
    if (error) {
      return res.status(400).json({ errors: error.details.map(d => d.message) })
    }

    // TODO: save value to DB
    res.status(201).json({ status: 'OK', message: 'Dataset created', data: value })
  } catch (err) {
    next(err)
  }
})

// GET /datasets — list all datasets
router.get('/', async (req, res, next) => {
  try {
    // TODO: fetch all from DB
    res.json({ status: 'OK', data: [] })
  } catch (err) {
    next(err)
  }
})

// GET /datasets/:id — get a single dataset
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    // TODO: fetch by id from DB
    // if (!dataset) return res.status(404).json({ error: 'Not found' })

    res.json({ status: 'OK', data: { id } })
  } catch (err) {
    next(err)
  }
})

module.exports = router