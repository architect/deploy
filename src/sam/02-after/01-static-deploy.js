let { existsSync } = require('fs')
let { join } = require('path')
let { updater } = require('@architect/utils')
let statics = require('../../static')

module.exports = function staticDeploy (params, callback) {
  let { arc, stackname, verbose, production, prune } = params
  let staticEnabled = arc.static || (arc.http && existsSync(join(process.cwd(), 'public')))

  if (staticEnabled) {
    let update = updater('Deploy')
    statics({ verbose, stackname, production, prune, update }, callback)
  }
  else callback()
}
