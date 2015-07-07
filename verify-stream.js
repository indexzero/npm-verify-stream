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
    TarBuffer = require('./tar-buffer');

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

  this.stream = duplexify();

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

  this.stream.on('error', this._cleanup.bind(this));

  //
  // Setup our writable stream for parsing gzipped
  // tarball data as it is written to us.
  //
  this.writable = zlib.Unzip();
  this.parser = tar.Parse();
  this._buildPackage();
  this.writable.pipe(this.parser);
  this.stream.setWritable(this.writable);

  return this.stream;
};

/*
 * function verify ()
 * Runs the specified checks against the PackageBuffer
 */
VerifyStream.prototype.verify = function (files) {
  var self = this;
  this._building = false;
  console.log('verify');
  async.mapLimit(
    this.checks, this.concurrency,
    function runCheck(check, next) {
      check(files, next);
    },
    function verifyChecks(err) {
      if (err) {
        //
        // TODO: we should emit an error here, but on which
        // part of the duplex?
        //
        return self.cleanup(err);
      }

      self._flushCache();
    }
  )
};

/* @private function _buildPackage ()
 * Creates a tar.Parse stream and listens to the extra
 * events necessary to build the package
 */
VerifyStream.prototype._buildPackage = function () {
  if (this._building) {
    // TODO: throwing an error here is awful
    throw new Error('Cannot build once buffering a package.');
  }

  this._building = true;
  this.buffer = TarBuffer(this.parser, this.read)
    //
    // Remark: is this the correct way to handle tar errors?
    // Or should we also emit an error ourselves?
    //
    .on('error', this._cleanup.bind(this))
    .on('end', this.verify.bind(this));
};

/*
 * @private function _flushCache ()
 * Reads the the cached tarball from disk and sets it
 * as the readable portion of the duplex stream.
 */
VerifyStream.prototype._flushCache = function () {
  if (!this.tmp /*|| !this._cacheComplete*/) {
    // TODO: What do we do here?
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
    // TODO: set _cacheComplete and attempt to emit output
    // Remark: is this a race we care about?
    //
    // .on('end', this._readCache.bind(this));
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
  //
  // TODO: inspection of the error to ignore edge cases
  //
  var self = this;
  self._building = false;

  //
  // Do not clean if we are currently doing so or
  // we do not have a tmp tarball file.
  //
  if (this._cleaning || !this.tmp) { return; }
  this._cleaning = true;

  setImmediate(function () {
    self.log('cleanup %s', self.tmp);
    fs.unlink(self.tmp, function (err) {
      self._cleaning = false;
      //
      // TODO: what do we do with these errors?
      //
      if (err) { return; }
      self.tmp = null;
    });
  });
};
