'use strict';

var fs = require('fs'),
    os = require('os'),
    path = require('path'),
    zlib = require('zlib'),
    extend = require('util')._extend,
    async = require('async'),
    duplexify = require('duplexify'),
    fstream = require('fstream'),
    tar = require('tar'),
    PackageBuffer = require('npm-package-buffer');

var VerifyStream = module.exports = function VerifyStream(opts) {
  if (!(this instanceof VerifyStream)) { return new VerifyStream(opts); }
  if (!opts || !opts.checks || !opts.checks.length) {
    throw new Error('Checks are required to verify an npm package.');
  }

  var self = this;
  this.log = opts.log || function () {};
  this.read = opts.read || {};
  this.read.log = this.read.log || (this.read.log !== false && this.log);
  this.concurrency = opts.concurrency || 5;
  this.before = opts.before;
  this.checks = opts.checks;
  this.cleanup = opts.cleanup;

  this.stream = duplexify();
  this.stream.__verifier = this;

  //
  // When we are piped to then cache that stream
  // to a temporary location on disk.
  //
  // Remark: I believe this could be accomplished
  // with a through2 stream, but not sure.
  //
  this.stream.on('pipe', function (source) {
    self._cache(source);
  });

  //
  // Setup our writable stream for parsing gzipped
  // tarball data as it is written to us.
  //
  this._building = true;
  this.gunzip = zlib.Unzip()
    .on('error', this._cleanup.bind(this));

  this.writable = this.before || this.gunzip;

  //
  // Do not listen for errors on our tar parser because
  // those errors will be emitted by our PackageBuffer.
  //
  this.parser = tar.Parse();
  this.buffer = new PackageBuffer(this.parser, this.read)
    .on('error', this._cleanup.bind(this))
    .on('end', this.verify.bind(this));

  if (this.before) {
    this.gunzip.pipe(this.parser);
    this.before.pipe(this.gunzip);
  }
  else {
    this.writable.pipe(this.parser);
  }

  this.stream.setWritable(this.writable);

  return this.stream;
};

/*
 * function verify ()
 * Runs the specified checks against the PackageBuffer
 */
VerifyStream.prototype.verify = function () {
  var self = this;
  var checks = typeof this.checks === 'function'
    ? this.checks(self.buffer)
    : this.checks;

  this._building = false;
  async.mapLimit(
    checks, this.concurrency,
    function runCheck(check, next) {
      check(self.buffer, next);
    },
    function verifyChecks(err) {
      if (err) { return self._cleanup(err); }
      self._flushCache();
    }
  );
};

/*
 * @private function _flushCache ()
 * Reads the the cached tarball from disk and sets it
 * as the readable portion of the duplex stream.
 */
VerifyStream.prototype._flushCache = function () {
  if (!this.tmp) {
    // TODO: What do we do here?
    throw new Error('What is wrong?');
  }

  this.readable = fs.createReadStream(this.tmp)
    .on('error', this._cleanup.bind(this))
    .on('end', this._cleanup.bind(this));

  this.stream.setReadable(this.readable);
};

/*
 * @private function _cache (stream)
 * Caches the stream to a temporary file in a temporary directory
 */
VerifyStream.prototype._cache = function (source) {
  if (!this.tmp) { this._configure(); }
  this.log('cache', this.tmp);
  source.pipe(fs.createWriteStream(this.tmp))
    .on('error', this._cleanup.bind(this));
    //
    // Remark: is set _cacheComplete and attempting to emit output
    // handling a race we care about?
    //
    // .on('end', this._flushCache.bind(this));
};

/*
 * @private function _configure ()
 * Configures this instance with a temporary cache file
 * location
 */
VerifyStream.prototype._configure = function () {
  var dir = os.tmpdir();
  var now = process.hrtime().join('') + '.tgz';
  this.tmp = path.join(dir, now);
  this.log('configure %s', this.tmp);
};

/*
 * @private function _cleanup (err)
 * Cleans up the temporary file associated with this
 * instance.
 */
VerifyStream.prototype._cleanup = function (err) {
  var self = this;
  self._building = false;

  //
  // Do not clean if we are currently doing so or
  // we do not have a tmp tarball file.
  //
  if (this._cleaning || !this.tmp) { return; }
  this._cleaning = true;

  //
  // Emit an error on our stream instance if we
  // are passed one here.
  // TODO: inspection of the error to ignore edge cases
  //
  if (err) { this.stream.emit('error', err); }

  setImmediate(function () {
    self.log('cleanup %s', self.tmp);
    if (self.cleanup === false) {
      return self.log('skip cleanup %s', self.tmp);
    }

    fs.unlink(self.tmp, function (err) {
      var errState;
      self._cleaning = false;

      if (err && err.code !== 'ENOENT') { errState = err; }
      self.tmp = null;
      self.stream.emit('cleanup', self.tmp, errState);
    });
  });
};
