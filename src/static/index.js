let aws = require('aws-sdk')
let { join } = require('path')
let { existsSync } = require('fs')
let waterfall = require('run-waterfall')
let parser = require('@architect/parser')
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
    isDryRun=false,
    isFullDeploy,
    name,
    production,
    region,
    stackname,
    update,
    verbose,
    // `@static` settings
    prefix, // Enables `@static prefix` publishing prefix (not the same as `@static folder`)
    prune=false,
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
    let { arc } = parser.readArc()
    let appname = arc.app[0]
    if (!stackname) {
      stackname = `${toLogicalID(appname)}${production? 'Production' : 'Staging'}`
      if (name)
        stackname += toLogicalID(name)
    }

    waterfall([
      // Parse settings
      function(callback) {
        if (!arc.static) {
          callback(Error('cancel'))
        }
        else {
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


          // Fingerprinting + ignore any specified files
          let { fingerprint, ignore }  = fingerprinter.config(arc)

          // Asset pruning: delete files not present in public/ folder
          prune = prune || setting('prune', true)

          // Project folder remap
          let folder = setting('folder') || 'public'
          if (!existsSync(join(process.cwd(), folder))) {
            callback(Error('@static folder not found'))
          }

          // Published path prefixing
          prefix = prefix || setting('prefix')

          callback(null, {fingerprint, ignore, folder})
        }
      },

      // Get the bucket PhysicalResourceId
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

      function({fingerprint, ignore, folder}, callback) {
        publish({
          Bucket,
          fingerprint,
          folder,
          ignore,
          isFullDeploy,
          prefix,
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
