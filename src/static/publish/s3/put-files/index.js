let { readFileSync } = require('fs')
let crypto = require('crypto')
let chalk = require('chalk')
let series = require('run-series')
let formatKey = require('./format-key')
let putParams = require('./put-params')

module.exports = function putFiles (params, callback) {
  let {
    aws,
    Bucket,
    files,
    fingerprint,
    inventory,
    publicDir,
    prefix,
    region,
    staticManifest,
    update,
    verbose,
  } = params

  let uploaded = 0
  let notModified = 0

  let tasks = files.map(file => {
    return function maybePublishToS3 (callback) {

      // Get file hash
      let Body = readFileSync(file)

      // Post-run size warning
      function tooBig () {
        let size = Buffer.from(Body).toString('base64')
        if (size >= 5750000) {
          update.raw(`${chalk.yellow('[  Warning!  ]')} ${chalk.white.bold(`${Key} is > 5.75MB (base64)`)}${chalk.white(`; files over 6MB cannot be proxied by Lambda (arc.proxy)`)}`)
        }
      }

      // Get the formatted Key for this file, based on various settings
      let Key = formatKey({ file, fingerprint, publicDir, prefix, staticManifest })

      // Get the params for the file to be (maybe) uploaded
      let params = putParams({ Bucket, Key, Body, file, fingerprint, inventory })
      let url = `https://${Bucket}.s3.${region}.amazonaws.com/${Key}`

      // Check to ensure we even need to upload the file
      aws.s3.HeadObject({ Bucket, Key })
        .then(headData => {
          let hash = crypto.createHash('md5').update(Body).digest('hex')

          // Upload if the file was modified since last upload
          let etag = headData && headData.ETag && headData.ETag.replace(/['"]/g, '')
          let fileDiff = hash !== etag

          // Or upload if the cache-control headers do not match since last upload
          let cacheHeader = headData && headData.CacheControl
          let headerDiff = cacheHeader !== params.CacheControl

          if (!headData || fileDiff || headerDiff) {
            put()
          }
          else {
            notModified++
            if (verbose) {
              update.raw(`${chalk.gray('[Not modified]')} ${chalk.underline.cyan(url)}`)
            }
            tooBig()
            callback()
          }
        })
        .catch(err => {
          if (err.code === 'AccessDenied') {
            callback(Error('access_denied'))
          }
          else if (err.code !== 'NotFound') {
            // Swallow error (but warn)
            update.error('Error on S3 metadata request:')
            update.error(err)
            callback()
          }
          else put()
        })

      function put () {
        aws.s3.PutObject(params)
          .then(() => {
            uploaded++
            update.raw(`${chalk.blue('[  Uploaded  ]')} ${chalk.underline.cyan(url)}`)
            tooBig()
            callback()
          })
          .catch(err => {
            if (err.code === 'AccessDenied') {
              callback(Error('access_denied'))
            }
            else {
              // Swallow error (but warn)
              update.error('Error on S3 put:')
              update.error(err)
              callback()
            }
          })
      }
    }
  })

  // Upload all the objects!
  // This used to be a parallel op, but large batches could rate limit out, so let's not
  series(tasks, (err) => {
    if (err) callback(err)
    else callback(null, uploaded, notModified)
  })
}
