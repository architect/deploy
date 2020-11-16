let inventory = require('@architect/inventory')
let dirty = require('./src/dirty')
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

    // Get inventory, but don't fetch env vars if it's a dry-run
    inventory({ env: !options.isDryRun }, function (err, inv) {
      if (err) callback(err)
      else mod(inv, options, callback)
    })

    return promise
  }
}

module.exports = {
  dirty:  run(dirty),
  sam:    run(sam),
  static: run(_static)
}
