'use strict';

var path = require('path'),
    fs = require('fs'),
    async = require('async'),
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

    it('should also output with cleanup = false', function (done) {
      var input = path.join(dirs.fixtures, 'npm-verify-stream-0.0.0.tgz');
      var output = path.join(dirs.output, 'cleanup-test.tgz');

      var tmpFile;
      var wasChecked;
      var verifier = new VerifyStream({
        log: process.env.DEBUG && console.log,
        cleanup: false,
        checks: [function noop(pkg, next) {
          wasChecked = true;
          next();
        }]
      });

      // Cached tmp file location is only known after pipe.
      verifier.on('pipe', function () {
        tmpFile = verifier.__verifier.tmp;
      });

      fs.createReadStream(input)
        .pipe(verifier)
        .pipe(fs.createWriteStream(output))
        .on('close', function () {
          async.parallel([
            function checkOutput(next) {
              assert.wasVerified(input, output, next)();
            },
            function checkCache(next) {
              assert.wasVerified(input, tmpFile, next)();
            }
          ], function (err) {
            assert.equal(wasChecked, true);
            setImmediate(fs.unlink, tmpFile);
            done();
          });
        });
    });
  });
});
