const router = require('express').Router()
const { ObjectId } = require('mongodb')
const { alertRuleCreateSchema, alertRulePatchSchema } = require('./validation')
const AlertRule = require('./model')
const Pipeline = require('../pipelines/model')

// POST /alert-rules
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = alertRuleCreateSchema.validate(req.body, { abortEarly: false })
    if (error) {
      return res.status(400).json({ errors: error.details.map(d => d.message) })
    }

    if (!ObjectId.isValid(value.pipelineOid)) {
      return res.status(400).json({ error: 'Invalid pipelineOid' })
    }
    const pipeline = await Pipeline.findById(value.pipelineOid).lean()
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' })
    }

    value.pipelineOid = pipeline._id.toString()
    const rule = await AlertRule.create(value)
    res.status(201).json({ status: 'OK', message: 'Alert rule created', data: rule })
  } catch (err) {
    next(err)
  }
})

// GET /alert-rules
router.get('/', async (req, res, next) => {
  try {
    const rules = await AlertRule.find({}).sort({ createdAt: 1, _id: 1 })
    res.json({ status: 'OK', data: rules })
  } catch (err) {
    next(err)
  }
})

// GET /alert-rules/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid alert rule id' })
    }

    const rule = await AlertRule.findById(id).lean()
    if (!rule) {
      return res.status(404).json({ error: 'Alert rule not found' })
    }

    res.json({ status: 'OK', data: rule })
  } catch (err) {
    next(err)
  }
})

// PATCH /alert-rules/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid alert rule id' })
    }

    const { error, value } = alertRulePatchSchema.validate(req.body, { abortEarly: false })
    if (error) {
      return res.status(400).json({ errors: error.details.map(d => d.message) })
    }

    if (value.pipelineOid !== undefined) {
      if (!ObjectId.isValid(value.pipelineOid)) {
        return res.status(400).json({ error: 'Invalid pipelineOid' })
      }
      const pipeline = await Pipeline.findById(value.pipelineOid).lean()
      if (!pipeline) {
        return res.status(404).json({ error: 'Pipeline not found' })
      }
      value.pipelineOid = pipeline._id.toString()
    }

    const rule = await AlertRule.findById(id)
    if (!rule) {
      return res.status(404).json({ error: 'Alert rule not found' })
    }

    Object.assign(rule, value)
    await rule.save()
    res.json({ status: 'OK', message: 'Alert rule updated', data: rule })
  } catch (err) {
    next(err)
  }
})

// DELETE /alert-rules/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid alert rule id' })
    }

    const deleted = await AlertRule.findByIdAndDelete(id)
    if (!deleted) {
      return res.status(404).json({ error: 'Alert rule not found' })
    }

    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

module.exports = router
