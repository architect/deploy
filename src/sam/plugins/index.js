let { toLogicalID } = require('@architect/utils')
let { createFunction } = require('@architect/package')

/**
 * Architect Plugins
 * ---
 * > NOTE: currently plugins are Node modules; Python and Ruby are planned for a future release
 *
 * A plugin is found in two places:
 *
 * - src/plugins/filename.js
 * - node_modules/my-plugin-name
 *
 * Additionally, plugins must be registered in the .arc file (so we know what order to run them).
 *
 * ```arc
 * @plugins
 * filename          # src/plugins/filename.js
 * my-plugin-name     # node_modules/my-plugin-name
 * smallwins/storage # node_modules/@smallwins/storage
 * ```
 *
 * For more information on plugins, see https://staging.arc.codes/docs/en/guides/extend/architect-plugins
 *
 * @param {Object} arc - the parsed .arc file in the current working directory
 * @param {AWS::Serverless} template - the current CloudFormation template
 * @param {String} stage - the current stage being deployed (generally staging or production, defaults to staging)
 * @param {Function} callback - a Node style errback
 */
module.exports = function plugins (inventory, cloudformation, stage, callback) {
  exec(inventory, cloudformation, stage)
    .then(cfn => callback(null, cfn))
    .catch(callback)
}

/**
 * @param {Object} arc - the parsed .arc file in the current working directory
 * @param {AWS::Serverless} template - the current CloudFormation template
 * @param {String} stage - the current stage being deployed (generally staging or production, defaults to staging)
 * @returns {AWS::Serverless}
 */
async function exec (inventory, cloudformation, stage) {
  let arc = inventory.inv._project.arc
  let plugins = inventory.inv._project.plugins ? Object.values(inventory.inv._project.plugins) : []
  let pluginNames = inventory.inv._project.plugins ? Object.keys(inventory.inv._project.plugins) : []
  // compile each plugins CFN modifications
  let cfn = await plugins.reduce(async function reducer (current, plugin) {
    let run = plugin.package
    let cloudformation = await current
    if (run) {
      return run({ arc, cloudformation, stage, inventory, createFunction })
    }
    else {
      return Promise.resolve(cloudformation)
    }
  }, Promise.resolve(cloudformation))
  // now grab any variable exports from plugins and inject as SSM parameters
  return pluginNames.reduce(async function reducer (current, pluginName) {
    let plugin = inventory.inv._project.plugins[pluginName]
    let varExports = plugin.variables
    let cloudformation = await current
    if (varExports) {
      let vars = await varExports({ arc, cloudformation, stage, inventory })
      let keys = Object.keys(vars)
      if (keys && keys.length) {
        for (let k of keys) {
          let Value = vars[k]
          cloudformation.Resources[toLogicalID(`${pluginName}${k}Param`)] = {
            Type: 'AWS::SSM::Parameter',
            Properties: {
              Type: 'String',
              Name: { 'Fn::Sub': [
                '/${AWS::StackName}/${pluginName}/${variableName}',
                {
                  pluginName,
                  variableName: k
                }
              ] },
              Value
            }
          }
        }
      }
    }
    return Promise.resolve(cloudformation)
  }, Promise.resolve(cfn))
}
