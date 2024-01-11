let getAllS3Files = require('../../utils/get-all-s3-files')
let bulkDelete = require('../../utils/bulk-delete')

module.exports = function cleanUpOldDeployArtifacts (params, callback) {
  let {
    aws,
    bucket: Bucket,
    region,
    update,
    verbose,
  } = params

  let week = 1000 * 60 * 60 * 24 * 7

  if (verbose) {
    update.status('Checking for stale deployment artifacts')
  }
  let noneFound = () => {
    if (verbose) {
      update.status('No stale deployment artifacts found')
    }
  }

  getAllS3Files({ aws, Bucket }, function _listObjects (err, filesOnS3) {
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
          aws,
          Bucket,
          items,
          log: verbose,
          region,
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
