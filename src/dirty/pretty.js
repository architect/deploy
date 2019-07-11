let chalk = require('chalk')

module.exports = {
  url(v) {
    if (v)
      console.log(chalk.cyan.underline(v), '\n')
  },
  warn() {
    console.log('🤠', chalk.yellow.bold('Dirty deploy!'))
  },
  success(ts) {
    let msg = chalk.grey('deployed in')
    let time = chalk.green.bold((Date.now() - ts)/1000 + ' seconds')
    console.log('✅', chalk.green.bold('Success'), msg, time)
  }
}
