let _inventory = require('@architect/inventory')
let awsLite = require('@aws-lite/client')
let { updater } = require('@architect/utils')
let cleanup = require('./src/utils/cleanup')

let direct = require('./src/direct')
let sam = require('./src/sam')
let _static = require('./src/static')

function run (mod) {
  return function (options, callback) {
    let promise
    if (!callback) {
      promise = new Promise(function ugh (res, rej) {
        callback = function errback (err, result) {
          if (err) rej(err)
          else res(result)
        }
      })
    }

    // Always attempt to clean up after ourselves before exiting
    function clean (err, result) {
      cleanup()
      if (err) callback(err)
      else callback(null, result)
    }

    // Entered via CLI (or something that supplied inventory)
    if (options.inventory) {
      go(options)

    }
    else {
      _inventory({ env: true }, function (err, inventory) {
        if (err) callback(err)
        else {
          options.inventory = inventory
          go(options)
        }
      })
    }

    function go (options) {
      let region = options.region || options.inventory.inv.aws.region
      let plugins = [
        import('@aws-lite/apigatewayv2'),
        import('@aws-lite/cloudformation'),
        import('@aws-lite/cloudfront'),
        import('@aws-lite/lambda'),
        import('@aws-lite/s3'),
        import('@aws-lite/ssm'),
      ]
      let params = { region, plugins }
      if (options.credentials) params.credentials = options.credentials
      if (options.inventory.inv?.aws?.profile) params.profile = options.inventory.inv.aws.profile
      awsLite(params)
        .then(aws => {
          mod({ ...options, aws, region, update: updater('Deploy') }, clean)
        })
        .catch(callback)
    }

    return promise
  }
}

module.exports = {
  direct: run(direct),
  sam:    run(sam),
  static: run(_static),
}
