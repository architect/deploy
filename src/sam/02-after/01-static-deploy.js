let statics = require('../../static')
let {updater} = require('@architect/utils')

module.exports = function staticDeploy (params, callback) {
  let { arc, stackname, verbose, production, prune } = params
  if (arc.static) {
    let update = updater('Deploy')
    update.status('Deploying static assets...')
    statics({ verbose, stackname, production, prune, update }, callback)
  }
  else callback()
}
