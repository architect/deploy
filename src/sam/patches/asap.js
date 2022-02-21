let { join } = require('path')
let { mkdirSync, readFileSync, writeFileSync } = require('fs')
let { copySync } = require('fs-extra')

// If we're using ASAP + fingerprinting, inject it with static.json
module.exports = function asapFingerprint (params, callback) {
  let { cloudformation: cfn, inventory } = params
  let { inv, get } = inventory
  let { cwd } = inv._project
  let fingerprint = get.static('fingerprint') === true

  if (inv._project.rootHandler === 'arcStaticAssetProxy' && fingerprint) {
    let { src } = get.http('get /*')

    // Arc's tmp dir be destroyed up by the post-deploy cleaner
    let tmp = join(cwd, '__ARC_TMP__')
    let shared = join(tmp, 'node_modules', '@architect', 'shared')
    mkdirSync(shared, { recursive: true })

    // Handle ASAP
    copySync(src, tmp)

    // Handle static.json
    let staticFolder = inv.static.folder
    staticFolder = join(cwd, staticFolder)
    let staticManifest = readFileSync(join(staticFolder, 'static.json'))
    writeFileSync(join(shared, 'static.json'), staticManifest)

    // Ok we done
    let isHTTP = cfn.Resources.GetCatchallHTTPLambda
    if (isHTTP) {
      cfn.Resources.GetCatchallHTTPLambda.Properties.CodeUri = tmp
    }
    else {
      cfn.Resources.GetIndex.Properties.CodeUri = tmp
    }
  }
  callback(null, cfn)
}
