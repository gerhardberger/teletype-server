const uuid = require('uuid/v4')

module.exports =
class ModelLayer {
  constructor () {
    this.portals = {}
  }

  createPortal ({hostPeerId}) {
    const id = uuid()
    this.portals[id] = { hostPeerId }
    return id
  }

  findPortal (id) {
    const result = this.portals[id] || null
    return result
  }
}
