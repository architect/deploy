let { sep } = require('path')

/**
 * Normalize the S3 Key of the globbed file to be uploaded
 */
module.exports = function formatKey (params) {
  let { file, fingerprint, publicDir, prefix, staticManifest } = params

  // Remove the public dir so the S3 path (called 'Key') is always project-relative, deal with Windows garbage
  let Key = file
    .replace(publicDir + sep, '')
    .replace(publicDir + '/', '')
    .replace(/\\/g, '/') // You know who
  if (Key.startsWith('/')) Key = Key.substr(1)

  // If fingerprint is set to 'external', don't mutate the Key, it's assumed to be fingerprinted
  let notStaticManifest = Key !== 'static.json'
  if (fingerprint && (fingerprint !== 'external') && notStaticManifest) {
    Key = staticManifest[Key]
  }

  // Prepend asset prefix if present
  if (prefix) Key = `${prefix}/${Key}`

  return Key
}
