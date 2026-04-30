require('dotenv').config() 

const express = require('express')
const app = express()
const PORT = process.env.PORT || 3000
const { connectDB } = require('./app/db')


app.use(express.json())

app.use('/auth', require('./app/auth'))
app.use('/qr-app', require('./app/qr-app'))
//app.use('/qr-aggregator', require('./app/qr-aggregator'))
app.use('/alert-rules', require('./app/alert-rules'))
app.use('/alerts', require('./app/alerts'))
app.use('/datasets', require('./app/datasets'))
app.use('/pipelines', require('./app/pipelines'))
app.use('/runs', require('./app/runs'))


app.get('/', (req, res) => {
  res.json( {message: "Server QR is running."})
})

// 404 - route not found
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.path}` })
})

// 500 - general error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: err.message || 'Internal Server Error' })
})

connectDB().then(() => {
  app.listen(process.env.PORT || 3000, () =>
    console.log(`Server ready to accept connections on http://localhost:${process.env.PORT || 3000}`)
  )
})

