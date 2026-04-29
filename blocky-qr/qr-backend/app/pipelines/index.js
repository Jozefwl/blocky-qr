const router    = require('express').Router()
const { ObjectId } = require('mongodb')
const { getChannel } = require('../rabbitmq')
const { pipelinesSchema } = require('./validation')
const Pipeline  = require('./model.js')
const Dataset   = require('../datasets/model')
const JobRun    = require('../runs/model')

// POST /pipelines
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = pipelinesSchema.validate(req.body, { abortEarly: false })
    if (error) {
      return res.status(400).json({ errors: error.details.map(d => d.message) })
    }

    // dataset must exist
    if (!ObjectId.isValid(value.datasetOid)) {
      return res.status(400).json({ error: 'Invalid datasetOid' })
    }
    const dataset = await Dataset.findById(value.datasetOid).lean()
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' })
    }

    const pipeline = await Pipeline.create(value)
    res.status(201).json({ status: 'OK', message: 'Pipeline created', data: pipeline })
  } catch (err) {
    next(err)
  }
})

// GET /pipelines
router.get('/', async (req, res, next) => {
  try {
    const pipelines = await Pipeline.find({})
    res.json({ status: 'OK', data: pipelines })
  } catch (err) {
    next(err)
  }
})

// GET /pipelines/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid pipeline id' })
    }

    const pipeline = await Pipeline.findById(id).lean()
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' })
    }

    res.json({ status: 'OK', data: pipeline })
  } catch (err) {
    next(err)
  }
})

// POST /pipelines/:id/run
router.post('/:id/run', async (req, res, next) => {
  try {
    const { id } = req.params
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid pipeline id' })
    }

    const pipeline = await Pipeline.findById(id).lean()
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' })
    }
    if (!pipeline.active) {
      return res.status(409).json({ error: 'Pipeline is not active' })
    }

    // fetch dataset to get aggregation timeframe
    const dataset = await Dataset.findById(pipeline.datasetOid).lean()
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' })
    }

    // create JobRun
    const run = await JobRun.create({
      pipelineId:      pipeline._id,
      pipelineVersion: pipeline.pipelineVersion,
      status:          'running',
      startedAt:       new Date().toISOString()
    })

    // update pipeline lastRunTime + lastStatus
    await Pipeline.findByIdAndUpdate(id, {
      lastRunTime: run.startedAt,
      lastStatus:  'running'
    })

    // send to RabbitMQ → calcStatsAsync
    const channel = await getChannel()
    const message = {
      runId:    run._id.toString(),
      frequency: 'd',
      timeInterval: {
        start: dataset.aggregation?.timeFrom,
        end:   dataset.aggregation?.timeTo
      },
      cmds: ['calcStats']
    }
    channel.sendToQueue('computations', Buffer.from(JSON.stringify(message)), { persistent: true })

    res.status(202).json({ status: 'OK', message: 'Pipeline run triggered', data: run })
  } catch (err) {
    next(err)
  }
})

// PATCH /pipelines/:id — update pipeline, increment pipelineVersion
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid pipeline id' })
    }

    const pipeline = await Pipeline.findById(id)
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' })
    }

    // only allow these fields to be updated
    const allowed = ['name', 'datasetOid', 'schedule', 'active']
    const updates = {}
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key]
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided' })
    }

    // validate datasetOid exists if being changed
    if (updates.datasetOid) {
      if (!ObjectId.isValid(updates.datasetOid)) {
        return res.status(400).json({ error: 'Invalid datasetOid' })
      }
      const dataset = await Dataset.findById(updates.datasetOid).lean()
      if (!dataset) {
        return res.status(404).json({ error: 'Dataset not found' })
      }
    }

    updates.$inc = { pipelineVersion: 1 }  // always increment on any change

    const updated = await Pipeline.findByIdAndUpdate(id, updates, { new: true })
    res.json({ status: 'OK', message: 'Pipeline updated', data: updated })
  } catch (err) {
    next(err)
  }
})

// DELETE /pipelines/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid pipeline id' })
    }

    const pipeline = await Pipeline.findByIdAndDelete(id)
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' })
    }

    res.json({ status: 'OK', message: 'Pipeline deleted', data: { id } })
  } catch (err) {
    next(err)
  }
})

module.exports = router