let createBucket = require('./create-bucket')

module.exports = function getBucket (params, callback) {
  let { appname, aws, update } = params

  // First: see if this app has a deploy bucket specified in SSM already
  aws.ssm.GetParametersByPath({
    Path: `/${appname}/deploy`,
    WithDecryption: true,
  })
    .then(result => {
      let vars = result.Parameters
      let findBucket = e => e.Name === `/${appname}/deploy/bucket`
      let hasBucket = vars.some(findBucket)
      if (hasBucket) {
        // Next: check to see if the bucket still exists + we have access
        let bucket = vars[vars.findIndex(findBucket)].Value
        aws.s3.HeadBucket({ Bucket: bucket })
          .then(() => callback(null, bucket))
          .catch(() => {
            // Swallow error: bucket no longer exists or we don't have access
            update.status('Deployment bucket no longer exists or cannot be accessed, updating configuration')
            createBucket(params, callback)
          })
      }
      else createBucket(params, callback)
    })
    .catch(callback)
}
