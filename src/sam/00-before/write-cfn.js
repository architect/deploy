let aws = require('aws-sdk')
let series = require('run-series')
let parallel = require('run-parallel')
let path = require('path')
let fs = require('fs')

let samPkg = require('./package')

module.exports = function writeCFN(params, callback) {
  let {sam, nested, bucket, pretty, update, isDryRun} = params
  if (isDryRun) {
    update.status('Skipping CloudFormation deployment...')
    callback()
  }
  else if (nested) {
    update.start('Generating CloudFormation deployment...')
    series([
      function samPackage(callback) {
        parallel(Object.keys(sam).map(filename=> {
          return function package(callback) {
            samPkg({
              filename,
              bucket,
              pretty,
            }, callback)
          }
        }), callback)
      },

      function uploadToS3(callback) {
        let s3 = new aws.S3
        parallel(Object.keys(sam).map(Key=> {
          return function put(callback) {
            let bodyPath = path.join(process.cwd(), Key)
            fs.readFile(bodyPath, function readFile(err, Body) {
              if (err) callback(err)
              else {
                s3.putObject({
                  Bucket: bucket,
                  Key,
                  Body,
                }, callback)
              }
            })
          }
        }), callback)
      }
    ], callback)
  }
  else {
    update.start('Generating CloudFormation deployment...')
    samPkg({
      filename: `sam.json`,
      bucket,
      pretty,
    }, callback)
  }
}
