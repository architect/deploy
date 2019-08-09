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
 * module.exports = function MyMacro(arc, cloudformation) {
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
 * @param {Function} callback - a Node style errback
 *
 */
module.exports = function macros(arc, template, callback) {
  exec(arc, template).then(cfn=>callback(null, cfn)).catch(callback)
}


/**
 * @param {Object} arc - the parsed .arc file in the current working directory
 * @param {AWS::Serverless} template - the current CloudFormation template
 * @returns {AWS::Serverless}
 */
async function exec(arc, template) {
  let transforms = arc.macros || []
  transforms.push('arc-env') // always run the internal env macro
  return await transforms.map(path).reduce(async function reducer(current, macro) {
    /* eslint global-require: "off" */
    let run = require(macro)
    let cfn = await current
    return await run(arc, cfn)
  }, Promise.resolve(template))
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
