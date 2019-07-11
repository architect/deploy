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
 * @param {Array} opts - option arguments
 * @param {Function} callback - a node-style errback
 * @returns {Promise} - if not callback is supplied
 */
module.exports = function samDeploy(opts, callback) {

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
  let verbose = opts.some(opt=> '-v --verbose verbose'.split(' ').includes(opt))
  let production = opts.some(opt=> '-p --production production prod'.split(' ').includes(opt))
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
    after.bind({}, {ts, arc, opts, pretty, appname, stackname}),
  ], callback)

  return promise
}
