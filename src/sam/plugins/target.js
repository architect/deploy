let { deepFrozenCopy } = require('@architect/utils')

/**
 * deploy.target plugins
 */
module.exports = function targetPlugins (params, callback) {
  let { cloudformation, dryRun, stage } = params
  let deployTargetPlugins = params.inventory.inv.plugins?._methods?.deploy?.target
  if (deployTargetPlugins) {
    let inventory = deepFrozenCopy(params.inventory)
    let { arc } = inventory.inv._project
    async function runPlugins () {
      for (let plugin of deployTargetPlugins) {
        await plugin({ arc, cloudformation, dryRun, inventory, stage })
      }
    }
    runPlugins()
      .then(() => callback())
      .catch(callback)
  }
  else callback()
}
