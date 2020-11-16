/**
 * Plugs env vars into Lambdae based on stage and resets NODE_ENV
 * TODO: we should make Inventory stage-aware, and move this logic into Package; but don't forget to backport this into _legacy-api macro!
 */
// eslint-disable-next-line
module.exports = async function env (arc, cloudformation, stage, inventory) {
  let { inv } = inventory
  let cfn = cloudformation
  let envVars = inv._project.env && inv._project.env[stage]
  Object.keys(cfn.Resources).forEach(r => {
    let isFunction = cfn.Resources[r].Type === 'AWS::Serverless::Function'
    if (isFunction) {
      cfn.Resources[r].Properties.Environment.Variables.NODE_ENV = stage
      if (envVars) {
        Object.entries(envVars).forEach(envVar => {
          let { name, value } = envVar
          cfn.Resources[r].Properties.Environment.Variables[name] = value
        })
      }
    }
  })
  return cfn
}
