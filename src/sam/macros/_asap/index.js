let { join } = require('path')
let { mkdirSync, readFileSync, writeFileSync } = require('fs')

// If we're using ASAP + fingerprinting, inject it with static.json
module.exports = function asapFingerprint (arc, cloudformation, stage, inventory) {
  let { inv, get } = inventory
  let fingerprint = get.static('fingerprint') === true
  let cfn = cloudformation

  if (inv._project.rootHandler === 'arcStaticAssetProxy' && fingerprint) {
    let { handlerFile } = get.http('get /*')

    // Arc's tmp dir be destroyed up by the post-deploy cleaner
    let tmp = join(process.cwd(), '__ARC_TMP__')
    let shared = join(tmp, 'node_modules', '@architect', 'shared')
    mkdirSync(shared, { recursive: true })

    // Handle ASAP
    let asap = readFileSync(handlerFile)
    writeFileSync(join(tmp, 'index.js'), asap)

    // Handle static.json
    let staticFolder = inv.static.folder
    staticFolder = join(process.cwd(), staticFolder)
    let staticManifest = readFileSync(join(staticFolder, 'static.json'))
    writeFileSync(join(shared, 'static.json'), staticManifest)

    // Ok we done
    cfn.Resources.GetCatchallHTTPLambda.Properties.CodeUri = tmp
  }
  return cfn
}
