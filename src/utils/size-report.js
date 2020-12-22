let folderSize = require('get-folder-size')
let series = require('run-series')

module.exports = function sizeReport (params, callback) {
  let { lambdas, inventory, update } = params
  let { lambdaSrcDirs } = inventory.inv

  if (!lambdaSrcDirs) return callback()
  if (!lambdas) lambdas = lambdaSrcDirs

  let cwd = process.cwd()
  let fiveMB = 1000 * 1000 * 5
  let offenders = []
  let ops = lambdas.map(dir => {
    return function (callback) {
      folderSize(dir, function (err, size) {
        if (err) callback(err)
        else {
          if (size >= fiveMB) {
            let folder = dir.startsWith(cwd) ? dir.replace(cwd, '').substr(1) : dir
            let hit = `${folder} (${Math.round(size / 1000).toLocaleString()}KB)`
            offenders.push(hit)
          }
          callback()
        }
      })
    }
  })
  series(ops, function next (err) {
    if (err) callback(err)
    else {
      if (offenders.length) {
        let start = offenders.length === 1
          ? 'This Lambda'
          : 'These Lambdas'
        let msg = `${start} should ideally be under 5MB for optimal performance:`
        update.status(msg, ...offenders)
      }
      callback()
    }
  })
}
