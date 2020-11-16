let { existsSync } = require('fs')
let { join } = require('path')
let { updater } = require('@architect/utils')
let statics = require('../../static')

module.exports = function staticDeploy (params, callback) {
  let { inventory, production, prune, stackname, verbose } = params
  let { inv } = inventory

  let staticEnabled = inv.static && existsSync(join(process.cwd(), inv.static.folder))
  if (staticEnabled) {
    let update = updater('Deploy')
    statics({ verbose, stackname, production, prune, update }, callback)
  }
  else callback()
}
