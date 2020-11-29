/**
 * Plugs env vars into Lambdae based on stage and resets NODE_ENV
 * TODO: we should make Inventory stage-aware, and move this logic into Package; but don't forget to backport this into _legacy-api macro!
 */
// eslint-disable-next-line
module.exports = async function env (arc, cloudformation, stage, inventory) {
  let { inv } = inventory

  // Bail if no env vars are configured for this environment
  let envVars = inv._project.env && inv._project.env[stage]

  let cfn = cloudformation
  Object.entries(cfn.Resources).forEach(([ resource, value ]) => {
    if (value.Type !== 'AWS::Serverless::Function') return
    // Assume we've already got a baseline set of env vars
    try {
      cfn.Resources[resource].Properties.Environment.Variables.ARC_ENV = stage
      cfn.Resources[resource].Properties.Environment.Variables.NODE_ENV = stage
      let disableEnvVars = cfn.Resources[resource].Properties.Environment.Variables.ARC_DISABLE_ENV_VARS
      if (!disableEnvVars && envVars) {
        Object.entries(envVars).forEach(([ k, v ]) => {
          cfn.Resources[resource].Properties.Environment.Variables[k] = v
        })
      }
    }
    catch (err) {
      let msg = `Failed adding env vars to ${resource}:` + (err.message ? err.message : '')
      throw Error(msg)
    }
  })

  return cfn
}
