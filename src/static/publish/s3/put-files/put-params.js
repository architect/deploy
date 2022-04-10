let getContentType = require('./get-content-type')
let { brotliCompressSync: compress } = require('zlib')

/**
 * Get proper parameters for a given file upload
 */
module.exports = function putParams (params) {
  let { Bucket, Key, Body, file, fingerprint, inventory } = params
  let s3Params = { Bucket, Key }

  let legacyAPI = inventory.inv.aws.apigateway === 'rest'
  if (legacyAPI) {
    // Legacy REST APIs compress responses, so don't double-compress here
    s3Params.Body = Body
  }
  else {
    // Compress the asset
    s3Params.Body = compress(Body)
    s3Params.ContentEncoding = 'br'
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
