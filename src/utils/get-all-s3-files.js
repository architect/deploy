module.exports = function getAllS3Files (params, callback) {
  let { Bucket, Prefix, s3 } = params
  let files = []

  function getObjects (ContinuationToken) {
    let getParams = { Bucket }
    if (ContinuationToken) getParams.ContinuationToken = ContinuationToken
    if (Prefix) getParams.Prefix = Prefix

    s3.listObjectsV2(getParams, function _listObjects (err, result) {
      if (err) callback(err)
      else {
        let { Contents, NextContinuationToken } = result
        if (Contents.length) {
          files.push(...Contents)
          if (NextContinuationToken) getObjects(NextContinuationToken)
          else callback(null, files)
        }
        else callback(null, files)
      }
    })
  }
  getObjects()
}
