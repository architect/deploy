let chalk = require('chalk')
let { chars } = require('@architect/utils')

module.exports = {
  url (v) {
    if (v)
      console.log(`\n    ${chalk.green.bold.underline(v)}\n`)
  },
  warn (update) {
    update.start('Deploying...')
  },
  success (ts, update) {
    update.done('Deployed directly to Lambda')
    let check = chalk.green(chars.done)
    let msg = chalk.grey('Success!')
    let time = chalk.green(`Deployed in ${(Date.now() - ts) / 1000} seconds`)
    console.log(check, msg, time)
  }
}
