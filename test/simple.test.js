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

    it('should exist against a no-op check', function (done) {
      var input = path.join(dirs.fixtures, 'npm-verify-stream-0.0.0.tgz');
      var output = path.join(dirs.output, 'no-op-test.tgz');
      var wasChecked;

      fs.createReadStream(input)
        .pipe(new VerifyStream({
          log: process.env.DEBUG && console.log,
          checks: [function noop(pkg, next) {
            wasChecked = true;
            next();
          }]
        }))
        .pipe(fs.createWriteStream(output))
        .on('close', assert.wasVerified(input, output, function () {
          assert.equal(wasChecked, true);
          done();
        }));
    });
  });
});
