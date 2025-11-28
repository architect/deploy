/*
const { test } = require('node:test')
const assert = require('node:assert/strict')
let sinon = require('sinon')
let utils = require('@architect/utils')
let deploy = require('../../')
let deployCmd = require('../../cli')

test('deploy command invokes deploy.dirty if specified via options', async () => {
  let opts = ['dirty', '--dirty', '-d']
  let fakeDirty = sinon.fake.resolves()
  let fakeSam = sinon.fake.resolves()
  let fakeRead = sinon.fake.returns({
    arc: {aws: [['bucket']]}
  })
  sinon.replace(deploy, 'dirty', fakeDirty)
  sinon.replace(deploy, 'sam', fakeSam)
  sinon.replace(utils, 'readArc', fakeRead)

  for (const opt of opts) {
    fakeDirty.resetHistory()
    fakeSam.resetHistory()
    try {
      await deployCmd([opt])
      assert.ok(fakeDirty.calledOnce, `${opt} invoked deploy.dirty`)
      assert.ok(!fakeSam.calledOnce, `${opt} did not invoke deploy.sam`)
    } catch (e) {
      assert.fail(e)
    }
  }
  sinon.restore()
})

test('deploy command invokes deploy.static if specified via options', async () => {
  let opts = ['static', '--static', '-s']
  let fakeStatic = sinon.fake.resolves()
  let fakeSam = sinon.fake.resolves()
  let fakeRead = sinon.fake.returns({
    arc: {aws: [['bucket']]}
  })
  sinon.replace(deploy, 'static', fakeStatic)
  sinon.replace(deploy, 'sam', fakeSam)
  sinon.replace(utils, 'readArc', fakeRead)

  for (const opt of opts) {
    fakeStatic.resetHistory()
    fakeSam.resetHistory()
    try {
      await deployCmd([opt])
      assert.ok(fakeStatic.calledOnce, `${opt} invoked deploy.static`)
      assert.ok(!fakeSam.calledOnce, `${opt} did not invoke deploy.sam`)
    } catch (e) {
      assert.fail(e)
    }
  }
  sinon.restore()
})

test('deploy command invokes deploy.sam by default', async () => {
  let fakeSam = sinon.fake.resolves()
  let fakeRead = sinon.fake.returns({
    arc: {aws: [['bucket']]}
  })
  sinon.replace(deploy, 'sam', fakeSam)
  sinon.replace(utils, 'readArc', fakeRead)
  try {
    await deployCmd()
    assert.ok(fakeSam.calledOnce, `lack of options invoked deploy.sam`)
  } catch (e) {
    assert.fail(e)
  }
  sinon.restore()
})
*/
