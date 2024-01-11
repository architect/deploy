module.exports = function getAllS3Files (params, callback) {
  let { aws, Bucket, Prefix } = params
  let getParams = { Bucket, paginate: true }
  if (Prefix) getParams.Prefix = Prefix
  aws.s3.ListObjectsV2(getParams)
    .then(result => callback(null, result.Contents || []))
    .catch(callback)
}
