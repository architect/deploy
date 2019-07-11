# `@architect/deploy` [![Travis Build Status](https://travis-ci.com/architect/deploy.svg?branch=master)](https://travis-ci.com/architect/deploy) [![Appveyor Build Status](https://ci.appveyor.com/api/projects/status/k9qd79nxxermhyj4/branch/master?svg=true)](https://ci.appveyor.com/project/ArchitectCI/deploy/branch/master) [![codecov](https://codecov.io/gh/architect/deploy/branch/master/graph/badge.svg)](https://codecov.io/gh/architect/deploy)

[@architect/deploy][npm] is a module that deploys @architect applications to
cloud infrastructure.

## Installation

    npm i @architect/deploy
    let deploy = require('@architect/deploy')

# Requirements

You need to have the `sam` command-line utility available on your `$PATH`. Check
out [AWS' docs][sam-cli] for instructions on how to install this.

# API

## `deploy.dirty(callback)`

Deploys Function code to the staging environment _by ommitting CloudFormation
and messing with Lambda infrastructure directly_. There's a reason we called
this `dirty`. Hey, it works, and it's much faster.

## `deploy.sam({verbose, production}, callback)`

Deploys all infrastructure associated to your @architect app.

Set `verbose` to truthy to enable chatty mode. By default will only push to the
staging environment unless `production` is truthy.

## `deploy.static({verbose, production}, callback)`

Pushes static assets from the `public/` folder of @architect apps to S3, as
defined by your @architect app's `.arc` file. Respects `fingerprint`, `prune`
and `ignore` `@static` pragma directives (more information available on the
[`@static` arc guide][static-guide].

Set `verbose` to truthy to enable chatty mode. By default will only push to the
staging environment unless `production` is truthy.

[npm]: https://www.npmjs.com/package/@architect/deploy
[static-guide]: https://arc.codes/reference/static
[sam-cli]: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html
