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
fs.createReadStream('npm-verify-stream-2.0.0.tgz')
  .pipe(verifier)
  .pipe(request.post('https://registry.nodejitsu.com/npm-verify-stream'));
```

## Checks
A "check" is a function that accepts a fully-read npm package and responds with either no error or an error indicating how the package violated the check.

**example-check.js**
``` js
module.exports = function (package) {
  //
  // Really complicated static analysis stuff and whatnot goes here.
  //
};
```
