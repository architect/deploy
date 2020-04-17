let fs = require('fs')
let path = require('path')
let osPath = require('ospath')
let pauseFile = path.join(osPath.tmp(), '_pause-architect-sandbox-watcher')

module.exports = {
  pause: () => {
    try {
      // Pause the Sandbox watcher so deploy ops don't do anything funky
      if (!fs.existsSync(pauseFile)) {
        fs.writeFileSync(pauseFile, '\n')
      }
    }
    catch (err) { /* noop */ }
  },
  unpause: () => {
    try {
      // Cleanup after any past runs
      if (fs.existsSync(pauseFile)) {
        fs.unlinkSync(pauseFile)
      }
    }
    catch (err) { /* noop */ }
  }
}
