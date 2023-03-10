var series = require('run-waterfall')
var { globSync } = require('glob')
var zipit = require('zipit')
var zipdir = require('zip-dir')
let { pathToUnix } = require('@architect/utils')

/**
 * @param {String} pathIn - path to zip
 * @returns {Buffer} zipfile as a buffer
 */
module.exports = function zipper (pathIn, callback) {
  let zip = process.platform.startsWith('win') ? winzip : nixzip
  zip(pathIn, callback)
}

function winzip (pathToCode, callback) {
  zipdir(pathToCode, callback)
}

function nixzip (pathToCode, callback) {
  series([
    function _read (callback) {
      try {
        let path = pathToUnix(pathToCode + '/*')
        let files = globSync(path, { dot: true })
        callback(null, files)
      }
      catch (err) {
        callback(err)
      }
    },
    function _zip (files, callback) {
      zipit({
        input: files,
      }, callback)
    },
  ], callback)
}
