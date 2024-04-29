let { existsSync, unlinkSync, writeFileSync } = require('fs')
let { join } = require('path')
let { tmpdir } = require('os')
let pauseFile = join(tmpdir(), '_pause-architect-sandbox-watcher')

module.exports = {
  pause: () => {
    try {
      // Pause the Sandbox watcher so deploy ops don't do anything funky
      if (!existsSync(pauseFile)) {
        writeFileSync(pauseFile, '\n')
      }
    }
    catch { /* noop */ }
  },
  unpause: () => {
    try {
      // Cleanup after any past runs
      if (existsSync(pauseFile)) {
        unlinkSync(pauseFile)
      }
    }
    catch { /* noop */ }
  },
}
