/**
 * Adds SPA, ARC_STATIC_PREFIX, etc. to `get /` (if defined)
 */
// eslint-disable-next-line
module.exports = async function api (arc, cloudformation, stage, inventory) {
  let { get } = inventory
  let cfn = cloudformation

  // Prefix
  let prefix = get.static('prefix')
  if (cfn.Resources && cfn.Resources.GetIndex && prefix) {
    cfn.Resources.GetIndex.Properties.Environment.Variables['ARC_STATIC_PREFIX'] = prefix
  }

  // SPA (defaults to false if env var isn't set)
  let spaSetting = get.static('spa')
  let hasSpa = typeof spaSetting !== undefined
  if (cfn.Resources && cfn.Resources.GetIndex && hasSpa) {
    cfn.Resources.GetIndex.Properties.Environment.Variables['ARC_STATIC_SPA'] = spaSetting
  }

  return cfn
}
