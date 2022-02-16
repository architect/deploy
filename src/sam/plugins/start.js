let { deepFrozenCopy } = require('@architect/utils')

/**
 * deploy.start plugins
 */
module.exports = function startPlugins (params, callback) {
  let { cloudformation, dryRun, stage } = params
  let deployStartPlugins = params.inventory.inv.plugins?._methods?.deploy?.start
  if (deployStartPlugins) {
    let inventory = deepFrozenCopy(params.inventory)
    let { arc } = inventory.inv._project
    async function runPlugins () {
      for (let plugin of deployStartPlugins) {
        let { type } = plugin
        let result
        // Plugins accept an option object
        if (type === 'plugin') {
          result = await plugin({ arc, cloudformation, dryRun, inventory, stage })
        }
        // Legacy macros use ordered args
        if (type === 'macro') {
          result = await plugin(arc, cloudformation, stage, inventory)
        }
        // Returning Cloudformation is optional
        if (result) cloudformation = result
      }
    }
    runPlugins()
      .then(() => callback(null, cloudformation))
      .catch(callback)
  }
  else callback(null, cloudformation)
}
