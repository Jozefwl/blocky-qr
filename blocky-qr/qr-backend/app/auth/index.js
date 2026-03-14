const router = require('express').Router()

router.post('/login', (req, res) => {
  res.json({ token: 'abc123' })
})

router.post('/register', (req, res) => {
  res.json({ message: 'registered' })
})

module.exports = router
