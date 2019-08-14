let child = require('child_process')

// spawn helper
module.exports = function spawn(command, args, pretty, callback) {
  let pkg = child.spawn(command, args, {shell: true})
  pretty.spawn(command, args)
  let output = []
  pkg.stdout.on('data', data => {
    output.push(data)
    pretty.stdout(data)
  })
  pkg.stderr.on('data', data => {
    output.push(data)
    pretty.stderr(data)
  })
  pkg.on('close', (code)=> {
    if (code !== 0) {
      callback(Error(output.join('')))
    }
    else callback()
  })
  pkg.on('error', (err) => {
    callback(err)
  })
}
