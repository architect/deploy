let parallel = require('run-parallel')
let aws = require('aws-sdk')

let list = require('./cloudfront-list')
let create = require('./cloudfront-create')
let destroy = require('./cloudfront-destroy')

module.exports = function printURL({ts, arc, pretty, stackname}, callback) {
  pretty.success(ts)
  parallel({
    cfn(callback) {
      let cloudformation = new aws.CloudFormation
      cloudformation.describeStacks({
        StackName: stackname
      }, callback)
    },
    cf(callback) {
      list(callback)
    }
  },
  function done(err, {cf, cfn}) {
    if (err) {
      console.log(err)
      callback()
    }
    else {
      let outs = cfn.Stacks[0].Outputs
      let cdn = o=> o.OutputKey === 'CDN'
      let api = o=> o.OutputKey === 'API'
      let bucket = o=> o.OutputKey === 'BucketURL'

      // HACK
      function findDistro(distro) {
        let origin = outs.find(api) || outs.find(bucket)
        if (!origin) return false
        return distro.origin === origin
      }

      let hackyCDN = cf.find(findDistro)? `https://${cf.find(findDistro).domain}` : false
      // END HACK

      let url = hackyCDN || outs.find(cdn) || outs.find(api) || outs.find(bucket)
      if (url)
        pretty.url(url.OutputValue)

      // HACK 2
      let creating = arc.cdn && hackyCDN === false
      let destroying = arc.hasOwnProperty('cdn') === false && hackyCDN && hackyCDN.status != 'InProgress'

      if (creating) {
        let params = {
          domain: url.replace('/production', '').replace('http://', '').replace('https://', '')
        }
        if (url.startsWith('https://'))
          params.path = '/production'
        create(params, callback)
      }
      else if (destroying) {
        destroy(cf.find(findDistro), callback)
      }
      else {
        callback()
      }
      // END HACK 2
    }
  })
}
