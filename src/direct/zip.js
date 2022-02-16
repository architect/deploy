var series = require('run-waterfall')
var { join } = require('path')
var glob = require('glob')
var zipit = require('zipit')
var zipdir = require('zip-dir')

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
      glob(join(pathToCode, '/*'), { dot: true }, callback)
    },
    function _zip (files, callback) {
      zipit({
        input: files,
      }, callback)
    },
  ], callback)
}
