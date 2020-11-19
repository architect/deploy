module.exports = function env ({ cloudformation, inventory, stage }) {
  let { inv } = inventory

  // Bail if no env vars are configured
  let envVars = inv._project.env[stage]
  if (!envVars) return cloudformation

  let cfn = cloudformation

  Object.entries(cfn.Resources).forEach(([ resource, value ]) => {
    if (value.Type !== 'AWS::Serverless::Function') return
    // Assume we've already got a baseline set of env vars
    try {
      Object.entries(envVars).forEach(([ k, v ]) => {
        cfn.Resources[resource].Properties.Environment.Variables[k] = v
      })
    }
    catch (err) {
      let msg = `Failed adding env vars to ${resource}:` + (err.message ? err.message : '')
      throw Error(msg)
    }
  })

  return cfn
}
