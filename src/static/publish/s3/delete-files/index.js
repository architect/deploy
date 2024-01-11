let { join, sep } = require('path')
let unformatKey = require('./unformat-key')
let getAllS3Files = require('../../../../utils/get-all-s3-files')
let bulkDelete = require('../../../../utils/bulk-delete')
let getS3ItemKey = ({ Key }) => ({ Key })

module.exports = function deleteFiles (params, callback) {
  let {
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
  } = params

  let cwd = inventory.inv._project.cwd

  // If prefix is enabled, we must ignore everything else in the bucket (or risk pruning all contents)
  getAllS3Files({ aws, Bucket, Prefix: prefix }, function _listObjects (err, filesOnS3) {
    if (err) {
      update.error('Listing objects for deletion in S3 failed')
      update.error(err)
      callback()
    }
    else if (!filesOnS3.length) callback()
    else {
      // Diff the files on S3 and those on the local filesystem
      // TODO need to handle pagination (filesOnS3.IsTruncated) if > 1000 files
      let leftovers = filesOnS3.filter(({ Key }) => {
        let key = unformatKey(Key, prefix)
        key = key.replace(/\//g, sep) // Denormalize to each platform
        let localPathOfS3File = join(cwd, folder, key)
        return !files.includes(localPathOfS3File)
      }).map(getS3ItemKey)

      // Only do a second pass on files that Architect fingerprinted
      if (fingerprint && (fingerprint !== 'external')) {
        leftovers = filesOnS3.filter(({ Key }) => {
          let key = unformatKey(Key, prefix)
          if (key === 'static.json') return
          else return !Object.values(staticManifest).includes(key)
        }).map(getS3ItemKey)
      }

      // Respected ignored patterns
      if (ignore.length) {
        leftovers = leftovers.filter(({ Key }) => !ignore.some(i => Key.includes(i)))
      }

      if (leftovers.length) {
        update.status(`Pruning ${leftovers.length} orphaned static assets...`)
        bulkDelete({
          aws,
          Bucket,
          items: leftovers,
          log: true,
          region,
          update,
        }, callback)
      }
      else {
        callback()
      }
    }
  })
}
