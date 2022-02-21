let series = require('run-series')
let writeSAM = require('./write-sam')
let writeCFN = require('./write-cfn')

/**
 * Compile the project into into a single stack with the following files:
 * - AWS::Serverless sam.json
 * - AWS::Cloudformation sam.yaml
 */
module.exports = function beforeDeploy (params, callback) {
  series([
    writeSAM.bind({}, params),
    writeCFN.bind({}, params),
  ], err => {
    if (err) callback(err)
    else callback()
  })
}
