'use strict';

var path = require('path'),
    fs = require('fs'),
    VerifyStream = require('../'),
    assert = require('./assert'),
    helpers = require('./helpers'),
    dirs = helpers.dirs;

describe('npm-verify-stream simple', function () {
  describe('output tarball', function () {
    beforeEach(function (done) {
      helpers.cleanOutput(done);
    });

    it('no-op', function (done) {
      var input = path.join(dirs.fixtures, 'npm-verify-stream-0.0.0.tgz');
      var output = path.join(dirs.output, 'no-op-test.tgz');

      fs.createReadStream(input)
        .pipe(new VerifyStream({
          log: process.env.DEBUG && console.log,
          checks: [function noop(pkg, next) {
            //
            // TODO: Require a set of checks.
            //
            next();
          }]
        }))
        .pipe(fs.createWriteStream(output))
        .on('end', assert.wasVerified(input, output))
    });
  });
});
