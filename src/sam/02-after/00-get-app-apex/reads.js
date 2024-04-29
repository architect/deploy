let parallel = require('run-parallel')
let list = require('./cloudfront-list')

/**
 * get the preferred apex url and, if they exist, companion cloudfront distro(s)
 *
 * @param {Object} params
 * @param {String} params.stackname - the name of the currently deployed stack
 * @param {Function} callback - node errback (err, {url, s3, apigateway})=>
 */
module.exports = function reads ({ aws, stackname, stage }, callback) {

  let clean = str => str.replace(`/${stage}`, '').replace('http://', '').replace('https://', '')

  parallel({
    cfn (callback) {
      aws.cloudformation.DescribeStacks({ StackName: stackname })
        .then(cfn => callback(null, cfn))
        .catch(callback)
    },
    cf (callback) {
      list(aws, callback)
    },
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

      let apigateway = cf.find(function (distro) {
        let origin = outs?.find(api)
        if (!origin) return false
        let dist = distro.origin
        let orig = clean(origin.OutputValue)
        return dist === orig
      }) || false

      let s3 = cf.find(function (distro) {
        let origin = outs?.find(bucket)
        if (!origin) return false
        let dist = distro.origin
        let orig = clean(origin.OutputValue)
        return dist === orig
      }) || false

      let cdnURL = outs?.find(cdn)?.OutputValue || false
      let apiURL = outs?.find(api)?.OutputValue || false
      let wssURL = outs?.find(wss)?.OutputValue || false
      let bucketURL = outs?.find(bucket)?.OutputValue || false
      let url = cdnURL || apiURL || bucketURL
      let apiDomain = apiURL ? clean(apiURL) : false
      let bucketDomain = bucketURL ? clean(bucketURL) : false
      let httpDomain = outs?.find(http)?.OutputValue || false

      callback(null, { url, wssURL, apiDomain, bucketDomain, apigateway, s3, httpDomain })
    }
  })
}
