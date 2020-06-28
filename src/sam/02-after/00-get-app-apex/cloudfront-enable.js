let aws = require('aws-sdk')
let waterfall = require('run-waterfall')

module.exports = function enableCloudFrontDistribution ({ id }, callback) {
  let cf = new aws.CloudFront
  waterfall([
    function (callback) {
      cf.getDistributionConfig({
        Id: id
      }, callback)
    },
    function (result, callback) {
      let ETag = result.ETag
      let DistributionConfig = result.DistributionConfig
      if (DistributionConfig.Enabled == false) {
        DistributionConfig.Enabled = true
        cf.updateDistribution({
          Id: id,
          DistributionConfig,
          IfMatch: ETag,
        }, callback)
      }
      else {
        callback()
      }
    }
  ],
  function noop (err) {
    if (err) console.log(err)
    callback()
  })
}
