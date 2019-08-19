let statics = require('../../static')
let {updater} = require('@architect/utils')

module.exports = function staticDeploy({arc, verbose, production}, callback) {
  if (arc.static) {
    let update = updater('Deploy')
    update.status('Deploying static assets...')
    statics({verbose, production, update}, callback)
  }
  else callback()
}
