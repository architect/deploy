let series = require('run-series')
let writeSAM = require('./write-sam')
let writeCFN = require('./write-cfn')

/**
 * package compiles an arc file into a single stack with the following files:
 * - AWS::Serverless sam.json
 * - AWS::Cloudformation out.yaml
 */
module.exports = function pkg (params, callback) {
  let { sam, bucket, pretty, update, isDryRun } = params
  series([
    writeSAM.bind({}, { sam, update }),
    writeCFN.bind({}, { sam, bucket, pretty, update, isDryRun })
  ], callback)
}
