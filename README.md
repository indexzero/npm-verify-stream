# npm-verify-stream

A duplex stream for receiving a package tarball, verifying arbitrary checks, and emitting that same tarball on success.

## Usage
``` js
var VerifyStream = ('npm-verify-stream');
var fs = require('fs');
var request = require('request');

//
// Create our verifier
//
var verifier = new VerifyStream({
  log: console.log,
  checks: [
    //
    // A set of checks to run on a fully read npm package
    // See [Checks] below.
    //
  ]
});

//
// Put the tarball somewhere (like npm) ONLY if it passes
// all of the checks.
//
fs.createReadStream('npm-verify-stream-0.0.0.tgz')
  .pipe(verifier)
  .pipe(request.post('https://registry.nodejitsu.com/npm-verify-stream'));
```

## Checks
A "check" is a function that accepts a fully-read npm package and responds with either no error or an error indicating how the package violated the check.

**example-check.js**
``` js
module.exports = function (package, done) {
  //
  // Really complicated static analysis stuff and whatnot goes here.
  //
};
```

### API

#### Options

- `checks`: (required) Check functions that must pass to consider the package verified.
- `concurrency`: (default: 5) Number of concurrent checks to run.
- `log`: (optional) Log function to use. Expects `console.log` API.
- `read`: (optional) Options to pass to the `TarBuffer`.
- `before`: (optional) Stream to pipe to BEFORE piping to the `zlib.Unzip` and `tar.Parse` streams.
- `cleanup`: (optional) If *explicitly* set to `false` then temporary files will not be cleaned up. Useful for debugging.

#### Events
- `error`: as with any stream these will be emitted if the readable or writable end of the duplex stream has errored. It will also be emitted if there is an error writing the tarball to the disk cache during the verification process or if the verification fails.
- `cleanup`: emitted when the cached tarball is removed.
``` js
verifier.on('cleanup', function (file, err) {
  // If there was an error removing from your cache
  // it will be here. ENOENT errors are ignored.
});
```

##### Author: [Charlie Robbins](https://github.com/indexzero)
##### LICENSE: MIT
