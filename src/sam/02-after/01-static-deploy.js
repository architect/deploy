let statics = require('../../static')
let {updater} = require('@architect/utils')

module.exports = function staticDeploy({arc, verbose, production}, callback) {
  if (arc.static) {
    updater('Deploy').status('Deploying static assets...')
    statics({verbose, production}, callback)
  }
  else callback()
}
