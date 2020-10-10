let { sep } = require('path')

/**
 * Denormalize the S3 Key for local filesystem lookups after accounting for prefix, Windows paths, etc.
 */
module.exports = function unformatKey (Key, prefix) {
  let key = Key

  // Denormalize prefix
  if (prefix && key.startsWith(prefix)) key = key.replace(prefix, '')

  // Force a failed lookup against local files to ensure prefixes don't accidentally skip pruning previously deployed files at root
  else if (prefix && !key.startsWith(prefix)) key = `${key}-ARC_DELETE`

  // Strip leading slash from prefix or jic
  if (key.startsWith('/')) key = key.substr(1)

  // Un-Windowsify (prob not necessary, but jic)
  key = key.replace(sep, '/')

  return key
}
