let crypto = require('crypto')
let zip = require('zip-dir')

// Upload to S3 deploy bucket using content aware hash for key
module.exports = function upload (params, callback) {
  let { aws, bucket: Bucket, folder } = params

  zip(folder, (err, Body) => {
    if (err) callback(err)
    else {
      let Key = crypto.createHash('sha256').update(Body).digest('hex')

      aws.s3.HeadObject({ Bucket, Key })
        .then(() => callback(null, Key))
        // Upload if the file isn't already there (404)
        .catch(err => {
          if (err.statusCode === 404) {
            aws.s3.PutObject({ Bucket, Key, Body })
              .then(() => callback(null, Key))
              .catch(callback)
          }
          else callback(err)
        })
    }
  })
}
