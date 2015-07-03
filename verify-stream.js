'use strict';

var fs = require('fs'),
    os = require('os'),
    path = require('path'),
    zlib = require('zlib'),
    duplexify = require('duplexify'),
    fstream = require('fstream'),
    tar = require('tar');

var VerifyStream = module.exports = function VerifyStream(opts) {
  if (!(this instanceof VerifyStream)) { return new VerifyStream(opts); }

  var self = this;

  this.opts = opts;
  this.stream = duplexify();

  //
  // Setup our writable stream for parsing gzipped
  // tarball data as it is written to us.
  //
  this.writable = zlib.Unzip();
  this.parser = tar.Parse();
  this._buildPackage();
  this.readable.pipe(this.parser);
  this.stream.setWritable(this.writable);

  //
  // When we are piped to then cache that stream
  // to a temporary location on disk.
  //
  this.stream.on('pipe', function (source) {
    self._cache(source);
  });

  this.stream.on('error', this._cleanup.bind(this));

  this._buildPackage();
  return this.stream;
};

/* @private function _buildPackage ()
 * Creates a tar.Parse stream and listens to the extra
 * events necessary to build the package
 */
VerifyStream.prototype._buildPackage = function () {
  this.parser
    .on('extendedHeader', function (e) {
      console.error('extended pax header', e.props)
      e.on('end', function () {
        console.error('extended pax fields:', e.fields)
      })
    })
    .on('ignoredEntry', function (e) {
      console.error('ignoredEntry?!?', e.props)
    })
    .on('longLinkpath', function (e) {
      console.error('longLinkpath entry', e.props)
      e.on('end', function () {
        console.error('value=%j', e.body.toString())
      })
    })
    .on('longPath', function (e) {
      console.error('longPath entry', e.props)
      e.on('end', function () {
        console.error('value=%j', e.body.toString())
      })
    })
    .on('entry', function (e) {
      console.error('entry', e.props)
      e.on('data', function (c) {
        console.error('  >>>' + c.toString().replace(/\n/g, '\\n'))
      })
      e.on('end', function () {
        console.error('  <<<EOF')
      })
    })
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
  source.pipe(fs.createWriteStream(this.tmp));
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
};

/*
 * @private function _cleanup (err)
 * Cleans up the temporary file associated with this
 * instance.
 */
VerifyStream.prototype._cleanup = function (err) {
  /* TODO: inspection of the error to ignore edge cases */

  fs.unlink(this.tmp, function () {
    /* TODO: what do we do with these? */
  });
};
