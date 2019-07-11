let pkg = require('@architect/package')
let utils = require('@architect/utils')
let series = require('run-series')

let print = require('./print')
let before = require('./00-before')
let deploy = require('./01-deploy')
let after = require('./02-after')

/**
 * Shells out to AWS SAM for package/deploy
 *
 * @param {Object} params - parameters object
 * @param {Function} callback - a node-style errback
 * @returns {Promise} - if not callback is supplied
 */
module.exports = function samDeploy({verbose, production}, callback) {
  let ts = Date.now()

  let promise
  if (!callback) {
    promise = new Promise(function ugh(res, rej) {
      callback = function errback(err, result) {
        if (err) rej(err)
        else res(result)
      }
    })
  }

  // flags
  let log = true
  let pretty = print({log, verbose})

  let {arc} = utils.readArc()
  let bucket = arc.aws.find(o=> o[0] === 'bucket')[1]
  let appname = arc.app[0]
  let stackname = `${utils.toLogicalID(appname)}${production? 'Production' : 'Staging'}`
  let sam = pkg(arc)
  let nested = Object.prototype.hasOwnProperty.call(sam, `${appname}-cfn.json`)

  series([
    before.bind({}, {sam, nested, bucket, pretty}),
    deploy.bind({}, {appname, stackname, nested, bucket, pretty}),
    after.bind({}, {ts, arc, verbose, production, pretty, appname, stackname}),
  ], callback)

  return promise
}
