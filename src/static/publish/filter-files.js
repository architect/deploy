let sort = require('path-sort')

/**
 * Filter based on default and user-specified @static ignore rules
 */
module.exports = function filterFiles (params, callback) {
  let { globbed, ignore } = params

  // Default ignored files / paths; these defaults are not passed by fingerprint config
  // Note: we must ignore static.json, as it may be destroyed by the fingerprinter if no longer necessary
  let ignored = ignore.concat([
    '.DS_Store',
    'node_modules',
    'readme.md',
    'static.json'
  ])

  // Find non-ignored files;
  let filtered = globbed.filter(file => !ignored.some(i => file.includes(i)))

  // Sort for user readability
  filtered = sort(filtered)

  if (!filtered.length) {
    callback(Error('no_files_to_publish'))
  }
  else callback(null, filtered, ignored)
}
