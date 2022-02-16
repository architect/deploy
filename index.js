let _inventory = require('@architect/inventory')
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
    if (options.inventory) mod(options, clean)
    else {
      // Get inventory, but don't fetch env vars if it's a dry-run
      _inventory({ env: true }, function (err, inv) {
        if (err) callback(err)
        else {
          options.update = updater('Deploy')
          options.region = options.region || inv.inv.aws.region
          options.inventory = inv
          mod(options, clean)
        }
      })
    }

    return promise
  }
}

module.exports = {
  direct: run(direct),
  sam:    run(sam),
  static: run(_static)
}
