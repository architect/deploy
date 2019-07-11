let child = require('child_process')

// spawn helper
module.exports = function spawn(command, args, pretty, callback) {
  let pkg = child.spawn(command, args, {shell: true})
  pretty.spawn(command, args)
  pkg.stdout.on('data', pretty.stdout)
  pkg.stderr.on('data', pretty.stderr)
  pkg.on('close', ()=> callback())
  pkg.on('error', callback)
}
