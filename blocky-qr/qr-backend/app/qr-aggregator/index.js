const router = require('express').Router()

router.post('/calcStatsAsync', (req, res) => {
  res.json({ stats: 'asyncd' })
})


module.exports = router
