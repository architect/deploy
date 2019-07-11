let chalk = require('chalk')
let b = chalk.green.bold
let d = chalk.green.dim
let g = chalk.green

module.exports = function pretty({log, verbose}) {
  return {
    spawn(cmd, args) {
      if (log) {
        let first = args.shift()
        console.log(b(cmd + ' ' + first))
        if (args % 2) {
          let last = args.pop()
          args[args.length - 1] += ' ' + last
        }
        for (let i = 0; i < args.length; i +=2 ) {
          console.log(d(args[i].padStart(24, ' ')), g(args[i + 1]))
        }
      }
    },
    stdout(data) {
      if (!log)
        return
      if (verbose)
        console.log(chalk.grey(data))
    },
    stderr(data) {
      if (!log) return
      if (verbose)
        console.log(chalk.yellow.dim(data))
    },
    url(v) {
      if (!log) return
      console.log(chalk.cyan.underline(v), '\n')
    },
    success(ts) {
      if (!log) return
      let check = chalk.green('✓')
      let msg = chalk.grey('Deployed')
      let time = chalk.green.bold((Date.now() - ts)/1000 + ' seconds')
      console.log(check, msg, time)
    }
  }
}
