let parallel = require('run-parallel')
let aws = require('aws-sdk')
let list = require('./cloudfront-list')

/**
 * get the preferred apex url and, if they exist, companion cloudfront distro(s)
 *
 * @param {Object} params
 * @param {String} params.stackname - the name of the currently deployed stack
 * @param {Function} callback - node errback (err, {url, s3, apigateway})=>
 */
module.exports = function reads({stackname}, callback){
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
  function done(err, {cfn, cf}) {
    if (err) callback(err)
    else {

      let outs = cfn.Stacks[0].Outputs
      let cdn = o=> o.OutputKey === 'CDN'
      let api = o=> o.OutputKey === 'API'
      let bucket = o=> o.OutputKey === 'BucketURL'

      let apigateway = cf.find(function findDistro(distro) {
        let origin = outs.find(api)
        if (!origin) return false
        let dist = distro.origin
        let orig = origin.OutputValue.replace('/production/', '').replace('http://', '').replace('https://', '')
        return dist === orig
      }) || false

      let s3 = cf.find(function findDistro(distro) {
        let origin = outs.find(bucket)
        if (!origin) return false
        let dist = distro.origin
        let orig = origin.OutputValue.replace('/production/', '').replace('http://', '').replace('https://', '')
        return dist === orig
      }) || false

      let url = outs.find(cdn) || outs.find(api) || outs.find(bucket)
      if (url)
        url = url.OutputValue

      callback(null, {url, apigateway, s3})
    }
  })
}
