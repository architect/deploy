let test = require('tape')
let list = require('../../src/sam/02-after/cloudfront-list')
let create = require('../../src/sam/02-after/cloudfront-create')
let destroy = require('../../src/sam/02-after/cloudfront-destroy')

let mock = {
  api: {domain:'brian.io', path:'/staging'},
  s3: {domain:'arc.codes'}
}

let distros
test('list distributions', t=> {
  t.plan(1)
  list(function done(err, _distros) {
    if (err) t.fail(err)
    else {
      distros = _distros
      t.ok(Array.isArray(_distros), 'got distros')
      console.log(distros)
    }
  })
})


test('api', t=> {
  t.plan(1)
  let exists = distros.find(d=> d.origin === mock.api.domain)
  if (exists && exists.status === 'InProgress') {
    t.ok(true, 'InProgress')
  }
  else if (exists) {
    destroy(exists, function done(err, result) {
      if (err) t.fail(err)
      else {
        t.ok(true, 'destroying domain probably')
        console.log(result)
      }
    })
  }
  else {
    create(mock.api, function done(err) {
      if (err) t.fail(err)
      else t.ok(true, 'created without error')
    })
  }
})


