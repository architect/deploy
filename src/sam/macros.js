let {existsSync} = require('fs')
let {join} = require('path')
/**
 * Architect Macros
 * ---
 *
 * Exprimental feature for modifying the generated CloudFormation template before deployment.
 *
 * > NOTE: currently macros are Node modules; Python and Ruby are planned for a future release
 *
 * A macro are found in two places:
 *
 * - src/macros/filename.js
 * - node_modules/my-macro-name
 *
 * Additionally, macros must be registered in the .arc file (so we know what order to run them).
 *
 * ```arc
 * @macros
 * filename          # src/macros/filename.js
 * my-macro-name     # node_modules/my-macro-name
 * smallwins/storage # node_modules/@smallwins/storage
 * ```
 *
 * Macros are of the form:
 *
 * ```javascript
 * module.exports = function MyMacro(arc, cloudformation, stage) {
 *   // ... modify cloudformation
 *   return cloudformation
 * }
 * ```
 *
 * Macros can be async functions (or return a Promise that resolves a CloudFormation template)
 *
 * The passed in `arc` object allows user defined custom pragmas and config.
 *
 * @param {Object} arc - the parsed .arc file in the current working directory
 * @param {AWS::Serverless} template - the current CloudFormation template
 * @param {String} stage - the current stage being deployed (generally staging or production, defaults to staging)
 * @param {Function} callback - a Node style errback
 *
 */
module.exports = function macros(arc, cloudformation, stage, callback) {
  exec(arc, cloudformation, stage)
    .then(cfn=> callback(null, cfn))
    .catch(callback)
}


/**
 * @param {Object} arc - the parsed .arc file in the current working directory
 * @param {AWS::Serverless} template - the current CloudFormation template
 * @param {String} stage - the current stage being deployed (generally staging or production, defaults to staging)
 * @returns {AWS::Serverless}
 */
async function exec(arc, cloudformation, stage) {
  let transforms = arc.macros || []
  // always run the following internal macros:
  transforms.push('set-stage')  // Sets cloudformation stage name for all resources
  transforms.push('api-path')   // Updates @cdn, @http, @ws stage URL paths
  transforms.push('arc-env')    // Gets and sets env vars for functions
  return await transforms.map(path)
    .reduce(async function reducer(current, macro) {
      // eslint-disable-next-line
      let run = require(macro)
      let cloudformation = await current
      return await run(arc, cloudformation, stage)
    }, Promise.resolve(cloudformation))
}

/**
 * @macros live in these userland places:
 *
 * - src/macros/filename.js
 * - src/macros/modulename
 * - node_modules/my-macro-name
 *
 * @param {String} name - the macro name
 * @returns {String} path - the path to the macro
 */
function path(name) {
  let internal = join(__dirname, 'macros', `${name}.js`)
  let localPath = join(process.cwd(), 'src', 'macros', `${name}.js`)
  let localPath1 = join(process.cwd(), 'src', 'macros', name)
  let modulePath = join(process.cwd(), 'node_modules', name)
  let modulePath1 = join(process.cwd(), 'node_modules', `@${name}`)
  if (existsSync(internal)) return internal
  if (existsSync(localPath)) return localPath
  if (existsSync(localPath1)) return localPath1
  if (existsSync(modulePath)) return modulePath
  if (existsSync(modulePath1)) return modulePath1
  throw ReferenceError(name + ' macro defined in .arc not found')
}
