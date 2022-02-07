let { deepFrozenCopy, getLambdaName, toLogicalID } = require('@architect/utils')
/**
 * deploy.services plugins
 */
module.exports = function servicesPlugins (params, callback) {
  let { cloudformation, dryRun, stage } = params
  let serviceDiscoveryPlugins = params.inventory.inv.plugins?._methods?.deploy?.services
  if (serviceDiscoveryPlugins) {
    let inventory = deepFrozenCopy(params.inventory)
    let { arc } = inventory.inv._project
    async function runPlugins () {
      for (let plugin of serviceDiscoveryPlugins) {
        let pluginName = getLambdaName(plugin.name)
        let result = await plugin({ arc, cloudformation, dryRun, inventory, stage })
        if (result && Object.keys(result).length) {
          Object.entries(result).forEach(([ key, Value ]) => {
            let ServiceParam = `${toLogicalID(pluginName)}${toLogicalID(key)}Param`
            cloudformation.Resources[ServiceParam] = {
              Type: 'AWS::SSM::Parameter',
              Properties: {
                Type: 'String',
                Name: { 'Fn::Sub': [
                  '/${AWS::StackName}/${pluginName}/${key}',
                  { pluginName, key }
                ] },
                Value
              }
            }
          })
        }
      }
    }
    runPlugins()
      .then(() => callback(null, cloudformation))
      .catch(callback)
  }
  else callback(null, cloudformation)
}
