let { existsSync } = require('fs')
let { join } = require('path')
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
  let transforms = arc.plugins || []
  return await transforms.map(path)
    .reduce(async function reducer (current, plugin) {
      // eslint-disable-next-line
      let run = require(plugin).package
      let cloudformation = await current
      if (run) return await run(arc, cloudformation, stage, inventory)
      else return Promise.resolve(cloudformation)
    }, Promise.resolve(cloudformation))
}

/**
 * @plugins live in these userland places:
 *
 * - src/plugins/filename.js
 * - src/plugins/modulename
 * - node_modules/my-plugin-name
 *
 * @param {String} name - the plugin name
 * @returns {String} path - the path to the plugin
 */
function path (name) {
  let internal = join(__dirname, `_${name}`, 'index.js')
  let localPath = join(process.cwd(), 'src', 'plugins', `${name}.js`)
  let localPath1 = join(process.cwd(), 'src', 'plugins', name)
  let modulePath = join(process.cwd(), 'node_modules', name)
  let modulePath1 = join(process.cwd(), 'node_modules', `@${name}`)
  if (existsSync(internal)) return internal
  if (existsSync(localPath)) return localPath
  if (existsSync(localPath1)) return localPath1
  if (existsSync(modulePath)) return modulePath
  if (existsSync(modulePath1)) return modulePath1
  throw ReferenceError(name + ' macro defined in project manifest not found')
}
