let chalk = require('chalk')
let glob = require('glob')
let { join, sep } = require('path')
let { pathToUnix } = require('@architect/utils')
let waterfall = require('run-waterfall')

let filterFiles = require('./filter-files')
let writeStaticManifest = require('./write-static-manifest')
let putFiles = require('./s3/put-files')
let deleteFiles = require('./s3/delete-files')

module.exports = function publishStaticAssets (params, callback) {
  let {
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
  } = params
  let { get } = inventory

  let publicDir = pathToUnix(join(process.cwd(), folder))
  let staticAssets = join(publicDir, '/**/*')

  // Assigned later
  let files
  let staticManifest
  let uploaded
  let notModified

  // Settings
  let fingerprint = get.static('fingerprint')
  let ignore = get.static('ignore') ? [ ...get.static('ignore') ] : [] // Copy for mutation later

  waterfall([

    // Notices
    function _notices (callback) {
      if ((!isFullDeploy && fingerprint) || (!isFullDeploy && verbose)) {
        update.done(`Static asset fingerpringing ${fingerprint ? 'enabled' : 'disabled'}`)
      }
      if (prune || verbose) {
        update.done(`Orphaned file pruning ${prune ? 'enabled' : 'disabled'}`)
      }
      callback()
    },

    // Scan for files in the public directory
    function _globFiles (callback) {
      let dir = pathToUnix(staticAssets)
      let opts = {
        dot: true,
        nodir: true,
        follow: true
      }
      glob(dir, opts, callback)
    },

    // Filter based on default and user-specified @static ignore rules
    function _filterFiles (globbed, callback) {
      let params = { globbed, ignore, publicDir }
      filterFiles(params, callback)
    },

    // Write, reuse, or possibly remove fingerprinted static asset manifest
    function _maybeWriteStaticManifest (filtered, ignored, callback) {
      files = filtered
      ignore = ignored
      let params = { ignore, inventory, isFullDeploy, publicDir }
      writeStaticManifest(params, callback)
    },

    // Upload files to S3
    function _put (manifest = {}, callback) {
      // Fingerprinter may or may not return a manifest
      if (!callback) {
        callback = manifest
        manifest = {}
      }
      staticManifest = manifest
      // static.json is intentionally ignored during fingerprinting; ensure it's uploaded
      if (fingerprint && (fingerprint !== 'external')) {
        files.unshift(pathToUnix(join(publicDir, 'static.json')))
      }

      putFiles({
        Bucket,
        files,
        fingerprint,
        inventory,
        publicDir,
        prefix,
        region,
        s3,
        staticManifest
      }, callback)
    },

    // Prune old files (if requested)
    function _delete (uploadCount, notModifiedCount, callback) {
      uploaded = uploadCount
      notModified = notModifiedCount

      if (prune) {
        deleteFiles({
          Bucket,
          files,
          fingerprint,
          folder,
          prefix,
          region,
          s3,
          staticManifest
        }, callback)
      }
      else callback()
    }
  ], function done (err) {
    if (err && err.message === 'no_files_to_publish') {
      update.done('Done!', `No static assets found to deploy from ${folder}${sep}`)
      callback()
    }
    else if (err && err.message === 'access_denied') {
      update.error(`${chalk.red.bold('S3 access denied:')} could not access S3 bucket (${Bucket})`)
      update.error('Possible reason: bucket already exists & belongs to another AWS account')
      callback()
    }
    else if (err) {
      callback(err)
    }
    else {
      if (notModified) {
        update.done(`Skipped ${notModified} file${notModified > 1 ? 's' : ''} (already up to date)`)
      }
      if (uploaded) {
        let msg = chalk.green(`Deployed static asset${uploaded > 1 ? 's' : ''} from ${folder}${sep}`)
        update.done('Success!', msg)
      }
      callback()
    }
  })
}
