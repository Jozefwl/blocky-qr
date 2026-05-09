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
    const nextStatus = value.status

    // Enforce allowed transitions:
    // pending -> running
    // running -> successful | error
    // (same->same is treated as no-op)
    const allowed =
      prevStatus === nextStatus ||
      (prevStatus === 'pending' && nextStatus === 'running') ||
      (prevStatus === 'running' && (nextStatus === 'successful' || nextStatus === 'error'))
    if (!allowed) {
      return res.status(409).json({
        error: `Invalid status transition: ${prevStatus} -> ${nextStatus}`,
        allowedTransitions: {
          pending: ['running'],
          running: ['successful', 'error']
        }
      })
    }

    const updates = {
      status:           nextStatus,
      errorMessage:     value.errorMessage     ?? run.errorMessage,
      processedRecords: value.processedRecords ?? run.processedRecords,
      finishTime:       isFinal
                          ? (value.finishTime ?? new Date().toISOString())
                          : run.finishTime
    }

    if (nextStatus === 'running' && prevStatus === 'pending') {
      updates.startTime = value.startTime ?? new Date().toISOString()
    }

    const updated = await JobRun.findByIdAndUpdate(id, updates, { new: true })

    const pipelineLastRunTime =
      value.status === 'successful' || value.status === 'error'
        ? (updates.finishTime ?? new Date().toISOString())
        : value.status === 'running'
          ? (updates.startTime ?? run.startTime)
          : (run.startTime ?? run.createdAt)

    await Pipeline.findByIdAndUpdate(run.pipelineOid, {
      lastStatus:  value.status,
      lastRunTime: pipelineLastRunTime
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