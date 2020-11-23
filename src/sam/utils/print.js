let chalk = require('chalk')
let { chars } = require('@architect/utils')
let b = chalk.green.bold
let d = chalk.green.dim
let g = chalk.green

module.exports = function pretty ({ log, verbose }) {
  return {
    spawn (cmd, args) {
      if (verbose) {
        let first = args.shift() + ' ' + args.shift()
        console.log(b('  ' + cmd + ' ' + first))
        if (args % 2) {
          let last = args.pop()
          args[args.length - 1] += ' ' + last
        }
        for (let i = 0; i < args.length; i += 2 ) {
          console.log(d(args[i].padStart(24, ' ')), g(args[i + 1]))
        }
        console.log('')
      }
    },
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
    }
  }
}
