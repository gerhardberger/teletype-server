const request = require('request-promise-native')

const buildControllerLayer = require('./controller-layer')
const ModelLayer = require('./model-layer')
const PubSubGateway = require('./pusher-pub-sub-gateway')

module.exports =
class Server {
  constructor (options) {
    this.pusherAppId = options.pusherAppId
    this.pusherKey = options.pusherKey
    this.pusherSecret = options.pusherSecret
    this.pusherCluster = options.pusherCluster
    this.twilioAccount = options.twilioAccount
    this.twilioAuthToken = options.twilioAuthToken
    this.hashSecret = options.hashSecret
    this.port = options.port
  }

  async start () {
    const modelLayer = new ModelLayer()
    const pubSubGateway = new PubSubGateway({
      appId: this.pusherAppId,
      key: this.pusherKey,
      secret: this.pusherSecret,
      cluster: this.pusherCluster
    })

    const twilioICEServerURL = `https://${this.twilioAccount}:${this.twilioAuthToken}@api.twilio.com/2010-04-01/Accounts/${this.twilioAccount}/Tokens.json`

    const controllerLayer = buildControllerLayer({
      modelLayer,
      pubSubGateway,
      fetchICEServers: async () => {
        const response = JSON.parse(await request.post(twilioICEServerURL))
        return {ttl: parseInt(response.ttl), servers: response.ice_servers}
      }
    })

    return new Promise((resolve) => {
      this.server = controllerLayer.listen(this.port, resolve)
    })
  }

  stop () {
    return new Promise((resolve) => this.server.close(resolve))
  }
}
