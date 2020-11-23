[<img src="https://s3-us-west-2.amazonaws.com/arc.codes/architect-logo-500b@2x.png" width=500>](https://www.npmjs.com/package/@architect/deploy)

## [`@architect/deploy`](https://www.npmjs.com/package/@architect/deploy)

> Architect serverless framework module for deploying applications to cloud infrastructure

[![GitHub CI status](https://github.com/architect/deploy/workflows/Node%20CI/badge.svg)](https://github.com/architect/deploy/actions?query=workflow%3A%22Node+CI%22)


## Installation

    npm i @architect/deploy
    let deploy = require('@architect/deploy')


## Requirements

You need to have the `sam` command-line utility available on your `$PATH`. Check out [AWS' docs][sam-cli] for instructions on how to install this.


## API

### `deploy.direct({ isDryRun, srcDirs }, callback)`

Deploys function code directly to one or more staging (or production) environment Lambdas _by ommitting CloudFormation and directly updating code payloads_. This is very useful for live debugging; changes made with direct deploys should be considered temporary.


### `deploy.sam({ verbose, production }, callback)`

Deploys all infrastructure associated to your @architect app.

Set `verbose` to truthy to enable chatty mode. By default will only push to the staging environment unless `production` is truthy.


### `deploy.static({ bucket, credentials, fingerprint, prefix, prune, region, verbose, production }, callback)`

All parameters are optional.

Pushes static assets from the `public/` folder of @architect apps to S3, as defined by your @architect app's `.arc` file. Respects `fingerprint` (`true` or `external`), `prefix`, `prune`, and `ignore` params or `@static` pragma directives (more information available on the [`@static` arc guide][static-guide]).

By default will only publish to the staging environment unless `production` is truthy. Set `verbose` to truthy to enable chatty mode.

[static-guide]: https://arc.codes/reference/static
[sam-cli]: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html
