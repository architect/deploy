let aws = require('aws-sdk')
let createBucket = require('./create-bucket')

module.exports = function getBucket (params, callback) {
  let { appname, region, update } = params
  let s3 = new aws.S3()
  let ssm = new aws.SSM({ region })

  // First: see if this app has a deploy bucket specified in SSM already
  ssm.getParametersByPath({
    Path: `/${appname}/deploy`,
    WithDecryption: true
  },
  function _query (err, result) {
    if (err) callback(err)
    else {
      let vars = result.Parameters
      let findBucket = e => e.Name === `/${appname}/deploy/bucket`
      let hasBucket = vars.some(findBucket)
      if (hasBucket) {
        // Next: check to see if the bucket still exists + we have access
        let bucket = vars[vars.findIndex(findBucket)].Value
        s3.headBucket({ Bucket: bucket },
          function _next (err) {
          // Swallow error: bucket no longer exists or we don't have access
            if (err) {
              update.status('Deployment bucket no longer exists or cannot be accessed, updating configuration')
              createBucket(params, callback)
            }
            else callback(null, bucket)
          })
      }
      else {
        createBucket(params, callback)
      }
    }
  })
}
