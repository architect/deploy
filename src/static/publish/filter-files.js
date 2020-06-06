let sort = require('path-sort')

let { join } = require('path')

module.exports = function filterFiles (params, callback) {
  let { files, ignore, publicDir } = params

  let staticFile = join(publicDir, 'static.json')

  // Find non-ignored files; ignore static.json, as it may be destroyed by the fingerprinter if no longer necessary
  let filtered = files.filter(file => !ignore.some(i => file.includes(i)) && file !== staticFile)

  // Sort for user readability
  filtered = sort(filtered)

  if (!filtered.length) {
    callback(Error('no_files_to_publish'))
  }
  else callback(null, filtered)
}
