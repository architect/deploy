let { join } = require('path')
let chalk = require('chalk')
let unformatKey = require('./unformat-key')
let getS3ItemKey = ({ Key }) => ({ Key })

module.exports = function deleteFiles (params, callback) {
  let {
    Bucket,
    files,
    fingerprint,
    folder,
    ignore,
    prefix,
    region,
    s3,
    staticManifest,
    update,
  } = params

  // If prefix is enabled, we must ignore everything else in the bucket (or risk pruning all contents)
  let listParams = { Bucket }
  if (prefix) listParams.Prefix = prefix

  s3.listObjectsV2(listParams, function _listObjects (err, filesOnS3) {
    if (err) {
      update.error('Listing objects for deletion in S3 failed')
      update.error(err)
      callback()
    }
    else {
      if (!filesOnS3.Contents.length) return callback()

      // Diff the files on S3 and those on the local filesystem
      // TODO need to handle pagination (filesOnS3.IsTruncated) if > 1000 files
      let leftovers = filesOnS3.Contents.filter(({ Key }) => {
        let key = unformatKey(Key, prefix)
        let localPathOfS3File = join(process.cwd(), folder, key)
        return !files.includes(localPathOfS3File)
      }).map(getS3ItemKey)

      // Only do a second pass on files that Architect fingerprinted
      if (fingerprint && (fingerprint !== 'external')) {
        leftovers = filesOnS3.Contents.filter(({ Key }) => {
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
        let deleteParams = {
          Bucket,
          Delete: {
            Objects: leftovers,
            Quiet: false
          }
        }

        // TODO chunk requests to 1k
        s3.deleteObjects(deleteParams, function (err, data) {
          if (err) {
            update.error('Deleting objects on S3 failed')
            update.error(err)
          }
          else {
            data.Deleted.forEach(function (deletedFile) {
              let last = `https://${Bucket}.s3.${region}.amazonaws.com/${deletedFile.Key}`
              update.raw(`${chalk.red('[ ✗ Deleted  ]')} ${chalk.cyan(last)}`)
            })
          }
          callback()
        })
      }
      else {
        callback()
      }
    }
  })
}
