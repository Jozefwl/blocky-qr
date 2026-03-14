const router = require('express').Router()
const AuditLog = require('./auditlog.model')
const axios = require('axios')


// Middleware - logs every request in this router
router.use(async (req, res, next) => {
  res.on('finish', async () => {
    await AuditLog.create({
      action: req.path.replace('/', ''),
      endpoint: `${req.method} /qr-app${req.path}`,
      requestBody: req.body,
      requestQuery: req.query,
      ip: req.ip,
      status: res.statusCode
    })
  })
  next()
})

router.post('/getReceipt', async (req, res, next) => {
  try {
    const { receiptId } = req.body
    if (!receiptId) {
      return res.status(400).json({ error: 'receiptId is required' })
    }

    const response = await axios.post(
      'https://ekasa.financnasprava.sk/mdu/api/v1/opd/receipt/find',
      { receiptId },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:105.0) Gecko/20100101 Firefox/105.0',
          'Accept': '*/*',
          'Accept-Language': 'en-GB,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Authorized': '',
          'X-Token': '',
          'X-SesId': '',
          'X-DevId': '',
          'Origin': 'https://reqbin.com',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-site',
          'Sec-GPC': '1',
          'TE': 'trailers'
        }
      }
    )

    res.json(response.data)
  } catch (err) {
    if (err.response) {
      // ekasa returned an error
      return res.status(err.response.status).json(err.response.data)
    }
    next(err)
  }
})

router.post('/saveReceipt', (req, res) => {
  res.json({ message: 'saved' })
})

router.post('/shareReceipt', (req, res) => {
  res.json({ message: 'shared' })
})

module.exports = router
