'use strict';

var path = require('path'),
    fs = require('fs'),
    VerifyStream = require('../'),
    assert = require('./assert'),
    helpers = require('./helpers'),
    dirs = helpers.dirs;

//
// Simple no-op checks.
//
var checks = [function noop(check, next) { next(); }];

describe('npm-verify-stream simple', function () {
  describe('module', function () {
    it('exposes correct functions', function () {
      assert.equal(typeof VerifyStream, 'function');
      assert.equal(typeof VerifyStream.TarBuffer, 'function');
    });
  });

  describe('VerifyStream', function () {
    it('does not require "new"', function () {
      assert.isVerifyStream(VerifyStream({ checks: checks }), checks);
    });

    it('instance has the correct state', function () {
      assert.isVerifyStream(new VerifyStream({ checks: checks }), checks);
    });

    it('requires checks', function () {
      assert.throws(function () { new VerifyStream() });
      assert.throws(function () { new VerifyStream({ checks: [] }) });
    });
  });

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
