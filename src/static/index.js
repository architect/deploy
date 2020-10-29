let aws = require('aws-sdk')
let { join } = require('path')
let { existsSync } = require('fs')
let waterfall = require('run-waterfall')
let { readArc } = require('@architect/parser')
let { fingerprint: fingerprinter, toLogicalID, updater } = require('@architect/utils')
let publish = require('./publish')

/**
 * Upload files to CFN defined bucket
 *
 * @param {Object} params - parameters object
 * @param {Function} callback - a node-style errback
 * @returns {Promise} - if no callback is supplied
 */
module.exports = function deployStatic (params, callback) {
  let {
    bucket: Bucket,
    credentials,
    isDryRun = false,
    isFullDeploy = true, // Prevents duplicate static manifest operations that could impact state
    name,
    production,
    region,
    stackname,
    update,
    verbose,
    // `@static` settings
    prefix, // Enables `@static prefix` publishing prefix (not the same as `@static folder`)
    prune = false,
  } = params
  if (!update) update = updater('Deploy')

  // AWS config
  region = region || process.env.AWS_REGION
  let config = { region }
  if (credentials) config.credentials = credentials

  let promise
  if (!callback) {
    promise = new Promise(function ugh (res, rej) {
      callback = function errback (err, result) {
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
    let { arc } = readArc()
    let appname = arc.app[0]

    if (!stackname) {
      stackname = `${toLogicalID(appname)}${production ? 'Production' : 'Staging'}`
      if (name) stackname += toLogicalID(name)
    }

    let staticEnabled = arc.static || (arc.http && existsSync(join(process.cwd(), 'public')))

    waterfall([
      // Parse settings
      function (callback) {
        // Bail early if this project doesn't have @static specified
        if (!staticEnabled) {
          callback(Error('cancel'))
        }
        else {
          function setting (name, bool) {
            let value
            if (!arc.static) return false
            for (let opt of arc.static) {
              if (!opt[0]) continue
              if (opt[0].toLowerCase() === name && opt[1]) {
                if (bool && opt[1] === true) value = true
                else value = opt[1]
              }
            }
            return value || false
          }

          // Fingerprinting + ignore any specified files
          let { fingerprint, ignore } = fingerprinter.config(arc)

          // Asset pruning: delete files not present in public/ folder
          prune = prune || setting('prune', true)

          // Project folder remap
          let folder = setting('folder') || 'public'
          if (!existsSync(join(process.cwd(), folder))) {
            callback(Error('@static folder not found'))
          }

          // Published path prefixing
          prefix = prefix || setting('prefix')

          callback(null, { fingerprint, ignore, folder })
        }
      },

      // Get the bucket PhysicalResourceId if not supplied
      function (params, callback) {
        if (!Bucket) {
          let cloudformation = new aws.CloudFormation(config)
          let StackName = stackname
          
          let results = []
          function getStackResources (params = {}, callback) {
            cloudformation.listStackResources(params, function done (
              err,
              { NextToken, StackResourceSummaries }
            ) {
              if (err) callback(err)
              else if (NextToken) {
                results = results.concat(StackResourceSummaries)
                getStackResources({ StackName, NextToken }, callback)
              }
              else {
                results = results.concat(StackResourceSummaries)
                callback(null, results)
              }
            })
          }

          getStackResources({ StackName }, function done (
            err,
            StackResourceSummaries
          ) {
            if (err) callback(err)
            else {
              let find = (i) =>
                i.ResourceType === 'AWS::S3::Bucket' &&
                i.LogicalResourceId === 'StaticBucket'
              Bucket = StackResourceSummaries.find(find).PhysicalResourceId
              callback(null, params)
            }
          })
        }
        else callback(null, params)
      },

      function ({ fingerprint, ignore, folder }, callback) {
        let s3 = new aws.S3(config)

        publish({
          Bucket,
          fingerprint,
          folder,
          ignore,
          isFullDeploy,
          prefix,
          prune,
          region,
          s3,
          update,
          verbose,
        }, callback)
      }
    ],
    function done (err) {
      if (err && err.message === 'cancel') callback()
      else if (err) callback(err)
      else callback()
    })
  }

  return promise
}
