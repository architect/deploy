/**
 * deploy.start plugins
 */
module.exports = function plugins (params, callback) {
  let { cloudformation, dryRun, inventory, stage } = params
  let deployStartPlugins = inventory.inv.plugins?._methods?.deploy?.start
  if (deployStartPlugins) {
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
