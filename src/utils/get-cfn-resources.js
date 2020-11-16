let aws = require('aws-sdk')

module.exports = function getCloudFormationResources (params, callback) {
  let { credentials, region, stackname: StackName } = params

  let config = { region }
  if (credentials) config.credentials = credentials
  let cloudformation = new aws.CloudFormation(config)

  let results = []
  function walk (params = {}) {
    cloudformation.listStackResources(params, function (err, result) {
      if (err) callback(err)
      else {
        let { NextToken, StackResourceSummaries } = result
        if (NextToken) {
          results = results.concat(StackResourceSummaries)
          walk({ StackName, NextToken })
        }
        else {
          results = results.concat(StackResourceSummaries)
          callback(null, results)
        }
      }
    })
  }
  walk({ StackName })
}
