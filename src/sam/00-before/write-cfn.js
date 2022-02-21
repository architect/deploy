let spawn = require('../utils/spawn')

module.exports = function writeCFN (params, callback) {
  let { bucket, pretty, update, isDryRun } = params
  if (isDryRun) {
    update.status('Skipping CloudFormation deployment...')
    callback()
  }
  else {
    update.start('Generating CloudFormation deployment...')
    let filename = 'sam.json'
    spawn('aws', [ 'cloudformation', 'package',
      '--template-file', filename,
      '--output-template-file', filename.replace('json', 'yaml'),
      '--s3-bucket', bucket
    ], pretty, callback)
  }
}
