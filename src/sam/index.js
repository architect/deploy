let pkg = require('@architect/package')
let { toLogicalID, updater, fingerprint } = require('@architect/utils')
let create = require('@architect/create')
let hydrate = require('@architect/hydrate')
let waterfall = require('run-waterfall')

let print = require('./utils/print')
let handlerCheck = require('../utils/handler-check')
let getBucket = require('./bucket')
let _compat = require('./compat')
let patchCfn = require('./patches/cfn')
let patchAsap = require('./patches/asap')
let plugins = require('./plugins')
let sizeReport = require('../utils/size-report')
let staticDeploy = require('./static')
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
module.exports = function samDeploy (params, callback) {
  let {
    inventory,
    eject,
    isDryRun = false,
    shouldHydrate = true,
    name,
    production,
    prune,
    region,
    tags,
    update,
    verbose,
  } = params
  let { inv, get } = inventory
  if (!update) update = updater('Deploy')

  let stage = production ? 'production' : 'staging'
  let ts = Date.now()
  let log = true
  let pretty = print({ log, verbose })
  let appname = inv.app
  let bucket = inv.aws.bucket
  let prefs = inv._project.preferences
  let stackname = `${toLogicalID(appname)}${production ? 'Production' : 'Staging'}`
  let dryRun = isDryRun || eject || false // General dry run flag for plugins
  let deployTargetPlugins = inventory.inv.plugins?._methods?.deploy?.target
  let plural = deployTargetPlugins?.length > 1 ? 's' : ''
  let compat, finalCloudFormation

  if (name) {
    stackname += toLogicalID(name)
  }

  if (eject) {
    update = updater('Deploy [eject]')
    update.status('Preparing to eject Architect app')
  }
  else if (isDryRun) {
    update = updater('Deploy [dry-run]')
    update.status('Starting dry run!')
  }

  waterfall([
    // Maybe auto-init resources
    function createFiles (callback) {
      let autocreateEnabled = prefs && prefs.create && prefs.create.autocreate
      if (autocreateEnabled) {
        // create any missing local infra
        create({ inventory }, callback)
      }
      else callback()
    },

    // Check to see if we're working with a legacy API (and any other compatibility checks)
    function compatCheck (callback) {
      _compat({ inv, stackname }, (err, result) => {
        if (err) callback(err)
        else {
          compat = result
          callback()
        }
      })
    },

    // Generate cfn, which must be completed only after fingerprinting or files may not be present
    function generateCloudFormation (callback) {
      let cloudformation = pkg(inventory)
      callback(null, cloudformation)
    },

    // Patch CloudFormation with project-specific mutations
    function patchCloudFormation (cloudformation, callback) {
      patchCfn({ cloudformation, inventory, compat }, callback)
    },

    // deploy.start plugins
    function runStartPlugins (cloudformation, callback) {
      plugins.start({ cloudformation, dryRun, inventory, stage }, callback)
    },

    // deploy.services plugins
    function runServicesPlugins (cloudformation, callback) {
      plugins.services({ cloudformation, dryRun, inventory, stage }, callback)
    },

    // Fingerprint static assets + ensure ASAP has static.json
    function fingerprintAndUpdateAsap (cloudformation, callback) {
      if (verbose) update.done(`Static asset fingerpringing ${get.static('fingerprint') ? 'enabled' : 'disabled'}`)
      // Always run full fingerprinting op to ensure remnant static.json files are deleted
      // This is especially important in Arc 6+ where we no longer do .arc checks for fingerprint status
      fingerprint({ inventory }, err => {
        if (err) callback(err)
        else {
          patchAsap({ cloudformation, inventory }, (err, cfn) => {
            if (err) callback(err)
            else {
              finalCloudFormation = cfn
              callback()
            }
          })
        }
      })
    },

    // Check existence of handlers
    function checkHandlers (callback) {
      handlerCheck(inv.lambdaSrcDirs, update, callback)
    },

    // Hydrate dependencies
    function hydrateTheThings (callback) {
      if (shouldHydrate) hydrate.install({ autoinstall: true }, err => callback(err))
      else callback()
    },

    // Print a size report
    function chonkyBois (callback) {
      sizeReport({ inventory, update }, callback)
    },

    // Maybe create a new deployment bucket
    function bucketSetup (callback) {
      if (isDryRun && !eject) {
        bucket = 'N/A (dry-run)'
        callback()
      }
      else if (deployTargetPlugins) {
        bucket = `N/A (deploy.target plugin${plural} present)`
        callback()
      }
      else {
        if (bucket) callback()
        else {
          getBucket({ appname, region, update }, (err, result) => {
            if (err) callback(err)
            else {
              bucket = result
              callback()
            }
          })
        }
      }
    },

    // Initialize operations
    function init (callback) {
      update.status(
        'Initializing deployment',
        `Stack ... ${stackname}`,
        `Bucket .. ${bucket}`,
      )
      callback()
    },

    // Pre-deploy ops
    function beforeDeploy (callback) {
      let params = { sam: finalCloudFormation, bucket, pretty, update, isDryRun }
      // this will write sam.json/yaml files out
      before(params, callback)
    },

    // Maybe pre-deploy static assets
    function preDeployStatic (callback){
      let params = { compat, eject, inventory, isDryRun, production, prune, region, stackname, verbose, update }
      staticDeploy(params, true, callback)
    },

    // Deployment
    function theDeploy (callback) {
      if (eject) {
        let cmd = `aws cloudformation deploy --template-file sam.json --stack-name ${stackname} --s3-bucket ${bucket} --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND --region ${region}`
        if (tags.length) cmd += ` --tags ${tags.join(' ')}`
        update.status(`Successfully generated sam.json. Deploy it to AWS by running:`, cmd)
        callback()
      }
      else if (isDryRun) {
        update.status('Skipping deployment to AWS')
        callback()
      }
      else if (deployTargetPlugins) {
        update.status(`Deploying with deploy.target plugin${plural}`)
        callback()
      }
      else {
        // leverages the previously-written-out sam.json/yaml files
        deploy({
          appname,
          stackname,
          bucket,
          pretty,
          region,
          update,
          tags,
        }, callback)
      }
    },

    // deploy.target plugins
    function runTargetPlugins (callback) {
      let cloudformation = finalCloudFormation
      plugins.target({ cloudformation, dryRun, inventory, stage }, callback)
    },

    // Post-deploy static assets
    function postDeployStatic (callback){
      let params = { compat, eject, inventory, isDryRun, production, prune, region, stackname, verbose, update }
      staticDeploy(params, false, callback)
    },

    // Post-deploy ops
    function afterDeploy (callback) {
      if (eject || deployTargetPlugins) {
        callback()
      }
      else if (isDryRun) {
        update.status('Skipping post-deployment operations & cleanup')
        update.done('Dry run complete!')
        callback()
      }
      else {
        let params = {
          inventory,
          compat,
          pretty,
          production,
          prune,
          region,
          stackname,
          stage,
          ts,
          update,
          verbose,
        }
        after(params, callback)
      }
    },

    // deploy.end plugins
    function runEndPlugins (callback) {
      let cloudformation = finalCloudFormation
      plugins.end({ cloudformation, dryRun, inventory, stage }, callback)
    },
  ], callback)
}
