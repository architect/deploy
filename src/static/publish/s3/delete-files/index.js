let { join } = require('path')
let chalk = require('chalk')
let unformatKey = require('./unformat-key')

module.exports = function deleteFiles (params, callback) {
  let {
    Bucket,
    files,
    fingerprint,
    folder,
    prefix,
    region,
    s3,
    staticManifest
  } = params

  // If prefix is enabled, we must ignore everything else in the bucket (or risk pruning all contents)
  let listParams = { Bucket }
  if (prefix) listParams.Prefix = prefix

  s3.listObjectsV2(listParams, function _listObjects (err, filesOnS3) {
    if (err) {
      console.error('Listing objects for deletion in S3 failed', err)
      callback()
    }
    else {
      // Diff the files on S3 and those on the local filesystem
      // TODO need to handle pagination (filesOnS3.IsTruncated) if > 1000 files
      let leftovers = filesOnS3.Contents.filter(S3File => {
        let { Key } = S3File
        let key = unformatKey(Key, prefix)
        let localPathOfS3File = join(process.cwd(), folder, key)
        return !files.includes(localPathOfS3File)
      }).map(S3File => ({ Key: S3File.Key }))

      // Only do a second pass on files that Architect fingerprinted
      if (fingerprint && (fingerprint !== 'external')) {
        leftovers = filesOnS3.Contents.filter(S3File => {
          let { Key } = S3File
          let key = unformatKey(Key, prefix)
          if (key === 'static.json') return
          else return !Object.values(staticManifest).some(f => f === key)
        }).map(S3File => ({ Key: S3File.Key }))
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
            console.error('Deleting objects on S3 failed', err)
          }
          else {
            data.Deleted.forEach(function (deletedFile) {
              let last = `https://${Bucket}.s3.${region}.amazonaws.com/${deletedFile.Key}`
              console.log(`${chalk.red('[ ✗ Deleted  ]')} ${chalk.cyan(last)}`)
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
