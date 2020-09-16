let aws = require('aws-sdk')
let crypto = require('crypto')
let series = require('run-series')

module.exports = function createDeployBucket ({ appname, region, update }, callback) {

  // Quick validation for S3 bucket naming requirements
  appname = appname.split('_').join('-')
  appname = appname.split('..').join('.')
  appname = appname.split('-.').join('-')
  appname = appname.split('.-').join('-')
  appname = appname.substr(0, 38) // No more than 63 chars

  // Create unique bucket name
  let seed = Buffer.from(`${appname}-${Date.now()}`)
  let createHash = crypto.createHash('sha256')
  createHash.update(seed)
  let hash = createHash.digest('hex').substr(0, 5)
  // Bucket names must be lower case
  let bucket = `${appname}-cfn-deployments-${hash}`.toLowerCase()

  series([
    function createBucket (callback) {
      let s3 = new aws.S3()
      let params = {
        Bucket: bucket,
        ACL: 'private' // Only the bucket owner has access rights
      }
      // us-east-1 is default; specifying it as a location constraint will fail
      if (region !== 'us-east-1') {
        params.CreateBucketConfiguration = {
          LocationConstraint: region
        }
      }
      update.status(`Creating new private deployment bucket: ${bucket}`)
      s3.createBucket(params, callback)
    },
    function updateSSM (callback) {
      let ssm = new aws.SSM({ region })
      let params = {
        Name: `/${appname}/deploy/bucket`,
        Value: bucket,
        Type: 'SecureString',
        Overwrite: true
      }
      ssm.putParameter(params, callback)
    }
  ], function done (err) {
    if (err) {
      update.error('Deployment bucket creation error')
      callback(err)
    }
    else callback(null, bucket)
  })
}
