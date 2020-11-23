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
module.exports = function directDeploy (options, callback) {
  let { inventory, isDryRun = false, production, region, srcDirs = [], update } = options
  if (!update) update = updater('Deploy')
  let { inv } = inventory

  // update console output
  if (isDryRun) {
    update = updater('Deploy [dry-run]')
    update.status('Starting dry run!')
  }

  // Time the deploy
  let ts = Date.now()

  // Collect all the Lambdas
  let specificLambdasToDeploy = []
  if (srcDirs.length && inv.lambdaSrcDirs.length) {
    // Normalize paths by stripping trailing slashes
    // Relativize by stripping leading relative path + `.`, `/`, `./`, `\`, `.\`
    srcDirs = srcDirs
      .map(d => d.endsWith(sep) ? d.substr(0, d.length - 1) : d)
      .map(d => d.replace(process.cwd(), '').replace(/^\.?\/?\\?/, ''))
    specificLambdasToDeploy = srcDirs.filter(d => inv.lambdaSrcDirs.some(p => p.endsWith(d)))
  }
  if (!specificLambdasToDeploy.length) {
    update.error('No Lambdas found to deploy')
    process.exit(1)
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
