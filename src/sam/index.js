let pkg = require('@architect/package')
let { toLogicalID, updater, fingerprint } = require('@architect/utils')
let create = require('@architect/create')
let hydrate = require('@architect/hydrate')
let waterfall = require('run-waterfall')

let print = require('./utils/print')
let handlerCheck = require('../utils/handler-check')
let getBucket = require('./bucket')
let compat = require('./compat')
let updateCfn = require('./update-cfn')
let plugins = require('./plugins')
let sizeReport = require('../utils/size-report')
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
  let legacyCompat

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
    /**
     * Maybe auto-init resources
     */
    function createFiles (callback) {
      let autocreateEnabled = prefs && prefs.create && prefs.create.autocreate
      if (autocreateEnabled) {
        // create any missing local infra
        create({ inventory }, callback)
      }
      else callback()
    },

    /**
     * Check existence of handlers
     */
    function checkHandlers (callback) {
      handlerCheck(inv.lambdaSrcDirs, update, callback)
    },

    /**
     * Maybe create a new deployment bucket
     */
    function bucketSetup (callback) {
      if (isDryRun && !eject) {
        bucket = 'N/A (dry-run)'
        callback()
      }
      else {
        if (bucket) callback()
        else {
          getBucket({
            appname,
            region,
            update
          },
          function next (err, result) {
            if (err) callback(err)
            else {
              bucket = result
              callback()
            }
          })
        }
      }
    },

    /**
     * Initialize operations
     */
    function init (callback) {
      update.status(
        'Initializing deployment',
        `Stack ... ${stackname}`,
        `Bucket .. ${bucket}`,
      )
      callback()
    },

    /**
     * Maybe write static asset manifest prior to cfn or hydration
     */
    function maybeFingerprint (callback) {
      if (verbose) update.done(`Static asset fingerpringing ${get.static('fingerprint') ? 'enabled' : 'disabled'}`)
      // Always run full fingerprinting op to ensure remnant static.json files are deleted
      // This is especially important in Arc 6+ where we no longer do .arc checks for fingerprint status
      fingerprint({ inventory }, (err) => {
        callback(err)
      })
    },

    /**
     * Hydrate dependencies
     */
    function hydrateTheThings (callback) {
      if (shouldHydrate) hydrate.install({ autoinstall: true }, (err /* , result */) => {
        callback(err)
      })
      else callback()
    },

    /**
     * Check to see if we're working with a legacy (REST) API (and any other backwards compat checks)
     */
    function legacyCompatCheck (callback) {
      compat({
        inv,
        stackname
      }, function done (err, result) {
        if (err) callback(err)
        else {
          legacyCompat = result

          // Priority: user specified API type > existing legacy API type > default API type
          if (!inv.aws.apigateway && legacyCompat.foundLegacyApi) {
            inv.aws.apigateway = 'rest'
          }
          callback()
        }
      })
    },

    /**
     * Generate cfn, which must be completed only after fingerprinting or files may not be present
     */
    function generateCloudFormation (callback) {
      let cloudformation = pkg(inventory)
      callback(null, cloudformation)
    },

    /**
     * Update CloudFormation with project-specific mutations
     */
    function updateCloudFormation (cloudformation, callback) {
      updateCfn({ cloudformation, inventory, legacyCompat, stage }, callback)
    },

    /**
     * deploy.start plugins
     */
    function runStartPlugins (cloudformation, callback) {
      plugins.start({ cloudformation, inventory, stage }, callback)
    },

    /**
     * deploy.services plugins
     */
    function runServicesPlugins (cloudformation, callback) {
      plugins.services({ cloudformation, inventory, stage }, callback)
    },

    /**
     * Pre-deploy ops
     */
    function beforeDeploy (finalCfn, callback) {
      let params = { sam: finalCfn, bucket, pretty, update, isDryRun }
      // this will write sam.json/yaml files out
      before(params, callback)
    },

    /**
     * Print a size report
     */
    function chonkyBois (callback) {
      sizeReport({ inventory, update }, callback)
    },

    /**
     * Deployment
     */
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

    /**
      * Post-deploy ops
      */
    function afterDeploy (callback) {
      if (eject) {
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
    }

  ], callback)
}
