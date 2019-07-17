let aws = require('aws-sdk')

module.exports = function printURL({ts, pretty, stackname}, callback) {
  pretty.success(ts)
  let cloudformation = new aws.CloudFormation
  cloudformation.describeStacks({
    StackName: stackname
  },
  function done(err, data) {
    if (err) console.log(err)
    else if (Array.isArray(data.Stacks)) {
      let outs = data.Stacks[0].Outputs
      let api = o=> o.OutputKey === 'API'
      let bucket = o=> o.OutputKey === 'BucketURL'
      // output the api url falling back to the static bucket url
      let url = outs.find(api) || outs.find(bucket)
      if (url) pretty.url(url.OutputValue)
    }
    callback()
  })
}
