let spawn = require('../spawn')

module.exports = function deploy(params, callback) {
  let {stackname, nested, appname, bucket, pretty, region} = params
  let template = nested ? `${appname}-cfn.yaml` : 'sam.yaml'
  let args = [
    'cloudformation', 'deploy',
      '--template-file', template,
      '--stack-name', stackname,
      '--s3-bucket', bucket,
      '--capabilities', 'CAPABILITY_IAM',
      '--region', region
  ]
  if (nested) {
    args.push('CAPABILITY_AUTO_EXPAND')
  }
  spawn('aws', args, pretty, callback)
}
