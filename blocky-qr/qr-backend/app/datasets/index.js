const router = require('express').Router()
const { ObjectId } = require('mongodb')
const { datasetsSchema } = require('./validation')
const Dataset = require('./model') 

// POST /datasets
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = datasetsSchema.validate(req.body, { abortEarly: false })
    if (error) {
      return res.status(400).json({ errors: error.details.map(d => d.message) })
    }

    const dataset = await Dataset.create(value)
    res.status(201).json({ status: 'OK', message: 'Dataset created', data: dataset })
  } catch (err) {
    next(err)
  }
})

// GET /datasets — exclude aggregation field
router.get('/', async (req, res, next) => {
  try {
    const datasets = await Dataset.find({}, { aggregation: 0 })
    res.json({ status: 'OK', data: datasets })
  } catch (err) {
    next(err)
  }
})

// GET /datasets/:id — include aggregation result (only here)
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid dataset id' })
    }

    const dataset = await Dataset.findById(id).lean()
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' })
    }

    // Run aggregation only for type=aggregation
    let aggregationResult = null
    if (dataset.type === 'aggregation' && dataset.aggregation) {
      const { timeFrom, timeTo } = dataset.aggregation

      // logTime is indexed — query returns matching document ids in timeframe
      aggregationResult = await Dataset.db.collection('logs').aggregate([
        {
          $match: {
            logTime: {
              $gte: new Date(timeFrom),
              $lte: new Date(timeTo)
            }
          }
        },
        {
          $project: { _id: 1 }  // return only ids
        }
      ]).toArray()
    }

    res.json({
      status: 'OK',
      data: {
        ...dataset,
        aggregationResult  // null if type=file
      }
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router