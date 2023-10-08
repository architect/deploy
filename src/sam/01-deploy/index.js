let spawn = require('../utils/spawn')

module.exports = function deploy (params, callback) {
  let { stackname, bucket, pretty, region, update, tags, verbose } = params
  update.done('Generated CloudFormation deployment')
  update.start('Deploying & building infrastructure...')
  let template = 'sam.yaml'
  let args = [
    'cloudformation', 'deploy',
    '--template-file', template,
    '--stack-name', stackname,
    '--s3-bucket', bucket,
    '--capabilities', 'CAPABILITY_IAM CAPABILITY_AUTO_EXPAND',
    '--region', region,
    '--no-fail-on-empty-changeset'
  ]
  if (tags.length > 0) {
    args.push('--tags')
    args = args.concat(tags)
  }
  if (verbose) {
    args.push('--debug')
  }
  spawn('aws', args, pretty, callback)
}
