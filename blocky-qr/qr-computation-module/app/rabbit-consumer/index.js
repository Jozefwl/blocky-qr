const amqp           = require('amqplib')
const mongoose       = require('mongoose')
const ComputationJob = require('./model')

const MONGO_URL  = process.env.MONGODB_URL  || 'mongodb://127.0.0.1:27017/toughbook'
const RABBIT_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672'
const BACKEND = (process.env.BACKEND_URL
  || `http://localhost:${process.env.BACKEND_PORT ?? 3000}`).replace(/\/$/, '')

const activeJobs = new Map()

async function connectDB() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URL)
    console.log('MongoDB connected (consumer)')
  }
}

async function calcStats(msg) {
  const { runId, timeInterval } = msg
  const db = mongoose.connection.db
  console.log(`[${runId}] Running aggregation...`)

  const results = await db.collection('auditlogs').aggregate([
    {
      $match: {
        timestamp: {
          $gte: new Date(timeInterval.start),
          $lte: new Date(timeInterval.end)
        }
      }
    },
    {
      $group: {
        _id: '$action',
        endpoint:         { $first: '$endpoint' },
        totalCalls:       { $sum: 1 },
        successfulCalls:  { $sum: { $cond: [{ $and: [{ $gte: ['$status', 200] }, { $lte: ['$status', 299] }] }, 1, 0] } },
        unsuccessfulCalls:{ $sum: { $cond: [{ $or:  [{ $lt:  ['$status', 200] }, { $gt:  ['$status', 299] }] }, 1, 0] } }
      }
    },
    { $sort: { totalCalls: -1 } }
  ]).toArray()

  // shape into { actionName: { successfulCalls, unsuccessfulCalls, totalCalls } }
  const shaped = {}
  for (const r of results) {
    shaped[r._id] = {
      endpoint:          r.endpoint,
      successfulCalls:   r.successfulCalls,
      unsuccessfulCalls: r.unsuccessfulCalls,
      totalCalls:        r.totalCalls
    }
  }

  // save/overwrite result document in computationstats collection
  await db.collection('computationstats').findOneAndUpdate(
    { runId },
    {
      $set: {
        runId,
        timeInterval,
        calculatedAt: new Date().toISOString(),
        stats: shaped
      }
    },
    { upsert: true }
  )

  console.log(`[${runId}] Aggregation saved. ${results.length} actions found.`)
  return results
}

async function patchRun(runId, body) {
  try {
    const res = await fetch(`${BACKEND}/runs/${runId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body)
    })
    if (!res.ok) {
      const detail = await res.text()
      console.warn(`[${runId}] PATCH run failed: HTTP ${res.status}`, detail || '')
    }
  } catch (err) {
    console.warn(`[${runId}] PATCH run failed:`, err.message)
  }
}

async function executeJob(msg) {
  const { runId } = msg
  try {
    const results = await calcStats(msg)
    await patchRun(runId, {
      status:           'successful',
      processedRecords: results.reduce((acc, r) => acc + r.totalCalls, 0),
      finishTime:       new Date().toISOString()
    })
    console.log(`[${runId}] Job completed successfully.`)
  } catch (err) {
    console.error(`[${runId}] Job failed:`, err.message)
    await patchRun(runId, {
      status:       'error',
      errorMessage: err.message,
      finishTime:   new Date().toISOString()
    })
  } finally {
    if (activeJobs.has(runId)) {
      clearInterval(activeJobs.get(runId))
      activeJobs.delete(runId)
      console.log(`[${runId}] Job removed from registry.`)
    }
  }
}

function scheduleJob(msg, forceImmediate = false) {
  const { runId } = msg

  if (activeJobs.has(runId) && !forceImmediate) {
    console.warn(`[${runId}] Job already scheduled, skipping.`)
    return
  }

  console.log(`[${runId}] Scheduling job${forceImmediate ? ' (FORCE)' : ''}, checks every 60s...`)

  executeJob(msg)

  const intervalId = setInterval(() => {
    if (!activeJobs.has(runId)) return
    executeJob(msg)
  }, 60_000)

  activeJobs.set(runId, intervalId)
}

async function startConsumer() {
  await connectDB()

  const conn    = await amqp.connect(RABBIT_URL)
  const channel = await conn.createChannel()
  await channel.assertQueue('computations', { durable: true })
  channel.prefetch(1)

  console.log('Rabbit consumer listening on queue: computations')

  channel.consume('computations', async (raw) => {
    if (!raw) return
    try {
      const msg = JSON.parse(raw.content.toString())
      console.log('Received message:', msg)

      // upsert into computationmodule, track receiveCount
      const existing = await ComputationJob.findOneAndUpdate(
        { runId: msg.runId },
        {
          $set:       { frequency: msg.frequency, timeInterval: msg.timeInterval, cmds: msg.cmds },
          $inc:       { receiveCount: 1 },
          $setOnInsert: { receivedAt: new Date().toISOString() }
        },
        { upsert: true, returnDocument: 'after' }
      )

      const isForceRun = existing.receiveCount > 1

      if (msg.cmds?.includes('calcStats')) {
        if (isForceRun && activeJobs.has(msg.runId)) {
          console.log(`[${msg.runId}] Duplicate msg → cancelling cron, force running now`)
          clearInterval(activeJobs.get(msg.runId))
          activeJobs.delete(msg.runId)
        }
        scheduleJob(msg, isForceRun)
      } else {
        console.warn('Unknown cmd:', msg.cmds)
      }

      channel.ack(raw)
    } catch (err) {
      console.error('Failed to process message:', err.message)
      channel.nack(raw, false, false)
    }
  })

  conn.on('error', (err) => console.error('Rabbit error:', err.message))
  conn.on('close', () => console.warn('Rabbit connection closed'))
}

module.exports = { startConsumer }