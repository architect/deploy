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
  let {
    arcStaticFolder, // Enables folder prefix in S3 (not the same as @arc folder)
    bucket: Bucket,
    isDryRun=false,
    isFullDeploy,
    name,
    production,
    prune=false,
    region,
    stackname,
    update,
    verbose,
  } = params
  if (!update) update = updater('Deploy')
  region = region || process.env.AWS_REGION

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

          function setting(name, bool) {
            let value
            for (let opt of arc.static) {
              if (!opt[0]) return
              if (opt[0].toLowerCase() === name && opt[1]) {
                if (bool && opt[1] === true) value = true
                else value = opt[1]
              }
            }
            return value || false
          }


          // Enable fingerprinting + ignore any specified files
          let { fingerprint, ignore }  = fingerprintConfig(arc)

          // Enable asset pruning
          prune = setting('prune', true)

          // Allow folder remap
          let folder = setting('folder') || 'public'

          callback(null, {fingerprint, ignore, prune, folder})
        }
      },

      function(params, callback) {
        if (!Bucket) {
          // lookup bucket in cloudformation
          let cloudformation = new aws.CloudFormation({region: process.env.AWS_REGION})
          cloudformation.listStackResources({
            StackName: stackname
          },
          function done(err, data) {
            if (err) callback(err)
            else {
              let find = i=> i.ResourceType === 'AWS::S3::Bucket' && i.LogicalResourceId === 'StaticBucket'
              Bucket = data.StackResourceSummaries.find(find).PhysicalResourceId
              callback(null, params)
            }
          })
        }
        else callback(null, params)
      },

      function({fingerprint, ignore, prune, folder}, callback) {
        publishToS3({
          arcStaticFolder,
          Bucket,
          fingerprint,
          folder,
          ignore,
          isFullDeploy,
          prune,
          region,
          update,
          verbose,
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
