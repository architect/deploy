let pkg = require('@architect/package')
let utils = require('@architect/utils')
let updater = utils.updater
let deployNested = require('./deploy-nested-stack')
let deployStack = require('./deploy-sam-stack')
let pretty = require('./pretty')

/**
 * attempts to resolve logical ids for all resources in the given stack
 * then attempts to updateFunctionCode for those resources
 *
 * @param {Function} callback - node style errback
 * @returns {Promise} if no callback is supplied
 */
module.exports = function dirty({isDryRun=false, srcDirs=[]}, callback) {
  // return a promise if a callback is not supplied
  let promise
  if (!callback) {
    promise = new Promise(function ugh(res, rej) {
      callback = function errback(err, result) {
        if (err) rej(update.err(err))
        else res(result)
      }
    })
  }

  // update console output
  let update = updater('Deploy')

  if (isDryRun) {
    // TODO implement dry run?
    update.status('Dirty dry run not yet available, skipping dirty deploy...')
    callback()
  }
  else {
    // time the deploy
    let ts = Date.now()
    let inventory = utils.inventory()
    let specificLambdasToDeploy = []
    if (srcDirs.length && inventory.localPaths.length) {
      specificLambdasToDeploy = srcDirs.reduce((acc, d) => acc.concat(inventory.localPaths.filter(p => p.startsWith(d))), [])
    }
    let { arc } = utils.readArc()

    // FIXME architect/package is mutating the orig arc object and adding a (possibly) non existent get / to http
    let copy = JSON.parse(JSON.stringify(arc))

    let appname = arc.app[0]
    let stackname = `${utils.toLogicalID(appname)}Staging`
    let sam = pkg(arc)
    let nested = Object.prototype.hasOwnProperty.call(sam, `${appname}-cfn.json`)
    let exec = nested ? deployNested : deployStack

    update.warn('Direct deployments should be considered temporary, and will be overwritten')
    update.status(
      'Initializing direct deployment',
      `Stack ... ${stackname}`
    )
    pretty.warn(update)

    exec({
      ts,
      specificLambdasToDeploy,
      arc: copy,
      stackname,
      update
    }, callback)
  }

  return promise
}
