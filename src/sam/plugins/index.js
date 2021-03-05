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
  let plugins = inventory.inv._project.plugins || []
  return await plugins.reduce(async function reducer (current, plugin) {
    let run = plugin.package
    let cloudformation = await current
    if (run) return await run({ arc, cloudformation, stage, inventory })
    else return Promise.resolve(cloudformation)
  }, Promise.resolve(cloudformation))
}
