const amqp = require('amqplib')

let channel = null

async function getChannel() {
  if (channel) return channel
  const conn = await amqp.connect(process.env.RABBITMQ_URL)
  channel = await conn.createChannel()
  await channel.assertQueue('computations', { durable: true })
  return channel
}

module.exports = { getChannel }