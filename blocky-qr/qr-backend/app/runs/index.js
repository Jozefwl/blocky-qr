const router = require('express').Router()
const { ObjectId } = require('mongodb')
const { patchRunSchema } = require('./validation')
const JobRun   = require('./model')
const Pipeline = require('../pipelines/model')
const { createAlertsForMatchingRules } = require('../alerts/fromRun')

// GET /runs
router.get('/', async (req, res, next) => {
  try {
    const runs = await JobRun.find({})
    res.json({ status: 'OK', data: runs })
  } catch (err) {
    next(err)
  }
})

// GET /runs/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid run id' })
    }

    const run = await JobRun.findById(id).lean()
    if (!run) {
      return res.status(404).json({ error: 'Run not found' })
    }

    res.json({ status: 'OK', data: run })
  } catch (err) {
    next(err)
  }
})

// PATCH /runs/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid run id' })
    }

    const run = await JobRun.findById(id)
    if (!run) {
      return res.status(404).json({ error: 'Run not found' })
    }

    // guard: already in final state
    if (run.status === 'successful' || run.status === 'error') {
      return res.status(409).json({ error: `Run already in final state: ${run.status}` })
    }

    const { error, value } = patchRunSchema.validate(req.body, { abortEarly: false })
    if (error) {
      return res.status(400).json({ errors: error.details.map(d => d.message) })
    }

    const isFinal = value.status === 'successful' || value.status === 'error'

    const prevStatus = run.status

    const updates = {
      status:           value.status,
      errorMessage:     value.errorMessage     ?? run.errorMessage,
      processedRecords: value.processedRecords ?? run.processedRecords,
      finishTime:       isFinal
                          ? (value.finishTime ?? new Date().toISOString())
                          : run.finishTime
    }

    const updated = await JobRun.findByIdAndUpdate(id, updates, { new: true })

    // sync lastStatus on pipeline
    await Pipeline.findByIdAndUpdate(run.pipelineOid, {
      lastStatus:  value.status,
      lastRunTime: updates.finishTime ?? run.startTime
    })

    if (value.status !== prevStatus) {
      try {
        await createAlertsForMatchingRules(updated.toObject?.() ?? updated)
      } catch (alertErr) {
        console.error('Alert evaluation failed:', alertErr.message)
      }
    }

    res.json({ status: 'OK', message: 'Run updated', data: updated })
  } catch (err) {
    next(err)
  }
})

module.exports = router