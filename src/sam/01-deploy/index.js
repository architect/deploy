let spawn = require('../spawn')

module.exports = function deploy(params, callback) {
  let {stackname, nested, appname, bucket, pretty, region, update, tags} = params
  update.done('Generated CloudFormation deployment')
  update.start('Deploying & building infrastructure...')
  let template = nested ? `${appname}-cfn.yaml` : 'sam.yaml'
  let args = [
    'cloudformation', 'deploy',
      '--template-file', template,
      '--stack-name', stackname,
      '--s3-bucket', bucket,
      '--capabilities', 'CAPABILITY_IAM CAPABILITY_AUTO_EXPAND',
      '--region', region
  ]
  if (tags.length > 0) {
    args.push('--tags')
    args = args.concat(tags)
  }
  spawn('aws', args, pretty, callback)
}
