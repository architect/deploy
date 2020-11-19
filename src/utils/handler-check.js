let { existsSync } = require('fs')

module.exports = function handlerCheck (dirs = [], update, callback) {
  let missing = []
  dirs.forEach(dir => {
    if (!existsSync(dir)) missing.push(dir)
  })
  if (missing.length) {
    let msg = 'Missing function dir(s):\n  | ' + missing.join('\n  | ')
    update.error(msg)
    process.exit(1)
  }
  callback()
}
