require=(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global){(function (){
'use strict';

var possibleNames = [
	'BigInt64Array',
	'BigUint64Array',
	'Float32Array',
	'Float64Array',
	'Int16Array',
	'Int32Array',
	'Int8Array',
	'Uint16Array',
	'Uint32Array',
	'Uint8Array',
	'Uint8ClampedArray'
];

var g = typeof globalThis === 'undefined' ? global : globalThis;

module.exports = function availableTypedArrays() {
	var out = [];
	for (var i = 0; i < possibleNames.length; i++) {
		if (typeof g[possibleNames[i]] === 'function') {
			out[out.length] = possibleNames[i];
		}
	}
	return out;
};

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],2:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],3:[function(require,module,exports){

},{}],4:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)

},{"base64-js":2,"buffer":4,"ieee754":16}],5:[function(require,module,exports){
'use strict';

var GetIntrinsic = require('get-intrinsic');

var callBind = require('./');

var $indexOf = callBind(GetIntrinsic('String.prototype.indexOf'));

module.exports = function callBoundIntrinsic(name, allowMissing) {
	var intrinsic = GetIntrinsic(name, !!allowMissing);
	if (typeof intrinsic === 'function' && $indexOf(name, '.prototype.') > -1) {
		return callBind(intrinsic);
	}
	return intrinsic;
};

},{"./":6,"get-intrinsic":10}],6:[function(require,module,exports){
'use strict';

var bind = require('function-bind');
var GetIntrinsic = require('get-intrinsic');

var $apply = GetIntrinsic('%Function.prototype.apply%');
var $call = GetIntrinsic('%Function.prototype.call%');
var $reflectApply = GetIntrinsic('%Reflect.apply%', true) || bind.call($call, $apply);

var $gOPD = GetIntrinsic('%Object.getOwnPropertyDescriptor%', true);
var $defineProperty = GetIntrinsic('%Object.defineProperty%', true);
var $max = GetIntrinsic('%Math.max%');

if ($defineProperty) {
	try {
		$defineProperty({}, 'a', { value: 1 });
	} catch (e) {
		// IE 8 has a broken defineProperty
		$defineProperty = null;
	}
}

module.exports = function callBind(originalFunction) {
	var func = $reflectApply(bind, $call, arguments);
	if ($gOPD && $defineProperty) {
		var desc = $gOPD(func, 'length');
		if (desc.configurable) {
			// original length, plus the receiver, minus any additional arguments (after the receiver)
			$defineProperty(
				func,
				'length',
				{ value: 1 + $max(0, originalFunction.length - (arguments.length - 1)) }
			);
		}
	}
	return func;
};

var applyBind = function applyBind() {
	return $reflectApply(bind, $apply, arguments);
};

if ($defineProperty) {
	$defineProperty(module.exports, 'apply', { value: applyBind });
} else {
	module.exports.apply = applyBind;
}

},{"function-bind":9,"get-intrinsic":10}],7:[function(require,module,exports){
'use strict';

var isCallable = require('is-callable');

var toStr = Object.prototype.toString;
var hasOwnProperty = Object.prototype.hasOwnProperty;

var forEachArray = function forEachArray(array, iterator, receiver) {
    for (var i = 0, len = array.length; i < len; i++) {
        if (hasOwnProperty.call(array, i)) {
            if (receiver == null) {
                iterator(array[i], i, array);
            } else {
                iterator.call(receiver, array[i], i, array);
            }
        }
    }
};

var forEachString = function forEachString(string, iterator, receiver) {
    for (var i = 0, len = string.length; i < len; i++) {
        // no such thing as a sparse string.
        if (receiver == null) {
            iterator(string.charAt(i), i, string);
        } else {
            iterator.call(receiver, string.charAt(i), i, string);
        }
    }
};

var forEachObject = function forEachObject(object, iterator, receiver) {
    for (var k in object) {
        if (hasOwnProperty.call(object, k)) {
            if (receiver == null) {
                iterator(object[k], k, object);
            } else {
                iterator.call(receiver, object[k], k, object);
            }
        }
    }
};

var forEach = function forEach(list, iterator, thisArg) {
    if (!isCallable(iterator)) {
        throw new TypeError('iterator must be a function');
    }

    var receiver;
    if (arguments.length >= 3) {
        receiver = thisArg;
    }

    if (toStr.call(list) === '[object Array]') {
        forEachArray(list, iterator, receiver);
    } else if (typeof list === 'string') {
        forEachString(list, iterator, receiver);
    } else {
        forEachObject(list, iterator, receiver);
    }
};

module.exports = forEach;

},{"is-callable":20}],8:[function(require,module,exports){
'use strict';

/* eslint no-invalid-this: 1 */

var ERROR_MESSAGE = 'Function.prototype.bind called on incompatible ';
var slice = Array.prototype.slice;
var toStr = Object.prototype.toString;
var funcType = '[object Function]';

module.exports = function bind(that) {
    var target = this;
    if (typeof target !== 'function' || toStr.call(target) !== funcType) {
        throw new TypeError(ERROR_MESSAGE + target);
    }
    var args = slice.call(arguments, 1);

    var bound;
    var binder = function () {
        if (this instanceof bound) {
            var result = target.apply(
                this,
                args.concat(slice.call(arguments))
            );
            if (Object(result) === result) {
                return result;
            }
            return this;
        } else {
            return target.apply(
                that,
                args.concat(slice.call(arguments))
            );
        }
    };

    var boundLength = Math.max(0, target.length - args.length);
    var boundArgs = [];
    for (var i = 0; i < boundLength; i++) {
        boundArgs.push('$' + i);
    }

    bound = Function('binder', 'return function (' + boundArgs.join(',') + '){ return binder.apply(this,arguments); }')(binder);

    if (target.prototype) {
        var Empty = function Empty() {};
        Empty.prototype = target.prototype;
        bound.prototype = new Empty();
        Empty.prototype = null;
    }

    return bound;
};

},{}],9:[function(require,module,exports){
'use strict';

var implementation = require('./implementation');

module.exports = Function.prototype.bind || implementation;

},{"./implementation":8}],10:[function(require,module,exports){
'use strict';

var undefined;

var $SyntaxError = SyntaxError;
var $Function = Function;
var $TypeError = TypeError;

// eslint-disable-next-line consistent-return
var getEvalledConstructor = function (expressionSyntax) {
	try {
		return $Function('"use strict"; return (' + expressionSyntax + ').constructor;')();
	} catch (e) {}
};

var $gOPD = Object.getOwnPropertyDescriptor;
if ($gOPD) {
	try {
		$gOPD({}, '');
	} catch (e) {
		$gOPD = null; // this is IE 8, which has a broken gOPD
	}
}

var throwTypeError = function () {
	throw new $TypeError();
};
var ThrowTypeError = $gOPD
	? (function () {
		try {
			// eslint-disable-next-line no-unused-expressions, no-caller, no-restricted-properties
			arguments.callee; // IE 8 does not throw here
			return throwTypeError;
		} catch (calleeThrows) {
			try {
				// IE 8 throws on Object.getOwnPropertyDescriptor(arguments, '')
				return $gOPD(arguments, 'callee').get;
			} catch (gOPDthrows) {
				return throwTypeError;
			}
		}
	}())
	: throwTypeError;

var hasSymbols = require('has-symbols')();

var getProto = Object.getPrototypeOf || function (x) { return x.__proto__; }; // eslint-disable-line no-proto

var needsEval = {};

var TypedArray = typeof Uint8Array === 'undefined' ? undefined : getProto(Uint8Array);

var INTRINSICS = {
	'%AggregateError%': typeof AggregateError === 'undefined' ? undefined : AggregateError,
	'%Array%': Array,
	'%ArrayBuffer%': typeof ArrayBuffer === 'undefined' ? undefined : ArrayBuffer,
	'%ArrayIteratorPrototype%': hasSymbols ? getProto([][Symbol.iterator]()) : undefined,
	'%AsyncFromSyncIteratorPrototype%': undefined,
	'%AsyncFunction%': needsEval,
	'%AsyncGenerator%': needsEval,
	'%AsyncGeneratorFunction%': needsEval,
	'%AsyncIteratorPrototype%': needsEval,
	'%Atomics%': typeof Atomics === 'undefined' ? undefined : Atomics,
	'%BigInt%': typeof BigInt === 'undefined' ? undefined : BigInt,
	'%BigInt64Array%': typeof BigInt64Array === 'undefined' ? undefined : BigInt64Array,
	'%BigUint64Array%': typeof BigUint64Array === 'undefined' ? undefined : BigUint64Array,
	'%Boolean%': Boolean,
	'%DataView%': typeof DataView === 'undefined' ? undefined : DataView,
	'%Date%': Date,
	'%decodeURI%': decodeURI,
	'%decodeURIComponent%': decodeURIComponent,
	'%encodeURI%': encodeURI,
	'%encodeURIComponent%': encodeURIComponent,
	'%Error%': Error,
	'%eval%': eval, // eslint-disable-line no-eval
	'%EvalError%': EvalError,
	'%Float32Array%': typeof Float32Array === 'undefined' ? undefined : Float32Array,
	'%Float64Array%': typeof Float64Array === 'undefined' ? undefined : Float64Array,
	'%FinalizationRegistry%': typeof FinalizationRegistry === 'undefined' ? undefined : FinalizationRegistry,
	'%Function%': $Function,
	'%GeneratorFunction%': needsEval,
	'%Int8Array%': typeof Int8Array === 'undefined' ? undefined : Int8Array,
	'%Int16Array%': typeof Int16Array === 'undefined' ? undefined : Int16Array,
	'%Int32Array%': typeof Int32Array === 'undefined' ? undefined : Int32Array,
	'%isFinite%': isFinite,
	'%isNaN%': isNaN,
	'%IteratorPrototype%': hasSymbols ? getProto(getProto([][Symbol.iterator]())) : undefined,
	'%JSON%': typeof JSON === 'object' ? JSON : undefined,
	'%Map%': typeof Map === 'undefined' ? undefined : Map,
	'%MapIteratorPrototype%': typeof Map === 'undefined' || !hasSymbols ? undefined : getProto(new Map()[Symbol.iterator]()),
	'%Math%': Math,
	'%Number%': Number,
	'%Object%': Object,
	'%parseFloat%': parseFloat,
	'%parseInt%': parseInt,
	'%Promise%': typeof Promise === 'undefined' ? undefined : Promise,
	'%Proxy%': typeof Proxy === 'undefined' ? undefined : Proxy,
	'%RangeError%': RangeError,
	'%ReferenceError%': ReferenceError,
	'%Reflect%': typeof Reflect === 'undefined' ? undefined : Reflect,
	'%RegExp%': RegExp,
	'%Set%': typeof Set === 'undefined' ? undefined : Set,
	'%SetIteratorPrototype%': typeof Set === 'undefined' || !hasSymbols ? undefined : getProto(new Set()[Symbol.iterator]()),
	'%SharedArrayBuffer%': typeof SharedArrayBuffer === 'undefined' ? undefined : SharedArrayBuffer,
	'%String%': String,
	'%StringIteratorPrototype%': hasSymbols ? getProto(''[Symbol.iterator]()) : undefined,
	'%Symbol%': hasSymbols ? Symbol : undefined,
	'%SyntaxError%': $SyntaxError,
	'%ThrowTypeError%': ThrowTypeError,
	'%TypedArray%': TypedArray,
	'%TypeError%': $TypeError,
	'%Uint8Array%': typeof Uint8Array === 'undefined' ? undefined : Uint8Array,
	'%Uint8ClampedArray%': typeof Uint8ClampedArray === 'undefined' ? undefined : Uint8ClampedArray,
	'%Uint16Array%': typeof Uint16Array === 'undefined' ? undefined : Uint16Array,
	'%Uint32Array%': typeof Uint32Array === 'undefined' ? undefined : Uint32Array,
	'%URIError%': URIError,
	'%WeakMap%': typeof WeakMap === 'undefined' ? undefined : WeakMap,
	'%WeakRef%': typeof WeakRef === 'undefined' ? undefined : WeakRef,
	'%WeakSet%': typeof WeakSet === 'undefined' ? undefined : WeakSet
};

try {
	null.error; // eslint-disable-line no-unused-expressions
} catch (e) {
	// https://github.com/tc39/proposal-shadowrealm/pull/384#issuecomment-1364264229
	var errorProto = getProto(getProto(e));
	INTRINSICS['%Error.prototype%'] = errorProto;
}

var doEval = function doEval(name) {
	var value;
	if (name === '%AsyncFunction%') {
		value = getEvalledConstructor('async function () {}');
	} else if (name === '%GeneratorFunction%') {
		value = getEvalledConstructor('function* () {}');
	} else if (name === '%AsyncGeneratorFunction%') {
		value = getEvalledConstructor('async function* () {}');
	} else if (name === '%AsyncGenerator%') {
		var fn = doEval('%AsyncGeneratorFunction%');
		if (fn) {
			value = fn.prototype;
		}
	} else if (name === '%AsyncIteratorPrototype%') {
		var gen = doEval('%AsyncGenerator%');
		if (gen) {
			value = getProto(gen.prototype);
		}
	}

	INTRINSICS[name] = value;

	return value;
};

var LEGACY_ALIASES = {
	'%ArrayBufferPrototype%': ['ArrayBuffer', 'prototype'],
	'%ArrayPrototype%': ['Array', 'prototype'],
	'%ArrayProto_entries%': ['Array', 'prototype', 'entries'],
	'%ArrayProto_forEach%': ['Array', 'prototype', 'forEach'],
	'%ArrayProto_keys%': ['Array', 'prototype', 'keys'],
	'%ArrayProto_values%': ['Array', 'prototype', 'values'],
	'%AsyncFunctionPrototype%': ['AsyncFunction', 'prototype'],
	'%AsyncGenerator%': ['AsyncGeneratorFunction', 'prototype'],
	'%AsyncGeneratorPrototype%': ['AsyncGeneratorFunction', 'prototype', 'prototype'],
	'%BooleanPrototype%': ['Boolean', 'prototype'],
	'%DataViewPrototype%': ['DataView', 'prototype'],
	'%DatePrototype%': ['Date', 'prototype'],
	'%ErrorPrototype%': ['Error', 'prototype'],
	'%EvalErrorPrototype%': ['EvalError', 'prototype'],
	'%Float32ArrayPrototype%': ['Float32Array', 'prototype'],
	'%Float64ArrayPrototype%': ['Float64Array', 'prototype'],
	'%FunctionPrototype%': ['Function', 'prototype'],
	'%Generator%': ['GeneratorFunction', 'prototype'],
	'%GeneratorPrototype%': ['GeneratorFunction', 'prototype', 'prototype'],
	'%Int8ArrayPrototype%': ['Int8Array', 'prototype'],
	'%Int16ArrayPrototype%': ['Int16Array', 'prototype'],
	'%Int32ArrayPrototype%': ['Int32Array', 'prototype'],
	'%JSONParse%': ['JSON', 'parse'],
	'%JSONStringify%': ['JSON', 'stringify'],
	'%MapPrototype%': ['Map', 'prototype'],
	'%NumberPrototype%': ['Number', 'prototype'],
	'%ObjectPrototype%': ['Object', 'prototype'],
	'%ObjProto_toString%': ['Object', 'prototype', 'toString'],
	'%ObjProto_valueOf%': ['Object', 'prototype', 'valueOf'],
	'%PromisePrototype%': ['Promise', 'prototype'],
	'%PromiseProto_then%': ['Promise', 'prototype', 'then'],
	'%Promise_all%': ['Promise', 'all'],
	'%Promise_reject%': ['Promise', 'reject'],
	'%Promise_resolve%': ['Promise', 'resolve'],
	'%RangeErrorPrototype%': ['RangeError', 'prototype'],
	'%ReferenceErrorPrototype%': ['ReferenceError', 'prototype'],
	'%RegExpPrototype%': ['RegExp', 'prototype'],
	'%SetPrototype%': ['Set', 'prototype'],
	'%SharedArrayBufferPrototype%': ['SharedArrayBuffer', 'prototype'],
	'%StringPrototype%': ['String', 'prototype'],
	'%SymbolPrototype%': ['Symbol', 'prototype'],
	'%SyntaxErrorPrototype%': ['SyntaxError', 'prototype'],
	'%TypedArrayPrototype%': ['TypedArray', 'prototype'],
	'%TypeErrorPrototype%': ['TypeError', 'prototype'],
	'%Uint8ArrayPrototype%': ['Uint8Array', 'prototype'],
	'%Uint8ClampedArrayPrototype%': ['Uint8ClampedArray', 'prototype'],
	'%Uint16ArrayPrototype%': ['Uint16Array', 'prototype'],
	'%Uint32ArrayPrototype%': ['Uint32Array', 'prototype'],
	'%URIErrorPrototype%': ['URIError', 'prototype'],
	'%WeakMapPrototype%': ['WeakMap', 'prototype'],
	'%WeakSetPrototype%': ['WeakSet', 'prototype']
};

var bind = require('function-bind');
var hasOwn = require('has');
var $concat = bind.call(Function.call, Array.prototype.concat);
var $spliceApply = bind.call(Function.apply, Array.prototype.splice);
var $replace = bind.call(Function.call, String.prototype.replace);
var $strSlice = bind.call(Function.call, String.prototype.slice);
var $exec = bind.call(Function.call, RegExp.prototype.exec);

/* adapted from https://github.com/lodash/lodash/blob/4.17.15/dist/lodash.js#L6735-L6744 */
var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
var reEscapeChar = /\\(\\)?/g; /** Used to match backslashes in property paths. */
var stringToPath = function stringToPath(string) {
	var first = $strSlice(string, 0, 1);
	var last = $strSlice(string, -1);
	if (first === '%' && last !== '%') {
		throw new $SyntaxError('invalid intrinsic syntax, expected closing `%`');
	} else if (last === '%' && first !== '%') {
		throw new $SyntaxError('invalid intrinsic syntax, expected opening `%`');
	}
	var result = [];
	$replace(string, rePropName, function (match, number, quote, subString) {
		result[result.length] = quote ? $replace(subString, reEscapeChar, '$1') : number || match;
	});
	return result;
};
/* end adaptation */

var getBaseIntrinsic = function getBaseIntrinsic(name, allowMissing) {
	var intrinsicName = name;
	var alias;
	if (hasOwn(LEGACY_ALIASES, intrinsicName)) {
		alias = LEGACY_ALIASES[intrinsicName];
		intrinsicName = '%' + alias[0] + '%';
	}

	if (hasOwn(INTRINSICS, intrinsicName)) {
		var value = INTRINSICS[intrinsicName];
		if (value === needsEval) {
			value = doEval(intrinsicName);
		}
		if (typeof value === 'undefined' && !allowMissing) {
			throw new $TypeError('intrinsic ' + name + ' exists, but is not available. Please file an issue!');
		}

		return {
			alias: alias,
			name: intrinsicName,
			value: value
		};
	}

	throw new $SyntaxError('intrinsic ' + name + ' does not exist!');
};

module.exports = function GetIntrinsic(name, allowMissing) {
	if (typeof name !== 'string' || name.length === 0) {
		throw new $TypeError('intrinsic name must be a non-empty string');
	}
	if (arguments.length > 1 && typeof allowMissing !== 'boolean') {
		throw new $TypeError('"allowMissing" argument must be a boolean');
	}

	if ($exec(/^%?[^%]*%?$/, name) === null) {
		throw new $SyntaxError('`%` may not be present anywhere but at the beginning and end of the intrinsic name');
	}
	var parts = stringToPath(name);
	var intrinsicBaseName = parts.length > 0 ? parts[0] : '';

	var intrinsic = getBaseIntrinsic('%' + intrinsicBaseName + '%', allowMissing);
	var intrinsicRealName = intrinsic.name;
	var value = intrinsic.value;
	var skipFurtherCaching = false;

	var alias = intrinsic.alias;
	if (alias) {
		intrinsicBaseName = alias[0];
		$spliceApply(parts, $concat([0, 1], alias));
	}

	for (var i = 1, isOwn = true; i < parts.length; i += 1) {
		var part = parts[i];
		var first = $strSlice(part, 0, 1);
		var last = $strSlice(part, -1);
		if (
			(
				(first === '"' || first === "'" || first === '`')
				|| (last === '"' || last === "'" || last === '`')
			)
			&& first !== last
		) {
			throw new $SyntaxError('property names with quotes must have matching quotes');
		}
		if (part === 'constructor' || !isOwn) {
			skipFurtherCaching = true;
		}

		intrinsicBaseName += '.' + part;
		intrinsicRealName = '%' + intrinsicBaseName + '%';

		if (hasOwn(INTRINSICS, intrinsicRealName)) {
			value = INTRINSICS[intrinsicRealName];
		} else if (value != null) {
			if (!(part in value)) {
				if (!allowMissing) {
					throw new $TypeError('base intrinsic for ' + name + ' exists, but the property is not available.');
				}
				return void undefined;
			}
			if ($gOPD && (i + 1) >= parts.length) {
				var desc = $gOPD(value, part);
				isOwn = !!desc;

				// By convention, when a data property is converted to an accessor
				// property to emulate a data property that does not suffer from
				// the override mistake, that accessor's getter is marked with
				// an `originalValue` property. Here, when we detect this, we
				// uphold the illusion by pretending to see that original data
				// property, i.e., returning the value rather than the getter
				// itself.
				if (isOwn && 'get' in desc && !('originalValue' in desc.get)) {
					value = desc.get;
				} else {
					value = value[part];
				}
			} else {
				isOwn = hasOwn(value, part);
				value = value[part];
			}

			if (isOwn && !skipFurtherCaching) {
				INTRINSICS[intrinsicRealName] = value;
			}
		}
	}
	return value;
};

},{"function-bind":9,"has":15,"has-symbols":12}],11:[function(require,module,exports){
'use strict';

var GetIntrinsic = require('get-intrinsic');

var $gOPD = GetIntrinsic('%Object.getOwnPropertyDescriptor%', true);

if ($gOPD) {
	try {
		$gOPD([], 'length');
	} catch (e) {
		// IE 8 has a broken gOPD
		$gOPD = null;
	}
}

module.exports = $gOPD;

},{"get-intrinsic":10}],12:[function(require,module,exports){
'use strict';

var origSymbol = typeof Symbol !== 'undefined' && Symbol;
var hasSymbolSham = require('./shams');

module.exports = function hasNativeSymbols() {
	if (typeof origSymbol !== 'function') { return false; }
	if (typeof Symbol !== 'function') { return false; }
	if (typeof origSymbol('foo') !== 'symbol') { return false; }
	if (typeof Symbol('bar') !== 'symbol') { return false; }

	return hasSymbolSham();
};

},{"./shams":13}],13:[function(require,module,exports){
'use strict';

/* eslint complexity: [2, 18], max-statements: [2, 33] */
module.exports = function hasSymbols() {
	if (typeof Symbol !== 'function' || typeof Object.getOwnPropertySymbols !== 'function') { return false; }
	if (typeof Symbol.iterator === 'symbol') { return true; }

	var obj = {};
	var sym = Symbol('test');
	var symObj = Object(sym);
	if (typeof sym === 'string') { return false; }

	if (Object.prototype.toString.call(sym) !== '[object Symbol]') { return false; }
	if (Object.prototype.toString.call(symObj) !== '[object Symbol]') { return false; }

	// temp disabled per https://github.com/ljharb/object.assign/issues/17
	// if (sym instanceof Symbol) { return false; }
	// temp disabled per https://github.com/WebReflection/get-own-property-symbols/issues/4
	// if (!(symObj instanceof Symbol)) { return false; }

	// if (typeof Symbol.prototype.toString !== 'function') { return false; }
	// if (String(sym) !== Symbol.prototype.toString.call(sym)) { return false; }

	var symVal = 42;
	obj[sym] = symVal;
	for (sym in obj) { return false; } // eslint-disable-line no-restricted-syntax, no-unreachable-loop
	if (typeof Object.keys === 'function' && Object.keys(obj).length !== 0) { return false; }

	if (typeof Object.getOwnPropertyNames === 'function' && Object.getOwnPropertyNames(obj).length !== 0) { return false; }

	var syms = Object.getOwnPropertySymbols(obj);
	if (syms.length !== 1 || syms[0] !== sym) { return false; }

	if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) { return false; }

	if (typeof Object.getOwnPropertyDescriptor === 'function') {
		var descriptor = Object.getOwnPropertyDescriptor(obj, sym);
		if (descriptor.value !== symVal || descriptor.enumerable !== true) { return false; }
	}

	return true;
};

},{}],14:[function(require,module,exports){
'use strict';

var hasSymbols = require('has-symbols/shams');

module.exports = function hasToStringTagShams() {
	return hasSymbols() && !!Symbol.toStringTag;
};

},{"has-symbols/shams":13}],15:[function(require,module,exports){
'use strict';

var bind = require('function-bind');

module.exports = bind.call(Function.call, Object.prototype.hasOwnProperty);

},{"function-bind":9}],16:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],17:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      })
    }
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      var TempCtor = function () {}
      TempCtor.prototype = superCtor.prototype
      ctor.prototype = new TempCtor()
      ctor.prototype.constructor = ctor
    }
  }
}

},{}],18:[function(require,module,exports){
'use strict';

var hasToStringTag = require('has-tostringtag/shams')();
var callBound = require('call-bind/callBound');

var $toString = callBound('Object.prototype.toString');

var isStandardArguments = function isArguments(value) {
	if (hasToStringTag && value && typeof value === 'object' && Symbol.toStringTag in value) {
		return false;
	}
	return $toString(value) === '[object Arguments]';
};

var isLegacyArguments = function isArguments(value) {
	if (isStandardArguments(value)) {
		return true;
	}
	return value !== null &&
		typeof value === 'object' &&
		typeof value.length === 'number' &&
		value.length >= 0 &&
		$toString(value) !== '[object Array]' &&
		$toString(value.callee) === '[object Function]';
};

var supportsStandardArguments = (function () {
	return isStandardArguments(arguments);
}());

isStandardArguments.isLegacyArguments = isLegacyArguments; // for tests

module.exports = supportsStandardArguments ? isStandardArguments : isLegacyArguments;

},{"call-bind/callBound":5,"has-tostringtag/shams":14}],19:[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],20:[function(require,module,exports){
'use strict';

var fnToStr = Function.prototype.toString;
var reflectApply = typeof Reflect === 'object' && Reflect !== null && Reflect.apply;
var badArrayLike;
var isCallableMarker;
if (typeof reflectApply === 'function' && typeof Object.defineProperty === 'function') {
	try {
		badArrayLike = Object.defineProperty({}, 'length', {
			get: function () {
				throw isCallableMarker;
			}
		});
		isCallableMarker = {};
		// eslint-disable-next-line no-throw-literal
		reflectApply(function () { throw 42; }, null, badArrayLike);
	} catch (_) {
		if (_ !== isCallableMarker) {
			reflectApply = null;
		}
	}
} else {
	reflectApply = null;
}

var constructorRegex = /^\s*class\b/;
var isES6ClassFn = function isES6ClassFunction(value) {
	try {
		var fnStr = fnToStr.call(value);
		return constructorRegex.test(fnStr);
	} catch (e) {
		return false; // not a function
	}
};

var tryFunctionObject = function tryFunctionToStr(value) {
	try {
		if (isES6ClassFn(value)) { return false; }
		fnToStr.call(value);
		return true;
	} catch (e) {
		return false;
	}
};
var toStr = Object.prototype.toString;
var objectClass = '[object Object]';
var fnClass = '[object Function]';
var genClass = '[object GeneratorFunction]';
var ddaClass = '[object HTMLAllCollection]'; // IE 11
var ddaClass2 = '[object HTML document.all class]';
var ddaClass3 = '[object HTMLCollection]'; // IE 9-10
var hasToStringTag = typeof Symbol === 'function' && !!Symbol.toStringTag; // better: use `has-tostringtag`

var isIE68 = !(0 in [,]); // eslint-disable-line no-sparse-arrays, comma-spacing

var isDDA = function isDocumentDotAll() { return false; };
if (typeof document === 'object') {
	// Firefox 3 canonicalizes DDA to undefined when it's not accessed directly
	var all = document.all;
	if (toStr.call(all) === toStr.call(document.all)) {
		isDDA = function isDocumentDotAll(value) {
			/* globals document: false */
			// in IE 6-8, typeof document.all is "object" and it's truthy
			if ((isIE68 || !value) && (typeof value === 'undefined' || typeof value === 'object')) {
				try {
					var str = toStr.call(value);
					return (
						str === ddaClass
						|| str === ddaClass2
						|| str === ddaClass3 // opera 12.16
						|| str === objectClass // IE 6-8
					) && value('') == null; // eslint-disable-line eqeqeq
				} catch (e) { /**/ }
			}
			return false;
		};
	}
}

module.exports = reflectApply
	? function isCallable(value) {
		if (isDDA(value)) { return true; }
		if (!value) { return false; }
		if (typeof value !== 'function' && typeof value !== 'object') { return false; }
		try {
			reflectApply(value, null, badArrayLike);
		} catch (e) {
			if (e !== isCallableMarker) { return false; }
		}
		return !isES6ClassFn(value) && tryFunctionObject(value);
	}
	: function isCallable(value) {
		if (isDDA(value)) { return true; }
		if (!value) { return false; }
		if (typeof value !== 'function' && typeof value !== 'object') { return false; }
		if (hasToStringTag) { return tryFunctionObject(value); }
		if (isES6ClassFn(value)) { return false; }
		var strClass = toStr.call(value);
		if (strClass !== fnClass && strClass !== genClass && !(/^\[object HTML/).test(strClass)) { return false; }
		return tryFunctionObject(value);
	};

},{}],21:[function(require,module,exports){
'use strict';

var toStr = Object.prototype.toString;
var fnToStr = Function.prototype.toString;
var isFnRegex = /^\s*(?:function)?\*/;
var hasToStringTag = require('has-tostringtag/shams')();
var getProto = Object.getPrototypeOf;
var getGeneratorFunc = function () { // eslint-disable-line consistent-return
	if (!hasToStringTag) {
		return false;
	}
	try {
		return Function('return function*() {}')();
	} catch (e) {
	}
};
var GeneratorFunction;

module.exports = function isGeneratorFunction(fn) {
	if (typeof fn !== 'function') {
		return false;
	}
	if (isFnRegex.test(fnToStr.call(fn))) {
		return true;
	}
	if (!hasToStringTag) {
		var str = toStr.call(fn);
		return str === '[object GeneratorFunction]';
	}
	if (!getProto) {
		return false;
	}
	if (typeof GeneratorFunction === 'undefined') {
		var generatorFunc = getGeneratorFunc();
		GeneratorFunction = generatorFunc ? getProto(generatorFunc) : false;
	}
	return getProto(fn) === GeneratorFunction;
};

},{"has-tostringtag/shams":14}],22:[function(require,module,exports){
'use strict';

var whichTypedArray = require('which-typed-array');

module.exports = function isTypedArray(value) {
	return !!whichTypedArray(value);
};

},{"which-typed-array":28}],23:[function(require,module,exports){
(function (process){(function (){
// 'path' module extracted from Node.js v8.11.1 (only the posix part)
// transplited with Babel

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

function assertPath(path) {
  if (typeof path !== 'string') {
    throw new TypeError('Path must be a string. Received ' + JSON.stringify(path));
  }
}

// Resolves . and .. elements in a path with directory names
function normalizeStringPosix(path, allowAboveRoot) {
  var res = '';
  var lastSegmentLength = 0;
  var lastSlash = -1;
  var dots = 0;
  var code;
  for (var i = 0; i <= path.length; ++i) {
    if (i < path.length)
      code = path.charCodeAt(i);
    else if (code === 47 /*/*/)
      break;
    else
      code = 47 /*/*/;
    if (code === 47 /*/*/) {
      if (lastSlash === i - 1 || dots === 1) {
        // NOOP
      } else if (lastSlash !== i - 1 && dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 /*.*/ || res.charCodeAt(res.length - 2) !== 46 /*.*/) {
          if (res.length > 2) {
            var lastSlashIndex = res.lastIndexOf('/');
            if (lastSlashIndex !== res.length - 1) {
              if (lastSlashIndex === -1) {
                res = '';
                lastSegmentLength = 0;
              } else {
                res = res.slice(0, lastSlashIndex);
                lastSegmentLength = res.length - 1 - res.lastIndexOf('/');
              }
              lastSlash = i;
              dots = 0;
              continue;
            }
          } else if (res.length === 2 || res.length === 1) {
            res = '';
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0)
            res += '/..';
          else
            res = '..';
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0)
          res += '/' + path.slice(lastSlash + 1, i);
        else
          res = path.slice(lastSlash + 1, i);
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === 46 /*.*/ && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}

function _format(sep, pathObject) {
  var dir = pathObject.dir || pathObject.root;
  var base = pathObject.base || (pathObject.name || '') + (pathObject.ext || '');
  if (!dir) {
    return base;
  }
  if (dir === pathObject.root) {
    return dir + base;
  }
  return dir + sep + base;
}

var posix = {
  // path.resolve([from ...], to)
  resolve: function resolve() {
    var resolvedPath = '';
    var resolvedAbsolute = false;
    var cwd;

    for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path;
      if (i >= 0)
        path = arguments[i];
      else {
        if (cwd === undefined)
          cwd = process.cwd();
        path = cwd;
      }

      assertPath(path);

      // Skip empty entries
      if (path.length === 0) {
        continue;
      }

      resolvedPath = path + '/' + resolvedPath;
      resolvedAbsolute = path.charCodeAt(0) === 47 /*/*/;
    }

    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when process.cwd() fails)

    // Normalize the path
    resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute);

    if (resolvedAbsolute) {
      if (resolvedPath.length > 0)
        return '/' + resolvedPath;
      else
        return '/';
    } else if (resolvedPath.length > 0) {
      return resolvedPath;
    } else {
      return '.';
    }
  },

  normalize: function normalize(path) {
    assertPath(path);

    if (path.length === 0) return '.';

    var isAbsolute = path.charCodeAt(0) === 47 /*/*/;
    var trailingSeparator = path.charCodeAt(path.length - 1) === 47 /*/*/;

    // Normalize the path
    path = normalizeStringPosix(path, !isAbsolute);

    if (path.length === 0 && !isAbsolute) path = '.';
    if (path.length > 0 && trailingSeparator) path += '/';

    if (isAbsolute) return '/' + path;
    return path;
  },

  isAbsolute: function isAbsolute(path) {
    assertPath(path);
    return path.length > 0 && path.charCodeAt(0) === 47 /*/*/;
  },

  join: function join() {
    if (arguments.length === 0)
      return '.';
    var joined;
    for (var i = 0; i < arguments.length; ++i) {
      var arg = arguments[i];
      assertPath(arg);
      if (arg.length > 0) {
        if (joined === undefined)
          joined = arg;
        else
          joined += '/' + arg;
      }
    }
    if (joined === undefined)
      return '.';
    return posix.normalize(joined);
  },

  relative: function relative(from, to) {
    assertPath(from);
    assertPath(to);

    if (from === to) return '';

    from = posix.resolve(from);
    to = posix.resolve(to);

    if (from === to) return '';

    // Trim any leading backslashes
    var fromStart = 1;
    for (; fromStart < from.length; ++fromStart) {
      if (from.charCodeAt(fromStart) !== 47 /*/*/)
        break;
    }
    var fromEnd = from.length;
    var fromLen = fromEnd - fromStart;

    // Trim any leading backslashes
    var toStart = 1;
    for (; toStart < to.length; ++toStart) {
      if (to.charCodeAt(toStart) !== 47 /*/*/)
        break;
    }
    var toEnd = to.length;
    var toLen = toEnd - toStart;

    // Compare paths to find the longest common path from root
    var length = fromLen < toLen ? fromLen : toLen;
    var lastCommonSep = -1;
    var i = 0;
    for (; i <= length; ++i) {
      if (i === length) {
        if (toLen > length) {
          if (to.charCodeAt(toStart + i) === 47 /*/*/) {
            // We get here if `from` is the exact base path for `to`.
            // For example: from='/foo/bar'; to='/foo/bar/baz'
            return to.slice(toStart + i + 1);
          } else if (i === 0) {
            // We get here if `from` is the root
            // For example: from='/'; to='/foo'
            return to.slice(toStart + i);
          }
        } else if (fromLen > length) {
          if (from.charCodeAt(fromStart + i) === 47 /*/*/) {
            // We get here if `to` is the exact base path for `from`.
            // For example: from='/foo/bar/baz'; to='/foo/bar'
            lastCommonSep = i;
          } else if (i === 0) {
            // We get here if `to` is the root.
            // For example: from='/foo'; to='/'
            lastCommonSep = 0;
          }
        }
        break;
      }
      var fromCode = from.charCodeAt(fromStart + i);
      var toCode = to.charCodeAt(toStart + i);
      if (fromCode !== toCode)
        break;
      else if (fromCode === 47 /*/*/)
        lastCommonSep = i;
    }

    var out = '';
    // Generate the relative path based on the path difference between `to`
    // and `from`
    for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
      if (i === fromEnd || from.charCodeAt(i) === 47 /*/*/) {
        if (out.length === 0)
          out += '..';
        else
          out += '/..';
      }
    }

    // Lastly, append the rest of the destination (`to`) path that comes after
    // the common path parts
    if (out.length > 0)
      return out + to.slice(toStart + lastCommonSep);
    else {
      toStart += lastCommonSep;
      if (to.charCodeAt(toStart) === 47 /*/*/)
        ++toStart;
      return to.slice(toStart);
    }
  },

  _makeLong: function _makeLong(path) {
    return path;
  },

  dirname: function dirname(path) {
    assertPath(path);
    if (path.length === 0) return '.';
    var code = path.charCodeAt(0);
    var hasRoot = code === 47 /*/*/;
    var end = -1;
    var matchedSlash = true;
    for (var i = path.length - 1; i >= 1; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          if (!matchedSlash) {
            end = i;
            break;
          }
        } else {
        // We saw the first non-path separator
        matchedSlash = false;
      }
    }

    if (end === -1) return hasRoot ? '/' : '.';
    if (hasRoot && end === 1) return '//';
    return path.slice(0, end);
  },

  basename: function basename(path, ext) {
    if (ext !== undefined && typeof ext !== 'string') throw new TypeError('"ext" argument must be a string');
    assertPath(path);

    var start = 0;
    var end = -1;
    var matchedSlash = true;
    var i;

    if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
      if (ext.length === path.length && ext === path) return '';
      var extIdx = ext.length - 1;
      var firstNonSlashEnd = -1;
      for (i = path.length - 1; i >= 0; --i) {
        var code = path.charCodeAt(i);
        if (code === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else {
          if (firstNonSlashEnd === -1) {
            // We saw the first non-path separator, remember this index in case
            // we need it if the extension ends up not matching
            matchedSlash = false;
            firstNonSlashEnd = i + 1;
          }
          if (extIdx >= 0) {
            // Try to match the explicit extension
            if (code === ext.charCodeAt(extIdx)) {
              if (--extIdx === -1) {
                // We matched the extension, so mark this as the end of our path
                // component
                end = i;
              }
            } else {
              // Extension does not match, so our result is the entire path
              // component
              extIdx = -1;
              end = firstNonSlashEnd;
            }
          }
        }
      }

      if (start === end) end = firstNonSlashEnd;else if (end === -1) end = path.length;
      return path.slice(start, end);
    } else {
      for (i = path.length - 1; i >= 0; --i) {
        if (path.charCodeAt(i) === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else if (end === -1) {
          // We saw the first non-path separator, mark this as the end of our
          // path component
          matchedSlash = false;
          end = i + 1;
        }
      }

      if (end === -1) return '';
      return path.slice(start, end);
    }
  },

  extname: function extname(path) {
    assertPath(path);
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;
    for (var i = path.length - 1; i >= 0; --i) {
      var code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1)
            startDot = i;
          else if (preDotState !== 1)
            preDotState = 1;
      } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
        // We saw a non-dot character immediately before the dot
        preDotState === 0 ||
        // The (right-most) trimmed path component is exactly '..'
        preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      return '';
    }
    return path.slice(startDot, end);
  },

  format: function format(pathObject) {
    if (pathObject === null || typeof pathObject !== 'object') {
      throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
    }
    return _format('/', pathObject);
  },

  parse: function parse(path) {
    assertPath(path);

    var ret = { root: '', dir: '', base: '', ext: '', name: '' };
    if (path.length === 0) return ret;
    var code = path.charCodeAt(0);
    var isAbsolute = code === 47 /*/*/;
    var start;
    if (isAbsolute) {
      ret.root = '/';
      start = 1;
    } else {
      start = 0;
    }
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    var i = path.length - 1;

    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;

    // Get non-dir info
    for (; i >= start; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1) startDot = i;else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
    // We saw a non-dot character immediately before the dot
    preDotState === 0 ||
    // The (right-most) trimmed path component is exactly '..'
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      if (end !== -1) {
        if (startPart === 0 && isAbsolute) ret.base = ret.name = path.slice(1, end);else ret.base = ret.name = path.slice(startPart, end);
      }
    } else {
      if (startPart === 0 && isAbsolute) {
        ret.name = path.slice(1, startDot);
        ret.base = path.slice(1, end);
      } else {
        ret.name = path.slice(startPart, startDot);
        ret.base = path.slice(startPart, end);
      }
      ret.ext = path.slice(startDot, end);
    }

    if (startPart > 0) ret.dir = path.slice(0, startPart - 1);else if (isAbsolute) ret.dir = '/';

    return ret;
  },

  sep: '/',
  delimiter: ':',
  win32: null,
  posix: null
};

posix.posix = posix;

module.exports = posix;

}).call(this)}).call(this,require('_process'))

},{"_process":24}],24:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],25:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],26:[function(require,module,exports){
// Currently in sync with Node.js lib/internal/util/types.js
// https://github.com/nodejs/node/commit/112cc7c27551254aa2b17098fb774867f05ed0d9

'use strict';

var isArgumentsObject = require('is-arguments');
var isGeneratorFunction = require('is-generator-function');
var whichTypedArray = require('which-typed-array');
var isTypedArray = require('is-typed-array');

function uncurryThis(f) {
  return f.call.bind(f);
}

var BigIntSupported = typeof BigInt !== 'undefined';
var SymbolSupported = typeof Symbol !== 'undefined';

var ObjectToString = uncurryThis(Object.prototype.toString);

var numberValue = uncurryThis(Number.prototype.valueOf);
var stringValue = uncurryThis(String.prototype.valueOf);
var booleanValue = uncurryThis(Boolean.prototype.valueOf);

if (BigIntSupported) {
  var bigIntValue = uncurryThis(BigInt.prototype.valueOf);
}

if (SymbolSupported) {
  var symbolValue = uncurryThis(Symbol.prototype.valueOf);
}

function checkBoxedPrimitive(value, prototypeValueOf) {
  if (typeof value !== 'object') {
    return false;
  }
  try {
    prototypeValueOf(value);
    return true;
  } catch(e) {
    return false;
  }
}

exports.isArgumentsObject = isArgumentsObject;
exports.isGeneratorFunction = isGeneratorFunction;
exports.isTypedArray = isTypedArray;

// Taken from here and modified for better browser support
// https://github.com/sindresorhus/p-is-promise/blob/cda35a513bda03f977ad5cde3a079d237e82d7ef/index.js
function isPromise(input) {
	return (
		(
			typeof Promise !== 'undefined' &&
			input instanceof Promise
		) ||
		(
			input !== null &&
			typeof input === 'object' &&
			typeof input.then === 'function' &&
			typeof input.catch === 'function'
		)
	);
}
exports.isPromise = isPromise;

function isArrayBufferView(value) {
  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView) {
    return ArrayBuffer.isView(value);
  }

  return (
    isTypedArray(value) ||
    isDataView(value)
  );
}
exports.isArrayBufferView = isArrayBufferView;


function isUint8Array(value) {
  return whichTypedArray(value) === 'Uint8Array';
}
exports.isUint8Array = isUint8Array;

function isUint8ClampedArray(value) {
  return whichTypedArray(value) === 'Uint8ClampedArray';
}
exports.isUint8ClampedArray = isUint8ClampedArray;

function isUint16Array(value) {
  return whichTypedArray(value) === 'Uint16Array';
}
exports.isUint16Array = isUint16Array;

function isUint32Array(value) {
  return whichTypedArray(value) === 'Uint32Array';
}
exports.isUint32Array = isUint32Array;

function isInt8Array(value) {
  return whichTypedArray(value) === 'Int8Array';
}
exports.isInt8Array = isInt8Array;

function isInt16Array(value) {
  return whichTypedArray(value) === 'Int16Array';
}
exports.isInt16Array = isInt16Array;

function isInt32Array(value) {
  return whichTypedArray(value) === 'Int32Array';
}
exports.isInt32Array = isInt32Array;

function isFloat32Array(value) {
  return whichTypedArray(value) === 'Float32Array';
}
exports.isFloat32Array = isFloat32Array;

function isFloat64Array(value) {
  return whichTypedArray(value) === 'Float64Array';
}
exports.isFloat64Array = isFloat64Array;

function isBigInt64Array(value) {
  return whichTypedArray(value) === 'BigInt64Array';
}
exports.isBigInt64Array = isBigInt64Array;

function isBigUint64Array(value) {
  return whichTypedArray(value) === 'BigUint64Array';
}
exports.isBigUint64Array = isBigUint64Array;

function isMapToString(value) {
  return ObjectToString(value) === '[object Map]';
}
isMapToString.working = (
  typeof Map !== 'undefined' &&
  isMapToString(new Map())
);

function isMap(value) {
  if (typeof Map === 'undefined') {
    return false;
  }

  return isMapToString.working
    ? isMapToString(value)
    : value instanceof Map;
}
exports.isMap = isMap;

function isSetToString(value) {
  return ObjectToString(value) === '[object Set]';
}
isSetToString.working = (
  typeof Set !== 'undefined' &&
  isSetToString(new Set())
);
function isSet(value) {
  if (typeof Set === 'undefined') {
    return false;
  }

  return isSetToString.working
    ? isSetToString(value)
    : value instanceof Set;
}
exports.isSet = isSet;

function isWeakMapToString(value) {
  return ObjectToString(value) === '[object WeakMap]';
}
isWeakMapToString.working = (
  typeof WeakMap !== 'undefined' &&
  isWeakMapToString(new WeakMap())
);
function isWeakMap(value) {
  if (typeof WeakMap === 'undefined') {
    return false;
  }

  return isWeakMapToString.working
    ? isWeakMapToString(value)
    : value instanceof WeakMap;
}
exports.isWeakMap = isWeakMap;

function isWeakSetToString(value) {
  return ObjectToString(value) === '[object WeakSet]';
}
isWeakSetToString.working = (
  typeof WeakSet !== 'undefined' &&
  isWeakSetToString(new WeakSet())
);
function isWeakSet(value) {
  return isWeakSetToString(value);
}
exports.isWeakSet = isWeakSet;

function isArrayBufferToString(value) {
  return ObjectToString(value) === '[object ArrayBuffer]';
}
isArrayBufferToString.working = (
  typeof ArrayBuffer !== 'undefined' &&
  isArrayBufferToString(new ArrayBuffer())
);
function isArrayBuffer(value) {
  if (typeof ArrayBuffer === 'undefined') {
    return false;
  }

  return isArrayBufferToString.working
    ? isArrayBufferToString(value)
    : value instanceof ArrayBuffer;
}
exports.isArrayBuffer = isArrayBuffer;

function isDataViewToString(value) {
  return ObjectToString(value) === '[object DataView]';
}
isDataViewToString.working = (
  typeof ArrayBuffer !== 'undefined' &&
  typeof DataView !== 'undefined' &&
  isDataViewToString(new DataView(new ArrayBuffer(1), 0, 1))
);
function isDataView(value) {
  if (typeof DataView === 'undefined') {
    return false;
  }

  return isDataViewToString.working
    ? isDataViewToString(value)
    : value instanceof DataView;
}
exports.isDataView = isDataView;

// Store a copy of SharedArrayBuffer in case it's deleted elsewhere
var SharedArrayBufferCopy = typeof SharedArrayBuffer !== 'undefined' ? SharedArrayBuffer : undefined;
function isSharedArrayBufferToString(value) {
  return ObjectToString(value) === '[object SharedArrayBuffer]';
}
function isSharedArrayBuffer(value) {
  if (typeof SharedArrayBufferCopy === 'undefined') {
    return false;
  }

  if (typeof isSharedArrayBufferToString.working === 'undefined') {
    isSharedArrayBufferToString.working = isSharedArrayBufferToString(new SharedArrayBufferCopy());
  }

  return isSharedArrayBufferToString.working
    ? isSharedArrayBufferToString(value)
    : value instanceof SharedArrayBufferCopy;
}
exports.isSharedArrayBuffer = isSharedArrayBuffer;

function isAsyncFunction(value) {
  return ObjectToString(value) === '[object AsyncFunction]';
}
exports.isAsyncFunction = isAsyncFunction;

function isMapIterator(value) {
  return ObjectToString(value) === '[object Map Iterator]';
}
exports.isMapIterator = isMapIterator;

function isSetIterator(value) {
  return ObjectToString(value) === '[object Set Iterator]';
}
exports.isSetIterator = isSetIterator;

function isGeneratorObject(value) {
  return ObjectToString(value) === '[object Generator]';
}
exports.isGeneratorObject = isGeneratorObject;

function isWebAssemblyCompiledModule(value) {
  return ObjectToString(value) === '[object WebAssembly.Module]';
}
exports.isWebAssemblyCompiledModule = isWebAssemblyCompiledModule;

function isNumberObject(value) {
  return checkBoxedPrimitive(value, numberValue);
}
exports.isNumberObject = isNumberObject;

function isStringObject(value) {
  return checkBoxedPrimitive(value, stringValue);
}
exports.isStringObject = isStringObject;

function isBooleanObject(value) {
  return checkBoxedPrimitive(value, booleanValue);
}
exports.isBooleanObject = isBooleanObject;

function isBigIntObject(value) {
  return BigIntSupported && checkBoxedPrimitive(value, bigIntValue);
}
exports.isBigIntObject = isBigIntObject;

function isSymbolObject(value) {
  return SymbolSupported && checkBoxedPrimitive(value, symbolValue);
}
exports.isSymbolObject = isSymbolObject;

function isBoxedPrimitive(value) {
  return (
    isNumberObject(value) ||
    isStringObject(value) ||
    isBooleanObject(value) ||
    isBigIntObject(value) ||
    isSymbolObject(value)
  );
}
exports.isBoxedPrimitive = isBoxedPrimitive;

function isAnyArrayBuffer(value) {
  return typeof Uint8Array !== 'undefined' && (
    isArrayBuffer(value) ||
    isSharedArrayBuffer(value)
  );
}
exports.isAnyArrayBuffer = isAnyArrayBuffer;

['isProxy', 'isExternal', 'isModuleNamespaceObject'].forEach(function(method) {
  Object.defineProperty(exports, method, {
    enumerable: false,
    value: function() {
      throw new Error(method + ' is not supported in userland');
    }
  });
});

},{"is-arguments":18,"is-generator-function":21,"is-typed-array":22,"which-typed-array":28}],27:[function(require,module,exports){
(function (process){(function (){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors ||
  function getOwnPropertyDescriptors(obj) {
    var keys = Object.keys(obj);
    var descriptors = {};
    for (var i = 0; i < keys.length; i++) {
      descriptors[keys[i]] = Object.getOwnPropertyDescriptor(obj, keys[i]);
    }
    return descriptors;
  };

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  if (typeof process !== 'undefined' && process.noDeprecation === true) {
    return fn;
  }

  // Allow for deprecating things in the process of starting up.
  if (typeof process === 'undefined') {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnvRegex = /^$/;

if (process.env.NODE_DEBUG) {
  var debugEnv = process.env.NODE_DEBUG;
  debugEnv = debugEnv.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/,/g, '$|^')
    .toUpperCase();
  debugEnvRegex = new RegExp('^' + debugEnv + '$', 'i');
}
exports.debuglog = function(set) {
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (debugEnvRegex.test(set)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').slice(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.slice(1, -1);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
exports.types = require('./support/types');

function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;
exports.types.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;
exports.types.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;
exports.types.isNativeError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

var kCustomPromisifiedSymbol = typeof Symbol !== 'undefined' ? Symbol('util.promisify.custom') : undefined;

exports.promisify = function promisify(original) {
  if (typeof original !== 'function')
    throw new TypeError('The "original" argument must be of type Function');

  if (kCustomPromisifiedSymbol && original[kCustomPromisifiedSymbol]) {
    var fn = original[kCustomPromisifiedSymbol];
    if (typeof fn !== 'function') {
      throw new TypeError('The "util.promisify.custom" argument must be of type Function');
    }
    Object.defineProperty(fn, kCustomPromisifiedSymbol, {
      value: fn, enumerable: false, writable: false, configurable: true
    });
    return fn;
  }

  function fn() {
    var promiseResolve, promiseReject;
    var promise = new Promise(function (resolve, reject) {
      promiseResolve = resolve;
      promiseReject = reject;
    });

    var args = [];
    for (var i = 0; i < arguments.length; i++) {
      args.push(arguments[i]);
    }
    args.push(function (err, value) {
      if (err) {
        promiseReject(err);
      } else {
        promiseResolve(value);
      }
    });

    try {
      original.apply(this, args);
    } catch (err) {
      promiseReject(err);
    }

    return promise;
  }

  Object.setPrototypeOf(fn, Object.getPrototypeOf(original));

  if (kCustomPromisifiedSymbol) Object.defineProperty(fn, kCustomPromisifiedSymbol, {
    value: fn, enumerable: false, writable: false, configurable: true
  });
  return Object.defineProperties(
    fn,
    getOwnPropertyDescriptors(original)
  );
}

exports.promisify.custom = kCustomPromisifiedSymbol

function callbackifyOnRejected(reason, cb) {
  // `!reason` guard inspired by bluebird (Ref: https://goo.gl/t5IS6M).
  // Because `null` is a special error value in callbacks which means "no error
  // occurred", we error-wrap so the callback consumer can distinguish between
  // "the promise rejected with null" or "the promise fulfilled with undefined".
  if (!reason) {
    var newReason = new Error('Promise was rejected with a falsy value');
    newReason.reason = reason;
    reason = newReason;
  }
  return cb(reason);
}

function callbackify(original) {
  if (typeof original !== 'function') {
    throw new TypeError('The "original" argument must be of type Function');
  }

  // We DO NOT return the promise as it gives the user a false sense that
  // the promise is actually somehow related to the callback's execution
  // and that the callback throwing will reject the promise.
  function callbackified() {
    var args = [];
    for (var i = 0; i < arguments.length; i++) {
      args.push(arguments[i]);
    }

    var maybeCb = args.pop();
    if (typeof maybeCb !== 'function') {
      throw new TypeError('The last argument must be of type Function');
    }
    var self = this;
    var cb = function() {
      return maybeCb.apply(self, arguments);
    };
    // In true node style we process the callback on `nextTick` with all the
    // implications (stack, `uncaughtException`, `async_hooks`)
    original.apply(this, args)
      .then(function(ret) { process.nextTick(cb.bind(null, null, ret)) },
            function(rej) { process.nextTick(callbackifyOnRejected.bind(null, rej, cb)) });
  }

  Object.setPrototypeOf(callbackified, Object.getPrototypeOf(original));
  Object.defineProperties(callbackified,
                          getOwnPropertyDescriptors(original));
  return callbackified;
}
exports.callbackify = callbackify;

}).call(this)}).call(this,require('_process'))

},{"./support/isBuffer":25,"./support/types":26,"_process":24,"inherits":17}],28:[function(require,module,exports){
(function (global){(function (){
'use strict';

var forEach = require('for-each');
var availableTypedArrays = require('available-typed-arrays');
var callBind = require('call-bind');
var callBound = require('call-bind/callBound');
var gOPD = require('gopd');

var $toString = callBound('Object.prototype.toString');
var hasToStringTag = require('has-tostringtag/shams')();

var g = typeof globalThis === 'undefined' ? global : globalThis;
var typedArrays = availableTypedArrays();

var $slice = callBound('String.prototype.slice');
var getPrototypeOf = Object.getPrototypeOf; // require('getprototypeof');

var $indexOf = callBound('Array.prototype.indexOf', true) || function indexOf(array, value) {
	for (var i = 0; i < array.length; i += 1) {
		if (array[i] === value) {
			return i;
		}
	}
	return -1;
};
var cache = { __proto__: null };
if (hasToStringTag && gOPD && getPrototypeOf) {
	forEach(typedArrays, function (typedArray) {
		var arr = new g[typedArray]();
		if (Symbol.toStringTag in arr) {
			var proto = getPrototypeOf(arr);
			var descriptor = gOPD(proto, Symbol.toStringTag);
			if (!descriptor) {
				var superProto = getPrototypeOf(proto);
				descriptor = gOPD(superProto, Symbol.toStringTag);
			}
			cache['$' + typedArray] = callBind(descriptor.get);
		}
	});
} else {
	forEach(typedArrays, function (typedArray) {
		var arr = new g[typedArray]();
		cache['$' + typedArray] = callBind(arr.slice);
	});
}

var tryTypedArrays = function tryAllTypedArrays(value) {
	var found = false;
	forEach(cache, function (getter, typedArray) {
		if (!found) {
			try {
				if ('$' + getter(value) === typedArray) {
					found = $slice(typedArray, 1);
				}
			} catch (e) { /**/ }
		}
	});
	return found;
};

var trySlices = function tryAllSlices(value) {
	var found = false;
	forEach(cache, function (getter, name) {
		if (!found) {
			try {
				getter(value);
				found = $slice(name, 1);
			} catch (e) { /**/ }
		}
	});
	return found;
};

module.exports = function whichTypedArray(value) {
	if (!value || typeof value !== 'object') { return false; }
	if (!hasToStringTag) {
		var tag = $slice($toString(value), 8, -1);
		if ($indexOf(typedArrays, tag) > -1) {
			return tag;
		}
		if (tag !== 'Object') {
			return false;
		}
		// node < 0.6 hits here on real Typed Arrays
		return trySlices(value);
	}
	if (!gOPD) { return null; } // unknown engine
	return tryTypedArrays(value);
};

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"available-typed-arrays":1,"call-bind":6,"call-bind/callBound":5,"for-each":7,"gopd":11,"has-tostringtag/shams":14}],29:[function(require,module,exports){


(function() {


/* Copyright (c) 2014 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file. */

/**
 * @fileoverview Low-level DOM traversal utility functions to find the
 *     next (or previous) character, word, sentence, line, or paragraph,
 *     in a completely stateless manner without actually manipulating the
 *     selection.
 */

/**
 * A class to represent a cursor location in the document,
 * like the start position or end position of a selection range.
 *
 * Later this may be extended to support "virtual text" for an object,
 * like the ALT text for an image.
 *
 * Note: we cache the text of a particular node at the time we
 * traverse into it. Later we should add support for dynamically
 * reloading it.
 * @param {Node} node The DOM node.
 * @param {number} index The index of the character within the node.
 * @param {string} text The cached text contents of the node.
 * @constructor
 */
const Cursor = function(node, index, text) {
  this.node = node;
  this.index = index;
  this.text = text;
};

/**
 * @return {Cursor} A new cursor pointing to the same location.
 */
Cursor.prototype.clone = function() {
  return new Cursor(this.node, this.index, this.text);
};

/**
 * Modify this cursor to point to the location that another cursor points to.
 * @param {Cursor} otherCursor The cursor to copy from.
 */
Cursor.prototype.copyFrom = function(otherCursor) {
  this.node = otherCursor.node;
  this.index = otherCursor.index;
  this.text = otherCursor.text;
};

/**
 * Utility functions for stateless DOM traversal.
 * @constructor
 */
const TraverseUtil = function() {};

/**
 * Gets the text representation of a node. This allows us to substitute
 * alt text, names, or titles for html elements that provide them.
 * @param {Node} node A DOM node.
 * @return {string} A text string representation of the node.
 */
TraverseUtil.getNodeText = function(node) {
  if (node.constructor == Text) {
    return node.data;
  } else {
    return '';
  }
};

/**
 * Return true if a node should be treated as a leaf node, because
 * its children are properties of the object that shouldn't be traversed.
 *
 * TODO(dmazzoni): replace this with a predicate that detects nodes with
 * ARIA roles and other objects that have their own description.
 * For now we just detect a couple of common cases.
 *
 * @param {Node} node A DOM node.
 * @return {boolean} True if the node should be treated as a leaf node.
 */
TraverseUtil.treatAsLeafNode = function(node) {
  return node.childNodes.length == 0 ||
         node.nodeName == 'SELECT' ||
         node.nodeName == 'OBJECT';
};

/**
 * Return true only if a single character is whitespace.
 * From https://developer.mozilla.org/en/Whitespace_in_the_DOM,
 * whitespace is defined as one of the characters
 *  "\t" TAB \u0009
 *  "\n" LF  \u000A
 *  "\r" CR  \u000D
 *  " "  SPC \u0020.
 *
 * @param {string} c A string containing a single character.
 * @return {boolean} True if the character is whitespace, otherwise false.
 */
TraverseUtil.isWhitespace = function(c) {
  return (c == ' ' || c == '\n' || c == '\r' || c == '\t');
};

/**
 * Set the selection to the range between the given start and end cursors.
 * @param {Cursor} start The desired start of the selection.
 * @param {Cursor} end The desired end of the selection.
 * @return {Selection} the selection object.
 */
TraverseUtil.setSelection = function(start, end) {
  var sel = window.getSelection();
  sel.removeAllRanges();
  var range = document.createRange();
  range.setStart(start.node, start.index);
  range.setEnd(end.node, end.index);
  sel.addRange(range);

  return sel;
};

/**
 * Use the computed CSS style to figure out if this DOM node is currently
 * visible.
 * @param {Node} node A HTML DOM node.
 * @return {boolean} Whether or not the html node is visible.
 */
TraverseUtil.isVisible = function(node) {
  if (!node.style)
    return true;
  var style = window.getComputedStyle(/** @type {Element} */(node), null);
  return (!!style && style.display != 'none' && style.visibility != 'hidden');
};

/**
 * Use the class name to figure out if this DOM node should be traversed.
 * @param {Node} node A HTML DOM node.
 * @return {boolean} Whether or not the html node should be traversed.
 */
TraverseUtil.isSkipped = function(node) {
  if (node.constructor == Text)
    node = node.parentElement;
  if (node.className == 'CaretBrowsing_Caret' ||
      node.className == 'CaretBrowsing_AnimateCaret') {
    return true;
  }
  return false;
};

/**
 * Moves the cursor forwards until it has crossed exactly one character.
 * @param {Cursor} cursor The cursor location where the search should start.
 *     On exit, the cursor will be immediately to the right of the
 *     character returned.
 * @param {Array<Node>} nodesCrossed Any HTML nodes crossed between the
 *     initial and final cursor position will be pushed onto this array.
 * @return {?string} The character found, or null if the bottom of the
 *     document has been reached.
 */
TraverseUtil.forwardsChar = function(cursor, nodesCrossed) {
  while (true) {
    // Move down until we get to a leaf node.
    var childNode = null;
    if (!TraverseUtil.treatAsLeafNode(cursor.node)) {
      for (var i = cursor.index; i < cursor.node.childNodes.length; i++) {
        var node = cursor.node.childNodes[i];
        if (TraverseUtil.isSkipped(node)) {
          nodesCrossed.push(node);
          continue;
        }
        if (TraverseUtil.isVisible(node)) {
          childNode = node;
          break;
        }
      }
    }
    if (childNode) {
      cursor.node = childNode;
      cursor.index = 0;
      cursor.text = TraverseUtil.getNodeText(cursor.node);
      if (cursor.node.constructor != Text) {
        nodesCrossed.push(cursor.node);
      }
      continue;
    }

    // Return the next character from this leaf node.
    if (cursor.index < cursor.text.length)
      return cursor.text[cursor.index++];

    // Move to the next sibling, going up the tree as necessary.
    while (cursor.node != null) {
      // Try to move to the next sibling.
      var siblingNode = null;
      for (var node = cursor.node.nextSibling;
           node != null;
           node = node.nextSibling) {
        if (TraverseUtil.isSkipped(node)) {
          nodesCrossed.push(node);
          continue;
        }
        if (TraverseUtil.isVisible(node)) {
          siblingNode = node;
          break;
        }
      }
      if (siblingNode) {
        cursor.node = siblingNode;
        cursor.text = TraverseUtil.getNodeText(siblingNode);
        cursor.index = 0;

        if (cursor.node.constructor != Text) {
          nodesCrossed.push(cursor.node);
        }

        break;
      }

      // Otherwise, move to the parent.
      if (cursor.node.parentNode &&
          cursor.node.parentNode.constructor != HTMLBodyElement) {
        cursor.node = cursor.node.parentNode;
        cursor.text = null;
        cursor.index = 0;
      } else {
        return null;
      }
    }
  }
};

/**
 * Moves the cursor backwards until it has crossed exactly one character.
 * @param {Cursor} cursor The cursor location where the search should start.
 *     On exit, the cursor will be immediately to the left of the
 *     character returned.
 * @param {Array<Node>} nodesCrossed Any HTML nodes crossed between the
 *     initial and final cursor position will be pushed onto this array.
 * @return {?string} The previous character, or null if the top of the
 *     document has been reached.
 */
TraverseUtil.backwardsChar = function(cursor, nodesCrossed) {
  while (true) {
    // Move down until we get to a leaf node.
    var childNode = null;
    if (!TraverseUtil.treatAsLeafNode(cursor.node)) {
      for (var i = cursor.index - 1; i >= 0; i--) {
        var node = cursor.node.childNodes[i];
        if (TraverseUtil.isSkipped(node)) {
          nodesCrossed.push(node);
          continue;
        }
        if (TraverseUtil.isVisible(node)) {
          childNode = node;
          break;
        }
      }
    }
    if (childNode) {
      cursor.node = childNode;
      cursor.text = TraverseUtil.getNodeText(cursor.node);
      if (cursor.text.length)
        cursor.index = cursor.text.length;
      else
        cursor.index = cursor.node.childNodes.length;
      if (cursor.node.constructor != Text)
        nodesCrossed.push(cursor.node);
      continue;
    }

    // Return the previous character from this leaf node.
    if (cursor.text.length > 0 && cursor.index > 0) {
      return cursor.text[--cursor.index];
    }

    // Move to the previous sibling, going up the tree as necessary.
    while (true) {
      // Try to move to the previous sibling.
      var siblingNode = null;
      for (var node = cursor.node.previousSibling;
           node != null;
           node = node.previousSibling) {
        if (TraverseUtil.isSkipped(node)) {
          nodesCrossed.push(node);
          continue;
        }
        if (TraverseUtil.isVisible(node)) {
          siblingNode = node;
          break;
        }
      }
      if (siblingNode) {
        cursor.node = siblingNode;
        cursor.text = TraverseUtil.getNodeText(siblingNode);
        if (cursor.text.length)
          cursor.index = cursor.text.length;
        else
          cursor.index = cursor.node.childNodes.length;
        if (cursor.node.constructor != Text)
          nodesCrossed.push(cursor.node);
        break;
      }

      // Otherwise, move to the parent.
      if (cursor.node.parentNode &&
          cursor.node.parentNode.constructor != HTMLBodyElement) {
        cursor.node = cursor.node.parentNode;
        cursor.text = null;
        cursor.index = 0;
      } else {
        return null;
      }
    }
  }
};

/**
 * Finds the next character, starting from endCursor.  Upon exit, startCursor
 * and endCursor will surround the next character. If skipWhitespace is
 * true, will skip until a real character is found. Otherwise, it will
 * attempt to select all of the whitespace between the initial position
 * of endCursor and the next non-whitespace character.
 * @param {Cursor} startCursor On exit, points to the position before
 *     the char.
 * @param {Cursor} endCursor The position to start searching for the next
 *     char.  On exit, will point to the position past the char.
 * @param {Array<Node>} nodesCrossed Any HTML nodes crossed between the
 *     initial and final cursor position will be pushed onto this array.
 * @param {boolean} skipWhitespace If true, will keep scanning until a
 *     non-whitespace character is found.
 * @return {?string} The next char, or null if the bottom of the
 *     document has been reached.
 */
TraverseUtil.getNextChar = function(
    startCursor, endCursor, nodesCrossed, skipWhitespace) {

  // Save the starting position and get the first character.
  startCursor.copyFrom(endCursor);
  var c = TraverseUtil.forwardsChar(endCursor, nodesCrossed);
  if (c == null)
    return null;

  // Keep track of whether the first character was whitespace.
  var initialWhitespace = TraverseUtil.isWhitespace(c);

  // Keep scanning until we find a non-whitespace or non-skipped character.
  while ((TraverseUtil.isWhitespace(c)) ||
      (TraverseUtil.isSkipped(endCursor.node))) {
    c = TraverseUtil.forwardsChar(endCursor, nodesCrossed);
    if (c == null)
      return null;
  }
  if (skipWhitespace || !initialWhitespace) {
    // If skipWhitepace is true, or if the first character we encountered
    // was not whitespace, return that non-whitespace character.
    startCursor.copyFrom(endCursor);
    startCursor.index--;
    return c;
  }
  else {
    for (var i = 0; i < nodesCrossed.length; i++) {
      if (TraverseUtil.isSkipped(nodesCrossed[i])) {
        // We need to make sure that startCursor and endCursor aren't
        // surrounding a skippable node.
        endCursor.index--;
        startCursor.copyFrom(endCursor);
        startCursor.index--;
        return ' ';
      }
    }
    // Otherwise, return all of the whitespace before that last character.
    endCursor.index--;
    return ' ';
  }
};

/**
 * Finds the previous character, starting from startCursor.  Upon exit,
 * startCursor and endCursor will surround the previous character.
 * If skipWhitespace is true, will skip until a real character is found.
 * Otherwise, it will attempt to select all of the whitespace between
 * the initial position of endCursor and the next non-whitespace character.
 * @param {Cursor} startCursor The position to start searching for the
 *     char. On exit, will point to the position before the char.
 * @param {Cursor} endCursor The position to start searching for the next
 *     char. On exit, will point to the position past the char.
 * @param {Array<Node>} nodesCrossed Any HTML nodes crossed between the
 *     initial and final cursor position will be pushed onto this array.
 * @param {boolean} skipWhitespace If true, will keep scanning until a
 *     non-whitespace character is found.
 * @return {?string} The previous char, or null if the top of the
 *     document has been reached.
 */
TraverseUtil.getPreviousChar = function(
    startCursor, endCursor, nodesCrossed, skipWhitespace) {

  // Save the starting position and get the first character.
  endCursor.copyFrom(startCursor);
  var c = TraverseUtil.backwardsChar(startCursor, nodesCrossed);
  if (c == null)
    return null;

  // Keep track of whether the first character was whitespace.
  var initialWhitespace = TraverseUtil.isWhitespace(c);

  // Keep scanning until we find a non-whitespace or non-skipped character.
  while ((TraverseUtil.isWhitespace(c)) ||
      (TraverseUtil.isSkipped(startCursor.node))) {
    c = TraverseUtil.backwardsChar(startCursor, nodesCrossed);
    if (c == null)
      return null;
  }
  if (skipWhitespace || !initialWhitespace) {
    // If skipWhitepace is true, or if the first character we encountered
    // was not whitespace, return that non-whitespace character.
    endCursor.copyFrom(startCursor);
    endCursor.index++;
    return c;
  } else {
    for (var i = 0; i < nodesCrossed.length; i++) {
      if (TraverseUtil.isSkipped(nodesCrossed[i])) {
        startCursor.index++;
        endCursor.copyFrom(startCursor);
        endCursor.index++;
        return ' ';
      }
    }
    // Otherwise, return all of the whitespace before that last character.
    startCursor.index++;
    return ' ';
  }
};

/**
 * Finds the next word, starting from endCursor.  Upon exit, startCursor
 * and endCursor will surround the next word.  A word is defined to be
 * a string of 1 or more non-whitespace characters in the same DOM node.
 * @param {Cursor} startCursor On exit, will point to the beginning of the
 *     word returned.
 * @param {Cursor} endCursor The position to start searching for the next
 *     word.  On exit, will point to the end of the word returned.
 * @param {Array<Node>} nodesCrossed Any HTML nodes crossed between the
 *     initial and final cursor position will be pushed onto this array.
 * @return {?string} The next word, or null if the bottom of the
 *     document has been reached.
 */
TraverseUtil.getNextWord = function(startCursor, endCursor,
    nodesCrossed) {

  // Find the first non-whitespace or non-skipped character.
  var cursor = endCursor.clone();
  var c = TraverseUtil.forwardsChar(cursor, nodesCrossed);
  if (c == null)
    return null;
  while ((TraverseUtil.isWhitespace(c)) ||
      (TraverseUtil.isSkipped(cursor.node))) {
    c = TraverseUtil.forwardsChar(cursor, nodesCrossed);
    if (c == null)
      return null;
  }

  // Set startCursor to the position immediately before the first
  // character in our word. It's safe to decrement |index| because
  // forwardsChar guarantees that the cursor will be immediately to the
  // right of the returned character on exit.
  startCursor.copyFrom(cursor);
  startCursor.index--;

  // Keep building up our word until we reach a whitespace character or
  // would cross a tag.  Don't actually return any tags crossed, because this
  // word goes up until the tag boundary but not past it.
  endCursor.copyFrom(cursor);
  var word = c;
  var newNodesCrossed = [];
  c = TraverseUtil.forwardsChar(cursor, newNodesCrossed);
  if (c == null) {
    return word;
  }
  while (!TraverseUtil.isWhitespace(c) &&
     newNodesCrossed.length == 0) {
    word += c;
    endCursor.copyFrom(cursor);
    c = TraverseUtil.forwardsChar(cursor, newNodesCrossed);
    if (c == null) {
      return word;
    }
  }
  return word;
};

/**
 * Finds the previous word, starting from startCursor.  Upon exit, startCursor
 * and endCursor will surround the previous word.  A word is defined to be
 * a string of 1 or more non-whitespace characters in the same DOM node.
 * @param {Cursor} startCursor The position to start searching for the
 *     previous word.  On exit, will point to the beginning of the
 *     word returned.
 * @param {Cursor} endCursor On exit, will point to the end of the
 *     word returned.
 * @param {Array<Node>} nodesCrossed Any HTML nodes crossed between the
 *     initial and final cursor position will be pushed onto this array.
 * @return {?string} The previous word, or null if the bottom of the
 *     document has been reached.
 */
TraverseUtil.getPreviousWord = function(startCursor, endCursor,
    nodesCrossed) {
  // Find the first non-whitespace or non-skipped character.
  var cursor = startCursor.clone();
  var c = TraverseUtil.backwardsChar(cursor, nodesCrossed);
  if (c == null)
    return null;
  while ((TraverseUtil.isWhitespace(c) ||
      (TraverseUtil.isSkipped(cursor.node)))) {
    c = TraverseUtil.backwardsChar(cursor, nodesCrossed);
    if (c == null)
      return null;
  }

  // Set endCursor to the position immediately after the first
  // character we've found (the last character of the word, since we're
  // searching backwards).
  endCursor.copyFrom(cursor);
  endCursor.index++;

  // Keep building up our word until we reach a whitespace character or
  // would cross a tag.  Don't actually return any tags crossed, because this
  // word goes up until the tag boundary but not past it.
  startCursor.copyFrom(cursor);
  var word = c;
  var newNodesCrossed = [];
  c = TraverseUtil.backwardsChar(cursor, newNodesCrossed);
  if (c == null)
    return word;
  while (!TraverseUtil.isWhitespace(c) &&
      newNodesCrossed.length == 0) {
    word = c + word;
    startCursor.copyFrom(cursor);
    c = TraverseUtil.backwardsChar(cursor, newNodesCrossed);
    if (c == null)
      return word;
  }

  return word;
};

/**
 * Finds the next sentence, starting from endCursor.  Upon exit,
 * startCursor and endCursor will surround the next sentence.
 *
 * @param {Cursor} startCursor On exit, marks the beginning of the sentence.
 * @param {Cursor} endCursor The position to start searching for the next
 *     sentence.  On exit, will point to the end of the returned string.
 * @param {Array<Node>} nodesCrossed Any HTML nodes crossed between the
 *     initial and final cursor position will be pushed onto this array.
 * @param {Object} breakTags Associative array of tags that should break
 *     the sentence.
 * @return {?string} The next sentence, or null if the bottom of the
 *     document has been reached.
 */
TraverseUtil.getNextSentence = function(
    startCursor, endCursor, nodesCrossed, breakTags) {
  return TraverseUtil.getNextString(
      startCursor, endCursor, nodesCrossed,
      function(str, word, nodes) {
        if (str.substr(-1) == '.')
          return true;
        for (var i = 0; i < nodes.length; i++) {
          if (TraverseUtil.isSkipped(nodes[i])) {
            return true;
          }
          var style = window.getComputedStyle(nodes[i], null);
          if (style && (style.display != 'inline' ||
                        breakTags[nodes[i].tagName])) {
            return true;
          }
        }
        return false;
      });
};

/**
 * Finds the previous sentence, starting from startCursor.  Upon exit,
 * startCursor and endCursor will surround the previous sentence.
 *
 * @param {Cursor} startCursor The position to start searching for the next
 *     sentence.  On exit, will point to the start of the returned string.
 * @param {Cursor} endCursor On exit, the end of the returned string.
 * @param {Array<Node>} nodesCrossed Any HTML nodes crossed between the
 *     initial and final cursor position will be pushed onto this array.
 * @param {Object} breakTags Associative array of tags that should break
 *     the sentence.
 * @return {?string} The previous sentence, or null if the bottom of the
 *     document has been reached.
 */
TraverseUtil.getPreviousSentence = function(
    startCursor, endCursor, nodesCrossed, breakTags) {
  return TraverseUtil.getPreviousString(
      startCursor, endCursor, nodesCrossed,
      function(str, word, nodes) {
        if (word.substr(-1) == '.')
          return true;
        for (var i = 0; i < nodes.length; i++) {
          if (TraverseUtil.isSkipped(nodes[i])) {
            return true;
          }
          var style = window.getComputedStyle(nodes[i], null);
          if (style && (style.display != 'inline' ||
                        breakTags[nodes[i].tagName])) {
            return true;
          }
        }
        return false;
      });
};

/**
 * Finds the next line, starting from endCursor.  Upon exit,
 * startCursor and endCursor will surround the next line.
 *
 * @param {Cursor} startCursor On exit, marks the beginning of the line.
 * @param {Cursor} endCursor The position to start searching for the next
 *     line.  On exit, will point to the end of the returned string.
 * @param {Array<Node>} nodesCrossed Any HTML nodes crossed between the
 *     initial and final cursor position will be pushed onto this array.
 * @param {number} lineLength The maximum number of characters in a line.
 * @param {Object} breakTags Associative array of tags that should break
 *     the line.
 * @return {?string} The next line, or null if the bottom of the
 *     document has been reached.
 */
TraverseUtil.getNextLine = function(
    startCursor, endCursor, nodesCrossed, lineLength, breakTags) {
  return TraverseUtil.getNextString(
      startCursor, endCursor, nodesCrossed,
      function(str, word, nodes) {
        if (str.length + word.length + 1 > lineLength)
          return true;
        for (var i = 0; i < nodes.length; i++) {
          if (TraverseUtil.isSkipped(nodes[i])) {
            return true;
          }
          var style = window.getComputedStyle(nodes[i], null);
          if (style && (style.display != 'inline' ||
                        breakTags[nodes[i].tagName])) {
            return true;
          }
        }
        return false;
      });
};

/**
 * Finds the previous line, starting from startCursor.  Upon exit,
 * startCursor and endCursor will surround the previous line.
 *
 * @param {Cursor} startCursor The position to start searching for the next
 *     line.  On exit, will point to the start of the returned string.
 * @param {Cursor} endCursor On exit, the end of the returned string.
 * @param {Array<Node>} nodesCrossed Any HTML nodes crossed between the
 *     initial and final cursor position will be pushed onto this array.
 * @param {number} lineLength The maximum number of characters in a line.
 * @param {Object} breakTags Associative array of tags that should break
 *     the sentence.
 *  @return {?string} The previous line, or null if the bottom of the
 *     document has been reached.
 */
TraverseUtil.getPreviousLine = function(
    startCursor, endCursor, nodesCrossed, lineLength, breakTags) {
  return TraverseUtil.getPreviousString(
      startCursor, endCursor, nodesCrossed,
      function(str, word, nodes) {
        if (str.length + word.length + 1 > lineLength)
          return true;
        for (var i = 0; i < nodes.length; i++) {
          if (TraverseUtil.isSkipped(nodes[i])) {
            return true;
          }
          var style = window.getComputedStyle(nodes[i], null);
          if (style && (style.display != 'inline' ||
                        breakTags[nodes[i].tagName])) {
            return true;
          }
        }
        return false;
      });
};

/**
 * Finds the next paragraph, starting from endCursor.  Upon exit,
 * startCursor and endCursor will surround the next paragraph.
 *
 * @param {Cursor} startCursor On exit, marks the beginning of the paragraph.
 * @param {Cursor} endCursor The position to start searching for the next
 *     paragraph.  On exit, will point to the end of the returned string.
 * @param {Array<Node>} nodesCrossed Any HTML nodes crossed between the
 *     initial and final cursor position will be pushed onto this array.
 * @return {?string} The next paragraph, or null if the bottom of the
 *     document has been reached.
 */
TraverseUtil.getNextParagraph = function(startCursor, endCursor,
    nodesCrossed) {
  return TraverseUtil.getNextString(
      startCursor, endCursor, nodesCrossed,
      function(str, word, nodes) {
        for (var i = 0; i < nodes.length; i++) {
          if (TraverseUtil.isSkipped(nodes[i])) {
            return true;
          }
          var style = window.getComputedStyle(nodes[i], null);
          if (style && style.display != 'inline') {
            return true;
          }
        }
        return false;
      });
};

/**
 * Finds the previous paragraph, starting from startCursor.  Upon exit,
 * startCursor and endCursor will surround the previous paragraph.
 *
 * @param {Cursor} startCursor The position to start searching for the next
 *     paragraph.  On exit, will point to the start of the returned string.
 * @param {Cursor} endCursor On exit, the end of the returned string.
 * @param {Array<Node>} nodesCrossed Any HTML nodes crossed between the
 *     initial and final cursor position will be pushed onto this array.
 * @return {?string} The previous paragraph, or null if the bottom of the
 *     document has been reached.
 */
TraverseUtil.getPreviousParagraph = function(
    startCursor, endCursor, nodesCrossed) {
  return TraverseUtil.getPreviousString(
      startCursor, endCursor, nodesCrossed,
      function(str, word, nodes) {
        for (var i = 0; i < nodes.length; i++) {
          if (TraverseUtil.isSkipped(nodes[i])) {
            return true;
          }
          var style = window.getComputedStyle(nodes[i], null);
          if (style && style.display != 'inline') {
            return true;
          }
        }
        return false;
      });
};

/**
 * Customizable function to return the next string of words in the DOM, based
 * on provided functions to decide when to break one string and start
 * the next. This can be used to get the next sentence, line, paragraph,
 * or potentially other granularities.
 *
 * Finds the next contiguous string, starting from endCursor.  Upon exit,
 * startCursor and endCursor will surround the next string.
 *
 * The breakBefore function takes three parameters, and
 * should return true if the string should be broken before the proposed
 * next word:
 *   str The string so far.
 *   word The next word to be added.
 *   nodesCrossed The nodes crossed in reaching this next word.
 *
 * @param {Cursor} startCursor On exit, will point to the beginning of the
 *     next string.
 * @param {Cursor} endCursor The position to start searching for the next
 *     string.  On exit, will point to the end of the returned string.
 * @param {Array<Node>} nodesCrossed Any HTML nodes crossed between the
 *     initial and final cursor position will be pushed onto this array.
 * @param {function(string, string, Array<string>)} breakBefore
 *     Function that takes the string so far, next word to be added, and
 *     nodes crossed, and returns true if the string should be ended before
 *     adding this word.
 * @return {?string} The next string, or null if the bottom of the
 *     document has been reached.
 */
TraverseUtil.getNextString = function(
    startCursor, endCursor, nodesCrossed, breakBefore) {
  // Get the first word and set the start cursor to the start of the
  // first word.
  var wordStartCursor = endCursor.clone();
  var wordEndCursor = endCursor.clone();
  var newNodesCrossed = [];
  var str = '';
  var word = TraverseUtil.getNextWord(
      wordStartCursor, wordEndCursor, newNodesCrossed);
  if (word == null)
    return null;
  startCursor.copyFrom(wordStartCursor);

  // Always add the first word when the string is empty, and then keep
  // adding more words as long as breakBefore returns false
  while (!str || !breakBefore(str, word, newNodesCrossed)) {
    // Append this word, set the end cursor to the end of this word, and
    // update the returned list of nodes crossed to include ones we crossed
    // in reaching this word.
    if (str)
      str += ' ';
    str += word;
    nodesCrossed = nodesCrossed.concat(newNodesCrossed);
    endCursor.copyFrom(wordEndCursor);

    // Get the next word and go back to the top of the loop.
    newNodesCrossed = [];
    word = TraverseUtil.getNextWord(
        wordStartCursor, wordEndCursor, newNodesCrossed);
    if (word == null)
      return str;
  }

  return str;
};

/**
 * Customizable function to return the previous string of words in the DOM,
 * based on provided functions to decide when to break one string and start
 * the next. See getNextString, above, for more details.
 *
 * Finds the previous contiguous string, starting from startCursor.  Upon exit,
 * startCursor and endCursor will surround the next string.
 *
 * @param {Cursor} startCursor The position to start searching for the
 *     previous string.  On exit, will point to the beginning of the
 *     string returned.
 * @param {Cursor} endCursor On exit, will point to the end of the
 *     string returned.
 * @param {Array<Node>} nodesCrossed Any HTML nodes crossed between the
 *     initial and final cursor position will be pushed onto this array.
 * @param {function(string, string, Array<string>)} breakBefore
 *     Function that takes the string so far, the word to be added, and
 *     nodes crossed, and returns true if the string should be ended before
 *     adding this word.
 * @return {?string} The next string, or null if the top of the
 *     document has been reached.
 */
TraverseUtil.getPreviousString = function(
    startCursor, endCursor, nodesCrossed, breakBefore) {
  // Get the first word and set the end cursor to the end of the
  // first word.
  var wordStartCursor = startCursor.clone();
  var wordEndCursor = startCursor.clone();
  var newNodesCrossed = [];
  var str = '';
  var word = TraverseUtil.getPreviousWord(
      wordStartCursor, wordEndCursor, newNodesCrossed);
  if (word == null)
    return null;
  endCursor.copyFrom(wordEndCursor);

  // Always add the first word when the string is empty, and then keep
  // adding more words as long as breakBefore returns false
  while (!str || !breakBefore(str, word, newNodesCrossed)) {
    // Prepend this word, set the start cursor to the start of this word, and
    // update the returned list of nodes crossed to include ones we crossed
    // in reaching this word.
    if (str)
      str = ' ' + str;
    str = word + str;
    nodesCrossed = nodesCrossed.concat(newNodesCrossed);
    startCursor.copyFrom(wordStartCursor);
    // Get the previous word and go back to the top of the loop.
    newNodesCrossed = [];
    word = TraverseUtil.getPreviousWord(
        wordStartCursor, wordEndCursor, newNodesCrossed);
    if (word == null)
      return str;
  }

  return str;
};

module.exports.Cursor = Cursor;
module.exports.TraverseUtil = TraverseUtil;

}).call(this);

},{}],30:[function(require,module,exports){
(function() {
  //-----------------------------------------------------------------------------------------------------------

  //===========================================================================================================
  'use strict';
  var debug, defaults, freeze, isa, log, ref, types, validate, validate_optional, µ,
    boundMethodCheck = function(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new Error('Bound instance method accessed before binding'); } };

  µ = require('./main');

  log = console.log;

  debug = console.debug;

  freeze = Object.freeze;

  ({types, isa, validate, validate_optional} = require('./types'));

  //-----------------------------------------------------------------------------------------------------------
  defaults = {
    //---------------------------------------------------------------------------------------------------------
    latch: {
      dt: 350 // time in milliseconds between first and last key event to trigger latching
    },
    
    //---------------------------------------------------------------------------------------------------------
    kblike_eventnames: [
      // ### TAINT not all of these events are needed
      'click',
      // 'dblclick', # implied / preceded by `click` event
      // 'drag', 'dragend', 'dragenter', 'dragleave', 'dragover', 'dragstart',
      // 'mousedown', 'mouseenter', 'mouseleave', 'mousemove', 'mouseout', 'mouseover', 'mouseup',
      // 'pointercancel',
      'wheel',
      'pointermove',
      'pointerout',
      'pointerover'
    ],
    //---------------------------------------------------------------------------------------------------------
    // 'pointerdown',
    // 'pointerenter',
    // 'pointerleave',
    // 'pointerup',
    // ------------- Tier A: ubiquitous, unequivocal
    modifier_names: ['Alt', 'AltGraph', 'Control', 'Meta', 'Shift', 'CapsLock']
  };

  //-----------------------------------------------------------------------------------------------------------

  //===========================================================================================================
  // ------------- Tier B: status doubtful
  // 'Hyper',
  // 'OS',
  // 'Super',
  // 'Symbol',
  // ------------- Tier C: rare, not needed, or not sensed by JS
  // 'Fn',
  // 'FnLock',
  // 'NumLock',
  // 'ScrollLock',
  // 'SymbolLock',
  this._Kb = (function() {
    class _Kb {
      //---------------------------------------------------------------------------------------------------------
      constructor(cfg) {
        var i, len, modifier_name, ref;
        //---------------------------------------------------------------------------------------------------------
        /* Get the last known keyboard modifier state. NOTE may be extended with `event` argument ITF. */
        // µ.DOM.get_kb_modifier_state = () => return { ...prv, }

        //---------------------------------------------------------------------------------------------------------
        this.get_changed_kb_modifier_state = this.get_changed_kb_modifier_state.bind(this);
        //-----------------------------------------------------------------------------------------------------------
        // get_kb_modifier_state = ( event, value ) =>
        //   @_prv_modifiers = {}
        //   for ( modifier_name of @cfg.modifier_names ) {
        //     @_prv_modifiers[ modifier_name ] = null
        //   freeze( @_prv_modifiers )

        //---------------------------------------------------------------------------------------------------------
        this._set_capslock_state = this._set_capslock_state.bind(this);
        this.cfg = {...defaults, ...cfg};
        ref = this.cfg.modifier_names;
        for (i = 0, len = ref.length; i < len; i++) {
          modifier_name = ref[i];
          this._prv_modifiers[modifier_name] = null;
        }
        freeze(this._prv_modifiers);
        return null;
      }

      get_changed_kb_modifier_state() {
        var any_has_changed, changed_modifiers, crt_modifiers, i, len, modifier_name, ref, state, this_has_changed;
        /* Return keyboard modifier state if it has changed since the last call, or `null` if it hasn't changed. */
        // log( '^33988^', { event, } )
        crt_modifiers = {
          _type: event.type
        };
        changed_modifiers = {
          _type: event.type
        };
        any_has_changed = false;
        ref = this.cfg.modifier_names;
        for (i = 0, len = ref.length; i < len; i++) {
          modifier_name = ref[i];
          state = event.getModifierState(modifier_name);
          this_has_changed = this._prv_modifiers[modifier_name] !== state;
          any_has_changed = any_has_changed || this_has_changed;
          crt_modifiers[modifier_name] = state;
          if (this_has_changed) {
            changed_modifiers[modifier_name] = state;
          }
        }
        if (any_has_changed) {
          this._prv_modifiers = freeze(crt_modifiers);
          return changed_modifiers;
        }
        return null;
      }

      _set_capslock_state(capslock_active) {
        if (capslock_active === this._capslock_active) {
          return null;
        }
        this._capslock_active = capslock_active;
        µ.DOM.emit_custom_event('µ_kb_capslock_changed', {
          detail: {
            CapsLock: capslock_active
          }
        });
        return null;
      }

    };

    _Kb.prototype._prv_modifiers = {};

    _Kb.prototype._capslock_active = false;

    return _Kb;

  }).call(this);

  // #---------------------------------------------------------------------------------------------------------
  // on_push: ( keynames, handler ) =>
  // keynames  = [ keynames, ] unless isa.list keynames
  // types     = [ types,    ] unless isa.list types
  // validate.kb_keynames  keynames
  // validate.kb_types     types

  //#########################################################################################################
  //#########################################################################################################
  //#########################################################################################################
  //#########################################################################################################
  //#########################################################################################################
  //#########################################################################################################
  ref = this.Kb = (function() {
    class Kb extends this._Kb {
      constructor() {
        super(...arguments);
        //---------------------------------------------------------------------------------------------------------
        this._handler_from_watcher = this._handler_from_watcher.bind(this);
        //---------------------------------------------------------------------------------------------------------
        this._listen_to_key = this._listen_to_key.bind(this);
        //=========================================================================================================
        // MBMCD
        //---------------------------------------------------------------------------------------------------------
        this._listen_to_modifiers = this._listen_to_modifiers.bind(this);
        //---------------------------------------------------------------------------------------------------------
        this._emit_mbmcd_key_events = this._emit_mbmcd_key_events.bind(this);
      }

      //---------------------------------------------------------------------------------------------------------
      _get_latching_keyname() {
        var R, ref1, ref10, ref11, ref12, ref2, ref3, ref4, ref5, ref6, ref7, ref8, ref9;
        if (!((Date.now() - ((ref1 = (ref2 = this._shreg[0]) != null ? ref2.t : void 0) != null ? ref1 : 0)) < this.cfg.latch.dt)) {
          return null;
        }
        if (((ref3 = this._shreg[0]) != null ? ref3.dir : void 0) !== 'down') {
          return null;
        }
        if (((ref4 = this._shreg[1]) != null ? ref4.dir : void 0) !== 'up') {
          return null;
        }
        if (((ref5 = this._shreg[2]) != null ? ref5.dir : void 0) !== 'down') {
          return null;
        }
        if (((ref6 = this._shreg[3]) != null ? ref6.dir : void 0) !== 'up') {
          return null;
        }
        if (((((ref9 = this._shreg[0]) != null ? ref9.name : void 0) !== (ref8 = (ref10 = this._shreg[1]) != null ? ref10.name : void 0) || ref8 !== (ref7 = (ref11 = this._shreg[2]) != null ? ref11.name : void 0)) || ref7 !== ((ref12 = this._shreg[3]) != null ? ref12.name : void 0))) {
          return null;
        }
        R = this._shreg[3].name;
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      _initialize_latching() {
        var push;
        if (this._latching_initialized) {
          return null;
        }
        this._latching_initialized = true;
        push = (dir, event) => {
          var name;
          name = event.key;
          this._shreg.push({
            dir,
            name,
            t: Date.now()
          });
          while (this._shreg.length > 4) {
            this._shreg.shift();
          }
          return true;
        };
        µ.DOM.on(document, 'keydown', (event) => {
          return push('down', event);
        });
        µ.DOM.on(document, 'keyup', (event) => {
          return push('up', event);
        });
        return null;
      }

      //=========================================================================================================

      //---------------------------------------------------------------------------------------------------------
      _listen_to_key_push(keyname, handler) {
        var behavior, state;
        state = false;
        behavior = 'push';
        //.......................................................................................................
        µ.DOM.on(document, 'keydown', (event) => {
          if (event.key !== keyname) {
            return true;
          }
          state = true;
          handler(freeze({keyname, behavior, state, event}));
          return true;
        });
        //.......................................................................................................
        µ.DOM.on(document, 'keyup', (event) => {
          if (event.key !== keyname) {
            return true;
          }
          state = false;
          handler(freeze({keyname, behavior, state, event}));
          return true;
        });
        //.......................................................................................................
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _listen_to_key_toggle(keyname, handler) {
        var behavior, skip_next, state;
        state = false;
        behavior = 'toggle';
        skip_next = false;
        //.......................................................................................................
        µ.DOM.on(document, 'keydown', (event) => {
          if (event.key !== keyname) {
            return true;
          }
          if (state) {
            return true;
          }
          state = true;
          skip_next = true;
          // debug '^_listen_to_key@223^', 'keydown', { keyname, behavior, entry, }
          handler(freeze({keyname, behavior, state, event}));
          return true;
        });
        //.......................................................................................................
        µ.DOM.on(document, 'keyup', (event) => {
          if (event.key !== keyname) {
            return true;
          }
          if (!state) {
            return true;
          }
          if (skip_next) {
            skip_next = false;
          } else {
            state = false;
          }
          // debug '^_listen_to_key@223^', 'toggle/keyup', { keyname, behavior, entry, }
          handler(freeze({keyname, behavior, state, event}));
          return true;
        });
        //.......................................................................................................
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _listen_to_key_latch(keyname, handler) {
        var behavior, state;
        this._initialize_latching();
        state = false;
        behavior = 'latch';
        //.......................................................................................................
        µ.DOM.on(document, 'keyup', (event) => {
          if (keyname === this._get_latching_keyname()) {
            state = !state;
            handler(freeze({keyname, behavior, state, event}));
          }
          return true;
        });
        //.......................................................................................................
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _listen_to_key_tlatch(keyname, handler) {
        var behavior, is_latched, state;
        state = false;
        behavior = 'tlatch';
        is_latched = false;
        //.......................................................................................................
        this._listen_to_key(keyname, 'latch', (d) => {
          return is_latched = d.state;
        });
        //.......................................................................................................
        µ.DOM.on(document, 'keydown', (event) => {
          if (event.key !== keyname) {
            return true;
          }
          state = !is_latched;
          handler(freeze({keyname, behavior, state, event}));
          return true;
        });
        //.......................................................................................................
        µ.DOM.on(document, 'keyup', (event) => {
          if (event.key !== keyname) {
            return true;
          }
          state = is_latched;
          handler(freeze({keyname, behavior, state, event}));
          return true;
        });
        //.......................................................................................................
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _listen_to_key_ptlatch(keyname, handler) {
        var behavior, is_latched, state;
        state = false;
        behavior = 'ptlatch';
        is_latched = false;
        //.......................................................................................................
        this._listen_to_key(keyname, 'latch', (d) => {
          return is_latched = d.state;
        });
        //.......................................................................................................
        µ.DOM.on(document, 'keydown', (event) => {
          if (event.key !== keyname) {
            return true;
          }
          if (is_latched) {
            return true;
          }
          state = true;
          handler(freeze({keyname, behavior, state, event}));
          return true;
        });
        //.......................................................................................................
        µ.DOM.on(document, 'keyup', (event) => {
          if (event.key !== keyname) {
            return true;
          }
          if (is_latched) {
            return true;
          }
          state = false;
          handler(freeze({keyname, behavior, state, event}));
          return true;
        });
        //.......................................................................................................
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _listen_to_key_ntlatch(keyname, handler) {
        var behavior, is_latched, state;
        state = false;
        behavior = 'ntlatch';
        is_latched = false;
        //.......................................................................................................
        this._listen_to_key(keyname, 'latch', (d) => {
          return is_latched = d.state;
        });
        //.......................................................................................................
        µ.DOM.on(document, 'keydown', (event) => {
          if (event.key !== keyname) {
            return true;
          }
          if (!is_latched) {
            return true;
          }
          state = false;
          handler(freeze({keyname, behavior, state, event}));
          return true;
        });
        //.......................................................................................................
        µ.DOM.on(document, 'keyup', (event) => {
          if (event.key !== keyname) {
            return true;
          }
          if (!is_latched) {
            return true;
          }
          state = true;
          handler(freeze({keyname, behavior, state, event}));
          return true;
        });
        //.......................................................................................................
        return null;
      }

      _handler_from_watcher(watcher) {
        boundMethodCheck(this, ref);
        /* TAINT could use single function for all handlers that emit the same event */
        validate.kb_watcher(watcher);
        if (isa.function(watcher)) {
          return watcher;
        }
        return function(d) {
          return µ.DOM.emit_custom_event(watcher, {
            detail: d
          });
        };
      }

      _listen_to_key(keyname, behavior, watcher) {
        var handler;
        boundMethodCheck(this, ref);
        if (keyname === 'Space') {
          keyname = ' ';
        }
        validate.kb_keyname(keyname);
        validate.kb_keytype(behavior);
        handler = this._handler_from_watcher(watcher);
        //.......................................................................................................
        switch (behavior) {
          case 'push':
            this._listen_to_key_push(keyname, handler);
            break;
          case 'toggle':
            this._listen_to_key_toggle(keyname, handler);
            break;
          case 'latch':
            this._listen_to_key_latch(keyname, handler);
            break;
          case 'tlatch':
            this._listen_to_key_tlatch(keyname, handler);
            break;
          case 'ntlatch':
            this._listen_to_key_ntlatch(keyname, handler);
            break;
          case 'ptlatch':
            this._listen_to_key_ptlatch(keyname, handler);
        }
        //.......................................................................................................
        return null/* NOTE may return a `remove_listener` method ITF */;
      }

      _listen_to_modifiers(watcher = null) {
        var eventname, handle_kblike_event, handler, i, len, ref1;
        boundMethodCheck(this, ref);
        if (watcher != null) {
          handler = this._handler_from_watcher(watcher);
        } else {
          handler = this._emit_mbmcd_key_events;
        }
        //.......................................................................................................
        handle_kblike_event = (event) => {
          var modifier_state;
          modifier_state = this.get_changed_kb_modifier_state(event);
          if (modifier_state !== null) {
            handler(modifier_state);
          }
          this._set_capslock_state(event.getModifierState('CapsLock'));
          return null;
        };
        ref1 = this.cfg.kblike_eventnames;
        //.......................................................................................................
        for (i = 0, len = ref1.length; i < len; i++) {
          eventname = ref1[i];
          µ.DOM.on(document, eventname, handle_kblike_event);
        }
        //.......................................................................................................
        µ.DOM.on(document, 'keydown', (event) => {
          // handle_kblike_event event ### !!!!!!!!!!!!!!!!!!!!!! ###
          /* TAINT logic is questionable */
          if (event.key === 'CapsLock') {
            this._set_capslock_state(!this._capslock_active);
          } else {
            this._set_capslock_state(event.getModifierState('CapsLock'));
          }
          return null;
        });
        //.......................................................................................................
        µ.DOM.on(document, 'keyup', (event) => {
          if (event.key === 'CapsLock') {
            // handle_kblike_event event ### !!!!!!!!!!!!!!!!!!!!!! ###
            /* TAINT logic is questionable */
            return null;
          }
          this._set_capslock_state(event.getModifierState('CapsLock'));
          return null;
        });
        return null;
      }

      _emit_mbmcd_key_events(d) {
        var eventname, key, state;
        boundMethodCheck(this, ref);
/* Accepts an object with modifier names as keys, booleans as values; will emit `keydown`, `keyup`
   events as needed. */
/* TAINT only iterate over modifier names? */
        for (key in d) {
          state = d[key];
          if (key === '_type') {
            continue;
          }
          eventname = state ? 'keydown' : 'keyup';
          document.dispatchEvent(new KeyboardEvent(eventname, {key}));
        }
        return null;
      }

    };

    // #---------------------------------------------------------------------------------------------------------
    // _defaults: freeze {
    //   state: freeze { down: false, up: false, toggle: false, latch: false, tlatch: false, }
    //   }

    //---------------------------------------------------------------------------------------------------------
    Kb.prototype._shreg = [];

    Kb.prototype._latching_initialized = false;

    return Kb;

  }).call(this);

}).call(this);


},{"./main":"mudom","./types":32}],31:[function(require,module,exports){
(function() {
  'use strict';
  var Slug, TU;

  TU = require('../deps/traverse_util.js');

  //===========================================================================================================
  Slug = class Slug {
    constructor({llnr, rlnr, node, rectangle}) {
      this.llnr = llnr;
      this.rlnr = rlnr;
      this.node = node;
      this.rectangle = rectangle;
      return void 0;
    }

  };

  //===========================================================================================================
  this.Linefinder = class Linefinder {
    //---------------------------------------------------------------------------------------------------------
    constructor(cfg) {
      /* TAINT use intertype */
      var defaults;
      defaults = {
        box_element_name: 'div',
        box_class_name: 'box',
        xxx_height_factor: 1 / 2
      };
      this./* relative minimum height to recognize line step */cfg = Object.freeze({...defaults, ...cfg});
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    draw_box(rectangle) {
      var box;
      box = document.createElement(this.cfg.box_element_name);
      box.style.top = rectangle.top + 'px';
      box.style.left = rectangle.left + 'px';
      box.style.width = rectangle.width - 1 + 'px'; // collapse borders
      box.style.height = rectangle.height + 'px';
      box.classList.add(this.cfg.box_class_name);
      document.body.appendChild(box);
      return box;
    }

    //---------------------------------------------------------------------------------------------------------
    /* TAINT to be merged with `draw_box()` in new method */
    xxx_draw_line_cover(rectangle) {
      var box;
      box = document.createElement(this.cfg.box_element_name);
      box.style.top = rectangle.top + 'px';
      box.style.left = rectangle.left + 'px';
      box.style.width = rectangle.width - 1 + 'px'; // collapse borders
      box.style.height = rectangle.height + 'px';
      box.classList.add(this.cfg.box_class_name);
      box.classList.add('cover');
      document.body.appendChild(box);
      return box;
    }

    //---------------------------------------------------------------------------------------------------------
    _get_next_chr_rectangles(node, c1, c2) {
      var range, selection;
      TU.TraverseUtil.getNextChar(c1, c2, [], false);
      selection = TU.TraverseUtil.setSelection(c1, c2);
      range = selection.getRangeAt(0);
      if (!node.contains(range.startContainer.parentNode)) {
        return null;
      }
      if (!node.contains(range.endContainer.parentNode)) {
        return null;
      }
      return range.getClientRects();
    }

    //---------------------------------------------------------------------------------------------------------
    * walk_chr_rectangles_of_node(node) {
      var c1, c2, rectangle, rectangles, text_node;
      text_node = node.childNodes[0];
      c1 = new TU.Cursor(text_node, 0, text_node.data);
      c2 = new TU.Cursor(text_node, 0, text_node.data);
      TU.TraverseUtil.setSelection(c1, c2);
      while (true) {
        rectangles = this._get_next_chr_rectangles(node, c1, c2);
        if (rectangles == null) {
          break;
        }
        for (rectangle of rectangles) {
          yield new DOMRect(rectangle.left + document.documentElement.scrollLeft, rectangle.top + document.documentElement.scrollTop, rectangle.width, rectangle.height); // left // top // width // height
        }
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _reset_line_walker(s) {
      s.min_top = +2e308;
      s.max_bottom = -2e308;
      s.min_left = +2e308;
      s.max_right = -2e308;
      s.avg_height = 0;
      s.avg_bottom = 0;
      s.count = 0;
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    * walk_line_rectangles_of_node(node) {
      var rectangle, ref, s;
      this._reset_line_walker(s = {});
      ref = this.walk_chr_rectangles_of_node(node);
      for (rectangle of ref) {
        if (s.count > 0 && rectangle.bottom - s.avg_bottom > s.avg_height * this.cfg.xxx_height_factor) {
          yield new DOMRect(s.min_left, s.min_top, s.max_right - s.min_left, s.max_bottom - s.min_top); // left // top // width // height
          this._reset_line_walker(s);
        }
        //.......................................................................................................
        // draw_box rectangle
        s.count++;
        s.min_top = Math.min(s.min_top, rectangle.top);
        s.max_bottom = Math.max(s.max_bottom, rectangle.bottom);
        s.min_left = Math.min(s.min_left, rectangle.left);
        s.max_right = Math.max(s.max_right, rectangle.right);
        s.avg_height = (s.avg_height * (s.count - 1) / s.count) + (rectangle.height * 1 / s.count);
        s.avg_bottom = (s.avg_bottom * (s.count - 1) / s.count) + (rectangle.bottom * 1 / s.count);
      }
      //.........................................................................................................
      if (s.count > 0) {
        yield new DOMRect(s.min_left, s.min_top, s.max_right - s.min_left, s.max_bottom - s.min_top); // left // top // width // height
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    * walk_slugs_of_node(node) {
      var i, idx, len, line_count, llnr, rectangle, rectangles, rlnr;
      rectangles = [...(this.walk_line_rectangles_of_node(node))];
      line_count = rectangles.length;
      for (idx = i = 0, len = rectangles.length; i < len; idx = ++i) {
        rectangle = rectangles[idx];
        llnr = idx + 1;
        rlnr = line_count - idx;
        yield new Slug({llnr, rlnr, node, rectangle});
      }
      return null;
    }

  };

}).call(this);


},{"../deps/traverse_util.js":29}],32:[function(require,module,exports){
(function() {
  'use strict';
  this.types = new (require('intertype')).Intertype();

  Object.assign(this, this.types.export());

  // #-----------------------------------------------------------------------------------------------------------
  // @declare 'kb_keytypes', tests:
  //   "x is a list of kb_keytype":     ( x ) -> @isa.list_of 'kb_keytype', x
  //   "x is not empty":                   ( x ) -> not @isa.empty x

  //-----------------------------------------------------------------------------------------------------------
  this.declare('kb_keytype', {
    tests: {
      "x is one of 'toggle', 'latch', 'tlatch', 'ptlatch', 'ntlatch', 'push'": function(x) {
        return x === 'toggle' || x === 'latch' || x === 'tlatch' || x === 'ptlatch' || x === 'ntlatch' || x === 'push';
      }
    }
  });

  // #-----------------------------------------------------------------------------------------------------------
  // @declare 'kb_keynames', tests:
  //   "x is a list of kb_keyname":  ( x ) -> @isa.list_of 'kb_keyname', x
  //   "x is not empty":                   ( x ) -> not @isa.empty x

  //-----------------------------------------------------------------------------------------------------------
  this.declare('kb_keyname', {
    tests: {
      "x is a nonempty_text": function(x) {
        return this.isa.nonempty_text(x);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('kb_watcher', {
    tests: {
      "x is a function or a nonempty_text": function(x) {
        return (this.isa.function(x)) || (this.isa.nonempty_text(x));
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  /* TAINT probably not correct to only check for Element, at least in some cases could be Node as well */
  this.declare('delement', function(x) {
    return (x === document) || (x instanceof Element);
  });

  this.declare('element', function(x) {
    return x instanceof Element;
  });

}).call(this);


},{"intertype":41}],33:[function(require,module,exports){
(function (process,global,Buffer){(function (){
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = global || self, factory(global.loupe = {}));
}(this, (function (exports) { 'use strict';

	var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	function createCommonjsModule(fn, module) {
		return module = { exports: {} }, fn(module, module.exports), module.exports;
	}

	var typeDetect = createCommonjsModule(function (module, exports) {
	(function (global, factory) {
		 module.exports = factory() ;
	}(commonjsGlobal, (function () {
	/* !
	 * type-detect
	 * Copyright(c) 2013 jake luer <jake@alogicalparadox.com>
	 * MIT Licensed
	 */
	var promiseExists = typeof Promise === 'function';

	/* eslint-disable no-undef */
	var globalObject = typeof self === 'object' ? self : commonjsGlobal; // eslint-disable-line id-blacklist

	var symbolExists = typeof Symbol !== 'undefined';
	var mapExists = typeof Map !== 'undefined';
	var setExists = typeof Set !== 'undefined';
	var weakMapExists = typeof WeakMap !== 'undefined';
	var weakSetExists = typeof WeakSet !== 'undefined';
	var dataViewExists = typeof DataView !== 'undefined';
	var symbolIteratorExists = symbolExists && typeof Symbol.iterator !== 'undefined';
	var symbolToStringTagExists = symbolExists && typeof Symbol.toStringTag !== 'undefined';
	var setEntriesExists = setExists && typeof Set.prototype.entries === 'function';
	var mapEntriesExists = mapExists && typeof Map.prototype.entries === 'function';
	var setIteratorPrototype = setEntriesExists && Object.getPrototypeOf(new Set().entries());
	var mapIteratorPrototype = mapEntriesExists && Object.getPrototypeOf(new Map().entries());
	var arrayIteratorExists = symbolIteratorExists && typeof Array.prototype[Symbol.iterator] === 'function';
	var arrayIteratorPrototype = arrayIteratorExists && Object.getPrototypeOf([][Symbol.iterator]());
	var stringIteratorExists = symbolIteratorExists && typeof String.prototype[Symbol.iterator] === 'function';
	var stringIteratorPrototype = stringIteratorExists && Object.getPrototypeOf(''[Symbol.iterator]());
	var toStringLeftSliceLength = 8;
	var toStringRightSliceLength = -1;
	/**
	 * ### typeOf (obj)
	 *
	 * Uses `Object.prototype.toString` to determine the type of an object,
	 * normalising behaviour across engine versions & well optimised.
	 *
	 * @param {Mixed} object
	 * @return {String} object type
	 * @api public
	 */
	function typeDetect(obj) {
	  /* ! Speed optimisation
	   * Pre:
	   *   string literal     x 3,039,035 ops/sec ±1.62% (78 runs sampled)
	   *   boolean literal    x 1,424,138 ops/sec ±4.54% (75 runs sampled)
	   *   number literal     x 1,653,153 ops/sec ±1.91% (82 runs sampled)
	   *   undefined          x 9,978,660 ops/sec ±1.92% (75 runs sampled)
	   *   function           x 2,556,769 ops/sec ±1.73% (77 runs sampled)
	   * Post:
	   *   string literal     x 38,564,796 ops/sec ±1.15% (79 runs sampled)
	   *   boolean literal    x 31,148,940 ops/sec ±1.10% (79 runs sampled)
	   *   number literal     x 32,679,330 ops/sec ±1.90% (78 runs sampled)
	   *   undefined          x 32,363,368 ops/sec ±1.07% (82 runs sampled)
	   *   function           x 31,296,870 ops/sec ±0.96% (83 runs sampled)
	   */
	  var typeofObj = typeof obj;
	  if (typeofObj !== 'object') {
	    return typeofObj;
	  }

	  /* ! Speed optimisation
	   * Pre:
	   *   null               x 28,645,765 ops/sec ±1.17% (82 runs sampled)
	   * Post:
	   *   null               x 36,428,962 ops/sec ±1.37% (84 runs sampled)
	   */
	  if (obj === null) {
	    return 'null';
	  }

	  /* ! Spec Conformance
	   * Test: `Object.prototype.toString.call(window)``
	   *  - Node === "[object global]"
	   *  - Chrome === "[object global]"
	   *  - Firefox === "[object Window]"
	   *  - PhantomJS === "[object Window]"
	   *  - Safari === "[object Window]"
	   *  - IE 11 === "[object Window]"
	   *  - IE Edge === "[object Window]"
	   * Test: `Object.prototype.toString.call(this)``
	   *  - Chrome Worker === "[object global]"
	   *  - Firefox Worker === "[object DedicatedWorkerGlobalScope]"
	   *  - Safari Worker === "[object DedicatedWorkerGlobalScope]"
	   *  - IE 11 Worker === "[object WorkerGlobalScope]"
	   *  - IE Edge Worker === "[object WorkerGlobalScope]"
	   */
	  if (obj === globalObject) {
	    return 'global';
	  }

	  /* ! Speed optimisation
	   * Pre:
	   *   array literal      x 2,888,352 ops/sec ±0.67% (82 runs sampled)
	   * Post:
	   *   array literal      x 22,479,650 ops/sec ±0.96% (81 runs sampled)
	   */
	  if (
	    Array.isArray(obj) &&
	    (symbolToStringTagExists === false || !(Symbol.toStringTag in obj))
	  ) {
	    return 'Array';
	  }

	  // Not caching existence of `window` and related properties due to potential
	  // for `window` to be unset before tests in quasi-browser environments.
	  if (typeof window === 'object' && window !== null) {
	    /* ! Spec Conformance
	     * (https://html.spec.whatwg.org/multipage/browsers.html#location)
	     * WhatWG HTML$7.7.3 - The `Location` interface
	     * Test: `Object.prototype.toString.call(window.location)``
	     *  - IE <=11 === "[object Object]"
	     *  - IE Edge <=13 === "[object Object]"
	     */
	    if (typeof window.location === 'object' && obj === window.location) {
	      return 'Location';
	    }

	    /* ! Spec Conformance
	     * (https://html.spec.whatwg.org/#document)
	     * WhatWG HTML$3.1.1 - The `Document` object
	     * Note: Most browsers currently adher to the W3C DOM Level 2 spec
	     *       (https://www.w3.org/TR/DOM-Level-2-HTML/html.html#ID-26809268)
	     *       which suggests that browsers should use HTMLTableCellElement for
	     *       both TD and TH elements. WhatWG separates these.
	     *       WhatWG HTML states:
	     *         > For historical reasons, Window objects must also have a
	     *         > writable, configurable, non-enumerable property named
	     *         > HTMLDocument whose value is the Document interface object.
	     * Test: `Object.prototype.toString.call(document)``
	     *  - Chrome === "[object HTMLDocument]"
	     *  - Firefox === "[object HTMLDocument]"
	     *  - Safari === "[object HTMLDocument]"
	     *  - IE <=10 === "[object Document]"
	     *  - IE 11 === "[object HTMLDocument]"
	     *  - IE Edge <=13 === "[object HTMLDocument]"
	     */
	    if (typeof window.document === 'object' && obj === window.document) {
	      return 'Document';
	    }

	    if (typeof window.navigator === 'object') {
	      /* ! Spec Conformance
	       * (https://html.spec.whatwg.org/multipage/webappapis.html#mimetypearray)
	       * WhatWG HTML$8.6.1.5 - Plugins - Interface MimeTypeArray
	       * Test: `Object.prototype.toString.call(navigator.mimeTypes)``
	       *  - IE <=10 === "[object MSMimeTypesCollection]"
	       */
	      if (typeof window.navigator.mimeTypes === 'object' &&
	          obj === window.navigator.mimeTypes) {
	        return 'MimeTypeArray';
	      }

	      /* ! Spec Conformance
	       * (https://html.spec.whatwg.org/multipage/webappapis.html#pluginarray)
	       * WhatWG HTML$8.6.1.5 - Plugins - Interface PluginArray
	       * Test: `Object.prototype.toString.call(navigator.plugins)``
	       *  - IE <=10 === "[object MSPluginsCollection]"
	       */
	      if (typeof window.navigator.plugins === 'object' &&
	          obj === window.navigator.plugins) {
	        return 'PluginArray';
	      }
	    }

	    if ((typeof window.HTMLElement === 'function' ||
	        typeof window.HTMLElement === 'object') &&
	        obj instanceof window.HTMLElement) {
	      /* ! Spec Conformance
	      * (https://html.spec.whatwg.org/multipage/webappapis.html#pluginarray)
	      * WhatWG HTML$4.4.4 - The `blockquote` element - Interface `HTMLQuoteElement`
	      * Test: `Object.prototype.toString.call(document.createElement('blockquote'))``
	      *  - IE <=10 === "[object HTMLBlockElement]"
	      */
	      if (obj.tagName === 'BLOCKQUOTE') {
	        return 'HTMLQuoteElement';
	      }

	      /* ! Spec Conformance
	       * (https://html.spec.whatwg.org/#htmltabledatacellelement)
	       * WhatWG HTML$4.9.9 - The `td` element - Interface `HTMLTableDataCellElement`
	       * Note: Most browsers currently adher to the W3C DOM Level 2 spec
	       *       (https://www.w3.org/TR/DOM-Level-2-HTML/html.html#ID-82915075)
	       *       which suggests that browsers should use HTMLTableCellElement for
	       *       both TD and TH elements. WhatWG separates these.
	       * Test: Object.prototype.toString.call(document.createElement('td'))
	       *  - Chrome === "[object HTMLTableCellElement]"
	       *  - Firefox === "[object HTMLTableCellElement]"
	       *  - Safari === "[object HTMLTableCellElement]"
	       */
	      if (obj.tagName === 'TD') {
	        return 'HTMLTableDataCellElement';
	      }

	      /* ! Spec Conformance
	       * (https://html.spec.whatwg.org/#htmltableheadercellelement)
	       * WhatWG HTML$4.9.9 - The `td` element - Interface `HTMLTableHeaderCellElement`
	       * Note: Most browsers currently adher to the W3C DOM Level 2 spec
	       *       (https://www.w3.org/TR/DOM-Level-2-HTML/html.html#ID-82915075)
	       *       which suggests that browsers should use HTMLTableCellElement for
	       *       both TD and TH elements. WhatWG separates these.
	       * Test: Object.prototype.toString.call(document.createElement('th'))
	       *  - Chrome === "[object HTMLTableCellElement]"
	       *  - Firefox === "[object HTMLTableCellElement]"
	       *  - Safari === "[object HTMLTableCellElement]"
	       */
	      if (obj.tagName === 'TH') {
	        return 'HTMLTableHeaderCellElement';
	      }
	    }
	  }

	  /* ! Speed optimisation
	  * Pre:
	  *   Float64Array       x 625,644 ops/sec ±1.58% (80 runs sampled)
	  *   Float32Array       x 1,279,852 ops/sec ±2.91% (77 runs sampled)
	  *   Uint32Array        x 1,178,185 ops/sec ±1.95% (83 runs sampled)
	  *   Uint16Array        x 1,008,380 ops/sec ±2.25% (80 runs sampled)
	  *   Uint8Array         x 1,128,040 ops/sec ±2.11% (81 runs sampled)
	  *   Int32Array         x 1,170,119 ops/sec ±2.88% (80 runs sampled)
	  *   Int16Array         x 1,176,348 ops/sec ±5.79% (86 runs sampled)
	  *   Int8Array          x 1,058,707 ops/sec ±4.94% (77 runs sampled)
	  *   Uint8ClampedArray  x 1,110,633 ops/sec ±4.20% (80 runs sampled)
	  * Post:
	  *   Float64Array       x 7,105,671 ops/sec ±13.47% (64 runs sampled)
	  *   Float32Array       x 5,887,912 ops/sec ±1.46% (82 runs sampled)
	  *   Uint32Array        x 6,491,661 ops/sec ±1.76% (79 runs sampled)
	  *   Uint16Array        x 6,559,795 ops/sec ±1.67% (82 runs sampled)
	  *   Uint8Array         x 6,463,966 ops/sec ±1.43% (85 runs sampled)
	  *   Int32Array         x 5,641,841 ops/sec ±3.49% (81 runs sampled)
	  *   Int16Array         x 6,583,511 ops/sec ±1.98% (80 runs sampled)
	  *   Int8Array          x 6,606,078 ops/sec ±1.74% (81 runs sampled)
	  *   Uint8ClampedArray  x 6,602,224 ops/sec ±1.77% (83 runs sampled)
	  */
	  var stringTag = (symbolToStringTagExists && obj[Symbol.toStringTag]);
	  if (typeof stringTag === 'string') {
	    return stringTag;
	  }

	  var objPrototype = Object.getPrototypeOf(obj);
	  /* ! Speed optimisation
	  * Pre:
	  *   regex literal      x 1,772,385 ops/sec ±1.85% (77 runs sampled)
	  *   regex constructor  x 2,143,634 ops/sec ±2.46% (78 runs sampled)
	  * Post:
	  *   regex literal      x 3,928,009 ops/sec ±0.65% (78 runs sampled)
	  *   regex constructor  x 3,931,108 ops/sec ±0.58% (84 runs sampled)
	  */
	  if (objPrototype === RegExp.prototype) {
	    return 'RegExp';
	  }

	  /* ! Speed optimisation
	  * Pre:
	  *   date               x 2,130,074 ops/sec ±4.42% (68 runs sampled)
	  * Post:
	  *   date               x 3,953,779 ops/sec ±1.35% (77 runs sampled)
	  */
	  if (objPrototype === Date.prototype) {
	    return 'Date';
	  }

	  /* ! Spec Conformance
	   * (http://www.ecma-international.org/ecma-262/6.0/index.html#sec-promise.prototype-@@tostringtag)
	   * ES6$25.4.5.4 - Promise.prototype[@@toStringTag] should be "Promise":
	   * Test: `Object.prototype.toString.call(Promise.resolve())``
	   *  - Chrome <=47 === "[object Object]"
	   *  - Edge <=20 === "[object Object]"
	   *  - Firefox 29-Latest === "[object Promise]"
	   *  - Safari 7.1-Latest === "[object Promise]"
	   */
	  if (promiseExists && objPrototype === Promise.prototype) {
	    return 'Promise';
	  }

	  /* ! Speed optimisation
	  * Pre:
	  *   set                x 2,222,186 ops/sec ±1.31% (82 runs sampled)
	  * Post:
	  *   set                x 4,545,879 ops/sec ±1.13% (83 runs sampled)
	  */
	  if (setExists && objPrototype === Set.prototype) {
	    return 'Set';
	  }

	  /* ! Speed optimisation
	  * Pre:
	  *   map                x 2,396,842 ops/sec ±1.59% (81 runs sampled)
	  * Post:
	  *   map                x 4,183,945 ops/sec ±6.59% (82 runs sampled)
	  */
	  if (mapExists && objPrototype === Map.prototype) {
	    return 'Map';
	  }

	  /* ! Speed optimisation
	  * Pre:
	  *   weakset            x 1,323,220 ops/sec ±2.17% (76 runs sampled)
	  * Post:
	  *   weakset            x 4,237,510 ops/sec ±2.01% (77 runs sampled)
	  */
	  if (weakSetExists && objPrototype === WeakSet.prototype) {
	    return 'WeakSet';
	  }

	  /* ! Speed optimisation
	  * Pre:
	  *   weakmap            x 1,500,260 ops/sec ±2.02% (78 runs sampled)
	  * Post:
	  *   weakmap            x 3,881,384 ops/sec ±1.45% (82 runs sampled)
	  */
	  if (weakMapExists && objPrototype === WeakMap.prototype) {
	    return 'WeakMap';
	  }

	  /* ! Spec Conformance
	   * (http://www.ecma-international.org/ecma-262/6.0/index.html#sec-dataview.prototype-@@tostringtag)
	   * ES6$24.2.4.21 - DataView.prototype[@@toStringTag] should be "DataView":
	   * Test: `Object.prototype.toString.call(new DataView(new ArrayBuffer(1)))``
	   *  - Edge <=13 === "[object Object]"
	   */
	  if (dataViewExists && objPrototype === DataView.prototype) {
	    return 'DataView';
	  }

	  /* ! Spec Conformance
	   * (http://www.ecma-international.org/ecma-262/6.0/index.html#sec-%mapiteratorprototype%-@@tostringtag)
	   * ES6$23.1.5.2.2 - %MapIteratorPrototype%[@@toStringTag] should be "Map Iterator":
	   * Test: `Object.prototype.toString.call(new Map().entries())``
	   *  - Edge <=13 === "[object Object]"
	   */
	  if (mapExists && objPrototype === mapIteratorPrototype) {
	    return 'Map Iterator';
	  }

	  /* ! Spec Conformance
	   * (http://www.ecma-international.org/ecma-262/6.0/index.html#sec-%setiteratorprototype%-@@tostringtag)
	   * ES6$23.2.5.2.2 - %SetIteratorPrototype%[@@toStringTag] should be "Set Iterator":
	   * Test: `Object.prototype.toString.call(new Set().entries())``
	   *  - Edge <=13 === "[object Object]"
	   */
	  if (setExists && objPrototype === setIteratorPrototype) {
	    return 'Set Iterator';
	  }

	  /* ! Spec Conformance
	   * (http://www.ecma-international.org/ecma-262/6.0/index.html#sec-%arrayiteratorprototype%-@@tostringtag)
	   * ES6$22.1.5.2.2 - %ArrayIteratorPrototype%[@@toStringTag] should be "Array Iterator":
	   * Test: `Object.prototype.toString.call([][Symbol.iterator]())``
	   *  - Edge <=13 === "[object Object]"
	   */
	  if (arrayIteratorExists && objPrototype === arrayIteratorPrototype) {
	    return 'Array Iterator';
	  }

	  /* ! Spec Conformance
	   * (http://www.ecma-international.org/ecma-262/6.0/index.html#sec-%stringiteratorprototype%-@@tostringtag)
	   * ES6$21.1.5.2.2 - %StringIteratorPrototype%[@@toStringTag] should be "String Iterator":
	   * Test: `Object.prototype.toString.call(''[Symbol.iterator]())``
	   *  - Edge <=13 === "[object Object]"
	   */
	  if (stringIteratorExists && objPrototype === stringIteratorPrototype) {
	    return 'String Iterator';
	  }

	  /* ! Speed optimisation
	  * Pre:
	  *   object from null   x 2,424,320 ops/sec ±1.67% (76 runs sampled)
	  * Post:
	  *   object from null   x 5,838,000 ops/sec ±0.99% (84 runs sampled)
	  */
	  if (objPrototype === null) {
	    return 'Object';
	  }

	  return Object
	    .prototype
	    .toString
	    .call(obj)
	    .slice(toStringLeftSliceLength, toStringRightSliceLength);
	}

	return typeDetect;

	})));
	});

	function _slicedToArray(arr, i) {
	  return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
	}

	function _arrayWithHoles(arr) {
	  if (Array.isArray(arr)) return arr;
	}

	function _iterableToArrayLimit(arr, i) {
	  if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return;
	  var _arr = [];
	  var _n = true;
	  var _d = false;
	  var _e = undefined;

	  try {
	    for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
	      _arr.push(_s.value);

	      if (i && _arr.length === i) break;
	    }
	  } catch (err) {
	    _d = true;
	    _e = err;
	  } finally {
	    try {
	      if (!_n && _i["return"] != null) _i["return"]();
	    } finally {
	      if (_d) throw _e;
	    }
	  }

	  return _arr;
	}

	function _unsupportedIterableToArray(o, minLen) {
	  if (!o) return;
	  if (typeof o === "string") return _arrayLikeToArray(o, minLen);
	  var n = Object.prototype.toString.call(o).slice(8, -1);
	  if (n === "Object" && o.constructor) n = o.constructor.name;
	  if (n === "Map" || n === "Set") return Array.from(n);
	  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
	}

	function _arrayLikeToArray(arr, len) {
	  if (len == null || len > arr.length) len = arr.length;

	  for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

	  return arr2;
	}

	function _nonIterableRest() {
	  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
	}

	var ansiColors = {
	  bold: ['1', '22'],
	  dim: ['2', '22'],
	  italic: ['3', '23'],
	  underline: ['4', '24'],
	  // 5 & 6 are blinking
	  inverse: ['7', '27'],
	  hidden: ['8', '28'],
	  strike: ['9', '29'],
	  // 10-20 are fonts
	  // 21-29 are resets for 1-9
	  black: ['30', '39'],
	  red: ['31', '39'],
	  green: ['32', '39'],
	  yellow: ['33', '39'],
	  blue: ['34', '39'],
	  magenta: ['35', '39'],
	  cyan: ['36', '39'],
	  white: ['37', '39'],
	  brightblack: ['30;1', '39'],
	  brightred: ['31;1', '39'],
	  brightgreen: ['32;1', '39'],
	  brightyellow: ['33;1', '39'],
	  brightblue: ['34;1', '39'],
	  brightmagenta: ['35;1', '39'],
	  brightcyan: ['36;1', '39'],
	  brightwhite: ['37;1', '39'],
	  grey: ['90', '39']
	};
	var styles = {
	  special: 'cyan',
	  number: 'yellow',
	  boolean: 'yellow',
	  undefined: 'grey',
	  null: 'bold',
	  string: 'green',
	  symbol: 'green',
	  date: 'magenta',
	  regexp: 'red'
	};
	var truncator = '…';

	function colorise(value, styleType) {
	  var color = ansiColors[styles[styleType]] || ansiColors[styleType];

	  if (!color) {
	    return String(value);
	  }

	  return "\x1B[".concat(color[0], "m").concat(String(value), "\x1B[").concat(color[1], "m");
	}

	function normaliseOptions() {
	  var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
	      _ref$showHidden = _ref.showHidden,
	      showHidden = _ref$showHidden === void 0 ? false : _ref$showHidden,
	      _ref$depth = _ref.depth,
	      depth = _ref$depth === void 0 ? 2 : _ref$depth,
	      _ref$colors = _ref.colors,
	      colors = _ref$colors === void 0 ? false : _ref$colors,
	      _ref$customInspect = _ref.customInspect,
	      customInspect = _ref$customInspect === void 0 ? true : _ref$customInspect,
	      _ref$showProxy = _ref.showProxy,
	      showProxy = _ref$showProxy === void 0 ? false : _ref$showProxy,
	      _ref$maxArrayLength = _ref.maxArrayLength,
	      maxArrayLength = _ref$maxArrayLength === void 0 ? Infinity : _ref$maxArrayLength,
	      _ref$breakLength = _ref.breakLength,
	      breakLength = _ref$breakLength === void 0 ? Infinity : _ref$breakLength,
	      _ref$seen = _ref.seen,
	      seen = _ref$seen === void 0 ? [] : _ref$seen,
	      _ref$truncate = _ref.truncate,
	      truncate = _ref$truncate === void 0 ? Infinity : _ref$truncate,
	      _ref$stylize = _ref.stylize,
	      stylize = _ref$stylize === void 0 ? String : _ref$stylize;

	  var options = {
	    showHidden: Boolean(showHidden),
	    depth: Number(depth),
	    colors: Boolean(colors),
	    customInspect: Boolean(customInspect),
	    showProxy: Boolean(showProxy),
	    maxArrayLength: Number(maxArrayLength),
	    breakLength: Number(breakLength),
	    truncate: Number(truncate),
	    seen: seen,
	    stylize: stylize
	  };

	  if (options.colors) {
	    options.stylize = colorise;
	  }

	  return options;
	}
	function truncate(string, length) {
	  var tail = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : truncator;
	  string = String(string);
	  var tailLength = tail.length;
	  var stringLength = string.length;

	  if (tailLength > length && stringLength > tailLength) {
	    return tail;
	  }

	  if (stringLength > length && stringLength > tailLength) {
	    return "".concat(string.slice(0, length - tailLength)).concat(tail);
	  }

	  return string;
	} // eslint-disable-next-line complexity

	function inspectList(list, options, inspectItem) {
	  var separator = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : ', ';
	  inspectItem = inspectItem || options.inspect;
	  var size = list.length;
	  if (size === 0) return '';
	  var originalLength = options.truncate;
	  var output = '';
	  var peek = '';
	  var truncated = '';

	  for (var i = 0; i < size; i += 1) {
	    var last = i + 1 === list.length;
	    var secondToLast = i + 2 === list.length;
	    truncated = "".concat(truncator, "(").concat(list.length - i, ")");
	    var value = list[i]; // If there is more than one remaining we need to account for a separator of `, `

	    options.truncate = originalLength - output.length - (last ? 0 : separator.length);
	    var string = peek || inspectItem(value, options) + (last ? '' : separator);
	    var nextLength = output.length + string.length;
	    var truncatedLength = nextLength + truncated.length; // If this is the last element, and adding it would
	    // take us over length, but adding the truncator wouldn't - then break now

	    if (last && nextLength > originalLength && output.length + truncated.length <= originalLength) {
	      break;
	    } // If this isn't the last or second to last element to scan,
	    // but the string is already over length then break here


	    if (!last && !secondToLast && truncatedLength > originalLength) {
	      break;
	    } // Peek at the next string to determine if we should
	    // break early before adding this item to the output


	    peek = last ? '' : inspectItem(list[i + 1], options) + (secondToLast ? '' : separator); // If we have one element left, but this element and
	    // the next takes over length, the break early

	    if (!last && secondToLast && truncatedLength > originalLength && nextLength + peek.length > originalLength) {
	      break;
	    }

	    output += string; // If the next element takes us to length -
	    // but there are more after that, then we should truncate now

	    if (!last && !secondToLast && nextLength + peek.length >= originalLength) {
	      truncated = "".concat(truncator, "(").concat(list.length - i - 1, ")");
	      break;
	    }

	    truncated = '';
	  }

	  return "".concat(output).concat(truncated);
	}
	function inspectProperty(_ref2, options) {
	  var _ref3 = _slicedToArray(_ref2, 2),
	      key = _ref3[0],
	      value = _ref3[1];

	  options.truncate -= 2;

	  if (typeof key !== 'string' && typeof key !== 'number') {
	    key = "[".concat(options.inspect(key, options), "]");
	  }

	  options.truncate -= key.length;
	  value = options.inspect(value, options);
	  return "".concat(key, ": ").concat(value);
	}

	function inspectArray(array, options) {
	  // Object.keys will always output the Array indices first, so we can slice by
	  // `array.length` to get non-index properties
	  var nonIndexProperties = Object.keys(array).slice(array.length);
	  if (!array.length && !nonIndexProperties.length) return '[]';
	  options.truncate -= 4;
	  var listContents = inspectList(array, options);
	  options.truncate -= listContents.length;
	  var propertyContents = '';

	  if (nonIndexProperties.length) {
	    propertyContents = inspectList(nonIndexProperties.map(function (key) {
	      return [key, array[key]];
	    }), options, inspectProperty);
	  }

	  return "[ ".concat(listContents).concat(propertyContents ? ", ".concat(propertyContents) : '', " ]");
	}

	/* !
	 * Chai - getFuncName utility
	 * Copyright(c) 2012-2016 Jake Luer <jake@alogicalparadox.com>
	 * MIT Licensed
	 */

	/**
	 * ### .getFuncName(constructorFn)
	 *
	 * Returns the name of a function.
	 * When a non-function instance is passed, returns `null`.
	 * This also includes a polyfill function if `aFunc.name` is not defined.
	 *
	 * @name getFuncName
	 * @param {Function} funct
	 * @namespace Utils
	 * @api public
	 */

	var toString = Function.prototype.toString;
	var functionNameMatch = /\s*function(?:\s|\s*\/\*[^(?:*\/)]+\*\/\s*)*([^\s\(\/]+)/;
	function getFuncName(aFunc) {
	  if (typeof aFunc !== 'function') {
	    return null;
	  }

	  var name = '';
	  if (typeof Function.prototype.name === 'undefined' && typeof aFunc.name === 'undefined') {
	    // Here we run a polyfill if Function does not support the `name` property and if aFunc.name is not defined
	    var match = toString.call(aFunc).match(functionNameMatch);
	    if (match) {
	      name = match[1];
	    }
	  } else {
	    // If we've got a `name` property we just use it
	    name = aFunc.name;
	  }

	  return name;
	}

	var getFuncName_1 = getFuncName;

	var toStringTag = typeof Symbol !== 'undefined' && Symbol.toStringTag ? Symbol.toStringTag : false;

	var getArrayName = function getArrayName(array) {
	  // We need to special case Node.js' Buffers, which report to be Uint8Array
	  if (typeof Buffer === 'function' && array instanceof Buffer) {
	    return 'Buffer';
	  }

	  if (toStringTag && toStringTag in array) {
	    return array[toStringTag];
	  }

	  return getFuncName_1(array.constructor);
	};

	function inspectTypedArray(array, options) {
	  var name = getArrayName(array);
	  options.truncate -= name.length + 4; // Object.keys will always output the Array indices first, so we can slice by
	  // `array.length` to get non-index properties

	  var nonIndexProperties = Object.keys(array).slice(array.length);
	  if (!array.length && !nonIndexProperties.length) return "".concat(name, "[]"); // As we know TypedArrays only contain Unsigned Integers, we can skip inspecting each one and simply
	  // stylise the toString() value of them

	  var output = '';

	  for (var i = 0; i < array.length; i++) {
	    var string = "".concat(options.stylize(truncate(array[i], options.truncate), 'number')).concat(array[i] === array.length ? '' : ', ');
	    options.truncate -= string.length;

	    if (array[i] !== array.length && options.truncate <= 3) {
	      output += "".concat(truncator, "(").concat(array.length - array[i] + 1, ")");
	      break;
	    }

	    output += string;
	  }

	  var propertyContents = '';

	  if (nonIndexProperties.length) {
	    propertyContents = inspectList(nonIndexProperties.map(function (key) {
	      return [key, array[key]];
	    }), options, inspectProperty);
	  }

	  return "".concat(name, "[ ").concat(output).concat(propertyContents ? ", ".concat(propertyContents) : '', " ]");
	}

	function inspectDate(dateObject, options) {
	  // If we need to - truncate the time portion, but never the date
	  var split = dateObject.toJSON().split('T');
	  var date = split[0];
	  return options.stylize("".concat(date, "T").concat(truncate(split[1], options.truncate - date.length - 1)), 'date');
	}

	var toString$1 = Object.prototype.toString;

	var getFunctionName = function(fn) {
	  if (toString$1.call(fn) !== '[object Function]') return null
	  if (fn.name) return fn.name
	  var name = /^\s*function\s*([^\(]*)/im.exec(fn.toString())[1];
	  return name || 'anonymous'
	};

	function inspectFunction(func, options) {
	  var name = getFunctionName(func);

	  if (name === 'anonymous') {
	    return options.stylize('[Function]', 'special');
	  }

	  return options.stylize("[Function ".concat(truncate(name, options.truncate - 11), "]"), 'special');
	}

	function inspectMapEntry(_ref, options) {
	  var _ref2 = _slicedToArray(_ref, 2),
	      key = _ref2[0],
	      value = _ref2[1];

	  options.truncate -= 4;
	  key = options.inspect(key, options);
	  options.truncate -= key.length;
	  value = options.inspect(value, options);
	  return "".concat(key, " => ").concat(value);
	} // IE11 doesn't support `map.entries()`


	function mapToEntries(map) {
	  var entries = [];
	  map.forEach(function (value, key) {
	    entries.push([key, value]);
	  });
	  return entries;
	}

	function inspectMap(map, options) {
	  var size = map.size - 1;

	  if (size <= 0) {
	    return 'Map{}';
	  }

	  options.truncate -= 7;
	  return "Map{ ".concat(inspectList(mapToEntries(map), options, inspectMapEntry), " }");
	}

	var isNaN = Number.isNaN || function (i) {
	  return i !== i;
	}; // eslint-disable-line no-self-compare


	function inspectNumber(number, options) {
	  if (isNaN(number)) {
	    return options.stylize('NaN', 'number');
	  }

	  if (number === Infinity) {
	    return options.stylize('Infinity', 'number');
	  }

	  if (number === -Infinity) {
	    return options.stylize('-Infinity', 'number');
	  }

	  if (number === 0) {
	    return options.stylize(1 / number === Infinity ? '+0' : '-0', 'number');
	  }

	  return options.stylize(truncate(number, options.truncate), 'number');
	}

	function inspectRegExp(value, options) {
	  var flags = value.toString().split('/')[2];
	  var sourceLength = options.truncate - (2 + flags.length);
	  var source = value.source;
	  return options.stylize("/".concat(truncate(source, sourceLength), "/").concat(flags), 'regexp');
	}

	function arrayFromSet(set) {
	  var values = [];
	  set.forEach(function (value) {
	    values.push(value);
	  });
	  return values;
	}

	function inspectSet(set, options) {
	  if (set.size === 0) return 'Set{}';
	  options.truncate -= 7;
	  return "Set{ ".concat(inspectList(arrayFromSet(set), options), " }");
	}

	var stringEscapeChars = new RegExp("['\\u0000-\\u001f\\u007f-\\u009f\\u00ad\\u0600-\\u0604\\u070f\\u17b4\\u17b5" + "\\u200c-\\u200f\\u2028-\\u202f\\u2060-\\u206f\\ufeff\\ufff0-\\uffff]", 'g');
	var escapeCharacters = {
	  '\b': '\\b',
	  '\t': '\\t',
	  '\n': '\\n',
	  '\f': '\\f',
	  '\r': '\\r',
	  "'": "\\'",
	  '\\': '\\\\'
	};
	var hex = 16;
	var unicodeLength = 4;

	function escape(char) {
	  return escapeCharacters[char] || "\\u".concat("0000".concat(char.charCodeAt(0).toString(hex)).slice(-unicodeLength));
	}

	function inspectString(string, options) {
	  if (stringEscapeChars.test(string)) {
	    string = string.replace(stringEscapeChars, escape);
	  }

	  return options.stylize("'".concat(truncate(string, options.truncate - 2), "'"), 'string');
	}

	function inspectSymbol(value) {
	  if ('description' in Symbol.prototype) {
	    return "Symbol(".concat(value.description, ")");
	  }

	  return value.toString();
	}

	var getPromiseValue = function getPromiseValue() {
	  return 'Promise{…}';
	};

	try {
	  var _process$binding = process.binding('util'),
	      getPromiseDetails = _process$binding.getPromiseDetails,
	      kPending = _process$binding.kPending,
	      kRejected = _process$binding.kRejected;

	  getPromiseValue = function getPromiseValue(value, options) {
	    var _getPromiseDetails = getPromiseDetails(value),
	        _getPromiseDetails2 = _slicedToArray(_getPromiseDetails, 2),
	        state = _getPromiseDetails2[0],
	        innerValue = _getPromiseDetails2[1];

	    if (state === kPending) {
	      return 'Promise{<pending>}';
	    }

	    return "Promise".concat(state === kRejected ? '!' : '', "{").concat(options.inspect(innerValue, options), "}");
	  };
	} catch (notNode) {
	  /* ignore */
	}

	var inspectPromise = getPromiseValue;

	function inspectObject(object, options) {
	  var properties = Object.getOwnPropertyNames(object);
	  var symbols = Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols(object) : [];

	  if (properties.length === 0 && symbols.length === 0) {
	    return '{}';
	  }

	  options.truncate -= 4;
	  var propertyContents = inspectList(properties.map(function (key) {
	    return [key, object[key]];
	  }), options, inspectProperty);
	  var symbolContents = inspectList(symbols.map(function (key) {
	    return [key, object[key]];
	  }), options, inspectProperty);
	  var sep = '';

	  if (propertyContents && symbolContents) {
	    sep = ', ';
	  }

	  return "{ ".concat(propertyContents).concat(sep).concat(symbolContents, " }");
	}

	var toStringTag$1 = typeof Symbol !== 'undefined' && Symbol.toStringTag ? Symbol.toStringTag : false;
	function inspectClass(value, options) {
	  var name = '';

	  if (toStringTag$1 && toStringTag$1 in value) {
	    name = value[toStringTag$1];
	  }

	  name = name || getFuncName_1(value.constructor); // Babel transforms anonymous classes to the name `_class`

	  if (!name || name === '_class') {
	    name = '<Anonymous Class>';
	  }

	  options.truncate -= name.length;
	  return "".concat(name).concat(inspectObject(value, options));
	}

	function inspectArguments(args, options) {
	  if (args.length === 0) return 'Arguments[]';
	  options.truncate -= 13;
	  return "Arguments[ ".concat(inspectList(args, options), " ]");
	}

	var errorKeys = ['stack', 'line', 'column', 'name', 'message', 'fileName', 'lineNumber', 'columnNumber', 'number', 'description'];
	function inspectObject$1(error, options) {
	  var properties = Object.getOwnPropertyNames(error).filter(function (key) {
	    return errorKeys.indexOf(key) === -1;
	  });
	  var name = error.name;
	  options.truncate -= name.length;
	  var message = '';

	  if (typeof error.message === 'string') {
	    message = truncate(error.message, options.truncate);
	  } else {
	    properties.unshift('message');
	  }

	  message = message ? ": ".concat(message) : '';
	  options.truncate -= message.length + 5;
	  var propertyContents = inspectList(properties.map(function (key) {
	    return [key, error[key]];
	  }), options, inspectProperty);
	  return "".concat(name).concat(message).concat(propertyContents ? " { ".concat(propertyContents, " }") : '');
	}

	function inspectAttribute(_ref, options) {
	  var _ref2 = _slicedToArray(_ref, 2),
	      key = _ref2[0],
	      value = _ref2[1];

	  options.truncate -= 3;

	  if (!value) {
	    return "".concat(options.stylize(key, 'yellow'));
	  }

	  return "".concat(options.stylize(key, 'yellow'), "=").concat(options.stylize("\"".concat(value, "\""), 'string'));
	}
	function inspectHTMLCollection(collection, options) {
	  // eslint-disable-next-line no-use-before-define
	  return inspectList(collection, options, inspectHTML, '\n');
	}
	function inspectHTML(element, options) {
	  var properties = element.getAttributeNames();
	  var name = element.tagName.toLowerCase();
	  var head = options.stylize("<".concat(name), 'special');
	  var headClose = options.stylize(">", 'special');
	  var tail = options.stylize("</".concat(name, ">"), 'special');
	  options.truncate -= name.length * 2 + 5;
	  var propertyContents = '';

	  if (properties.length > 0) {
	    propertyContents += ' ';
	    propertyContents += inspectList(properties.map(function (key) {
	      return [key, element.getAttribute(key)];
	    }), options, inspectAttribute, ' ');
	  }

	  options.truncate -= propertyContents.length;
	  var truncate = options.truncate;
	  var children = inspectHTMLCollection(element.children, options);

	  if (children && children.length > truncate) {
	    children = "".concat(truncator, "(").concat(element.children.length, ")");
	  }

	  return "".concat(head).concat(propertyContents).concat(headClose).concat(children).concat(tail);
	}

	/* !
	 * loupe
	 * Copyright(c) 2013 Jake Luer <jake@alogicalparadox.com>
	 * MIT Licensed
	 */
	var symbolsSupported = typeof Symbol === 'function' && typeof Symbol.for === 'function';
	var chaiInspect = symbolsSupported ? Symbol.for('chai/inspect') : '@@chai/inspect';
	var nodeInspect = false;

	try {
	  // eslint-disable-next-line global-require
	  nodeInspect = require('util').inspect.custom;
	} catch (noNodeInspect) {
	  nodeInspect = false;
	}

	var constructorMap = new WeakMap();
	var stringTagMap = {};
	var baseTypesMap = {
	  undefined: function undefined$1(value, options) {
	    return options.stylize('undefined', 'undefined');
	  },
	  null: function _null(value, options) {
	    return options.stylize(null, 'null');
	  },
	  boolean: function boolean(value, options) {
	    return options.stylize(value, 'boolean');
	  },
	  Boolean: function Boolean(value, options) {
	    return options.stylize(value, 'boolean');
	  },
	  number: inspectNumber,
	  Number: inspectNumber,
	  string: inspectString,
	  String: inspectString,
	  function: inspectFunction,
	  Function: inspectFunction,
	  symbol: inspectSymbol,
	  // A Symbol polyfill will return `Symbol` not `symbol` from typedetect
	  Symbol: inspectSymbol,
	  Array: inspectArray,
	  Date: inspectDate,
	  Map: inspectMap,
	  Set: inspectSet,
	  RegExp: inspectRegExp,
	  Promise: inspectPromise,
	  // WeakSet, WeakMap are totally opaque to us
	  WeakSet: function WeakSet(value, options) {
	    return options.stylize('WeakSet{…}', 'special');
	  },
	  WeakMap: function WeakMap(value, options) {
	    return options.stylize('WeakMap{…}', 'special');
	  },
	  Arguments: inspectArguments,
	  Int8Array: inspectTypedArray,
	  Uint8Array: inspectTypedArray,
	  Uint8ClampedArray: inspectTypedArray,
	  Int16Array: inspectTypedArray,
	  Uint16Array: inspectTypedArray,
	  Int32Array: inspectTypedArray,
	  Uint32Array: inspectTypedArray,
	  Float32Array: inspectTypedArray,
	  Float64Array: inspectTypedArray,
	  Generator: function Generator() {
	    return '';
	  },
	  DataView: function DataView() {
	    return '';
	  },
	  ArrayBuffer: function ArrayBuffer() {
	    return '';
	  },
	  Error: inspectObject$1,
	  HTMLCollection: inspectHTMLCollection,
	  NodeList: inspectHTMLCollection
	}; // eslint-disable-next-line complexity

	var inspectCustom = function inspectCustom(value, options, type) {
	  if (chaiInspect in value && typeof value[chaiInspect] === 'function') {
	    return value[chaiInspect](options);
	  }

	  if (nodeInspect && nodeInspect in value && typeof value[nodeInspect] === 'function') {
	    return value[nodeInspect](options.depth, options);
	  }

	  if ('inspect' in value && typeof value.inspect === 'function') {
	    return value.inspect(options.depth, options);
	  }

	  if ('constructor' in value && constructorMap.has(value.constructor)) {
	    return constructorMap.get(value.constructor)(value, options);
	  }

	  if (stringTagMap[type]) {
	    return stringTagMap[type](value, options);
	  }

	  return '';
	}; // eslint-disable-next-line complexity


	function inspect(value, options) {
	  options = normaliseOptions(options);
	  options.inspect = inspect;
	  var _options = options,
	      customInspect = _options.customInspect;
	  var type = typeDetect(value); // If it is a base value that we already support, then use Loupe's inspector

	  if (baseTypesMap[type]) {
	    return baseTypesMap[type](value, options);
	  }

	  var proto = value ? Object.getPrototypeOf(value) : false; // If it's a plain Object then use Loupe's inspector

	  if (proto === Object.prototype || proto === null) {
	    return inspectObject(value, options);
	  } // Specifically account for HTMLElements
	  // eslint-disable-next-line no-undef


	  if (value && typeof HTMLElement === 'function' && value instanceof HTMLElement) {
	    return inspectHTML(value, options);
	  } // If `options.customInspect` is set to true then try to use the custom inspector


	  if (customInspect && value) {
	    var output = inspectCustom(value, options, type);
	    if (output) return output;
	  } // If it is a class, inspect it like an object but add the constructor name


	  if ('constructor' in value && value.constructor !== Object) {
	    return inspectClass(value, options);
	  } // We have run out of options! Just stringify the value


	  return options.stylize(String(value), type);
	}
	function registerConstructor(constructor, inspector) {
	  if (constructorMap.has(constructor)) {
	    return false;
	  }

	  constructorMap.add(constructor, inspector);
	  return true;
	}
	function registerStringTag(stringTag, inspector) {
	  if (stringTag in stringTagMap) {
	    return false;
	  }

	  stringTagMap[stringTag] = inspector;
	  return true;
	}
	var custom = chaiInspect;

	exports.custom = custom;
	exports.default = inspect;
	exports.inspect = inspect;
	exports.registerConstructor = registerConstructor;
	exports.registerStringTag = registerStringTag;

	Object.defineProperty(exports, '__esModule', { value: true });

})));

}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)

},{"_process":24,"buffer":4,"util":27}],34:[function(require,module,exports){

var type = require('./jkroso-type')

// (any, any, [array]) -> boolean
function equal(a, b, memos){
  // All identical values are equivalent
  if (a === b) return true
  var fnA = types[type(a)]
  var fnB = types[type(b)]
  return fnA && fnA === fnB
    ? fnA(a, b, memos)
    : false
}

var types = {}

// (Number) -> boolean
types.number = function(a, b){
  return a !== a && b !== b/*Nan check*/
}

// (function, function, array) -> boolean
types['function'] = function(a, b, memos){
  return a.toString() === b.toString()
    // Functions can act as objects
    && types.object(a, b, memos)
    && equal(a.prototype, b.prototype)
}

// (date, date) -> boolean
types.date = function(a, b){
  return +a === +b
}

// (regexp, regexp) -> boolean
types.regexp = function(a, b){
  return a.toString() === b.toString()
}

// (DOMElement, DOMElement) -> boolean
types.element = function(a, b){
  return a.outerHTML === b.outerHTML
}

// (textnode, textnode) -> boolean
types.textnode = function(a, b){
  return a.textContent === b.textContent
}

// decorate fn to prevent it re-checking objects
// (function) -> function
function memoGaurd(fn){
  return function(a, b, memos){
    if (!memos) return fn(a, b, [])
    var i = memos.length, memo
    while (memo = memos[--i]) {
      if (memo[0] === a && memo[1] === b) return true
    }
    return fn(a, b, memos)
  }
}

types['arguments'] =
types['bit-array'] =
types.array = memoGaurd(arrayEqual)

// (array, array, array) -> boolean
function arrayEqual(a, b, memos){
  var i = a.length
  if (i !== b.length) return false
  memos.push([a, b])
  while (i--) {
    if (!equal(a[i], b[i], memos)) return false
  }
  return true
}

types.object = memoGaurd(objectEqual)

// (object, object, array) -> boolean
function objectEqual(a, b, memos) {
  if (typeof a.equal == 'function') {
    memos.push([a, b])
    return a.equal(b, memos)
  }
  var ka = getEnumerableProperties(a)
  var kb = getEnumerableProperties(b)
  var i = ka.length

  // same number of properties
  if (i !== kb.length) return false

  // although not necessarily the same order
  ka.sort()
  kb.sort()

  // cheap key test
  while (i--) if (ka[i] !== kb[i]) return false

  // remember
  memos.push([a, b])

  // iterate again this time doing a thorough check
  i = ka.length
  while (i--) {
    var key = ka[i]
    if (!equal(a[key], b[key], memos)) return false
  }

  return true
}

// (object) -> array
function getEnumerableProperties (object) {
  var result = []
  for (var k in object) if (k !== 'constructor') {
    result.push(k)
  }
  return result
}

module.exports = equal


},{"./jkroso-type":35}],35:[function(require,module,exports){

var toString = {}.toString
var DomNode = typeof window != 'undefined'
  ? window.Node
  : Function // could be any function

/**
 * Return the type of val.
 *
 * @param {Mixed} val
 * @return {String}
 * @api public
 */

module.exports = exports = function type(x){
  var type = typeof x
  if (type != 'object') return type
  type = types[toString.call(x)]
  if (type == 'object') {
    // in case they have been polyfilled
    if (x instanceof Map) return 'map'
    if (x instanceof Set) return 'set'
    return 'object'
  }
  if (type) return type
  if (x instanceof DomNode) switch (x.nodeType) {
    case 1:  return 'element'
    case 3:  return 'text-node'
    case 9:  return 'document'
    case 11: return 'document-fragment'
    default: return 'dom-node'
  }
}

var types = exports.types = {
  '[object Function]': 'function',
  '[object Date]': 'date',
  '[object RegExp]': 'regexp',
  '[object Arguments]': 'arguments',
  '[object Array]': 'array',
  '[object Set]': 'set',
  '[object String]': 'string',
  '[object Null]': 'null',
  '[object Undefined]': 'undefined',
  '[object Number]': 'number',
  '[object Boolean]': 'boolean',
  '[object Object]': 'object',
  '[object Map]': 'map',
  '[object Text]': 'text-node',
  '[object Uint8Array]': 'bit-array',
  '[object Uint16Array]': 'bit-array',
  '[object Uint32Array]': 'bit-array',
  '[object Uint8ClampedArray]': 'bit-array',
  '[object Error]': 'error',
  '[object FormData]': 'form-data',
  '[object File]': 'file',
  '[object Blob]': 'blob'
}


},{}],36:[function(require,module,exports){
(function (global,Buffer){(function (){
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.loupe = {}));
}(this, (function (exports) { 'use strict';

	var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	function createCommonjsModule(fn) {
	  var module = { exports: {} };
		return fn(module, module.exports), module.exports;
	}

	var typeDetect = createCommonjsModule(function (module, exports) {
	(function (global, factory) {
		 module.exports = factory() ;
	}(commonjsGlobal, (function () {
	/* !
	 * type-detect
	 * Copyright(c) 2013 jake luer <jake@alogicalparadox.com>
	 * MIT Licensed
	 */
	var promiseExists = typeof Promise === 'function';

	/* eslint-disable no-undef */
	var globalObject = typeof self === 'object' ? self : commonjsGlobal; // eslint-disable-line id-blacklist

	var symbolExists = typeof Symbol !== 'undefined';
	var mapExists = typeof Map !== 'undefined';
	var setExists = typeof Set !== 'undefined';
	var weakMapExists = typeof WeakMap !== 'undefined';
	var weakSetExists = typeof WeakSet !== 'undefined';
	var dataViewExists = typeof DataView !== 'undefined';
	var symbolIteratorExists = symbolExists && typeof Symbol.iterator !== 'undefined';
	var symbolToStringTagExists = symbolExists && typeof Symbol.toStringTag !== 'undefined';
	var setEntriesExists = setExists && typeof Set.prototype.entries === 'function';
	var mapEntriesExists = mapExists && typeof Map.prototype.entries === 'function';
	var setIteratorPrototype = setEntriesExists && Object.getPrototypeOf(new Set().entries());
	var mapIteratorPrototype = mapEntriesExists && Object.getPrototypeOf(new Map().entries());
	var arrayIteratorExists = symbolIteratorExists && typeof Array.prototype[Symbol.iterator] === 'function';
	var arrayIteratorPrototype = arrayIteratorExists && Object.getPrototypeOf([][Symbol.iterator]());
	var stringIteratorExists = symbolIteratorExists && typeof String.prototype[Symbol.iterator] === 'function';
	var stringIteratorPrototype = stringIteratorExists && Object.getPrototypeOf(''[Symbol.iterator]());
	var toStringLeftSliceLength = 8;
	var toStringRightSliceLength = -1;
	/**
	 * ### typeOf (obj)
	 *
	 * Uses `Object.prototype.toString` to determine the type of an object,
	 * normalising behaviour across engine versions & well optimised.
	 *
	 * @param {Mixed} object
	 * @return {String} object type
	 * @api public
	 */
	function typeDetect(obj) {
	  /* ! Speed optimisation
	   * Pre:
	   *   string literal     x 3,039,035 ops/sec ±1.62% (78 runs sampled)
	   *   boolean literal    x 1,424,138 ops/sec ±4.54% (75 runs sampled)
	   *   number literal     x 1,653,153 ops/sec ±1.91% (82 runs sampled)
	   *   undefined          x 9,978,660 ops/sec ±1.92% (75 runs sampled)
	   *   function           x 2,556,769 ops/sec ±1.73% (77 runs sampled)
	   * Post:
	   *   string literal     x 38,564,796 ops/sec ±1.15% (79 runs sampled)
	   *   boolean literal    x 31,148,940 ops/sec ±1.10% (79 runs sampled)
	   *   number literal     x 32,679,330 ops/sec ±1.90% (78 runs sampled)
	   *   undefined          x 32,363,368 ops/sec ±1.07% (82 runs sampled)
	   *   function           x 31,296,870 ops/sec ±0.96% (83 runs sampled)
	   */
	  var typeofObj = typeof obj;
	  if (typeofObj !== 'object') {
	    return typeofObj;
	  }

	  /* ! Speed optimisation
	   * Pre:
	   *   null               x 28,645,765 ops/sec ±1.17% (82 runs sampled)
	   * Post:
	   *   null               x 36,428,962 ops/sec ±1.37% (84 runs sampled)
	   */
	  if (obj === null) {
	    return 'null';
	  }

	  /* ! Spec Conformance
	   * Test: `Object.prototype.toString.call(window)``
	   *  - Node === "[object global]"
	   *  - Chrome === "[object global]"
	   *  - Firefox === "[object Window]"
	   *  - PhantomJS === "[object Window]"
	   *  - Safari === "[object Window]"
	   *  - IE 11 === "[object Window]"
	   *  - IE Edge === "[object Window]"
	   * Test: `Object.prototype.toString.call(this)``
	   *  - Chrome Worker === "[object global]"
	   *  - Firefox Worker === "[object DedicatedWorkerGlobalScope]"
	   *  - Safari Worker === "[object DedicatedWorkerGlobalScope]"
	   *  - IE 11 Worker === "[object WorkerGlobalScope]"
	   *  - IE Edge Worker === "[object WorkerGlobalScope]"
	   */
	  if (obj === globalObject) {
	    return 'global';
	  }

	  /* ! Speed optimisation
	   * Pre:
	   *   array literal      x 2,888,352 ops/sec ±0.67% (82 runs sampled)
	   * Post:
	   *   array literal      x 22,479,650 ops/sec ±0.96% (81 runs sampled)
	   */
	  if (
	    Array.isArray(obj) &&
	    (symbolToStringTagExists === false || !(Symbol.toStringTag in obj))
	  ) {
	    return 'Array';
	  }

	  // Not caching existence of `window` and related properties due to potential
	  // for `window` to be unset before tests in quasi-browser environments.
	  if (typeof window === 'object' && window !== null) {
	    /* ! Spec Conformance
	     * (https://html.spec.whatwg.org/multipage/browsers.html#location)
	     * WhatWG HTML$7.7.3 - The `Location` interface
	     * Test: `Object.prototype.toString.call(window.location)``
	     *  - IE <=11 === "[object Object]"
	     *  - IE Edge <=13 === "[object Object]"
	     */
	    if (typeof window.location === 'object' && obj === window.location) {
	      return 'Location';
	    }

	    /* ! Spec Conformance
	     * (https://html.spec.whatwg.org/#document)
	     * WhatWG HTML$3.1.1 - The `Document` object
	     * Note: Most browsers currently adher to the W3C DOM Level 2 spec
	     *       (https://www.w3.org/TR/DOM-Level-2-HTML/html.html#ID-26809268)
	     *       which suggests that browsers should use HTMLTableCellElement for
	     *       both TD and TH elements. WhatWG separates these.
	     *       WhatWG HTML states:
	     *         > For historical reasons, Window objects must also have a
	     *         > writable, configurable, non-enumerable property named
	     *         > HTMLDocument whose value is the Document interface object.
	     * Test: `Object.prototype.toString.call(document)``
	     *  - Chrome === "[object HTMLDocument]"
	     *  - Firefox === "[object HTMLDocument]"
	     *  - Safari === "[object HTMLDocument]"
	     *  - IE <=10 === "[object Document]"
	     *  - IE 11 === "[object HTMLDocument]"
	     *  - IE Edge <=13 === "[object HTMLDocument]"
	     */
	    if (typeof window.document === 'object' && obj === window.document) {
	      return 'Document';
	    }

	    if (typeof window.navigator === 'object') {
	      /* ! Spec Conformance
	       * (https://html.spec.whatwg.org/multipage/webappapis.html#mimetypearray)
	       * WhatWG HTML$8.6.1.5 - Plugins - Interface MimeTypeArray
	       * Test: `Object.prototype.toString.call(navigator.mimeTypes)``
	       *  - IE <=10 === "[object MSMimeTypesCollection]"
	       */
	      if (typeof window.navigator.mimeTypes === 'object' &&
	          obj === window.navigator.mimeTypes) {
	        return 'MimeTypeArray';
	      }

	      /* ! Spec Conformance
	       * (https://html.spec.whatwg.org/multipage/webappapis.html#pluginarray)
	       * WhatWG HTML$8.6.1.5 - Plugins - Interface PluginArray
	       * Test: `Object.prototype.toString.call(navigator.plugins)``
	       *  - IE <=10 === "[object MSPluginsCollection]"
	       */
	      if (typeof window.navigator.plugins === 'object' &&
	          obj === window.navigator.plugins) {
	        return 'PluginArray';
	      }
	    }

	    if ((typeof window.HTMLElement === 'function' ||
	        typeof window.HTMLElement === 'object') &&
	        obj instanceof window.HTMLElement) {
	      /* ! Spec Conformance
	      * (https://html.spec.whatwg.org/multipage/webappapis.html#pluginarray)
	      * WhatWG HTML$4.4.4 - The `blockquote` element - Interface `HTMLQuoteElement`
	      * Test: `Object.prototype.toString.call(document.createElement('blockquote'))``
	      *  - IE <=10 === "[object HTMLBlockElement]"
	      */
	      if (obj.tagName === 'BLOCKQUOTE') {
	        return 'HTMLQuoteElement';
	      }

	      /* ! Spec Conformance
	       * (https://html.spec.whatwg.org/#htmltabledatacellelement)
	       * WhatWG HTML$4.9.9 - The `td` element - Interface `HTMLTableDataCellElement`
	       * Note: Most browsers currently adher to the W3C DOM Level 2 spec
	       *       (https://www.w3.org/TR/DOM-Level-2-HTML/html.html#ID-82915075)
	       *       which suggests that browsers should use HTMLTableCellElement for
	       *       both TD and TH elements. WhatWG separates these.
	       * Test: Object.prototype.toString.call(document.createElement('td'))
	       *  - Chrome === "[object HTMLTableCellElement]"
	       *  - Firefox === "[object HTMLTableCellElement]"
	       *  - Safari === "[object HTMLTableCellElement]"
	       */
	      if (obj.tagName === 'TD') {
	        return 'HTMLTableDataCellElement';
	      }

	      /* ! Spec Conformance
	       * (https://html.spec.whatwg.org/#htmltableheadercellelement)
	       * WhatWG HTML$4.9.9 - The `td` element - Interface `HTMLTableHeaderCellElement`
	       * Note: Most browsers currently adher to the W3C DOM Level 2 spec
	       *       (https://www.w3.org/TR/DOM-Level-2-HTML/html.html#ID-82915075)
	       *       which suggests that browsers should use HTMLTableCellElement for
	       *       both TD and TH elements. WhatWG separates these.
	       * Test: Object.prototype.toString.call(document.createElement('th'))
	       *  - Chrome === "[object HTMLTableCellElement]"
	       *  - Firefox === "[object HTMLTableCellElement]"
	       *  - Safari === "[object HTMLTableCellElement]"
	       */
	      if (obj.tagName === 'TH') {
	        return 'HTMLTableHeaderCellElement';
	      }
	    }
	  }

	  /* ! Speed optimisation
	  * Pre:
	  *   Float64Array       x 625,644 ops/sec ±1.58% (80 runs sampled)
	  *   Float32Array       x 1,279,852 ops/sec ±2.91% (77 runs sampled)
	  *   Uint32Array        x 1,178,185 ops/sec ±1.95% (83 runs sampled)
	  *   Uint16Array        x 1,008,380 ops/sec ±2.25% (80 runs sampled)
	  *   Uint8Array         x 1,128,040 ops/sec ±2.11% (81 runs sampled)
	  *   Int32Array         x 1,170,119 ops/sec ±2.88% (80 runs sampled)
	  *   Int16Array         x 1,176,348 ops/sec ±5.79% (86 runs sampled)
	  *   Int8Array          x 1,058,707 ops/sec ±4.94% (77 runs sampled)
	  *   Uint8ClampedArray  x 1,110,633 ops/sec ±4.20% (80 runs sampled)
	  * Post:
	  *   Float64Array       x 7,105,671 ops/sec ±13.47% (64 runs sampled)
	  *   Float32Array       x 5,887,912 ops/sec ±1.46% (82 runs sampled)
	  *   Uint32Array        x 6,491,661 ops/sec ±1.76% (79 runs sampled)
	  *   Uint16Array        x 6,559,795 ops/sec ±1.67% (82 runs sampled)
	  *   Uint8Array         x 6,463,966 ops/sec ±1.43% (85 runs sampled)
	  *   Int32Array         x 5,641,841 ops/sec ±3.49% (81 runs sampled)
	  *   Int16Array         x 6,583,511 ops/sec ±1.98% (80 runs sampled)
	  *   Int8Array          x 6,606,078 ops/sec ±1.74% (81 runs sampled)
	  *   Uint8ClampedArray  x 6,602,224 ops/sec ±1.77% (83 runs sampled)
	  */
	  var stringTag = (symbolToStringTagExists && obj[Symbol.toStringTag]);
	  if (typeof stringTag === 'string') {
	    return stringTag;
	  }

	  var objPrototype = Object.getPrototypeOf(obj);
	  /* ! Speed optimisation
	  * Pre:
	  *   regex literal      x 1,772,385 ops/sec ±1.85% (77 runs sampled)
	  *   regex constructor  x 2,143,634 ops/sec ±2.46% (78 runs sampled)
	  * Post:
	  *   regex literal      x 3,928,009 ops/sec ±0.65% (78 runs sampled)
	  *   regex constructor  x 3,931,108 ops/sec ±0.58% (84 runs sampled)
	  */
	  if (objPrototype === RegExp.prototype) {
	    return 'RegExp';
	  }

	  /* ! Speed optimisation
	  * Pre:
	  *   date               x 2,130,074 ops/sec ±4.42% (68 runs sampled)
	  * Post:
	  *   date               x 3,953,779 ops/sec ±1.35% (77 runs sampled)
	  */
	  if (objPrototype === Date.prototype) {
	    return 'Date';
	  }

	  /* ! Spec Conformance
	   * (http://www.ecma-international.org/ecma-262/6.0/index.html#sec-promise.prototype-@@tostringtag)
	   * ES6$25.4.5.4 - Promise.prototype[@@toStringTag] should be "Promise":
	   * Test: `Object.prototype.toString.call(Promise.resolve())``
	   *  - Chrome <=47 === "[object Object]"
	   *  - Edge <=20 === "[object Object]"
	   *  - Firefox 29-Latest === "[object Promise]"
	   *  - Safari 7.1-Latest === "[object Promise]"
	   */
	  if (promiseExists && objPrototype === Promise.prototype) {
	    return 'Promise';
	  }

	  /* ! Speed optimisation
	  * Pre:
	  *   set                x 2,222,186 ops/sec ±1.31% (82 runs sampled)
	  * Post:
	  *   set                x 4,545,879 ops/sec ±1.13% (83 runs sampled)
	  */
	  if (setExists && objPrototype === Set.prototype) {
	    return 'Set';
	  }

	  /* ! Speed optimisation
	  * Pre:
	  *   map                x 2,396,842 ops/sec ±1.59% (81 runs sampled)
	  * Post:
	  *   map                x 4,183,945 ops/sec ±6.59% (82 runs sampled)
	  */
	  if (mapExists && objPrototype === Map.prototype) {
	    return 'Map';
	  }

	  /* ! Speed optimisation
	  * Pre:
	  *   weakset            x 1,323,220 ops/sec ±2.17% (76 runs sampled)
	  * Post:
	  *   weakset            x 4,237,510 ops/sec ±2.01% (77 runs sampled)
	  */
	  if (weakSetExists && objPrototype === WeakSet.prototype) {
	    return 'WeakSet';
	  }

	  /* ! Speed optimisation
	  * Pre:
	  *   weakmap            x 1,500,260 ops/sec ±2.02% (78 runs sampled)
	  * Post:
	  *   weakmap            x 3,881,384 ops/sec ±1.45% (82 runs sampled)
	  */
	  if (weakMapExists && objPrototype === WeakMap.prototype) {
	    return 'WeakMap';
	  }

	  /* ! Spec Conformance
	   * (http://www.ecma-international.org/ecma-262/6.0/index.html#sec-dataview.prototype-@@tostringtag)
	   * ES6$24.2.4.21 - DataView.prototype[@@toStringTag] should be "DataView":
	   * Test: `Object.prototype.toString.call(new DataView(new ArrayBuffer(1)))``
	   *  - Edge <=13 === "[object Object]"
	   */
	  if (dataViewExists && objPrototype === DataView.prototype) {
	    return 'DataView';
	  }

	  /* ! Spec Conformance
	   * (http://www.ecma-international.org/ecma-262/6.0/index.html#sec-%mapiteratorprototype%-@@tostringtag)
	   * ES6$23.1.5.2.2 - %MapIteratorPrototype%[@@toStringTag] should be "Map Iterator":
	   * Test: `Object.prototype.toString.call(new Map().entries())``
	   *  - Edge <=13 === "[object Object]"
	   */
	  if (mapExists && objPrototype === mapIteratorPrototype) {
	    return 'Map Iterator';
	  }

	  /* ! Spec Conformance
	   * (http://www.ecma-international.org/ecma-262/6.0/index.html#sec-%setiteratorprototype%-@@tostringtag)
	   * ES6$23.2.5.2.2 - %SetIteratorPrototype%[@@toStringTag] should be "Set Iterator":
	   * Test: `Object.prototype.toString.call(new Set().entries())``
	   *  - Edge <=13 === "[object Object]"
	   */
	  if (setExists && objPrototype === setIteratorPrototype) {
	    return 'Set Iterator';
	  }

	  /* ! Spec Conformance
	   * (http://www.ecma-international.org/ecma-262/6.0/index.html#sec-%arrayiteratorprototype%-@@tostringtag)
	   * ES6$22.1.5.2.2 - %ArrayIteratorPrototype%[@@toStringTag] should be "Array Iterator":
	   * Test: `Object.prototype.toString.call([][Symbol.iterator]())``
	   *  - Edge <=13 === "[object Object]"
	   */
	  if (arrayIteratorExists && objPrototype === arrayIteratorPrototype) {
	    return 'Array Iterator';
	  }

	  /* ! Spec Conformance
	   * (http://www.ecma-international.org/ecma-262/6.0/index.html#sec-%stringiteratorprototype%-@@tostringtag)
	   * ES6$21.1.5.2.2 - %StringIteratorPrototype%[@@toStringTag] should be "String Iterator":
	   * Test: `Object.prototype.toString.call(''[Symbol.iterator]())``
	   *  - Edge <=13 === "[object Object]"
	   */
	  if (stringIteratorExists && objPrototype === stringIteratorPrototype) {
	    return 'String Iterator';
	  }

	  /* ! Speed optimisation
	  * Pre:
	  *   object from null   x 2,424,320 ops/sec ±1.67% (76 runs sampled)
	  * Post:
	  *   object from null   x 5,838,000 ops/sec ±0.99% (84 runs sampled)
	  */
	  if (objPrototype === null) {
	    return 'Object';
	  }

	  return Object
	    .prototype
	    .toString
	    .call(obj)
	    .slice(toStringLeftSliceLength, toStringRightSliceLength);
	}

	return typeDetect;

	})));
	});

	function _slicedToArray(arr, i) {
	  return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
	}

	function _arrayWithHoles(arr) {
	  if (Array.isArray(arr)) return arr;
	}

	function _iterableToArrayLimit(arr, i) {
	  if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return;
	  var _arr = [];
	  var _n = true;
	  var _d = false;
	  var _e = undefined;

	  try {
	    for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
	      _arr.push(_s.value);

	      if (i && _arr.length === i) break;
	    }
	  } catch (err) {
	    _d = true;
	    _e = err;
	  } finally {
	    try {
	      if (!_n && _i["return"] != null) _i["return"]();
	    } finally {
	      if (_d) throw _e;
	    }
	  }

	  return _arr;
	}

	function _unsupportedIterableToArray(o, minLen) {
	  if (!o) return;
	  if (typeof o === "string") return _arrayLikeToArray(o, minLen);
	  var n = Object.prototype.toString.call(o).slice(8, -1);
	  if (n === "Object" && o.constructor) n = o.constructor.name;
	  if (n === "Map" || n === "Set") return Array.from(o);
	  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
	}

	function _arrayLikeToArray(arr, len) {
	  if (len == null || len > arr.length) len = arr.length;

	  for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

	  return arr2;
	}

	function _nonIterableRest() {
	  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
	}

	var ansiColors = {
	  bold: ['1', '22'],
	  dim: ['2', '22'],
	  italic: ['3', '23'],
	  underline: ['4', '24'],
	  // 5 & 6 are blinking
	  inverse: ['7', '27'],
	  hidden: ['8', '28'],
	  strike: ['9', '29'],
	  // 10-20 are fonts
	  // 21-29 are resets for 1-9
	  black: ['30', '39'],
	  red: ['31', '39'],
	  green: ['32', '39'],
	  yellow: ['33', '39'],
	  blue: ['34', '39'],
	  magenta: ['35', '39'],
	  cyan: ['36', '39'],
	  white: ['37', '39'],
	  brightblack: ['30;1', '39'],
	  brightred: ['31;1', '39'],
	  brightgreen: ['32;1', '39'],
	  brightyellow: ['33;1', '39'],
	  brightblue: ['34;1', '39'],
	  brightmagenta: ['35;1', '39'],
	  brightcyan: ['36;1', '39'],
	  brightwhite: ['37;1', '39'],
	  grey: ['90', '39']
	};
	var styles = {
	  special: 'cyan',
	  number: 'yellow',
	  boolean: 'yellow',
	  undefined: 'grey',
	  null: 'bold',
	  string: 'green',
	  symbol: 'green',
	  date: 'magenta',
	  regexp: 'red'
	};
	var truncator = '…';

	function colorise(value, styleType) {
	  var color = ansiColors[styles[styleType]] || ansiColors[styleType];

	  if (!color) {
	    return String(value);
	  }

	  return "\x1B[".concat(color[0], "m").concat(String(value), "\x1B[").concat(color[1], "m");
	}

	function normaliseOptions() {
	  var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
	      _ref$showHidden = _ref.showHidden,
	      showHidden = _ref$showHidden === void 0 ? false : _ref$showHidden,
	      _ref$depth = _ref.depth,
	      depth = _ref$depth === void 0 ? 2 : _ref$depth,
	      _ref$colors = _ref.colors,
	      colors = _ref$colors === void 0 ? false : _ref$colors,
	      _ref$customInspect = _ref.customInspect,
	      customInspect = _ref$customInspect === void 0 ? true : _ref$customInspect,
	      _ref$showProxy = _ref.showProxy,
	      showProxy = _ref$showProxy === void 0 ? false : _ref$showProxy,
	      _ref$maxArrayLength = _ref.maxArrayLength,
	      maxArrayLength = _ref$maxArrayLength === void 0 ? Infinity : _ref$maxArrayLength,
	      _ref$breakLength = _ref.breakLength,
	      breakLength = _ref$breakLength === void 0 ? Infinity : _ref$breakLength,
	      _ref$seen = _ref.seen,
	      seen = _ref$seen === void 0 ? [] : _ref$seen,
	      _ref$truncate = _ref.truncate,
	      truncate = _ref$truncate === void 0 ? Infinity : _ref$truncate,
	      _ref$stylize = _ref.stylize,
	      stylize = _ref$stylize === void 0 ? String : _ref$stylize;

	  var options = {
	    showHidden: Boolean(showHidden),
	    depth: Number(depth),
	    colors: Boolean(colors),
	    customInspect: Boolean(customInspect),
	    showProxy: Boolean(showProxy),
	    maxArrayLength: Number(maxArrayLength),
	    breakLength: Number(breakLength),
	    truncate: Number(truncate),
	    seen: seen,
	    stylize: stylize
	  };

	  if (options.colors) {
	    options.stylize = colorise;
	  }

	  return options;
	}
	function truncate(string, length) {
	  var tail = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : truncator;
	  string = String(string);
	  var tailLength = tail.length;
	  var stringLength = string.length;

	  if (tailLength > length && stringLength > tailLength) {
	    return tail;
	  }

	  if (stringLength > length && stringLength > tailLength) {
	    return "".concat(string.slice(0, length - tailLength)).concat(tail);
	  }

	  return string;
	} // eslint-disable-next-line complexity

	function inspectList(list, options, inspectItem) {
	  var separator = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : ', ';
	  inspectItem = inspectItem || options.inspect;
	  var size = list.length;
	  if (size === 0) return '';
	  var originalLength = options.truncate;
	  var output = '';
	  var peek = '';
	  var truncated = '';

	  for (var i = 0; i < size; i += 1) {
	    var last = i + 1 === list.length;
	    var secondToLast = i + 2 === list.length;
	    truncated = "".concat(truncator, "(").concat(list.length - i, ")");
	    var value = list[i]; // If there is more than one remaining we need to account for a separator of `, `

	    options.truncate = originalLength - output.length - (last ? 0 : separator.length);
	    var string = peek || inspectItem(value, options) + (last ? '' : separator);
	    var nextLength = output.length + string.length;
	    var truncatedLength = nextLength + truncated.length; // If this is the last element, and adding it would
	    // take us over length, but adding the truncator wouldn't - then break now

	    if (last && nextLength > originalLength && output.length + truncated.length <= originalLength) {
	      break;
	    } // If this isn't the last or second to last element to scan,
	    // but the string is already over length then break here


	    if (!last && !secondToLast && truncatedLength > originalLength) {
	      break;
	    } // Peek at the next string to determine if we should
	    // break early before adding this item to the output


	    peek = last ? '' : inspectItem(list[i + 1], options) + (secondToLast ? '' : separator); // If we have one element left, but this element and
	    // the next takes over length, the break early

	    if (!last && secondToLast && truncatedLength > originalLength && nextLength + peek.length > originalLength) {
	      break;
	    }

	    output += string; // If the next element takes us to length -
	    // but there are more after that, then we should truncate now

	    if (!last && !secondToLast && nextLength + peek.length >= originalLength) {
	      truncated = "".concat(truncator, "(").concat(list.length - i - 1, ")");
	      break;
	    }

	    truncated = '';
	  }

	  return "".concat(output).concat(truncated);
	}
	function inspectProperty(_ref2, options) {
	  var _ref3 = _slicedToArray(_ref2, 2),
	      key = _ref3[0],
	      value = _ref3[1];

	  options.truncate -= 2;

	  if (typeof key !== 'string' && typeof key !== 'number') {
	    key = "[".concat(options.inspect(key, options), "]");
	  }

	  options.truncate -= key.length;
	  value = options.inspect(value, options);
	  return "".concat(key, ": ").concat(value);
	}

	function inspectArray(array, options) {
	  // Object.keys will always output the Array indices first, so we can slice by
	  // `array.length` to get non-index properties
	  var nonIndexProperties = Object.keys(array).slice(array.length);
	  if (!array.length && !nonIndexProperties.length) return '[]';
	  options.truncate -= 4;
	  var listContents = inspectList(array, options);
	  options.truncate -= listContents.length;
	  var propertyContents = '';

	  if (nonIndexProperties.length) {
	    propertyContents = inspectList(nonIndexProperties.map(function (key) {
	      return [key, array[key]];
	    }), options, inspectProperty);
	  }

	  return "[ ".concat(listContents).concat(propertyContents ? ", ".concat(propertyContents) : '', " ]");
	}

	/* !
	 * Chai - getFuncName utility
	 * Copyright(c) 2012-2016 Jake Luer <jake@alogicalparadox.com>
	 * MIT Licensed
	 */

	/**
	 * ### .getFuncName(constructorFn)
	 *
	 * Returns the name of a function.
	 * When a non-function instance is passed, returns `null`.
	 * This also includes a polyfill function if `aFunc.name` is not defined.
	 *
	 * @name getFuncName
	 * @param {Function} funct
	 * @namespace Utils
	 * @api public
	 */

	var toString = Function.prototype.toString;
	var functionNameMatch = /\s*function(?:\s|\s*\/\*[^(?:*\/)]+\*\/\s*)*([^\s\(\/]+)/;
	function getFuncName(aFunc) {
	  if (typeof aFunc !== 'function') {
	    return null;
	  }

	  var name = '';
	  if (typeof Function.prototype.name === 'undefined' && typeof aFunc.name === 'undefined') {
	    // Here we run a polyfill if Function does not support the `name` property and if aFunc.name is not defined
	    var match = toString.call(aFunc).match(functionNameMatch);
	    if (match) {
	      name = match[1];
	    }
	  } else {
	    // If we've got a `name` property we just use it
	    name = aFunc.name;
	  }

	  return name;
	}

	var getFuncName_1 = getFuncName;

	var getArrayName = function getArrayName(array) {
	  // We need to special case Node.js' Buffers, which report to be Uint8Array
	  if (typeof Buffer === 'function' && array instanceof Buffer) {
	    return 'Buffer';
	  }

	  if (array[Symbol.toStringTag]) {
	    return array[Symbol.toStringTag];
	  }

	  return getFuncName_1(array.constructor);
	};

	function inspectTypedArray(array, options) {
	  var name = getArrayName(array);
	  options.truncate -= name.length + 4; // Object.keys will always output the Array indices first, so we can slice by
	  // `array.length` to get non-index properties

	  var nonIndexProperties = Object.keys(array).slice(array.length);
	  if (!array.length && !nonIndexProperties.length) return "".concat(name, "[]"); // As we know TypedArrays only contain Unsigned Integers, we can skip inspecting each one and simply
	  // stylise the toString() value of them

	  var output = '';

	  for (var i = 0; i < array.length; i++) {
	    var string = "".concat(options.stylize(truncate(array[i], options.truncate), 'number')).concat(i === array.length - 1 ? '' : ', ');
	    options.truncate -= string.length;

	    if (array[i] !== array.length && options.truncate <= 3) {
	      output += "".concat(truncator, "(").concat(array.length - array[i] + 1, ")");
	      break;
	    }

	    output += string;
	  }

	  var propertyContents = '';

	  if (nonIndexProperties.length) {
	    propertyContents = inspectList(nonIndexProperties.map(function (key) {
	      return [key, array[key]];
	    }), options, inspectProperty);
	  }

	  return "".concat(name, "[ ").concat(output).concat(propertyContents ? ", ".concat(propertyContents) : '', " ]");
	}

	function inspectDate(dateObject, options) {
	  // If we need to - truncate the time portion, but never the date
	  var split = dateObject.toJSON().split('T');
	  var date = split[0];
	  return options.stylize("".concat(date, "T").concat(truncate(split[1], options.truncate - date.length - 1)), 'date');
	}

	var toString$1 = Object.prototype.toString;

	var getFunctionName = function(fn) {
	  if (toString$1.call(fn) !== '[object Function]') return null
	  if (fn.name) return fn.name
	  try {
		  var name = /^\s*function\s*([^\(]*)/im.exec(fn.toString())[1];
	  } catch ( e ) { return 'anonymous' };
	  return name || 'anonymous'
	};

	function inspectFunction(func, options) {
	  var name = getFunctionName(func);

	  if (name === 'anonymous') {
	    return options.stylize('[Function]', 'special');
	  }

	  return options.stylize("[Function ".concat(truncate(name, options.truncate - 11), "]"), 'special');
	}

	function inspectMapEntry(_ref, options) {
	  var _ref2 = _slicedToArray(_ref, 2),
	      key = _ref2[0],
	      value = _ref2[1];

	  options.truncate -= 4;
	  key = options.inspect(key, options);
	  options.truncate -= key.length;
	  value = options.inspect(value, options);
	  return "".concat(key, " => ").concat(value);
	} // IE11 doesn't support `map.entries()`


	function mapToEntries(map) {
	  var entries = [];
	  map.forEach(function (value, key) {
	    entries.push([key, value]);
	  });
	  return entries;
	}

	function inspectMap(map, options) {
	  var size = map.size - 1;

	  if (size <= 0) {
	    return 'Map{}';
	  }

	  options.truncate -= 7;
	  return "Map{ ".concat(inspectList(mapToEntries(map), options, inspectMapEntry), " }");
	}

	var isNaN = Number.isNaN || function (i) {
	  return i !== i;
	}; // eslint-disable-line no-self-compare


	function inspectNumber(number, options) {
	  if (isNaN(number)) {
	    return options.stylize('NaN', 'number');
	  }

	  if (number === Infinity) {
	    return options.stylize('Infinity', 'number');
	  }

	  if (number === -Infinity) {
	    return options.stylize('-Infinity', 'number');
	  }

	  if (number === 0) {
	    return options.stylize(1 / number === Infinity ? '+0' : '-0', 'number');
	  }

	  return options.stylize(truncate(number, options.truncate), 'number');
	}

	function inspectRegExp(value, options) {
	  var flags = value.toString().split('/')[2];
	  var sourceLength = options.truncate - (2 + flags.length);
	  var source = value.source;
	  return options.stylize("/".concat(truncate(source, sourceLength), "/").concat(flags), 'regexp');
	}

	function arrayFromSet(set) {
	  var values = [];
	  set.forEach(function (value) {
	    values.push(value);
	  });
	  return values;
	}

	function inspectSet(set, options) {
	  if (set.size === 0) return 'Set{}';
	  options.truncate -= 7;
	  return "Set{ ".concat(inspectList(arrayFromSet(set), options), " }");
	}

	var stringEscapeChars = new RegExp("['\\u0000-\\u001f\\u007f-\\u009f\\u00ad\\u0600-\\u0604\\u070f\\u17b4\\u17b5" + "\\u200c-\\u200f\\u2028-\\u202f\\u2060-\\u206f\\ufeff\\ufff0-\\uffff]", 'g');
	var escapeCharacters = {
	  '\b': '\\b',
	  '\t': '\\t',
	  '\n': '\\n',
	  '\f': '\\f',
	  '\r': '\\r',
	  "'": "\\'",
	  '\\': '\\\\'
	};
	var hex = 16;
	var unicodeLength = 4;

	function escape(char) {
	  return escapeCharacters[char] || "\\u".concat("0000".concat(char.charCodeAt(0).toString(hex)).slice(-unicodeLength));
	}

	function inspectString(string, options) {
	  if (stringEscapeChars.test(string)) {
	    string = string.replace(stringEscapeChars, escape);
	  }

	  return options.stylize("'".concat(truncate(string, options.truncate - 2), "'"), 'string');
	}

	function inspectSymbol(value) {
	  if ('description' in Symbol.prototype) {
	    return value.description ? "Symbol(".concat(value.description, ")") : 'Symbol()';
	  }

	  return value.toString();
	}

	var getPromiseValue = function getPromiseValue() {
	  return 'Promise{…}';
	};

	// try {
	//   var _process$binding = process.binding('util'),
	//       getPromiseDetails = _process$binding.getPromiseDetails,
	//       kPending = _process$binding.kPending,
	//       kRejected = _process$binding.kRejected;

	//   getPromiseValue = function getPromiseValue(value, options) {
	//     var _getPromiseDetails = getPromiseDetails(value),
	//         _getPromiseDetails2 = _slicedToArray(_getPromiseDetails, 2),
	//         state = _getPromiseDetails2[0],
	//         innerValue = _getPromiseDetails2[1];

	//     if (state === kPending) {
	//       return 'Promise{<pending>}';
	//     }

	//     return "Promise".concat(state === kRejected ? '!' : '', "{").concat(options.inspect(innerValue, options), "}");
	//   };
	// } catch (notNode) {
	//   /* ignore */
	// }

	var inspectPromise = getPromiseValue;

	function inspectObject(object, options) {
	  var properties = Object.getOwnPropertyNames(object);
	  var symbols = Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols(object) : [];

	  if (properties.length === 0 && symbols.length === 0) {
	    return '{}';
	  }

	  options.truncate -= 4;
	  var propertyContents = inspectList(properties.map(function (key) {
	    return [key, object[key]];
	  }), options, inspectProperty);
	  var symbolContents = inspectList(symbols.map(function (key) {
	    return [key, object[key]];
	  }), options, inspectProperty);
	  var sep = '';

	  if (propertyContents && symbolContents) {
	    sep = ', ';
	  }

	  return "{ ".concat(propertyContents).concat(sep).concat(symbolContents, " }");
	}

	var toStringTag = typeof Symbol !== 'undefined' && Symbol.toStringTag ? Symbol.toStringTag : false;
	function inspectClass(value, options) {
	  var name = '';

	  if (toStringTag && toStringTag in value) {
	    name = value[toStringTag];
	  }

	  name = name || getFuncName_1(value.constructor); // Babel transforms anonymous classes to the name `_class`

	  if (!name || name === '_class') {
	    name = '<Anonymous Class>';
	  }

	  options.truncate -= name.length;
	  return "".concat(name).concat(inspectObject(value, options));
	}

	function inspectArguments(args, options) {
	  if (args.length === 0) return 'Arguments[]';
	  options.truncate -= 13;
	  return "Arguments[ ".concat(inspectList(args, options), " ]");
	}

	var errorKeys = ['stack', 'line', 'column', 'name', 'message', 'fileName', 'lineNumber', 'columnNumber', 'number', 'description'];
	function inspectObject$1(error, options) {
	  var properties = Object.getOwnPropertyNames(error).filter(function (key) {
	    return errorKeys.indexOf(key) === -1;
	  });
	  var name = error.name;
	  options.truncate -= name.length;
	  var message = '';

	  if (typeof error.message === 'string') {
	    message = truncate(error.message, options.truncate);
	  } else {
	    properties.unshift('message');
	  }

	  message = message ? ": ".concat(message) : '';
	  options.truncate -= message.length + 5;
	  var propertyContents = inspectList(properties.map(function (key) {
	    return [key, error[key]];
	  }), options, inspectProperty);
	  return "".concat(name).concat(message).concat(propertyContents ? " { ".concat(propertyContents, " }") : '');
	}

	function inspectAttribute(_ref, options) {
	  var _ref2 = _slicedToArray(_ref, 2),
	      key = _ref2[0],
	      value = _ref2[1];

	  options.truncate -= 3;

	  if (!value) {
	    return "".concat(options.stylize(key, 'yellow'));
	  }

	  return "".concat(options.stylize(key, 'yellow'), "=").concat(options.stylize("\"".concat(value, "\""), 'string'));
	}
	function inspectHTMLCollection(collection, options) {
	  // eslint-disable-next-line no-use-before-define
	  return inspectList(collection, options, inspectHTML, '\n');
	}
	function inspectHTML(element, options) {
	  var properties = element.getAttributeNames();
	  var name = element.tagName.toLowerCase();
	  var head = options.stylize("<".concat(name), 'special');
	  var headClose = options.stylize(">", 'special');
	  var tail = options.stylize("</".concat(name, ">"), 'special');
	  options.truncate -= name.length * 2 + 5;
	  var propertyContents = '';

	  if (properties.length > 0) {
	    propertyContents += ' ';
	    propertyContents += inspectList(properties.map(function (key) {
	      return [key, element.getAttribute(key)];
	    }), options, inspectAttribute, ' ');
	  }

	  options.truncate -= propertyContents.length;
	  var truncate = options.truncate;
	  var children = inspectHTMLCollection(element.children, options);

	  if (children && children.length > truncate) {
	    children = "".concat(truncator, "(").concat(element.children.length, ")");
	  }

	  return "".concat(head).concat(propertyContents).concat(headClose).concat(children).concat(tail);
	}

	/* !
	 * loupe
	 * Copyright(c) 2013 Jake Luer <jake@alogicalparadox.com>
	 * MIT Licensed
	 */
	var symbolsSupported = typeof Symbol === 'function' && typeof Symbol.for === 'function';
	var chaiInspect = symbolsSupported ? Symbol.for('chai/inspect') : '@@chai/inspect';
	var nodeInspect = false;

	try {
	  // eslint-disable-next-line global-require
	  nodeInspect = require('util').inspect.custom;
	} catch (noNodeInspect) {
	  nodeInspect = false;
	}

	var constructorMap = new WeakMap();
	var stringTagMap = {};
	var baseTypesMap = {
	  undefined: function undefined$1(value, options) {
	    return options.stylize('undefined', 'undefined');
	  },
	  null: function _null(value, options) {
	    return options.stylize(null, 'null');
	  },
	  boolean: function boolean(value, options) {
	    return options.stylize(value, 'boolean');
	  },
	  Boolean: function Boolean(value, options) {
	    return options.stylize(value, 'boolean');
	  },
	  number: inspectNumber,
	  Number: inspectNumber,
	  BigInt: inspectNumber,
	  bigint: inspectNumber,
	  string: inspectString,
	  String: inspectString,
	  function: inspectFunction,
	  Function: inspectFunction,
	  symbol: inspectSymbol,
	  // A Symbol polyfill will return `Symbol` not `symbol` from typedetect
	  Symbol: inspectSymbol,
	  Array: inspectArray,
	  Date: inspectDate,
	  Map: inspectMap,
	  Set: inspectSet,
	  RegExp: inspectRegExp,
	  Promise: inspectPromise,
	  // WeakSet, WeakMap are totally opaque to us
	  WeakSet: function WeakSet(value, options) {
	    return options.stylize('WeakSet{…}', 'special');
	  },
	  WeakMap: function WeakMap(value, options) {
	    return options.stylize('WeakMap{…}', 'special');
	  },
	  Arguments: inspectArguments,
	  Int8Array: inspectTypedArray,
	  Uint8Array: inspectTypedArray,
	  Uint8ClampedArray: inspectTypedArray,
	  Int16Array: inspectTypedArray,
	  Uint16Array: inspectTypedArray,
	  Int32Array: inspectTypedArray,
	  Uint32Array: inspectTypedArray,
	  Float32Array: inspectTypedArray,
	  Float64Array: inspectTypedArray,
	  Generator: function Generator() {
	    return '';
	  },
	  DataView: function DataView() {
	    return '';
	  },
	  ArrayBuffer: function ArrayBuffer() {
	    return '';
	  },
	  Error: inspectObject$1,
	  HTMLCollection: inspectHTMLCollection,
	  NodeList: inspectHTMLCollection
	}; // eslint-disable-next-line complexity

	var inspectCustom = function inspectCustom(value, options, type) {
	  if (chaiInspect in value && typeof value[chaiInspect] === 'function') {
	    return value[chaiInspect](options);
	  }

	  if (nodeInspect && nodeInspect in value && typeof value[nodeInspect] === 'function') {
	    return value[nodeInspect](options.depth, options);
	  }

	  if ('inspect' in value && typeof value.inspect === 'function') {
	    return value.inspect(options.depth, options);
	  }

	  if ('constructor' in value && constructorMap.has(value.constructor)) {
	    return constructorMap.get(value.constructor)(value, options);
	  }

	  if (stringTagMap[type]) {
	    return stringTagMap[type](value, options);
	  }

	  return '';
	}; // eslint-disable-next-line complexity


	function inspect(value, options) {
	  options = normaliseOptions(options);
	  options.inspect = inspect;
	  var _options = options,
	      customInspect = _options.customInspect;
	  var type = typeDetect(value); // If it is a base value that we already support, then use Loupe's inspector
	  if (baseTypesMap[type]) {
	    return baseTypesMap[type](value, options);
	  } // If `options.customInspect` is set to true then try to use the custom inspector


	  if (customInspect && value) {
	    var output = inspectCustom(value, options, type);
	    if (output) return inspect(output, options);
	  }

	  var proto = value ? Object.getPrototypeOf(value) : false; // If it's a plain Object then use Loupe's inspector

	  if (proto === Object.prototype || proto === null) {
	    return inspectObject(value, options);
	  } // Specifically account for HTMLElements
	  // eslint-disable-next-line no-undef


	  if (value && typeof HTMLElement === 'function' && value instanceof HTMLElement) {
	    return inspectHTML(value, options);
	  } // If it is a class, inspect it like an object but add the constructor name


	  if ('constructor' in value && value.constructor !== Object) {
	    return inspectClass(value, options);
	  } // We have run out of options! Just stringify the value


	  return options.stylize(String(value), type);
	}
	function registerConstructor(constructor, inspector) {
	  if (constructorMap.has(constructor)) {
	    return false;
	  }

	  constructorMap.add(constructor, inspector);
	  return true;
	}
	function registerStringTag(stringTag, inspector) {
	  if (stringTag in stringTagMap) {
	    return false;
	  }

	  stringTagMap[stringTag] = inspector;
	  return true;
	}
	var custom = chaiInspect;

	exports.custom = custom;
	exports.default = inspect;
	exports.inspect = inspect;
	exports.registerConstructor = registerConstructor;
	exports.registerStringTag = registerStringTag;

	Object.defineProperty(exports, '__esModule', { value: true });

})));

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)

},{"buffer":4,"util":27}],37:[function(require,module,exports){
(function() {
  'use strict';
  var js_type_of, rpr, sad;

  //###########################################################################################################
  this.sad = sad = Symbol('sad');

  ({rpr, js_type_of} = require('./helpers'));

  //-----------------------------------------------------------------------------------------------------------
  this.is_sad = function(x) {
    return (x === sad) || (x instanceof Error) || (this.is_saddened(x));
  };

  this.is_happy = function(x) {
    return !this.is_sad(x);
  };

  this.sadden = function(x) {
    return {
      [sad]: true,
      _: x
    };
  };

  this.is_saddened = function(x) {
    return ((js_type_of(x)) === 'object') && (x[sad] === true);
  };

  //-----------------------------------------------------------------------------------------------------------
  this.unsadden = function(x) {
    if (this.is_happy(x)) {
      return x;
    }
    this.validate.saddened(x);
    return x._;
  };

  //-----------------------------------------------------------------------------------------------------------
  this.declare_check = function(name, checker) {
    this.validate.nonempty_text(name);
    this.validate.function(checker);
    if (this.specs[name] != null) {
      throw new Error(`µ8032 type ${rpr(name)} already declared`);
    }
    if (this.checks[name] != null) {
      throw new Error(`µ8033 check ${rpr(name)} already declared`);
    }
    this.checks[name] = checker;
    return null;
  };

}).call(this);


},{"./helpers":40}],38:[function(require,module,exports){
(function (Buffer){(function (){
(function() {
  //...........................................................................................................
  // { equals, }               = require 'cnd'
  var CHECKS, assign, jr, js_type_of, jsidentifier_pattern, xrpr,
    modulo = function(a, b) { return (+a % (b = +b) + b) % b; };

  ({assign, jr, xrpr, js_type_of} = require('./helpers'));

  CHECKS = require('./checks');

  /* thx to
    https://github.com/mathiasbynens/mothereff.in/blob/master/js-variables/eff.js
    https://mathiasbynens.be/notes/javascript-identifiers-es6
  */
  // jsidentifier_pattern      = /^(?:[\$A-Z_a-z\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B4\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309B-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FD5\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AD\uA7B0-\uA7B7\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDE80-\uDE9C\uDEA0-\uDED0\uDF00-\uDF1F\uDF30-\uDF4A\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE4\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC03-\uDC37\uDC83-\uDCAF\uDCD0-\uDCE8\uDD03-\uDD26\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE2B\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEDE\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF50\uDF5D-\uDF61]|\uD805[\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDD80-\uDDAE\uDDD8-\uDDDB\uDE00-\uDE2F\uDE44\uDE80-\uDEAA\uDF00-\uDF19]|\uD806[\uDCA0-\uDCDF\uDCFF\uDEC0-\uDEF8]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50\uDF93-\uDF9F]|\uD82C[\uDC00\uDC01]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB]|\uD83A[\uDC00-\uDCC4]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1]|\uD87E[\uDC00-\uDE1D])(?:[\$0-9A-Z_a-z\xAA\xB5\xB7\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u08A0-\u08B4\u08E3-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0AF9\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58-\u0C5A\u0C60-\u0C63\u0C66-\u0C6F\u0C81-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D01-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D57\u0D5F-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1369-\u1371\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19DA\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1CD0-\u1CD2\u1CD4-\u1CF6\u1CF8\u1CF9\u1D00-\u1DF5\u1DFC-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FD5\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AD\uA7B0-\uA7B7\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C4\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA8FD\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2F\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDDFD\uDE80-\uDE9C\uDEA0-\uDED0\uDEE0\uDF00-\uDF1F\uDF30-\uDF4A\uDF50-\uDF7A\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCA0-\uDCA9\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00-\uDE03\uDE05\uDE06\uDE0C-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE38-\uDE3A\uDE3F\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE6\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC00-\uDC46\uDC66-\uDC6F\uDC7F-\uDCBA\uDCD0-\uDCE8\uDCF0-\uDCF9\uDD00-\uDD34\uDD36-\uDD3F\uDD50-\uDD73\uDD76\uDD80-\uDDC4\uDDCA-\uDDCC\uDDD0-\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE37\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEEA\uDEF0-\uDEF9\uDF00-\uDF03\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3C-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF50\uDF57\uDF5D-\uDF63\uDF66-\uDF6C\uDF70-\uDF74]|\uD805[\uDC80-\uDCC5\uDCC7\uDCD0-\uDCD9\uDD80-\uDDB5\uDDB8-\uDDC0\uDDD8-\uDDDD\uDE00-\uDE40\uDE44\uDE50-\uDE59\uDE80-\uDEB7\uDEC0-\uDEC9\uDF00-\uDF19\uDF1D-\uDF2B\uDF30-\uDF39]|\uD806[\uDCA0-\uDCE9\uDCFF\uDEC0-\uDEF8]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE60-\uDE69\uDED0-\uDEED\uDEF0-\uDEF4\uDF00-\uDF36\uDF40-\uDF43\uDF50-\uDF59\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50-\uDF7E\uDF8F-\uDF9F]|\uD82C[\uDC00\uDC01]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99\uDC9D\uDC9E]|\uD834[\uDD65-\uDD69\uDD6D-\uDD72\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD\uDE42-\uDE44]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB\uDFCE-\uDFFF]|\uD836[\uDE00-\uDE36\uDE3B-\uDE6C\uDE75\uDE84\uDE9B-\uDE9F\uDEA1-\uDEAF]|\uD83A[\uDC00-\uDCC4\uDCD0-\uDCD6]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1]|\uD87E[\uDC00-\uDE1D]|\uDB40[\uDD00-\uDDEF])*$/
  jsidentifier_pattern = /^(?:[$_]|\p{ID_Start})(?:[$_\u{200c}\u{200d}]|\p{ID_Continue})*$/u;

  //===========================================================================================================
  // XML Names, IDs
  //-----------------------------------------------------------------------------------------------------------
  /*

  * https://www.w3.org/TR/xml/#NT-Name
  * Observe that in HTML5 (but not earlier versions), most restrictions on ID values have been removed; to
    quote: "There are no other restrictions on what form an ID can take; in particular, IDs can consist of
    just digits, start with a digit, start with an underscore, consist of just punctuation, etc."

  [4]     NameStartChar    ::=    ":" | [A-Z] | "_" | [a-z] | [#xC0-#xD6] | [#xD8-#xF6] | [#xF8-#x2FF] | [#x370-#x37D] | [#x37F-#x1FFF] | [#x200C-#x200D] | [#x2070-#x218F] | [#x2C00-#x2FEF] | [#x3001-#xD7FF] | [#xF900-#xFDCF] | [#xFDF0-#xFFFD] | [#x10000-#xEFFFF]
  [4a]    NameChar     ::=    NameStartChar | "-" | "." | [0-9] | #xB7 | [#x0300-#x036F] | [#x203F-#x2040]
  [5]     Name     ::=    NameStartChar (NameChar)*

   */
  //===========================================================================================================
  // OTF Glyph Names
  //-----------------------------------------------------------------------------------------------------------
  /*

  From https://adobe-type-tools.github.io/afdko/OpenTypeFeatureFileSpecification.html#2.f.i

  > A glyph name may be up to 63 characters in length, must be entirely comprised of characters from the
  > following set:
  >
  > ```
  > ABCDEFGHIJKLMNOPQRSTUVWXYZ
  > abcdefghijklmnopqrstuvwxyz
  > 0123456789
  > .  # period
  > _  # underscore
  > ```
  >
  > and must not start with a digit or period. The only exception is the special character “.notdef”.
  >
  > “twocents”, “a1”, and “_” are valid glyph names. “2cents” and “.twocents” are “not.

  */
  //===========================================================================================================
  // TYPE DECLARATIONS
  //-----------------------------------------------------------------------------------------------------------
  this.declare_types = function() {
    /* NOTE to be called as `( require './declarations' ).declare_types.apply instance` */
    this.declare('null', (x) => {
      return x === null;
    });
    this.declare('undefined', (x) => {
      return x === void 0;
    });
    //.........................................................................................................
    this.declare('sad', (x) => {
      return CHECKS.is_sad(x);
    });
    this.declare('happy', (x) => {
      return CHECKS.is_happy(x);
    });
    this.declare('saddened', (x) => {
      return CHECKS.is_saddened(x);
    });
    this.declare('symbol', (x) => {
      return typeof x === 'symbol';
    });
    //.........................................................................................................
    this.declare('boolean', {
      tests: {
        "x is true or false": (x) => {
          return (x === true) || (x === false);
        }
      },
      casts: {
        float: (x) => {
          if (x) {
            return 1;
          } else {
            return 0;
          }
        }
      }
    });
    //.........................................................................................................
    this.declare('nan', (x) => {
      return Number.isNaN(x);
    });
    this.declare('finite', (x) => {
      return Number.isFinite(x);
    });
    this./* TAINT make sure no non-numbers slip through */declare('integer', (x) => {
      return Number.isInteger(x);
    });
    this./* TAINT make sure no non-numbers slip through */declare('safeinteger', (x) => {
      return Number.isSafeInteger(x);
    });
    //.........................................................................................................
    /* FTTB we are retaining `number` as a less-preferred synonym for `float`; in the future, `number` may
     be removed because it conflicts with JS usage (where it includes `NaN` and `+/-Infinity`) and, moreover,
     is not truthful (because it is a poor representation of what the modern understanding of 'number' in the
     mathematical sense would imply). */
    /* NOTE removed in v8: `@specs.number = @specs.float` */
    this./* TAINT make sure no non-numbers slip through */declare('number', (x) => {
      return false; // throw new Error "^intertype@84744^ type 'number' is deprecated"
    });
    this.declare('float', {
      tests: (x) => {
        return Number.isFinite(x);
      },
      casts: {
        boolean: (x) => {
          if (x === 0) {
            return false;
          } else {
            return true;
          }
        },
        integer: (x) => {
          return Math.round(x);
        }
      }
    });
    //.........................................................................................................
    this.declare('frozen', (x) => {
      return Object.isFrozen(x);
    });
    this.declare('sealed', (x) => {
      return Object.isSealed(x);
    });
    this.declare('extensible', (x) => {
      return Object.isExtensible(x);
    });
    //.........................................................................................................
    this.declare('numeric', (x) => {
      return (js_type_of(x)) === 'number';
    });
    this.declare('function', (x) => {
      return (js_type_of(x)) === 'function';
    });
    this.declare('asyncfunction', (x) => {
      return (js_type_of(x)) === 'asyncfunction';
    });
    this.declare('generatorfunction', (x) => {
      return (js_type_of(x)) === 'generatorfunction';
    });
    this.declare('asyncgeneratorfunction', (x) => {
      return (js_type_of(x)) === 'asyncgeneratorfunction';
    });
    this.declare('asyncgenerator', (x) => {
      return (js_type_of(x)) === 'asyncgenerator';
    });
    this.declare('generator', (x) => {
      return (js_type_of(x)) === 'generator';
    });
    this.declare('date', (x) => {
      return (js_type_of(x)) === 'date';
    });
    this.declare('listiterator', (x) => {
      return (js_type_of(x)) === 'arrayiterator';
    });
    this.declare('textiterator', (x) => {
      return (js_type_of(x)) === 'stringiterator';
    });
    this.declare('setiterator', (x) => {
      return (js_type_of(x)) === 'setiterator';
    });
    this.declare('mapiterator', (x) => {
      return (js_type_of(x)) === 'mapiterator';
    });
    this.declare('callable', (x) => {
      var ref;
      return (ref = this.type_of(x)) === 'function' || ref === 'asyncfunction' || ref === 'generatorfunction';
    });
    this.declare('promise', (x) => {
      return (this.isa.nativepromise(x)) || (this.isa.thenable(x));
    });
    this.declare('nativepromise', (x) => {
      return x instanceof Promise;
    });
    this.declare('thenable', (x) => {
      return (this.type_of(x != null ? x.then : void 0)) === 'function';
    });
    this.declare('immediate', function(x) {
      return !this.isa.promise(x);
    });
    //.........................................................................................................
    this.declare('truthy', (x) => {
      return !!x;
    });
    this.declare('falsy', (x) => {
      return !x;
    });
    this.declare('true', (x) => {
      return x === true;
    });
    this.declare('false', (x) => {
      return x === false;
    });
    this.declare('unset', (x) => {
      return x == null;
    });
    this.declare('notunset', (x) => {
      return x != null;
    });
    //.........................................................................................................
    this.declare('even', (x) => {
      return (this.isa.safeinteger(x)) && (modulo(x, 2)) === 0;
    });
    this.declare('odd', (x) => {
      return (this.isa.safeinteger(x)) && (modulo(x, 2)) === 1;
    });
    this.declare('cardinal', function(x) {
      return (this.isa.safeinteger(x)) && (this.isa.nonnegative(x));
    });
    this.declare('nonnegative', (x) => {
      return (this.isa.infloat(x)) && (x >= 0);
    });
    this.declare('positive', (x) => {
      return (this.isa.infloat(x)) && (x > 0);
    });
    this.declare('positive_float', (x) => {
      return (this.isa.float(x)) && (x > 0);
    });
    this.declare('positive_integer', (x) => {
      return (this.isa.integer(x)) && (x > 0);
    });
    this.declare('negative_integer', (x) => {
      return (this.isa.integer(x)) && (x < 0);
    });
    this.declare('zero', (x) => {
      return x === 0;
    });
    this.declare('infinity', (x) => {
      return (x === +2e308) || (x === -2e308);
    });
    this.declare('infloat', (x) => {
      return (this.isa.float(x)) || (x === 2e308) || (x === -2e308);
    });
    this.declare('nonpositive', (x) => {
      return (this.isa.infloat(x)) && (x <= 0);
    });
    this.declare('negative', (x) => {
      return (this.isa.infloat(x)) && (x < 0);
    });
    this.declare('negative_float', (x) => {
      return (this.isa.float(x)) && (x < 0);
    });
    this.declare('proper_fraction', (x) => {
      return (this.isa.float(x)) && ((0 <= x && x <= 1));
    });
    //.........................................................................................................
    this.declare('empty', function(x) {
      return (this.has_size(x)) && (this.size_of(x)) === 0;
    });
    this.declare('singular', function(x) {
      return (this.has_size(x)) && (this.size_of(x)) === 1;
    });
    this.declare('nonempty', function(x) {
      return (this.has_size(x)) && (this.size_of(x)) > 0;
    });
    this.declare('plural', function(x) {
      return (this.has_size(x)) && (this.size_of(x)) > 1;
    });
    this.declare('blank_text', function(x) {
      return (this.isa.text(x)) && ((x.match(/^\s*$/us)) != null);
    });
    this.declare('nonblank_text', function(x) {
      return (this.isa.text(x)) && ((x.match(/^\s*$/us)) == null);
    });
    this.declare('chr', function(x) {
      return (this.isa.text(x)) && ((x.match(/^.$/us)) != null);
    });
    this.declare('nonempty_text', function(x) {
      return (this.isa.text(x)) && (this.isa.nonempty(x));
    });
    this.declare('nonempty_list', function(x) {
      return (this.isa.list(x)) && (this.isa.nonempty(x));
    });
    this.declare('nonempty_object', function(x) {
      return (this.isa.object(x)) && (this.isa.nonempty(x));
    });
    this.declare('nonempty_set', function(x) {
      return (this.isa.set(x)) && (this.isa.nonempty(x));
    });
    this.declare('nonempty_map', function(x) {
      return (this.isa.map(x)) && (this.isa.nonempty(x));
    });
    this.declare('empty_text', function(x) {
      return (this.isa.text(x)) && (this.isa.empty(x));
    });
    this.declare('empty_list', function(x) {
      return (this.isa.list(x)) && (this.isa.empty(x));
    });
    this.declare('empty_object', function(x) {
      return (this.isa.object(x)) && (this.isa.empty(x));
    });
    this.declare('empty_set', function(x) {
      return (this.isa.set(x)) && (this.isa.empty(x));
    });
    this.declare('empty_map', function(x) {
      return (this.isa.map(x)) && (this.isa.empty(x));
    });
    // is_given                  = ( x ) -> not [ null, undefined, NaN, '', ].includes x
    //.........................................................................................................
    this.declare('buffer', {
      size: 'length'
    }, (x) => {
      return Buffer.isBuffer(x);
    });
    this.declare('arraybuffer', {
      size: 'length'
    }, (x) => {
      return (js_type_of(x)) === 'arraybuffer';
    });
    this.declare('int8array', {
      size: 'length'
    }, (x) => {
      return (js_type_of(x)) === 'int8array';
    });
    this.declare('uint8array', {
      size: 'length'
    }, (x) => {
      return (js_type_of(x)) === 'uint8array';
    });
    this.declare('uint8clampedarray', {
      size: 'length'
    }, (x) => {
      return (js_type_of(x)) === 'uint8clampedarray';
    });
    this.declare('int16array', {
      size: 'length'
    }, (x) => {
      return (js_type_of(x)) === 'int16array';
    });
    this.declare('uint16array', {
      size: 'length'
    }, (x) => {
      return (js_type_of(x)) === 'uint16array';
    });
    this.declare('int32array', {
      size: 'length'
    }, (x) => {
      return (js_type_of(x)) === 'int32array';
    });
    this.declare('uint32array', {
      size: 'length'
    }, (x) => {
      return (js_type_of(x)) === 'uint32array';
    });
    this.declare('float32array', {
      size: 'length'
    }, (x) => {
      return (js_type_of(x)) === 'float32array';
    });
    this.declare('float64array', {
      size: 'length'
    }, (x) => {
      return (js_type_of(x)) === 'float64array';
    });
    this.declare('list', {
      size: 'length'
    }, (x) => {
      return (js_type_of(x)) === 'array';
    });
    this.declare('set', {
      size: 'size'
    }, function(x) {
      return (js_type_of(x)) === 'set';
    });
    this.declare('map', {
      size: 'size'
    }, function(x) {
      return (js_type_of(x)) === 'map';
    });
    this.declare('weakmap', function(x) {
      return (js_type_of(x)) === 'weakmap';
    });
    this.declare('weakset', function(x) {
      return (js_type_of(x)) === 'weakset';
    });
    this.declare('error', function(x) {
      return (js_type_of(x)) === 'error';
    });
    this.declare('regex', function(x) {
      return (js_type_of(x)) === 'regexp';
    });
    //.........................................................................................................
    this.declare('object', {
      tests: (x) => {
        return (js_type_of(x)) === 'object';
      },
      size: (x) => {
        return (Object.keys(x)).length;
      }
    });
    //.........................................................................................................
    this.declare('global', {
      tests: (x) => {
        return (js_type_of(x)) === 'global';
      },
      size: (x) => {
        return (Object.keys(x)).length;
      }
    });
    //.........................................................................................................
    this.declare('text', {
      tests: (x) => {
        return (js_type_of(x)) === 'string';
      },
      size: function(x, selector = 'codeunits') {
        var ref;
        switch (selector) {
          case 'codepoints':
            return (Array.from(x)).length;
          case 'codeunits':
            return x.length;
          case 'bytes':
            return Buffer.byteLength(x, (ref = typeof settings !== "undefined" && settings !== null ? settings['encoding'] : void 0) != null ? ref : 'utf-8');
          default:
            throw new Error(`unknown counting selector ${rpr(selector)}`);
        }
      }
    });
    //.........................................................................................................
    this.declare('list_of', {
      tests: {
        "x is a list": (type, x, ...xP) => {
          return this.isa.list(x);
        },
        /* TAINT should check for `@isa.type type` */
        "type is nonempty_text": (type, x, ...xP) => {
          return this.isa.nonempty_text(type);
        },
        "all elements pass test": (type, x, ...xP) => {
          return x.every((xx) => {
            return this.isa(type, xx, ...xP);
          });
        }
      }
    });
    //.........................................................................................................
    this.declare('object_of', {
      tests: {
        "x is a object": (type, x, ...xP) => {
          return this.isa.object(x);
        },
        /* TAINT should check for `@isa.type type` */
        "type is nonempty_text": (type, x, ...xP) => {
          return this.isa.nonempty_text(type);
        },
        "all elements pass test": (type, x, ...xP) => {
          var _, xx;
          for (_ in x) {
            xx = x[_];
            if (!this.isa(type, xx, ...xP)) {
              return false;
            }
          }
          return true;
        }
      }
    });
    //.........................................................................................................
    this.declare('jsidentifier', {
      tests: (x) => {
        return (this.isa.text(x)) && jsidentifier_pattern.test(x);
      }
    });
    //.........................................................................................................
    this.declare('int2text', {
      tests: (x) => {
        return (this.isa.text(x)) && ((x.match(/^[01]+$/)) != null);
      },
      casts: {
        float: (x) => {
          return parseInt(x, 2);
        }
      }
    });
    //.........................................................................................................
    this.declare('int10text', {
      tests: (x) => {
        return (this.isa.text(x)) && ((x.match(/^[0-9]+$/)) != null);
      },
      casts: {
        float: (x) => {
          return parseInt(x, 10);
        }
      }
    });
    //.........................................................................................................
    this.declare('int16text', {
      tests: (x) => {
        return (this.isa.text(x)) && ((x.match(/^[0-9a-fA-F]+$/)) != null);
      },
      casts: {
        float: (x) => {
          return parseInt(x, 16);
        },
        int2text: (x) => {
          return (parseInt(x, 16)).toString(2);
        }
      }
    });
    //.........................................................................................................
    this./* TAINT could use `cast()` API */declare('int32', function(x) {
      return (this.isa.integer(x)) && ((-2147483648 <= x && x <= 2147483647));
    });
    //.........................................................................................................
    this.declare('vnr', function(x) {
      /* A vectorial number (VNR) is a non-empty array of numbers, including infinity. */
      return (this.isa_list_of.infloat(x)) && (x.length > 0);
    });
    //.........................................................................................................
    return this.declare('fs_stats', {
      tests: {
        'x is an object': function(x) {
          return this.isa.object(x);
        },
        'x.size is a cardinal': function(x) {
          return this.isa.cardinal(x.size);
        },
        'x.atimeMs is a float': function(x) {
          return this.isa.float(x.atimeMs);
        },
        'x.atime is a date': function(x) {
          return this.isa.date(x.atime);
        }
      }
    });
  };

  //===========================================================================================================
  // TYPE DECLARATIONS
  //-----------------------------------------------------------------------------------------------------------
  this.declare_checks = function() {
    var FS, PATH;
    PATH = require('path');
    FS = require('fs');
    //.........................................................................................................
    /* NOTE: will throw error unless path exists, error is implicitly caught, represents sad path */
    this.declare_check('fso_exists', function(path, stats = null) {
      return FS.statSync(path);
    });
    // try ( stats ? FS.statSync path ) catch error then error
    //.........................................................................................................
    this.declare_check('is_file', function(path, stats = null) {
      var bad;
      if (this.is_sad((bad = stats = this.check.fso_exists(path, stats)))) {
        return bad;
      }
      if (stats.isFile()) {
        return stats;
      }
      return this.sadden(`not a file: ${path}`);
    });
    //.........................................................................................................
    return this.declare_check('is_json_file', function(path) {
      var error;
      try {
        return JSON.parse(FS.readFileSync(path));
      } catch (error1) {
        error = error1;
        return error;
      }
    });
  };

  // #.........................................................................................................
// @declare_check 'equals', ( a, P... ) ->
//   for b in P
//     return CHECKS.sad unless equals a, b
//   return true
/* not supported until we figure out how to do it in strict mode: */
// @declare 'arguments',                     ( x ) -> ( js_type_of x ) is 'arguments'

  // Array.isArray
// ArrayBuffer.isView
// Atomics.isLockFree
// Buffer.isBuffer
// Buffer.isEncoding
// constructor.is
// constructor.isExtensible
// constructor.isFrozen
// constructor.isSealed
// Number.isFinite
// Number.isInteger
// Number.isNaN
// Number.isSafeInteger
// Object.is
// Object.isExtensible
// Object.isFrozen
// Object.isSealed
// Reflect.isExtensible
// root.isFinite
// root.isNaN
// Symbol.isConcatSpreadable

}).call(this);


}).call(this)}).call(this,require("buffer").Buffer)

},{"./checks":37,"./helpers":40,"buffer":4,"fs":3,"path":23}],39:[function(require,module,exports){
(function (Buffer){(function (){
(function() {
  'use strict';
  var assign, constructor_of_generators, copy_if_original, isa_copy, jr, js_type_of, rpr, xrpr,
    indexOf = [].indexOf;

  //###########################################################################################################
  ({assign, jr, rpr, xrpr, js_type_of} = require('./helpers'));

  isa_copy = Symbol('isa_copy');

  constructor_of_generators = ((function*() {
    return (yield 42);
  })()).constructor;

  //-----------------------------------------------------------------------------------------------------------
  /* TAINT make catalog of all 'deep JS' names that must never be used as types, b/c e.g a type 'bind'
  would shadow native `f.bind()` */
  this.illegal_types = ['bind', 'toString', 'valueOf'];

  //-----------------------------------------------------------------------------------------------------------
  copy_if_original = function(x) {
    var R;
    if (x[isa_copy]) {
      return x;
    }
    R = assign({}, x);
    R[isa_copy] = true;
    return R;
  };

  //-----------------------------------------------------------------------------------------------------------
  this._satisfies_all_aspects = function(type, ...xP) {
    if ((this._get_unsatisfied_aspect(type, ...xP)) == null) {
      return true;
    }
    return false;
  };

  //-----------------------------------------------------------------------------------------------------------
  this._get_unsatisfied_aspect = function(type, ...xP) {
    var aspect, factual_type, ref, spec, test;
    /* Check with `type_of()` if type not in spec: */
    if ((spec = this.specs[type]) == null) {
      if ((factual_type = this.type_of(...xP)) === type) {
        return null;
      }
      return `${rpr(type)} is a known type`;
    }
    ref = spec.tests;
    /* Check all constraints in spec: */
    for (aspect in ref) {
      test = ref[aspect];
      if (!test.apply(this, xP)) {
        return aspect;
      }
    }
    return null;
  };

  //-----------------------------------------------------------------------------------------------------------
  this.type_of = function(x) {
    var R, arity, c, tagname;
    if ((arity = arguments.length) !== 1) {
      throw new Error(`^7746^ expected 1 argument, got ${arity}`);
    }
    if (x === null) {
      return 'null';
    }
    if (x === void 0) {
      return 'undefined';
    }
    if ((x === 2e308) || (x === -2e308)) {
      return 'infinity';
    }
    if ((x === true) || (x === false)) {
      return 'boolean';
    }
    if (Number.isNaN(x)) {
      return 'nan';
    }
    if (Buffer.isBuffer(x)) {
      return 'buffer';
    }
    //.........................................................................................................
    if (((tagname = x[Symbol.toStringTag]) != null) && (typeof tagname) === 'string') {
      if (tagname === 'Array Iterator') {
        return 'arrayiterator';
      }
      if (tagname === 'String Iterator') {
        return 'stringiterator';
      }
      if (tagname === 'Map Iterator') {
        return 'mapiterator';
      }
      if (tagname === 'Set Iterator') {
        return 'setiterator';
      }
      return tagname.toLowerCase();
    }
    if ((c = x.constructor) === void 0) {
      //.........................................................................................................
      /* Domenic Denicola Device, see https://stackoverflow.com/a/30560581 */
      return 'nullobject';
    }
    if ((typeof c) !== 'function') {
      return 'object';
    }
    if ((R = c.name.toLowerCase()) === '') {
      if (x.constructor === constructor_of_generators) {
        return 'generator';
      }
      /* NOTE: throw error since this should never happen */
      return ((Object.prototype.toString.call(x)).slice(8, -1)).toLowerCase();
    }
    if ((typeof x === 'object') && (R === 'boolean' || R === 'number' || R === 'string')) {
//.........................................................................................................
/* Mark Miller Device */      return 'wrapper';
    }
    if (R === 'number') {
      return 'float';
    }
    if (R === 'regexp') {
      return 'regex';
    }
    if (R === 'string') {
      return 'text';
    }
    if (R === 'array') {
      return 'list';
    }
    if (R === 'function' && x.toString().startsWith('class ')) {
      /* thx to https://stackoverflow.com/a/29094209 */
      /* TAINT may produce an arbitrarily long throwaway string */
      return 'class';
    }
    return R;
  };

  //-----------------------------------------------------------------------------------------------------------
  this.types_of = function(...xP) {
    var R, aspect, ok, ref, ref1, spec, test, type;
    R = [];
    ref = this.specs;
    for (type in ref) {
      spec = ref[type];
      ok = true;
      ref1 = spec.tests;
      for (aspect in ref1) {
        test = ref1[aspect];
        if (!test.apply(this, xP)) {
          ok = false;
          break;
        }
      }
      if (ok) {
        R.push(type);
      }
    }
    return R;
  };

  //-----------------------------------------------------------------------------------------------------------
  this.declare = function(...P)/* type, spec?, test? */ {
    var arity;
    switch (arity = P.length) {
      case 1:
        return this._declare_1(...P);
      case 2:
        return this._declare_2(...P);
      case 3:
        return this._declare_3(...P);
    }
    throw new Error(`µ6746 expected between 1 and 3 arguments, got ${arity}`);
  };

  //-----------------------------------------------------------------------------------------------------------
  this._declare_1 = function(spec) {
    var T;
    if ((T = js_type_of(spec)) !== 'object') {
      throw new Error(`µ6869 expected an object for spec, got a ${T}`);
    }
    //.........................................................................................................
    if ((T = js_type_of(spec.type)) !== 'string') {
      throw new Error(`µ6992 expected a text for spec.type, got a ${T}`);
    }
    //.........................................................................................................
    switch ((T = js_type_of(spec.tests))) {
      case 'function':
        spec.tests = {
          main: spec.tests
        };
        break;
      case 'object':
        null;
        break;
      default:
        throw new Error(`µ7115 expected an object for spec.tests, got a ${T}`);
    }
    //.........................................................................................................
    return this._declare(spec);
  };

  //-----------------------------------------------------------------------------------------------------------
  this._declare_2 = function(type, spec_or_test) {
    var T, spec;
    switch (T = js_type_of(spec_or_test)) {
      //.......................................................................................................
      case 'function':
        return this._declare_1({
          type,
          tests: {
            main: spec_or_test
          }
        });
      //.......................................................................................................
      case 'asyncfunction':
        throw "µ7238 asynchronous functions not yet supported";
    }
    //.........................................................................................................
    if (T !== 'object') {
      throw new Error(`µ7361 expected an object, got a ${T} for spec`);
    }
    //.........................................................................................................
    if ((spec_or_test.type != null) && (!spec_or_test.type === type)) {
      throw new Error(`µ7484 type declarations ${rpr(type)} and ${rpr(spec_or_test.type)} do not match`);
    }
    //.........................................................................................................
    spec = copy_if_original(spec_or_test);
    spec.type = type;
    return this._declare_1(spec);
  };

  //-----------------------------------------------------------------------------------------------------------
  this._declare_3 = function(type, spec, test) {
    var T;
    if ((T = js_type_of(spec)) !== 'object') {
      throw new Error(`µ7607 expected an object, got a ${T} for spec`);
    }
    //.........................................................................................................
    if ((T = js_type_of(test)) !== 'function') {
      throw new Error(`µ7730 expected a function for test, got a ${T}`);
    }
    //.........................................................................................................
    if (spec.tests != null) {
      throw new Error("µ7853 spec cannot have tests when tests are passed as argument");
    }
    //.........................................................................................................
    spec = copy_if_original(spec);
    spec.tests = {
      main: test
    };
    return this._declare_2(type, spec);
  };

  //-----------------------------------------------------------------------------------------------------------
  this._declare = function(spec) {
    var type;
    spec = copy_if_original(spec);
    delete spec[isa_copy];
    ({type} = spec);
    spec.type = type;
    //.........................................................................................................
    if (indexOf.call(this.illegal_types, type) >= 0) {
      throw new Error(`µ7976 ${rpr(type)} is not a legal type name`);
    }
    //.........................................................................................................
    if (this.specs[type] != null) {
      throw new Error(`µ8099 type ${rpr(type)} already declared`);
    }
    //.........................................................................................................
    this.specs[type] = spec;
    this.isa[type] = (...P) => {
      return this.isa(type, ...P);
    };
    // @validate[ type ]    = ( P... ) => @validate type, P...
    spec.size = this._sizeof_method_from_spec(type, spec);
    //.........................................................................................................
    return null;
  };

}).call(this);


}).call(this)}).call(this,{"isBuffer":require("../../../../../../../../.local/share/pnpm/global/5/.pnpm/is-buffer@1.1.6/node_modules/is-buffer/index.js")})

},{"../../../../../../../../.local/share/pnpm/global/5/.pnpm/is-buffer@1.1.6/node_modules/is-buffer/index.js":19,"./helpers":40}],40:[function(require,module,exports){
(function() {
  'use strict';
  var LOUPE, inspect, rpr,
    indexOf = [].indexOf;

  //-----------------------------------------------------------------------------------------------------------
  ({inspect} = require('util'));

  this.assign = Object.assign;

  // @jr           = JSON.stringify
  LOUPE = require('../deps/loupe.js');

  this.rpr = rpr = (x) => {
    return LOUPE.inspect(x, {
      customInspect: false
    });
  };

  this.xrpr = function(x) {
    return (rpr(x)).slice(0, 1025);
  };

  //===========================================================================================================
  // TYPE_OF FLAVORS
  //-----------------------------------------------------------------------------------------------------------
  this.domenic_denicola_device = (x) => {
    var ref, ref1;
    return (ref = x != null ? (ref1 = x.constructor) != null ? ref1.name : void 0 : void 0) != null ? ref : './.';
  };

  this.mark_miller_device = (x) => {
    return (Object.prototype.toString.call(x)).slice(8, -1);
  };

  this.mark_miller_device_2 = (x) => {
    return ((Object.prototype.toString.call(x)).slice(8, -1)).toLowerCase().replace(/\s+/g, '');
  };

  this.js_type_of = (x) => {
    return ((Object.prototype.toString.call(x)).slice(8, -1)).toLowerCase().replace(/\s+/g, '');
  };

  //===========================================================================================================

  //-----------------------------------------------------------------------------------------------------------
  this.get_rprs_of_tprs = function(tprs) {
    /* `tprs: test parameters, i.e. additional arguments to type tester, as in `multiple_of x, 4` */
    var rpr_of_tprs, srpr_of_tprs;
    rpr_of_tprs = (function() {
      switch (tprs.length) {
        case 0:
          return '';
        case 1:
          return `${rpr(tprs[0])}`;
        default:
          return `${rpr(tprs)}`;
      }
    })();
    srpr_of_tprs = (function() {
      switch (rpr_of_tprs.length) {
        case 0:
          return '';
        default:
          return ' ' + rpr_of_tprs;
      }
    })();
    return {rpr_of_tprs, srpr_of_tprs};
  };

  //-----------------------------------------------------------------------------------------------------------
  this.intersection_of = function(a, b) {
    var x;
    a = [...a].sort();
    b = [...b].sort();
    return ((function() {
      var i, len, results;
      results = [];
      for (i = 0, len = a.length; i < len; i++) {
        x = a[i];
        if (indexOf.call(b, x) >= 0) {
          results.push(x);
        }
      }
      return results;
    })()).sort();
  };

}).call(this);


},{"../deps/loupe.js":36,"util":27}],41:[function(require,module,exports){
(function() {
  'use strict';
  var HELPERS, Multimix, assign, cast, check, declarations, get_rprs_of_tprs, isa, isa_list_of, isa_object_of, isa_optional, jk_equals, jr, js_type_of, rpr, sad, validate, validate_list_of, validate_object_of, validate_optional, xrpr;

  //###########################################################################################################
  Multimix = require('multimix');

  //...........................................................................................................
  HELPERS = require('./helpers');

  ({assign, jr, rpr, xrpr, get_rprs_of_tprs, js_type_of} = HELPERS);

  //...........................................................................................................
  declarations = require('./declarations');

  sad = (require('./checks')).sad;

  jk_equals = require('../deps/jkroso-equals');

  //-----------------------------------------------------------------------------------------------------------
  isa = function(type, ...xP) {
    return this._satisfies_all_aspects(type, ...xP);
  };

  isa_list_of = function(type, ...xP) {
    return this.isa.list_of(type, ...xP);
  };

  isa_object_of = function(type, ...xP) {
    return this.isa.object_of(type, ...xP);
  };

  validate_list_of = function(type, ...xP) {
    return this.validate.list_of(type, ...xP);
  };

  validate_object_of = function(type, ...xP) {
    return this.validate.object_of(type, ...xP);
  };

  isa_optional = function(type, ...xP) {
    return (xP[0] == null) || this._satisfies_all_aspects(type, ...xP);
  };

  validate_optional = function(type, ...xP) {
    return (xP[0] == null) || this.validate(type, ...xP);
  };

  //-----------------------------------------------------------------------------------------------------------
  cast = function(type_a, type_b, x, ...xP) {
    var casts, converter;
    this.validate(type_a, x, ...xP);
    if (type_a === type_b) {
      return x;
    }
    if (this.isa(type_b, x, ...xP)) {
      return x;
    }
    if ((casts = this.specs[type_a].casts) != null) {
      if ((converter = casts[type_b]) != null) {
        return converter.call(this, x, ...xP);
      }
    }
    if (type_b === 'text'/* TAINT use better method like util.inspect */) {
      return `${x}`;
    }
    throw new Error(`^intertype/cast@1234^ unable to cast a ${type_a} as ${type_b}`);
  };

  //-----------------------------------------------------------------------------------------------------------
  check = function(type, x, ...xP) {
    var error;
    if (this.specs[type] != null) {
      if (this.isa(type, x, ...xP)) {
        return true;
      } else {
        return sad;
      }
    }
    if ((check = this.checks[type]) == null) {
      throw new Error(`^intertype/check@1345^ unknown type or check ${rpr(type)}`);
    }
    try {
      return check.call(this, x, ...xP);
    } catch (error1) {
      error = error1;
      return error;
    }
  };

  //-----------------------------------------------------------------------------------------------------------
  validate = function(type, ...xP) {
    var P, aspect, message, rpr_of_tprs, srpr_of_tprs, x;
    if ((aspect = this._get_unsatisfied_aspect(type, ...xP)) == null) {
      return true;
    }
    [x, ...P] = xP;
    ({rpr_of_tprs, srpr_of_tprs} = get_rprs_of_tprs(P));
    message = aspect === 'main' ? `^intertype/validate@1456^ not a valid ${type}: ${xrpr(x)}${srpr_of_tprs}` : `^intertype/validate@1567^ not a valid ${type} (violates ${rpr(aspect)}): ${xrpr(x)}${srpr_of_tprs}`;
    throw new Error(message);
  };

  //===========================================================================================================
  this.Intertype = (function() {
    class Intertype extends Multimix {
      //---------------------------------------------------------------------------------------------------------
      constructor(target = null) {
        super();
        //.......................................................................................................
        /* TAINT bug in MultiMix, should be possible to declare methods in class, not the constructor,
           and still get a bound version with `export()`; declaring them here FTTB */
        //.......................................................................................................
        this.sad = sad;
        this.specs = {};
        this.checks = {};
        this.isa = Multimix.get_keymethod_proxy(this, isa);
        this.isa_optional = Multimix.get_keymethod_proxy(this, isa_optional);
        this.isa_list_of = Multimix.get_keymethod_proxy(this, isa_list_of);
        this.isa_object_of = Multimix.get_keymethod_proxy(this, isa_object_of);
        this.cast = Multimix.get_keymethod_proxy(this, cast);
        this.validate = Multimix.get_keymethod_proxy(this, validate);
        this.validate_optional = Multimix.get_keymethod_proxy(this, validate_optional);
        this.validate_list_of = Multimix.get_keymethod_proxy(this, validate_list_of);
        this.validate_object_of = Multimix.get_keymethod_proxy(this, validate_object_of);
        this.check = Multimix.get_keymethod_proxy(this, check);
        this.nowait = function(x) {
          this.validate.immediate(x);
          return x;
        };
        this._helpers = HELPERS;
        declarations.declare_types.apply(this);
        declarations.declare_checks.apply(this);
        if (target != null) {
          this.export(target);
        }
      }

      //---------------------------------------------------------------------------------------------------------
      equals(a, ...P) {
        var arity, b, i, len, type_of_a;
        if ((arity = arguments.length) < 2) {
          throw new Error(`^intertype/equals@3489^ expected at least 2 arguments, got ${arity}`);
        }
        type_of_a = this.type_of(a);
        for (i = 0, len = P.length; i < len; i++) {
          b = P[i];
          if (type_of_a !== this.type_of(b)) {
            return false;
          }
          if ((type_of_a === 'set' || type_of_a === 'map') && this.equals([...a], [...b])) {
            return true;
          }
          if (!jk_equals(a, b)) {
            /* TAINT this call involves its own typechecking code and thus may mysteriously fail */
            return false;
          }
        }
        return true;
      }

    };

    // @extend   object_with_class_properties
    Intertype.include(require('./sizing'));

    Intertype.include(require('./declaring'));

    Intertype.include(require('./checks'));

    return Intertype;

  }).call(this);

}).call(this);


},{"../deps/jkroso-equals":34,"./checks":37,"./declarations":38,"./declaring":39,"./helpers":40,"./sizing":42,"multimix":44}],42:[function(require,module,exports){
(function() {
  'use strict';
  var assign, jr, js_type_of, xrpr;

  //###########################################################################################################
  ({assign, jr, xrpr, js_type_of} = require('./helpers'));

  //===========================================================================================================
  // OBJECT SIZES
  //-----------------------------------------------------------------------------------------------------------
  this._sizeof_method_from_spec = function(type, spec) {
    return ((s) => {
      var T;
      if (s == null) {
        return null;
      }
      switch (T = js_type_of(s)) {
        case 'string':
          return function(x) {
            return x[s];
          };
        case 'function':
          return s/* TAINT disallows async funtions */;
        case 'number':
          return function() {
            return s/* TAINT allows NaN, Infinity */;
          };
      }
      throw new Error(`µ30988 expected null, a text or a function for size of ${type}, got a ${T}`);
    })(spec.size);
  };

  //-----------------------------------------------------------------------------------------------------------
  this.size_of = function(x, ...P) {
    /* The `size_of()` method uses a per-type configurable methodology to return the size of a given value;
     such methodology may permit or necessitate passing additional arguments (such as `size_of text`, which
     comes in several flavors depending on whether bytes or codepoints are to be counted). As such, it is a
     model for how to implement Go-like method dispatching. */
    var getter, ref, type;
    type = this.type_of(x);
    if (!(this.isa.function((getter = (ref = this.specs[type]) != null ? ref.size : void 0)))) {
      throw new Error(`µ88793 unable to get size of a ${type}`);
    }
    return getter(x, ...P);
  };

  //-----------------------------------------------------------------------------------------------------------
  /* TAINT faulty implementation:
   * does not use size_of but length
   * does not accept additional arguments as needed for texts
   * risks to break codepoints apart
    */
  this.first_of = function(collection) {
    return collection[0];
  };

  this.last_of = function(collection) {
    return collection[collection.length - 1];
  };

  //-----------------------------------------------------------------------------------------------------------
  this.arity_of = function(x) {
    var type;
    if ((type = this.supertype_of(x)) !== 'callable') {
      throw new Error(`µ88733 expected a callable, got a ${type}`);
    }
    return x.length;
  };

  //-----------------------------------------------------------------------------------------------------------
  this.has_size = function(x) {
    var ref;
    return this.isa.function((ref = this.specs[this.type_of(x)]) != null ? ref.size : void 0);
  };

}).call(this);


},{"./helpers":40}],43:[function(require,module,exports){
(function() {
  'use strict';
  //===========================================================================================================
  // OBJECT PROPERTY CATALOGUING
  //-----------------------------------------------------------------------------------------------------------
  this.keys_of = function(...P) {
    return this.values_of(this.walk_keys_of(...P));
  };

  this.all_keys_of = function(...P) {
    return this.values_of(this.walk_all_keys_of(...P));
  };

  this.all_own_keys_of = function(x) {
    if (x != null) {
      return Object.getOwnPropertyNames(x);
    } else {
      return [];
    }
  };

  this.walk_all_own_keys_of = function*(x) {
    var i, k, len, ref, results;
    ref = this.all_own_keys_of(x);
    results = [];
    for (i = 0, len = ref.length; i < len; i++) {
      k = ref[i];
      results.push((yield k));
    }
    return results;
  };

  //-----------------------------------------------------------------------------------------------------------
  this.walk_keys_of = function*(x, settings) {
    var defaults, k, results;
    defaults = {
      skip_undefined: true
    };
    settings = {...defaults, ...settings};
    results = [];
    for (k in x) {
      if ((x[k] === void 0) && settings.skip_undefined) {
        /* TAINT should use property descriptors to avoid possible side effects */
        continue;
      }
      results.push((yield k));
    }
    return results;
  };

  //-----------------------------------------------------------------------------------------------------------
  this.walk_all_keys_of = function(x, settings) {
    var defaults;
    defaults = {
      skip_object: true,
      skip_undefined: true
    };
    settings = {...defaults, ...settings};
    return this._walk_all_keys_of(x, new Set(), settings);
  };

  //-----------------------------------------------------------------------------------------------------------
  this._walk_all_keys_of = function*(x, seen, settings) {
    /* TAINT should use property descriptors to avoid possible side effects */
    /* TAINT trying to access `arguments` causes error */
    var error, k, proto, ref, value;
    if ((!settings.skip_object) && x === Object.prototype) {
      return;
    }
    ref = this.walk_all_own_keys_of(x);
    //.........................................................................................................
    for (k of ref) {
      if (seen.has(k)) {
        continue;
      }
      seen.add(k);
      try {
        value = x[k];
      } catch (error1) {
        error = error1;
        continue;
      }
      if ((value === void 0) && settings.skip_undefined) {
        continue;
      }
      if (settings.symbol != null) {
        if (value == null) {
          continue;
        }
        if (!value[settings.symbol]) {
          continue;
        }
      }
      yield k;
    }
    //.........................................................................................................
    if ((proto = Object.getPrototypeOf(x)) != null) {
      return (yield* this._walk_all_keys_of(proto, seen, settings));
    }
  };

  //-----------------------------------------------------------------------------------------------------------
  /* Turn iterators into lists, copy lists: */
  this.values_of = function(x) {
    return [...x];
  };

  //-----------------------------------------------------------------------------------------------------------
  this.has_keys = function(x, ...P) {
    var i, key, len, ref;
    if (x == null) {
      /* Observe that `has_keys()` always considers `undefined` as 'not set' */
      return false;
    }
/* TAINT or throw error */    ref = P.flat(2e308);
    for (i = 0, len = ref.length; i < len; i++) {
      key = ref[i];
      if (x[key] === void 0) {
        /* TAINT should use property descriptors to avoid possible side effects */
        return false;
      }
    }
    return true;
  };

  //-----------------------------------------------------------------------------------------------------------
  this.has_key = function(x, key) {
    return this.has_keys(x, key);
  };

  //-----------------------------------------------------------------------------------------------------------
  this.has_only_keys = function(x, ...P) {
    var keys, probes;
    probes = (P.flat(2e308)).sort();
    keys = (this.values_of(this.keys_of(x))).sort();
    return probes.length = keys.length && probes.every(function(x, idx) {
      return x === keys[idx];
    });
  };

}).call(this);


},{}],44:[function(require,module,exports){
(function() {
  'use strict';
  var Multimix, module_keywords,
    indexOf = [].indexOf;

  //===========================================================================================================
  // MODULE METACLASS provides static methods `@extend()`, `@include()`
  //-----------------------------------------------------------------------------------------------------------
  /* The little dance around the module_keywords variable is to ensure we have callback support when mixins
  extend a class. See https://arcturo.github.io/library/coffeescript/03_classes.html */
  //-----------------------------------------------------------------------------------------------------------
  module_keywords = ['extended', 'included'];

  Multimix = (function() {
    //===========================================================================================================
    class Multimix {
      //---------------------------------------------------------------------------------------------------------
      static extend(object, settings = null) {
        var key, ref, value;
        settings = {...{
            overwrite: true
          }, ...(settings != null ? settings : null)};
        for (key in object) {
          value = object[key];
          if (!(indexOf.call(module_keywords, key) < 0)) {
            continue;
          }
          if ((!settings.overwrite) && ((this.prototype[key] != null) || (this[key] != null))) {
            throw new Error(`^multimix/include@5684 overwrite set to false but name already set: ${JSON.stringify(key)}`);
          }
          this[key] = value;
        }
        if ((ref = object.extended) != null) {
          ref.apply(this);
        }
        return this;
      }

      //---------------------------------------------------------------------------------------------------------
      static include(object, settings = null) {
        var key, ref, value;
        settings = {...{
            overwrite: true
          }, ...(settings != null ? settings : null)};
        for (key in object) {
          value = object[key];
          if (!(indexOf.call(module_keywords, key) < 0)) {
            continue;
          }
          if ((!settings.overwrite) && ((this.prototype[key] != null) || (this[key] != null))) {
            throw new Error(`^multimix/include@5683 overwrite set to false but name already set: ${JSON.stringify(key)}`);
          }
          // Assign properties to the prototype
          this.prototype[key] = value;
        }
        if ((ref = object.included) != null) {
          ref.apply(this);
        }
        return this;
      }

      //---------------------------------------------------------------------------------------------------------
      export(target = null) {
        /* Return an object with methods, bound to the current instance. */
        var R, k, ref, ref1, v;
        R = target != null ? target : {};
        ref = (require('./cataloguing')).walk_all_keys_of(this);
        for (k of ref) {
          v = this[k];
          if ((v != null ? v.bind : void 0) == null) {
            R[k] = v;
          } else if ((ref1 = v[Multimix.isa_keymethod_proxy]) != null ? ref1 : false) {
            R[k] = Multimix.get_keymethod_proxy(this, v);
          } else {
            R[k] = v.bind(this);
          }
        }
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      get_my_prototype() {
        return Object.getPrototypeOf(Object.getPrototypeOf(this));
      }

      //---------------------------------------------------------------------------------------------------------
      new(...P) {
        return new this.constructor(...P);
      }

      //=========================================================================================================
      // KEYMETHOD FACTORY
      //---------------------------------------------------------------------------------------------------------
      static get_keymethod_proxy(bind_target, f) {
        var R;
        R = new Proxy(f.bind(bind_target), {
          get: function(target, key) {
            if (key === 'bind') { // ... other properties ...
              return target[key];
            }
            if ((typeof key) === 'symbol') {
              return target[key];
            }
            return function(...xP) {
              return target(key, ...xP);
            };
          }
        });
        R[Multimix.isa_keymethod_proxy] = true;
        return R;
      }

    };

    //=========================================================================================================
    // @js_type_of = ( x ) -> return ( ( Object::toString.call x ).slice 8, -1 ).toLowerCase()
    Multimix.isa_keymethod_proxy = Symbol('proxy');

    return Multimix;

  }).call(this);

  //###########################################################################################################
  module.exports = Multimix;

}).call(this);


},{"./cataloguing":43}],"mudom":[function(require,module,exports){
(function() {
  'use strict';
  var Dom, INTERTEXT, Text, debug, isa, loupe, misfit, types, validate;

  loupe = require('../loupe.js');

  misfit = Symbol('misfit');

  debug = console.debug;

  ({types, isa, validate} = require('./types'));

  //-----------------------------------------------------------------------------------------------------------
  INTERTEXT = {
    camelize: function(text) {
      /* thx to https://github.com/lodash/lodash/blob/master/camelCase.js */
      var i, idx, ref, word, words;
      words = text.split('-');
      for (idx = i = 1, ref = words.length; i < ref; idx = i += +1) {
        word = words[idx];
        if (word === '') {
          continue;
        }
        words[idx] = word[0].toUpperCase() + word.slice(1);
      }
      return words.join('');
    }
  };

  //===========================================================================================================

  //-----------------------------------------------------------------------------------------------------------
  Text = class Text {
    //---------------------------------------------------------------------------------------------------------
    rpr(x) {
      return loupe.inspect(x);
    }

    _pen1(x) {
      if (isa.text(x)) {
        return x;
      } else {
        return this.rpr(x);
      }
    }

    pen(...P) {
      return (P.map((x) => {
        return this._pen1(x);
      })).join(' ');
    }

    pen_escape(...P) {
      return (P.map((x) => {
        return this._pen_escape1(x);
      })).join(' ');
    }

    log(...P) {
      return console.log(this.pen(...P));
    }

    //---------------------------------------------------------------------------------------------------------
    _pen_escape1(x) {
      if (isa.text(x)) {
        return this._escape(x);
      }
      if (isa.element(x)) {
        return this._escape(x.outerHTML);
      }
      return this.rpr(x);
    }

    //---------------------------------------------------------------------------------------------------------
    _escape(x) {
      return x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

  };

  Dom = (function() {
    //===========================================================================================================

    //-----------------------------------------------------------------------------------------------------------
    class Dom { // extends Multimix
      /* inspired by http://youmightnotneedjquery.com
       and https://blog.garstasio.com/you-dont-need-jquery */
      //=========================================================================================================

      //---------------------------------------------------------------------------------------------------------
      ready(f) {
        // thx to https://stackoverflow.com/a/7053197/7568091
        // function r(f){/in/.test(document.readyState)?setTimeout(r,9,f):f()}
        validate.function(f);
        if (/in/.test(document.readyState)) {
          return setTimeout((() => {
            return this.ready(f);
          }), 9);
        }
        return f();
      }

      //=========================================================================================================
      // WARNINGS, NOTIFICATIONS
      //---------------------------------------------------------------------------------------------------------
      _notify(message) {
        var body, id, message_box, message_p, style;
        id = 'msgbx49573';
        message_box = this.select(`${id}`, null);
        if (message_box === null) {
          body = this.select('body', null);
          /* TAINT body element cannot be found when method is called before document ready, but we could still
               construct element immediately, append it on document ready */
          if (body == null) {
            return;
          }
          style = "background:#18171d;";
          style += "position:fixed;";
          style += "bottom:0mm;";
          style += "border:1mm dashed #e2ff00;";
          style += "padding-left:3mm;";
          style += "padding-right:3mm;";
          style += "padding-bottom:3mm;";
          style += "font-family:sans-serif;";
          style += "font-weight:bold !important;";
          style += "font-size:3mm;";
          style += "color:#e2ff00;";
          style += "width:100%;";
          style += "max-height:30mm;";
          style += "overflow-y:scroll;";
          message_box = this.parse_one(`<div id=${id} style='${style}'></div>`);
          this.append(body, message_box);
        }
        message_p = "<p style='padding-top:3mm;'>";
        message_p += "⚠️&nbsp;<strong>";
        message_p += µ.TEXT.pen_escape(message);
        message_p += "</strong></p>";
        message_p = this.parse_one(message_p);
        this.insert_as_last(message_box, message_p);
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      warn(...P) {
        /* Construct a text message for display in console and in notification box, alongside with a stack trace
           to be shown only in the console, preced by the original arguments as passed into this function,
           meaning that any DOM elements will be expandable links to their visible representations on the HTML
           page. */
        var error, message;
        message = µ.TEXT.pen(...P);
        error = new Error(message);
        console.groupCollapsed(P[0]);
        console.warn(...P);
        console.groupEnd();
        return this._notify(message);
      }

      //=========================================================================================================

      //---------------------------------------------------------------------------------------------------------
      /* NOTE `µ.DOM.select()` to be deprecated in favor of `µ.DOM.select_first()` */
      select(selector, fallback = misfit) {
        return this.select_first(document, selector, fallback);
      }

      select_first(selector, fallback = misfit) {
        return this.select_from(document, selector, fallback);
      }

      select_all(selector) {
        return this.select_all_from(document, selector);
      }

      //---------------------------------------------------------------------------------------------------------
      /* NOTE `µ.DOM.select_from()` to be deprecated in favor of `µ.DOM.select_first_from()` */
      select_from(element, selector, fallback = misfit) {
        return this.select_first_from(element, selector, fallback);
      }

      select_first_from(element, selector, fallback = misfit) {
        var R;
        validate.delement(element);
        validate.nonempty_text(selector);
        if ((R = element.querySelector(selector)) == null) {
          if (fallback === misfit) {
            throw new Error(`^µDOM/select_from@7758^ no such element: ${µ.TEXT.rpr(selector)}`);
          }
          return fallback;
        }
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      select_all_from(element, selector) {
        validate.delement(element);
        validate.nonempty_text(selector);
        return element.querySelectorAll(selector);
      }

      // Array.from element.querySelectorAll selector

        //---------------------------------------------------------------------------------------------------------
      select_id(id, fallback = misfit) {
        var R;
        validate.nonempty_text(id);
        if ((R = document.getElementById(id)) == null) {
          if (fallback === misfit) {
            throw new Error(`^µDOM/select_id@7758^ no element with ID: ${µ.TEXT.rpr(id)}`);
          }
          return fallback;
        }
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      matches_selector(element, selector) {
        if (!isa.function(element != null ? element.matches : void 0)) {
          throw new Error(`^µDOM/select_id@77581^ expected element with \`match()\` method, got ${µ.TEXT.rpr(element)}`);
        }
        return element.matches(selector);
      }

      //---------------------------------------------------------------------------------------------------------
      get(element, name) {
        validate.element(element);
        return element.getAttribute(name);
      }

      get_numeric(element, name) {
        return parseFloat(this.get(element, name));
      }

      // When called with two arguments as in `set div, 'bar'`, will set values-less attribute (`<div bar>`)
      set(element, name, value = '') {
        validate.element(element);
        return element.setAttribute(name, value);
      }

      //---------------------------------------------------------------------------------------------------------
      get_classes(element) {
        validate.element(element);
        return element.classList;
      }

      add_class(element, name) {
        validate.element(element);
        return element.classList.add(name);
      }

      has_class(element, name) {
        validate.element(element);
        return element.classList.contains(name);
      }

      remove_class(element, name) {
        validate.element(element);
        return element.classList.remove(name);
      }

      toggle_class(element, name) {
        validate.element(element);
        return element.classList.toggle(name);
      }

      //---------------------------------------------------------------------------------------------------------
      swap_class(element, old_name, new_name) {
        element.classList.remove(old_name);
        return element.classList.add(new_name);
      }

      //---------------------------------------------------------------------------------------------------------
      hide(element) {
        validate.element(element);
        return element.style.display = 'none';
      }

      show(element) {
        validate.element(element);
        return element.style.display = '';
      }

      //---------------------------------------------------------------------------------------------------------
      get_live_styles(element) {
        return getComputedStyle(element);
      }

      /*
      globalThis.get_style = ( element, pseudo_selector, attribute_name ) ->
        unless attribute_name?
          [ pseudo_selector, attribute_name, ] = [ undefined, pseudo_selector, ]
        style = window.getComputedStyle element, pseudo_selector
        return style.getPropertyValue attribute_name
      */
      /* TAINT also use pseudo_selector, see above */
      /* validation done by method */
      /* validation done by method */      get_style_value(element, name) {
        return (getComputedStyle(element))[name];
      }

      get_numeric_style_value(element, name) {
        return parseFloat((getComputedStyle(element))[name]);
      }

      /* thx to https://davidwalsh.name/css-variables-javascript */
      get_prop_value(element, name) {
        return (getComputedStyle(element)).getPropertyValue(name);
      }

      get_numeric_prop_value(element, name) {
        return parseFloat((getComputedStyle(element)).getPropertyValue(name));
      }

      /* thx to https://davidwalsh.name/css-variables-javascript */
      get_global_prop_value(name) {
        return (getComputedStyle(document)).getPropertyValue(name);
      }

      get_numeric_global_prop_value(name) {
        return parseFloat((getComputedStyle(document)).getPropertyValue(name));
      }

      set_global_prop_value(name, value) {
        return document.documentElement.style.setProperty(name, value);
      }

      // #-----------------------------------------------------------------------------------------------------------
      // set_prop_defaults = ->
      //   ### There shoud be a better way to inject styles ###
      //   return null if _set_prop_defaults
      //   # head_dom = µ.DOM.select_first 'head'
      //   # style_txt = """
      //   # <style>
      //   #   * {
      //   #     outline:       2px solid yellow; }
      //   #   </style>
      //   # """
      //   # head_dom.innerHTML = style_txt + head_dom.innerHTML
      //   tophat_dom = µ.DOM.select_first '#tophat'
      //   µ.DOM.insert_before tophat_dom, µ.DOM.parse_one """
      //   <style>
      //     * {
      //       outline:       2px solid yellow; }
      //     :root {
      //       --hstn-slider-track-bgcolor:    lime; }
      //     </style>
      //   """
      //   return null

        //---------------------------------------------------------------------------------------------------------
      set_style_rule(element, name, value) {
        /* see https://developer.mozilla.org/en-US/docs/Web/API/ElementCSSInlineStyle/style */
        validate.element(element);
        validate.nonempty_text(name);
        return element.style[INTERTEXT.camelize(name)] = value;
      }

      //=========================================================================================================
      // ELEMENT CREATION
      //---------------------------------------------------------------------------------------------------------
      parse_one(element_html) {
        var R, length;
        R = this.parse_all(element_html);
        if ((length = R.length) !== 1) {
          throw new Error(`^µDOM/parse_one@7558^ expected HTML for 1 element but got ${length}`);
        }
        return R[0];
      }

      //---------------------------------------------------------------------------------------------------------
      parse_all(html) {
        var R;
        /* TAINT return Array or HTMLCollection? */
        validate.nonempty_text(html);
        R = document.implementation.createHTMLDocument();
        R.body.innerHTML = html;
        return R.body.children;
      }

      //---------------------------------------------------------------------------------------------------------
      new_element(xname, ...P) {
        /* TAINT analyze xname (a la `div#id42.foo.bar`) as done in Intertext.Cupofhtml */
        /* TAINT in some cases using innerHTML, documentFragment may be advantageous */
        var R, attributes, i, k, len, p, text, v;
        R = document.createElement(xname);
        attributes = {};
        text = null;
        for (i = 0, len = P.length; i < len; i++) {
          p = P[i];
          if (isa.text(p)) {
            text = p;
            continue;
          }
          attributes = Object.assign(attributes, p);
        }
        if (text != null) {
          /* TAINT check type? */          R.textContent = text;
        }
        for (k in attributes) {
          v = attributes[k];
          R.setAttribute(k, v);
        }
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      deep_copy(element) {
        return element.cloneNode(true);
      }

      //=========================================================================================================
      // OUTER, INNER HTML
      //---------------------------------------------------------------------------------------------------------
      get_inner_html(element) {
        validate.element(element);
        return element.innerHTML;
      }

      get_outer_html(element) {
        validate.element(element);
        return element.outerHTML;
      }

      //=========================================================================================================
      // INSERTION
      //---------------------------------------------------------------------------------------------------------
      insert(position, target, x) {
        switch (position) {
          case 'before':
          case 'beforebegin':
            return this.insert_before(target, x);
          case 'as_first':
          case 'afterbegin':
            return this.insert_as_first(target, x);
          case 'as_last':
          case 'beforeend':
            return this.insert_as_last(target, x);
          case 'after':
          case 'afterend':
            return this.insert_after(target, x);
        }
        throw new Error(`^µDOM/insert@7758^ not a valid position: ${µ.TEXT.rpr(position)}`);
      }

      //---------------------------------------------------------------------------------------------------------
      /* NOTE pending practical considerations and benchmarks we will probably remove one of the two sets
       of insertion methods */
      insert_before(target, x) {
        validate.element(target);
        return target.insertAdjacentElement('beforebegin', x);
      }

      insert_as_first(target, x) {
        validate.element(target);
        return target.insertAdjacentElement('afterbegin', x);
      }

      insert_as_last(target, x) {
        validate.element(target);
        return target.insertAdjacentElement('beforeend', x);
      }

      insert_after(target, x) {
        validate.element(target);
        return target.insertAdjacentElement('afterend', x);
      }

      //---------------------------------------------------------------------------------------------------------
      before(target, ...x) {
        validate.element(target);
        return target.before(...x);
      }

      prepend(target, ...x) {
        validate.element(target);
        return target.prepend(...x);
      }

      append(target, ...x) {
        validate.element(target);
        return target.append(...x);
      }

      after(target, ...x) {
        validate.element(target);
        return target.after(...x);
      }

      //=========================================================================================================
      // REMOVAL
      //---------------------------------------------------------------------------------------------------------
      remove(element) {
        /* see http://youmightnotneedjquery.com/#remove */
        validate.element(element);
        return element.parentNode.removeChild(element);
      }

      //=========================================================================================================
      // GEOMETRY
      //---------------------------------------------------------------------------------------------------------
      /* NOTE observe that `DOM.get_offset_top()` and `element.offsetTop` are two different things; terminology
       is confusing here, so consider renaming to avoid `offset` altogether */
      get_offset_top(element) {
        return (this.get_offset(element)).top;
      }

      get_offset_left(element) {
        return (this.get_offset(element)).left;
      }

      //---------------------------------------------------------------------------------------------------------
      get_offset(element) {
        var rectangle;
        /* see http://youmightnotneedjquery.com/#offset */
        validate.element(element);
        rectangle = element.getBoundingClientRect();
        return {
          top: rectangle.top + document.body.scrollTop,
          left: rectangle.left + document.body.scrollLeft
        };
      }

      //---------------------------------------------------------------------------------------------------------
      /* see http://youmightnotneedjquery.com/#get_width */
      get_width(element) {
        return this.get_numeric_style_value(element, 'width');
      }

      get_height(element) {
        return this.get_numeric_style_value(element, 'height');
      }

      //=========================================================================================================
      // EVENTS
      //---------------------------------------------------------------------------------------------------------
      on(element, name, handler) {
        /* TAINT add options */
        /* see http://youmightnotneedjquery.com/#on, http://youmightnotneedjquery.com/#delegate */
        /* Also note the addition of a `passive: false` parameter (as in `html_dom.addEventListener 'wheel', f,
           { passive: false, }`); see https://stackoverflow.com/a/55461632/256361; apparently it is a recently
           introduced feature of browser event processing; see also [JQuery issue #2871 *Add support for passive
           event listeners*](https://github.com/jquery/jquery/issues/2871), open as of Dec 2020 */
        validate.delement(element);
        validate.nonempty_text(name);
        validate.function(handler);
        return element.addEventListener(name, handler, false);
      }

      //---------------------------------------------------------------------------------------------------------
      emit_custom_event(name, options) {
        // thx to https://www.javascripttutorial.net/javascript-dom/javascript-custom-events/
        /* Acc. to https://developer.mozilla.org/en-US/docs/Web/API/Event/Event,
           https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent, allowable fields for `options`
           include `bubbles`, `cancelable`, `composed`, `detail`; the last one may contain arbitrary data and can
           be retrieved as `event.detail`. */
        validate.nonempty_text(name);
        return document.dispatchEvent(new CustomEvent(name, options));
      }

      //=========================================================================================================
      // DRAGGABLES
      //---------------------------------------------------------------------------------------------------------
      make_draggable(element) {
        var id, on_drag_start, on_drop;
        /* thx to http://jsfiddle.net/robertc/kKuqH/
           https://stackoverflow.com/a/6239882/7568091 */
        this._attach_dragover();
        this._prv_draggable_id++;
        id = this._prv_draggable_id;
        this.set(element, 'draggable', true);
        //.......................................................................................................
        this.on(element, 'dragstart', on_drag_start = function(event) {
          var style, x, y;
          style = µ.DOM.get_live_styles(event.target);
          x = (parseInt(style.left, 10)) - event.clientX;
          y = (parseInt(style.top, 10)) - event.clientY;
          return event.dataTransfer.setData('application/json', JSON.stringify({x, y, id}));
        });
        //.......................................................................................................
        this.on(document.body, 'drop', on_drop = function(event) {
          var left, top, transfer;
          transfer = JSON.parse(event.dataTransfer.getData('application/json'));
          if (id !== transfer.id) {
            return;
          }
          left = event.clientX + transfer.x + 'px';
          top = event.clientY + transfer.y + 'px';
          µ.DOM.set_style_rule(element, 'left', left);
          µ.DOM.set_style_rule(element, 'top', top);
          event.preventDefault();
          return false;
        });
        //.......................................................................................................
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _attach_dragover() {
        var on_dragover;
        /* TAINT Apparently need for correct dragging behavior, but what if we wanted to handle this event? */
        this.on(document.body, 'dragover', on_dragover = function(event) {
          event.preventDefault();
          return false;
        });
        this._attach_dragover = function() {};
        return null;
      }

    };

    //.........................................................................................................
    Dom.prototype._prv_draggable_id = 0;

    return Dom;

  }).call(this);

  //===========================================================================================================
  // MAGIC
  //-----------------------------------------------------------------------------------------------------------
  this._magic = Symbol.for('µDOM');

  this.TEXT = new Text();

  this.DOM = new Dom();

  this.LINEFINDER = require('./linefinder');

  this.KB = new (require('./kb')).Kb();

  // module.exports.rpr     ?= module.exports.µ.TEXT.rpr.bind( µ.TEXT )
// module.exports.log     ?= module.exports.µ.TEXT.log.bind( µ.TEXT )
/*

https://stackoverflow.com/a/117988/7568091

innerHTML is remarkably fast, and in many cases you will get the best results just setting that (I would
just use append).

However, if there is much already in "mydiv" then you are forcing the browser to parse and render all of
that content again (everything that was there before, plus all of your new content). You can avoid this by
appending a document fragment onto "mydiv" instead:

var frag = document.createDocumentFragment();
frag.innerHTML = html;
$("#mydiv").append(frag);
In this way, only your new content gets parsed (unavoidable) and the existing content does not.

EDIT: My bad... I've discovered that innerHTML isn't well supported on document fragments. You can use the
same technique with any node type. For your example, you could create the root table node and insert the
innerHTML into that:

var frag = document.createElement('table');
frag.innerHTML = tableInnerHtml;
$("#mydiv").append(frag);

*/

}).call(this);


},{"../loupe.js":33,"./kb":30,"./linefinder":31,"./types":32}]},{},[])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy5sb2NhbC9zaGFyZS9wbnBtL2dsb2JhbC81Ly5wbnBtL2Jyb3dzZXItcGFja0A2LjEuMC9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiLi4vLi4vLmxvY2FsL3NoYXJlL3BucG0vZ2xvYmFsLzUvLnBucG0vYXZhaWxhYmxlLXR5cGVkLWFycmF5c0AxLjAuNS8ubG9jYWwvc2hhcmUvcG5wbS9nbG9iYWwvNS8ucG5wbS93aGljaC10eXBlZC1hcnJheUAxLjEuMTEvbm9kZV9tb2R1bGVzL2F2YWlsYWJsZS10eXBlZC1hcnJheXMvaW5kZXguanMiLCIuLi8uLi8ubG9jYWwvc2hhcmUvcG5wbS9nbG9iYWwvNS8ucG5wbS9iYXNlNjQtanNAMS41LjEvbm9kZV9tb2R1bGVzL2Jhc2U2NC1qcy9pbmRleC5qcyIsIi4uLy4uLy5sb2NhbC9zaGFyZS9wbnBtL2dsb2JhbC81Ly5wbnBtL2Jyb3dzZXJpZnlAMTcuMC4wL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L2xpYi9fZW1wdHkuanMiLCIuLi8uLi8ubG9jYWwvc2hhcmUvcG5wbS9nbG9iYWwvNS8ucG5wbS9idWZmZXJANS4yLjEvbm9kZV9tb2R1bGVzL2J1ZmZlci9pbmRleC5qcyIsIi4uLy4uLy5sb2NhbC9zaGFyZS9wbnBtL2dsb2JhbC81Ly5wbnBtL2NhbGwtYmluZEAxLjAuMi9ub2RlX21vZHVsZXMvY2FsbC1iaW5kL2NhbGxCb3VuZC5qcyIsIi4uLy4uLy5sb2NhbC9zaGFyZS9wbnBtL2dsb2JhbC81Ly5wbnBtL2NhbGwtYmluZEAxLjAuMi9ub2RlX21vZHVsZXMvY2FsbC1iaW5kL2luZGV4LmpzIiwiLi4vLi4vLmxvY2FsL3NoYXJlL3BucG0vZ2xvYmFsLzUvLnBucG0vZm9yLWVhY2hAMC4zLjMvbm9kZV9tb2R1bGVzL2Zvci1lYWNoL2luZGV4LmpzIiwiLi4vLi4vLmxvY2FsL3NoYXJlL3BucG0vZ2xvYmFsLzUvLnBucG0vZnVuY3Rpb24tYmluZEAxLjEuMS9ub2RlX21vZHVsZXMvZnVuY3Rpb24tYmluZC9pbXBsZW1lbnRhdGlvbi5qcyIsIi4uLy4uLy5sb2NhbC9zaGFyZS9wbnBtL2dsb2JhbC81Ly5wbnBtL2Z1bmN0aW9uLWJpbmRAMS4xLjEvbm9kZV9tb2R1bGVzL2Z1bmN0aW9uLWJpbmQvaW5kZXguanMiLCIuLi8uLi8ubG9jYWwvc2hhcmUvcG5wbS9nbG9iYWwvNS8ucG5wbS9nZXQtaW50cmluc2ljQDEuMi4wL25vZGVfbW9kdWxlcy9nZXQtaW50cmluc2ljL2luZGV4LmpzIiwiLi4vLi4vLmxvY2FsL3NoYXJlL3BucG0vZ2xvYmFsLzUvLnBucG0vZ29wZEAxLjAuMS9ub2RlX21vZHVsZXMvZ29wZC9pbmRleC5qcyIsIi4uLy4uLy5sb2NhbC9zaGFyZS9wbnBtL2dsb2JhbC81Ly5wbnBtL2hhcy1zeW1ib2xzQDEuMC4zL25vZGVfbW9kdWxlcy9oYXMtc3ltYm9scy9pbmRleC5qcyIsIi4uLy4uLy5sb2NhbC9zaGFyZS9wbnBtL2dsb2JhbC81Ly5wbnBtL2hhcy1zeW1ib2xzQDEuMC4zL25vZGVfbW9kdWxlcy9oYXMtc3ltYm9scy9zaGFtcy5qcyIsIi4uLy4uLy5sb2NhbC9zaGFyZS9wbnBtL2dsb2JhbC81Ly5wbnBtL2hhcy10b3N0cmluZ3RhZ0AxLjAuMC9ub2RlX21vZHVsZXMvaGFzLXRvc3RyaW5ndGFnL3NoYW1zLmpzIiwiLi4vLi4vLmxvY2FsL3NoYXJlL3BucG0vZ2xvYmFsLzUvLnBucG0vaGFzQDEuMC4zL25vZGVfbW9kdWxlcy9oYXMvc3JjL2luZGV4LmpzIiwiLi4vLi4vLmxvY2FsL3NoYXJlL3BucG0vZ2xvYmFsLzUvLnBucG0vaWVlZTc1NEAxLjIuMS9ub2RlX21vZHVsZXMvaWVlZTc1NC9pbmRleC5qcyIsIi4uLy4uLy5sb2NhbC9zaGFyZS9wbnBtL2dsb2JhbC81Ly5wbnBtL2luaGVyaXRzQDIuMC40L25vZGVfbW9kdWxlcy9pbmhlcml0cy9pbmhlcml0c19icm93c2VyLmpzIiwiLi4vLi4vLmxvY2FsL3NoYXJlL3BucG0vZ2xvYmFsLzUvLnBucG0vaXMtYXJndW1lbnRzQDEuMS4xL25vZGVfbW9kdWxlcy9pcy1hcmd1bWVudHMvaW5kZXguanMiLCIuLi8uLi8ubG9jYWwvc2hhcmUvcG5wbS9nbG9iYWwvNS8ucG5wbS9pcy1idWZmZXJAMS4xLjYvbm9kZV9tb2R1bGVzL2lzLWJ1ZmZlci9pbmRleC5qcyIsIi4uLy4uLy5sb2NhbC9zaGFyZS9wbnBtL2dsb2JhbC81Ly5wbnBtL2lzLWNhbGxhYmxlQDEuMi43L25vZGVfbW9kdWxlcy9pcy1jYWxsYWJsZS9pbmRleC5qcyIsIi4uLy4uLy5sb2NhbC9zaGFyZS9wbnBtL2dsb2JhbC81Ly5wbnBtL2lzLWdlbmVyYXRvci1mdW5jdGlvbkAxLjAuMTAvbm9kZV9tb2R1bGVzL2lzLWdlbmVyYXRvci1mdW5jdGlvbi9pbmRleC5qcyIsIi4uLy4uLy5sb2NhbC9zaGFyZS9wbnBtL2dsb2JhbC81Ly5wbnBtL2lzLXR5cGVkLWFycmF5QDEuMS4xMi9ub2RlX21vZHVsZXMvaXMtdHlwZWQtYXJyYXkvaW5kZXguanMiLCIuLi8uLi8ubG9jYWwvc2hhcmUvcG5wbS9nbG9iYWwvNS8ucG5wbS9wYXRoLWJyb3dzZXJpZnlAMS4wLjEvbm9kZV9tb2R1bGVzL3BhdGgtYnJvd3NlcmlmeS9pbmRleC5qcyIsIi4uLy4uLy5sb2NhbC9zaGFyZS9wbnBtL2dsb2JhbC81Ly5wbnBtL3Byb2Nlc3NAMC4xMS4xMC9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiLi4vLi4vLmxvY2FsL3NoYXJlL3BucG0vZ2xvYmFsLzUvLnBucG0vdXRpbEAwLjEyLjUvbm9kZV9tb2R1bGVzL3V0aWwvc3VwcG9ydC9pc0J1ZmZlckJyb3dzZXIuanMiLCIuLi8uLi8ubG9jYWwvc2hhcmUvcG5wbS9nbG9iYWwvNS8ucG5wbS91dGlsQDAuMTIuNS9ub2RlX21vZHVsZXMvdXRpbC9zdXBwb3J0L3R5cGVzLmpzIiwiLi4vLi4vLmxvY2FsL3NoYXJlL3BucG0vZ2xvYmFsLzUvLnBucG0vdXRpbEAwLjEyLjUvbm9kZV9tb2R1bGVzL3V0aWwvdXRpbC5qcyIsIi4uLy4uLy5sb2NhbC9zaGFyZS9wbnBtL2dsb2JhbC81Ly5wbnBtL3doaWNoLXR5cGVkLWFycmF5QDEuMS4xMS8ubG9jYWwvc2hhcmUvcG5wbS9nbG9iYWwvNS8ucG5wbS91dGlsQDAuMTIuNS9ub2RlX21vZHVsZXMvd2hpY2gtdHlwZWQtYXJyYXkvaW5kZXguanMiLCIuLi9tdWRvbS9kZXBzL3RyYXZlcnNlX3V0aWwuanMiLCIuLi9tdWRvbS9saWIva2IuanMiLCIuLi9tdWRvbS9saWIvbGluZWZpbmRlci5qcyIsIi4uL211ZG9tL2xpYi90eXBlcy5qcyIsIi4uL211ZG9tL2xvdXBlLmpzIiwiLi4vbXVkb20vbm9kZV9tb2R1bGVzLy5wbnBtL2ludGVydHlwZUA3LjcuMS9ub2RlX21vZHVsZXMvaW50ZXJ0eXBlL2RlcHMvamtyb3NvLWVxdWFscy5qcyIsIi4uL211ZG9tL25vZGVfbW9kdWxlcy8ucG5wbS9pbnRlcnR5cGVANy43LjEvbm9kZV9tb2R1bGVzL2ludGVydHlwZS9kZXBzL2prcm9zby10eXBlLmpzIiwiLi4vbXVkb20vbm9kZV9tb2R1bGVzLy5wbnBtL2ludGVydHlwZUA3LjcuMS9ub2RlX21vZHVsZXMvaW50ZXJ0eXBlL2RlcHMvbG91cGUuanMiLCIuLi9tdWRvbS9ub2RlX21vZHVsZXMvLnBucG0vaW50ZXJ0eXBlQDcuNy4xL25vZGVfbW9kdWxlcy9pbnRlcnR5cGUvbGliL2NoZWNrcy5qcyIsIi4uL211ZG9tL25vZGVfbW9kdWxlcy8ucG5wbS9pbnRlcnR5cGVANy43LjEvbm9kZV9tb2R1bGVzL2ludGVydHlwZS9saWIvZGVjbGFyYXRpb25zLmpzIiwiLi4vbXVkb20vbm9kZV9tb2R1bGVzLy5wbnBtL2ludGVydHlwZUA3LjcuMS9ub2RlX21vZHVsZXMvaW50ZXJ0eXBlL2xpYi9kZWNsYXJpbmcuanMiLCIuLi9tdWRvbS9ub2RlX21vZHVsZXMvLnBucG0vaW50ZXJ0eXBlQDcuNy4xL25vZGVfbW9kdWxlcy9pbnRlcnR5cGUvbGliL2hlbHBlcnMuanMiLCIuLi9tdWRvbS9ub2RlX21vZHVsZXMvLnBucG0vaW50ZXJ0eXBlQDcuNy4xL25vZGVfbW9kdWxlcy9pbnRlcnR5cGUvbGliL21haW4uanMiLCIuLi9tdWRvbS9ub2RlX21vZHVsZXMvLnBucG0vaW50ZXJ0eXBlQDcuNy4xL25vZGVfbW9kdWxlcy9pbnRlcnR5cGUvbGliL3NpemluZy5qcyIsIi4uL211ZG9tL25vZGVfbW9kdWxlcy8ucG5wbS9tdWx0aW1peEA1LjAuMC9ub2RlX21vZHVsZXMvbXVsdGltaXgvbGliL2NhdGFsb2d1aW5nLmpzIiwiLi4vbXVkb20vbm9kZV9tb2R1bGVzLy5wbnBtL211bHRpbWl4QDUuMC4wL25vZGVfbW9kdWxlcy9tdWx0aW1peC9saWIvbWFpbi5qcyIsIm11ZG9tIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RKQTs7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2p2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDamhCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDOVVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDM3NCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzkyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeGlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzFxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzVxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3JtQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMxUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgcG9zc2libGVOYW1lcyA9IFtcblx0J0JpZ0ludDY0QXJyYXknLFxuXHQnQmlnVWludDY0QXJyYXknLFxuXHQnRmxvYXQzMkFycmF5Jyxcblx0J0Zsb2F0NjRBcnJheScsXG5cdCdJbnQxNkFycmF5Jyxcblx0J0ludDMyQXJyYXknLFxuXHQnSW50OEFycmF5Jyxcblx0J1VpbnQxNkFycmF5Jyxcblx0J1VpbnQzMkFycmF5Jyxcblx0J1VpbnQ4QXJyYXknLFxuXHQnVWludDhDbGFtcGVkQXJyYXknXG5dO1xuXG52YXIgZyA9IHR5cGVvZiBnbG9iYWxUaGlzID09PSAndW5kZWZpbmVkJyA/IGdsb2JhbCA6IGdsb2JhbFRoaXM7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gYXZhaWxhYmxlVHlwZWRBcnJheXMoKSB7XG5cdHZhciBvdXQgPSBbXTtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBwb3NzaWJsZU5hbWVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0aWYgKHR5cGVvZiBnW3Bvc3NpYmxlTmFtZXNbaV1dID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRvdXRbb3V0Lmxlbmd0aF0gPSBwb3NzaWJsZU5hbWVzW2ldO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gb3V0O1xufTtcbiIsIid1c2Ugc3RyaWN0J1xuXG5leHBvcnRzLmJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoXG5leHBvcnRzLnRvQnl0ZUFycmF5ID0gdG9CeXRlQXJyYXlcbmV4cG9ydHMuZnJvbUJ5dGVBcnJheSA9IGZyb21CeXRlQXJyYXlcblxudmFyIGxvb2t1cCA9IFtdXG52YXIgcmV2TG9va3VwID0gW11cbnZhciBBcnIgPSB0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcgPyBVaW50OEFycmF5IDogQXJyYXlcblxudmFyIGNvZGUgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLydcbmZvciAodmFyIGkgPSAwLCBsZW4gPSBjb2RlLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gIGxvb2t1cFtpXSA9IGNvZGVbaV1cbiAgcmV2TG9va3VwW2NvZGUuY2hhckNvZGVBdChpKV0gPSBpXG59XG5cbi8vIFN1cHBvcnQgZGVjb2RpbmcgVVJMLXNhZmUgYmFzZTY0IHN0cmluZ3MsIGFzIE5vZGUuanMgZG9lcy5cbi8vIFNlZTogaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQmFzZTY0I1VSTF9hcHBsaWNhdGlvbnNcbnJldkxvb2t1cFsnLScuY2hhckNvZGVBdCgwKV0gPSA2MlxucmV2TG9va3VwWydfJy5jaGFyQ29kZUF0KDApXSA9IDYzXG5cbmZ1bmN0aW9uIGdldExlbnMgKGI2NCkge1xuICB2YXIgbGVuID0gYjY0Lmxlbmd0aFxuXG4gIGlmIChsZW4gJSA0ID4gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzdHJpbmcuIExlbmd0aCBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNCcpXG4gIH1cblxuICAvLyBUcmltIG9mZiBleHRyYSBieXRlcyBhZnRlciBwbGFjZWhvbGRlciBieXRlcyBhcmUgZm91bmRcbiAgLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vYmVhdGdhbW1pdC9iYXNlNjQtanMvaXNzdWVzLzQyXG4gIHZhciB2YWxpZExlbiA9IGI2NC5pbmRleE9mKCc9JylcbiAgaWYgKHZhbGlkTGVuID09PSAtMSkgdmFsaWRMZW4gPSBsZW5cblxuICB2YXIgcGxhY2VIb2xkZXJzTGVuID0gdmFsaWRMZW4gPT09IGxlblxuICAgID8gMFxuICAgIDogNCAtICh2YWxpZExlbiAlIDQpXG5cbiAgcmV0dXJuIFt2YWxpZExlbiwgcGxhY2VIb2xkZXJzTGVuXVxufVxuXG4vLyBiYXNlNjQgaXMgNC8zICsgdXAgdG8gdHdvIGNoYXJhY3RlcnMgb2YgdGhlIG9yaWdpbmFsIGRhdGFcbmZ1bmN0aW9uIGJ5dGVMZW5ndGggKGI2NCkge1xuICB2YXIgbGVucyA9IGdldExlbnMoYjY0KVxuICB2YXIgdmFsaWRMZW4gPSBsZW5zWzBdXG4gIHZhciBwbGFjZUhvbGRlcnNMZW4gPSBsZW5zWzFdXG4gIHJldHVybiAoKHZhbGlkTGVuICsgcGxhY2VIb2xkZXJzTGVuKSAqIDMgLyA0KSAtIHBsYWNlSG9sZGVyc0xlblxufVxuXG5mdW5jdGlvbiBfYnl0ZUxlbmd0aCAoYjY0LCB2YWxpZExlbiwgcGxhY2VIb2xkZXJzTGVuKSB7XG4gIHJldHVybiAoKHZhbGlkTGVuICsgcGxhY2VIb2xkZXJzTGVuKSAqIDMgLyA0KSAtIHBsYWNlSG9sZGVyc0xlblxufVxuXG5mdW5jdGlvbiB0b0J5dGVBcnJheSAoYjY0KSB7XG4gIHZhciB0bXBcbiAgdmFyIGxlbnMgPSBnZXRMZW5zKGI2NClcbiAgdmFyIHZhbGlkTGVuID0gbGVuc1swXVxuICB2YXIgcGxhY2VIb2xkZXJzTGVuID0gbGVuc1sxXVxuXG4gIHZhciBhcnIgPSBuZXcgQXJyKF9ieXRlTGVuZ3RoKGI2NCwgdmFsaWRMZW4sIHBsYWNlSG9sZGVyc0xlbikpXG5cbiAgdmFyIGN1ckJ5dGUgPSAwXG5cbiAgLy8gaWYgdGhlcmUgYXJlIHBsYWNlaG9sZGVycywgb25seSBnZXQgdXAgdG8gdGhlIGxhc3QgY29tcGxldGUgNCBjaGFyc1xuICB2YXIgbGVuID0gcGxhY2VIb2xkZXJzTGVuID4gMFxuICAgID8gdmFsaWRMZW4gLSA0XG4gICAgOiB2YWxpZExlblxuXG4gIHZhciBpXG4gIGZvciAoaSA9IDA7IGkgPCBsZW47IGkgKz0gNCkge1xuICAgIHRtcCA9XG4gICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkpXSA8PCAxOCkgfFxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldIDw8IDEyKSB8XG4gICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAyKV0gPDwgNikgfFxuICAgICAgcmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAzKV1cbiAgICBhcnJbY3VyQnl0ZSsrXSA9ICh0bXAgPj4gMTYpICYgMHhGRlxuICAgIGFycltjdXJCeXRlKytdID0gKHRtcCA+PiA4KSAmIDB4RkZcbiAgICBhcnJbY3VyQnl0ZSsrXSA9IHRtcCAmIDB4RkZcbiAgfVxuXG4gIGlmIChwbGFjZUhvbGRlcnNMZW4gPT09IDIpIHtcbiAgICB0bXAgPVxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMikgfFxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldID4+IDQpXG4gICAgYXJyW2N1ckJ5dGUrK10gPSB0bXAgJiAweEZGXG4gIH1cblxuICBpZiAocGxhY2VIb2xkZXJzTGVuID09PSAxKSB7XG4gICAgdG1wID1cbiAgICAgIChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDEwKSB8XG4gICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPDwgNCkgfFxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMildID4+IDIpXG4gICAgYXJyW2N1ckJ5dGUrK10gPSAodG1wID4+IDgpICYgMHhGRlxuICAgIGFycltjdXJCeXRlKytdID0gdG1wICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIGFyclxufVxuXG5mdW5jdGlvbiB0cmlwbGV0VG9CYXNlNjQgKG51bSkge1xuICByZXR1cm4gbG9va3VwW251bSA+PiAxOCAmIDB4M0ZdICtcbiAgICBsb29rdXBbbnVtID4+IDEyICYgMHgzRl0gK1xuICAgIGxvb2t1cFtudW0gPj4gNiAmIDB4M0ZdICtcbiAgICBsb29rdXBbbnVtICYgMHgzRl1cbn1cblxuZnVuY3Rpb24gZW5jb2RlQ2h1bmsgKHVpbnQ4LCBzdGFydCwgZW5kKSB7XG4gIHZhciB0bXBcbiAgdmFyIG91dHB1dCA9IFtdXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSArPSAzKSB7XG4gICAgdG1wID1cbiAgICAgICgodWludDhbaV0gPDwgMTYpICYgMHhGRjAwMDApICtcbiAgICAgICgodWludDhbaSArIDFdIDw8IDgpICYgMHhGRjAwKSArXG4gICAgICAodWludDhbaSArIDJdICYgMHhGRilcbiAgICBvdXRwdXQucHVzaCh0cmlwbGV0VG9CYXNlNjQodG1wKSlcbiAgfVxuICByZXR1cm4gb3V0cHV0LmpvaW4oJycpXG59XG5cbmZ1bmN0aW9uIGZyb21CeXRlQXJyYXkgKHVpbnQ4KSB7XG4gIHZhciB0bXBcbiAgdmFyIGxlbiA9IHVpbnQ4Lmxlbmd0aFxuICB2YXIgZXh0cmFCeXRlcyA9IGxlbiAlIDMgLy8gaWYgd2UgaGF2ZSAxIGJ5dGUgbGVmdCwgcGFkIDIgYnl0ZXNcbiAgdmFyIHBhcnRzID0gW11cbiAgdmFyIG1heENodW5rTGVuZ3RoID0gMTYzODMgLy8gbXVzdCBiZSBtdWx0aXBsZSBvZiAzXG5cbiAgLy8gZ28gdGhyb3VnaCB0aGUgYXJyYXkgZXZlcnkgdGhyZWUgYnl0ZXMsIHdlJ2xsIGRlYWwgd2l0aCB0cmFpbGluZyBzdHVmZiBsYXRlclxuICBmb3IgKHZhciBpID0gMCwgbGVuMiA9IGxlbiAtIGV4dHJhQnl0ZXM7IGkgPCBsZW4yOyBpICs9IG1heENodW5rTGVuZ3RoKSB7XG4gICAgcGFydHMucHVzaChlbmNvZGVDaHVuayh1aW50OCwgaSwgKGkgKyBtYXhDaHVua0xlbmd0aCkgPiBsZW4yID8gbGVuMiA6IChpICsgbWF4Q2h1bmtMZW5ndGgpKSlcbiAgfVxuXG4gIC8vIHBhZCB0aGUgZW5kIHdpdGggemVyb3MsIGJ1dCBtYWtlIHN1cmUgdG8gbm90IGZvcmdldCB0aGUgZXh0cmEgYnl0ZXNcbiAgaWYgKGV4dHJhQnl0ZXMgPT09IDEpIHtcbiAgICB0bXAgPSB1aW50OFtsZW4gLSAxXVxuICAgIHBhcnRzLnB1c2goXG4gICAgICBsb29rdXBbdG1wID4+IDJdICtcbiAgICAgIGxvb2t1cFsodG1wIDw8IDQpICYgMHgzRl0gK1xuICAgICAgJz09J1xuICAgIClcbiAgfSBlbHNlIGlmIChleHRyYUJ5dGVzID09PSAyKSB7XG4gICAgdG1wID0gKHVpbnQ4W2xlbiAtIDJdIDw8IDgpICsgdWludDhbbGVuIC0gMV1cbiAgICBwYXJ0cy5wdXNoKFxuICAgICAgbG9va3VwW3RtcCA+PiAxMF0gK1xuICAgICAgbG9va3VwWyh0bXAgPj4gNCkgJiAweDNGXSArXG4gICAgICBsb29rdXBbKHRtcCA8PCAyKSAmIDB4M0ZdICtcbiAgICAgICc9J1xuICAgIClcbiAgfVxuXG4gIHJldHVybiBwYXJ0cy5qb2luKCcnKVxufVxuIiwiIiwiLyohXG4gKiBUaGUgYnVmZmVyIG1vZHVsZSBmcm9tIG5vZGUuanMsIGZvciB0aGUgYnJvd3Nlci5cbiAqXG4gKiBAYXV0aG9yICAgRmVyb3NzIEFib3VraGFkaWplaCA8aHR0cHM6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG4vKiBlc2xpbnQtZGlzYWJsZSBuby1wcm90byAqL1xuXG4ndXNlIHN0cmljdCdcblxudmFyIGJhc2U2NCA9IHJlcXVpcmUoJ2Jhc2U2NC1qcycpXG52YXIgaWVlZTc1NCA9IHJlcXVpcmUoJ2llZWU3NTQnKVxuXG5leHBvcnRzLkJ1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5TbG93QnVmZmVyID0gU2xvd0J1ZmZlclxuZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFUyA9IDUwXG5cbnZhciBLX01BWF9MRU5HVEggPSAweDdmZmZmZmZmXG5leHBvcnRzLmtNYXhMZW5ndGggPSBLX01BWF9MRU5HVEhcblxuLyoqXG4gKiBJZiBgQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRgOlxuICogICA9PT0gdHJ1ZSAgICBVc2UgVWludDhBcnJheSBpbXBsZW1lbnRhdGlvbiAoZmFzdGVzdClcbiAqICAgPT09IGZhbHNlICAgUHJpbnQgd2FybmluZyBhbmQgcmVjb21tZW5kIHVzaW5nIGBidWZmZXJgIHY0Lnggd2hpY2ggaGFzIGFuIE9iamVjdFxuICogICAgICAgICAgICAgICBpbXBsZW1lbnRhdGlvbiAobW9zdCBjb21wYXRpYmxlLCBldmVuIElFNilcbiAqXG4gKiBCcm93c2VycyB0aGF0IHN1cHBvcnQgdHlwZWQgYXJyYXlzIGFyZSBJRSAxMCssIEZpcmVmb3ggNCssIENocm9tZSA3KywgU2FmYXJpIDUuMSssXG4gKiBPcGVyYSAxMS42KywgaU9TIDQuMisuXG4gKlxuICogV2UgcmVwb3J0IHRoYXQgdGhlIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCB0eXBlZCBhcnJheXMgaWYgdGhlIGFyZSBub3Qgc3ViY2xhc3NhYmxlXG4gKiB1c2luZyBfX3Byb3RvX18uIEZpcmVmb3ggNC0yOSBsYWNrcyBzdXBwb3J0IGZvciBhZGRpbmcgbmV3IHByb3BlcnRpZXMgdG8gYFVpbnQ4QXJyYXlgXG4gKiAoU2VlOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02OTU0MzgpLiBJRSAxMCBsYWNrcyBzdXBwb3J0XG4gKiBmb3IgX19wcm90b19fIGFuZCBoYXMgYSBidWdneSB0eXBlZCBhcnJheSBpbXBsZW1lbnRhdGlvbi5cbiAqL1xuQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgPSB0eXBlZEFycmF5U3VwcG9ydCgpXG5cbmlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgJiYgdHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmXG4gICAgdHlwZW9mIGNvbnNvbGUuZXJyb3IgPT09ICdmdW5jdGlvbicpIHtcbiAgY29uc29sZS5lcnJvcihcbiAgICAnVGhpcyBicm93c2VyIGxhY2tzIHR5cGVkIGFycmF5IChVaW50OEFycmF5KSBzdXBwb3J0IHdoaWNoIGlzIHJlcXVpcmVkIGJ5ICcgK1xuICAgICdgYnVmZmVyYCB2NS54LiBVc2UgYGJ1ZmZlcmAgdjQueCBpZiB5b3UgcmVxdWlyZSBvbGQgYnJvd3NlciBzdXBwb3J0LidcbiAgKVxufVxuXG5mdW5jdGlvbiB0eXBlZEFycmF5U3VwcG9ydCAoKSB7XG4gIC8vIENhbiB0eXBlZCBhcnJheSBpbnN0YW5jZXMgY2FuIGJlIGF1Z21lbnRlZD9cbiAgdHJ5IHtcbiAgICB2YXIgYXJyID0gbmV3IFVpbnQ4QXJyYXkoMSlcbiAgICBhcnIuX19wcm90b19fID0geyBfX3Byb3RvX186IFVpbnQ4QXJyYXkucHJvdG90eXBlLCBmb286IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDQyIH0gfVxuICAgIHJldHVybiBhcnIuZm9vKCkgPT09IDQyXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyLnByb3RvdHlwZSwgJ3BhcmVudCcsIHtcbiAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCFCdWZmZXIuaXNCdWZmZXIodGhpcykpIHJldHVybiB1bmRlZmluZWRcbiAgICByZXR1cm4gdGhpcy5idWZmZXJcbiAgfVxufSlcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlci5wcm90b3R5cGUsICdvZmZzZXQnLCB7XG4gIGVudW1lcmFibGU6IHRydWUsXG4gIGdldDogZnVuY3Rpb24gKCkge1xuICAgIGlmICghQnVmZmVyLmlzQnVmZmVyKHRoaXMpKSByZXR1cm4gdW5kZWZpbmVkXG4gICAgcmV0dXJuIHRoaXMuYnl0ZU9mZnNldFxuICB9XG59KVxuXG5mdW5jdGlvbiBjcmVhdGVCdWZmZXIgKGxlbmd0aCkge1xuICBpZiAobGVuZ3RoID4gS19NQVhfTEVOR1RIKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RoZSB2YWx1ZSBcIicgKyBsZW5ndGggKyAnXCIgaXMgaW52YWxpZCBmb3Igb3B0aW9uIFwic2l6ZVwiJylcbiAgfVxuICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICB2YXIgYnVmID0gbmV3IFVpbnQ4QXJyYXkobGVuZ3RoKVxuICBidWYuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICByZXR1cm4gYnVmXG59XG5cbi8qKlxuICogVGhlIEJ1ZmZlciBjb25zdHJ1Y3RvciByZXR1cm5zIGluc3RhbmNlcyBvZiBgVWludDhBcnJheWAgdGhhdCBoYXZlIHRoZWlyXG4gKiBwcm90b3R5cGUgY2hhbmdlZCB0byBgQnVmZmVyLnByb3RvdHlwZWAuIEZ1cnRoZXJtb3JlLCBgQnVmZmVyYCBpcyBhIHN1YmNsYXNzIG9mXG4gKiBgVWludDhBcnJheWAsIHNvIHRoZSByZXR1cm5lZCBpbnN0YW5jZXMgd2lsbCBoYXZlIGFsbCB0aGUgbm9kZSBgQnVmZmVyYCBtZXRob2RzXG4gKiBhbmQgdGhlIGBVaW50OEFycmF5YCBtZXRob2RzLiBTcXVhcmUgYnJhY2tldCBub3RhdGlvbiB3b3JrcyBhcyBleHBlY3RlZCAtLSBpdFxuICogcmV0dXJucyBhIHNpbmdsZSBvY3RldC5cbiAqXG4gKiBUaGUgYFVpbnQ4QXJyYXlgIHByb3RvdHlwZSByZW1haW5zIHVubW9kaWZpZWQuXG4gKi9cblxuZnVuY3Rpb24gQnVmZmVyIChhcmcsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICAvLyBDb21tb24gY2FzZS5cbiAgaWYgKHR5cGVvZiBhcmcgPT09ICdudW1iZXInKSB7XG4gICAgaWYgKHR5cGVvZiBlbmNvZGluZ09yT2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgJ1RoZSBcInN0cmluZ1wiIGFyZ3VtZW50IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuIFJlY2VpdmVkIHR5cGUgbnVtYmVyJ1xuICAgICAgKVxuICAgIH1cbiAgICByZXR1cm4gYWxsb2NVbnNhZmUoYXJnKVxuICB9XG4gIHJldHVybiBmcm9tKGFyZywgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxufVxuXG4vLyBGaXggc3ViYXJyYXkoKSBpbiBFUzIwMTYuIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvcHVsbC85N1xuaWYgKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC5zcGVjaWVzICE9IG51bGwgJiZcbiAgICBCdWZmZXJbU3ltYm9sLnNwZWNpZXNdID09PSBCdWZmZXIpIHtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlciwgU3ltYm9sLnNwZWNpZXMsIHtcbiAgICB2YWx1ZTogbnVsbCxcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgd3JpdGFibGU6IGZhbHNlXG4gIH0pXG59XG5cbkJ1ZmZlci5wb29sU2l6ZSA9IDgxOTIgLy8gbm90IHVzZWQgYnkgdGhpcyBpbXBsZW1lbnRhdGlvblxuXG5mdW5jdGlvbiBmcm9tICh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKSB7XG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIGZyb21TdHJpbmcodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQpXG4gIH1cblxuICBpZiAoQXJyYXlCdWZmZXIuaXNWaWV3KHZhbHVlKSkge1xuICAgIHJldHVybiBmcm9tQXJyYXlMaWtlKHZhbHVlKVxuICB9XG5cbiAgaWYgKHZhbHVlID09IG51bGwpIHtcbiAgICB0aHJvdyBUeXBlRXJyb3IoXG4gICAgICAnVGhlIGZpcnN0IGFyZ3VtZW50IG11c3QgYmUgb25lIG9mIHR5cGUgc3RyaW5nLCBCdWZmZXIsIEFycmF5QnVmZmVyLCBBcnJheSwgJyArXG4gICAgICAnb3IgQXJyYXktbGlrZSBPYmplY3QuIFJlY2VpdmVkIHR5cGUgJyArICh0eXBlb2YgdmFsdWUpXG4gICAgKVxuICB9XG5cbiAgaWYgKGlzSW5zdGFuY2UodmFsdWUsIEFycmF5QnVmZmVyKSB8fFxuICAgICAgKHZhbHVlICYmIGlzSW5zdGFuY2UodmFsdWUuYnVmZmVyLCBBcnJheUJ1ZmZlcikpKSB7XG4gICAgcmV0dXJuIGZyb21BcnJheUJ1ZmZlcih2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxuICB9XG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgJ1RoZSBcInZhbHVlXCIgYXJndW1lbnQgbXVzdCBub3QgYmUgb2YgdHlwZSBudW1iZXIuIFJlY2VpdmVkIHR5cGUgbnVtYmVyJ1xuICAgIClcbiAgfVxuXG4gIHZhciB2YWx1ZU9mID0gdmFsdWUudmFsdWVPZiAmJiB2YWx1ZS52YWx1ZU9mKClcbiAgaWYgKHZhbHVlT2YgIT0gbnVsbCAmJiB2YWx1ZU9mICE9PSB2YWx1ZSkge1xuICAgIHJldHVybiBCdWZmZXIuZnJvbSh2YWx1ZU9mLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG4gIH1cblxuICB2YXIgYiA9IGZyb21PYmplY3QodmFsdWUpXG4gIGlmIChiKSByZXR1cm4gYlxuXG4gIGlmICh0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9QcmltaXRpdmUgIT0gbnVsbCAmJlxuICAgICAgdHlwZW9mIHZhbHVlW1N5bWJvbC50b1ByaW1pdGl2ZV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gQnVmZmVyLmZyb20oXG4gICAgICB2YWx1ZVtTeW1ib2wudG9QcmltaXRpdmVdKCdzdHJpbmcnKSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoXG4gICAgKVxuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAnVGhlIGZpcnN0IGFyZ3VtZW50IG11c3QgYmUgb25lIG9mIHR5cGUgc3RyaW5nLCBCdWZmZXIsIEFycmF5QnVmZmVyLCBBcnJheSwgJyArXG4gICAgJ29yIEFycmF5LWxpa2UgT2JqZWN0LiBSZWNlaXZlZCB0eXBlICcgKyAodHlwZW9mIHZhbHVlKVxuICApXG59XG5cbi8qKlxuICogRnVuY3Rpb25hbGx5IGVxdWl2YWxlbnQgdG8gQnVmZmVyKGFyZywgZW5jb2RpbmcpIGJ1dCB0aHJvd3MgYSBUeXBlRXJyb3JcbiAqIGlmIHZhbHVlIGlzIGEgbnVtYmVyLlxuICogQnVmZmVyLmZyb20oc3RyWywgZW5jb2RpbmddKVxuICogQnVmZmVyLmZyb20oYXJyYXkpXG4gKiBCdWZmZXIuZnJvbShidWZmZXIpXG4gKiBCdWZmZXIuZnJvbShhcnJheUJ1ZmZlclssIGJ5dGVPZmZzZXRbLCBsZW5ndGhdXSlcbiAqKi9cbkJ1ZmZlci5mcm9tID0gZnVuY3Rpb24gKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGZyb20odmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbn1cblxuLy8gTm90ZTogQ2hhbmdlIHByb3RvdHlwZSAqYWZ0ZXIqIEJ1ZmZlci5mcm9tIGlzIGRlZmluZWQgdG8gd29ya2Fyb3VuZCBDaHJvbWUgYnVnOlxuLy8gaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvcHVsbC8xNDhcbkJ1ZmZlci5wcm90b3R5cGUuX19wcm90b19fID0gVWludDhBcnJheS5wcm90b3R5cGVcbkJ1ZmZlci5fX3Byb3RvX18gPSBVaW50OEFycmF5XG5cbmZ1bmN0aW9uIGFzc2VydFNpemUgKHNpemUpIHtcbiAgaWYgKHR5cGVvZiBzaXplICE9PSAnbnVtYmVyJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wic2l6ZVwiIGFyZ3VtZW50IG11c3QgYmUgb2YgdHlwZSBudW1iZXInKVxuICB9IGVsc2UgaWYgKHNpemUgPCAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RoZSB2YWx1ZSBcIicgKyBzaXplICsgJ1wiIGlzIGludmFsaWQgZm9yIG9wdGlvbiBcInNpemVcIicpXG4gIH1cbn1cblxuZnVuY3Rpb24gYWxsb2MgKHNpemUsIGZpbGwsIGVuY29kaW5nKSB7XG4gIGFzc2VydFNpemUoc2l6ZSlcbiAgaWYgKHNpemUgPD0gMCkge1xuICAgIHJldHVybiBjcmVhdGVCdWZmZXIoc2l6ZSlcbiAgfVxuICBpZiAoZmlsbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgLy8gT25seSBwYXkgYXR0ZW50aW9uIHRvIGVuY29kaW5nIGlmIGl0J3MgYSBzdHJpbmcuIFRoaXNcbiAgICAvLyBwcmV2ZW50cyBhY2NpZGVudGFsbHkgc2VuZGluZyBpbiBhIG51bWJlciB0aGF0IHdvdWxkXG4gICAgLy8gYmUgaW50ZXJwcmV0dGVkIGFzIGEgc3RhcnQgb2Zmc2V0LlxuICAgIHJldHVybiB0eXBlb2YgZW5jb2RpbmcgPT09ICdzdHJpbmcnXG4gICAgICA/IGNyZWF0ZUJ1ZmZlcihzaXplKS5maWxsKGZpbGwsIGVuY29kaW5nKVxuICAgICAgOiBjcmVhdGVCdWZmZXIoc2l6ZSkuZmlsbChmaWxsKVxuICB9XG4gIHJldHVybiBjcmVhdGVCdWZmZXIoc2l6ZSlcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IGZpbGxlZCBCdWZmZXIgaW5zdGFuY2UuXG4gKiBhbGxvYyhzaXplWywgZmlsbFssIGVuY29kaW5nXV0pXG4gKiovXG5CdWZmZXIuYWxsb2MgPSBmdW5jdGlvbiAoc2l6ZSwgZmlsbCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIGFsbG9jKHNpemUsIGZpbGwsIGVuY29kaW5nKVxufVxuXG5mdW5jdGlvbiBhbGxvY1Vuc2FmZSAoc2l6ZSkge1xuICBhc3NlcnRTaXplKHNpemUpXG4gIHJldHVybiBjcmVhdGVCdWZmZXIoc2l6ZSA8IDAgPyAwIDogY2hlY2tlZChzaXplKSB8IDApXG59XG5cbi8qKlxuICogRXF1aXZhbGVudCB0byBCdWZmZXIobnVtKSwgYnkgZGVmYXVsdCBjcmVhdGVzIGEgbm9uLXplcm8tZmlsbGVkIEJ1ZmZlciBpbnN0YW5jZS5cbiAqICovXG5CdWZmZXIuYWxsb2NVbnNhZmUgPSBmdW5jdGlvbiAoc2l6ZSkge1xuICByZXR1cm4gYWxsb2NVbnNhZmUoc2l6ZSlcbn1cbi8qKlxuICogRXF1aXZhbGVudCB0byBTbG93QnVmZmVyKG51bSksIGJ5IGRlZmF1bHQgY3JlYXRlcyBhIG5vbi16ZXJvLWZpbGxlZCBCdWZmZXIgaW5zdGFuY2UuXG4gKi9cbkJ1ZmZlci5hbGxvY1Vuc2FmZVNsb3cgPSBmdW5jdGlvbiAoc2l6ZSkge1xuICByZXR1cm4gYWxsb2NVbnNhZmUoc2l6ZSlcbn1cblxuZnVuY3Rpb24gZnJvbVN0cmluZyAoc3RyaW5nLCBlbmNvZGluZykge1xuICBpZiAodHlwZW9mIGVuY29kaW5nICE9PSAnc3RyaW5nJyB8fCBlbmNvZGluZyA9PT0gJycpIHtcbiAgICBlbmNvZGluZyA9ICd1dGY4J1xuICB9XG5cbiAgaWYgKCFCdWZmZXIuaXNFbmNvZGluZyhlbmNvZGluZykpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gIH1cblxuICB2YXIgbGVuZ3RoID0gYnl0ZUxlbmd0aChzdHJpbmcsIGVuY29kaW5nKSB8IDBcbiAgdmFyIGJ1ZiA9IGNyZWF0ZUJ1ZmZlcihsZW5ndGgpXG5cbiAgdmFyIGFjdHVhbCA9IGJ1Zi53cml0ZShzdHJpbmcsIGVuY29kaW5nKVxuXG4gIGlmIChhY3R1YWwgIT09IGxlbmd0aCkge1xuICAgIC8vIFdyaXRpbmcgYSBoZXggc3RyaW5nLCBmb3IgZXhhbXBsZSwgdGhhdCBjb250YWlucyBpbnZhbGlkIGNoYXJhY3RlcnMgd2lsbFxuICAgIC8vIGNhdXNlIGV2ZXJ5dGhpbmcgYWZ0ZXIgdGhlIGZpcnN0IGludmFsaWQgY2hhcmFjdGVyIHRvIGJlIGlnbm9yZWQuIChlLmcuXG4gICAgLy8gJ2FieHhjZCcgd2lsbCBiZSB0cmVhdGVkIGFzICdhYicpXG4gICAgYnVmID0gYnVmLnNsaWNlKDAsIGFjdHVhbClcbiAgfVxuXG4gIHJldHVybiBidWZcbn1cblxuZnVuY3Rpb24gZnJvbUFycmF5TGlrZSAoYXJyYXkpIHtcbiAgdmFyIGxlbmd0aCA9IGFycmF5Lmxlbmd0aCA8IDAgPyAwIDogY2hlY2tlZChhcnJheS5sZW5ndGgpIHwgMFxuICB2YXIgYnVmID0gY3JlYXRlQnVmZmVyKGxlbmd0aClcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgIGJ1ZltpXSA9IGFycmF5W2ldICYgMjU1XG4gIH1cbiAgcmV0dXJuIGJ1ZlxufVxuXG5mdW5jdGlvbiBmcm9tQXJyYXlCdWZmZXIgKGFycmF5LCBieXRlT2Zmc2V0LCBsZW5ndGgpIHtcbiAgaWYgKGJ5dGVPZmZzZXQgPCAwIHx8IGFycmF5LmJ5dGVMZW5ndGggPCBieXRlT2Zmc2V0KSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1wib2Zmc2V0XCIgaXMgb3V0c2lkZSBvZiBidWZmZXIgYm91bmRzJylcbiAgfVxuXG4gIGlmIChhcnJheS5ieXRlTGVuZ3RoIDwgYnl0ZU9mZnNldCArIChsZW5ndGggfHwgMCkpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXCJsZW5ndGhcIiBpcyBvdXRzaWRlIG9mIGJ1ZmZlciBib3VuZHMnKVxuICB9XG5cbiAgdmFyIGJ1ZlxuICBpZiAoYnl0ZU9mZnNldCA9PT0gdW5kZWZpbmVkICYmIGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgYnVmID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXkpXG4gIH0gZWxzZSBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBidWYgPSBuZXcgVWludDhBcnJheShhcnJheSwgYnl0ZU9mZnNldClcbiAgfSBlbHNlIHtcbiAgICBidWYgPSBuZXcgVWludDhBcnJheShhcnJheSwgYnl0ZU9mZnNldCwgbGVuZ3RoKVxuICB9XG5cbiAgLy8gUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAgYnVmLl9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgcmV0dXJuIGJ1ZlxufVxuXG5mdW5jdGlvbiBmcm9tT2JqZWN0IChvYmopIHtcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihvYmopKSB7XG4gICAgdmFyIGxlbiA9IGNoZWNrZWQob2JqLmxlbmd0aCkgfCAwXG4gICAgdmFyIGJ1ZiA9IGNyZWF0ZUJ1ZmZlcihsZW4pXG5cbiAgICBpZiAoYnVmLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGJ1ZlxuICAgIH1cblxuICAgIG9iai5jb3B5KGJ1ZiwgMCwgMCwgbGVuKVxuICAgIHJldHVybiBidWZcbiAgfVxuXG4gIGlmIChvYmoubGVuZ3RoICE9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAodHlwZW9mIG9iai5sZW5ndGggIT09ICdudW1iZXInIHx8IG51bWJlcklzTmFOKG9iai5sZW5ndGgpKSB7XG4gICAgICByZXR1cm4gY3JlYXRlQnVmZmVyKDApXG4gICAgfVxuICAgIHJldHVybiBmcm9tQXJyYXlMaWtlKG9iailcbiAgfVxuXG4gIGlmIChvYmoudHlwZSA9PT0gJ0J1ZmZlcicgJiYgQXJyYXkuaXNBcnJheShvYmouZGF0YSkpIHtcbiAgICByZXR1cm4gZnJvbUFycmF5TGlrZShvYmouZGF0YSlcbiAgfVxufVxuXG5mdW5jdGlvbiBjaGVja2VkIChsZW5ndGgpIHtcbiAgLy8gTm90ZTogY2Fubm90IHVzZSBgbGVuZ3RoIDwgS19NQVhfTEVOR1RIYCBoZXJlIGJlY2F1c2UgdGhhdCBmYWlscyB3aGVuXG4gIC8vIGxlbmd0aCBpcyBOYU4gKHdoaWNoIGlzIG90aGVyd2lzZSBjb2VyY2VkIHRvIHplcm8uKVxuICBpZiAobGVuZ3RoID49IEtfTUFYX0xFTkdUSCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdBdHRlbXB0IHRvIGFsbG9jYXRlIEJ1ZmZlciBsYXJnZXIgdGhhbiBtYXhpbXVtICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICdzaXplOiAweCcgKyBLX01BWF9MRU5HVEgudG9TdHJpbmcoMTYpICsgJyBieXRlcycpXG4gIH1cbiAgcmV0dXJuIGxlbmd0aCB8IDBcbn1cblxuZnVuY3Rpb24gU2xvd0J1ZmZlciAobGVuZ3RoKSB7XG4gIGlmICgrbGVuZ3RoICE9IGxlbmd0aCkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGVxZXFlcVxuICAgIGxlbmd0aCA9IDBcbiAgfVxuICByZXR1cm4gQnVmZmVyLmFsbG9jKCtsZW5ndGgpXG59XG5cbkJ1ZmZlci5pc0J1ZmZlciA9IGZ1bmN0aW9uIGlzQnVmZmVyIChiKSB7XG4gIHJldHVybiBiICE9IG51bGwgJiYgYi5faXNCdWZmZXIgPT09IHRydWUgJiZcbiAgICBiICE9PSBCdWZmZXIucHJvdG90eXBlIC8vIHNvIEJ1ZmZlci5pc0J1ZmZlcihCdWZmZXIucHJvdG90eXBlKSB3aWxsIGJlIGZhbHNlXG59XG5cbkJ1ZmZlci5jb21wYXJlID0gZnVuY3Rpb24gY29tcGFyZSAoYSwgYikge1xuICBpZiAoaXNJbnN0YW5jZShhLCBVaW50OEFycmF5KSkgYSA9IEJ1ZmZlci5mcm9tKGEsIGEub2Zmc2V0LCBhLmJ5dGVMZW5ndGgpXG4gIGlmIChpc0luc3RhbmNlKGIsIFVpbnQ4QXJyYXkpKSBiID0gQnVmZmVyLmZyb20oYiwgYi5vZmZzZXQsIGIuYnl0ZUxlbmd0aClcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYSkgfHwgIUJ1ZmZlci5pc0J1ZmZlcihiKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAnVGhlIFwiYnVmMVwiLCBcImJ1ZjJcIiBhcmd1bWVudHMgbXVzdCBiZSBvbmUgb2YgdHlwZSBCdWZmZXIgb3IgVWludDhBcnJheSdcbiAgICApXG4gIH1cblxuICBpZiAoYSA9PT0gYikgcmV0dXJuIDBcblxuICB2YXIgeCA9IGEubGVuZ3RoXG4gIHZhciB5ID0gYi5sZW5ndGhcblxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gTWF0aC5taW4oeCwgeSk7IGkgPCBsZW47ICsraSkge1xuICAgIGlmIChhW2ldICE9PSBiW2ldKSB7XG4gICAgICB4ID0gYVtpXVxuICAgICAgeSA9IGJbaV1cbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG5cbiAgaWYgKHggPCB5KSByZXR1cm4gLTFcbiAgaWYgKHkgPCB4KSByZXR1cm4gMVxuICByZXR1cm4gMFxufVxuXG5CdWZmZXIuaXNFbmNvZGluZyA9IGZ1bmN0aW9uIGlzRW5jb2RpbmcgKGVuY29kaW5nKSB7XG4gIHN3aXRjaCAoU3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgY2FzZSAnYXNjaWknOlxuICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5CdWZmZXIuY29uY2F0ID0gZnVuY3Rpb24gY29uY2F0IChsaXN0LCBsZW5ndGgpIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KGxpc3QpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJsaXN0XCIgYXJndW1lbnQgbXVzdCBiZSBhbiBBcnJheSBvZiBCdWZmZXJzJylcbiAgfVxuXG4gIGlmIChsaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBCdWZmZXIuYWxsb2MoMClcbiAgfVxuXG4gIHZhciBpXG4gIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGxlbmd0aCA9IDBcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7ICsraSkge1xuICAgICAgbGVuZ3RoICs9IGxpc3RbaV0ubGVuZ3RoXG4gICAgfVxuICB9XG5cbiAgdmFyIGJ1ZmZlciA9IEJ1ZmZlci5hbGxvY1Vuc2FmZShsZW5ndGgpXG4gIHZhciBwb3MgPSAwXG4gIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIGJ1ZiA9IGxpc3RbaV1cbiAgICBpZiAoaXNJbnN0YW5jZShidWYsIFVpbnQ4QXJyYXkpKSB7XG4gICAgICBidWYgPSBCdWZmZXIuZnJvbShidWYpXG4gICAgfVxuICAgIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdFwiIGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycycpXG4gICAgfVxuICAgIGJ1Zi5jb3B5KGJ1ZmZlciwgcG9zKVxuICAgIHBvcyArPSBidWYubGVuZ3RoXG4gIH1cbiAgcmV0dXJuIGJ1ZmZlclxufVxuXG5mdW5jdGlvbiBieXRlTGVuZ3RoIChzdHJpbmcsIGVuY29kaW5nKSB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIoc3RyaW5nKSkge1xuICAgIHJldHVybiBzdHJpbmcubGVuZ3RoXG4gIH1cbiAgaWYgKEFycmF5QnVmZmVyLmlzVmlldyhzdHJpbmcpIHx8IGlzSW5zdGFuY2Uoc3RyaW5nLCBBcnJheUJ1ZmZlcikpIHtcbiAgICByZXR1cm4gc3RyaW5nLmJ5dGVMZW5ndGhcbiAgfVxuICBpZiAodHlwZW9mIHN0cmluZyAhPT0gJ3N0cmluZycpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgJ1RoZSBcInN0cmluZ1wiIGFyZ3VtZW50IG11c3QgYmUgb25lIG9mIHR5cGUgc3RyaW5nLCBCdWZmZXIsIG9yIEFycmF5QnVmZmVyLiAnICtcbiAgICAgICdSZWNlaXZlZCB0eXBlICcgKyB0eXBlb2Ygc3RyaW5nXG4gICAgKVxuICB9XG5cbiAgdmFyIGxlbiA9IHN0cmluZy5sZW5ndGhcbiAgdmFyIG11c3RNYXRjaCA9IChhcmd1bWVudHMubGVuZ3RoID4gMiAmJiBhcmd1bWVudHNbMl0gPT09IHRydWUpXG4gIGlmICghbXVzdE1hdGNoICYmIGxlbiA9PT0gMCkgcmV0dXJuIDBcblxuICAvLyBVc2UgYSBmb3IgbG9vcCB0byBhdm9pZCByZWN1cnNpb25cbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcbiAgZm9yICg7Oykge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gbGVuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gbGVuICogMlxuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGxlbiA+Pj4gMVxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGhcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkge1xuICAgICAgICAgIHJldHVybiBtdXN0TWF0Y2ggPyAtMSA6IHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoIC8vIGFzc3VtZSB1dGY4XG4gICAgICAgIH1cbiAgICAgICAgZW5jb2RpbmcgPSAoJycgKyBlbmNvZGluZykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cbkJ1ZmZlci5ieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aFxuXG5mdW5jdGlvbiBzbG93VG9TdHJpbmcgKGVuY29kaW5nLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG5cbiAgLy8gTm8gbmVlZCB0byB2ZXJpZnkgdGhhdCBcInRoaXMubGVuZ3RoIDw9IE1BWF9VSU5UMzJcIiBzaW5jZSBpdCdzIGEgcmVhZC1vbmx5XG4gIC8vIHByb3BlcnR5IG9mIGEgdHlwZWQgYXJyYXkuXG5cbiAgLy8gVGhpcyBiZWhhdmVzIG5laXRoZXIgbGlrZSBTdHJpbmcgbm9yIFVpbnQ4QXJyYXkgaW4gdGhhdCB3ZSBzZXQgc3RhcnQvZW5kXG4gIC8vIHRvIHRoZWlyIHVwcGVyL2xvd2VyIGJvdW5kcyBpZiB0aGUgdmFsdWUgcGFzc2VkIGlzIG91dCBvZiByYW5nZS5cbiAgLy8gdW5kZWZpbmVkIGlzIGhhbmRsZWQgc3BlY2lhbGx5IGFzIHBlciBFQ01BLTI2MiA2dGggRWRpdGlvbixcbiAgLy8gU2VjdGlvbiAxMy4zLjMuNyBSdW50aW1lIFNlbWFudGljczogS2V5ZWRCaW5kaW5nSW5pdGlhbGl6YXRpb24uXG4gIGlmIChzdGFydCA9PT0gdW5kZWZpbmVkIHx8IHN0YXJ0IDwgMCkge1xuICAgIHN0YXJ0ID0gMFxuICB9XG4gIC8vIFJldHVybiBlYXJseSBpZiBzdGFydCA+IHRoaXMubGVuZ3RoLiBEb25lIGhlcmUgdG8gcHJldmVudCBwb3RlbnRpYWwgdWludDMyXG4gIC8vIGNvZXJjaW9uIGZhaWwgYmVsb3cuXG4gIGlmIChzdGFydCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgcmV0dXJuICcnXG4gIH1cblxuICBpZiAoZW5kID09PSB1bmRlZmluZWQgfHwgZW5kID4gdGhpcy5sZW5ndGgpIHtcbiAgICBlbmQgPSB0aGlzLmxlbmd0aFxuICB9XG5cbiAgaWYgKGVuZCA8PSAwKSB7XG4gICAgcmV0dXJuICcnXG4gIH1cblxuICAvLyBGb3JjZSBjb2Vyc2lvbiB0byB1aW50MzIuIFRoaXMgd2lsbCBhbHNvIGNvZXJjZSBmYWxzZXkvTmFOIHZhbHVlcyB0byAwLlxuICBlbmQgPj4+PSAwXG4gIHN0YXJ0ID4+Pj0gMFxuXG4gIGlmIChlbmQgPD0gc3RhcnQpIHtcbiAgICByZXR1cm4gJydcbiAgfVxuXG4gIGlmICghZW5jb2RpbmcpIGVuY29kaW5nID0gJ3V0ZjgnXG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdsYXRpbjEnOlxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGxhdGluMVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIHJldHVybiBiYXNlNjRTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gdXRmMTZsZVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgICAgICBlbmNvZGluZyA9IChlbmNvZGluZyArICcnKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuXG4vLyBUaGlzIHByb3BlcnR5IGlzIHVzZWQgYnkgYEJ1ZmZlci5pc0J1ZmZlcmAgKGFuZCB0aGUgYGlzLWJ1ZmZlcmAgbnBtIHBhY2thZ2UpXG4vLyB0byBkZXRlY3QgYSBCdWZmZXIgaW5zdGFuY2UuIEl0J3Mgbm90IHBvc3NpYmxlIHRvIHVzZSBgaW5zdGFuY2VvZiBCdWZmZXJgXG4vLyByZWxpYWJseSBpbiBhIGJyb3dzZXJpZnkgY29udGV4dCBiZWNhdXNlIHRoZXJlIGNvdWxkIGJlIG11bHRpcGxlIGRpZmZlcmVudFxuLy8gY29waWVzIG9mIHRoZSAnYnVmZmVyJyBwYWNrYWdlIGluIHVzZS4gVGhpcyBtZXRob2Qgd29ya3MgZXZlbiBmb3IgQnVmZmVyXG4vLyBpbnN0YW5jZXMgdGhhdCB3ZXJlIGNyZWF0ZWQgZnJvbSBhbm90aGVyIGNvcHkgb2YgdGhlIGBidWZmZXJgIHBhY2thZ2UuXG4vLyBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL2lzc3Vlcy8xNTRcbkJ1ZmZlci5wcm90b3R5cGUuX2lzQnVmZmVyID0gdHJ1ZVxuXG5mdW5jdGlvbiBzd2FwIChiLCBuLCBtKSB7XG4gIHZhciBpID0gYltuXVxuICBiW25dID0gYlttXVxuICBiW21dID0gaVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnN3YXAxNiA9IGZ1bmN0aW9uIHN3YXAxNiAoKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuICUgMiAhPT0gMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdCdWZmZXIgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgMTYtYml0cycpXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gMikge1xuICAgIHN3YXAodGhpcywgaSwgaSArIDEpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zd2FwMzIgPSBmdW5jdGlvbiBzd2FwMzIgKCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbiAlIDQgIT09IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDMyLWJpdHMnKVxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IDQpIHtcbiAgICBzd2FwKHRoaXMsIGksIGkgKyAzKVxuICAgIHN3YXAodGhpcywgaSArIDEsIGkgKyAyKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc3dhcDY0ID0gZnVuY3Rpb24gc3dhcDY0ICgpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW4gJSA4ICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0J1ZmZlciBzaXplIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA2NC1iaXRzJylcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArPSA4KSB7XG4gICAgc3dhcCh0aGlzLCBpLCBpICsgNylcbiAgICBzd2FwKHRoaXMsIGkgKyAxLCBpICsgNilcbiAgICBzd2FwKHRoaXMsIGkgKyAyLCBpICsgNSlcbiAgICBzd2FwKHRoaXMsIGkgKyAzLCBpICsgNClcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcgKCkge1xuICB2YXIgbGVuZ3RoID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbmd0aCA9PT0gMCkgcmV0dXJuICcnXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSByZXR1cm4gdXRmOFNsaWNlKHRoaXMsIDAsIGxlbmd0aClcbiAgcmV0dXJuIHNsb3dUb1N0cmluZy5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9Mb2NhbGVTdHJpbmcgPSBCdWZmZXIucHJvdG90eXBlLnRvU3RyaW5nXG5cbkJ1ZmZlci5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gZXF1YWxzIChiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgaWYgKHRoaXMgPT09IGIpIHJldHVybiB0cnVlXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKSA9PT0gMFxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbiBpbnNwZWN0ICgpIHtcbiAgdmFyIHN0ciA9ICcnXG4gIHZhciBtYXggPSBleHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTXG4gIHN0ciA9IHRoaXMudG9TdHJpbmcoJ2hleCcsIDAsIG1heCkucmVwbGFjZSgvKC57Mn0pL2csICckMSAnKS50cmltKClcbiAgaWYgKHRoaXMubGVuZ3RoID4gbWF4KSBzdHIgKz0gJyAuLi4gJ1xuICByZXR1cm4gJzxCdWZmZXIgJyArIHN0ciArICc+J1xufVxuXG5CdWZmZXIucHJvdG90eXBlLmNvbXBhcmUgPSBmdW5jdGlvbiBjb21wYXJlICh0YXJnZXQsIHN0YXJ0LCBlbmQsIHRoaXNTdGFydCwgdGhpc0VuZCkge1xuICBpZiAoaXNJbnN0YW5jZSh0YXJnZXQsIFVpbnQ4QXJyYXkpKSB7XG4gICAgdGFyZ2V0ID0gQnVmZmVyLmZyb20odGFyZ2V0LCB0YXJnZXQub2Zmc2V0LCB0YXJnZXQuYnl0ZUxlbmd0aClcbiAgfVxuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcih0YXJnZXQpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICdUaGUgXCJ0YXJnZXRcIiBhcmd1bWVudCBtdXN0IGJlIG9uZSBvZiB0eXBlIEJ1ZmZlciBvciBVaW50OEFycmF5LiAnICtcbiAgICAgICdSZWNlaXZlZCB0eXBlICcgKyAodHlwZW9mIHRhcmdldClcbiAgICApXG4gIH1cblxuICBpZiAoc3RhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgIHN0YXJ0ID0gMFxuICB9XG4gIGlmIChlbmQgPT09IHVuZGVmaW5lZCkge1xuICAgIGVuZCA9IHRhcmdldCA/IHRhcmdldC5sZW5ndGggOiAwXG4gIH1cbiAgaWYgKHRoaXNTdGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhpc1N0YXJ0ID0gMFxuICB9XG4gIGlmICh0aGlzRW5kID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzRW5kID0gdGhpcy5sZW5ndGhcbiAgfVxuXG4gIGlmIChzdGFydCA8IDAgfHwgZW5kID4gdGFyZ2V0Lmxlbmd0aCB8fCB0aGlzU3RhcnQgPCAwIHx8IHRoaXNFbmQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdvdXQgb2YgcmFuZ2UgaW5kZXgnKVxuICB9XG5cbiAgaWYgKHRoaXNTdGFydCA+PSB0aGlzRW5kICYmIHN0YXJ0ID49IGVuZCkge1xuICAgIHJldHVybiAwXG4gIH1cbiAgaWYgKHRoaXNTdGFydCA+PSB0aGlzRW5kKSB7XG4gICAgcmV0dXJuIC0xXG4gIH1cbiAgaWYgKHN0YXJ0ID49IGVuZCkge1xuICAgIHJldHVybiAxXG4gIH1cblxuICBzdGFydCA+Pj49IDBcbiAgZW5kID4+Pj0gMFxuICB0aGlzU3RhcnQgPj4+PSAwXG4gIHRoaXNFbmQgPj4+PSAwXG5cbiAgaWYgKHRoaXMgPT09IHRhcmdldCkgcmV0dXJuIDBcblxuICB2YXIgeCA9IHRoaXNFbmQgLSB0aGlzU3RhcnRcbiAgdmFyIHkgPSBlbmQgLSBzdGFydFxuICB2YXIgbGVuID0gTWF0aC5taW4oeCwgeSlcblxuICB2YXIgdGhpc0NvcHkgPSB0aGlzLnNsaWNlKHRoaXNTdGFydCwgdGhpc0VuZClcbiAgdmFyIHRhcmdldENvcHkgPSB0YXJnZXQuc2xpY2Uoc3RhcnQsIGVuZClcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgaWYgKHRoaXNDb3B5W2ldICE9PSB0YXJnZXRDb3B5W2ldKSB7XG4gICAgICB4ID0gdGhpc0NvcHlbaV1cbiAgICAgIHkgPSB0YXJnZXRDb3B5W2ldXG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIGlmICh4IDwgeSkgcmV0dXJuIC0xXG4gIGlmICh5IDwgeCkgcmV0dXJuIDFcbiAgcmV0dXJuIDBcbn1cblxuLy8gRmluZHMgZWl0aGVyIHRoZSBmaXJzdCBpbmRleCBvZiBgdmFsYCBpbiBgYnVmZmVyYCBhdCBvZmZzZXQgPj0gYGJ5dGVPZmZzZXRgLFxuLy8gT1IgdGhlIGxhc3QgaW5kZXggb2YgYHZhbGAgaW4gYGJ1ZmZlcmAgYXQgb2Zmc2V0IDw9IGBieXRlT2Zmc2V0YC5cbi8vXG4vLyBBcmd1bWVudHM6XG4vLyAtIGJ1ZmZlciAtIGEgQnVmZmVyIHRvIHNlYXJjaFxuLy8gLSB2YWwgLSBhIHN0cmluZywgQnVmZmVyLCBvciBudW1iZXJcbi8vIC0gYnl0ZU9mZnNldCAtIGFuIGluZGV4IGludG8gYGJ1ZmZlcmA7IHdpbGwgYmUgY2xhbXBlZCB0byBhbiBpbnQzMlxuLy8gLSBlbmNvZGluZyAtIGFuIG9wdGlvbmFsIGVuY29kaW5nLCByZWxldmFudCBpcyB2YWwgaXMgYSBzdHJpbmdcbi8vIC0gZGlyIC0gdHJ1ZSBmb3IgaW5kZXhPZiwgZmFsc2UgZm9yIGxhc3RJbmRleE9mXG5mdW5jdGlvbiBiaWRpcmVjdGlvbmFsSW5kZXhPZiAoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpIHtcbiAgLy8gRW1wdHkgYnVmZmVyIG1lYW5zIG5vIG1hdGNoXG4gIGlmIChidWZmZXIubGVuZ3RoID09PSAwKSByZXR1cm4gLTFcblxuICAvLyBOb3JtYWxpemUgYnl0ZU9mZnNldFxuICBpZiAodHlwZW9mIGJ5dGVPZmZzZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgZW5jb2RpbmcgPSBieXRlT2Zmc2V0XG4gICAgYnl0ZU9mZnNldCA9IDBcbiAgfSBlbHNlIGlmIChieXRlT2Zmc2V0ID4gMHg3ZmZmZmZmZikge1xuICAgIGJ5dGVPZmZzZXQgPSAweDdmZmZmZmZmXG4gIH0gZWxzZSBpZiAoYnl0ZU9mZnNldCA8IC0weDgwMDAwMDAwKSB7XG4gICAgYnl0ZU9mZnNldCA9IC0weDgwMDAwMDAwXG4gIH1cbiAgYnl0ZU9mZnNldCA9ICtieXRlT2Zmc2V0IC8vIENvZXJjZSB0byBOdW1iZXIuXG4gIGlmIChudW1iZXJJc05hTihieXRlT2Zmc2V0KSkge1xuICAgIC8vIGJ5dGVPZmZzZXQ6IGl0IGl0J3MgdW5kZWZpbmVkLCBudWxsLCBOYU4sIFwiZm9vXCIsIGV0Yywgc2VhcmNoIHdob2xlIGJ1ZmZlclxuICAgIGJ5dGVPZmZzZXQgPSBkaXIgPyAwIDogKGJ1ZmZlci5sZW5ndGggLSAxKVxuICB9XG5cbiAgLy8gTm9ybWFsaXplIGJ5dGVPZmZzZXQ6IG5lZ2F0aXZlIG9mZnNldHMgc3RhcnQgZnJvbSB0aGUgZW5kIG9mIHRoZSBidWZmZXJcbiAgaWYgKGJ5dGVPZmZzZXQgPCAwKSBieXRlT2Zmc2V0ID0gYnVmZmVyLmxlbmd0aCArIGJ5dGVPZmZzZXRcbiAgaWYgKGJ5dGVPZmZzZXQgPj0gYnVmZmVyLmxlbmd0aCkge1xuICAgIGlmIChkaXIpIHJldHVybiAtMVxuICAgIGVsc2UgYnl0ZU9mZnNldCA9IGJ1ZmZlci5sZW5ndGggLSAxXG4gIH0gZWxzZSBpZiAoYnl0ZU9mZnNldCA8IDApIHtcbiAgICBpZiAoZGlyKSBieXRlT2Zmc2V0ID0gMFxuICAgIGVsc2UgcmV0dXJuIC0xXG4gIH1cblxuICAvLyBOb3JtYWxpemUgdmFsXG4gIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIHZhbCA9IEJ1ZmZlci5mcm9tKHZhbCwgZW5jb2RpbmcpXG4gIH1cblxuICAvLyBGaW5hbGx5LCBzZWFyY2ggZWl0aGVyIGluZGV4T2YgKGlmIGRpciBpcyB0cnVlKSBvciBsYXN0SW5kZXhPZlxuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHZhbCkpIHtcbiAgICAvLyBTcGVjaWFsIGNhc2U6IGxvb2tpbmcgZm9yIGVtcHR5IHN0cmluZy9idWZmZXIgYWx3YXlzIGZhaWxzXG4gICAgaWYgKHZhbC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiAtMVxuICAgIH1cbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKVxuICB9IGVsc2UgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgdmFsID0gdmFsICYgMHhGRiAvLyBTZWFyY2ggZm9yIGEgYnl0ZSB2YWx1ZSBbMC0yNTVdXG4gICAgaWYgKHR5cGVvZiBVaW50OEFycmF5LnByb3RvdHlwZS5pbmRleE9mID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBpZiAoZGlyKSB7XG4gICAgICAgIHJldHVybiBVaW50OEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gVWludDhBcnJheS5wcm90b3R5cGUubGFzdEluZGV4T2YuY2FsbChidWZmZXIsIHZhbCwgYnl0ZU9mZnNldClcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGFycmF5SW5kZXhPZihidWZmZXIsIFsgdmFsIF0sIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpXG4gIH1cblxuICB0aHJvdyBuZXcgVHlwZUVycm9yKCd2YWwgbXVzdCBiZSBzdHJpbmcsIG51bWJlciBvciBCdWZmZXInKVxufVxuXG5mdW5jdGlvbiBhcnJheUluZGV4T2YgKGFyciwgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKSB7XG4gIHZhciBpbmRleFNpemUgPSAxXG4gIHZhciBhcnJMZW5ndGggPSBhcnIubGVuZ3RoXG4gIHZhciB2YWxMZW5ndGggPSB2YWwubGVuZ3RoXG5cbiAgaWYgKGVuY29kaW5nICE9PSB1bmRlZmluZWQpIHtcbiAgICBlbmNvZGluZyA9IFN0cmluZyhlbmNvZGluZykudG9Mb3dlckNhc2UoKVxuICAgIGlmIChlbmNvZGluZyA9PT0gJ3VjczInIHx8IGVuY29kaW5nID09PSAndWNzLTInIHx8XG4gICAgICAgIGVuY29kaW5nID09PSAndXRmMTZsZScgfHwgZW5jb2RpbmcgPT09ICd1dGYtMTZsZScpIHtcbiAgICAgIGlmIChhcnIubGVuZ3RoIDwgMiB8fCB2YWwubGVuZ3RoIDwgMikge1xuICAgICAgICByZXR1cm4gLTFcbiAgICAgIH1cbiAgICAgIGluZGV4U2l6ZSA9IDJcbiAgICAgIGFyckxlbmd0aCAvPSAyXG4gICAgICB2YWxMZW5ndGggLz0gMlxuICAgICAgYnl0ZU9mZnNldCAvPSAyXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZCAoYnVmLCBpKSB7XG4gICAgaWYgKGluZGV4U2l6ZSA9PT0gMSkge1xuICAgICAgcmV0dXJuIGJ1ZltpXVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gYnVmLnJlYWRVSW50MTZCRShpICogaW5kZXhTaXplKVxuICAgIH1cbiAgfVxuXG4gIHZhciBpXG4gIGlmIChkaXIpIHtcbiAgICB2YXIgZm91bmRJbmRleCA9IC0xXG4gICAgZm9yIChpID0gYnl0ZU9mZnNldDsgaSA8IGFyckxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAocmVhZChhcnIsIGkpID09PSByZWFkKHZhbCwgZm91bmRJbmRleCA9PT0gLTEgPyAwIDogaSAtIGZvdW5kSW5kZXgpKSB7XG4gICAgICAgIGlmIChmb3VuZEluZGV4ID09PSAtMSkgZm91bmRJbmRleCA9IGlcbiAgICAgICAgaWYgKGkgLSBmb3VuZEluZGV4ICsgMSA9PT0gdmFsTGVuZ3RoKSByZXR1cm4gZm91bmRJbmRleCAqIGluZGV4U2l6ZVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGZvdW5kSW5kZXggIT09IC0xKSBpIC09IGkgLSBmb3VuZEluZGV4XG4gICAgICAgIGZvdW5kSW5kZXggPSAtMVxuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoYnl0ZU9mZnNldCArIHZhbExlbmd0aCA+IGFyckxlbmd0aCkgYnl0ZU9mZnNldCA9IGFyckxlbmd0aCAtIHZhbExlbmd0aFxuICAgIGZvciAoaSA9IGJ5dGVPZmZzZXQ7IGkgPj0gMDsgaS0tKSB7XG4gICAgICB2YXIgZm91bmQgPSB0cnVlXG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHZhbExlbmd0aDsgaisrKSB7XG4gICAgICAgIGlmIChyZWFkKGFyciwgaSArIGopICE9PSByZWFkKHZhbCwgaikpIHtcbiAgICAgICAgICBmb3VuZCA9IGZhbHNlXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGZvdW5kKSByZXR1cm4gaVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiAtMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluY2x1ZGVzID0gZnVuY3Rpb24gaW5jbHVkZXMgKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIHRoaXMuaW5kZXhPZih2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSAhPT0gLTFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbmRleE9mID0gZnVuY3Rpb24gaW5kZXhPZiAodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykge1xuICByZXR1cm4gYmlkaXJlY3Rpb25hbEluZGV4T2YodGhpcywgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgdHJ1ZSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5sYXN0SW5kZXhPZiA9IGZ1bmN0aW9uIGxhc3RJbmRleE9mICh2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSB7XG4gIHJldHVybiBiaWRpcmVjdGlvbmFsSW5kZXhPZih0aGlzLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBmYWxzZSlcbn1cblxuZnVuY3Rpb24gaGV4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSBidWYubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cblxuICB2YXIgc3RyTGVuID0gc3RyaW5nLmxlbmd0aFxuXG4gIGlmIChsZW5ndGggPiBzdHJMZW4gLyAyKSB7XG4gICAgbGVuZ3RoID0gc3RyTGVuIC8gMlxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgcGFyc2VkID0gcGFyc2VJbnQoc3RyaW5nLnN1YnN0cihpICogMiwgMiksIDE2KVxuICAgIGlmIChudW1iZXJJc05hTihwYXJzZWQpKSByZXR1cm4gaVxuICAgIGJ1ZltvZmZzZXQgKyBpXSA9IHBhcnNlZFxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIHV0ZjhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKHV0ZjhUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGFzY2lpV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcihhc2NpaVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gbGF0aW4xV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYXNjaWlXcml0ZShidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGJhc2U2NFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIoYmFzZTY0VG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiB1Y3MyV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcih1dGYxNmxlVG9CeXRlcyhzdHJpbmcsIGJ1Zi5sZW5ndGggLSBvZmZzZXQpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gd3JpdGUgKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKSB7XG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcpXG4gIGlmIChvZmZzZXQgPT09IHVuZGVmaW5lZCkge1xuICAgIGVuY29kaW5nID0gJ3V0ZjgnXG4gICAgbGVuZ3RoID0gdGhpcy5sZW5ndGhcbiAgICBvZmZzZXQgPSAwXG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcsIGVuY29kaW5nKVxuICB9IGVsc2UgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvZmZzZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgZW5jb2RpbmcgPSBvZmZzZXRcbiAgICBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICAgIG9mZnNldCA9IDBcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZywgb2Zmc2V0WywgbGVuZ3RoXVssIGVuY29kaW5nXSlcbiAgfSBlbHNlIGlmIChpc0Zpbml0ZShvZmZzZXQpKSB7XG4gICAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gICAgaWYgKGlzRmluaXRlKGxlbmd0aCkpIHtcbiAgICAgIGxlbmd0aCA9IGxlbmd0aCA+Pj4gMFxuICAgICAgaWYgKGVuY29kaW5nID09PSB1bmRlZmluZWQpIGVuY29kaW5nID0gJ3V0ZjgnXG4gICAgfSBlbHNlIHtcbiAgICAgIGVuY29kaW5nID0gbGVuZ3RoXG4gICAgICBsZW5ndGggPSB1bmRlZmluZWRcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgJ0J1ZmZlci53cml0ZShzdHJpbmcsIGVuY29kaW5nLCBvZmZzZXRbLCBsZW5ndGhdKSBpcyBubyBsb25nZXIgc3VwcG9ydGVkJ1xuICAgIClcbiAgfVxuXG4gIHZhciByZW1haW5pbmcgPSB0aGlzLmxlbmd0aCAtIG9mZnNldFxuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgfHwgbGVuZ3RoID4gcmVtYWluaW5nKSBsZW5ndGggPSByZW1haW5pbmdcblxuICBpZiAoKHN0cmluZy5sZW5ndGggPiAwICYmIChsZW5ndGggPCAwIHx8IG9mZnNldCA8IDApKSB8fCBvZmZzZXQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdBdHRlbXB0IHRvIHdyaXRlIG91dHNpZGUgYnVmZmVyIGJvdW5kcycpXG4gIH1cblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdsYXRpbjEnOlxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGxhdGluMVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIC8vIFdhcm5pbmc6IG1heExlbmd0aCBub3QgdGFrZW4gaW50byBhY2NvdW50IGluIGJhc2U2NFdyaXRlXG4gICAgICAgIHJldHVybiBiYXNlNjRXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gdWNzMldyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgICAgICBlbmNvZGluZyA9ICgnJyArIGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIHRvSlNPTiAoKSB7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ0J1ZmZlcicsXG4gICAgZGF0YTogQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5fYXJyIHx8IHRoaXMsIDApXG4gIH1cbn1cblxuZnVuY3Rpb24gYmFzZTY0U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBpZiAoc3RhcnQgPT09IDAgJiYgZW5kID09PSBidWYubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1ZilcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmLnNsaWNlKHN0YXJ0LCBlbmQpKVxuICB9XG59XG5cbmZ1bmN0aW9uIHV0ZjhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcbiAgdmFyIHJlcyA9IFtdXG5cbiAgdmFyIGkgPSBzdGFydFxuICB3aGlsZSAoaSA8IGVuZCkge1xuICAgIHZhciBmaXJzdEJ5dGUgPSBidWZbaV1cbiAgICB2YXIgY29kZVBvaW50ID0gbnVsbFxuICAgIHZhciBieXRlc1BlclNlcXVlbmNlID0gKGZpcnN0Qnl0ZSA+IDB4RUYpID8gNFxuICAgICAgOiAoZmlyc3RCeXRlID4gMHhERikgPyAzXG4gICAgICAgIDogKGZpcnN0Qnl0ZSA+IDB4QkYpID8gMlxuICAgICAgICAgIDogMVxuXG4gICAgaWYgKGkgKyBieXRlc1BlclNlcXVlbmNlIDw9IGVuZCkge1xuICAgICAgdmFyIHNlY29uZEJ5dGUsIHRoaXJkQnl0ZSwgZm91cnRoQnl0ZSwgdGVtcENvZGVQb2ludFxuXG4gICAgICBzd2l0Y2ggKGJ5dGVzUGVyU2VxdWVuY2UpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIGlmIChmaXJzdEJ5dGUgPCAweDgwKSB7XG4gICAgICAgICAgICBjb2RlUG9pbnQgPSBmaXJzdEJ5dGVcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHgxRikgPDwgMHg2IHwgKHNlY29uZEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweDdGKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgdGhpcmRCeXRlID0gYnVmW2kgKyAyXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwICYmICh0aGlyZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweEYpIDw8IDB4QyB8IChzZWNvbmRCeXRlICYgMHgzRikgPDwgMHg2IHwgKHRoaXJkQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4N0ZGICYmICh0ZW1wQ29kZVBvaW50IDwgMHhEODAwIHx8IHRlbXBDb2RlUG9pbnQgPiAweERGRkYpKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSA0OlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgdGhpcmRCeXRlID0gYnVmW2kgKyAyXVxuICAgICAgICAgIGZvdXJ0aEJ5dGUgPSBidWZbaSArIDNdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKHRoaXJkQnl0ZSAmIDB4QzApID09PSAweDgwICYmIChmb3VydGhCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHhGKSA8PCAweDEyIHwgKHNlY29uZEJ5dGUgJiAweDNGKSA8PCAweEMgfCAodGhpcmRCeXRlICYgMHgzRikgPDwgMHg2IHwgKGZvdXJ0aEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweEZGRkYgJiYgdGVtcENvZGVQb2ludCA8IDB4MTEwMDAwKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNvZGVQb2ludCA9PT0gbnVsbCkge1xuICAgICAgLy8gd2UgZGlkIG5vdCBnZW5lcmF0ZSBhIHZhbGlkIGNvZGVQb2ludCBzbyBpbnNlcnQgYVxuICAgICAgLy8gcmVwbGFjZW1lbnQgY2hhciAoVStGRkZEKSBhbmQgYWR2YW5jZSBvbmx5IDEgYnl0ZVxuICAgICAgY29kZVBvaW50ID0gMHhGRkZEXG4gICAgICBieXRlc1BlclNlcXVlbmNlID0gMVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50ID4gMHhGRkZGKSB7XG4gICAgICAvLyBlbmNvZGUgdG8gdXRmMTYgKHN1cnJvZ2F0ZSBwYWlyIGRhbmNlKVxuICAgICAgY29kZVBvaW50IC09IDB4MTAwMDBcbiAgICAgIHJlcy5wdXNoKGNvZGVQb2ludCA+Pj4gMTAgJiAweDNGRiB8IDB4RDgwMClcbiAgICAgIGNvZGVQb2ludCA9IDB4REMwMCB8IGNvZGVQb2ludCAmIDB4M0ZGXG4gICAgfVxuXG4gICAgcmVzLnB1c2goY29kZVBvaW50KVxuICAgIGkgKz0gYnl0ZXNQZXJTZXF1ZW5jZVxuICB9XG5cbiAgcmV0dXJuIGRlY29kZUNvZGVQb2ludHNBcnJheShyZXMpXG59XG5cbi8vIEJhc2VkIG9uIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzIyNzQ3MjcyLzY4MDc0MiwgdGhlIGJyb3dzZXIgd2l0aFxuLy8gdGhlIGxvd2VzdCBsaW1pdCBpcyBDaHJvbWUsIHdpdGggMHgxMDAwMCBhcmdzLlxuLy8gV2UgZ28gMSBtYWduaXR1ZGUgbGVzcywgZm9yIHNhZmV0eVxudmFyIE1BWF9BUkdVTUVOVFNfTEVOR1RIID0gMHgxMDAwXG5cbmZ1bmN0aW9uIGRlY29kZUNvZGVQb2ludHNBcnJheSAoY29kZVBvaW50cykge1xuICB2YXIgbGVuID0gY29kZVBvaW50cy5sZW5ndGhcbiAgaWYgKGxlbiA8PSBNQVhfQVJHVU1FTlRTX0xFTkdUSCkge1xuICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFN0cmluZywgY29kZVBvaW50cykgLy8gYXZvaWQgZXh0cmEgc2xpY2UoKVxuICB9XG5cbiAgLy8gRGVjb2RlIGluIGNodW5rcyB0byBhdm9pZCBcImNhbGwgc3RhY2sgc2l6ZSBleGNlZWRlZFwiLlxuICB2YXIgcmVzID0gJydcbiAgdmFyIGkgPSAwXG4gIHdoaWxlIChpIDwgbGVuKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoXG4gICAgICBTdHJpbmcsXG4gICAgICBjb2RlUG9pbnRzLnNsaWNlKGksIGkgKz0gTUFYX0FSR1VNRU5UU19MRU5HVEgpXG4gICAgKVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0gJiAweDdGKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gbGF0aW4xU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gaGV4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuXG4gIGlmICghc3RhcnQgfHwgc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgfHwgZW5kIDwgMCB8fCBlbmQgPiBsZW4pIGVuZCA9IGxlblxuXG4gIHZhciBvdXQgPSAnJ1xuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgIG91dCArPSB0b0hleChidWZbaV0pXG4gIH1cbiAgcmV0dXJuIG91dFxufVxuXG5mdW5jdGlvbiB1dGYxNmxlU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgYnl0ZXMgPSBidWYuc2xpY2Uoc3RhcnQsIGVuZClcbiAgdmFyIHJlcyA9ICcnXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYnl0ZXMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlc1tpXSArIChieXRlc1tpICsgMV0gKiAyNTYpKVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIHNsaWNlIChzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBzdGFydCA9IH5+c3RhcnRcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgPyBsZW4gOiB+fmVuZFxuXG4gIGlmIChzdGFydCA8IDApIHtcbiAgICBzdGFydCArPSBsZW5cbiAgICBpZiAoc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgfSBlbHNlIGlmIChzdGFydCA+IGxlbikge1xuICAgIHN0YXJ0ID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgMCkge1xuICAgIGVuZCArPSBsZW5cbiAgICBpZiAoZW5kIDwgMCkgZW5kID0gMFxuICB9IGVsc2UgaWYgKGVuZCA+IGxlbikge1xuICAgIGVuZCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IHN0YXJ0KSBlbmQgPSBzdGFydFxuXG4gIHZhciBuZXdCdWYgPSB0aGlzLnN1YmFycmF5KHN0YXJ0LCBlbmQpXG4gIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gIG5ld0J1Zi5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIHJldHVybiBuZXdCdWZcbn1cblxuLypcbiAqIE5lZWQgdG8gbWFrZSBzdXJlIHRoYXQgYnVmZmVyIGlzbid0IHRyeWluZyB0byB3cml0ZSBvdXQgb2YgYm91bmRzLlxuICovXG5mdW5jdGlvbiBjaGVja09mZnNldCAob2Zmc2V0LCBleHQsIGxlbmd0aCkge1xuICBpZiAoKG9mZnNldCAlIDEpICE9PSAwIHx8IG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdvZmZzZXQgaXMgbm90IHVpbnQnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gbGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVHJ5aW5nIHRvIGFjY2VzcyBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRMRSA9IGZ1bmN0aW9uIHJlYWRVSW50TEUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuICB9XG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50QkUgPSBmdW5jdGlvbiByZWFkVUludEJFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcbiAgfVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0tYnl0ZUxlbmd0aF1cbiAgdmFyIG11bCA9IDFcbiAgd2hpbGUgKGJ5dGVMZW5ndGggPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1ieXRlTGVuZ3RoXSAqIG11bFxuICB9XG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50OCA9IGZ1bmN0aW9uIHJlYWRVSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRVSW50MTZMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkJFID0gZnVuY3Rpb24gcmVhZFVJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCA4KSB8IHRoaXNbb2Zmc2V0ICsgMV1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyTEUgPSBmdW5jdGlvbiByZWFkVUludDMyTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICgodGhpc1tvZmZzZXRdKSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikpICtcbiAgICAgICh0aGlzW29mZnNldCArIDNdICogMHgxMDAwMDAwKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJCRSA9IGZ1bmN0aW9uIHJlYWRVSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSAqIDB4MTAwMDAwMCkgK1xuICAgICgodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICB0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnRMRSA9IGZ1bmN0aW9uIHJlYWRJbnRMRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIH1cbiAgbXVsICo9IDB4ODBcblxuICBpZiAodmFsID49IG11bCkgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50QkUgPSBmdW5jdGlvbiByZWFkSW50QkUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoXG4gIHZhciBtdWwgPSAxXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0taV1cbiAgd2hpbGUgKGkgPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1pXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiByZWFkSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgaWYgKCEodGhpc1tvZmZzZXRdICYgMHg4MCkpIHJldHVybiAodGhpc1tvZmZzZXRdKVxuICByZXR1cm4gKCgweGZmIC0gdGhpc1tvZmZzZXRdICsgMSkgKiAtMSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRJbnQxNkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkJFID0gZnVuY3Rpb24gcmVhZEludDE2QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIDFdIHwgKHRoaXNbb2Zmc2V0XSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyTEUgPSBmdW5jdGlvbiByZWFkSW50MzJMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSkgfFxuICAgICh0aGlzW29mZnNldCArIDFdIDw8IDgpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDNdIDw8IDI0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkJFID0gZnVuY3Rpb24gcmVhZEludDMyQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgMjQpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRMRSA9IGZ1bmN0aW9uIHJlYWRGbG9hdExFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0QkUgPSBmdW5jdGlvbiByZWFkRmxvYXRCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIGZhbHNlLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlTEUgPSBmdW5jdGlvbiByZWFkRG91YmxlTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCB0cnVlLCA1MiwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlQkUgPSBmdW5jdGlvbiByZWFkRG91YmxlQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgNTIsIDgpXG59XG5cbmZ1bmN0aW9uIGNoZWNrSW50IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYnVmKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJidWZmZXJcIiBhcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyIGluc3RhbmNlJylcbiAgaWYgKHZhbHVlID4gbWF4IHx8IHZhbHVlIDwgbWluKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXCJ2YWx1ZVwiIGFyZ3VtZW50IGlzIG91dCBvZiBib3VuZHMnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50TEUgPSBmdW5jdGlvbiB3cml0ZVVJbnRMRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbWF4Qnl0ZXMgPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCkgLSAxXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbWF4Qnl0ZXMsIDApXG4gIH1cblxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludEJFID0gZnVuY3Rpb24gd3JpdGVVSW50QkUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIG1heEJ5dGVzID0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpIC0gMVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG1heEJ5dGVzLCAwKVxuICB9XG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQ4ID0gZnVuY3Rpb24gd3JpdGVVSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDEsIDB4ZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlSW50TEUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIGxpbWl0ID0gTWF0aC5wb3coMiwgKDggKiBieXRlTGVuZ3RoKSAtIDEpXG5cbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBsaW1pdCAtIDEsIC1saW1pdClcbiAgfVxuXG4gIHZhciBpID0gMFxuICB2YXIgbXVsID0gMVxuICB2YXIgc3ViID0gMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICBpZiAodmFsdWUgPCAwICYmIHN1YiA9PT0gMCAmJiB0aGlzW29mZnNldCArIGkgLSAxXSAhPT0gMCkge1xuICAgICAgc3ViID0gMVxuICAgIH1cbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50QkUgPSBmdW5jdGlvbiB3cml0ZUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsICg4ICogYnl0ZUxlbmd0aCkgLSAxKVxuXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbGltaXQgLSAxLCAtbGltaXQpXG4gIH1cblxuICB2YXIgaSA9IGJ5dGVMZW5ndGggLSAxXG4gIHZhciBtdWwgPSAxXG4gIHZhciBzdWIgPSAwXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgaWYgKHZhbHVlIDwgMCAmJiBzdWIgPT09IDAgJiYgdGhpc1tvZmZzZXQgKyBpICsgMV0gIT09IDApIHtcbiAgICAgIHN1YiA9IDFcbiAgICB9XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICgodmFsdWUgLyBtdWwpID4+IDApIC0gc3ViICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDggPSBmdW5jdGlvbiB3cml0ZUludDggKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweDdmLCAtMHg4MClcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmICsgdmFsdWUgKyAxXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkxFID0gZnVuY3Rpb24gd3JpdGVJbnQxNkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MTZCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyTEUgPSBmdW5jdGlvbiB3cml0ZUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MzJCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDFcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5mdW5jdGlvbiBjaGVja0lFRUU3NTQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG4gIGlmIChvZmZzZXQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuZnVuY3Rpb24gd3JpdGVGbG9hdCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tJRUVFNzU0KGJ1ZiwgdmFsdWUsIG9mZnNldCwgNCwgMy40MDI4MjM0NjYzODUyODg2ZSszOCwgLTMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgpXG4gIH1cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgMjMsIDQpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdExFID0gZnVuY3Rpb24gd3JpdGVGbG9hdExFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0QkUgPSBmdW5jdGlvbiB3cml0ZUZsb2F0QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gd3JpdGVEb3VibGUgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDgsIDEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4LCAtMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgpXG4gIH1cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgNTIsIDgpXG4gIHJldHVybiBvZmZzZXQgKyA4XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVMRSA9IGZ1bmN0aW9uIHdyaXRlRG91YmxlTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gd3JpdGVEb3VibGVCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuLy8gY29weSh0YXJnZXRCdWZmZXIsIHRhcmdldFN0YXJ0PTAsIHNvdXJjZVN0YXJ0PTAsIHNvdXJjZUVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gY29weSAodGFyZ2V0LCB0YXJnZXRTdGFydCwgc3RhcnQsIGVuZCkge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcih0YXJnZXQpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdhcmd1bWVudCBzaG91bGQgYmUgYSBCdWZmZXInKVxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgJiYgZW5kICE9PSAwKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0U3RhcnQgPj0gdGFyZ2V0Lmxlbmd0aCkgdGFyZ2V0U3RhcnQgPSB0YXJnZXQubGVuZ3RoXG4gIGlmICghdGFyZ2V0U3RhcnQpIHRhcmdldFN0YXJ0ID0gMFxuICBpZiAoZW5kID4gMCAmJiBlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICAvLyBDb3B5IDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVybiAwXG4gIGlmICh0YXJnZXQubGVuZ3RoID09PSAwIHx8IHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm4gMFxuXG4gIC8vIEZhdGFsIGVycm9yIGNvbmRpdGlvbnNcbiAgaWYgKHRhcmdldFN0YXJ0IDwgMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCd0YXJnZXRTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgfVxuICBpZiAoc3RhcnQgPCAwIHx8IHN0YXJ0ID49IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbiAgaWYgKGVuZCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdzb3VyY2VFbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgLy8gQXJlIHdlIG9vYj9cbiAgaWYgKGVuZCA+IHRoaXMubGVuZ3RoKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0Lmxlbmd0aCAtIHRhcmdldFN0YXJ0IDwgZW5kIC0gc3RhcnQpIHtcbiAgICBlbmQgPSB0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0U3RhcnQgKyBzdGFydFxuICB9XG5cbiAgdmFyIGxlbiA9IGVuZCAtIHN0YXJ0XG5cbiAgaWYgKHRoaXMgPT09IHRhcmdldCAmJiB0eXBlb2YgVWludDhBcnJheS5wcm90b3R5cGUuY29weVdpdGhpbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIC8vIFVzZSBidWlsdC1pbiB3aGVuIGF2YWlsYWJsZSwgbWlzc2luZyBmcm9tIElFMTFcbiAgICB0aGlzLmNvcHlXaXRoaW4odGFyZ2V0U3RhcnQsIHN0YXJ0LCBlbmQpXG4gIH0gZWxzZSBpZiAodGhpcyA9PT0gdGFyZ2V0ICYmIHN0YXJ0IDwgdGFyZ2V0U3RhcnQgJiYgdGFyZ2V0U3RhcnQgPCBlbmQpIHtcbiAgICAvLyBkZXNjZW5kaW5nIGNvcHkgZnJvbSBlbmRcbiAgICBmb3IgKHZhciBpID0gbGVuIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgIHRhcmdldFtpICsgdGFyZ2V0U3RhcnRdID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIFVpbnQ4QXJyYXkucHJvdG90eXBlLnNldC5jYWxsKFxuICAgICAgdGFyZ2V0LFxuICAgICAgdGhpcy5zdWJhcnJheShzdGFydCwgZW5kKSxcbiAgICAgIHRhcmdldFN0YXJ0XG4gICAgKVxuICB9XG5cbiAgcmV0dXJuIGxlblxufVxuXG4vLyBVc2FnZTpcbi8vICAgIGJ1ZmZlci5maWxsKG51bWJlclssIG9mZnNldFssIGVuZF1dKVxuLy8gICAgYnVmZmVyLmZpbGwoYnVmZmVyWywgb2Zmc2V0WywgZW5kXV0pXG4vLyAgICBidWZmZXIuZmlsbChzdHJpbmdbLCBvZmZzZXRbLCBlbmRdXVssIGVuY29kaW5nXSlcbkJ1ZmZlci5wcm90b3R5cGUuZmlsbCA9IGZ1bmN0aW9uIGZpbGwgKHZhbCwgc3RhcnQsIGVuZCwgZW5jb2RpbmcpIHtcbiAgLy8gSGFuZGxlIHN0cmluZyBjYXNlczpcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnKSB7XG4gICAgaWYgKHR5cGVvZiBzdGFydCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGVuY29kaW5nID0gc3RhcnRcbiAgICAgIHN0YXJ0ID0gMFxuICAgICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBlbmQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBlbmNvZGluZyA9IGVuZFxuICAgICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgICB9XG4gICAgaWYgKGVuY29kaW5nICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIGVuY29kaW5nICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignZW5jb2RpbmcgbXVzdCBiZSBhIHN0cmluZycpXG4gICAgfVxuICAgIGlmICh0eXBlb2YgZW5jb2RpbmcgPT09ICdzdHJpbmcnICYmICFCdWZmZXIuaXNFbmNvZGluZyhlbmNvZGluZykpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICB9XG4gICAgaWYgKHZhbC5sZW5ndGggPT09IDEpIHtcbiAgICAgIHZhciBjb2RlID0gdmFsLmNoYXJDb2RlQXQoMClcbiAgICAgIGlmICgoZW5jb2RpbmcgPT09ICd1dGY4JyAmJiBjb2RlIDwgMTI4KSB8fFxuICAgICAgICAgIGVuY29kaW5nID09PSAnbGF0aW4xJykge1xuICAgICAgICAvLyBGYXN0IHBhdGg6IElmIGB2YWxgIGZpdHMgaW50byBhIHNpbmdsZSBieXRlLCB1c2UgdGhhdCBudW1lcmljIHZhbHVlLlxuICAgICAgICB2YWwgPSBjb2RlXG4gICAgICB9XG4gICAgfVxuICB9IGVsc2UgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgdmFsID0gdmFsICYgMjU1XG4gIH1cblxuICAvLyBJbnZhbGlkIHJhbmdlcyBhcmUgbm90IHNldCB0byBhIGRlZmF1bHQsIHNvIGNhbiByYW5nZSBjaGVjayBlYXJseS5cbiAgaWYgKHN0YXJ0IDwgMCB8fCB0aGlzLmxlbmd0aCA8IHN0YXJ0IHx8IHRoaXMubGVuZ3RoIDwgZW5kKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ091dCBvZiByYW5nZSBpbmRleCcpXG4gIH1cblxuICBpZiAoZW5kIDw9IHN0YXJ0KSB7XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHN0YXJ0ID0gc3RhcnQgPj4+IDBcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgPyB0aGlzLmxlbmd0aCA6IGVuZCA+Pj4gMFxuXG4gIGlmICghdmFsKSB2YWwgPSAwXG5cbiAgdmFyIGlcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgZm9yIChpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgICAgdGhpc1tpXSA9IHZhbFxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YXIgYnl0ZXMgPSBCdWZmZXIuaXNCdWZmZXIodmFsKVxuICAgICAgPyB2YWxcbiAgICAgIDogQnVmZmVyLmZyb20odmFsLCBlbmNvZGluZylcbiAgICB2YXIgbGVuID0gYnl0ZXMubGVuZ3RoXG4gICAgaWYgKGxlbiA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIHZhbHVlIFwiJyArIHZhbCArXG4gICAgICAgICdcIiBpcyBpbnZhbGlkIGZvciBhcmd1bWVudCBcInZhbHVlXCInKVxuICAgIH1cbiAgICBmb3IgKGkgPSAwOyBpIDwgZW5kIC0gc3RhcnQ7ICsraSkge1xuICAgICAgdGhpc1tpICsgc3RhcnRdID0gYnl0ZXNbaSAlIGxlbl1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG4vLyBIRUxQRVIgRlVOQ1RJT05TXG4vLyA9PT09PT09PT09PT09PT09XG5cbnZhciBJTlZBTElEX0JBU0U2NF9SRSA9IC9bXisvMC05QS1aYS16LV9dL2dcblxuZnVuY3Rpb24gYmFzZTY0Y2xlYW4gKHN0cikge1xuICAvLyBOb2RlIHRha2VzIGVxdWFsIHNpZ25zIGFzIGVuZCBvZiB0aGUgQmFzZTY0IGVuY29kaW5nXG4gIHN0ciA9IHN0ci5zcGxpdCgnPScpWzBdXG4gIC8vIE5vZGUgc3RyaXBzIG91dCBpbnZhbGlkIGNoYXJhY3RlcnMgbGlrZSBcXG4gYW5kIFxcdCBmcm9tIHRoZSBzdHJpbmcsIGJhc2U2NC1qcyBkb2VzIG5vdFxuICBzdHIgPSBzdHIudHJpbSgpLnJlcGxhY2UoSU5WQUxJRF9CQVNFNjRfUkUsICcnKVxuICAvLyBOb2RlIGNvbnZlcnRzIHN0cmluZ3Mgd2l0aCBsZW5ndGggPCAyIHRvICcnXG4gIGlmIChzdHIubGVuZ3RoIDwgMikgcmV0dXJuICcnXG4gIC8vIE5vZGUgYWxsb3dzIGZvciBub24tcGFkZGVkIGJhc2U2NCBzdHJpbmdzIChtaXNzaW5nIHRyYWlsaW5nID09PSksIGJhc2U2NC1qcyBkb2VzIG5vdFxuICB3aGlsZSAoc3RyLmxlbmd0aCAlIDQgIT09IDApIHtcbiAgICBzdHIgPSBzdHIgKyAnPSdcbiAgfVxuICByZXR1cm4gc3RyXG59XG5cbmZ1bmN0aW9uIHRvSGV4IChuKSB7XG4gIGlmIChuIDwgMTYpIHJldHVybiAnMCcgKyBuLnRvU3RyaW5nKDE2KVxuICByZXR1cm4gbi50b1N0cmluZygxNilcbn1cblxuZnVuY3Rpb24gdXRmOFRvQnl0ZXMgKHN0cmluZywgdW5pdHMpIHtcbiAgdW5pdHMgPSB1bml0cyB8fCBJbmZpbml0eVxuICB2YXIgY29kZVBvaW50XG4gIHZhciBsZW5ndGggPSBzdHJpbmcubGVuZ3RoXG4gIHZhciBsZWFkU3Vycm9nYXRlID0gbnVsbFxuICB2YXIgYnl0ZXMgPSBbXVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICBjb2RlUG9pbnQgPSBzdHJpbmcuY2hhckNvZGVBdChpKVxuXG4gICAgLy8gaXMgc3Vycm9nYXRlIGNvbXBvbmVudFxuICAgIGlmIChjb2RlUG9pbnQgPiAweEQ3RkYgJiYgY29kZVBvaW50IDwgMHhFMDAwKSB7XG4gICAgICAvLyBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKCFsZWFkU3Vycm9nYXRlKSB7XG4gICAgICAgIC8vIG5vIGxlYWQgeWV0XG4gICAgICAgIGlmIChjb2RlUG9pbnQgPiAweERCRkYpIHtcbiAgICAgICAgICAvLyB1bmV4cGVjdGVkIHRyYWlsXG4gICAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfSBlbHNlIGlmIChpICsgMSA9PT0gbGVuZ3RoKSB7XG4gICAgICAgICAgLy8gdW5wYWlyZWQgbGVhZFxuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICAvLyB2YWxpZCBsZWFkXG4gICAgICAgIGxlYWRTdXJyb2dhdGUgPSBjb2RlUG9pbnRcblxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyAyIGxlYWRzIGluIGEgcm93XG4gICAgICBpZiAoY29kZVBvaW50IDwgMHhEQzAwKSB7XG4gICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIHZhbGlkIHN1cnJvZ2F0ZSBwYWlyXG4gICAgICBjb2RlUG9pbnQgPSAobGVhZFN1cnJvZ2F0ZSAtIDB4RDgwMCA8PCAxMCB8IGNvZGVQb2ludCAtIDB4REMwMCkgKyAweDEwMDAwXG4gICAgfSBlbHNlIGlmIChsZWFkU3Vycm9nYXRlKSB7XG4gICAgICAvLyB2YWxpZCBibXAgY2hhciwgYnV0IGxhc3QgY2hhciB3YXMgYSBsZWFkXG4gICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICB9XG5cbiAgICBsZWFkU3Vycm9nYXRlID0gbnVsbFxuXG4gICAgLy8gZW5jb2RlIHV0ZjhcbiAgICBpZiAoY29kZVBvaW50IDwgMHg4MCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAxKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKGNvZGVQb2ludClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4ODAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgfCAweEMwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHgxMDAwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAzKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHhDIHwgMHhFMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHgxMTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gNCkgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4MTIgfCAweEYwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHhDICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGNvZGUgcG9pbnQnKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBieXRlc1xufVxuXG5mdW5jdGlvbiBhc2NpaVRvQnl0ZXMgKHN0cikge1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyArK2kpIHtcbiAgICAvLyBOb2RlJ3MgY29kZSBzZWVtcyB0byBiZSBkb2luZyB0aGlzIGFuZCBub3QgJiAweDdGLi5cbiAgICBieXRlQXJyYXkucHVzaChzdHIuY2hhckNvZGVBdChpKSAmIDB4RkYpXG4gIH1cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiB1dGYxNmxlVG9CeXRlcyAoc3RyLCB1bml0cykge1xuICB2YXIgYywgaGksIGxvXG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7ICsraSkge1xuICAgIGlmICgodW5pdHMgLT0gMikgPCAwKSBicmVha1xuXG4gICAgYyA9IHN0ci5jaGFyQ29kZUF0KGkpXG4gICAgaGkgPSBjID4+IDhcbiAgICBsbyA9IGMgJSAyNTZcbiAgICBieXRlQXJyYXkucHVzaChsbylcbiAgICBieXRlQXJyYXkucHVzaChoaSlcbiAgfVxuXG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gYmFzZTY0VG9CeXRlcyAoc3RyKSB7XG4gIHJldHVybiBiYXNlNjQudG9CeXRlQXJyYXkoYmFzZTY0Y2xlYW4oc3RyKSlcbn1cblxuZnVuY3Rpb24gYmxpdEJ1ZmZlciAoc3JjLCBkc3QsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoKGkgKyBvZmZzZXQgPj0gZHN0Lmxlbmd0aCkgfHwgKGkgPj0gc3JjLmxlbmd0aCkpIGJyZWFrXG4gICAgZHN0W2kgKyBvZmZzZXRdID0gc3JjW2ldXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuLy8gQXJyYXlCdWZmZXIgb3IgVWludDhBcnJheSBvYmplY3RzIGZyb20gb3RoZXIgY29udGV4dHMgKGkuZS4gaWZyYW1lcykgZG8gbm90IHBhc3Ncbi8vIHRoZSBgaW5zdGFuY2VvZmAgY2hlY2sgYnV0IHRoZXkgc2hvdWxkIGJlIHRyZWF0ZWQgYXMgb2YgdGhhdCB0eXBlLlxuLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9pc3N1ZXMvMTY2XG5mdW5jdGlvbiBpc0luc3RhbmNlIChvYmosIHR5cGUpIHtcbiAgcmV0dXJuIG9iaiBpbnN0YW5jZW9mIHR5cGUgfHxcbiAgICAob2JqICE9IG51bGwgJiYgb2JqLmNvbnN0cnVjdG9yICE9IG51bGwgJiYgb2JqLmNvbnN0cnVjdG9yLm5hbWUgIT0gbnVsbCAmJlxuICAgICAgb2JqLmNvbnN0cnVjdG9yLm5hbWUgPT09IHR5cGUubmFtZSlcbn1cbmZ1bmN0aW9uIG51bWJlcklzTmFOIChvYmopIHtcbiAgLy8gRm9yIElFMTEgc3VwcG9ydFxuICByZXR1cm4gb2JqICE9PSBvYmogLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1zZWxmLWNvbXBhcmVcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEdldEludHJpbnNpYyA9IHJlcXVpcmUoJ2dldC1pbnRyaW5zaWMnKTtcblxudmFyIGNhbGxCaW5kID0gcmVxdWlyZSgnLi8nKTtcblxudmFyICRpbmRleE9mID0gY2FsbEJpbmQoR2V0SW50cmluc2ljKCdTdHJpbmcucHJvdG90eXBlLmluZGV4T2YnKSk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gY2FsbEJvdW5kSW50cmluc2ljKG5hbWUsIGFsbG93TWlzc2luZykge1xuXHR2YXIgaW50cmluc2ljID0gR2V0SW50cmluc2ljKG5hbWUsICEhYWxsb3dNaXNzaW5nKTtcblx0aWYgKHR5cGVvZiBpbnRyaW5zaWMgPT09ICdmdW5jdGlvbicgJiYgJGluZGV4T2YobmFtZSwgJy5wcm90b3R5cGUuJykgPiAtMSkge1xuXHRcdHJldHVybiBjYWxsQmluZChpbnRyaW5zaWMpO1xuXHR9XG5cdHJldHVybiBpbnRyaW5zaWM7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgYmluZCA9IHJlcXVpcmUoJ2Z1bmN0aW9uLWJpbmQnKTtcbnZhciBHZXRJbnRyaW5zaWMgPSByZXF1aXJlKCdnZXQtaW50cmluc2ljJyk7XG5cbnZhciAkYXBwbHkgPSBHZXRJbnRyaW5zaWMoJyVGdW5jdGlvbi5wcm90b3R5cGUuYXBwbHklJyk7XG52YXIgJGNhbGwgPSBHZXRJbnRyaW5zaWMoJyVGdW5jdGlvbi5wcm90b3R5cGUuY2FsbCUnKTtcbnZhciAkcmVmbGVjdEFwcGx5ID0gR2V0SW50cmluc2ljKCclUmVmbGVjdC5hcHBseSUnLCB0cnVlKSB8fCBiaW5kLmNhbGwoJGNhbGwsICRhcHBseSk7XG5cbnZhciAkZ09QRCA9IEdldEludHJpbnNpYygnJU9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IlJywgdHJ1ZSk7XG52YXIgJGRlZmluZVByb3BlcnR5ID0gR2V0SW50cmluc2ljKCclT2JqZWN0LmRlZmluZVByb3BlcnR5JScsIHRydWUpO1xudmFyICRtYXggPSBHZXRJbnRyaW5zaWMoJyVNYXRoLm1heCUnKTtcblxuaWYgKCRkZWZpbmVQcm9wZXJ0eSkge1xuXHR0cnkge1xuXHRcdCRkZWZpbmVQcm9wZXJ0eSh7fSwgJ2EnLCB7IHZhbHVlOiAxIH0pO1xuXHR9IGNhdGNoIChlKSB7XG5cdFx0Ly8gSUUgOCBoYXMgYSBicm9rZW4gZGVmaW5lUHJvcGVydHlcblx0XHQkZGVmaW5lUHJvcGVydHkgPSBudWxsO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gY2FsbEJpbmQob3JpZ2luYWxGdW5jdGlvbikge1xuXHR2YXIgZnVuYyA9ICRyZWZsZWN0QXBwbHkoYmluZCwgJGNhbGwsIGFyZ3VtZW50cyk7XG5cdGlmICgkZ09QRCAmJiAkZGVmaW5lUHJvcGVydHkpIHtcblx0XHR2YXIgZGVzYyA9ICRnT1BEKGZ1bmMsICdsZW5ndGgnKTtcblx0XHRpZiAoZGVzYy5jb25maWd1cmFibGUpIHtcblx0XHRcdC8vIG9yaWdpbmFsIGxlbmd0aCwgcGx1cyB0aGUgcmVjZWl2ZXIsIG1pbnVzIGFueSBhZGRpdGlvbmFsIGFyZ3VtZW50cyAoYWZ0ZXIgdGhlIHJlY2VpdmVyKVxuXHRcdFx0JGRlZmluZVByb3BlcnR5KFxuXHRcdFx0XHRmdW5jLFxuXHRcdFx0XHQnbGVuZ3RoJyxcblx0XHRcdFx0eyB2YWx1ZTogMSArICRtYXgoMCwgb3JpZ2luYWxGdW5jdGlvbi5sZW5ndGggLSAoYXJndW1lbnRzLmxlbmd0aCAtIDEpKSB9XG5cdFx0XHQpO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gZnVuYztcbn07XG5cbnZhciBhcHBseUJpbmQgPSBmdW5jdGlvbiBhcHBseUJpbmQoKSB7XG5cdHJldHVybiAkcmVmbGVjdEFwcGx5KGJpbmQsICRhcHBseSwgYXJndW1lbnRzKTtcbn07XG5cbmlmICgkZGVmaW5lUHJvcGVydHkpIHtcblx0JGRlZmluZVByb3BlcnR5KG1vZHVsZS5leHBvcnRzLCAnYXBwbHknLCB7IHZhbHVlOiBhcHBseUJpbmQgfSk7XG59IGVsc2Uge1xuXHRtb2R1bGUuZXhwb3J0cy5hcHBseSA9IGFwcGx5QmluZDtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGlzQ2FsbGFibGUgPSByZXF1aXJlKCdpcy1jYWxsYWJsZScpO1xuXG52YXIgdG9TdHIgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xudmFyIGhhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxudmFyIGZvckVhY2hBcnJheSA9IGZ1bmN0aW9uIGZvckVhY2hBcnJheShhcnJheSwgaXRlcmF0b3IsIHJlY2VpdmVyKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGFycmF5Lmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGlmIChoYXNPd25Qcm9wZXJ0eS5jYWxsKGFycmF5LCBpKSkge1xuICAgICAgICAgICAgaWYgKHJlY2VpdmVyID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpdGVyYXRvcihhcnJheVtpXSwgaSwgYXJyYXkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpdGVyYXRvci5jYWxsKHJlY2VpdmVyLCBhcnJheVtpXSwgaSwgYXJyYXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxudmFyIGZvckVhY2hTdHJpbmcgPSBmdW5jdGlvbiBmb3JFYWNoU3RyaW5nKHN0cmluZywgaXRlcmF0b3IsIHJlY2VpdmVyKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHN0cmluZy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAvLyBubyBzdWNoIHRoaW5nIGFzIGEgc3BhcnNlIHN0cmluZy5cbiAgICAgICAgaWYgKHJlY2VpdmVyID09IG51bGwpIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKHN0cmluZy5jaGFyQXQoaSksIGksIHN0cmluZyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpdGVyYXRvci5jYWxsKHJlY2VpdmVyLCBzdHJpbmcuY2hhckF0KGkpLCBpLCBzdHJpbmcpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxudmFyIGZvckVhY2hPYmplY3QgPSBmdW5jdGlvbiBmb3JFYWNoT2JqZWN0KG9iamVjdCwgaXRlcmF0b3IsIHJlY2VpdmVyKSB7XG4gICAgZm9yICh2YXIgayBpbiBvYmplY3QpIHtcbiAgICAgICAgaWYgKGhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBrKSkge1xuICAgICAgICAgICAgaWYgKHJlY2VpdmVyID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpdGVyYXRvcihvYmplY3Rba10sIGssIG9iamVjdCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGl0ZXJhdG9yLmNhbGwocmVjZWl2ZXIsIG9iamVjdFtrXSwgaywgb2JqZWN0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbnZhciBmb3JFYWNoID0gZnVuY3Rpb24gZm9yRWFjaChsaXN0LCBpdGVyYXRvciwgdGhpc0FyZykge1xuICAgIGlmICghaXNDYWxsYWJsZShpdGVyYXRvcikpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignaXRlcmF0b3IgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgdmFyIHJlY2VpdmVyO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDMpIHtcbiAgICAgICAgcmVjZWl2ZXIgPSB0aGlzQXJnO1xuICAgIH1cblxuICAgIGlmICh0b1N0ci5jYWxsKGxpc3QpID09PSAnW29iamVjdCBBcnJheV0nKSB7XG4gICAgICAgIGZvckVhY2hBcnJheShsaXN0LCBpdGVyYXRvciwgcmVjZWl2ZXIpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGxpc3QgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGZvckVhY2hTdHJpbmcobGlzdCwgaXRlcmF0b3IsIHJlY2VpdmVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3JFYWNoT2JqZWN0KGxpc3QsIGl0ZXJhdG9yLCByZWNlaXZlcik7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmb3JFYWNoO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiBlc2xpbnQgbm8taW52YWxpZC10aGlzOiAxICovXG5cbnZhciBFUlJPUl9NRVNTQUdFID0gJ0Z1bmN0aW9uLnByb3RvdHlwZS5iaW5kIGNhbGxlZCBvbiBpbmNvbXBhdGlibGUgJztcbnZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcbnZhciB0b1N0ciA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG52YXIgZnVuY1R5cGUgPSAnW29iamVjdCBGdW5jdGlvbl0nO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGJpbmQodGhhdCkge1xuICAgIHZhciB0YXJnZXQgPSB0aGlzO1xuICAgIGlmICh0eXBlb2YgdGFyZ2V0ICE9PSAnZnVuY3Rpb24nIHx8IHRvU3RyLmNhbGwodGFyZ2V0KSAhPT0gZnVuY1R5cGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihFUlJPUl9NRVNTQUdFICsgdGFyZ2V0KTtcbiAgICB9XG4gICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cbiAgICB2YXIgYm91bmQ7XG4gICAgdmFyIGJpbmRlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMgaW5zdGFuY2VvZiBib3VuZCkge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IHRhcmdldC5hcHBseShcbiAgICAgICAgICAgICAgICB0aGlzLFxuICAgICAgICAgICAgICAgIGFyZ3MuY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSlcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBpZiAoT2JqZWN0KHJlc3VsdCkgPT09IHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0YXJnZXQuYXBwbHkoXG4gICAgICAgICAgICAgICAgdGhhdCxcbiAgICAgICAgICAgICAgICBhcmdzLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBib3VuZExlbmd0aCA9IE1hdGgubWF4KDAsIHRhcmdldC5sZW5ndGggLSBhcmdzLmxlbmd0aCk7XG4gICAgdmFyIGJvdW5kQXJncyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYm91bmRMZW5ndGg7IGkrKykge1xuICAgICAgICBib3VuZEFyZ3MucHVzaCgnJCcgKyBpKTtcbiAgICB9XG5cbiAgICBib3VuZCA9IEZ1bmN0aW9uKCdiaW5kZXInLCAncmV0dXJuIGZ1bmN0aW9uICgnICsgYm91bmRBcmdzLmpvaW4oJywnKSArICcpeyByZXR1cm4gYmluZGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTsgfScpKGJpbmRlcik7XG5cbiAgICBpZiAodGFyZ2V0LnByb3RvdHlwZSkge1xuICAgICAgICB2YXIgRW1wdHkgPSBmdW5jdGlvbiBFbXB0eSgpIHt9O1xuICAgICAgICBFbXB0eS5wcm90b3R5cGUgPSB0YXJnZXQucHJvdG90eXBlO1xuICAgICAgICBib3VuZC5wcm90b3R5cGUgPSBuZXcgRW1wdHkoKTtcbiAgICAgICAgRW1wdHkucHJvdG90eXBlID0gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gYm91bmQ7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaW1wbGVtZW50YXRpb24gPSByZXF1aXJlKCcuL2ltcGxlbWVudGF0aW9uJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQgfHwgaW1wbGVtZW50YXRpb247XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1bmRlZmluZWQ7XG5cbnZhciAkU3ludGF4RXJyb3IgPSBTeW50YXhFcnJvcjtcbnZhciAkRnVuY3Rpb24gPSBGdW5jdGlvbjtcbnZhciAkVHlwZUVycm9yID0gVHlwZUVycm9yO1xuXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgY29uc2lzdGVudC1yZXR1cm5cbnZhciBnZXRFdmFsbGVkQ29uc3RydWN0b3IgPSBmdW5jdGlvbiAoZXhwcmVzc2lvblN5bnRheCkge1xuXHR0cnkge1xuXHRcdHJldHVybiAkRnVuY3Rpb24oJ1widXNlIHN0cmljdFwiOyByZXR1cm4gKCcgKyBleHByZXNzaW9uU3ludGF4ICsgJykuY29uc3RydWN0b3I7JykoKTtcblx0fSBjYXRjaCAoZSkge31cbn07XG5cbnZhciAkZ09QRCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3I7XG5pZiAoJGdPUEQpIHtcblx0dHJ5IHtcblx0XHQkZ09QRCh7fSwgJycpO1xuXHR9IGNhdGNoIChlKSB7XG5cdFx0JGdPUEQgPSBudWxsOyAvLyB0aGlzIGlzIElFIDgsIHdoaWNoIGhhcyBhIGJyb2tlbiBnT1BEXG5cdH1cbn1cblxudmFyIHRocm93VHlwZUVycm9yID0gZnVuY3Rpb24gKCkge1xuXHR0aHJvdyBuZXcgJFR5cGVFcnJvcigpO1xufTtcbnZhciBUaHJvd1R5cGVFcnJvciA9ICRnT1BEXG5cdD8gKGZ1bmN0aW9uICgpIHtcblx0XHR0cnkge1xuXHRcdFx0Ly8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXVudXNlZC1leHByZXNzaW9ucywgbm8tY2FsbGVyLCBuby1yZXN0cmljdGVkLXByb3BlcnRpZXNcblx0XHRcdGFyZ3VtZW50cy5jYWxsZWU7IC8vIElFIDggZG9lcyBub3QgdGhyb3cgaGVyZVxuXHRcdFx0cmV0dXJuIHRocm93VHlwZUVycm9yO1xuXHRcdH0gY2F0Y2ggKGNhbGxlZVRocm93cykge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0Ly8gSUUgOCB0aHJvd3Mgb24gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihhcmd1bWVudHMsICcnKVxuXHRcdFx0XHRyZXR1cm4gJGdPUEQoYXJndW1lbnRzLCAnY2FsbGVlJykuZ2V0O1xuXHRcdFx0fSBjYXRjaCAoZ09QRHRocm93cykge1xuXHRcdFx0XHRyZXR1cm4gdGhyb3dUeXBlRXJyb3I7XG5cdFx0XHR9XG5cdFx0fVxuXHR9KCkpXG5cdDogdGhyb3dUeXBlRXJyb3I7XG5cbnZhciBoYXNTeW1ib2xzID0gcmVxdWlyZSgnaGFzLXN5bWJvbHMnKSgpO1xuXG52YXIgZ2V0UHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YgfHwgZnVuY3Rpb24gKHgpIHsgcmV0dXJuIHguX19wcm90b19fOyB9OyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXByb3RvXG5cbnZhciBuZWVkc0V2YWwgPSB7fTtcblxudmFyIFR5cGVkQXJyYXkgPSB0eXBlb2YgVWludDhBcnJheSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBnZXRQcm90byhVaW50OEFycmF5KTtcblxudmFyIElOVFJJTlNJQ1MgPSB7XG5cdCclQWdncmVnYXRlRXJyb3IlJzogdHlwZW9mIEFnZ3JlZ2F0ZUVycm9yID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IEFnZ3JlZ2F0ZUVycm9yLFxuXHQnJUFycmF5JSc6IEFycmF5LFxuXHQnJUFycmF5QnVmZmVyJSc6IHR5cGVvZiBBcnJheUJ1ZmZlciA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBBcnJheUJ1ZmZlcixcblx0JyVBcnJheUl0ZXJhdG9yUHJvdG90eXBlJSc6IGhhc1N5bWJvbHMgPyBnZXRQcm90byhbXVtTeW1ib2wuaXRlcmF0b3JdKCkpIDogdW5kZWZpbmVkLFxuXHQnJUFzeW5jRnJvbVN5bmNJdGVyYXRvclByb3RvdHlwZSUnOiB1bmRlZmluZWQsXG5cdCclQXN5bmNGdW5jdGlvbiUnOiBuZWVkc0V2YWwsXG5cdCclQXN5bmNHZW5lcmF0b3IlJzogbmVlZHNFdmFsLFxuXHQnJUFzeW5jR2VuZXJhdG9yRnVuY3Rpb24lJzogbmVlZHNFdmFsLFxuXHQnJUFzeW5jSXRlcmF0b3JQcm90b3R5cGUlJzogbmVlZHNFdmFsLFxuXHQnJUF0b21pY3MlJzogdHlwZW9mIEF0b21pY3MgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogQXRvbWljcyxcblx0JyVCaWdJbnQlJzogdHlwZW9mIEJpZ0ludCA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBCaWdJbnQsXG5cdCclQmlnSW50NjRBcnJheSUnOiB0eXBlb2YgQmlnSW50NjRBcnJheSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBCaWdJbnQ2NEFycmF5LFxuXHQnJUJpZ1VpbnQ2NEFycmF5JSc6IHR5cGVvZiBCaWdVaW50NjRBcnJheSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBCaWdVaW50NjRBcnJheSxcblx0JyVCb29sZWFuJSc6IEJvb2xlYW4sXG5cdCclRGF0YVZpZXclJzogdHlwZW9mIERhdGFWaWV3ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IERhdGFWaWV3LFxuXHQnJURhdGUlJzogRGF0ZSxcblx0JyVkZWNvZGVVUkklJzogZGVjb2RlVVJJLFxuXHQnJWRlY29kZVVSSUNvbXBvbmVudCUnOiBkZWNvZGVVUklDb21wb25lbnQsXG5cdCclZW5jb2RlVVJJJSc6IGVuY29kZVVSSSxcblx0JyVlbmNvZGVVUklDb21wb25lbnQlJzogZW5jb2RlVVJJQ29tcG9uZW50LFxuXHQnJUVycm9yJSc6IEVycm9yLFxuXHQnJWV2YWwlJzogZXZhbCwgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1ldmFsXG5cdCclRXZhbEVycm9yJSc6IEV2YWxFcnJvcixcblx0JyVGbG9hdDMyQXJyYXklJzogdHlwZW9mIEZsb2F0MzJBcnJheSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBGbG9hdDMyQXJyYXksXG5cdCclRmxvYXQ2NEFycmF5JSc6IHR5cGVvZiBGbG9hdDY0QXJyYXkgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogRmxvYXQ2NEFycmF5LFxuXHQnJUZpbmFsaXphdGlvblJlZ2lzdHJ5JSc6IHR5cGVvZiBGaW5hbGl6YXRpb25SZWdpc3RyeSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBGaW5hbGl6YXRpb25SZWdpc3RyeSxcblx0JyVGdW5jdGlvbiUnOiAkRnVuY3Rpb24sXG5cdCclR2VuZXJhdG9yRnVuY3Rpb24lJzogbmVlZHNFdmFsLFxuXHQnJUludDhBcnJheSUnOiB0eXBlb2YgSW50OEFycmF5ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IEludDhBcnJheSxcblx0JyVJbnQxNkFycmF5JSc6IHR5cGVvZiBJbnQxNkFycmF5ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IEludDE2QXJyYXksXG5cdCclSW50MzJBcnJheSUnOiB0eXBlb2YgSW50MzJBcnJheSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBJbnQzMkFycmF5LFxuXHQnJWlzRmluaXRlJSc6IGlzRmluaXRlLFxuXHQnJWlzTmFOJSc6IGlzTmFOLFxuXHQnJUl0ZXJhdG9yUHJvdG90eXBlJSc6IGhhc1N5bWJvbHMgPyBnZXRQcm90byhnZXRQcm90byhbXVtTeW1ib2wuaXRlcmF0b3JdKCkpKSA6IHVuZGVmaW5lZCxcblx0JyVKU09OJSc6IHR5cGVvZiBKU09OID09PSAnb2JqZWN0JyA/IEpTT04gOiB1bmRlZmluZWQsXG5cdCclTWFwJSc6IHR5cGVvZiBNYXAgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogTWFwLFxuXHQnJU1hcEl0ZXJhdG9yUHJvdG90eXBlJSc6IHR5cGVvZiBNYXAgPT09ICd1bmRlZmluZWQnIHx8ICFoYXNTeW1ib2xzID8gdW5kZWZpbmVkIDogZ2V0UHJvdG8obmV3IE1hcCgpW1N5bWJvbC5pdGVyYXRvcl0oKSksXG5cdCclTWF0aCUnOiBNYXRoLFxuXHQnJU51bWJlciUnOiBOdW1iZXIsXG5cdCclT2JqZWN0JSc6IE9iamVjdCxcblx0JyVwYXJzZUZsb2F0JSc6IHBhcnNlRmxvYXQsXG5cdCclcGFyc2VJbnQlJzogcGFyc2VJbnQsXG5cdCclUHJvbWlzZSUnOiB0eXBlb2YgUHJvbWlzZSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBQcm9taXNlLFxuXHQnJVByb3h5JSc6IHR5cGVvZiBQcm94eSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBQcm94eSxcblx0JyVSYW5nZUVycm9yJSc6IFJhbmdlRXJyb3IsXG5cdCclUmVmZXJlbmNlRXJyb3IlJzogUmVmZXJlbmNlRXJyb3IsXG5cdCclUmVmbGVjdCUnOiB0eXBlb2YgUmVmbGVjdCA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBSZWZsZWN0LFxuXHQnJVJlZ0V4cCUnOiBSZWdFeHAsXG5cdCclU2V0JSc6IHR5cGVvZiBTZXQgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogU2V0LFxuXHQnJVNldEl0ZXJhdG9yUHJvdG90eXBlJSc6IHR5cGVvZiBTZXQgPT09ICd1bmRlZmluZWQnIHx8ICFoYXNTeW1ib2xzID8gdW5kZWZpbmVkIDogZ2V0UHJvdG8obmV3IFNldCgpW1N5bWJvbC5pdGVyYXRvcl0oKSksXG5cdCclU2hhcmVkQXJyYXlCdWZmZXIlJzogdHlwZW9mIFNoYXJlZEFycmF5QnVmZmVyID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IFNoYXJlZEFycmF5QnVmZmVyLFxuXHQnJVN0cmluZyUnOiBTdHJpbmcsXG5cdCclU3RyaW5nSXRlcmF0b3JQcm90b3R5cGUlJzogaGFzU3ltYm9scyA/IGdldFByb3RvKCcnW1N5bWJvbC5pdGVyYXRvcl0oKSkgOiB1bmRlZmluZWQsXG5cdCclU3ltYm9sJSc6IGhhc1N5bWJvbHMgPyBTeW1ib2wgOiB1bmRlZmluZWQsXG5cdCclU3ludGF4RXJyb3IlJzogJFN5bnRheEVycm9yLFxuXHQnJVRocm93VHlwZUVycm9yJSc6IFRocm93VHlwZUVycm9yLFxuXHQnJVR5cGVkQXJyYXklJzogVHlwZWRBcnJheSxcblx0JyVUeXBlRXJyb3IlJzogJFR5cGVFcnJvcixcblx0JyVVaW50OEFycmF5JSc6IHR5cGVvZiBVaW50OEFycmF5ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IFVpbnQ4QXJyYXksXG5cdCclVWludDhDbGFtcGVkQXJyYXklJzogdHlwZW9mIFVpbnQ4Q2xhbXBlZEFycmF5ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IFVpbnQ4Q2xhbXBlZEFycmF5LFxuXHQnJVVpbnQxNkFycmF5JSc6IHR5cGVvZiBVaW50MTZBcnJheSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBVaW50MTZBcnJheSxcblx0JyVVaW50MzJBcnJheSUnOiB0eXBlb2YgVWludDMyQXJyYXkgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogVWludDMyQXJyYXksXG5cdCclVVJJRXJyb3IlJzogVVJJRXJyb3IsXG5cdCclV2Vha01hcCUnOiB0eXBlb2YgV2Vha01hcCA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBXZWFrTWFwLFxuXHQnJVdlYWtSZWYlJzogdHlwZW9mIFdlYWtSZWYgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogV2Vha1JlZixcblx0JyVXZWFrU2V0JSc6IHR5cGVvZiBXZWFrU2V0ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IFdlYWtTZXRcbn07XG5cbnRyeSB7XG5cdG51bGwuZXJyb3I7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tdW51c2VkLWV4cHJlc3Npb25zXG59IGNhdGNoIChlKSB7XG5cdC8vIGh0dHBzOi8vZ2l0aHViLmNvbS90YzM5L3Byb3Bvc2FsLXNoYWRvd3JlYWxtL3B1bGwvMzg0I2lzc3VlY29tbWVudC0xMzY0MjY0MjI5XG5cdHZhciBlcnJvclByb3RvID0gZ2V0UHJvdG8oZ2V0UHJvdG8oZSkpO1xuXHRJTlRSSU5TSUNTWyclRXJyb3IucHJvdG90eXBlJSddID0gZXJyb3JQcm90bztcbn1cblxudmFyIGRvRXZhbCA9IGZ1bmN0aW9uIGRvRXZhbChuYW1lKSB7XG5cdHZhciB2YWx1ZTtcblx0aWYgKG5hbWUgPT09ICclQXN5bmNGdW5jdGlvbiUnKSB7XG5cdFx0dmFsdWUgPSBnZXRFdmFsbGVkQ29uc3RydWN0b3IoJ2FzeW5jIGZ1bmN0aW9uICgpIHt9Jyk7XG5cdH0gZWxzZSBpZiAobmFtZSA9PT0gJyVHZW5lcmF0b3JGdW5jdGlvbiUnKSB7XG5cdFx0dmFsdWUgPSBnZXRFdmFsbGVkQ29uc3RydWN0b3IoJ2Z1bmN0aW9uKiAoKSB7fScpO1xuXHR9IGVsc2UgaWYgKG5hbWUgPT09ICclQXN5bmNHZW5lcmF0b3JGdW5jdGlvbiUnKSB7XG5cdFx0dmFsdWUgPSBnZXRFdmFsbGVkQ29uc3RydWN0b3IoJ2FzeW5jIGZ1bmN0aW9uKiAoKSB7fScpO1xuXHR9IGVsc2UgaWYgKG5hbWUgPT09ICclQXN5bmNHZW5lcmF0b3IlJykge1xuXHRcdHZhciBmbiA9IGRvRXZhbCgnJUFzeW5jR2VuZXJhdG9yRnVuY3Rpb24lJyk7XG5cdFx0aWYgKGZuKSB7XG5cdFx0XHR2YWx1ZSA9IGZuLnByb3RvdHlwZTtcblx0XHR9XG5cdH0gZWxzZSBpZiAobmFtZSA9PT0gJyVBc3luY0l0ZXJhdG9yUHJvdG90eXBlJScpIHtcblx0XHR2YXIgZ2VuID0gZG9FdmFsKCclQXN5bmNHZW5lcmF0b3IlJyk7XG5cdFx0aWYgKGdlbikge1xuXHRcdFx0dmFsdWUgPSBnZXRQcm90byhnZW4ucHJvdG90eXBlKTtcblx0XHR9XG5cdH1cblxuXHRJTlRSSU5TSUNTW25hbWVdID0gdmFsdWU7XG5cblx0cmV0dXJuIHZhbHVlO1xufTtcblxudmFyIExFR0FDWV9BTElBU0VTID0ge1xuXHQnJUFycmF5QnVmZmVyUHJvdG90eXBlJSc6IFsnQXJyYXlCdWZmZXInLCAncHJvdG90eXBlJ10sXG5cdCclQXJyYXlQcm90b3R5cGUlJzogWydBcnJheScsICdwcm90b3R5cGUnXSxcblx0JyVBcnJheVByb3RvX2VudHJpZXMlJzogWydBcnJheScsICdwcm90b3R5cGUnLCAnZW50cmllcyddLFxuXHQnJUFycmF5UHJvdG9fZm9yRWFjaCUnOiBbJ0FycmF5JywgJ3Byb3RvdHlwZScsICdmb3JFYWNoJ10sXG5cdCclQXJyYXlQcm90b19rZXlzJSc6IFsnQXJyYXknLCAncHJvdG90eXBlJywgJ2tleXMnXSxcblx0JyVBcnJheVByb3RvX3ZhbHVlcyUnOiBbJ0FycmF5JywgJ3Byb3RvdHlwZScsICd2YWx1ZXMnXSxcblx0JyVBc3luY0Z1bmN0aW9uUHJvdG90eXBlJSc6IFsnQXN5bmNGdW5jdGlvbicsICdwcm90b3R5cGUnXSxcblx0JyVBc3luY0dlbmVyYXRvciUnOiBbJ0FzeW5jR2VuZXJhdG9yRnVuY3Rpb24nLCAncHJvdG90eXBlJ10sXG5cdCclQXN5bmNHZW5lcmF0b3JQcm90b3R5cGUlJzogWydBc3luY0dlbmVyYXRvckZ1bmN0aW9uJywgJ3Byb3RvdHlwZScsICdwcm90b3R5cGUnXSxcblx0JyVCb29sZWFuUHJvdG90eXBlJSc6IFsnQm9vbGVhbicsICdwcm90b3R5cGUnXSxcblx0JyVEYXRhVmlld1Byb3RvdHlwZSUnOiBbJ0RhdGFWaWV3JywgJ3Byb3RvdHlwZSddLFxuXHQnJURhdGVQcm90b3R5cGUlJzogWydEYXRlJywgJ3Byb3RvdHlwZSddLFxuXHQnJUVycm9yUHJvdG90eXBlJSc6IFsnRXJyb3InLCAncHJvdG90eXBlJ10sXG5cdCclRXZhbEVycm9yUHJvdG90eXBlJSc6IFsnRXZhbEVycm9yJywgJ3Byb3RvdHlwZSddLFxuXHQnJUZsb2F0MzJBcnJheVByb3RvdHlwZSUnOiBbJ0Zsb2F0MzJBcnJheScsICdwcm90b3R5cGUnXSxcblx0JyVGbG9hdDY0QXJyYXlQcm90b3R5cGUlJzogWydGbG9hdDY0QXJyYXknLCAncHJvdG90eXBlJ10sXG5cdCclRnVuY3Rpb25Qcm90b3R5cGUlJzogWydGdW5jdGlvbicsICdwcm90b3R5cGUnXSxcblx0JyVHZW5lcmF0b3IlJzogWydHZW5lcmF0b3JGdW5jdGlvbicsICdwcm90b3R5cGUnXSxcblx0JyVHZW5lcmF0b3JQcm90b3R5cGUlJzogWydHZW5lcmF0b3JGdW5jdGlvbicsICdwcm90b3R5cGUnLCAncHJvdG90eXBlJ10sXG5cdCclSW50OEFycmF5UHJvdG90eXBlJSc6IFsnSW50OEFycmF5JywgJ3Byb3RvdHlwZSddLFxuXHQnJUludDE2QXJyYXlQcm90b3R5cGUlJzogWydJbnQxNkFycmF5JywgJ3Byb3RvdHlwZSddLFxuXHQnJUludDMyQXJyYXlQcm90b3R5cGUlJzogWydJbnQzMkFycmF5JywgJ3Byb3RvdHlwZSddLFxuXHQnJUpTT05QYXJzZSUnOiBbJ0pTT04nLCAncGFyc2UnXSxcblx0JyVKU09OU3RyaW5naWZ5JSc6IFsnSlNPTicsICdzdHJpbmdpZnknXSxcblx0JyVNYXBQcm90b3R5cGUlJzogWydNYXAnLCAncHJvdG90eXBlJ10sXG5cdCclTnVtYmVyUHJvdG90eXBlJSc6IFsnTnVtYmVyJywgJ3Byb3RvdHlwZSddLFxuXHQnJU9iamVjdFByb3RvdHlwZSUnOiBbJ09iamVjdCcsICdwcm90b3R5cGUnXSxcblx0JyVPYmpQcm90b190b1N0cmluZyUnOiBbJ09iamVjdCcsICdwcm90b3R5cGUnLCAndG9TdHJpbmcnXSxcblx0JyVPYmpQcm90b192YWx1ZU9mJSc6IFsnT2JqZWN0JywgJ3Byb3RvdHlwZScsICd2YWx1ZU9mJ10sXG5cdCclUHJvbWlzZVByb3RvdHlwZSUnOiBbJ1Byb21pc2UnLCAncHJvdG90eXBlJ10sXG5cdCclUHJvbWlzZVByb3RvX3RoZW4lJzogWydQcm9taXNlJywgJ3Byb3RvdHlwZScsICd0aGVuJ10sXG5cdCclUHJvbWlzZV9hbGwlJzogWydQcm9taXNlJywgJ2FsbCddLFxuXHQnJVByb21pc2VfcmVqZWN0JSc6IFsnUHJvbWlzZScsICdyZWplY3QnXSxcblx0JyVQcm9taXNlX3Jlc29sdmUlJzogWydQcm9taXNlJywgJ3Jlc29sdmUnXSxcblx0JyVSYW5nZUVycm9yUHJvdG90eXBlJSc6IFsnUmFuZ2VFcnJvcicsICdwcm90b3R5cGUnXSxcblx0JyVSZWZlcmVuY2VFcnJvclByb3RvdHlwZSUnOiBbJ1JlZmVyZW5jZUVycm9yJywgJ3Byb3RvdHlwZSddLFxuXHQnJVJlZ0V4cFByb3RvdHlwZSUnOiBbJ1JlZ0V4cCcsICdwcm90b3R5cGUnXSxcblx0JyVTZXRQcm90b3R5cGUlJzogWydTZXQnLCAncHJvdG90eXBlJ10sXG5cdCclU2hhcmVkQXJyYXlCdWZmZXJQcm90b3R5cGUlJzogWydTaGFyZWRBcnJheUJ1ZmZlcicsICdwcm90b3R5cGUnXSxcblx0JyVTdHJpbmdQcm90b3R5cGUlJzogWydTdHJpbmcnLCAncHJvdG90eXBlJ10sXG5cdCclU3ltYm9sUHJvdG90eXBlJSc6IFsnU3ltYm9sJywgJ3Byb3RvdHlwZSddLFxuXHQnJVN5bnRheEVycm9yUHJvdG90eXBlJSc6IFsnU3ludGF4RXJyb3InLCAncHJvdG90eXBlJ10sXG5cdCclVHlwZWRBcnJheVByb3RvdHlwZSUnOiBbJ1R5cGVkQXJyYXknLCAncHJvdG90eXBlJ10sXG5cdCclVHlwZUVycm9yUHJvdG90eXBlJSc6IFsnVHlwZUVycm9yJywgJ3Byb3RvdHlwZSddLFxuXHQnJVVpbnQ4QXJyYXlQcm90b3R5cGUlJzogWydVaW50OEFycmF5JywgJ3Byb3RvdHlwZSddLFxuXHQnJVVpbnQ4Q2xhbXBlZEFycmF5UHJvdG90eXBlJSc6IFsnVWludDhDbGFtcGVkQXJyYXknLCAncHJvdG90eXBlJ10sXG5cdCclVWludDE2QXJyYXlQcm90b3R5cGUlJzogWydVaW50MTZBcnJheScsICdwcm90b3R5cGUnXSxcblx0JyVVaW50MzJBcnJheVByb3RvdHlwZSUnOiBbJ1VpbnQzMkFycmF5JywgJ3Byb3RvdHlwZSddLFxuXHQnJVVSSUVycm9yUHJvdG90eXBlJSc6IFsnVVJJRXJyb3InLCAncHJvdG90eXBlJ10sXG5cdCclV2Vha01hcFByb3RvdHlwZSUnOiBbJ1dlYWtNYXAnLCAncHJvdG90eXBlJ10sXG5cdCclV2Vha1NldFByb3RvdHlwZSUnOiBbJ1dlYWtTZXQnLCAncHJvdG90eXBlJ11cbn07XG5cbnZhciBiaW5kID0gcmVxdWlyZSgnZnVuY3Rpb24tYmluZCcpO1xudmFyIGhhc093biA9IHJlcXVpcmUoJ2hhcycpO1xudmFyICRjb25jYXQgPSBiaW5kLmNhbGwoRnVuY3Rpb24uY2FsbCwgQXJyYXkucHJvdG90eXBlLmNvbmNhdCk7XG52YXIgJHNwbGljZUFwcGx5ID0gYmluZC5jYWxsKEZ1bmN0aW9uLmFwcGx5LCBBcnJheS5wcm90b3R5cGUuc3BsaWNlKTtcbnZhciAkcmVwbGFjZSA9IGJpbmQuY2FsbChGdW5jdGlvbi5jYWxsLCBTdHJpbmcucHJvdG90eXBlLnJlcGxhY2UpO1xudmFyICRzdHJTbGljZSA9IGJpbmQuY2FsbChGdW5jdGlvbi5jYWxsLCBTdHJpbmcucHJvdG90eXBlLnNsaWNlKTtcbnZhciAkZXhlYyA9IGJpbmQuY2FsbChGdW5jdGlvbi5jYWxsLCBSZWdFeHAucHJvdG90eXBlLmV4ZWMpO1xuXG4vKiBhZGFwdGVkIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2xvZGFzaC9sb2Rhc2gvYmxvYi80LjE3LjE1L2Rpc3QvbG9kYXNoLmpzI0w2NzM1LUw2NzQ0ICovXG52YXIgcmVQcm9wTmFtZSA9IC9bXiUuW1xcXV0rfFxcWyg/OigtP1xcZCsoPzpcXC5cXGQrKT8pfChbXCInXSkoKD86KD8hXFwyKVteXFxcXF18XFxcXC4pKj8pXFwyKVxcXXwoPz0oPzpcXC58XFxbXFxdKSg/OlxcLnxcXFtcXF18JSQpKS9nO1xudmFyIHJlRXNjYXBlQ2hhciA9IC9cXFxcKFxcXFwpPy9nOyAvKiogVXNlZCB0byBtYXRjaCBiYWNrc2xhc2hlcyBpbiBwcm9wZXJ0eSBwYXRocy4gKi9cbnZhciBzdHJpbmdUb1BhdGggPSBmdW5jdGlvbiBzdHJpbmdUb1BhdGgoc3RyaW5nKSB7XG5cdHZhciBmaXJzdCA9ICRzdHJTbGljZShzdHJpbmcsIDAsIDEpO1xuXHR2YXIgbGFzdCA9ICRzdHJTbGljZShzdHJpbmcsIC0xKTtcblx0aWYgKGZpcnN0ID09PSAnJScgJiYgbGFzdCAhPT0gJyUnKSB7XG5cdFx0dGhyb3cgbmV3ICRTeW50YXhFcnJvcignaW52YWxpZCBpbnRyaW5zaWMgc3ludGF4LCBleHBlY3RlZCBjbG9zaW5nIGAlYCcpO1xuXHR9IGVsc2UgaWYgKGxhc3QgPT09ICclJyAmJiBmaXJzdCAhPT0gJyUnKSB7XG5cdFx0dGhyb3cgbmV3ICRTeW50YXhFcnJvcignaW52YWxpZCBpbnRyaW5zaWMgc3ludGF4LCBleHBlY3RlZCBvcGVuaW5nIGAlYCcpO1xuXHR9XG5cdHZhciByZXN1bHQgPSBbXTtcblx0JHJlcGxhY2Uoc3RyaW5nLCByZVByb3BOYW1lLCBmdW5jdGlvbiAobWF0Y2gsIG51bWJlciwgcXVvdGUsIHN1YlN0cmluZykge1xuXHRcdHJlc3VsdFtyZXN1bHQubGVuZ3RoXSA9IHF1b3RlID8gJHJlcGxhY2Uoc3ViU3RyaW5nLCByZUVzY2FwZUNoYXIsICckMScpIDogbnVtYmVyIHx8IG1hdGNoO1xuXHR9KTtcblx0cmV0dXJuIHJlc3VsdDtcbn07XG4vKiBlbmQgYWRhcHRhdGlvbiAqL1xuXG52YXIgZ2V0QmFzZUludHJpbnNpYyA9IGZ1bmN0aW9uIGdldEJhc2VJbnRyaW5zaWMobmFtZSwgYWxsb3dNaXNzaW5nKSB7XG5cdHZhciBpbnRyaW5zaWNOYW1lID0gbmFtZTtcblx0dmFyIGFsaWFzO1xuXHRpZiAoaGFzT3duKExFR0FDWV9BTElBU0VTLCBpbnRyaW5zaWNOYW1lKSkge1xuXHRcdGFsaWFzID0gTEVHQUNZX0FMSUFTRVNbaW50cmluc2ljTmFtZV07XG5cdFx0aW50cmluc2ljTmFtZSA9ICclJyArIGFsaWFzWzBdICsgJyUnO1xuXHR9XG5cblx0aWYgKGhhc093bihJTlRSSU5TSUNTLCBpbnRyaW5zaWNOYW1lKSkge1xuXHRcdHZhciB2YWx1ZSA9IElOVFJJTlNJQ1NbaW50cmluc2ljTmFtZV07XG5cdFx0aWYgKHZhbHVlID09PSBuZWVkc0V2YWwpIHtcblx0XHRcdHZhbHVlID0gZG9FdmFsKGludHJpbnNpY05hbWUpO1xuXHRcdH1cblx0XHRpZiAodHlwZW9mIHZhbHVlID09PSAndW5kZWZpbmVkJyAmJiAhYWxsb3dNaXNzaW5nKSB7XG5cdFx0XHR0aHJvdyBuZXcgJFR5cGVFcnJvcignaW50cmluc2ljICcgKyBuYW1lICsgJyBleGlzdHMsIGJ1dCBpcyBub3QgYXZhaWxhYmxlLiBQbGVhc2UgZmlsZSBhbiBpc3N1ZSEnKTtcblx0XHR9XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0YWxpYXM6IGFsaWFzLFxuXHRcdFx0bmFtZTogaW50cmluc2ljTmFtZSxcblx0XHRcdHZhbHVlOiB2YWx1ZVxuXHRcdH07XG5cdH1cblxuXHR0aHJvdyBuZXcgJFN5bnRheEVycm9yKCdpbnRyaW5zaWMgJyArIG5hbWUgKyAnIGRvZXMgbm90IGV4aXN0IScpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBHZXRJbnRyaW5zaWMobmFtZSwgYWxsb3dNaXNzaW5nKSB7XG5cdGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycgfHwgbmFtZS5sZW5ndGggPT09IDApIHtcblx0XHR0aHJvdyBuZXcgJFR5cGVFcnJvcignaW50cmluc2ljIG5hbWUgbXVzdCBiZSBhIG5vbi1lbXB0eSBzdHJpbmcnKTtcblx0fVxuXHRpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEgJiYgdHlwZW9mIGFsbG93TWlzc2luZyAhPT0gJ2Jvb2xlYW4nKSB7XG5cdFx0dGhyb3cgbmV3ICRUeXBlRXJyb3IoJ1wiYWxsb3dNaXNzaW5nXCIgYXJndW1lbnQgbXVzdCBiZSBhIGJvb2xlYW4nKTtcblx0fVxuXG5cdGlmICgkZXhlYygvXiU/W14lXSolPyQvLCBuYW1lKSA9PT0gbnVsbCkge1xuXHRcdHRocm93IG5ldyAkU3ludGF4RXJyb3IoJ2AlYCBtYXkgbm90IGJlIHByZXNlbnQgYW55d2hlcmUgYnV0IGF0IHRoZSBiZWdpbm5pbmcgYW5kIGVuZCBvZiB0aGUgaW50cmluc2ljIG5hbWUnKTtcblx0fVxuXHR2YXIgcGFydHMgPSBzdHJpbmdUb1BhdGgobmFtZSk7XG5cdHZhciBpbnRyaW5zaWNCYXNlTmFtZSA9IHBhcnRzLmxlbmd0aCA+IDAgPyBwYXJ0c1swXSA6ICcnO1xuXG5cdHZhciBpbnRyaW5zaWMgPSBnZXRCYXNlSW50cmluc2ljKCclJyArIGludHJpbnNpY0Jhc2VOYW1lICsgJyUnLCBhbGxvd01pc3NpbmcpO1xuXHR2YXIgaW50cmluc2ljUmVhbE5hbWUgPSBpbnRyaW5zaWMubmFtZTtcblx0dmFyIHZhbHVlID0gaW50cmluc2ljLnZhbHVlO1xuXHR2YXIgc2tpcEZ1cnRoZXJDYWNoaW5nID0gZmFsc2U7XG5cblx0dmFyIGFsaWFzID0gaW50cmluc2ljLmFsaWFzO1xuXHRpZiAoYWxpYXMpIHtcblx0XHRpbnRyaW5zaWNCYXNlTmFtZSA9IGFsaWFzWzBdO1xuXHRcdCRzcGxpY2VBcHBseShwYXJ0cywgJGNvbmNhdChbMCwgMV0sIGFsaWFzKSk7XG5cdH1cblxuXHRmb3IgKHZhciBpID0gMSwgaXNPd24gPSB0cnVlOyBpIDwgcGFydHMubGVuZ3RoOyBpICs9IDEpIHtcblx0XHR2YXIgcGFydCA9IHBhcnRzW2ldO1xuXHRcdHZhciBmaXJzdCA9ICRzdHJTbGljZShwYXJ0LCAwLCAxKTtcblx0XHR2YXIgbGFzdCA9ICRzdHJTbGljZShwYXJ0LCAtMSk7XG5cdFx0aWYgKFxuXHRcdFx0KFxuXHRcdFx0XHQoZmlyc3QgPT09ICdcIicgfHwgZmlyc3QgPT09IFwiJ1wiIHx8IGZpcnN0ID09PSAnYCcpXG5cdFx0XHRcdHx8IChsYXN0ID09PSAnXCInIHx8IGxhc3QgPT09IFwiJ1wiIHx8IGxhc3QgPT09ICdgJylcblx0XHRcdClcblx0XHRcdCYmIGZpcnN0ICE9PSBsYXN0XG5cdFx0KSB7XG5cdFx0XHR0aHJvdyBuZXcgJFN5bnRheEVycm9yKCdwcm9wZXJ0eSBuYW1lcyB3aXRoIHF1b3RlcyBtdXN0IGhhdmUgbWF0Y2hpbmcgcXVvdGVzJyk7XG5cdFx0fVxuXHRcdGlmIChwYXJ0ID09PSAnY29uc3RydWN0b3InIHx8ICFpc093bikge1xuXHRcdFx0c2tpcEZ1cnRoZXJDYWNoaW5nID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRpbnRyaW5zaWNCYXNlTmFtZSArPSAnLicgKyBwYXJ0O1xuXHRcdGludHJpbnNpY1JlYWxOYW1lID0gJyUnICsgaW50cmluc2ljQmFzZU5hbWUgKyAnJSc7XG5cblx0XHRpZiAoaGFzT3duKElOVFJJTlNJQ1MsIGludHJpbnNpY1JlYWxOYW1lKSkge1xuXHRcdFx0dmFsdWUgPSBJTlRSSU5TSUNTW2ludHJpbnNpY1JlYWxOYW1lXTtcblx0XHR9IGVsc2UgaWYgKHZhbHVlICE9IG51bGwpIHtcblx0XHRcdGlmICghKHBhcnQgaW4gdmFsdWUpKSB7XG5cdFx0XHRcdGlmICghYWxsb3dNaXNzaW5nKSB7XG5cdFx0XHRcdFx0dGhyb3cgbmV3ICRUeXBlRXJyb3IoJ2Jhc2UgaW50cmluc2ljIGZvciAnICsgbmFtZSArICcgZXhpc3RzLCBidXQgdGhlIHByb3BlcnR5IGlzIG5vdCBhdmFpbGFibGUuJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHZvaWQgdW5kZWZpbmVkO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCRnT1BEICYmIChpICsgMSkgPj0gcGFydHMubGVuZ3RoKSB7XG5cdFx0XHRcdHZhciBkZXNjID0gJGdPUEQodmFsdWUsIHBhcnQpO1xuXHRcdFx0XHRpc093biA9ICEhZGVzYztcblxuXHRcdFx0XHQvLyBCeSBjb252ZW50aW9uLCB3aGVuIGEgZGF0YSBwcm9wZXJ0eSBpcyBjb252ZXJ0ZWQgdG8gYW4gYWNjZXNzb3Jcblx0XHRcdFx0Ly8gcHJvcGVydHkgdG8gZW11bGF0ZSBhIGRhdGEgcHJvcGVydHkgdGhhdCBkb2VzIG5vdCBzdWZmZXIgZnJvbVxuXHRcdFx0XHQvLyB0aGUgb3ZlcnJpZGUgbWlzdGFrZSwgdGhhdCBhY2Nlc3NvcidzIGdldHRlciBpcyBtYXJrZWQgd2l0aFxuXHRcdFx0XHQvLyBhbiBgb3JpZ2luYWxWYWx1ZWAgcHJvcGVydHkuIEhlcmUsIHdoZW4gd2UgZGV0ZWN0IHRoaXMsIHdlXG5cdFx0XHRcdC8vIHVwaG9sZCB0aGUgaWxsdXNpb24gYnkgcHJldGVuZGluZyB0byBzZWUgdGhhdCBvcmlnaW5hbCBkYXRhXG5cdFx0XHRcdC8vIHByb3BlcnR5LCBpLmUuLCByZXR1cm5pbmcgdGhlIHZhbHVlIHJhdGhlciB0aGFuIHRoZSBnZXR0ZXJcblx0XHRcdFx0Ly8gaXRzZWxmLlxuXHRcdFx0XHRpZiAoaXNPd24gJiYgJ2dldCcgaW4gZGVzYyAmJiAhKCdvcmlnaW5hbFZhbHVlJyBpbiBkZXNjLmdldCkpIHtcblx0XHRcdFx0XHR2YWx1ZSA9IGRlc2MuZ2V0O1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHZhbHVlID0gdmFsdWVbcGFydF07XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlzT3duID0gaGFzT3duKHZhbHVlLCBwYXJ0KTtcblx0XHRcdFx0dmFsdWUgPSB2YWx1ZVtwYXJ0XTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGlzT3duICYmICFza2lwRnVydGhlckNhY2hpbmcpIHtcblx0XHRcdFx0SU5UUklOU0lDU1tpbnRyaW5zaWNSZWFsTmFtZV0gPSB2YWx1ZTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0cmV0dXJuIHZhbHVlO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEdldEludHJpbnNpYyA9IHJlcXVpcmUoJ2dldC1pbnRyaW5zaWMnKTtcblxudmFyICRnT1BEID0gR2V0SW50cmluc2ljKCclT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvciUnLCB0cnVlKTtcblxuaWYgKCRnT1BEKSB7XG5cdHRyeSB7XG5cdFx0JGdPUEQoW10sICdsZW5ndGgnKTtcblx0fSBjYXRjaCAoZSkge1xuXHRcdC8vIElFIDggaGFzIGEgYnJva2VuIGdPUERcblx0XHQkZ09QRCA9IG51bGw7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSAkZ09QRDtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIG9yaWdTeW1ib2wgPSB0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2w7XG52YXIgaGFzU3ltYm9sU2hhbSA9IHJlcXVpcmUoJy4vc2hhbXMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBoYXNOYXRpdmVTeW1ib2xzKCkge1xuXHRpZiAodHlwZW9mIG9yaWdTeW1ib2wgIT09ICdmdW5jdGlvbicpIHsgcmV0dXJuIGZhbHNlOyB9XG5cdGlmICh0eXBlb2YgU3ltYm9sICE9PSAnZnVuY3Rpb24nKSB7IHJldHVybiBmYWxzZTsgfVxuXHRpZiAodHlwZW9mIG9yaWdTeW1ib2woJ2ZvbycpICE9PSAnc3ltYm9sJykgeyByZXR1cm4gZmFsc2U7IH1cblx0aWYgKHR5cGVvZiBTeW1ib2woJ2JhcicpICE9PSAnc3ltYm9sJykgeyByZXR1cm4gZmFsc2U7IH1cblxuXHRyZXR1cm4gaGFzU3ltYm9sU2hhbSgpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyogZXNsaW50IGNvbXBsZXhpdHk6IFsyLCAxOF0sIG1heC1zdGF0ZW1lbnRzOiBbMiwgMzNdICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGhhc1N5bWJvbHMoKSB7XG5cdGlmICh0eXBlb2YgU3ltYm9sICE9PSAnZnVuY3Rpb24nIHx8IHR5cGVvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzICE9PSAnZnVuY3Rpb24nKSB7IHJldHVybiBmYWxzZTsgfVxuXHRpZiAodHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gJ3N5bWJvbCcpIHsgcmV0dXJuIHRydWU7IH1cblxuXHR2YXIgb2JqID0ge307XG5cdHZhciBzeW0gPSBTeW1ib2woJ3Rlc3QnKTtcblx0dmFyIHN5bU9iaiA9IE9iamVjdChzeW0pO1xuXHRpZiAodHlwZW9mIHN5bSA9PT0gJ3N0cmluZycpIHsgcmV0dXJuIGZhbHNlOyB9XG5cblx0aWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChzeW0pICE9PSAnW29iamVjdCBTeW1ib2xdJykgeyByZXR1cm4gZmFsc2U7IH1cblx0aWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChzeW1PYmopICE9PSAnW29iamVjdCBTeW1ib2xdJykgeyByZXR1cm4gZmFsc2U7IH1cblxuXHQvLyB0ZW1wIGRpc2FibGVkIHBlciBodHRwczovL2dpdGh1Yi5jb20vbGpoYXJiL29iamVjdC5hc3NpZ24vaXNzdWVzLzE3XG5cdC8vIGlmIChzeW0gaW5zdGFuY2VvZiBTeW1ib2wpIHsgcmV0dXJuIGZhbHNlOyB9XG5cdC8vIHRlbXAgZGlzYWJsZWQgcGVyIGh0dHBzOi8vZ2l0aHViLmNvbS9XZWJSZWZsZWN0aW9uL2dldC1vd24tcHJvcGVydHktc3ltYm9scy9pc3N1ZXMvNFxuXHQvLyBpZiAoIShzeW1PYmogaW5zdGFuY2VvZiBTeW1ib2wpKSB7IHJldHVybiBmYWxzZTsgfVxuXG5cdC8vIGlmICh0eXBlb2YgU3ltYm9sLnByb3RvdHlwZS50b1N0cmluZyAhPT0gJ2Z1bmN0aW9uJykgeyByZXR1cm4gZmFsc2U7IH1cblx0Ly8gaWYgKFN0cmluZyhzeW0pICE9PSBTeW1ib2wucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoc3ltKSkgeyByZXR1cm4gZmFsc2U7IH1cblxuXHR2YXIgc3ltVmFsID0gNDI7XG5cdG9ialtzeW1dID0gc3ltVmFsO1xuXHRmb3IgKHN5bSBpbiBvYmopIHsgcmV0dXJuIGZhbHNlOyB9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tcmVzdHJpY3RlZC1zeW50YXgsIG5vLXVucmVhY2hhYmxlLWxvb3Bcblx0aWYgKHR5cGVvZiBPYmplY3Qua2V5cyA9PT0gJ2Z1bmN0aW9uJyAmJiBPYmplY3Qua2V5cyhvYmopLmxlbmd0aCAhPT0gMCkgeyByZXR1cm4gZmFsc2U7IH1cblxuXHRpZiAodHlwZW9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzID09PSAnZnVuY3Rpb24nICYmIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG9iaikubGVuZ3RoICE9PSAwKSB7IHJldHVybiBmYWxzZTsgfVxuXG5cdHZhciBzeW1zID0gT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhvYmopO1xuXHRpZiAoc3ltcy5sZW5ndGggIT09IDEgfHwgc3ltc1swXSAhPT0gc3ltKSB7IHJldHVybiBmYWxzZTsgfVxuXG5cdGlmICghT2JqZWN0LnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZS5jYWxsKG9iaiwgc3ltKSkgeyByZXR1cm4gZmFsc2U7IH1cblxuXHRpZiAodHlwZW9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IgPT09ICdmdW5jdGlvbicpIHtcblx0XHR2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqLCBzeW0pO1xuXHRcdGlmIChkZXNjcmlwdG9yLnZhbHVlICE9PSBzeW1WYWwgfHwgZGVzY3JpcHRvci5lbnVtZXJhYmxlICE9PSB0cnVlKSB7IHJldHVybiBmYWxzZTsgfVxuXHR9XG5cblx0cmV0dXJuIHRydWU7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaGFzU3ltYm9scyA9IHJlcXVpcmUoJ2hhcy1zeW1ib2xzL3NoYW1zJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaGFzVG9TdHJpbmdUYWdTaGFtcygpIHtcblx0cmV0dXJuIGhhc1N5bWJvbHMoKSAmJiAhIVN5bWJvbC50b1N0cmluZ1RhZztcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBiaW5kID0gcmVxdWlyZSgnZnVuY3Rpb24tYmluZCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGJpbmQuY2FsbChGdW5jdGlvbi5jYWxsLCBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5KTtcbiIsIi8qISBpZWVlNzU0LiBCU0QtMy1DbGF1c2UgTGljZW5zZS4gRmVyb3NzIEFib3VraGFkaWplaCA8aHR0cHM6Ly9mZXJvc3Mub3JnL29wZW5zb3VyY2U+ICovXG5leHBvcnRzLnJlYWQgPSBmdW5jdGlvbiAoYnVmZmVyLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbVxuICB2YXIgZUxlbiA9IChuQnl0ZXMgKiA4KSAtIG1MZW4gLSAxXG4gIHZhciBlTWF4ID0gKDEgPDwgZUxlbikgLSAxXG4gIHZhciBlQmlhcyA9IGVNYXggPj4gMVxuICB2YXIgbkJpdHMgPSAtN1xuICB2YXIgaSA9IGlzTEUgPyAobkJ5dGVzIC0gMSkgOiAwXG4gIHZhciBkID0gaXNMRSA/IC0xIDogMVxuICB2YXIgcyA9IGJ1ZmZlcltvZmZzZXQgKyBpXVxuXG4gIGkgKz0gZFxuXG4gIGUgPSBzICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIHMgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IGVMZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgZSA9IChlICogMjU2KSArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KSB7fVxuXG4gIG0gPSBlICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIGUgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IG1MZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgbSA9IChtICogMjU2KSArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KSB7fVxuXG4gIGlmIChlID09PSAwKSB7XG4gICAgZSA9IDEgLSBlQmlhc1xuICB9IGVsc2UgaWYgKGUgPT09IGVNYXgpIHtcbiAgICByZXR1cm4gbSA/IE5hTiA6ICgocyA/IC0xIDogMSkgKiBJbmZpbml0eSlcbiAgfSBlbHNlIHtcbiAgICBtID0gbSArIE1hdGgucG93KDIsIG1MZW4pXG4gICAgZSA9IGUgLSBlQmlhc1xuICB9XG4gIHJldHVybiAocyA/IC0xIDogMSkgKiBtICogTWF0aC5wb3coMiwgZSAtIG1MZW4pXG59XG5cbmV4cG9ydHMud3JpdGUgPSBmdW5jdGlvbiAoYnVmZmVyLCB2YWx1ZSwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sIGNcbiAgdmFyIGVMZW4gPSAobkJ5dGVzICogOCkgLSBtTGVuIC0gMVxuICB2YXIgZU1heCA9ICgxIDw8IGVMZW4pIC0gMVxuICB2YXIgZUJpYXMgPSBlTWF4ID4+IDFcbiAgdmFyIHJ0ID0gKG1MZW4gPT09IDIzID8gTWF0aC5wb3coMiwgLTI0KSAtIE1hdGgucG93KDIsIC03NykgOiAwKVxuICB2YXIgaSA9IGlzTEUgPyAwIDogKG5CeXRlcyAtIDEpXG4gIHZhciBkID0gaXNMRSA/IDEgOiAtMVxuICB2YXIgcyA9IHZhbHVlIDwgMCB8fCAodmFsdWUgPT09IDAgJiYgMSAvIHZhbHVlIDwgMCkgPyAxIDogMFxuXG4gIHZhbHVlID0gTWF0aC5hYnModmFsdWUpXG5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkpIHtcbiAgICBtID0gaXNOYU4odmFsdWUpID8gMSA6IDBcbiAgICBlID0gZU1heFxuICB9IGVsc2Uge1xuICAgIGUgPSBNYXRoLmZsb29yKE1hdGgubG9nKHZhbHVlKSAvIE1hdGguTE4yKVxuICAgIGlmICh2YWx1ZSAqIChjID0gTWF0aC5wb3coMiwgLWUpKSA8IDEpIHtcbiAgICAgIGUtLVxuICAgICAgYyAqPSAyXG4gICAgfVxuICAgIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgdmFsdWUgKz0gcnQgLyBjXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlICs9IHJ0ICogTWF0aC5wb3coMiwgMSAtIGVCaWFzKVxuICAgIH1cbiAgICBpZiAodmFsdWUgKiBjID49IDIpIHtcbiAgICAgIGUrK1xuICAgICAgYyAvPSAyXG4gICAgfVxuXG4gICAgaWYgKGUgKyBlQmlhcyA+PSBlTWF4KSB7XG4gICAgICBtID0gMFxuICAgICAgZSA9IGVNYXhcbiAgICB9IGVsc2UgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICBtID0gKCh2YWx1ZSAqIGMpIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKVxuICAgICAgZSA9IGUgKyBlQmlhc1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gdmFsdWUgKiBNYXRoLnBvdygyLCBlQmlhcyAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSAwXG4gICAgfVxuICB9XG5cbiAgZm9yICg7IG1MZW4gPj0gODsgYnVmZmVyW29mZnNldCArIGldID0gbSAmIDB4ZmYsIGkgKz0gZCwgbSAvPSAyNTYsIG1MZW4gLT0gOCkge31cblxuICBlID0gKGUgPDwgbUxlbikgfCBtXG4gIGVMZW4gKz0gbUxlblxuICBmb3IgKDsgZUxlbiA+IDA7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IGUgJiAweGZmLCBpICs9IGQsIGUgLz0gMjU2LCBlTGVuIC09IDgpIHt9XG5cbiAgYnVmZmVyW29mZnNldCArIGkgLSBkXSB8PSBzICogMTI4XG59XG4iLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBpZiAoc3VwZXJDdG9yKSB7XG4gICAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgICAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICAgICAgY29uc3RydWN0b3I6IHtcbiAgICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG4gIH07XG59IGVsc2Uge1xuICAvLyBvbGQgc2Nob29sIHNoaW0gZm9yIG9sZCBicm93c2Vyc1xuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGlmIChzdXBlckN0b3IpIHtcbiAgICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgICAgVGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZVxuICAgICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKVxuICAgICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gICAgfVxuICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBoYXNUb1N0cmluZ1RhZyA9IHJlcXVpcmUoJ2hhcy10b3N0cmluZ3RhZy9zaGFtcycpKCk7XG52YXIgY2FsbEJvdW5kID0gcmVxdWlyZSgnY2FsbC1iaW5kL2NhbGxCb3VuZCcpO1xuXG52YXIgJHRvU3RyaW5nID0gY2FsbEJvdW5kKCdPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nJyk7XG5cbnZhciBpc1N0YW5kYXJkQXJndW1lbnRzID0gZnVuY3Rpb24gaXNBcmd1bWVudHModmFsdWUpIHtcblx0aWYgKGhhc1RvU3RyaW5nVGFnICYmIHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnIGluIHZhbHVlKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cdHJldHVybiAkdG9TdHJpbmcodmFsdWUpID09PSAnW29iamVjdCBBcmd1bWVudHNdJztcbn07XG5cbnZhciBpc0xlZ2FjeUFyZ3VtZW50cyA9IGZ1bmN0aW9uIGlzQXJndW1lbnRzKHZhbHVlKSB7XG5cdGlmIChpc1N0YW5kYXJkQXJndW1lbnRzKHZhbHVlKSkge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cdHJldHVybiB2YWx1ZSAhPT0gbnVsbCAmJlxuXHRcdHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiZcblx0XHR0eXBlb2YgdmFsdWUubGVuZ3RoID09PSAnbnVtYmVyJyAmJlxuXHRcdHZhbHVlLmxlbmd0aCA+PSAwICYmXG5cdFx0JHRvU3RyaW5nKHZhbHVlKSAhPT0gJ1tvYmplY3QgQXJyYXldJyAmJlxuXHRcdCR0b1N0cmluZyh2YWx1ZS5jYWxsZWUpID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xufTtcblxudmFyIHN1cHBvcnRzU3RhbmRhcmRBcmd1bWVudHMgPSAoZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gaXNTdGFuZGFyZEFyZ3VtZW50cyhhcmd1bWVudHMpO1xufSgpKTtcblxuaXNTdGFuZGFyZEFyZ3VtZW50cy5pc0xlZ2FjeUFyZ3VtZW50cyA9IGlzTGVnYWN5QXJndW1lbnRzOyAvLyBmb3IgdGVzdHNcblxubW9kdWxlLmV4cG9ydHMgPSBzdXBwb3J0c1N0YW5kYXJkQXJndW1lbnRzID8gaXNTdGFuZGFyZEFyZ3VtZW50cyA6IGlzTGVnYWN5QXJndW1lbnRzO1xuIiwiLyohXG4gKiBEZXRlcm1pbmUgaWYgYW4gb2JqZWN0IGlzIGEgQnVmZmVyXG4gKlxuICogQGF1dGhvciAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGh0dHBzOi8vZmVyb3NzLm9yZz5cbiAqIEBsaWNlbnNlICBNSVRcbiAqL1xuXG4vLyBUaGUgX2lzQnVmZmVyIGNoZWNrIGlzIGZvciBTYWZhcmkgNS03IHN1cHBvcnQsIGJlY2F1c2UgaXQncyBtaXNzaW5nXG4vLyBPYmplY3QucHJvdG90eXBlLmNvbnN0cnVjdG9yLiBSZW1vdmUgdGhpcyBldmVudHVhbGx5XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvYmopIHtcbiAgcmV0dXJuIG9iaiAhPSBudWxsICYmIChpc0J1ZmZlcihvYmopIHx8IGlzU2xvd0J1ZmZlcihvYmopIHx8ICEhb2JqLl9pc0J1ZmZlcilcbn1cblxuZnVuY3Rpb24gaXNCdWZmZXIgKG9iaikge1xuICByZXR1cm4gISFvYmouY29uc3RydWN0b3IgJiYgdHlwZW9mIG9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlciA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmouY29uc3RydWN0b3IuaXNCdWZmZXIob2JqKVxufVxuXG4vLyBGb3IgTm9kZSB2MC4xMCBzdXBwb3J0LiBSZW1vdmUgdGhpcyBldmVudHVhbGx5LlxuZnVuY3Rpb24gaXNTbG93QnVmZmVyIChvYmopIHtcbiAgcmV0dXJuIHR5cGVvZiBvYmoucmVhZEZsb2F0TEUgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIG9iai5zbGljZSA9PT0gJ2Z1bmN0aW9uJyAmJiBpc0J1ZmZlcihvYmouc2xpY2UoMCwgMCkpXG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBmblRvU3RyID0gRnVuY3Rpb24ucHJvdG90eXBlLnRvU3RyaW5nO1xudmFyIHJlZmxlY3RBcHBseSA9IHR5cGVvZiBSZWZsZWN0ID09PSAnb2JqZWN0JyAmJiBSZWZsZWN0ICE9PSBudWxsICYmIFJlZmxlY3QuYXBwbHk7XG52YXIgYmFkQXJyYXlMaWtlO1xudmFyIGlzQ2FsbGFibGVNYXJrZXI7XG5pZiAodHlwZW9mIHJlZmxlY3RBcHBseSA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgT2JqZWN0LmRlZmluZVByb3BlcnR5ID09PSAnZnVuY3Rpb24nKSB7XG5cdHRyeSB7XG5cdFx0YmFkQXJyYXlMaWtlID0gT2JqZWN0LmRlZmluZVByb3BlcnR5KHt9LCAnbGVuZ3RoJywge1xuXHRcdFx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHRocm93IGlzQ2FsbGFibGVNYXJrZXI7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0aXNDYWxsYWJsZU1hcmtlciA9IHt9O1xuXHRcdC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby10aHJvdy1saXRlcmFsXG5cdFx0cmVmbGVjdEFwcGx5KGZ1bmN0aW9uICgpIHsgdGhyb3cgNDI7IH0sIG51bGwsIGJhZEFycmF5TGlrZSk7XG5cdH0gY2F0Y2ggKF8pIHtcblx0XHRpZiAoXyAhPT0gaXNDYWxsYWJsZU1hcmtlcikge1xuXHRcdFx0cmVmbGVjdEFwcGx5ID0gbnVsbDtcblx0XHR9XG5cdH1cbn0gZWxzZSB7XG5cdHJlZmxlY3RBcHBseSA9IG51bGw7XG59XG5cbnZhciBjb25zdHJ1Y3RvclJlZ2V4ID0gL15cXHMqY2xhc3NcXGIvO1xudmFyIGlzRVM2Q2xhc3NGbiA9IGZ1bmN0aW9uIGlzRVM2Q2xhc3NGdW5jdGlvbih2YWx1ZSkge1xuXHR0cnkge1xuXHRcdHZhciBmblN0ciA9IGZuVG9TdHIuY2FsbCh2YWx1ZSk7XG5cdFx0cmV0dXJuIGNvbnN0cnVjdG9yUmVnZXgudGVzdChmblN0cik7XG5cdH0gY2F0Y2ggKGUpIHtcblx0XHRyZXR1cm4gZmFsc2U7IC8vIG5vdCBhIGZ1bmN0aW9uXG5cdH1cbn07XG5cbnZhciB0cnlGdW5jdGlvbk9iamVjdCA9IGZ1bmN0aW9uIHRyeUZ1bmN0aW9uVG9TdHIodmFsdWUpIHtcblx0dHJ5IHtcblx0XHRpZiAoaXNFUzZDbGFzc0ZuKHZhbHVlKSkgeyByZXR1cm4gZmFsc2U7IH1cblx0XHRmblRvU3RyLmNhbGwodmFsdWUpO1xuXHRcdHJldHVybiB0cnVlO1xuXHR9IGNhdGNoIChlKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG59O1xudmFyIHRvU3RyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbnZhciBvYmplY3RDbGFzcyA9ICdbb2JqZWN0IE9iamVjdF0nO1xudmFyIGZuQ2xhc3MgPSAnW29iamVjdCBGdW5jdGlvbl0nO1xudmFyIGdlbkNsYXNzID0gJ1tvYmplY3QgR2VuZXJhdG9yRnVuY3Rpb25dJztcbnZhciBkZGFDbGFzcyA9ICdbb2JqZWN0IEhUTUxBbGxDb2xsZWN0aW9uXSc7IC8vIElFIDExXG52YXIgZGRhQ2xhc3MyID0gJ1tvYmplY3QgSFRNTCBkb2N1bWVudC5hbGwgY2xhc3NdJztcbnZhciBkZGFDbGFzczMgPSAnW29iamVjdCBIVE1MQ29sbGVjdGlvbl0nOyAvLyBJRSA5LTEwXG52YXIgaGFzVG9TdHJpbmdUYWcgPSB0eXBlb2YgU3ltYm9sID09PSAnZnVuY3Rpb24nICYmICEhU3ltYm9sLnRvU3RyaW5nVGFnOyAvLyBiZXR0ZXI6IHVzZSBgaGFzLXRvc3RyaW5ndGFnYFxuXG52YXIgaXNJRTY4ID0gISgwIGluIFssXSk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tc3BhcnNlLWFycmF5cywgY29tbWEtc3BhY2luZ1xuXG52YXIgaXNEREEgPSBmdW5jdGlvbiBpc0RvY3VtZW50RG90QWxsKCkgeyByZXR1cm4gZmFsc2U7IH07XG5pZiAodHlwZW9mIGRvY3VtZW50ID09PSAnb2JqZWN0Jykge1xuXHQvLyBGaXJlZm94IDMgY2Fub25pY2FsaXplcyBEREEgdG8gdW5kZWZpbmVkIHdoZW4gaXQncyBub3QgYWNjZXNzZWQgZGlyZWN0bHlcblx0dmFyIGFsbCA9IGRvY3VtZW50LmFsbDtcblx0aWYgKHRvU3RyLmNhbGwoYWxsKSA9PT0gdG9TdHIuY2FsbChkb2N1bWVudC5hbGwpKSB7XG5cdFx0aXNEREEgPSBmdW5jdGlvbiBpc0RvY3VtZW50RG90QWxsKHZhbHVlKSB7XG5cdFx0XHQvKiBnbG9iYWxzIGRvY3VtZW50OiBmYWxzZSAqL1xuXHRcdFx0Ly8gaW4gSUUgNi04LCB0eXBlb2YgZG9jdW1lbnQuYWxsIGlzIFwib2JqZWN0XCIgYW5kIGl0J3MgdHJ1dGh5XG5cdFx0XHRpZiAoKGlzSUU2OCB8fCAhdmFsdWUpICYmICh0eXBlb2YgdmFsdWUgPT09ICd1bmRlZmluZWQnIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpKSB7XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0dmFyIHN0ciA9IHRvU3RyLmNhbGwodmFsdWUpO1xuXHRcdFx0XHRcdHJldHVybiAoXG5cdFx0XHRcdFx0XHRzdHIgPT09IGRkYUNsYXNzXG5cdFx0XHRcdFx0XHR8fCBzdHIgPT09IGRkYUNsYXNzMlxuXHRcdFx0XHRcdFx0fHwgc3RyID09PSBkZGFDbGFzczMgLy8gb3BlcmEgMTIuMTZcblx0XHRcdFx0XHRcdHx8IHN0ciA9PT0gb2JqZWN0Q2xhc3MgLy8gSUUgNi04XG5cdFx0XHRcdFx0KSAmJiB2YWx1ZSgnJykgPT0gbnVsbDsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBlcWVxZXFcblx0XHRcdFx0fSBjYXRjaCAoZSkgeyAvKiovIH1cblx0XHRcdH1cblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9O1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcmVmbGVjdEFwcGx5XG5cdD8gZnVuY3Rpb24gaXNDYWxsYWJsZSh2YWx1ZSkge1xuXHRcdGlmIChpc0REQSh2YWx1ZSkpIHsgcmV0dXJuIHRydWU7IH1cblx0XHRpZiAoIXZhbHVlKSB7IHJldHVybiBmYWxzZTsgfVxuXHRcdGlmICh0eXBlb2YgdmFsdWUgIT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIHZhbHVlICE9PSAnb2JqZWN0JykgeyByZXR1cm4gZmFsc2U7IH1cblx0XHR0cnkge1xuXHRcdFx0cmVmbGVjdEFwcGx5KHZhbHVlLCBudWxsLCBiYWRBcnJheUxpa2UpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdGlmIChlICE9PSBpc0NhbGxhYmxlTWFya2VyKSB7IHJldHVybiBmYWxzZTsgfVxuXHRcdH1cblx0XHRyZXR1cm4gIWlzRVM2Q2xhc3NGbih2YWx1ZSkgJiYgdHJ5RnVuY3Rpb25PYmplY3QodmFsdWUpO1xuXHR9XG5cdDogZnVuY3Rpb24gaXNDYWxsYWJsZSh2YWx1ZSkge1xuXHRcdGlmIChpc0REQSh2YWx1ZSkpIHsgcmV0dXJuIHRydWU7IH1cblx0XHRpZiAoIXZhbHVlKSB7IHJldHVybiBmYWxzZTsgfVxuXHRcdGlmICh0eXBlb2YgdmFsdWUgIT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIHZhbHVlICE9PSAnb2JqZWN0JykgeyByZXR1cm4gZmFsc2U7IH1cblx0XHRpZiAoaGFzVG9TdHJpbmdUYWcpIHsgcmV0dXJuIHRyeUZ1bmN0aW9uT2JqZWN0KHZhbHVlKTsgfVxuXHRcdGlmIChpc0VTNkNsYXNzRm4odmFsdWUpKSB7IHJldHVybiBmYWxzZTsgfVxuXHRcdHZhciBzdHJDbGFzcyA9IHRvU3RyLmNhbGwodmFsdWUpO1xuXHRcdGlmIChzdHJDbGFzcyAhPT0gZm5DbGFzcyAmJiBzdHJDbGFzcyAhPT0gZ2VuQ2xhc3MgJiYgISgvXlxcW29iamVjdCBIVE1MLykudGVzdChzdHJDbGFzcykpIHsgcmV0dXJuIGZhbHNlOyB9XG5cdFx0cmV0dXJuIHRyeUZ1bmN0aW9uT2JqZWN0KHZhbHVlKTtcblx0fTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHRvU3RyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbnZhciBmblRvU3RyID0gRnVuY3Rpb24ucHJvdG90eXBlLnRvU3RyaW5nO1xudmFyIGlzRm5SZWdleCA9IC9eXFxzKig/OmZ1bmN0aW9uKT9cXCovO1xudmFyIGhhc1RvU3RyaW5nVGFnID0gcmVxdWlyZSgnaGFzLXRvc3RyaW5ndGFnL3NoYW1zJykoKTtcbnZhciBnZXRQcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZjtcbnZhciBnZXRHZW5lcmF0b3JGdW5jID0gZnVuY3Rpb24gKCkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGNvbnNpc3RlbnQtcmV0dXJuXG5cdGlmICghaGFzVG9TdHJpbmdUYWcpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0dHJ5IHtcblx0XHRyZXR1cm4gRnVuY3Rpb24oJ3JldHVybiBmdW5jdGlvbiooKSB7fScpKCk7XG5cdH0gY2F0Y2ggKGUpIHtcblx0fVxufTtcbnZhciBHZW5lcmF0b3JGdW5jdGlvbjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0dlbmVyYXRvckZ1bmN0aW9uKGZuKSB7XG5cdGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0aWYgKGlzRm5SZWdleC50ZXN0KGZuVG9TdHIuY2FsbChmbikpKSB7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblx0aWYgKCFoYXNUb1N0cmluZ1RhZykge1xuXHRcdHZhciBzdHIgPSB0b1N0ci5jYWxsKGZuKTtcblx0XHRyZXR1cm4gc3RyID09PSAnW29iamVjdCBHZW5lcmF0b3JGdW5jdGlvbl0nO1xuXHR9XG5cdGlmICghZ2V0UHJvdG8pIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0aWYgKHR5cGVvZiBHZW5lcmF0b3JGdW5jdGlvbiA9PT0gJ3VuZGVmaW5lZCcpIHtcblx0XHR2YXIgZ2VuZXJhdG9yRnVuYyA9IGdldEdlbmVyYXRvckZ1bmMoKTtcblx0XHRHZW5lcmF0b3JGdW5jdGlvbiA9IGdlbmVyYXRvckZ1bmMgPyBnZXRQcm90byhnZW5lcmF0b3JGdW5jKSA6IGZhbHNlO1xuXHR9XG5cdHJldHVybiBnZXRQcm90byhmbikgPT09IEdlbmVyYXRvckZ1bmN0aW9uO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHdoaWNoVHlwZWRBcnJheSA9IHJlcXVpcmUoJ3doaWNoLXR5cGVkLWFycmF5Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNUeXBlZEFycmF5KHZhbHVlKSB7XG5cdHJldHVybiAhIXdoaWNoVHlwZWRBcnJheSh2YWx1ZSk7XG59O1xuIiwiLy8gJ3BhdGgnIG1vZHVsZSBleHRyYWN0ZWQgZnJvbSBOb2RlLmpzIHY4LjExLjEgKG9ubHkgdGhlIHBvc2l4IHBhcnQpXG4vLyB0cmFuc3BsaXRlZCB3aXRoIEJhYmVsXG5cbi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIGFzc2VydFBhdGgocGF0aCkge1xuICBpZiAodHlwZW9mIHBhdGggIT09ICdzdHJpbmcnKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignUGF0aCBtdXN0IGJlIGEgc3RyaW5nLiBSZWNlaXZlZCAnICsgSlNPTi5zdHJpbmdpZnkocGF0aCkpO1xuICB9XG59XG5cbi8vIFJlc29sdmVzIC4gYW5kIC4uIGVsZW1lbnRzIGluIGEgcGF0aCB3aXRoIGRpcmVjdG9yeSBuYW1lc1xuZnVuY3Rpb24gbm9ybWFsaXplU3RyaW5nUG9zaXgocGF0aCwgYWxsb3dBYm92ZVJvb3QpIHtcbiAgdmFyIHJlcyA9ICcnO1xuICB2YXIgbGFzdFNlZ21lbnRMZW5ndGggPSAwO1xuICB2YXIgbGFzdFNsYXNoID0gLTE7XG4gIHZhciBkb3RzID0gMDtcbiAgdmFyIGNvZGU7XG4gIGZvciAodmFyIGkgPSAwOyBpIDw9IHBhdGgubGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoaSA8IHBhdGgubGVuZ3RoKVxuICAgICAgY29kZSA9IHBhdGguY2hhckNvZGVBdChpKTtcbiAgICBlbHNlIGlmIChjb2RlID09PSA0NyAvKi8qLylcbiAgICAgIGJyZWFrO1xuICAgIGVsc2VcbiAgICAgIGNvZGUgPSA0NyAvKi8qLztcbiAgICBpZiAoY29kZSA9PT0gNDcgLyovKi8pIHtcbiAgICAgIGlmIChsYXN0U2xhc2ggPT09IGkgLSAxIHx8IGRvdHMgPT09IDEpIHtcbiAgICAgICAgLy8gTk9PUFxuICAgICAgfSBlbHNlIGlmIChsYXN0U2xhc2ggIT09IGkgLSAxICYmIGRvdHMgPT09IDIpIHtcbiAgICAgICAgaWYgKHJlcy5sZW5ndGggPCAyIHx8IGxhc3RTZWdtZW50TGVuZ3RoICE9PSAyIHx8IHJlcy5jaGFyQ29kZUF0KHJlcy5sZW5ndGggLSAxKSAhPT0gNDYgLyouKi8gfHwgcmVzLmNoYXJDb2RlQXQocmVzLmxlbmd0aCAtIDIpICE9PSA0NiAvKi4qLykge1xuICAgICAgICAgIGlmIChyZXMubGVuZ3RoID4gMikge1xuICAgICAgICAgICAgdmFyIGxhc3RTbGFzaEluZGV4ID0gcmVzLmxhc3RJbmRleE9mKCcvJyk7XG4gICAgICAgICAgICBpZiAobGFzdFNsYXNoSW5kZXggIT09IHJlcy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgIGlmIChsYXN0U2xhc2hJbmRleCA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICByZXMgPSAnJztcbiAgICAgICAgICAgICAgICBsYXN0U2VnbWVudExlbmd0aCA9IDA7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzID0gcmVzLnNsaWNlKDAsIGxhc3RTbGFzaEluZGV4KTtcbiAgICAgICAgICAgICAgICBsYXN0U2VnbWVudExlbmd0aCA9IHJlcy5sZW5ndGggLSAxIC0gcmVzLmxhc3RJbmRleE9mKCcvJyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgbGFzdFNsYXNoID0gaTtcbiAgICAgICAgICAgICAgZG90cyA9IDA7XG4gICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAocmVzLmxlbmd0aCA9PT0gMiB8fCByZXMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICByZXMgPSAnJztcbiAgICAgICAgICAgIGxhc3RTZWdtZW50TGVuZ3RoID0gMDtcbiAgICAgICAgICAgIGxhc3RTbGFzaCA9IGk7XG4gICAgICAgICAgICBkb3RzID0gMDtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoYWxsb3dBYm92ZVJvb3QpIHtcbiAgICAgICAgICBpZiAocmVzLmxlbmd0aCA+IDApXG4gICAgICAgICAgICByZXMgKz0gJy8uLic7XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmVzID0gJy4uJztcbiAgICAgICAgICBsYXN0U2VnbWVudExlbmd0aCA9IDI7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChyZXMubGVuZ3RoID4gMClcbiAgICAgICAgICByZXMgKz0gJy8nICsgcGF0aC5zbGljZShsYXN0U2xhc2ggKyAxLCBpKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHJlcyA9IHBhdGguc2xpY2UobGFzdFNsYXNoICsgMSwgaSk7XG4gICAgICAgIGxhc3RTZWdtZW50TGVuZ3RoID0gaSAtIGxhc3RTbGFzaCAtIDE7XG4gICAgICB9XG4gICAgICBsYXN0U2xhc2ggPSBpO1xuICAgICAgZG90cyA9IDA7XG4gICAgfSBlbHNlIGlmIChjb2RlID09PSA0NiAvKi4qLyAmJiBkb3RzICE9PSAtMSkge1xuICAgICAgKytkb3RzO1xuICAgIH0gZWxzZSB7XG4gICAgICBkb3RzID0gLTE7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXM7XG59XG5cbmZ1bmN0aW9uIF9mb3JtYXQoc2VwLCBwYXRoT2JqZWN0KSB7XG4gIHZhciBkaXIgPSBwYXRoT2JqZWN0LmRpciB8fCBwYXRoT2JqZWN0LnJvb3Q7XG4gIHZhciBiYXNlID0gcGF0aE9iamVjdC5iYXNlIHx8IChwYXRoT2JqZWN0Lm5hbWUgfHwgJycpICsgKHBhdGhPYmplY3QuZXh0IHx8ICcnKTtcbiAgaWYgKCFkaXIpIHtcbiAgICByZXR1cm4gYmFzZTtcbiAgfVxuICBpZiAoZGlyID09PSBwYXRoT2JqZWN0LnJvb3QpIHtcbiAgICByZXR1cm4gZGlyICsgYmFzZTtcbiAgfVxuICByZXR1cm4gZGlyICsgc2VwICsgYmFzZTtcbn1cblxudmFyIHBvc2l4ID0ge1xuICAvLyBwYXRoLnJlc29sdmUoW2Zyb20gLi4uXSwgdG8pXG4gIHJlc29sdmU6IGZ1bmN0aW9uIHJlc29sdmUoKSB7XG4gICAgdmFyIHJlc29sdmVkUGF0aCA9ICcnO1xuICAgIHZhciByZXNvbHZlZEFic29sdXRlID0gZmFsc2U7XG4gICAgdmFyIGN3ZDtcblxuICAgIGZvciAodmFyIGkgPSBhcmd1bWVudHMubGVuZ3RoIC0gMTsgaSA+PSAtMSAmJiAhcmVzb2x2ZWRBYnNvbHV0ZTsgaS0tKSB7XG4gICAgICB2YXIgcGF0aDtcbiAgICAgIGlmIChpID49IDApXG4gICAgICAgIHBhdGggPSBhcmd1bWVudHNbaV07XG4gICAgICBlbHNlIHtcbiAgICAgICAgaWYgKGN3ZCA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgIGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG4gICAgICAgIHBhdGggPSBjd2Q7XG4gICAgICB9XG5cbiAgICAgIGFzc2VydFBhdGgocGF0aCk7XG5cbiAgICAgIC8vIFNraXAgZW1wdHkgZW50cmllc1xuICAgICAgaWYgKHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICByZXNvbHZlZFBhdGggPSBwYXRoICsgJy8nICsgcmVzb2x2ZWRQYXRoO1xuICAgICAgcmVzb2x2ZWRBYnNvbHV0ZSA9IHBhdGguY2hhckNvZGVBdCgwKSA9PT0gNDcgLyovKi87XG4gICAgfVxuXG4gICAgLy8gQXQgdGhpcyBwb2ludCB0aGUgcGF0aCBzaG91bGQgYmUgcmVzb2x2ZWQgdG8gYSBmdWxsIGFic29sdXRlIHBhdGgsIGJ1dFxuICAgIC8vIGhhbmRsZSByZWxhdGl2ZSBwYXRocyB0byBiZSBzYWZlIChtaWdodCBoYXBwZW4gd2hlbiBwcm9jZXNzLmN3ZCgpIGZhaWxzKVxuXG4gICAgLy8gTm9ybWFsaXplIHRoZSBwYXRoXG4gICAgcmVzb2x2ZWRQYXRoID0gbm9ybWFsaXplU3RyaW5nUG9zaXgocmVzb2x2ZWRQYXRoLCAhcmVzb2x2ZWRBYnNvbHV0ZSk7XG5cbiAgICBpZiAocmVzb2x2ZWRBYnNvbHV0ZSkge1xuICAgICAgaWYgKHJlc29sdmVkUGF0aC5sZW5ndGggPiAwKVxuICAgICAgICByZXR1cm4gJy8nICsgcmVzb2x2ZWRQYXRoO1xuICAgICAgZWxzZVxuICAgICAgICByZXR1cm4gJy8nO1xuICAgIH0gZWxzZSBpZiAocmVzb2x2ZWRQYXRoLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiByZXNvbHZlZFBhdGg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAnLic7XG4gICAgfVxuICB9LFxuXG4gIG5vcm1hbGl6ZTogZnVuY3Rpb24gbm9ybWFsaXplKHBhdGgpIHtcbiAgICBhc3NlcnRQYXRoKHBhdGgpO1xuXG4gICAgaWYgKHBhdGgubGVuZ3RoID09PSAwKSByZXR1cm4gJy4nO1xuXG4gICAgdmFyIGlzQWJzb2x1dGUgPSBwYXRoLmNoYXJDb2RlQXQoMCkgPT09IDQ3IC8qLyovO1xuICAgIHZhciB0cmFpbGluZ1NlcGFyYXRvciA9IHBhdGguY2hhckNvZGVBdChwYXRoLmxlbmd0aCAtIDEpID09PSA0NyAvKi8qLztcblxuICAgIC8vIE5vcm1hbGl6ZSB0aGUgcGF0aFxuICAgIHBhdGggPSBub3JtYWxpemVTdHJpbmdQb3NpeChwYXRoLCAhaXNBYnNvbHV0ZSk7XG5cbiAgICBpZiAocGF0aC5sZW5ndGggPT09IDAgJiYgIWlzQWJzb2x1dGUpIHBhdGggPSAnLic7XG4gICAgaWYgKHBhdGgubGVuZ3RoID4gMCAmJiB0cmFpbGluZ1NlcGFyYXRvcikgcGF0aCArPSAnLyc7XG5cbiAgICBpZiAoaXNBYnNvbHV0ZSkgcmV0dXJuICcvJyArIHBhdGg7XG4gICAgcmV0dXJuIHBhdGg7XG4gIH0sXG5cbiAgaXNBYnNvbHV0ZTogZnVuY3Rpb24gaXNBYnNvbHV0ZShwYXRoKSB7XG4gICAgYXNzZXJ0UGF0aChwYXRoKTtcbiAgICByZXR1cm4gcGF0aC5sZW5ndGggPiAwICYmIHBhdGguY2hhckNvZGVBdCgwKSA9PT0gNDcgLyovKi87XG4gIH0sXG5cbiAgam9pbjogZnVuY3Rpb24gam9pbigpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHJldHVybiAnLic7XG4gICAgdmFyIGpvaW5lZDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7ICsraSkge1xuICAgICAgdmFyIGFyZyA9IGFyZ3VtZW50c1tpXTtcbiAgICAgIGFzc2VydFBhdGgoYXJnKTtcbiAgICAgIGlmIChhcmcubGVuZ3RoID4gMCkge1xuICAgICAgICBpZiAoam9pbmVkID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgam9pbmVkID0gYXJnO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgam9pbmVkICs9ICcvJyArIGFyZztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGpvaW5lZCA9PT0gdW5kZWZpbmVkKVxuICAgICAgcmV0dXJuICcuJztcbiAgICByZXR1cm4gcG9zaXgubm9ybWFsaXplKGpvaW5lZCk7XG4gIH0sXG5cbiAgcmVsYXRpdmU6IGZ1bmN0aW9uIHJlbGF0aXZlKGZyb20sIHRvKSB7XG4gICAgYXNzZXJ0UGF0aChmcm9tKTtcbiAgICBhc3NlcnRQYXRoKHRvKTtcblxuICAgIGlmIChmcm9tID09PSB0bykgcmV0dXJuICcnO1xuXG4gICAgZnJvbSA9IHBvc2l4LnJlc29sdmUoZnJvbSk7XG4gICAgdG8gPSBwb3NpeC5yZXNvbHZlKHRvKTtcblxuICAgIGlmIChmcm9tID09PSB0bykgcmV0dXJuICcnO1xuXG4gICAgLy8gVHJpbSBhbnkgbGVhZGluZyBiYWNrc2xhc2hlc1xuICAgIHZhciBmcm9tU3RhcnQgPSAxO1xuICAgIGZvciAoOyBmcm9tU3RhcnQgPCBmcm9tLmxlbmd0aDsgKytmcm9tU3RhcnQpIHtcbiAgICAgIGlmIChmcm9tLmNoYXJDb2RlQXQoZnJvbVN0YXJ0KSAhPT0gNDcgLyovKi8pXG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICB2YXIgZnJvbUVuZCA9IGZyb20ubGVuZ3RoO1xuICAgIHZhciBmcm9tTGVuID0gZnJvbUVuZCAtIGZyb21TdGFydDtcblxuICAgIC8vIFRyaW0gYW55IGxlYWRpbmcgYmFja3NsYXNoZXNcbiAgICB2YXIgdG9TdGFydCA9IDE7XG4gICAgZm9yICg7IHRvU3RhcnQgPCB0by5sZW5ndGg7ICsrdG9TdGFydCkge1xuICAgICAgaWYgKHRvLmNoYXJDb2RlQXQodG9TdGFydCkgIT09IDQ3IC8qLyovKVxuICAgICAgICBicmVhaztcbiAgICB9XG4gICAgdmFyIHRvRW5kID0gdG8ubGVuZ3RoO1xuICAgIHZhciB0b0xlbiA9IHRvRW5kIC0gdG9TdGFydDtcblxuICAgIC8vIENvbXBhcmUgcGF0aHMgdG8gZmluZCB0aGUgbG9uZ2VzdCBjb21tb24gcGF0aCBmcm9tIHJvb3RcbiAgICB2YXIgbGVuZ3RoID0gZnJvbUxlbiA8IHRvTGVuID8gZnJvbUxlbiA6IHRvTGVuO1xuICAgIHZhciBsYXN0Q29tbW9uU2VwID0gLTE7XG4gICAgdmFyIGkgPSAwO1xuICAgIGZvciAoOyBpIDw9IGxlbmd0aDsgKytpKSB7XG4gICAgICBpZiAoaSA9PT0gbGVuZ3RoKSB7XG4gICAgICAgIGlmICh0b0xlbiA+IGxlbmd0aCkge1xuICAgICAgICAgIGlmICh0by5jaGFyQ29kZUF0KHRvU3RhcnQgKyBpKSA9PT0gNDcgLyovKi8pIHtcbiAgICAgICAgICAgIC8vIFdlIGdldCBoZXJlIGlmIGBmcm9tYCBpcyB0aGUgZXhhY3QgYmFzZSBwYXRoIGZvciBgdG9gLlxuICAgICAgICAgICAgLy8gRm9yIGV4YW1wbGU6IGZyb209Jy9mb28vYmFyJzsgdG89Jy9mb28vYmFyL2JheidcbiAgICAgICAgICAgIHJldHVybiB0by5zbGljZSh0b1N0YXJ0ICsgaSArIDEpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoaSA9PT0gMCkge1xuICAgICAgICAgICAgLy8gV2UgZ2V0IGhlcmUgaWYgYGZyb21gIGlzIHRoZSByb290XG4gICAgICAgICAgICAvLyBGb3IgZXhhbXBsZTogZnJvbT0nLyc7IHRvPScvZm9vJ1xuICAgICAgICAgICAgcmV0dXJuIHRvLnNsaWNlKHRvU3RhcnQgKyBpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoZnJvbUxlbiA+IGxlbmd0aCkge1xuICAgICAgICAgIGlmIChmcm9tLmNoYXJDb2RlQXQoZnJvbVN0YXJ0ICsgaSkgPT09IDQ3IC8qLyovKSB7XG4gICAgICAgICAgICAvLyBXZSBnZXQgaGVyZSBpZiBgdG9gIGlzIHRoZSBleGFjdCBiYXNlIHBhdGggZm9yIGBmcm9tYC5cbiAgICAgICAgICAgIC8vIEZvciBleGFtcGxlOiBmcm9tPScvZm9vL2Jhci9iYXonOyB0bz0nL2Zvby9iYXInXG4gICAgICAgICAgICBsYXN0Q29tbW9uU2VwID0gaTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGkgPT09IDApIHtcbiAgICAgICAgICAgIC8vIFdlIGdldCBoZXJlIGlmIGB0b2AgaXMgdGhlIHJvb3QuXG4gICAgICAgICAgICAvLyBGb3IgZXhhbXBsZTogZnJvbT0nL2Zvbyc7IHRvPScvJ1xuICAgICAgICAgICAgbGFzdENvbW1vblNlcCA9IDA7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgdmFyIGZyb21Db2RlID0gZnJvbS5jaGFyQ29kZUF0KGZyb21TdGFydCArIGkpO1xuICAgICAgdmFyIHRvQ29kZSA9IHRvLmNoYXJDb2RlQXQodG9TdGFydCArIGkpO1xuICAgICAgaWYgKGZyb21Db2RlICE9PSB0b0NvZGUpXG4gICAgICAgIGJyZWFrO1xuICAgICAgZWxzZSBpZiAoZnJvbUNvZGUgPT09IDQ3IC8qLyovKVxuICAgICAgICBsYXN0Q29tbW9uU2VwID0gaTtcbiAgICB9XG5cbiAgICB2YXIgb3V0ID0gJyc7XG4gICAgLy8gR2VuZXJhdGUgdGhlIHJlbGF0aXZlIHBhdGggYmFzZWQgb24gdGhlIHBhdGggZGlmZmVyZW5jZSBiZXR3ZWVuIGB0b2BcbiAgICAvLyBhbmQgYGZyb21gXG4gICAgZm9yIChpID0gZnJvbVN0YXJ0ICsgbGFzdENvbW1vblNlcCArIDE7IGkgPD0gZnJvbUVuZDsgKytpKSB7XG4gICAgICBpZiAoaSA9PT0gZnJvbUVuZCB8fCBmcm9tLmNoYXJDb2RlQXQoaSkgPT09IDQ3IC8qLyovKSB7XG4gICAgICAgIGlmIChvdXQubGVuZ3RoID09PSAwKVxuICAgICAgICAgIG91dCArPSAnLi4nO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgb3V0ICs9ICcvLi4nO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIExhc3RseSwgYXBwZW5kIHRoZSByZXN0IG9mIHRoZSBkZXN0aW5hdGlvbiAoYHRvYCkgcGF0aCB0aGF0IGNvbWVzIGFmdGVyXG4gICAgLy8gdGhlIGNvbW1vbiBwYXRoIHBhcnRzXG4gICAgaWYgKG91dC5sZW5ndGggPiAwKVxuICAgICAgcmV0dXJuIG91dCArIHRvLnNsaWNlKHRvU3RhcnQgKyBsYXN0Q29tbW9uU2VwKTtcbiAgICBlbHNlIHtcbiAgICAgIHRvU3RhcnQgKz0gbGFzdENvbW1vblNlcDtcbiAgICAgIGlmICh0by5jaGFyQ29kZUF0KHRvU3RhcnQpID09PSA0NyAvKi8qLylcbiAgICAgICAgKyt0b1N0YXJ0O1xuICAgICAgcmV0dXJuIHRvLnNsaWNlKHRvU3RhcnQpO1xuICAgIH1cbiAgfSxcblxuICBfbWFrZUxvbmc6IGZ1bmN0aW9uIF9tYWtlTG9uZyhwYXRoKSB7XG4gICAgcmV0dXJuIHBhdGg7XG4gIH0sXG5cbiAgZGlybmFtZTogZnVuY3Rpb24gZGlybmFtZShwYXRoKSB7XG4gICAgYXNzZXJ0UGF0aChwYXRoKTtcbiAgICBpZiAocGF0aC5sZW5ndGggPT09IDApIHJldHVybiAnLic7XG4gICAgdmFyIGNvZGUgPSBwYXRoLmNoYXJDb2RlQXQoMCk7XG4gICAgdmFyIGhhc1Jvb3QgPSBjb2RlID09PSA0NyAvKi8qLztcbiAgICB2YXIgZW5kID0gLTE7XG4gICAgdmFyIG1hdGNoZWRTbGFzaCA9IHRydWU7XG4gICAgZm9yICh2YXIgaSA9IHBhdGgubGVuZ3RoIC0gMTsgaSA+PSAxOyAtLWkpIHtcbiAgICAgIGNvZGUgPSBwYXRoLmNoYXJDb2RlQXQoaSk7XG4gICAgICBpZiAoY29kZSA9PT0gNDcgLyovKi8pIHtcbiAgICAgICAgICBpZiAoIW1hdGNoZWRTbGFzaCkge1xuICAgICAgICAgICAgZW5kID0gaTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gV2Ugc2F3IHRoZSBmaXJzdCBub24tcGF0aCBzZXBhcmF0b3JcbiAgICAgICAgbWF0Y2hlZFNsYXNoID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGVuZCA9PT0gLTEpIHJldHVybiBoYXNSb290ID8gJy8nIDogJy4nO1xuICAgIGlmIChoYXNSb290ICYmIGVuZCA9PT0gMSkgcmV0dXJuICcvLyc7XG4gICAgcmV0dXJuIHBhdGguc2xpY2UoMCwgZW5kKTtcbiAgfSxcblxuICBiYXNlbmFtZTogZnVuY3Rpb24gYmFzZW5hbWUocGF0aCwgZXh0KSB7XG4gICAgaWYgKGV4dCAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBleHQgIT09ICdzdHJpbmcnKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImV4dFwiIGFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmcnKTtcbiAgICBhc3NlcnRQYXRoKHBhdGgpO1xuXG4gICAgdmFyIHN0YXJ0ID0gMDtcbiAgICB2YXIgZW5kID0gLTE7XG4gICAgdmFyIG1hdGNoZWRTbGFzaCA9IHRydWU7XG4gICAgdmFyIGk7XG5cbiAgICBpZiAoZXh0ICE9PSB1bmRlZmluZWQgJiYgZXh0Lmxlbmd0aCA+IDAgJiYgZXh0Lmxlbmd0aCA8PSBwYXRoLmxlbmd0aCkge1xuICAgICAgaWYgKGV4dC5sZW5ndGggPT09IHBhdGgubGVuZ3RoICYmIGV4dCA9PT0gcGF0aCkgcmV0dXJuICcnO1xuICAgICAgdmFyIGV4dElkeCA9IGV4dC5sZW5ndGggLSAxO1xuICAgICAgdmFyIGZpcnN0Tm9uU2xhc2hFbmQgPSAtMTtcbiAgICAgIGZvciAoaSA9IHBhdGgubGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgICAgdmFyIGNvZGUgPSBwYXRoLmNoYXJDb2RlQXQoaSk7XG4gICAgICAgIGlmIChjb2RlID09PSA0NyAvKi8qLykge1xuICAgICAgICAgICAgLy8gSWYgd2UgcmVhY2hlZCBhIHBhdGggc2VwYXJhdG9yIHRoYXQgd2FzIG5vdCBwYXJ0IG9mIGEgc2V0IG9mIHBhdGhcbiAgICAgICAgICAgIC8vIHNlcGFyYXRvcnMgYXQgdGhlIGVuZCBvZiB0aGUgc3RyaW5nLCBzdG9wIG5vd1xuICAgICAgICAgICAgaWYgKCFtYXRjaGVkU2xhc2gpIHtcbiAgICAgICAgICAgICAgc3RhcnQgPSBpICsgMTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoZmlyc3ROb25TbGFzaEVuZCA9PT0gLTEpIHtcbiAgICAgICAgICAgIC8vIFdlIHNhdyB0aGUgZmlyc3Qgbm9uLXBhdGggc2VwYXJhdG9yLCByZW1lbWJlciB0aGlzIGluZGV4IGluIGNhc2VcbiAgICAgICAgICAgIC8vIHdlIG5lZWQgaXQgaWYgdGhlIGV4dGVuc2lvbiBlbmRzIHVwIG5vdCBtYXRjaGluZ1xuICAgICAgICAgICAgbWF0Y2hlZFNsYXNoID0gZmFsc2U7XG4gICAgICAgICAgICBmaXJzdE5vblNsYXNoRW5kID0gaSArIDE7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChleHRJZHggPj0gMCkge1xuICAgICAgICAgICAgLy8gVHJ5IHRvIG1hdGNoIHRoZSBleHBsaWNpdCBleHRlbnNpb25cbiAgICAgICAgICAgIGlmIChjb2RlID09PSBleHQuY2hhckNvZGVBdChleHRJZHgpKSB7XG4gICAgICAgICAgICAgIGlmICgtLWV4dElkeCA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAvLyBXZSBtYXRjaGVkIHRoZSBleHRlbnNpb24sIHNvIG1hcmsgdGhpcyBhcyB0aGUgZW5kIG9mIG91ciBwYXRoXG4gICAgICAgICAgICAgICAgLy8gY29tcG9uZW50XG4gICAgICAgICAgICAgICAgZW5kID0gaTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gRXh0ZW5zaW9uIGRvZXMgbm90IG1hdGNoLCBzbyBvdXIgcmVzdWx0IGlzIHRoZSBlbnRpcmUgcGF0aFxuICAgICAgICAgICAgICAvLyBjb21wb25lbnRcbiAgICAgICAgICAgICAgZXh0SWR4ID0gLTE7XG4gICAgICAgICAgICAgIGVuZCA9IGZpcnN0Tm9uU2xhc2hFbmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChzdGFydCA9PT0gZW5kKSBlbmQgPSBmaXJzdE5vblNsYXNoRW5kO2Vsc2UgaWYgKGVuZCA9PT0gLTEpIGVuZCA9IHBhdGgubGVuZ3RoO1xuICAgICAgcmV0dXJuIHBhdGguc2xpY2Uoc3RhcnQsIGVuZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAoaSA9IHBhdGgubGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgICAgaWYgKHBhdGguY2hhckNvZGVBdChpKSA9PT0gNDcgLyovKi8pIHtcbiAgICAgICAgICAgIC8vIElmIHdlIHJlYWNoZWQgYSBwYXRoIHNlcGFyYXRvciB0aGF0IHdhcyBub3QgcGFydCBvZiBhIHNldCBvZiBwYXRoXG4gICAgICAgICAgICAvLyBzZXBhcmF0b3JzIGF0IHRoZSBlbmQgb2YgdGhlIHN0cmluZywgc3RvcCBub3dcbiAgICAgICAgICAgIGlmICghbWF0Y2hlZFNsYXNoKSB7XG4gICAgICAgICAgICAgIHN0YXJ0ID0gaSArIDE7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAoZW5kID09PSAtMSkge1xuICAgICAgICAgIC8vIFdlIHNhdyB0aGUgZmlyc3Qgbm9uLXBhdGggc2VwYXJhdG9yLCBtYXJrIHRoaXMgYXMgdGhlIGVuZCBvZiBvdXJcbiAgICAgICAgICAvLyBwYXRoIGNvbXBvbmVudFxuICAgICAgICAgIG1hdGNoZWRTbGFzaCA9IGZhbHNlO1xuICAgICAgICAgIGVuZCA9IGkgKyAxO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChlbmQgPT09IC0xKSByZXR1cm4gJyc7XG4gICAgICByZXR1cm4gcGF0aC5zbGljZShzdGFydCwgZW5kKTtcbiAgICB9XG4gIH0sXG5cbiAgZXh0bmFtZTogZnVuY3Rpb24gZXh0bmFtZShwYXRoKSB7XG4gICAgYXNzZXJ0UGF0aChwYXRoKTtcbiAgICB2YXIgc3RhcnREb3QgPSAtMTtcbiAgICB2YXIgc3RhcnRQYXJ0ID0gMDtcbiAgICB2YXIgZW5kID0gLTE7XG4gICAgdmFyIG1hdGNoZWRTbGFzaCA9IHRydWU7XG4gICAgLy8gVHJhY2sgdGhlIHN0YXRlIG9mIGNoYXJhY3RlcnMgKGlmIGFueSkgd2Ugc2VlIGJlZm9yZSBvdXIgZmlyc3QgZG90IGFuZFxuICAgIC8vIGFmdGVyIGFueSBwYXRoIHNlcGFyYXRvciB3ZSBmaW5kXG4gICAgdmFyIHByZURvdFN0YXRlID0gMDtcbiAgICBmb3IgKHZhciBpID0gcGF0aC5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgdmFyIGNvZGUgPSBwYXRoLmNoYXJDb2RlQXQoaSk7XG4gICAgICBpZiAoY29kZSA9PT0gNDcgLyovKi8pIHtcbiAgICAgICAgICAvLyBJZiB3ZSByZWFjaGVkIGEgcGF0aCBzZXBhcmF0b3IgdGhhdCB3YXMgbm90IHBhcnQgb2YgYSBzZXQgb2YgcGF0aFxuICAgICAgICAgIC8vIHNlcGFyYXRvcnMgYXQgdGhlIGVuZCBvZiB0aGUgc3RyaW5nLCBzdG9wIG5vd1xuICAgICAgICAgIGlmICghbWF0Y2hlZFNsYXNoKSB7XG4gICAgICAgICAgICBzdGFydFBhcnQgPSBpICsgMTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgaWYgKGVuZCA9PT0gLTEpIHtcbiAgICAgICAgLy8gV2Ugc2F3IHRoZSBmaXJzdCBub24tcGF0aCBzZXBhcmF0b3IsIG1hcmsgdGhpcyBhcyB0aGUgZW5kIG9mIG91clxuICAgICAgICAvLyBleHRlbnNpb25cbiAgICAgICAgbWF0Y2hlZFNsYXNoID0gZmFsc2U7XG4gICAgICAgIGVuZCA9IGkgKyAxO1xuICAgICAgfVxuICAgICAgaWYgKGNvZGUgPT09IDQ2IC8qLiovKSB7XG4gICAgICAgICAgLy8gSWYgdGhpcyBpcyBvdXIgZmlyc3QgZG90LCBtYXJrIGl0IGFzIHRoZSBzdGFydCBvZiBvdXIgZXh0ZW5zaW9uXG4gICAgICAgICAgaWYgKHN0YXJ0RG90ID09PSAtMSlcbiAgICAgICAgICAgIHN0YXJ0RG90ID0gaTtcbiAgICAgICAgICBlbHNlIGlmIChwcmVEb3RTdGF0ZSAhPT0gMSlcbiAgICAgICAgICAgIHByZURvdFN0YXRlID0gMTtcbiAgICAgIH0gZWxzZSBpZiAoc3RhcnREb3QgIT09IC0xKSB7XG4gICAgICAgIC8vIFdlIHNhdyBhIG5vbi1kb3QgYW5kIG5vbi1wYXRoIHNlcGFyYXRvciBiZWZvcmUgb3VyIGRvdCwgc28gd2Ugc2hvdWxkXG4gICAgICAgIC8vIGhhdmUgYSBnb29kIGNoYW5jZSBhdCBoYXZpbmcgYSBub24tZW1wdHkgZXh0ZW5zaW9uXG4gICAgICAgIHByZURvdFN0YXRlID0gLTE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN0YXJ0RG90ID09PSAtMSB8fCBlbmQgPT09IC0xIHx8XG4gICAgICAgIC8vIFdlIHNhdyBhIG5vbi1kb3QgY2hhcmFjdGVyIGltbWVkaWF0ZWx5IGJlZm9yZSB0aGUgZG90XG4gICAgICAgIHByZURvdFN0YXRlID09PSAwIHx8XG4gICAgICAgIC8vIFRoZSAocmlnaHQtbW9zdCkgdHJpbW1lZCBwYXRoIGNvbXBvbmVudCBpcyBleGFjdGx5ICcuLidcbiAgICAgICAgcHJlRG90U3RhdGUgPT09IDEgJiYgc3RhcnREb3QgPT09IGVuZCAtIDEgJiYgc3RhcnREb3QgPT09IHN0YXJ0UGFydCArIDEpIHtcbiAgICAgIHJldHVybiAnJztcbiAgICB9XG4gICAgcmV0dXJuIHBhdGguc2xpY2Uoc3RhcnREb3QsIGVuZCk7XG4gIH0sXG5cbiAgZm9ybWF0OiBmdW5jdGlvbiBmb3JtYXQocGF0aE9iamVjdCkge1xuICAgIGlmIChwYXRoT2JqZWN0ID09PSBudWxsIHx8IHR5cGVvZiBwYXRoT2JqZWN0ICE9PSAnb2JqZWN0Jykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwicGF0aE9iamVjdFwiIGFyZ3VtZW50IG11c3QgYmUgb2YgdHlwZSBPYmplY3QuIFJlY2VpdmVkIHR5cGUgJyArIHR5cGVvZiBwYXRoT2JqZWN0KTtcbiAgICB9XG4gICAgcmV0dXJuIF9mb3JtYXQoJy8nLCBwYXRoT2JqZWN0KTtcbiAgfSxcblxuICBwYXJzZTogZnVuY3Rpb24gcGFyc2UocGF0aCkge1xuICAgIGFzc2VydFBhdGgocGF0aCk7XG5cbiAgICB2YXIgcmV0ID0geyByb290OiAnJywgZGlyOiAnJywgYmFzZTogJycsIGV4dDogJycsIG5hbWU6ICcnIH07XG4gICAgaWYgKHBhdGgubGVuZ3RoID09PSAwKSByZXR1cm4gcmV0O1xuICAgIHZhciBjb2RlID0gcGF0aC5jaGFyQ29kZUF0KDApO1xuICAgIHZhciBpc0Fic29sdXRlID0gY29kZSA9PT0gNDcgLyovKi87XG4gICAgdmFyIHN0YXJ0O1xuICAgIGlmIChpc0Fic29sdXRlKSB7XG4gICAgICByZXQucm9vdCA9ICcvJztcbiAgICAgIHN0YXJ0ID0gMTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RhcnQgPSAwO1xuICAgIH1cbiAgICB2YXIgc3RhcnREb3QgPSAtMTtcbiAgICB2YXIgc3RhcnRQYXJ0ID0gMDtcbiAgICB2YXIgZW5kID0gLTE7XG4gICAgdmFyIG1hdGNoZWRTbGFzaCA9IHRydWU7XG4gICAgdmFyIGkgPSBwYXRoLmxlbmd0aCAtIDE7XG5cbiAgICAvLyBUcmFjayB0aGUgc3RhdGUgb2YgY2hhcmFjdGVycyAoaWYgYW55KSB3ZSBzZWUgYmVmb3JlIG91ciBmaXJzdCBkb3QgYW5kXG4gICAgLy8gYWZ0ZXIgYW55IHBhdGggc2VwYXJhdG9yIHdlIGZpbmRcbiAgICB2YXIgcHJlRG90U3RhdGUgPSAwO1xuXG4gICAgLy8gR2V0IG5vbi1kaXIgaW5mb1xuICAgIGZvciAoOyBpID49IHN0YXJ0OyAtLWkpIHtcbiAgICAgIGNvZGUgPSBwYXRoLmNoYXJDb2RlQXQoaSk7XG4gICAgICBpZiAoY29kZSA9PT0gNDcgLyovKi8pIHtcbiAgICAgICAgICAvLyBJZiB3ZSByZWFjaGVkIGEgcGF0aCBzZXBhcmF0b3IgdGhhdCB3YXMgbm90IHBhcnQgb2YgYSBzZXQgb2YgcGF0aFxuICAgICAgICAgIC8vIHNlcGFyYXRvcnMgYXQgdGhlIGVuZCBvZiB0aGUgc3RyaW5nLCBzdG9wIG5vd1xuICAgICAgICAgIGlmICghbWF0Y2hlZFNsYXNoKSB7XG4gICAgICAgICAgICBzdGFydFBhcnQgPSBpICsgMTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgaWYgKGVuZCA9PT0gLTEpIHtcbiAgICAgICAgLy8gV2Ugc2F3IHRoZSBmaXJzdCBub24tcGF0aCBzZXBhcmF0b3IsIG1hcmsgdGhpcyBhcyB0aGUgZW5kIG9mIG91clxuICAgICAgICAvLyBleHRlbnNpb25cbiAgICAgICAgbWF0Y2hlZFNsYXNoID0gZmFsc2U7XG4gICAgICAgIGVuZCA9IGkgKyAxO1xuICAgICAgfVxuICAgICAgaWYgKGNvZGUgPT09IDQ2IC8qLiovKSB7XG4gICAgICAgICAgLy8gSWYgdGhpcyBpcyBvdXIgZmlyc3QgZG90LCBtYXJrIGl0IGFzIHRoZSBzdGFydCBvZiBvdXIgZXh0ZW5zaW9uXG4gICAgICAgICAgaWYgKHN0YXJ0RG90ID09PSAtMSkgc3RhcnREb3QgPSBpO2Vsc2UgaWYgKHByZURvdFN0YXRlICE9PSAxKSBwcmVEb3RTdGF0ZSA9IDE7XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhcnREb3QgIT09IC0xKSB7XG4gICAgICAgIC8vIFdlIHNhdyBhIG5vbi1kb3QgYW5kIG5vbi1wYXRoIHNlcGFyYXRvciBiZWZvcmUgb3VyIGRvdCwgc28gd2Ugc2hvdWxkXG4gICAgICAgIC8vIGhhdmUgYSBnb29kIGNoYW5jZSBhdCBoYXZpbmcgYSBub24tZW1wdHkgZXh0ZW5zaW9uXG4gICAgICAgIHByZURvdFN0YXRlID0gLTE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN0YXJ0RG90ID09PSAtMSB8fCBlbmQgPT09IC0xIHx8XG4gICAgLy8gV2Ugc2F3IGEgbm9uLWRvdCBjaGFyYWN0ZXIgaW1tZWRpYXRlbHkgYmVmb3JlIHRoZSBkb3RcbiAgICBwcmVEb3RTdGF0ZSA9PT0gMCB8fFxuICAgIC8vIFRoZSAocmlnaHQtbW9zdCkgdHJpbW1lZCBwYXRoIGNvbXBvbmVudCBpcyBleGFjdGx5ICcuLidcbiAgICBwcmVEb3RTdGF0ZSA9PT0gMSAmJiBzdGFydERvdCA9PT0gZW5kIC0gMSAmJiBzdGFydERvdCA9PT0gc3RhcnRQYXJ0ICsgMSkge1xuICAgICAgaWYgKGVuZCAhPT0gLTEpIHtcbiAgICAgICAgaWYgKHN0YXJ0UGFydCA9PT0gMCAmJiBpc0Fic29sdXRlKSByZXQuYmFzZSA9IHJldC5uYW1lID0gcGF0aC5zbGljZSgxLCBlbmQpO2Vsc2UgcmV0LmJhc2UgPSByZXQubmFtZSA9IHBhdGguc2xpY2Uoc3RhcnRQYXJ0LCBlbmQpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoc3RhcnRQYXJ0ID09PSAwICYmIGlzQWJzb2x1dGUpIHtcbiAgICAgICAgcmV0Lm5hbWUgPSBwYXRoLnNsaWNlKDEsIHN0YXJ0RG90KTtcbiAgICAgICAgcmV0LmJhc2UgPSBwYXRoLnNsaWNlKDEsIGVuZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXQubmFtZSA9IHBhdGguc2xpY2Uoc3RhcnRQYXJ0LCBzdGFydERvdCk7XG4gICAgICAgIHJldC5iYXNlID0gcGF0aC5zbGljZShzdGFydFBhcnQsIGVuZCk7XG4gICAgICB9XG4gICAgICByZXQuZXh0ID0gcGF0aC5zbGljZShzdGFydERvdCwgZW5kKTtcbiAgICB9XG5cbiAgICBpZiAoc3RhcnRQYXJ0ID4gMCkgcmV0LmRpciA9IHBhdGguc2xpY2UoMCwgc3RhcnRQYXJ0IC0gMSk7ZWxzZSBpZiAoaXNBYnNvbHV0ZSkgcmV0LmRpciA9ICcvJztcblxuICAgIHJldHVybiByZXQ7XG4gIH0sXG5cbiAgc2VwOiAnLycsXG4gIGRlbGltaXRlcjogJzonLFxuICB3aW4zMjogbnVsbCxcbiAgcG9zaXg6IG51bGxcbn07XG5cbnBvc2l4LnBvc2l4ID0gcG9zaXg7XG5cbm1vZHVsZS5leHBvcnRzID0gcG9zaXg7XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRPbmNlTGlzdGVuZXIgPSBub29wO1xuXG5wcm9jZXNzLmxpc3RlbmVycyA9IGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiBbXSB9XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0J1ZmZlcihhcmcpIHtcbiAgcmV0dXJuIGFyZyAmJiB0eXBlb2YgYXJnID09PSAnb2JqZWN0J1xuICAgICYmIHR5cGVvZiBhcmcuY29weSA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcuZmlsbCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcucmVhZFVJbnQ4ID09PSAnZnVuY3Rpb24nO1xufSIsIi8vIEN1cnJlbnRseSBpbiBzeW5jIHdpdGggTm9kZS5qcyBsaWIvaW50ZXJuYWwvdXRpbC90eXBlcy5qc1xuLy8gaHR0cHM6Ly9naXRodWIuY29tL25vZGVqcy9ub2RlL2NvbW1pdC8xMTJjYzdjMjc1NTEyNTRhYTJiMTcwOThmYjc3NDg2N2YwNWVkMGQ5XG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGlzQXJndW1lbnRzT2JqZWN0ID0gcmVxdWlyZSgnaXMtYXJndW1lbnRzJyk7XG52YXIgaXNHZW5lcmF0b3JGdW5jdGlvbiA9IHJlcXVpcmUoJ2lzLWdlbmVyYXRvci1mdW5jdGlvbicpO1xudmFyIHdoaWNoVHlwZWRBcnJheSA9IHJlcXVpcmUoJ3doaWNoLXR5cGVkLWFycmF5Jyk7XG52YXIgaXNUeXBlZEFycmF5ID0gcmVxdWlyZSgnaXMtdHlwZWQtYXJyYXknKTtcblxuZnVuY3Rpb24gdW5jdXJyeVRoaXMoZikge1xuICByZXR1cm4gZi5jYWxsLmJpbmQoZik7XG59XG5cbnZhciBCaWdJbnRTdXBwb3J0ZWQgPSB0eXBlb2YgQmlnSW50ICE9PSAndW5kZWZpbmVkJztcbnZhciBTeW1ib2xTdXBwb3J0ZWQgPSB0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJztcblxudmFyIE9iamVjdFRvU3RyaW5nID0gdW5jdXJyeVRoaXMoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZyk7XG5cbnZhciBudW1iZXJWYWx1ZSA9IHVuY3VycnlUaGlzKE51bWJlci5wcm90b3R5cGUudmFsdWVPZik7XG52YXIgc3RyaW5nVmFsdWUgPSB1bmN1cnJ5VGhpcyhTdHJpbmcucHJvdG90eXBlLnZhbHVlT2YpO1xudmFyIGJvb2xlYW5WYWx1ZSA9IHVuY3VycnlUaGlzKEJvb2xlYW4ucHJvdG90eXBlLnZhbHVlT2YpO1xuXG5pZiAoQmlnSW50U3VwcG9ydGVkKSB7XG4gIHZhciBiaWdJbnRWYWx1ZSA9IHVuY3VycnlUaGlzKEJpZ0ludC5wcm90b3R5cGUudmFsdWVPZik7XG59XG5cbmlmIChTeW1ib2xTdXBwb3J0ZWQpIHtcbiAgdmFyIHN5bWJvbFZhbHVlID0gdW5jdXJyeVRoaXMoU3ltYm9sLnByb3RvdHlwZS52YWx1ZU9mKTtcbn1cblxuZnVuY3Rpb24gY2hlY2tCb3hlZFByaW1pdGl2ZSh2YWx1ZSwgcHJvdG90eXBlVmFsdWVPZikge1xuICBpZiAodHlwZW9mIHZhbHVlICE9PSAnb2JqZWN0Jykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICB0cnkge1xuICAgIHByb3RvdHlwZVZhbHVlT2YodmFsdWUpO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoKGUpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZXhwb3J0cy5pc0FyZ3VtZW50c09iamVjdCA9IGlzQXJndW1lbnRzT2JqZWN0O1xuZXhwb3J0cy5pc0dlbmVyYXRvckZ1bmN0aW9uID0gaXNHZW5lcmF0b3JGdW5jdGlvbjtcbmV4cG9ydHMuaXNUeXBlZEFycmF5ID0gaXNUeXBlZEFycmF5O1xuXG4vLyBUYWtlbiBmcm9tIGhlcmUgYW5kIG1vZGlmaWVkIGZvciBiZXR0ZXIgYnJvd3NlciBzdXBwb3J0XG4vLyBodHRwczovL2dpdGh1Yi5jb20vc2luZHJlc29yaHVzL3AtaXMtcHJvbWlzZS9ibG9iL2NkYTM1YTUxM2JkYTAzZjk3N2FkNWNkZTNhMDc5ZDIzN2U4MmQ3ZWYvaW5kZXguanNcbmZ1bmN0aW9uIGlzUHJvbWlzZShpbnB1dCkge1xuXHRyZXR1cm4gKFxuXHRcdChcblx0XHRcdHR5cGVvZiBQcm9taXNlICE9PSAndW5kZWZpbmVkJyAmJlxuXHRcdFx0aW5wdXQgaW5zdGFuY2VvZiBQcm9taXNlXG5cdFx0KSB8fFxuXHRcdChcblx0XHRcdGlucHV0ICE9PSBudWxsICYmXG5cdFx0XHR0eXBlb2YgaW5wdXQgPT09ICdvYmplY3QnICYmXG5cdFx0XHR0eXBlb2YgaW5wdXQudGhlbiA9PT0gJ2Z1bmN0aW9uJyAmJlxuXHRcdFx0dHlwZW9mIGlucHV0LmNhdGNoID09PSAnZnVuY3Rpb24nXG5cdFx0KVxuXHQpO1xufVxuZXhwb3J0cy5pc1Byb21pc2UgPSBpc1Byb21pc2U7XG5cbmZ1bmN0aW9uIGlzQXJyYXlCdWZmZXJWaWV3KHZhbHVlKSB7XG4gIGlmICh0eXBlb2YgQXJyYXlCdWZmZXIgIT09ICd1bmRlZmluZWQnICYmIEFycmF5QnVmZmVyLmlzVmlldykge1xuICAgIHJldHVybiBBcnJheUJ1ZmZlci5pc1ZpZXcodmFsdWUpO1xuICB9XG5cbiAgcmV0dXJuIChcbiAgICBpc1R5cGVkQXJyYXkodmFsdWUpIHx8XG4gICAgaXNEYXRhVmlldyh2YWx1ZSlcbiAgKTtcbn1cbmV4cG9ydHMuaXNBcnJheUJ1ZmZlclZpZXcgPSBpc0FycmF5QnVmZmVyVmlldztcblxuXG5mdW5jdGlvbiBpc1VpbnQ4QXJyYXkodmFsdWUpIHtcbiAgcmV0dXJuIHdoaWNoVHlwZWRBcnJheSh2YWx1ZSkgPT09ICdVaW50OEFycmF5Jztcbn1cbmV4cG9ydHMuaXNVaW50OEFycmF5ID0gaXNVaW50OEFycmF5O1xuXG5mdW5jdGlvbiBpc1VpbnQ4Q2xhbXBlZEFycmF5KHZhbHVlKSB7XG4gIHJldHVybiB3aGljaFR5cGVkQXJyYXkodmFsdWUpID09PSAnVWludDhDbGFtcGVkQXJyYXknO1xufVxuZXhwb3J0cy5pc1VpbnQ4Q2xhbXBlZEFycmF5ID0gaXNVaW50OENsYW1wZWRBcnJheTtcblxuZnVuY3Rpb24gaXNVaW50MTZBcnJheSh2YWx1ZSkge1xuICByZXR1cm4gd2hpY2hUeXBlZEFycmF5KHZhbHVlKSA9PT0gJ1VpbnQxNkFycmF5Jztcbn1cbmV4cG9ydHMuaXNVaW50MTZBcnJheSA9IGlzVWludDE2QXJyYXk7XG5cbmZ1bmN0aW9uIGlzVWludDMyQXJyYXkodmFsdWUpIHtcbiAgcmV0dXJuIHdoaWNoVHlwZWRBcnJheSh2YWx1ZSkgPT09ICdVaW50MzJBcnJheSc7XG59XG5leHBvcnRzLmlzVWludDMyQXJyYXkgPSBpc1VpbnQzMkFycmF5O1xuXG5mdW5jdGlvbiBpc0ludDhBcnJheSh2YWx1ZSkge1xuICByZXR1cm4gd2hpY2hUeXBlZEFycmF5KHZhbHVlKSA9PT0gJ0ludDhBcnJheSc7XG59XG5leHBvcnRzLmlzSW50OEFycmF5ID0gaXNJbnQ4QXJyYXk7XG5cbmZ1bmN0aW9uIGlzSW50MTZBcnJheSh2YWx1ZSkge1xuICByZXR1cm4gd2hpY2hUeXBlZEFycmF5KHZhbHVlKSA9PT0gJ0ludDE2QXJyYXknO1xufVxuZXhwb3J0cy5pc0ludDE2QXJyYXkgPSBpc0ludDE2QXJyYXk7XG5cbmZ1bmN0aW9uIGlzSW50MzJBcnJheSh2YWx1ZSkge1xuICByZXR1cm4gd2hpY2hUeXBlZEFycmF5KHZhbHVlKSA9PT0gJ0ludDMyQXJyYXknO1xufVxuZXhwb3J0cy5pc0ludDMyQXJyYXkgPSBpc0ludDMyQXJyYXk7XG5cbmZ1bmN0aW9uIGlzRmxvYXQzMkFycmF5KHZhbHVlKSB7XG4gIHJldHVybiB3aGljaFR5cGVkQXJyYXkodmFsdWUpID09PSAnRmxvYXQzMkFycmF5Jztcbn1cbmV4cG9ydHMuaXNGbG9hdDMyQXJyYXkgPSBpc0Zsb2F0MzJBcnJheTtcblxuZnVuY3Rpb24gaXNGbG9hdDY0QXJyYXkodmFsdWUpIHtcbiAgcmV0dXJuIHdoaWNoVHlwZWRBcnJheSh2YWx1ZSkgPT09ICdGbG9hdDY0QXJyYXknO1xufVxuZXhwb3J0cy5pc0Zsb2F0NjRBcnJheSA9IGlzRmxvYXQ2NEFycmF5O1xuXG5mdW5jdGlvbiBpc0JpZ0ludDY0QXJyYXkodmFsdWUpIHtcbiAgcmV0dXJuIHdoaWNoVHlwZWRBcnJheSh2YWx1ZSkgPT09ICdCaWdJbnQ2NEFycmF5Jztcbn1cbmV4cG9ydHMuaXNCaWdJbnQ2NEFycmF5ID0gaXNCaWdJbnQ2NEFycmF5O1xuXG5mdW5jdGlvbiBpc0JpZ1VpbnQ2NEFycmF5KHZhbHVlKSB7XG4gIHJldHVybiB3aGljaFR5cGVkQXJyYXkodmFsdWUpID09PSAnQmlnVWludDY0QXJyYXknO1xufVxuZXhwb3J0cy5pc0JpZ1VpbnQ2NEFycmF5ID0gaXNCaWdVaW50NjRBcnJheTtcblxuZnVuY3Rpb24gaXNNYXBUb1N0cmluZyh2YWx1ZSkge1xuICByZXR1cm4gT2JqZWN0VG9TdHJpbmcodmFsdWUpID09PSAnW29iamVjdCBNYXBdJztcbn1cbmlzTWFwVG9TdHJpbmcud29ya2luZyA9IChcbiAgdHlwZW9mIE1hcCAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgaXNNYXBUb1N0cmluZyhuZXcgTWFwKCkpXG4pO1xuXG5mdW5jdGlvbiBpc01hcCh2YWx1ZSkge1xuICBpZiAodHlwZW9mIE1hcCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gaXNNYXBUb1N0cmluZy53b3JraW5nXG4gICAgPyBpc01hcFRvU3RyaW5nKHZhbHVlKVxuICAgIDogdmFsdWUgaW5zdGFuY2VvZiBNYXA7XG59XG5leHBvcnRzLmlzTWFwID0gaXNNYXA7XG5cbmZ1bmN0aW9uIGlzU2V0VG9TdHJpbmcodmFsdWUpIHtcbiAgcmV0dXJuIE9iamVjdFRvU3RyaW5nKHZhbHVlKSA9PT0gJ1tvYmplY3QgU2V0XSc7XG59XG5pc1NldFRvU3RyaW5nLndvcmtpbmcgPSAoXG4gIHR5cGVvZiBTZXQgIT09ICd1bmRlZmluZWQnICYmXG4gIGlzU2V0VG9TdHJpbmcobmV3IFNldCgpKVxuKTtcbmZ1bmN0aW9uIGlzU2V0KHZhbHVlKSB7XG4gIGlmICh0eXBlb2YgU2V0ID09PSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiBpc1NldFRvU3RyaW5nLndvcmtpbmdcbiAgICA/IGlzU2V0VG9TdHJpbmcodmFsdWUpXG4gICAgOiB2YWx1ZSBpbnN0YW5jZW9mIFNldDtcbn1cbmV4cG9ydHMuaXNTZXQgPSBpc1NldDtcblxuZnVuY3Rpb24gaXNXZWFrTWFwVG9TdHJpbmcodmFsdWUpIHtcbiAgcmV0dXJuIE9iamVjdFRvU3RyaW5nKHZhbHVlKSA9PT0gJ1tvYmplY3QgV2Vha01hcF0nO1xufVxuaXNXZWFrTWFwVG9TdHJpbmcud29ya2luZyA9IChcbiAgdHlwZW9mIFdlYWtNYXAgIT09ICd1bmRlZmluZWQnICYmXG4gIGlzV2Vha01hcFRvU3RyaW5nKG5ldyBXZWFrTWFwKCkpXG4pO1xuZnVuY3Rpb24gaXNXZWFrTWFwKHZhbHVlKSB7XG4gIGlmICh0eXBlb2YgV2Vha01hcCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gaXNXZWFrTWFwVG9TdHJpbmcud29ya2luZ1xuICAgID8gaXNXZWFrTWFwVG9TdHJpbmcodmFsdWUpXG4gICAgOiB2YWx1ZSBpbnN0YW5jZW9mIFdlYWtNYXA7XG59XG5leHBvcnRzLmlzV2Vha01hcCA9IGlzV2Vha01hcDtcblxuZnVuY3Rpb24gaXNXZWFrU2V0VG9TdHJpbmcodmFsdWUpIHtcbiAgcmV0dXJuIE9iamVjdFRvU3RyaW5nKHZhbHVlKSA9PT0gJ1tvYmplY3QgV2Vha1NldF0nO1xufVxuaXNXZWFrU2V0VG9TdHJpbmcud29ya2luZyA9IChcbiAgdHlwZW9mIFdlYWtTZXQgIT09ICd1bmRlZmluZWQnICYmXG4gIGlzV2Vha1NldFRvU3RyaW5nKG5ldyBXZWFrU2V0KCkpXG4pO1xuZnVuY3Rpb24gaXNXZWFrU2V0KHZhbHVlKSB7XG4gIHJldHVybiBpc1dlYWtTZXRUb1N0cmluZyh2YWx1ZSk7XG59XG5leHBvcnRzLmlzV2Vha1NldCA9IGlzV2Vha1NldDtcblxuZnVuY3Rpb24gaXNBcnJheUJ1ZmZlclRvU3RyaW5nKHZhbHVlKSB7XG4gIHJldHVybiBPYmplY3RUb1N0cmluZyh2YWx1ZSkgPT09ICdbb2JqZWN0IEFycmF5QnVmZmVyXSc7XG59XG5pc0FycmF5QnVmZmVyVG9TdHJpbmcud29ya2luZyA9IChcbiAgdHlwZW9mIEFycmF5QnVmZmVyICE9PSAndW5kZWZpbmVkJyAmJlxuICBpc0FycmF5QnVmZmVyVG9TdHJpbmcobmV3IEFycmF5QnVmZmVyKCkpXG4pO1xuZnVuY3Rpb24gaXNBcnJheUJ1ZmZlcih2YWx1ZSkge1xuICBpZiAodHlwZW9mIEFycmF5QnVmZmVyID09PSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiBpc0FycmF5QnVmZmVyVG9TdHJpbmcud29ya2luZ1xuICAgID8gaXNBcnJheUJ1ZmZlclRvU3RyaW5nKHZhbHVlKVxuICAgIDogdmFsdWUgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcjtcbn1cbmV4cG9ydHMuaXNBcnJheUJ1ZmZlciA9IGlzQXJyYXlCdWZmZXI7XG5cbmZ1bmN0aW9uIGlzRGF0YVZpZXdUb1N0cmluZyh2YWx1ZSkge1xuICByZXR1cm4gT2JqZWN0VG9TdHJpbmcodmFsdWUpID09PSAnW29iamVjdCBEYXRhVmlld10nO1xufVxuaXNEYXRhVmlld1RvU3RyaW5nLndvcmtpbmcgPSAoXG4gIHR5cGVvZiBBcnJheUJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgdHlwZW9mIERhdGFWaWV3ICE9PSAndW5kZWZpbmVkJyAmJlxuICBpc0RhdGFWaWV3VG9TdHJpbmcobmV3IERhdGFWaWV3KG5ldyBBcnJheUJ1ZmZlcigxKSwgMCwgMSkpXG4pO1xuZnVuY3Rpb24gaXNEYXRhVmlldyh2YWx1ZSkge1xuICBpZiAodHlwZW9mIERhdGFWaWV3ID09PSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiBpc0RhdGFWaWV3VG9TdHJpbmcud29ya2luZ1xuICAgID8gaXNEYXRhVmlld1RvU3RyaW5nKHZhbHVlKVxuICAgIDogdmFsdWUgaW5zdGFuY2VvZiBEYXRhVmlldztcbn1cbmV4cG9ydHMuaXNEYXRhVmlldyA9IGlzRGF0YVZpZXc7XG5cbi8vIFN0b3JlIGEgY29weSBvZiBTaGFyZWRBcnJheUJ1ZmZlciBpbiBjYXNlIGl0J3MgZGVsZXRlZCBlbHNld2hlcmVcbnZhciBTaGFyZWRBcnJheUJ1ZmZlckNvcHkgPSB0eXBlb2YgU2hhcmVkQXJyYXlCdWZmZXIgIT09ICd1bmRlZmluZWQnID8gU2hhcmVkQXJyYXlCdWZmZXIgOiB1bmRlZmluZWQ7XG5mdW5jdGlvbiBpc1NoYXJlZEFycmF5QnVmZmVyVG9TdHJpbmcodmFsdWUpIHtcbiAgcmV0dXJuIE9iamVjdFRvU3RyaW5nKHZhbHVlKSA9PT0gJ1tvYmplY3QgU2hhcmVkQXJyYXlCdWZmZXJdJztcbn1cbmZ1bmN0aW9uIGlzU2hhcmVkQXJyYXlCdWZmZXIodmFsdWUpIHtcbiAgaWYgKHR5cGVvZiBTaGFyZWRBcnJheUJ1ZmZlckNvcHkgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBpc1NoYXJlZEFycmF5QnVmZmVyVG9TdHJpbmcud29ya2luZyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpc1NoYXJlZEFycmF5QnVmZmVyVG9TdHJpbmcud29ya2luZyA9IGlzU2hhcmVkQXJyYXlCdWZmZXJUb1N0cmluZyhuZXcgU2hhcmVkQXJyYXlCdWZmZXJDb3B5KCkpO1xuICB9XG5cbiAgcmV0dXJuIGlzU2hhcmVkQXJyYXlCdWZmZXJUb1N0cmluZy53b3JraW5nXG4gICAgPyBpc1NoYXJlZEFycmF5QnVmZmVyVG9TdHJpbmcodmFsdWUpXG4gICAgOiB2YWx1ZSBpbnN0YW5jZW9mIFNoYXJlZEFycmF5QnVmZmVyQ29weTtcbn1cbmV4cG9ydHMuaXNTaGFyZWRBcnJheUJ1ZmZlciA9IGlzU2hhcmVkQXJyYXlCdWZmZXI7XG5cbmZ1bmN0aW9uIGlzQXN5bmNGdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gT2JqZWN0VG9TdHJpbmcodmFsdWUpID09PSAnW29iamVjdCBBc3luY0Z1bmN0aW9uXSc7XG59XG5leHBvcnRzLmlzQXN5bmNGdW5jdGlvbiA9IGlzQXN5bmNGdW5jdGlvbjtcblxuZnVuY3Rpb24gaXNNYXBJdGVyYXRvcih2YWx1ZSkge1xuICByZXR1cm4gT2JqZWN0VG9TdHJpbmcodmFsdWUpID09PSAnW29iamVjdCBNYXAgSXRlcmF0b3JdJztcbn1cbmV4cG9ydHMuaXNNYXBJdGVyYXRvciA9IGlzTWFwSXRlcmF0b3I7XG5cbmZ1bmN0aW9uIGlzU2V0SXRlcmF0b3IodmFsdWUpIHtcbiAgcmV0dXJuIE9iamVjdFRvU3RyaW5nKHZhbHVlKSA9PT0gJ1tvYmplY3QgU2V0IEl0ZXJhdG9yXSc7XG59XG5leHBvcnRzLmlzU2V0SXRlcmF0b3IgPSBpc1NldEl0ZXJhdG9yO1xuXG5mdW5jdGlvbiBpc0dlbmVyYXRvck9iamVjdCh2YWx1ZSkge1xuICByZXR1cm4gT2JqZWN0VG9TdHJpbmcodmFsdWUpID09PSAnW29iamVjdCBHZW5lcmF0b3JdJztcbn1cbmV4cG9ydHMuaXNHZW5lcmF0b3JPYmplY3QgPSBpc0dlbmVyYXRvck9iamVjdDtcblxuZnVuY3Rpb24gaXNXZWJBc3NlbWJseUNvbXBpbGVkTW9kdWxlKHZhbHVlKSB7XG4gIHJldHVybiBPYmplY3RUb1N0cmluZyh2YWx1ZSkgPT09ICdbb2JqZWN0IFdlYkFzc2VtYmx5Lk1vZHVsZV0nO1xufVxuZXhwb3J0cy5pc1dlYkFzc2VtYmx5Q29tcGlsZWRNb2R1bGUgPSBpc1dlYkFzc2VtYmx5Q29tcGlsZWRNb2R1bGU7XG5cbmZ1bmN0aW9uIGlzTnVtYmVyT2JqZWN0KHZhbHVlKSB7XG4gIHJldHVybiBjaGVja0JveGVkUHJpbWl0aXZlKHZhbHVlLCBudW1iZXJWYWx1ZSk7XG59XG5leHBvcnRzLmlzTnVtYmVyT2JqZWN0ID0gaXNOdW1iZXJPYmplY3Q7XG5cbmZ1bmN0aW9uIGlzU3RyaW5nT2JqZWN0KHZhbHVlKSB7XG4gIHJldHVybiBjaGVja0JveGVkUHJpbWl0aXZlKHZhbHVlLCBzdHJpbmdWYWx1ZSk7XG59XG5leHBvcnRzLmlzU3RyaW5nT2JqZWN0ID0gaXNTdHJpbmdPYmplY3Q7XG5cbmZ1bmN0aW9uIGlzQm9vbGVhbk9iamVjdCh2YWx1ZSkge1xuICByZXR1cm4gY2hlY2tCb3hlZFByaW1pdGl2ZSh2YWx1ZSwgYm9vbGVhblZhbHVlKTtcbn1cbmV4cG9ydHMuaXNCb29sZWFuT2JqZWN0ID0gaXNCb29sZWFuT2JqZWN0O1xuXG5mdW5jdGlvbiBpc0JpZ0ludE9iamVjdCh2YWx1ZSkge1xuICByZXR1cm4gQmlnSW50U3VwcG9ydGVkICYmIGNoZWNrQm94ZWRQcmltaXRpdmUodmFsdWUsIGJpZ0ludFZhbHVlKTtcbn1cbmV4cG9ydHMuaXNCaWdJbnRPYmplY3QgPSBpc0JpZ0ludE9iamVjdDtcblxuZnVuY3Rpb24gaXNTeW1ib2xPYmplY3QodmFsdWUpIHtcbiAgcmV0dXJuIFN5bWJvbFN1cHBvcnRlZCAmJiBjaGVja0JveGVkUHJpbWl0aXZlKHZhbHVlLCBzeW1ib2xWYWx1ZSk7XG59XG5leHBvcnRzLmlzU3ltYm9sT2JqZWN0ID0gaXNTeW1ib2xPYmplY3Q7XG5cbmZ1bmN0aW9uIGlzQm94ZWRQcmltaXRpdmUodmFsdWUpIHtcbiAgcmV0dXJuIChcbiAgICBpc051bWJlck9iamVjdCh2YWx1ZSkgfHxcbiAgICBpc1N0cmluZ09iamVjdCh2YWx1ZSkgfHxcbiAgICBpc0Jvb2xlYW5PYmplY3QodmFsdWUpIHx8XG4gICAgaXNCaWdJbnRPYmplY3QodmFsdWUpIHx8XG4gICAgaXNTeW1ib2xPYmplY3QodmFsdWUpXG4gICk7XG59XG5leHBvcnRzLmlzQm94ZWRQcmltaXRpdmUgPSBpc0JveGVkUHJpbWl0aXZlO1xuXG5mdW5jdGlvbiBpc0FueUFycmF5QnVmZmVyKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcgJiYgKFxuICAgIGlzQXJyYXlCdWZmZXIodmFsdWUpIHx8XG4gICAgaXNTaGFyZWRBcnJheUJ1ZmZlcih2YWx1ZSlcbiAgKTtcbn1cbmV4cG9ydHMuaXNBbnlBcnJheUJ1ZmZlciA9IGlzQW55QXJyYXlCdWZmZXI7XG5cblsnaXNQcm94eScsICdpc0V4dGVybmFsJywgJ2lzTW9kdWxlTmFtZXNwYWNlT2JqZWN0J10uZm9yRWFjaChmdW5jdGlvbihtZXRob2QpIHtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIG1ldGhvZCwge1xuICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgIHZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihtZXRob2QgKyAnIGlzIG5vdCBzdXBwb3J0ZWQgaW4gdXNlcmxhbmQnKTtcbiAgICB9XG4gIH0pO1xufSk7XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxudmFyIGdldE93blByb3BlcnR5RGVzY3JpcHRvcnMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyB8fFxuICBmdW5jdGlvbiBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzKG9iaikge1xuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMob2JqKTtcbiAgICB2YXIgZGVzY3JpcHRvcnMgPSB7fTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGRlc2NyaXB0b3JzW2tleXNbaV1dID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmosIGtleXNbaV0pO1xuICAgIH1cbiAgICByZXR1cm4gZGVzY3JpcHRvcnM7XG4gIH07XG5cbnZhciBmb3JtYXRSZWdFeHAgPSAvJVtzZGolXS9nO1xuZXhwb3J0cy5mb3JtYXQgPSBmdW5jdGlvbihmKSB7XG4gIGlmICghaXNTdHJpbmcoZikpIHtcbiAgICB2YXIgb2JqZWN0cyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBvYmplY3RzLnB1c2goaW5zcGVjdChhcmd1bWVudHNbaV0pKTtcbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdHMuam9pbignICcpO1xuICB9XG5cbiAgdmFyIGkgPSAxO1xuICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgdmFyIGxlbiA9IGFyZ3MubGVuZ3RoO1xuICB2YXIgc3RyID0gU3RyaW5nKGYpLnJlcGxhY2UoZm9ybWF0UmVnRXhwLCBmdW5jdGlvbih4KSB7XG4gICAgaWYgKHggPT09ICclJScpIHJldHVybiAnJSc7XG4gICAgaWYgKGkgPj0gbGVuKSByZXR1cm4geDtcbiAgICBzd2l0Y2ggKHgpIHtcbiAgICAgIGNhc2UgJyVzJzogcmV0dXJuIFN0cmluZyhhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWQnOiByZXR1cm4gTnVtYmVyKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclaic6XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGFyZ3NbaSsrXSk7XG4gICAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgICByZXR1cm4gJ1tDaXJjdWxhcl0nO1xuICAgICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4geDtcbiAgICB9XG4gIH0pO1xuICBmb3IgKHZhciB4ID0gYXJnc1tpXTsgaSA8IGxlbjsgeCA9IGFyZ3NbKytpXSkge1xuICAgIGlmIChpc051bGwoeCkgfHwgIWlzT2JqZWN0KHgpKSB7XG4gICAgICBzdHIgKz0gJyAnICsgeDtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyICs9ICcgJyArIGluc3BlY3QoeCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBzdHI7XG59O1xuXG5cbi8vIE1hcmsgdGhhdCBhIG1ldGhvZCBzaG91bGQgbm90IGJlIHVzZWQuXG4vLyBSZXR1cm5zIGEgbW9kaWZpZWQgZnVuY3Rpb24gd2hpY2ggd2FybnMgb25jZSBieSBkZWZhdWx0LlxuLy8gSWYgLS1uby1kZXByZWNhdGlvbiBpcyBzZXQsIHRoZW4gaXQgaXMgYSBuby1vcC5cbmV4cG9ydHMuZGVwcmVjYXRlID0gZnVuY3Rpb24oZm4sIG1zZykge1xuICBpZiAodHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmIHByb2Nlc3Mubm9EZXByZWNhdGlvbiA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBmbjtcbiAgfVxuXG4gIC8vIEFsbG93IGZvciBkZXByZWNhdGluZyB0aGluZ3MgaW4gdGhlIHByb2Nlc3Mgb2Ygc3RhcnRpbmcgdXAuXG4gIGlmICh0eXBlb2YgcHJvY2VzcyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZXhwb3J0cy5kZXByZWNhdGUoZm4sIG1zZykuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XG5cbiAgdmFyIHdhcm5lZCA9IGZhbHNlO1xuICBmdW5jdGlvbiBkZXByZWNhdGVkKCkge1xuICAgIGlmICghd2FybmVkKSB7XG4gICAgICBpZiAocHJvY2Vzcy50aHJvd0RlcHJlY2F0aW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICAgICAgfSBlbHNlIGlmIChwcm9jZXNzLnRyYWNlRGVwcmVjYXRpb24pIHtcbiAgICAgICAgY29uc29sZS50cmFjZShtc2cpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihtc2cpO1xuICAgICAgfVxuICAgICAgd2FybmVkID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICByZXR1cm4gZGVwcmVjYXRlZDtcbn07XG5cblxudmFyIGRlYnVncyA9IHt9O1xudmFyIGRlYnVnRW52UmVnZXggPSAvXiQvO1xuXG5pZiAocHJvY2Vzcy5lbnYuTk9ERV9ERUJVRykge1xuICB2YXIgZGVidWdFbnYgPSBwcm9jZXNzLmVudi5OT0RFX0RFQlVHO1xuICBkZWJ1Z0VudiA9IGRlYnVnRW52LnJlcGxhY2UoL1t8XFxcXHt9KClbXFxdXiQrPy5dL2csICdcXFxcJCYnKVxuICAgIC5yZXBsYWNlKC9cXCovZywgJy4qJylcbiAgICAucmVwbGFjZSgvLC9nLCAnJHxeJylcbiAgICAudG9VcHBlckNhc2UoKTtcbiAgZGVidWdFbnZSZWdleCA9IG5ldyBSZWdFeHAoJ14nICsgZGVidWdFbnYgKyAnJCcsICdpJyk7XG59XG5leHBvcnRzLmRlYnVnbG9nID0gZnVuY3Rpb24oc2V0KSB7XG4gIHNldCA9IHNldC50b1VwcGVyQ2FzZSgpO1xuICBpZiAoIWRlYnVnc1tzZXRdKSB7XG4gICAgaWYgKGRlYnVnRW52UmVnZXgudGVzdChzZXQpKSB7XG4gICAgICB2YXIgcGlkID0gcHJvY2Vzcy5waWQ7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbXNnID0gZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKTtcbiAgICAgICAgY29uc29sZS5lcnJvcignJXMgJWQ6ICVzJywgc2V0LCBwaWQsIG1zZyk7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge307XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWJ1Z3Nbc2V0XTtcbn07XG5cblxuLyoqXG4gKiBFY2hvcyB0aGUgdmFsdWUgb2YgYSB2YWx1ZS4gVHJ5cyB0byBwcmludCB0aGUgdmFsdWUgb3V0XG4gKiBpbiB0aGUgYmVzdCB3YXkgcG9zc2libGUgZ2l2ZW4gdGhlIGRpZmZlcmVudCB0eXBlcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFRoZSBvYmplY3QgdG8gcHJpbnQgb3V0LlxuICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgb3B0aW9ucyBvYmplY3QgdGhhdCBhbHRlcnMgdGhlIG91dHB1dC5cbiAqL1xuLyogbGVnYWN5OiBvYmosIHNob3dIaWRkZW4sIGRlcHRoLCBjb2xvcnMqL1xuZnVuY3Rpb24gaW5zcGVjdChvYmosIG9wdHMpIHtcbiAgLy8gZGVmYXVsdCBvcHRpb25zXG4gIHZhciBjdHggPSB7XG4gICAgc2VlbjogW10sXG4gICAgc3R5bGl6ZTogc3R5bGl6ZU5vQ29sb3JcbiAgfTtcbiAgLy8gbGVnYWN5Li4uXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDMpIGN0eC5kZXB0aCA9IGFyZ3VtZW50c1syXTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gNCkgY3R4LmNvbG9ycyA9IGFyZ3VtZW50c1szXTtcbiAgaWYgKGlzQm9vbGVhbihvcHRzKSkge1xuICAgIC8vIGxlZ2FjeS4uLlxuICAgIGN0eC5zaG93SGlkZGVuID0gb3B0cztcbiAgfSBlbHNlIGlmIChvcHRzKSB7XG4gICAgLy8gZ290IGFuIFwib3B0aW9uc1wiIG9iamVjdFxuICAgIGV4cG9ydHMuX2V4dGVuZChjdHgsIG9wdHMpO1xuICB9XG4gIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5zaG93SGlkZGVuKSkgY3R4LnNob3dIaWRkZW4gPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5kZXB0aCkpIGN0eC5kZXB0aCA9IDI7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY29sb3JzKSkgY3R4LmNvbG9ycyA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmN1c3RvbUluc3BlY3QpKSBjdHguY3VzdG9tSW5zcGVjdCA9IHRydWU7XG4gIGlmIChjdHguY29sb3JzKSBjdHguc3R5bGl6ZSA9IHN0eWxpemVXaXRoQ29sb3I7XG4gIHJldHVybiBmb3JtYXRWYWx1ZShjdHgsIG9iaiwgY3R4LmRlcHRoKTtcbn1cbmV4cG9ydHMuaW5zcGVjdCA9IGluc3BlY3Q7XG5cblxuLy8gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9BTlNJX2VzY2FwZV9jb2RlI2dyYXBoaWNzXG5pbnNwZWN0LmNvbG9ycyA9IHtcbiAgJ2JvbGQnIDogWzEsIDIyXSxcbiAgJ2l0YWxpYycgOiBbMywgMjNdLFxuICAndW5kZXJsaW5lJyA6IFs0LCAyNF0sXG4gICdpbnZlcnNlJyA6IFs3LCAyN10sXG4gICd3aGl0ZScgOiBbMzcsIDM5XSxcbiAgJ2dyZXknIDogWzkwLCAzOV0sXG4gICdibGFjaycgOiBbMzAsIDM5XSxcbiAgJ2JsdWUnIDogWzM0LCAzOV0sXG4gICdjeWFuJyA6IFszNiwgMzldLFxuICAnZ3JlZW4nIDogWzMyLCAzOV0sXG4gICdtYWdlbnRhJyA6IFszNSwgMzldLFxuICAncmVkJyA6IFszMSwgMzldLFxuICAneWVsbG93JyA6IFszMywgMzldXG59O1xuXG4vLyBEb24ndCB1c2UgJ2JsdWUnIG5vdCB2aXNpYmxlIG9uIGNtZC5leGVcbmluc3BlY3Quc3R5bGVzID0ge1xuICAnc3BlY2lhbCc6ICdjeWFuJyxcbiAgJ251bWJlcic6ICd5ZWxsb3cnLFxuICAnYm9vbGVhbic6ICd5ZWxsb3cnLFxuICAndW5kZWZpbmVkJzogJ2dyZXknLFxuICAnbnVsbCc6ICdib2xkJyxcbiAgJ3N0cmluZyc6ICdncmVlbicsXG4gICdkYXRlJzogJ21hZ2VudGEnLFxuICAvLyBcIm5hbWVcIjogaW50ZW50aW9uYWxseSBub3Qgc3R5bGluZ1xuICAncmVnZXhwJzogJ3JlZCdcbn07XG5cblxuZnVuY3Rpb24gc3R5bGl6ZVdpdGhDb2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICB2YXIgc3R5bGUgPSBpbnNwZWN0LnN0eWxlc1tzdHlsZVR5cGVdO1xuXG4gIGlmIChzdHlsZSkge1xuICAgIHJldHVybiAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzBdICsgJ20nICsgc3RyICtcbiAgICAgICAgICAgJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVsxXSArICdtJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gc3RyO1xuICB9XG59XG5cblxuZnVuY3Rpb24gc3R5bGl6ZU5vQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgcmV0dXJuIHN0cjtcbn1cblxuXG5mdW5jdGlvbiBhcnJheVRvSGFzaChhcnJheSkge1xuICB2YXIgaGFzaCA9IHt9O1xuXG4gIGFycmF5LmZvckVhY2goZnVuY3Rpb24odmFsLCBpZHgpIHtcbiAgICBoYXNoW3ZhbF0gPSB0cnVlO1xuICB9KTtcblxuICByZXR1cm4gaGFzaDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRWYWx1ZShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMpIHtcbiAgLy8gUHJvdmlkZSBhIGhvb2sgZm9yIHVzZXItc3BlY2lmaWVkIGluc3BlY3QgZnVuY3Rpb25zLlxuICAvLyBDaGVjayB0aGF0IHZhbHVlIGlzIGFuIG9iamVjdCB3aXRoIGFuIGluc3BlY3QgZnVuY3Rpb24gb24gaXRcbiAgaWYgKGN0eC5jdXN0b21JbnNwZWN0ICYmXG4gICAgICB2YWx1ZSAmJlxuICAgICAgaXNGdW5jdGlvbih2YWx1ZS5pbnNwZWN0KSAmJlxuICAgICAgLy8gRmlsdGVyIG91dCB0aGUgdXRpbCBtb2R1bGUsIGl0J3MgaW5zcGVjdCBmdW5jdGlvbiBpcyBzcGVjaWFsXG4gICAgICB2YWx1ZS5pbnNwZWN0ICE9PSBleHBvcnRzLmluc3BlY3QgJiZcbiAgICAgIC8vIEFsc28gZmlsdGVyIG91dCBhbnkgcHJvdG90eXBlIG9iamVjdHMgdXNpbmcgdGhlIGNpcmN1bGFyIGNoZWNrLlxuICAgICAgISh2YWx1ZS5jb25zdHJ1Y3RvciAmJiB2YWx1ZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgPT09IHZhbHVlKSkge1xuICAgIHZhciByZXQgPSB2YWx1ZS5pbnNwZWN0KHJlY3Vyc2VUaW1lcywgY3R4KTtcbiAgICBpZiAoIWlzU3RyaW5nKHJldCkpIHtcbiAgICAgIHJldCA9IGZvcm1hdFZhbHVlKGN0eCwgcmV0LCByZWN1cnNlVGltZXMpO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgLy8gUHJpbWl0aXZlIHR5cGVzIGNhbm5vdCBoYXZlIHByb3BlcnRpZXNcbiAgdmFyIHByaW1pdGl2ZSA9IGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKTtcbiAgaWYgKHByaW1pdGl2ZSkge1xuICAgIHJldHVybiBwcmltaXRpdmU7XG4gIH1cblxuICAvLyBMb29rIHVwIHRoZSBrZXlzIG9mIHRoZSBvYmplY3QuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModmFsdWUpO1xuICB2YXIgdmlzaWJsZUtleXMgPSBhcnJheVRvSGFzaChrZXlzKTtcblxuICBpZiAoY3R4LnNob3dIaWRkZW4pIHtcbiAgICBrZXlzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModmFsdWUpO1xuICB9XG5cbiAgLy8gSUUgZG9lc24ndCBtYWtlIGVycm9yIGZpZWxkcyBub24tZW51bWVyYWJsZVxuICAvLyBodHRwOi8vbXNkbi5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvaWUvZHd3NTJzYnQodj12cy45NCkuYXNweFxuICBpZiAoaXNFcnJvcih2YWx1ZSlcbiAgICAgICYmIChrZXlzLmluZGV4T2YoJ21lc3NhZ2UnKSA+PSAwIHx8IGtleXMuaW5kZXhPZignZGVzY3JpcHRpb24nKSA+PSAwKSkge1xuICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICAvLyBTb21lIHR5cGUgb2Ygb2JqZWN0IHdpdGhvdXQgcHJvcGVydGllcyBjYW4gYmUgc2hvcnRjdXR0ZWQuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgdmFyIG5hbWUgPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW0Z1bmN0aW9uJyArIG5hbWUgKyAnXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfVxuICAgIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoRGF0ZS5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdkYXRlJyk7XG4gICAgfVxuICAgIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICB2YXIgYmFzZSA9ICcnLCBhcnJheSA9IGZhbHNlLCBicmFjZXMgPSBbJ3snLCAnfSddO1xuXG4gIC8vIE1ha2UgQXJyYXkgc2F5IHRoYXQgdGhleSBhcmUgQXJyYXlcbiAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgYXJyYXkgPSB0cnVlO1xuICAgIGJyYWNlcyA9IFsnWycsICddJ107XG4gIH1cblxuICAvLyBNYWtlIGZ1bmN0aW9ucyBzYXkgdGhhdCB0aGV5IGFyZSBmdW5jdGlvbnNcbiAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgdmFyIG4gPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICBiYXNlID0gJyBbRnVuY3Rpb24nICsgbiArICddJztcbiAgfVxuXG4gIC8vIE1ha2UgUmVnRXhwcyBzYXkgdGhhdCB0aGV5IGFyZSBSZWdFeHBzXG4gIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZGF0ZXMgd2l0aCBwcm9wZXJ0aWVzIGZpcnN0IHNheSB0aGUgZGF0ZVxuICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBEYXRlLnByb3RvdHlwZS50b1VUQ1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZXJyb3Igd2l0aCBtZXNzYWdlIGZpcnN0IHNheSB0aGUgZXJyb3JcbiAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCAmJiAoIWFycmF5IHx8IHZhbHVlLmxlbmd0aCA9PSAwKSkge1xuICAgIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgYnJhY2VzWzFdO1xuICB9XG5cbiAgaWYgKHJlY3Vyc2VUaW1lcyA8IDApIHtcbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tPYmplY3RdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cblxuICBjdHguc2Vlbi5wdXNoKHZhbHVlKTtcblxuICB2YXIgb3V0cHV0O1xuICBpZiAoYXJyYXkpIHtcbiAgICBvdXRwdXQgPSBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKTtcbiAgfSBlbHNlIHtcbiAgICBvdXRwdXQgPSBrZXlzLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KTtcbiAgICB9KTtcbiAgfVxuXG4gIGN0eC5zZWVuLnBvcCgpO1xuXG4gIHJldHVybiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ3VuZGVmaW5lZCcsICd1bmRlZmluZWQnKTtcbiAgaWYgKGlzU3RyaW5nKHZhbHVlKSkge1xuICAgIHZhciBzaW1wbGUgPSAnXFwnJyArIEpTT04uc3RyaW5naWZ5KHZhbHVlKS5yZXBsYWNlKC9eXCJ8XCIkL2csICcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKSArICdcXCcnO1xuICAgIHJldHVybiBjdHguc3R5bGl6ZShzaW1wbGUsICdzdHJpbmcnKTtcbiAgfVxuICBpZiAoaXNOdW1iZXIodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnbnVtYmVyJyk7XG4gIGlmIChpc0Jvb2xlYW4odmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnYm9vbGVhbicpO1xuICAvLyBGb3Igc29tZSByZWFzb24gdHlwZW9mIG51bGwgaXMgXCJvYmplY3RcIiwgc28gc3BlY2lhbCBjYXNlIGhlcmUuXG4gIGlmIChpc051bGwodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnbnVsbCcsICdudWxsJyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0RXJyb3IodmFsdWUpIHtcbiAgcmV0dXJuICdbJyArIEVycm9yLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSArICddJztcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKSB7XG4gIHZhciBvdXRwdXQgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZiAoaGFzT3duUHJvcGVydHkodmFsdWUsIFN0cmluZyhpKSkpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAgU3RyaW5nKGkpLCB0cnVlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dHB1dC5wdXNoKCcnKTtcbiAgICB9XG4gIH1cbiAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGlmICgha2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBrZXksIHRydWUpKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gb3V0cHV0O1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpIHtcbiAgdmFyIG5hbWUsIHN0ciwgZGVzYztcbiAgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodmFsdWUsIGtleSkgfHwgeyB2YWx1ZTogdmFsdWVba2V5XSB9O1xuICBpZiAoZGVzYy5nZXQpIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyL1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmICghaGFzT3duUHJvcGVydHkodmlzaWJsZUtleXMsIGtleSkpIHtcbiAgICBuYW1lID0gJ1snICsga2V5ICsgJ10nO1xuICB9XG4gIGlmICghc3RyKSB7XG4gICAgaWYgKGN0eC5zZWVuLmluZGV4T2YoZGVzYy52YWx1ZSkgPCAwKSB7XG4gICAgICBpZiAoaXNOdWxsKHJlY3Vyc2VUaW1lcykpIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCBudWxsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgcmVjdXJzZVRpbWVzIC0gMSk7XG4gICAgICB9XG4gICAgICBpZiAoc3RyLmluZGV4T2YoJ1xcbicpID4gLTEpIHtcbiAgICAgICAgaWYgKGFycmF5KSB7XG4gICAgICAgICAgc3RyID0gc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpLnNsaWNlKDIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0ciA9ICdcXG4nICsgc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0NpcmN1bGFyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmIChpc1VuZGVmaW5lZChuYW1lKSkge1xuICAgIGlmIChhcnJheSAmJiBrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICByZXR1cm4gc3RyO1xuICAgIH1cbiAgICBuYW1lID0gSlNPTi5zdHJpbmdpZnkoJycgKyBrZXkpO1xuICAgIGlmIChuYW1lLm1hdGNoKC9eXCIoW2EtekEtWl9dW2EtekEtWl8wLTldKilcIiQvKSkge1xuICAgICAgbmFtZSA9IG5hbWUuc2xpY2UoMSwgLTEpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICduYW1lJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8oXlwifFwiJCkvZywgXCInXCIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICdzdHJpbmcnKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmFtZSArICc6ICcgKyBzdHI7XG59XG5cblxuZnVuY3Rpb24gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpIHtcbiAgdmFyIG51bUxpbmVzRXN0ID0gMDtcbiAgdmFyIGxlbmd0aCA9IG91dHB1dC5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgY3VyKSB7XG4gICAgbnVtTGluZXNFc3QrKztcbiAgICBpZiAoY3VyLmluZGV4T2YoJ1xcbicpID49IDApIG51bUxpbmVzRXN0Kys7XG4gICAgcmV0dXJuIHByZXYgKyBjdXIucmVwbGFjZSgvXFx1MDAxYlxcW1xcZFxcZD9tL2csICcnKS5sZW5ndGggKyAxO1xuICB9LCAwKTtcblxuICBpZiAobGVuZ3RoID4gNjApIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICtcbiAgICAgICAgICAgKGJhc2UgPT09ICcnID8gJycgOiBiYXNlICsgJ1xcbiAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIG91dHB1dC5qb2luKCcsXFxuICAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIGJyYWNlc1sxXTtcbiAgfVxuXG4gIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgJyAnICsgb3V0cHV0LmpvaW4oJywgJykgKyAnICcgKyBicmFjZXNbMV07XG59XG5cblxuLy8gTk9URTogVGhlc2UgdHlwZSBjaGVja2luZyBmdW5jdGlvbnMgaW50ZW50aW9uYWxseSBkb24ndCB1c2UgYGluc3RhbmNlb2ZgXG4vLyBiZWNhdXNlIGl0IGlzIGZyYWdpbGUgYW5kIGNhbiBiZSBlYXNpbHkgZmFrZWQgd2l0aCBgT2JqZWN0LmNyZWF0ZSgpYC5cbmV4cG9ydHMudHlwZXMgPSByZXF1aXJlKCcuL3N1cHBvcnQvdHlwZXMnKTtcblxuZnVuY3Rpb24gaXNBcnJheShhcikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcik7XG59XG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuXG5mdW5jdGlvbiBpc0Jvb2xlYW4oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnYm9vbGVhbic7XG59XG5leHBvcnRzLmlzQm9vbGVhbiA9IGlzQm9vbGVhbjtcblxuZnVuY3Rpb24gaXNOdWxsKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGwgPSBpc051bGw7XG5cbmZ1bmN0aW9uIGlzTnVsbE9yVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbE9yVW5kZWZpbmVkID0gaXNOdWxsT3JVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5leHBvcnRzLmlzTnVtYmVyID0gaXNOdW1iZXI7XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N0cmluZyc7XG59XG5leHBvcnRzLmlzU3RyaW5nID0gaXNTdHJpbmc7XG5cbmZ1bmN0aW9uIGlzU3ltYm9sKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCc7XG59XG5leHBvcnRzLmlzU3ltYm9sID0gaXNTeW1ib2w7XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG5leHBvcnRzLmlzVW5kZWZpbmVkID0gaXNVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzUmVnRXhwKHJlKSB7XG4gIHJldHVybiBpc09iamVjdChyZSkgJiYgb2JqZWN0VG9TdHJpbmcocmUpID09PSAnW29iamVjdCBSZWdFeHBdJztcbn1cbmV4cG9ydHMuaXNSZWdFeHAgPSBpc1JlZ0V4cDtcbmV4cG9ydHMudHlwZXMuaXNSZWdFeHAgPSBpc1JlZ0V4cDtcblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3Q7XG5cbmZ1bmN0aW9uIGlzRGF0ZShkKSB7XG4gIHJldHVybiBpc09iamVjdChkKSAmJiBvYmplY3RUb1N0cmluZyhkKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuZXhwb3J0cy5pc0RhdGUgPSBpc0RhdGU7XG5leHBvcnRzLnR5cGVzLmlzRGF0ZSA9IGlzRGF0ZTtcblxuZnVuY3Rpb24gaXNFcnJvcihlKSB7XG4gIHJldHVybiBpc09iamVjdChlKSAmJlxuICAgICAgKG9iamVjdFRvU3RyaW5nKGUpID09PSAnW29iamVjdCBFcnJvcl0nIHx8IGUgaW5zdGFuY2VvZiBFcnJvcik7XG59XG5leHBvcnRzLmlzRXJyb3IgPSBpc0Vycm9yO1xuZXhwb3J0cy50eXBlcy5pc05hdGl2ZUVycm9yID0gaXNFcnJvcjtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuXG5mdW5jdGlvbiBpc1ByaW1pdGl2ZShhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbCB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnbnVtYmVyJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N0cmluZycgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnIHx8ICAvLyBFUzYgc3ltYm9sXG4gICAgICAgICB0eXBlb2YgYXJnID09PSAndW5kZWZpbmVkJztcbn1cbmV4cG9ydHMuaXNQcmltaXRpdmUgPSBpc1ByaW1pdGl2ZTtcblxuZXhwb3J0cy5pc0J1ZmZlciA9IHJlcXVpcmUoJy4vc3VwcG9ydC9pc0J1ZmZlcicpO1xuXG5mdW5jdGlvbiBvYmplY3RUb1N0cmluZyhvKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobyk7XG59XG5cblxuZnVuY3Rpb24gcGFkKG4pIHtcbiAgcmV0dXJuIG4gPCAxMCA/ICcwJyArIG4udG9TdHJpbmcoMTApIDogbi50b1N0cmluZygxMCk7XG59XG5cblxudmFyIG1vbnRocyA9IFsnSmFuJywgJ0ZlYicsICdNYXInLCAnQXByJywgJ01heScsICdKdW4nLCAnSnVsJywgJ0F1ZycsICdTZXAnLFxuICAgICAgICAgICAgICAnT2N0JywgJ05vdicsICdEZWMnXTtcblxuLy8gMjYgRmViIDE2OjE5OjM0XG5mdW5jdGlvbiB0aW1lc3RhbXAoKSB7XG4gIHZhciBkID0gbmV3IERhdGUoKTtcbiAgdmFyIHRpbWUgPSBbcGFkKGQuZ2V0SG91cnMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldE1pbnV0ZXMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldFNlY29uZHMoKSldLmpvaW4oJzonKTtcbiAgcmV0dXJuIFtkLmdldERhdGUoKSwgbW9udGhzW2QuZ2V0TW9udGgoKV0sIHRpbWVdLmpvaW4oJyAnKTtcbn1cblxuXG4vLyBsb2cgaXMganVzdCBhIHRoaW4gd3JhcHBlciB0byBjb25zb2xlLmxvZyB0aGF0IHByZXBlbmRzIGEgdGltZXN0YW1wXG5leHBvcnRzLmxvZyA9IGZ1bmN0aW9uKCkge1xuICBjb25zb2xlLmxvZygnJXMgLSAlcycsIHRpbWVzdGFtcCgpLCBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpKTtcbn07XG5cblxuLyoqXG4gKiBJbmhlcml0IHRoZSBwcm90b3R5cGUgbWV0aG9kcyBmcm9tIG9uZSBjb25zdHJ1Y3RvciBpbnRvIGFub3RoZXIuXG4gKlxuICogVGhlIEZ1bmN0aW9uLnByb3RvdHlwZS5pbmhlcml0cyBmcm9tIGxhbmcuanMgcmV3cml0dGVuIGFzIGEgc3RhbmRhbG9uZVxuICogZnVuY3Rpb24gKG5vdCBvbiBGdW5jdGlvbi5wcm90b3R5cGUpLiBOT1RFOiBJZiB0aGlzIGZpbGUgaXMgdG8gYmUgbG9hZGVkXG4gKiBkdXJpbmcgYm9vdHN0cmFwcGluZyB0aGlzIGZ1bmN0aW9uIG5lZWRzIHRvIGJlIHJld3JpdHRlbiB1c2luZyBzb21lIG5hdGl2ZVxuICogZnVuY3Rpb25zIGFzIHByb3RvdHlwZSBzZXR1cCB1c2luZyBub3JtYWwgSmF2YVNjcmlwdCBkb2VzIG5vdCB3b3JrIGFzXG4gKiBleHBlY3RlZCBkdXJpbmcgYm9vdHN0cmFwcGluZyAoc2VlIG1pcnJvci5qcyBpbiByMTE0OTAzKS5cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHdoaWNoIG5lZWRzIHRvIGluaGVyaXQgdGhlXG4gKiAgICAgcHJvdG90eXBlLlxuICogQHBhcmFtIHtmdW5jdGlvbn0gc3VwZXJDdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIGluaGVyaXQgcHJvdG90eXBlIGZyb20uXG4gKi9cbmV4cG9ydHMuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuXG5leHBvcnRzLl9leHRlbmQgPSBmdW5jdGlvbihvcmlnaW4sIGFkZCkge1xuICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiBhZGQgaXNuJ3QgYW4gb2JqZWN0XG4gIGlmICghYWRkIHx8ICFpc09iamVjdChhZGQpKSByZXR1cm4gb3JpZ2luO1xuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYWRkKTtcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aDtcbiAgd2hpbGUgKGktLSkge1xuICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXTtcbiAgfVxuICByZXR1cm4gb3JpZ2luO1xufTtcblxuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cblxudmFyIGtDdXN0b21Qcm9taXNpZmllZFN5bWJvbCA9IHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnID8gU3ltYm9sKCd1dGlsLnByb21pc2lmeS5jdXN0b20nKSA6IHVuZGVmaW5lZDtcblxuZXhwb3J0cy5wcm9taXNpZnkgPSBmdW5jdGlvbiBwcm9taXNpZnkob3JpZ2luYWwpIHtcbiAgaWYgKHR5cGVvZiBvcmlnaW5hbCAhPT0gJ2Z1bmN0aW9uJylcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJvcmlnaW5hbFwiIGFyZ3VtZW50IG11c3QgYmUgb2YgdHlwZSBGdW5jdGlvbicpO1xuXG4gIGlmIChrQ3VzdG9tUHJvbWlzaWZpZWRTeW1ib2wgJiYgb3JpZ2luYWxba0N1c3RvbVByb21pc2lmaWVkU3ltYm9sXSkge1xuICAgIHZhciBmbiA9IG9yaWdpbmFsW2tDdXN0b21Qcm9taXNpZmllZFN5bWJvbF07XG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwidXRpbC5wcm9taXNpZnkuY3VzdG9tXCIgYXJndW1lbnQgbXVzdCBiZSBvZiB0eXBlIEZ1bmN0aW9uJyk7XG4gICAgfVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShmbiwga0N1c3RvbVByb21pc2lmaWVkU3ltYm9sLCB7XG4gICAgICB2YWx1ZTogZm4sIGVudW1lcmFibGU6IGZhbHNlLCB3cml0YWJsZTogZmFsc2UsIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIHJldHVybiBmbjtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZuKCkge1xuICAgIHZhciBwcm9taXNlUmVzb2x2ZSwgcHJvbWlzZVJlamVjdDtcbiAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHByb21pc2VSZXNvbHZlID0gcmVzb2x2ZTtcbiAgICAgIHByb21pc2VSZWplY3QgPSByZWplY3Q7XG4gICAgfSk7XG5cbiAgICB2YXIgYXJncyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBhcmdzLnB1c2goYXJndW1lbnRzW2ldKTtcbiAgICB9XG4gICAgYXJncy5wdXNoKGZ1bmN0aW9uIChlcnIsIHZhbHVlKSB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHByb21pc2VSZWplY3QoZXJyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHByb21pc2VSZXNvbHZlKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRyeSB7XG4gICAgICBvcmlnaW5hbC5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHByb21pc2VSZWplY3QoZXJyKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcHJvbWlzZTtcbiAgfVxuXG4gIE9iamVjdC5zZXRQcm90b3R5cGVPZihmbiwgT2JqZWN0LmdldFByb3RvdHlwZU9mKG9yaWdpbmFsKSk7XG5cbiAgaWYgKGtDdXN0b21Qcm9taXNpZmllZFN5bWJvbCkgT2JqZWN0LmRlZmluZVByb3BlcnR5KGZuLCBrQ3VzdG9tUHJvbWlzaWZpZWRTeW1ib2wsIHtcbiAgICB2YWx1ZTogZm4sIGVudW1lcmFibGU6IGZhbHNlLCB3cml0YWJsZTogZmFsc2UsIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICB9KTtcbiAgcmV0dXJuIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKFxuICAgIGZuLFxuICAgIGdldE93blByb3BlcnR5RGVzY3JpcHRvcnMob3JpZ2luYWwpXG4gICk7XG59XG5cbmV4cG9ydHMucHJvbWlzaWZ5LmN1c3RvbSA9IGtDdXN0b21Qcm9taXNpZmllZFN5bWJvbFxuXG5mdW5jdGlvbiBjYWxsYmFja2lmeU9uUmVqZWN0ZWQocmVhc29uLCBjYikge1xuICAvLyBgIXJlYXNvbmAgZ3VhcmQgaW5zcGlyZWQgYnkgYmx1ZWJpcmQgKFJlZjogaHR0cHM6Ly9nb28uZ2wvdDVJUzZNKS5cbiAgLy8gQmVjYXVzZSBgbnVsbGAgaXMgYSBzcGVjaWFsIGVycm9yIHZhbHVlIGluIGNhbGxiYWNrcyB3aGljaCBtZWFucyBcIm5vIGVycm9yXG4gIC8vIG9jY3VycmVkXCIsIHdlIGVycm9yLXdyYXAgc28gdGhlIGNhbGxiYWNrIGNvbnN1bWVyIGNhbiBkaXN0aW5ndWlzaCBiZXR3ZWVuXG4gIC8vIFwidGhlIHByb21pc2UgcmVqZWN0ZWQgd2l0aCBudWxsXCIgb3IgXCJ0aGUgcHJvbWlzZSBmdWxmaWxsZWQgd2l0aCB1bmRlZmluZWRcIi5cbiAgaWYgKCFyZWFzb24pIHtcbiAgICB2YXIgbmV3UmVhc29uID0gbmV3IEVycm9yKCdQcm9taXNlIHdhcyByZWplY3RlZCB3aXRoIGEgZmFsc3kgdmFsdWUnKTtcbiAgICBuZXdSZWFzb24ucmVhc29uID0gcmVhc29uO1xuICAgIHJlYXNvbiA9IG5ld1JlYXNvbjtcbiAgfVxuICByZXR1cm4gY2IocmVhc29uKTtcbn1cblxuZnVuY3Rpb24gY2FsbGJhY2tpZnkob3JpZ2luYWwpIHtcbiAgaWYgKHR5cGVvZiBvcmlnaW5hbCAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcIm9yaWdpbmFsXCIgYXJndW1lbnQgbXVzdCBiZSBvZiB0eXBlIEZ1bmN0aW9uJyk7XG4gIH1cblxuICAvLyBXZSBETyBOT1QgcmV0dXJuIHRoZSBwcm9taXNlIGFzIGl0IGdpdmVzIHRoZSB1c2VyIGEgZmFsc2Ugc2Vuc2UgdGhhdFxuICAvLyB0aGUgcHJvbWlzZSBpcyBhY3R1YWxseSBzb21laG93IHJlbGF0ZWQgdG8gdGhlIGNhbGxiYWNrJ3MgZXhlY3V0aW9uXG4gIC8vIGFuZCB0aGF0IHRoZSBjYWxsYmFjayB0aHJvd2luZyB3aWxsIHJlamVjdCB0aGUgcHJvbWlzZS5cbiAgZnVuY3Rpb24gY2FsbGJhY2tpZmllZCgpIHtcbiAgICB2YXIgYXJncyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBhcmdzLnB1c2goYXJndW1lbnRzW2ldKTtcbiAgICB9XG5cbiAgICB2YXIgbWF5YmVDYiA9IGFyZ3MucG9wKCk7XG4gICAgaWYgKHR5cGVvZiBtYXliZUNiICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgbGFzdCBhcmd1bWVudCBtdXN0IGJlIG9mIHR5cGUgRnVuY3Rpb24nKTtcbiAgICB9XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBjYiA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG1heWJlQ2IuYXBwbHkoc2VsZiwgYXJndW1lbnRzKTtcbiAgICB9O1xuICAgIC8vIEluIHRydWUgbm9kZSBzdHlsZSB3ZSBwcm9jZXNzIHRoZSBjYWxsYmFjayBvbiBgbmV4dFRpY2tgIHdpdGggYWxsIHRoZVxuICAgIC8vIGltcGxpY2F0aW9ucyAoc3RhY2ssIGB1bmNhdWdodEV4Y2VwdGlvbmAsIGBhc3luY19ob29rc2ApXG4gICAgb3JpZ2luYWwuYXBwbHkodGhpcywgYXJncylcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJldCkgeyBwcm9jZXNzLm5leHRUaWNrKGNiLmJpbmQobnVsbCwgbnVsbCwgcmV0KSkgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uKHJlaikgeyBwcm9jZXNzLm5leHRUaWNrKGNhbGxiYWNraWZ5T25SZWplY3RlZC5iaW5kKG51bGwsIHJlaiwgY2IpKSB9KTtcbiAgfVxuXG4gIE9iamVjdC5zZXRQcm90b3R5cGVPZihjYWxsYmFja2lmaWVkLCBPYmplY3QuZ2V0UHJvdG90eXBlT2Yob3JpZ2luYWwpKTtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoY2FsbGJhY2tpZmllZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyhvcmlnaW5hbCkpO1xuICByZXR1cm4gY2FsbGJhY2tpZmllZDtcbn1cbmV4cG9ydHMuY2FsbGJhY2tpZnkgPSBjYWxsYmFja2lmeTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGZvckVhY2ggPSByZXF1aXJlKCdmb3ItZWFjaCcpO1xudmFyIGF2YWlsYWJsZVR5cGVkQXJyYXlzID0gcmVxdWlyZSgnYXZhaWxhYmxlLXR5cGVkLWFycmF5cycpO1xudmFyIGNhbGxCaW5kID0gcmVxdWlyZSgnY2FsbC1iaW5kJyk7XG52YXIgY2FsbEJvdW5kID0gcmVxdWlyZSgnY2FsbC1iaW5kL2NhbGxCb3VuZCcpO1xudmFyIGdPUEQgPSByZXF1aXJlKCdnb3BkJyk7XG5cbnZhciAkdG9TdHJpbmcgPSBjYWxsQm91bmQoJ09iamVjdC5wcm90b3R5cGUudG9TdHJpbmcnKTtcbnZhciBoYXNUb1N0cmluZ1RhZyA9IHJlcXVpcmUoJ2hhcy10b3N0cmluZ3RhZy9zaGFtcycpKCk7XG5cbnZhciBnID0gdHlwZW9mIGdsb2JhbFRoaXMgPT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDogZ2xvYmFsVGhpcztcbnZhciB0eXBlZEFycmF5cyA9IGF2YWlsYWJsZVR5cGVkQXJyYXlzKCk7XG5cbnZhciAkc2xpY2UgPSBjYWxsQm91bmQoJ1N0cmluZy5wcm90b3R5cGUuc2xpY2UnKTtcbnZhciBnZXRQcm90b3R5cGVPZiA9IE9iamVjdC5nZXRQcm90b3R5cGVPZjsgLy8gcmVxdWlyZSgnZ2V0cHJvdG90eXBlb2YnKTtcblxudmFyICRpbmRleE9mID0gY2FsbEJvdW5kKCdBcnJheS5wcm90b3R5cGUuaW5kZXhPZicsIHRydWUpIHx8IGZ1bmN0aW9uIGluZGV4T2YoYXJyYXksIHZhbHVlKSB7XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpICs9IDEpIHtcblx0XHRpZiAoYXJyYXlbaV0gPT09IHZhbHVlKSB7XG5cdFx0XHRyZXR1cm4gaTtcblx0XHR9XG5cdH1cblx0cmV0dXJuIC0xO1xufTtcbnZhciBjYWNoZSA9IHsgX19wcm90b19fOiBudWxsIH07XG5pZiAoaGFzVG9TdHJpbmdUYWcgJiYgZ09QRCAmJiBnZXRQcm90b3R5cGVPZikge1xuXHRmb3JFYWNoKHR5cGVkQXJyYXlzLCBmdW5jdGlvbiAodHlwZWRBcnJheSkge1xuXHRcdHZhciBhcnIgPSBuZXcgZ1t0eXBlZEFycmF5XSgpO1xuXHRcdGlmIChTeW1ib2wudG9TdHJpbmdUYWcgaW4gYXJyKSB7XG5cdFx0XHR2YXIgcHJvdG8gPSBnZXRQcm90b3R5cGVPZihhcnIpO1xuXHRcdFx0dmFyIGRlc2NyaXB0b3IgPSBnT1BEKHByb3RvLCBTeW1ib2wudG9TdHJpbmdUYWcpO1xuXHRcdFx0aWYgKCFkZXNjcmlwdG9yKSB7XG5cdFx0XHRcdHZhciBzdXBlclByb3RvID0gZ2V0UHJvdG90eXBlT2YocHJvdG8pO1xuXHRcdFx0XHRkZXNjcmlwdG9yID0gZ09QRChzdXBlclByb3RvLCBTeW1ib2wudG9TdHJpbmdUYWcpO1xuXHRcdFx0fVxuXHRcdFx0Y2FjaGVbJyQnICsgdHlwZWRBcnJheV0gPSBjYWxsQmluZChkZXNjcmlwdG9yLmdldCk7XG5cdFx0fVxuXHR9KTtcbn0gZWxzZSB7XG5cdGZvckVhY2godHlwZWRBcnJheXMsIGZ1bmN0aW9uICh0eXBlZEFycmF5KSB7XG5cdFx0dmFyIGFyciA9IG5ldyBnW3R5cGVkQXJyYXldKCk7XG5cdFx0Y2FjaGVbJyQnICsgdHlwZWRBcnJheV0gPSBjYWxsQmluZChhcnIuc2xpY2UpO1xuXHR9KTtcbn1cblxudmFyIHRyeVR5cGVkQXJyYXlzID0gZnVuY3Rpb24gdHJ5QWxsVHlwZWRBcnJheXModmFsdWUpIHtcblx0dmFyIGZvdW5kID0gZmFsc2U7XG5cdGZvckVhY2goY2FjaGUsIGZ1bmN0aW9uIChnZXR0ZXIsIHR5cGVkQXJyYXkpIHtcblx0XHRpZiAoIWZvdW5kKSB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRpZiAoJyQnICsgZ2V0dGVyKHZhbHVlKSA9PT0gdHlwZWRBcnJheSkge1xuXHRcdFx0XHRcdGZvdW5kID0gJHNsaWNlKHR5cGVkQXJyYXksIDEpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGNhdGNoIChlKSB7IC8qKi8gfVxuXHRcdH1cblx0fSk7XG5cdHJldHVybiBmb3VuZDtcbn07XG5cbnZhciB0cnlTbGljZXMgPSBmdW5jdGlvbiB0cnlBbGxTbGljZXModmFsdWUpIHtcblx0dmFyIGZvdW5kID0gZmFsc2U7XG5cdGZvckVhY2goY2FjaGUsIGZ1bmN0aW9uIChnZXR0ZXIsIG5hbWUpIHtcblx0XHRpZiAoIWZvdW5kKSB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRnZXR0ZXIodmFsdWUpO1xuXHRcdFx0XHRmb3VuZCA9ICRzbGljZShuYW1lLCAxKTtcblx0XHRcdH0gY2F0Y2ggKGUpIHsgLyoqLyB9XG5cdFx0fVxuXHR9KTtcblx0cmV0dXJuIGZvdW5kO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB3aGljaFR5cGVkQXJyYXkodmFsdWUpIHtcblx0aWYgKCF2YWx1ZSB8fCB0eXBlb2YgdmFsdWUgIT09ICdvYmplY3QnKSB7IHJldHVybiBmYWxzZTsgfVxuXHRpZiAoIWhhc1RvU3RyaW5nVGFnKSB7XG5cdFx0dmFyIHRhZyA9ICRzbGljZSgkdG9TdHJpbmcodmFsdWUpLCA4LCAtMSk7XG5cdFx0aWYgKCRpbmRleE9mKHR5cGVkQXJyYXlzLCB0YWcpID4gLTEpIHtcblx0XHRcdHJldHVybiB0YWc7XG5cdFx0fVxuXHRcdGlmICh0YWcgIT09ICdPYmplY3QnKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdC8vIG5vZGUgPCAwLjYgaGl0cyBoZXJlIG9uIHJlYWwgVHlwZWQgQXJyYXlzXG5cdFx0cmV0dXJuIHRyeVNsaWNlcyh2YWx1ZSk7XG5cdH1cblx0aWYgKCFnT1BEKSB7IHJldHVybiBudWxsOyB9IC8vIHVua25vd24gZW5naW5lXG5cdHJldHVybiB0cnlUeXBlZEFycmF5cyh2YWx1ZSk7XG59O1xuIiwiXG5cbihmdW5jdGlvbigpIHtcblxuXG4vKiBDb3B5cmlnaHQgKGMpIDIwMTQgVGhlIENocm9taXVtIEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhIEJTRC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlLiAqL1xuXG4vKipcbiAqIEBmaWxlb3ZlcnZpZXcgTG93LWxldmVsIERPTSB0cmF2ZXJzYWwgdXRpbGl0eSBmdW5jdGlvbnMgdG8gZmluZCB0aGVcbiAqICAgICBuZXh0IChvciBwcmV2aW91cykgY2hhcmFjdGVyLCB3b3JkLCBzZW50ZW5jZSwgbGluZSwgb3IgcGFyYWdyYXBoLFxuICogICAgIGluIGEgY29tcGxldGVseSBzdGF0ZWxlc3MgbWFubmVyIHdpdGhvdXQgYWN0dWFsbHkgbWFuaXB1bGF0aW5nIHRoZVxuICogICAgIHNlbGVjdGlvbi5cbiAqL1xuXG4vKipcbiAqIEEgY2xhc3MgdG8gcmVwcmVzZW50IGEgY3Vyc29yIGxvY2F0aW9uIGluIHRoZSBkb2N1bWVudCxcbiAqIGxpa2UgdGhlIHN0YXJ0IHBvc2l0aW9uIG9yIGVuZCBwb3NpdGlvbiBvZiBhIHNlbGVjdGlvbiByYW5nZS5cbiAqXG4gKiBMYXRlciB0aGlzIG1heSBiZSBleHRlbmRlZCB0byBzdXBwb3J0IFwidmlydHVhbCB0ZXh0XCIgZm9yIGFuIG9iamVjdCxcbiAqIGxpa2UgdGhlIEFMVCB0ZXh0IGZvciBhbiBpbWFnZS5cbiAqXG4gKiBOb3RlOiB3ZSBjYWNoZSB0aGUgdGV4dCBvZiBhIHBhcnRpY3VsYXIgbm9kZSBhdCB0aGUgdGltZSB3ZVxuICogdHJhdmVyc2UgaW50byBpdC4gTGF0ZXIgd2Ugc2hvdWxkIGFkZCBzdXBwb3J0IGZvciBkeW5hbWljYWxseVxuICogcmVsb2FkaW5nIGl0LlxuICogQHBhcmFtIHtOb2RlfSBub2RlIFRoZSBET00gbm9kZS5cbiAqIEBwYXJhbSB7bnVtYmVyfSBpbmRleCBUaGUgaW5kZXggb2YgdGhlIGNoYXJhY3RlciB3aXRoaW4gdGhlIG5vZGUuXG4gKiBAcGFyYW0ge3N0cmluZ30gdGV4dCBUaGUgY2FjaGVkIHRleHQgY29udGVudHMgb2YgdGhlIG5vZGUuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuY29uc3QgQ3Vyc29yID0gZnVuY3Rpb24obm9kZSwgaW5kZXgsIHRleHQpIHtcbiAgdGhpcy5ub2RlID0gbm9kZTtcbiAgdGhpcy5pbmRleCA9IGluZGV4O1xuICB0aGlzLnRleHQgPSB0ZXh0O1xufTtcblxuLyoqXG4gKiBAcmV0dXJuIHtDdXJzb3J9IEEgbmV3IGN1cnNvciBwb2ludGluZyB0byB0aGUgc2FtZSBsb2NhdGlvbi5cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IEN1cnNvcih0aGlzLm5vZGUsIHRoaXMuaW5kZXgsIHRoaXMudGV4dCk7XG59O1xuXG4vKipcbiAqIE1vZGlmeSB0aGlzIGN1cnNvciB0byBwb2ludCB0byB0aGUgbG9jYXRpb24gdGhhdCBhbm90aGVyIGN1cnNvciBwb2ludHMgdG8uXG4gKiBAcGFyYW0ge0N1cnNvcn0gb3RoZXJDdXJzb3IgVGhlIGN1cnNvciB0byBjb3B5IGZyb20uXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuY29weUZyb20gPSBmdW5jdGlvbihvdGhlckN1cnNvcikge1xuICB0aGlzLm5vZGUgPSBvdGhlckN1cnNvci5ub2RlO1xuICB0aGlzLmluZGV4ID0gb3RoZXJDdXJzb3IuaW5kZXg7XG4gIHRoaXMudGV4dCA9IG90aGVyQ3Vyc29yLnRleHQ7XG59O1xuXG4vKipcbiAqIFV0aWxpdHkgZnVuY3Rpb25zIGZvciBzdGF0ZWxlc3MgRE9NIHRyYXZlcnNhbC5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG5jb25zdCBUcmF2ZXJzZVV0aWwgPSBmdW5jdGlvbigpIHt9O1xuXG4vKipcbiAqIEdldHMgdGhlIHRleHQgcmVwcmVzZW50YXRpb24gb2YgYSBub2RlLiBUaGlzIGFsbG93cyB1cyB0byBzdWJzdGl0dXRlXG4gKiBhbHQgdGV4dCwgbmFtZXMsIG9yIHRpdGxlcyBmb3IgaHRtbCBlbGVtZW50cyB0aGF0IHByb3ZpZGUgdGhlbS5cbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZSBBIERPTSBub2RlLlxuICogQHJldHVybiB7c3RyaW5nfSBBIHRleHQgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBub2RlLlxuICovXG5UcmF2ZXJzZVV0aWwuZ2V0Tm9kZVRleHQgPSBmdW5jdGlvbihub2RlKSB7XG4gIGlmIChub2RlLmNvbnN0cnVjdG9yID09IFRleHQpIHtcbiAgICByZXR1cm4gbm9kZS5kYXRhO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAnJztcbiAgfVxufTtcblxuLyoqXG4gKiBSZXR1cm4gdHJ1ZSBpZiBhIG5vZGUgc2hvdWxkIGJlIHRyZWF0ZWQgYXMgYSBsZWFmIG5vZGUsIGJlY2F1c2VcbiAqIGl0cyBjaGlsZHJlbiBhcmUgcHJvcGVydGllcyBvZiB0aGUgb2JqZWN0IHRoYXQgc2hvdWxkbid0IGJlIHRyYXZlcnNlZC5cbiAqXG4gKiBUT0RPKGRtYXp6b25pKTogcmVwbGFjZSB0aGlzIHdpdGggYSBwcmVkaWNhdGUgdGhhdCBkZXRlY3RzIG5vZGVzIHdpdGhcbiAqIEFSSUEgcm9sZXMgYW5kIG90aGVyIG9iamVjdHMgdGhhdCBoYXZlIHRoZWlyIG93biBkZXNjcmlwdGlvbi5cbiAqIEZvciBub3cgd2UganVzdCBkZXRlY3QgYSBjb3VwbGUgb2YgY29tbW9uIGNhc2VzLlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZSBBIERPTSBub2RlLlxuICogQHJldHVybiB7Ym9vbGVhbn0gVHJ1ZSBpZiB0aGUgbm9kZSBzaG91bGQgYmUgdHJlYXRlZCBhcyBhIGxlYWYgbm9kZS5cbiAqL1xuVHJhdmVyc2VVdGlsLnRyZWF0QXNMZWFmTm9kZSA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgcmV0dXJuIG5vZGUuY2hpbGROb2Rlcy5sZW5ndGggPT0gMCB8fFxuICAgICAgICAgbm9kZS5ub2RlTmFtZSA9PSAnU0VMRUNUJyB8fFxuICAgICAgICAgbm9kZS5ub2RlTmFtZSA9PSAnT0JKRUNUJztcbn07XG5cbi8qKlxuICogUmV0dXJuIHRydWUgb25seSBpZiBhIHNpbmdsZSBjaGFyYWN0ZXIgaXMgd2hpdGVzcGFjZS5cbiAqIEZyb20gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4vV2hpdGVzcGFjZV9pbl90aGVfRE9NLFxuICogd2hpdGVzcGFjZSBpcyBkZWZpbmVkIGFzIG9uZSBvZiB0aGUgY2hhcmFjdGVyc1xuICogIFwiXFx0XCIgVEFCIFxcdTAwMDlcbiAqICBcIlxcblwiIExGICBcXHUwMDBBXG4gKiAgXCJcXHJcIiBDUiAgXFx1MDAwRFxuICogIFwiIFwiICBTUEMgXFx1MDAyMC5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gYyBBIHN0cmluZyBjb250YWluaW5nIGEgc2luZ2xlIGNoYXJhY3Rlci5cbiAqIEByZXR1cm4ge2Jvb2xlYW59IFRydWUgaWYgdGhlIGNoYXJhY3RlciBpcyB3aGl0ZXNwYWNlLCBvdGhlcndpc2UgZmFsc2UuXG4gKi9cblRyYXZlcnNlVXRpbC5pc1doaXRlc3BhY2UgPSBmdW5jdGlvbihjKSB7XG4gIHJldHVybiAoYyA9PSAnICcgfHwgYyA9PSAnXFxuJyB8fCBjID09ICdcXHInIHx8IGMgPT0gJ1xcdCcpO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIHNlbGVjdGlvbiB0byB0aGUgcmFuZ2UgYmV0d2VlbiB0aGUgZ2l2ZW4gc3RhcnQgYW5kIGVuZCBjdXJzb3JzLlxuICogQHBhcmFtIHtDdXJzb3J9IHN0YXJ0IFRoZSBkZXNpcmVkIHN0YXJ0IG9mIHRoZSBzZWxlY3Rpb24uXG4gKiBAcGFyYW0ge0N1cnNvcn0gZW5kIFRoZSBkZXNpcmVkIGVuZCBvZiB0aGUgc2VsZWN0aW9uLlxuICogQHJldHVybiB7U2VsZWN0aW9ufSB0aGUgc2VsZWN0aW9uIG9iamVjdC5cbiAqL1xuVHJhdmVyc2VVdGlsLnNldFNlbGVjdGlvbiA9IGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHNlbCA9IHdpbmRvdy5nZXRTZWxlY3Rpb24oKTtcbiAgc2VsLnJlbW92ZUFsbFJhbmdlcygpO1xuICB2YXIgcmFuZ2UgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpO1xuICByYW5nZS5zZXRTdGFydChzdGFydC5ub2RlLCBzdGFydC5pbmRleCk7XG4gIHJhbmdlLnNldEVuZChlbmQubm9kZSwgZW5kLmluZGV4KTtcbiAgc2VsLmFkZFJhbmdlKHJhbmdlKTtcblxuICByZXR1cm4gc2VsO1xufTtcblxuLyoqXG4gKiBVc2UgdGhlIGNvbXB1dGVkIENTUyBzdHlsZSB0byBmaWd1cmUgb3V0IGlmIHRoaXMgRE9NIG5vZGUgaXMgY3VycmVudGx5XG4gKiB2aXNpYmxlLlxuICogQHBhcmFtIHtOb2RlfSBub2RlIEEgSFRNTCBET00gbm9kZS5cbiAqIEByZXR1cm4ge2Jvb2xlYW59IFdoZXRoZXIgb3Igbm90IHRoZSBodG1sIG5vZGUgaXMgdmlzaWJsZS5cbiAqL1xuVHJhdmVyc2VVdGlsLmlzVmlzaWJsZSA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgaWYgKCFub2RlLnN0eWxlKVxuICAgIHJldHVybiB0cnVlO1xuICB2YXIgc3R5bGUgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSgvKiogQHR5cGUge0VsZW1lbnR9ICovKG5vZGUpLCBudWxsKTtcbiAgcmV0dXJuICghIXN0eWxlICYmIHN0eWxlLmRpc3BsYXkgIT0gJ25vbmUnICYmIHN0eWxlLnZpc2liaWxpdHkgIT0gJ2hpZGRlbicpO1xufTtcblxuLyoqXG4gKiBVc2UgdGhlIGNsYXNzIG5hbWUgdG8gZmlndXJlIG91dCBpZiB0aGlzIERPTSBub2RlIHNob3VsZCBiZSB0cmF2ZXJzZWQuXG4gKiBAcGFyYW0ge05vZGV9IG5vZGUgQSBIVE1MIERPTSBub2RlLlxuICogQHJldHVybiB7Ym9vbGVhbn0gV2hldGhlciBvciBub3QgdGhlIGh0bWwgbm9kZSBzaG91bGQgYmUgdHJhdmVyc2VkLlxuICovXG5UcmF2ZXJzZVV0aWwuaXNTa2lwcGVkID0gZnVuY3Rpb24obm9kZSkge1xuICBpZiAobm9kZS5jb25zdHJ1Y3RvciA9PSBUZXh0KVxuICAgIG5vZGUgPSBub2RlLnBhcmVudEVsZW1lbnQ7XG4gIGlmIChub2RlLmNsYXNzTmFtZSA9PSAnQ2FyZXRCcm93c2luZ19DYXJldCcgfHxcbiAgICAgIG5vZGUuY2xhc3NOYW1lID09ICdDYXJldEJyb3dzaW5nX0FuaW1hdGVDYXJldCcpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIE1vdmVzIHRoZSBjdXJzb3IgZm9yd2FyZHMgdW50aWwgaXQgaGFzIGNyb3NzZWQgZXhhY3RseSBvbmUgY2hhcmFjdGVyLlxuICogQHBhcmFtIHtDdXJzb3J9IGN1cnNvciBUaGUgY3Vyc29yIGxvY2F0aW9uIHdoZXJlIHRoZSBzZWFyY2ggc2hvdWxkIHN0YXJ0LlxuICogICAgIE9uIGV4aXQsIHRoZSBjdXJzb3Igd2lsbCBiZSBpbW1lZGlhdGVseSB0byB0aGUgcmlnaHQgb2YgdGhlXG4gKiAgICAgY2hhcmFjdGVyIHJldHVybmVkLlxuICogQHBhcmFtIHtBcnJheTxOb2RlPn0gbm9kZXNDcm9zc2VkIEFueSBIVE1MIG5vZGVzIGNyb3NzZWQgYmV0d2VlbiB0aGVcbiAqICAgICBpbml0aWFsIGFuZCBmaW5hbCBjdXJzb3IgcG9zaXRpb24gd2lsbCBiZSBwdXNoZWQgb250byB0aGlzIGFycmF5LlxuICogQHJldHVybiB7P3N0cmluZ30gVGhlIGNoYXJhY3RlciBmb3VuZCwgb3IgbnVsbCBpZiB0aGUgYm90dG9tIG9mIHRoZVxuICogICAgIGRvY3VtZW50IGhhcyBiZWVuIHJlYWNoZWQuXG4gKi9cblRyYXZlcnNlVXRpbC5mb3J3YXJkc0NoYXIgPSBmdW5jdGlvbihjdXJzb3IsIG5vZGVzQ3Jvc3NlZCkge1xuICB3aGlsZSAodHJ1ZSkge1xuICAgIC8vIE1vdmUgZG93biB1bnRpbCB3ZSBnZXQgdG8gYSBsZWFmIG5vZGUuXG4gICAgdmFyIGNoaWxkTm9kZSA9IG51bGw7XG4gICAgaWYgKCFUcmF2ZXJzZVV0aWwudHJlYXRBc0xlYWZOb2RlKGN1cnNvci5ub2RlKSkge1xuICAgICAgZm9yICh2YXIgaSA9IGN1cnNvci5pbmRleDsgaSA8IGN1cnNvci5ub2RlLmNoaWxkTm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIG5vZGUgPSBjdXJzb3Iubm9kZS5jaGlsZE5vZGVzW2ldO1xuICAgICAgICBpZiAoVHJhdmVyc2VVdGlsLmlzU2tpcHBlZChub2RlKSkge1xuICAgICAgICAgIG5vZGVzQ3Jvc3NlZC5wdXNoKG5vZGUpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChUcmF2ZXJzZVV0aWwuaXNWaXNpYmxlKG5vZGUpKSB7XG4gICAgICAgICAgY2hpbGROb2RlID0gbm9kZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoY2hpbGROb2RlKSB7XG4gICAgICBjdXJzb3Iubm9kZSA9IGNoaWxkTm9kZTtcbiAgICAgIGN1cnNvci5pbmRleCA9IDA7XG4gICAgICBjdXJzb3IudGV4dCA9IFRyYXZlcnNlVXRpbC5nZXROb2RlVGV4dChjdXJzb3Iubm9kZSk7XG4gICAgICBpZiAoY3Vyc29yLm5vZGUuY29uc3RydWN0b3IgIT0gVGV4dCkge1xuICAgICAgICBub2Rlc0Nyb3NzZWQucHVzaChjdXJzb3Iubm9kZSk7XG4gICAgICB9XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdGhlIG5leHQgY2hhcmFjdGVyIGZyb20gdGhpcyBsZWFmIG5vZGUuXG4gICAgaWYgKGN1cnNvci5pbmRleCA8IGN1cnNvci50ZXh0Lmxlbmd0aClcbiAgICAgIHJldHVybiBjdXJzb3IudGV4dFtjdXJzb3IuaW5kZXgrK107XG5cbiAgICAvLyBNb3ZlIHRvIHRoZSBuZXh0IHNpYmxpbmcsIGdvaW5nIHVwIHRoZSB0cmVlIGFzIG5lY2Vzc2FyeS5cbiAgICB3aGlsZSAoY3Vyc29yLm5vZGUgIT0gbnVsbCkge1xuICAgICAgLy8gVHJ5IHRvIG1vdmUgdG8gdGhlIG5leHQgc2libGluZy5cbiAgICAgIHZhciBzaWJsaW5nTm9kZSA9IG51bGw7XG4gICAgICBmb3IgKHZhciBub2RlID0gY3Vyc29yLm5vZGUubmV4dFNpYmxpbmc7XG4gICAgICAgICAgIG5vZGUgIT0gbnVsbDtcbiAgICAgICAgICAgbm9kZSA9IG5vZGUubmV4dFNpYmxpbmcpIHtcbiAgICAgICAgaWYgKFRyYXZlcnNlVXRpbC5pc1NraXBwZWQobm9kZSkpIHtcbiAgICAgICAgICBub2Rlc0Nyb3NzZWQucHVzaChub2RlKTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoVHJhdmVyc2VVdGlsLmlzVmlzaWJsZShub2RlKSkge1xuICAgICAgICAgIHNpYmxpbmdOb2RlID0gbm9kZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHNpYmxpbmdOb2RlKSB7XG4gICAgICAgIGN1cnNvci5ub2RlID0gc2libGluZ05vZGU7XG4gICAgICAgIGN1cnNvci50ZXh0ID0gVHJhdmVyc2VVdGlsLmdldE5vZGVUZXh0KHNpYmxpbmdOb2RlKTtcbiAgICAgICAgY3Vyc29yLmluZGV4ID0gMDtcblxuICAgICAgICBpZiAoY3Vyc29yLm5vZGUuY29uc3RydWN0b3IgIT0gVGV4dCkge1xuICAgICAgICAgIG5vZGVzQ3Jvc3NlZC5wdXNoKGN1cnNvci5ub2RlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICAvLyBPdGhlcndpc2UsIG1vdmUgdG8gdGhlIHBhcmVudC5cbiAgICAgIGlmIChjdXJzb3Iubm9kZS5wYXJlbnROb2RlICYmXG4gICAgICAgICAgY3Vyc29yLm5vZGUucGFyZW50Tm9kZS5jb25zdHJ1Y3RvciAhPSBIVE1MQm9keUVsZW1lbnQpIHtcbiAgICAgICAgY3Vyc29yLm5vZGUgPSBjdXJzb3Iubm9kZS5wYXJlbnROb2RlO1xuICAgICAgICBjdXJzb3IudGV4dCA9IG51bGw7XG4gICAgICAgIGN1cnNvci5pbmRleCA9IDA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogTW92ZXMgdGhlIGN1cnNvciBiYWNrd2FyZHMgdW50aWwgaXQgaGFzIGNyb3NzZWQgZXhhY3RseSBvbmUgY2hhcmFjdGVyLlxuICogQHBhcmFtIHtDdXJzb3J9IGN1cnNvciBUaGUgY3Vyc29yIGxvY2F0aW9uIHdoZXJlIHRoZSBzZWFyY2ggc2hvdWxkIHN0YXJ0LlxuICogICAgIE9uIGV4aXQsIHRoZSBjdXJzb3Igd2lsbCBiZSBpbW1lZGlhdGVseSB0byB0aGUgbGVmdCBvZiB0aGVcbiAqICAgICBjaGFyYWN0ZXIgcmV0dXJuZWQuXG4gKiBAcGFyYW0ge0FycmF5PE5vZGU+fSBub2Rlc0Nyb3NzZWQgQW55IEhUTUwgbm9kZXMgY3Jvc3NlZCBiZXR3ZWVuIHRoZVxuICogICAgIGluaXRpYWwgYW5kIGZpbmFsIGN1cnNvciBwb3NpdGlvbiB3aWxsIGJlIHB1c2hlZCBvbnRvIHRoaXMgYXJyYXkuXG4gKiBAcmV0dXJuIHs/c3RyaW5nfSBUaGUgcHJldmlvdXMgY2hhcmFjdGVyLCBvciBudWxsIGlmIHRoZSB0b3Agb2YgdGhlXG4gKiAgICAgZG9jdW1lbnQgaGFzIGJlZW4gcmVhY2hlZC5cbiAqL1xuVHJhdmVyc2VVdGlsLmJhY2t3YXJkc0NoYXIgPSBmdW5jdGlvbihjdXJzb3IsIG5vZGVzQ3Jvc3NlZCkge1xuICB3aGlsZSAodHJ1ZSkge1xuICAgIC8vIE1vdmUgZG93biB1bnRpbCB3ZSBnZXQgdG8gYSBsZWFmIG5vZGUuXG4gICAgdmFyIGNoaWxkTm9kZSA9IG51bGw7XG4gICAgaWYgKCFUcmF2ZXJzZVV0aWwudHJlYXRBc0xlYWZOb2RlKGN1cnNvci5ub2RlKSkge1xuICAgICAgZm9yICh2YXIgaSA9IGN1cnNvci5pbmRleCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgIHZhciBub2RlID0gY3Vyc29yLm5vZGUuY2hpbGROb2Rlc1tpXTtcbiAgICAgICAgaWYgKFRyYXZlcnNlVXRpbC5pc1NraXBwZWQobm9kZSkpIHtcbiAgICAgICAgICBub2Rlc0Nyb3NzZWQucHVzaChub2RlKTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoVHJhdmVyc2VVdGlsLmlzVmlzaWJsZShub2RlKSkge1xuICAgICAgICAgIGNoaWxkTm9kZSA9IG5vZGU7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGNoaWxkTm9kZSkge1xuICAgICAgY3Vyc29yLm5vZGUgPSBjaGlsZE5vZGU7XG4gICAgICBjdXJzb3IudGV4dCA9IFRyYXZlcnNlVXRpbC5nZXROb2RlVGV4dChjdXJzb3Iubm9kZSk7XG4gICAgICBpZiAoY3Vyc29yLnRleHQubGVuZ3RoKVxuICAgICAgICBjdXJzb3IuaW5kZXggPSBjdXJzb3IudGV4dC5sZW5ndGg7XG4gICAgICBlbHNlXG4gICAgICAgIGN1cnNvci5pbmRleCA9IGN1cnNvci5ub2RlLmNoaWxkTm9kZXMubGVuZ3RoO1xuICAgICAgaWYgKGN1cnNvci5ub2RlLmNvbnN0cnVjdG9yICE9IFRleHQpXG4gICAgICAgIG5vZGVzQ3Jvc3NlZC5wdXNoKGN1cnNvci5ub2RlKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIFJldHVybiB0aGUgcHJldmlvdXMgY2hhcmFjdGVyIGZyb20gdGhpcyBsZWFmIG5vZGUuXG4gICAgaWYgKGN1cnNvci50ZXh0Lmxlbmd0aCA+IDAgJiYgY3Vyc29yLmluZGV4ID4gMCkge1xuICAgICAgcmV0dXJuIGN1cnNvci50ZXh0Wy0tY3Vyc29yLmluZGV4XTtcbiAgICB9XG5cbiAgICAvLyBNb3ZlIHRvIHRoZSBwcmV2aW91cyBzaWJsaW5nLCBnb2luZyB1cCB0aGUgdHJlZSBhcyBuZWNlc3NhcnkuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIC8vIFRyeSB0byBtb3ZlIHRvIHRoZSBwcmV2aW91cyBzaWJsaW5nLlxuICAgICAgdmFyIHNpYmxpbmdOb2RlID0gbnVsbDtcbiAgICAgIGZvciAodmFyIG5vZGUgPSBjdXJzb3Iubm9kZS5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgICAgIG5vZGUgIT0gbnVsbDtcbiAgICAgICAgICAgbm9kZSA9IG5vZGUucHJldmlvdXNTaWJsaW5nKSB7XG4gICAgICAgIGlmIChUcmF2ZXJzZVV0aWwuaXNTa2lwcGVkKG5vZGUpKSB7XG4gICAgICAgICAgbm9kZXNDcm9zc2VkLnB1c2gobm9kZSk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFRyYXZlcnNlVXRpbC5pc1Zpc2libGUobm9kZSkpIHtcbiAgICAgICAgICBzaWJsaW5nTm9kZSA9IG5vZGU7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChzaWJsaW5nTm9kZSkge1xuICAgICAgICBjdXJzb3Iubm9kZSA9IHNpYmxpbmdOb2RlO1xuICAgICAgICBjdXJzb3IudGV4dCA9IFRyYXZlcnNlVXRpbC5nZXROb2RlVGV4dChzaWJsaW5nTm9kZSk7XG4gICAgICAgIGlmIChjdXJzb3IudGV4dC5sZW5ndGgpXG4gICAgICAgICAgY3Vyc29yLmluZGV4ID0gY3Vyc29yLnRleHQubGVuZ3RoO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgY3Vyc29yLmluZGV4ID0gY3Vyc29yLm5vZGUuY2hpbGROb2Rlcy5sZW5ndGg7XG4gICAgICAgIGlmIChjdXJzb3Iubm9kZS5jb25zdHJ1Y3RvciAhPSBUZXh0KVxuICAgICAgICAgIG5vZGVzQ3Jvc3NlZC5wdXNoKGN1cnNvci5ub2RlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIC8vIE90aGVyd2lzZSwgbW92ZSB0byB0aGUgcGFyZW50LlxuICAgICAgaWYgKGN1cnNvci5ub2RlLnBhcmVudE5vZGUgJiZcbiAgICAgICAgICBjdXJzb3Iubm9kZS5wYXJlbnROb2RlLmNvbnN0cnVjdG9yICE9IEhUTUxCb2R5RWxlbWVudCkge1xuICAgICAgICBjdXJzb3Iubm9kZSA9IGN1cnNvci5ub2RlLnBhcmVudE5vZGU7XG4gICAgICAgIGN1cnNvci50ZXh0ID0gbnVsbDtcbiAgICAgICAgY3Vyc29yLmluZGV4ID0gMDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBGaW5kcyB0aGUgbmV4dCBjaGFyYWN0ZXIsIHN0YXJ0aW5nIGZyb20gZW5kQ3Vyc29yLiAgVXBvbiBleGl0LCBzdGFydEN1cnNvclxuICogYW5kIGVuZEN1cnNvciB3aWxsIHN1cnJvdW5kIHRoZSBuZXh0IGNoYXJhY3Rlci4gSWYgc2tpcFdoaXRlc3BhY2UgaXNcbiAqIHRydWUsIHdpbGwgc2tpcCB1bnRpbCBhIHJlYWwgY2hhcmFjdGVyIGlzIGZvdW5kLiBPdGhlcndpc2UsIGl0IHdpbGxcbiAqIGF0dGVtcHQgdG8gc2VsZWN0IGFsbCBvZiB0aGUgd2hpdGVzcGFjZSBiZXR3ZWVuIHRoZSBpbml0aWFsIHBvc2l0aW9uXG4gKiBvZiBlbmRDdXJzb3IgYW5kIHRoZSBuZXh0IG5vbi13aGl0ZXNwYWNlIGNoYXJhY3Rlci5cbiAqIEBwYXJhbSB7Q3Vyc29yfSBzdGFydEN1cnNvciBPbiBleGl0LCBwb2ludHMgdG8gdGhlIHBvc2l0aW9uIGJlZm9yZVxuICogICAgIHRoZSBjaGFyLlxuICogQHBhcmFtIHtDdXJzb3J9IGVuZEN1cnNvciBUaGUgcG9zaXRpb24gdG8gc3RhcnQgc2VhcmNoaW5nIGZvciB0aGUgbmV4dFxuICogICAgIGNoYXIuICBPbiBleGl0LCB3aWxsIHBvaW50IHRvIHRoZSBwb3NpdGlvbiBwYXN0IHRoZSBjaGFyLlxuICogQHBhcmFtIHtBcnJheTxOb2RlPn0gbm9kZXNDcm9zc2VkIEFueSBIVE1MIG5vZGVzIGNyb3NzZWQgYmV0d2VlbiB0aGVcbiAqICAgICBpbml0aWFsIGFuZCBmaW5hbCBjdXJzb3IgcG9zaXRpb24gd2lsbCBiZSBwdXNoZWQgb250byB0aGlzIGFycmF5LlxuICogQHBhcmFtIHtib29sZWFufSBza2lwV2hpdGVzcGFjZSBJZiB0cnVlLCB3aWxsIGtlZXAgc2Nhbm5pbmcgdW50aWwgYVxuICogICAgIG5vbi13aGl0ZXNwYWNlIGNoYXJhY3RlciBpcyBmb3VuZC5cbiAqIEByZXR1cm4gez9zdHJpbmd9IFRoZSBuZXh0IGNoYXIsIG9yIG51bGwgaWYgdGhlIGJvdHRvbSBvZiB0aGVcbiAqICAgICBkb2N1bWVudCBoYXMgYmVlbiByZWFjaGVkLlxuICovXG5UcmF2ZXJzZVV0aWwuZ2V0TmV4dENoYXIgPSBmdW5jdGlvbihcbiAgICBzdGFydEN1cnNvciwgZW5kQ3Vyc29yLCBub2Rlc0Nyb3NzZWQsIHNraXBXaGl0ZXNwYWNlKSB7XG5cbiAgLy8gU2F2ZSB0aGUgc3RhcnRpbmcgcG9zaXRpb24gYW5kIGdldCB0aGUgZmlyc3QgY2hhcmFjdGVyLlxuICBzdGFydEN1cnNvci5jb3B5RnJvbShlbmRDdXJzb3IpO1xuICB2YXIgYyA9IFRyYXZlcnNlVXRpbC5mb3J3YXJkc0NoYXIoZW5kQ3Vyc29yLCBub2Rlc0Nyb3NzZWQpO1xuICBpZiAoYyA9PSBudWxsKVxuICAgIHJldHVybiBudWxsO1xuXG4gIC8vIEtlZXAgdHJhY2sgb2Ygd2hldGhlciB0aGUgZmlyc3QgY2hhcmFjdGVyIHdhcyB3aGl0ZXNwYWNlLlxuICB2YXIgaW5pdGlhbFdoaXRlc3BhY2UgPSBUcmF2ZXJzZVV0aWwuaXNXaGl0ZXNwYWNlKGMpO1xuXG4gIC8vIEtlZXAgc2Nhbm5pbmcgdW50aWwgd2UgZmluZCBhIG5vbi13aGl0ZXNwYWNlIG9yIG5vbi1za2lwcGVkIGNoYXJhY3Rlci5cbiAgd2hpbGUgKChUcmF2ZXJzZVV0aWwuaXNXaGl0ZXNwYWNlKGMpKSB8fFxuICAgICAgKFRyYXZlcnNlVXRpbC5pc1NraXBwZWQoZW5kQ3Vyc29yLm5vZGUpKSkge1xuICAgIGMgPSBUcmF2ZXJzZVV0aWwuZm9yd2FyZHNDaGFyKGVuZEN1cnNvciwgbm9kZXNDcm9zc2VkKTtcbiAgICBpZiAoYyA9PSBudWxsKVxuICAgICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgaWYgKHNraXBXaGl0ZXNwYWNlIHx8ICFpbml0aWFsV2hpdGVzcGFjZSkge1xuICAgIC8vIElmIHNraXBXaGl0ZXBhY2UgaXMgdHJ1ZSwgb3IgaWYgdGhlIGZpcnN0IGNoYXJhY3RlciB3ZSBlbmNvdW50ZXJlZFxuICAgIC8vIHdhcyBub3Qgd2hpdGVzcGFjZSwgcmV0dXJuIHRoYXQgbm9uLXdoaXRlc3BhY2UgY2hhcmFjdGVyLlxuICAgIHN0YXJ0Q3Vyc29yLmNvcHlGcm9tKGVuZEN1cnNvcik7XG4gICAgc3RhcnRDdXJzb3IuaW5kZXgtLTtcbiAgICByZXR1cm4gYztcbiAgfVxuICBlbHNlIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzQ3Jvc3NlZC5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKFRyYXZlcnNlVXRpbC5pc1NraXBwZWQobm9kZXNDcm9zc2VkW2ldKSkge1xuICAgICAgICAvLyBXZSBuZWVkIHRvIG1ha2Ugc3VyZSB0aGF0IHN0YXJ0Q3Vyc29yIGFuZCBlbmRDdXJzb3IgYXJlbid0XG4gICAgICAgIC8vIHN1cnJvdW5kaW5nIGEgc2tpcHBhYmxlIG5vZGUuXG4gICAgICAgIGVuZEN1cnNvci5pbmRleC0tO1xuICAgICAgICBzdGFydEN1cnNvci5jb3B5RnJvbShlbmRDdXJzb3IpO1xuICAgICAgICBzdGFydEN1cnNvci5pbmRleC0tO1xuICAgICAgICByZXR1cm4gJyAnO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBPdGhlcndpc2UsIHJldHVybiBhbGwgb2YgdGhlIHdoaXRlc3BhY2UgYmVmb3JlIHRoYXQgbGFzdCBjaGFyYWN0ZXIuXG4gICAgZW5kQ3Vyc29yLmluZGV4LS07XG4gICAgcmV0dXJuICcgJztcbiAgfVxufTtcblxuLyoqXG4gKiBGaW5kcyB0aGUgcHJldmlvdXMgY2hhcmFjdGVyLCBzdGFydGluZyBmcm9tIHN0YXJ0Q3Vyc29yLiAgVXBvbiBleGl0LFxuICogc3RhcnRDdXJzb3IgYW5kIGVuZEN1cnNvciB3aWxsIHN1cnJvdW5kIHRoZSBwcmV2aW91cyBjaGFyYWN0ZXIuXG4gKiBJZiBza2lwV2hpdGVzcGFjZSBpcyB0cnVlLCB3aWxsIHNraXAgdW50aWwgYSByZWFsIGNoYXJhY3RlciBpcyBmb3VuZC5cbiAqIE90aGVyd2lzZSwgaXQgd2lsbCBhdHRlbXB0IHRvIHNlbGVjdCBhbGwgb2YgdGhlIHdoaXRlc3BhY2UgYmV0d2VlblxuICogdGhlIGluaXRpYWwgcG9zaXRpb24gb2YgZW5kQ3Vyc29yIGFuZCB0aGUgbmV4dCBub24td2hpdGVzcGFjZSBjaGFyYWN0ZXIuXG4gKiBAcGFyYW0ge0N1cnNvcn0gc3RhcnRDdXJzb3IgVGhlIHBvc2l0aW9uIHRvIHN0YXJ0IHNlYXJjaGluZyBmb3IgdGhlXG4gKiAgICAgY2hhci4gT24gZXhpdCwgd2lsbCBwb2ludCB0byB0aGUgcG9zaXRpb24gYmVmb3JlIHRoZSBjaGFyLlxuICogQHBhcmFtIHtDdXJzb3J9IGVuZEN1cnNvciBUaGUgcG9zaXRpb24gdG8gc3RhcnQgc2VhcmNoaW5nIGZvciB0aGUgbmV4dFxuICogICAgIGNoYXIuIE9uIGV4aXQsIHdpbGwgcG9pbnQgdG8gdGhlIHBvc2l0aW9uIHBhc3QgdGhlIGNoYXIuXG4gKiBAcGFyYW0ge0FycmF5PE5vZGU+fSBub2Rlc0Nyb3NzZWQgQW55IEhUTUwgbm9kZXMgY3Jvc3NlZCBiZXR3ZWVuIHRoZVxuICogICAgIGluaXRpYWwgYW5kIGZpbmFsIGN1cnNvciBwb3NpdGlvbiB3aWxsIGJlIHB1c2hlZCBvbnRvIHRoaXMgYXJyYXkuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IHNraXBXaGl0ZXNwYWNlIElmIHRydWUsIHdpbGwga2VlcCBzY2FubmluZyB1bnRpbCBhXG4gKiAgICAgbm9uLXdoaXRlc3BhY2UgY2hhcmFjdGVyIGlzIGZvdW5kLlxuICogQHJldHVybiB7P3N0cmluZ30gVGhlIHByZXZpb3VzIGNoYXIsIG9yIG51bGwgaWYgdGhlIHRvcCBvZiB0aGVcbiAqICAgICBkb2N1bWVudCBoYXMgYmVlbiByZWFjaGVkLlxuICovXG5UcmF2ZXJzZVV0aWwuZ2V0UHJldmlvdXNDaGFyID0gZnVuY3Rpb24oXG4gICAgc3RhcnRDdXJzb3IsIGVuZEN1cnNvciwgbm9kZXNDcm9zc2VkLCBza2lwV2hpdGVzcGFjZSkge1xuXG4gIC8vIFNhdmUgdGhlIHN0YXJ0aW5nIHBvc2l0aW9uIGFuZCBnZXQgdGhlIGZpcnN0IGNoYXJhY3Rlci5cbiAgZW5kQ3Vyc29yLmNvcHlGcm9tKHN0YXJ0Q3Vyc29yKTtcbiAgdmFyIGMgPSBUcmF2ZXJzZVV0aWwuYmFja3dhcmRzQ2hhcihzdGFydEN1cnNvciwgbm9kZXNDcm9zc2VkKTtcbiAgaWYgKGMgPT0gbnVsbClcbiAgICByZXR1cm4gbnVsbDtcblxuICAvLyBLZWVwIHRyYWNrIG9mIHdoZXRoZXIgdGhlIGZpcnN0IGNoYXJhY3RlciB3YXMgd2hpdGVzcGFjZS5cbiAgdmFyIGluaXRpYWxXaGl0ZXNwYWNlID0gVHJhdmVyc2VVdGlsLmlzV2hpdGVzcGFjZShjKTtcblxuICAvLyBLZWVwIHNjYW5uaW5nIHVudGlsIHdlIGZpbmQgYSBub24td2hpdGVzcGFjZSBvciBub24tc2tpcHBlZCBjaGFyYWN0ZXIuXG4gIHdoaWxlICgoVHJhdmVyc2VVdGlsLmlzV2hpdGVzcGFjZShjKSkgfHxcbiAgICAgIChUcmF2ZXJzZVV0aWwuaXNTa2lwcGVkKHN0YXJ0Q3Vyc29yLm5vZGUpKSkge1xuICAgIGMgPSBUcmF2ZXJzZVV0aWwuYmFja3dhcmRzQ2hhcihzdGFydEN1cnNvciwgbm9kZXNDcm9zc2VkKTtcbiAgICBpZiAoYyA9PSBudWxsKVxuICAgICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgaWYgKHNraXBXaGl0ZXNwYWNlIHx8ICFpbml0aWFsV2hpdGVzcGFjZSkge1xuICAgIC8vIElmIHNraXBXaGl0ZXBhY2UgaXMgdHJ1ZSwgb3IgaWYgdGhlIGZpcnN0IGNoYXJhY3RlciB3ZSBlbmNvdW50ZXJlZFxuICAgIC8vIHdhcyBub3Qgd2hpdGVzcGFjZSwgcmV0dXJuIHRoYXQgbm9uLXdoaXRlc3BhY2UgY2hhcmFjdGVyLlxuICAgIGVuZEN1cnNvci5jb3B5RnJvbShzdGFydEN1cnNvcik7XG4gICAgZW5kQ3Vyc29yLmluZGV4Kys7XG4gICAgcmV0dXJuIGM7XG4gIH0gZWxzZSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlc0Nyb3NzZWQubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChUcmF2ZXJzZVV0aWwuaXNTa2lwcGVkKG5vZGVzQ3Jvc3NlZFtpXSkpIHtcbiAgICAgICAgc3RhcnRDdXJzb3IuaW5kZXgrKztcbiAgICAgICAgZW5kQ3Vyc29yLmNvcHlGcm9tKHN0YXJ0Q3Vyc29yKTtcbiAgICAgICAgZW5kQ3Vyc29yLmluZGV4Kys7XG4gICAgICAgIHJldHVybiAnICc7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIE90aGVyd2lzZSwgcmV0dXJuIGFsbCBvZiB0aGUgd2hpdGVzcGFjZSBiZWZvcmUgdGhhdCBsYXN0IGNoYXJhY3Rlci5cbiAgICBzdGFydEN1cnNvci5pbmRleCsrO1xuICAgIHJldHVybiAnICc7XG4gIH1cbn07XG5cbi8qKlxuICogRmluZHMgdGhlIG5leHQgd29yZCwgc3RhcnRpbmcgZnJvbSBlbmRDdXJzb3IuICBVcG9uIGV4aXQsIHN0YXJ0Q3Vyc29yXG4gKiBhbmQgZW5kQ3Vyc29yIHdpbGwgc3Vycm91bmQgdGhlIG5leHQgd29yZC4gIEEgd29yZCBpcyBkZWZpbmVkIHRvIGJlXG4gKiBhIHN0cmluZyBvZiAxIG9yIG1vcmUgbm9uLXdoaXRlc3BhY2UgY2hhcmFjdGVycyBpbiB0aGUgc2FtZSBET00gbm9kZS5cbiAqIEBwYXJhbSB7Q3Vyc29yfSBzdGFydEN1cnNvciBPbiBleGl0LCB3aWxsIHBvaW50IHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlXG4gKiAgICAgd29yZCByZXR1cm5lZC5cbiAqIEBwYXJhbSB7Q3Vyc29yfSBlbmRDdXJzb3IgVGhlIHBvc2l0aW9uIHRvIHN0YXJ0IHNlYXJjaGluZyBmb3IgdGhlIG5leHRcbiAqICAgICB3b3JkLiAgT24gZXhpdCwgd2lsbCBwb2ludCB0byB0aGUgZW5kIG9mIHRoZSB3b3JkIHJldHVybmVkLlxuICogQHBhcmFtIHtBcnJheTxOb2RlPn0gbm9kZXNDcm9zc2VkIEFueSBIVE1MIG5vZGVzIGNyb3NzZWQgYmV0d2VlbiB0aGVcbiAqICAgICBpbml0aWFsIGFuZCBmaW5hbCBjdXJzb3IgcG9zaXRpb24gd2lsbCBiZSBwdXNoZWQgb250byB0aGlzIGFycmF5LlxuICogQHJldHVybiB7P3N0cmluZ30gVGhlIG5leHQgd29yZCwgb3IgbnVsbCBpZiB0aGUgYm90dG9tIG9mIHRoZVxuICogICAgIGRvY3VtZW50IGhhcyBiZWVuIHJlYWNoZWQuXG4gKi9cblRyYXZlcnNlVXRpbC5nZXROZXh0V29yZCA9IGZ1bmN0aW9uKHN0YXJ0Q3Vyc29yLCBlbmRDdXJzb3IsXG4gICAgbm9kZXNDcm9zc2VkKSB7XG5cbiAgLy8gRmluZCB0aGUgZmlyc3Qgbm9uLXdoaXRlc3BhY2Ugb3Igbm9uLXNraXBwZWQgY2hhcmFjdGVyLlxuICB2YXIgY3Vyc29yID0gZW5kQ3Vyc29yLmNsb25lKCk7XG4gIHZhciBjID0gVHJhdmVyc2VVdGlsLmZvcndhcmRzQ2hhcihjdXJzb3IsIG5vZGVzQ3Jvc3NlZCk7XG4gIGlmIChjID09IG51bGwpXG4gICAgcmV0dXJuIG51bGw7XG4gIHdoaWxlICgoVHJhdmVyc2VVdGlsLmlzV2hpdGVzcGFjZShjKSkgfHxcbiAgICAgIChUcmF2ZXJzZVV0aWwuaXNTa2lwcGVkKGN1cnNvci5ub2RlKSkpIHtcbiAgICBjID0gVHJhdmVyc2VVdGlsLmZvcndhcmRzQ2hhcihjdXJzb3IsIG5vZGVzQ3Jvc3NlZCk7XG4gICAgaWYgKGMgPT0gbnVsbClcbiAgICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gU2V0IHN0YXJ0Q3Vyc29yIHRvIHRoZSBwb3NpdGlvbiBpbW1lZGlhdGVseSBiZWZvcmUgdGhlIGZpcnN0XG4gIC8vIGNoYXJhY3RlciBpbiBvdXIgd29yZC4gSXQncyBzYWZlIHRvIGRlY3JlbWVudCB8aW5kZXh8IGJlY2F1c2VcbiAgLy8gZm9yd2FyZHNDaGFyIGd1YXJhbnRlZXMgdGhhdCB0aGUgY3Vyc29yIHdpbGwgYmUgaW1tZWRpYXRlbHkgdG8gdGhlXG4gIC8vIHJpZ2h0IG9mIHRoZSByZXR1cm5lZCBjaGFyYWN0ZXIgb24gZXhpdC5cbiAgc3RhcnRDdXJzb3IuY29weUZyb20oY3Vyc29yKTtcbiAgc3RhcnRDdXJzb3IuaW5kZXgtLTtcblxuICAvLyBLZWVwIGJ1aWxkaW5nIHVwIG91ciB3b3JkIHVudGlsIHdlIHJlYWNoIGEgd2hpdGVzcGFjZSBjaGFyYWN0ZXIgb3JcbiAgLy8gd291bGQgY3Jvc3MgYSB0YWcuICBEb24ndCBhY3R1YWxseSByZXR1cm4gYW55IHRhZ3MgY3Jvc3NlZCwgYmVjYXVzZSB0aGlzXG4gIC8vIHdvcmQgZ29lcyB1cCB1bnRpbCB0aGUgdGFnIGJvdW5kYXJ5IGJ1dCBub3QgcGFzdCBpdC5cbiAgZW5kQ3Vyc29yLmNvcHlGcm9tKGN1cnNvcik7XG4gIHZhciB3b3JkID0gYztcbiAgdmFyIG5ld05vZGVzQ3Jvc3NlZCA9IFtdO1xuICBjID0gVHJhdmVyc2VVdGlsLmZvcndhcmRzQ2hhcihjdXJzb3IsIG5ld05vZGVzQ3Jvc3NlZCk7XG4gIGlmIChjID09IG51bGwpIHtcbiAgICByZXR1cm4gd29yZDtcbiAgfVxuICB3aGlsZSAoIVRyYXZlcnNlVXRpbC5pc1doaXRlc3BhY2UoYykgJiZcbiAgICAgbmV3Tm9kZXNDcm9zc2VkLmxlbmd0aCA9PSAwKSB7XG4gICAgd29yZCArPSBjO1xuICAgIGVuZEN1cnNvci5jb3B5RnJvbShjdXJzb3IpO1xuICAgIGMgPSBUcmF2ZXJzZVV0aWwuZm9yd2FyZHNDaGFyKGN1cnNvciwgbmV3Tm9kZXNDcm9zc2VkKTtcbiAgICBpZiAoYyA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gd29yZDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHdvcmQ7XG59O1xuXG4vKipcbiAqIEZpbmRzIHRoZSBwcmV2aW91cyB3b3JkLCBzdGFydGluZyBmcm9tIHN0YXJ0Q3Vyc29yLiAgVXBvbiBleGl0LCBzdGFydEN1cnNvclxuICogYW5kIGVuZEN1cnNvciB3aWxsIHN1cnJvdW5kIHRoZSBwcmV2aW91cyB3b3JkLiAgQSB3b3JkIGlzIGRlZmluZWQgdG8gYmVcbiAqIGEgc3RyaW5nIG9mIDEgb3IgbW9yZSBub24td2hpdGVzcGFjZSBjaGFyYWN0ZXJzIGluIHRoZSBzYW1lIERPTSBub2RlLlxuICogQHBhcmFtIHtDdXJzb3J9IHN0YXJ0Q3Vyc29yIFRoZSBwb3NpdGlvbiB0byBzdGFydCBzZWFyY2hpbmcgZm9yIHRoZVxuICogICAgIHByZXZpb3VzIHdvcmQuICBPbiBleGl0LCB3aWxsIHBvaW50IHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlXG4gKiAgICAgd29yZCByZXR1cm5lZC5cbiAqIEBwYXJhbSB7Q3Vyc29yfSBlbmRDdXJzb3IgT24gZXhpdCwgd2lsbCBwb2ludCB0byB0aGUgZW5kIG9mIHRoZVxuICogICAgIHdvcmQgcmV0dXJuZWQuXG4gKiBAcGFyYW0ge0FycmF5PE5vZGU+fSBub2Rlc0Nyb3NzZWQgQW55IEhUTUwgbm9kZXMgY3Jvc3NlZCBiZXR3ZWVuIHRoZVxuICogICAgIGluaXRpYWwgYW5kIGZpbmFsIGN1cnNvciBwb3NpdGlvbiB3aWxsIGJlIHB1c2hlZCBvbnRvIHRoaXMgYXJyYXkuXG4gKiBAcmV0dXJuIHs/c3RyaW5nfSBUaGUgcHJldmlvdXMgd29yZCwgb3IgbnVsbCBpZiB0aGUgYm90dG9tIG9mIHRoZVxuICogICAgIGRvY3VtZW50IGhhcyBiZWVuIHJlYWNoZWQuXG4gKi9cblRyYXZlcnNlVXRpbC5nZXRQcmV2aW91c1dvcmQgPSBmdW5jdGlvbihzdGFydEN1cnNvciwgZW5kQ3Vyc29yLFxuICAgIG5vZGVzQ3Jvc3NlZCkge1xuICAvLyBGaW5kIHRoZSBmaXJzdCBub24td2hpdGVzcGFjZSBvciBub24tc2tpcHBlZCBjaGFyYWN0ZXIuXG4gIHZhciBjdXJzb3IgPSBzdGFydEN1cnNvci5jbG9uZSgpO1xuICB2YXIgYyA9IFRyYXZlcnNlVXRpbC5iYWNrd2FyZHNDaGFyKGN1cnNvciwgbm9kZXNDcm9zc2VkKTtcbiAgaWYgKGMgPT0gbnVsbClcbiAgICByZXR1cm4gbnVsbDtcbiAgd2hpbGUgKChUcmF2ZXJzZVV0aWwuaXNXaGl0ZXNwYWNlKGMpIHx8XG4gICAgICAoVHJhdmVyc2VVdGlsLmlzU2tpcHBlZChjdXJzb3Iubm9kZSkpKSkge1xuICAgIGMgPSBUcmF2ZXJzZVV0aWwuYmFja3dhcmRzQ2hhcihjdXJzb3IsIG5vZGVzQ3Jvc3NlZCk7XG4gICAgaWYgKGMgPT0gbnVsbClcbiAgICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gU2V0IGVuZEN1cnNvciB0byB0aGUgcG9zaXRpb24gaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIGZpcnN0XG4gIC8vIGNoYXJhY3RlciB3ZSd2ZSBmb3VuZCAodGhlIGxhc3QgY2hhcmFjdGVyIG9mIHRoZSB3b3JkLCBzaW5jZSB3ZSdyZVxuICAvLyBzZWFyY2hpbmcgYmFja3dhcmRzKS5cbiAgZW5kQ3Vyc29yLmNvcHlGcm9tKGN1cnNvcik7XG4gIGVuZEN1cnNvci5pbmRleCsrO1xuXG4gIC8vIEtlZXAgYnVpbGRpbmcgdXAgb3VyIHdvcmQgdW50aWwgd2UgcmVhY2ggYSB3aGl0ZXNwYWNlIGNoYXJhY3RlciBvclxuICAvLyB3b3VsZCBjcm9zcyBhIHRhZy4gIERvbid0IGFjdHVhbGx5IHJldHVybiBhbnkgdGFncyBjcm9zc2VkLCBiZWNhdXNlIHRoaXNcbiAgLy8gd29yZCBnb2VzIHVwIHVudGlsIHRoZSB0YWcgYm91bmRhcnkgYnV0IG5vdCBwYXN0IGl0LlxuICBzdGFydEN1cnNvci5jb3B5RnJvbShjdXJzb3IpO1xuICB2YXIgd29yZCA9IGM7XG4gIHZhciBuZXdOb2Rlc0Nyb3NzZWQgPSBbXTtcbiAgYyA9IFRyYXZlcnNlVXRpbC5iYWNrd2FyZHNDaGFyKGN1cnNvciwgbmV3Tm9kZXNDcm9zc2VkKTtcbiAgaWYgKGMgPT0gbnVsbClcbiAgICByZXR1cm4gd29yZDtcbiAgd2hpbGUgKCFUcmF2ZXJzZVV0aWwuaXNXaGl0ZXNwYWNlKGMpICYmXG4gICAgICBuZXdOb2Rlc0Nyb3NzZWQubGVuZ3RoID09IDApIHtcbiAgICB3b3JkID0gYyArIHdvcmQ7XG4gICAgc3RhcnRDdXJzb3IuY29weUZyb20oY3Vyc29yKTtcbiAgICBjID0gVHJhdmVyc2VVdGlsLmJhY2t3YXJkc0NoYXIoY3Vyc29yLCBuZXdOb2Rlc0Nyb3NzZWQpO1xuICAgIGlmIChjID09IG51bGwpXG4gICAgICByZXR1cm4gd29yZDtcbiAgfVxuXG4gIHJldHVybiB3b3JkO1xufTtcblxuLyoqXG4gKiBGaW5kcyB0aGUgbmV4dCBzZW50ZW5jZSwgc3RhcnRpbmcgZnJvbSBlbmRDdXJzb3IuICBVcG9uIGV4aXQsXG4gKiBzdGFydEN1cnNvciBhbmQgZW5kQ3Vyc29yIHdpbGwgc3Vycm91bmQgdGhlIG5leHQgc2VudGVuY2UuXG4gKlxuICogQHBhcmFtIHtDdXJzb3J9IHN0YXJ0Q3Vyc29yIE9uIGV4aXQsIG1hcmtzIHRoZSBiZWdpbm5pbmcgb2YgdGhlIHNlbnRlbmNlLlxuICogQHBhcmFtIHtDdXJzb3J9IGVuZEN1cnNvciBUaGUgcG9zaXRpb24gdG8gc3RhcnQgc2VhcmNoaW5nIGZvciB0aGUgbmV4dFxuICogICAgIHNlbnRlbmNlLiAgT24gZXhpdCwgd2lsbCBwb2ludCB0byB0aGUgZW5kIG9mIHRoZSByZXR1cm5lZCBzdHJpbmcuXG4gKiBAcGFyYW0ge0FycmF5PE5vZGU+fSBub2Rlc0Nyb3NzZWQgQW55IEhUTUwgbm9kZXMgY3Jvc3NlZCBiZXR3ZWVuIHRoZVxuICogICAgIGluaXRpYWwgYW5kIGZpbmFsIGN1cnNvciBwb3NpdGlvbiB3aWxsIGJlIHB1c2hlZCBvbnRvIHRoaXMgYXJyYXkuXG4gKiBAcGFyYW0ge09iamVjdH0gYnJlYWtUYWdzIEFzc29jaWF0aXZlIGFycmF5IG9mIHRhZ3MgdGhhdCBzaG91bGQgYnJlYWtcbiAqICAgICB0aGUgc2VudGVuY2UuXG4gKiBAcmV0dXJuIHs/c3RyaW5nfSBUaGUgbmV4dCBzZW50ZW5jZSwgb3IgbnVsbCBpZiB0aGUgYm90dG9tIG9mIHRoZVxuICogICAgIGRvY3VtZW50IGhhcyBiZWVuIHJlYWNoZWQuXG4gKi9cblRyYXZlcnNlVXRpbC5nZXROZXh0U2VudGVuY2UgPSBmdW5jdGlvbihcbiAgICBzdGFydEN1cnNvciwgZW5kQ3Vyc29yLCBub2Rlc0Nyb3NzZWQsIGJyZWFrVGFncykge1xuICByZXR1cm4gVHJhdmVyc2VVdGlsLmdldE5leHRTdHJpbmcoXG4gICAgICBzdGFydEN1cnNvciwgZW5kQ3Vyc29yLCBub2Rlc0Nyb3NzZWQsXG4gICAgICBmdW5jdGlvbihzdHIsIHdvcmQsIG5vZGVzKSB7XG4gICAgICAgIGlmIChzdHIuc3Vic3RyKC0xKSA9PSAnLicpXG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAoVHJhdmVyc2VVdGlsLmlzU2tpcHBlZChub2Rlc1tpXSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgc3R5bGUgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShub2Rlc1tpXSwgbnVsbCk7XG4gICAgICAgICAgaWYgKHN0eWxlICYmIChzdHlsZS5kaXNwbGF5ICE9ICdpbmxpbmUnIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVha1RhZ3Nbbm9kZXNbaV0udGFnTmFtZV0pKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSk7XG59O1xuXG4vKipcbiAqIEZpbmRzIHRoZSBwcmV2aW91cyBzZW50ZW5jZSwgc3RhcnRpbmcgZnJvbSBzdGFydEN1cnNvci4gIFVwb24gZXhpdCxcbiAqIHN0YXJ0Q3Vyc29yIGFuZCBlbmRDdXJzb3Igd2lsbCBzdXJyb3VuZCB0aGUgcHJldmlvdXMgc2VudGVuY2UuXG4gKlxuICogQHBhcmFtIHtDdXJzb3J9IHN0YXJ0Q3Vyc29yIFRoZSBwb3NpdGlvbiB0byBzdGFydCBzZWFyY2hpbmcgZm9yIHRoZSBuZXh0XG4gKiAgICAgc2VudGVuY2UuICBPbiBleGl0LCB3aWxsIHBvaW50IHRvIHRoZSBzdGFydCBvZiB0aGUgcmV0dXJuZWQgc3RyaW5nLlxuICogQHBhcmFtIHtDdXJzb3J9IGVuZEN1cnNvciBPbiBleGl0LCB0aGUgZW5kIG9mIHRoZSByZXR1cm5lZCBzdHJpbmcuXG4gKiBAcGFyYW0ge0FycmF5PE5vZGU+fSBub2Rlc0Nyb3NzZWQgQW55IEhUTUwgbm9kZXMgY3Jvc3NlZCBiZXR3ZWVuIHRoZVxuICogICAgIGluaXRpYWwgYW5kIGZpbmFsIGN1cnNvciBwb3NpdGlvbiB3aWxsIGJlIHB1c2hlZCBvbnRvIHRoaXMgYXJyYXkuXG4gKiBAcGFyYW0ge09iamVjdH0gYnJlYWtUYWdzIEFzc29jaWF0aXZlIGFycmF5IG9mIHRhZ3MgdGhhdCBzaG91bGQgYnJlYWtcbiAqICAgICB0aGUgc2VudGVuY2UuXG4gKiBAcmV0dXJuIHs/c3RyaW5nfSBUaGUgcHJldmlvdXMgc2VudGVuY2UsIG9yIG51bGwgaWYgdGhlIGJvdHRvbSBvZiB0aGVcbiAqICAgICBkb2N1bWVudCBoYXMgYmVlbiByZWFjaGVkLlxuICovXG5UcmF2ZXJzZVV0aWwuZ2V0UHJldmlvdXNTZW50ZW5jZSA9IGZ1bmN0aW9uKFxuICAgIHN0YXJ0Q3Vyc29yLCBlbmRDdXJzb3IsIG5vZGVzQ3Jvc3NlZCwgYnJlYWtUYWdzKSB7XG4gIHJldHVybiBUcmF2ZXJzZVV0aWwuZ2V0UHJldmlvdXNTdHJpbmcoXG4gICAgICBzdGFydEN1cnNvciwgZW5kQ3Vyc29yLCBub2Rlc0Nyb3NzZWQsXG4gICAgICBmdW5jdGlvbihzdHIsIHdvcmQsIG5vZGVzKSB7XG4gICAgICAgIGlmICh3b3JkLnN1YnN0cigtMSkgPT0gJy4nKVxuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKFRyYXZlcnNlVXRpbC5pc1NraXBwZWQobm9kZXNbaV0pKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHN0eWxlID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUobm9kZXNbaV0sIG51bGwpO1xuICAgICAgICAgIGlmIChzdHlsZSAmJiAoc3R5bGUuZGlzcGxheSAhPSAnaW5saW5lJyB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWtUYWdzW25vZGVzW2ldLnRhZ05hbWVdKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0pO1xufTtcblxuLyoqXG4gKiBGaW5kcyB0aGUgbmV4dCBsaW5lLCBzdGFydGluZyBmcm9tIGVuZEN1cnNvci4gIFVwb24gZXhpdCxcbiAqIHN0YXJ0Q3Vyc29yIGFuZCBlbmRDdXJzb3Igd2lsbCBzdXJyb3VuZCB0aGUgbmV4dCBsaW5lLlxuICpcbiAqIEBwYXJhbSB7Q3Vyc29yfSBzdGFydEN1cnNvciBPbiBleGl0LCBtYXJrcyB0aGUgYmVnaW5uaW5nIG9mIHRoZSBsaW5lLlxuICogQHBhcmFtIHtDdXJzb3J9IGVuZEN1cnNvciBUaGUgcG9zaXRpb24gdG8gc3RhcnQgc2VhcmNoaW5nIGZvciB0aGUgbmV4dFxuICogICAgIGxpbmUuICBPbiBleGl0LCB3aWxsIHBvaW50IHRvIHRoZSBlbmQgb2YgdGhlIHJldHVybmVkIHN0cmluZy5cbiAqIEBwYXJhbSB7QXJyYXk8Tm9kZT59IG5vZGVzQ3Jvc3NlZCBBbnkgSFRNTCBub2RlcyBjcm9zc2VkIGJldHdlZW4gdGhlXG4gKiAgICAgaW5pdGlhbCBhbmQgZmluYWwgY3Vyc29yIHBvc2l0aW9uIHdpbGwgYmUgcHVzaGVkIG9udG8gdGhpcyBhcnJheS5cbiAqIEBwYXJhbSB7bnVtYmVyfSBsaW5lTGVuZ3RoIFRoZSBtYXhpbXVtIG51bWJlciBvZiBjaGFyYWN0ZXJzIGluIGEgbGluZS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBicmVha1RhZ3MgQXNzb2NpYXRpdmUgYXJyYXkgb2YgdGFncyB0aGF0IHNob3VsZCBicmVha1xuICogICAgIHRoZSBsaW5lLlxuICogQHJldHVybiB7P3N0cmluZ30gVGhlIG5leHQgbGluZSwgb3IgbnVsbCBpZiB0aGUgYm90dG9tIG9mIHRoZVxuICogICAgIGRvY3VtZW50IGhhcyBiZWVuIHJlYWNoZWQuXG4gKi9cblRyYXZlcnNlVXRpbC5nZXROZXh0TGluZSA9IGZ1bmN0aW9uKFxuICAgIHN0YXJ0Q3Vyc29yLCBlbmRDdXJzb3IsIG5vZGVzQ3Jvc3NlZCwgbGluZUxlbmd0aCwgYnJlYWtUYWdzKSB7XG4gIHJldHVybiBUcmF2ZXJzZVV0aWwuZ2V0TmV4dFN0cmluZyhcbiAgICAgIHN0YXJ0Q3Vyc29yLCBlbmRDdXJzb3IsIG5vZGVzQ3Jvc3NlZCxcbiAgICAgIGZ1bmN0aW9uKHN0ciwgd29yZCwgbm9kZXMpIHtcbiAgICAgICAgaWYgKHN0ci5sZW5ndGggKyB3b3JkLmxlbmd0aCArIDEgPiBsaW5lTGVuZ3RoKVxuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKFRyYXZlcnNlVXRpbC5pc1NraXBwZWQobm9kZXNbaV0pKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHN0eWxlID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUobm9kZXNbaV0sIG51bGwpO1xuICAgICAgICAgIGlmIChzdHlsZSAmJiAoc3R5bGUuZGlzcGxheSAhPSAnaW5saW5lJyB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWtUYWdzW25vZGVzW2ldLnRhZ05hbWVdKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0pO1xufTtcblxuLyoqXG4gKiBGaW5kcyB0aGUgcHJldmlvdXMgbGluZSwgc3RhcnRpbmcgZnJvbSBzdGFydEN1cnNvci4gIFVwb24gZXhpdCxcbiAqIHN0YXJ0Q3Vyc29yIGFuZCBlbmRDdXJzb3Igd2lsbCBzdXJyb3VuZCB0aGUgcHJldmlvdXMgbGluZS5cbiAqXG4gKiBAcGFyYW0ge0N1cnNvcn0gc3RhcnRDdXJzb3IgVGhlIHBvc2l0aW9uIHRvIHN0YXJ0IHNlYXJjaGluZyBmb3IgdGhlIG5leHRcbiAqICAgICBsaW5lLiAgT24gZXhpdCwgd2lsbCBwb2ludCB0byB0aGUgc3RhcnQgb2YgdGhlIHJldHVybmVkIHN0cmluZy5cbiAqIEBwYXJhbSB7Q3Vyc29yfSBlbmRDdXJzb3IgT24gZXhpdCwgdGhlIGVuZCBvZiB0aGUgcmV0dXJuZWQgc3RyaW5nLlxuICogQHBhcmFtIHtBcnJheTxOb2RlPn0gbm9kZXNDcm9zc2VkIEFueSBIVE1MIG5vZGVzIGNyb3NzZWQgYmV0d2VlbiB0aGVcbiAqICAgICBpbml0aWFsIGFuZCBmaW5hbCBjdXJzb3IgcG9zaXRpb24gd2lsbCBiZSBwdXNoZWQgb250byB0aGlzIGFycmF5LlxuICogQHBhcmFtIHtudW1iZXJ9IGxpbmVMZW5ndGggVGhlIG1heGltdW0gbnVtYmVyIG9mIGNoYXJhY3RlcnMgaW4gYSBsaW5lLlxuICogQHBhcmFtIHtPYmplY3R9IGJyZWFrVGFncyBBc3NvY2lhdGl2ZSBhcnJheSBvZiB0YWdzIHRoYXQgc2hvdWxkIGJyZWFrXG4gKiAgICAgdGhlIHNlbnRlbmNlLlxuICogIEByZXR1cm4gez9zdHJpbmd9IFRoZSBwcmV2aW91cyBsaW5lLCBvciBudWxsIGlmIHRoZSBib3R0b20gb2YgdGhlXG4gKiAgICAgZG9jdW1lbnQgaGFzIGJlZW4gcmVhY2hlZC5cbiAqL1xuVHJhdmVyc2VVdGlsLmdldFByZXZpb3VzTGluZSA9IGZ1bmN0aW9uKFxuICAgIHN0YXJ0Q3Vyc29yLCBlbmRDdXJzb3IsIG5vZGVzQ3Jvc3NlZCwgbGluZUxlbmd0aCwgYnJlYWtUYWdzKSB7XG4gIHJldHVybiBUcmF2ZXJzZVV0aWwuZ2V0UHJldmlvdXNTdHJpbmcoXG4gICAgICBzdGFydEN1cnNvciwgZW5kQ3Vyc29yLCBub2Rlc0Nyb3NzZWQsXG4gICAgICBmdW5jdGlvbihzdHIsIHdvcmQsIG5vZGVzKSB7XG4gICAgICAgIGlmIChzdHIubGVuZ3RoICsgd29yZC5sZW5ndGggKyAxID4gbGluZUxlbmd0aClcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChUcmF2ZXJzZVV0aWwuaXNTa2lwcGVkKG5vZGVzW2ldKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBzdHlsZSA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKG5vZGVzW2ldLCBudWxsKTtcbiAgICAgICAgICBpZiAoc3R5bGUgJiYgKHN0eWxlLmRpc3BsYXkgIT0gJ2lubGluZScgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrVGFnc1tub2Rlc1tpXS50YWdOYW1lXSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9KTtcbn07XG5cbi8qKlxuICogRmluZHMgdGhlIG5leHQgcGFyYWdyYXBoLCBzdGFydGluZyBmcm9tIGVuZEN1cnNvci4gIFVwb24gZXhpdCxcbiAqIHN0YXJ0Q3Vyc29yIGFuZCBlbmRDdXJzb3Igd2lsbCBzdXJyb3VuZCB0aGUgbmV4dCBwYXJhZ3JhcGguXG4gKlxuICogQHBhcmFtIHtDdXJzb3J9IHN0YXJ0Q3Vyc29yIE9uIGV4aXQsIG1hcmtzIHRoZSBiZWdpbm5pbmcgb2YgdGhlIHBhcmFncmFwaC5cbiAqIEBwYXJhbSB7Q3Vyc29yfSBlbmRDdXJzb3IgVGhlIHBvc2l0aW9uIHRvIHN0YXJ0IHNlYXJjaGluZyBmb3IgdGhlIG5leHRcbiAqICAgICBwYXJhZ3JhcGguICBPbiBleGl0LCB3aWxsIHBvaW50IHRvIHRoZSBlbmQgb2YgdGhlIHJldHVybmVkIHN0cmluZy5cbiAqIEBwYXJhbSB7QXJyYXk8Tm9kZT59IG5vZGVzQ3Jvc3NlZCBBbnkgSFRNTCBub2RlcyBjcm9zc2VkIGJldHdlZW4gdGhlXG4gKiAgICAgaW5pdGlhbCBhbmQgZmluYWwgY3Vyc29yIHBvc2l0aW9uIHdpbGwgYmUgcHVzaGVkIG9udG8gdGhpcyBhcnJheS5cbiAqIEByZXR1cm4gez9zdHJpbmd9IFRoZSBuZXh0IHBhcmFncmFwaCwgb3IgbnVsbCBpZiB0aGUgYm90dG9tIG9mIHRoZVxuICogICAgIGRvY3VtZW50IGhhcyBiZWVuIHJlYWNoZWQuXG4gKi9cblRyYXZlcnNlVXRpbC5nZXROZXh0UGFyYWdyYXBoID0gZnVuY3Rpb24oc3RhcnRDdXJzb3IsIGVuZEN1cnNvcixcbiAgICBub2Rlc0Nyb3NzZWQpIHtcbiAgcmV0dXJuIFRyYXZlcnNlVXRpbC5nZXROZXh0U3RyaW5nKFxuICAgICAgc3RhcnRDdXJzb3IsIGVuZEN1cnNvciwgbm9kZXNDcm9zc2VkLFxuICAgICAgZnVuY3Rpb24oc3RyLCB3b3JkLCBub2Rlcykge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKFRyYXZlcnNlVXRpbC5pc1NraXBwZWQobm9kZXNbaV0pKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHN0eWxlID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUobm9kZXNbaV0sIG51bGwpO1xuICAgICAgICAgIGlmIChzdHlsZSAmJiBzdHlsZS5kaXNwbGF5ICE9ICdpbmxpbmUnKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSk7XG59O1xuXG4vKipcbiAqIEZpbmRzIHRoZSBwcmV2aW91cyBwYXJhZ3JhcGgsIHN0YXJ0aW5nIGZyb20gc3RhcnRDdXJzb3IuICBVcG9uIGV4aXQsXG4gKiBzdGFydEN1cnNvciBhbmQgZW5kQ3Vyc29yIHdpbGwgc3Vycm91bmQgdGhlIHByZXZpb3VzIHBhcmFncmFwaC5cbiAqXG4gKiBAcGFyYW0ge0N1cnNvcn0gc3RhcnRDdXJzb3IgVGhlIHBvc2l0aW9uIHRvIHN0YXJ0IHNlYXJjaGluZyBmb3IgdGhlIG5leHRcbiAqICAgICBwYXJhZ3JhcGguICBPbiBleGl0LCB3aWxsIHBvaW50IHRvIHRoZSBzdGFydCBvZiB0aGUgcmV0dXJuZWQgc3RyaW5nLlxuICogQHBhcmFtIHtDdXJzb3J9IGVuZEN1cnNvciBPbiBleGl0LCB0aGUgZW5kIG9mIHRoZSByZXR1cm5lZCBzdHJpbmcuXG4gKiBAcGFyYW0ge0FycmF5PE5vZGU+fSBub2Rlc0Nyb3NzZWQgQW55IEhUTUwgbm9kZXMgY3Jvc3NlZCBiZXR3ZWVuIHRoZVxuICogICAgIGluaXRpYWwgYW5kIGZpbmFsIGN1cnNvciBwb3NpdGlvbiB3aWxsIGJlIHB1c2hlZCBvbnRvIHRoaXMgYXJyYXkuXG4gKiBAcmV0dXJuIHs/c3RyaW5nfSBUaGUgcHJldmlvdXMgcGFyYWdyYXBoLCBvciBudWxsIGlmIHRoZSBib3R0b20gb2YgdGhlXG4gKiAgICAgZG9jdW1lbnQgaGFzIGJlZW4gcmVhY2hlZC5cbiAqL1xuVHJhdmVyc2VVdGlsLmdldFByZXZpb3VzUGFyYWdyYXBoID0gZnVuY3Rpb24oXG4gICAgc3RhcnRDdXJzb3IsIGVuZEN1cnNvciwgbm9kZXNDcm9zc2VkKSB7XG4gIHJldHVybiBUcmF2ZXJzZVV0aWwuZ2V0UHJldmlvdXNTdHJpbmcoXG4gICAgICBzdGFydEN1cnNvciwgZW5kQ3Vyc29yLCBub2Rlc0Nyb3NzZWQsXG4gICAgICBmdW5jdGlvbihzdHIsIHdvcmQsIG5vZGVzKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAoVHJhdmVyc2VVdGlsLmlzU2tpcHBlZChub2Rlc1tpXSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgc3R5bGUgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShub2Rlc1tpXSwgbnVsbCk7XG4gICAgICAgICAgaWYgKHN0eWxlICYmIHN0eWxlLmRpc3BsYXkgIT0gJ2lubGluZScpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9KTtcbn07XG5cbi8qKlxuICogQ3VzdG9taXphYmxlIGZ1bmN0aW9uIHRvIHJldHVybiB0aGUgbmV4dCBzdHJpbmcgb2Ygd29yZHMgaW4gdGhlIERPTSwgYmFzZWRcbiAqIG9uIHByb3ZpZGVkIGZ1bmN0aW9ucyB0byBkZWNpZGUgd2hlbiB0byBicmVhayBvbmUgc3RyaW5nIGFuZCBzdGFydFxuICogdGhlIG5leHQuIFRoaXMgY2FuIGJlIHVzZWQgdG8gZ2V0IHRoZSBuZXh0IHNlbnRlbmNlLCBsaW5lLCBwYXJhZ3JhcGgsXG4gKiBvciBwb3RlbnRpYWxseSBvdGhlciBncmFudWxhcml0aWVzLlxuICpcbiAqIEZpbmRzIHRoZSBuZXh0IGNvbnRpZ3VvdXMgc3RyaW5nLCBzdGFydGluZyBmcm9tIGVuZEN1cnNvci4gIFVwb24gZXhpdCxcbiAqIHN0YXJ0Q3Vyc29yIGFuZCBlbmRDdXJzb3Igd2lsbCBzdXJyb3VuZCB0aGUgbmV4dCBzdHJpbmcuXG4gKlxuICogVGhlIGJyZWFrQmVmb3JlIGZ1bmN0aW9uIHRha2VzIHRocmVlIHBhcmFtZXRlcnMsIGFuZFxuICogc2hvdWxkIHJldHVybiB0cnVlIGlmIHRoZSBzdHJpbmcgc2hvdWxkIGJlIGJyb2tlbiBiZWZvcmUgdGhlIHByb3Bvc2VkXG4gKiBuZXh0IHdvcmQ6XG4gKiAgIHN0ciBUaGUgc3RyaW5nIHNvIGZhci5cbiAqICAgd29yZCBUaGUgbmV4dCB3b3JkIHRvIGJlIGFkZGVkLlxuICogICBub2Rlc0Nyb3NzZWQgVGhlIG5vZGVzIGNyb3NzZWQgaW4gcmVhY2hpbmcgdGhpcyBuZXh0IHdvcmQuXG4gKlxuICogQHBhcmFtIHtDdXJzb3J9IHN0YXJ0Q3Vyc29yIE9uIGV4aXQsIHdpbGwgcG9pbnQgdG8gdGhlIGJlZ2lubmluZyBvZiB0aGVcbiAqICAgICBuZXh0IHN0cmluZy5cbiAqIEBwYXJhbSB7Q3Vyc29yfSBlbmRDdXJzb3IgVGhlIHBvc2l0aW9uIHRvIHN0YXJ0IHNlYXJjaGluZyBmb3IgdGhlIG5leHRcbiAqICAgICBzdHJpbmcuICBPbiBleGl0LCB3aWxsIHBvaW50IHRvIHRoZSBlbmQgb2YgdGhlIHJldHVybmVkIHN0cmluZy5cbiAqIEBwYXJhbSB7QXJyYXk8Tm9kZT59IG5vZGVzQ3Jvc3NlZCBBbnkgSFRNTCBub2RlcyBjcm9zc2VkIGJldHdlZW4gdGhlXG4gKiAgICAgaW5pdGlhbCBhbmQgZmluYWwgY3Vyc29yIHBvc2l0aW9uIHdpbGwgYmUgcHVzaGVkIG9udG8gdGhpcyBhcnJheS5cbiAqIEBwYXJhbSB7ZnVuY3Rpb24oc3RyaW5nLCBzdHJpbmcsIEFycmF5PHN0cmluZz4pfSBicmVha0JlZm9yZVxuICogICAgIEZ1bmN0aW9uIHRoYXQgdGFrZXMgdGhlIHN0cmluZyBzbyBmYXIsIG5leHQgd29yZCB0byBiZSBhZGRlZCwgYW5kXG4gKiAgICAgbm9kZXMgY3Jvc3NlZCwgYW5kIHJldHVybnMgdHJ1ZSBpZiB0aGUgc3RyaW5nIHNob3VsZCBiZSBlbmRlZCBiZWZvcmVcbiAqICAgICBhZGRpbmcgdGhpcyB3b3JkLlxuICogQHJldHVybiB7P3N0cmluZ30gVGhlIG5leHQgc3RyaW5nLCBvciBudWxsIGlmIHRoZSBib3R0b20gb2YgdGhlXG4gKiAgICAgZG9jdW1lbnQgaGFzIGJlZW4gcmVhY2hlZC5cbiAqL1xuVHJhdmVyc2VVdGlsLmdldE5leHRTdHJpbmcgPSBmdW5jdGlvbihcbiAgICBzdGFydEN1cnNvciwgZW5kQ3Vyc29yLCBub2Rlc0Nyb3NzZWQsIGJyZWFrQmVmb3JlKSB7XG4gIC8vIEdldCB0aGUgZmlyc3Qgd29yZCBhbmQgc2V0IHRoZSBzdGFydCBjdXJzb3IgdG8gdGhlIHN0YXJ0IG9mIHRoZVxuICAvLyBmaXJzdCB3b3JkLlxuICB2YXIgd29yZFN0YXJ0Q3Vyc29yID0gZW5kQ3Vyc29yLmNsb25lKCk7XG4gIHZhciB3b3JkRW5kQ3Vyc29yID0gZW5kQ3Vyc29yLmNsb25lKCk7XG4gIHZhciBuZXdOb2Rlc0Nyb3NzZWQgPSBbXTtcbiAgdmFyIHN0ciA9ICcnO1xuICB2YXIgd29yZCA9IFRyYXZlcnNlVXRpbC5nZXROZXh0V29yZChcbiAgICAgIHdvcmRTdGFydEN1cnNvciwgd29yZEVuZEN1cnNvciwgbmV3Tm9kZXNDcm9zc2VkKTtcbiAgaWYgKHdvcmQgPT0gbnVsbClcbiAgICByZXR1cm4gbnVsbDtcbiAgc3RhcnRDdXJzb3IuY29weUZyb20od29yZFN0YXJ0Q3Vyc29yKTtcblxuICAvLyBBbHdheXMgYWRkIHRoZSBmaXJzdCB3b3JkIHdoZW4gdGhlIHN0cmluZyBpcyBlbXB0eSwgYW5kIHRoZW4ga2VlcFxuICAvLyBhZGRpbmcgbW9yZSB3b3JkcyBhcyBsb25nIGFzIGJyZWFrQmVmb3JlIHJldHVybnMgZmFsc2VcbiAgd2hpbGUgKCFzdHIgfHwgIWJyZWFrQmVmb3JlKHN0ciwgd29yZCwgbmV3Tm9kZXNDcm9zc2VkKSkge1xuICAgIC8vIEFwcGVuZCB0aGlzIHdvcmQsIHNldCB0aGUgZW5kIGN1cnNvciB0byB0aGUgZW5kIG9mIHRoaXMgd29yZCwgYW5kXG4gICAgLy8gdXBkYXRlIHRoZSByZXR1cm5lZCBsaXN0IG9mIG5vZGVzIGNyb3NzZWQgdG8gaW5jbHVkZSBvbmVzIHdlIGNyb3NzZWRcbiAgICAvLyBpbiByZWFjaGluZyB0aGlzIHdvcmQuXG4gICAgaWYgKHN0cilcbiAgICAgIHN0ciArPSAnICc7XG4gICAgc3RyICs9IHdvcmQ7XG4gICAgbm9kZXNDcm9zc2VkID0gbm9kZXNDcm9zc2VkLmNvbmNhdChuZXdOb2Rlc0Nyb3NzZWQpO1xuICAgIGVuZEN1cnNvci5jb3B5RnJvbSh3b3JkRW5kQ3Vyc29yKTtcblxuICAgIC8vIEdldCB0aGUgbmV4dCB3b3JkIGFuZCBnbyBiYWNrIHRvIHRoZSB0b3Agb2YgdGhlIGxvb3AuXG4gICAgbmV3Tm9kZXNDcm9zc2VkID0gW107XG4gICAgd29yZCA9IFRyYXZlcnNlVXRpbC5nZXROZXh0V29yZChcbiAgICAgICAgd29yZFN0YXJ0Q3Vyc29yLCB3b3JkRW5kQ3Vyc29yLCBuZXdOb2Rlc0Nyb3NzZWQpO1xuICAgIGlmICh3b3JkID09IG51bGwpXG4gICAgICByZXR1cm4gc3RyO1xuICB9XG5cbiAgcmV0dXJuIHN0cjtcbn07XG5cbi8qKlxuICogQ3VzdG9taXphYmxlIGZ1bmN0aW9uIHRvIHJldHVybiB0aGUgcHJldmlvdXMgc3RyaW5nIG9mIHdvcmRzIGluIHRoZSBET00sXG4gKiBiYXNlZCBvbiBwcm92aWRlZCBmdW5jdGlvbnMgdG8gZGVjaWRlIHdoZW4gdG8gYnJlYWsgb25lIHN0cmluZyBhbmQgc3RhcnRcbiAqIHRoZSBuZXh0LiBTZWUgZ2V0TmV4dFN0cmluZywgYWJvdmUsIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogRmluZHMgdGhlIHByZXZpb3VzIGNvbnRpZ3VvdXMgc3RyaW5nLCBzdGFydGluZyBmcm9tIHN0YXJ0Q3Vyc29yLiAgVXBvbiBleGl0LFxuICogc3RhcnRDdXJzb3IgYW5kIGVuZEN1cnNvciB3aWxsIHN1cnJvdW5kIHRoZSBuZXh0IHN0cmluZy5cbiAqXG4gKiBAcGFyYW0ge0N1cnNvcn0gc3RhcnRDdXJzb3IgVGhlIHBvc2l0aW9uIHRvIHN0YXJ0IHNlYXJjaGluZyBmb3IgdGhlXG4gKiAgICAgcHJldmlvdXMgc3RyaW5nLiAgT24gZXhpdCwgd2lsbCBwb2ludCB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZVxuICogICAgIHN0cmluZyByZXR1cm5lZC5cbiAqIEBwYXJhbSB7Q3Vyc29yfSBlbmRDdXJzb3IgT24gZXhpdCwgd2lsbCBwb2ludCB0byB0aGUgZW5kIG9mIHRoZVxuICogICAgIHN0cmluZyByZXR1cm5lZC5cbiAqIEBwYXJhbSB7QXJyYXk8Tm9kZT59IG5vZGVzQ3Jvc3NlZCBBbnkgSFRNTCBub2RlcyBjcm9zc2VkIGJldHdlZW4gdGhlXG4gKiAgICAgaW5pdGlhbCBhbmQgZmluYWwgY3Vyc29yIHBvc2l0aW9uIHdpbGwgYmUgcHVzaGVkIG9udG8gdGhpcyBhcnJheS5cbiAqIEBwYXJhbSB7ZnVuY3Rpb24oc3RyaW5nLCBzdHJpbmcsIEFycmF5PHN0cmluZz4pfSBicmVha0JlZm9yZVxuICogICAgIEZ1bmN0aW9uIHRoYXQgdGFrZXMgdGhlIHN0cmluZyBzbyBmYXIsIHRoZSB3b3JkIHRvIGJlIGFkZGVkLCBhbmRcbiAqICAgICBub2RlcyBjcm9zc2VkLCBhbmQgcmV0dXJucyB0cnVlIGlmIHRoZSBzdHJpbmcgc2hvdWxkIGJlIGVuZGVkIGJlZm9yZVxuICogICAgIGFkZGluZyB0aGlzIHdvcmQuXG4gKiBAcmV0dXJuIHs/c3RyaW5nfSBUaGUgbmV4dCBzdHJpbmcsIG9yIG51bGwgaWYgdGhlIHRvcCBvZiB0aGVcbiAqICAgICBkb2N1bWVudCBoYXMgYmVlbiByZWFjaGVkLlxuICovXG5UcmF2ZXJzZVV0aWwuZ2V0UHJldmlvdXNTdHJpbmcgPSBmdW5jdGlvbihcbiAgICBzdGFydEN1cnNvciwgZW5kQ3Vyc29yLCBub2Rlc0Nyb3NzZWQsIGJyZWFrQmVmb3JlKSB7XG4gIC8vIEdldCB0aGUgZmlyc3Qgd29yZCBhbmQgc2V0IHRoZSBlbmQgY3Vyc29yIHRvIHRoZSBlbmQgb2YgdGhlXG4gIC8vIGZpcnN0IHdvcmQuXG4gIHZhciB3b3JkU3RhcnRDdXJzb3IgPSBzdGFydEN1cnNvci5jbG9uZSgpO1xuICB2YXIgd29yZEVuZEN1cnNvciA9IHN0YXJ0Q3Vyc29yLmNsb25lKCk7XG4gIHZhciBuZXdOb2Rlc0Nyb3NzZWQgPSBbXTtcbiAgdmFyIHN0ciA9ICcnO1xuICB2YXIgd29yZCA9IFRyYXZlcnNlVXRpbC5nZXRQcmV2aW91c1dvcmQoXG4gICAgICB3b3JkU3RhcnRDdXJzb3IsIHdvcmRFbmRDdXJzb3IsIG5ld05vZGVzQ3Jvc3NlZCk7XG4gIGlmICh3b3JkID09IG51bGwpXG4gICAgcmV0dXJuIG51bGw7XG4gIGVuZEN1cnNvci5jb3B5RnJvbSh3b3JkRW5kQ3Vyc29yKTtcblxuICAvLyBBbHdheXMgYWRkIHRoZSBmaXJzdCB3b3JkIHdoZW4gdGhlIHN0cmluZyBpcyBlbXB0eSwgYW5kIHRoZW4ga2VlcFxuICAvLyBhZGRpbmcgbW9yZSB3b3JkcyBhcyBsb25nIGFzIGJyZWFrQmVmb3JlIHJldHVybnMgZmFsc2VcbiAgd2hpbGUgKCFzdHIgfHwgIWJyZWFrQmVmb3JlKHN0ciwgd29yZCwgbmV3Tm9kZXNDcm9zc2VkKSkge1xuICAgIC8vIFByZXBlbmQgdGhpcyB3b3JkLCBzZXQgdGhlIHN0YXJ0IGN1cnNvciB0byB0aGUgc3RhcnQgb2YgdGhpcyB3b3JkLCBhbmRcbiAgICAvLyB1cGRhdGUgdGhlIHJldHVybmVkIGxpc3Qgb2Ygbm9kZXMgY3Jvc3NlZCB0byBpbmNsdWRlIG9uZXMgd2UgY3Jvc3NlZFxuICAgIC8vIGluIHJlYWNoaW5nIHRoaXMgd29yZC5cbiAgICBpZiAoc3RyKVxuICAgICAgc3RyID0gJyAnICsgc3RyO1xuICAgIHN0ciA9IHdvcmQgKyBzdHI7XG4gICAgbm9kZXNDcm9zc2VkID0gbm9kZXNDcm9zc2VkLmNvbmNhdChuZXdOb2Rlc0Nyb3NzZWQpO1xuICAgIHN0YXJ0Q3Vyc29yLmNvcHlGcm9tKHdvcmRTdGFydEN1cnNvcik7XG4gICAgLy8gR2V0IHRoZSBwcmV2aW91cyB3b3JkIGFuZCBnbyBiYWNrIHRvIHRoZSB0b3Agb2YgdGhlIGxvb3AuXG4gICAgbmV3Tm9kZXNDcm9zc2VkID0gW107XG4gICAgd29yZCA9IFRyYXZlcnNlVXRpbC5nZXRQcmV2aW91c1dvcmQoXG4gICAgICAgIHdvcmRTdGFydEN1cnNvciwgd29yZEVuZEN1cnNvciwgbmV3Tm9kZXNDcm9zc2VkKTtcbiAgICBpZiAod29yZCA9PSBudWxsKVxuICAgICAgcmV0dXJuIHN0cjtcbiAgfVxuXG4gIHJldHVybiBzdHI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5DdXJzb3IgPSBDdXJzb3I7XG5tb2R1bGUuZXhwb3J0cy5UcmF2ZXJzZVV0aWwgPSBUcmF2ZXJzZVV0aWw7XG5cbn0pLmNhbGwodGhpcyk7XG4iLCIoZnVuY3Rpb24oKSB7XG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICd1c2Ugc3RyaWN0JztcbiAgdmFyIGRlYnVnLCBkZWZhdWx0cywgZnJlZXplLCBpc2EsIGxvZywgcmVmLCB0eXBlcywgdmFsaWRhdGUsIHZhbGlkYXRlX29wdGlvbmFsLCDCtSxcbiAgICBib3VuZE1ldGhvZENoZWNrID0gZnVuY3Rpb24oaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBFcnJvcignQm91bmQgaW5zdGFuY2UgbWV0aG9kIGFjY2Vzc2VkIGJlZm9yZSBiaW5kaW5nJyk7IH0gfTtcblxuICDCtSA9IHJlcXVpcmUoJy4vbWFpbicpO1xuXG4gIGxvZyA9IGNvbnNvbGUubG9nO1xuXG4gIGRlYnVnID0gY29uc29sZS5kZWJ1ZztcblxuICBmcmVlemUgPSBPYmplY3QuZnJlZXplO1xuXG4gICh7dHlwZXMsIGlzYSwgdmFsaWRhdGUsIHZhbGlkYXRlX29wdGlvbmFsfSA9IHJlcXVpcmUoJy4vdHlwZXMnKSk7XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBkZWZhdWx0cyA9IHtcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIGxhdGNoOiB7XG4gICAgICBkdDogMzUwIC8vIHRpbWUgaW4gbWlsbGlzZWNvbmRzIGJldHdlZW4gZmlyc3QgYW5kIGxhc3Qga2V5IGV2ZW50IHRvIHRyaWdnZXIgbGF0Y2hpbmdcbiAgICB9LFxuICAgIFxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAga2JsaWtlX2V2ZW50bmFtZXM6IFtcbiAgICAgIC8vICMjIyBUQUlOVCBub3QgYWxsIG9mIHRoZXNlIGV2ZW50cyBhcmUgbmVlZGVkXG4gICAgICAnY2xpY2snLFxuICAgICAgLy8gJ2RibGNsaWNrJywgIyBpbXBsaWVkIC8gcHJlY2VkZWQgYnkgYGNsaWNrYCBldmVudFxuICAgICAgLy8gJ2RyYWcnLCAnZHJhZ2VuZCcsICdkcmFnZW50ZXInLCAnZHJhZ2xlYXZlJywgJ2RyYWdvdmVyJywgJ2RyYWdzdGFydCcsXG4gICAgICAvLyAnbW91c2Vkb3duJywgJ21vdXNlZW50ZXInLCAnbW91c2VsZWF2ZScsICdtb3VzZW1vdmUnLCAnbW91c2VvdXQnLCAnbW91c2VvdmVyJywgJ21vdXNldXAnLFxuICAgICAgLy8gJ3BvaW50ZXJjYW5jZWwnLFxuICAgICAgJ3doZWVsJyxcbiAgICAgICdwb2ludGVybW92ZScsXG4gICAgICAncG9pbnRlcm91dCcsXG4gICAgICAncG9pbnRlcm92ZXInXG4gICAgXSxcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vICdwb2ludGVyZG93bicsXG4gICAgLy8gJ3BvaW50ZXJlbnRlcicsXG4gICAgLy8gJ3BvaW50ZXJsZWF2ZScsXG4gICAgLy8gJ3BvaW50ZXJ1cCcsXG4gICAgLy8gLS0tLS0tLS0tLS0tLSBUaWVyIEE6IHViaXF1aXRvdXMsIHVuZXF1aXZvY2FsXG4gICAgbW9kaWZpZXJfbmFtZXM6IFsnQWx0JywgJ0FsdEdyYXBoJywgJ0NvbnRyb2wnLCAnTWV0YScsICdTaGlmdCcsICdDYXBzTG9jayddXG4gIH07XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gLS0tLS0tLS0tLS0tLSBUaWVyIEI6IHN0YXR1cyBkb3VidGZ1bFxuICAvLyAnSHlwZXInLFxuICAvLyAnT1MnLFxuICAvLyAnU3VwZXInLFxuICAvLyAnU3ltYm9sJyxcbiAgLy8gLS0tLS0tLS0tLS0tLSBUaWVyIEM6IHJhcmUsIG5vdCBuZWVkZWQsIG9yIG5vdCBzZW5zZWQgYnkgSlNcbiAgLy8gJ0ZuJyxcbiAgLy8gJ0ZuTG9jaycsXG4gIC8vICdOdW1Mb2NrJyxcbiAgLy8gJ1Njcm9sbExvY2snLFxuICAvLyAnU3ltYm9sTG9jaycsXG4gIHRoaXMuX0tiID0gKGZ1bmN0aW9uKCkge1xuICAgIGNsYXNzIF9LYiB7XG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgY29uc3RydWN0b3IoY2ZnKSB7XG4gICAgICAgIHZhciBpLCBsZW4sIG1vZGlmaWVyX25hbWUsIHJlZjtcbiAgICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICAgLyogR2V0IHRoZSBsYXN0IGtub3duIGtleWJvYXJkIG1vZGlmaWVyIHN0YXRlLiBOT1RFIG1heSBiZSBleHRlbmRlZCB3aXRoIGBldmVudGAgYXJndW1lbnQgSVRGLiAqL1xuICAgICAgICAvLyDCtS5ET00uZ2V0X2tiX21vZGlmaWVyX3N0YXRlID0gKCkgPT4gcmV0dXJuIHsgLi4ucHJ2LCB9XG5cbiAgICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICAgdGhpcy5nZXRfY2hhbmdlZF9rYl9tb2RpZmllcl9zdGF0ZSA9IHRoaXMuZ2V0X2NoYW5nZWRfa2JfbW9kaWZpZXJfc3RhdGUuYmluZCh0aGlzKTtcbiAgICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgICAvLyBnZXRfa2JfbW9kaWZpZXJfc3RhdGUgPSAoIGV2ZW50LCB2YWx1ZSApID0+XG4gICAgICAgIC8vICAgQF9wcnZfbW9kaWZpZXJzID0ge31cbiAgICAgICAgLy8gICBmb3IgKCBtb2RpZmllcl9uYW1lIG9mIEBjZmcubW9kaWZpZXJfbmFtZXMgKSB7XG4gICAgICAgIC8vICAgICBAX3Bydl9tb2RpZmllcnNbIG1vZGlmaWVyX25hbWUgXSA9IG51bGxcbiAgICAgICAgLy8gICBmcmVlemUoIEBfcHJ2X21vZGlmaWVycyApXG5cbiAgICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICAgdGhpcy5fc2V0X2NhcHNsb2NrX3N0YXRlID0gdGhpcy5fc2V0X2NhcHNsb2NrX3N0YXRlLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuY2ZnID0gey4uLmRlZmF1bHRzLCAuLi5jZmd9O1xuICAgICAgICByZWYgPSB0aGlzLmNmZy5tb2RpZmllcl9uYW1lcztcbiAgICAgICAgZm9yIChpID0gMCwgbGVuID0gcmVmLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgbW9kaWZpZXJfbmFtZSA9IHJlZltpXTtcbiAgICAgICAgICB0aGlzLl9wcnZfbW9kaWZpZXJzW21vZGlmaWVyX25hbWVdID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBmcmVlemUodGhpcy5fcHJ2X21vZGlmaWVycyk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBnZXRfY2hhbmdlZF9rYl9tb2RpZmllcl9zdGF0ZSgpIHtcbiAgICAgICAgdmFyIGFueV9oYXNfY2hhbmdlZCwgY2hhbmdlZF9tb2RpZmllcnMsIGNydF9tb2RpZmllcnMsIGksIGxlbiwgbW9kaWZpZXJfbmFtZSwgcmVmLCBzdGF0ZSwgdGhpc19oYXNfY2hhbmdlZDtcbiAgICAgICAgLyogUmV0dXJuIGtleWJvYXJkIG1vZGlmaWVyIHN0YXRlIGlmIGl0IGhhcyBjaGFuZ2VkIHNpbmNlIHRoZSBsYXN0IGNhbGwsIG9yIGBudWxsYCBpZiBpdCBoYXNuJ3QgY2hhbmdlZC4gKi9cbiAgICAgICAgLy8gbG9nKCAnXjMzOTg4XicsIHsgZXZlbnQsIH0gKVxuICAgICAgICBjcnRfbW9kaWZpZXJzID0ge1xuICAgICAgICAgIF90eXBlOiBldmVudC50eXBlXG4gICAgICAgIH07XG4gICAgICAgIGNoYW5nZWRfbW9kaWZpZXJzID0ge1xuICAgICAgICAgIF90eXBlOiBldmVudC50eXBlXG4gICAgICAgIH07XG4gICAgICAgIGFueV9oYXNfY2hhbmdlZCA9IGZhbHNlO1xuICAgICAgICByZWYgPSB0aGlzLmNmZy5tb2RpZmllcl9uYW1lcztcbiAgICAgICAgZm9yIChpID0gMCwgbGVuID0gcmVmLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgbW9kaWZpZXJfbmFtZSA9IHJlZltpXTtcbiAgICAgICAgICBzdGF0ZSA9IGV2ZW50LmdldE1vZGlmaWVyU3RhdGUobW9kaWZpZXJfbmFtZSk7XG4gICAgICAgICAgdGhpc19oYXNfY2hhbmdlZCA9IHRoaXMuX3Bydl9tb2RpZmllcnNbbW9kaWZpZXJfbmFtZV0gIT09IHN0YXRlO1xuICAgICAgICAgIGFueV9oYXNfY2hhbmdlZCA9IGFueV9oYXNfY2hhbmdlZCB8fCB0aGlzX2hhc19jaGFuZ2VkO1xuICAgICAgICAgIGNydF9tb2RpZmllcnNbbW9kaWZpZXJfbmFtZV0gPSBzdGF0ZTtcbiAgICAgICAgICBpZiAodGhpc19oYXNfY2hhbmdlZCkge1xuICAgICAgICAgICAgY2hhbmdlZF9tb2RpZmllcnNbbW9kaWZpZXJfbmFtZV0gPSBzdGF0ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFueV9oYXNfY2hhbmdlZCkge1xuICAgICAgICAgIHRoaXMuX3Bydl9tb2RpZmllcnMgPSBmcmVlemUoY3J0X21vZGlmaWVycyk7XG4gICAgICAgICAgcmV0dXJuIGNoYW5nZWRfbW9kaWZpZXJzO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBfc2V0X2NhcHNsb2NrX3N0YXRlKGNhcHNsb2NrX2FjdGl2ZSkge1xuICAgICAgICBpZiAoY2Fwc2xvY2tfYWN0aXZlID09PSB0aGlzLl9jYXBzbG9ja19hY3RpdmUpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9jYXBzbG9ja19hY3RpdmUgPSBjYXBzbG9ja19hY3RpdmU7XG4gICAgICAgIMK1LkRPTS5lbWl0X2N1c3RvbV9ldmVudCgnwrVfa2JfY2Fwc2xvY2tfY2hhbmdlZCcsIHtcbiAgICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICAgIENhcHNMb2NrOiBjYXBzbG9ja19hY3RpdmVcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgIH07XG5cbiAgICBfS2IucHJvdG90eXBlLl9wcnZfbW9kaWZpZXJzID0ge307XG5cbiAgICBfS2IucHJvdG90eXBlLl9jYXBzbG9ja19hY3RpdmUgPSBmYWxzZTtcblxuICAgIHJldHVybiBfS2I7XG5cbiAgfSkuY2FsbCh0aGlzKTtcblxuICAvLyAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIG9uX3B1c2g6ICgga2V5bmFtZXMsIGhhbmRsZXIgKSA9PlxuICAvLyBrZXluYW1lcyAgPSBbIGtleW5hbWVzLCBdIHVubGVzcyBpc2EubGlzdCBrZXluYW1lc1xuICAvLyB0eXBlcyAgICAgPSBbIHR5cGVzLCAgICBdIHVubGVzcyBpc2EubGlzdCB0eXBlc1xuICAvLyB2YWxpZGF0ZS5rYl9rZXluYW1lcyAga2V5bmFtZXNcbiAgLy8gdmFsaWRhdGUua2JfdHlwZXMgICAgIHR5cGVzXG5cbiAgLy8jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiAgLy8jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiAgLy8jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiAgLy8jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiAgLy8jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiAgLy8jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiAgcmVmID0gdGhpcy5LYiA9IChmdW5jdGlvbigpIHtcbiAgICBjbGFzcyBLYiBleHRlbmRzIHRoaXMuX0tiIHtcbiAgICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlciguLi5hcmd1bWVudHMpO1xuICAgICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgICB0aGlzLl9oYW5kbGVyX2Zyb21fd2F0Y2hlciA9IHRoaXMuX2hhbmRsZXJfZnJvbV93YXRjaGVyLmJpbmQodGhpcyk7XG4gICAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgIHRoaXMuX2xpc3Rlbl90b19rZXkgPSB0aGlzLl9saXN0ZW5fdG9fa2V5LmJpbmQodGhpcyk7XG4gICAgICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAgIC8vIE1CTUNEXG4gICAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgIHRoaXMuX2xpc3Rlbl90b19tb2RpZmllcnMgPSB0aGlzLl9saXN0ZW5fdG9fbW9kaWZpZXJzLmJpbmQodGhpcyk7XG4gICAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgIHRoaXMuX2VtaXRfbWJtY2Rfa2V5X2V2ZW50cyA9IHRoaXMuX2VtaXRfbWJtY2Rfa2V5X2V2ZW50cy5iaW5kKHRoaXMpO1xuICAgICAgfVxuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgX2dldF9sYXRjaGluZ19rZXluYW1lKCkge1xuICAgICAgICB2YXIgUiwgcmVmMSwgcmVmMTAsIHJlZjExLCByZWYxMiwgcmVmMiwgcmVmMywgcmVmNCwgcmVmNSwgcmVmNiwgcmVmNywgcmVmOCwgcmVmOTtcbiAgICAgICAgaWYgKCEoKERhdGUubm93KCkgLSAoKHJlZjEgPSAocmVmMiA9IHRoaXMuX3NocmVnWzBdKSAhPSBudWxsID8gcmVmMi50IDogdm9pZCAwKSAhPSBudWxsID8gcmVmMSA6IDApKSA8IHRoaXMuY2ZnLmxhdGNoLmR0KSkge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGlmICgoKHJlZjMgPSB0aGlzLl9zaHJlZ1swXSkgIT0gbnVsbCA/IHJlZjMuZGlyIDogdm9pZCAwKSAhPT0gJ2Rvd24nKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCgocmVmNCA9IHRoaXMuX3NocmVnWzFdKSAhPSBudWxsID8gcmVmNC5kaXIgOiB2b2lkIDApICE9PSAndXAnKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCgocmVmNSA9IHRoaXMuX3NocmVnWzJdKSAhPSBudWxsID8gcmVmNS5kaXIgOiB2b2lkIDApICE9PSAnZG93bicpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoKChyZWY2ID0gdGhpcy5fc2hyZWdbM10pICE9IG51bGwgPyByZWY2LmRpciA6IHZvaWQgMCkgIT09ICd1cCcpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoKCgoKHJlZjkgPSB0aGlzLl9zaHJlZ1swXSkgIT0gbnVsbCA/IHJlZjkubmFtZSA6IHZvaWQgMCkgIT09IChyZWY4ID0gKHJlZjEwID0gdGhpcy5fc2hyZWdbMV0pICE9IG51bGwgPyByZWYxMC5uYW1lIDogdm9pZCAwKSB8fCByZWY4ICE9PSAocmVmNyA9IChyZWYxMSA9IHRoaXMuX3NocmVnWzJdKSAhPSBudWxsID8gcmVmMTEubmFtZSA6IHZvaWQgMCkpIHx8IHJlZjcgIT09ICgocmVmMTIgPSB0aGlzLl9zaHJlZ1szXSkgIT0gbnVsbCA/IHJlZjEyLm5hbWUgOiB2b2lkIDApKSkge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIFIgPSB0aGlzLl9zaHJlZ1szXS5uYW1lO1xuICAgICAgICByZXR1cm4gUjtcbiAgICAgIH1cblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIF9pbml0aWFsaXplX2xhdGNoaW5nKCkge1xuICAgICAgICB2YXIgcHVzaDtcbiAgICAgICAgaWYgKHRoaXMuX2xhdGNoaW5nX2luaXRpYWxpemVkKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fbGF0Y2hpbmdfaW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICBwdXNoID0gKGRpciwgZXZlbnQpID0+IHtcbiAgICAgICAgICB2YXIgbmFtZTtcbiAgICAgICAgICBuYW1lID0gZXZlbnQua2V5O1xuICAgICAgICAgIHRoaXMuX3NocmVnLnB1c2goe1xuICAgICAgICAgICAgZGlyLFxuICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgIHQ6IERhdGUubm93KClcbiAgICAgICAgICB9KTtcbiAgICAgICAgICB3aGlsZSAodGhpcy5fc2hyZWcubGVuZ3RoID4gNCkge1xuICAgICAgICAgICAgdGhpcy5fc2hyZWcuc2hpZnQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH07XG4gICAgICAgIMK1LkRPTS5vbihkb2N1bWVudCwgJ2tleWRvd24nLCAoZXZlbnQpID0+IHtcbiAgICAgICAgICByZXR1cm4gcHVzaCgnZG93bicsIGV2ZW50KTtcbiAgICAgICAgfSk7XG4gICAgICAgIMK1LkRPTS5vbihkb2N1bWVudCwgJ2tleXVwJywgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHB1c2goJ3VwJywgZXZlbnQpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBfbGlzdGVuX3RvX2tleV9wdXNoKGtleW5hbWUsIGhhbmRsZXIpIHtcbiAgICAgICAgdmFyIGJlaGF2aW9yLCBzdGF0ZTtcbiAgICAgICAgc3RhdGUgPSBmYWxzZTtcbiAgICAgICAgYmVoYXZpb3IgPSAncHVzaCc7XG4gICAgICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgICAgICDCtS5ET00ub24oZG9jdW1lbnQsICdrZXlkb3duJywgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgaWYgKGV2ZW50LmtleSAhPT0ga2V5bmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHN0YXRlID0gdHJ1ZTtcbiAgICAgICAgICBoYW5kbGVyKGZyZWV6ZSh7a2V5bmFtZSwgYmVoYXZpb3IsIHN0YXRlLCBldmVudH0pKTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgICAgICDCtS5ET00ub24oZG9jdW1lbnQsICdrZXl1cCcsIChldmVudCkgPT4ge1xuICAgICAgICAgIGlmIChldmVudC5rZXkgIT09IGtleW5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzdGF0ZSA9IGZhbHNlO1xuICAgICAgICAgIGhhbmRsZXIoZnJlZXplKHtrZXluYW1lLCBiZWhhdmlvciwgc3RhdGUsIGV2ZW50fSkpO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgX2xpc3Rlbl90b19rZXlfdG9nZ2xlKGtleW5hbWUsIGhhbmRsZXIpIHtcbiAgICAgICAgdmFyIGJlaGF2aW9yLCBza2lwX25leHQsIHN0YXRlO1xuICAgICAgICBzdGF0ZSA9IGZhbHNlO1xuICAgICAgICBiZWhhdmlvciA9ICd0b2dnbGUnO1xuICAgICAgICBza2lwX25leHQgPSBmYWxzZTtcbiAgICAgICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgICAgIMK1LkRPTS5vbihkb2N1bWVudCwgJ2tleWRvd24nLCAoZXZlbnQpID0+IHtcbiAgICAgICAgICBpZiAoZXZlbnQua2V5ICE9PSBrZXluYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHN0YXRlKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc3RhdGUgPSB0cnVlO1xuICAgICAgICAgIHNraXBfbmV4dCA9IHRydWU7XG4gICAgICAgICAgLy8gZGVidWcgJ15fbGlzdGVuX3RvX2tleUAyMjNeJywgJ2tleWRvd24nLCB7IGtleW5hbWUsIGJlaGF2aW9yLCBlbnRyeSwgfVxuICAgICAgICAgIGhhbmRsZXIoZnJlZXplKHtrZXluYW1lLCBiZWhhdmlvciwgc3RhdGUsIGV2ZW50fSkpO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgICAgIMK1LkRPTS5vbihkb2N1bWVudCwgJ2tleXVwJywgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgaWYgKGV2ZW50LmtleSAhPT0ga2V5bmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghc3RhdGUpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoc2tpcF9uZXh0KSB7XG4gICAgICAgICAgICBza2lwX25leHQgPSBmYWxzZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3RhdGUgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gZGVidWcgJ15fbGlzdGVuX3RvX2tleUAyMjNeJywgJ3RvZ2dsZS9rZXl1cCcsIHsga2V5bmFtZSwgYmVoYXZpb3IsIGVudHJ5LCB9XG4gICAgICAgICAgaGFuZGxlcihmcmVlemUoe2tleW5hbWUsIGJlaGF2aW9yLCBzdGF0ZSwgZXZlbnR9KSk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0pO1xuICAgICAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBfbGlzdGVuX3RvX2tleV9sYXRjaChrZXluYW1lLCBoYW5kbGVyKSB7XG4gICAgICAgIHZhciBiZWhhdmlvciwgc3RhdGU7XG4gICAgICAgIHRoaXMuX2luaXRpYWxpemVfbGF0Y2hpbmcoKTtcbiAgICAgICAgc3RhdGUgPSBmYWxzZTtcbiAgICAgICAgYmVoYXZpb3IgPSAnbGF0Y2gnO1xuICAgICAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAgICAgwrUuRE9NLm9uKGRvY3VtZW50LCAna2V5dXAnLCAoZXZlbnQpID0+IHtcbiAgICAgICAgICBpZiAoa2V5bmFtZSA9PT0gdGhpcy5fZ2V0X2xhdGNoaW5nX2tleW5hbWUoKSkge1xuICAgICAgICAgICAgc3RhdGUgPSAhc3RhdGU7XG4gICAgICAgICAgICBoYW5kbGVyKGZyZWV6ZSh7a2V5bmFtZSwgYmVoYXZpb3IsIHN0YXRlLCBldmVudH0pKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0pO1xuICAgICAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBfbGlzdGVuX3RvX2tleV90bGF0Y2goa2V5bmFtZSwgaGFuZGxlcikge1xuICAgICAgICB2YXIgYmVoYXZpb3IsIGlzX2xhdGNoZWQsIHN0YXRlO1xuICAgICAgICBzdGF0ZSA9IGZhbHNlO1xuICAgICAgICBiZWhhdmlvciA9ICd0bGF0Y2gnO1xuICAgICAgICBpc19sYXRjaGVkID0gZmFsc2U7XG4gICAgICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgICAgICB0aGlzLl9saXN0ZW5fdG9fa2V5KGtleW5hbWUsICdsYXRjaCcsIChkKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGlzX2xhdGNoZWQgPSBkLnN0YXRlO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgICAgIMK1LkRPTS5vbihkb2N1bWVudCwgJ2tleWRvd24nLCAoZXZlbnQpID0+IHtcbiAgICAgICAgICBpZiAoZXZlbnQua2V5ICE9PSBrZXluYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc3RhdGUgPSAhaXNfbGF0Y2hlZDtcbiAgICAgICAgICBoYW5kbGVyKGZyZWV6ZSh7a2V5bmFtZSwgYmVoYXZpb3IsIHN0YXRlLCBldmVudH0pKTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgICAgICDCtS5ET00ub24oZG9jdW1lbnQsICdrZXl1cCcsIChldmVudCkgPT4ge1xuICAgICAgICAgIGlmIChldmVudC5rZXkgIT09IGtleW5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzdGF0ZSA9IGlzX2xhdGNoZWQ7XG4gICAgICAgICAgaGFuZGxlcihmcmVlemUoe2tleW5hbWUsIGJlaGF2aW9yLCBzdGF0ZSwgZXZlbnR9KSk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0pO1xuICAgICAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBfbGlzdGVuX3RvX2tleV9wdGxhdGNoKGtleW5hbWUsIGhhbmRsZXIpIHtcbiAgICAgICAgdmFyIGJlaGF2aW9yLCBpc19sYXRjaGVkLCBzdGF0ZTtcbiAgICAgICAgc3RhdGUgPSBmYWxzZTtcbiAgICAgICAgYmVoYXZpb3IgPSAncHRsYXRjaCc7XG4gICAgICAgIGlzX2xhdGNoZWQgPSBmYWxzZTtcbiAgICAgICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgICAgIHRoaXMuX2xpc3Rlbl90b19rZXkoa2V5bmFtZSwgJ2xhdGNoJywgKGQpID0+IHtcbiAgICAgICAgICByZXR1cm4gaXNfbGF0Y2hlZCA9IGQuc3RhdGU7XG4gICAgICAgIH0pO1xuICAgICAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAgICAgwrUuRE9NLm9uKGRvY3VtZW50LCAna2V5ZG93bicsIChldmVudCkgPT4ge1xuICAgICAgICAgIGlmIChldmVudC5rZXkgIT09IGtleW5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaXNfbGF0Y2hlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHN0YXRlID0gdHJ1ZTtcbiAgICAgICAgICBoYW5kbGVyKGZyZWV6ZSh7a2V5bmFtZSwgYmVoYXZpb3IsIHN0YXRlLCBldmVudH0pKTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgICAgICDCtS5ET00ub24oZG9jdW1lbnQsICdrZXl1cCcsIChldmVudCkgPT4ge1xuICAgICAgICAgIGlmIChldmVudC5rZXkgIT09IGtleW5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaXNfbGF0Y2hlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHN0YXRlID0gZmFsc2U7XG4gICAgICAgICAgaGFuZGxlcihmcmVlemUoe2tleW5hbWUsIGJlaGF2aW9yLCBzdGF0ZSwgZXZlbnR9KSk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0pO1xuICAgICAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBfbGlzdGVuX3RvX2tleV9udGxhdGNoKGtleW5hbWUsIGhhbmRsZXIpIHtcbiAgICAgICAgdmFyIGJlaGF2aW9yLCBpc19sYXRjaGVkLCBzdGF0ZTtcbiAgICAgICAgc3RhdGUgPSBmYWxzZTtcbiAgICAgICAgYmVoYXZpb3IgPSAnbnRsYXRjaCc7XG4gICAgICAgIGlzX2xhdGNoZWQgPSBmYWxzZTtcbiAgICAgICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgICAgIHRoaXMuX2xpc3Rlbl90b19rZXkoa2V5bmFtZSwgJ2xhdGNoJywgKGQpID0+IHtcbiAgICAgICAgICByZXR1cm4gaXNfbGF0Y2hlZCA9IGQuc3RhdGU7XG4gICAgICAgIH0pO1xuICAgICAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAgICAgwrUuRE9NLm9uKGRvY3VtZW50LCAna2V5ZG93bicsIChldmVudCkgPT4ge1xuICAgICAgICAgIGlmIChldmVudC5rZXkgIT09IGtleW5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWlzX2xhdGNoZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzdGF0ZSA9IGZhbHNlO1xuICAgICAgICAgIGhhbmRsZXIoZnJlZXplKHtrZXluYW1lLCBiZWhhdmlvciwgc3RhdGUsIGV2ZW50fSkpO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgICAgIMK1LkRPTS5vbihkb2N1bWVudCwgJ2tleXVwJywgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgaWYgKGV2ZW50LmtleSAhPT0ga2V5bmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghaXNfbGF0Y2hlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHN0YXRlID0gdHJ1ZTtcbiAgICAgICAgICBoYW5kbGVyKGZyZWV6ZSh7a2V5bmFtZSwgYmVoYXZpb3IsIHN0YXRlLCBldmVudH0pKTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgX2hhbmRsZXJfZnJvbV93YXRjaGVyKHdhdGNoZXIpIHtcbiAgICAgICAgYm91bmRNZXRob2RDaGVjayh0aGlzLCByZWYpO1xuICAgICAgICAvKiBUQUlOVCBjb3VsZCB1c2Ugc2luZ2xlIGZ1bmN0aW9uIGZvciBhbGwgaGFuZGxlcnMgdGhhdCBlbWl0IHRoZSBzYW1lIGV2ZW50ICovXG4gICAgICAgIHZhbGlkYXRlLmtiX3dhdGNoZXIod2F0Y2hlcik7XG4gICAgICAgIGlmIChpc2EuZnVuY3Rpb24od2F0Y2hlcikpIHtcbiAgICAgICAgICByZXR1cm4gd2F0Y2hlcjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHJldHVybiDCtS5ET00uZW1pdF9jdXN0b21fZXZlbnQod2F0Y2hlciwge1xuICAgICAgICAgICAgZGV0YWlsOiBkXG4gICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIF9saXN0ZW5fdG9fa2V5KGtleW5hbWUsIGJlaGF2aW9yLCB3YXRjaGVyKSB7XG4gICAgICAgIHZhciBoYW5kbGVyO1xuICAgICAgICBib3VuZE1ldGhvZENoZWNrKHRoaXMsIHJlZik7XG4gICAgICAgIGlmIChrZXluYW1lID09PSAnU3BhY2UnKSB7XG4gICAgICAgICAga2V5bmFtZSA9ICcgJztcbiAgICAgICAgfVxuICAgICAgICB2YWxpZGF0ZS5rYl9rZXluYW1lKGtleW5hbWUpO1xuICAgICAgICB2YWxpZGF0ZS5rYl9rZXl0eXBlKGJlaGF2aW9yKTtcbiAgICAgICAgaGFuZGxlciA9IHRoaXMuX2hhbmRsZXJfZnJvbV93YXRjaGVyKHdhdGNoZXIpO1xuICAgICAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAgICAgc3dpdGNoIChiZWhhdmlvcikge1xuICAgICAgICAgIGNhc2UgJ3B1c2gnOlxuICAgICAgICAgICAgdGhpcy5fbGlzdGVuX3RvX2tleV9wdXNoKGtleW5hbWUsIGhhbmRsZXIpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAndG9nZ2xlJzpcbiAgICAgICAgICAgIHRoaXMuX2xpc3Rlbl90b19rZXlfdG9nZ2xlKGtleW5hbWUsIGhhbmRsZXIpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnbGF0Y2gnOlxuICAgICAgICAgICAgdGhpcy5fbGlzdGVuX3RvX2tleV9sYXRjaChrZXluYW1lLCBoYW5kbGVyKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ3RsYXRjaCc6XG4gICAgICAgICAgICB0aGlzLl9saXN0ZW5fdG9fa2V5X3RsYXRjaChrZXluYW1lLCBoYW5kbGVyKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ250bGF0Y2gnOlxuICAgICAgICAgICAgdGhpcy5fbGlzdGVuX3RvX2tleV9udGxhdGNoKGtleW5hbWUsIGhhbmRsZXIpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAncHRsYXRjaCc6XG4gICAgICAgICAgICB0aGlzLl9saXN0ZW5fdG9fa2V5X3B0bGF0Y2goa2V5bmFtZSwgaGFuZGxlcik7XG4gICAgICAgIH1cbiAgICAgICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgICAgIHJldHVybiBudWxsLyogTk9URSBtYXkgcmV0dXJuIGEgYHJlbW92ZV9saXN0ZW5lcmAgbWV0aG9kIElURiAqLztcbiAgICAgIH1cblxuICAgICAgX2xpc3Rlbl90b19tb2RpZmllcnMod2F0Y2hlciA9IG51bGwpIHtcbiAgICAgICAgdmFyIGV2ZW50bmFtZSwgaGFuZGxlX2tibGlrZV9ldmVudCwgaGFuZGxlciwgaSwgbGVuLCByZWYxO1xuICAgICAgICBib3VuZE1ldGhvZENoZWNrKHRoaXMsIHJlZik7XG4gICAgICAgIGlmICh3YXRjaGVyICE9IG51bGwpIHtcbiAgICAgICAgICBoYW5kbGVyID0gdGhpcy5faGFuZGxlcl9mcm9tX3dhdGNoZXIod2F0Y2hlcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaGFuZGxlciA9IHRoaXMuX2VtaXRfbWJtY2Rfa2V5X2V2ZW50cztcbiAgICAgICAgfVxuICAgICAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAgICAgaGFuZGxlX2tibGlrZV9ldmVudCA9IChldmVudCkgPT4ge1xuICAgICAgICAgIHZhciBtb2RpZmllcl9zdGF0ZTtcbiAgICAgICAgICBtb2RpZmllcl9zdGF0ZSA9IHRoaXMuZ2V0X2NoYW5nZWRfa2JfbW9kaWZpZXJfc3RhdGUoZXZlbnQpO1xuICAgICAgICAgIGlmIChtb2RpZmllcl9zdGF0ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgaGFuZGxlcihtb2RpZmllcl9zdGF0ZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMuX3NldF9jYXBzbG9ja19zdGF0ZShldmVudC5nZXRNb2RpZmllclN0YXRlKCdDYXBzTG9jaycpKTtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfTtcbiAgICAgICAgcmVmMSA9IHRoaXMuY2ZnLmtibGlrZV9ldmVudG5hbWVzO1xuICAgICAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAgICAgZm9yIChpID0gMCwgbGVuID0gcmVmMS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgIGV2ZW50bmFtZSA9IHJlZjFbaV07XG4gICAgICAgICAgwrUuRE9NLm9uKGRvY3VtZW50LCBldmVudG5hbWUsIGhhbmRsZV9rYmxpa2VfZXZlbnQpO1xuICAgICAgICB9XG4gICAgICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgICAgICDCtS5ET00ub24oZG9jdW1lbnQsICdrZXlkb3duJywgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgLy8gaGFuZGxlX2tibGlrZV9ldmVudCBldmVudCAjIyMgISEhISEhISEhISEhISEhISEhISEhISAjIyNcbiAgICAgICAgICAvKiBUQUlOVCBsb2dpYyBpcyBxdWVzdGlvbmFibGUgKi9cbiAgICAgICAgICBpZiAoZXZlbnQua2V5ID09PSAnQ2Fwc0xvY2snKSB7XG4gICAgICAgICAgICB0aGlzLl9zZXRfY2Fwc2xvY2tfc3RhdGUoIXRoaXMuX2NhcHNsb2NrX2FjdGl2ZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3NldF9jYXBzbG9ja19zdGF0ZShldmVudC5nZXRNb2RpZmllclN0YXRlKCdDYXBzTG9jaycpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH0pO1xuICAgICAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAgICAgwrUuRE9NLm9uKGRvY3VtZW50LCAna2V5dXAnLCAoZXZlbnQpID0+IHtcbiAgICAgICAgICBpZiAoZXZlbnQua2V5ID09PSAnQ2Fwc0xvY2snKSB7XG4gICAgICAgICAgICAvLyBoYW5kbGVfa2JsaWtlX2V2ZW50IGV2ZW50ICMjIyAhISEhISEhISEhISEhISEhISEhISEhICMjI1xuICAgICAgICAgICAgLyogVEFJTlQgbG9naWMgaXMgcXVlc3Rpb25hYmxlICovXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5fc2V0X2NhcHNsb2NrX3N0YXRlKGV2ZW50LmdldE1vZGlmaWVyU3RhdGUoJ0NhcHNMb2NrJykpO1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIF9lbWl0X21ibWNkX2tleV9ldmVudHMoZCkge1xuICAgICAgICB2YXIgZXZlbnRuYW1lLCBrZXksIHN0YXRlO1xuICAgICAgICBib3VuZE1ldGhvZENoZWNrKHRoaXMsIHJlZik7XG4vKiBBY2NlcHRzIGFuIG9iamVjdCB3aXRoIG1vZGlmaWVyIG5hbWVzIGFzIGtleXMsIGJvb2xlYW5zIGFzIHZhbHVlczsgd2lsbCBlbWl0IGBrZXlkb3duYCwgYGtleXVwYFxuICAgZXZlbnRzIGFzIG5lZWRlZC4gKi9cbi8qIFRBSU5UIG9ubHkgaXRlcmF0ZSBvdmVyIG1vZGlmaWVyIG5hbWVzPyAqL1xuICAgICAgICBmb3IgKGtleSBpbiBkKSB7XG4gICAgICAgICAgc3RhdGUgPSBkW2tleV07XG4gICAgICAgICAgaWYgKGtleSA9PT0gJ190eXBlJykge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGV2ZW50bmFtZSA9IHN0YXRlID8gJ2tleWRvd24nIDogJ2tleXVwJztcbiAgICAgICAgICBkb2N1bWVudC5kaXNwYXRjaEV2ZW50KG5ldyBLZXlib2FyZEV2ZW50KGV2ZW50bmFtZSwge2tleX0pKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgIH07XG5cbiAgICAvLyAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy8gX2RlZmF1bHRzOiBmcmVlemUge1xuICAgIC8vICAgc3RhdGU6IGZyZWV6ZSB7IGRvd246IGZhbHNlLCB1cDogZmFsc2UsIHRvZ2dsZTogZmFsc2UsIGxhdGNoOiBmYWxzZSwgdGxhdGNoOiBmYWxzZSwgfVxuICAgIC8vICAgfVxuXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBLYi5wcm90b3R5cGUuX3NocmVnID0gW107XG5cbiAgICBLYi5wcm90b3R5cGUuX2xhdGNoaW5nX2luaXRpYWxpemVkID0gZmFsc2U7XG5cbiAgICByZXR1cm4gS2I7XG5cbiAgfSkuY2FsbCh0aGlzKTtcblxufSkuY2FsbCh0aGlzKTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9a2IuanMubWFwIiwiKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG4gIHZhciBTbHVnLCBUVTtcblxuICBUVSA9IHJlcXVpcmUoJy4uL2RlcHMvdHJhdmVyc2VfdXRpbC5qcycpO1xuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgU2x1ZyA9IGNsYXNzIFNsdWcge1xuICAgIGNvbnN0cnVjdG9yKHtsbG5yLCBybG5yLCBub2RlLCByZWN0YW5nbGV9KSB7XG4gICAgICB0aGlzLmxsbnIgPSBsbG5yO1xuICAgICAgdGhpcy5ybG5yID0gcmxucjtcbiAgICAgIHRoaXMubm9kZSA9IG5vZGU7XG4gICAgICB0aGlzLnJlY3RhbmdsZSA9IHJlY3RhbmdsZTtcbiAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgfVxuXG4gIH07XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICB0aGlzLkxpbmVmaW5kZXIgPSBjbGFzcyBMaW5lZmluZGVyIHtcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIGNvbnN0cnVjdG9yKGNmZykge1xuICAgICAgLyogVEFJTlQgdXNlIGludGVydHlwZSAqL1xuICAgICAgdmFyIGRlZmF1bHRzO1xuICAgICAgZGVmYXVsdHMgPSB7XG4gICAgICAgIGJveF9lbGVtZW50X25hbWU6ICdkaXYnLFxuICAgICAgICBib3hfY2xhc3NfbmFtZTogJ2JveCcsXG4gICAgICAgIHh4eF9oZWlnaHRfZmFjdG9yOiAxIC8gMlxuICAgICAgfTtcbiAgICAgIHRoaXMuLyogcmVsYXRpdmUgbWluaW11bSBoZWlnaHQgdG8gcmVjb2duaXplIGxpbmUgc3RlcCAqL2NmZyA9IE9iamVjdC5mcmVlemUoey4uLmRlZmF1bHRzLCAuLi5jZmd9KTtcbiAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgfVxuXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBkcmF3X2JveChyZWN0YW5nbGUpIHtcbiAgICAgIHZhciBib3g7XG4gICAgICBib3ggPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRoaXMuY2ZnLmJveF9lbGVtZW50X25hbWUpO1xuICAgICAgYm94LnN0eWxlLnRvcCA9IHJlY3RhbmdsZS50b3AgKyAncHgnO1xuICAgICAgYm94LnN0eWxlLmxlZnQgPSByZWN0YW5nbGUubGVmdCArICdweCc7XG4gICAgICBib3guc3R5bGUud2lkdGggPSByZWN0YW5nbGUud2lkdGggLSAxICsgJ3B4JzsgLy8gY29sbGFwc2UgYm9yZGVyc1xuICAgICAgYm94LnN0eWxlLmhlaWdodCA9IHJlY3RhbmdsZS5oZWlnaHQgKyAncHgnO1xuICAgICAgYm94LmNsYXNzTGlzdC5hZGQodGhpcy5jZmcuYm94X2NsYXNzX25hbWUpO1xuICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChib3gpO1xuICAgICAgcmV0dXJuIGJveDtcbiAgICB9XG5cbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8qIFRBSU5UIHRvIGJlIG1lcmdlZCB3aXRoIGBkcmF3X2JveCgpYCBpbiBuZXcgbWV0aG9kICovXG4gICAgeHh4X2RyYXdfbGluZV9jb3ZlcihyZWN0YW5nbGUpIHtcbiAgICAgIHZhciBib3g7XG4gICAgICBib3ggPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRoaXMuY2ZnLmJveF9lbGVtZW50X25hbWUpO1xuICAgICAgYm94LnN0eWxlLnRvcCA9IHJlY3RhbmdsZS50b3AgKyAncHgnO1xuICAgICAgYm94LnN0eWxlLmxlZnQgPSByZWN0YW5nbGUubGVmdCArICdweCc7XG4gICAgICBib3guc3R5bGUud2lkdGggPSByZWN0YW5nbGUud2lkdGggLSAxICsgJ3B4JzsgLy8gY29sbGFwc2UgYm9yZGVyc1xuICAgICAgYm94LnN0eWxlLmhlaWdodCA9IHJlY3RhbmdsZS5oZWlnaHQgKyAncHgnO1xuICAgICAgYm94LmNsYXNzTGlzdC5hZGQodGhpcy5jZmcuYm94X2NsYXNzX25hbWUpO1xuICAgICAgYm94LmNsYXNzTGlzdC5hZGQoJ2NvdmVyJyk7XG4gICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGJveCk7XG4gICAgICByZXR1cm4gYm94O1xuICAgIH1cblxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX2dldF9uZXh0X2Nocl9yZWN0YW5nbGVzKG5vZGUsIGMxLCBjMikge1xuICAgICAgdmFyIHJhbmdlLCBzZWxlY3Rpb247XG4gICAgICBUVS5UcmF2ZXJzZVV0aWwuZ2V0TmV4dENoYXIoYzEsIGMyLCBbXSwgZmFsc2UpO1xuICAgICAgc2VsZWN0aW9uID0gVFUuVHJhdmVyc2VVdGlsLnNldFNlbGVjdGlvbihjMSwgYzIpO1xuICAgICAgcmFuZ2UgPSBzZWxlY3Rpb24uZ2V0UmFuZ2VBdCgwKTtcbiAgICAgIGlmICghbm9kZS5jb250YWlucyhyYW5nZS5zdGFydENvbnRhaW5lci5wYXJlbnROb2RlKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIGlmICghbm9kZS5jb250YWlucyhyYW5nZS5lbmRDb250YWluZXIucGFyZW50Tm9kZSkpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmFuZ2UuZ2V0Q2xpZW50UmVjdHMoKTtcbiAgICB9XG5cbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICogd2Fsa19jaHJfcmVjdGFuZ2xlc19vZl9ub2RlKG5vZGUpIHtcbiAgICAgIHZhciBjMSwgYzIsIHJlY3RhbmdsZSwgcmVjdGFuZ2xlcywgdGV4dF9ub2RlO1xuICAgICAgdGV4dF9ub2RlID0gbm9kZS5jaGlsZE5vZGVzWzBdO1xuICAgICAgYzEgPSBuZXcgVFUuQ3Vyc29yKHRleHRfbm9kZSwgMCwgdGV4dF9ub2RlLmRhdGEpO1xuICAgICAgYzIgPSBuZXcgVFUuQ3Vyc29yKHRleHRfbm9kZSwgMCwgdGV4dF9ub2RlLmRhdGEpO1xuICAgICAgVFUuVHJhdmVyc2VVdGlsLnNldFNlbGVjdGlvbihjMSwgYzIpO1xuICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgcmVjdGFuZ2xlcyA9IHRoaXMuX2dldF9uZXh0X2Nocl9yZWN0YW5nbGVzKG5vZGUsIGMxLCBjMik7XG4gICAgICAgIGlmIChyZWN0YW5nbGVzID09IG51bGwpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHJlY3RhbmdsZSBvZiByZWN0YW5nbGVzKSB7XG4gICAgICAgICAgeWllbGQgbmV3IERPTVJlY3QocmVjdGFuZ2xlLmxlZnQgKyBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsTGVmdCwgcmVjdGFuZ2xlLnRvcCArIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxUb3AsIHJlY3RhbmdsZS53aWR0aCwgcmVjdGFuZ2xlLmhlaWdodCk7IC8vIGxlZnQgLy8gdG9wIC8vIHdpZHRoIC8vIGhlaWdodFxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIF9yZXNldF9saW5lX3dhbGtlcihzKSB7XG4gICAgICBzLm1pbl90b3AgPSArMmUzMDg7XG4gICAgICBzLm1heF9ib3R0b20gPSAtMmUzMDg7XG4gICAgICBzLm1pbl9sZWZ0ID0gKzJlMzA4O1xuICAgICAgcy5tYXhfcmlnaHQgPSAtMmUzMDg7XG4gICAgICBzLmF2Z19oZWlnaHQgPSAwO1xuICAgICAgcy5hdmdfYm90dG9tID0gMDtcbiAgICAgIHMuY291bnQgPSAwO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAqIHdhbGtfbGluZV9yZWN0YW5nbGVzX29mX25vZGUobm9kZSkge1xuICAgICAgdmFyIHJlY3RhbmdsZSwgcmVmLCBzO1xuICAgICAgdGhpcy5fcmVzZXRfbGluZV93YWxrZXIocyA9IHt9KTtcbiAgICAgIHJlZiA9IHRoaXMud2Fsa19jaHJfcmVjdGFuZ2xlc19vZl9ub2RlKG5vZGUpO1xuICAgICAgZm9yIChyZWN0YW5nbGUgb2YgcmVmKSB7XG4gICAgICAgIGlmIChzLmNvdW50ID4gMCAmJiByZWN0YW5nbGUuYm90dG9tIC0gcy5hdmdfYm90dG9tID4gcy5hdmdfaGVpZ2h0ICogdGhpcy5jZmcueHh4X2hlaWdodF9mYWN0b3IpIHtcbiAgICAgICAgICB5aWVsZCBuZXcgRE9NUmVjdChzLm1pbl9sZWZ0LCBzLm1pbl90b3AsIHMubWF4X3JpZ2h0IC0gcy5taW5fbGVmdCwgcy5tYXhfYm90dG9tIC0gcy5taW5fdG9wKTsgLy8gbGVmdCAvLyB0b3AgLy8gd2lkdGggLy8gaGVpZ2h0XG4gICAgICAgICAgdGhpcy5fcmVzZXRfbGluZV93YWxrZXIocyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgICAgIC8vIGRyYXdfYm94IHJlY3RhbmdsZVxuICAgICAgICBzLmNvdW50Kys7XG4gICAgICAgIHMubWluX3RvcCA9IE1hdGgubWluKHMubWluX3RvcCwgcmVjdGFuZ2xlLnRvcCk7XG4gICAgICAgIHMubWF4X2JvdHRvbSA9IE1hdGgubWF4KHMubWF4X2JvdHRvbSwgcmVjdGFuZ2xlLmJvdHRvbSk7XG4gICAgICAgIHMubWluX2xlZnQgPSBNYXRoLm1pbihzLm1pbl9sZWZ0LCByZWN0YW5nbGUubGVmdCk7XG4gICAgICAgIHMubWF4X3JpZ2h0ID0gTWF0aC5tYXgocy5tYXhfcmlnaHQsIHJlY3RhbmdsZS5yaWdodCk7XG4gICAgICAgIHMuYXZnX2hlaWdodCA9IChzLmF2Z19oZWlnaHQgKiAocy5jb3VudCAtIDEpIC8gcy5jb3VudCkgKyAocmVjdGFuZ2xlLmhlaWdodCAqIDEgLyBzLmNvdW50KTtcbiAgICAgICAgcy5hdmdfYm90dG9tID0gKHMuYXZnX2JvdHRvbSAqIChzLmNvdW50IC0gMSkgLyBzLmNvdW50KSArIChyZWN0YW5nbGUuYm90dG9tICogMSAvIHMuY291bnQpO1xuICAgICAgfVxuICAgICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAgIGlmIChzLmNvdW50ID4gMCkge1xuICAgICAgICB5aWVsZCBuZXcgRE9NUmVjdChzLm1pbl9sZWZ0LCBzLm1pbl90b3AsIHMubWF4X3JpZ2h0IC0gcy5taW5fbGVmdCwgcy5tYXhfYm90dG9tIC0gcy5taW5fdG9wKTsgLy8gbGVmdCAvLyB0b3AgLy8gd2lkdGggLy8gaGVpZ2h0XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICogd2Fsa19zbHVnc19vZl9ub2RlKG5vZGUpIHtcbiAgICAgIHZhciBpLCBpZHgsIGxlbiwgbGluZV9jb3VudCwgbGxuciwgcmVjdGFuZ2xlLCByZWN0YW5nbGVzLCBybG5yO1xuICAgICAgcmVjdGFuZ2xlcyA9IFsuLi4odGhpcy53YWxrX2xpbmVfcmVjdGFuZ2xlc19vZl9ub2RlKG5vZGUpKV07XG4gICAgICBsaW5lX2NvdW50ID0gcmVjdGFuZ2xlcy5sZW5ndGg7XG4gICAgICBmb3IgKGlkeCA9IGkgPSAwLCBsZW4gPSByZWN0YW5nbGVzLmxlbmd0aDsgaSA8IGxlbjsgaWR4ID0gKytpKSB7XG4gICAgICAgIHJlY3RhbmdsZSA9IHJlY3RhbmdsZXNbaWR4XTtcbiAgICAgICAgbGxuciA9IGlkeCArIDE7XG4gICAgICAgIHJsbnIgPSBsaW5lX2NvdW50IC0gaWR4O1xuICAgICAgICB5aWVsZCBuZXcgU2x1Zyh7bGxuciwgcmxuciwgbm9kZSwgcmVjdGFuZ2xlfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgfTtcblxufSkuY2FsbCh0aGlzKTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bGluZWZpbmRlci5qcy5tYXAiLCIoZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgdGhpcy50eXBlcyA9IG5ldyAocmVxdWlyZSgnaW50ZXJ0eXBlJykpLkludGVydHlwZSgpO1xuXG4gIE9iamVjdC5hc3NpZ24odGhpcywgdGhpcy50eXBlcy5leHBvcnQoKSk7XG5cbiAgLy8gIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIEBkZWNsYXJlICdrYl9rZXl0eXBlcycsIHRlc3RzOlxuICAvLyAgIFwieCBpcyBhIGxpc3Qgb2Yga2Jfa2V5dHlwZVwiOiAgICAgKCB4ICkgLT4gQGlzYS5saXN0X29mICdrYl9rZXl0eXBlJywgeFxuICAvLyAgIFwieCBpcyBub3QgZW1wdHlcIjogICAgICAgICAgICAgICAgICAgKCB4ICkgLT4gbm90IEBpc2EuZW1wdHkgeFxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgdGhpcy5kZWNsYXJlKCdrYl9rZXl0eXBlJywge1xuICAgIHRlc3RzOiB7XG4gICAgICBcInggaXMgb25lIG9mICd0b2dnbGUnLCAnbGF0Y2gnLCAndGxhdGNoJywgJ3B0bGF0Y2gnLCAnbnRsYXRjaCcsICdwdXNoJ1wiOiBmdW5jdGlvbih4KSB7XG4gICAgICAgIHJldHVybiB4ID09PSAndG9nZ2xlJyB8fCB4ID09PSAnbGF0Y2gnIHx8IHggPT09ICd0bGF0Y2gnIHx8IHggPT09ICdwdGxhdGNoJyB8fCB4ID09PSAnbnRsYXRjaCcgfHwgeCA9PT0gJ3B1c2gnO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgLy8gIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIEBkZWNsYXJlICdrYl9rZXluYW1lcycsIHRlc3RzOlxuICAvLyAgIFwieCBpcyBhIGxpc3Qgb2Yga2Jfa2V5bmFtZVwiOiAgKCB4ICkgLT4gQGlzYS5saXN0X29mICdrYl9rZXluYW1lJywgeFxuICAvLyAgIFwieCBpcyBub3QgZW1wdHlcIjogICAgICAgICAgICAgICAgICAgKCB4ICkgLT4gbm90IEBpc2EuZW1wdHkgeFxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgdGhpcy5kZWNsYXJlKCdrYl9rZXluYW1lJywge1xuICAgIHRlc3RzOiB7XG4gICAgICBcInggaXMgYSBub25lbXB0eV90ZXh0XCI6IGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNhLm5vbmVtcHR5X3RleHQoeCk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHRoaXMuZGVjbGFyZSgna2Jfd2F0Y2hlcicsIHtcbiAgICB0ZXN0czoge1xuICAgICAgXCJ4IGlzIGEgZnVuY3Rpb24gb3IgYSBub25lbXB0eV90ZXh0XCI6IGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLmlzYS5mdW5jdGlvbih4KSkgfHwgKHRoaXMuaXNhLm5vbmVtcHR5X3RleHQoeCkpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvKiBUQUlOVCBwcm9iYWJseSBub3QgY29ycmVjdCB0byBvbmx5IGNoZWNrIGZvciBFbGVtZW50LCBhdCBsZWFzdCBpbiBzb21lIGNhc2VzIGNvdWxkIGJlIE5vZGUgYXMgd2VsbCAqL1xuICB0aGlzLmRlY2xhcmUoJ2RlbGVtZW50JywgZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiAoeCA9PT0gZG9jdW1lbnQpIHx8ICh4IGluc3RhbmNlb2YgRWxlbWVudCk7XG4gIH0pO1xuXG4gIHRoaXMuZGVjbGFyZSgnZWxlbWVudCcsIGZ1bmN0aW9uKHgpIHtcbiAgICByZXR1cm4geCBpbnN0YW5jZW9mIEVsZW1lbnQ7XG4gIH0pO1xuXG59KS5jYWxsKHRoaXMpO1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD10eXBlcy5qcy5tYXAiLCIoZnVuY3Rpb24gKGdsb2JhbCwgZmFjdG9yeSkge1xuXHR0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgPyBmYWN0b3J5KGV4cG9ydHMpIDpcblx0dHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lKFsnZXhwb3J0cyddLCBmYWN0b3J5KSA6XG5cdChnbG9iYWwgPSBnbG9iYWwgfHwgc2VsZiwgZmFjdG9yeShnbG9iYWwubG91cGUgPSB7fSkpO1xufSh0aGlzLCAoZnVuY3Rpb24gKGV4cG9ydHMpIHsgJ3VzZSBzdHJpY3QnO1xuXG5cdHZhciBjb21tb25qc0dsb2JhbCA9IHR5cGVvZiBnbG9iYWxUaGlzICE9PSAndW5kZWZpbmVkJyA/IGdsb2JhbFRoaXMgOiB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnID8gc2VsZiA6IHt9O1xuXG5cdGZ1bmN0aW9uIGNyZWF0ZUNvbW1vbmpzTW9kdWxlKGZuLCBtb2R1bGUpIHtcblx0XHRyZXR1cm4gbW9kdWxlID0geyBleHBvcnRzOiB7fSB9LCBmbihtb2R1bGUsIG1vZHVsZS5leHBvcnRzKSwgbW9kdWxlLmV4cG9ydHM7XG5cdH1cblxuXHR2YXIgdHlwZURldGVjdCA9IGNyZWF0ZUNvbW1vbmpzTW9kdWxlKGZ1bmN0aW9uIChtb2R1bGUsIGV4cG9ydHMpIHtcblx0KGZ1bmN0aW9uIChnbG9iYWwsIGZhY3RvcnkpIHtcblx0XHQgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCkgO1xuXHR9KGNvbW1vbmpzR2xvYmFsLCAoZnVuY3Rpb24gKCkge1xuXHQvKiAhXG5cdCAqIHR5cGUtZGV0ZWN0XG5cdCAqIENvcHlyaWdodChjKSAyMDEzIGpha2UgbHVlciA8amFrZUBhbG9naWNhbHBhcmFkb3guY29tPlxuXHQgKiBNSVQgTGljZW5zZWRcblx0ICovXG5cdHZhciBwcm9taXNlRXhpc3RzID0gdHlwZW9mIFByb21pc2UgPT09ICdmdW5jdGlvbic7XG5cblx0LyogZXNsaW50LWRpc2FibGUgbm8tdW5kZWYgKi9cblx0dmFyIGdsb2JhbE9iamVjdCA9IHR5cGVvZiBzZWxmID09PSAnb2JqZWN0JyA/IHNlbGYgOiBjb21tb25qc0dsb2JhbDsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBpZC1ibGFja2xpc3RcblxuXHR2YXIgc3ltYm9sRXhpc3RzID0gdHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCc7XG5cdHZhciBtYXBFeGlzdHMgPSB0eXBlb2YgTWFwICE9PSAndW5kZWZpbmVkJztcblx0dmFyIHNldEV4aXN0cyA9IHR5cGVvZiBTZXQgIT09ICd1bmRlZmluZWQnO1xuXHR2YXIgd2Vha01hcEV4aXN0cyA9IHR5cGVvZiBXZWFrTWFwICE9PSAndW5kZWZpbmVkJztcblx0dmFyIHdlYWtTZXRFeGlzdHMgPSB0eXBlb2YgV2Vha1NldCAhPT0gJ3VuZGVmaW5lZCc7XG5cdHZhciBkYXRhVmlld0V4aXN0cyA9IHR5cGVvZiBEYXRhVmlldyAhPT0gJ3VuZGVmaW5lZCc7XG5cdHZhciBzeW1ib2xJdGVyYXRvckV4aXN0cyA9IHN5bWJvbEV4aXN0cyAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yICE9PSAndW5kZWZpbmVkJztcblx0dmFyIHN5bWJvbFRvU3RyaW5nVGFnRXhpc3RzID0gc3ltYm9sRXhpc3RzICYmIHR5cGVvZiBTeW1ib2wudG9TdHJpbmdUYWcgIT09ICd1bmRlZmluZWQnO1xuXHR2YXIgc2V0RW50cmllc0V4aXN0cyA9IHNldEV4aXN0cyAmJiB0eXBlb2YgU2V0LnByb3RvdHlwZS5lbnRyaWVzID09PSAnZnVuY3Rpb24nO1xuXHR2YXIgbWFwRW50cmllc0V4aXN0cyA9IG1hcEV4aXN0cyAmJiB0eXBlb2YgTWFwLnByb3RvdHlwZS5lbnRyaWVzID09PSAnZnVuY3Rpb24nO1xuXHR2YXIgc2V0SXRlcmF0b3JQcm90b3R5cGUgPSBzZXRFbnRyaWVzRXhpc3RzICYmIE9iamVjdC5nZXRQcm90b3R5cGVPZihuZXcgU2V0KCkuZW50cmllcygpKTtcblx0dmFyIG1hcEl0ZXJhdG9yUHJvdG90eXBlID0gbWFwRW50cmllc0V4aXN0cyAmJiBPYmplY3QuZ2V0UHJvdG90eXBlT2YobmV3IE1hcCgpLmVudHJpZXMoKSk7XG5cdHZhciBhcnJheUl0ZXJhdG9yRXhpc3RzID0gc3ltYm9sSXRlcmF0b3JFeGlzdHMgJiYgdHlwZW9mIEFycmF5LnByb3RvdHlwZVtTeW1ib2wuaXRlcmF0b3JdID09PSAnZnVuY3Rpb24nO1xuXHR2YXIgYXJyYXlJdGVyYXRvclByb3RvdHlwZSA9IGFycmF5SXRlcmF0b3JFeGlzdHMgJiYgT2JqZWN0LmdldFByb3RvdHlwZU9mKFtdW1N5bWJvbC5pdGVyYXRvcl0oKSk7XG5cdHZhciBzdHJpbmdJdGVyYXRvckV4aXN0cyA9IHN5bWJvbEl0ZXJhdG9yRXhpc3RzICYmIHR5cGVvZiBTdHJpbmcucHJvdG90eXBlW1N5bWJvbC5pdGVyYXRvcl0gPT09ICdmdW5jdGlvbic7XG5cdHZhciBzdHJpbmdJdGVyYXRvclByb3RvdHlwZSA9IHN0cmluZ0l0ZXJhdG9yRXhpc3RzICYmIE9iamVjdC5nZXRQcm90b3R5cGVPZignJ1tTeW1ib2wuaXRlcmF0b3JdKCkpO1xuXHR2YXIgdG9TdHJpbmdMZWZ0U2xpY2VMZW5ndGggPSA4O1xuXHR2YXIgdG9TdHJpbmdSaWdodFNsaWNlTGVuZ3RoID0gLTE7XG5cdC8qKlxuXHQgKiAjIyMgdHlwZU9mIChvYmopXG5cdCAqXG5cdCAqIFVzZXMgYE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmdgIHRvIGRldGVybWluZSB0aGUgdHlwZSBvZiBhbiBvYmplY3QsXG5cdCAqIG5vcm1hbGlzaW5nIGJlaGF2aW91ciBhY3Jvc3MgZW5naW5lIHZlcnNpb25zICYgd2VsbCBvcHRpbWlzZWQuXG5cdCAqXG5cdCAqIEBwYXJhbSB7TWl4ZWR9IG9iamVjdFxuXHQgKiBAcmV0dXJuIHtTdHJpbmd9IG9iamVjdCB0eXBlXG5cdCAqIEBhcGkgcHVibGljXG5cdCAqL1xuXHRmdW5jdGlvbiB0eXBlRGV0ZWN0KG9iaikge1xuXHQgIC8qICEgU3BlZWQgb3B0aW1pc2F0aW9uXG5cdCAgICogUHJlOlxuXHQgICAqICAgc3RyaW5nIGxpdGVyYWwgICAgIHggMywwMzksMDM1IG9wcy9zZWMgwrExLjYyJSAoNzggcnVucyBzYW1wbGVkKVxuXHQgICAqICAgYm9vbGVhbiBsaXRlcmFsICAgIHggMSw0MjQsMTM4IG9wcy9zZWMgwrE0LjU0JSAoNzUgcnVucyBzYW1wbGVkKVxuXHQgICAqICAgbnVtYmVyIGxpdGVyYWwgICAgIHggMSw2NTMsMTUzIG9wcy9zZWMgwrExLjkxJSAoODIgcnVucyBzYW1wbGVkKVxuXHQgICAqICAgdW5kZWZpbmVkICAgICAgICAgIHggOSw5NzgsNjYwIG9wcy9zZWMgwrExLjkyJSAoNzUgcnVucyBzYW1wbGVkKVxuXHQgICAqICAgZnVuY3Rpb24gICAgICAgICAgIHggMiw1NTYsNzY5IG9wcy9zZWMgwrExLjczJSAoNzcgcnVucyBzYW1wbGVkKVxuXHQgICAqIFBvc3Q6XG5cdCAgICogICBzdHJpbmcgbGl0ZXJhbCAgICAgeCAzOCw1NjQsNzk2IG9wcy9zZWMgwrExLjE1JSAoNzkgcnVucyBzYW1wbGVkKVxuXHQgICAqICAgYm9vbGVhbiBsaXRlcmFsICAgIHggMzEsMTQ4LDk0MCBvcHMvc2VjIMKxMS4xMCUgKDc5IHJ1bnMgc2FtcGxlZClcblx0ICAgKiAgIG51bWJlciBsaXRlcmFsICAgICB4IDMyLDY3OSwzMzAgb3BzL3NlYyDCsTEuOTAlICg3OCBydW5zIHNhbXBsZWQpXG5cdCAgICogICB1bmRlZmluZWQgICAgICAgICAgeCAzMiwzNjMsMzY4IG9wcy9zZWMgwrExLjA3JSAoODIgcnVucyBzYW1wbGVkKVxuXHQgICAqICAgZnVuY3Rpb24gICAgICAgICAgIHggMzEsMjk2LDg3MCBvcHMvc2VjIMKxMC45NiUgKDgzIHJ1bnMgc2FtcGxlZClcblx0ICAgKi9cblx0ICB2YXIgdHlwZW9mT2JqID0gdHlwZW9mIG9iajtcblx0ICBpZiAodHlwZW9mT2JqICE9PSAnb2JqZWN0Jykge1xuXHQgICAgcmV0dXJuIHR5cGVvZk9iajtcblx0ICB9XG5cblx0ICAvKiAhIFNwZWVkIG9wdGltaXNhdGlvblxuXHQgICAqIFByZTpcblx0ICAgKiAgIG51bGwgICAgICAgICAgICAgICB4IDI4LDY0NSw3NjUgb3BzL3NlYyDCsTEuMTclICg4MiBydW5zIHNhbXBsZWQpXG5cdCAgICogUG9zdDpcblx0ICAgKiAgIG51bGwgICAgICAgICAgICAgICB4IDM2LDQyOCw5NjIgb3BzL3NlYyDCsTEuMzclICg4NCBydW5zIHNhbXBsZWQpXG5cdCAgICovXG5cdCAgaWYgKG9iaiA9PT0gbnVsbCkge1xuXHQgICAgcmV0dXJuICdudWxsJztcblx0ICB9XG5cblx0ICAvKiAhIFNwZWMgQ29uZm9ybWFuY2Vcblx0ICAgKiBUZXN0OiBgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHdpbmRvdylgYFxuXHQgICAqICAtIE5vZGUgPT09IFwiW29iamVjdCBnbG9iYWxdXCJcblx0ICAgKiAgLSBDaHJvbWUgPT09IFwiW29iamVjdCBnbG9iYWxdXCJcblx0ICAgKiAgLSBGaXJlZm94ID09PSBcIltvYmplY3QgV2luZG93XVwiXG5cdCAgICogIC0gUGhhbnRvbUpTID09PSBcIltvYmplY3QgV2luZG93XVwiXG5cdCAgICogIC0gU2FmYXJpID09PSBcIltvYmplY3QgV2luZG93XVwiXG5cdCAgICogIC0gSUUgMTEgPT09IFwiW29iamVjdCBXaW5kb3ddXCJcblx0ICAgKiAgLSBJRSBFZGdlID09PSBcIltvYmplY3QgV2luZG93XVwiXG5cdCAgICogVGVzdDogYE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh0aGlzKWBgXG5cdCAgICogIC0gQ2hyb21lIFdvcmtlciA9PT0gXCJbb2JqZWN0IGdsb2JhbF1cIlxuXHQgICAqICAtIEZpcmVmb3ggV29ya2VyID09PSBcIltvYmplY3QgRGVkaWNhdGVkV29ya2VyR2xvYmFsU2NvcGVdXCJcblx0ICAgKiAgLSBTYWZhcmkgV29ya2VyID09PSBcIltvYmplY3QgRGVkaWNhdGVkV29ya2VyR2xvYmFsU2NvcGVdXCJcblx0ICAgKiAgLSBJRSAxMSBXb3JrZXIgPT09IFwiW29iamVjdCBXb3JrZXJHbG9iYWxTY29wZV1cIlxuXHQgICAqICAtIElFIEVkZ2UgV29ya2VyID09PSBcIltvYmplY3QgV29ya2VyR2xvYmFsU2NvcGVdXCJcblx0ICAgKi9cblx0ICBpZiAob2JqID09PSBnbG9iYWxPYmplY3QpIHtcblx0ICAgIHJldHVybiAnZ2xvYmFsJztcblx0ICB9XG5cblx0ICAvKiAhIFNwZWVkIG9wdGltaXNhdGlvblxuXHQgICAqIFByZTpcblx0ICAgKiAgIGFycmF5IGxpdGVyYWwgICAgICB4IDIsODg4LDM1MiBvcHMvc2VjIMKxMC42NyUgKDgyIHJ1bnMgc2FtcGxlZClcblx0ICAgKiBQb3N0OlxuXHQgICAqICAgYXJyYXkgbGl0ZXJhbCAgICAgIHggMjIsNDc5LDY1MCBvcHMvc2VjIMKxMC45NiUgKDgxIHJ1bnMgc2FtcGxlZClcblx0ICAgKi9cblx0ICBpZiAoXG5cdCAgICBBcnJheS5pc0FycmF5KG9iaikgJiZcblx0ICAgIChzeW1ib2xUb1N0cmluZ1RhZ0V4aXN0cyA9PT0gZmFsc2UgfHwgIShTeW1ib2wudG9TdHJpbmdUYWcgaW4gb2JqKSlcblx0ICApIHtcblx0ICAgIHJldHVybiAnQXJyYXknO1xuXHQgIH1cblxuXHQgIC8vIE5vdCBjYWNoaW5nIGV4aXN0ZW5jZSBvZiBgd2luZG93YCBhbmQgcmVsYXRlZCBwcm9wZXJ0aWVzIGR1ZSB0byBwb3RlbnRpYWxcblx0ICAvLyBmb3IgYHdpbmRvd2AgdG8gYmUgdW5zZXQgYmVmb3JlIHRlc3RzIGluIHF1YXNpLWJyb3dzZXIgZW52aXJvbm1lbnRzLlxuXHQgIGlmICh0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JyAmJiB3aW5kb3cgIT09IG51bGwpIHtcblx0ICAgIC8qICEgU3BlYyBDb25mb3JtYW5jZVxuXHQgICAgICogKGh0dHBzOi8vaHRtbC5zcGVjLndoYXR3Zy5vcmcvbXVsdGlwYWdlL2Jyb3dzZXJzLmh0bWwjbG9jYXRpb24pXG5cdCAgICAgKiBXaGF0V0cgSFRNTCQ3LjcuMyAtIFRoZSBgTG9jYXRpb25gIGludGVyZmFjZVxuXHQgICAgICogVGVzdDogYE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh3aW5kb3cubG9jYXRpb24pYGBcblx0ICAgICAqICAtIElFIDw9MTEgPT09IFwiW29iamVjdCBPYmplY3RdXCJcblx0ICAgICAqICAtIElFIEVkZ2UgPD0xMyA9PT0gXCJbb2JqZWN0IE9iamVjdF1cIlxuXHQgICAgICovXG5cdCAgICBpZiAodHlwZW9mIHdpbmRvdy5sb2NhdGlvbiA9PT0gJ29iamVjdCcgJiYgb2JqID09PSB3aW5kb3cubG9jYXRpb24pIHtcblx0ICAgICAgcmV0dXJuICdMb2NhdGlvbic7XG5cdCAgICB9XG5cblx0ICAgIC8qICEgU3BlYyBDb25mb3JtYW5jZVxuXHQgICAgICogKGh0dHBzOi8vaHRtbC5zcGVjLndoYXR3Zy5vcmcvI2RvY3VtZW50KVxuXHQgICAgICogV2hhdFdHIEhUTUwkMy4xLjEgLSBUaGUgYERvY3VtZW50YCBvYmplY3Rcblx0ICAgICAqIE5vdGU6IE1vc3QgYnJvd3NlcnMgY3VycmVudGx5IGFkaGVyIHRvIHRoZSBXM0MgRE9NIExldmVsIDIgc3BlY1xuXHQgICAgICogICAgICAgKGh0dHBzOi8vd3d3LnczLm9yZy9UUi9ET00tTGV2ZWwtMi1IVE1ML2h0bWwuaHRtbCNJRC0yNjgwOTI2OClcblx0ICAgICAqICAgICAgIHdoaWNoIHN1Z2dlc3RzIHRoYXQgYnJvd3NlcnMgc2hvdWxkIHVzZSBIVE1MVGFibGVDZWxsRWxlbWVudCBmb3Jcblx0ICAgICAqICAgICAgIGJvdGggVEQgYW5kIFRIIGVsZW1lbnRzLiBXaGF0V0cgc2VwYXJhdGVzIHRoZXNlLlxuXHQgICAgICogICAgICAgV2hhdFdHIEhUTUwgc3RhdGVzOlxuXHQgICAgICogICAgICAgICA+IEZvciBoaXN0b3JpY2FsIHJlYXNvbnMsIFdpbmRvdyBvYmplY3RzIG11c3QgYWxzbyBoYXZlIGFcblx0ICAgICAqICAgICAgICAgPiB3cml0YWJsZSwgY29uZmlndXJhYmxlLCBub24tZW51bWVyYWJsZSBwcm9wZXJ0eSBuYW1lZFxuXHQgICAgICogICAgICAgICA+IEhUTUxEb2N1bWVudCB3aG9zZSB2YWx1ZSBpcyB0aGUgRG9jdW1lbnQgaW50ZXJmYWNlIG9iamVjdC5cblx0ICAgICAqIFRlc3Q6IGBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZG9jdW1lbnQpYGBcblx0ICAgICAqICAtIENocm9tZSA9PT0gXCJbb2JqZWN0IEhUTUxEb2N1bWVudF1cIlxuXHQgICAgICogIC0gRmlyZWZveCA9PT0gXCJbb2JqZWN0IEhUTUxEb2N1bWVudF1cIlxuXHQgICAgICogIC0gU2FmYXJpID09PSBcIltvYmplY3QgSFRNTERvY3VtZW50XVwiXG5cdCAgICAgKiAgLSBJRSA8PTEwID09PSBcIltvYmplY3QgRG9jdW1lbnRdXCJcblx0ICAgICAqICAtIElFIDExID09PSBcIltvYmplY3QgSFRNTERvY3VtZW50XVwiXG5cdCAgICAgKiAgLSBJRSBFZGdlIDw9MTMgPT09IFwiW29iamVjdCBIVE1MRG9jdW1lbnRdXCJcblx0ICAgICAqL1xuXHQgICAgaWYgKHR5cGVvZiB3aW5kb3cuZG9jdW1lbnQgPT09ICdvYmplY3QnICYmIG9iaiA9PT0gd2luZG93LmRvY3VtZW50KSB7XG5cdCAgICAgIHJldHVybiAnRG9jdW1lbnQnO1xuXHQgICAgfVxuXG5cdCAgICBpZiAodHlwZW9mIHdpbmRvdy5uYXZpZ2F0b3IgPT09ICdvYmplY3QnKSB7XG5cdCAgICAgIC8qICEgU3BlYyBDb25mb3JtYW5jZVxuXHQgICAgICAgKiAoaHR0cHM6Ly9odG1sLnNwZWMud2hhdHdnLm9yZy9tdWx0aXBhZ2Uvd2ViYXBwYXBpcy5odG1sI21pbWV0eXBlYXJyYXkpXG5cdCAgICAgICAqIFdoYXRXRyBIVE1MJDguNi4xLjUgLSBQbHVnaW5zIC0gSW50ZXJmYWNlIE1pbWVUeXBlQXJyYXlcblx0ICAgICAgICogVGVzdDogYE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChuYXZpZ2F0b3IubWltZVR5cGVzKWBgXG5cdCAgICAgICAqICAtIElFIDw9MTAgPT09IFwiW29iamVjdCBNU01pbWVUeXBlc0NvbGxlY3Rpb25dXCJcblx0ICAgICAgICovXG5cdCAgICAgIGlmICh0eXBlb2Ygd2luZG93Lm5hdmlnYXRvci5taW1lVHlwZXMgPT09ICdvYmplY3QnICYmXG5cdCAgICAgICAgICBvYmogPT09IHdpbmRvdy5uYXZpZ2F0b3IubWltZVR5cGVzKSB7XG5cdCAgICAgICAgcmV0dXJuICdNaW1lVHlwZUFycmF5Jztcblx0ICAgICAgfVxuXG5cdCAgICAgIC8qICEgU3BlYyBDb25mb3JtYW5jZVxuXHQgICAgICAgKiAoaHR0cHM6Ly9odG1sLnNwZWMud2hhdHdnLm9yZy9tdWx0aXBhZ2Uvd2ViYXBwYXBpcy5odG1sI3BsdWdpbmFycmF5KVxuXHQgICAgICAgKiBXaGF0V0cgSFRNTCQ4LjYuMS41IC0gUGx1Z2lucyAtIEludGVyZmFjZSBQbHVnaW5BcnJheVxuXHQgICAgICAgKiBUZXN0OiBgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG5hdmlnYXRvci5wbHVnaW5zKWBgXG5cdCAgICAgICAqICAtIElFIDw9MTAgPT09IFwiW29iamVjdCBNU1BsdWdpbnNDb2xsZWN0aW9uXVwiXG5cdCAgICAgICAqL1xuXHQgICAgICBpZiAodHlwZW9mIHdpbmRvdy5uYXZpZ2F0b3IucGx1Z2lucyA9PT0gJ29iamVjdCcgJiZcblx0ICAgICAgICAgIG9iaiA9PT0gd2luZG93Lm5hdmlnYXRvci5wbHVnaW5zKSB7XG5cdCAgICAgICAgcmV0dXJuICdQbHVnaW5BcnJheSc7XG5cdCAgICAgIH1cblx0ICAgIH1cblxuXHQgICAgaWYgKCh0eXBlb2Ygd2luZG93LkhUTUxFbGVtZW50ID09PSAnZnVuY3Rpb24nIHx8XG5cdCAgICAgICAgdHlwZW9mIHdpbmRvdy5IVE1MRWxlbWVudCA9PT0gJ29iamVjdCcpICYmXG5cdCAgICAgICAgb2JqIGluc3RhbmNlb2Ygd2luZG93LkhUTUxFbGVtZW50KSB7XG5cdCAgICAgIC8qICEgU3BlYyBDb25mb3JtYW5jZVxuXHQgICAgICAqIChodHRwczovL2h0bWwuc3BlYy53aGF0d2cub3JnL211bHRpcGFnZS93ZWJhcHBhcGlzLmh0bWwjcGx1Z2luYXJyYXkpXG5cdCAgICAgICogV2hhdFdHIEhUTUwkNC40LjQgLSBUaGUgYGJsb2NrcXVvdGVgIGVsZW1lbnQgLSBJbnRlcmZhY2UgYEhUTUxRdW90ZUVsZW1lbnRgXG5cdCAgICAgICogVGVzdDogYE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdibG9ja3F1b3RlJykpYGBcblx0ICAgICAgKiAgLSBJRSA8PTEwID09PSBcIltvYmplY3QgSFRNTEJsb2NrRWxlbWVudF1cIlxuXHQgICAgICAqL1xuXHQgICAgICBpZiAob2JqLnRhZ05hbWUgPT09ICdCTE9DS1FVT1RFJykge1xuXHQgICAgICAgIHJldHVybiAnSFRNTFF1b3RlRWxlbWVudCc7XG5cdCAgICAgIH1cblxuXHQgICAgICAvKiAhIFNwZWMgQ29uZm9ybWFuY2Vcblx0ICAgICAgICogKGh0dHBzOi8vaHRtbC5zcGVjLndoYXR3Zy5vcmcvI2h0bWx0YWJsZWRhdGFjZWxsZWxlbWVudClcblx0ICAgICAgICogV2hhdFdHIEhUTUwkNC45LjkgLSBUaGUgYHRkYCBlbGVtZW50IC0gSW50ZXJmYWNlIGBIVE1MVGFibGVEYXRhQ2VsbEVsZW1lbnRgXG5cdCAgICAgICAqIE5vdGU6IE1vc3QgYnJvd3NlcnMgY3VycmVudGx5IGFkaGVyIHRvIHRoZSBXM0MgRE9NIExldmVsIDIgc3BlY1xuXHQgICAgICAgKiAgICAgICAoaHR0cHM6Ly93d3cudzMub3JnL1RSL0RPTS1MZXZlbC0yLUhUTUwvaHRtbC5odG1sI0lELTgyOTE1MDc1KVxuXHQgICAgICAgKiAgICAgICB3aGljaCBzdWdnZXN0cyB0aGF0IGJyb3dzZXJzIHNob3VsZCB1c2UgSFRNTFRhYmxlQ2VsbEVsZW1lbnQgZm9yXG5cdCAgICAgICAqICAgICAgIGJvdGggVEQgYW5kIFRIIGVsZW1lbnRzLiBXaGF0V0cgc2VwYXJhdGVzIHRoZXNlLlxuXHQgICAgICAgKiBUZXN0OiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGQnKSlcblx0ICAgICAgICogIC0gQ2hyb21lID09PSBcIltvYmplY3QgSFRNTFRhYmxlQ2VsbEVsZW1lbnRdXCJcblx0ICAgICAgICogIC0gRmlyZWZveCA9PT0gXCJbb2JqZWN0IEhUTUxUYWJsZUNlbGxFbGVtZW50XVwiXG5cdCAgICAgICAqICAtIFNhZmFyaSA9PT0gXCJbb2JqZWN0IEhUTUxUYWJsZUNlbGxFbGVtZW50XVwiXG5cdCAgICAgICAqL1xuXHQgICAgICBpZiAob2JqLnRhZ05hbWUgPT09ICdURCcpIHtcblx0ICAgICAgICByZXR1cm4gJ0hUTUxUYWJsZURhdGFDZWxsRWxlbWVudCc7XG5cdCAgICAgIH1cblxuXHQgICAgICAvKiAhIFNwZWMgQ29uZm9ybWFuY2Vcblx0ICAgICAgICogKGh0dHBzOi8vaHRtbC5zcGVjLndoYXR3Zy5vcmcvI2h0bWx0YWJsZWhlYWRlcmNlbGxlbGVtZW50KVxuXHQgICAgICAgKiBXaGF0V0cgSFRNTCQ0LjkuOSAtIFRoZSBgdGRgIGVsZW1lbnQgLSBJbnRlcmZhY2UgYEhUTUxUYWJsZUhlYWRlckNlbGxFbGVtZW50YFxuXHQgICAgICAgKiBOb3RlOiBNb3N0IGJyb3dzZXJzIGN1cnJlbnRseSBhZGhlciB0byB0aGUgVzNDIERPTSBMZXZlbCAyIHNwZWNcblx0ICAgICAgICogICAgICAgKGh0dHBzOi8vd3d3LnczLm9yZy9UUi9ET00tTGV2ZWwtMi1IVE1ML2h0bWwuaHRtbCNJRC04MjkxNTA3NSlcblx0ICAgICAgICogICAgICAgd2hpY2ggc3VnZ2VzdHMgdGhhdCBicm93c2VycyBzaG91bGQgdXNlIEhUTUxUYWJsZUNlbGxFbGVtZW50IGZvclxuXHQgICAgICAgKiAgICAgICBib3RoIFREIGFuZCBUSCBlbGVtZW50cy4gV2hhdFdHIHNlcGFyYXRlcyB0aGVzZS5cblx0ICAgICAgICogVGVzdDogT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RoJykpXG5cdCAgICAgICAqICAtIENocm9tZSA9PT0gXCJbb2JqZWN0IEhUTUxUYWJsZUNlbGxFbGVtZW50XVwiXG5cdCAgICAgICAqICAtIEZpcmVmb3ggPT09IFwiW29iamVjdCBIVE1MVGFibGVDZWxsRWxlbWVudF1cIlxuXHQgICAgICAgKiAgLSBTYWZhcmkgPT09IFwiW29iamVjdCBIVE1MVGFibGVDZWxsRWxlbWVudF1cIlxuXHQgICAgICAgKi9cblx0ICAgICAgaWYgKG9iai50YWdOYW1lID09PSAnVEgnKSB7XG5cdCAgICAgICAgcmV0dXJuICdIVE1MVGFibGVIZWFkZXJDZWxsRWxlbWVudCc7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9XG5cblx0ICAvKiAhIFNwZWVkIG9wdGltaXNhdGlvblxuXHQgICogUHJlOlxuXHQgICogICBGbG9hdDY0QXJyYXkgICAgICAgeCA2MjUsNjQ0IG9wcy9zZWMgwrExLjU4JSAoODAgcnVucyBzYW1wbGVkKVxuXHQgICogICBGbG9hdDMyQXJyYXkgICAgICAgeCAxLDI3OSw4NTIgb3BzL3NlYyDCsTIuOTElICg3NyBydW5zIHNhbXBsZWQpXG5cdCAgKiAgIFVpbnQzMkFycmF5ICAgICAgICB4IDEsMTc4LDE4NSBvcHMvc2VjIMKxMS45NSUgKDgzIHJ1bnMgc2FtcGxlZClcblx0ICAqICAgVWludDE2QXJyYXkgICAgICAgIHggMSwwMDgsMzgwIG9wcy9zZWMgwrEyLjI1JSAoODAgcnVucyBzYW1wbGVkKVxuXHQgICogICBVaW50OEFycmF5ICAgICAgICAgeCAxLDEyOCwwNDAgb3BzL3NlYyDCsTIuMTElICg4MSBydW5zIHNhbXBsZWQpXG5cdCAgKiAgIEludDMyQXJyYXkgICAgICAgICB4IDEsMTcwLDExOSBvcHMvc2VjIMKxMi44OCUgKDgwIHJ1bnMgc2FtcGxlZClcblx0ICAqICAgSW50MTZBcnJheSAgICAgICAgIHggMSwxNzYsMzQ4IG9wcy9zZWMgwrE1Ljc5JSAoODYgcnVucyBzYW1wbGVkKVxuXHQgICogICBJbnQ4QXJyYXkgICAgICAgICAgeCAxLDA1OCw3MDcgb3BzL3NlYyDCsTQuOTQlICg3NyBydW5zIHNhbXBsZWQpXG5cdCAgKiAgIFVpbnQ4Q2xhbXBlZEFycmF5ICB4IDEsMTEwLDYzMyBvcHMvc2VjIMKxNC4yMCUgKDgwIHJ1bnMgc2FtcGxlZClcblx0ICAqIFBvc3Q6XG5cdCAgKiAgIEZsb2F0NjRBcnJheSAgICAgICB4IDcsMTA1LDY3MSBvcHMvc2VjIMKxMTMuNDclICg2NCBydW5zIHNhbXBsZWQpXG5cdCAgKiAgIEZsb2F0MzJBcnJheSAgICAgICB4IDUsODg3LDkxMiBvcHMvc2VjIMKxMS40NiUgKDgyIHJ1bnMgc2FtcGxlZClcblx0ICAqICAgVWludDMyQXJyYXkgICAgICAgIHggNiw0OTEsNjYxIG9wcy9zZWMgwrExLjc2JSAoNzkgcnVucyBzYW1wbGVkKVxuXHQgICogICBVaW50MTZBcnJheSAgICAgICAgeCA2LDU1OSw3OTUgb3BzL3NlYyDCsTEuNjclICg4MiBydW5zIHNhbXBsZWQpXG5cdCAgKiAgIFVpbnQ4QXJyYXkgICAgICAgICB4IDYsNDYzLDk2NiBvcHMvc2VjIMKxMS40MyUgKDg1IHJ1bnMgc2FtcGxlZClcblx0ICAqICAgSW50MzJBcnJheSAgICAgICAgIHggNSw2NDEsODQxIG9wcy9zZWMgwrEzLjQ5JSAoODEgcnVucyBzYW1wbGVkKVxuXHQgICogICBJbnQxNkFycmF5ICAgICAgICAgeCA2LDU4Myw1MTEgb3BzL3NlYyDCsTEuOTglICg4MCBydW5zIHNhbXBsZWQpXG5cdCAgKiAgIEludDhBcnJheSAgICAgICAgICB4IDYsNjA2LDA3OCBvcHMvc2VjIMKxMS43NCUgKDgxIHJ1bnMgc2FtcGxlZClcblx0ICAqICAgVWludDhDbGFtcGVkQXJyYXkgIHggNiw2MDIsMjI0IG9wcy9zZWMgwrExLjc3JSAoODMgcnVucyBzYW1wbGVkKVxuXHQgICovXG5cdCAgdmFyIHN0cmluZ1RhZyA9IChzeW1ib2xUb1N0cmluZ1RhZ0V4aXN0cyAmJiBvYmpbU3ltYm9sLnRvU3RyaW5nVGFnXSk7XG5cdCAgaWYgKHR5cGVvZiBzdHJpbmdUYWcgPT09ICdzdHJpbmcnKSB7XG5cdCAgICByZXR1cm4gc3RyaW5nVGFnO1xuXHQgIH1cblxuXHQgIHZhciBvYmpQcm90b3R5cGUgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Yob2JqKTtcblx0ICAvKiAhIFNwZWVkIG9wdGltaXNhdGlvblxuXHQgICogUHJlOlxuXHQgICogICByZWdleCBsaXRlcmFsICAgICAgeCAxLDc3MiwzODUgb3BzL3NlYyDCsTEuODUlICg3NyBydW5zIHNhbXBsZWQpXG5cdCAgKiAgIHJlZ2V4IGNvbnN0cnVjdG9yICB4IDIsMTQzLDYzNCBvcHMvc2VjIMKxMi40NiUgKDc4IHJ1bnMgc2FtcGxlZClcblx0ICAqIFBvc3Q6XG5cdCAgKiAgIHJlZ2V4IGxpdGVyYWwgICAgICB4IDMsOTI4LDAwOSBvcHMvc2VjIMKxMC42NSUgKDc4IHJ1bnMgc2FtcGxlZClcblx0ICAqICAgcmVnZXggY29uc3RydWN0b3IgIHggMyw5MzEsMTA4IG9wcy9zZWMgwrEwLjU4JSAoODQgcnVucyBzYW1wbGVkKVxuXHQgICovXG5cdCAgaWYgKG9ialByb3RvdHlwZSA9PT0gUmVnRXhwLnByb3RvdHlwZSkge1xuXHQgICAgcmV0dXJuICdSZWdFeHAnO1xuXHQgIH1cblxuXHQgIC8qICEgU3BlZWQgb3B0aW1pc2F0aW9uXG5cdCAgKiBQcmU6XG5cdCAgKiAgIGRhdGUgICAgICAgICAgICAgICB4IDIsMTMwLDA3NCBvcHMvc2VjIMKxNC40MiUgKDY4IHJ1bnMgc2FtcGxlZClcblx0ICAqIFBvc3Q6XG5cdCAgKiAgIGRhdGUgICAgICAgICAgICAgICB4IDMsOTUzLDc3OSBvcHMvc2VjIMKxMS4zNSUgKDc3IHJ1bnMgc2FtcGxlZClcblx0ICAqL1xuXHQgIGlmIChvYmpQcm90b3R5cGUgPT09IERhdGUucHJvdG90eXBlKSB7XG5cdCAgICByZXR1cm4gJ0RhdGUnO1xuXHQgIH1cblxuXHQgIC8qICEgU3BlYyBDb25mb3JtYW5jZVxuXHQgICAqIChodHRwOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNi4wL2luZGV4Lmh0bWwjc2VjLXByb21pc2UucHJvdG90eXBlLUBAdG9zdHJpbmd0YWcpXG5cdCAgICogRVM2JDI1LjQuNS40IC0gUHJvbWlzZS5wcm90b3R5cGVbQEB0b1N0cmluZ1RhZ10gc2hvdWxkIGJlIFwiUHJvbWlzZVwiOlxuXHQgICAqIFRlc3Q6IGBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoUHJvbWlzZS5yZXNvbHZlKCkpYGBcblx0ICAgKiAgLSBDaHJvbWUgPD00NyA9PT0gXCJbb2JqZWN0IE9iamVjdF1cIlxuXHQgICAqICAtIEVkZ2UgPD0yMCA9PT0gXCJbb2JqZWN0IE9iamVjdF1cIlxuXHQgICAqICAtIEZpcmVmb3ggMjktTGF0ZXN0ID09PSBcIltvYmplY3QgUHJvbWlzZV1cIlxuXHQgICAqICAtIFNhZmFyaSA3LjEtTGF0ZXN0ID09PSBcIltvYmplY3QgUHJvbWlzZV1cIlxuXHQgICAqL1xuXHQgIGlmIChwcm9taXNlRXhpc3RzICYmIG9ialByb3RvdHlwZSA9PT0gUHJvbWlzZS5wcm90b3R5cGUpIHtcblx0ICAgIHJldHVybiAnUHJvbWlzZSc7XG5cdCAgfVxuXG5cdCAgLyogISBTcGVlZCBvcHRpbWlzYXRpb25cblx0ICAqIFByZTpcblx0ICAqICAgc2V0ICAgICAgICAgICAgICAgIHggMiwyMjIsMTg2IG9wcy9zZWMgwrExLjMxJSAoODIgcnVucyBzYW1wbGVkKVxuXHQgICogUG9zdDpcblx0ICAqICAgc2V0ICAgICAgICAgICAgICAgIHggNCw1NDUsODc5IG9wcy9zZWMgwrExLjEzJSAoODMgcnVucyBzYW1wbGVkKVxuXHQgICovXG5cdCAgaWYgKHNldEV4aXN0cyAmJiBvYmpQcm90b3R5cGUgPT09IFNldC5wcm90b3R5cGUpIHtcblx0ICAgIHJldHVybiAnU2V0Jztcblx0ICB9XG5cblx0ICAvKiAhIFNwZWVkIG9wdGltaXNhdGlvblxuXHQgICogUHJlOlxuXHQgICogICBtYXAgICAgICAgICAgICAgICAgeCAyLDM5Niw4NDIgb3BzL3NlYyDCsTEuNTklICg4MSBydW5zIHNhbXBsZWQpXG5cdCAgKiBQb3N0OlxuXHQgICogICBtYXAgICAgICAgICAgICAgICAgeCA0LDE4Myw5NDUgb3BzL3NlYyDCsTYuNTklICg4MiBydW5zIHNhbXBsZWQpXG5cdCAgKi9cblx0ICBpZiAobWFwRXhpc3RzICYmIG9ialByb3RvdHlwZSA9PT0gTWFwLnByb3RvdHlwZSkge1xuXHQgICAgcmV0dXJuICdNYXAnO1xuXHQgIH1cblxuXHQgIC8qICEgU3BlZWQgb3B0aW1pc2F0aW9uXG5cdCAgKiBQcmU6XG5cdCAgKiAgIHdlYWtzZXQgICAgICAgICAgICB4IDEsMzIzLDIyMCBvcHMvc2VjIMKxMi4xNyUgKDc2IHJ1bnMgc2FtcGxlZClcblx0ICAqIFBvc3Q6XG5cdCAgKiAgIHdlYWtzZXQgICAgICAgICAgICB4IDQsMjM3LDUxMCBvcHMvc2VjIMKxMi4wMSUgKDc3IHJ1bnMgc2FtcGxlZClcblx0ICAqL1xuXHQgIGlmICh3ZWFrU2V0RXhpc3RzICYmIG9ialByb3RvdHlwZSA9PT0gV2Vha1NldC5wcm90b3R5cGUpIHtcblx0ICAgIHJldHVybiAnV2Vha1NldCc7XG5cdCAgfVxuXG5cdCAgLyogISBTcGVlZCBvcHRpbWlzYXRpb25cblx0ICAqIFByZTpcblx0ICAqICAgd2Vha21hcCAgICAgICAgICAgIHggMSw1MDAsMjYwIG9wcy9zZWMgwrEyLjAyJSAoNzggcnVucyBzYW1wbGVkKVxuXHQgICogUG9zdDpcblx0ICAqICAgd2Vha21hcCAgICAgICAgICAgIHggMyw4ODEsMzg0IG9wcy9zZWMgwrExLjQ1JSAoODIgcnVucyBzYW1wbGVkKVxuXHQgICovXG5cdCAgaWYgKHdlYWtNYXBFeGlzdHMgJiYgb2JqUHJvdG90eXBlID09PSBXZWFrTWFwLnByb3RvdHlwZSkge1xuXHQgICAgcmV0dXJuICdXZWFrTWFwJztcblx0ICB9XG5cblx0ICAvKiAhIFNwZWMgQ29uZm9ybWFuY2Vcblx0ICAgKiAoaHR0cDovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzYuMC9pbmRleC5odG1sI3NlYy1kYXRhdmlldy5wcm90b3R5cGUtQEB0b3N0cmluZ3RhZylcblx0ICAgKiBFUzYkMjQuMi40LjIxIC0gRGF0YVZpZXcucHJvdG90eXBlW0BAdG9TdHJpbmdUYWddIHNob3VsZCBiZSBcIkRhdGFWaWV3XCI6XG5cdCAgICogVGVzdDogYE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChuZXcgRGF0YVZpZXcobmV3IEFycmF5QnVmZmVyKDEpKSlgYFxuXHQgICAqICAtIEVkZ2UgPD0xMyA9PT0gXCJbb2JqZWN0IE9iamVjdF1cIlxuXHQgICAqL1xuXHQgIGlmIChkYXRhVmlld0V4aXN0cyAmJiBvYmpQcm90b3R5cGUgPT09IERhdGFWaWV3LnByb3RvdHlwZSkge1xuXHQgICAgcmV0dXJuICdEYXRhVmlldyc7XG5cdCAgfVxuXG5cdCAgLyogISBTcGVjIENvbmZvcm1hbmNlXG5cdCAgICogKGh0dHA6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi82LjAvaW5kZXguaHRtbCNzZWMtJW1hcGl0ZXJhdG9ycHJvdG90eXBlJS1AQHRvc3RyaW5ndGFnKVxuXHQgICAqIEVTNiQyMy4xLjUuMi4yIC0gJU1hcEl0ZXJhdG9yUHJvdG90eXBlJVtAQHRvU3RyaW5nVGFnXSBzaG91bGQgYmUgXCJNYXAgSXRlcmF0b3JcIjpcblx0ICAgKiBUZXN0OiBgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG5ldyBNYXAoKS5lbnRyaWVzKCkpYGBcblx0ICAgKiAgLSBFZGdlIDw9MTMgPT09IFwiW29iamVjdCBPYmplY3RdXCJcblx0ICAgKi9cblx0ICBpZiAobWFwRXhpc3RzICYmIG9ialByb3RvdHlwZSA9PT0gbWFwSXRlcmF0b3JQcm90b3R5cGUpIHtcblx0ICAgIHJldHVybiAnTWFwIEl0ZXJhdG9yJztcblx0ICB9XG5cblx0ICAvKiAhIFNwZWMgQ29uZm9ybWFuY2Vcblx0ICAgKiAoaHR0cDovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzYuMC9pbmRleC5odG1sI3NlYy0lc2V0aXRlcmF0b3Jwcm90b3R5cGUlLUBAdG9zdHJpbmd0YWcpXG5cdCAgICogRVM2JDIzLjIuNS4yLjIgLSAlU2V0SXRlcmF0b3JQcm90b3R5cGUlW0BAdG9TdHJpbmdUYWddIHNob3VsZCBiZSBcIlNldCBJdGVyYXRvclwiOlxuXHQgICAqIFRlc3Q6IGBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobmV3IFNldCgpLmVudHJpZXMoKSlgYFxuXHQgICAqICAtIEVkZ2UgPD0xMyA9PT0gXCJbb2JqZWN0IE9iamVjdF1cIlxuXHQgICAqL1xuXHQgIGlmIChzZXRFeGlzdHMgJiYgb2JqUHJvdG90eXBlID09PSBzZXRJdGVyYXRvclByb3RvdHlwZSkge1xuXHQgICAgcmV0dXJuICdTZXQgSXRlcmF0b3InO1xuXHQgIH1cblxuXHQgIC8qICEgU3BlYyBDb25mb3JtYW5jZVxuXHQgICAqIChodHRwOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNi4wL2luZGV4Lmh0bWwjc2VjLSVhcnJheWl0ZXJhdG9ycHJvdG90eXBlJS1AQHRvc3RyaW5ndGFnKVxuXHQgICAqIEVTNiQyMi4xLjUuMi4yIC0gJUFycmF5SXRlcmF0b3JQcm90b3R5cGUlW0BAdG9TdHJpbmdUYWddIHNob3VsZCBiZSBcIkFycmF5IEl0ZXJhdG9yXCI6XG5cdCAgICogVGVzdDogYE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChbXVtTeW1ib2wuaXRlcmF0b3JdKCkpYGBcblx0ICAgKiAgLSBFZGdlIDw9MTMgPT09IFwiW29iamVjdCBPYmplY3RdXCJcblx0ICAgKi9cblx0ICBpZiAoYXJyYXlJdGVyYXRvckV4aXN0cyAmJiBvYmpQcm90b3R5cGUgPT09IGFycmF5SXRlcmF0b3JQcm90b3R5cGUpIHtcblx0ICAgIHJldHVybiAnQXJyYXkgSXRlcmF0b3InO1xuXHQgIH1cblxuXHQgIC8qICEgU3BlYyBDb25mb3JtYW5jZVxuXHQgICAqIChodHRwOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNi4wL2luZGV4Lmh0bWwjc2VjLSVzdHJpbmdpdGVyYXRvcnByb3RvdHlwZSUtQEB0b3N0cmluZ3RhZylcblx0ICAgKiBFUzYkMjEuMS41LjIuMiAtICVTdHJpbmdJdGVyYXRvclByb3RvdHlwZSVbQEB0b1N0cmluZ1RhZ10gc2hvdWxkIGJlIFwiU3RyaW5nIEl0ZXJhdG9yXCI6XG5cdCAgICogVGVzdDogYE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCgnJ1tTeW1ib2wuaXRlcmF0b3JdKCkpYGBcblx0ICAgKiAgLSBFZGdlIDw9MTMgPT09IFwiW29iamVjdCBPYmplY3RdXCJcblx0ICAgKi9cblx0ICBpZiAoc3RyaW5nSXRlcmF0b3JFeGlzdHMgJiYgb2JqUHJvdG90eXBlID09PSBzdHJpbmdJdGVyYXRvclByb3RvdHlwZSkge1xuXHQgICAgcmV0dXJuICdTdHJpbmcgSXRlcmF0b3InO1xuXHQgIH1cblxuXHQgIC8qICEgU3BlZWQgb3B0aW1pc2F0aW9uXG5cdCAgKiBQcmU6XG5cdCAgKiAgIG9iamVjdCBmcm9tIG51bGwgICB4IDIsNDI0LDMyMCBvcHMvc2VjIMKxMS42NyUgKDc2IHJ1bnMgc2FtcGxlZClcblx0ICAqIFBvc3Q6XG5cdCAgKiAgIG9iamVjdCBmcm9tIG51bGwgICB4IDUsODM4LDAwMCBvcHMvc2VjIMKxMC45OSUgKDg0IHJ1bnMgc2FtcGxlZClcblx0ICAqL1xuXHQgIGlmIChvYmpQcm90b3R5cGUgPT09IG51bGwpIHtcblx0ICAgIHJldHVybiAnT2JqZWN0Jztcblx0ICB9XG5cblx0ICByZXR1cm4gT2JqZWN0XG5cdCAgICAucHJvdG90eXBlXG5cdCAgICAudG9TdHJpbmdcblx0ICAgIC5jYWxsKG9iailcblx0ICAgIC5zbGljZSh0b1N0cmluZ0xlZnRTbGljZUxlbmd0aCwgdG9TdHJpbmdSaWdodFNsaWNlTGVuZ3RoKTtcblx0fVxuXG5cdHJldHVybiB0eXBlRGV0ZWN0O1xuXG5cdH0pKSk7XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIF9zbGljZWRUb0FycmF5KGFyciwgaSkge1xuXHQgIHJldHVybiBfYXJyYXlXaXRoSG9sZXMoYXJyKSB8fCBfaXRlcmFibGVUb0FycmF5TGltaXQoYXJyLCBpKSB8fCBfdW5zdXBwb3J0ZWRJdGVyYWJsZVRvQXJyYXkoYXJyLCBpKSB8fCBfbm9uSXRlcmFibGVSZXN0KCk7XG5cdH1cblxuXHRmdW5jdGlvbiBfYXJyYXlXaXRoSG9sZXMoYXJyKSB7XG5cdCAgaWYgKEFycmF5LmlzQXJyYXkoYXJyKSkgcmV0dXJuIGFycjtcblx0fVxuXG5cdGZ1bmN0aW9uIF9pdGVyYWJsZVRvQXJyYXlMaW1pdChhcnIsIGkpIHtcblx0ICBpZiAodHlwZW9mIFN5bWJvbCA9PT0gXCJ1bmRlZmluZWRcIiB8fCAhKFN5bWJvbC5pdGVyYXRvciBpbiBPYmplY3QoYXJyKSkpIHJldHVybjtcblx0ICB2YXIgX2FyciA9IFtdO1xuXHQgIHZhciBfbiA9IHRydWU7XG5cdCAgdmFyIF9kID0gZmFsc2U7XG5cdCAgdmFyIF9lID0gdW5kZWZpbmVkO1xuXG5cdCAgdHJ5IHtcblx0ICAgIGZvciAodmFyIF9pID0gYXJyW1N5bWJvbC5pdGVyYXRvcl0oKSwgX3M7ICEoX24gPSAoX3MgPSBfaS5uZXh0KCkpLmRvbmUpOyBfbiA9IHRydWUpIHtcblx0ICAgICAgX2Fyci5wdXNoKF9zLnZhbHVlKTtcblxuXHQgICAgICBpZiAoaSAmJiBfYXJyLmxlbmd0aCA9PT0gaSkgYnJlYWs7XG5cdCAgICB9XG5cdCAgfSBjYXRjaCAoZXJyKSB7XG5cdCAgICBfZCA9IHRydWU7XG5cdCAgICBfZSA9IGVycjtcblx0ICB9IGZpbmFsbHkge1xuXHQgICAgdHJ5IHtcblx0ICAgICAgaWYgKCFfbiAmJiBfaVtcInJldHVyblwiXSAhPSBudWxsKSBfaVtcInJldHVyblwiXSgpO1xuXHQgICAgfSBmaW5hbGx5IHtcblx0ICAgICAgaWYgKF9kKSB0aHJvdyBfZTtcblx0ICAgIH1cblx0ICB9XG5cblx0ICByZXR1cm4gX2Fycjtcblx0fVxuXG5cdGZ1bmN0aW9uIF91bnN1cHBvcnRlZEl0ZXJhYmxlVG9BcnJheShvLCBtaW5MZW4pIHtcblx0ICBpZiAoIW8pIHJldHVybjtcblx0ICBpZiAodHlwZW9mIG8gPT09IFwic3RyaW5nXCIpIHJldHVybiBfYXJyYXlMaWtlVG9BcnJheShvLCBtaW5MZW4pO1xuXHQgIHZhciBuID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pLnNsaWNlKDgsIC0xKTtcblx0ICBpZiAobiA9PT0gXCJPYmplY3RcIiAmJiBvLmNvbnN0cnVjdG9yKSBuID0gby5jb25zdHJ1Y3Rvci5uYW1lO1xuXHQgIGlmIChuID09PSBcIk1hcFwiIHx8IG4gPT09IFwiU2V0XCIpIHJldHVybiBBcnJheS5mcm9tKG4pO1xuXHQgIGlmIChuID09PSBcIkFyZ3VtZW50c1wiIHx8IC9eKD86VWl8SSludCg/Ojh8MTZ8MzIpKD86Q2xhbXBlZCk/QXJyYXkkLy50ZXN0KG4pKSByZXR1cm4gX2FycmF5TGlrZVRvQXJyYXkobywgbWluTGVuKTtcblx0fVxuXG5cdGZ1bmN0aW9uIF9hcnJheUxpa2VUb0FycmF5KGFyciwgbGVuKSB7XG5cdCAgaWYgKGxlbiA9PSBudWxsIHx8IGxlbiA+IGFyci5sZW5ndGgpIGxlbiA9IGFyci5sZW5ndGg7XG5cblx0ICBmb3IgKHZhciBpID0gMCwgYXJyMiA9IG5ldyBBcnJheShsZW4pOyBpIDwgbGVuOyBpKyspIGFycjJbaV0gPSBhcnJbaV07XG5cblx0ICByZXR1cm4gYXJyMjtcblx0fVxuXG5cdGZ1bmN0aW9uIF9ub25JdGVyYWJsZVJlc3QoKSB7XG5cdCAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkludmFsaWQgYXR0ZW1wdCB0byBkZXN0cnVjdHVyZSBub24taXRlcmFibGUgaW5zdGFuY2UuXFxuSW4gb3JkZXIgdG8gYmUgaXRlcmFibGUsIG5vbi1hcnJheSBvYmplY3RzIG11c3QgaGF2ZSBhIFtTeW1ib2wuaXRlcmF0b3JdKCkgbWV0aG9kLlwiKTtcblx0fVxuXG5cdHZhciBhbnNpQ29sb3JzID0ge1xuXHQgIGJvbGQ6IFsnMScsICcyMiddLFxuXHQgIGRpbTogWycyJywgJzIyJ10sXG5cdCAgaXRhbGljOiBbJzMnLCAnMjMnXSxcblx0ICB1bmRlcmxpbmU6IFsnNCcsICcyNCddLFxuXHQgIC8vIDUgJiA2IGFyZSBibGlua2luZ1xuXHQgIGludmVyc2U6IFsnNycsICcyNyddLFxuXHQgIGhpZGRlbjogWyc4JywgJzI4J10sXG5cdCAgc3RyaWtlOiBbJzknLCAnMjknXSxcblx0ICAvLyAxMC0yMCBhcmUgZm9udHNcblx0ICAvLyAyMS0yOSBhcmUgcmVzZXRzIGZvciAxLTlcblx0ICBibGFjazogWyczMCcsICczOSddLFxuXHQgIHJlZDogWyczMScsICczOSddLFxuXHQgIGdyZWVuOiBbJzMyJywgJzM5J10sXG5cdCAgeWVsbG93OiBbJzMzJywgJzM5J10sXG5cdCAgYmx1ZTogWyczNCcsICczOSddLFxuXHQgIG1hZ2VudGE6IFsnMzUnLCAnMzknXSxcblx0ICBjeWFuOiBbJzM2JywgJzM5J10sXG5cdCAgd2hpdGU6IFsnMzcnLCAnMzknXSxcblx0ICBicmlnaHRibGFjazogWyczMDsxJywgJzM5J10sXG5cdCAgYnJpZ2h0cmVkOiBbJzMxOzEnLCAnMzknXSxcblx0ICBicmlnaHRncmVlbjogWyczMjsxJywgJzM5J10sXG5cdCAgYnJpZ2h0eWVsbG93OiBbJzMzOzEnLCAnMzknXSxcblx0ICBicmlnaHRibHVlOiBbJzM0OzEnLCAnMzknXSxcblx0ICBicmlnaHRtYWdlbnRhOiBbJzM1OzEnLCAnMzknXSxcblx0ICBicmlnaHRjeWFuOiBbJzM2OzEnLCAnMzknXSxcblx0ICBicmlnaHR3aGl0ZTogWyczNzsxJywgJzM5J10sXG5cdCAgZ3JleTogWyc5MCcsICczOSddXG5cdH07XG5cdHZhciBzdHlsZXMgPSB7XG5cdCAgc3BlY2lhbDogJ2N5YW4nLFxuXHQgIG51bWJlcjogJ3llbGxvdycsXG5cdCAgYm9vbGVhbjogJ3llbGxvdycsXG5cdCAgdW5kZWZpbmVkOiAnZ3JleScsXG5cdCAgbnVsbDogJ2JvbGQnLFxuXHQgIHN0cmluZzogJ2dyZWVuJyxcblx0ICBzeW1ib2w6ICdncmVlbicsXG5cdCAgZGF0ZTogJ21hZ2VudGEnLFxuXHQgIHJlZ2V4cDogJ3JlZCdcblx0fTtcblx0dmFyIHRydW5jYXRvciA9ICfigKYnO1xuXG5cdGZ1bmN0aW9uIGNvbG9yaXNlKHZhbHVlLCBzdHlsZVR5cGUpIHtcblx0ICB2YXIgY29sb3IgPSBhbnNpQ29sb3JzW3N0eWxlc1tzdHlsZVR5cGVdXSB8fCBhbnNpQ29sb3JzW3N0eWxlVHlwZV07XG5cblx0ICBpZiAoIWNvbG9yKSB7XG5cdCAgICByZXR1cm4gU3RyaW5nKHZhbHVlKTtcblx0ICB9XG5cblx0ICByZXR1cm4gXCJcXHgxQltcIi5jb25jYXQoY29sb3JbMF0sIFwibVwiKS5jb25jYXQoU3RyaW5nKHZhbHVlKSwgXCJcXHgxQltcIikuY29uY2F0KGNvbG9yWzFdLCBcIm1cIik7XG5cdH1cblxuXHRmdW5jdGlvbiBub3JtYWxpc2VPcHRpb25zKCkge1xuXHQgIHZhciBfcmVmID0gYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgYXJndW1lbnRzWzBdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMF0gOiB7fSxcblx0ICAgICAgX3JlZiRzaG93SGlkZGVuID0gX3JlZi5zaG93SGlkZGVuLFxuXHQgICAgICBzaG93SGlkZGVuID0gX3JlZiRzaG93SGlkZGVuID09PSB2b2lkIDAgPyBmYWxzZSA6IF9yZWYkc2hvd0hpZGRlbixcblx0ICAgICAgX3JlZiRkZXB0aCA9IF9yZWYuZGVwdGgsXG5cdCAgICAgIGRlcHRoID0gX3JlZiRkZXB0aCA9PT0gdm9pZCAwID8gMiA6IF9yZWYkZGVwdGgsXG5cdCAgICAgIF9yZWYkY29sb3JzID0gX3JlZi5jb2xvcnMsXG5cdCAgICAgIGNvbG9ycyA9IF9yZWYkY29sb3JzID09PSB2b2lkIDAgPyBmYWxzZSA6IF9yZWYkY29sb3JzLFxuXHQgICAgICBfcmVmJGN1c3RvbUluc3BlY3QgPSBfcmVmLmN1c3RvbUluc3BlY3QsXG5cdCAgICAgIGN1c3RvbUluc3BlY3QgPSBfcmVmJGN1c3RvbUluc3BlY3QgPT09IHZvaWQgMCA/IHRydWUgOiBfcmVmJGN1c3RvbUluc3BlY3QsXG5cdCAgICAgIF9yZWYkc2hvd1Byb3h5ID0gX3JlZi5zaG93UHJveHksXG5cdCAgICAgIHNob3dQcm94eSA9IF9yZWYkc2hvd1Byb3h5ID09PSB2b2lkIDAgPyBmYWxzZSA6IF9yZWYkc2hvd1Byb3h5LFxuXHQgICAgICBfcmVmJG1heEFycmF5TGVuZ3RoID0gX3JlZi5tYXhBcnJheUxlbmd0aCxcblx0ICAgICAgbWF4QXJyYXlMZW5ndGggPSBfcmVmJG1heEFycmF5TGVuZ3RoID09PSB2b2lkIDAgPyBJbmZpbml0eSA6IF9yZWYkbWF4QXJyYXlMZW5ndGgsXG5cdCAgICAgIF9yZWYkYnJlYWtMZW5ndGggPSBfcmVmLmJyZWFrTGVuZ3RoLFxuXHQgICAgICBicmVha0xlbmd0aCA9IF9yZWYkYnJlYWtMZW5ndGggPT09IHZvaWQgMCA/IEluZmluaXR5IDogX3JlZiRicmVha0xlbmd0aCxcblx0ICAgICAgX3JlZiRzZWVuID0gX3JlZi5zZWVuLFxuXHQgICAgICBzZWVuID0gX3JlZiRzZWVuID09PSB2b2lkIDAgPyBbXSA6IF9yZWYkc2Vlbixcblx0ICAgICAgX3JlZiR0cnVuY2F0ZSA9IF9yZWYudHJ1bmNhdGUsXG5cdCAgICAgIHRydW5jYXRlID0gX3JlZiR0cnVuY2F0ZSA9PT0gdm9pZCAwID8gSW5maW5pdHkgOiBfcmVmJHRydW5jYXRlLFxuXHQgICAgICBfcmVmJHN0eWxpemUgPSBfcmVmLnN0eWxpemUsXG5cdCAgICAgIHN0eWxpemUgPSBfcmVmJHN0eWxpemUgPT09IHZvaWQgMCA/IFN0cmluZyA6IF9yZWYkc3R5bGl6ZTtcblxuXHQgIHZhciBvcHRpb25zID0ge1xuXHQgICAgc2hvd0hpZGRlbjogQm9vbGVhbihzaG93SGlkZGVuKSxcblx0ICAgIGRlcHRoOiBOdW1iZXIoZGVwdGgpLFxuXHQgICAgY29sb3JzOiBCb29sZWFuKGNvbG9ycyksXG5cdCAgICBjdXN0b21JbnNwZWN0OiBCb29sZWFuKGN1c3RvbUluc3BlY3QpLFxuXHQgICAgc2hvd1Byb3h5OiBCb29sZWFuKHNob3dQcm94eSksXG5cdCAgICBtYXhBcnJheUxlbmd0aDogTnVtYmVyKG1heEFycmF5TGVuZ3RoKSxcblx0ICAgIGJyZWFrTGVuZ3RoOiBOdW1iZXIoYnJlYWtMZW5ndGgpLFxuXHQgICAgdHJ1bmNhdGU6IE51bWJlcih0cnVuY2F0ZSksXG5cdCAgICBzZWVuOiBzZWVuLFxuXHQgICAgc3R5bGl6ZTogc3R5bGl6ZVxuXHQgIH07XG5cblx0ICBpZiAob3B0aW9ucy5jb2xvcnMpIHtcblx0ICAgIG9wdGlvbnMuc3R5bGl6ZSA9IGNvbG9yaXNlO1xuXHQgIH1cblxuXHQgIHJldHVybiBvcHRpb25zO1xuXHR9XG5cdGZ1bmN0aW9uIHRydW5jYXRlKHN0cmluZywgbGVuZ3RoKSB7XG5cdCAgdmFyIHRhaWwgPSBhcmd1bWVudHMubGVuZ3RoID4gMiAmJiBhcmd1bWVudHNbMl0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1syXSA6IHRydW5jYXRvcjtcblx0ICBzdHJpbmcgPSBTdHJpbmcoc3RyaW5nKTtcblx0ICB2YXIgdGFpbExlbmd0aCA9IHRhaWwubGVuZ3RoO1xuXHQgIHZhciBzdHJpbmdMZW5ndGggPSBzdHJpbmcubGVuZ3RoO1xuXG5cdCAgaWYgKHRhaWxMZW5ndGggPiBsZW5ndGggJiYgc3RyaW5nTGVuZ3RoID4gdGFpbExlbmd0aCkge1xuXHQgICAgcmV0dXJuIHRhaWw7XG5cdCAgfVxuXG5cdCAgaWYgKHN0cmluZ0xlbmd0aCA+IGxlbmd0aCAmJiBzdHJpbmdMZW5ndGggPiB0YWlsTGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gXCJcIi5jb25jYXQoc3RyaW5nLnNsaWNlKDAsIGxlbmd0aCAtIHRhaWxMZW5ndGgpKS5jb25jYXQodGFpbCk7XG5cdCAgfVxuXG5cdCAgcmV0dXJuIHN0cmluZztcblx0fSAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgY29tcGxleGl0eVxuXG5cdGZ1bmN0aW9uIGluc3BlY3RMaXN0KGxpc3QsIG9wdGlvbnMsIGluc3BlY3RJdGVtKSB7XG5cdCAgdmFyIHNlcGFyYXRvciA9IGFyZ3VtZW50cy5sZW5ndGggPiAzICYmIGFyZ3VtZW50c1szXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzNdIDogJywgJztcblx0ICBpbnNwZWN0SXRlbSA9IGluc3BlY3RJdGVtIHx8IG9wdGlvbnMuaW5zcGVjdDtcblx0ICB2YXIgc2l6ZSA9IGxpc3QubGVuZ3RoO1xuXHQgIGlmIChzaXplID09PSAwKSByZXR1cm4gJyc7XG5cdCAgdmFyIG9yaWdpbmFsTGVuZ3RoID0gb3B0aW9ucy50cnVuY2F0ZTtcblx0ICB2YXIgb3V0cHV0ID0gJyc7XG5cdCAgdmFyIHBlZWsgPSAnJztcblx0ICB2YXIgdHJ1bmNhdGVkID0gJyc7XG5cblx0ICBmb3IgKHZhciBpID0gMDsgaSA8IHNpemU7IGkgKz0gMSkge1xuXHQgICAgdmFyIGxhc3QgPSBpICsgMSA9PT0gbGlzdC5sZW5ndGg7XG5cdCAgICB2YXIgc2Vjb25kVG9MYXN0ID0gaSArIDIgPT09IGxpc3QubGVuZ3RoO1xuXHQgICAgdHJ1bmNhdGVkID0gXCJcIi5jb25jYXQodHJ1bmNhdG9yLCBcIihcIikuY29uY2F0KGxpc3QubGVuZ3RoIC0gaSwgXCIpXCIpO1xuXHQgICAgdmFyIHZhbHVlID0gbGlzdFtpXTsgLy8gSWYgdGhlcmUgaXMgbW9yZSB0aGFuIG9uZSByZW1haW5pbmcgd2UgbmVlZCB0byBhY2NvdW50IGZvciBhIHNlcGFyYXRvciBvZiBgLCBgXG5cblx0ICAgIG9wdGlvbnMudHJ1bmNhdGUgPSBvcmlnaW5hbExlbmd0aCAtIG91dHB1dC5sZW5ndGggLSAobGFzdCA/IDAgOiBzZXBhcmF0b3IubGVuZ3RoKTtcblx0ICAgIHZhciBzdHJpbmcgPSBwZWVrIHx8IGluc3BlY3RJdGVtKHZhbHVlLCBvcHRpb25zKSArIChsYXN0ID8gJycgOiBzZXBhcmF0b3IpO1xuXHQgICAgdmFyIG5leHRMZW5ndGggPSBvdXRwdXQubGVuZ3RoICsgc3RyaW5nLmxlbmd0aDtcblx0ICAgIHZhciB0cnVuY2F0ZWRMZW5ndGggPSBuZXh0TGVuZ3RoICsgdHJ1bmNhdGVkLmxlbmd0aDsgLy8gSWYgdGhpcyBpcyB0aGUgbGFzdCBlbGVtZW50LCBhbmQgYWRkaW5nIGl0IHdvdWxkXG5cdCAgICAvLyB0YWtlIHVzIG92ZXIgbGVuZ3RoLCBidXQgYWRkaW5nIHRoZSB0cnVuY2F0b3Igd291bGRuJ3QgLSB0aGVuIGJyZWFrIG5vd1xuXG5cdCAgICBpZiAobGFzdCAmJiBuZXh0TGVuZ3RoID4gb3JpZ2luYWxMZW5ndGggJiYgb3V0cHV0Lmxlbmd0aCArIHRydW5jYXRlZC5sZW5ndGggPD0gb3JpZ2luYWxMZW5ndGgpIHtcblx0ICAgICAgYnJlYWs7XG5cdCAgICB9IC8vIElmIHRoaXMgaXNuJ3QgdGhlIGxhc3Qgb3Igc2Vjb25kIHRvIGxhc3QgZWxlbWVudCB0byBzY2FuLFxuXHQgICAgLy8gYnV0IHRoZSBzdHJpbmcgaXMgYWxyZWFkeSBvdmVyIGxlbmd0aCB0aGVuIGJyZWFrIGhlcmVcblxuXG5cdCAgICBpZiAoIWxhc3QgJiYgIXNlY29uZFRvTGFzdCAmJiB0cnVuY2F0ZWRMZW5ndGggPiBvcmlnaW5hbExlbmd0aCkge1xuXHQgICAgICBicmVhaztcblx0ICAgIH0gLy8gUGVlayBhdCB0aGUgbmV4dCBzdHJpbmcgdG8gZGV0ZXJtaW5lIGlmIHdlIHNob3VsZFxuXHQgICAgLy8gYnJlYWsgZWFybHkgYmVmb3JlIGFkZGluZyB0aGlzIGl0ZW0gdG8gdGhlIG91dHB1dFxuXG5cblx0ICAgIHBlZWsgPSBsYXN0ID8gJycgOiBpbnNwZWN0SXRlbShsaXN0W2kgKyAxXSwgb3B0aW9ucykgKyAoc2Vjb25kVG9MYXN0ID8gJycgOiBzZXBhcmF0b3IpOyAvLyBJZiB3ZSBoYXZlIG9uZSBlbGVtZW50IGxlZnQsIGJ1dCB0aGlzIGVsZW1lbnQgYW5kXG5cdCAgICAvLyB0aGUgbmV4dCB0YWtlcyBvdmVyIGxlbmd0aCwgdGhlIGJyZWFrIGVhcmx5XG5cblx0ICAgIGlmICghbGFzdCAmJiBzZWNvbmRUb0xhc3QgJiYgdHJ1bmNhdGVkTGVuZ3RoID4gb3JpZ2luYWxMZW5ndGggJiYgbmV4dExlbmd0aCArIHBlZWsubGVuZ3RoID4gb3JpZ2luYWxMZW5ndGgpIHtcblx0ICAgICAgYnJlYWs7XG5cdCAgICB9XG5cblx0ICAgIG91dHB1dCArPSBzdHJpbmc7IC8vIElmIHRoZSBuZXh0IGVsZW1lbnQgdGFrZXMgdXMgdG8gbGVuZ3RoIC1cblx0ICAgIC8vIGJ1dCB0aGVyZSBhcmUgbW9yZSBhZnRlciB0aGF0LCB0aGVuIHdlIHNob3VsZCB0cnVuY2F0ZSBub3dcblxuXHQgICAgaWYgKCFsYXN0ICYmICFzZWNvbmRUb0xhc3QgJiYgbmV4dExlbmd0aCArIHBlZWsubGVuZ3RoID49IG9yaWdpbmFsTGVuZ3RoKSB7XG5cdCAgICAgIHRydW5jYXRlZCA9IFwiXCIuY29uY2F0KHRydW5jYXRvciwgXCIoXCIpLmNvbmNhdChsaXN0Lmxlbmd0aCAtIGkgLSAxLCBcIilcIik7XG5cdCAgICAgIGJyZWFrO1xuXHQgICAgfVxuXG5cdCAgICB0cnVuY2F0ZWQgPSAnJztcblx0ICB9XG5cblx0ICByZXR1cm4gXCJcIi5jb25jYXQob3V0cHV0KS5jb25jYXQodHJ1bmNhdGVkKTtcblx0fVxuXHRmdW5jdGlvbiBpbnNwZWN0UHJvcGVydHkoX3JlZjIsIG9wdGlvbnMpIHtcblx0ICB2YXIgX3JlZjMgPSBfc2xpY2VkVG9BcnJheShfcmVmMiwgMiksXG5cdCAgICAgIGtleSA9IF9yZWYzWzBdLFxuXHQgICAgICB2YWx1ZSA9IF9yZWYzWzFdO1xuXG5cdCAgb3B0aW9ucy50cnVuY2F0ZSAtPSAyO1xuXG5cdCAgaWYgKHR5cGVvZiBrZXkgIT09ICdzdHJpbmcnICYmIHR5cGVvZiBrZXkgIT09ICdudW1iZXInKSB7XG5cdCAgICBrZXkgPSBcIltcIi5jb25jYXQob3B0aW9ucy5pbnNwZWN0KGtleSwgb3B0aW9ucyksIFwiXVwiKTtcblx0ICB9XG5cblx0ICBvcHRpb25zLnRydW5jYXRlIC09IGtleS5sZW5ndGg7XG5cdCAgdmFsdWUgPSBvcHRpb25zLmluc3BlY3QodmFsdWUsIG9wdGlvbnMpO1xuXHQgIHJldHVybiBcIlwiLmNvbmNhdChrZXksIFwiOiBcIikuY29uY2F0KHZhbHVlKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGluc3BlY3RBcnJheShhcnJheSwgb3B0aW9ucykge1xuXHQgIC8vIE9iamVjdC5rZXlzIHdpbGwgYWx3YXlzIG91dHB1dCB0aGUgQXJyYXkgaW5kaWNlcyBmaXJzdCwgc28gd2UgY2FuIHNsaWNlIGJ5XG5cdCAgLy8gYGFycmF5Lmxlbmd0aGAgdG8gZ2V0IG5vbi1pbmRleCBwcm9wZXJ0aWVzXG5cdCAgdmFyIG5vbkluZGV4UHJvcGVydGllcyA9IE9iamVjdC5rZXlzKGFycmF5KS5zbGljZShhcnJheS5sZW5ndGgpO1xuXHQgIGlmICghYXJyYXkubGVuZ3RoICYmICFub25JbmRleFByb3BlcnRpZXMubGVuZ3RoKSByZXR1cm4gJ1tdJztcblx0ICBvcHRpb25zLnRydW5jYXRlIC09IDQ7XG5cdCAgdmFyIGxpc3RDb250ZW50cyA9IGluc3BlY3RMaXN0KGFycmF5LCBvcHRpb25zKTtcblx0ICBvcHRpb25zLnRydW5jYXRlIC09IGxpc3RDb250ZW50cy5sZW5ndGg7XG5cdCAgdmFyIHByb3BlcnR5Q29udGVudHMgPSAnJztcblxuXHQgIGlmIChub25JbmRleFByb3BlcnRpZXMubGVuZ3RoKSB7XG5cdCAgICBwcm9wZXJ0eUNvbnRlbnRzID0gaW5zcGVjdExpc3Qobm9uSW5kZXhQcm9wZXJ0aWVzLm1hcChmdW5jdGlvbiAoa2V5KSB7XG5cdCAgICAgIHJldHVybiBba2V5LCBhcnJheVtrZXldXTtcblx0ICAgIH0pLCBvcHRpb25zLCBpbnNwZWN0UHJvcGVydHkpO1xuXHQgIH1cblxuXHQgIHJldHVybiBcIlsgXCIuY29uY2F0KGxpc3RDb250ZW50cykuY29uY2F0KHByb3BlcnR5Q29udGVudHMgPyBcIiwgXCIuY29uY2F0KHByb3BlcnR5Q29udGVudHMpIDogJycsIFwiIF1cIik7XG5cdH1cblxuXHQvKiAhXG5cdCAqIENoYWkgLSBnZXRGdW5jTmFtZSB1dGlsaXR5XG5cdCAqIENvcHlyaWdodChjKSAyMDEyLTIwMTYgSmFrZSBMdWVyIDxqYWtlQGFsb2dpY2FscGFyYWRveC5jb20+XG5cdCAqIE1JVCBMaWNlbnNlZFxuXHQgKi9cblxuXHQvKipcblx0ICogIyMjIC5nZXRGdW5jTmFtZShjb25zdHJ1Y3RvckZuKVxuXHQgKlxuXHQgKiBSZXR1cm5zIHRoZSBuYW1lIG9mIGEgZnVuY3Rpb24uXG5cdCAqIFdoZW4gYSBub24tZnVuY3Rpb24gaW5zdGFuY2UgaXMgcGFzc2VkLCByZXR1cm5zIGBudWxsYC5cblx0ICogVGhpcyBhbHNvIGluY2x1ZGVzIGEgcG9seWZpbGwgZnVuY3Rpb24gaWYgYGFGdW5jLm5hbWVgIGlzIG5vdCBkZWZpbmVkLlxuXHQgKlxuXHQgKiBAbmFtZSBnZXRGdW5jTmFtZVxuXHQgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jdFxuXHQgKiBAbmFtZXNwYWNlIFV0aWxzXG5cdCAqIEBhcGkgcHVibGljXG5cdCAqL1xuXG5cdHZhciB0b1N0cmluZyA9IEZ1bmN0aW9uLnByb3RvdHlwZS50b1N0cmluZztcblx0dmFyIGZ1bmN0aW9uTmFtZU1hdGNoID0gL1xccypmdW5jdGlvbig/Olxcc3xcXHMqXFwvXFwqW14oPzoqXFwvKV0rXFwqXFwvXFxzKikqKFteXFxzXFwoXFwvXSspLztcblx0ZnVuY3Rpb24gZ2V0RnVuY05hbWUoYUZ1bmMpIHtcblx0ICBpZiAodHlwZW9mIGFGdW5jICE9PSAnZnVuY3Rpb24nKSB7XG5cdCAgICByZXR1cm4gbnVsbDtcblx0ICB9XG5cblx0ICB2YXIgbmFtZSA9ICcnO1xuXHQgIGlmICh0eXBlb2YgRnVuY3Rpb24ucHJvdG90eXBlLm5hbWUgPT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBhRnVuYy5uYW1lID09PSAndW5kZWZpbmVkJykge1xuXHQgICAgLy8gSGVyZSB3ZSBydW4gYSBwb2x5ZmlsbCBpZiBGdW5jdGlvbiBkb2VzIG5vdCBzdXBwb3J0IHRoZSBgbmFtZWAgcHJvcGVydHkgYW5kIGlmIGFGdW5jLm5hbWUgaXMgbm90IGRlZmluZWRcblx0ICAgIHZhciBtYXRjaCA9IHRvU3RyaW5nLmNhbGwoYUZ1bmMpLm1hdGNoKGZ1bmN0aW9uTmFtZU1hdGNoKTtcblx0ICAgIGlmIChtYXRjaCkge1xuXHQgICAgICBuYW1lID0gbWF0Y2hbMV07XG5cdCAgICB9XG5cdCAgfSBlbHNlIHtcblx0ICAgIC8vIElmIHdlJ3ZlIGdvdCBhIGBuYW1lYCBwcm9wZXJ0eSB3ZSBqdXN0IHVzZSBpdFxuXHQgICAgbmFtZSA9IGFGdW5jLm5hbWU7XG5cdCAgfVxuXG5cdCAgcmV0dXJuIG5hbWU7XG5cdH1cblxuXHR2YXIgZ2V0RnVuY05hbWVfMSA9IGdldEZ1bmNOYW1lO1xuXG5cdHZhciB0b1N0cmluZ1RhZyA9IHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZyA/IFN5bWJvbC50b1N0cmluZ1RhZyA6IGZhbHNlO1xuXG5cdHZhciBnZXRBcnJheU5hbWUgPSBmdW5jdGlvbiBnZXRBcnJheU5hbWUoYXJyYXkpIHtcblx0ICAvLyBXZSBuZWVkIHRvIHNwZWNpYWwgY2FzZSBOb2RlLmpzJyBCdWZmZXJzLCB3aGljaCByZXBvcnQgdG8gYmUgVWludDhBcnJheVxuXHQgIGlmICh0eXBlb2YgQnVmZmVyID09PSAnZnVuY3Rpb24nICYmIGFycmF5IGluc3RhbmNlb2YgQnVmZmVyKSB7XG5cdCAgICByZXR1cm4gJ0J1ZmZlcic7XG5cdCAgfVxuXG5cdCAgaWYgKHRvU3RyaW5nVGFnICYmIHRvU3RyaW5nVGFnIGluIGFycmF5KSB7XG5cdCAgICByZXR1cm4gYXJyYXlbdG9TdHJpbmdUYWddO1xuXHQgIH1cblxuXHQgIHJldHVybiBnZXRGdW5jTmFtZV8xKGFycmF5LmNvbnN0cnVjdG9yKTtcblx0fTtcblxuXHRmdW5jdGlvbiBpbnNwZWN0VHlwZWRBcnJheShhcnJheSwgb3B0aW9ucykge1xuXHQgIHZhciBuYW1lID0gZ2V0QXJyYXlOYW1lKGFycmF5KTtcblx0ICBvcHRpb25zLnRydW5jYXRlIC09IG5hbWUubGVuZ3RoICsgNDsgLy8gT2JqZWN0LmtleXMgd2lsbCBhbHdheXMgb3V0cHV0IHRoZSBBcnJheSBpbmRpY2VzIGZpcnN0LCBzbyB3ZSBjYW4gc2xpY2UgYnlcblx0ICAvLyBgYXJyYXkubGVuZ3RoYCB0byBnZXQgbm9uLWluZGV4IHByb3BlcnRpZXNcblxuXHQgIHZhciBub25JbmRleFByb3BlcnRpZXMgPSBPYmplY3Qua2V5cyhhcnJheSkuc2xpY2UoYXJyYXkubGVuZ3RoKTtcblx0ICBpZiAoIWFycmF5Lmxlbmd0aCAmJiAhbm9uSW5kZXhQcm9wZXJ0aWVzLmxlbmd0aCkgcmV0dXJuIFwiXCIuY29uY2F0KG5hbWUsIFwiW11cIik7IC8vIEFzIHdlIGtub3cgVHlwZWRBcnJheXMgb25seSBjb250YWluIFVuc2lnbmVkIEludGVnZXJzLCB3ZSBjYW4gc2tpcCBpbnNwZWN0aW5nIGVhY2ggb25lIGFuZCBzaW1wbHlcblx0ICAvLyBzdHlsaXNlIHRoZSB0b1N0cmluZygpIHZhbHVlIG9mIHRoZW1cblxuXHQgIHZhciBvdXRwdXQgPSAnJztcblxuXHQgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcblx0ICAgIHZhciBzdHJpbmcgPSBcIlwiLmNvbmNhdChvcHRpb25zLnN0eWxpemUodHJ1bmNhdGUoYXJyYXlbaV0sIG9wdGlvbnMudHJ1bmNhdGUpLCAnbnVtYmVyJykpLmNvbmNhdChhcnJheVtpXSA9PT0gYXJyYXkubGVuZ3RoID8gJycgOiAnLCAnKTtcblx0ICAgIG9wdGlvbnMudHJ1bmNhdGUgLT0gc3RyaW5nLmxlbmd0aDtcblxuXHQgICAgaWYgKGFycmF5W2ldICE9PSBhcnJheS5sZW5ndGggJiYgb3B0aW9ucy50cnVuY2F0ZSA8PSAzKSB7XG5cdCAgICAgIG91dHB1dCArPSBcIlwiLmNvbmNhdCh0cnVuY2F0b3IsIFwiKFwiKS5jb25jYXQoYXJyYXkubGVuZ3RoIC0gYXJyYXlbaV0gKyAxLCBcIilcIik7XG5cdCAgICAgIGJyZWFrO1xuXHQgICAgfVxuXG5cdCAgICBvdXRwdXQgKz0gc3RyaW5nO1xuXHQgIH1cblxuXHQgIHZhciBwcm9wZXJ0eUNvbnRlbnRzID0gJyc7XG5cblx0ICBpZiAobm9uSW5kZXhQcm9wZXJ0aWVzLmxlbmd0aCkge1xuXHQgICAgcHJvcGVydHlDb250ZW50cyA9IGluc3BlY3RMaXN0KG5vbkluZGV4UHJvcGVydGllcy5tYXAoZnVuY3Rpb24gKGtleSkge1xuXHQgICAgICByZXR1cm4gW2tleSwgYXJyYXlba2V5XV07XG5cdCAgICB9KSwgb3B0aW9ucywgaW5zcGVjdFByb3BlcnR5KTtcblx0ICB9XG5cblx0ICByZXR1cm4gXCJcIi5jb25jYXQobmFtZSwgXCJbIFwiKS5jb25jYXQob3V0cHV0KS5jb25jYXQocHJvcGVydHlDb250ZW50cyA/IFwiLCBcIi5jb25jYXQocHJvcGVydHlDb250ZW50cykgOiAnJywgXCIgXVwiKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGluc3BlY3REYXRlKGRhdGVPYmplY3QsIG9wdGlvbnMpIHtcblx0ICAvLyBJZiB3ZSBuZWVkIHRvIC0gdHJ1bmNhdGUgdGhlIHRpbWUgcG9ydGlvbiwgYnV0IG5ldmVyIHRoZSBkYXRlXG5cdCAgdmFyIHNwbGl0ID0gZGF0ZU9iamVjdC50b0pTT04oKS5zcGxpdCgnVCcpO1xuXHQgIHZhciBkYXRlID0gc3BsaXRbMF07XG5cdCAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZShcIlwiLmNvbmNhdChkYXRlLCBcIlRcIikuY29uY2F0KHRydW5jYXRlKHNwbGl0WzFdLCBvcHRpb25zLnRydW5jYXRlIC0gZGF0ZS5sZW5ndGggLSAxKSksICdkYXRlJyk7XG5cdH1cblxuXHR2YXIgdG9TdHJpbmckMSA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cblx0dmFyIGdldEZ1bmN0aW9uTmFtZSA9IGZ1bmN0aW9uKGZuKSB7XG5cdCAgaWYgKHRvU3RyaW5nJDEuY2FsbChmbikgIT09ICdbb2JqZWN0IEZ1bmN0aW9uXScpIHJldHVybiBudWxsXG5cdCAgaWYgKGZuLm5hbWUpIHJldHVybiBmbi5uYW1lXG5cdCAgdmFyIG5hbWUgPSAvXlxccypmdW5jdGlvblxccyooW15cXChdKikvaW0uZXhlYyhmbi50b1N0cmluZygpKVsxXTtcblx0ICByZXR1cm4gbmFtZSB8fCAnYW5vbnltb3VzJ1xuXHR9O1xuXG5cdGZ1bmN0aW9uIGluc3BlY3RGdW5jdGlvbihmdW5jLCBvcHRpb25zKSB7XG5cdCAgdmFyIG5hbWUgPSBnZXRGdW5jdGlvbk5hbWUoZnVuYyk7XG5cblx0ICBpZiAobmFtZSA9PT0gJ2Fub255bW91cycpIHtcblx0ICAgIHJldHVybiBvcHRpb25zLnN0eWxpemUoJ1tGdW5jdGlvbl0nLCAnc3BlY2lhbCcpO1xuXHQgIH1cblxuXHQgIHJldHVybiBvcHRpb25zLnN0eWxpemUoXCJbRnVuY3Rpb24gXCIuY29uY2F0KHRydW5jYXRlKG5hbWUsIG9wdGlvbnMudHJ1bmNhdGUgLSAxMSksIFwiXVwiKSwgJ3NwZWNpYWwnKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGluc3BlY3RNYXBFbnRyeShfcmVmLCBvcHRpb25zKSB7XG5cdCAgdmFyIF9yZWYyID0gX3NsaWNlZFRvQXJyYXkoX3JlZiwgMiksXG5cdCAgICAgIGtleSA9IF9yZWYyWzBdLFxuXHQgICAgICB2YWx1ZSA9IF9yZWYyWzFdO1xuXG5cdCAgb3B0aW9ucy50cnVuY2F0ZSAtPSA0O1xuXHQgIGtleSA9IG9wdGlvbnMuaW5zcGVjdChrZXksIG9wdGlvbnMpO1xuXHQgIG9wdGlvbnMudHJ1bmNhdGUgLT0ga2V5Lmxlbmd0aDtcblx0ICB2YWx1ZSA9IG9wdGlvbnMuaW5zcGVjdCh2YWx1ZSwgb3B0aW9ucyk7XG5cdCAgcmV0dXJuIFwiXCIuY29uY2F0KGtleSwgXCIgPT4gXCIpLmNvbmNhdCh2YWx1ZSk7XG5cdH0gLy8gSUUxMSBkb2Vzbid0IHN1cHBvcnQgYG1hcC5lbnRyaWVzKClgXG5cblxuXHRmdW5jdGlvbiBtYXBUb0VudHJpZXMobWFwKSB7XG5cdCAgdmFyIGVudHJpZXMgPSBbXTtcblx0ICBtYXAuZm9yRWFjaChmdW5jdGlvbiAodmFsdWUsIGtleSkge1xuXHQgICAgZW50cmllcy5wdXNoKFtrZXksIHZhbHVlXSk7XG5cdCAgfSk7XG5cdCAgcmV0dXJuIGVudHJpZXM7XG5cdH1cblxuXHRmdW5jdGlvbiBpbnNwZWN0TWFwKG1hcCwgb3B0aW9ucykge1xuXHQgIHZhciBzaXplID0gbWFwLnNpemUgLSAxO1xuXG5cdCAgaWYgKHNpemUgPD0gMCkge1xuXHQgICAgcmV0dXJuICdNYXB7fSc7XG5cdCAgfVxuXG5cdCAgb3B0aW9ucy50cnVuY2F0ZSAtPSA3O1xuXHQgIHJldHVybiBcIk1hcHsgXCIuY29uY2F0KGluc3BlY3RMaXN0KG1hcFRvRW50cmllcyhtYXApLCBvcHRpb25zLCBpbnNwZWN0TWFwRW50cnkpLCBcIiB9XCIpO1xuXHR9XG5cblx0dmFyIGlzTmFOID0gTnVtYmVyLmlzTmFOIHx8IGZ1bmN0aW9uIChpKSB7XG5cdCAgcmV0dXJuIGkgIT09IGk7XG5cdH07IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tc2VsZi1jb21wYXJlXG5cblxuXHRmdW5jdGlvbiBpbnNwZWN0TnVtYmVyKG51bWJlciwgb3B0aW9ucykge1xuXHQgIGlmIChpc05hTihudW1iZXIpKSB7XG5cdCAgICByZXR1cm4gb3B0aW9ucy5zdHlsaXplKCdOYU4nLCAnbnVtYmVyJyk7XG5cdCAgfVxuXG5cdCAgaWYgKG51bWJlciA9PT0gSW5maW5pdHkpIHtcblx0ICAgIHJldHVybiBvcHRpb25zLnN0eWxpemUoJ0luZmluaXR5JywgJ251bWJlcicpO1xuXHQgIH1cblxuXHQgIGlmIChudW1iZXIgPT09IC1JbmZpbml0eSkge1xuXHQgICAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZSgnLUluZmluaXR5JywgJ251bWJlcicpO1xuXHQgIH1cblxuXHQgIGlmIChudW1iZXIgPT09IDApIHtcblx0ICAgIHJldHVybiBvcHRpb25zLnN0eWxpemUoMSAvIG51bWJlciA9PT0gSW5maW5pdHkgPyAnKzAnIDogJy0wJywgJ251bWJlcicpO1xuXHQgIH1cblxuXHQgIHJldHVybiBvcHRpb25zLnN0eWxpemUodHJ1bmNhdGUobnVtYmVyLCBvcHRpb25zLnRydW5jYXRlKSwgJ251bWJlcicpO1xuXHR9XG5cblx0ZnVuY3Rpb24gaW5zcGVjdFJlZ0V4cCh2YWx1ZSwgb3B0aW9ucykge1xuXHQgIHZhciBmbGFncyA9IHZhbHVlLnRvU3RyaW5nKCkuc3BsaXQoJy8nKVsyXTtcblx0ICB2YXIgc291cmNlTGVuZ3RoID0gb3B0aW9ucy50cnVuY2F0ZSAtICgyICsgZmxhZ3MubGVuZ3RoKTtcblx0ICB2YXIgc291cmNlID0gdmFsdWUuc291cmNlO1xuXHQgIHJldHVybiBvcHRpb25zLnN0eWxpemUoXCIvXCIuY29uY2F0KHRydW5jYXRlKHNvdXJjZSwgc291cmNlTGVuZ3RoKSwgXCIvXCIpLmNvbmNhdChmbGFncyksICdyZWdleHAnKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGFycmF5RnJvbVNldChzZXQpIHtcblx0ICB2YXIgdmFsdWVzID0gW107XG5cdCAgc2V0LmZvckVhY2goZnVuY3Rpb24gKHZhbHVlKSB7XG5cdCAgICB2YWx1ZXMucHVzaCh2YWx1ZSk7XG5cdCAgfSk7XG5cdCAgcmV0dXJuIHZhbHVlcztcblx0fVxuXG5cdGZ1bmN0aW9uIGluc3BlY3RTZXQoc2V0LCBvcHRpb25zKSB7XG5cdCAgaWYgKHNldC5zaXplID09PSAwKSByZXR1cm4gJ1NldHt9Jztcblx0ICBvcHRpb25zLnRydW5jYXRlIC09IDc7XG5cdCAgcmV0dXJuIFwiU2V0eyBcIi5jb25jYXQoaW5zcGVjdExpc3QoYXJyYXlGcm9tU2V0KHNldCksIG9wdGlvbnMpLCBcIiB9XCIpO1xuXHR9XG5cblx0dmFyIHN0cmluZ0VzY2FwZUNoYXJzID0gbmV3IFJlZ0V4cChcIlsnXFxcXHUwMDAwLVxcXFx1MDAxZlxcXFx1MDA3Zi1cXFxcdTAwOWZcXFxcdTAwYWRcXFxcdTA2MDAtXFxcXHUwNjA0XFxcXHUwNzBmXFxcXHUxN2I0XFxcXHUxN2I1XCIgKyBcIlxcXFx1MjAwYy1cXFxcdTIwMGZcXFxcdTIwMjgtXFxcXHUyMDJmXFxcXHUyMDYwLVxcXFx1MjA2ZlxcXFx1ZmVmZlxcXFx1ZmZmMC1cXFxcdWZmZmZdXCIsICdnJyk7XG5cdHZhciBlc2NhcGVDaGFyYWN0ZXJzID0ge1xuXHQgICdcXGInOiAnXFxcXGInLFxuXHQgICdcXHQnOiAnXFxcXHQnLFxuXHQgICdcXG4nOiAnXFxcXG4nLFxuXHQgICdcXGYnOiAnXFxcXGYnLFxuXHQgICdcXHInOiAnXFxcXHInLFxuXHQgIFwiJ1wiOiBcIlxcXFwnXCIsXG5cdCAgJ1xcXFwnOiAnXFxcXFxcXFwnXG5cdH07XG5cdHZhciBoZXggPSAxNjtcblx0dmFyIHVuaWNvZGVMZW5ndGggPSA0O1xuXG5cdGZ1bmN0aW9uIGVzY2FwZShjaGFyKSB7XG5cdCAgcmV0dXJuIGVzY2FwZUNoYXJhY3RlcnNbY2hhcl0gfHwgXCJcXFxcdVwiLmNvbmNhdChcIjAwMDBcIi5jb25jYXQoY2hhci5jaGFyQ29kZUF0KDApLnRvU3RyaW5nKGhleCkpLnNsaWNlKC11bmljb2RlTGVuZ3RoKSk7XG5cdH1cblxuXHRmdW5jdGlvbiBpbnNwZWN0U3RyaW5nKHN0cmluZywgb3B0aW9ucykge1xuXHQgIGlmIChzdHJpbmdFc2NhcGVDaGFycy50ZXN0KHN0cmluZykpIHtcblx0ICAgIHN0cmluZyA9IHN0cmluZy5yZXBsYWNlKHN0cmluZ0VzY2FwZUNoYXJzLCBlc2NhcGUpO1xuXHQgIH1cblxuXHQgIHJldHVybiBvcHRpb25zLnN0eWxpemUoXCInXCIuY29uY2F0KHRydW5jYXRlKHN0cmluZywgb3B0aW9ucy50cnVuY2F0ZSAtIDIpLCBcIidcIiksICdzdHJpbmcnKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGluc3BlY3RTeW1ib2wodmFsdWUpIHtcblx0ICBpZiAoJ2Rlc2NyaXB0aW9uJyBpbiBTeW1ib2wucHJvdG90eXBlKSB7XG5cdCAgICByZXR1cm4gXCJTeW1ib2woXCIuY29uY2F0KHZhbHVlLmRlc2NyaXB0aW9uLCBcIilcIik7XG5cdCAgfVxuXG5cdCAgcmV0dXJuIHZhbHVlLnRvU3RyaW5nKCk7XG5cdH1cblxuXHR2YXIgZ2V0UHJvbWlzZVZhbHVlID0gZnVuY3Rpb24gZ2V0UHJvbWlzZVZhbHVlKCkge1xuXHQgIHJldHVybiAnUHJvbWlzZXvigKZ9Jztcblx0fTtcblxuXHR0cnkge1xuXHQgIHZhciBfcHJvY2VzcyRiaW5kaW5nID0gcHJvY2Vzcy5iaW5kaW5nKCd1dGlsJyksXG5cdCAgICAgIGdldFByb21pc2VEZXRhaWxzID0gX3Byb2Nlc3MkYmluZGluZy5nZXRQcm9taXNlRGV0YWlscyxcblx0ICAgICAga1BlbmRpbmcgPSBfcHJvY2VzcyRiaW5kaW5nLmtQZW5kaW5nLFxuXHQgICAgICBrUmVqZWN0ZWQgPSBfcHJvY2VzcyRiaW5kaW5nLmtSZWplY3RlZDtcblxuXHQgIGdldFByb21pc2VWYWx1ZSA9IGZ1bmN0aW9uIGdldFByb21pc2VWYWx1ZSh2YWx1ZSwgb3B0aW9ucykge1xuXHQgICAgdmFyIF9nZXRQcm9taXNlRGV0YWlscyA9IGdldFByb21pc2VEZXRhaWxzKHZhbHVlKSxcblx0ICAgICAgICBfZ2V0UHJvbWlzZURldGFpbHMyID0gX3NsaWNlZFRvQXJyYXkoX2dldFByb21pc2VEZXRhaWxzLCAyKSxcblx0ICAgICAgICBzdGF0ZSA9IF9nZXRQcm9taXNlRGV0YWlsczJbMF0sXG5cdCAgICAgICAgaW5uZXJWYWx1ZSA9IF9nZXRQcm9taXNlRGV0YWlsczJbMV07XG5cblx0ICAgIGlmIChzdGF0ZSA9PT0ga1BlbmRpbmcpIHtcblx0ICAgICAgcmV0dXJuICdQcm9taXNlezxwZW5kaW5nPn0nO1xuXHQgICAgfVxuXG5cdCAgICByZXR1cm4gXCJQcm9taXNlXCIuY29uY2F0KHN0YXRlID09PSBrUmVqZWN0ZWQgPyAnIScgOiAnJywgXCJ7XCIpLmNvbmNhdChvcHRpb25zLmluc3BlY3QoaW5uZXJWYWx1ZSwgb3B0aW9ucyksIFwifVwiKTtcblx0ICB9O1xuXHR9IGNhdGNoIChub3ROb2RlKSB7XG5cdCAgLyogaWdub3JlICovXG5cdH1cblxuXHR2YXIgaW5zcGVjdFByb21pc2UgPSBnZXRQcm9taXNlVmFsdWU7XG5cblx0ZnVuY3Rpb24gaW5zcGVjdE9iamVjdChvYmplY3QsIG9wdGlvbnMpIHtcblx0ICB2YXIgcHJvcGVydGllcyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG9iamVjdCk7XG5cdCAgdmFyIHN5bWJvbHMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzID8gT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhvYmplY3QpIDogW107XG5cblx0ICBpZiAocHJvcGVydGllcy5sZW5ndGggPT09IDAgJiYgc3ltYm9scy5sZW5ndGggPT09IDApIHtcblx0ICAgIHJldHVybiAne30nO1xuXHQgIH1cblxuXHQgIG9wdGlvbnMudHJ1bmNhdGUgLT0gNDtcblx0ICB2YXIgcHJvcGVydHlDb250ZW50cyA9IGluc3BlY3RMaXN0KHByb3BlcnRpZXMubWFwKGZ1bmN0aW9uIChrZXkpIHtcblx0ICAgIHJldHVybiBba2V5LCBvYmplY3Rba2V5XV07XG5cdCAgfSksIG9wdGlvbnMsIGluc3BlY3RQcm9wZXJ0eSk7XG5cdCAgdmFyIHN5bWJvbENvbnRlbnRzID0gaW5zcGVjdExpc3Qoc3ltYm9scy5tYXAoZnVuY3Rpb24gKGtleSkge1xuXHQgICAgcmV0dXJuIFtrZXksIG9iamVjdFtrZXldXTtcblx0ICB9KSwgb3B0aW9ucywgaW5zcGVjdFByb3BlcnR5KTtcblx0ICB2YXIgc2VwID0gJyc7XG5cblx0ICBpZiAocHJvcGVydHlDb250ZW50cyAmJiBzeW1ib2xDb250ZW50cykge1xuXHQgICAgc2VwID0gJywgJztcblx0ICB9XG5cblx0ICByZXR1cm4gXCJ7IFwiLmNvbmNhdChwcm9wZXJ0eUNvbnRlbnRzKS5jb25jYXQoc2VwKS5jb25jYXQoc3ltYm9sQ29udGVudHMsIFwiIH1cIik7XG5cdH1cblxuXHR2YXIgdG9TdHJpbmdUYWckMSA9IHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZyA/IFN5bWJvbC50b1N0cmluZ1RhZyA6IGZhbHNlO1xuXHRmdW5jdGlvbiBpbnNwZWN0Q2xhc3ModmFsdWUsIG9wdGlvbnMpIHtcblx0ICB2YXIgbmFtZSA9ICcnO1xuXG5cdCAgaWYgKHRvU3RyaW5nVGFnJDEgJiYgdG9TdHJpbmdUYWckMSBpbiB2YWx1ZSkge1xuXHQgICAgbmFtZSA9IHZhbHVlW3RvU3RyaW5nVGFnJDFdO1xuXHQgIH1cblxuXHQgIG5hbWUgPSBuYW1lIHx8IGdldEZ1bmNOYW1lXzEodmFsdWUuY29uc3RydWN0b3IpOyAvLyBCYWJlbCB0cmFuc2Zvcm1zIGFub255bW91cyBjbGFzc2VzIHRvIHRoZSBuYW1lIGBfY2xhc3NgXG5cblx0ICBpZiAoIW5hbWUgfHwgbmFtZSA9PT0gJ19jbGFzcycpIHtcblx0ICAgIG5hbWUgPSAnPEFub255bW91cyBDbGFzcz4nO1xuXHQgIH1cblxuXHQgIG9wdGlvbnMudHJ1bmNhdGUgLT0gbmFtZS5sZW5ndGg7XG5cdCAgcmV0dXJuIFwiXCIuY29uY2F0KG5hbWUpLmNvbmNhdChpbnNwZWN0T2JqZWN0KHZhbHVlLCBvcHRpb25zKSk7XG5cdH1cblxuXHRmdW5jdGlvbiBpbnNwZWN0QXJndW1lbnRzKGFyZ3MsIG9wdGlvbnMpIHtcblx0ICBpZiAoYXJncy5sZW5ndGggPT09IDApIHJldHVybiAnQXJndW1lbnRzW10nO1xuXHQgIG9wdGlvbnMudHJ1bmNhdGUgLT0gMTM7XG5cdCAgcmV0dXJuIFwiQXJndW1lbnRzWyBcIi5jb25jYXQoaW5zcGVjdExpc3QoYXJncywgb3B0aW9ucyksIFwiIF1cIik7XG5cdH1cblxuXHR2YXIgZXJyb3JLZXlzID0gWydzdGFjaycsICdsaW5lJywgJ2NvbHVtbicsICduYW1lJywgJ21lc3NhZ2UnLCAnZmlsZU5hbWUnLCAnbGluZU51bWJlcicsICdjb2x1bW5OdW1iZXInLCAnbnVtYmVyJywgJ2Rlc2NyaXB0aW9uJ107XG5cdGZ1bmN0aW9uIGluc3BlY3RPYmplY3QkMShlcnJvciwgb3B0aW9ucykge1xuXHQgIHZhciBwcm9wZXJ0aWVzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoZXJyb3IpLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XG5cdCAgICByZXR1cm4gZXJyb3JLZXlzLmluZGV4T2Yoa2V5KSA9PT0gLTE7XG5cdCAgfSk7XG5cdCAgdmFyIG5hbWUgPSBlcnJvci5uYW1lO1xuXHQgIG9wdGlvbnMudHJ1bmNhdGUgLT0gbmFtZS5sZW5ndGg7XG5cdCAgdmFyIG1lc3NhZ2UgPSAnJztcblxuXHQgIGlmICh0eXBlb2YgZXJyb3IubWVzc2FnZSA9PT0gJ3N0cmluZycpIHtcblx0ICAgIG1lc3NhZ2UgPSB0cnVuY2F0ZShlcnJvci5tZXNzYWdlLCBvcHRpb25zLnRydW5jYXRlKTtcblx0ICB9IGVsc2Uge1xuXHQgICAgcHJvcGVydGllcy51bnNoaWZ0KCdtZXNzYWdlJyk7XG5cdCAgfVxuXG5cdCAgbWVzc2FnZSA9IG1lc3NhZ2UgPyBcIjogXCIuY29uY2F0KG1lc3NhZ2UpIDogJyc7XG5cdCAgb3B0aW9ucy50cnVuY2F0ZSAtPSBtZXNzYWdlLmxlbmd0aCArIDU7XG5cdCAgdmFyIHByb3BlcnR5Q29udGVudHMgPSBpbnNwZWN0TGlzdChwcm9wZXJ0aWVzLm1hcChmdW5jdGlvbiAoa2V5KSB7XG5cdCAgICByZXR1cm4gW2tleSwgZXJyb3Jba2V5XV07XG5cdCAgfSksIG9wdGlvbnMsIGluc3BlY3RQcm9wZXJ0eSk7XG5cdCAgcmV0dXJuIFwiXCIuY29uY2F0KG5hbWUpLmNvbmNhdChtZXNzYWdlKS5jb25jYXQocHJvcGVydHlDb250ZW50cyA/IFwiIHsgXCIuY29uY2F0KHByb3BlcnR5Q29udGVudHMsIFwiIH1cIikgOiAnJyk7XG5cdH1cblxuXHRmdW5jdGlvbiBpbnNwZWN0QXR0cmlidXRlKF9yZWYsIG9wdGlvbnMpIHtcblx0ICB2YXIgX3JlZjIgPSBfc2xpY2VkVG9BcnJheShfcmVmLCAyKSxcblx0ICAgICAga2V5ID0gX3JlZjJbMF0sXG5cdCAgICAgIHZhbHVlID0gX3JlZjJbMV07XG5cblx0ICBvcHRpb25zLnRydW5jYXRlIC09IDM7XG5cblx0ICBpZiAoIXZhbHVlKSB7XG5cdCAgICByZXR1cm4gXCJcIi5jb25jYXQob3B0aW9ucy5zdHlsaXplKGtleSwgJ3llbGxvdycpKTtcblx0ICB9XG5cblx0ICByZXR1cm4gXCJcIi5jb25jYXQob3B0aW9ucy5zdHlsaXplKGtleSwgJ3llbGxvdycpLCBcIj1cIikuY29uY2F0KG9wdGlvbnMuc3R5bGl6ZShcIlxcXCJcIi5jb25jYXQodmFsdWUsIFwiXFxcIlwiKSwgJ3N0cmluZycpKTtcblx0fVxuXHRmdW5jdGlvbiBpbnNwZWN0SFRNTENvbGxlY3Rpb24oY29sbGVjdGlvbiwgb3B0aW9ucykge1xuXHQgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby11c2UtYmVmb3JlLWRlZmluZVxuXHQgIHJldHVybiBpbnNwZWN0TGlzdChjb2xsZWN0aW9uLCBvcHRpb25zLCBpbnNwZWN0SFRNTCwgJ1xcbicpO1xuXHR9XG5cdGZ1bmN0aW9uIGluc3BlY3RIVE1MKGVsZW1lbnQsIG9wdGlvbnMpIHtcblx0ICB2YXIgcHJvcGVydGllcyA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlTmFtZXMoKTtcblx0ICB2YXIgbmFtZSA9IGVsZW1lbnQudGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xuXHQgIHZhciBoZWFkID0gb3B0aW9ucy5zdHlsaXplKFwiPFwiLmNvbmNhdChuYW1lKSwgJ3NwZWNpYWwnKTtcblx0ICB2YXIgaGVhZENsb3NlID0gb3B0aW9ucy5zdHlsaXplKFwiPlwiLCAnc3BlY2lhbCcpO1xuXHQgIHZhciB0YWlsID0gb3B0aW9ucy5zdHlsaXplKFwiPC9cIi5jb25jYXQobmFtZSwgXCI+XCIpLCAnc3BlY2lhbCcpO1xuXHQgIG9wdGlvbnMudHJ1bmNhdGUgLT0gbmFtZS5sZW5ndGggKiAyICsgNTtcblx0ICB2YXIgcHJvcGVydHlDb250ZW50cyA9ICcnO1xuXG5cdCAgaWYgKHByb3BlcnRpZXMubGVuZ3RoID4gMCkge1xuXHQgICAgcHJvcGVydHlDb250ZW50cyArPSAnICc7XG5cdCAgICBwcm9wZXJ0eUNvbnRlbnRzICs9IGluc3BlY3RMaXN0KHByb3BlcnRpZXMubWFwKGZ1bmN0aW9uIChrZXkpIHtcblx0ICAgICAgcmV0dXJuIFtrZXksIGVsZW1lbnQuZ2V0QXR0cmlidXRlKGtleSldO1xuXHQgICAgfSksIG9wdGlvbnMsIGluc3BlY3RBdHRyaWJ1dGUsICcgJyk7XG5cdCAgfVxuXG5cdCAgb3B0aW9ucy50cnVuY2F0ZSAtPSBwcm9wZXJ0eUNvbnRlbnRzLmxlbmd0aDtcblx0ICB2YXIgdHJ1bmNhdGUgPSBvcHRpb25zLnRydW5jYXRlO1xuXHQgIHZhciBjaGlsZHJlbiA9IGluc3BlY3RIVE1MQ29sbGVjdGlvbihlbGVtZW50LmNoaWxkcmVuLCBvcHRpb25zKTtcblxuXHQgIGlmIChjaGlsZHJlbiAmJiBjaGlsZHJlbi5sZW5ndGggPiB0cnVuY2F0ZSkge1xuXHQgICAgY2hpbGRyZW4gPSBcIlwiLmNvbmNhdCh0cnVuY2F0b3IsIFwiKFwiKS5jb25jYXQoZWxlbWVudC5jaGlsZHJlbi5sZW5ndGgsIFwiKVwiKTtcblx0ICB9XG5cblx0ICByZXR1cm4gXCJcIi5jb25jYXQoaGVhZCkuY29uY2F0KHByb3BlcnR5Q29udGVudHMpLmNvbmNhdChoZWFkQ2xvc2UpLmNvbmNhdChjaGlsZHJlbikuY29uY2F0KHRhaWwpO1xuXHR9XG5cblx0LyogIVxuXHQgKiBsb3VwZVxuXHQgKiBDb3B5cmlnaHQoYykgMjAxMyBKYWtlIEx1ZXIgPGpha2VAYWxvZ2ljYWxwYXJhZG94LmNvbT5cblx0ICogTUlUIExpY2Vuc2VkXG5cdCAqL1xuXHR2YXIgc3ltYm9sc1N1cHBvcnRlZCA9IHR5cGVvZiBTeW1ib2wgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIFN5bWJvbC5mb3IgPT09ICdmdW5jdGlvbic7XG5cdHZhciBjaGFpSW5zcGVjdCA9IHN5bWJvbHNTdXBwb3J0ZWQgPyBTeW1ib2wuZm9yKCdjaGFpL2luc3BlY3QnKSA6ICdAQGNoYWkvaW5zcGVjdCc7XG5cdHZhciBub2RlSW5zcGVjdCA9IGZhbHNlO1xuXG5cdHRyeSB7XG5cdCAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGdsb2JhbC1yZXF1aXJlXG5cdCAgbm9kZUluc3BlY3QgPSByZXF1aXJlKCd1dGlsJykuaW5zcGVjdC5jdXN0b207XG5cdH0gY2F0Y2ggKG5vTm9kZUluc3BlY3QpIHtcblx0ICBub2RlSW5zcGVjdCA9IGZhbHNlO1xuXHR9XG5cblx0dmFyIGNvbnN0cnVjdG9yTWFwID0gbmV3IFdlYWtNYXAoKTtcblx0dmFyIHN0cmluZ1RhZ01hcCA9IHt9O1xuXHR2YXIgYmFzZVR5cGVzTWFwID0ge1xuXHQgIHVuZGVmaW5lZDogZnVuY3Rpb24gdW5kZWZpbmVkJDEodmFsdWUsIG9wdGlvbnMpIHtcblx0ICAgIHJldHVybiBvcHRpb25zLnN0eWxpemUoJ3VuZGVmaW5lZCcsICd1bmRlZmluZWQnKTtcblx0ICB9LFxuXHQgIG51bGw6IGZ1bmN0aW9uIF9udWxsKHZhbHVlLCBvcHRpb25zKSB7XG5cdCAgICByZXR1cm4gb3B0aW9ucy5zdHlsaXplKG51bGwsICdudWxsJyk7XG5cdCAgfSxcblx0ICBib29sZWFuOiBmdW5jdGlvbiBib29sZWFuKHZhbHVlLCBvcHRpb25zKSB7XG5cdCAgICByZXR1cm4gb3B0aW9ucy5zdHlsaXplKHZhbHVlLCAnYm9vbGVhbicpO1xuXHQgIH0sXG5cdCAgQm9vbGVhbjogZnVuY3Rpb24gQm9vbGVhbih2YWx1ZSwgb3B0aW9ucykge1xuXHQgICAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZSh2YWx1ZSwgJ2Jvb2xlYW4nKTtcblx0ICB9LFxuXHQgIG51bWJlcjogaW5zcGVjdE51bWJlcixcblx0ICBOdW1iZXI6IGluc3BlY3ROdW1iZXIsXG5cdCAgc3RyaW5nOiBpbnNwZWN0U3RyaW5nLFxuXHQgIFN0cmluZzogaW5zcGVjdFN0cmluZyxcblx0ICBmdW5jdGlvbjogaW5zcGVjdEZ1bmN0aW9uLFxuXHQgIEZ1bmN0aW9uOiBpbnNwZWN0RnVuY3Rpb24sXG5cdCAgc3ltYm9sOiBpbnNwZWN0U3ltYm9sLFxuXHQgIC8vIEEgU3ltYm9sIHBvbHlmaWxsIHdpbGwgcmV0dXJuIGBTeW1ib2xgIG5vdCBgc3ltYm9sYCBmcm9tIHR5cGVkZXRlY3Rcblx0ICBTeW1ib2w6IGluc3BlY3RTeW1ib2wsXG5cdCAgQXJyYXk6IGluc3BlY3RBcnJheSxcblx0ICBEYXRlOiBpbnNwZWN0RGF0ZSxcblx0ICBNYXA6IGluc3BlY3RNYXAsXG5cdCAgU2V0OiBpbnNwZWN0U2V0LFxuXHQgIFJlZ0V4cDogaW5zcGVjdFJlZ0V4cCxcblx0ICBQcm9taXNlOiBpbnNwZWN0UHJvbWlzZSxcblx0ICAvLyBXZWFrU2V0LCBXZWFrTWFwIGFyZSB0b3RhbGx5IG9wYXF1ZSB0byB1c1xuXHQgIFdlYWtTZXQ6IGZ1bmN0aW9uIFdlYWtTZXQodmFsdWUsIG9wdGlvbnMpIHtcblx0ICAgIHJldHVybiBvcHRpb25zLnN0eWxpemUoJ1dlYWtTZXR74oCmfScsICdzcGVjaWFsJyk7XG5cdCAgfSxcblx0ICBXZWFrTWFwOiBmdW5jdGlvbiBXZWFrTWFwKHZhbHVlLCBvcHRpb25zKSB7XG5cdCAgICByZXR1cm4gb3B0aW9ucy5zdHlsaXplKCdXZWFrTWFwe+KApn0nLCAnc3BlY2lhbCcpO1xuXHQgIH0sXG5cdCAgQXJndW1lbnRzOiBpbnNwZWN0QXJndW1lbnRzLFxuXHQgIEludDhBcnJheTogaW5zcGVjdFR5cGVkQXJyYXksXG5cdCAgVWludDhBcnJheTogaW5zcGVjdFR5cGVkQXJyYXksXG5cdCAgVWludDhDbGFtcGVkQXJyYXk6IGluc3BlY3RUeXBlZEFycmF5LFxuXHQgIEludDE2QXJyYXk6IGluc3BlY3RUeXBlZEFycmF5LFxuXHQgIFVpbnQxNkFycmF5OiBpbnNwZWN0VHlwZWRBcnJheSxcblx0ICBJbnQzMkFycmF5OiBpbnNwZWN0VHlwZWRBcnJheSxcblx0ICBVaW50MzJBcnJheTogaW5zcGVjdFR5cGVkQXJyYXksXG5cdCAgRmxvYXQzMkFycmF5OiBpbnNwZWN0VHlwZWRBcnJheSxcblx0ICBGbG9hdDY0QXJyYXk6IGluc3BlY3RUeXBlZEFycmF5LFxuXHQgIEdlbmVyYXRvcjogZnVuY3Rpb24gR2VuZXJhdG9yKCkge1xuXHQgICAgcmV0dXJuICcnO1xuXHQgIH0sXG5cdCAgRGF0YVZpZXc6IGZ1bmN0aW9uIERhdGFWaWV3KCkge1xuXHQgICAgcmV0dXJuICcnO1xuXHQgIH0sXG5cdCAgQXJyYXlCdWZmZXI6IGZ1bmN0aW9uIEFycmF5QnVmZmVyKCkge1xuXHQgICAgcmV0dXJuICcnO1xuXHQgIH0sXG5cdCAgRXJyb3I6IGluc3BlY3RPYmplY3QkMSxcblx0ICBIVE1MQ29sbGVjdGlvbjogaW5zcGVjdEhUTUxDb2xsZWN0aW9uLFxuXHQgIE5vZGVMaXN0OiBpbnNwZWN0SFRNTENvbGxlY3Rpb25cblx0fTsgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGNvbXBsZXhpdHlcblxuXHR2YXIgaW5zcGVjdEN1c3RvbSA9IGZ1bmN0aW9uIGluc3BlY3RDdXN0b20odmFsdWUsIG9wdGlvbnMsIHR5cGUpIHtcblx0ICBpZiAoY2hhaUluc3BlY3QgaW4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlW2NoYWlJbnNwZWN0XSA9PT0gJ2Z1bmN0aW9uJykge1xuXHQgICAgcmV0dXJuIHZhbHVlW2NoYWlJbnNwZWN0XShvcHRpb25zKTtcblx0ICB9XG5cblx0ICBpZiAobm9kZUluc3BlY3QgJiYgbm9kZUluc3BlY3QgaW4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlW25vZGVJbnNwZWN0XSA9PT0gJ2Z1bmN0aW9uJykge1xuXHQgICAgcmV0dXJuIHZhbHVlW25vZGVJbnNwZWN0XShvcHRpb25zLmRlcHRoLCBvcHRpb25zKTtcblx0ICB9XG5cblx0ICBpZiAoJ2luc3BlY3QnIGluIHZhbHVlICYmIHR5cGVvZiB2YWx1ZS5pbnNwZWN0ID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICByZXR1cm4gdmFsdWUuaW5zcGVjdChvcHRpb25zLmRlcHRoLCBvcHRpb25zKTtcblx0ICB9XG5cblx0ICBpZiAoJ2NvbnN0cnVjdG9yJyBpbiB2YWx1ZSAmJiBjb25zdHJ1Y3Rvck1hcC5oYXModmFsdWUuY29uc3RydWN0b3IpKSB7XG5cdCAgICByZXR1cm4gY29uc3RydWN0b3JNYXAuZ2V0KHZhbHVlLmNvbnN0cnVjdG9yKSh2YWx1ZSwgb3B0aW9ucyk7XG5cdCAgfVxuXG5cdCAgaWYgKHN0cmluZ1RhZ01hcFt0eXBlXSkge1xuXHQgICAgcmV0dXJuIHN0cmluZ1RhZ01hcFt0eXBlXSh2YWx1ZSwgb3B0aW9ucyk7XG5cdCAgfVxuXG5cdCAgcmV0dXJuICcnO1xuXHR9OyAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgY29tcGxleGl0eVxuXG5cblx0ZnVuY3Rpb24gaW5zcGVjdCh2YWx1ZSwgb3B0aW9ucykge1xuXHQgIG9wdGlvbnMgPSBub3JtYWxpc2VPcHRpb25zKG9wdGlvbnMpO1xuXHQgIG9wdGlvbnMuaW5zcGVjdCA9IGluc3BlY3Q7XG5cdCAgdmFyIF9vcHRpb25zID0gb3B0aW9ucyxcblx0ICAgICAgY3VzdG9tSW5zcGVjdCA9IF9vcHRpb25zLmN1c3RvbUluc3BlY3Q7XG5cdCAgdmFyIHR5cGUgPSB0eXBlRGV0ZWN0KHZhbHVlKTsgLy8gSWYgaXQgaXMgYSBiYXNlIHZhbHVlIHRoYXQgd2UgYWxyZWFkeSBzdXBwb3J0LCB0aGVuIHVzZSBMb3VwZSdzIGluc3BlY3RvclxuXG5cdCAgaWYgKGJhc2VUeXBlc01hcFt0eXBlXSkge1xuXHQgICAgcmV0dXJuIGJhc2VUeXBlc01hcFt0eXBlXSh2YWx1ZSwgb3B0aW9ucyk7XG5cdCAgfVxuXG5cdCAgdmFyIHByb3RvID0gdmFsdWUgPyBPYmplY3QuZ2V0UHJvdG90eXBlT2YodmFsdWUpIDogZmFsc2U7IC8vIElmIGl0J3MgYSBwbGFpbiBPYmplY3QgdGhlbiB1c2UgTG91cGUncyBpbnNwZWN0b3JcblxuXHQgIGlmIChwcm90byA9PT0gT2JqZWN0LnByb3RvdHlwZSB8fCBwcm90byA9PT0gbnVsbCkge1xuXHQgICAgcmV0dXJuIGluc3BlY3RPYmplY3QodmFsdWUsIG9wdGlvbnMpO1xuXHQgIH0gLy8gU3BlY2lmaWNhbGx5IGFjY291bnQgZm9yIEhUTUxFbGVtZW50c1xuXHQgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby11bmRlZlxuXG5cblx0ICBpZiAodmFsdWUgJiYgdHlwZW9mIEhUTUxFbGVtZW50ID09PSAnZnVuY3Rpb24nICYmIHZhbHVlIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcblx0ICAgIHJldHVybiBpbnNwZWN0SFRNTCh2YWx1ZSwgb3B0aW9ucyk7XG5cdCAgfSAvLyBJZiBgb3B0aW9ucy5jdXN0b21JbnNwZWN0YCBpcyBzZXQgdG8gdHJ1ZSB0aGVuIHRyeSB0byB1c2UgdGhlIGN1c3RvbSBpbnNwZWN0b3JcblxuXG5cdCAgaWYgKGN1c3RvbUluc3BlY3QgJiYgdmFsdWUpIHtcblx0ICAgIHZhciBvdXRwdXQgPSBpbnNwZWN0Q3VzdG9tKHZhbHVlLCBvcHRpb25zLCB0eXBlKTtcblx0ICAgIGlmIChvdXRwdXQpIHJldHVybiBvdXRwdXQ7XG5cdCAgfSAvLyBJZiBpdCBpcyBhIGNsYXNzLCBpbnNwZWN0IGl0IGxpa2UgYW4gb2JqZWN0IGJ1dCBhZGQgdGhlIGNvbnN0cnVjdG9yIG5hbWVcblxuXG5cdCAgaWYgKCdjb25zdHJ1Y3RvcicgaW4gdmFsdWUgJiYgdmFsdWUuY29uc3RydWN0b3IgIT09IE9iamVjdCkge1xuXHQgICAgcmV0dXJuIGluc3BlY3RDbGFzcyh2YWx1ZSwgb3B0aW9ucyk7XG5cdCAgfSAvLyBXZSBoYXZlIHJ1biBvdXQgb2Ygb3B0aW9ucyEgSnVzdCBzdHJpbmdpZnkgdGhlIHZhbHVlXG5cblxuXHQgIHJldHVybiBvcHRpb25zLnN0eWxpemUoU3RyaW5nKHZhbHVlKSwgdHlwZSk7XG5cdH1cblx0ZnVuY3Rpb24gcmVnaXN0ZXJDb25zdHJ1Y3Rvcihjb25zdHJ1Y3RvciwgaW5zcGVjdG9yKSB7XG5cdCAgaWYgKGNvbnN0cnVjdG9yTWFwLmhhcyhjb25zdHJ1Y3RvcikpIHtcblx0ICAgIHJldHVybiBmYWxzZTtcblx0ICB9XG5cblx0ICBjb25zdHJ1Y3Rvck1hcC5hZGQoY29uc3RydWN0b3IsIGluc3BlY3Rvcik7XG5cdCAgcmV0dXJuIHRydWU7XG5cdH1cblx0ZnVuY3Rpb24gcmVnaXN0ZXJTdHJpbmdUYWcoc3RyaW5nVGFnLCBpbnNwZWN0b3IpIHtcblx0ICBpZiAoc3RyaW5nVGFnIGluIHN0cmluZ1RhZ01hcCkge1xuXHQgICAgcmV0dXJuIGZhbHNlO1xuXHQgIH1cblxuXHQgIHN0cmluZ1RhZ01hcFtzdHJpbmdUYWddID0gaW5zcGVjdG9yO1xuXHQgIHJldHVybiB0cnVlO1xuXHR9XG5cdHZhciBjdXN0b20gPSBjaGFpSW5zcGVjdDtcblxuXHRleHBvcnRzLmN1c3RvbSA9IGN1c3RvbTtcblx0ZXhwb3J0cy5kZWZhdWx0ID0gaW5zcGVjdDtcblx0ZXhwb3J0cy5pbnNwZWN0ID0gaW5zcGVjdDtcblx0ZXhwb3J0cy5yZWdpc3RlckNvbnN0cnVjdG9yID0gcmVnaXN0ZXJDb25zdHJ1Y3Rvcjtcblx0ZXhwb3J0cy5yZWdpc3RlclN0cmluZ1RhZyA9IHJlZ2lzdGVyU3RyaW5nVGFnO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG5cbn0pKSk7XG4iLCJcbnZhciB0eXBlID0gcmVxdWlyZSgnLi9qa3Jvc28tdHlwZScpXG5cbi8vIChhbnksIGFueSwgW2FycmF5XSkgLT4gYm9vbGVhblxuZnVuY3Rpb24gZXF1YWwoYSwgYiwgbWVtb3Mpe1xuICAvLyBBbGwgaWRlbnRpY2FsIHZhbHVlcyBhcmUgZXF1aXZhbGVudFxuICBpZiAoYSA9PT0gYikgcmV0dXJuIHRydWVcbiAgdmFyIGZuQSA9IHR5cGVzW3R5cGUoYSldXG4gIHZhciBmbkIgPSB0eXBlc1t0eXBlKGIpXVxuICByZXR1cm4gZm5BICYmIGZuQSA9PT0gZm5CXG4gICAgPyBmbkEoYSwgYiwgbWVtb3MpXG4gICAgOiBmYWxzZVxufVxuXG52YXIgdHlwZXMgPSB7fVxuXG4vLyAoTnVtYmVyKSAtPiBib29sZWFuXG50eXBlcy5udW1iZXIgPSBmdW5jdGlvbihhLCBiKXtcbiAgcmV0dXJuIGEgIT09IGEgJiYgYiAhPT0gYi8qTmFuIGNoZWNrKi9cbn1cblxuLy8gKGZ1bmN0aW9uLCBmdW5jdGlvbiwgYXJyYXkpIC0+IGJvb2xlYW5cbnR5cGVzWydmdW5jdGlvbiddID0gZnVuY3Rpb24oYSwgYiwgbWVtb3Mpe1xuICByZXR1cm4gYS50b1N0cmluZygpID09PSBiLnRvU3RyaW5nKClcbiAgICAvLyBGdW5jdGlvbnMgY2FuIGFjdCBhcyBvYmplY3RzXG4gICAgJiYgdHlwZXMub2JqZWN0KGEsIGIsIG1lbW9zKVxuICAgICYmIGVxdWFsKGEucHJvdG90eXBlLCBiLnByb3RvdHlwZSlcbn1cblxuLy8gKGRhdGUsIGRhdGUpIC0+IGJvb2xlYW5cbnR5cGVzLmRhdGUgPSBmdW5jdGlvbihhLCBiKXtcbiAgcmV0dXJuICthID09PSArYlxufVxuXG4vLyAocmVnZXhwLCByZWdleHApIC0+IGJvb2xlYW5cbnR5cGVzLnJlZ2V4cCA9IGZ1bmN0aW9uKGEsIGIpe1xuICByZXR1cm4gYS50b1N0cmluZygpID09PSBiLnRvU3RyaW5nKClcbn1cblxuLy8gKERPTUVsZW1lbnQsIERPTUVsZW1lbnQpIC0+IGJvb2xlYW5cbnR5cGVzLmVsZW1lbnQgPSBmdW5jdGlvbihhLCBiKXtcbiAgcmV0dXJuIGEub3V0ZXJIVE1MID09PSBiLm91dGVySFRNTFxufVxuXG4vLyAodGV4dG5vZGUsIHRleHRub2RlKSAtPiBib29sZWFuXG50eXBlcy50ZXh0bm9kZSA9IGZ1bmN0aW9uKGEsIGIpe1xuICByZXR1cm4gYS50ZXh0Q29udGVudCA9PT0gYi50ZXh0Q29udGVudFxufVxuXG4vLyBkZWNvcmF0ZSBmbiB0byBwcmV2ZW50IGl0IHJlLWNoZWNraW5nIG9iamVjdHNcbi8vIChmdW5jdGlvbikgLT4gZnVuY3Rpb25cbmZ1bmN0aW9uIG1lbW9HYXVyZChmbil7XG4gIHJldHVybiBmdW5jdGlvbihhLCBiLCBtZW1vcyl7XG4gICAgaWYgKCFtZW1vcykgcmV0dXJuIGZuKGEsIGIsIFtdKVxuICAgIHZhciBpID0gbWVtb3MubGVuZ3RoLCBtZW1vXG4gICAgd2hpbGUgKG1lbW8gPSBtZW1vc1stLWldKSB7XG4gICAgICBpZiAobWVtb1swXSA9PT0gYSAmJiBtZW1vWzFdID09PSBiKSByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgICByZXR1cm4gZm4oYSwgYiwgbWVtb3MpXG4gIH1cbn1cblxudHlwZXNbJ2FyZ3VtZW50cyddID1cbnR5cGVzWydiaXQtYXJyYXknXSA9XG50eXBlcy5hcnJheSA9IG1lbW9HYXVyZChhcnJheUVxdWFsKVxuXG4vLyAoYXJyYXksIGFycmF5LCBhcnJheSkgLT4gYm9vbGVhblxuZnVuY3Rpb24gYXJyYXlFcXVhbChhLCBiLCBtZW1vcyl7XG4gIHZhciBpID0gYS5sZW5ndGhcbiAgaWYgKGkgIT09IGIubGVuZ3RoKSByZXR1cm4gZmFsc2VcbiAgbWVtb3MucHVzaChbYSwgYl0pXG4gIHdoaWxlIChpLS0pIHtcbiAgICBpZiAoIWVxdWFsKGFbaV0sIGJbaV0sIG1lbW9zKSkgcmV0dXJuIGZhbHNlXG4gIH1cbiAgcmV0dXJuIHRydWVcbn1cblxudHlwZXMub2JqZWN0ID0gbWVtb0dhdXJkKG9iamVjdEVxdWFsKVxuXG4vLyAob2JqZWN0LCBvYmplY3QsIGFycmF5KSAtPiBib29sZWFuXG5mdW5jdGlvbiBvYmplY3RFcXVhbChhLCBiLCBtZW1vcykge1xuICBpZiAodHlwZW9mIGEuZXF1YWwgPT0gJ2Z1bmN0aW9uJykge1xuICAgIG1lbW9zLnB1c2goW2EsIGJdKVxuICAgIHJldHVybiBhLmVxdWFsKGIsIG1lbW9zKVxuICB9XG4gIHZhciBrYSA9IGdldEVudW1lcmFibGVQcm9wZXJ0aWVzKGEpXG4gIHZhciBrYiA9IGdldEVudW1lcmFibGVQcm9wZXJ0aWVzKGIpXG4gIHZhciBpID0ga2EubGVuZ3RoXG5cbiAgLy8gc2FtZSBudW1iZXIgb2YgcHJvcGVydGllc1xuICBpZiAoaSAhPT0ga2IubGVuZ3RoKSByZXR1cm4gZmFsc2VcblxuICAvLyBhbHRob3VnaCBub3QgbmVjZXNzYXJpbHkgdGhlIHNhbWUgb3JkZXJcbiAga2Euc29ydCgpXG4gIGtiLnNvcnQoKVxuXG4gIC8vIGNoZWFwIGtleSB0ZXN0XG4gIHdoaWxlIChpLS0pIGlmIChrYVtpXSAhPT0ga2JbaV0pIHJldHVybiBmYWxzZVxuXG4gIC8vIHJlbWVtYmVyXG4gIG1lbW9zLnB1c2goW2EsIGJdKVxuXG4gIC8vIGl0ZXJhdGUgYWdhaW4gdGhpcyB0aW1lIGRvaW5nIGEgdGhvcm91Z2ggY2hlY2tcbiAgaSA9IGthLmxlbmd0aFxuICB3aGlsZSAoaS0tKSB7XG4gICAgdmFyIGtleSA9IGthW2ldXG4gICAgaWYgKCFlcXVhbChhW2tleV0sIGJba2V5XSwgbWVtb3MpKSByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIHJldHVybiB0cnVlXG59XG5cbi8vIChvYmplY3QpIC0+IGFycmF5XG5mdW5jdGlvbiBnZXRFbnVtZXJhYmxlUHJvcGVydGllcyAob2JqZWN0KSB7XG4gIHZhciByZXN1bHQgPSBbXVxuICBmb3IgKHZhciBrIGluIG9iamVjdCkgaWYgKGsgIT09ICdjb25zdHJ1Y3RvcicpIHtcbiAgICByZXN1bHQucHVzaChrKVxuICB9XG4gIHJldHVybiByZXN1bHRcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBlcXVhbFxuXG4iLCJcbnZhciB0b1N0cmluZyA9IHt9LnRvU3RyaW5nXG52YXIgRG9tTm9kZSA9IHR5cGVvZiB3aW5kb3cgIT0gJ3VuZGVmaW5lZCdcbiAgPyB3aW5kb3cuTm9kZVxuICA6IEZ1bmN0aW9uIC8vIGNvdWxkIGJlIGFueSBmdW5jdGlvblxuXG4vKipcbiAqIFJldHVybiB0aGUgdHlwZSBvZiB2YWwuXG4gKlxuICogQHBhcmFtIHtNaXhlZH0gdmFsXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IGZ1bmN0aW9uIHR5cGUoeCl7XG4gIHZhciB0eXBlID0gdHlwZW9mIHhcbiAgaWYgKHR5cGUgIT0gJ29iamVjdCcpIHJldHVybiB0eXBlXG4gIHR5cGUgPSB0eXBlc1t0b1N0cmluZy5jYWxsKHgpXVxuICBpZiAodHlwZSA9PSAnb2JqZWN0Jykge1xuICAgIC8vIGluIGNhc2UgdGhleSBoYXZlIGJlZW4gcG9seWZpbGxlZFxuICAgIGlmICh4IGluc3RhbmNlb2YgTWFwKSByZXR1cm4gJ21hcCdcbiAgICBpZiAoeCBpbnN0YW5jZW9mIFNldCkgcmV0dXJuICdzZXQnXG4gICAgcmV0dXJuICdvYmplY3QnXG4gIH1cbiAgaWYgKHR5cGUpIHJldHVybiB0eXBlXG4gIGlmICh4IGluc3RhbmNlb2YgRG9tTm9kZSkgc3dpdGNoICh4Lm5vZGVUeXBlKSB7XG4gICAgY2FzZSAxOiAgcmV0dXJuICdlbGVtZW50J1xuICAgIGNhc2UgMzogIHJldHVybiAndGV4dC1ub2RlJ1xuICAgIGNhc2UgOTogIHJldHVybiAnZG9jdW1lbnQnXG4gICAgY2FzZSAxMTogcmV0dXJuICdkb2N1bWVudC1mcmFnbWVudCdcbiAgICBkZWZhdWx0OiByZXR1cm4gJ2RvbS1ub2RlJ1xuICB9XG59XG5cbnZhciB0eXBlcyA9IGV4cG9ydHMudHlwZXMgPSB7XG4gICdbb2JqZWN0IEZ1bmN0aW9uXSc6ICdmdW5jdGlvbicsXG4gICdbb2JqZWN0IERhdGVdJzogJ2RhdGUnLFxuICAnW29iamVjdCBSZWdFeHBdJzogJ3JlZ2V4cCcsXG4gICdbb2JqZWN0IEFyZ3VtZW50c10nOiAnYXJndW1lbnRzJyxcbiAgJ1tvYmplY3QgQXJyYXldJzogJ2FycmF5JyxcbiAgJ1tvYmplY3QgU2V0XSc6ICdzZXQnLFxuICAnW29iamVjdCBTdHJpbmddJzogJ3N0cmluZycsXG4gICdbb2JqZWN0IE51bGxdJzogJ251bGwnLFxuICAnW29iamVjdCBVbmRlZmluZWRdJzogJ3VuZGVmaW5lZCcsXG4gICdbb2JqZWN0IE51bWJlcl0nOiAnbnVtYmVyJyxcbiAgJ1tvYmplY3QgQm9vbGVhbl0nOiAnYm9vbGVhbicsXG4gICdbb2JqZWN0IE9iamVjdF0nOiAnb2JqZWN0JyxcbiAgJ1tvYmplY3QgTWFwXSc6ICdtYXAnLFxuICAnW29iamVjdCBUZXh0XSc6ICd0ZXh0LW5vZGUnLFxuICAnW29iamVjdCBVaW50OEFycmF5XSc6ICdiaXQtYXJyYXknLFxuICAnW29iamVjdCBVaW50MTZBcnJheV0nOiAnYml0LWFycmF5JyxcbiAgJ1tvYmplY3QgVWludDMyQXJyYXldJzogJ2JpdC1hcnJheScsXG4gICdbb2JqZWN0IFVpbnQ4Q2xhbXBlZEFycmF5XSc6ICdiaXQtYXJyYXknLFxuICAnW29iamVjdCBFcnJvcl0nOiAnZXJyb3InLFxuICAnW29iamVjdCBGb3JtRGF0YV0nOiAnZm9ybS1kYXRhJyxcbiAgJ1tvYmplY3QgRmlsZV0nOiAnZmlsZScsXG4gICdbb2JqZWN0IEJsb2JdJzogJ2Jsb2InXG59XG5cbiIsIihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG5cdHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IGZhY3RvcnkoZXhwb3J0cykgOlxuXHR0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUoWydleHBvcnRzJ10sIGZhY3RvcnkpIDpcblx0KGdsb2JhbCA9IHR5cGVvZiBnbG9iYWxUaGlzICE9PSAndW5kZWZpbmVkJyA/IGdsb2JhbFRoaXMgOiBnbG9iYWwgfHwgc2VsZiwgZmFjdG9yeShnbG9iYWwubG91cGUgPSB7fSkpO1xufSh0aGlzLCAoZnVuY3Rpb24gKGV4cG9ydHMpIHsgJ3VzZSBzdHJpY3QnO1xuXG5cdHZhciBjb21tb25qc0dsb2JhbCA9IHR5cGVvZiBnbG9iYWxUaGlzICE9PSAndW5kZWZpbmVkJyA/IGdsb2JhbFRoaXMgOiB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnID8gc2VsZiA6IHt9O1xuXG5cdGZ1bmN0aW9uIGNyZWF0ZUNvbW1vbmpzTW9kdWxlKGZuKSB7XG5cdCAgdmFyIG1vZHVsZSA9IHsgZXhwb3J0czoge30gfTtcblx0XHRyZXR1cm4gZm4obW9kdWxlLCBtb2R1bGUuZXhwb3J0cyksIG1vZHVsZS5leHBvcnRzO1xuXHR9XG5cblx0dmFyIHR5cGVEZXRlY3QgPSBjcmVhdGVDb21tb25qc01vZHVsZShmdW5jdGlvbiAobW9kdWxlLCBleHBvcnRzKSB7XG5cdChmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG5cdFx0IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpIDtcblx0fShjb21tb25qc0dsb2JhbCwgKGZ1bmN0aW9uICgpIHtcblx0LyogIVxuXHQgKiB0eXBlLWRldGVjdFxuXHQgKiBDb3B5cmlnaHQoYykgMjAxMyBqYWtlIGx1ZXIgPGpha2VAYWxvZ2ljYWxwYXJhZG94LmNvbT5cblx0ICogTUlUIExpY2Vuc2VkXG5cdCAqL1xuXHR2YXIgcHJvbWlzZUV4aXN0cyA9IHR5cGVvZiBQcm9taXNlID09PSAnZnVuY3Rpb24nO1xuXG5cdC8qIGVzbGludC1kaXNhYmxlIG5vLXVuZGVmICovXG5cdHZhciBnbG9iYWxPYmplY3QgPSB0eXBlb2Ygc2VsZiA9PT0gJ29iamVjdCcgPyBzZWxmIDogY29tbW9uanNHbG9iYWw7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgaWQtYmxhY2tsaXN0XG5cblx0dmFyIHN5bWJvbEV4aXN0cyA9IHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnO1xuXHR2YXIgbWFwRXhpc3RzID0gdHlwZW9mIE1hcCAhPT0gJ3VuZGVmaW5lZCc7XG5cdHZhciBzZXRFeGlzdHMgPSB0eXBlb2YgU2V0ICE9PSAndW5kZWZpbmVkJztcblx0dmFyIHdlYWtNYXBFeGlzdHMgPSB0eXBlb2YgV2Vha01hcCAhPT0gJ3VuZGVmaW5lZCc7XG5cdHZhciB3ZWFrU2V0RXhpc3RzID0gdHlwZW9mIFdlYWtTZXQgIT09ICd1bmRlZmluZWQnO1xuXHR2YXIgZGF0YVZpZXdFeGlzdHMgPSB0eXBlb2YgRGF0YVZpZXcgIT09ICd1bmRlZmluZWQnO1xuXHR2YXIgc3ltYm9sSXRlcmF0b3JFeGlzdHMgPSBzeW1ib2xFeGlzdHMgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciAhPT0gJ3VuZGVmaW5lZCc7XG5cdHZhciBzeW1ib2xUb1N0cmluZ1RhZ0V4aXN0cyA9IHN5bWJvbEV4aXN0cyAmJiB0eXBlb2YgU3ltYm9sLnRvU3RyaW5nVGFnICE9PSAndW5kZWZpbmVkJztcblx0dmFyIHNldEVudHJpZXNFeGlzdHMgPSBzZXRFeGlzdHMgJiYgdHlwZW9mIFNldC5wcm90b3R5cGUuZW50cmllcyA9PT0gJ2Z1bmN0aW9uJztcblx0dmFyIG1hcEVudHJpZXNFeGlzdHMgPSBtYXBFeGlzdHMgJiYgdHlwZW9mIE1hcC5wcm90b3R5cGUuZW50cmllcyA9PT0gJ2Z1bmN0aW9uJztcblx0dmFyIHNldEl0ZXJhdG9yUHJvdG90eXBlID0gc2V0RW50cmllc0V4aXN0cyAmJiBPYmplY3QuZ2V0UHJvdG90eXBlT2YobmV3IFNldCgpLmVudHJpZXMoKSk7XG5cdHZhciBtYXBJdGVyYXRvclByb3RvdHlwZSA9IG1hcEVudHJpZXNFeGlzdHMgJiYgT2JqZWN0LmdldFByb3RvdHlwZU9mKG5ldyBNYXAoKS5lbnRyaWVzKCkpO1xuXHR2YXIgYXJyYXlJdGVyYXRvckV4aXN0cyA9IHN5bWJvbEl0ZXJhdG9yRXhpc3RzICYmIHR5cGVvZiBBcnJheS5wcm90b3R5cGVbU3ltYm9sLml0ZXJhdG9yXSA9PT0gJ2Z1bmN0aW9uJztcblx0dmFyIGFycmF5SXRlcmF0b3JQcm90b3R5cGUgPSBhcnJheUl0ZXJhdG9yRXhpc3RzICYmIE9iamVjdC5nZXRQcm90b3R5cGVPZihbXVtTeW1ib2wuaXRlcmF0b3JdKCkpO1xuXHR2YXIgc3RyaW5nSXRlcmF0b3JFeGlzdHMgPSBzeW1ib2xJdGVyYXRvckV4aXN0cyAmJiB0eXBlb2YgU3RyaW5nLnByb3RvdHlwZVtTeW1ib2wuaXRlcmF0b3JdID09PSAnZnVuY3Rpb24nO1xuXHR2YXIgc3RyaW5nSXRlcmF0b3JQcm90b3R5cGUgPSBzdHJpbmdJdGVyYXRvckV4aXN0cyAmJiBPYmplY3QuZ2V0UHJvdG90eXBlT2YoJydbU3ltYm9sLml0ZXJhdG9yXSgpKTtcblx0dmFyIHRvU3RyaW5nTGVmdFNsaWNlTGVuZ3RoID0gODtcblx0dmFyIHRvU3RyaW5nUmlnaHRTbGljZUxlbmd0aCA9IC0xO1xuXHQvKipcblx0ICogIyMjIHR5cGVPZiAob2JqKVxuXHQgKlxuXHQgKiBVc2VzIGBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nYCB0byBkZXRlcm1pbmUgdGhlIHR5cGUgb2YgYW4gb2JqZWN0LFxuXHQgKiBub3JtYWxpc2luZyBiZWhhdmlvdXIgYWNyb3NzIGVuZ2luZSB2ZXJzaW9ucyAmIHdlbGwgb3B0aW1pc2VkLlxuXHQgKlxuXHQgKiBAcGFyYW0ge01peGVkfSBvYmplY3Rcblx0ICogQHJldHVybiB7U3RyaW5nfSBvYmplY3QgdHlwZVxuXHQgKiBAYXBpIHB1YmxpY1xuXHQgKi9cblx0ZnVuY3Rpb24gdHlwZURldGVjdChvYmopIHtcblx0ICAvKiAhIFNwZWVkIG9wdGltaXNhdGlvblxuXHQgICAqIFByZTpcblx0ICAgKiAgIHN0cmluZyBsaXRlcmFsICAgICB4IDMsMDM5LDAzNSBvcHMvc2VjIMKxMS42MiUgKDc4IHJ1bnMgc2FtcGxlZClcblx0ICAgKiAgIGJvb2xlYW4gbGl0ZXJhbCAgICB4IDEsNDI0LDEzOCBvcHMvc2VjIMKxNC41NCUgKDc1IHJ1bnMgc2FtcGxlZClcblx0ICAgKiAgIG51bWJlciBsaXRlcmFsICAgICB4IDEsNjUzLDE1MyBvcHMvc2VjIMKxMS45MSUgKDgyIHJ1bnMgc2FtcGxlZClcblx0ICAgKiAgIHVuZGVmaW5lZCAgICAgICAgICB4IDksOTc4LDY2MCBvcHMvc2VjIMKxMS45MiUgKDc1IHJ1bnMgc2FtcGxlZClcblx0ICAgKiAgIGZ1bmN0aW9uICAgICAgICAgICB4IDIsNTU2LDc2OSBvcHMvc2VjIMKxMS43MyUgKDc3IHJ1bnMgc2FtcGxlZClcblx0ICAgKiBQb3N0OlxuXHQgICAqICAgc3RyaW5nIGxpdGVyYWwgICAgIHggMzgsNTY0LDc5NiBvcHMvc2VjIMKxMS4xNSUgKDc5IHJ1bnMgc2FtcGxlZClcblx0ICAgKiAgIGJvb2xlYW4gbGl0ZXJhbCAgICB4IDMxLDE0OCw5NDAgb3BzL3NlYyDCsTEuMTAlICg3OSBydW5zIHNhbXBsZWQpXG5cdCAgICogICBudW1iZXIgbGl0ZXJhbCAgICAgeCAzMiw2NzksMzMwIG9wcy9zZWMgwrExLjkwJSAoNzggcnVucyBzYW1wbGVkKVxuXHQgICAqICAgdW5kZWZpbmVkICAgICAgICAgIHggMzIsMzYzLDM2OCBvcHMvc2VjIMKxMS4wNyUgKDgyIHJ1bnMgc2FtcGxlZClcblx0ICAgKiAgIGZ1bmN0aW9uICAgICAgICAgICB4IDMxLDI5Niw4NzAgb3BzL3NlYyDCsTAuOTYlICg4MyBydW5zIHNhbXBsZWQpXG5cdCAgICovXG5cdCAgdmFyIHR5cGVvZk9iaiA9IHR5cGVvZiBvYmo7XG5cdCAgaWYgKHR5cGVvZk9iaiAhPT0gJ29iamVjdCcpIHtcblx0ICAgIHJldHVybiB0eXBlb2ZPYmo7XG5cdCAgfVxuXG5cdCAgLyogISBTcGVlZCBvcHRpbWlzYXRpb25cblx0ICAgKiBQcmU6XG5cdCAgICogICBudWxsICAgICAgICAgICAgICAgeCAyOCw2NDUsNzY1IG9wcy9zZWMgwrExLjE3JSAoODIgcnVucyBzYW1wbGVkKVxuXHQgICAqIFBvc3Q6XG5cdCAgICogICBudWxsICAgICAgICAgICAgICAgeCAzNiw0MjgsOTYyIG9wcy9zZWMgwrExLjM3JSAoODQgcnVucyBzYW1wbGVkKVxuXHQgICAqL1xuXHQgIGlmIChvYmogPT09IG51bGwpIHtcblx0ICAgIHJldHVybiAnbnVsbCc7XG5cdCAgfVxuXG5cdCAgLyogISBTcGVjIENvbmZvcm1hbmNlXG5cdCAgICogVGVzdDogYE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh3aW5kb3cpYGBcblx0ICAgKiAgLSBOb2RlID09PSBcIltvYmplY3QgZ2xvYmFsXVwiXG5cdCAgICogIC0gQ2hyb21lID09PSBcIltvYmplY3QgZ2xvYmFsXVwiXG5cdCAgICogIC0gRmlyZWZveCA9PT0gXCJbb2JqZWN0IFdpbmRvd11cIlxuXHQgICAqICAtIFBoYW50b21KUyA9PT0gXCJbb2JqZWN0IFdpbmRvd11cIlxuXHQgICAqICAtIFNhZmFyaSA9PT0gXCJbb2JqZWN0IFdpbmRvd11cIlxuXHQgICAqICAtIElFIDExID09PSBcIltvYmplY3QgV2luZG93XVwiXG5cdCAgICogIC0gSUUgRWRnZSA9PT0gXCJbb2JqZWN0IFdpbmRvd11cIlxuXHQgICAqIFRlc3Q6IGBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodGhpcylgYFxuXHQgICAqICAtIENocm9tZSBXb3JrZXIgPT09IFwiW29iamVjdCBnbG9iYWxdXCJcblx0ICAgKiAgLSBGaXJlZm94IFdvcmtlciA9PT0gXCJbb2JqZWN0IERlZGljYXRlZFdvcmtlckdsb2JhbFNjb3BlXVwiXG5cdCAgICogIC0gU2FmYXJpIFdvcmtlciA9PT0gXCJbb2JqZWN0IERlZGljYXRlZFdvcmtlckdsb2JhbFNjb3BlXVwiXG5cdCAgICogIC0gSUUgMTEgV29ya2VyID09PSBcIltvYmplY3QgV29ya2VyR2xvYmFsU2NvcGVdXCJcblx0ICAgKiAgLSBJRSBFZGdlIFdvcmtlciA9PT0gXCJbb2JqZWN0IFdvcmtlckdsb2JhbFNjb3BlXVwiXG5cdCAgICovXG5cdCAgaWYgKG9iaiA9PT0gZ2xvYmFsT2JqZWN0KSB7XG5cdCAgICByZXR1cm4gJ2dsb2JhbCc7XG5cdCAgfVxuXG5cdCAgLyogISBTcGVlZCBvcHRpbWlzYXRpb25cblx0ICAgKiBQcmU6XG5cdCAgICogICBhcnJheSBsaXRlcmFsICAgICAgeCAyLDg4OCwzNTIgb3BzL3NlYyDCsTAuNjclICg4MiBydW5zIHNhbXBsZWQpXG5cdCAgICogUG9zdDpcblx0ICAgKiAgIGFycmF5IGxpdGVyYWwgICAgICB4IDIyLDQ3OSw2NTAgb3BzL3NlYyDCsTAuOTYlICg4MSBydW5zIHNhbXBsZWQpXG5cdCAgICovXG5cdCAgaWYgKFxuXHQgICAgQXJyYXkuaXNBcnJheShvYmopICYmXG5cdCAgICAoc3ltYm9sVG9TdHJpbmdUYWdFeGlzdHMgPT09IGZhbHNlIHx8ICEoU3ltYm9sLnRvU3RyaW5nVGFnIGluIG9iaikpXG5cdCAgKSB7XG5cdCAgICByZXR1cm4gJ0FycmF5Jztcblx0ICB9XG5cblx0ICAvLyBOb3QgY2FjaGluZyBleGlzdGVuY2Ugb2YgYHdpbmRvd2AgYW5kIHJlbGF0ZWQgcHJvcGVydGllcyBkdWUgdG8gcG90ZW50aWFsXG5cdCAgLy8gZm9yIGB3aW5kb3dgIHRvIGJlIHVuc2V0IGJlZm9yZSB0ZXN0cyBpbiBxdWFzaS1icm93c2VyIGVudmlyb25tZW50cy5cblx0ICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcgJiYgd2luZG93ICE9PSBudWxsKSB7XG5cdCAgICAvKiAhIFNwZWMgQ29uZm9ybWFuY2Vcblx0ICAgICAqIChodHRwczovL2h0bWwuc3BlYy53aGF0d2cub3JnL211bHRpcGFnZS9icm93c2Vycy5odG1sI2xvY2F0aW9uKVxuXHQgICAgICogV2hhdFdHIEhUTUwkNy43LjMgLSBUaGUgYExvY2F0aW9uYCBpbnRlcmZhY2Vcblx0ICAgICAqIFRlc3Q6IGBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwod2luZG93LmxvY2F0aW9uKWBgXG5cdCAgICAgKiAgLSBJRSA8PTExID09PSBcIltvYmplY3QgT2JqZWN0XVwiXG5cdCAgICAgKiAgLSBJRSBFZGdlIDw9MTMgPT09IFwiW29iamVjdCBPYmplY3RdXCJcblx0ICAgICAqL1xuXHQgICAgaWYgKHR5cGVvZiB3aW5kb3cubG9jYXRpb24gPT09ICdvYmplY3QnICYmIG9iaiA9PT0gd2luZG93LmxvY2F0aW9uKSB7XG5cdCAgICAgIHJldHVybiAnTG9jYXRpb24nO1xuXHQgICAgfVxuXG5cdCAgICAvKiAhIFNwZWMgQ29uZm9ybWFuY2Vcblx0ICAgICAqIChodHRwczovL2h0bWwuc3BlYy53aGF0d2cub3JnLyNkb2N1bWVudClcblx0ICAgICAqIFdoYXRXRyBIVE1MJDMuMS4xIC0gVGhlIGBEb2N1bWVudGAgb2JqZWN0XG5cdCAgICAgKiBOb3RlOiBNb3N0IGJyb3dzZXJzIGN1cnJlbnRseSBhZGhlciB0byB0aGUgVzNDIERPTSBMZXZlbCAyIHNwZWNcblx0ICAgICAqICAgICAgIChodHRwczovL3d3dy53My5vcmcvVFIvRE9NLUxldmVsLTItSFRNTC9odG1sLmh0bWwjSUQtMjY4MDkyNjgpXG5cdCAgICAgKiAgICAgICB3aGljaCBzdWdnZXN0cyB0aGF0IGJyb3dzZXJzIHNob3VsZCB1c2UgSFRNTFRhYmxlQ2VsbEVsZW1lbnQgZm9yXG5cdCAgICAgKiAgICAgICBib3RoIFREIGFuZCBUSCBlbGVtZW50cy4gV2hhdFdHIHNlcGFyYXRlcyB0aGVzZS5cblx0ICAgICAqICAgICAgIFdoYXRXRyBIVE1MIHN0YXRlczpcblx0ICAgICAqICAgICAgICAgPiBGb3IgaGlzdG9yaWNhbCByZWFzb25zLCBXaW5kb3cgb2JqZWN0cyBtdXN0IGFsc28gaGF2ZSBhXG5cdCAgICAgKiAgICAgICAgID4gd3JpdGFibGUsIGNvbmZpZ3VyYWJsZSwgbm9uLWVudW1lcmFibGUgcHJvcGVydHkgbmFtZWRcblx0ICAgICAqICAgICAgICAgPiBIVE1MRG9jdW1lbnQgd2hvc2UgdmFsdWUgaXMgdGhlIERvY3VtZW50IGludGVyZmFjZSBvYmplY3QuXG5cdCAgICAgKiBUZXN0OiBgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGRvY3VtZW50KWBgXG5cdCAgICAgKiAgLSBDaHJvbWUgPT09IFwiW29iamVjdCBIVE1MRG9jdW1lbnRdXCJcblx0ICAgICAqICAtIEZpcmVmb3ggPT09IFwiW29iamVjdCBIVE1MRG9jdW1lbnRdXCJcblx0ICAgICAqICAtIFNhZmFyaSA9PT0gXCJbb2JqZWN0IEhUTUxEb2N1bWVudF1cIlxuXHQgICAgICogIC0gSUUgPD0xMCA9PT0gXCJbb2JqZWN0IERvY3VtZW50XVwiXG5cdCAgICAgKiAgLSBJRSAxMSA9PT0gXCJbb2JqZWN0IEhUTUxEb2N1bWVudF1cIlxuXHQgICAgICogIC0gSUUgRWRnZSA8PTEzID09PSBcIltvYmplY3QgSFRNTERvY3VtZW50XVwiXG5cdCAgICAgKi9cblx0ICAgIGlmICh0eXBlb2Ygd2luZG93LmRvY3VtZW50ID09PSAnb2JqZWN0JyAmJiBvYmogPT09IHdpbmRvdy5kb2N1bWVudCkge1xuXHQgICAgICByZXR1cm4gJ0RvY3VtZW50Jztcblx0ICAgIH1cblxuXHQgICAgaWYgKHR5cGVvZiB3aW5kb3cubmF2aWdhdG9yID09PSAnb2JqZWN0Jykge1xuXHQgICAgICAvKiAhIFNwZWMgQ29uZm9ybWFuY2Vcblx0ICAgICAgICogKGh0dHBzOi8vaHRtbC5zcGVjLndoYXR3Zy5vcmcvbXVsdGlwYWdlL3dlYmFwcGFwaXMuaHRtbCNtaW1ldHlwZWFycmF5KVxuXHQgICAgICAgKiBXaGF0V0cgSFRNTCQ4LjYuMS41IC0gUGx1Z2lucyAtIEludGVyZmFjZSBNaW1lVHlwZUFycmF5XG5cdCAgICAgICAqIFRlc3Q6IGBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobmF2aWdhdG9yLm1pbWVUeXBlcylgYFxuXHQgICAgICAgKiAgLSBJRSA8PTEwID09PSBcIltvYmplY3QgTVNNaW1lVHlwZXNDb2xsZWN0aW9uXVwiXG5cdCAgICAgICAqL1xuXHQgICAgICBpZiAodHlwZW9mIHdpbmRvdy5uYXZpZ2F0b3IubWltZVR5cGVzID09PSAnb2JqZWN0JyAmJlxuXHQgICAgICAgICAgb2JqID09PSB3aW5kb3cubmF2aWdhdG9yLm1pbWVUeXBlcykge1xuXHQgICAgICAgIHJldHVybiAnTWltZVR5cGVBcnJheSc7XG5cdCAgICAgIH1cblxuXHQgICAgICAvKiAhIFNwZWMgQ29uZm9ybWFuY2Vcblx0ICAgICAgICogKGh0dHBzOi8vaHRtbC5zcGVjLndoYXR3Zy5vcmcvbXVsdGlwYWdlL3dlYmFwcGFwaXMuaHRtbCNwbHVnaW5hcnJheSlcblx0ICAgICAgICogV2hhdFdHIEhUTUwkOC42LjEuNSAtIFBsdWdpbnMgLSBJbnRlcmZhY2UgUGx1Z2luQXJyYXlcblx0ICAgICAgICogVGVzdDogYE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChuYXZpZ2F0b3IucGx1Z2lucylgYFxuXHQgICAgICAgKiAgLSBJRSA8PTEwID09PSBcIltvYmplY3QgTVNQbHVnaW5zQ29sbGVjdGlvbl1cIlxuXHQgICAgICAgKi9cblx0ICAgICAgaWYgKHR5cGVvZiB3aW5kb3cubmF2aWdhdG9yLnBsdWdpbnMgPT09ICdvYmplY3QnICYmXG5cdCAgICAgICAgICBvYmogPT09IHdpbmRvdy5uYXZpZ2F0b3IucGx1Z2lucykge1xuXHQgICAgICAgIHJldHVybiAnUGx1Z2luQXJyYXknO1xuXHQgICAgICB9XG5cdCAgICB9XG5cblx0ICAgIGlmICgodHlwZW9mIHdpbmRvdy5IVE1MRWxlbWVudCA9PT0gJ2Z1bmN0aW9uJyB8fFxuXHQgICAgICAgIHR5cGVvZiB3aW5kb3cuSFRNTEVsZW1lbnQgPT09ICdvYmplY3QnKSAmJlxuXHQgICAgICAgIG9iaiBpbnN0YW5jZW9mIHdpbmRvdy5IVE1MRWxlbWVudCkge1xuXHQgICAgICAvKiAhIFNwZWMgQ29uZm9ybWFuY2Vcblx0ICAgICAgKiAoaHR0cHM6Ly9odG1sLnNwZWMud2hhdHdnLm9yZy9tdWx0aXBhZ2Uvd2ViYXBwYXBpcy5odG1sI3BsdWdpbmFycmF5KVxuXHQgICAgICAqIFdoYXRXRyBIVE1MJDQuNC40IC0gVGhlIGBibG9ja3F1b3RlYCBlbGVtZW50IC0gSW50ZXJmYWNlIGBIVE1MUXVvdGVFbGVtZW50YFxuXHQgICAgICAqIFRlc3Q6IGBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYmxvY2txdW90ZScpKWBgXG5cdCAgICAgICogIC0gSUUgPD0xMCA9PT0gXCJbb2JqZWN0IEhUTUxCbG9ja0VsZW1lbnRdXCJcblx0ICAgICAgKi9cblx0ICAgICAgaWYgKG9iai50YWdOYW1lID09PSAnQkxPQ0tRVU9URScpIHtcblx0ICAgICAgICByZXR1cm4gJ0hUTUxRdW90ZUVsZW1lbnQnO1xuXHQgICAgICB9XG5cblx0ICAgICAgLyogISBTcGVjIENvbmZvcm1hbmNlXG5cdCAgICAgICAqIChodHRwczovL2h0bWwuc3BlYy53aGF0d2cub3JnLyNodG1sdGFibGVkYXRhY2VsbGVsZW1lbnQpXG5cdCAgICAgICAqIFdoYXRXRyBIVE1MJDQuOS45IC0gVGhlIGB0ZGAgZWxlbWVudCAtIEludGVyZmFjZSBgSFRNTFRhYmxlRGF0YUNlbGxFbGVtZW50YFxuXHQgICAgICAgKiBOb3RlOiBNb3N0IGJyb3dzZXJzIGN1cnJlbnRseSBhZGhlciB0byB0aGUgVzNDIERPTSBMZXZlbCAyIHNwZWNcblx0ICAgICAgICogICAgICAgKGh0dHBzOi8vd3d3LnczLm9yZy9UUi9ET00tTGV2ZWwtMi1IVE1ML2h0bWwuaHRtbCNJRC04MjkxNTA3NSlcblx0ICAgICAgICogICAgICAgd2hpY2ggc3VnZ2VzdHMgdGhhdCBicm93c2VycyBzaG91bGQgdXNlIEhUTUxUYWJsZUNlbGxFbGVtZW50IGZvclxuXHQgICAgICAgKiAgICAgICBib3RoIFREIGFuZCBUSCBlbGVtZW50cy4gV2hhdFdHIHNlcGFyYXRlcyB0aGVzZS5cblx0ICAgICAgICogVGVzdDogT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RkJykpXG5cdCAgICAgICAqICAtIENocm9tZSA9PT0gXCJbb2JqZWN0IEhUTUxUYWJsZUNlbGxFbGVtZW50XVwiXG5cdCAgICAgICAqICAtIEZpcmVmb3ggPT09IFwiW29iamVjdCBIVE1MVGFibGVDZWxsRWxlbWVudF1cIlxuXHQgICAgICAgKiAgLSBTYWZhcmkgPT09IFwiW29iamVjdCBIVE1MVGFibGVDZWxsRWxlbWVudF1cIlxuXHQgICAgICAgKi9cblx0ICAgICAgaWYgKG9iai50YWdOYW1lID09PSAnVEQnKSB7XG5cdCAgICAgICAgcmV0dXJuICdIVE1MVGFibGVEYXRhQ2VsbEVsZW1lbnQnO1xuXHQgICAgICB9XG5cblx0ICAgICAgLyogISBTcGVjIENvbmZvcm1hbmNlXG5cdCAgICAgICAqIChodHRwczovL2h0bWwuc3BlYy53aGF0d2cub3JnLyNodG1sdGFibGVoZWFkZXJjZWxsZWxlbWVudClcblx0ICAgICAgICogV2hhdFdHIEhUTUwkNC45LjkgLSBUaGUgYHRkYCBlbGVtZW50IC0gSW50ZXJmYWNlIGBIVE1MVGFibGVIZWFkZXJDZWxsRWxlbWVudGBcblx0ICAgICAgICogTm90ZTogTW9zdCBicm93c2VycyBjdXJyZW50bHkgYWRoZXIgdG8gdGhlIFczQyBET00gTGV2ZWwgMiBzcGVjXG5cdCAgICAgICAqICAgICAgIChodHRwczovL3d3dy53My5vcmcvVFIvRE9NLUxldmVsLTItSFRNTC9odG1sLmh0bWwjSUQtODI5MTUwNzUpXG5cdCAgICAgICAqICAgICAgIHdoaWNoIHN1Z2dlc3RzIHRoYXQgYnJvd3NlcnMgc2hvdWxkIHVzZSBIVE1MVGFibGVDZWxsRWxlbWVudCBmb3Jcblx0ICAgICAgICogICAgICAgYm90aCBURCBhbmQgVEggZWxlbWVudHMuIFdoYXRXRyBzZXBhcmF0ZXMgdGhlc2UuXG5cdCAgICAgICAqIFRlc3Q6IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0aCcpKVxuXHQgICAgICAgKiAgLSBDaHJvbWUgPT09IFwiW29iamVjdCBIVE1MVGFibGVDZWxsRWxlbWVudF1cIlxuXHQgICAgICAgKiAgLSBGaXJlZm94ID09PSBcIltvYmplY3QgSFRNTFRhYmxlQ2VsbEVsZW1lbnRdXCJcblx0ICAgICAgICogIC0gU2FmYXJpID09PSBcIltvYmplY3QgSFRNTFRhYmxlQ2VsbEVsZW1lbnRdXCJcblx0ICAgICAgICovXG5cdCAgICAgIGlmIChvYmoudGFnTmFtZSA9PT0gJ1RIJykge1xuXHQgICAgICAgIHJldHVybiAnSFRNTFRhYmxlSGVhZGVyQ2VsbEVsZW1lbnQnO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfVxuXG5cdCAgLyogISBTcGVlZCBvcHRpbWlzYXRpb25cblx0ICAqIFByZTpcblx0ICAqICAgRmxvYXQ2NEFycmF5ICAgICAgIHggNjI1LDY0NCBvcHMvc2VjIMKxMS41OCUgKDgwIHJ1bnMgc2FtcGxlZClcblx0ICAqICAgRmxvYXQzMkFycmF5ICAgICAgIHggMSwyNzksODUyIG9wcy9zZWMgwrEyLjkxJSAoNzcgcnVucyBzYW1wbGVkKVxuXHQgICogICBVaW50MzJBcnJheSAgICAgICAgeCAxLDE3OCwxODUgb3BzL3NlYyDCsTEuOTUlICg4MyBydW5zIHNhbXBsZWQpXG5cdCAgKiAgIFVpbnQxNkFycmF5ICAgICAgICB4IDEsMDA4LDM4MCBvcHMvc2VjIMKxMi4yNSUgKDgwIHJ1bnMgc2FtcGxlZClcblx0ICAqICAgVWludDhBcnJheSAgICAgICAgIHggMSwxMjgsMDQwIG9wcy9zZWMgwrEyLjExJSAoODEgcnVucyBzYW1wbGVkKVxuXHQgICogICBJbnQzMkFycmF5ICAgICAgICAgeCAxLDE3MCwxMTkgb3BzL3NlYyDCsTIuODglICg4MCBydW5zIHNhbXBsZWQpXG5cdCAgKiAgIEludDE2QXJyYXkgICAgICAgICB4IDEsMTc2LDM0OCBvcHMvc2VjIMKxNS43OSUgKDg2IHJ1bnMgc2FtcGxlZClcblx0ICAqICAgSW50OEFycmF5ICAgICAgICAgIHggMSwwNTgsNzA3IG9wcy9zZWMgwrE0Ljk0JSAoNzcgcnVucyBzYW1wbGVkKVxuXHQgICogICBVaW50OENsYW1wZWRBcnJheSAgeCAxLDExMCw2MzMgb3BzL3NlYyDCsTQuMjAlICg4MCBydW5zIHNhbXBsZWQpXG5cdCAgKiBQb3N0OlxuXHQgICogICBGbG9hdDY0QXJyYXkgICAgICAgeCA3LDEwNSw2NzEgb3BzL3NlYyDCsTEzLjQ3JSAoNjQgcnVucyBzYW1wbGVkKVxuXHQgICogICBGbG9hdDMyQXJyYXkgICAgICAgeCA1LDg4Nyw5MTIgb3BzL3NlYyDCsTEuNDYlICg4MiBydW5zIHNhbXBsZWQpXG5cdCAgKiAgIFVpbnQzMkFycmF5ICAgICAgICB4IDYsNDkxLDY2MSBvcHMvc2VjIMKxMS43NiUgKDc5IHJ1bnMgc2FtcGxlZClcblx0ICAqICAgVWludDE2QXJyYXkgICAgICAgIHggNiw1NTksNzk1IG9wcy9zZWMgwrExLjY3JSAoODIgcnVucyBzYW1wbGVkKVxuXHQgICogICBVaW50OEFycmF5ICAgICAgICAgeCA2LDQ2Myw5NjYgb3BzL3NlYyDCsTEuNDMlICg4NSBydW5zIHNhbXBsZWQpXG5cdCAgKiAgIEludDMyQXJyYXkgICAgICAgICB4IDUsNjQxLDg0MSBvcHMvc2VjIMKxMy40OSUgKDgxIHJ1bnMgc2FtcGxlZClcblx0ICAqICAgSW50MTZBcnJheSAgICAgICAgIHggNiw1ODMsNTExIG9wcy9zZWMgwrExLjk4JSAoODAgcnVucyBzYW1wbGVkKVxuXHQgICogICBJbnQ4QXJyYXkgICAgICAgICAgeCA2LDYwNiwwNzggb3BzL3NlYyDCsTEuNzQlICg4MSBydW5zIHNhbXBsZWQpXG5cdCAgKiAgIFVpbnQ4Q2xhbXBlZEFycmF5ICB4IDYsNjAyLDIyNCBvcHMvc2VjIMKxMS43NyUgKDgzIHJ1bnMgc2FtcGxlZClcblx0ICAqL1xuXHQgIHZhciBzdHJpbmdUYWcgPSAoc3ltYm9sVG9TdHJpbmdUYWdFeGlzdHMgJiYgb2JqW1N5bWJvbC50b1N0cmluZ1RhZ10pO1xuXHQgIGlmICh0eXBlb2Ygc3RyaW5nVGFnID09PSAnc3RyaW5nJykge1xuXHQgICAgcmV0dXJuIHN0cmluZ1RhZztcblx0ICB9XG5cblx0ICB2YXIgb2JqUHJvdG90eXBlID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKG9iaik7XG5cdCAgLyogISBTcGVlZCBvcHRpbWlzYXRpb25cblx0ICAqIFByZTpcblx0ICAqICAgcmVnZXggbGl0ZXJhbCAgICAgIHggMSw3NzIsMzg1IG9wcy9zZWMgwrExLjg1JSAoNzcgcnVucyBzYW1wbGVkKVxuXHQgICogICByZWdleCBjb25zdHJ1Y3RvciAgeCAyLDE0Myw2MzQgb3BzL3NlYyDCsTIuNDYlICg3OCBydW5zIHNhbXBsZWQpXG5cdCAgKiBQb3N0OlxuXHQgICogICByZWdleCBsaXRlcmFsICAgICAgeCAzLDkyOCwwMDkgb3BzL3NlYyDCsTAuNjUlICg3OCBydW5zIHNhbXBsZWQpXG5cdCAgKiAgIHJlZ2V4IGNvbnN0cnVjdG9yICB4IDMsOTMxLDEwOCBvcHMvc2VjIMKxMC41OCUgKDg0IHJ1bnMgc2FtcGxlZClcblx0ICAqL1xuXHQgIGlmIChvYmpQcm90b3R5cGUgPT09IFJlZ0V4cC5wcm90b3R5cGUpIHtcblx0ICAgIHJldHVybiAnUmVnRXhwJztcblx0ICB9XG5cblx0ICAvKiAhIFNwZWVkIG9wdGltaXNhdGlvblxuXHQgICogUHJlOlxuXHQgICogICBkYXRlICAgICAgICAgICAgICAgeCAyLDEzMCwwNzQgb3BzL3NlYyDCsTQuNDIlICg2OCBydW5zIHNhbXBsZWQpXG5cdCAgKiBQb3N0OlxuXHQgICogICBkYXRlICAgICAgICAgICAgICAgeCAzLDk1Myw3Nzkgb3BzL3NlYyDCsTEuMzUlICg3NyBydW5zIHNhbXBsZWQpXG5cdCAgKi9cblx0ICBpZiAob2JqUHJvdG90eXBlID09PSBEYXRlLnByb3RvdHlwZSkge1xuXHQgICAgcmV0dXJuICdEYXRlJztcblx0ICB9XG5cblx0ICAvKiAhIFNwZWMgQ29uZm9ybWFuY2Vcblx0ICAgKiAoaHR0cDovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzYuMC9pbmRleC5odG1sI3NlYy1wcm9taXNlLnByb3RvdHlwZS1AQHRvc3RyaW5ndGFnKVxuXHQgICAqIEVTNiQyNS40LjUuNCAtIFByb21pc2UucHJvdG90eXBlW0BAdG9TdHJpbmdUYWddIHNob3VsZCBiZSBcIlByb21pc2VcIjpcblx0ICAgKiBUZXN0OiBgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKFByb21pc2UucmVzb2x2ZSgpKWBgXG5cdCAgICogIC0gQ2hyb21lIDw9NDcgPT09IFwiW29iamVjdCBPYmplY3RdXCJcblx0ICAgKiAgLSBFZGdlIDw9MjAgPT09IFwiW29iamVjdCBPYmplY3RdXCJcblx0ICAgKiAgLSBGaXJlZm94IDI5LUxhdGVzdCA9PT0gXCJbb2JqZWN0IFByb21pc2VdXCJcblx0ICAgKiAgLSBTYWZhcmkgNy4xLUxhdGVzdCA9PT0gXCJbb2JqZWN0IFByb21pc2VdXCJcblx0ICAgKi9cblx0ICBpZiAocHJvbWlzZUV4aXN0cyAmJiBvYmpQcm90b3R5cGUgPT09IFByb21pc2UucHJvdG90eXBlKSB7XG5cdCAgICByZXR1cm4gJ1Byb21pc2UnO1xuXHQgIH1cblxuXHQgIC8qICEgU3BlZWQgb3B0aW1pc2F0aW9uXG5cdCAgKiBQcmU6XG5cdCAgKiAgIHNldCAgICAgICAgICAgICAgICB4IDIsMjIyLDE4NiBvcHMvc2VjIMKxMS4zMSUgKDgyIHJ1bnMgc2FtcGxlZClcblx0ICAqIFBvc3Q6XG5cdCAgKiAgIHNldCAgICAgICAgICAgICAgICB4IDQsNTQ1LDg3OSBvcHMvc2VjIMKxMS4xMyUgKDgzIHJ1bnMgc2FtcGxlZClcblx0ICAqL1xuXHQgIGlmIChzZXRFeGlzdHMgJiYgb2JqUHJvdG90eXBlID09PSBTZXQucHJvdG90eXBlKSB7XG5cdCAgICByZXR1cm4gJ1NldCc7XG5cdCAgfVxuXG5cdCAgLyogISBTcGVlZCBvcHRpbWlzYXRpb25cblx0ICAqIFByZTpcblx0ICAqICAgbWFwICAgICAgICAgICAgICAgIHggMiwzOTYsODQyIG9wcy9zZWMgwrExLjU5JSAoODEgcnVucyBzYW1wbGVkKVxuXHQgICogUG9zdDpcblx0ICAqICAgbWFwICAgICAgICAgICAgICAgIHggNCwxODMsOTQ1IG9wcy9zZWMgwrE2LjU5JSAoODIgcnVucyBzYW1wbGVkKVxuXHQgICovXG5cdCAgaWYgKG1hcEV4aXN0cyAmJiBvYmpQcm90b3R5cGUgPT09IE1hcC5wcm90b3R5cGUpIHtcblx0ICAgIHJldHVybiAnTWFwJztcblx0ICB9XG5cblx0ICAvKiAhIFNwZWVkIG9wdGltaXNhdGlvblxuXHQgICogUHJlOlxuXHQgICogICB3ZWFrc2V0ICAgICAgICAgICAgeCAxLDMyMywyMjAgb3BzL3NlYyDCsTIuMTclICg3NiBydW5zIHNhbXBsZWQpXG5cdCAgKiBQb3N0OlxuXHQgICogICB3ZWFrc2V0ICAgICAgICAgICAgeCA0LDIzNyw1MTAgb3BzL3NlYyDCsTIuMDElICg3NyBydW5zIHNhbXBsZWQpXG5cdCAgKi9cblx0ICBpZiAod2Vha1NldEV4aXN0cyAmJiBvYmpQcm90b3R5cGUgPT09IFdlYWtTZXQucHJvdG90eXBlKSB7XG5cdCAgICByZXR1cm4gJ1dlYWtTZXQnO1xuXHQgIH1cblxuXHQgIC8qICEgU3BlZWQgb3B0aW1pc2F0aW9uXG5cdCAgKiBQcmU6XG5cdCAgKiAgIHdlYWttYXAgICAgICAgICAgICB4IDEsNTAwLDI2MCBvcHMvc2VjIMKxMi4wMiUgKDc4IHJ1bnMgc2FtcGxlZClcblx0ICAqIFBvc3Q6XG5cdCAgKiAgIHdlYWttYXAgICAgICAgICAgICB4IDMsODgxLDM4NCBvcHMvc2VjIMKxMS40NSUgKDgyIHJ1bnMgc2FtcGxlZClcblx0ICAqL1xuXHQgIGlmICh3ZWFrTWFwRXhpc3RzICYmIG9ialByb3RvdHlwZSA9PT0gV2Vha01hcC5wcm90b3R5cGUpIHtcblx0ICAgIHJldHVybiAnV2Vha01hcCc7XG5cdCAgfVxuXG5cdCAgLyogISBTcGVjIENvbmZvcm1hbmNlXG5cdCAgICogKGh0dHA6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi82LjAvaW5kZXguaHRtbCNzZWMtZGF0YXZpZXcucHJvdG90eXBlLUBAdG9zdHJpbmd0YWcpXG5cdCAgICogRVM2JDI0LjIuNC4yMSAtIERhdGFWaWV3LnByb3RvdHlwZVtAQHRvU3RyaW5nVGFnXSBzaG91bGQgYmUgXCJEYXRhVmlld1wiOlxuXHQgICAqIFRlc3Q6IGBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobmV3IERhdGFWaWV3KG5ldyBBcnJheUJ1ZmZlcigxKSkpYGBcblx0ICAgKiAgLSBFZGdlIDw9MTMgPT09IFwiW29iamVjdCBPYmplY3RdXCJcblx0ICAgKi9cblx0ICBpZiAoZGF0YVZpZXdFeGlzdHMgJiYgb2JqUHJvdG90eXBlID09PSBEYXRhVmlldy5wcm90b3R5cGUpIHtcblx0ICAgIHJldHVybiAnRGF0YVZpZXcnO1xuXHQgIH1cblxuXHQgIC8qICEgU3BlYyBDb25mb3JtYW5jZVxuXHQgICAqIChodHRwOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNi4wL2luZGV4Lmh0bWwjc2VjLSVtYXBpdGVyYXRvcnByb3RvdHlwZSUtQEB0b3N0cmluZ3RhZylcblx0ICAgKiBFUzYkMjMuMS41LjIuMiAtICVNYXBJdGVyYXRvclByb3RvdHlwZSVbQEB0b1N0cmluZ1RhZ10gc2hvdWxkIGJlIFwiTWFwIEl0ZXJhdG9yXCI6XG5cdCAgICogVGVzdDogYE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChuZXcgTWFwKCkuZW50cmllcygpKWBgXG5cdCAgICogIC0gRWRnZSA8PTEzID09PSBcIltvYmplY3QgT2JqZWN0XVwiXG5cdCAgICovXG5cdCAgaWYgKG1hcEV4aXN0cyAmJiBvYmpQcm90b3R5cGUgPT09IG1hcEl0ZXJhdG9yUHJvdG90eXBlKSB7XG5cdCAgICByZXR1cm4gJ01hcCBJdGVyYXRvcic7XG5cdCAgfVxuXG5cdCAgLyogISBTcGVjIENvbmZvcm1hbmNlXG5cdCAgICogKGh0dHA6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi82LjAvaW5kZXguaHRtbCNzZWMtJXNldGl0ZXJhdG9ycHJvdG90eXBlJS1AQHRvc3RyaW5ndGFnKVxuXHQgICAqIEVTNiQyMy4yLjUuMi4yIC0gJVNldEl0ZXJhdG9yUHJvdG90eXBlJVtAQHRvU3RyaW5nVGFnXSBzaG91bGQgYmUgXCJTZXQgSXRlcmF0b3JcIjpcblx0ICAgKiBUZXN0OiBgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG5ldyBTZXQoKS5lbnRyaWVzKCkpYGBcblx0ICAgKiAgLSBFZGdlIDw9MTMgPT09IFwiW29iamVjdCBPYmplY3RdXCJcblx0ICAgKi9cblx0ICBpZiAoc2V0RXhpc3RzICYmIG9ialByb3RvdHlwZSA9PT0gc2V0SXRlcmF0b3JQcm90b3R5cGUpIHtcblx0ICAgIHJldHVybiAnU2V0IEl0ZXJhdG9yJztcblx0ICB9XG5cblx0ICAvKiAhIFNwZWMgQ29uZm9ybWFuY2Vcblx0ICAgKiAoaHR0cDovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzYuMC9pbmRleC5odG1sI3NlYy0lYXJyYXlpdGVyYXRvcnByb3RvdHlwZSUtQEB0b3N0cmluZ3RhZylcblx0ICAgKiBFUzYkMjIuMS41LjIuMiAtICVBcnJheUl0ZXJhdG9yUHJvdG90eXBlJVtAQHRvU3RyaW5nVGFnXSBzaG91bGQgYmUgXCJBcnJheSBJdGVyYXRvclwiOlxuXHQgICAqIFRlc3Q6IGBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoW11bU3ltYm9sLml0ZXJhdG9yXSgpKWBgXG5cdCAgICogIC0gRWRnZSA8PTEzID09PSBcIltvYmplY3QgT2JqZWN0XVwiXG5cdCAgICovXG5cdCAgaWYgKGFycmF5SXRlcmF0b3JFeGlzdHMgJiYgb2JqUHJvdG90eXBlID09PSBhcnJheUl0ZXJhdG9yUHJvdG90eXBlKSB7XG5cdCAgICByZXR1cm4gJ0FycmF5IEl0ZXJhdG9yJztcblx0ICB9XG5cblx0ICAvKiAhIFNwZWMgQ29uZm9ybWFuY2Vcblx0ICAgKiAoaHR0cDovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzYuMC9pbmRleC5odG1sI3NlYy0lc3RyaW5naXRlcmF0b3Jwcm90b3R5cGUlLUBAdG9zdHJpbmd0YWcpXG5cdCAgICogRVM2JDIxLjEuNS4yLjIgLSAlU3RyaW5nSXRlcmF0b3JQcm90b3R5cGUlW0BAdG9TdHJpbmdUYWddIHNob3VsZCBiZSBcIlN0cmluZyBJdGVyYXRvclwiOlxuXHQgICAqIFRlc3Q6IGBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoJydbU3ltYm9sLml0ZXJhdG9yXSgpKWBgXG5cdCAgICogIC0gRWRnZSA8PTEzID09PSBcIltvYmplY3QgT2JqZWN0XVwiXG5cdCAgICovXG5cdCAgaWYgKHN0cmluZ0l0ZXJhdG9yRXhpc3RzICYmIG9ialByb3RvdHlwZSA9PT0gc3RyaW5nSXRlcmF0b3JQcm90b3R5cGUpIHtcblx0ICAgIHJldHVybiAnU3RyaW5nIEl0ZXJhdG9yJztcblx0ICB9XG5cblx0ICAvKiAhIFNwZWVkIG9wdGltaXNhdGlvblxuXHQgICogUHJlOlxuXHQgICogICBvYmplY3QgZnJvbSBudWxsICAgeCAyLDQyNCwzMjAgb3BzL3NlYyDCsTEuNjclICg3NiBydW5zIHNhbXBsZWQpXG5cdCAgKiBQb3N0OlxuXHQgICogICBvYmplY3QgZnJvbSBudWxsICAgeCA1LDgzOCwwMDAgb3BzL3NlYyDCsTAuOTklICg4NCBydW5zIHNhbXBsZWQpXG5cdCAgKi9cblx0ICBpZiAob2JqUHJvdG90eXBlID09PSBudWxsKSB7XG5cdCAgICByZXR1cm4gJ09iamVjdCc7XG5cdCAgfVxuXG5cdCAgcmV0dXJuIE9iamVjdFxuXHQgICAgLnByb3RvdHlwZVxuXHQgICAgLnRvU3RyaW5nXG5cdCAgICAuY2FsbChvYmopXG5cdCAgICAuc2xpY2UodG9TdHJpbmdMZWZ0U2xpY2VMZW5ndGgsIHRvU3RyaW5nUmlnaHRTbGljZUxlbmd0aCk7XG5cdH1cblxuXHRyZXR1cm4gdHlwZURldGVjdDtcblxuXHR9KSkpO1xuXHR9KTtcblxuXHRmdW5jdGlvbiBfc2xpY2VkVG9BcnJheShhcnIsIGkpIHtcblx0ICByZXR1cm4gX2FycmF5V2l0aEhvbGVzKGFycikgfHwgX2l0ZXJhYmxlVG9BcnJheUxpbWl0KGFyciwgaSkgfHwgX3Vuc3VwcG9ydGVkSXRlcmFibGVUb0FycmF5KGFyciwgaSkgfHwgX25vbkl0ZXJhYmxlUmVzdCgpO1xuXHR9XG5cblx0ZnVuY3Rpb24gX2FycmF5V2l0aEhvbGVzKGFycikge1xuXHQgIGlmIChBcnJheS5pc0FycmF5KGFycikpIHJldHVybiBhcnI7XG5cdH1cblxuXHRmdW5jdGlvbiBfaXRlcmFibGVUb0FycmF5TGltaXQoYXJyLCBpKSB7XG5cdCAgaWYgKHR5cGVvZiBTeW1ib2wgPT09IFwidW5kZWZpbmVkXCIgfHwgIShTeW1ib2wuaXRlcmF0b3IgaW4gT2JqZWN0KGFycikpKSByZXR1cm47XG5cdCAgdmFyIF9hcnIgPSBbXTtcblx0ICB2YXIgX24gPSB0cnVlO1xuXHQgIHZhciBfZCA9IGZhbHNlO1xuXHQgIHZhciBfZSA9IHVuZGVmaW5lZDtcblxuXHQgIHRyeSB7XG5cdCAgICBmb3IgKHZhciBfaSA9IGFycltTeW1ib2wuaXRlcmF0b3JdKCksIF9zOyAhKF9uID0gKF9zID0gX2kubmV4dCgpKS5kb25lKTsgX24gPSB0cnVlKSB7XG5cdCAgICAgIF9hcnIucHVzaChfcy52YWx1ZSk7XG5cblx0ICAgICAgaWYgKGkgJiYgX2Fyci5sZW5ndGggPT09IGkpIGJyZWFrO1xuXHQgICAgfVxuXHQgIH0gY2F0Y2ggKGVycikge1xuXHQgICAgX2QgPSB0cnVlO1xuXHQgICAgX2UgPSBlcnI7XG5cdCAgfSBmaW5hbGx5IHtcblx0ICAgIHRyeSB7XG5cdCAgICAgIGlmICghX24gJiYgX2lbXCJyZXR1cm5cIl0gIT0gbnVsbCkgX2lbXCJyZXR1cm5cIl0oKTtcblx0ICAgIH0gZmluYWxseSB7XG5cdCAgICAgIGlmIChfZCkgdGhyb3cgX2U7XG5cdCAgICB9XG5cdCAgfVxuXG5cdCAgcmV0dXJuIF9hcnI7XG5cdH1cblxuXHRmdW5jdGlvbiBfdW5zdXBwb3J0ZWRJdGVyYWJsZVRvQXJyYXkobywgbWluTGVuKSB7XG5cdCAgaWYgKCFvKSByZXR1cm47XG5cdCAgaWYgKHR5cGVvZiBvID09PSBcInN0cmluZ1wiKSByZXR1cm4gX2FycmF5TGlrZVRvQXJyYXkobywgbWluTGVuKTtcblx0ICB2YXIgbiA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKS5zbGljZSg4LCAtMSk7XG5cdCAgaWYgKG4gPT09IFwiT2JqZWN0XCIgJiYgby5jb25zdHJ1Y3RvcikgbiA9IG8uY29uc3RydWN0b3IubmFtZTtcblx0ICBpZiAobiA9PT0gXCJNYXBcIiB8fCBuID09PSBcIlNldFwiKSByZXR1cm4gQXJyYXkuZnJvbShvKTtcblx0ICBpZiAobiA9PT0gXCJBcmd1bWVudHNcIiB8fCAvXig/OlVpfEkpbnQoPzo4fDE2fDMyKSg/OkNsYW1wZWQpP0FycmF5JC8udGVzdChuKSkgcmV0dXJuIF9hcnJheUxpa2VUb0FycmF5KG8sIG1pbkxlbik7XG5cdH1cblxuXHRmdW5jdGlvbiBfYXJyYXlMaWtlVG9BcnJheShhcnIsIGxlbikge1xuXHQgIGlmIChsZW4gPT0gbnVsbCB8fCBsZW4gPiBhcnIubGVuZ3RoKSBsZW4gPSBhcnIubGVuZ3RoO1xuXG5cdCAgZm9yICh2YXIgaSA9IDAsIGFycjIgPSBuZXcgQXJyYXkobGVuKTsgaSA8IGxlbjsgaSsrKSBhcnIyW2ldID0gYXJyW2ldO1xuXG5cdCAgcmV0dXJuIGFycjI7XG5cdH1cblxuXHRmdW5jdGlvbiBfbm9uSXRlcmFibGVSZXN0KCkge1xuXHQgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJJbnZhbGlkIGF0dGVtcHQgdG8gZGVzdHJ1Y3R1cmUgbm9uLWl0ZXJhYmxlIGluc3RhbmNlLlxcbkluIG9yZGVyIHRvIGJlIGl0ZXJhYmxlLCBub24tYXJyYXkgb2JqZWN0cyBtdXN0IGhhdmUgYSBbU3ltYm9sLml0ZXJhdG9yXSgpIG1ldGhvZC5cIik7XG5cdH1cblxuXHR2YXIgYW5zaUNvbG9ycyA9IHtcblx0ICBib2xkOiBbJzEnLCAnMjInXSxcblx0ICBkaW06IFsnMicsICcyMiddLFxuXHQgIGl0YWxpYzogWyczJywgJzIzJ10sXG5cdCAgdW5kZXJsaW5lOiBbJzQnLCAnMjQnXSxcblx0ICAvLyA1ICYgNiBhcmUgYmxpbmtpbmdcblx0ICBpbnZlcnNlOiBbJzcnLCAnMjcnXSxcblx0ICBoaWRkZW46IFsnOCcsICcyOCddLFxuXHQgIHN0cmlrZTogWyc5JywgJzI5J10sXG5cdCAgLy8gMTAtMjAgYXJlIGZvbnRzXG5cdCAgLy8gMjEtMjkgYXJlIHJlc2V0cyBmb3IgMS05XG5cdCAgYmxhY2s6IFsnMzAnLCAnMzknXSxcblx0ICByZWQ6IFsnMzEnLCAnMzknXSxcblx0ICBncmVlbjogWyczMicsICczOSddLFxuXHQgIHllbGxvdzogWyczMycsICczOSddLFxuXHQgIGJsdWU6IFsnMzQnLCAnMzknXSxcblx0ICBtYWdlbnRhOiBbJzM1JywgJzM5J10sXG5cdCAgY3lhbjogWyczNicsICczOSddLFxuXHQgIHdoaXRlOiBbJzM3JywgJzM5J10sXG5cdCAgYnJpZ2h0YmxhY2s6IFsnMzA7MScsICczOSddLFxuXHQgIGJyaWdodHJlZDogWyczMTsxJywgJzM5J10sXG5cdCAgYnJpZ2h0Z3JlZW46IFsnMzI7MScsICczOSddLFxuXHQgIGJyaWdodHllbGxvdzogWyczMzsxJywgJzM5J10sXG5cdCAgYnJpZ2h0Ymx1ZTogWyczNDsxJywgJzM5J10sXG5cdCAgYnJpZ2h0bWFnZW50YTogWyczNTsxJywgJzM5J10sXG5cdCAgYnJpZ2h0Y3lhbjogWyczNjsxJywgJzM5J10sXG5cdCAgYnJpZ2h0d2hpdGU6IFsnMzc7MScsICczOSddLFxuXHQgIGdyZXk6IFsnOTAnLCAnMzknXVxuXHR9O1xuXHR2YXIgc3R5bGVzID0ge1xuXHQgIHNwZWNpYWw6ICdjeWFuJyxcblx0ICBudW1iZXI6ICd5ZWxsb3cnLFxuXHQgIGJvb2xlYW46ICd5ZWxsb3cnLFxuXHQgIHVuZGVmaW5lZDogJ2dyZXknLFxuXHQgIG51bGw6ICdib2xkJyxcblx0ICBzdHJpbmc6ICdncmVlbicsXG5cdCAgc3ltYm9sOiAnZ3JlZW4nLFxuXHQgIGRhdGU6ICdtYWdlbnRhJyxcblx0ICByZWdleHA6ICdyZWQnXG5cdH07XG5cdHZhciB0cnVuY2F0b3IgPSAn4oCmJztcblxuXHRmdW5jdGlvbiBjb2xvcmlzZSh2YWx1ZSwgc3R5bGVUeXBlKSB7XG5cdCAgdmFyIGNvbG9yID0gYW5zaUNvbG9yc1tzdHlsZXNbc3R5bGVUeXBlXV0gfHwgYW5zaUNvbG9yc1tzdHlsZVR5cGVdO1xuXG5cdCAgaWYgKCFjb2xvcikge1xuXHQgICAgcmV0dXJuIFN0cmluZyh2YWx1ZSk7XG5cdCAgfVxuXG5cdCAgcmV0dXJuIFwiXFx4MUJbXCIuY29uY2F0KGNvbG9yWzBdLCBcIm1cIikuY29uY2F0KFN0cmluZyh2YWx1ZSksIFwiXFx4MUJbXCIpLmNvbmNhdChjb2xvclsxXSwgXCJtXCIpO1xuXHR9XG5cblx0ZnVuY3Rpb24gbm9ybWFsaXNlT3B0aW9ucygpIHtcblx0ICB2YXIgX3JlZiA9IGFyZ3VtZW50cy5sZW5ndGggPiAwICYmIGFyZ3VtZW50c1swXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzBdIDoge30sXG5cdCAgICAgIF9yZWYkc2hvd0hpZGRlbiA9IF9yZWYuc2hvd0hpZGRlbixcblx0ICAgICAgc2hvd0hpZGRlbiA9IF9yZWYkc2hvd0hpZGRlbiA9PT0gdm9pZCAwID8gZmFsc2UgOiBfcmVmJHNob3dIaWRkZW4sXG5cdCAgICAgIF9yZWYkZGVwdGggPSBfcmVmLmRlcHRoLFxuXHQgICAgICBkZXB0aCA9IF9yZWYkZGVwdGggPT09IHZvaWQgMCA/IDIgOiBfcmVmJGRlcHRoLFxuXHQgICAgICBfcmVmJGNvbG9ycyA9IF9yZWYuY29sb3JzLFxuXHQgICAgICBjb2xvcnMgPSBfcmVmJGNvbG9ycyA9PT0gdm9pZCAwID8gZmFsc2UgOiBfcmVmJGNvbG9ycyxcblx0ICAgICAgX3JlZiRjdXN0b21JbnNwZWN0ID0gX3JlZi5jdXN0b21JbnNwZWN0LFxuXHQgICAgICBjdXN0b21JbnNwZWN0ID0gX3JlZiRjdXN0b21JbnNwZWN0ID09PSB2b2lkIDAgPyB0cnVlIDogX3JlZiRjdXN0b21JbnNwZWN0LFxuXHQgICAgICBfcmVmJHNob3dQcm94eSA9IF9yZWYuc2hvd1Byb3h5LFxuXHQgICAgICBzaG93UHJveHkgPSBfcmVmJHNob3dQcm94eSA9PT0gdm9pZCAwID8gZmFsc2UgOiBfcmVmJHNob3dQcm94eSxcblx0ICAgICAgX3JlZiRtYXhBcnJheUxlbmd0aCA9IF9yZWYubWF4QXJyYXlMZW5ndGgsXG5cdCAgICAgIG1heEFycmF5TGVuZ3RoID0gX3JlZiRtYXhBcnJheUxlbmd0aCA9PT0gdm9pZCAwID8gSW5maW5pdHkgOiBfcmVmJG1heEFycmF5TGVuZ3RoLFxuXHQgICAgICBfcmVmJGJyZWFrTGVuZ3RoID0gX3JlZi5icmVha0xlbmd0aCxcblx0ICAgICAgYnJlYWtMZW5ndGggPSBfcmVmJGJyZWFrTGVuZ3RoID09PSB2b2lkIDAgPyBJbmZpbml0eSA6IF9yZWYkYnJlYWtMZW5ndGgsXG5cdCAgICAgIF9yZWYkc2VlbiA9IF9yZWYuc2Vlbixcblx0ICAgICAgc2VlbiA9IF9yZWYkc2VlbiA9PT0gdm9pZCAwID8gW10gOiBfcmVmJHNlZW4sXG5cdCAgICAgIF9yZWYkdHJ1bmNhdGUgPSBfcmVmLnRydW5jYXRlLFxuXHQgICAgICB0cnVuY2F0ZSA9IF9yZWYkdHJ1bmNhdGUgPT09IHZvaWQgMCA/IEluZmluaXR5IDogX3JlZiR0cnVuY2F0ZSxcblx0ICAgICAgX3JlZiRzdHlsaXplID0gX3JlZi5zdHlsaXplLFxuXHQgICAgICBzdHlsaXplID0gX3JlZiRzdHlsaXplID09PSB2b2lkIDAgPyBTdHJpbmcgOiBfcmVmJHN0eWxpemU7XG5cblx0ICB2YXIgb3B0aW9ucyA9IHtcblx0ICAgIHNob3dIaWRkZW46IEJvb2xlYW4oc2hvd0hpZGRlbiksXG5cdCAgICBkZXB0aDogTnVtYmVyKGRlcHRoKSxcblx0ICAgIGNvbG9yczogQm9vbGVhbihjb2xvcnMpLFxuXHQgICAgY3VzdG9tSW5zcGVjdDogQm9vbGVhbihjdXN0b21JbnNwZWN0KSxcblx0ICAgIHNob3dQcm94eTogQm9vbGVhbihzaG93UHJveHkpLFxuXHQgICAgbWF4QXJyYXlMZW5ndGg6IE51bWJlcihtYXhBcnJheUxlbmd0aCksXG5cdCAgICBicmVha0xlbmd0aDogTnVtYmVyKGJyZWFrTGVuZ3RoKSxcblx0ICAgIHRydW5jYXRlOiBOdW1iZXIodHJ1bmNhdGUpLFxuXHQgICAgc2Vlbjogc2Vlbixcblx0ICAgIHN0eWxpemU6IHN0eWxpemVcblx0ICB9O1xuXG5cdCAgaWYgKG9wdGlvbnMuY29sb3JzKSB7XG5cdCAgICBvcHRpb25zLnN0eWxpemUgPSBjb2xvcmlzZTtcblx0ICB9XG5cblx0ICByZXR1cm4gb3B0aW9ucztcblx0fVxuXHRmdW5jdGlvbiB0cnVuY2F0ZShzdHJpbmcsIGxlbmd0aCkge1xuXHQgIHZhciB0YWlsID0gYXJndW1lbnRzLmxlbmd0aCA+IDIgJiYgYXJndW1lbnRzWzJdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMl0gOiB0cnVuY2F0b3I7XG5cdCAgc3RyaW5nID0gU3RyaW5nKHN0cmluZyk7XG5cdCAgdmFyIHRhaWxMZW5ndGggPSB0YWlsLmxlbmd0aDtcblx0ICB2YXIgc3RyaW5nTGVuZ3RoID0gc3RyaW5nLmxlbmd0aDtcblxuXHQgIGlmICh0YWlsTGVuZ3RoID4gbGVuZ3RoICYmIHN0cmluZ0xlbmd0aCA+IHRhaWxMZW5ndGgpIHtcblx0ICAgIHJldHVybiB0YWlsO1xuXHQgIH1cblxuXHQgIGlmIChzdHJpbmdMZW5ndGggPiBsZW5ndGggJiYgc3RyaW5nTGVuZ3RoID4gdGFpbExlbmd0aCkge1xuXHQgICAgcmV0dXJuIFwiXCIuY29uY2F0KHN0cmluZy5zbGljZSgwLCBsZW5ndGggLSB0YWlsTGVuZ3RoKSkuY29uY2F0KHRhaWwpO1xuXHQgIH1cblxuXHQgIHJldHVybiBzdHJpbmc7XG5cdH0gLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGNvbXBsZXhpdHlcblxuXHRmdW5jdGlvbiBpbnNwZWN0TGlzdChsaXN0LCBvcHRpb25zLCBpbnNwZWN0SXRlbSkge1xuXHQgIHZhciBzZXBhcmF0b3IgPSBhcmd1bWVudHMubGVuZ3RoID4gMyAmJiBhcmd1bWVudHNbM10gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1szXSA6ICcsICc7XG5cdCAgaW5zcGVjdEl0ZW0gPSBpbnNwZWN0SXRlbSB8fCBvcHRpb25zLmluc3BlY3Q7XG5cdCAgdmFyIHNpemUgPSBsaXN0Lmxlbmd0aDtcblx0ICBpZiAoc2l6ZSA9PT0gMCkgcmV0dXJuICcnO1xuXHQgIHZhciBvcmlnaW5hbExlbmd0aCA9IG9wdGlvbnMudHJ1bmNhdGU7XG5cdCAgdmFyIG91dHB1dCA9ICcnO1xuXHQgIHZhciBwZWVrID0gJyc7XG5cdCAgdmFyIHRydW5jYXRlZCA9ICcnO1xuXG5cdCAgZm9yICh2YXIgaSA9IDA7IGkgPCBzaXplOyBpICs9IDEpIHtcblx0ICAgIHZhciBsYXN0ID0gaSArIDEgPT09IGxpc3QubGVuZ3RoO1xuXHQgICAgdmFyIHNlY29uZFRvTGFzdCA9IGkgKyAyID09PSBsaXN0Lmxlbmd0aDtcblx0ICAgIHRydW5jYXRlZCA9IFwiXCIuY29uY2F0KHRydW5jYXRvciwgXCIoXCIpLmNvbmNhdChsaXN0Lmxlbmd0aCAtIGksIFwiKVwiKTtcblx0ICAgIHZhciB2YWx1ZSA9IGxpc3RbaV07IC8vIElmIHRoZXJlIGlzIG1vcmUgdGhhbiBvbmUgcmVtYWluaW5nIHdlIG5lZWQgdG8gYWNjb3VudCBmb3IgYSBzZXBhcmF0b3Igb2YgYCwgYFxuXG5cdCAgICBvcHRpb25zLnRydW5jYXRlID0gb3JpZ2luYWxMZW5ndGggLSBvdXRwdXQubGVuZ3RoIC0gKGxhc3QgPyAwIDogc2VwYXJhdG9yLmxlbmd0aCk7XG5cdCAgICB2YXIgc3RyaW5nID0gcGVlayB8fCBpbnNwZWN0SXRlbSh2YWx1ZSwgb3B0aW9ucykgKyAobGFzdCA/ICcnIDogc2VwYXJhdG9yKTtcblx0ICAgIHZhciBuZXh0TGVuZ3RoID0gb3V0cHV0Lmxlbmd0aCArIHN0cmluZy5sZW5ndGg7XG5cdCAgICB2YXIgdHJ1bmNhdGVkTGVuZ3RoID0gbmV4dExlbmd0aCArIHRydW5jYXRlZC5sZW5ndGg7IC8vIElmIHRoaXMgaXMgdGhlIGxhc3QgZWxlbWVudCwgYW5kIGFkZGluZyBpdCB3b3VsZFxuXHQgICAgLy8gdGFrZSB1cyBvdmVyIGxlbmd0aCwgYnV0IGFkZGluZyB0aGUgdHJ1bmNhdG9yIHdvdWxkbid0IC0gdGhlbiBicmVhayBub3dcblxuXHQgICAgaWYgKGxhc3QgJiYgbmV4dExlbmd0aCA+IG9yaWdpbmFsTGVuZ3RoICYmIG91dHB1dC5sZW5ndGggKyB0cnVuY2F0ZWQubGVuZ3RoIDw9IG9yaWdpbmFsTGVuZ3RoKSB7XG5cdCAgICAgIGJyZWFrO1xuXHQgICAgfSAvLyBJZiB0aGlzIGlzbid0IHRoZSBsYXN0IG9yIHNlY29uZCB0byBsYXN0IGVsZW1lbnQgdG8gc2Nhbixcblx0ICAgIC8vIGJ1dCB0aGUgc3RyaW5nIGlzIGFscmVhZHkgb3ZlciBsZW5ndGggdGhlbiBicmVhayBoZXJlXG5cblxuXHQgICAgaWYgKCFsYXN0ICYmICFzZWNvbmRUb0xhc3QgJiYgdHJ1bmNhdGVkTGVuZ3RoID4gb3JpZ2luYWxMZW5ndGgpIHtcblx0ICAgICAgYnJlYWs7XG5cdCAgICB9IC8vIFBlZWsgYXQgdGhlIG5leHQgc3RyaW5nIHRvIGRldGVybWluZSBpZiB3ZSBzaG91bGRcblx0ICAgIC8vIGJyZWFrIGVhcmx5IGJlZm9yZSBhZGRpbmcgdGhpcyBpdGVtIHRvIHRoZSBvdXRwdXRcblxuXG5cdCAgICBwZWVrID0gbGFzdCA/ICcnIDogaW5zcGVjdEl0ZW0obGlzdFtpICsgMV0sIG9wdGlvbnMpICsgKHNlY29uZFRvTGFzdCA/ICcnIDogc2VwYXJhdG9yKTsgLy8gSWYgd2UgaGF2ZSBvbmUgZWxlbWVudCBsZWZ0LCBidXQgdGhpcyBlbGVtZW50IGFuZFxuXHQgICAgLy8gdGhlIG5leHQgdGFrZXMgb3ZlciBsZW5ndGgsIHRoZSBicmVhayBlYXJseVxuXG5cdCAgICBpZiAoIWxhc3QgJiYgc2Vjb25kVG9MYXN0ICYmIHRydW5jYXRlZExlbmd0aCA+IG9yaWdpbmFsTGVuZ3RoICYmIG5leHRMZW5ndGggKyBwZWVrLmxlbmd0aCA+IG9yaWdpbmFsTGVuZ3RoKSB7XG5cdCAgICAgIGJyZWFrO1xuXHQgICAgfVxuXG5cdCAgICBvdXRwdXQgKz0gc3RyaW5nOyAvLyBJZiB0aGUgbmV4dCBlbGVtZW50IHRha2VzIHVzIHRvIGxlbmd0aCAtXG5cdCAgICAvLyBidXQgdGhlcmUgYXJlIG1vcmUgYWZ0ZXIgdGhhdCwgdGhlbiB3ZSBzaG91bGQgdHJ1bmNhdGUgbm93XG5cblx0ICAgIGlmICghbGFzdCAmJiAhc2Vjb25kVG9MYXN0ICYmIG5leHRMZW5ndGggKyBwZWVrLmxlbmd0aCA+PSBvcmlnaW5hbExlbmd0aCkge1xuXHQgICAgICB0cnVuY2F0ZWQgPSBcIlwiLmNvbmNhdCh0cnVuY2F0b3IsIFwiKFwiKS5jb25jYXQobGlzdC5sZW5ndGggLSBpIC0gMSwgXCIpXCIpO1xuXHQgICAgICBicmVhaztcblx0ICAgIH1cblxuXHQgICAgdHJ1bmNhdGVkID0gJyc7XG5cdCAgfVxuXG5cdCAgcmV0dXJuIFwiXCIuY29uY2F0KG91dHB1dCkuY29uY2F0KHRydW5jYXRlZCk7XG5cdH1cblx0ZnVuY3Rpb24gaW5zcGVjdFByb3BlcnR5KF9yZWYyLCBvcHRpb25zKSB7XG5cdCAgdmFyIF9yZWYzID0gX3NsaWNlZFRvQXJyYXkoX3JlZjIsIDIpLFxuXHQgICAgICBrZXkgPSBfcmVmM1swXSxcblx0ICAgICAgdmFsdWUgPSBfcmVmM1sxXTtcblxuXHQgIG9wdGlvbnMudHJ1bmNhdGUgLT0gMjtcblxuXHQgIGlmICh0eXBlb2Yga2V5ICE9PSAnc3RyaW5nJyAmJiB0eXBlb2Yga2V5ICE9PSAnbnVtYmVyJykge1xuXHQgICAga2V5ID0gXCJbXCIuY29uY2F0KG9wdGlvbnMuaW5zcGVjdChrZXksIG9wdGlvbnMpLCBcIl1cIik7XG5cdCAgfVxuXG5cdCAgb3B0aW9ucy50cnVuY2F0ZSAtPSBrZXkubGVuZ3RoO1xuXHQgIHZhbHVlID0gb3B0aW9ucy5pbnNwZWN0KHZhbHVlLCBvcHRpb25zKTtcblx0ICByZXR1cm4gXCJcIi5jb25jYXQoa2V5LCBcIjogXCIpLmNvbmNhdCh2YWx1ZSk7XG5cdH1cblxuXHRmdW5jdGlvbiBpbnNwZWN0QXJyYXkoYXJyYXksIG9wdGlvbnMpIHtcblx0ICAvLyBPYmplY3Qua2V5cyB3aWxsIGFsd2F5cyBvdXRwdXQgdGhlIEFycmF5IGluZGljZXMgZmlyc3QsIHNvIHdlIGNhbiBzbGljZSBieVxuXHQgIC8vIGBhcnJheS5sZW5ndGhgIHRvIGdldCBub24taW5kZXggcHJvcGVydGllc1xuXHQgIHZhciBub25JbmRleFByb3BlcnRpZXMgPSBPYmplY3Qua2V5cyhhcnJheSkuc2xpY2UoYXJyYXkubGVuZ3RoKTtcblx0ICBpZiAoIWFycmF5Lmxlbmd0aCAmJiAhbm9uSW5kZXhQcm9wZXJ0aWVzLmxlbmd0aCkgcmV0dXJuICdbXSc7XG5cdCAgb3B0aW9ucy50cnVuY2F0ZSAtPSA0O1xuXHQgIHZhciBsaXN0Q29udGVudHMgPSBpbnNwZWN0TGlzdChhcnJheSwgb3B0aW9ucyk7XG5cdCAgb3B0aW9ucy50cnVuY2F0ZSAtPSBsaXN0Q29udGVudHMubGVuZ3RoO1xuXHQgIHZhciBwcm9wZXJ0eUNvbnRlbnRzID0gJyc7XG5cblx0ICBpZiAobm9uSW5kZXhQcm9wZXJ0aWVzLmxlbmd0aCkge1xuXHQgICAgcHJvcGVydHlDb250ZW50cyA9IGluc3BlY3RMaXN0KG5vbkluZGV4UHJvcGVydGllcy5tYXAoZnVuY3Rpb24gKGtleSkge1xuXHQgICAgICByZXR1cm4gW2tleSwgYXJyYXlba2V5XV07XG5cdCAgICB9KSwgb3B0aW9ucywgaW5zcGVjdFByb3BlcnR5KTtcblx0ICB9XG5cblx0ICByZXR1cm4gXCJbIFwiLmNvbmNhdChsaXN0Q29udGVudHMpLmNvbmNhdChwcm9wZXJ0eUNvbnRlbnRzID8gXCIsIFwiLmNvbmNhdChwcm9wZXJ0eUNvbnRlbnRzKSA6ICcnLCBcIiBdXCIpO1xuXHR9XG5cblx0LyogIVxuXHQgKiBDaGFpIC0gZ2V0RnVuY05hbWUgdXRpbGl0eVxuXHQgKiBDb3B5cmlnaHQoYykgMjAxMi0yMDE2IEpha2UgTHVlciA8amFrZUBhbG9naWNhbHBhcmFkb3guY29tPlxuXHQgKiBNSVQgTGljZW5zZWRcblx0ICovXG5cblx0LyoqXG5cdCAqICMjIyAuZ2V0RnVuY05hbWUoY29uc3RydWN0b3JGbilcblx0ICpcblx0ICogUmV0dXJucyB0aGUgbmFtZSBvZiBhIGZ1bmN0aW9uLlxuXHQgKiBXaGVuIGEgbm9uLWZ1bmN0aW9uIGluc3RhbmNlIGlzIHBhc3NlZCwgcmV0dXJucyBgbnVsbGAuXG5cdCAqIFRoaXMgYWxzbyBpbmNsdWRlcyBhIHBvbHlmaWxsIGZ1bmN0aW9uIGlmIGBhRnVuYy5uYW1lYCBpcyBub3QgZGVmaW5lZC5cblx0ICpcblx0ICogQG5hbWUgZ2V0RnVuY05hbWVcblx0ICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuY3Rcblx0ICogQG5hbWVzcGFjZSBVdGlsc1xuXHQgKiBAYXBpIHB1YmxpY1xuXHQgKi9cblxuXHR2YXIgdG9TdHJpbmcgPSBGdW5jdGlvbi5wcm90b3R5cGUudG9TdHJpbmc7XG5cdHZhciBmdW5jdGlvbk5hbWVNYXRjaCA9IC9cXHMqZnVuY3Rpb24oPzpcXHN8XFxzKlxcL1xcKlteKD86KlxcLyldK1xcKlxcL1xccyopKihbXlxcc1xcKFxcL10rKS87XG5cdGZ1bmN0aW9uIGdldEZ1bmNOYW1lKGFGdW5jKSB7XG5cdCAgaWYgKHR5cGVvZiBhRnVuYyAhPT0gJ2Z1bmN0aW9uJykge1xuXHQgICAgcmV0dXJuIG51bGw7XG5cdCAgfVxuXG5cdCAgdmFyIG5hbWUgPSAnJztcblx0ICBpZiAodHlwZW9mIEZ1bmN0aW9uLnByb3RvdHlwZS5uYW1lID09PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgYUZ1bmMubmFtZSA9PT0gJ3VuZGVmaW5lZCcpIHtcblx0ICAgIC8vIEhlcmUgd2UgcnVuIGEgcG9seWZpbGwgaWYgRnVuY3Rpb24gZG9lcyBub3Qgc3VwcG9ydCB0aGUgYG5hbWVgIHByb3BlcnR5IGFuZCBpZiBhRnVuYy5uYW1lIGlzIG5vdCBkZWZpbmVkXG5cdCAgICB2YXIgbWF0Y2ggPSB0b1N0cmluZy5jYWxsKGFGdW5jKS5tYXRjaChmdW5jdGlvbk5hbWVNYXRjaCk7XG5cdCAgICBpZiAobWF0Y2gpIHtcblx0ICAgICAgbmFtZSA9IG1hdGNoWzFdO1xuXHQgICAgfVxuXHQgIH0gZWxzZSB7XG5cdCAgICAvLyBJZiB3ZSd2ZSBnb3QgYSBgbmFtZWAgcHJvcGVydHkgd2UganVzdCB1c2UgaXRcblx0ICAgIG5hbWUgPSBhRnVuYy5uYW1lO1xuXHQgIH1cblxuXHQgIHJldHVybiBuYW1lO1xuXHR9XG5cblx0dmFyIGdldEZ1bmNOYW1lXzEgPSBnZXRGdW5jTmFtZTtcblxuXHR2YXIgZ2V0QXJyYXlOYW1lID0gZnVuY3Rpb24gZ2V0QXJyYXlOYW1lKGFycmF5KSB7XG5cdCAgLy8gV2UgbmVlZCB0byBzcGVjaWFsIGNhc2UgTm9kZS5qcycgQnVmZmVycywgd2hpY2ggcmVwb3J0IHRvIGJlIFVpbnQ4QXJyYXlcblx0ICBpZiAodHlwZW9mIEJ1ZmZlciA9PT0gJ2Z1bmN0aW9uJyAmJiBhcnJheSBpbnN0YW5jZW9mIEJ1ZmZlcikge1xuXHQgICAgcmV0dXJuICdCdWZmZXInO1xuXHQgIH1cblxuXHQgIGlmIChhcnJheVtTeW1ib2wudG9TdHJpbmdUYWddKSB7XG5cdCAgICByZXR1cm4gYXJyYXlbU3ltYm9sLnRvU3RyaW5nVGFnXTtcblx0ICB9XG5cblx0ICByZXR1cm4gZ2V0RnVuY05hbWVfMShhcnJheS5jb25zdHJ1Y3Rvcik7XG5cdH07XG5cblx0ZnVuY3Rpb24gaW5zcGVjdFR5cGVkQXJyYXkoYXJyYXksIG9wdGlvbnMpIHtcblx0ICB2YXIgbmFtZSA9IGdldEFycmF5TmFtZShhcnJheSk7XG5cdCAgb3B0aW9ucy50cnVuY2F0ZSAtPSBuYW1lLmxlbmd0aCArIDQ7IC8vIE9iamVjdC5rZXlzIHdpbGwgYWx3YXlzIG91dHB1dCB0aGUgQXJyYXkgaW5kaWNlcyBmaXJzdCwgc28gd2UgY2FuIHNsaWNlIGJ5XG5cdCAgLy8gYGFycmF5Lmxlbmd0aGAgdG8gZ2V0IG5vbi1pbmRleCBwcm9wZXJ0aWVzXG5cblx0ICB2YXIgbm9uSW5kZXhQcm9wZXJ0aWVzID0gT2JqZWN0LmtleXMoYXJyYXkpLnNsaWNlKGFycmF5Lmxlbmd0aCk7XG5cdCAgaWYgKCFhcnJheS5sZW5ndGggJiYgIW5vbkluZGV4UHJvcGVydGllcy5sZW5ndGgpIHJldHVybiBcIlwiLmNvbmNhdChuYW1lLCBcIltdXCIpOyAvLyBBcyB3ZSBrbm93IFR5cGVkQXJyYXlzIG9ubHkgY29udGFpbiBVbnNpZ25lZCBJbnRlZ2Vycywgd2UgY2FuIHNraXAgaW5zcGVjdGluZyBlYWNoIG9uZSBhbmQgc2ltcGx5XG5cdCAgLy8gc3R5bGlzZSB0aGUgdG9TdHJpbmcoKSB2YWx1ZSBvZiB0aGVtXG5cblx0ICB2YXIgb3V0cHV0ID0gJyc7XG5cblx0ICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG5cdCAgICB2YXIgc3RyaW5nID0gXCJcIi5jb25jYXQob3B0aW9ucy5zdHlsaXplKHRydW5jYXRlKGFycmF5W2ldLCBvcHRpb25zLnRydW5jYXRlKSwgJ251bWJlcicpKS5jb25jYXQoaSA9PT0gYXJyYXkubGVuZ3RoIC0gMSA/ICcnIDogJywgJyk7XG5cdCAgICBvcHRpb25zLnRydW5jYXRlIC09IHN0cmluZy5sZW5ndGg7XG5cblx0ICAgIGlmIChhcnJheVtpXSAhPT0gYXJyYXkubGVuZ3RoICYmIG9wdGlvbnMudHJ1bmNhdGUgPD0gMykge1xuXHQgICAgICBvdXRwdXQgKz0gXCJcIi5jb25jYXQodHJ1bmNhdG9yLCBcIihcIikuY29uY2F0KGFycmF5Lmxlbmd0aCAtIGFycmF5W2ldICsgMSwgXCIpXCIpO1xuXHQgICAgICBicmVhaztcblx0ICAgIH1cblxuXHQgICAgb3V0cHV0ICs9IHN0cmluZztcblx0ICB9XG5cblx0ICB2YXIgcHJvcGVydHlDb250ZW50cyA9ICcnO1xuXG5cdCAgaWYgKG5vbkluZGV4UHJvcGVydGllcy5sZW5ndGgpIHtcblx0ICAgIHByb3BlcnR5Q29udGVudHMgPSBpbnNwZWN0TGlzdChub25JbmRleFByb3BlcnRpZXMubWFwKGZ1bmN0aW9uIChrZXkpIHtcblx0ICAgICAgcmV0dXJuIFtrZXksIGFycmF5W2tleV1dO1xuXHQgICAgfSksIG9wdGlvbnMsIGluc3BlY3RQcm9wZXJ0eSk7XG5cdCAgfVxuXG5cdCAgcmV0dXJuIFwiXCIuY29uY2F0KG5hbWUsIFwiWyBcIikuY29uY2F0KG91dHB1dCkuY29uY2F0KHByb3BlcnR5Q29udGVudHMgPyBcIiwgXCIuY29uY2F0KHByb3BlcnR5Q29udGVudHMpIDogJycsIFwiIF1cIik7XG5cdH1cblxuXHRmdW5jdGlvbiBpbnNwZWN0RGF0ZShkYXRlT2JqZWN0LCBvcHRpb25zKSB7XG5cdCAgLy8gSWYgd2UgbmVlZCB0byAtIHRydW5jYXRlIHRoZSB0aW1lIHBvcnRpb24sIGJ1dCBuZXZlciB0aGUgZGF0ZVxuXHQgIHZhciBzcGxpdCA9IGRhdGVPYmplY3QudG9KU09OKCkuc3BsaXQoJ1QnKTtcblx0ICB2YXIgZGF0ZSA9IHNwbGl0WzBdO1xuXHQgIHJldHVybiBvcHRpb25zLnN0eWxpemUoXCJcIi5jb25jYXQoZGF0ZSwgXCJUXCIpLmNvbmNhdCh0cnVuY2F0ZShzcGxpdFsxXSwgb3B0aW9ucy50cnVuY2F0ZSAtIGRhdGUubGVuZ3RoIC0gMSkpLCAnZGF0ZScpO1xuXHR9XG5cblx0dmFyIHRvU3RyaW5nJDEgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG5cdHZhciBnZXRGdW5jdGlvbk5hbWUgPSBmdW5jdGlvbihmbikge1xuXHQgIGlmICh0b1N0cmluZyQxLmNhbGwoZm4pICE9PSAnW29iamVjdCBGdW5jdGlvbl0nKSByZXR1cm4gbnVsbFxuXHQgIGlmIChmbi5uYW1lKSByZXR1cm4gZm4ubmFtZVxuXHQgIHRyeSB7XG5cdFx0ICB2YXIgbmFtZSA9IC9eXFxzKmZ1bmN0aW9uXFxzKihbXlxcKF0qKS9pbS5leGVjKGZuLnRvU3RyaW5nKCkpWzFdO1xuXHQgIH0gY2F0Y2ggKCBlICkgeyByZXR1cm4gJ2Fub255bW91cycgfTtcblx0ICByZXR1cm4gbmFtZSB8fCAnYW5vbnltb3VzJ1xuXHR9O1xuXG5cdGZ1bmN0aW9uIGluc3BlY3RGdW5jdGlvbihmdW5jLCBvcHRpb25zKSB7XG5cdCAgdmFyIG5hbWUgPSBnZXRGdW5jdGlvbk5hbWUoZnVuYyk7XG5cblx0ICBpZiAobmFtZSA9PT0gJ2Fub255bW91cycpIHtcblx0ICAgIHJldHVybiBvcHRpb25zLnN0eWxpemUoJ1tGdW5jdGlvbl0nLCAnc3BlY2lhbCcpO1xuXHQgIH1cblxuXHQgIHJldHVybiBvcHRpb25zLnN0eWxpemUoXCJbRnVuY3Rpb24gXCIuY29uY2F0KHRydW5jYXRlKG5hbWUsIG9wdGlvbnMudHJ1bmNhdGUgLSAxMSksIFwiXVwiKSwgJ3NwZWNpYWwnKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGluc3BlY3RNYXBFbnRyeShfcmVmLCBvcHRpb25zKSB7XG5cdCAgdmFyIF9yZWYyID0gX3NsaWNlZFRvQXJyYXkoX3JlZiwgMiksXG5cdCAgICAgIGtleSA9IF9yZWYyWzBdLFxuXHQgICAgICB2YWx1ZSA9IF9yZWYyWzFdO1xuXG5cdCAgb3B0aW9ucy50cnVuY2F0ZSAtPSA0O1xuXHQgIGtleSA9IG9wdGlvbnMuaW5zcGVjdChrZXksIG9wdGlvbnMpO1xuXHQgIG9wdGlvbnMudHJ1bmNhdGUgLT0ga2V5Lmxlbmd0aDtcblx0ICB2YWx1ZSA9IG9wdGlvbnMuaW5zcGVjdCh2YWx1ZSwgb3B0aW9ucyk7XG5cdCAgcmV0dXJuIFwiXCIuY29uY2F0KGtleSwgXCIgPT4gXCIpLmNvbmNhdCh2YWx1ZSk7XG5cdH0gLy8gSUUxMSBkb2Vzbid0IHN1cHBvcnQgYG1hcC5lbnRyaWVzKClgXG5cblxuXHRmdW5jdGlvbiBtYXBUb0VudHJpZXMobWFwKSB7XG5cdCAgdmFyIGVudHJpZXMgPSBbXTtcblx0ICBtYXAuZm9yRWFjaChmdW5jdGlvbiAodmFsdWUsIGtleSkge1xuXHQgICAgZW50cmllcy5wdXNoKFtrZXksIHZhbHVlXSk7XG5cdCAgfSk7XG5cdCAgcmV0dXJuIGVudHJpZXM7XG5cdH1cblxuXHRmdW5jdGlvbiBpbnNwZWN0TWFwKG1hcCwgb3B0aW9ucykge1xuXHQgIHZhciBzaXplID0gbWFwLnNpemUgLSAxO1xuXG5cdCAgaWYgKHNpemUgPD0gMCkge1xuXHQgICAgcmV0dXJuICdNYXB7fSc7XG5cdCAgfVxuXG5cdCAgb3B0aW9ucy50cnVuY2F0ZSAtPSA3O1xuXHQgIHJldHVybiBcIk1hcHsgXCIuY29uY2F0KGluc3BlY3RMaXN0KG1hcFRvRW50cmllcyhtYXApLCBvcHRpb25zLCBpbnNwZWN0TWFwRW50cnkpLCBcIiB9XCIpO1xuXHR9XG5cblx0dmFyIGlzTmFOID0gTnVtYmVyLmlzTmFOIHx8IGZ1bmN0aW9uIChpKSB7XG5cdCAgcmV0dXJuIGkgIT09IGk7XG5cdH07IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tc2VsZi1jb21wYXJlXG5cblxuXHRmdW5jdGlvbiBpbnNwZWN0TnVtYmVyKG51bWJlciwgb3B0aW9ucykge1xuXHQgIGlmIChpc05hTihudW1iZXIpKSB7XG5cdCAgICByZXR1cm4gb3B0aW9ucy5zdHlsaXplKCdOYU4nLCAnbnVtYmVyJyk7XG5cdCAgfVxuXG5cdCAgaWYgKG51bWJlciA9PT0gSW5maW5pdHkpIHtcblx0ICAgIHJldHVybiBvcHRpb25zLnN0eWxpemUoJ0luZmluaXR5JywgJ251bWJlcicpO1xuXHQgIH1cblxuXHQgIGlmIChudW1iZXIgPT09IC1JbmZpbml0eSkge1xuXHQgICAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZSgnLUluZmluaXR5JywgJ251bWJlcicpO1xuXHQgIH1cblxuXHQgIGlmIChudW1iZXIgPT09IDApIHtcblx0ICAgIHJldHVybiBvcHRpb25zLnN0eWxpemUoMSAvIG51bWJlciA9PT0gSW5maW5pdHkgPyAnKzAnIDogJy0wJywgJ251bWJlcicpO1xuXHQgIH1cblxuXHQgIHJldHVybiBvcHRpb25zLnN0eWxpemUodHJ1bmNhdGUobnVtYmVyLCBvcHRpb25zLnRydW5jYXRlKSwgJ251bWJlcicpO1xuXHR9XG5cblx0ZnVuY3Rpb24gaW5zcGVjdFJlZ0V4cCh2YWx1ZSwgb3B0aW9ucykge1xuXHQgIHZhciBmbGFncyA9IHZhbHVlLnRvU3RyaW5nKCkuc3BsaXQoJy8nKVsyXTtcblx0ICB2YXIgc291cmNlTGVuZ3RoID0gb3B0aW9ucy50cnVuY2F0ZSAtICgyICsgZmxhZ3MubGVuZ3RoKTtcblx0ICB2YXIgc291cmNlID0gdmFsdWUuc291cmNlO1xuXHQgIHJldHVybiBvcHRpb25zLnN0eWxpemUoXCIvXCIuY29uY2F0KHRydW5jYXRlKHNvdXJjZSwgc291cmNlTGVuZ3RoKSwgXCIvXCIpLmNvbmNhdChmbGFncyksICdyZWdleHAnKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGFycmF5RnJvbVNldChzZXQpIHtcblx0ICB2YXIgdmFsdWVzID0gW107XG5cdCAgc2V0LmZvckVhY2goZnVuY3Rpb24gKHZhbHVlKSB7XG5cdCAgICB2YWx1ZXMucHVzaCh2YWx1ZSk7XG5cdCAgfSk7XG5cdCAgcmV0dXJuIHZhbHVlcztcblx0fVxuXG5cdGZ1bmN0aW9uIGluc3BlY3RTZXQoc2V0LCBvcHRpb25zKSB7XG5cdCAgaWYgKHNldC5zaXplID09PSAwKSByZXR1cm4gJ1NldHt9Jztcblx0ICBvcHRpb25zLnRydW5jYXRlIC09IDc7XG5cdCAgcmV0dXJuIFwiU2V0eyBcIi5jb25jYXQoaW5zcGVjdExpc3QoYXJyYXlGcm9tU2V0KHNldCksIG9wdGlvbnMpLCBcIiB9XCIpO1xuXHR9XG5cblx0dmFyIHN0cmluZ0VzY2FwZUNoYXJzID0gbmV3IFJlZ0V4cChcIlsnXFxcXHUwMDAwLVxcXFx1MDAxZlxcXFx1MDA3Zi1cXFxcdTAwOWZcXFxcdTAwYWRcXFxcdTA2MDAtXFxcXHUwNjA0XFxcXHUwNzBmXFxcXHUxN2I0XFxcXHUxN2I1XCIgKyBcIlxcXFx1MjAwYy1cXFxcdTIwMGZcXFxcdTIwMjgtXFxcXHUyMDJmXFxcXHUyMDYwLVxcXFx1MjA2ZlxcXFx1ZmVmZlxcXFx1ZmZmMC1cXFxcdWZmZmZdXCIsICdnJyk7XG5cdHZhciBlc2NhcGVDaGFyYWN0ZXJzID0ge1xuXHQgICdcXGInOiAnXFxcXGInLFxuXHQgICdcXHQnOiAnXFxcXHQnLFxuXHQgICdcXG4nOiAnXFxcXG4nLFxuXHQgICdcXGYnOiAnXFxcXGYnLFxuXHQgICdcXHInOiAnXFxcXHInLFxuXHQgIFwiJ1wiOiBcIlxcXFwnXCIsXG5cdCAgJ1xcXFwnOiAnXFxcXFxcXFwnXG5cdH07XG5cdHZhciBoZXggPSAxNjtcblx0dmFyIHVuaWNvZGVMZW5ndGggPSA0O1xuXG5cdGZ1bmN0aW9uIGVzY2FwZShjaGFyKSB7XG5cdCAgcmV0dXJuIGVzY2FwZUNoYXJhY3RlcnNbY2hhcl0gfHwgXCJcXFxcdVwiLmNvbmNhdChcIjAwMDBcIi5jb25jYXQoY2hhci5jaGFyQ29kZUF0KDApLnRvU3RyaW5nKGhleCkpLnNsaWNlKC11bmljb2RlTGVuZ3RoKSk7XG5cdH1cblxuXHRmdW5jdGlvbiBpbnNwZWN0U3RyaW5nKHN0cmluZywgb3B0aW9ucykge1xuXHQgIGlmIChzdHJpbmdFc2NhcGVDaGFycy50ZXN0KHN0cmluZykpIHtcblx0ICAgIHN0cmluZyA9IHN0cmluZy5yZXBsYWNlKHN0cmluZ0VzY2FwZUNoYXJzLCBlc2NhcGUpO1xuXHQgIH1cblxuXHQgIHJldHVybiBvcHRpb25zLnN0eWxpemUoXCInXCIuY29uY2F0KHRydW5jYXRlKHN0cmluZywgb3B0aW9ucy50cnVuY2F0ZSAtIDIpLCBcIidcIiksICdzdHJpbmcnKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGluc3BlY3RTeW1ib2wodmFsdWUpIHtcblx0ICBpZiAoJ2Rlc2NyaXB0aW9uJyBpbiBTeW1ib2wucHJvdG90eXBlKSB7XG5cdCAgICByZXR1cm4gdmFsdWUuZGVzY3JpcHRpb24gPyBcIlN5bWJvbChcIi5jb25jYXQodmFsdWUuZGVzY3JpcHRpb24sIFwiKVwiKSA6ICdTeW1ib2woKSc7XG5cdCAgfVxuXG5cdCAgcmV0dXJuIHZhbHVlLnRvU3RyaW5nKCk7XG5cdH1cblxuXHR2YXIgZ2V0UHJvbWlzZVZhbHVlID0gZnVuY3Rpb24gZ2V0UHJvbWlzZVZhbHVlKCkge1xuXHQgIHJldHVybiAnUHJvbWlzZXvigKZ9Jztcblx0fTtcblxuXHQvLyB0cnkge1xuXHQvLyAgIHZhciBfcHJvY2VzcyRiaW5kaW5nID0gcHJvY2Vzcy5iaW5kaW5nKCd1dGlsJyksXG5cdC8vICAgICAgIGdldFByb21pc2VEZXRhaWxzID0gX3Byb2Nlc3MkYmluZGluZy5nZXRQcm9taXNlRGV0YWlscyxcblx0Ly8gICAgICAga1BlbmRpbmcgPSBfcHJvY2VzcyRiaW5kaW5nLmtQZW5kaW5nLFxuXHQvLyAgICAgICBrUmVqZWN0ZWQgPSBfcHJvY2VzcyRiaW5kaW5nLmtSZWplY3RlZDtcblxuXHQvLyAgIGdldFByb21pc2VWYWx1ZSA9IGZ1bmN0aW9uIGdldFByb21pc2VWYWx1ZSh2YWx1ZSwgb3B0aW9ucykge1xuXHQvLyAgICAgdmFyIF9nZXRQcm9taXNlRGV0YWlscyA9IGdldFByb21pc2VEZXRhaWxzKHZhbHVlKSxcblx0Ly8gICAgICAgICBfZ2V0UHJvbWlzZURldGFpbHMyID0gX3NsaWNlZFRvQXJyYXkoX2dldFByb21pc2VEZXRhaWxzLCAyKSxcblx0Ly8gICAgICAgICBzdGF0ZSA9IF9nZXRQcm9taXNlRGV0YWlsczJbMF0sXG5cdC8vICAgICAgICAgaW5uZXJWYWx1ZSA9IF9nZXRQcm9taXNlRGV0YWlsczJbMV07XG5cblx0Ly8gICAgIGlmIChzdGF0ZSA9PT0ga1BlbmRpbmcpIHtcblx0Ly8gICAgICAgcmV0dXJuICdQcm9taXNlezxwZW5kaW5nPn0nO1xuXHQvLyAgICAgfVxuXG5cdC8vICAgICByZXR1cm4gXCJQcm9taXNlXCIuY29uY2F0KHN0YXRlID09PSBrUmVqZWN0ZWQgPyAnIScgOiAnJywgXCJ7XCIpLmNvbmNhdChvcHRpb25zLmluc3BlY3QoaW5uZXJWYWx1ZSwgb3B0aW9ucyksIFwifVwiKTtcblx0Ly8gICB9O1xuXHQvLyB9IGNhdGNoIChub3ROb2RlKSB7XG5cdC8vICAgLyogaWdub3JlICovXG5cdC8vIH1cblxuXHR2YXIgaW5zcGVjdFByb21pc2UgPSBnZXRQcm9taXNlVmFsdWU7XG5cblx0ZnVuY3Rpb24gaW5zcGVjdE9iamVjdChvYmplY3QsIG9wdGlvbnMpIHtcblx0ICB2YXIgcHJvcGVydGllcyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG9iamVjdCk7XG5cdCAgdmFyIHN5bWJvbHMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzID8gT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhvYmplY3QpIDogW107XG5cblx0ICBpZiAocHJvcGVydGllcy5sZW5ndGggPT09IDAgJiYgc3ltYm9scy5sZW5ndGggPT09IDApIHtcblx0ICAgIHJldHVybiAne30nO1xuXHQgIH1cblxuXHQgIG9wdGlvbnMudHJ1bmNhdGUgLT0gNDtcblx0ICB2YXIgcHJvcGVydHlDb250ZW50cyA9IGluc3BlY3RMaXN0KHByb3BlcnRpZXMubWFwKGZ1bmN0aW9uIChrZXkpIHtcblx0ICAgIHJldHVybiBba2V5LCBvYmplY3Rba2V5XV07XG5cdCAgfSksIG9wdGlvbnMsIGluc3BlY3RQcm9wZXJ0eSk7XG5cdCAgdmFyIHN5bWJvbENvbnRlbnRzID0gaW5zcGVjdExpc3Qoc3ltYm9scy5tYXAoZnVuY3Rpb24gKGtleSkge1xuXHQgICAgcmV0dXJuIFtrZXksIG9iamVjdFtrZXldXTtcblx0ICB9KSwgb3B0aW9ucywgaW5zcGVjdFByb3BlcnR5KTtcblx0ICB2YXIgc2VwID0gJyc7XG5cblx0ICBpZiAocHJvcGVydHlDb250ZW50cyAmJiBzeW1ib2xDb250ZW50cykge1xuXHQgICAgc2VwID0gJywgJztcblx0ICB9XG5cblx0ICByZXR1cm4gXCJ7IFwiLmNvbmNhdChwcm9wZXJ0eUNvbnRlbnRzKS5jb25jYXQoc2VwKS5jb25jYXQoc3ltYm9sQ29udGVudHMsIFwiIH1cIik7XG5cdH1cblxuXHR2YXIgdG9TdHJpbmdUYWcgPSB0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcgPyBTeW1ib2wudG9TdHJpbmdUYWcgOiBmYWxzZTtcblx0ZnVuY3Rpb24gaW5zcGVjdENsYXNzKHZhbHVlLCBvcHRpb25zKSB7XG5cdCAgdmFyIG5hbWUgPSAnJztcblxuXHQgIGlmICh0b1N0cmluZ1RhZyAmJiB0b1N0cmluZ1RhZyBpbiB2YWx1ZSkge1xuXHQgICAgbmFtZSA9IHZhbHVlW3RvU3RyaW5nVGFnXTtcblx0ICB9XG5cblx0ICBuYW1lID0gbmFtZSB8fCBnZXRGdW5jTmFtZV8xKHZhbHVlLmNvbnN0cnVjdG9yKTsgLy8gQmFiZWwgdHJhbnNmb3JtcyBhbm9ueW1vdXMgY2xhc3NlcyB0byB0aGUgbmFtZSBgX2NsYXNzYFxuXG5cdCAgaWYgKCFuYW1lIHx8IG5hbWUgPT09ICdfY2xhc3MnKSB7XG5cdCAgICBuYW1lID0gJzxBbm9ueW1vdXMgQ2xhc3M+Jztcblx0ICB9XG5cblx0ICBvcHRpb25zLnRydW5jYXRlIC09IG5hbWUubGVuZ3RoO1xuXHQgIHJldHVybiBcIlwiLmNvbmNhdChuYW1lKS5jb25jYXQoaW5zcGVjdE9iamVjdCh2YWx1ZSwgb3B0aW9ucykpO1xuXHR9XG5cblx0ZnVuY3Rpb24gaW5zcGVjdEFyZ3VtZW50cyhhcmdzLCBvcHRpb25zKSB7XG5cdCAgaWYgKGFyZ3MubGVuZ3RoID09PSAwKSByZXR1cm4gJ0FyZ3VtZW50c1tdJztcblx0ICBvcHRpb25zLnRydW5jYXRlIC09IDEzO1xuXHQgIHJldHVybiBcIkFyZ3VtZW50c1sgXCIuY29uY2F0KGluc3BlY3RMaXN0KGFyZ3MsIG9wdGlvbnMpLCBcIiBdXCIpO1xuXHR9XG5cblx0dmFyIGVycm9yS2V5cyA9IFsnc3RhY2snLCAnbGluZScsICdjb2x1bW4nLCAnbmFtZScsICdtZXNzYWdlJywgJ2ZpbGVOYW1lJywgJ2xpbmVOdW1iZXInLCAnY29sdW1uTnVtYmVyJywgJ251bWJlcicsICdkZXNjcmlwdGlvbiddO1xuXHRmdW5jdGlvbiBpbnNwZWN0T2JqZWN0JDEoZXJyb3IsIG9wdGlvbnMpIHtcblx0ICB2YXIgcHJvcGVydGllcyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGVycm9yKS5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xuXHQgICAgcmV0dXJuIGVycm9yS2V5cy5pbmRleE9mKGtleSkgPT09IC0xO1xuXHQgIH0pO1xuXHQgIHZhciBuYW1lID0gZXJyb3IubmFtZTtcblx0ICBvcHRpb25zLnRydW5jYXRlIC09IG5hbWUubGVuZ3RoO1xuXHQgIHZhciBtZXNzYWdlID0gJyc7XG5cblx0ICBpZiAodHlwZW9mIGVycm9yLm1lc3NhZ2UgPT09ICdzdHJpbmcnKSB7XG5cdCAgICBtZXNzYWdlID0gdHJ1bmNhdGUoZXJyb3IubWVzc2FnZSwgb3B0aW9ucy50cnVuY2F0ZSk7XG5cdCAgfSBlbHNlIHtcblx0ICAgIHByb3BlcnRpZXMudW5zaGlmdCgnbWVzc2FnZScpO1xuXHQgIH1cblxuXHQgIG1lc3NhZ2UgPSBtZXNzYWdlID8gXCI6IFwiLmNvbmNhdChtZXNzYWdlKSA6ICcnO1xuXHQgIG9wdGlvbnMudHJ1bmNhdGUgLT0gbWVzc2FnZS5sZW5ndGggKyA1O1xuXHQgIHZhciBwcm9wZXJ0eUNvbnRlbnRzID0gaW5zcGVjdExpc3QocHJvcGVydGllcy5tYXAoZnVuY3Rpb24gKGtleSkge1xuXHQgICAgcmV0dXJuIFtrZXksIGVycm9yW2tleV1dO1xuXHQgIH0pLCBvcHRpb25zLCBpbnNwZWN0UHJvcGVydHkpO1xuXHQgIHJldHVybiBcIlwiLmNvbmNhdChuYW1lKS5jb25jYXQobWVzc2FnZSkuY29uY2F0KHByb3BlcnR5Q29udGVudHMgPyBcIiB7IFwiLmNvbmNhdChwcm9wZXJ0eUNvbnRlbnRzLCBcIiB9XCIpIDogJycpO1xuXHR9XG5cblx0ZnVuY3Rpb24gaW5zcGVjdEF0dHJpYnV0ZShfcmVmLCBvcHRpb25zKSB7XG5cdCAgdmFyIF9yZWYyID0gX3NsaWNlZFRvQXJyYXkoX3JlZiwgMiksXG5cdCAgICAgIGtleSA9IF9yZWYyWzBdLFxuXHQgICAgICB2YWx1ZSA9IF9yZWYyWzFdO1xuXG5cdCAgb3B0aW9ucy50cnVuY2F0ZSAtPSAzO1xuXG5cdCAgaWYgKCF2YWx1ZSkge1xuXHQgICAgcmV0dXJuIFwiXCIuY29uY2F0KG9wdGlvbnMuc3R5bGl6ZShrZXksICd5ZWxsb3cnKSk7XG5cdCAgfVxuXG5cdCAgcmV0dXJuIFwiXCIuY29uY2F0KG9wdGlvbnMuc3R5bGl6ZShrZXksICd5ZWxsb3cnKSwgXCI9XCIpLmNvbmNhdChvcHRpb25zLnN0eWxpemUoXCJcXFwiXCIuY29uY2F0KHZhbHVlLCBcIlxcXCJcIiksICdzdHJpbmcnKSk7XG5cdH1cblx0ZnVuY3Rpb24gaW5zcGVjdEhUTUxDb2xsZWN0aW9uKGNvbGxlY3Rpb24sIG9wdGlvbnMpIHtcblx0ICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdXNlLWJlZm9yZS1kZWZpbmVcblx0ICByZXR1cm4gaW5zcGVjdExpc3QoY29sbGVjdGlvbiwgb3B0aW9ucywgaW5zcGVjdEhUTUwsICdcXG4nKTtcblx0fVxuXHRmdW5jdGlvbiBpbnNwZWN0SFRNTChlbGVtZW50LCBvcHRpb25zKSB7XG5cdCAgdmFyIHByb3BlcnRpZXMgPSBlbGVtZW50LmdldEF0dHJpYnV0ZU5hbWVzKCk7XG5cdCAgdmFyIG5hbWUgPSBlbGVtZW50LnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcblx0ICB2YXIgaGVhZCA9IG9wdGlvbnMuc3R5bGl6ZShcIjxcIi5jb25jYXQobmFtZSksICdzcGVjaWFsJyk7XG5cdCAgdmFyIGhlYWRDbG9zZSA9IG9wdGlvbnMuc3R5bGl6ZShcIj5cIiwgJ3NwZWNpYWwnKTtcblx0ICB2YXIgdGFpbCA9IG9wdGlvbnMuc3R5bGl6ZShcIjwvXCIuY29uY2F0KG5hbWUsIFwiPlwiKSwgJ3NwZWNpYWwnKTtcblx0ICBvcHRpb25zLnRydW5jYXRlIC09IG5hbWUubGVuZ3RoICogMiArIDU7XG5cdCAgdmFyIHByb3BlcnR5Q29udGVudHMgPSAnJztcblxuXHQgIGlmIChwcm9wZXJ0aWVzLmxlbmd0aCA+IDApIHtcblx0ICAgIHByb3BlcnR5Q29udGVudHMgKz0gJyAnO1xuXHQgICAgcHJvcGVydHlDb250ZW50cyArPSBpbnNwZWN0TGlzdChwcm9wZXJ0aWVzLm1hcChmdW5jdGlvbiAoa2V5KSB7XG5cdCAgICAgIHJldHVybiBba2V5LCBlbGVtZW50LmdldEF0dHJpYnV0ZShrZXkpXTtcblx0ICAgIH0pLCBvcHRpb25zLCBpbnNwZWN0QXR0cmlidXRlLCAnICcpO1xuXHQgIH1cblxuXHQgIG9wdGlvbnMudHJ1bmNhdGUgLT0gcHJvcGVydHlDb250ZW50cy5sZW5ndGg7XG5cdCAgdmFyIHRydW5jYXRlID0gb3B0aW9ucy50cnVuY2F0ZTtcblx0ICB2YXIgY2hpbGRyZW4gPSBpbnNwZWN0SFRNTENvbGxlY3Rpb24oZWxlbWVudC5jaGlsZHJlbiwgb3B0aW9ucyk7XG5cblx0ICBpZiAoY2hpbGRyZW4gJiYgY2hpbGRyZW4ubGVuZ3RoID4gdHJ1bmNhdGUpIHtcblx0ICAgIGNoaWxkcmVuID0gXCJcIi5jb25jYXQodHJ1bmNhdG9yLCBcIihcIikuY29uY2F0KGVsZW1lbnQuY2hpbGRyZW4ubGVuZ3RoLCBcIilcIik7XG5cdCAgfVxuXG5cdCAgcmV0dXJuIFwiXCIuY29uY2F0KGhlYWQpLmNvbmNhdChwcm9wZXJ0eUNvbnRlbnRzKS5jb25jYXQoaGVhZENsb3NlKS5jb25jYXQoY2hpbGRyZW4pLmNvbmNhdCh0YWlsKTtcblx0fVxuXG5cdC8qICFcblx0ICogbG91cGVcblx0ICogQ29weXJpZ2h0KGMpIDIwMTMgSmFrZSBMdWVyIDxqYWtlQGFsb2dpY2FscGFyYWRveC5jb20+XG5cdCAqIE1JVCBMaWNlbnNlZFxuXHQgKi9cblx0dmFyIHN5bWJvbHNTdXBwb3J0ZWQgPSB0eXBlb2YgU3ltYm9sID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBTeW1ib2wuZm9yID09PSAnZnVuY3Rpb24nO1xuXHR2YXIgY2hhaUluc3BlY3QgPSBzeW1ib2xzU3VwcG9ydGVkID8gU3ltYm9sLmZvcignY2hhaS9pbnNwZWN0JykgOiAnQEBjaGFpL2luc3BlY3QnO1xuXHR2YXIgbm9kZUluc3BlY3QgPSBmYWxzZTtcblxuXHR0cnkge1xuXHQgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBnbG9iYWwtcmVxdWlyZVxuXHQgIG5vZGVJbnNwZWN0ID0gcmVxdWlyZSgndXRpbCcpLmluc3BlY3QuY3VzdG9tO1xuXHR9IGNhdGNoIChub05vZGVJbnNwZWN0KSB7XG5cdCAgbm9kZUluc3BlY3QgPSBmYWxzZTtcblx0fVxuXG5cdHZhciBjb25zdHJ1Y3Rvck1hcCA9IG5ldyBXZWFrTWFwKCk7XG5cdHZhciBzdHJpbmdUYWdNYXAgPSB7fTtcblx0dmFyIGJhc2VUeXBlc01hcCA9IHtcblx0ICB1bmRlZmluZWQ6IGZ1bmN0aW9uIHVuZGVmaW5lZCQxKHZhbHVlLCBvcHRpb25zKSB7XG5cdCAgICByZXR1cm4gb3B0aW9ucy5zdHlsaXplKCd1bmRlZmluZWQnLCAndW5kZWZpbmVkJyk7XG5cdCAgfSxcblx0ICBudWxsOiBmdW5jdGlvbiBfbnVsbCh2YWx1ZSwgb3B0aW9ucykge1xuXHQgICAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZShudWxsLCAnbnVsbCcpO1xuXHQgIH0sXG5cdCAgYm9vbGVhbjogZnVuY3Rpb24gYm9vbGVhbih2YWx1ZSwgb3B0aW9ucykge1xuXHQgICAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZSh2YWx1ZSwgJ2Jvb2xlYW4nKTtcblx0ICB9LFxuXHQgIEJvb2xlYW46IGZ1bmN0aW9uIEJvb2xlYW4odmFsdWUsIG9wdGlvbnMpIHtcblx0ICAgIHJldHVybiBvcHRpb25zLnN0eWxpemUodmFsdWUsICdib29sZWFuJyk7XG5cdCAgfSxcblx0ICBudW1iZXI6IGluc3BlY3ROdW1iZXIsXG5cdCAgTnVtYmVyOiBpbnNwZWN0TnVtYmVyLFxuXHQgIEJpZ0ludDogaW5zcGVjdE51bWJlcixcblx0ICBiaWdpbnQ6IGluc3BlY3ROdW1iZXIsXG5cdCAgc3RyaW5nOiBpbnNwZWN0U3RyaW5nLFxuXHQgIFN0cmluZzogaW5zcGVjdFN0cmluZyxcblx0ICBmdW5jdGlvbjogaW5zcGVjdEZ1bmN0aW9uLFxuXHQgIEZ1bmN0aW9uOiBpbnNwZWN0RnVuY3Rpb24sXG5cdCAgc3ltYm9sOiBpbnNwZWN0U3ltYm9sLFxuXHQgIC8vIEEgU3ltYm9sIHBvbHlmaWxsIHdpbGwgcmV0dXJuIGBTeW1ib2xgIG5vdCBgc3ltYm9sYCBmcm9tIHR5cGVkZXRlY3Rcblx0ICBTeW1ib2w6IGluc3BlY3RTeW1ib2wsXG5cdCAgQXJyYXk6IGluc3BlY3RBcnJheSxcblx0ICBEYXRlOiBpbnNwZWN0RGF0ZSxcblx0ICBNYXA6IGluc3BlY3RNYXAsXG5cdCAgU2V0OiBpbnNwZWN0U2V0LFxuXHQgIFJlZ0V4cDogaW5zcGVjdFJlZ0V4cCxcblx0ICBQcm9taXNlOiBpbnNwZWN0UHJvbWlzZSxcblx0ICAvLyBXZWFrU2V0LCBXZWFrTWFwIGFyZSB0b3RhbGx5IG9wYXF1ZSB0byB1c1xuXHQgIFdlYWtTZXQ6IGZ1bmN0aW9uIFdlYWtTZXQodmFsdWUsIG9wdGlvbnMpIHtcblx0ICAgIHJldHVybiBvcHRpb25zLnN0eWxpemUoJ1dlYWtTZXR74oCmfScsICdzcGVjaWFsJyk7XG5cdCAgfSxcblx0ICBXZWFrTWFwOiBmdW5jdGlvbiBXZWFrTWFwKHZhbHVlLCBvcHRpb25zKSB7XG5cdCAgICByZXR1cm4gb3B0aW9ucy5zdHlsaXplKCdXZWFrTWFwe+KApn0nLCAnc3BlY2lhbCcpO1xuXHQgIH0sXG5cdCAgQXJndW1lbnRzOiBpbnNwZWN0QXJndW1lbnRzLFxuXHQgIEludDhBcnJheTogaW5zcGVjdFR5cGVkQXJyYXksXG5cdCAgVWludDhBcnJheTogaW5zcGVjdFR5cGVkQXJyYXksXG5cdCAgVWludDhDbGFtcGVkQXJyYXk6IGluc3BlY3RUeXBlZEFycmF5LFxuXHQgIEludDE2QXJyYXk6IGluc3BlY3RUeXBlZEFycmF5LFxuXHQgIFVpbnQxNkFycmF5OiBpbnNwZWN0VHlwZWRBcnJheSxcblx0ICBJbnQzMkFycmF5OiBpbnNwZWN0VHlwZWRBcnJheSxcblx0ICBVaW50MzJBcnJheTogaW5zcGVjdFR5cGVkQXJyYXksXG5cdCAgRmxvYXQzMkFycmF5OiBpbnNwZWN0VHlwZWRBcnJheSxcblx0ICBGbG9hdDY0QXJyYXk6IGluc3BlY3RUeXBlZEFycmF5LFxuXHQgIEdlbmVyYXRvcjogZnVuY3Rpb24gR2VuZXJhdG9yKCkge1xuXHQgICAgcmV0dXJuICcnO1xuXHQgIH0sXG5cdCAgRGF0YVZpZXc6IGZ1bmN0aW9uIERhdGFWaWV3KCkge1xuXHQgICAgcmV0dXJuICcnO1xuXHQgIH0sXG5cdCAgQXJyYXlCdWZmZXI6IGZ1bmN0aW9uIEFycmF5QnVmZmVyKCkge1xuXHQgICAgcmV0dXJuICcnO1xuXHQgIH0sXG5cdCAgRXJyb3I6IGluc3BlY3RPYmplY3QkMSxcblx0ICBIVE1MQ29sbGVjdGlvbjogaW5zcGVjdEhUTUxDb2xsZWN0aW9uLFxuXHQgIE5vZGVMaXN0OiBpbnNwZWN0SFRNTENvbGxlY3Rpb25cblx0fTsgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGNvbXBsZXhpdHlcblxuXHR2YXIgaW5zcGVjdEN1c3RvbSA9IGZ1bmN0aW9uIGluc3BlY3RDdXN0b20odmFsdWUsIG9wdGlvbnMsIHR5cGUpIHtcblx0ICBpZiAoY2hhaUluc3BlY3QgaW4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlW2NoYWlJbnNwZWN0XSA9PT0gJ2Z1bmN0aW9uJykge1xuXHQgICAgcmV0dXJuIHZhbHVlW2NoYWlJbnNwZWN0XShvcHRpb25zKTtcblx0ICB9XG5cblx0ICBpZiAobm9kZUluc3BlY3QgJiYgbm9kZUluc3BlY3QgaW4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlW25vZGVJbnNwZWN0XSA9PT0gJ2Z1bmN0aW9uJykge1xuXHQgICAgcmV0dXJuIHZhbHVlW25vZGVJbnNwZWN0XShvcHRpb25zLmRlcHRoLCBvcHRpb25zKTtcblx0ICB9XG5cblx0ICBpZiAoJ2luc3BlY3QnIGluIHZhbHVlICYmIHR5cGVvZiB2YWx1ZS5pbnNwZWN0ID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICByZXR1cm4gdmFsdWUuaW5zcGVjdChvcHRpb25zLmRlcHRoLCBvcHRpb25zKTtcblx0ICB9XG5cblx0ICBpZiAoJ2NvbnN0cnVjdG9yJyBpbiB2YWx1ZSAmJiBjb25zdHJ1Y3Rvck1hcC5oYXModmFsdWUuY29uc3RydWN0b3IpKSB7XG5cdCAgICByZXR1cm4gY29uc3RydWN0b3JNYXAuZ2V0KHZhbHVlLmNvbnN0cnVjdG9yKSh2YWx1ZSwgb3B0aW9ucyk7XG5cdCAgfVxuXG5cdCAgaWYgKHN0cmluZ1RhZ01hcFt0eXBlXSkge1xuXHQgICAgcmV0dXJuIHN0cmluZ1RhZ01hcFt0eXBlXSh2YWx1ZSwgb3B0aW9ucyk7XG5cdCAgfVxuXG5cdCAgcmV0dXJuICcnO1xuXHR9OyAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgY29tcGxleGl0eVxuXG5cblx0ZnVuY3Rpb24gaW5zcGVjdCh2YWx1ZSwgb3B0aW9ucykge1xuXHQgIG9wdGlvbnMgPSBub3JtYWxpc2VPcHRpb25zKG9wdGlvbnMpO1xuXHQgIG9wdGlvbnMuaW5zcGVjdCA9IGluc3BlY3Q7XG5cdCAgdmFyIF9vcHRpb25zID0gb3B0aW9ucyxcblx0ICAgICAgY3VzdG9tSW5zcGVjdCA9IF9vcHRpb25zLmN1c3RvbUluc3BlY3Q7XG5cdCAgdmFyIHR5cGUgPSB0eXBlRGV0ZWN0KHZhbHVlKTsgLy8gSWYgaXQgaXMgYSBiYXNlIHZhbHVlIHRoYXQgd2UgYWxyZWFkeSBzdXBwb3J0LCB0aGVuIHVzZSBMb3VwZSdzIGluc3BlY3RvclxuXHQgIGlmIChiYXNlVHlwZXNNYXBbdHlwZV0pIHtcblx0ICAgIHJldHVybiBiYXNlVHlwZXNNYXBbdHlwZV0odmFsdWUsIG9wdGlvbnMpO1xuXHQgIH0gLy8gSWYgYG9wdGlvbnMuY3VzdG9tSW5zcGVjdGAgaXMgc2V0IHRvIHRydWUgdGhlbiB0cnkgdG8gdXNlIHRoZSBjdXN0b20gaW5zcGVjdG9yXG5cblxuXHQgIGlmIChjdXN0b21JbnNwZWN0ICYmIHZhbHVlKSB7XG5cdCAgICB2YXIgb3V0cHV0ID0gaW5zcGVjdEN1c3RvbSh2YWx1ZSwgb3B0aW9ucywgdHlwZSk7XG5cdCAgICBpZiAob3V0cHV0KSByZXR1cm4gaW5zcGVjdChvdXRwdXQsIG9wdGlvbnMpO1xuXHQgIH1cblxuXHQgIHZhciBwcm90byA9IHZhbHVlID8gT2JqZWN0LmdldFByb3RvdHlwZU9mKHZhbHVlKSA6IGZhbHNlOyAvLyBJZiBpdCdzIGEgcGxhaW4gT2JqZWN0IHRoZW4gdXNlIExvdXBlJ3MgaW5zcGVjdG9yXG5cblx0ICBpZiAocHJvdG8gPT09IE9iamVjdC5wcm90b3R5cGUgfHwgcHJvdG8gPT09IG51bGwpIHtcblx0ICAgIHJldHVybiBpbnNwZWN0T2JqZWN0KHZhbHVlLCBvcHRpb25zKTtcblx0ICB9IC8vIFNwZWNpZmljYWxseSBhY2NvdW50IGZvciBIVE1MRWxlbWVudHNcblx0ICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdW5kZWZcblxuXG5cdCAgaWYgKHZhbHVlICYmIHR5cGVvZiBIVE1MRWxlbWVudCA9PT0gJ2Z1bmN0aW9uJyAmJiB2YWx1ZSBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XG5cdCAgICByZXR1cm4gaW5zcGVjdEhUTUwodmFsdWUsIG9wdGlvbnMpO1xuXHQgIH0gLy8gSWYgaXQgaXMgYSBjbGFzcywgaW5zcGVjdCBpdCBsaWtlIGFuIG9iamVjdCBidXQgYWRkIHRoZSBjb25zdHJ1Y3RvciBuYW1lXG5cblxuXHQgIGlmICgnY29uc3RydWN0b3InIGluIHZhbHVlICYmIHZhbHVlLmNvbnN0cnVjdG9yICE9PSBPYmplY3QpIHtcblx0ICAgIHJldHVybiBpbnNwZWN0Q2xhc3ModmFsdWUsIG9wdGlvbnMpO1xuXHQgIH0gLy8gV2UgaGF2ZSBydW4gb3V0IG9mIG9wdGlvbnMhIEp1c3Qgc3RyaW5naWZ5IHRoZSB2YWx1ZVxuXG5cblx0ICByZXR1cm4gb3B0aW9ucy5zdHlsaXplKFN0cmluZyh2YWx1ZSksIHR5cGUpO1xuXHR9XG5cdGZ1bmN0aW9uIHJlZ2lzdGVyQ29uc3RydWN0b3IoY29uc3RydWN0b3IsIGluc3BlY3Rvcikge1xuXHQgIGlmIChjb25zdHJ1Y3Rvck1hcC5oYXMoY29uc3RydWN0b3IpKSB7XG5cdCAgICByZXR1cm4gZmFsc2U7XG5cdCAgfVxuXG5cdCAgY29uc3RydWN0b3JNYXAuYWRkKGNvbnN0cnVjdG9yLCBpbnNwZWN0b3IpO1xuXHQgIHJldHVybiB0cnVlO1xuXHR9XG5cdGZ1bmN0aW9uIHJlZ2lzdGVyU3RyaW5nVGFnKHN0cmluZ1RhZywgaW5zcGVjdG9yKSB7XG5cdCAgaWYgKHN0cmluZ1RhZyBpbiBzdHJpbmdUYWdNYXApIHtcblx0ICAgIHJldHVybiBmYWxzZTtcblx0ICB9XG5cblx0ICBzdHJpbmdUYWdNYXBbc3RyaW5nVGFnXSA9IGluc3BlY3Rvcjtcblx0ICByZXR1cm4gdHJ1ZTtcblx0fVxuXHR2YXIgY3VzdG9tID0gY2hhaUluc3BlY3Q7XG5cblx0ZXhwb3J0cy5jdXN0b20gPSBjdXN0b207XG5cdGV4cG9ydHMuZGVmYXVsdCA9IGluc3BlY3Q7XG5cdGV4cG9ydHMuaW5zcGVjdCA9IGluc3BlY3Q7XG5cdGV4cG9ydHMucmVnaXN0ZXJDb25zdHJ1Y3RvciA9IHJlZ2lzdGVyQ29uc3RydWN0b3I7XG5cdGV4cG9ydHMucmVnaXN0ZXJTdHJpbmdUYWcgPSByZWdpc3RlclN0cmluZ1RhZztcblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xuXG59KSkpO1xuIiwiKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG4gIHZhciBqc190eXBlX29mLCBycHIsIHNhZDtcblxuICAvLyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4gIHRoaXMuc2FkID0gc2FkID0gU3ltYm9sKCdzYWQnKTtcblxuICAoe3JwciwganNfdHlwZV9vZn0gPSByZXF1aXJlKCcuL2hlbHBlcnMnKSk7XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB0aGlzLmlzX3NhZCA9IGZ1bmN0aW9uKHgpIHtcbiAgICByZXR1cm4gKHggPT09IHNhZCkgfHwgKHggaW5zdGFuY2VvZiBFcnJvcikgfHwgKHRoaXMuaXNfc2FkZGVuZWQoeCkpO1xuICB9O1xuXG4gIHRoaXMuaXNfaGFwcHkgPSBmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuICF0aGlzLmlzX3NhZCh4KTtcbiAgfTtcblxuICB0aGlzLnNhZGRlbiA9IGZ1bmN0aW9uKHgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgW3NhZF06IHRydWUsXG4gICAgICBfOiB4XG4gICAgfTtcbiAgfTtcblxuICB0aGlzLmlzX3NhZGRlbmVkID0gZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiAoKGpzX3R5cGVfb2YoeCkpID09PSAnb2JqZWN0JykgJiYgKHhbc2FkXSA9PT0gdHJ1ZSk7XG4gIH07XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB0aGlzLnVuc2FkZGVuID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICh0aGlzLmlzX2hhcHB5KHgpKSB7XG4gICAgICByZXR1cm4geDtcbiAgICB9XG4gICAgdGhpcy52YWxpZGF0ZS5zYWRkZW5lZCh4KTtcbiAgICByZXR1cm4geC5fO1xuICB9O1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgdGhpcy5kZWNsYXJlX2NoZWNrID0gZnVuY3Rpb24obmFtZSwgY2hlY2tlcikge1xuICAgIHRoaXMudmFsaWRhdGUubm9uZW1wdHlfdGV4dChuYW1lKTtcbiAgICB0aGlzLnZhbGlkYXRlLmZ1bmN0aW9uKGNoZWNrZXIpO1xuICAgIGlmICh0aGlzLnNwZWNzW25hbWVdICE9IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgwrU4MDMyIHR5cGUgJHtycHIobmFtZSl9IGFscmVhZHkgZGVjbGFyZWRgKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuY2hlY2tzW25hbWVdICE9IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgwrU4MDMzIGNoZWNrICR7cnByKG5hbWUpfSBhbHJlYWR5IGRlY2xhcmVkYCk7XG4gICAgfVxuICAgIHRoaXMuY2hlY2tzW25hbWVdID0gY2hlY2tlcjtcbiAgICByZXR1cm4gbnVsbDtcbiAgfTtcblxufSkuY2FsbCh0aGlzKTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Y2hlY2tzLmpzLm1hcCIsIihmdW5jdGlvbigpIHtcbiAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAvLyB7IGVxdWFscywgfSAgICAgICAgICAgICAgID0gcmVxdWlyZSAnY25kJ1xuICB2YXIgQ0hFQ0tTLCBhc3NpZ24sIGpyLCBqc190eXBlX29mLCBqc2lkZW50aWZpZXJfcGF0dGVybiwgeHJwcixcbiAgICBtb2R1bG8gPSBmdW5jdGlvbihhLCBiKSB7IHJldHVybiAoK2EgJSAoYiA9ICtiKSArIGIpICUgYjsgfTtcblxuICAoe2Fzc2lnbiwganIsIHhycHIsIGpzX3R5cGVfb2Z9ID0gcmVxdWlyZSgnLi9oZWxwZXJzJykpO1xuXG4gIENIRUNLUyA9IHJlcXVpcmUoJy4vY2hlY2tzJyk7XG5cbiAgLyogdGh4IHRvXG4gICAgaHR0cHM6Ly9naXRodWIuY29tL21hdGhpYXNieW5lbnMvbW90aGVyZWZmLmluL2Jsb2IvbWFzdGVyL2pzLXZhcmlhYmxlcy9lZmYuanNcbiAgICBodHRwczovL21hdGhpYXNieW5lbnMuYmUvbm90ZXMvamF2YXNjcmlwdC1pZGVudGlmaWVycy1lczZcbiAgKi9cbiAgLy8ganNpZGVudGlmaWVyX3BhdHRlcm4gICAgICA9IC9eKD86W1xcJEEtWl9hLXpcXHhBQVxceEI1XFx4QkFcXHhDMC1cXHhENlxceEQ4LVxceEY2XFx4RjgtXFx1MDJDMVxcdTAyQzYtXFx1MDJEMVxcdTAyRTAtXFx1MDJFNFxcdTAyRUNcXHUwMkVFXFx1MDM3MC1cXHUwMzc0XFx1MDM3NlxcdTAzNzdcXHUwMzdBLVxcdTAzN0RcXHUwMzdGXFx1MDM4NlxcdTAzODgtXFx1MDM4QVxcdTAzOENcXHUwMzhFLVxcdTAzQTFcXHUwM0EzLVxcdTAzRjVcXHUwM0Y3LVxcdTA0ODFcXHUwNDhBLVxcdTA1MkZcXHUwNTMxLVxcdTA1NTZcXHUwNTU5XFx1MDU2MS1cXHUwNTg3XFx1MDVEMC1cXHUwNUVBXFx1MDVGMC1cXHUwNUYyXFx1MDYyMC1cXHUwNjRBXFx1MDY2RVxcdTA2NkZcXHUwNjcxLVxcdTA2RDNcXHUwNkQ1XFx1MDZFNVxcdTA2RTZcXHUwNkVFXFx1MDZFRlxcdTA2RkEtXFx1MDZGQ1xcdTA2RkZcXHUwNzEwXFx1MDcxMi1cXHUwNzJGXFx1MDc0RC1cXHUwN0E1XFx1MDdCMVxcdTA3Q0EtXFx1MDdFQVxcdTA3RjRcXHUwN0Y1XFx1MDdGQVxcdTA4MDAtXFx1MDgxNVxcdTA4MUFcXHUwODI0XFx1MDgyOFxcdTA4NDAtXFx1MDg1OFxcdTA4QTAtXFx1MDhCNFxcdTA5MDQtXFx1MDkzOVxcdTA5M0RcXHUwOTUwXFx1MDk1OC1cXHUwOTYxXFx1MDk3MS1cXHUwOTgwXFx1MDk4NS1cXHUwOThDXFx1MDk4RlxcdTA5OTBcXHUwOTkzLVxcdTA5QThcXHUwOUFBLVxcdTA5QjBcXHUwOUIyXFx1MDlCNi1cXHUwOUI5XFx1MDlCRFxcdTA5Q0VcXHUwOURDXFx1MDlERFxcdTA5REYtXFx1MDlFMVxcdTA5RjBcXHUwOUYxXFx1MEEwNS1cXHUwQTBBXFx1MEEwRlxcdTBBMTBcXHUwQTEzLVxcdTBBMjhcXHUwQTJBLVxcdTBBMzBcXHUwQTMyXFx1MEEzM1xcdTBBMzVcXHUwQTM2XFx1MEEzOFxcdTBBMzlcXHUwQTU5LVxcdTBBNUNcXHUwQTVFXFx1MEE3Mi1cXHUwQTc0XFx1MEE4NS1cXHUwQThEXFx1MEE4Ri1cXHUwQTkxXFx1MEE5My1cXHUwQUE4XFx1MEFBQS1cXHUwQUIwXFx1MEFCMlxcdTBBQjNcXHUwQUI1LVxcdTBBQjlcXHUwQUJEXFx1MEFEMFxcdTBBRTBcXHUwQUUxXFx1MEFGOVxcdTBCMDUtXFx1MEIwQ1xcdTBCMEZcXHUwQjEwXFx1MEIxMy1cXHUwQjI4XFx1MEIyQS1cXHUwQjMwXFx1MEIzMlxcdTBCMzNcXHUwQjM1LVxcdTBCMzlcXHUwQjNEXFx1MEI1Q1xcdTBCNURcXHUwQjVGLVxcdTBCNjFcXHUwQjcxXFx1MEI4M1xcdTBCODUtXFx1MEI4QVxcdTBCOEUtXFx1MEI5MFxcdTBCOTItXFx1MEI5NVxcdTBCOTlcXHUwQjlBXFx1MEI5Q1xcdTBCOUVcXHUwQjlGXFx1MEJBM1xcdTBCQTRcXHUwQkE4LVxcdTBCQUFcXHUwQkFFLVxcdTBCQjlcXHUwQkQwXFx1MEMwNS1cXHUwQzBDXFx1MEMwRS1cXHUwQzEwXFx1MEMxMi1cXHUwQzI4XFx1MEMyQS1cXHUwQzM5XFx1MEMzRFxcdTBDNTgtXFx1MEM1QVxcdTBDNjBcXHUwQzYxXFx1MEM4NS1cXHUwQzhDXFx1MEM4RS1cXHUwQzkwXFx1MEM5Mi1cXHUwQ0E4XFx1MENBQS1cXHUwQ0IzXFx1MENCNS1cXHUwQ0I5XFx1MENCRFxcdTBDREVcXHUwQ0UwXFx1MENFMVxcdTBDRjFcXHUwQ0YyXFx1MEQwNS1cXHUwRDBDXFx1MEQwRS1cXHUwRDEwXFx1MEQxMi1cXHUwRDNBXFx1MEQzRFxcdTBENEVcXHUwRDVGLVxcdTBENjFcXHUwRDdBLVxcdTBEN0ZcXHUwRDg1LVxcdTBEOTZcXHUwRDlBLVxcdTBEQjFcXHUwREIzLVxcdTBEQkJcXHUwREJEXFx1MERDMC1cXHUwREM2XFx1MEUwMS1cXHUwRTMwXFx1MEUzMlxcdTBFMzNcXHUwRTQwLVxcdTBFNDZcXHUwRTgxXFx1MEU4MlxcdTBFODRcXHUwRTg3XFx1MEU4OFxcdTBFOEFcXHUwRThEXFx1MEU5NC1cXHUwRTk3XFx1MEU5OS1cXHUwRTlGXFx1MEVBMS1cXHUwRUEzXFx1MEVBNVxcdTBFQTdcXHUwRUFBXFx1MEVBQlxcdTBFQUQtXFx1MEVCMFxcdTBFQjJcXHUwRUIzXFx1MEVCRFxcdTBFQzAtXFx1MEVDNFxcdTBFQzZcXHUwRURDLVxcdTBFREZcXHUwRjAwXFx1MEY0MC1cXHUwRjQ3XFx1MEY0OS1cXHUwRjZDXFx1MEY4OC1cXHUwRjhDXFx1MTAwMC1cXHUxMDJBXFx1MTAzRlxcdTEwNTAtXFx1MTA1NVxcdTEwNUEtXFx1MTA1RFxcdTEwNjFcXHUxMDY1XFx1MTA2NlxcdTEwNkUtXFx1MTA3MFxcdTEwNzUtXFx1MTA4MVxcdTEwOEVcXHUxMEEwLVxcdTEwQzVcXHUxMEM3XFx1MTBDRFxcdTEwRDAtXFx1MTBGQVxcdTEwRkMtXFx1MTI0OFxcdTEyNEEtXFx1MTI0RFxcdTEyNTAtXFx1MTI1NlxcdTEyNThcXHUxMjVBLVxcdTEyNURcXHUxMjYwLVxcdTEyODhcXHUxMjhBLVxcdTEyOERcXHUxMjkwLVxcdTEyQjBcXHUxMkIyLVxcdTEyQjVcXHUxMkI4LVxcdTEyQkVcXHUxMkMwXFx1MTJDMi1cXHUxMkM1XFx1MTJDOC1cXHUxMkQ2XFx1MTJEOC1cXHUxMzEwXFx1MTMxMi1cXHUxMzE1XFx1MTMxOC1cXHUxMzVBXFx1MTM4MC1cXHUxMzhGXFx1MTNBMC1cXHUxM0Y1XFx1MTNGOC1cXHUxM0ZEXFx1MTQwMS1cXHUxNjZDXFx1MTY2Ri1cXHUxNjdGXFx1MTY4MS1cXHUxNjlBXFx1MTZBMC1cXHUxNkVBXFx1MTZFRS1cXHUxNkY4XFx1MTcwMC1cXHUxNzBDXFx1MTcwRS1cXHUxNzExXFx1MTcyMC1cXHUxNzMxXFx1MTc0MC1cXHUxNzUxXFx1MTc2MC1cXHUxNzZDXFx1MTc2RS1cXHUxNzcwXFx1MTc4MC1cXHUxN0IzXFx1MTdEN1xcdTE3RENcXHUxODIwLVxcdTE4NzdcXHUxODgwLVxcdTE4QThcXHUxOEFBXFx1MThCMC1cXHUxOEY1XFx1MTkwMC1cXHUxOTFFXFx1MTk1MC1cXHUxOTZEXFx1MTk3MC1cXHUxOTc0XFx1MTk4MC1cXHUxOUFCXFx1MTlCMC1cXHUxOUM5XFx1MUEwMC1cXHUxQTE2XFx1MUEyMC1cXHUxQTU0XFx1MUFBN1xcdTFCMDUtXFx1MUIzM1xcdTFCNDUtXFx1MUI0QlxcdTFCODMtXFx1MUJBMFxcdTFCQUVcXHUxQkFGXFx1MUJCQS1cXHUxQkU1XFx1MUMwMC1cXHUxQzIzXFx1MUM0RC1cXHUxQzRGXFx1MUM1QS1cXHUxQzdEXFx1MUNFOS1cXHUxQ0VDXFx1MUNFRS1cXHUxQ0YxXFx1MUNGNVxcdTFDRjZcXHUxRDAwLVxcdTFEQkZcXHUxRTAwLVxcdTFGMTVcXHUxRjE4LVxcdTFGMURcXHUxRjIwLVxcdTFGNDVcXHUxRjQ4LVxcdTFGNERcXHUxRjUwLVxcdTFGNTdcXHUxRjU5XFx1MUY1QlxcdTFGNURcXHUxRjVGLVxcdTFGN0RcXHUxRjgwLVxcdTFGQjRcXHUxRkI2LVxcdTFGQkNcXHUxRkJFXFx1MUZDMi1cXHUxRkM0XFx1MUZDNi1cXHUxRkNDXFx1MUZEMC1cXHUxRkQzXFx1MUZENi1cXHUxRkRCXFx1MUZFMC1cXHUxRkVDXFx1MUZGMi1cXHUxRkY0XFx1MUZGNi1cXHUxRkZDXFx1MjA3MVxcdTIwN0ZcXHUyMDkwLVxcdTIwOUNcXHUyMTAyXFx1MjEwN1xcdTIxMEEtXFx1MjExM1xcdTIxMTVcXHUyMTE4LVxcdTIxMURcXHUyMTI0XFx1MjEyNlxcdTIxMjhcXHUyMTJBLVxcdTIxMzlcXHUyMTNDLVxcdTIxM0ZcXHUyMTQ1LVxcdTIxNDlcXHUyMTRFXFx1MjE2MC1cXHUyMTg4XFx1MkMwMC1cXHUyQzJFXFx1MkMzMC1cXHUyQzVFXFx1MkM2MC1cXHUyQ0U0XFx1MkNFQi1cXHUyQ0VFXFx1MkNGMlxcdTJDRjNcXHUyRDAwLVxcdTJEMjVcXHUyRDI3XFx1MkQyRFxcdTJEMzAtXFx1MkQ2N1xcdTJENkZcXHUyRDgwLVxcdTJEOTZcXHUyREEwLVxcdTJEQTZcXHUyREE4LVxcdTJEQUVcXHUyREIwLVxcdTJEQjZcXHUyREI4LVxcdTJEQkVcXHUyREMwLVxcdTJEQzZcXHUyREM4LVxcdTJEQ0VcXHUyREQwLVxcdTJERDZcXHUyREQ4LVxcdTJEREVcXHUzMDA1LVxcdTMwMDdcXHUzMDIxLVxcdTMwMjlcXHUzMDMxLVxcdTMwMzVcXHUzMDM4LVxcdTMwM0NcXHUzMDQxLVxcdTMwOTZcXHUzMDlCLVxcdTMwOUZcXHUzMEExLVxcdTMwRkFcXHUzMEZDLVxcdTMwRkZcXHUzMTA1LVxcdTMxMkRcXHUzMTMxLVxcdTMxOEVcXHUzMUEwLVxcdTMxQkFcXHUzMUYwLVxcdTMxRkZcXHUzNDAwLVxcdTREQjVcXHU0RTAwLVxcdTlGRDVcXHVBMDAwLVxcdUE0OENcXHVBNEQwLVxcdUE0RkRcXHVBNTAwLVxcdUE2MENcXHVBNjEwLVxcdUE2MUZcXHVBNjJBXFx1QTYyQlxcdUE2NDAtXFx1QTY2RVxcdUE2N0YtXFx1QTY5RFxcdUE2QTAtXFx1QTZFRlxcdUE3MTctXFx1QTcxRlxcdUE3MjItXFx1QTc4OFxcdUE3OEItXFx1QTdBRFxcdUE3QjAtXFx1QTdCN1xcdUE3RjctXFx1QTgwMVxcdUE4MDMtXFx1QTgwNVxcdUE4MDctXFx1QTgwQVxcdUE4MEMtXFx1QTgyMlxcdUE4NDAtXFx1QTg3M1xcdUE4ODItXFx1QThCM1xcdUE4RjItXFx1QThGN1xcdUE4RkJcXHVBOEZEXFx1QTkwQS1cXHVBOTI1XFx1QTkzMC1cXHVBOTQ2XFx1QTk2MC1cXHVBOTdDXFx1QTk4NC1cXHVBOUIyXFx1QTlDRlxcdUE5RTAtXFx1QTlFNFxcdUE5RTYtXFx1QTlFRlxcdUE5RkEtXFx1QTlGRVxcdUFBMDAtXFx1QUEyOFxcdUFBNDAtXFx1QUE0MlxcdUFBNDQtXFx1QUE0QlxcdUFBNjAtXFx1QUE3NlxcdUFBN0FcXHVBQTdFLVxcdUFBQUZcXHVBQUIxXFx1QUFCNVxcdUFBQjZcXHVBQUI5LVxcdUFBQkRcXHVBQUMwXFx1QUFDMlxcdUFBREItXFx1QUFERFxcdUFBRTAtXFx1QUFFQVxcdUFBRjItXFx1QUFGNFxcdUFCMDEtXFx1QUIwNlxcdUFCMDktXFx1QUIwRVxcdUFCMTEtXFx1QUIxNlxcdUFCMjAtXFx1QUIyNlxcdUFCMjgtXFx1QUIyRVxcdUFCMzAtXFx1QUI1QVxcdUFCNUMtXFx1QUI2NVxcdUFCNzAtXFx1QUJFMlxcdUFDMDAtXFx1RDdBM1xcdUQ3QjAtXFx1RDdDNlxcdUQ3Q0ItXFx1RDdGQlxcdUY5MDAtXFx1RkE2RFxcdUZBNzAtXFx1RkFEOVxcdUZCMDAtXFx1RkIwNlxcdUZCMTMtXFx1RkIxN1xcdUZCMURcXHVGQjFGLVxcdUZCMjhcXHVGQjJBLVxcdUZCMzZcXHVGQjM4LVxcdUZCM0NcXHVGQjNFXFx1RkI0MFxcdUZCNDFcXHVGQjQzXFx1RkI0NFxcdUZCNDYtXFx1RkJCMVxcdUZCRDMtXFx1RkQzRFxcdUZENTAtXFx1RkQ4RlxcdUZEOTItXFx1RkRDN1xcdUZERjAtXFx1RkRGQlxcdUZFNzAtXFx1RkU3NFxcdUZFNzYtXFx1RkVGQ1xcdUZGMjEtXFx1RkYzQVxcdUZGNDEtXFx1RkY1QVxcdUZGNjYtXFx1RkZCRVxcdUZGQzItXFx1RkZDN1xcdUZGQ0EtXFx1RkZDRlxcdUZGRDItXFx1RkZEN1xcdUZGREEtXFx1RkZEQ118XFx1RDgwMFtcXHVEQzAwLVxcdURDMEJcXHVEQzBELVxcdURDMjZcXHVEQzI4LVxcdURDM0FcXHVEQzNDXFx1REMzRFxcdURDM0YtXFx1REM0RFxcdURDNTAtXFx1REM1RFxcdURDODAtXFx1RENGQVxcdURENDAtXFx1REQ3NFxcdURFODAtXFx1REU5Q1xcdURFQTAtXFx1REVEMFxcdURGMDAtXFx1REYxRlxcdURGMzAtXFx1REY0QVxcdURGNTAtXFx1REY3NVxcdURGODAtXFx1REY5RFxcdURGQTAtXFx1REZDM1xcdURGQzgtXFx1REZDRlxcdURGRDEtXFx1REZENV18XFx1RDgwMVtcXHVEQzAwLVxcdURDOURcXHVERDAwLVxcdUREMjdcXHVERDMwLVxcdURENjNcXHVERTAwLVxcdURGMzZcXHVERjQwLVxcdURGNTVcXHVERjYwLVxcdURGNjddfFxcdUQ4MDJbXFx1REMwMC1cXHVEQzA1XFx1REMwOFxcdURDMEEtXFx1REMzNVxcdURDMzdcXHVEQzM4XFx1REMzQ1xcdURDM0YtXFx1REM1NVxcdURDNjAtXFx1REM3NlxcdURDODAtXFx1REM5RVxcdURDRTAtXFx1RENGMlxcdURDRjRcXHVEQ0Y1XFx1REQwMC1cXHVERDE1XFx1REQyMC1cXHVERDM5XFx1REQ4MC1cXHVEREI3XFx1RERCRVxcdUREQkZcXHVERTAwXFx1REUxMC1cXHVERTEzXFx1REUxNS1cXHVERTE3XFx1REUxOS1cXHVERTMzXFx1REU2MC1cXHVERTdDXFx1REU4MC1cXHVERTlDXFx1REVDMC1cXHVERUM3XFx1REVDOS1cXHVERUU0XFx1REYwMC1cXHVERjM1XFx1REY0MC1cXHVERjU1XFx1REY2MC1cXHVERjcyXFx1REY4MC1cXHVERjkxXXxcXHVEODAzW1xcdURDMDAtXFx1REM0OFxcdURDODAtXFx1RENCMlxcdURDQzAtXFx1RENGMl18XFx1RDgwNFtcXHVEQzAzLVxcdURDMzdcXHVEQzgzLVxcdURDQUZcXHVEQ0QwLVxcdURDRThcXHVERDAzLVxcdUREMjZcXHVERDUwLVxcdURENzJcXHVERDc2XFx1REQ4My1cXHVEREIyXFx1RERDMS1cXHVEREM0XFx1REREQVxcdURERENcXHVERTAwLVxcdURFMTFcXHVERTEzLVxcdURFMkJcXHVERTgwLVxcdURFODZcXHVERTg4XFx1REU4QS1cXHVERThEXFx1REU4Ri1cXHVERTlEXFx1REU5Ri1cXHVERUE4XFx1REVCMC1cXHVERURFXFx1REYwNS1cXHVERjBDXFx1REYwRlxcdURGMTBcXHVERjEzLVxcdURGMjhcXHVERjJBLVxcdURGMzBcXHVERjMyXFx1REYzM1xcdURGMzUtXFx1REYzOVxcdURGM0RcXHVERjUwXFx1REY1RC1cXHVERjYxXXxcXHVEODA1W1xcdURDODAtXFx1RENBRlxcdURDQzRcXHVEQ0M1XFx1RENDN1xcdUREODAtXFx1RERBRVxcdURERDgtXFx1REREQlxcdURFMDAtXFx1REUyRlxcdURFNDRcXHVERTgwLVxcdURFQUFcXHVERjAwLVxcdURGMTldfFxcdUQ4MDZbXFx1RENBMC1cXHVEQ0RGXFx1RENGRlxcdURFQzAtXFx1REVGOF18XFx1RDgwOFtcXHVEQzAwLVxcdURGOTldfFxcdUQ4MDlbXFx1REMwMC1cXHVEQzZFXFx1REM4MC1cXHVERDQzXXxbXFx1RDgwQ1xcdUQ4NDAtXFx1RDg2OFxcdUQ4NkEtXFx1RDg2Q1xcdUQ4NkYtXFx1RDg3Ml1bXFx1REMwMC1cXHVERkZGXXxcXHVEODBEW1xcdURDMDAtXFx1REMyRV18XFx1RDgxMVtcXHVEQzAwLVxcdURFNDZdfFxcdUQ4MUFbXFx1REMwMC1cXHVERTM4XFx1REU0MC1cXHVERTVFXFx1REVEMC1cXHVERUVEXFx1REYwMC1cXHVERjJGXFx1REY0MC1cXHVERjQzXFx1REY2My1cXHVERjc3XFx1REY3RC1cXHVERjhGXXxcXHVEODFCW1xcdURGMDAtXFx1REY0NFxcdURGNTBcXHVERjkzLVxcdURGOUZdfFxcdUQ4MkNbXFx1REMwMFxcdURDMDFdfFxcdUQ4MkZbXFx1REMwMC1cXHVEQzZBXFx1REM3MC1cXHVEQzdDXFx1REM4MC1cXHVEQzg4XFx1REM5MC1cXHVEQzk5XXxcXHVEODM1W1xcdURDMDAtXFx1REM1NFxcdURDNTYtXFx1REM5Q1xcdURDOUVcXHVEQzlGXFx1RENBMlxcdURDQTVcXHVEQ0E2XFx1RENBOS1cXHVEQ0FDXFx1RENBRS1cXHVEQ0I5XFx1RENCQlxcdURDQkQtXFx1RENDM1xcdURDQzUtXFx1REQwNVxcdUREMDctXFx1REQwQVxcdUREMEQtXFx1REQxNFxcdUREMTYtXFx1REQxQ1xcdUREMUUtXFx1REQzOVxcdUREM0ItXFx1REQzRVxcdURENDAtXFx1REQ0NFxcdURENDZcXHVERDRBLVxcdURENTBcXHVERDUyLVxcdURFQTVcXHVERUE4LVxcdURFQzBcXHVERUMyLVxcdURFREFcXHVERURDLVxcdURFRkFcXHVERUZDLVxcdURGMTRcXHVERjE2LVxcdURGMzRcXHVERjM2LVxcdURGNEVcXHVERjUwLVxcdURGNkVcXHVERjcwLVxcdURGODhcXHVERjhBLVxcdURGQThcXHVERkFBLVxcdURGQzJcXHVERkM0LVxcdURGQ0JdfFxcdUQ4M0FbXFx1REMwMC1cXHVEQ0M0XXxcXHVEODNCW1xcdURFMDAtXFx1REUwM1xcdURFMDUtXFx1REUxRlxcdURFMjFcXHVERTIyXFx1REUyNFxcdURFMjdcXHVERTI5LVxcdURFMzJcXHVERTM0LVxcdURFMzdcXHVERTM5XFx1REUzQlxcdURFNDJcXHVERTQ3XFx1REU0OVxcdURFNEJcXHVERTRELVxcdURFNEZcXHVERTUxXFx1REU1MlxcdURFNTRcXHVERTU3XFx1REU1OVxcdURFNUJcXHVERTVEXFx1REU1RlxcdURFNjFcXHVERTYyXFx1REU2NFxcdURFNjctXFx1REU2QVxcdURFNkMtXFx1REU3MlxcdURFNzQtXFx1REU3N1xcdURFNzktXFx1REU3Q1xcdURFN0VcXHVERTgwLVxcdURFODlcXHVERThCLVxcdURFOUJcXHVERUExLVxcdURFQTNcXHVERUE1LVxcdURFQTlcXHVERUFCLVxcdURFQkJdfFxcdUQ4NjlbXFx1REMwMC1cXHVERUQ2XFx1REYwMC1cXHVERkZGXXxcXHVEODZEW1xcdURDMDAtXFx1REYzNFxcdURGNDAtXFx1REZGRl18XFx1RDg2RVtcXHVEQzAwLVxcdURDMURcXHVEQzIwLVxcdURGRkZdfFxcdUQ4NzNbXFx1REMwMC1cXHVERUExXXxcXHVEODdFW1xcdURDMDAtXFx1REUxRF0pKD86W1xcJDAtOUEtWl9hLXpcXHhBQVxceEI1XFx4QjdcXHhCQVxceEMwLVxceEQ2XFx4RDgtXFx4RjZcXHhGOC1cXHUwMkMxXFx1MDJDNi1cXHUwMkQxXFx1MDJFMC1cXHUwMkU0XFx1MDJFQ1xcdTAyRUVcXHUwMzAwLVxcdTAzNzRcXHUwMzc2XFx1MDM3N1xcdTAzN0EtXFx1MDM3RFxcdTAzN0ZcXHUwMzg2LVxcdTAzOEFcXHUwMzhDXFx1MDM4RS1cXHUwM0ExXFx1MDNBMy1cXHUwM0Y1XFx1MDNGNy1cXHUwNDgxXFx1MDQ4My1cXHUwNDg3XFx1MDQ4QS1cXHUwNTJGXFx1MDUzMS1cXHUwNTU2XFx1MDU1OVxcdTA1NjEtXFx1MDU4N1xcdTA1OTEtXFx1MDVCRFxcdTA1QkZcXHUwNUMxXFx1MDVDMlxcdTA1QzRcXHUwNUM1XFx1MDVDN1xcdTA1RDAtXFx1MDVFQVxcdTA1RjAtXFx1MDVGMlxcdTA2MTAtXFx1MDYxQVxcdTA2MjAtXFx1MDY2OVxcdTA2NkUtXFx1MDZEM1xcdTA2RDUtXFx1MDZEQ1xcdTA2REYtXFx1MDZFOFxcdTA2RUEtXFx1MDZGQ1xcdTA2RkZcXHUwNzEwLVxcdTA3NEFcXHUwNzRELVxcdTA3QjFcXHUwN0MwLVxcdTA3RjVcXHUwN0ZBXFx1MDgwMC1cXHUwODJEXFx1MDg0MC1cXHUwODVCXFx1MDhBMC1cXHUwOEI0XFx1MDhFMy1cXHUwOTYzXFx1MDk2Ni1cXHUwOTZGXFx1MDk3MS1cXHUwOTgzXFx1MDk4NS1cXHUwOThDXFx1MDk4RlxcdTA5OTBcXHUwOTkzLVxcdTA5QThcXHUwOUFBLVxcdTA5QjBcXHUwOUIyXFx1MDlCNi1cXHUwOUI5XFx1MDlCQy1cXHUwOUM0XFx1MDlDN1xcdTA5QzhcXHUwOUNCLVxcdTA5Q0VcXHUwOUQ3XFx1MDlEQ1xcdTA5RERcXHUwOURGLVxcdTA5RTNcXHUwOUU2LVxcdTA5RjFcXHUwQTAxLVxcdTBBMDNcXHUwQTA1LVxcdTBBMEFcXHUwQTBGXFx1MEExMFxcdTBBMTMtXFx1MEEyOFxcdTBBMkEtXFx1MEEzMFxcdTBBMzJcXHUwQTMzXFx1MEEzNVxcdTBBMzZcXHUwQTM4XFx1MEEzOVxcdTBBM0NcXHUwQTNFLVxcdTBBNDJcXHUwQTQ3XFx1MEE0OFxcdTBBNEItXFx1MEE0RFxcdTBBNTFcXHUwQTU5LVxcdTBBNUNcXHUwQTVFXFx1MEE2Ni1cXHUwQTc1XFx1MEE4MS1cXHUwQTgzXFx1MEE4NS1cXHUwQThEXFx1MEE4Ri1cXHUwQTkxXFx1MEE5My1cXHUwQUE4XFx1MEFBQS1cXHUwQUIwXFx1MEFCMlxcdTBBQjNcXHUwQUI1LVxcdTBBQjlcXHUwQUJDLVxcdTBBQzVcXHUwQUM3LVxcdTBBQzlcXHUwQUNCLVxcdTBBQ0RcXHUwQUQwXFx1MEFFMC1cXHUwQUUzXFx1MEFFNi1cXHUwQUVGXFx1MEFGOVxcdTBCMDEtXFx1MEIwM1xcdTBCMDUtXFx1MEIwQ1xcdTBCMEZcXHUwQjEwXFx1MEIxMy1cXHUwQjI4XFx1MEIyQS1cXHUwQjMwXFx1MEIzMlxcdTBCMzNcXHUwQjM1LVxcdTBCMzlcXHUwQjNDLVxcdTBCNDRcXHUwQjQ3XFx1MEI0OFxcdTBCNEItXFx1MEI0RFxcdTBCNTZcXHUwQjU3XFx1MEI1Q1xcdTBCNURcXHUwQjVGLVxcdTBCNjNcXHUwQjY2LVxcdTBCNkZcXHUwQjcxXFx1MEI4MlxcdTBCODNcXHUwQjg1LVxcdTBCOEFcXHUwQjhFLVxcdTBCOTBcXHUwQjkyLVxcdTBCOTVcXHUwQjk5XFx1MEI5QVxcdTBCOUNcXHUwQjlFXFx1MEI5RlxcdTBCQTNcXHUwQkE0XFx1MEJBOC1cXHUwQkFBXFx1MEJBRS1cXHUwQkI5XFx1MEJCRS1cXHUwQkMyXFx1MEJDNi1cXHUwQkM4XFx1MEJDQS1cXHUwQkNEXFx1MEJEMFxcdTBCRDdcXHUwQkU2LVxcdTBCRUZcXHUwQzAwLVxcdTBDMDNcXHUwQzA1LVxcdTBDMENcXHUwQzBFLVxcdTBDMTBcXHUwQzEyLVxcdTBDMjhcXHUwQzJBLVxcdTBDMzlcXHUwQzNELVxcdTBDNDRcXHUwQzQ2LVxcdTBDNDhcXHUwQzRBLVxcdTBDNERcXHUwQzU1XFx1MEM1NlxcdTBDNTgtXFx1MEM1QVxcdTBDNjAtXFx1MEM2M1xcdTBDNjYtXFx1MEM2RlxcdTBDODEtXFx1MEM4M1xcdTBDODUtXFx1MEM4Q1xcdTBDOEUtXFx1MEM5MFxcdTBDOTItXFx1MENBOFxcdTBDQUEtXFx1MENCM1xcdTBDQjUtXFx1MENCOVxcdTBDQkMtXFx1MENDNFxcdTBDQzYtXFx1MENDOFxcdTBDQ0EtXFx1MENDRFxcdTBDRDVcXHUwQ0Q2XFx1MENERVxcdTBDRTAtXFx1MENFM1xcdTBDRTYtXFx1MENFRlxcdTBDRjFcXHUwQ0YyXFx1MEQwMS1cXHUwRDAzXFx1MEQwNS1cXHUwRDBDXFx1MEQwRS1cXHUwRDEwXFx1MEQxMi1cXHUwRDNBXFx1MEQzRC1cXHUwRDQ0XFx1MEQ0Ni1cXHUwRDQ4XFx1MEQ0QS1cXHUwRDRFXFx1MEQ1N1xcdTBENUYtXFx1MEQ2M1xcdTBENjYtXFx1MEQ2RlxcdTBEN0EtXFx1MEQ3RlxcdTBEODJcXHUwRDgzXFx1MEQ4NS1cXHUwRDk2XFx1MEQ5QS1cXHUwREIxXFx1MERCMy1cXHUwREJCXFx1MERCRFxcdTBEQzAtXFx1MERDNlxcdTBEQ0FcXHUwRENGLVxcdTBERDRcXHUwREQ2XFx1MEREOC1cXHUwRERGXFx1MERFNi1cXHUwREVGXFx1MERGMlxcdTBERjNcXHUwRTAxLVxcdTBFM0FcXHUwRTQwLVxcdTBFNEVcXHUwRTUwLVxcdTBFNTlcXHUwRTgxXFx1MEU4MlxcdTBFODRcXHUwRTg3XFx1MEU4OFxcdTBFOEFcXHUwRThEXFx1MEU5NC1cXHUwRTk3XFx1MEU5OS1cXHUwRTlGXFx1MEVBMS1cXHUwRUEzXFx1MEVBNVxcdTBFQTdcXHUwRUFBXFx1MEVBQlxcdTBFQUQtXFx1MEVCOVxcdTBFQkItXFx1MEVCRFxcdTBFQzAtXFx1MEVDNFxcdTBFQzZcXHUwRUM4LVxcdTBFQ0RcXHUwRUQwLVxcdTBFRDlcXHUwRURDLVxcdTBFREZcXHUwRjAwXFx1MEYxOFxcdTBGMTlcXHUwRjIwLVxcdTBGMjlcXHUwRjM1XFx1MEYzN1xcdTBGMzlcXHUwRjNFLVxcdTBGNDdcXHUwRjQ5LVxcdTBGNkNcXHUwRjcxLVxcdTBGODRcXHUwRjg2LVxcdTBGOTdcXHUwRjk5LVxcdTBGQkNcXHUwRkM2XFx1MTAwMC1cXHUxMDQ5XFx1MTA1MC1cXHUxMDlEXFx1MTBBMC1cXHUxMEM1XFx1MTBDN1xcdTEwQ0RcXHUxMEQwLVxcdTEwRkFcXHUxMEZDLVxcdTEyNDhcXHUxMjRBLVxcdTEyNERcXHUxMjUwLVxcdTEyNTZcXHUxMjU4XFx1MTI1QS1cXHUxMjVEXFx1MTI2MC1cXHUxMjg4XFx1MTI4QS1cXHUxMjhEXFx1MTI5MC1cXHUxMkIwXFx1MTJCMi1cXHUxMkI1XFx1MTJCOC1cXHUxMkJFXFx1MTJDMFxcdTEyQzItXFx1MTJDNVxcdTEyQzgtXFx1MTJENlxcdTEyRDgtXFx1MTMxMFxcdTEzMTItXFx1MTMxNVxcdTEzMTgtXFx1MTM1QVxcdTEzNUQtXFx1MTM1RlxcdTEzNjktXFx1MTM3MVxcdTEzODAtXFx1MTM4RlxcdTEzQTAtXFx1MTNGNVxcdTEzRjgtXFx1MTNGRFxcdTE0MDEtXFx1MTY2Q1xcdTE2NkYtXFx1MTY3RlxcdTE2ODEtXFx1MTY5QVxcdTE2QTAtXFx1MTZFQVxcdTE2RUUtXFx1MTZGOFxcdTE3MDAtXFx1MTcwQ1xcdTE3MEUtXFx1MTcxNFxcdTE3MjAtXFx1MTczNFxcdTE3NDAtXFx1MTc1M1xcdTE3NjAtXFx1MTc2Q1xcdTE3NkUtXFx1MTc3MFxcdTE3NzJcXHUxNzczXFx1MTc4MC1cXHUxN0QzXFx1MTdEN1xcdTE3RENcXHUxN0REXFx1MTdFMC1cXHUxN0U5XFx1MTgwQi1cXHUxODBEXFx1MTgxMC1cXHUxODE5XFx1MTgyMC1cXHUxODc3XFx1MTg4MC1cXHUxOEFBXFx1MThCMC1cXHUxOEY1XFx1MTkwMC1cXHUxOTFFXFx1MTkyMC1cXHUxOTJCXFx1MTkzMC1cXHUxOTNCXFx1MTk0Ni1cXHUxOTZEXFx1MTk3MC1cXHUxOTc0XFx1MTk4MC1cXHUxOUFCXFx1MTlCMC1cXHUxOUM5XFx1MTlEMC1cXHUxOURBXFx1MUEwMC1cXHUxQTFCXFx1MUEyMC1cXHUxQTVFXFx1MUE2MC1cXHUxQTdDXFx1MUE3Ri1cXHUxQTg5XFx1MUE5MC1cXHUxQTk5XFx1MUFBN1xcdTFBQjAtXFx1MUFCRFxcdTFCMDAtXFx1MUI0QlxcdTFCNTAtXFx1MUI1OVxcdTFCNkItXFx1MUI3M1xcdTFCODAtXFx1MUJGM1xcdTFDMDAtXFx1MUMzN1xcdTFDNDAtXFx1MUM0OVxcdTFDNEQtXFx1MUM3RFxcdTFDRDAtXFx1MUNEMlxcdTFDRDQtXFx1MUNGNlxcdTFDRjhcXHUxQ0Y5XFx1MUQwMC1cXHUxREY1XFx1MURGQy1cXHUxRjE1XFx1MUYxOC1cXHUxRjFEXFx1MUYyMC1cXHUxRjQ1XFx1MUY0OC1cXHUxRjREXFx1MUY1MC1cXHUxRjU3XFx1MUY1OVxcdTFGNUJcXHUxRjVEXFx1MUY1Ri1cXHUxRjdEXFx1MUY4MC1cXHUxRkI0XFx1MUZCNi1cXHUxRkJDXFx1MUZCRVxcdTFGQzItXFx1MUZDNFxcdTFGQzYtXFx1MUZDQ1xcdTFGRDAtXFx1MUZEM1xcdTFGRDYtXFx1MUZEQlxcdTFGRTAtXFx1MUZFQ1xcdTFGRjItXFx1MUZGNFxcdTFGRjYtXFx1MUZGQ1xcdTIwMENcXHUyMDBEXFx1MjAzRlxcdTIwNDBcXHUyMDU0XFx1MjA3MVxcdTIwN0ZcXHUyMDkwLVxcdTIwOUNcXHUyMEQwLVxcdTIwRENcXHUyMEUxXFx1MjBFNS1cXHUyMEYwXFx1MjEwMlxcdTIxMDdcXHUyMTBBLVxcdTIxMTNcXHUyMTE1XFx1MjExOC1cXHUyMTFEXFx1MjEyNFxcdTIxMjZcXHUyMTI4XFx1MjEyQS1cXHUyMTM5XFx1MjEzQy1cXHUyMTNGXFx1MjE0NS1cXHUyMTQ5XFx1MjE0RVxcdTIxNjAtXFx1MjE4OFxcdTJDMDAtXFx1MkMyRVxcdTJDMzAtXFx1MkM1RVxcdTJDNjAtXFx1MkNFNFxcdTJDRUItXFx1MkNGM1xcdTJEMDAtXFx1MkQyNVxcdTJEMjdcXHUyRDJEXFx1MkQzMC1cXHUyRDY3XFx1MkQ2RlxcdTJEN0YtXFx1MkQ5NlxcdTJEQTAtXFx1MkRBNlxcdTJEQTgtXFx1MkRBRVxcdTJEQjAtXFx1MkRCNlxcdTJEQjgtXFx1MkRCRVxcdTJEQzAtXFx1MkRDNlxcdTJEQzgtXFx1MkRDRVxcdTJERDAtXFx1MkRENlxcdTJERDgtXFx1MkRERVxcdTJERTAtXFx1MkRGRlxcdTMwMDUtXFx1MzAwN1xcdTMwMjEtXFx1MzAyRlxcdTMwMzEtXFx1MzAzNVxcdTMwMzgtXFx1MzAzQ1xcdTMwNDEtXFx1MzA5NlxcdTMwOTktXFx1MzA5RlxcdTMwQTEtXFx1MzBGQVxcdTMwRkMtXFx1MzBGRlxcdTMxMDUtXFx1MzEyRFxcdTMxMzEtXFx1MzE4RVxcdTMxQTAtXFx1MzFCQVxcdTMxRjAtXFx1MzFGRlxcdTM0MDAtXFx1NERCNVxcdTRFMDAtXFx1OUZENVxcdUEwMDAtXFx1QTQ4Q1xcdUE0RDAtXFx1QTRGRFxcdUE1MDAtXFx1QTYwQ1xcdUE2MTAtXFx1QTYyQlxcdUE2NDAtXFx1QTY2RlxcdUE2NzQtXFx1QTY3RFxcdUE2N0YtXFx1QTZGMVxcdUE3MTctXFx1QTcxRlxcdUE3MjItXFx1QTc4OFxcdUE3OEItXFx1QTdBRFxcdUE3QjAtXFx1QTdCN1xcdUE3RjctXFx1QTgyN1xcdUE4NDAtXFx1QTg3M1xcdUE4ODAtXFx1QThDNFxcdUE4RDAtXFx1QThEOVxcdUE4RTAtXFx1QThGN1xcdUE4RkJcXHVBOEZEXFx1QTkwMC1cXHVBOTJEXFx1QTkzMC1cXHVBOTUzXFx1QTk2MC1cXHVBOTdDXFx1QTk4MC1cXHVBOUMwXFx1QTlDRi1cXHVBOUQ5XFx1QTlFMC1cXHVBOUZFXFx1QUEwMC1cXHVBQTM2XFx1QUE0MC1cXHVBQTREXFx1QUE1MC1cXHVBQTU5XFx1QUE2MC1cXHVBQTc2XFx1QUE3QS1cXHVBQUMyXFx1QUFEQi1cXHVBQUREXFx1QUFFMC1cXHVBQUVGXFx1QUFGMi1cXHVBQUY2XFx1QUIwMS1cXHVBQjA2XFx1QUIwOS1cXHVBQjBFXFx1QUIxMS1cXHVBQjE2XFx1QUIyMC1cXHVBQjI2XFx1QUIyOC1cXHVBQjJFXFx1QUIzMC1cXHVBQjVBXFx1QUI1Qy1cXHVBQjY1XFx1QUI3MC1cXHVBQkVBXFx1QUJFQ1xcdUFCRURcXHVBQkYwLVxcdUFCRjlcXHVBQzAwLVxcdUQ3QTNcXHVEN0IwLVxcdUQ3QzZcXHVEN0NCLVxcdUQ3RkJcXHVGOTAwLVxcdUZBNkRcXHVGQTcwLVxcdUZBRDlcXHVGQjAwLVxcdUZCMDZcXHVGQjEzLVxcdUZCMTdcXHVGQjFELVxcdUZCMjhcXHVGQjJBLVxcdUZCMzZcXHVGQjM4LVxcdUZCM0NcXHVGQjNFXFx1RkI0MFxcdUZCNDFcXHVGQjQzXFx1RkI0NFxcdUZCNDYtXFx1RkJCMVxcdUZCRDMtXFx1RkQzRFxcdUZENTAtXFx1RkQ4RlxcdUZEOTItXFx1RkRDN1xcdUZERjAtXFx1RkRGQlxcdUZFMDAtXFx1RkUwRlxcdUZFMjAtXFx1RkUyRlxcdUZFMzNcXHVGRTM0XFx1RkU0RC1cXHVGRTRGXFx1RkU3MC1cXHVGRTc0XFx1RkU3Ni1cXHVGRUZDXFx1RkYxMC1cXHVGRjE5XFx1RkYyMS1cXHVGRjNBXFx1RkYzRlxcdUZGNDEtXFx1RkY1QVxcdUZGNjYtXFx1RkZCRVxcdUZGQzItXFx1RkZDN1xcdUZGQ0EtXFx1RkZDRlxcdUZGRDItXFx1RkZEN1xcdUZGREEtXFx1RkZEQ118XFx1RDgwMFtcXHVEQzAwLVxcdURDMEJcXHVEQzBELVxcdURDMjZcXHVEQzI4LVxcdURDM0FcXHVEQzNDXFx1REMzRFxcdURDM0YtXFx1REM0RFxcdURDNTAtXFx1REM1RFxcdURDODAtXFx1RENGQVxcdURENDAtXFx1REQ3NFxcdURERkRcXHVERTgwLVxcdURFOUNcXHVERUEwLVxcdURFRDBcXHVERUUwXFx1REYwMC1cXHVERjFGXFx1REYzMC1cXHVERjRBXFx1REY1MC1cXHVERjdBXFx1REY4MC1cXHVERjlEXFx1REZBMC1cXHVERkMzXFx1REZDOC1cXHVERkNGXFx1REZEMS1cXHVERkQ1XXxcXHVEODAxW1xcdURDMDAtXFx1REM5RFxcdURDQTAtXFx1RENBOVxcdUREMDAtXFx1REQyN1xcdUREMzAtXFx1REQ2M1xcdURFMDAtXFx1REYzNlxcdURGNDAtXFx1REY1NVxcdURGNjAtXFx1REY2N118XFx1RDgwMltcXHVEQzAwLVxcdURDMDVcXHVEQzA4XFx1REMwQS1cXHVEQzM1XFx1REMzN1xcdURDMzhcXHVEQzNDXFx1REMzRi1cXHVEQzU1XFx1REM2MC1cXHVEQzc2XFx1REM4MC1cXHVEQzlFXFx1RENFMC1cXHVEQ0YyXFx1RENGNFxcdURDRjVcXHVERDAwLVxcdUREMTVcXHVERDIwLVxcdUREMzlcXHVERDgwLVxcdUREQjdcXHVEREJFXFx1RERCRlxcdURFMDAtXFx1REUwM1xcdURFMDVcXHVERTA2XFx1REUwQy1cXHVERTEzXFx1REUxNS1cXHVERTE3XFx1REUxOS1cXHVERTMzXFx1REUzOC1cXHVERTNBXFx1REUzRlxcdURFNjAtXFx1REU3Q1xcdURFODAtXFx1REU5Q1xcdURFQzAtXFx1REVDN1xcdURFQzktXFx1REVFNlxcdURGMDAtXFx1REYzNVxcdURGNDAtXFx1REY1NVxcdURGNjAtXFx1REY3MlxcdURGODAtXFx1REY5MV18XFx1RDgwM1tcXHVEQzAwLVxcdURDNDhcXHVEQzgwLVxcdURDQjJcXHVEQ0MwLVxcdURDRjJdfFxcdUQ4MDRbXFx1REMwMC1cXHVEQzQ2XFx1REM2Ni1cXHVEQzZGXFx1REM3Ri1cXHVEQ0JBXFx1RENEMC1cXHVEQ0U4XFx1RENGMC1cXHVEQ0Y5XFx1REQwMC1cXHVERDM0XFx1REQzNi1cXHVERDNGXFx1REQ1MC1cXHVERDczXFx1REQ3NlxcdUREODAtXFx1RERDNFxcdUREQ0EtXFx1RERDQ1xcdURERDAtXFx1REREQVxcdURERENcXHVERTAwLVxcdURFMTFcXHVERTEzLVxcdURFMzdcXHVERTgwLVxcdURFODZcXHVERTg4XFx1REU4QS1cXHVERThEXFx1REU4Ri1cXHVERTlEXFx1REU5Ri1cXHVERUE4XFx1REVCMC1cXHVERUVBXFx1REVGMC1cXHVERUY5XFx1REYwMC1cXHVERjAzXFx1REYwNS1cXHVERjBDXFx1REYwRlxcdURGMTBcXHVERjEzLVxcdURGMjhcXHVERjJBLVxcdURGMzBcXHVERjMyXFx1REYzM1xcdURGMzUtXFx1REYzOVxcdURGM0MtXFx1REY0NFxcdURGNDdcXHVERjQ4XFx1REY0Qi1cXHVERjREXFx1REY1MFxcdURGNTdcXHVERjVELVxcdURGNjNcXHVERjY2LVxcdURGNkNcXHVERjcwLVxcdURGNzRdfFxcdUQ4MDVbXFx1REM4MC1cXHVEQ0M1XFx1RENDN1xcdURDRDAtXFx1RENEOVxcdUREODAtXFx1RERCNVxcdUREQjgtXFx1RERDMFxcdURERDgtXFx1RERERFxcdURFMDAtXFx1REU0MFxcdURFNDRcXHVERTUwLVxcdURFNTlcXHVERTgwLVxcdURFQjdcXHVERUMwLVxcdURFQzlcXHVERjAwLVxcdURGMTlcXHVERjFELVxcdURGMkJcXHVERjMwLVxcdURGMzldfFxcdUQ4MDZbXFx1RENBMC1cXHVEQ0U5XFx1RENGRlxcdURFQzAtXFx1REVGOF18XFx1RDgwOFtcXHVEQzAwLVxcdURGOTldfFxcdUQ4MDlbXFx1REMwMC1cXHVEQzZFXFx1REM4MC1cXHVERDQzXXxbXFx1RDgwQ1xcdUQ4NDAtXFx1RDg2OFxcdUQ4NkEtXFx1RDg2Q1xcdUQ4NkYtXFx1RDg3Ml1bXFx1REMwMC1cXHVERkZGXXxcXHVEODBEW1xcdURDMDAtXFx1REMyRV18XFx1RDgxMVtcXHVEQzAwLVxcdURFNDZdfFxcdUQ4MUFbXFx1REMwMC1cXHVERTM4XFx1REU0MC1cXHVERTVFXFx1REU2MC1cXHVERTY5XFx1REVEMC1cXHVERUVEXFx1REVGMC1cXHVERUY0XFx1REYwMC1cXHVERjM2XFx1REY0MC1cXHVERjQzXFx1REY1MC1cXHVERjU5XFx1REY2My1cXHVERjc3XFx1REY3RC1cXHVERjhGXXxcXHVEODFCW1xcdURGMDAtXFx1REY0NFxcdURGNTAtXFx1REY3RVxcdURGOEYtXFx1REY5Rl18XFx1RDgyQ1tcXHVEQzAwXFx1REMwMV18XFx1RDgyRltcXHVEQzAwLVxcdURDNkFcXHVEQzcwLVxcdURDN0NcXHVEQzgwLVxcdURDODhcXHVEQzkwLVxcdURDOTlcXHVEQzlEXFx1REM5RV18XFx1RDgzNFtcXHVERDY1LVxcdURENjlcXHVERDZELVxcdURENzJcXHVERDdCLVxcdUREODJcXHVERDg1LVxcdUREOEJcXHVEREFBLVxcdUREQURcXHVERTQyLVxcdURFNDRdfFxcdUQ4MzVbXFx1REMwMC1cXHVEQzU0XFx1REM1Ni1cXHVEQzlDXFx1REM5RVxcdURDOUZcXHVEQ0EyXFx1RENBNVxcdURDQTZcXHVEQ0E5LVxcdURDQUNcXHVEQ0FFLVxcdURDQjlcXHVEQ0JCXFx1RENCRC1cXHVEQ0MzXFx1RENDNS1cXHVERDA1XFx1REQwNy1cXHVERDBBXFx1REQwRC1cXHVERDE0XFx1REQxNi1cXHVERDFDXFx1REQxRS1cXHVERDM5XFx1REQzQi1cXHVERDNFXFx1REQ0MC1cXHVERDQ0XFx1REQ0NlxcdURENEEtXFx1REQ1MFxcdURENTItXFx1REVBNVxcdURFQTgtXFx1REVDMFxcdURFQzItXFx1REVEQVxcdURFREMtXFx1REVGQVxcdURFRkMtXFx1REYxNFxcdURGMTYtXFx1REYzNFxcdURGMzYtXFx1REY0RVxcdURGNTAtXFx1REY2RVxcdURGNzAtXFx1REY4OFxcdURGOEEtXFx1REZBOFxcdURGQUEtXFx1REZDMlxcdURGQzQtXFx1REZDQlxcdURGQ0UtXFx1REZGRl18XFx1RDgzNltcXHVERTAwLVxcdURFMzZcXHVERTNCLVxcdURFNkNcXHVERTc1XFx1REU4NFxcdURFOUItXFx1REU5RlxcdURFQTEtXFx1REVBRl18XFx1RDgzQVtcXHVEQzAwLVxcdURDQzRcXHVEQ0QwLVxcdURDRDZdfFxcdUQ4M0JbXFx1REUwMC1cXHVERTAzXFx1REUwNS1cXHVERTFGXFx1REUyMVxcdURFMjJcXHVERTI0XFx1REUyN1xcdURFMjktXFx1REUzMlxcdURFMzQtXFx1REUzN1xcdURFMzlcXHVERTNCXFx1REU0MlxcdURFNDdcXHVERTQ5XFx1REU0QlxcdURFNEQtXFx1REU0RlxcdURFNTFcXHVERTUyXFx1REU1NFxcdURFNTdcXHVERTU5XFx1REU1QlxcdURFNURcXHVERTVGXFx1REU2MVxcdURFNjJcXHVERTY0XFx1REU2Ny1cXHVERTZBXFx1REU2Qy1cXHVERTcyXFx1REU3NC1cXHVERTc3XFx1REU3OS1cXHVERTdDXFx1REU3RVxcdURFODAtXFx1REU4OVxcdURFOEItXFx1REU5QlxcdURFQTEtXFx1REVBM1xcdURFQTUtXFx1REVBOVxcdURFQUItXFx1REVCQl18XFx1RDg2OVtcXHVEQzAwLVxcdURFRDZcXHVERjAwLVxcdURGRkZdfFxcdUQ4NkRbXFx1REMwMC1cXHVERjM0XFx1REY0MC1cXHVERkZGXXxcXHVEODZFW1xcdURDMDAtXFx1REMxRFxcdURDMjAtXFx1REZGRl18XFx1RDg3M1tcXHVEQzAwLVxcdURFQTFdfFxcdUQ4N0VbXFx1REMwMC1cXHVERTFEXXxcXHVEQjQwW1xcdUREMDAtXFx1RERFRl0pKiQvXG4gIGpzaWRlbnRpZmllcl9wYXR0ZXJuID0gL14oPzpbJF9dfFxccHtJRF9TdGFydH0pKD86WyRfXFx1ezIwMGN9XFx1ezIwMGR9XXxcXHB7SURfQ29udGludWV9KSokL3U7XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBYTUwgTmFtZXMsIElEc1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8qXG5cbiAgKiBodHRwczovL3d3dy53My5vcmcvVFIveG1sLyNOVC1OYW1lXG4gICogT2JzZXJ2ZSB0aGF0IGluIEhUTUw1IChidXQgbm90IGVhcmxpZXIgdmVyc2lvbnMpLCBtb3N0IHJlc3RyaWN0aW9ucyBvbiBJRCB2YWx1ZXMgaGF2ZSBiZWVuIHJlbW92ZWQ7IHRvXG4gICAgcXVvdGU6IFwiVGhlcmUgYXJlIG5vIG90aGVyIHJlc3RyaWN0aW9ucyBvbiB3aGF0IGZvcm0gYW4gSUQgY2FuIHRha2U7IGluIHBhcnRpY3VsYXIsIElEcyBjYW4gY29uc2lzdCBvZlxuICAgIGp1c3QgZGlnaXRzLCBzdGFydCB3aXRoIGEgZGlnaXQsIHN0YXJ0IHdpdGggYW4gdW5kZXJzY29yZSwgY29uc2lzdCBvZiBqdXN0IHB1bmN0dWF0aW9uLCBldGMuXCJcblxuICBbNF0gICAgIE5hbWVTdGFydENoYXIgICAgOjo9ICAgIFwiOlwiIHwgW0EtWl0gfCBcIl9cIiB8IFthLXpdIHwgWyN4QzAtI3hENl0gfCBbI3hEOC0jeEY2XSB8IFsjeEY4LSN4MkZGXSB8IFsjeDM3MC0jeDM3RF0gfCBbI3gzN0YtI3gxRkZGXSB8IFsjeDIwMEMtI3gyMDBEXSB8IFsjeDIwNzAtI3gyMThGXSB8IFsjeDJDMDAtI3gyRkVGXSB8IFsjeDMwMDEtI3hEN0ZGXSB8IFsjeEY5MDAtI3hGRENGXSB8IFsjeEZERjAtI3hGRkZEXSB8IFsjeDEwMDAwLSN4RUZGRkZdXG4gIFs0YV0gICAgTmFtZUNoYXIgICAgIDo6PSAgICBOYW1lU3RhcnRDaGFyIHwgXCItXCIgfCBcIi5cIiB8IFswLTldIHwgI3hCNyB8IFsjeDAzMDAtI3gwMzZGXSB8IFsjeDIwM0YtI3gyMDQwXVxuICBbNV0gICAgIE5hbWUgICAgIDo6PSAgICBOYW1lU3RhcnRDaGFyIChOYW1lQ2hhcikqXG5cbiAgICovXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gT1RGIEdseXBoIE5hbWVzXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLypcblxuICBGcm9tIGh0dHBzOi8vYWRvYmUtdHlwZS10b29scy5naXRodWIuaW8vYWZka28vT3BlblR5cGVGZWF0dXJlRmlsZVNwZWNpZmljYXRpb24uaHRtbCMyLmYuaVxuXG4gID4gQSBnbHlwaCBuYW1lIG1heSBiZSB1cCB0byA2MyBjaGFyYWN0ZXJzIGluIGxlbmd0aCwgbXVzdCBiZSBlbnRpcmVseSBjb21wcmlzZWQgb2YgY2hhcmFjdGVycyBmcm9tIHRoZVxuICA+IGZvbGxvd2luZyBzZXQ6XG4gID5cbiAgPiBgYGBcbiAgPiBBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWlxuICA+IGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6XG4gID4gMDEyMzQ1Njc4OVxuICA+IC4gICMgcGVyaW9kXG4gID4gXyAgIyB1bmRlcnNjb3JlXG4gID4gYGBgXG4gID5cbiAgPiBhbmQgbXVzdCBub3Qgc3RhcnQgd2l0aCBhIGRpZ2l0IG9yIHBlcmlvZC4gVGhlIG9ubHkgZXhjZXB0aW9uIGlzIHRoZSBzcGVjaWFsIGNoYXJhY3RlciDigJwubm90ZGVm4oCdLlxuICA+XG4gID4g4oCcdHdvY2VudHPigJ0sIOKAnGEx4oCdLCBhbmQg4oCcX+KAnSBhcmUgdmFsaWQgZ2x5cGggbmFtZXMuIOKAnDJjZW50c+KAnSBhbmQg4oCcLnR3b2NlbnRz4oCdIGFyZSDigJxub3QuXG5cbiAgKi9cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBUWVBFIERFQ0xBUkFUSU9OU1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHRoaXMuZGVjbGFyZV90eXBlcyA9IGZ1bmN0aW9uKCkge1xuICAgIC8qIE5PVEUgdG8gYmUgY2FsbGVkIGFzIGAoIHJlcXVpcmUgJy4vZGVjbGFyYXRpb25zJyApLmRlY2xhcmVfdHlwZXMuYXBwbHkgaW5zdGFuY2VgICovXG4gICAgdGhpcy5kZWNsYXJlKCdudWxsJywgKHgpID0+IHtcbiAgICAgIHJldHVybiB4ID09PSBudWxsO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgndW5kZWZpbmVkJywgKHgpID0+IHtcbiAgICAgIHJldHVybiB4ID09PSB2b2lkIDA7XG4gICAgfSk7XG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICB0aGlzLmRlY2xhcmUoJ3NhZCcsICh4KSA9PiB7XG4gICAgICByZXR1cm4gQ0hFQ0tTLmlzX3NhZCh4KTtcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ2hhcHB5JywgKHgpID0+IHtcbiAgICAgIHJldHVybiBDSEVDS1MuaXNfaGFwcHkoeCk7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdzYWRkZW5lZCcsICh4KSA9PiB7XG4gICAgICByZXR1cm4gQ0hFQ0tTLmlzX3NhZGRlbmVkKHgpO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnc3ltYm9sJywgKHgpID0+IHtcbiAgICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ3N5bWJvbCc7XG4gICAgfSk7XG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICB0aGlzLmRlY2xhcmUoJ2Jvb2xlYW4nLCB7XG4gICAgICB0ZXN0czoge1xuICAgICAgICBcInggaXMgdHJ1ZSBvciBmYWxzZVwiOiAoeCkgPT4ge1xuICAgICAgICAgIHJldHVybiAoeCA9PT0gdHJ1ZSkgfHwgKHggPT09IGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGNhc3RzOiB7XG4gICAgICAgIGZsb2F0OiAoeCkgPT4ge1xuICAgICAgICAgIGlmICh4KSB7XG4gICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICB0aGlzLmRlY2xhcmUoJ25hbicsICh4KSA9PiB7XG4gICAgICByZXR1cm4gTnVtYmVyLmlzTmFOKHgpO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnZmluaXRlJywgKHgpID0+IHtcbiAgICAgIHJldHVybiBOdW1iZXIuaXNGaW5pdGUoeCk7XG4gICAgfSk7XG4gICAgdGhpcy4vKiBUQUlOVCBtYWtlIHN1cmUgbm8gbm9uLW51bWJlcnMgc2xpcCB0aHJvdWdoICovZGVjbGFyZSgnaW50ZWdlcicsICh4KSA9PiB7XG4gICAgICByZXR1cm4gTnVtYmVyLmlzSW50ZWdlcih4KTtcbiAgICB9KTtcbiAgICB0aGlzLi8qIFRBSU5UIG1ha2Ugc3VyZSBubyBub24tbnVtYmVycyBzbGlwIHRocm91Z2ggKi9kZWNsYXJlKCdzYWZlaW50ZWdlcicsICh4KSA9PiB7XG4gICAgICByZXR1cm4gTnVtYmVyLmlzU2FmZUludGVnZXIoeCk7XG4gICAgfSk7XG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAvKiBGVFRCIHdlIGFyZSByZXRhaW5pbmcgYG51bWJlcmAgYXMgYSBsZXNzLXByZWZlcnJlZCBzeW5vbnltIGZvciBgZmxvYXRgOyBpbiB0aGUgZnV0dXJlLCBgbnVtYmVyYCBtYXlcbiAgICAgYmUgcmVtb3ZlZCBiZWNhdXNlIGl0IGNvbmZsaWN0cyB3aXRoIEpTIHVzYWdlICh3aGVyZSBpdCBpbmNsdWRlcyBgTmFOYCBhbmQgYCsvLUluZmluaXR5YCkgYW5kLCBtb3Jlb3ZlcixcbiAgICAgaXMgbm90IHRydXRoZnVsIChiZWNhdXNlIGl0IGlzIGEgcG9vciByZXByZXNlbnRhdGlvbiBvZiB3aGF0IHRoZSBtb2Rlcm4gdW5kZXJzdGFuZGluZyBvZiAnbnVtYmVyJyBpbiB0aGVcbiAgICAgbWF0aGVtYXRpY2FsIHNlbnNlIHdvdWxkIGltcGx5KS4gKi9cbiAgICAvKiBOT1RFIHJlbW92ZWQgaW4gdjg6IGBAc3BlY3MubnVtYmVyID0gQHNwZWNzLmZsb2F0YCAqL1xuICAgIHRoaXMuLyogVEFJTlQgbWFrZSBzdXJlIG5vIG5vbi1udW1iZXJzIHNsaXAgdGhyb3VnaCAqL2RlY2xhcmUoJ251bWJlcicsICh4KSA9PiB7XG4gICAgICByZXR1cm4gZmFsc2U7IC8vIHRocm93IG5ldyBFcnJvciBcIl5pbnRlcnR5cGVAODQ3NDReIHR5cGUgJ251bWJlcicgaXMgZGVwcmVjYXRlZFwiXG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdmbG9hdCcsIHtcbiAgICAgIHRlc3RzOiAoeCkgPT4ge1xuICAgICAgICByZXR1cm4gTnVtYmVyLmlzRmluaXRlKHgpO1xuICAgICAgfSxcbiAgICAgIGNhc3RzOiB7XG4gICAgICAgIGJvb2xlYW46ICh4KSA9PiB7XG4gICAgICAgICAgaWYgKHggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBpbnRlZ2VyOiAoeCkgPT4ge1xuICAgICAgICAgIHJldHVybiBNYXRoLnJvdW5kKHgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICB0aGlzLmRlY2xhcmUoJ2Zyb3plbicsICh4KSA9PiB7XG4gICAgICByZXR1cm4gT2JqZWN0LmlzRnJvemVuKHgpO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnc2VhbGVkJywgKHgpID0+IHtcbiAgICAgIHJldHVybiBPYmplY3QuaXNTZWFsZWQoeCk7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdleHRlbnNpYmxlJywgKHgpID0+IHtcbiAgICAgIHJldHVybiBPYmplY3QuaXNFeHRlbnNpYmxlKHgpO1xuICAgIH0pO1xuICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgdGhpcy5kZWNsYXJlKCdudW1lcmljJywgKHgpID0+IHtcbiAgICAgIHJldHVybiAoanNfdHlwZV9vZih4KSkgPT09ICdudW1iZXInO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnZnVuY3Rpb24nLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuIChqc190eXBlX29mKHgpKSA9PT0gJ2Z1bmN0aW9uJztcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ2FzeW5jZnVuY3Rpb24nLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuIChqc190eXBlX29mKHgpKSA9PT0gJ2FzeW5jZnVuY3Rpb24nO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnZ2VuZXJhdG9yZnVuY3Rpb24nLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuIChqc190eXBlX29mKHgpKSA9PT0gJ2dlbmVyYXRvcmZ1bmN0aW9uJztcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ2FzeW5jZ2VuZXJhdG9yZnVuY3Rpb24nLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuIChqc190eXBlX29mKHgpKSA9PT0gJ2FzeW5jZ2VuZXJhdG9yZnVuY3Rpb24nO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnYXN5bmNnZW5lcmF0b3InLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuIChqc190eXBlX29mKHgpKSA9PT0gJ2FzeW5jZ2VuZXJhdG9yJztcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ2dlbmVyYXRvcicsICh4KSA9PiB7XG4gICAgICByZXR1cm4gKGpzX3R5cGVfb2YoeCkpID09PSAnZ2VuZXJhdG9yJztcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ2RhdGUnLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuIChqc190eXBlX29mKHgpKSA9PT0gJ2RhdGUnO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnbGlzdGl0ZXJhdG9yJywgKHgpID0+IHtcbiAgICAgIHJldHVybiAoanNfdHlwZV9vZih4KSkgPT09ICdhcnJheWl0ZXJhdG9yJztcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ3RleHRpdGVyYXRvcicsICh4KSA9PiB7XG4gICAgICByZXR1cm4gKGpzX3R5cGVfb2YoeCkpID09PSAnc3RyaW5naXRlcmF0b3InO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnc2V0aXRlcmF0b3InLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuIChqc190eXBlX29mKHgpKSA9PT0gJ3NldGl0ZXJhdG9yJztcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ21hcGl0ZXJhdG9yJywgKHgpID0+IHtcbiAgICAgIHJldHVybiAoanNfdHlwZV9vZih4KSkgPT09ICdtYXBpdGVyYXRvcic7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdjYWxsYWJsZScsICh4KSA9PiB7XG4gICAgICB2YXIgcmVmO1xuICAgICAgcmV0dXJuIChyZWYgPSB0aGlzLnR5cGVfb2YoeCkpID09PSAnZnVuY3Rpb24nIHx8IHJlZiA9PT0gJ2FzeW5jZnVuY3Rpb24nIHx8IHJlZiA9PT0gJ2dlbmVyYXRvcmZ1bmN0aW9uJztcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ3Byb21pc2UnLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuICh0aGlzLmlzYS5uYXRpdmVwcm9taXNlKHgpKSB8fCAodGhpcy5pc2EudGhlbmFibGUoeCkpO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnbmF0aXZlcHJvbWlzZScsICh4KSA9PiB7XG4gICAgICByZXR1cm4geCBpbnN0YW5jZW9mIFByb21pc2U7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCd0aGVuYWJsZScsICh4KSA9PiB7XG4gICAgICByZXR1cm4gKHRoaXMudHlwZV9vZih4ICE9IG51bGwgPyB4LnRoZW4gOiB2b2lkIDApKSA9PT0gJ2Z1bmN0aW9uJztcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ2ltbWVkaWF0ZScsIGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiAhdGhpcy5pc2EucHJvbWlzZSh4KTtcbiAgICB9KTtcbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIHRoaXMuZGVjbGFyZSgndHJ1dGh5JywgKHgpID0+IHtcbiAgICAgIHJldHVybiAhIXg7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdmYWxzeScsICh4KSA9PiB7XG4gICAgICByZXR1cm4gIXg7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCd0cnVlJywgKHgpID0+IHtcbiAgICAgIHJldHVybiB4ID09PSB0cnVlO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnZmFsc2UnLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuIHggPT09IGZhbHNlO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgndW5zZXQnLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuIHggPT0gbnVsbDtcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ25vdHVuc2V0JywgKHgpID0+IHtcbiAgICAgIHJldHVybiB4ICE9IG51bGw7XG4gICAgfSk7XG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICB0aGlzLmRlY2xhcmUoJ2V2ZW4nLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuICh0aGlzLmlzYS5zYWZlaW50ZWdlcih4KSkgJiYgKG1vZHVsbyh4LCAyKSkgPT09IDA7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdvZGQnLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuICh0aGlzLmlzYS5zYWZlaW50ZWdlcih4KSkgJiYgKG1vZHVsbyh4LCAyKSkgPT09IDE7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdjYXJkaW5hbCcsIGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiAodGhpcy5pc2Euc2FmZWludGVnZXIoeCkpICYmICh0aGlzLmlzYS5ub25uZWdhdGl2ZSh4KSk7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdub25uZWdhdGl2ZScsICh4KSA9PiB7XG4gICAgICByZXR1cm4gKHRoaXMuaXNhLmluZmxvYXQoeCkpICYmICh4ID49IDApO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgncG9zaXRpdmUnLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuICh0aGlzLmlzYS5pbmZsb2F0KHgpKSAmJiAoeCA+IDApO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgncG9zaXRpdmVfZmxvYXQnLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuICh0aGlzLmlzYS5mbG9hdCh4KSkgJiYgKHggPiAwKTtcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ3Bvc2l0aXZlX2ludGVnZXInLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuICh0aGlzLmlzYS5pbnRlZ2VyKHgpKSAmJiAoeCA+IDApO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnbmVnYXRpdmVfaW50ZWdlcicsICh4KSA9PiB7XG4gICAgICByZXR1cm4gKHRoaXMuaXNhLmludGVnZXIoeCkpICYmICh4IDwgMCk7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCd6ZXJvJywgKHgpID0+IHtcbiAgICAgIHJldHVybiB4ID09PSAwO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnaW5maW5pdHknLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuICh4ID09PSArMmUzMDgpIHx8ICh4ID09PSAtMmUzMDgpO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnaW5mbG9hdCcsICh4KSA9PiB7XG4gICAgICByZXR1cm4gKHRoaXMuaXNhLmZsb2F0KHgpKSB8fCAoeCA9PT0gMmUzMDgpIHx8ICh4ID09PSAtMmUzMDgpO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnbm9ucG9zaXRpdmUnLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuICh0aGlzLmlzYS5pbmZsb2F0KHgpKSAmJiAoeCA8PSAwKTtcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ25lZ2F0aXZlJywgKHgpID0+IHtcbiAgICAgIHJldHVybiAodGhpcy5pc2EuaW5mbG9hdCh4KSkgJiYgKHggPCAwKTtcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ25lZ2F0aXZlX2Zsb2F0JywgKHgpID0+IHtcbiAgICAgIHJldHVybiAodGhpcy5pc2EuZmxvYXQoeCkpICYmICh4IDwgMCk7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdwcm9wZXJfZnJhY3Rpb24nLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuICh0aGlzLmlzYS5mbG9hdCh4KSkgJiYgKCgwIDw9IHggJiYgeCA8PSAxKSk7XG4gICAgfSk7XG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICB0aGlzLmRlY2xhcmUoJ2VtcHR5JywgZnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuICh0aGlzLmhhc19zaXplKHgpKSAmJiAodGhpcy5zaXplX29mKHgpKSA9PT0gMDtcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ3Npbmd1bGFyJywgZnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuICh0aGlzLmhhc19zaXplKHgpKSAmJiAodGhpcy5zaXplX29mKHgpKSA9PT0gMTtcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ25vbmVtcHR5JywgZnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuICh0aGlzLmhhc19zaXplKHgpKSAmJiAodGhpcy5zaXplX29mKHgpKSA+IDA7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdwbHVyYWwnLCBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gKHRoaXMuaGFzX3NpemUoeCkpICYmICh0aGlzLnNpemVfb2YoeCkpID4gMTtcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ2JsYW5rX3RleHQnLCBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gKHRoaXMuaXNhLnRleHQoeCkpICYmICgoeC5tYXRjaCgvXlxccyokL3VzKSkgIT0gbnVsbCk7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdub25ibGFua190ZXh0JywgZnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuICh0aGlzLmlzYS50ZXh0KHgpKSAmJiAoKHgubWF0Y2goL15cXHMqJC91cykpID09IG51bGwpO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnY2hyJywgZnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuICh0aGlzLmlzYS50ZXh0KHgpKSAmJiAoKHgubWF0Y2goL14uJC91cykpICE9IG51bGwpO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnbm9uZW1wdHlfdGV4dCcsIGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiAodGhpcy5pc2EudGV4dCh4KSkgJiYgKHRoaXMuaXNhLm5vbmVtcHR5KHgpKTtcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ25vbmVtcHR5X2xpc3QnLCBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gKHRoaXMuaXNhLmxpc3QoeCkpICYmICh0aGlzLmlzYS5ub25lbXB0eSh4KSk7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdub25lbXB0eV9vYmplY3QnLCBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gKHRoaXMuaXNhLm9iamVjdCh4KSkgJiYgKHRoaXMuaXNhLm5vbmVtcHR5KHgpKTtcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ25vbmVtcHR5X3NldCcsIGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiAodGhpcy5pc2Euc2V0KHgpKSAmJiAodGhpcy5pc2Eubm9uZW1wdHkoeCkpO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnbm9uZW1wdHlfbWFwJywgZnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuICh0aGlzLmlzYS5tYXAoeCkpICYmICh0aGlzLmlzYS5ub25lbXB0eSh4KSk7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdlbXB0eV90ZXh0JywgZnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuICh0aGlzLmlzYS50ZXh0KHgpKSAmJiAodGhpcy5pc2EuZW1wdHkoeCkpO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnZW1wdHlfbGlzdCcsIGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiAodGhpcy5pc2EubGlzdCh4KSkgJiYgKHRoaXMuaXNhLmVtcHR5KHgpKTtcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ2VtcHR5X29iamVjdCcsIGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiAodGhpcy5pc2Eub2JqZWN0KHgpKSAmJiAodGhpcy5pc2EuZW1wdHkoeCkpO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnZW1wdHlfc2V0JywgZnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuICh0aGlzLmlzYS5zZXQoeCkpICYmICh0aGlzLmlzYS5lbXB0eSh4KSk7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdlbXB0eV9tYXAnLCBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gKHRoaXMuaXNhLm1hcCh4KSkgJiYgKHRoaXMuaXNhLmVtcHR5KHgpKTtcbiAgICB9KTtcbiAgICAvLyBpc19naXZlbiAgICAgICAgICAgICAgICAgID0gKCB4ICkgLT4gbm90IFsgbnVsbCwgdW5kZWZpbmVkLCBOYU4sICcnLCBdLmluY2x1ZGVzIHhcbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIHRoaXMuZGVjbGFyZSgnYnVmZmVyJywge1xuICAgICAgc2l6ZTogJ2xlbmd0aCdcbiAgICB9LCAoeCkgPT4ge1xuICAgICAgcmV0dXJuIEJ1ZmZlci5pc0J1ZmZlcih4KTtcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ2FycmF5YnVmZmVyJywge1xuICAgICAgc2l6ZTogJ2xlbmd0aCdcbiAgICB9LCAoeCkgPT4ge1xuICAgICAgcmV0dXJuIChqc190eXBlX29mKHgpKSA9PT0gJ2FycmF5YnVmZmVyJztcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ2ludDhhcnJheScsIHtcbiAgICAgIHNpemU6ICdsZW5ndGgnXG4gICAgfSwgKHgpID0+IHtcbiAgICAgIHJldHVybiAoanNfdHlwZV9vZih4KSkgPT09ICdpbnQ4YXJyYXknO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgndWludDhhcnJheScsIHtcbiAgICAgIHNpemU6ICdsZW5ndGgnXG4gICAgfSwgKHgpID0+IHtcbiAgICAgIHJldHVybiAoanNfdHlwZV9vZih4KSkgPT09ICd1aW50OGFycmF5JztcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ3VpbnQ4Y2xhbXBlZGFycmF5Jywge1xuICAgICAgc2l6ZTogJ2xlbmd0aCdcbiAgICB9LCAoeCkgPT4ge1xuICAgICAgcmV0dXJuIChqc190eXBlX29mKHgpKSA9PT0gJ3VpbnQ4Y2xhbXBlZGFycmF5JztcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ2ludDE2YXJyYXknLCB7XG4gICAgICBzaXplOiAnbGVuZ3RoJ1xuICAgIH0sICh4KSA9PiB7XG4gICAgICByZXR1cm4gKGpzX3R5cGVfb2YoeCkpID09PSAnaW50MTZhcnJheSc7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCd1aW50MTZhcnJheScsIHtcbiAgICAgIHNpemU6ICdsZW5ndGgnXG4gICAgfSwgKHgpID0+IHtcbiAgICAgIHJldHVybiAoanNfdHlwZV9vZih4KSkgPT09ICd1aW50MTZhcnJheSc7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdpbnQzMmFycmF5Jywge1xuICAgICAgc2l6ZTogJ2xlbmd0aCdcbiAgICB9LCAoeCkgPT4ge1xuICAgICAgcmV0dXJuIChqc190eXBlX29mKHgpKSA9PT0gJ2ludDMyYXJyYXknO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgndWludDMyYXJyYXknLCB7XG4gICAgICBzaXplOiAnbGVuZ3RoJ1xuICAgIH0sICh4KSA9PiB7XG4gICAgICByZXR1cm4gKGpzX3R5cGVfb2YoeCkpID09PSAndWludDMyYXJyYXknO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnZmxvYXQzMmFycmF5Jywge1xuICAgICAgc2l6ZTogJ2xlbmd0aCdcbiAgICB9LCAoeCkgPT4ge1xuICAgICAgcmV0dXJuIChqc190eXBlX29mKHgpKSA9PT0gJ2Zsb2F0MzJhcnJheSc7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdmbG9hdDY0YXJyYXknLCB7XG4gICAgICBzaXplOiAnbGVuZ3RoJ1xuICAgIH0sICh4KSA9PiB7XG4gICAgICByZXR1cm4gKGpzX3R5cGVfb2YoeCkpID09PSAnZmxvYXQ2NGFycmF5JztcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ2xpc3QnLCB7XG4gICAgICBzaXplOiAnbGVuZ3RoJ1xuICAgIH0sICh4KSA9PiB7XG4gICAgICByZXR1cm4gKGpzX3R5cGVfb2YoeCkpID09PSAnYXJyYXknO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnc2V0Jywge1xuICAgICAgc2l6ZTogJ3NpemUnXG4gICAgfSwgZnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuIChqc190eXBlX29mKHgpKSA9PT0gJ3NldCc7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdtYXAnLCB7XG4gICAgICBzaXplOiAnc2l6ZSdcbiAgICB9LCBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gKGpzX3R5cGVfb2YoeCkpID09PSAnbWFwJztcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ3dlYWttYXAnLCBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gKGpzX3R5cGVfb2YoeCkpID09PSAnd2Vha21hcCc7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCd3ZWFrc2V0JywgZnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuIChqc190eXBlX29mKHgpKSA9PT0gJ3dlYWtzZXQnO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnZXJyb3InLCBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gKGpzX3R5cGVfb2YoeCkpID09PSAnZXJyb3InO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgncmVnZXgnLCBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gKGpzX3R5cGVfb2YoeCkpID09PSAncmVnZXhwJztcbiAgICB9KTtcbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIHRoaXMuZGVjbGFyZSgnb2JqZWN0Jywge1xuICAgICAgdGVzdHM6ICh4KSA9PiB7XG4gICAgICAgIHJldHVybiAoanNfdHlwZV9vZih4KSkgPT09ICdvYmplY3QnO1xuICAgICAgfSxcbiAgICAgIHNpemU6ICh4KSA9PiB7XG4gICAgICAgIHJldHVybiAoT2JqZWN0LmtleXMoeCkpLmxlbmd0aDtcbiAgICAgIH1cbiAgICB9KTtcbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIHRoaXMuZGVjbGFyZSgnZ2xvYmFsJywge1xuICAgICAgdGVzdHM6ICh4KSA9PiB7XG4gICAgICAgIHJldHVybiAoanNfdHlwZV9vZih4KSkgPT09ICdnbG9iYWwnO1xuICAgICAgfSxcbiAgICAgIHNpemU6ICh4KSA9PiB7XG4gICAgICAgIHJldHVybiAoT2JqZWN0LmtleXMoeCkpLmxlbmd0aDtcbiAgICAgIH1cbiAgICB9KTtcbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIHRoaXMuZGVjbGFyZSgndGV4dCcsIHtcbiAgICAgIHRlc3RzOiAoeCkgPT4ge1xuICAgICAgICByZXR1cm4gKGpzX3R5cGVfb2YoeCkpID09PSAnc3RyaW5nJztcbiAgICAgIH0sXG4gICAgICBzaXplOiBmdW5jdGlvbih4LCBzZWxlY3RvciA9ICdjb2RldW5pdHMnKSB7XG4gICAgICAgIHZhciByZWY7XG4gICAgICAgIHN3aXRjaCAoc2VsZWN0b3IpIHtcbiAgICAgICAgICBjYXNlICdjb2RlcG9pbnRzJzpcbiAgICAgICAgICAgIHJldHVybiAoQXJyYXkuZnJvbSh4KSkubGVuZ3RoO1xuICAgICAgICAgIGNhc2UgJ2NvZGV1bml0cyc6XG4gICAgICAgICAgICByZXR1cm4geC5sZW5ndGg7XG4gICAgICAgICAgY2FzZSAnYnl0ZXMnOlxuICAgICAgICAgICAgcmV0dXJuIEJ1ZmZlci5ieXRlTGVuZ3RoKHgsIChyZWYgPSB0eXBlb2Ygc2V0dGluZ3MgIT09IFwidW5kZWZpbmVkXCIgJiYgc2V0dGluZ3MgIT09IG51bGwgPyBzZXR0aW5nc1snZW5jb2RpbmcnXSA6IHZvaWQgMCkgIT0gbnVsbCA/IHJlZiA6ICd1dGYtOCcpO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHVua25vd24gY291bnRpbmcgc2VsZWN0b3IgJHtycHIoc2VsZWN0b3IpfWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICB0aGlzLmRlY2xhcmUoJ2xpc3Rfb2YnLCB7XG4gICAgICB0ZXN0czoge1xuICAgICAgICBcInggaXMgYSBsaXN0XCI6ICh0eXBlLCB4LCAuLi54UCkgPT4ge1xuICAgICAgICAgIHJldHVybiB0aGlzLmlzYS5saXN0KHgpO1xuICAgICAgICB9LFxuICAgICAgICAvKiBUQUlOVCBzaG91bGQgY2hlY2sgZm9yIGBAaXNhLnR5cGUgdHlwZWAgKi9cbiAgICAgICAgXCJ0eXBlIGlzIG5vbmVtcHR5X3RleHRcIjogKHR5cGUsIHgsIC4uLnhQKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuaXNhLm5vbmVtcHR5X3RleHQodHlwZSk7XG4gICAgICAgIH0sXG4gICAgICAgIFwiYWxsIGVsZW1lbnRzIHBhc3MgdGVzdFwiOiAodHlwZSwgeCwgLi4ueFApID0+IHtcbiAgICAgICAgICByZXR1cm4geC5ldmVyeSgoeHgpID0+IHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzYSh0eXBlLCB4eCwgLi4ueFApO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICB0aGlzLmRlY2xhcmUoJ29iamVjdF9vZicsIHtcbiAgICAgIHRlc3RzOiB7XG4gICAgICAgIFwieCBpcyBhIG9iamVjdFwiOiAodHlwZSwgeCwgLi4ueFApID0+IHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5pc2Eub2JqZWN0KHgpO1xuICAgICAgICB9LFxuICAgICAgICAvKiBUQUlOVCBzaG91bGQgY2hlY2sgZm9yIGBAaXNhLnR5cGUgdHlwZWAgKi9cbiAgICAgICAgXCJ0eXBlIGlzIG5vbmVtcHR5X3RleHRcIjogKHR5cGUsIHgsIC4uLnhQKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuaXNhLm5vbmVtcHR5X3RleHQodHlwZSk7XG4gICAgICAgIH0sXG4gICAgICAgIFwiYWxsIGVsZW1lbnRzIHBhc3MgdGVzdFwiOiAodHlwZSwgeCwgLi4ueFApID0+IHtcbiAgICAgICAgICB2YXIgXywgeHg7XG4gICAgICAgICAgZm9yIChfIGluIHgpIHtcbiAgICAgICAgICAgIHh4ID0geFtfXTtcbiAgICAgICAgICAgIGlmICghdGhpcy5pc2EodHlwZSwgeHgsIC4uLnhQKSkge1xuICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICB0aGlzLmRlY2xhcmUoJ2pzaWRlbnRpZmllcicsIHtcbiAgICAgIHRlc3RzOiAoeCkgPT4ge1xuICAgICAgICByZXR1cm4gKHRoaXMuaXNhLnRleHQoeCkpICYmIGpzaWRlbnRpZmllcl9wYXR0ZXJuLnRlc3QoeCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICB0aGlzLmRlY2xhcmUoJ2ludDJ0ZXh0Jywge1xuICAgICAgdGVzdHM6ICh4KSA9PiB7XG4gICAgICAgIHJldHVybiAodGhpcy5pc2EudGV4dCh4KSkgJiYgKCh4Lm1hdGNoKC9eWzAxXSskLykpICE9IG51bGwpO1xuICAgICAgfSxcbiAgICAgIGNhc3RzOiB7XG4gICAgICAgIGZsb2F0OiAoeCkgPT4ge1xuICAgICAgICAgIHJldHVybiBwYXJzZUludCh4LCAyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgdGhpcy5kZWNsYXJlKCdpbnQxMHRleHQnLCB7XG4gICAgICB0ZXN0czogKHgpID0+IHtcbiAgICAgICAgcmV0dXJuICh0aGlzLmlzYS50ZXh0KHgpKSAmJiAoKHgubWF0Y2goL15bMC05XSskLykpICE9IG51bGwpO1xuICAgICAgfSxcbiAgICAgIGNhc3RzOiB7XG4gICAgICAgIGZsb2F0OiAoeCkgPT4ge1xuICAgICAgICAgIHJldHVybiBwYXJzZUludCh4LCAxMCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIHRoaXMuZGVjbGFyZSgnaW50MTZ0ZXh0Jywge1xuICAgICAgdGVzdHM6ICh4KSA9PiB7XG4gICAgICAgIHJldHVybiAodGhpcy5pc2EudGV4dCh4KSkgJiYgKCh4Lm1hdGNoKC9eWzAtOWEtZkEtRl0rJC8pKSAhPSBudWxsKTtcbiAgICAgIH0sXG4gICAgICBjYXN0czoge1xuICAgICAgICBmbG9hdDogKHgpID0+IHtcbiAgICAgICAgICByZXR1cm4gcGFyc2VJbnQoeCwgMTYpO1xuICAgICAgICB9LFxuICAgICAgICBpbnQydGV4dDogKHgpID0+IHtcbiAgICAgICAgICByZXR1cm4gKHBhcnNlSW50KHgsIDE2KSkudG9TdHJpbmcoMik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIHRoaXMuLyogVEFJTlQgY291bGQgdXNlIGBjYXN0KClgIEFQSSAqL2RlY2xhcmUoJ2ludDMyJywgZnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuICh0aGlzLmlzYS5pbnRlZ2VyKHgpKSAmJiAoKC0yMTQ3NDgzNjQ4IDw9IHggJiYgeCA8PSAyMTQ3NDgzNjQ3KSk7XG4gICAgfSk7XG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICB0aGlzLmRlY2xhcmUoJ3ZucicsIGZ1bmN0aW9uKHgpIHtcbiAgICAgIC8qIEEgdmVjdG9yaWFsIG51bWJlciAoVk5SKSBpcyBhIG5vbi1lbXB0eSBhcnJheSBvZiBudW1iZXJzLCBpbmNsdWRpbmcgaW5maW5pdHkuICovXG4gICAgICByZXR1cm4gKHRoaXMuaXNhX2xpc3Rfb2YuaW5mbG9hdCh4KSkgJiYgKHgubGVuZ3RoID4gMCk7XG4gICAgfSk7XG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICByZXR1cm4gdGhpcy5kZWNsYXJlKCdmc19zdGF0cycsIHtcbiAgICAgIHRlc3RzOiB7XG4gICAgICAgICd4IGlzIGFuIG9iamVjdCc6IGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5pc2Eub2JqZWN0KHgpO1xuICAgICAgICB9LFxuICAgICAgICAneC5zaXplIGlzIGEgY2FyZGluYWwnOiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuaXNhLmNhcmRpbmFsKHguc2l6ZSk7XG4gICAgICAgIH0sXG4gICAgICAgICd4LmF0aW1lTXMgaXMgYSBmbG9hdCc6IGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5pc2EuZmxvYXQoeC5hdGltZU1zKTtcbiAgICAgICAgfSxcbiAgICAgICAgJ3guYXRpbWUgaXMgYSBkYXRlJzogZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLmlzYS5kYXRlKHguYXRpbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBUWVBFIERFQ0xBUkFUSU9OU1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHRoaXMuZGVjbGFyZV9jaGVja3MgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgRlMsIFBBVEg7XG4gICAgUEFUSCA9IHJlcXVpcmUoJ3BhdGgnKTtcbiAgICBGUyA9IHJlcXVpcmUoJ2ZzJyk7XG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAvKiBOT1RFOiB3aWxsIHRocm93IGVycm9yIHVubGVzcyBwYXRoIGV4aXN0cywgZXJyb3IgaXMgaW1wbGljaXRseSBjYXVnaHQsIHJlcHJlc2VudHMgc2FkIHBhdGggKi9cbiAgICB0aGlzLmRlY2xhcmVfY2hlY2soJ2Zzb19leGlzdHMnLCBmdW5jdGlvbihwYXRoLCBzdGF0cyA9IG51bGwpIHtcbiAgICAgIHJldHVybiBGUy5zdGF0U3luYyhwYXRoKTtcbiAgICB9KTtcbiAgICAvLyB0cnkgKCBzdGF0cyA/IEZTLnN0YXRTeW5jIHBhdGggKSBjYXRjaCBlcnJvciB0aGVuIGVycm9yXG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICB0aGlzLmRlY2xhcmVfY2hlY2soJ2lzX2ZpbGUnLCBmdW5jdGlvbihwYXRoLCBzdGF0cyA9IG51bGwpIHtcbiAgICAgIHZhciBiYWQ7XG4gICAgICBpZiAodGhpcy5pc19zYWQoKGJhZCA9IHN0YXRzID0gdGhpcy5jaGVjay5mc29fZXhpc3RzKHBhdGgsIHN0YXRzKSkpKSB7XG4gICAgICAgIHJldHVybiBiYWQ7XG4gICAgICB9XG4gICAgICBpZiAoc3RhdHMuaXNGaWxlKCkpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRzO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuc2FkZGVuKGBub3QgYSBmaWxlOiAke3BhdGh9YCk7XG4gICAgfSk7XG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICByZXR1cm4gdGhpcy5kZWNsYXJlX2NoZWNrKCdpc19qc29uX2ZpbGUnLCBmdW5jdGlvbihwYXRoKSB7XG4gICAgICB2YXIgZXJyb3I7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShGUy5yZWFkRmlsZVN5bmMocGF0aCkpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IxKSB7XG4gICAgICAgIGVycm9yID0gZXJyb3IxO1xuICAgICAgICByZXR1cm4gZXJyb3I7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gIy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuLy8gQGRlY2xhcmVfY2hlY2sgJ2VxdWFscycsICggYSwgUC4uLiApIC0+XG4vLyAgIGZvciBiIGluIFBcbi8vICAgICByZXR1cm4gQ0hFQ0tTLnNhZCB1bmxlc3MgZXF1YWxzIGEsIGJcbi8vICAgcmV0dXJuIHRydWVcbi8qIG5vdCBzdXBwb3J0ZWQgdW50aWwgd2UgZmlndXJlIG91dCBob3cgdG8gZG8gaXQgaW4gc3RyaWN0IG1vZGU6ICovXG4vLyBAZGVjbGFyZSAnYXJndW1lbnRzJywgICAgICAgICAgICAgICAgICAgICAoIHggKSAtPiAoIGpzX3R5cGVfb2YgeCApIGlzICdhcmd1bWVudHMnXG5cbiAgLy8gQXJyYXkuaXNBcnJheVxuLy8gQXJyYXlCdWZmZXIuaXNWaWV3XG4vLyBBdG9taWNzLmlzTG9ja0ZyZWVcbi8vIEJ1ZmZlci5pc0J1ZmZlclxuLy8gQnVmZmVyLmlzRW5jb2Rpbmdcbi8vIGNvbnN0cnVjdG9yLmlzXG4vLyBjb25zdHJ1Y3Rvci5pc0V4dGVuc2libGVcbi8vIGNvbnN0cnVjdG9yLmlzRnJvemVuXG4vLyBjb25zdHJ1Y3Rvci5pc1NlYWxlZFxuLy8gTnVtYmVyLmlzRmluaXRlXG4vLyBOdW1iZXIuaXNJbnRlZ2VyXG4vLyBOdW1iZXIuaXNOYU5cbi8vIE51bWJlci5pc1NhZmVJbnRlZ2VyXG4vLyBPYmplY3QuaXNcbi8vIE9iamVjdC5pc0V4dGVuc2libGVcbi8vIE9iamVjdC5pc0Zyb3plblxuLy8gT2JqZWN0LmlzU2VhbGVkXG4vLyBSZWZsZWN0LmlzRXh0ZW5zaWJsZVxuLy8gcm9vdC5pc0Zpbml0ZVxuLy8gcm9vdC5pc05hTlxuLy8gU3ltYm9sLmlzQ29uY2F0U3ByZWFkYWJsZVxuXG59KS5jYWxsKHRoaXMpO1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1kZWNsYXJhdGlvbnMuanMubWFwIiwiKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG4gIHZhciBhc3NpZ24sIGNvbnN0cnVjdG9yX29mX2dlbmVyYXRvcnMsIGNvcHlfaWZfb3JpZ2luYWwsIGlzYV9jb3B5LCBqciwganNfdHlwZV9vZiwgcnByLCB4cnByLFxuICAgIGluZGV4T2YgPSBbXS5pbmRleE9mO1xuXG4gIC8vIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiAgKHthc3NpZ24sIGpyLCBycHIsIHhycHIsIGpzX3R5cGVfb2Z9ID0gcmVxdWlyZSgnLi9oZWxwZXJzJykpO1xuXG4gIGlzYV9jb3B5ID0gU3ltYm9sKCdpc2FfY29weScpO1xuXG4gIGNvbnN0cnVjdG9yX29mX2dlbmVyYXRvcnMgPSAoKGZ1bmN0aW9uKigpIHtcbiAgICByZXR1cm4gKHlpZWxkIDQyKTtcbiAgfSkoKSkuY29uc3RydWN0b3I7XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvKiBUQUlOVCBtYWtlIGNhdGFsb2cgb2YgYWxsICdkZWVwIEpTJyBuYW1lcyB0aGF0IG11c3QgbmV2ZXIgYmUgdXNlZCBhcyB0eXBlcywgYi9jIGUuZyBhIHR5cGUgJ2JpbmQnXG4gIHdvdWxkIHNoYWRvdyBuYXRpdmUgYGYuYmluZCgpYCAqL1xuICB0aGlzLmlsbGVnYWxfdHlwZXMgPSBbJ2JpbmQnLCAndG9TdHJpbmcnLCAndmFsdWVPZiddO1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgY29weV9pZl9vcmlnaW5hbCA9IGZ1bmN0aW9uKHgpIHtcbiAgICB2YXIgUjtcbiAgICBpZiAoeFtpc2FfY29weV0pIHtcbiAgICAgIHJldHVybiB4O1xuICAgIH1cbiAgICBSID0gYXNzaWduKHt9LCB4KTtcbiAgICBSW2lzYV9jb3B5XSA9IHRydWU7XG4gICAgcmV0dXJuIFI7XG4gIH07XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB0aGlzLl9zYXRpc2ZpZXNfYWxsX2FzcGVjdHMgPSBmdW5jdGlvbih0eXBlLCAuLi54UCkge1xuICAgIGlmICgodGhpcy5fZ2V0X3Vuc2F0aXNmaWVkX2FzcGVjdCh0eXBlLCAuLi54UCkpID09IG51bGwpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB0aGlzLl9nZXRfdW5zYXRpc2ZpZWRfYXNwZWN0ID0gZnVuY3Rpb24odHlwZSwgLi4ueFApIHtcbiAgICB2YXIgYXNwZWN0LCBmYWN0dWFsX3R5cGUsIHJlZiwgc3BlYywgdGVzdDtcbiAgICAvKiBDaGVjayB3aXRoIGB0eXBlX29mKClgIGlmIHR5cGUgbm90IGluIHNwZWM6ICovXG4gICAgaWYgKChzcGVjID0gdGhpcy5zcGVjc1t0eXBlXSkgPT0gbnVsbCkge1xuICAgICAgaWYgKChmYWN0dWFsX3R5cGUgPSB0aGlzLnR5cGVfb2YoLi4ueFApKSA9PT0gdHlwZSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBgJHtycHIodHlwZSl9IGlzIGEga25vd24gdHlwZWA7XG4gICAgfVxuICAgIHJlZiA9IHNwZWMudGVzdHM7XG4gICAgLyogQ2hlY2sgYWxsIGNvbnN0cmFpbnRzIGluIHNwZWM6ICovXG4gICAgZm9yIChhc3BlY3QgaW4gcmVmKSB7XG4gICAgICB0ZXN0ID0gcmVmW2FzcGVjdF07XG4gICAgICBpZiAoIXRlc3QuYXBwbHkodGhpcywgeFApKSB7XG4gICAgICAgIHJldHVybiBhc3BlY3Q7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9O1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgdGhpcy50eXBlX29mID0gZnVuY3Rpb24oeCkge1xuICAgIHZhciBSLCBhcml0eSwgYywgdGFnbmFtZTtcbiAgICBpZiAoKGFyaXR5ID0gYXJndW1lbnRzLmxlbmd0aCkgIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgXjc3NDZeIGV4cGVjdGVkIDEgYXJndW1lbnQsIGdvdCAke2FyaXR5fWApO1xuICAgIH1cbiAgICBpZiAoeCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuICdudWxsJztcbiAgICB9XG4gICAgaWYgKHggPT09IHZvaWQgMCkge1xuICAgICAgcmV0dXJuICd1bmRlZmluZWQnO1xuICAgIH1cbiAgICBpZiAoKHggPT09IDJlMzA4KSB8fCAoeCA9PT0gLTJlMzA4KSkge1xuICAgICAgcmV0dXJuICdpbmZpbml0eSc7XG4gICAgfVxuICAgIGlmICgoeCA9PT0gdHJ1ZSkgfHwgKHggPT09IGZhbHNlKSkge1xuICAgICAgcmV0dXJuICdib29sZWFuJztcbiAgICB9XG4gICAgaWYgKE51bWJlci5pc05hTih4KSkge1xuICAgICAgcmV0dXJuICduYW4nO1xuICAgIH1cbiAgICBpZiAoQnVmZmVyLmlzQnVmZmVyKHgpKSB7XG4gICAgICByZXR1cm4gJ2J1ZmZlcic7XG4gICAgfVxuICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgaWYgKCgodGFnbmFtZSA9IHhbU3ltYm9sLnRvU3RyaW5nVGFnXSkgIT0gbnVsbCkgJiYgKHR5cGVvZiB0YWduYW1lKSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGlmICh0YWduYW1lID09PSAnQXJyYXkgSXRlcmF0b3InKSB7XG4gICAgICAgIHJldHVybiAnYXJyYXlpdGVyYXRvcic7XG4gICAgICB9XG4gICAgICBpZiAodGFnbmFtZSA9PT0gJ1N0cmluZyBJdGVyYXRvcicpIHtcbiAgICAgICAgcmV0dXJuICdzdHJpbmdpdGVyYXRvcic7XG4gICAgICB9XG4gICAgICBpZiAodGFnbmFtZSA9PT0gJ01hcCBJdGVyYXRvcicpIHtcbiAgICAgICAgcmV0dXJuICdtYXBpdGVyYXRvcic7XG4gICAgICB9XG4gICAgICBpZiAodGFnbmFtZSA9PT0gJ1NldCBJdGVyYXRvcicpIHtcbiAgICAgICAgcmV0dXJuICdzZXRpdGVyYXRvcic7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGFnbmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgIH1cbiAgICBpZiAoKGMgPSB4LmNvbnN0cnVjdG9yKSA9PT0gdm9pZCAwKSB7XG4gICAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgICAgLyogRG9tZW5pYyBEZW5pY29sYSBEZXZpY2UsIHNlZSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMzA1NjA1ODEgKi9cbiAgICAgIHJldHVybiAnbnVsbG9iamVjdCc7XG4gICAgfVxuICAgIGlmICgodHlwZW9mIGMpICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gJ29iamVjdCc7XG4gICAgfVxuICAgIGlmICgoUiA9IGMubmFtZS50b0xvd2VyQ2FzZSgpKSA9PT0gJycpIHtcbiAgICAgIGlmICh4LmNvbnN0cnVjdG9yID09PSBjb25zdHJ1Y3Rvcl9vZl9nZW5lcmF0b3JzKSB7XG4gICAgICAgIHJldHVybiAnZ2VuZXJhdG9yJztcbiAgICAgIH1cbiAgICAgIC8qIE5PVEU6IHRocm93IGVycm9yIHNpbmNlIHRoaXMgc2hvdWxkIG5ldmVyIGhhcHBlbiAqL1xuICAgICAgcmV0dXJuICgoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHgpKS5zbGljZSg4LCAtMSkpLnRvTG93ZXJDYXNlKCk7XG4gICAgfVxuICAgIGlmICgodHlwZW9mIHggPT09ICdvYmplY3QnKSAmJiAoUiA9PT0gJ2Jvb2xlYW4nIHx8IFIgPT09ICdudW1iZXInIHx8IFIgPT09ICdzdHJpbmcnKSkge1xuLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbi8qIE1hcmsgTWlsbGVyIERldmljZSAqLyAgICAgIHJldHVybiAnd3JhcHBlcic7XG4gICAgfVxuICAgIGlmIChSID09PSAnbnVtYmVyJykge1xuICAgICAgcmV0dXJuICdmbG9hdCc7XG4gICAgfVxuICAgIGlmIChSID09PSAncmVnZXhwJykge1xuICAgICAgcmV0dXJuICdyZWdleCc7XG4gICAgfVxuICAgIGlmIChSID09PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuICd0ZXh0JztcbiAgICB9XG4gICAgaWYgKFIgPT09ICdhcnJheScpIHtcbiAgICAgIHJldHVybiAnbGlzdCc7XG4gICAgfVxuICAgIGlmIChSID09PSAnZnVuY3Rpb24nICYmIHgudG9TdHJpbmcoKS5zdGFydHNXaXRoKCdjbGFzcyAnKSkge1xuICAgICAgLyogdGh4IHRvIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yOTA5NDIwOSAqL1xuICAgICAgLyogVEFJTlQgbWF5IHByb2R1Y2UgYW4gYXJiaXRyYXJpbHkgbG9uZyB0aHJvd2F3YXkgc3RyaW5nICovXG4gICAgICByZXR1cm4gJ2NsYXNzJztcbiAgICB9XG4gICAgcmV0dXJuIFI7XG4gIH07XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB0aGlzLnR5cGVzX29mID0gZnVuY3Rpb24oLi4ueFApIHtcbiAgICB2YXIgUiwgYXNwZWN0LCBvaywgcmVmLCByZWYxLCBzcGVjLCB0ZXN0LCB0eXBlO1xuICAgIFIgPSBbXTtcbiAgICByZWYgPSB0aGlzLnNwZWNzO1xuICAgIGZvciAodHlwZSBpbiByZWYpIHtcbiAgICAgIHNwZWMgPSByZWZbdHlwZV07XG4gICAgICBvayA9IHRydWU7XG4gICAgICByZWYxID0gc3BlYy50ZXN0cztcbiAgICAgIGZvciAoYXNwZWN0IGluIHJlZjEpIHtcbiAgICAgICAgdGVzdCA9IHJlZjFbYXNwZWN0XTtcbiAgICAgICAgaWYgKCF0ZXN0LmFwcGx5KHRoaXMsIHhQKSkge1xuICAgICAgICAgIG9rID0gZmFsc2U7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChvaykge1xuICAgICAgICBSLnB1c2godHlwZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBSO1xuICB9O1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgdGhpcy5kZWNsYXJlID0gZnVuY3Rpb24oLi4uUCkvKiB0eXBlLCBzcGVjPywgdGVzdD8gKi8ge1xuICAgIHZhciBhcml0eTtcbiAgICBzd2l0Y2ggKGFyaXR5ID0gUC5sZW5ndGgpIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlY2xhcmVfMSguLi5QKTtcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlY2xhcmVfMiguLi5QKTtcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlY2xhcmVfMyguLi5QKTtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKGDCtTY3NDYgZXhwZWN0ZWQgYmV0d2VlbiAxIGFuZCAzIGFyZ3VtZW50cywgZ290ICR7YXJpdHl9YCk7XG4gIH07XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB0aGlzLl9kZWNsYXJlXzEgPSBmdW5jdGlvbihzcGVjKSB7XG4gICAgdmFyIFQ7XG4gICAgaWYgKChUID0ganNfdHlwZV9vZihzcGVjKSkgIT09ICdvYmplY3QnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYMK1Njg2OSBleHBlY3RlZCBhbiBvYmplY3QgZm9yIHNwZWMsIGdvdCBhICR7VH1gKTtcbiAgICB9XG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICBpZiAoKFQgPSBqc190eXBlX29mKHNwZWMudHlwZSkpICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGDCtTY5OTIgZXhwZWN0ZWQgYSB0ZXh0IGZvciBzcGVjLnR5cGUsIGdvdCBhICR7VH1gKTtcbiAgICB9XG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICBzd2l0Y2ggKChUID0ganNfdHlwZV9vZihzcGVjLnRlc3RzKSkpIHtcbiAgICAgIGNhc2UgJ2Z1bmN0aW9uJzpcbiAgICAgICAgc3BlYy50ZXN0cyA9IHtcbiAgICAgICAgICBtYWluOiBzcGVjLnRlc3RzXG4gICAgICAgIH07XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgbnVsbDtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYMK1NzExNSBleHBlY3RlZCBhbiBvYmplY3QgZm9yIHNwZWMudGVzdHMsIGdvdCBhICR7VH1gKTtcbiAgICB9XG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICByZXR1cm4gdGhpcy5fZGVjbGFyZShzcGVjKTtcbiAgfTtcblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHRoaXMuX2RlY2xhcmVfMiA9IGZ1bmN0aW9uKHR5cGUsIHNwZWNfb3JfdGVzdCkge1xuICAgIHZhciBULCBzcGVjO1xuICAgIHN3aXRjaCAoVCA9IGpzX3R5cGVfb2Yoc3BlY19vcl90ZXN0KSkge1xuICAgICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgICBjYXNlICdmdW5jdGlvbic6XG4gICAgICAgIHJldHVybiB0aGlzLl9kZWNsYXJlXzEoe1xuICAgICAgICAgIHR5cGUsXG4gICAgICAgICAgdGVzdHM6IHtcbiAgICAgICAgICAgIG1haW46IHNwZWNfb3JfdGVzdFxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAgIGNhc2UgJ2FzeW5jZnVuY3Rpb24nOlxuICAgICAgICB0aHJvdyBcIsK1NzIzOCBhc3luY2hyb25vdXMgZnVuY3Rpb25zIG5vdCB5ZXQgc3VwcG9ydGVkXCI7XG4gICAgfVxuICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgaWYgKFQgIT09ICdvYmplY3QnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYMK1NzM2MSBleHBlY3RlZCBhbiBvYmplY3QsIGdvdCBhICR7VH0gZm9yIHNwZWNgKTtcbiAgICB9XG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICBpZiAoKHNwZWNfb3JfdGVzdC50eXBlICE9IG51bGwpICYmICghc3BlY19vcl90ZXN0LnR5cGUgPT09IHR5cGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYMK1NzQ4NCB0eXBlIGRlY2xhcmF0aW9ucyAke3Jwcih0eXBlKX0gYW5kICR7cnByKHNwZWNfb3JfdGVzdC50eXBlKX0gZG8gbm90IG1hdGNoYCk7XG4gICAgfVxuICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgc3BlYyA9IGNvcHlfaWZfb3JpZ2luYWwoc3BlY19vcl90ZXN0KTtcbiAgICBzcGVjLnR5cGUgPSB0eXBlO1xuICAgIHJldHVybiB0aGlzLl9kZWNsYXJlXzEoc3BlYyk7XG4gIH07XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB0aGlzLl9kZWNsYXJlXzMgPSBmdW5jdGlvbih0eXBlLCBzcGVjLCB0ZXN0KSB7XG4gICAgdmFyIFQ7XG4gICAgaWYgKChUID0ganNfdHlwZV9vZihzcGVjKSkgIT09ICdvYmplY3QnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYMK1NzYwNyBleHBlY3RlZCBhbiBvYmplY3QsIGdvdCBhICR7VH0gZm9yIHNwZWNgKTtcbiAgICB9XG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICBpZiAoKFQgPSBqc190eXBlX29mKHRlc3QpKSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGDCtTc3MzAgZXhwZWN0ZWQgYSBmdW5jdGlvbiBmb3IgdGVzdCwgZ290IGEgJHtUfWApO1xuICAgIH1cbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIGlmIChzcGVjLnRlc3RzICE9IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIsK1Nzg1MyBzcGVjIGNhbm5vdCBoYXZlIHRlc3RzIHdoZW4gdGVzdHMgYXJlIHBhc3NlZCBhcyBhcmd1bWVudFwiKTtcbiAgICB9XG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICBzcGVjID0gY29weV9pZl9vcmlnaW5hbChzcGVjKTtcbiAgICBzcGVjLnRlc3RzID0ge1xuICAgICAgbWFpbjogdGVzdFxuICAgIH07XG4gICAgcmV0dXJuIHRoaXMuX2RlY2xhcmVfMih0eXBlLCBzcGVjKTtcbiAgfTtcblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHRoaXMuX2RlY2xhcmUgPSBmdW5jdGlvbihzcGVjKSB7XG4gICAgdmFyIHR5cGU7XG4gICAgc3BlYyA9IGNvcHlfaWZfb3JpZ2luYWwoc3BlYyk7XG4gICAgZGVsZXRlIHNwZWNbaXNhX2NvcHldO1xuICAgICh7dHlwZX0gPSBzcGVjKTtcbiAgICBzcGVjLnR5cGUgPSB0eXBlO1xuICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgaWYgKGluZGV4T2YuY2FsbCh0aGlzLmlsbGVnYWxfdHlwZXMsIHR5cGUpID49IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgwrU3OTc2ICR7cnByKHR5cGUpfSBpcyBub3QgYSBsZWdhbCB0eXBlIG5hbWVgKTtcbiAgICB9XG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICBpZiAodGhpcy5zcGVjc1t0eXBlXSAhPSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYMK1ODA5OSB0eXBlICR7cnByKHR5cGUpfSBhbHJlYWR5IGRlY2xhcmVkYCk7XG4gICAgfVxuICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgdGhpcy5zcGVjc1t0eXBlXSA9IHNwZWM7XG4gICAgdGhpcy5pc2FbdHlwZV0gPSAoLi4uUCkgPT4ge1xuICAgICAgcmV0dXJuIHRoaXMuaXNhKHR5cGUsIC4uLlApO1xuICAgIH07XG4gICAgLy8gQHZhbGlkYXRlWyB0eXBlIF0gICAgPSAoIFAuLi4gKSA9PiBAdmFsaWRhdGUgdHlwZSwgUC4uLlxuICAgIHNwZWMuc2l6ZSA9IHRoaXMuX3NpemVvZl9tZXRob2RfZnJvbV9zcGVjKHR5cGUsIHNwZWMpO1xuICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgcmV0dXJuIG51bGw7XG4gIH07XG5cbn0pLmNhbGwodGhpcyk7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRlY2xhcmluZy5qcy5tYXAiLCIoZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgdmFyIExPVVBFLCBpbnNwZWN0LCBycHIsXG4gICAgaW5kZXhPZiA9IFtdLmluZGV4T2Y7XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAoe2luc3BlY3R9ID0gcmVxdWlyZSgndXRpbCcpKTtcblxuICB0aGlzLmFzc2lnbiA9IE9iamVjdC5hc3NpZ247XG5cbiAgLy8gQGpyICAgICAgICAgICA9IEpTT04uc3RyaW5naWZ5XG4gIExPVVBFID0gcmVxdWlyZSgnLi4vZGVwcy9sb3VwZS5qcycpO1xuXG4gIHRoaXMucnByID0gcnByID0gKHgpID0+IHtcbiAgICByZXR1cm4gTE9VUEUuaW5zcGVjdCh4LCB7XG4gICAgICBjdXN0b21JbnNwZWN0OiBmYWxzZVxuICAgIH0pO1xuICB9O1xuXG4gIHRoaXMueHJwciA9IGZ1bmN0aW9uKHgpIHtcbiAgICByZXR1cm4gKHJwcih4KSkuc2xpY2UoMCwgMTAyNSk7XG4gIH07XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBUWVBFX09GIEZMQVZPUlNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB0aGlzLmRvbWVuaWNfZGVuaWNvbGFfZGV2aWNlID0gKHgpID0+IHtcbiAgICB2YXIgcmVmLCByZWYxO1xuICAgIHJldHVybiAocmVmID0geCAhPSBudWxsID8gKHJlZjEgPSB4LmNvbnN0cnVjdG9yKSAhPSBudWxsID8gcmVmMS5uYW1lIDogdm9pZCAwIDogdm9pZCAwKSAhPSBudWxsID8gcmVmIDogJy4vLic7XG4gIH07XG5cbiAgdGhpcy5tYXJrX21pbGxlcl9kZXZpY2UgPSAoeCkgPT4ge1xuICAgIHJldHVybiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHgpKS5zbGljZSg4LCAtMSk7XG4gIH07XG5cbiAgdGhpcy5tYXJrX21pbGxlcl9kZXZpY2VfMiA9ICh4KSA9PiB7XG4gICAgcmV0dXJuICgoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHgpKS5zbGljZSg4LCAtMSkpLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvXFxzKy9nLCAnJyk7XG4gIH07XG5cbiAgdGhpcy5qc190eXBlX29mID0gKHgpID0+IHtcbiAgICByZXR1cm4gKChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeCkpLnNsaWNlKDgsIC0xKSkudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9cXHMrL2csICcnKTtcbiAgfTtcblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB0aGlzLmdldF9ycHJzX29mX3RwcnMgPSBmdW5jdGlvbih0cHJzKSB7XG4gICAgLyogYHRwcnM6IHRlc3QgcGFyYW1ldGVycywgaS5lLiBhZGRpdGlvbmFsIGFyZ3VtZW50cyB0byB0eXBlIHRlc3RlciwgYXMgaW4gYG11bHRpcGxlX29mIHgsIDRgICovXG4gICAgdmFyIHJwcl9vZl90cHJzLCBzcnByX29mX3RwcnM7XG4gICAgcnByX29mX3RwcnMgPSAoZnVuY3Rpb24oKSB7XG4gICAgICBzd2l0Y2ggKHRwcnMubGVuZ3RoKSB7XG4gICAgICAgIGNhc2UgMDpcbiAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICByZXR1cm4gYCR7cnByKHRwcnNbMF0pfWA7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgcmV0dXJuIGAke3Jwcih0cHJzKX1gO1xuICAgICAgfVxuICAgIH0pKCk7XG4gICAgc3Jwcl9vZl90cHJzID0gKGZ1bmN0aW9uKCkge1xuICAgICAgc3dpdGNoIChycHJfb2ZfdHBycy5sZW5ndGgpIHtcbiAgICAgICAgY2FzZSAwOlxuICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICByZXR1cm4gJyAnICsgcnByX29mX3RwcnM7XG4gICAgICB9XG4gICAgfSkoKTtcbiAgICByZXR1cm4ge3Jwcl9vZl90cHJzLCBzcnByX29mX3RwcnN9O1xuICB9O1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgdGhpcy5pbnRlcnNlY3Rpb25fb2YgPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgdmFyIHg7XG4gICAgYSA9IFsuLi5hXS5zb3J0KCk7XG4gICAgYiA9IFsuLi5iXS5zb3J0KCk7XG4gICAgcmV0dXJuICgoZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgaSwgbGVuLCByZXN1bHRzO1xuICAgICAgcmVzdWx0cyA9IFtdO1xuICAgICAgZm9yIChpID0gMCwgbGVuID0gYS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICB4ID0gYVtpXTtcbiAgICAgICAgaWYgKGluZGV4T2YuY2FsbChiLCB4KSA+PSAwKSB7XG4gICAgICAgICAgcmVzdWx0cy5wdXNoKHgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0cztcbiAgICB9KSgpKS5zb3J0KCk7XG4gIH07XG5cbn0pLmNhbGwodGhpcyk7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWhlbHBlcnMuanMubWFwIiwiKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG4gIHZhciBIRUxQRVJTLCBNdWx0aW1peCwgYXNzaWduLCBjYXN0LCBjaGVjaywgZGVjbGFyYXRpb25zLCBnZXRfcnByc19vZl90cHJzLCBpc2EsIGlzYV9saXN0X29mLCBpc2Ffb2JqZWN0X29mLCBpc2Ffb3B0aW9uYWwsIGprX2VxdWFscywganIsIGpzX3R5cGVfb2YsIHJwciwgc2FkLCB2YWxpZGF0ZSwgdmFsaWRhdGVfbGlzdF9vZiwgdmFsaWRhdGVfb2JqZWN0X29mLCB2YWxpZGF0ZV9vcHRpb25hbCwgeHJwcjtcblxuICAvLyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4gIE11bHRpbWl4ID0gcmVxdWlyZSgnbXVsdGltaXgnKTtcblxuICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gIEhFTFBFUlMgPSByZXF1aXJlKCcuL2hlbHBlcnMnKTtcblxuICAoe2Fzc2lnbiwganIsIHJwciwgeHJwciwgZ2V0X3JwcnNfb2ZfdHBycywganNfdHlwZV9vZn0gPSBIRUxQRVJTKTtcblxuICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gIGRlY2xhcmF0aW9ucyA9IHJlcXVpcmUoJy4vZGVjbGFyYXRpb25zJyk7XG5cbiAgc2FkID0gKHJlcXVpcmUoJy4vY2hlY2tzJykpLnNhZDtcblxuICBqa19lcXVhbHMgPSByZXF1aXJlKCcuLi9kZXBzL2prcm9zby1lcXVhbHMnKTtcblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGlzYSA9IGZ1bmN0aW9uKHR5cGUsIC4uLnhQKSB7XG4gICAgcmV0dXJuIHRoaXMuX3NhdGlzZmllc19hbGxfYXNwZWN0cyh0eXBlLCAuLi54UCk7XG4gIH07XG5cbiAgaXNhX2xpc3Rfb2YgPSBmdW5jdGlvbih0eXBlLCAuLi54UCkge1xuICAgIHJldHVybiB0aGlzLmlzYS5saXN0X29mKHR5cGUsIC4uLnhQKTtcbiAgfTtcblxuICBpc2Ffb2JqZWN0X29mID0gZnVuY3Rpb24odHlwZSwgLi4ueFApIHtcbiAgICByZXR1cm4gdGhpcy5pc2Eub2JqZWN0X29mKHR5cGUsIC4uLnhQKTtcbiAgfTtcblxuICB2YWxpZGF0ZV9saXN0X29mID0gZnVuY3Rpb24odHlwZSwgLi4ueFApIHtcbiAgICByZXR1cm4gdGhpcy52YWxpZGF0ZS5saXN0X29mKHR5cGUsIC4uLnhQKTtcbiAgfTtcblxuICB2YWxpZGF0ZV9vYmplY3Rfb2YgPSBmdW5jdGlvbih0eXBlLCAuLi54UCkge1xuICAgIHJldHVybiB0aGlzLnZhbGlkYXRlLm9iamVjdF9vZih0eXBlLCAuLi54UCk7XG4gIH07XG5cbiAgaXNhX29wdGlvbmFsID0gZnVuY3Rpb24odHlwZSwgLi4ueFApIHtcbiAgICByZXR1cm4gKHhQWzBdID09IG51bGwpIHx8IHRoaXMuX3NhdGlzZmllc19hbGxfYXNwZWN0cyh0eXBlLCAuLi54UCk7XG4gIH07XG5cbiAgdmFsaWRhdGVfb3B0aW9uYWwgPSBmdW5jdGlvbih0eXBlLCAuLi54UCkge1xuICAgIHJldHVybiAoeFBbMF0gPT0gbnVsbCkgfHwgdGhpcy52YWxpZGF0ZSh0eXBlLCAuLi54UCk7XG4gIH07XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBjYXN0ID0gZnVuY3Rpb24odHlwZV9hLCB0eXBlX2IsIHgsIC4uLnhQKSB7XG4gICAgdmFyIGNhc3RzLCBjb252ZXJ0ZXI7XG4gICAgdGhpcy52YWxpZGF0ZSh0eXBlX2EsIHgsIC4uLnhQKTtcbiAgICBpZiAodHlwZV9hID09PSB0eXBlX2IpIHtcbiAgICAgIHJldHVybiB4O1xuICAgIH1cbiAgICBpZiAodGhpcy5pc2EodHlwZV9iLCB4LCAuLi54UCkpIHtcbiAgICAgIHJldHVybiB4O1xuICAgIH1cbiAgICBpZiAoKGNhc3RzID0gdGhpcy5zcGVjc1t0eXBlX2FdLmNhc3RzKSAhPSBudWxsKSB7XG4gICAgICBpZiAoKGNvbnZlcnRlciA9IGNhc3RzW3R5cGVfYl0pICE9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGNvbnZlcnRlci5jYWxsKHRoaXMsIHgsIC4uLnhQKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHR5cGVfYiA9PT0gJ3RleHQnLyogVEFJTlQgdXNlIGJldHRlciBtZXRob2QgbGlrZSB1dGlsLmluc3BlY3QgKi8pIHtcbiAgICAgIHJldHVybiBgJHt4fWA7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgXmludGVydHlwZS9jYXN0QDEyMzReIHVuYWJsZSB0byBjYXN0IGEgJHt0eXBlX2F9IGFzICR7dHlwZV9ifWApO1xuICB9O1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgY2hlY2sgPSBmdW5jdGlvbih0eXBlLCB4LCAuLi54UCkge1xuICAgIHZhciBlcnJvcjtcbiAgICBpZiAodGhpcy5zcGVjc1t0eXBlXSAhPSBudWxsKSB7XG4gICAgICBpZiAodGhpcy5pc2EodHlwZSwgeCwgLi4ueFApKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHNhZDtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKChjaGVjayA9IHRoaXMuY2hlY2tzW3R5cGVdKSA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYF5pbnRlcnR5cGUvY2hlY2tAMTM0NV4gdW5rbm93biB0eXBlIG9yIGNoZWNrICR7cnByKHR5cGUpfWApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGNoZWNrLmNhbGwodGhpcywgeCwgLi4ueFApO1xuICAgIH0gY2F0Y2ggKGVycm9yMSkge1xuICAgICAgZXJyb3IgPSBlcnJvcjE7XG4gICAgICByZXR1cm4gZXJyb3I7XG4gICAgfVxuICB9O1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgdmFsaWRhdGUgPSBmdW5jdGlvbih0eXBlLCAuLi54UCkge1xuICAgIHZhciBQLCBhc3BlY3QsIG1lc3NhZ2UsIHJwcl9vZl90cHJzLCBzcnByX29mX3RwcnMsIHg7XG4gICAgaWYgKChhc3BlY3QgPSB0aGlzLl9nZXRfdW5zYXRpc2ZpZWRfYXNwZWN0KHR5cGUsIC4uLnhQKSkgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIFt4LCAuLi5QXSA9IHhQO1xuICAgICh7cnByX29mX3RwcnMsIHNycHJfb2ZfdHByc30gPSBnZXRfcnByc19vZl90cHJzKFApKTtcbiAgICBtZXNzYWdlID0gYXNwZWN0ID09PSAnbWFpbicgPyBgXmludGVydHlwZS92YWxpZGF0ZUAxNDU2XiBub3QgYSB2YWxpZCAke3R5cGV9OiAke3hycHIoeCl9JHtzcnByX29mX3RwcnN9YCA6IGBeaW50ZXJ0eXBlL3ZhbGlkYXRlQDE1NjdeIG5vdCBhIHZhbGlkICR7dHlwZX0gKHZpb2xhdGVzICR7cnByKGFzcGVjdCl9KTogJHt4cnByKHgpfSR7c3Jwcl9vZl90cHJzfWA7XG4gICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UpO1xuICB9O1xuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgdGhpcy5JbnRlcnR5cGUgPSAoZnVuY3Rpb24oKSB7XG4gICAgY2xhc3MgSW50ZXJ0eXBlIGV4dGVuZHMgTXVsdGltaXgge1xuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIGNvbnN0cnVjdG9yKHRhcmdldCA9IG51bGwpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgICAgIC8qIFRBSU5UIGJ1ZyBpbiBNdWx0aU1peCwgc2hvdWxkIGJlIHBvc3NpYmxlIHRvIGRlY2xhcmUgbWV0aG9kcyBpbiBjbGFzcywgbm90IHRoZSBjb25zdHJ1Y3RvcixcbiAgICAgICAgICAgYW5kIHN0aWxsIGdldCBhIGJvdW5kIHZlcnNpb24gd2l0aCBgZXhwb3J0KClgOyBkZWNsYXJpbmcgdGhlbSBoZXJlIEZUVEIgKi9cbiAgICAgICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgICAgIHRoaXMuc2FkID0gc2FkO1xuICAgICAgICB0aGlzLnNwZWNzID0ge307XG4gICAgICAgIHRoaXMuY2hlY2tzID0ge307XG4gICAgICAgIHRoaXMuaXNhID0gTXVsdGltaXguZ2V0X2tleW1ldGhvZF9wcm94eSh0aGlzLCBpc2EpO1xuICAgICAgICB0aGlzLmlzYV9vcHRpb25hbCA9IE11bHRpbWl4LmdldF9rZXltZXRob2RfcHJveHkodGhpcywgaXNhX29wdGlvbmFsKTtcbiAgICAgICAgdGhpcy5pc2FfbGlzdF9vZiA9IE11bHRpbWl4LmdldF9rZXltZXRob2RfcHJveHkodGhpcywgaXNhX2xpc3Rfb2YpO1xuICAgICAgICB0aGlzLmlzYV9vYmplY3Rfb2YgPSBNdWx0aW1peC5nZXRfa2V5bWV0aG9kX3Byb3h5KHRoaXMsIGlzYV9vYmplY3Rfb2YpO1xuICAgICAgICB0aGlzLmNhc3QgPSBNdWx0aW1peC5nZXRfa2V5bWV0aG9kX3Byb3h5KHRoaXMsIGNhc3QpO1xuICAgICAgICB0aGlzLnZhbGlkYXRlID0gTXVsdGltaXguZ2V0X2tleW1ldGhvZF9wcm94eSh0aGlzLCB2YWxpZGF0ZSk7XG4gICAgICAgIHRoaXMudmFsaWRhdGVfb3B0aW9uYWwgPSBNdWx0aW1peC5nZXRfa2V5bWV0aG9kX3Byb3h5KHRoaXMsIHZhbGlkYXRlX29wdGlvbmFsKTtcbiAgICAgICAgdGhpcy52YWxpZGF0ZV9saXN0X29mID0gTXVsdGltaXguZ2V0X2tleW1ldGhvZF9wcm94eSh0aGlzLCB2YWxpZGF0ZV9saXN0X29mKTtcbiAgICAgICAgdGhpcy52YWxpZGF0ZV9vYmplY3Rfb2YgPSBNdWx0aW1peC5nZXRfa2V5bWV0aG9kX3Byb3h5KHRoaXMsIHZhbGlkYXRlX29iamVjdF9vZik7XG4gICAgICAgIHRoaXMuY2hlY2sgPSBNdWx0aW1peC5nZXRfa2V5bWV0aG9kX3Byb3h5KHRoaXMsIGNoZWNrKTtcbiAgICAgICAgdGhpcy5ub3dhaXQgPSBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgdGhpcy52YWxpZGF0ZS5pbW1lZGlhdGUoeCk7XG4gICAgICAgICAgcmV0dXJuIHg7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuX2hlbHBlcnMgPSBIRUxQRVJTO1xuICAgICAgICBkZWNsYXJhdGlvbnMuZGVjbGFyZV90eXBlcy5hcHBseSh0aGlzKTtcbiAgICAgICAgZGVjbGFyYXRpb25zLmRlY2xhcmVfY2hlY2tzLmFwcGx5KHRoaXMpO1xuICAgICAgICBpZiAodGFyZ2V0ICE9IG51bGwpIHtcbiAgICAgICAgICB0aGlzLmV4cG9ydCh0YXJnZXQpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBlcXVhbHMoYSwgLi4uUCkge1xuICAgICAgICB2YXIgYXJpdHksIGIsIGksIGxlbiwgdHlwZV9vZl9hO1xuICAgICAgICBpZiAoKGFyaXR5ID0gYXJndW1lbnRzLmxlbmd0aCkgPCAyKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBeaW50ZXJ0eXBlL2VxdWFsc0AzNDg5XiBleHBlY3RlZCBhdCBsZWFzdCAyIGFyZ3VtZW50cywgZ290ICR7YXJpdHl9YCk7XG4gICAgICAgIH1cbiAgICAgICAgdHlwZV9vZl9hID0gdGhpcy50eXBlX29mKGEpO1xuICAgICAgICBmb3IgKGkgPSAwLCBsZW4gPSBQLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgYiA9IFBbaV07XG4gICAgICAgICAgaWYgKHR5cGVfb2ZfYSAhPT0gdGhpcy50eXBlX29mKGIpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgodHlwZV9vZl9hID09PSAnc2V0JyB8fCB0eXBlX29mX2EgPT09ICdtYXAnKSAmJiB0aGlzLmVxdWFscyhbLi4uYV0sIFsuLi5iXSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWprX2VxdWFscyhhLCBiKSkge1xuICAgICAgICAgICAgLyogVEFJTlQgdGhpcyBjYWxsIGludm9sdmVzIGl0cyBvd24gdHlwZWNoZWNraW5nIGNvZGUgYW5kIHRodXMgbWF5IG15c3RlcmlvdXNseSBmYWlsICovXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgfTtcblxuICAgIC8vIEBleHRlbmQgICBvYmplY3Rfd2l0aF9jbGFzc19wcm9wZXJ0aWVzXG4gICAgSW50ZXJ0eXBlLmluY2x1ZGUocmVxdWlyZSgnLi9zaXppbmcnKSk7XG5cbiAgICBJbnRlcnR5cGUuaW5jbHVkZShyZXF1aXJlKCcuL2RlY2xhcmluZycpKTtcblxuICAgIEludGVydHlwZS5pbmNsdWRlKHJlcXVpcmUoJy4vY2hlY2tzJykpO1xuXG4gICAgcmV0dXJuIEludGVydHlwZTtcblxuICB9KS5jYWxsKHRoaXMpO1xuXG59KS5jYWxsKHRoaXMpO1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1tYWluLmpzLm1hcCIsIihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICB2YXIgYXNzaWduLCBqciwganNfdHlwZV9vZiwgeHJwcjtcblxuICAvLyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4gICh7YXNzaWduLCBqciwgeHJwciwganNfdHlwZV9vZn0gPSByZXF1aXJlKCcuL2hlbHBlcnMnKSk7XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBPQkpFQ1QgU0laRVNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB0aGlzLl9zaXplb2ZfbWV0aG9kX2Zyb21fc3BlYyA9IGZ1bmN0aW9uKHR5cGUsIHNwZWMpIHtcbiAgICByZXR1cm4gKChzKSA9PiB7XG4gICAgICB2YXIgVDtcbiAgICAgIGlmIChzID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICBzd2l0Y2ggKFQgPSBqc190eXBlX29mKHMpKSB7XG4gICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHJldHVybiB4W3NdO1xuICAgICAgICAgIH07XG4gICAgICAgIGNhc2UgJ2Z1bmN0aW9uJzpcbiAgICAgICAgICByZXR1cm4gcy8qIFRBSU5UIGRpc2FsbG93cyBhc3luYyBmdW50aW9ucyAqLztcbiAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gcy8qIFRBSU5UIGFsbG93cyBOYU4sIEluZmluaXR5ICovO1xuICAgICAgICAgIH07XG4gICAgICB9XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYMK1MzA5ODggZXhwZWN0ZWQgbnVsbCwgYSB0ZXh0IG9yIGEgZnVuY3Rpb24gZm9yIHNpemUgb2YgJHt0eXBlfSwgZ290IGEgJHtUfWApO1xuICAgIH0pKHNwZWMuc2l6ZSk7XG4gIH07XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB0aGlzLnNpemVfb2YgPSBmdW5jdGlvbih4LCAuLi5QKSB7XG4gICAgLyogVGhlIGBzaXplX29mKClgIG1ldGhvZCB1c2VzIGEgcGVyLXR5cGUgY29uZmlndXJhYmxlIG1ldGhvZG9sb2d5IHRvIHJldHVybiB0aGUgc2l6ZSBvZiBhIGdpdmVuIHZhbHVlO1xuICAgICBzdWNoIG1ldGhvZG9sb2d5IG1heSBwZXJtaXQgb3IgbmVjZXNzaXRhdGUgcGFzc2luZyBhZGRpdGlvbmFsIGFyZ3VtZW50cyAoc3VjaCBhcyBgc2l6ZV9vZiB0ZXh0YCwgd2hpY2hcbiAgICAgY29tZXMgaW4gc2V2ZXJhbCBmbGF2b3JzIGRlcGVuZGluZyBvbiB3aGV0aGVyIGJ5dGVzIG9yIGNvZGVwb2ludHMgYXJlIHRvIGJlIGNvdW50ZWQpLiBBcyBzdWNoLCBpdCBpcyBhXG4gICAgIG1vZGVsIGZvciBob3cgdG8gaW1wbGVtZW50IEdvLWxpa2UgbWV0aG9kIGRpc3BhdGNoaW5nLiAqL1xuICAgIHZhciBnZXR0ZXIsIHJlZiwgdHlwZTtcbiAgICB0eXBlID0gdGhpcy50eXBlX29mKHgpO1xuICAgIGlmICghKHRoaXMuaXNhLmZ1bmN0aW9uKChnZXR0ZXIgPSAocmVmID0gdGhpcy5zcGVjc1t0eXBlXSkgIT0gbnVsbCA/IHJlZi5zaXplIDogdm9pZCAwKSkpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYMK1ODg3OTMgdW5hYmxlIHRvIGdldCBzaXplIG9mIGEgJHt0eXBlfWApO1xuICAgIH1cbiAgICByZXR1cm4gZ2V0dGVyKHgsIC4uLlApO1xuICB9O1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLyogVEFJTlQgZmF1bHR5IGltcGxlbWVudGF0aW9uOlxuICAgKiBkb2VzIG5vdCB1c2Ugc2l6ZV9vZiBidXQgbGVuZ3RoXG4gICAqIGRvZXMgbm90IGFjY2VwdCBhZGRpdGlvbmFsIGFyZ3VtZW50cyBhcyBuZWVkZWQgZm9yIHRleHRzXG4gICAqIHJpc2tzIHRvIGJyZWFrIGNvZGVwb2ludHMgYXBhcnRcbiAgICAqL1xuICB0aGlzLmZpcnN0X29mID0gZnVuY3Rpb24oY29sbGVjdGlvbikge1xuICAgIHJldHVybiBjb2xsZWN0aW9uWzBdO1xuICB9O1xuXG4gIHRoaXMubGFzdF9vZiA9IGZ1bmN0aW9uKGNvbGxlY3Rpb24pIHtcbiAgICByZXR1cm4gY29sbGVjdGlvbltjb2xsZWN0aW9uLmxlbmd0aCAtIDFdO1xuICB9O1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgdGhpcy5hcml0eV9vZiA9IGZ1bmN0aW9uKHgpIHtcbiAgICB2YXIgdHlwZTtcbiAgICBpZiAoKHR5cGUgPSB0aGlzLnN1cGVydHlwZV9vZih4KSkgIT09ICdjYWxsYWJsZScpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgwrU4ODczMyBleHBlY3RlZCBhIGNhbGxhYmxlLCBnb3QgYSAke3R5cGV9YCk7XG4gICAgfVxuICAgIHJldHVybiB4Lmxlbmd0aDtcbiAgfTtcblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHRoaXMuaGFzX3NpemUgPSBmdW5jdGlvbih4KSB7XG4gICAgdmFyIHJlZjtcbiAgICByZXR1cm4gdGhpcy5pc2EuZnVuY3Rpb24oKHJlZiA9IHRoaXMuc3BlY3NbdGhpcy50eXBlX29mKHgpXSkgIT0gbnVsbCA/IHJlZi5zaXplIDogdm9pZCAwKTtcbiAgfTtcblxufSkuY2FsbCh0aGlzKTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9c2l6aW5nLmpzLm1hcCIsIihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIE9CSkVDVCBQUk9QRVJUWSBDQVRBTE9HVUlOR1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHRoaXMua2V5c19vZiA9IGZ1bmN0aW9uKC4uLlApIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZXNfb2YodGhpcy53YWxrX2tleXNfb2YoLi4uUCkpO1xuICB9O1xuXG4gIHRoaXMuYWxsX2tleXNfb2YgPSBmdW5jdGlvbiguLi5QKSB7XG4gICAgcmV0dXJuIHRoaXMudmFsdWVzX29mKHRoaXMud2Fsa19hbGxfa2V5c19vZiguLi5QKSk7XG4gIH07XG5cbiAgdGhpcy5hbGxfb3duX2tleXNfb2YgPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKHggIT0gbnVsbCkge1xuICAgICAgcmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICB9O1xuXG4gIHRoaXMud2Fsa19hbGxfb3duX2tleXNfb2YgPSBmdW5jdGlvbiooeCkge1xuICAgIHZhciBpLCBrLCBsZW4sIHJlZiwgcmVzdWx0cztcbiAgICByZWYgPSB0aGlzLmFsbF9vd25fa2V5c19vZih4KTtcbiAgICByZXN1bHRzID0gW107XG4gICAgZm9yIChpID0gMCwgbGVuID0gcmVmLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBrID0gcmVmW2ldO1xuICAgICAgcmVzdWx0cy5wdXNoKCh5aWVsZCBrKSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgdGhpcy53YWxrX2tleXNfb2YgPSBmdW5jdGlvbiooeCwgc2V0dGluZ3MpIHtcbiAgICB2YXIgZGVmYXVsdHMsIGssIHJlc3VsdHM7XG4gICAgZGVmYXVsdHMgPSB7XG4gICAgICBza2lwX3VuZGVmaW5lZDogdHJ1ZVxuICAgIH07XG4gICAgc2V0dGluZ3MgPSB7Li4uZGVmYXVsdHMsIC4uLnNldHRpbmdzfTtcbiAgICByZXN1bHRzID0gW107XG4gICAgZm9yIChrIGluIHgpIHtcbiAgICAgIGlmICgoeFtrXSA9PT0gdm9pZCAwKSAmJiBzZXR0aW5ncy5za2lwX3VuZGVmaW5lZCkge1xuICAgICAgICAvKiBUQUlOVCBzaG91bGQgdXNlIHByb3BlcnR5IGRlc2NyaXB0b3JzIHRvIGF2b2lkIHBvc3NpYmxlIHNpZGUgZWZmZWN0cyAqL1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHJlc3VsdHMucHVzaCgoeWllbGQgaykpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHRoaXMud2Fsa19hbGxfa2V5c19vZiA9IGZ1bmN0aW9uKHgsIHNldHRpbmdzKSB7XG4gICAgdmFyIGRlZmF1bHRzO1xuICAgIGRlZmF1bHRzID0ge1xuICAgICAgc2tpcF9vYmplY3Q6IHRydWUsXG4gICAgICBza2lwX3VuZGVmaW5lZDogdHJ1ZVxuICAgIH07XG4gICAgc2V0dGluZ3MgPSB7Li4uZGVmYXVsdHMsIC4uLnNldHRpbmdzfTtcbiAgICByZXR1cm4gdGhpcy5fd2Fsa19hbGxfa2V5c19vZih4LCBuZXcgU2V0KCksIHNldHRpbmdzKTtcbiAgfTtcblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHRoaXMuX3dhbGtfYWxsX2tleXNfb2YgPSBmdW5jdGlvbiooeCwgc2Vlbiwgc2V0dGluZ3MpIHtcbiAgICAvKiBUQUlOVCBzaG91bGQgdXNlIHByb3BlcnR5IGRlc2NyaXB0b3JzIHRvIGF2b2lkIHBvc3NpYmxlIHNpZGUgZWZmZWN0cyAqL1xuICAgIC8qIFRBSU5UIHRyeWluZyB0byBhY2Nlc3MgYGFyZ3VtZW50c2AgY2F1c2VzIGVycm9yICovXG4gICAgdmFyIGVycm9yLCBrLCBwcm90bywgcmVmLCB2YWx1ZTtcbiAgICBpZiAoKCFzZXR0aW5ncy5za2lwX29iamVjdCkgJiYgeCA9PT0gT2JqZWN0LnByb3RvdHlwZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZWYgPSB0aGlzLndhbGtfYWxsX293bl9rZXlzX29mKHgpO1xuICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgZm9yIChrIG9mIHJlZikge1xuICAgICAgaWYgKHNlZW4uaGFzKGspKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgc2Vlbi5hZGQoayk7XG4gICAgICB0cnkge1xuICAgICAgICB2YWx1ZSA9IHhba107XG4gICAgICB9IGNhdGNoIChlcnJvcjEpIHtcbiAgICAgICAgZXJyb3IgPSBlcnJvcjE7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKCh2YWx1ZSA9PT0gdm9pZCAwKSAmJiBzZXR0aW5ncy5za2lwX3VuZGVmaW5lZCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChzZXR0aW5ncy5zeW1ib2wgIT0gbnVsbCkge1xuICAgICAgICBpZiAodmFsdWUgPT0gbnVsbCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdmFsdWVbc2V0dGluZ3Muc3ltYm9sXSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB5aWVsZCBrO1xuICAgIH1cbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIGlmICgocHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoeCkpICE9IG51bGwpIHtcbiAgICAgIHJldHVybiAoeWllbGQqIHRoaXMuX3dhbGtfYWxsX2tleXNfb2YocHJvdG8sIHNlZW4sIHNldHRpbmdzKSk7XG4gICAgfVxuICB9O1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLyogVHVybiBpdGVyYXRvcnMgaW50byBsaXN0cywgY29weSBsaXN0czogKi9cbiAgdGhpcy52YWx1ZXNfb2YgPSBmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuIFsuLi54XTtcbiAgfTtcblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHRoaXMuaGFzX2tleXMgPSBmdW5jdGlvbih4LCAuLi5QKSB7XG4gICAgdmFyIGksIGtleSwgbGVuLCByZWY7XG4gICAgaWYgKHggPT0gbnVsbCkge1xuICAgICAgLyogT2JzZXJ2ZSB0aGF0IGBoYXNfa2V5cygpYCBhbHdheXMgY29uc2lkZXJzIGB1bmRlZmluZWRgIGFzICdub3Qgc2V0JyAqL1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbi8qIFRBSU5UIG9yIHRocm93IGVycm9yICovICAgIHJlZiA9IFAuZmxhdCgyZTMwOCk7XG4gICAgZm9yIChpID0gMCwgbGVuID0gcmVmLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBrZXkgPSByZWZbaV07XG4gICAgICBpZiAoeFtrZXldID09PSB2b2lkIDApIHtcbiAgICAgICAgLyogVEFJTlQgc2hvdWxkIHVzZSBwcm9wZXJ0eSBkZXNjcmlwdG9ycyB0byBhdm9pZCBwb3NzaWJsZSBzaWRlIGVmZmVjdHMgKi9cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHRoaXMuaGFzX2tleSA9IGZ1bmN0aW9uKHgsIGtleSkge1xuICAgIHJldHVybiB0aGlzLmhhc19rZXlzKHgsIGtleSk7XG4gIH07XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB0aGlzLmhhc19vbmx5X2tleXMgPSBmdW5jdGlvbih4LCAuLi5QKSB7XG4gICAgdmFyIGtleXMsIHByb2JlcztcbiAgICBwcm9iZXMgPSAoUC5mbGF0KDJlMzA4KSkuc29ydCgpO1xuICAgIGtleXMgPSAodGhpcy52YWx1ZXNfb2YodGhpcy5rZXlzX29mKHgpKSkuc29ydCgpO1xuICAgIHJldHVybiBwcm9iZXMubGVuZ3RoID0ga2V5cy5sZW5ndGggJiYgcHJvYmVzLmV2ZXJ5KGZ1bmN0aW9uKHgsIGlkeCkge1xuICAgICAgcmV0dXJuIHggPT09IGtleXNbaWR4XTtcbiAgICB9KTtcbiAgfTtcblxufSkuY2FsbCh0aGlzKTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Y2F0YWxvZ3VpbmcuanMubWFwIiwiKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG4gIHZhciBNdWx0aW1peCwgbW9kdWxlX2tleXdvcmRzLFxuICAgIGluZGV4T2YgPSBbXS5pbmRleE9mO1xuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gTU9EVUxFIE1FVEFDTEFTUyBwcm92aWRlcyBzdGF0aWMgbWV0aG9kcyBgQGV4dGVuZCgpYCwgYEBpbmNsdWRlKClgXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLyogVGhlIGxpdHRsZSBkYW5jZSBhcm91bmQgdGhlIG1vZHVsZV9rZXl3b3JkcyB2YXJpYWJsZSBpcyB0byBlbnN1cmUgd2UgaGF2ZSBjYWxsYmFjayBzdXBwb3J0IHdoZW4gbWl4aW5zXG4gIGV4dGVuZCBhIGNsYXNzLiBTZWUgaHR0cHM6Ly9hcmN0dXJvLmdpdGh1Yi5pby9saWJyYXJ5L2NvZmZlZXNjcmlwdC8wM19jbGFzc2VzLmh0bWwgKi9cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBtb2R1bGVfa2V5d29yZHMgPSBbJ2V4dGVuZGVkJywgJ2luY2x1ZGVkJ107XG5cbiAgTXVsdGltaXggPSAoZnVuY3Rpb24oKSB7XG4gICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIGNsYXNzIE11bHRpbWl4IHtcbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBzdGF0aWMgZXh0ZW5kKG9iamVjdCwgc2V0dGluZ3MgPSBudWxsKSB7XG4gICAgICAgIHZhciBrZXksIHJlZiwgdmFsdWU7XG4gICAgICAgIHNldHRpbmdzID0gey4uLntcbiAgICAgICAgICAgIG92ZXJ3cml0ZTogdHJ1ZVxuICAgICAgICAgIH0sIC4uLihzZXR0aW5ncyAhPSBudWxsID8gc2V0dGluZ3MgOiBudWxsKX07XG4gICAgICAgIGZvciAoa2V5IGluIG9iamVjdCkge1xuICAgICAgICAgIHZhbHVlID0gb2JqZWN0W2tleV07XG4gICAgICAgICAgaWYgKCEoaW5kZXhPZi5jYWxsKG1vZHVsZV9rZXl3b3Jkcywga2V5KSA8IDApKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCghc2V0dGluZ3Mub3ZlcndyaXRlKSAmJiAoKHRoaXMucHJvdG90eXBlW2tleV0gIT0gbnVsbCkgfHwgKHRoaXNba2V5XSAhPSBudWxsKSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgXm11bHRpbWl4L2luY2x1ZGVANTY4NCBvdmVyd3JpdGUgc2V0IHRvIGZhbHNlIGJ1dCBuYW1lIGFscmVhZHkgc2V0OiAke0pTT04uc3RyaW5naWZ5KGtleSl9YCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXNba2V5XSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGlmICgocmVmID0gb2JqZWN0LmV4dGVuZGVkKSAhPSBudWxsKSB7XG4gICAgICAgICAgcmVmLmFwcGx5KHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgc3RhdGljIGluY2x1ZGUob2JqZWN0LCBzZXR0aW5ncyA9IG51bGwpIHtcbiAgICAgICAgdmFyIGtleSwgcmVmLCB2YWx1ZTtcbiAgICAgICAgc2V0dGluZ3MgPSB7Li4ue1xuICAgICAgICAgICAgb3ZlcndyaXRlOiB0cnVlXG4gICAgICAgICAgfSwgLi4uKHNldHRpbmdzICE9IG51bGwgPyBzZXR0aW5ncyA6IG51bGwpfTtcbiAgICAgICAgZm9yIChrZXkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgdmFsdWUgPSBvYmplY3Rba2V5XTtcbiAgICAgICAgICBpZiAoIShpbmRleE9mLmNhbGwobW9kdWxlX2tleXdvcmRzLCBrZXkpIDwgMCkpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoKCFzZXR0aW5ncy5vdmVyd3JpdGUpICYmICgodGhpcy5wcm90b3R5cGVba2V5XSAhPSBudWxsKSB8fCAodGhpc1trZXldICE9IG51bGwpKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBebXVsdGltaXgvaW5jbHVkZUA1NjgzIG92ZXJ3cml0ZSBzZXQgdG8gZmFsc2UgYnV0IG5hbWUgYWxyZWFkeSBzZXQ6ICR7SlNPTi5zdHJpbmdpZnkoa2V5KX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gQXNzaWduIHByb3BlcnRpZXMgdG8gdGhlIHByb3RvdHlwZVxuICAgICAgICAgIHRoaXMucHJvdG90eXBlW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoKHJlZiA9IG9iamVjdC5pbmNsdWRlZCkgIT0gbnVsbCkge1xuICAgICAgICAgIHJlZi5hcHBseSh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIGV4cG9ydCh0YXJnZXQgPSBudWxsKSB7XG4gICAgICAgIC8qIFJldHVybiBhbiBvYmplY3Qgd2l0aCBtZXRob2RzLCBib3VuZCB0byB0aGUgY3VycmVudCBpbnN0YW5jZS4gKi9cbiAgICAgICAgdmFyIFIsIGssIHJlZiwgcmVmMSwgdjtcbiAgICAgICAgUiA9IHRhcmdldCAhPSBudWxsID8gdGFyZ2V0IDoge307XG4gICAgICAgIHJlZiA9IChyZXF1aXJlKCcuL2NhdGFsb2d1aW5nJykpLndhbGtfYWxsX2tleXNfb2YodGhpcyk7XG4gICAgICAgIGZvciAoayBvZiByZWYpIHtcbiAgICAgICAgICB2ID0gdGhpc1trXTtcbiAgICAgICAgICBpZiAoKHYgIT0gbnVsbCA/IHYuYmluZCA6IHZvaWQgMCkgPT0gbnVsbCkge1xuICAgICAgICAgICAgUltrXSA9IHY7XG4gICAgICAgICAgfSBlbHNlIGlmICgocmVmMSA9IHZbTXVsdGltaXguaXNhX2tleW1ldGhvZF9wcm94eV0pICE9IG51bGwgPyByZWYxIDogZmFsc2UpIHtcbiAgICAgICAgICAgIFJba10gPSBNdWx0aW1peC5nZXRfa2V5bWV0aG9kX3Byb3h5KHRoaXMsIHYpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBSW2tdID0gdi5iaW5kKHRoaXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gUjtcbiAgICAgIH1cblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIGdldF9teV9wcm90b3R5cGUoKSB7XG4gICAgICAgIHJldHVybiBPYmplY3QuZ2V0UHJvdG90eXBlT2YoT2JqZWN0LmdldFByb3RvdHlwZU9mKHRoaXMpKTtcbiAgICAgIH1cblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIG5ldyguLi5QKSB7XG4gICAgICAgIHJldHVybiBuZXcgdGhpcy5jb25zdHJ1Y3RvciguLi5QKTtcbiAgICAgIH1cblxuICAgICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIEtFWU1FVEhPRCBGQUNUT1JZXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgc3RhdGljIGdldF9rZXltZXRob2RfcHJveHkoYmluZF90YXJnZXQsIGYpIHtcbiAgICAgICAgdmFyIFI7XG4gICAgICAgIFIgPSBuZXcgUHJveHkoZi5iaW5kKGJpbmRfdGFyZ2V0KSwge1xuICAgICAgICAgIGdldDogZnVuY3Rpb24odGFyZ2V0LCBrZXkpIHtcbiAgICAgICAgICAgIGlmIChrZXkgPT09ICdiaW5kJykgeyAvLyAuLi4gb3RoZXIgcHJvcGVydGllcyAuLi5cbiAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldFtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCh0eXBlb2Yga2V5KSA9PT0gJ3N5bWJvbCcpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldFtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKC4uLnhQKSB7XG4gICAgICAgICAgICAgIHJldHVybiB0YXJnZXQoa2V5LCAuLi54UCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFJbTXVsdGltaXguaXNhX2tleW1ldGhvZF9wcm94eV0gPSB0cnVlO1xuICAgICAgICByZXR1cm4gUjtcbiAgICAgIH1cblxuICAgIH07XG5cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIEBqc190eXBlX29mID0gKCB4ICkgLT4gcmV0dXJuICggKCBPYmplY3Q6OnRvU3RyaW5nLmNhbGwgeCApLnNsaWNlIDgsIC0xICkudG9Mb3dlckNhc2UoKVxuICAgIE11bHRpbWl4LmlzYV9rZXltZXRob2RfcHJveHkgPSBTeW1ib2woJ3Byb3h5Jyk7XG5cbiAgICByZXR1cm4gTXVsdGltaXg7XG5cbiAgfSkuY2FsbCh0aGlzKTtcblxuICAvLyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4gIG1vZHVsZS5leHBvcnRzID0gTXVsdGltaXg7XG5cbn0pLmNhbGwodGhpcyk7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPW1haW4uanMubWFwIiwiKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG4gIHZhciBEb20sIElOVEVSVEVYVCwgVGV4dCwgZGVidWcsIGlzYSwgbG91cGUsIG1pc2ZpdCwgdHlwZXMsIHZhbGlkYXRlO1xuXG4gIGxvdXBlID0gcmVxdWlyZSgnLi4vbG91cGUuanMnKTtcblxuICBtaXNmaXQgPSBTeW1ib2woJ21pc2ZpdCcpO1xuXG4gIGRlYnVnID0gY29uc29sZS5kZWJ1ZztcblxuICAoe3R5cGVzLCBpc2EsIHZhbGlkYXRlfSA9IHJlcXVpcmUoJy4vdHlwZXMnKSk7XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBJTlRFUlRFWFQgPSB7XG4gICAgY2FtZWxpemU6IGZ1bmN0aW9uKHRleHQpIHtcbiAgICAgIC8qIHRoeCB0byBodHRwczovL2dpdGh1Yi5jb20vbG9kYXNoL2xvZGFzaC9ibG9iL21hc3Rlci9jYW1lbENhc2UuanMgKi9cbiAgICAgIHZhciBpLCBpZHgsIHJlZiwgd29yZCwgd29yZHM7XG4gICAgICB3b3JkcyA9IHRleHQuc3BsaXQoJy0nKTtcbiAgICAgIGZvciAoaWR4ID0gaSA9IDEsIHJlZiA9IHdvcmRzLmxlbmd0aDsgaSA8IHJlZjsgaWR4ID0gaSArPSArMSkge1xuICAgICAgICB3b3JkID0gd29yZHNbaWR4XTtcbiAgICAgICAgaWYgKHdvcmQgPT09ICcnKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgd29yZHNbaWR4XSA9IHdvcmRbMF0udG9VcHBlckNhc2UoKSArIHdvcmQuc2xpY2UoMSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gd29yZHMuam9pbignJyk7XG4gICAgfVxuICB9O1xuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIFRleHQgPSBjbGFzcyBUZXh0IHtcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIHJwcih4KSB7XG4gICAgICByZXR1cm4gbG91cGUuaW5zcGVjdCh4KTtcbiAgICB9XG5cbiAgICBfcGVuMSh4KSB7XG4gICAgICBpZiAoaXNhLnRleHQoeCkpIHtcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5ycHIoeCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcGVuKC4uLlApIHtcbiAgICAgIHJldHVybiAoUC5tYXAoKHgpID0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BlbjEoeCk7XG4gICAgICB9KSkuam9pbignICcpO1xuICAgIH1cblxuICAgIHBlbl9lc2NhcGUoLi4uUCkge1xuICAgICAgcmV0dXJuIChQLm1hcCgoeCkgPT4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGVuX2VzY2FwZTEoeCk7XG4gICAgICB9KSkuam9pbignICcpO1xuICAgIH1cblxuICAgIGxvZyguLi5QKSB7XG4gICAgICByZXR1cm4gY29uc29sZS5sb2codGhpcy5wZW4oLi4uUCkpO1xuICAgIH1cblxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX3Blbl9lc2NhcGUxKHgpIHtcbiAgICAgIGlmIChpc2EudGV4dCh4KSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZXNjYXBlKHgpO1xuICAgICAgfVxuICAgICAgaWYgKGlzYS5lbGVtZW50KHgpKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lc2NhcGUoeC5vdXRlckhUTUwpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMucnByKHgpO1xuICAgIH1cblxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX2VzY2FwZSh4KSB7XG4gICAgICByZXR1cm4geC5yZXBsYWNlKC8mL2csICcmYW1wOycpLnJlcGxhY2UoLzwvZywgJyZsdDsnKS5yZXBsYWNlKC8+L2csICcmZ3Q7Jyk7XG4gICAgfVxuXG4gIH07XG5cbiAgRG9tID0gKGZ1bmN0aW9uKCkge1xuICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBjbGFzcyBEb20geyAvLyBleHRlbmRzIE11bHRpbWl4XG4gICAgICAvKiBpbnNwaXJlZCBieSBodHRwOi8veW91bWlnaHRub3RuZWVkanF1ZXJ5LmNvbVxuICAgICAgIGFuZCBodHRwczovL2Jsb2cuZ2Fyc3Rhc2lvLmNvbS95b3UtZG9udC1uZWVkLWpxdWVyeSAqL1xuICAgICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIHJlYWR5KGYpIHtcbiAgICAgICAgLy8gdGh4IHRvIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vYS83MDUzMTk3Lzc1NjgwOTFcbiAgICAgICAgLy8gZnVuY3Rpb24gcihmKXsvaW4vLnRlc3QoZG9jdW1lbnQucmVhZHlTdGF0ZSk/c2V0VGltZW91dChyLDksZik6ZigpfVxuICAgICAgICB2YWxpZGF0ZS5mdW5jdGlvbihmKTtcbiAgICAgICAgaWYgKC9pbi8udGVzdChkb2N1bWVudC5yZWFkeVN0YXRlKSkge1xuICAgICAgICAgIHJldHVybiBzZXRUaW1lb3V0KCgoKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZWFkeShmKTtcbiAgICAgICAgICB9KSwgOSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGYoKTtcbiAgICAgIH1cblxuICAgICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIFdBUk5JTkdTLCBOT1RJRklDQVRJT05TXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgX25vdGlmeShtZXNzYWdlKSB7XG4gICAgICAgIHZhciBib2R5LCBpZCwgbWVzc2FnZV9ib3gsIG1lc3NhZ2VfcCwgc3R5bGU7XG4gICAgICAgIGlkID0gJ21zZ2J4NDk1NzMnO1xuICAgICAgICBtZXNzYWdlX2JveCA9IHRoaXMuc2VsZWN0KGAke2lkfWAsIG51bGwpO1xuICAgICAgICBpZiAobWVzc2FnZV9ib3ggPT09IG51bGwpIHtcbiAgICAgICAgICBib2R5ID0gdGhpcy5zZWxlY3QoJ2JvZHknLCBudWxsKTtcbiAgICAgICAgICAvKiBUQUlOVCBib2R5IGVsZW1lbnQgY2Fubm90IGJlIGZvdW5kIHdoZW4gbWV0aG9kIGlzIGNhbGxlZCBiZWZvcmUgZG9jdW1lbnQgcmVhZHksIGJ1dCB3ZSBjb3VsZCBzdGlsbFxuICAgICAgICAgICAgICAgY29uc3RydWN0IGVsZW1lbnQgaW1tZWRpYXRlbHksIGFwcGVuZCBpdCBvbiBkb2N1bWVudCByZWFkeSAqL1xuICAgICAgICAgIGlmIChib2R5ID09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgc3R5bGUgPSBcImJhY2tncm91bmQ6IzE4MTcxZDtcIjtcbiAgICAgICAgICBzdHlsZSArPSBcInBvc2l0aW9uOmZpeGVkO1wiO1xuICAgICAgICAgIHN0eWxlICs9IFwiYm90dG9tOjBtbTtcIjtcbiAgICAgICAgICBzdHlsZSArPSBcImJvcmRlcjoxbW0gZGFzaGVkICNlMmZmMDA7XCI7XG4gICAgICAgICAgc3R5bGUgKz0gXCJwYWRkaW5nLWxlZnQ6M21tO1wiO1xuICAgICAgICAgIHN0eWxlICs9IFwicGFkZGluZy1yaWdodDozbW07XCI7XG4gICAgICAgICAgc3R5bGUgKz0gXCJwYWRkaW5nLWJvdHRvbTozbW07XCI7XG4gICAgICAgICAgc3R5bGUgKz0gXCJmb250LWZhbWlseTpzYW5zLXNlcmlmO1wiO1xuICAgICAgICAgIHN0eWxlICs9IFwiZm9udC13ZWlnaHQ6Ym9sZCAhaW1wb3J0YW50O1wiO1xuICAgICAgICAgIHN0eWxlICs9IFwiZm9udC1zaXplOjNtbTtcIjtcbiAgICAgICAgICBzdHlsZSArPSBcImNvbG9yOiNlMmZmMDA7XCI7XG4gICAgICAgICAgc3R5bGUgKz0gXCJ3aWR0aDoxMDAlO1wiO1xuICAgICAgICAgIHN0eWxlICs9IFwibWF4LWhlaWdodDozMG1tO1wiO1xuICAgICAgICAgIHN0eWxlICs9IFwib3ZlcmZsb3cteTpzY3JvbGw7XCI7XG4gICAgICAgICAgbWVzc2FnZV9ib3ggPSB0aGlzLnBhcnNlX29uZShgPGRpdiBpZD0ke2lkfSBzdHlsZT0nJHtzdHlsZX0nPjwvZGl2PmApO1xuICAgICAgICAgIHRoaXMuYXBwZW5kKGJvZHksIG1lc3NhZ2VfYm94KTtcbiAgICAgICAgfVxuICAgICAgICBtZXNzYWdlX3AgPSBcIjxwIHN0eWxlPSdwYWRkaW5nLXRvcDozbW07Jz5cIjtcbiAgICAgICAgbWVzc2FnZV9wICs9IFwi4pqg77iPJm5ic3A7PHN0cm9uZz5cIjtcbiAgICAgICAgbWVzc2FnZV9wICs9IMK1LlRFWFQucGVuX2VzY2FwZShtZXNzYWdlKTtcbiAgICAgICAgbWVzc2FnZV9wICs9IFwiPC9zdHJvbmc+PC9wPlwiO1xuICAgICAgICBtZXNzYWdlX3AgPSB0aGlzLnBhcnNlX29uZShtZXNzYWdlX3ApO1xuICAgICAgICB0aGlzLmluc2VydF9hc19sYXN0KG1lc3NhZ2VfYm94LCBtZXNzYWdlX3ApO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIHdhcm4oLi4uUCkge1xuICAgICAgICAvKiBDb25zdHJ1Y3QgYSB0ZXh0IG1lc3NhZ2UgZm9yIGRpc3BsYXkgaW4gY29uc29sZSBhbmQgaW4gbm90aWZpY2F0aW9uIGJveCwgYWxvbmdzaWRlIHdpdGggYSBzdGFjayB0cmFjZVxuICAgICAgICAgICB0byBiZSBzaG93biBvbmx5IGluIHRoZSBjb25zb2xlLCBwcmVjZWQgYnkgdGhlIG9yaWdpbmFsIGFyZ3VtZW50cyBhcyBwYXNzZWQgaW50byB0aGlzIGZ1bmN0aW9uLFxuICAgICAgICAgICBtZWFuaW5nIHRoYXQgYW55IERPTSBlbGVtZW50cyB3aWxsIGJlIGV4cGFuZGFibGUgbGlua3MgdG8gdGhlaXIgdmlzaWJsZSByZXByZXNlbnRhdGlvbnMgb24gdGhlIEhUTUxcbiAgICAgICAgICAgcGFnZS4gKi9cbiAgICAgICAgdmFyIGVycm9yLCBtZXNzYWdlO1xuICAgICAgICBtZXNzYWdlID0gwrUuVEVYVC5wZW4oLi4uUCk7XG4gICAgICAgIGVycm9yID0gbmV3IEVycm9yKG1lc3NhZ2UpO1xuICAgICAgICBjb25zb2xlLmdyb3VwQ29sbGFwc2VkKFBbMF0pO1xuICAgICAgICBjb25zb2xlLndhcm4oLi4uUCk7XG4gICAgICAgIGNvbnNvbGUuZ3JvdXBFbmQoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuX25vdGlmeShtZXNzYWdlKTtcbiAgICAgIH1cblxuICAgICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIC8qIE5PVEUgYMK1LkRPTS5zZWxlY3QoKWAgdG8gYmUgZGVwcmVjYXRlZCBpbiBmYXZvciBvZiBgwrUuRE9NLnNlbGVjdF9maXJzdCgpYCAqL1xuICAgICAgc2VsZWN0KHNlbGVjdG9yLCBmYWxsYmFjayA9IG1pc2ZpdCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zZWxlY3RfZmlyc3QoZG9jdW1lbnQsIHNlbGVjdG9yLCBmYWxsYmFjayk7XG4gICAgICB9XG5cbiAgICAgIHNlbGVjdF9maXJzdChzZWxlY3RvciwgZmFsbGJhY2sgPSBtaXNmaXQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2VsZWN0X2Zyb20oZG9jdW1lbnQsIHNlbGVjdG9yLCBmYWxsYmFjayk7XG4gICAgICB9XG5cbiAgICAgIHNlbGVjdF9hbGwoc2VsZWN0b3IpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2VsZWN0X2FsbF9mcm9tKGRvY3VtZW50LCBzZWxlY3Rvcik7XG4gICAgICB9XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAvKiBOT1RFIGDCtS5ET00uc2VsZWN0X2Zyb20oKWAgdG8gYmUgZGVwcmVjYXRlZCBpbiBmYXZvciBvZiBgwrUuRE9NLnNlbGVjdF9maXJzdF9mcm9tKClgICovXG4gICAgICBzZWxlY3RfZnJvbShlbGVtZW50LCBzZWxlY3RvciwgZmFsbGJhY2sgPSBtaXNmaXQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2VsZWN0X2ZpcnN0X2Zyb20oZWxlbWVudCwgc2VsZWN0b3IsIGZhbGxiYWNrKTtcbiAgICAgIH1cblxuICAgICAgc2VsZWN0X2ZpcnN0X2Zyb20oZWxlbWVudCwgc2VsZWN0b3IsIGZhbGxiYWNrID0gbWlzZml0KSB7XG4gICAgICAgIHZhciBSO1xuICAgICAgICB2YWxpZGF0ZS5kZWxlbWVudChlbGVtZW50KTtcbiAgICAgICAgdmFsaWRhdGUubm9uZW1wdHlfdGV4dChzZWxlY3Rvcik7XG4gICAgICAgIGlmICgoUiA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3RvcikpID09IG51bGwpIHtcbiAgICAgICAgICBpZiAoZmFsbGJhY2sgPT09IG1pc2ZpdCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBewrVET00vc2VsZWN0X2Zyb21ANzc1OF4gbm8gc3VjaCBlbGVtZW50OiAke8K1LlRFWFQucnByKHNlbGVjdG9yKX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGZhbGxiYWNrO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBSO1xuICAgICAgfVxuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgc2VsZWN0X2FsbF9mcm9tKGVsZW1lbnQsIHNlbGVjdG9yKSB7XG4gICAgICAgIHZhbGlkYXRlLmRlbGVtZW50KGVsZW1lbnQpO1xuICAgICAgICB2YWxpZGF0ZS5ub25lbXB0eV90ZXh0KHNlbGVjdG9yKTtcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgICB9XG5cbiAgICAgIC8vIEFycmF5LmZyb20gZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsIHNlbGVjdG9yXG5cbiAgICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIHNlbGVjdF9pZChpZCwgZmFsbGJhY2sgPSBtaXNmaXQpIHtcbiAgICAgICAgdmFyIFI7XG4gICAgICAgIHZhbGlkYXRlLm5vbmVtcHR5X3RleHQoaWQpO1xuICAgICAgICBpZiAoKFIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCkpID09IG51bGwpIHtcbiAgICAgICAgICBpZiAoZmFsbGJhY2sgPT09IG1pc2ZpdCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBewrVET00vc2VsZWN0X2lkQDc3NTheIG5vIGVsZW1lbnQgd2l0aCBJRDogJHvCtS5URVhULnJwcihpZCl9YCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBmYWxsYmFjaztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gUjtcbiAgICAgIH1cblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIG1hdGNoZXNfc2VsZWN0b3IoZWxlbWVudCwgc2VsZWN0b3IpIHtcbiAgICAgICAgaWYgKCFpc2EuZnVuY3Rpb24oZWxlbWVudCAhPSBudWxsID8gZWxlbWVudC5tYXRjaGVzIDogdm9pZCAwKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgXsK1RE9NL3NlbGVjdF9pZEA3NzU4MV4gZXhwZWN0ZWQgZWxlbWVudCB3aXRoIFxcYG1hdGNoKClcXGAgbWV0aG9kLCBnb3QgJHvCtS5URVhULnJwcihlbGVtZW50KX1gKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZWxlbWVudC5tYXRjaGVzKHNlbGVjdG9yKTtcbiAgICAgIH1cblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIGdldChlbGVtZW50LCBuYW1lKSB7XG4gICAgICAgIHZhbGlkYXRlLmVsZW1lbnQoZWxlbWVudCk7XG4gICAgICAgIHJldHVybiBlbGVtZW50LmdldEF0dHJpYnV0ZShuYW1lKTtcbiAgICAgIH1cblxuICAgICAgZ2V0X251bWVyaWMoZWxlbWVudCwgbmFtZSkge1xuICAgICAgICByZXR1cm4gcGFyc2VGbG9hdCh0aGlzLmdldChlbGVtZW50LCBuYW1lKSk7XG4gICAgICB9XG5cbiAgICAgIC8vIFdoZW4gY2FsbGVkIHdpdGggdHdvIGFyZ3VtZW50cyBhcyBpbiBgc2V0IGRpdiwgJ2JhcidgLCB3aWxsIHNldCB2YWx1ZXMtbGVzcyBhdHRyaWJ1dGUgKGA8ZGl2IGJhcj5gKVxuICAgICAgc2V0KGVsZW1lbnQsIG5hbWUsIHZhbHVlID0gJycpIHtcbiAgICAgICAgdmFsaWRhdGUuZWxlbWVudChlbGVtZW50KTtcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQuc2V0QXR0cmlidXRlKG5hbWUsIHZhbHVlKTtcbiAgICAgIH1cblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIGdldF9jbGFzc2VzKGVsZW1lbnQpIHtcbiAgICAgICAgdmFsaWRhdGUuZWxlbWVudChlbGVtZW50KTtcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQuY2xhc3NMaXN0O1xuICAgICAgfVxuXG4gICAgICBhZGRfY2xhc3MoZWxlbWVudCwgbmFtZSkge1xuICAgICAgICB2YWxpZGF0ZS5lbGVtZW50KGVsZW1lbnQpO1xuICAgICAgICByZXR1cm4gZWxlbWVudC5jbGFzc0xpc3QuYWRkKG5hbWUpO1xuICAgICAgfVxuXG4gICAgICBoYXNfY2xhc3MoZWxlbWVudCwgbmFtZSkge1xuICAgICAgICB2YWxpZGF0ZS5lbGVtZW50KGVsZW1lbnQpO1xuICAgICAgICByZXR1cm4gZWxlbWVudC5jbGFzc0xpc3QuY29udGFpbnMobmFtZSk7XG4gICAgICB9XG5cbiAgICAgIHJlbW92ZV9jbGFzcyhlbGVtZW50LCBuYW1lKSB7XG4gICAgICAgIHZhbGlkYXRlLmVsZW1lbnQoZWxlbWVudCk7XG4gICAgICAgIHJldHVybiBlbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUobmFtZSk7XG4gICAgICB9XG5cbiAgICAgIHRvZ2dsZV9jbGFzcyhlbGVtZW50LCBuYW1lKSB7XG4gICAgICAgIHZhbGlkYXRlLmVsZW1lbnQoZWxlbWVudCk7XG4gICAgICAgIHJldHVybiBlbGVtZW50LmNsYXNzTGlzdC50b2dnbGUobmFtZSk7XG4gICAgICB9XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBzd2FwX2NsYXNzKGVsZW1lbnQsIG9sZF9uYW1lLCBuZXdfbmFtZSkge1xuICAgICAgICBlbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUob2xkX25hbWUpO1xuICAgICAgICByZXR1cm4gZWxlbWVudC5jbGFzc0xpc3QuYWRkKG5ld19uYW1lKTtcbiAgICAgIH1cblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIGhpZGUoZWxlbWVudCkge1xuICAgICAgICB2YWxpZGF0ZS5lbGVtZW50KGVsZW1lbnQpO1xuICAgICAgICByZXR1cm4gZWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgfVxuXG4gICAgICBzaG93KGVsZW1lbnQpIHtcbiAgICAgICAgdmFsaWRhdGUuZWxlbWVudChlbGVtZW50KTtcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQuc3R5bGUuZGlzcGxheSA9ICcnO1xuICAgICAgfVxuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgZ2V0X2xpdmVfc3R5bGVzKGVsZW1lbnQpIHtcbiAgICAgICAgcmV0dXJuIGdldENvbXB1dGVkU3R5bGUoZWxlbWVudCk7XG4gICAgICB9XG5cbiAgICAgIC8qXG4gICAgICBnbG9iYWxUaGlzLmdldF9zdHlsZSA9ICggZWxlbWVudCwgcHNldWRvX3NlbGVjdG9yLCBhdHRyaWJ1dGVfbmFtZSApIC0+XG4gICAgICAgIHVubGVzcyBhdHRyaWJ1dGVfbmFtZT9cbiAgICAgICAgICBbIHBzZXVkb19zZWxlY3RvciwgYXR0cmlidXRlX25hbWUsIF0gPSBbIHVuZGVmaW5lZCwgcHNldWRvX3NlbGVjdG9yLCBdXG4gICAgICAgIHN0eWxlID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUgZWxlbWVudCwgcHNldWRvX3NlbGVjdG9yXG4gICAgICAgIHJldHVybiBzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlIGF0dHJpYnV0ZV9uYW1lXG4gICAgICAqL1xuICAgICAgLyogVEFJTlQgYWxzbyB1c2UgcHNldWRvX3NlbGVjdG9yLCBzZWUgYWJvdmUgKi9cbiAgICAgIC8qIHZhbGlkYXRpb24gZG9uZSBieSBtZXRob2QgKi9cbiAgICAgIC8qIHZhbGlkYXRpb24gZG9uZSBieSBtZXRob2QgKi8gICAgICBnZXRfc3R5bGVfdmFsdWUoZWxlbWVudCwgbmFtZSkge1xuICAgICAgICByZXR1cm4gKGdldENvbXB1dGVkU3R5bGUoZWxlbWVudCkpW25hbWVdO1xuICAgICAgfVxuXG4gICAgICBnZXRfbnVtZXJpY19zdHlsZV92YWx1ZShlbGVtZW50LCBuYW1lKSB7XG4gICAgICAgIHJldHVybiBwYXJzZUZsb2F0KChnZXRDb21wdXRlZFN0eWxlKGVsZW1lbnQpKVtuYW1lXSk7XG4gICAgICB9XG5cbiAgICAgIC8qIHRoeCB0byBodHRwczovL2Rhdmlkd2Fsc2gubmFtZS9jc3MtdmFyaWFibGVzLWphdmFzY3JpcHQgKi9cbiAgICAgIGdldF9wcm9wX3ZhbHVlKGVsZW1lbnQsIG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIChnZXRDb21wdXRlZFN0eWxlKGVsZW1lbnQpKS5nZXRQcm9wZXJ0eVZhbHVlKG5hbWUpO1xuICAgICAgfVxuXG4gICAgICBnZXRfbnVtZXJpY19wcm9wX3ZhbHVlKGVsZW1lbnQsIG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIHBhcnNlRmxvYXQoKGdldENvbXB1dGVkU3R5bGUoZWxlbWVudCkpLmdldFByb3BlcnR5VmFsdWUobmFtZSkpO1xuICAgICAgfVxuXG4gICAgICAvKiB0aHggdG8gaHR0cHM6Ly9kYXZpZHdhbHNoLm5hbWUvY3NzLXZhcmlhYmxlcy1qYXZhc2NyaXB0ICovXG4gICAgICBnZXRfZ2xvYmFsX3Byb3BfdmFsdWUobmFtZSkge1xuICAgICAgICByZXR1cm4gKGdldENvbXB1dGVkU3R5bGUoZG9jdW1lbnQpKS5nZXRQcm9wZXJ0eVZhbHVlKG5hbWUpO1xuICAgICAgfVxuXG4gICAgICBnZXRfbnVtZXJpY19nbG9iYWxfcHJvcF92YWx1ZShuYW1lKSB7XG4gICAgICAgIHJldHVybiBwYXJzZUZsb2F0KChnZXRDb21wdXRlZFN0eWxlKGRvY3VtZW50KSkuZ2V0UHJvcGVydHlWYWx1ZShuYW1lKSk7XG4gICAgICB9XG5cbiAgICAgIHNldF9nbG9iYWxfcHJvcF92YWx1ZShuYW1lLCB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLnNldFByb3BlcnR5KG5hbWUsIHZhbHVlKTtcbiAgICAgIH1cblxuICAgICAgLy8gIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAvLyBzZXRfcHJvcF9kZWZhdWx0cyA9IC0+XG4gICAgICAvLyAgICMjIyBUaGVyZSBzaG91ZCBiZSBhIGJldHRlciB3YXkgdG8gaW5qZWN0IHN0eWxlcyAjIyNcbiAgICAgIC8vICAgcmV0dXJuIG51bGwgaWYgX3NldF9wcm9wX2RlZmF1bHRzXG4gICAgICAvLyAgICMgaGVhZF9kb20gPSDCtS5ET00uc2VsZWN0X2ZpcnN0ICdoZWFkJ1xuICAgICAgLy8gICAjIHN0eWxlX3R4dCA9IFwiXCJcIlxuICAgICAgLy8gICAjIDxzdHlsZT5cbiAgICAgIC8vICAgIyAgICoge1xuICAgICAgLy8gICAjICAgICBvdXRsaW5lOiAgICAgICAycHggc29saWQgeWVsbG93OyB9XG4gICAgICAvLyAgICMgICA8L3N0eWxlPlxuICAgICAgLy8gICAjIFwiXCJcIlxuICAgICAgLy8gICAjIGhlYWRfZG9tLmlubmVySFRNTCA9IHN0eWxlX3R4dCArIGhlYWRfZG9tLmlubmVySFRNTFxuICAgICAgLy8gICB0b3BoYXRfZG9tID0gwrUuRE9NLnNlbGVjdF9maXJzdCAnI3RvcGhhdCdcbiAgICAgIC8vICAgwrUuRE9NLmluc2VydF9iZWZvcmUgdG9waGF0X2RvbSwgwrUuRE9NLnBhcnNlX29uZSBcIlwiXCJcbiAgICAgIC8vICAgPHN0eWxlPlxuICAgICAgLy8gICAgICoge1xuICAgICAgLy8gICAgICAgb3V0bGluZTogICAgICAgMnB4IHNvbGlkIHllbGxvdzsgfVxuICAgICAgLy8gICAgIDpyb290IHtcbiAgICAgIC8vICAgICAgIC0taHN0bi1zbGlkZXItdHJhY2stYmdjb2xvcjogICAgbGltZTsgfVxuICAgICAgLy8gICAgIDwvc3R5bGU+XG4gICAgICAvLyAgIFwiXCJcIlxuICAgICAgLy8gICByZXR1cm4gbnVsbFxuXG4gICAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBzZXRfc3R5bGVfcnVsZShlbGVtZW50LCBuYW1lLCB2YWx1ZSkge1xuICAgICAgICAvKiBzZWUgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL0VsZW1lbnRDU1NJbmxpbmVTdHlsZS9zdHlsZSAqL1xuICAgICAgICB2YWxpZGF0ZS5lbGVtZW50KGVsZW1lbnQpO1xuICAgICAgICB2YWxpZGF0ZS5ub25lbXB0eV90ZXh0KG5hbWUpO1xuICAgICAgICByZXR1cm4gZWxlbWVudC5zdHlsZVtJTlRFUlRFWFQuY2FtZWxpemUobmFtZSldID0gdmFsdWU7XG4gICAgICB9XG5cbiAgICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAvLyBFTEVNRU5UIENSRUFUSU9OXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgcGFyc2Vfb25lKGVsZW1lbnRfaHRtbCkge1xuICAgICAgICB2YXIgUiwgbGVuZ3RoO1xuICAgICAgICBSID0gdGhpcy5wYXJzZV9hbGwoZWxlbWVudF9odG1sKTtcbiAgICAgICAgaWYgKChsZW5ndGggPSBSLmxlbmd0aCkgIT09IDEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYF7CtURPTS9wYXJzZV9vbmVANzU1OF4gZXhwZWN0ZWQgSFRNTCBmb3IgMSBlbGVtZW50IGJ1dCBnb3QgJHtsZW5ndGh9YCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFJbMF07XG4gICAgICB9XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBwYXJzZV9hbGwoaHRtbCkge1xuICAgICAgICB2YXIgUjtcbiAgICAgICAgLyogVEFJTlQgcmV0dXJuIEFycmF5IG9yIEhUTUxDb2xsZWN0aW9uPyAqL1xuICAgICAgICB2YWxpZGF0ZS5ub25lbXB0eV90ZXh0KGh0bWwpO1xuICAgICAgICBSID0gZG9jdW1lbnQuaW1wbGVtZW50YXRpb24uY3JlYXRlSFRNTERvY3VtZW50KCk7XG4gICAgICAgIFIuYm9keS5pbm5lckhUTUwgPSBodG1sO1xuICAgICAgICByZXR1cm4gUi5ib2R5LmNoaWxkcmVuO1xuICAgICAgfVxuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgbmV3X2VsZW1lbnQoeG5hbWUsIC4uLlApIHtcbiAgICAgICAgLyogVEFJTlQgYW5hbHl6ZSB4bmFtZSAoYSBsYSBgZGl2I2lkNDIuZm9vLmJhcmApIGFzIGRvbmUgaW4gSW50ZXJ0ZXh0LkN1cG9maHRtbCAqL1xuICAgICAgICAvKiBUQUlOVCBpbiBzb21lIGNhc2VzIHVzaW5nIGlubmVySFRNTCwgZG9jdW1lbnRGcmFnbWVudCBtYXkgYmUgYWR2YW50YWdlb3VzICovXG4gICAgICAgIHZhciBSLCBhdHRyaWJ1dGVzLCBpLCBrLCBsZW4sIHAsIHRleHQsIHY7XG4gICAgICAgIFIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHhuYW1lKTtcbiAgICAgICAgYXR0cmlidXRlcyA9IHt9O1xuICAgICAgICB0ZXh0ID0gbnVsbDtcbiAgICAgICAgZm9yIChpID0gMCwgbGVuID0gUC5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgIHAgPSBQW2ldO1xuICAgICAgICAgIGlmIChpc2EudGV4dChwKSkge1xuICAgICAgICAgICAgdGV4dCA9IHA7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYXR0cmlidXRlcyA9IE9iamVjdC5hc3NpZ24oYXR0cmlidXRlcywgcCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRleHQgIT0gbnVsbCkge1xuICAgICAgICAgIC8qIFRBSU5UIGNoZWNrIHR5cGU/ICovICAgICAgICAgIFIudGV4dENvbnRlbnQgPSB0ZXh0O1xuICAgICAgICB9XG4gICAgICAgIGZvciAoayBpbiBhdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgdiA9IGF0dHJpYnV0ZXNba107XG4gICAgICAgICAgUi5zZXRBdHRyaWJ1dGUoaywgdik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFI7XG4gICAgICB9XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBkZWVwX2NvcHkoZWxlbWVudCkge1xuICAgICAgICByZXR1cm4gZWxlbWVudC5jbG9uZU5vZGUodHJ1ZSk7XG4gICAgICB9XG5cbiAgICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAvLyBPVVRFUiwgSU5ORVIgSFRNTFxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIGdldF9pbm5lcl9odG1sKGVsZW1lbnQpIHtcbiAgICAgICAgdmFsaWRhdGUuZWxlbWVudChlbGVtZW50KTtcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQuaW5uZXJIVE1MO1xuICAgICAgfVxuXG4gICAgICBnZXRfb3V0ZXJfaHRtbChlbGVtZW50KSB7XG4gICAgICAgIHZhbGlkYXRlLmVsZW1lbnQoZWxlbWVudCk7XG4gICAgICAgIHJldHVybiBlbGVtZW50Lm91dGVySFRNTDtcbiAgICAgIH1cblxuICAgICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIElOU0VSVElPTlxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIGluc2VydChwb3NpdGlvbiwgdGFyZ2V0LCB4KSB7XG4gICAgICAgIHN3aXRjaCAocG9zaXRpb24pIHtcbiAgICAgICAgICBjYXNlICdiZWZvcmUnOlxuICAgICAgICAgIGNhc2UgJ2JlZm9yZWJlZ2luJzpcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmluc2VydF9iZWZvcmUodGFyZ2V0LCB4KTtcbiAgICAgICAgICBjYXNlICdhc19maXJzdCc6XG4gICAgICAgICAgY2FzZSAnYWZ0ZXJiZWdpbic6XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbnNlcnRfYXNfZmlyc3QodGFyZ2V0LCB4KTtcbiAgICAgICAgICBjYXNlICdhc19sYXN0JzpcbiAgICAgICAgICBjYXNlICdiZWZvcmVlbmQnOlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5zZXJ0X2FzX2xhc3QodGFyZ2V0LCB4KTtcbiAgICAgICAgICBjYXNlICdhZnRlcic6XG4gICAgICAgICAgY2FzZSAnYWZ0ZXJlbmQnOlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5zZXJ0X2FmdGVyKHRhcmdldCwgeCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBewrVET00vaW5zZXJ0QDc3NTheIG5vdCBhIHZhbGlkIHBvc2l0aW9uOiAke8K1LlRFWFQucnByKHBvc2l0aW9uKX1gKTtcbiAgICAgIH1cblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIC8qIE5PVEUgcGVuZGluZyBwcmFjdGljYWwgY29uc2lkZXJhdGlvbnMgYW5kIGJlbmNobWFya3Mgd2Ugd2lsbCBwcm9iYWJseSByZW1vdmUgb25lIG9mIHRoZSB0d28gc2V0c1xuICAgICAgIG9mIGluc2VydGlvbiBtZXRob2RzICovXG4gICAgICBpbnNlcnRfYmVmb3JlKHRhcmdldCwgeCkge1xuICAgICAgICB2YWxpZGF0ZS5lbGVtZW50KHRhcmdldCk7XG4gICAgICAgIHJldHVybiB0YXJnZXQuaW5zZXJ0QWRqYWNlbnRFbGVtZW50KCdiZWZvcmViZWdpbicsIHgpO1xuICAgICAgfVxuXG4gICAgICBpbnNlcnRfYXNfZmlyc3QodGFyZ2V0LCB4KSB7XG4gICAgICAgIHZhbGlkYXRlLmVsZW1lbnQodGFyZ2V0KTtcbiAgICAgICAgcmV0dXJuIHRhcmdldC5pbnNlcnRBZGphY2VudEVsZW1lbnQoJ2FmdGVyYmVnaW4nLCB4KTtcbiAgICAgIH1cblxuICAgICAgaW5zZXJ0X2FzX2xhc3QodGFyZ2V0LCB4KSB7XG4gICAgICAgIHZhbGlkYXRlLmVsZW1lbnQodGFyZ2V0KTtcbiAgICAgICAgcmV0dXJuIHRhcmdldC5pbnNlcnRBZGphY2VudEVsZW1lbnQoJ2JlZm9yZWVuZCcsIHgpO1xuICAgICAgfVxuXG4gICAgICBpbnNlcnRfYWZ0ZXIodGFyZ2V0LCB4KSB7XG4gICAgICAgIHZhbGlkYXRlLmVsZW1lbnQodGFyZ2V0KTtcbiAgICAgICAgcmV0dXJuIHRhcmdldC5pbnNlcnRBZGphY2VudEVsZW1lbnQoJ2FmdGVyZW5kJywgeCk7XG4gICAgICB9XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBiZWZvcmUodGFyZ2V0LCAuLi54KSB7XG4gICAgICAgIHZhbGlkYXRlLmVsZW1lbnQodGFyZ2V0KTtcbiAgICAgICAgcmV0dXJuIHRhcmdldC5iZWZvcmUoLi4ueCk7XG4gICAgICB9XG5cbiAgICAgIHByZXBlbmQodGFyZ2V0LCAuLi54KSB7XG4gICAgICAgIHZhbGlkYXRlLmVsZW1lbnQodGFyZ2V0KTtcbiAgICAgICAgcmV0dXJuIHRhcmdldC5wcmVwZW5kKC4uLngpO1xuICAgICAgfVxuXG4gICAgICBhcHBlbmQodGFyZ2V0LCAuLi54KSB7XG4gICAgICAgIHZhbGlkYXRlLmVsZW1lbnQodGFyZ2V0KTtcbiAgICAgICAgcmV0dXJuIHRhcmdldC5hcHBlbmQoLi4ueCk7XG4gICAgICB9XG5cbiAgICAgIGFmdGVyKHRhcmdldCwgLi4ueCkge1xuICAgICAgICB2YWxpZGF0ZS5lbGVtZW50KHRhcmdldCk7XG4gICAgICAgIHJldHVybiB0YXJnZXQuYWZ0ZXIoLi4ueCk7XG4gICAgICB9XG5cbiAgICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAvLyBSRU1PVkFMXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgcmVtb3ZlKGVsZW1lbnQpIHtcbiAgICAgICAgLyogc2VlIGh0dHA6Ly95b3VtaWdodG5vdG5lZWRqcXVlcnkuY29tLyNyZW1vdmUgKi9cbiAgICAgICAgdmFsaWRhdGUuZWxlbWVudChlbGVtZW50KTtcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChlbGVtZW50KTtcbiAgICAgIH1cblxuICAgICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIEdFT01FVFJZXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgLyogTk9URSBvYnNlcnZlIHRoYXQgYERPTS5nZXRfb2Zmc2V0X3RvcCgpYCBhbmQgYGVsZW1lbnQub2Zmc2V0VG9wYCBhcmUgdHdvIGRpZmZlcmVudCB0aGluZ3M7IHRlcm1pbm9sb2d5XG4gICAgICAgaXMgY29uZnVzaW5nIGhlcmUsIHNvIGNvbnNpZGVyIHJlbmFtaW5nIHRvIGF2b2lkIGBvZmZzZXRgIGFsdG9nZXRoZXIgKi9cbiAgICAgIGdldF9vZmZzZXRfdG9wKGVsZW1lbnQpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLmdldF9vZmZzZXQoZWxlbWVudCkpLnRvcDtcbiAgICAgIH1cblxuICAgICAgZ2V0X29mZnNldF9sZWZ0KGVsZW1lbnQpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLmdldF9vZmZzZXQoZWxlbWVudCkpLmxlZnQ7XG4gICAgICB9XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBnZXRfb2Zmc2V0KGVsZW1lbnQpIHtcbiAgICAgICAgdmFyIHJlY3RhbmdsZTtcbiAgICAgICAgLyogc2VlIGh0dHA6Ly95b3VtaWdodG5vdG5lZWRqcXVlcnkuY29tLyNvZmZzZXQgKi9cbiAgICAgICAgdmFsaWRhdGUuZWxlbWVudChlbGVtZW50KTtcbiAgICAgICAgcmVjdGFuZ2xlID0gZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICB0b3A6IHJlY3RhbmdsZS50b3AgKyBkb2N1bWVudC5ib2R5LnNjcm9sbFRvcCxcbiAgICAgICAgICBsZWZ0OiByZWN0YW5nbGUubGVmdCArIGRvY3VtZW50LmJvZHkuc2Nyb2xsTGVmdFxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgLyogc2VlIGh0dHA6Ly95b3VtaWdodG5vdG5lZWRqcXVlcnkuY29tLyNnZXRfd2lkdGggKi9cbiAgICAgIGdldF93aWR0aChlbGVtZW50KSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldF9udW1lcmljX3N0eWxlX3ZhbHVlKGVsZW1lbnQsICd3aWR0aCcpO1xuICAgICAgfVxuXG4gICAgICBnZXRfaGVpZ2h0KGVsZW1lbnQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0X251bWVyaWNfc3R5bGVfdmFsdWUoZWxlbWVudCwgJ2hlaWdodCcpO1xuICAgICAgfVxuXG4gICAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gRVZFTlRTXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgb24oZWxlbWVudCwgbmFtZSwgaGFuZGxlcikge1xuICAgICAgICAvKiBUQUlOVCBhZGQgb3B0aW9ucyAqL1xuICAgICAgICAvKiBzZWUgaHR0cDovL3lvdW1pZ2h0bm90bmVlZGpxdWVyeS5jb20vI29uLCBodHRwOi8veW91bWlnaHRub3RuZWVkanF1ZXJ5LmNvbS8jZGVsZWdhdGUgKi9cbiAgICAgICAgLyogQWxzbyBub3RlIHRoZSBhZGRpdGlvbiBvZiBhIGBwYXNzaXZlOiBmYWxzZWAgcGFyYW1ldGVyIChhcyBpbiBgaHRtbF9kb20uYWRkRXZlbnRMaXN0ZW5lciAnd2hlZWwnLCBmLFxuICAgICAgICAgICB7IHBhc3NpdmU6IGZhbHNlLCB9YCk7IHNlZSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL2EvNTU0NjE2MzIvMjU2MzYxOyBhcHBhcmVudGx5IGl0IGlzIGEgcmVjZW50bHlcbiAgICAgICAgICAgaW50cm9kdWNlZCBmZWF0dXJlIG9mIGJyb3dzZXIgZXZlbnQgcHJvY2Vzc2luZzsgc2VlIGFsc28gW0pRdWVyeSBpc3N1ZSAjMjg3MSAqQWRkIHN1cHBvcnQgZm9yIHBhc3NpdmVcbiAgICAgICAgICAgZXZlbnQgbGlzdGVuZXJzKl0oaHR0cHM6Ly9naXRodWIuY29tL2pxdWVyeS9qcXVlcnkvaXNzdWVzLzI4NzEpLCBvcGVuIGFzIG9mIERlYyAyMDIwICovXG4gICAgICAgIHZhbGlkYXRlLmRlbGVtZW50KGVsZW1lbnQpO1xuICAgICAgICB2YWxpZGF0ZS5ub25lbXB0eV90ZXh0KG5hbWUpO1xuICAgICAgICB2YWxpZGF0ZS5mdW5jdGlvbihoYW5kbGVyKTtcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihuYW1lLCBoYW5kbGVyLCBmYWxzZSk7XG4gICAgICB9XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBlbWl0X2N1c3RvbV9ldmVudChuYW1lLCBvcHRpb25zKSB7XG4gICAgICAgIC8vIHRoeCB0byBodHRwczovL3d3dy5qYXZhc2NyaXB0dHV0b3JpYWwubmV0L2phdmFzY3JpcHQtZG9tL2phdmFzY3JpcHQtY3VzdG9tLWV2ZW50cy9cbiAgICAgICAgLyogQWNjLiB0byBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvRXZlbnQvRXZlbnQsXG4gICAgICAgICAgIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9DdXN0b21FdmVudC9DdXN0b21FdmVudCwgYWxsb3dhYmxlIGZpZWxkcyBmb3IgYG9wdGlvbnNgXG4gICAgICAgICAgIGluY2x1ZGUgYGJ1YmJsZXNgLCBgY2FuY2VsYWJsZWAsIGBjb21wb3NlZGAsIGBkZXRhaWxgOyB0aGUgbGFzdCBvbmUgbWF5IGNvbnRhaW4gYXJiaXRyYXJ5IGRhdGEgYW5kIGNhblxuICAgICAgICAgICBiZSByZXRyaWV2ZWQgYXMgYGV2ZW50LmRldGFpbGAuICovXG4gICAgICAgIHZhbGlkYXRlLm5vbmVtcHR5X3RleHQobmFtZSk7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudChuYW1lLCBvcHRpb25zKSk7XG4gICAgICB9XG5cbiAgICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAvLyBEUkFHR0FCTEVTXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgbWFrZV9kcmFnZ2FibGUoZWxlbWVudCkge1xuICAgICAgICB2YXIgaWQsIG9uX2RyYWdfc3RhcnQsIG9uX2Ryb3A7XG4gICAgICAgIC8qIHRoeCB0byBodHRwOi8vanNmaWRkbGUubmV0L3JvYmVydGMva0t1cUgvXG4gICAgICAgICAgIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vYS82MjM5ODgyLzc1NjgwOTEgKi9cbiAgICAgICAgdGhpcy5fYXR0YWNoX2RyYWdvdmVyKCk7XG4gICAgICAgIHRoaXMuX3Bydl9kcmFnZ2FibGVfaWQrKztcbiAgICAgICAgaWQgPSB0aGlzLl9wcnZfZHJhZ2dhYmxlX2lkO1xuICAgICAgICB0aGlzLnNldChlbGVtZW50LCAnZHJhZ2dhYmxlJywgdHJ1ZSk7XG4gICAgICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgICAgICB0aGlzLm9uKGVsZW1lbnQsICdkcmFnc3RhcnQnLCBvbl9kcmFnX3N0YXJ0ID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICB2YXIgc3R5bGUsIHgsIHk7XG4gICAgICAgICAgc3R5bGUgPSDCtS5ET00uZ2V0X2xpdmVfc3R5bGVzKGV2ZW50LnRhcmdldCk7XG4gICAgICAgICAgeCA9IChwYXJzZUludChzdHlsZS5sZWZ0LCAxMCkpIC0gZXZlbnQuY2xpZW50WDtcbiAgICAgICAgICB5ID0gKHBhcnNlSW50KHN0eWxlLnRvcCwgMTApKSAtIGV2ZW50LmNsaWVudFk7XG4gICAgICAgICAgcmV0dXJuIGV2ZW50LmRhdGFUcmFuc2Zlci5zZXREYXRhKCdhcHBsaWNhdGlvbi9qc29uJywgSlNPTi5zdHJpbmdpZnkoe3gsIHksIGlkfSkpO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgICAgIHRoaXMub24oZG9jdW1lbnQuYm9keSwgJ2Ryb3AnLCBvbl9kcm9wID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICB2YXIgbGVmdCwgdG9wLCB0cmFuc2ZlcjtcbiAgICAgICAgICB0cmFuc2ZlciA9IEpTT04ucGFyc2UoZXZlbnQuZGF0YVRyYW5zZmVyLmdldERhdGEoJ2FwcGxpY2F0aW9uL2pzb24nKSk7XG4gICAgICAgICAgaWYgKGlkICE9PSB0cmFuc2Zlci5pZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBsZWZ0ID0gZXZlbnQuY2xpZW50WCArIHRyYW5zZmVyLnggKyAncHgnO1xuICAgICAgICAgIHRvcCA9IGV2ZW50LmNsaWVudFkgKyB0cmFuc2Zlci55ICsgJ3B4JztcbiAgICAgICAgICDCtS5ET00uc2V0X3N0eWxlX3J1bGUoZWxlbWVudCwgJ2xlZnQnLCBsZWZ0KTtcbiAgICAgICAgICDCtS5ET00uc2V0X3N0eWxlX3J1bGUoZWxlbWVudCwgJ3RvcCcsIHRvcCk7XG4gICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBfYXR0YWNoX2RyYWdvdmVyKCkge1xuICAgICAgICB2YXIgb25fZHJhZ292ZXI7XG4gICAgICAgIC8qIFRBSU5UIEFwcGFyZW50bHkgbmVlZCBmb3IgY29ycmVjdCBkcmFnZ2luZyBiZWhhdmlvciwgYnV0IHdoYXQgaWYgd2Ugd2FudGVkIHRvIGhhbmRsZSB0aGlzIGV2ZW50PyAqL1xuICAgICAgICB0aGlzLm9uKGRvY3VtZW50LmJvZHksICdkcmFnb3ZlcicsIG9uX2RyYWdvdmVyID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuX2F0dGFjaF9kcmFnb3ZlciA9IGZ1bmN0aW9uKCkge307XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgfTtcblxuICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgRG9tLnByb3RvdHlwZS5fcHJ2X2RyYWdnYWJsZV9pZCA9IDA7XG5cbiAgICByZXR1cm4gRG9tO1xuXG4gIH0pLmNhbGwodGhpcyk7XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBNQUdJQ1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHRoaXMuX21hZ2ljID0gU3ltYm9sLmZvcignwrVET00nKTtcblxuICB0aGlzLlRFWFQgPSBuZXcgVGV4dCgpO1xuXG4gIHRoaXMuRE9NID0gbmV3IERvbSgpO1xuXG4gIHRoaXMuTElORUZJTkRFUiA9IHJlcXVpcmUoJy4vbGluZWZpbmRlcicpO1xuXG4gIHRoaXMuS0IgPSBuZXcgKHJlcXVpcmUoJy4va2InKSkuS2IoKTtcblxuICAvLyBtb2R1bGUuZXhwb3J0cy5ycHIgICAgID89IG1vZHVsZS5leHBvcnRzLsK1LlRFWFQucnByLmJpbmQoIMK1LlRFWFQgKVxuLy8gbW9kdWxlLmV4cG9ydHMubG9nICAgICA/PSBtb2R1bGUuZXhwb3J0cy7CtS5URVhULmxvZy5iaW5kKCDCtS5URVhUIClcbi8qXG5cbmh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8xMTc5ODgvNzU2ODA5MVxuXG5pbm5lckhUTUwgaXMgcmVtYXJrYWJseSBmYXN0LCBhbmQgaW4gbWFueSBjYXNlcyB5b3Ugd2lsbCBnZXQgdGhlIGJlc3QgcmVzdWx0cyBqdXN0IHNldHRpbmcgdGhhdCAoSSB3b3VsZFxuanVzdCB1c2UgYXBwZW5kKS5cblxuSG93ZXZlciwgaWYgdGhlcmUgaXMgbXVjaCBhbHJlYWR5IGluIFwibXlkaXZcIiB0aGVuIHlvdSBhcmUgZm9yY2luZyB0aGUgYnJvd3NlciB0byBwYXJzZSBhbmQgcmVuZGVyIGFsbCBvZlxudGhhdCBjb250ZW50IGFnYWluIChldmVyeXRoaW5nIHRoYXQgd2FzIHRoZXJlIGJlZm9yZSwgcGx1cyBhbGwgb2YgeW91ciBuZXcgY29udGVudCkuIFlvdSBjYW4gYXZvaWQgdGhpcyBieVxuYXBwZW5kaW5nIGEgZG9jdW1lbnQgZnJhZ21lbnQgb250byBcIm15ZGl2XCIgaW5zdGVhZDpcblxudmFyIGZyYWcgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG5mcmFnLmlubmVySFRNTCA9IGh0bWw7XG4kKFwiI215ZGl2XCIpLmFwcGVuZChmcmFnKTtcbkluIHRoaXMgd2F5LCBvbmx5IHlvdXIgbmV3IGNvbnRlbnQgZ2V0cyBwYXJzZWQgKHVuYXZvaWRhYmxlKSBhbmQgdGhlIGV4aXN0aW5nIGNvbnRlbnQgZG9lcyBub3QuXG5cbkVESVQ6IE15IGJhZC4uLiBJJ3ZlIGRpc2NvdmVyZWQgdGhhdCBpbm5lckhUTUwgaXNuJ3Qgd2VsbCBzdXBwb3J0ZWQgb24gZG9jdW1lbnQgZnJhZ21lbnRzLiBZb3UgY2FuIHVzZSB0aGVcbnNhbWUgdGVjaG5pcXVlIHdpdGggYW55IG5vZGUgdHlwZS4gRm9yIHlvdXIgZXhhbXBsZSwgeW91IGNvdWxkIGNyZWF0ZSB0aGUgcm9vdCB0YWJsZSBub2RlIGFuZCBpbnNlcnQgdGhlXG5pbm5lckhUTUwgaW50byB0aGF0OlxuXG52YXIgZnJhZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RhYmxlJyk7XG5mcmFnLmlubmVySFRNTCA9IHRhYmxlSW5uZXJIdG1sO1xuJChcIiNteWRpdlwiKS5hcHBlbmQoZnJhZyk7XG5cbiovXG5cbn0pLmNhbGwodGhpcyk7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPW1haW4uanMubWFwIl19
