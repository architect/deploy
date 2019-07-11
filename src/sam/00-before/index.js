let series = require('run-series')
let writeSAM = require('./write-sam')
let writeCFN = require('./write-cfn')

/**
 * package compiles an arc file into either a single stack or a nested stack
 *
 * a single stack will have the following files:
 *
 * - AWS::Serverless sam.json
 * - AWS::Cloudformation out.yaml
 *
 * a nested stack will have the following files:
 *
 * - AWS::Serverless appname-cfn.json
 * - AWS::Serverless appname-cfn-http.json
 * - AWS::Serverless appname-cfn-events.json
 * - AWS::Cloudformation appname-cfn.yaml
 * - AWS::Cloudformation appname-cfn-http.yaml
 * - AWS::Cloudformation appname-cfn-events.yaml
 *
 */
module.exports = function pkg({sam, nested, bucket, pretty}, callback) {
  series([
    writeSAM.bind({}, {sam, nested}),
    writeCFN.bind({}, {sam, nested, bucket, pretty})
  ], callback)
}
