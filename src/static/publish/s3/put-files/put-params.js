let getContentType = require('./get-content-type')

/**
 * Get proper parameters for a given file upload
 */
module.exports = function putParams (params) {
  let { Bucket, Key, Body, file, fingerprint } = params
  let s3Params = {
    ACL: 'public-read',
    Bucket,
    Key,
    Body,
  }

  // S3 requires content-type
  let contentType = getContentType(file)
  s3Params.ContentType = contentType

  // Allow edges and proxies to cache fingerprinted files forever
  if (fingerprint && Key !== 'static.json') {
    s3Params.CacheControl = 'max-age=315360000'
  }

  // ... but not HTML & JSON
  let noCache = [ 'text/html', 'application/json' ]
  let neverCache = noCache.some(n => contentType.includes(n))
  if (neverCache || (fingerprint && Key === 'static.json')) {
    s3Params.CacheControl = 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0'
  }

  return s3Params
}
