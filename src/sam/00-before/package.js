let spawn = require('../utils/spawn')

module.exports = function samPackage ({ filename, bucket, pretty }, callback) {
  spawn('aws', [ 'cloudformation', 'package',
    '--template-file', filename,
    '--output-template-file', filename.replace('json', 'yaml'),
    '--s3-bucket', bucket
  ], pretty, callback)
}
