let { sep } = require('path')

// Denormalizes S3 keys for local filesystem lookups after accounting for prefix, Windows paths, etc.
module.exports = function unformatKey (Key, prefix) {
  let key = Key

  // Denormalize prefix
  if (prefix && key.startsWith(prefix)) key = key.replace(prefix, '')

  // Strip leading slash from prefix or jic
  if (key.startsWith('/')) key = key.substr(1)

  // Windowsify
  key = key.replace('/', sep)

  return key
}
