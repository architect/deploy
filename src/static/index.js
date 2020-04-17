let aws = require('aws-sdk')
let waterfall = require('run-waterfall')
let utils = require('@architect/utils')
let {updater} = require('@architect/utils')
let fingerprintConfig = utils.fingerprint.config
let publishToS3 = require('./publish-to-s3')

/**
 * Upload files to CFN defined bucket
 *
 * @param {Object} params - parameters object
 * @param {Function} callback - a node-style errback
 * @returns {Promise} - if no callback is supplied
 */
module.exports = function statics(params, callback) {
  let {verbose, name, stackname, prune=false, production, update, isDryRun=false, isFullDeploy} = params
  if (!update) update = updater('Deploy')

  let promise
  if (!callback) {
    promise = new Promise(function ugh(res, rej) {
      callback = function errback(err, result) {
        if (err) rej(err)
        else res(result)
      }
    })
  }

  if (isDryRun) {
    // TODO implement static deploy dry run?
    update.status('Static dry run not yet available, skipping static deploy...')
    callback()
  }
  else {
    update.status('Deploying static assets...')

    // defaults
    let {arc} = utils.readArc()
    let appname = arc.app[0]
    if (!stackname) {
      stackname = `${utils.toLogicalID(appname)}${production? 'Production' : 'Staging'}`
      if (name)
        stackname += utils.toLogicalID(name)
    }

    // get the bucket PhysicalResourceId
    waterfall([
      function(callback) {
        if (!arc.static) {
          callback(Error('cancel'))
        }
        else {
          // Enable deletion of files not present in public/ folder
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

          // Allow folder remap
          let findFolder = t=> Array.isArray(t) && t[0].toLowerCase() === 'folder'
          let folder = arc.static.some(findFolder)? arc.static.find(findFolder)[1] : 'public'

          callback(null, {fingerprint, ignore, prune, folder})
        }
      },

      function({fingerprint, ignore, prune, folder}, callback) {
        // lookup bucket in cloudformation
        let cloudformation = new aws.CloudFormation({region: process.env.AWS_REGION})
        cloudformation.listStackResources({
          StackName: stackname
        },
        function done(err, data) {
          if (err) callback(err)
          else {
            let find = i=> i.ResourceType === 'AWS::S3::Bucket' && i.LogicalResourceId === 'StaticBucket'
            let Bucket = data.StackResourceSummaries.find(find).PhysicalResourceId
            callback(null, {Bucket, fingerprint, ignore, prune, folder})
          }
        })
      },

      function({Bucket, fingerprint, ignore, prune, folder}, callback) {
        publishToS3({
          Bucket,
          fingerprint,
          ignore,
          isFullDeploy,
          prune,
          verbose,
          folder,
          update
        }, callback)
      }
    ],
    function done(err) {
      if (err && err.message === 'cancel') callback()
      else if (err) callback(err)
      else callback()
    })
  }

  return promise
}
