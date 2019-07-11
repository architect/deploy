let aws = require('aws-sdk')
let waterfall = require('run-waterfall')
let utils = require('@architect/utils')
let publishToS3 = require('./publish-to-s3')

/**
 * Upload files to CFN defined bucket
 *
 * @param {Array} opts - option arguments
 * @param {Function} callback - a node-style errback
 * @returns {Promise} - if not callback is supplied
 */
module.exports = function dirty(opts, callback) {
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

  // defaults
  let {arc} = utils.readArc()
  let appname = arc.app[0]
  let name = `${utils.toLogicalID(appname)}${production? 'Production' : 'Staging'}`

  // get the bucket PhysicalResourceId
  waterfall([
    function(callback) {
      if (!arc.static) {
        callback(Error('cancel'))
      }
      else {
        // Enable deletion of files not present in public/ folder
        let prune = false
        if (arc.static.some(s => {
          if (!s[0])
            return false
          if (s.includes('prune') && s.includes(true))
            return true
          return false
        })) {prune = true}

        // Enable fingerprinting
        let fingerprint = false
        if (arc.static.some(s => {
          if (!s[0])
            return false
          if (s.includes('fingerprint') && (s.includes(true) || s.includes('enabled') || s.includes('on')))
            return true
          return false
        })) {fingerprint = true}

        // Collect any strings to match against for ignore
        let ignore = arc.static.find(s => s['ignore'])
        if (ignore) {ignore = Object.getOwnPropertyNames(ignore.ignore)}
        else {ignore = []}

        callback(null, {fingerprint, ignore, prune})
      }
    },

    function({fingerprint, ignore, prune}, callback) {
      // lookup bucket in cloudformation
      let cloudformation = new aws.CloudFormation
      cloudformation.listStackResources({
        StackName: name
      },
      function done(err, data) {
        if (err) callback(err)
        else {
          let find = i=> i.ResourceType === 'AWS::S3::Bucket'
          let Bucket = data.StackResourceSummaries.find(find).PhysicalResourceId
          callback(null, {Bucket, fingerprint, ignore, prune})
        }
      })
    },

    function({Bucket, fingerprint, ignore, prune}, callback) {
      publishToS3({
        Bucket,
        fingerprint,
        ignore,
        prune,
        verbose,
      }, callback)
    }
  ],
  function done(err) {
    if (err && err.message === 'cancel') callback()
    else if (err) callback(err)
    else callback()
  })

  return promise
}
