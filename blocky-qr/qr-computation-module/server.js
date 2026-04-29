require('dotenv').config()

const express = require('express')
const app     = express()
const PORT    = process.env.PORT || 4000

app.use(express.json())

app.get('/', (req, res) => res.json({ message: 'Computation module is running.' }))

app.use((req, res) => res.status(404).json({ error: `Cannot ${req.method} ${req.path}` }))
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: err.message || 'Internal Server Error' })
})

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`)
  const { startConsumer } = require('./app/rabbit-consumer')
  await startConsumer().catch(console.error)
})