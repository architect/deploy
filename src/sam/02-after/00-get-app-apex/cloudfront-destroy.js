let aws = require('aws-sdk')
let waterfall = require('run-waterfall')

module.exports = function destroyCloudFrontDistribution ({ id }, callback) {
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
      if (DistributionConfig.Enabled) {
        DistributionConfig.Enabled = false
        cf.updateDistribution({
          Id: id,
          DistributionConfig,
          IfMatch: ETag,
        }, callback)
      }
      else {
        callback(null, { ETag })
      }
    },
    function ({ ETag }, callback) {
      cf.deleteDistribution({
        Id: id,
        IfMatch: ETag
      }, callback)
    }
  ],
  function noop (err) {
    if (err && err.code != 'DistributionNotDisabled') console.log(err)
    callback()
  })
}
