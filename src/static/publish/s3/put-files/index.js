let { readFileSync } = require('fs')
let crypto = require('crypto')
let chalk = require('chalk')
let series = require('run-series')
let formatKey = require('./format-key')
let putParams = require('./put-params')

module.exports = function putFiles (params, callback) {
  let {
    Bucket,
    files,
    fingerprint,
    inventory,
    publicDir,
    prefix,
    region,
    s3,
    staticManifest,
    verbose
  } = params

  let uploaded = 0
  let notModified = 0

  let tasks = files.map(file => {
    return function maybePublishToS3 (callback) {

      // Get file hash
      let Body = readFileSync(file)
      let hash = crypto.createHash('md5').update(Body).digest('hex')

      // Post-run size warning
      function tooBig () {
        let size = Buffer.from(Body).toString('base64')
        if (size >= 5750000) {
          console.log(`${chalk.yellow('[  Warning!  ]')} ${chalk.white.bold(`${Key} is > 5.75MB (base64)`)}${chalk.white(`; files over 6MB cannot be proxied by Lambda (arc.proxy)`)}`)
        }
      }

      // Get the formatted Key for this file, based on various settings
      let Key = formatKey({ file, fingerprint, publicDir, prefix, staticManifest })

      // Check to ensure we even need to upload the file
      s3.headObject({ Bucket, Key }, function _headObject (err, headData) {
        if (err && err.code !== 'NotFound') {
          // Swallow error (but warn)
          console.error('Error on S3 metadata request:', err)
          callback()
        }
        else if (err && err.code === 'AccessDenied') {
          callback(Error('access_denied'))
        }
        else {
          let url = `https://${Bucket}.s3.${region}.amazonaws.com/${Key}`

          // Get the params for the file to be (maybe) uploaded
          let params = putParams({ Bucket, Key, Body, file, fingerprint, inventory })

          // Upload if the file was modified since last upload
          let etag = headData && headData.ETag && headData.ETag.replace(/['"]/g, '')
          let fileDiff = hash !== etag

          // Or upload if the cache-control headers do not match since last upload
          let cacheHeader = headData && headData.CacheControl
          let headerDiff = cacheHeader !== params.CacheControl

          if (!headData || fileDiff || headerDiff) {
            s3.putObject(params, function _putObj (err) {
              if (err && err.code === 'AccessDenied') {
                callback(Error('access_denied'))
              }
              else if (err) {
                // Swallow error (but warn)
                console.error('Error on S3 put:', err)
                callback()
              }
              else {
                uploaded++
                console.log(`${chalk.blue('[  Uploaded  ]')} ${chalk.underline.cyan(url)}`)
                tooBig()
                callback()
              }
            })
          }
          else {
            notModified++
            if (verbose)
              console.log(`${chalk.gray('[Not modified]')} ${chalk.underline.cyan(url)}`)
            tooBig()
            callback()
          }
        }
      })
    }
  })

  // Upload all the objects!
  // This used to be a parallel op, but large batches could rate limit out, so let's not
  series(tasks, (err) => {
    if (err) callback(err)
    else callback(null, uploaded, notModified)
  })
}
