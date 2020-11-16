let { join } = require('path')
let { writeFile } = require('fs')

// Write out sam.json
module.exports = function writeSAM ({ sam, update }, callback) {
  let name = join(process.cwd(), 'sam.json')
  let data = JSON.stringify(sam, null, 2)
  writeFile(name, data, function (err) {
    if (err) callback(err)
    else {
      update.status('Created deployment templates')
      callback()
    }
  })
}
