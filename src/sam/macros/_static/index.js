/**
 * Adds SPA, ARC_STATIC_PREFIX, etc. to `get /` (if defined)
 */
module.exports = async function api(arc, cloudformation) {
  let cfn = cloudformation

  // Prefix
  let prefixSetting = tuple => tuple[0] === 'prefix'
  let prefix = arc.static && arc.static.some(prefixSetting) && arc.static.find(prefixSetting)[1]
  if (cfn.Resources && cfn.Resources.GetIndex && prefix) {
    cfn.Resources.GetIndex.Properties.Environment.Variables['ARC_STATIC_PREFIX'] = prefix
  }

  // SPA (defaults to false if env var isn't set)
  let spaSetting = tuple => tuple[0] === 'spa'
  // findIndex instead of find so we don't mix up bools
  let spa = arc.static && arc.static.some(spaSetting) && arc.static.findIndex(spaSetting)
  let spaIsValid = arc.static && arc.static[spa] && typeof arc.static[spa][1] === 'boolean'
  if (cfn.Resources && cfn.Resources.GetIndex && spaIsValid) {
    cfn.Resources.GetIndex.Properties.Environment.Variables['ARC_STATIC_SPA'] = arc.static[spa][1]
  }

  // Delete global layers on root proxy
  let noGetIndex = arc.http && !arc.http.some(r => r[0] === 'get' && r[1] === '/')
  if (noGetIndex && cfn.Resources.GetIndex) {
    try {
      delete cfn.Resources.GetIndex.Properties.Layers
    }
    catch (err) { /*noop*/ }
  }

  return cfn
}
