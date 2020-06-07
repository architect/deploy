let { lstatSync } = require('fs')
let aws = require('aws-sdk')
let chalk = require('chalk')
let series = require('run-series')
let formatKey = require('./format-key')
let putParams = require('./put-params')

module.exports = function putFiles (params, callback) {
  let {
    Bucket,
    files,
    fingerprint,
    publicDir,
    prefix,
    region,
    staticManifest,
    verbose
  } = params

  let s3 = new aws.S3({ region })
  let uploaded = 0
  let notModified = 0

  let tasks = files.map(file => {
    return function maybePublishToS3 (callback) {

      // Get last modified + size
      let stats = lstatSync(file)
      // Post-run size warning
      function tooBig () {
        if (stats.size >= 5750000) {
          console.log(`${chalk.yellow('[  Warning!  ]')} ${chalk.white.bold(`${Key} is > 5.75MB`)}${chalk.white(`; files over 6MB cannot be proxied by Lambda (arc.proxy)`)}`)
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

          // Only upload if the file was modified since last upload
          // In theory we could use the ETag, but Amazon uses an unpublished chunk hashing algo
          if (!headData || !headData.LastModified || stats.mtime > headData.LastModified) {

            // Get the params for the file to be uploaded
            let params = putParams({ Bucket, Key, file, fingerprint })

            s3.putObject(params, function _putObj(err) {
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
