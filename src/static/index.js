let aws = require('aws-sdk')
let { join, sep } = require('path')
let { existsSync } = require('fs')
let series = require('run-series')
let { toLogicalID, updater } = require('@architect/utils')
let publish = require('./publish')
let getResources = require('../utils/get-cfn-resources')

let deployActions = [ 'all', 'put', 'delete' ]

// Allow bucket to be cached between invocations
let Bucket

/**
 * Upload files to CFN defined bucket
 *
 * @param {Object} params - parameters object
 * @param {Function} callback - a node-style errback
 */
module.exports = function deployStatic (params, callback) {
  let {
    bucket,
    credentials,
    eject,
    inventory,
    isDryRun = false,
    name,
    production,
    region,
    stackname,
    update,
    verbose,
    // `@static` settings
    prefix, // Enables `@static prefix` publishing prefix (not the same as `@static folder`)
    prune = false,
    // Actions: `all`, `put`, or `delete`
    // `all` also prevents duplicate static manifest operations that could impact state
    deployAction = 'all',
  } = params
  if (!update) update = updater('Deploy')
  let { inv } = inventory
  let appname = inv.app
  let folder = inv.static?.folder
  let staticFolder = folder && join(inv._project.cwd, folder)
  if (bucket) Bucket = bucket

  // Asset pruning: delete files not present in public/ folder
  prune = prune || inv.static?.prune

  // Published path prefixing
  prefix = prefix || inv.static?.prefix

  if (!deployActions.includes(deployAction)) {
    callback(ReferenceError(`Invalid deploy action: ${deployAction}`))
  }
  // Bail early if this project doesn't have @static specified
  else if (!inv.static) {
    callback()
  }
  else if (staticFolder && !existsSync(staticFolder)) {
    update.status(`@static folder (${folder}${sep}) not found, skipping static asset deployment`)
    callback()
  }
  else if (eject || isDryRun) {
    update.status('Skipping static asset deployment')
    if (prune) update.status('Skipping static asset pruning')
    callback()
  }
  // Ok, we're actually doing this thing
  else {
    if (!stackname) {
      stackname = `${toLogicalID(appname)}${production ? 'Production' : 'Staging'}`
      if (name) stackname += toLogicalID(name)
    }

    // Use a manually defined bucket
    let stage = production ? 'production' : 'staging'
    if (inv.static?.[stage]) {
      Bucket = inv.static?.[stage]
    }

    if (deployAction !== 'delete') {
      update.status('Deploying static assets...')
    }

    series([
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
          inventory,
          deployAction,
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
      if (err) callback(err)
      else callback()
    })
  }
}
