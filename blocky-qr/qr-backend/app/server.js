const express = require('express')
const app = express()

app.use(express.json())
app.use('/auth', require('./auth'))
app.use('/qr-app', require('./qr-app'))
app.use('/qr-aggregator', require('./qr-aggregator'))


app.get('/', (req, res) => {
  res.send('Server QR is running.')
})

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})
