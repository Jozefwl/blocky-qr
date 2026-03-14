const router = require('express').Router()

router.get('/getReceipt', (req, res) => {
  res.json({ receipt: 'gotten' })
})

router.post('/saveReceipt', (req, res) => {
  res.json({ message: 'saved' })
})

router.post('/shareReceipt', (req, res) => {
  res.json({ message: 'shared' })
})

module.exports = router
