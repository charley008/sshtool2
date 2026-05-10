// through2 - 轻量级Transform流包装，不再依赖runtime.js
"use strict";

var Transform = require('stream').Transform;
var inherits = require('util').inherits;

// xtend - 浅合并对象
function xtend() {
  var target = {};
  for (var i = 0; i < arguments.length; i++) {
    var source = arguments[i];
    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }
  return target;
}

function DestroyableTransform(opts) {
  Transform.call(this, opts);
  this._destroyed = false;
}

inherits(DestroyableTransform, Transform);

DestroyableTransform.prototype.destroy = function(err) {
  if (this._destroyed) return;
  this._destroyed = true;
  var self = this;
  process.nextTick(function() {
    if (err) self.emit('error', err);
    self.emit('close');
  });
};

function noop(chunk, enc, callback) { callback(null, chunk); }

function through2(construct) {
  return function(options, transform, flush) {
    if (typeof options == 'function') { flush = transform; transform = options; options = {}; }
    if (typeof transform != 'function') transform = noop;
    if (typeof flush != 'function') flush = null;
    return construct(options, transform, flush);
  };
}

module.exports = through2(function(options, transform, flush) {
  var t2 = new DestroyableTransform(options);
  t2._transform = transform;
  if (flush) t2._flush = flush;
  return t2;
});

module.exports.ctor = through2(function(options, transform, flush) {
  function Through2(override) {
    if (!(this instanceof Through2)) return new Through2(override);
    this.options = xtend(options, override);
    DestroyableTransform.call(this, this.options);
  }
  inherits(Through2, DestroyableTransform);
  Through2.prototype._transform = transform;
  if (flush) Through2.prototype._flush = flush;
  return Through2;
});

module.exports.obj = through2(function(options, transform, flush) {
  var t2 = new DestroyableTransform(xtend({ objectMode: true, highWaterMark: 16 }, options));
  t2._transform = transform;
  if (flush) t2._flush = flush;
  return t2;
});
