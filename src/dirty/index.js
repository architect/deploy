let pkg = require('@architect/package')
let utils = require('@architect/utils')
let {updater} = require('@architect/utils')
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
module.exports = function dirty(callback) {
  // time the deploy
  let ts = Date.now()
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

  let {arc} = utils.readArc()

  // FIXME architect/package is mutating the orig arc object and adding a (possibly) non existent get / to http
  let copy = JSON.parse(JSON.stringify(arc))

  let appname = arc.app[0]
  let stackname = `${utils.toLogicalID(appname)}Staging`
  let sam = pkg(arc)
  let nested = Object.prototype.hasOwnProperty.call(sam, `${appname}-cfn.json`)
  let exec = nested? deployNested : deployStack

  // update console output
  let update = updater('Deploy')
  update.status(
    'Initializing dirty deployment',
    `Stack ... ${stackname}`
  )
  pretty.warn(update)

  exec({
    ts,
    arc: copy,
    stackname,
    update
  }, callback)

  return promise
}
