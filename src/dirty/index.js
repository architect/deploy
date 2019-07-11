let pkg = require('@architect/package')
let utils = require('@architect/utils')
let deployNested = require('./deploy-nested-stack')
let deployStack = require('./deploy-sam-stack')
let pretty = require('./pretty')

/**
 * attempts to resolve logical ids for all resources in the given stack
 * then attempts to updateFunctionCode for those resources
 *
 * @param {Array} opts - argument options passed in
 * @param {Function} callback - node style errback
 * @returns {Promise} if no callback is supplied
 */
module.exports = function dirty(opts, callback) {

  // time the deploy
  let ts = Date.now()

  // return a promise if a callback is not supplied
  let promise
  if (!callback) {
    promise = new Promise(function ugh(res, rej) {
      callback = function errback(err, result) {
        if (err) rej(err)
        else res(result)
      }
    })
  }


  let {arc} = utils.readArc()
  let appname = arc.app[0]
  let stackname = `${utils.toLogicalID(appname)}Staging`
  let sam = pkg(arc)
  let nested = Object.prototype.hasOwnProperty.call(sam, `${appname}-cfn.json`)
  let exec = nested? deployNested : deployStack

  pretty.warn()

  exec({
    ts,
    arc,
    stackname,
  }, callback)

  return promise
}
