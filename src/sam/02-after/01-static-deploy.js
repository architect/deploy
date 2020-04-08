let statics = require('../../static')
let {updater} = require('@architect/utils')

module.exports = function staticDeploy({arc, stackname, verbose, production}, callback) {
  if (arc.static) {
    let update = updater('Deploy')
    update.status('Deploying static assets...')
    statics({verbose, stackname, production, update}, callback)
  }
  else callback()
}
