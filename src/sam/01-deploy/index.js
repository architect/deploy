let spawn = require('../spawn')

module.exports = function deploy({stackname, nested, appname, bucket, pretty, region}, callback) {
  let template = nested ? `${appname}-cfn.yaml` : 'sam.yaml'
  let args = [
    'deploy',
      '--template-file', template,
      '--stack-name', stackname,
      '--s3-bucket', bucket,
      '--capabilities', 'CAPABILITY_IAM',
      '--region', region
  ]
  if (nested) {
    args.push('CAPABILITY_AUTO_EXPAND')
  }
  spawn('sam', args, pretty, callback)
}
