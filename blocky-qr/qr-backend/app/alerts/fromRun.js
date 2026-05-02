const crypto = require('crypto')
const AlertRule = require('../alert-rules/model')
const Alert = require('./model')

function messageForRun (run, status) {
  if (status === 'error') return (run.errorMessage && String(run.errorMessage).trim()) || 'Run finished with error'
  if (status === 'successful') return 'Run completed successfully'
  if (status === 'running') return 'Run started'
  return `Run status: ${status}`
}

/**
 * For each alert rule on this pipeline (ordered by creation), if rule.reportWhenState
 * equals run.status, insert one alert row.
 */
async function createAlertsForMatchingRules (run) {
  if (!run?.pipelineOid || !run?.status) return

  const runId      = typeof run._id === 'object' && run._id?.toString ? run._id.toString() : String(run._id)
  const pipelineOid = String(run.pipelineOid)
  const status     = run.status

  const rules = await AlertRule.find({ pipelineOid }).sort({ createdAt: 1, _id: 1 }).lean()

  for (const rule of rules) {
    if (rule.reportWhenState !== status) continue

    const suffix = crypto.randomBytes(2).toString('hex').toUpperCase()
    await Alert.create({
      name:             `${rule.name} alert ${suffix}`,
      status,
      message:          messageForRun(run, status),
      pipelineOid,
      runId,
      alertRuleId:      rule._id.toString(),
      acknowledgedAt:   null
    })
  }
}

module.exports = { createAlertsForMatchingRules }
