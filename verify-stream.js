'use strict';

var fs = require('fs'),
    os = require('os'),
    path = require('path'),
    zlib = require('zlib'),
    extend = require('util')._extend,
    duplexify = require('duplexify'),
    fstream = require('fstream'),
    tar = require('tar'),
    TarBuffer = require('./tar-buffer');

var VerifyStream = module.exports = function VerifyStream(opts) {
  if (!(this instanceof VerifyStream)) { return new VerifyStream(opts); }

  var self = this;

  this.opts = opts || {};
  this.opts.package = this.opts.package || {};
  this.opts.package.log = this.opts.package.log || this.log;
  this.stream = duplexify();

  //
  // When we are piped to then cache that stream
  // to a temporary location on disk.
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
  this._building = false;
  console.log('verify');
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
  this.buffer = TarBuffer(this.parser, this.opts.package)
    //
    // Remark: is this the correct way to handle tar errors?
    // Or should we also emit an error ourselves?
    //
    .on('error', this._cleanup.bind(this))
    .on('end', this.verify.bind(this));
};

/*
 * @private function _readCache ()
 * Reads the the cached tarball from disk and sets it
 * as the readable portion of the duplex stream.
 */
VerifyStream.prototype._readCache = function () {
  if (!this.tmp || !this._cacheComplete) {
    // TODO: What do we do here?
  }

  this.stream.setReadable(fs.createReadStream(this.tmp));
};

/*
 * @private function _cache (stream)
 * Caches the stream to a temporary file in a temporary directory
 */
VerifyStream.prototype._cache = function (source) {
  if (!this.tmp) { this._configure(); }
  source.pipe(fs.createWriteStream(this.tmp))
    .on('error', this._cleanup.bind(this))
    .on('end', this._cleanup.bind(this));
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
  console.log('this.tmp', this.tmp);
};

/*
 * @private function _cleanup (err)
 * Cleans up the temporary file associated with this
 * instance.
 */
VerifyStream.prototype._cleanup = function (err) {
  /* TODO: inspection of the error to ignore edge cases */
  this._building = false;
  this.log('cleanup %s', this.tmp);
  fs.unlink(this.tmp, function () {
    /* TODO: what do we do with these? */
  });
};
