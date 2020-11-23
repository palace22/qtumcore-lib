'use strict';

var _ = require('lodash');
var $ = require('../util/preconditions');
var BufferUtil = require('../util/buffer');
var BN = require('../crypto/bn');

var BufferReader = function BufferReader(buf) {
  if (!(this instanceof BufferReader)) {
    return new BufferReader(buf);
  }
  if (_.isUndefined(buf)) {
    return;
  }
  if (Buffer.isBuffer(buf)) {
    this.set({
      buf: buf
    });
  } else if (_.isString(buf)) {
    this.set({
      buf: Buffer.from(buf, 'hex'),
    });
  } else if (_.isObject(buf)) {
    var obj = buf;
    this.set(obj);
  } else {
    throw new TypeError('Unrecognized argument for BufferReader');
  }
};

BufferReader.prototype.set = function(obj) {
  this.buf = obj.buf || this.buf || undefined;
  this.pos = obj.pos || this.pos || 0;
  return this;
};

BufferReader.prototype.eof = function() {
  return this.pos >= this.buf.length;
};

BufferReader.prototype.finished = BufferReader.prototype.eof;

BufferReader.prototype.read = function(length) {
  $.checkArgument(!_.isUndefined(length), 'Must specify a length');
  let buffer = this.buf.slice(0, length)
  this.buf = this.buf.slice(length)
  return buffer
};

BufferReader.prototype.readAll = function() {
    let buffer = this.buf
    this.buf = Buffer.alloc(0)
    return buffer
};

BufferReader.prototype.readUInt8 = function() {
    let value = this.buf.readUInt8(0)
    this.buf = this.buf.slice(1)
    return value
};

BufferReader.prototype.readUInt16BE = function() {
    let value = this.buf.readUInt16BE(0)
    this.buf = this.buf.slice(2)
    return value
};

BufferReader.prototype.readUInt16LE = function() {
    let value = this.buf.readUInt16LE(0)
    this.buf = this.buf.slice(2)
    return value
};

BufferReader.prototype.readUInt32BE = function() {
    let value = this.buf.readUInt32BE(0)
    this.buf = this.buf.slice(4)
    return value
};

BufferReader.prototype.readUInt32LE = function() {
    let value = this.buf.readUInt32LE(0)
    this.buf = this.buf.slice(4)
    return value
};

BufferReader.prototype.readInt32LE = function() {
    let value = this.buf.readInt32LE(0)
    this.buf = this.buf.slice(4)
    return value
};

BufferReader.prototype.readUInt64BEBN = function() {
  var buf = this.buf.slice(this.pos, this.pos + 8);
  var bn = BN.fromBuffer(buf);
  this.pos = this.pos + 8;
  return bn;
};

BufferReader.prototype.readUInt64LEBN = function() {
    let low = this.buf.readUInt32LE()
    let high = this.buf.readUInt32LE(4)
    let value = (BigInt(high) << 32n) + BigInt(low)
    this.buf = this.buf.slice(8)
    return value
};

BufferReader.prototype.readVarintNum = function() {
  var first = this.readUInt8();
  switch (first) {
    case 0xFD:
      return this.readUInt16LE();
    case 0xFE:
      return this.readUInt32LE();
    case 0xFF:
      var bn = this.readUInt64LEBN();
      var n = bn.toNumber();
      if (n <= Math.pow(2, 53)) {
        return n;
      } else {
        throw new Error('number too large to retain precision - use readVarintBN');
      }
      break;
    default:
      return first;
  }
};

/**
 * reads a length prepended buffer
 */
BufferReader.prototype.readVarLengthBuffer = function() {
  var len = this.readVarintNum();
  var buf = this.read(len);
  $.checkState(buf.length === len, 'Invalid length while reading varlength buffer. ' +
    'Expected to read: ' + len + ' and read ' + buf.length);
  return buf;
};

BufferReader.prototype.readVarintBuf = function() {
  var first = this.buf.readUInt8(this.pos);
  switch (first) {
    case 0xFD:
      return this.read(1 + 2);
    case 0xFE:
      return this.read(1 + 4);
    case 0xFF:
      return this.read(1 + 8);
    default:
      return this.read(1);
  }
};

BufferReader.prototype.readVarintBN = function() {
  var first = this.readUInt8();
  switch (first) {
    case 0xFD:
      return new BN(this.readUInt16LE());
    case 0xFE:
      return new BN(this.readUInt32LE());
    case 0xFF:
      return this.readUInt64LEBN();
    default:
      return new BN(first);
  }
};

BufferReader.prototype.reverse = function() {
  var buf = Buffer.from(this.buf.length);
  for (var i = 0; i < buf.length; i++) {
    buf[i] = this.buf[this.buf.length - 1 - i];
  }
  this.buf = buf;
  return this;
};

BufferReader.prototype.readReverse = function(len) {
  if (_.isUndefined(len)) {
    len = this.buf.length;
  }
  var buf = this.buf.slice(this.pos, this.pos + len);
  this.pos = this.pos + len;
  return BufferUtil.reverse(buf);
};

module.exports = BufferReader;
