let aws = require('aws-sdk')
let waterfall = require('run-waterfall')
let utils = require('@architect/utils')
let fingerprintConfig = utils.fingerprint.config
let publishToS3 = require('./publish-to-s3')

/**
 * Upload files to CFN defined bucket
 *
 * @param {Object} params - parameters object
 * @param {Function} callback - a node-style errback
 * @returns {Promise} - if no callback is supplied
 */
module.exports = function statics({verbose, production}, callback) {
  let promise
  if (!callback) {
    promise = new Promise(function ugh(res, rej) {
      callback = function errback(err, result) {
        if (err) rej(err)
        else res(result)
      }
    })
  }

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
        let fingerprint = fingerprintConfig(arc).fingerprint

        // Collect any strings to match against for ignore
        let ignore = fingerprintConfig(arc).ignore

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
