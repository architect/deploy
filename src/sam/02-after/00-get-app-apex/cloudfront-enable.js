let waterfall = require('run-waterfall')

module.exports = function enableCloudFrontDistribution (aws, { id: Id }, callback) {
  waterfall([
    function (callback) {
      aws.cloudfront.GetDistributionConfig({ Id })
        .then(result => callback(null, result))
        .catch(callback)
    },
    function (result, callback) {
      let ETag = result.ETag
      let DistributionConfig = result.DistributionConfig
      if (DistributionConfig.Enabled == false) {
        DistributionConfig.Enabled = true
        aws.cloudfront.UpdateDistribution({ Id, DistributionConfig, IfMatch: ETag })
          .then(result => callback(null, result))
          .catch(callback)
      }
      else {
        callback()
      }
    },
  ],
  function noop (err) {
    if (err) console.log(err)
    callback()
  })
}
