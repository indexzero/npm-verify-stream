'use strict';

var fs = require('fs'),
    path = require('path'),
    async = require('async');

/*
 * Test directories for reading & writing files.
 */
var dirs = exports.dirs = {
  fixtures: path.join(__dirname, 'fixtures'),
  output: path.join(__dirname, 'output')
};

/*
 * function cleanOutput (callback)
 * Removes all tarballs from the `/test/output` directory.
 */
exports.cleanOutput = function (callback) {
  fs.readdir(dirs.output, function (err, files) {
    if (err) { return callback(err); }

    var tarballs = files.filter(function (file) {
      return path.extname(file) === '.tgz';
    });

    async.forEachLimit(tarballs, 5, function unlink(file, next) {
      fs.unlink(file, function (err) {
        if (err && err.code !== 'ENOENT') { return next(err); }
        next();
      });
    }, callback);
  });
};

