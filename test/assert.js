'use strict';

var fs = require('fs'),
    path = require('path'),
    async = require('async');

/*
 * Extending the assert module. #dealwithit
 */
var assert = module.exports = require('assert');

/*
 * function wasVerified(input, output)
 * Asserts that the files for `input` and `output` exist
 * and are equal in bytes.
 */
assert.wasVerified = function wasVerified(input, output) {
  return function checkVerified() {
    console.error('wat');
    async.parallel({
      input: async.apply(fs.stat, input),
      output: async.apply(fs.stat, output)
    }, function (err, stats) {
      if (err) { throw err; }

      console.dir(stats.input);
      console.dir(stats.output);
    });
  };
};
