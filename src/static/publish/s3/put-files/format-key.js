let { pathToUnix } = require('@architect/utils')

/**
 * Normalize the S3 Key of the globbed file to be uploaded
 */
module.exports = function formatKey (params) {
  let { file, fingerprint, publicDir, prefix, staticManifest } = params

  // At this point glob has passed us *nix-style paths - even on Windows
  // Also Windows can use backslashes OR forward slashes in file reads (lol), renormalize path.sep in case glob ever changes that behavior
  let filepath = pathToUnix(`${publicDir}/`)
  // Remove the public dir so the S3 path (called 'Key') is always relative
  let Key = file.replace(filepath, '')
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
