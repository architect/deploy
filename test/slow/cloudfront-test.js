const { test } = require('node:test')
const assert = require('node:assert/strict')
const list = require('../../src/sam/02-after/00-get-app-apex/cloudfront-list')
const create = require('../../src/sam/02-after/00-get-app-apex/cloudfront-create')
const destroy = require('../../src/sam/02-after/00-get-app-apex/cloudfront-destroy')

const mock = {
  api: { domain: 'brian.io', path: '/staging' },
  s3: { domain: 'arc.codes' },
}

test('cloudfront operations', async (t) => {
  let distros

  await t.test('list distributions', async () => {
    return new Promise((resolve, reject) => {
      list(function (err, _distros) {
        if (err) {
          reject(err)
        }
        else {
          distros = _distros
          assert.ok(Array.isArray(_distros), 'got distros')
          console.log(distros)
          resolve()
        }
      })
    })
  })

  await t.test('api', async () => {
    return new Promise((resolve, reject) => {
      const exists = distros.find(d => d.origin === mock.api.domain)
      if (exists && exists.status === 'InProgress') {
        assert.ok(true, 'InProgress')
        resolve()
      }
      else if (exists) {
        destroy(exists, function (err, result) {
          if (err) {
            reject(err)
          }
          else {
            assert.ok(true, 'destroying domain probably')
            console.log(result)
            resolve()
          }
        })
      }
      else {
        create(mock.api, function (err) {
          if (err) {
            reject(err)
          }
          else {
            assert.ok(true, 'created without error')
            resolve()
          }
        })
      }
    })
  })
})
