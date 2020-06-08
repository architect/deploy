/**
 * Adds ARC_STATIC_PREFIX to `get /` if @static prefix is defined
 */
module.exports = async function api(arc, cloudformation) {
  let cfn = cloudformation
  let prefixSetting = tuple => tuple[0] === 'prefix'
  let prefix = arc.static && arc.static.some(prefixSetting) && arc.static.find(prefixSetting)[1]

  if (cfn.Resources && cfn.Resources.GetIndex && prefix) {
    cfn.Resources.GetIndex.Properties.Environment.Variables['ARC_STATIC_PREFIX'] = prefix
  }

  return cfn
}
