let chalk = require('chalk')
let { globSync } = require('glob')
let { join, sep } = require('path')
let { pathToUnix } = require('@architect/utils')
let waterfall = require('run-waterfall')

let filterFiles = require('./filter-files')
let writeStaticManifest = require('./write-static-manifest')
let putFiles = require('./s3/put-files')
let deleteFiles = require('./s3/delete-files')

// Allow file list to be cached between invocations
let files, staticManifest

module.exports = function publishStaticAssets (params, callback) {
  let {
    aws,
    Bucket,
    deployAction,
    inventory,
    prefix,
    prune,
    region,
    update,
    verbose,
  } = params
  let { inv, get } = inventory
  let folder = inv.static.folder
  let publicDir = join(inv._project.cwd, folder)

  let publishing = [ 'all', 'put' ].includes(deployAction)
  let deleting = [ 'all', 'delete' ].includes(deployAction) && prune

  // Assigned later
  let uploaded
  let notModified

  // Settings
  let fingerprint = get.static('fingerprint')
  let ignore = get.static('ignore') ? [ ...get.static('ignore') ] : []

  // Second-pass, post-deploy, static asset pruning-only operation
  if (files && prune && deployAction === 'delete') {
    return deleteFiles({
      aws,
      Bucket,
      files,
      fingerprint,
      folder,
      ignore,
      inventory,
      prefix,
      region,
      staticManifest,
      update,
    }, done)
  }

  // Notices
  if ((publishing && fingerprint) ||
      (publishing && verbose)) {
    update.done(`Static asset fingerprinting ${fingerprint ? 'enabled' : 'disabled'}`)
  }
  if (prune || verbose) {
    update.done(`Orphaned file pruning ${prune ? 'enabled' : 'disabled'}`)
  }

  waterfall([
    // Scan for files in the public directory
    function _globAndFilter (callback) {
      try {
        let path = pathToUnix(publicDir + '/**/*')
        let globbed = globSync(path, { dot: true, nodir: true, follow: true })
        // Filter based on default and user-specified @static ignore rules
        filterFiles({ globbed, ignore }, callback)
      }
      catch (err) {
        callback(err)
      }
    },

    // Write, reuse, or possibly remove fingerprinted static asset manifest
    function _maybeWriteStaticManifest (filtered, ignored, callback) {
      files = filtered
      writeStaticManifest({
        ignore: ignored,
        inventory,
        publishing,
        publicDir,
      }, callback)
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
        files.unshift(join(publicDir, 'static.json'))
      }

      putFiles({
        aws,
        Bucket,
        files,
        fingerprint,
        inventory,
        publicDir,
        prefix,
        region,
        staticManifest,
        update,
        verbose,
      }, callback)
    },

    // Prune old files (if requested)
    function _delete (uploadCount, notModifiedCount, callback) {
      uploaded = uploadCount
      notModified = notModifiedCount

      if (deleting) {
        deleteFiles({
          aws,
          Bucket,
          files,
          fingerprint,
          folder,
          ignore,
          inventory,
          prefix,
          region,
          staticManifest,
          update,
        }, callback)
      }
      else callback()
    },
  ], done)

  function done (err) {
    if (err?.message === 'no_files_to_publish') {
      update.done('Done!', `No static assets found to deploy from ${folder}${sep}`)
      callback()
    }
    else if (err?.message === 'access_denied') {
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
        let msg = `Deployed ${uploaded} static asset${uploaded > 1 ? 's' : ''} from ${folder}${sep}`
        update.done(msg)
      }
      callback()
    }
  }
}
