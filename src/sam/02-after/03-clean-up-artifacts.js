let getAllS3Files = require('../../utils/get-all-s3-files')
let bulkDelete = require('../../utils/bulk-delete')
let aws = require('aws-sdk')

module.exports = function cleanUpOldDeployArtifacts (params, callback) {
  let {
    bucket: Bucket,
    region,
    update,
    verbose,
  } = params

  let s3 = new aws.S3({ region })
  let week = 1000 * 60 * 60 * 24 * 7

  if (verbose) {
    update.status('Checking for stale deployment artifacts')
  }
  let noneFound = () => {
    if (verbose) {
      update.status('No stale deployment artifacts found')
    }
  }

  getAllS3Files({ Bucket, s3 }, function _listObjects (err, filesOnS3) {
    if (err) callback(err)
    else if (!filesOnS3.length) {
      noneFound()
      callback()
    }
    else {
      let items = filesOnS3.filter(item => {
        let { LastModified } = item
        let ts = new Date(LastModified)
        let age = Date.now() - ts
        return age >= week
      })
      if (items.length) {
        if (verbose) {
          update.status(`Destroying ${items.length} stale deployment artifacts`)
        }
        bulkDelete({
          Bucket,
          items,
          log: verbose,
          region,
          s3,
          update,
        }, callback)
      }
      else {
        noneFound()
        callback()
      }
    }
  })
}
