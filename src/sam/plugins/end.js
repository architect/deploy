let { deepFrozenCopy } = require('@architect/utils')

/**
 * deploy.end plugins
 */
module.exports = function endPlugins (params, callback) {
  let { cloudformation, dryRun, stage } = params
  let deployEndPlugins = params.inventory.inv.plugins?._methods?.deploy?.end
  if (deployEndPlugins) {
    let inventory = deepFrozenCopy(params.inventory)
    let { arc } = inventory.inv._project
    async function runPlugins () {
      for (let plugin of deployEndPlugins) {
        await plugin({ arc, cloudformation, dryRun, inventory, stage })
      }
    }
    runPlugins()
      .then(() => callback())
      .catch(callback)
  }
  else callback()
}
