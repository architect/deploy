let statics = require('../../static')

module.exports = function staticDeploy({arc, opts}, callback) {
  if (arc.static)
    statics(opts, callback)
  else callback()
}
