let { toLogicalID, updater } = require('@architect/utils')
let { sep } = require('path')
let deploy = require('./deploy')
let pretty = require('./pretty')

/**
 * Resolve logical IDs for all resources in the given stack
 * then `updateFunctionCode` for those resources
 *
 * @param {Function} callback - node style errback
 * @returns {Promise} if no callback is supplied
 */
module.exports = function directDeploy (inventory, params, callback) {
  let { isDryRun = false, production, region, srcDirs = [], update } = params
  if (!update) update = updater('Deploy')
  let { inv } = inventory

  // update console output
  if (isDryRun) {
    update = updater('Deploy [dry-run]')
    update.status('Starting dry run!')
  }

  // time the deploy
  let ts = Date.now()
  let specificLambdasToDeploy = []
  if (srcDirs.length && inv.lambdaSrcDirs.length) {
    // Normalize paths by stripping trailing slashes
    srcDirs = srcDirs.map(d => d.endsWith(sep) ? d.substr(0, d.length - 1) : d)
    specificLambdasToDeploy = srcDirs.filter(d => inv.lambdaSrcDirs.some(p => p.endsWith(d)))
  }

  let appname = inv.app
  let stage = production ? 'Production' : 'Staging'
  let stackname = `${toLogicalID(appname)}${stage}`

  update.warn('Direct deployments should be considered temporary, and will be overwritten')
  update.status(
    'Initializing direct deployment',
    `Stack ... ${stackname}`
  )
  pretty.warn(update)

  if (isDryRun) {
    let plural = srcDirs.length > 1 ? 's' : ''
    update.status(`Direct deploy to Lambda${plural}:`, ...srcDirs)
    update.done(`Dry run complete!`)
    callback()
  }

  else {
    deploy({
      inventory,
      production,
      region,
      specificLambdasToDeploy,
      stackname,
      ts,
      update
    }, callback)
  }
}
