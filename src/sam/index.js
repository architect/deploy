let pkg = require('@architect/package')
let { toLogicalID, updater, fingerprint } = require('@architect/utils')
let create = require('@architect/create')
let hydrate = require('@architect/hydrate')
let waterfall = require('run-waterfall')

let print = require('./utils/print')
let handlerCheck = require('../utils/handler-check')
let getBucket = require('./bucket')
let compat = require('./compat')
let macros = require('./macros')
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
    apiType,
    inventory,
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

  if (name) {
    stackname += toLogicalID(name)
  }

  if (isDryRun) {
    update = updater('Deploy [dry-run]')
    update.status('Starting dry run!')
  }

  // API switching
  let arcApiType = inv.aws.apigateway

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
      if (isDryRun) {
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
    function legacyCompat (callback) {
      compat({
        inv,
        stackname
      }, function done (err, result) {
        if (err) callback(err)
        else {
          // Special workflow-specific case where we'll additively mutate the inventory object
          inv._deploy = result
          callback()
        }
      })
    },

    /**
     * Determine final API types
     */
    function setApiType (callback) {
      // Priority: user specified API type > existing legacy API type > default API type
      let specified = apiType || arcApiType // CLI wins over @aws
      if (specified) {
        apiType = specified
      }
      else if (inv._deploy.foundLegacyApi) {
        apiType = 'rest'
      }
      else {
        apiType = 'http'
      }
      // Validate API type in case it was passed via CLI
      if (apiType) {
        let valid = [ 'http', 'httpv1', 'httpv2', 'rest' ]
        if (!valid.includes(apiType)) throw ReferenceError(`API type must be 'http[v1|v2]', or 'rest'`)
      }
      // Add the API type for macros (API payload version, legacy API transform, etc.)
      inv._deploy.apiType = apiType
      callback()
    },

    /**
     * Generate cfn, which must be completed only after fingerprinting or files may not be present
     */
    function generateCloudFormation (callback) {
      callback(null, pkg(inventory))
    },

    /**
     * Userland Plugins
     * WARNING: order matters here. Plugins must run before macros because
     * built-in macros also run things that may impact userland resources (i.e.
     * environment variables set on plugin or macro-generated Lambdas)
     */
    function runPlugins (cloudformation, callback) {
      plugins(inventory, cloudformation, stage, callback)
    },

    /**
     * Macros (both built-in + user)
     */
    function runMacros (pluginModifiedCloudformation, callback) {
      macros(inventory, pluginModifiedCloudformation, stage, callback)
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
      if (isDryRun) {
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
      if (isDryRun) {
        update.status('Skipping post-deployment operations & cleanup')
        update.done('Dry run complete!')
        callback()
      }
      else {
        let legacyAPI = apiType === 'rest'
        let params = {
          inventory,
          legacyAPI,
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
