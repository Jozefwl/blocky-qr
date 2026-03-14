require('dotenv').config() 

const express = require('express')
const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())
app.use('/auth', require('./app/auth'))
app.use('/qr-app', require('./app/qr-app'))
app.use('/qr-aggregator', require('./app/qr-aggregator'))

// 404 - route not found
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.path}` })
})

// 500 - general error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: err.message || 'Internal Server Error' })
})

app.get('/', (req, res) => {
  res.json( {message: "Server QR is running."})
})


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
