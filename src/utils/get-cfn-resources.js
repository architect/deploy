module.exports = function getCloudFormationResources ({ aws, stackname }, callback) {
  aws.cloudformation.ListStackResources({
    StackName: stackname,
    paginate: true,
  })
    .then(result => {
      let { StackResourceSummaries } = result
      callback(null, StackResourceSummaries)
    })
    .catch(callback)
}
