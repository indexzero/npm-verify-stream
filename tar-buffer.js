'use strict';

var events = require('events'),
    util = require('util'),
    concat = require('concat-stream');

/*
 * function TarBuffer (parser, opts)
 * Represents a buffer for holding all tar data that is
 * emitted from "entry" events on the tar `parser`.
 */
var TarBuffer = module.exports = function TarBuffer(parser, opts) {
  if (!(this instanceof TarBuffer)) { return new TarBuffer(parser, opts); }
  events.EventEmitter.call(this);

  //
  // TODO: Need to support ignore options similar to `fstream-ignore`.
  //
  opts = opts || {};
  this.log = opts.log || function () {};

  //
  // Remark: what's the best data structure for nested files?
  //
  var self = this;
  self.files = {};
  parser.on('entry', function (e) {
    if (self.files[e.path]) {
      return self.log('duplicate entry', e.path);
    }

    self.log('entry', e.props);
    self.files[e.path] = e;

    //
    // Remark: will there be errors on the entry object?
    //
    e.pipe(concat({ encoding: 'string' }, function (content) {
      self.log(e.path, content);
      e.content = content;
    }));
  })
  //
  // Remark: is this the correct way to handle tar errors?
  // Or should we also emit an error ourselves?
  //
  .on('end', this.emit.bind(this, 'end'))
  .on('error', this.emit.bind(this, 'error'));
  //
  // Remark: adapted from `node-tar` examples. Leaving this sample
  // code here until their role in the `tar` format is better
  // understood.
  //
  // .on('extendedHeader', function (e) {
  //   console.error('extended pax header', e.props)
  //   e.on('end', function () {
  //     console.error('extended pax fields:', e.fields)
  //   })
  // })
  // .on('ignoredEntry', function (e) {
  //   console.error('ignoredEntry?!?', e.props)
  // })
  // .on('longLinkpath', function (e) {
  //   console.error('longLinkpath entry', e.props)
  //   e.on('end', function () {
  //     console.error('value=%j', e.body.toString())
  //   })
  // })
  // .on('longPath', function (e) {
  //   console.error('longPath entry', e.props)
  //   e.on('end', function () {
  //     console.error('value=%j', e.body.toString())
  //   })
  // })
};

util.inherits(TarBuffer, events.EventEmitter);
