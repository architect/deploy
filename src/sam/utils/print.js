let chalk = require('chalk')
let { chars } = require('@architect/utils')

module.exports = function pretty ({ log, verbose }) {
  return {
    stdout (data) {
      if (!log)
        return
      if (verbose)
        console.log(chalk.grey(data))
    },
    stderr (data) {
      if (!log) return
      if (verbose)
        console.log(chalk.yellow.dim(data))
    },
    url (v, type) {
      if (!log) return
      type = type ? chalk.gray(type.padStart(4, ' ') + ': ') : ''
      console.log(`    ${type}${chalk.green.bold.underline(v)}`)
    },
    success (ts) {
      if (!log) return
      let check = chalk.green(chars.done)
      let msg = chalk.grey('Success!')
      let time = chalk.green(`Deployed app in ${(Date.now() - ts) / 1000} seconds\n`)
      console.log(check, msg, time)
    },
  }
}
