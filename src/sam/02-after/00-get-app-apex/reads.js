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
module.exports = function reads ({ stackname, stage }, callback){
  parallel({
    cfn (callback) {
      let cloudformation = new aws.CloudFormation({ region: process.env.AWS_REGION })
      cloudformation.describeStacks({
        StackName: stackname
      }, callback)
    },
    cf (callback) {
      list(callback)
    }
  },
  function done (err, { cfn, cf }) {
    if (err) callback(err)
    else {

      let outs = cfn.Stacks[0].Outputs
      let cdn = o => o.OutputKey === 'CDN'
      let api = o => o.OutputKey === 'API'
      let wss = o => o.OutputKey === 'WSS'
      let bucket = o => o.OutputKey === 'BucketURL'
      let http = o => o.OutputKey === 'HTTP'

      let apigateway = cf.find(function findDistro (distro) {
        let origin = outs.find(api)
        if (!origin) return false
        let dist = distro.origin
        let orig = origin.OutputValue.replace(`/${stage}`, '').replace('http://', '').replace('https://', '')
        return dist === orig
      }) || false

      let s3 = cf.find(function findDistro (distro) {
        let origin = outs.find(bucket)
        if (!origin) return false
        let dist = distro.origin
        let orig = origin.OutputValue.replace(`/${stage}`, '').replace('http://', '').replace('https://', '')
        return dist === orig
      }) || false

      let cdnURL = outs.find(cdn) ? outs.find(cdn).OutputValue : false
      let apiURL = outs.find(api) ? outs.find(api).OutputValue : false
      let wssURL = outs.find(wss) ? outs.find(wss).OutputValue : false
      let bucketURL = outs.find(bucket) ? outs.find(bucket).OutputValue : false
      let url =  cdnURL || apiURL || bucketURL
      let apiDomain = apiURL ? apiURL.replace(`/${stage}`, '').replace('https://', '') : false
      let bucketDomain = bucketURL ? bucketURL.replace('http://', '') : false
      let httpDomain = outs.find(http) ? outs.find(http).OutputValue : false

      callback(null, { url, wssURL, apiDomain, bucketDomain, apigateway, s3, httpDomain })
    }
  })
}
