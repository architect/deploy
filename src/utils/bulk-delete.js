let chalk = require('chalk')

module.exports = function bulkDelete (params, callback) {
  let { aws, Bucket, items, log, region, update } = params

  // Re-filter just for Keys jic; extra properties will blow up the request
  let objects = items.map(({ Key }) => ({ Key }))

  function deleteItems () {
    let deleteParams = {
      Bucket,
      Delete: { Objects: objects.splice(0, 1000) },
    }
    aws.s3.DeleteObjects(deleteParams)
      .then(data => {
        if (log) {
          data.Deleted.forEach(function (deletedFile) {
            let last = `https://${Bucket}.s3.${region}.amazonaws.com/${deletedFile.Key}`
            update.raw(`${chalk.red('[ ✗ Deleted  ]')} ${chalk.cyan(last)}`)
          })
        }
        if (objects.length) deleteItems()
        else callback()
      })
      .catch(err => {
        update.error('Deleting objects on S3 failed')
        update.error(err)
        callback()
      })
  }
  deleteItems()
}
