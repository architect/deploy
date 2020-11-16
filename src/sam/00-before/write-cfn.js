let samPkg = require('./package')

module.exports = function writeCFN (params, callback) {
  let { bucket, pretty, update, isDryRun } = params
  if (isDryRun) {
    update.status('Skipping CloudFormation deployment...')
    callback()
  }
  else {
    update.start('Generating CloudFormation deployment...')
    samPkg({
      filename: `sam.json`,
      bucket,
      pretty,
    }, callback)
  }
}
