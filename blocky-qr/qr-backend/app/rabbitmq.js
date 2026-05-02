// rabbitmq.js
const amqp = require('amqplib')

let channel = null

async function getChannel() {
  if (channel) return channel

  const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672')
  channel = await conn.createChannel()
  await channel.assertQueue('computations', { durable: true })

  conn.on('error', (err) => {
    console.error('RabbitMQ connection error:', err.message)
    channel = null
  })
  conn.on('close', () => {
    console.warn('RabbitMQ connection closed')
    channel = null
  })

  return channel
}

module.exports = { getChannel }