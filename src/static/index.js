let aws = require('aws-sdk')
let { join, sep } = require('path')
let { existsSync } = require('fs')
let series = require('run-series')
let { toLogicalID, updater } = require('@architect/utils')
let publish = require('./publish')
let getResources = require('../utils/get-cfn-resources')

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
    eject,
    inventory,
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
  let { inv } = inventory

  if (!inv.static) callback()
  else if (eject || isDryRun) {
    update.status('Skipping static deploy')
    callback()
  }
  else {
    update.status('Deploying static assets...')
    let appname = inv.app

    if (!stackname) {
      stackname = `${toLogicalID(appname)}${production ? 'Production' : 'Staging'}`
      if (name) stackname += toLogicalID(name)
    }

    let folder
    series([
      // Parse settings
      function (callback) {
        // Bail early if this project doesn't have @static specified
        if (!inv.static) callback(Error('cancel'))
        else {
          // Asset pruning: delete files not present in public/ folder
          prune = prune || inv.static.prune

          // Project folder remap
          folder = inv.static.folder
          if (!existsSync(join(process.cwd(), folder))) {
            callback(Error('no_folder'))
          }
          else {
            // Published path prefixing
            prefix = prefix || inv.static.prefix
            callback()
          }
        }
      },

      // Get the bucket PhysicalResourceId if not supplied
      function (callback) {
        if (!Bucket) {
          getResources({ credentials, region, stackname }, function (err, resources) {
            if (err) callback(err)
            else {
              let find = i => i.ResourceType === 'AWS::S3::Bucket' && i.LogicalResourceId === 'StaticBucket'
              Bucket = resources.find(find).PhysicalResourceId
              callback()
            }
          })
        }
        else callback()
      },

      function (callback) {
        let config = { region }
        if (credentials) config.credentials = credentials
        let s3 = new aws.S3(config)

        publish({
          Bucket,
          folder,
          inventory,
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
      if (err && err.message === 'no_folder') {
        update.status(`@static folder (${folder}${sep}) not found, skipping static asset deployment`)
        callback()
      }
      else if (err && err.message === 'cancel') {
        if (!isFullDeploy) update.done('No static assets to deploy')
        callback()
      }
      else if (err) callback(err)
      else callback()
    })
  }
}
