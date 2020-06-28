let pkg = require('@architect/package')
let utils = require('@architect/utils')
let { readArc, toLogicalID, updater } = require('@architect/utils')
let fingerprinter = utils.fingerprint
let fingerprintConfig = fingerprinter.config
let series = require('run-series')
let hydrate = require('@architect/hydrate')

let print = require('./print')
let getBucket = require('./bucket')
let compat = require('./compat')
let macros = require('./macros')
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
  let { apiType, isDryRun = false, name, production, prune, tags, verbose } = params

  let stage = production ? 'production' : 'staging'
  let ts = Date.now()
  let log = true
  let pretty = print({ log, verbose })
  let { arc } = readArc()
  let bucket // Assigned later
  let appname = arc.app[0]
  let stackname = `${toLogicalID(appname)}${production ? 'Production' : 'Staging'}`
  let update = updater('Deploy')

  if (name)
    stackname += toLogicalID(name)

  // Assigned below
  let cloudformation
  let sam
  let nested

  // API switching
  let legacyAPI // Default may be reassigned below
  let findAPIType = s => s[0] && s[0] === 'apigateway' && s[1]
  let arcAPIType = arc.aws && arc.aws.some(findAPIType) && arc.aws.find(findAPIType)[1]
  // CLI wins over @aws setting
  apiType = apiType || arcAPIType
  if (apiType) {
    if (apiType !== 'http' && apiType !== 'rest') throw ReferenceError('API type must be http or rest')
    if (apiType === 'rest') legacyAPI = true
    else legacyAPI = false
  }

  let region = process.env.AWS_REGION
  if (!region)
    throw ReferenceError('AWS region must be configured to deploy')

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
    update = updater('Deploy [dry-run]')
    update.status('Starting dry run!')
  }

  series([
    /**
     * Maybe create a new deployment bucket
     */
    function bucketSetup (callback) {
      if (isDryRun) {
        bucket = 'N/A (dry-run)'
        callback()
      }
      else {
        let bucketProvided = arc.aws && arc.aws.some(o => o[0] === 'bucket')
        if (bucketProvided) {
          bucket = arc.aws.find(o => o[0] === 'bucket')[1]
          callback()
        }
        else {
          let appname = arc.app[0]
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
      let { fingerprint } = fingerprintConfig(arc)

      if (fingerprint || verbose)
        update.done(`Static asset fingerpringing ${fingerprint ? 'enabled' : 'disabled'}`)

      // Always run full fingerprinting op to ensure remnant static.json files are deleted
      // This is especially important in Arc 6+ where we no longer do .arc checks for fingerprint status
      fingerprinter({}, function done (err) {
        if (err) {
          callback(err)
        }
        else {
          callback()
        }
      })
    },

    /**
     * Hydrate dependencies
     */
    function hydrateTheThings (callback) {
      hydrate.install({}, callback)
    },

    /**
     * Generate cfn, which must be completed only after fingerprinting or files may not be present
     */
    function generateCloudFormation (callback) {
      cloudformation = pkg(arc)
      callback()
    },

    /**
     * Check to see if we're working with a legacy (REST) API (and any other backwards compat checks)
     */
    function legacyCompat (callback) {
      compat({
        arc,
        stackname
      }, function done (err, result = {}) {
        if (err) callback(err)
        else {
          // If specifed above by CLI flag or arc.aws setting, override result
          if (legacyAPI === undefined && result.legacyAPI) {
            legacyAPI = result.legacyAPI
          }
          callback()
        }
      })
    },

    /**
     * Macros (both built-in + user)
     */
    function runMacros (callback) {
      let options = { legacyAPI }
      macros(
        arc,
        cloudformation,
        stage,
        options,
        function done (err, _sam) {
          if (err) callback(err)
          else {
            sam = _sam
            nested = Object.prototype.hasOwnProperty.call(sam, `${appname}-cfn.json`)
            callback()
          }
        })
    },

    /**
     * Pre-deploy ops
     */
    function beforeDeploy (callback) {
      let params = { sam, nested, bucket, pretty, update, isDryRun }
      before(params, callback)
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
        deploy({
          appname,
          stackname,
          nested,
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
        let params = { ts, arc, verbose, production, pretty, prune, appname, stackname, stage, update }
        after(params, callback)
      }
    }

  ], callback)

  return promise
}
