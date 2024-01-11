let crypto = require('crypto')
let series = require('run-series')

module.exports = function createDeployBucket ({ appname, aws, region, update }, callback) {
  // Quick validation for S3 bucket naming requirements
  let bucketName = appname
    .replace(/_/g, '-')
    .replace(/\.\./g, '.')
    .replace(/-\./g, '-')
    .replace(/\.-/g, '-')
    .substr(0, 38) // No more than 63 chars

  // Create unique bucket name
  let seed = Buffer.from(`${appname}-${Date.now()}`)
  let createHash = crypto.createHash('sha256')
  createHash.update(seed)
  let hash = createHash.digest('hex').substr(0, 5)
  // Bucket names must be lower case
  let bucket = `${bucketName}-cfn-deployments-${hash}`.toLowerCase()

  series([
    function createBucket (callback) {
      let params = {
        Bucket: bucket,
        ACL: 'private', // Only the bucket owner has access rights
        CreateBucketConfiguration: {}
      }
      // us-east-1 is default; specifying it as a location constraint will fail
      if (region !== 'us-east-1') {
        params.CreateBucketConfiguration = {
          LocationConstraint: region
        }
      }
      update.status(`Creating new private deployment bucket: ${bucket}`)
      aws.s3.CreateBucket(params)
        .then(() => callback())
        .catch(callback)
    },
    function updateSSM (callback) {
      aws.ssm.PutParameter({
        Name: `/${appname}/deploy/bucket`,
        Value: bucket,
        Type: 'SecureString',
        Overwrite: true
      })
        .then(() => callback())
        .catch(callback)
    }
  ], function done (err) {
    if (err) {
      update.error('Deployment bucket creation error')
      callback(err)
    }
    else callback(null, bucket)
  })
}
