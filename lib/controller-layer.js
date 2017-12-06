const express = require('express')
const bodyParser = require('body-parser')
const ModelLayer = require('./model-layer')

const PERCENTAGE_OF_TWILIO_TTL_TO_USE_FOR_CACHE_HEADER = 0.95

module.exports = ({modelLayer, pubSubGateway, fetchICEServers}) => {
  const app = express()
  app.use(bodyParser.json({limit: '1mb'}))

  app.get('/protocol-version', function (req, res) {
    res.send({version: 4})
  })

  app.get('/ice-servers', async function (req, res) {
    if (fetchICEServers) {
      const {servers, ttl} = await fetchICEServers()
      const maxAgeInSeconds = ttl * PERCENTAGE_OF_TWILIO_TTL_TO_USE_FOR_CACHE_HEADER
      res.set('Cache-Control', `private, max-age=${maxAgeInSeconds}`)
      res.send(servers)
    } else {
      res.send([])
    }
  })

  app.post('/peers/:id/signals', async function (req, res) {
    const {senderId, signal, sequenceNumber, testEpoch} = req.body
    const message = {senderId, signal, sequenceNumber}
    if (testEpoch != null) message.testEpoch = testEpoch

    if (sequenceNumber === 0) message.senderIdentity = res.params.identity

    pubSubGateway.broadcast(`/peers/${req.params.id}`, 'signal', message)
    res.send({})
  })

  app.post('/portals', async function (req, res) {
    const id = await modelLayer.createPortal({hostPeerId: req.body.hostPeerId})

    modelLayer.createEvent({
      name: 'create-portal',
      identity: res.params.identity,
      portalId: id
    })

    res.send({id})
  })

  app.get('/portals/:id', async function (req, res) {
    modelLayer.createEvent({
      name: 'lookup-portal',
      identity: res.params.identity,
      portalId: req.params.id
    })

    const portal = await modelLayer.findPortal(req.params.id)
    if (portal) {
      res.send({hostPeerId: portal.hostPeerId})
    } else {
      res.status(404).send({})
    }
  })

  app.get('/identity', async function (req, res) {
    res.send(res.params.identity)
  })

  async function isICEServerProviderOperational () {
    try {
      await fetchICEServers()
      return true
    } catch (_) {
      return false
    }
  }

  return app
}
