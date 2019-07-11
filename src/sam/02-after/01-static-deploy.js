let statics = require('../../static')

module.exports = function staticDeploy({arc, verbose, production}, callback) {
  if (arc.static)
    statics({verbose, production}, callback)
  else callback()
}
