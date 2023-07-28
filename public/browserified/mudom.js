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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy5sb2NhbC9zaGFyZS9wbnBtL2dsb2JhbC81Ly5wbnBtL2Jyb3dzZXItcGFja0A2LjEuMC9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiLi4vLi4vLmxvY2FsL3NoYXJlL3BucG0vZ2xvYmFsLzUvLnBucG0vYXZhaWxhYmxlLXR5cGVkLWFycmF5c0AxLjAuNS8ubG9jYWwvc2hhcmUvcG5wbS9nbG9iYWwvNS8ucG5wbS93aGljaC10eXBlZC1hcnJheUAxLjEuMTEvbm9kZV9tb2R1bGVzL2F2YWlsYWJsZS10eXBlZC1hcnJheXMvaW5kZXguanMiLCIuLi8uLi8ubG9jYWwvc2hhcmUvcG5wbS9nbG9iYWwvNS8ucG5wbS9iYXNlNjQtanNAMS41LjEvbm9kZV9tb2R1bGVzL2Jhc2U2NC1qcy9pbmRleC5qcyIsIi4uLy4uLy5sb2NhbC9zaGFyZS9wbnBtL2dsb2JhbC81Ly5wbnBtL2Jyb3dzZXJpZnlAMTcuMC4wL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L2xpYi9fZW1wdHkuanMiLCIuLi8uLi8ubG9jYWwvc2hhcmUvcG5wbS9nbG9iYWwvNS8ucG5wbS9idWZmZXJANS4yLjEvbm9kZV9tb2R1bGVzL2J1ZmZlci9pbmRleC5qcyIsIi4uLy4uLy5sb2NhbC9zaGFyZS9wbnBtL2dsb2JhbC81Ly5wbnBtL2NhbGwtYmluZEAxLjAuMi9ub2RlX21vZHVsZXMvY2FsbC1iaW5kL2NhbGxCb3VuZC5qcyIsIi4uLy4uLy5sb2NhbC9zaGFyZS9wbnBtL2dsb2JhbC81Ly5wbnBtL2NhbGwtYmluZEAxLjAuMi9ub2RlX21vZHVsZXMvY2FsbC1iaW5kL2luZGV4LmpzIiwiLi4vLi4vLmxvY2FsL3NoYXJlL3BucG0vZ2xvYmFsLzUvLnBucG0vZm9yLWVhY2hAMC4zLjMvbm9kZV9tb2R1bGVzL2Zvci1lYWNoL2luZGV4LmpzIiwiLi4vLi4vLmxvY2FsL3NoYXJlL3BucG0vZ2xvYmFsLzUvLnBucG0vZnVuY3Rpb24tYmluZEAxLjEuMS9ub2RlX21vZHVsZXMvZnVuY3Rpb24tYmluZC9pbXBsZW1lbnRhdGlvbi5qcyIsIi4uLy4uLy5sb2NhbC9zaGFyZS9wbnBtL2dsb2JhbC81Ly5wbnBtL2Z1bmN0aW9uLWJpbmRAMS4xLjEvbm9kZV9tb2R1bGVzL2Z1bmN0aW9uLWJpbmQvaW5kZXguanMiLCIuLi8uLi8ubG9jYWwvc2hhcmUvcG5wbS9nbG9iYWwvNS8ucG5wbS9nZXQtaW50cmluc2ljQDEuMi4wL25vZGVfbW9kdWxlcy9nZXQtaW50cmluc2ljL2luZGV4LmpzIiwiLi4vLi4vLmxvY2FsL3NoYXJlL3BucG0vZ2xvYmFsLzUvLnBucG0vZ29wZEAxLjAuMS9ub2RlX21vZHVsZXMvZ29wZC9pbmRleC5qcyIsIi4uLy4uLy5sb2NhbC9zaGFyZS9wbnBtL2dsb2JhbC81Ly5wbnBtL2hhcy1zeW1ib2xzQDEuMC4zL25vZGVfbW9kdWxlcy9oYXMtc3ltYm9scy9pbmRleC5qcyIsIi4uLy4uLy5sb2NhbC9zaGFyZS9wbnBtL2dsb2JhbC81Ly5wbnBtL2hhcy1zeW1ib2xzQDEuMC4zL25vZGVfbW9kdWxlcy9oYXMtc3ltYm9scy9zaGFtcy5qcyIsIi4uLy4uLy5sb2NhbC9zaGFyZS9wbnBtL2dsb2JhbC81Ly5wbnBtL2hhcy10b3N0cmluZ3RhZ0AxLjAuMC9ub2RlX21vZHVsZXMvaGFzLXRvc3RyaW5ndGFnL3NoYW1zLmpzIiwiLi4vLi4vLmxvY2FsL3NoYXJlL3BucG0vZ2xvYmFsLzUvLnBucG0vaGFzQDEuMC4zL25vZGVfbW9kdWxlcy9oYXMvc3JjL2luZGV4LmpzIiwiLi4vLi4vLmxvY2FsL3NoYXJlL3BucG0vZ2xvYmFsLzUvLnBucG0vaWVlZTc1NEAxLjIuMS9ub2RlX21vZHVsZXMvaWVlZTc1NC9pbmRleC5qcyIsIi4uLy4uLy5sb2NhbC9zaGFyZS9wbnBtL2dsb2JhbC81Ly5wbnBtL2luaGVyaXRzQDIuMC40L25vZGVfbW9kdWxlcy9pbmhlcml0cy9pbmhlcml0c19icm93c2VyLmpzIiwiLi4vLi4vLmxvY2FsL3NoYXJlL3BucG0vZ2xvYmFsLzUvLnBucG0vaXMtYXJndW1lbnRzQDEuMS4xL25vZGVfbW9kdWxlcy9pcy1hcmd1bWVudHMvaW5kZXguanMiLCIuLi8uLi8ubG9jYWwvc2hhcmUvcG5wbS9nbG9iYWwvNS8ucG5wbS9pcy1idWZmZXJAMS4xLjYvbm9kZV9tb2R1bGVzL2lzLWJ1ZmZlci9pbmRleC5qcyIsIi4uLy4uLy5sb2NhbC9zaGFyZS9wbnBtL2dsb2JhbC81Ly5wbnBtL2lzLWNhbGxhYmxlQDEuMi43L25vZGVfbW9kdWxlcy9pcy1jYWxsYWJsZS9pbmRleC5qcyIsIi4uLy4uLy5sb2NhbC9zaGFyZS9wbnBtL2dsb2JhbC81Ly5wbnBtL2lzLWdlbmVyYXRvci1mdW5jdGlvbkAxLjAuMTAvbm9kZV9tb2R1bGVzL2lzLWdlbmVyYXRvci1mdW5jdGlvbi9pbmRleC5qcyIsIi4uLy4uLy5sb2NhbC9zaGFyZS9wbnBtL2dsb2JhbC81Ly5wbnBtL2lzLXR5cGVkLWFycmF5QDEuMS4xMi9ub2RlX21vZHVsZXMvaXMtdHlwZWQtYXJyYXkvaW5kZXguanMiLCIuLi8uLi8ubG9jYWwvc2hhcmUvcG5wbS9nbG9iYWwvNS8ucG5wbS9wYXRoLWJyb3dzZXJpZnlAMS4wLjEvbm9kZV9tb2R1bGVzL3BhdGgtYnJvd3NlcmlmeS9pbmRleC5qcyIsIi4uLy4uLy5sb2NhbC9zaGFyZS9wbnBtL2dsb2JhbC81Ly5wbnBtL3Byb2Nlc3NAMC4xMS4xMC9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiLi4vLi4vLmxvY2FsL3NoYXJlL3BucG0vZ2xvYmFsLzUvLnBucG0vdXRpbEAwLjEyLjUvbm9kZV9tb2R1bGVzL3V0aWwvc3VwcG9ydC9pc0J1ZmZlckJyb3dzZXIuanMiLCIuLi8uLi8ubG9jYWwvc2hhcmUvcG5wbS9nbG9iYWwvNS8ucG5wbS91dGlsQDAuMTIuNS9ub2RlX21vZHVsZXMvdXRpbC9zdXBwb3J0L3R5cGVzLmpzIiwiLi4vLi4vLmxvY2FsL3NoYXJlL3BucG0vZ2xvYmFsLzUvLnBucG0vdXRpbEAwLjEyLjUvbm9kZV9tb2R1bGVzL3V0aWwvdXRpbC5qcyIsIi4uLy4uLy5sb2NhbC9zaGFyZS9wbnBtL2dsb2JhbC81Ly5wbnBtL3doaWNoLXR5cGVkLWFycmF5QDEuMS4xMS8ubG9jYWwvc2hhcmUvcG5wbS9nbG9iYWwvNS8ucG5wbS91dGlsQDAuMTIuNS9ub2RlX21vZHVsZXMvd2hpY2gtdHlwZWQtYXJyYXkvaW5kZXguanMiLCIuLi9tdWRvbS9kZXBzL3RyYXZlcnNlX3V0aWwuanMiLCIuLi9tdWRvbS9saWIva2IuanMiLCIuLi9tdWRvbS9saWIvbGluZWZpbmRlci5qcyIsIi4uL211ZG9tL2xpYi90eXBlcy5qcyIsIi4uL211ZG9tL2xvdXBlLmpzIiwiLi4vbXVkb20vbm9kZV9tb2R1bGVzLy5wbnBtL2ludGVydHlwZUA3LjcuMS9ub2RlX21vZHVsZXMvaW50ZXJ0eXBlL2RlcHMvamtyb3NvLWVxdWFscy5qcyIsIi4uL211ZG9tL25vZGVfbW9kdWxlcy8ucG5wbS9pbnRlcnR5cGVANy43LjEvbm9kZV9tb2R1bGVzL2ludGVydHlwZS9kZXBzL2prcm9zby10eXBlLmpzIiwiLi4vbXVkb20vbm9kZV9tb2R1bGVzLy5wbnBtL2ludGVydHlwZUA3LjcuMS9ub2RlX21vZHVsZXMvaW50ZXJ0eXBlL2RlcHMvbG91cGUuanMiLCIuLi9tdWRvbS9ub2RlX21vZHVsZXMvLnBucG0vaW50ZXJ0eXBlQDcuNy4xL25vZGVfbW9kdWxlcy9pbnRlcnR5cGUvbGliL2NoZWNrcy5qcyIsIi4uL211ZG9tL25vZGVfbW9kdWxlcy8ucG5wbS9pbnRlcnR5cGVANy43LjEvbm9kZV9tb2R1bGVzL2ludGVydHlwZS9saWIvZGVjbGFyYXRpb25zLmpzIiwiLi4vbXVkb20vbm9kZV9tb2R1bGVzLy5wbnBtL2ludGVydHlwZUA3LjcuMS9ub2RlX21vZHVsZXMvaW50ZXJ0eXBlL2xpYi9kZWNsYXJpbmcuanMiLCIuLi9tdWRvbS9ub2RlX21vZHVsZXMvLnBucG0vaW50ZXJ0eXBlQDcuNy4xL25vZGVfbW9kdWxlcy9pbnRlcnR5cGUvbGliL2hlbHBlcnMuanMiLCIuLi9tdWRvbS9ub2RlX21vZHVsZXMvLnBucG0vaW50ZXJ0eXBlQDcuNy4xL25vZGVfbW9kdWxlcy9pbnRlcnR5cGUvbGliL21haW4uanMiLCIuLi9tdWRvbS9ub2RlX21vZHVsZXMvLnBucG0vaW50ZXJ0eXBlQDcuNy4xL25vZGVfbW9kdWxlcy9pbnRlcnR5cGUvbGliL3NpemluZy5qcyIsIi4uL211ZG9tL25vZGVfbW9kdWxlcy8ucG5wbS9tdWx0aW1peEA1LjAuMC9ub2RlX21vZHVsZXMvbXVsdGltaXgvbGliL2NhdGFsb2d1aW5nLmpzIiwiLi4vbXVkb20vbm9kZV9tb2R1bGVzLy5wbnBtL211bHRpbWl4QDUuMC4wL25vZGVfbW9kdWxlcy9tdWx0aW1peC9saWIvbWFpbi5qcyIsIm11ZG9tIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RKQTs7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2p2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDamhCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDOVVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDM3NCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzkyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeGlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMxcUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM1cUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNybUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDMVJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9LQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIid1c2Ugc3RyaWN0JztcblxudmFyIHBvc3NpYmxlTmFtZXMgPSBbXG5cdCdCaWdJbnQ2NEFycmF5Jyxcblx0J0JpZ1VpbnQ2NEFycmF5Jyxcblx0J0Zsb2F0MzJBcnJheScsXG5cdCdGbG9hdDY0QXJyYXknLFxuXHQnSW50MTZBcnJheScsXG5cdCdJbnQzMkFycmF5Jyxcblx0J0ludDhBcnJheScsXG5cdCdVaW50MTZBcnJheScsXG5cdCdVaW50MzJBcnJheScsXG5cdCdVaW50OEFycmF5Jyxcblx0J1VpbnQ4Q2xhbXBlZEFycmF5J1xuXTtcblxudmFyIGcgPSB0eXBlb2YgZ2xvYmFsVGhpcyA9PT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOiBnbG9iYWxUaGlzO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGF2YWlsYWJsZVR5cGVkQXJyYXlzKCkge1xuXHR2YXIgb3V0ID0gW107XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgcG9zc2libGVOYW1lcy5sZW5ndGg7IGkrKykge1xuXHRcdGlmICh0eXBlb2YgZ1twb3NzaWJsZU5hbWVzW2ldXSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0b3V0W291dC5sZW5ndGhdID0gcG9zc2libGVOYW1lc1tpXTtcblx0XHR9XG5cdH1cblx0cmV0dXJuIG91dDtcbn07XG4iLCIndXNlIHN0cmljdCdcblxuZXhwb3J0cy5ieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aFxuZXhwb3J0cy50b0J5dGVBcnJheSA9IHRvQnl0ZUFycmF5XG5leHBvcnRzLmZyb21CeXRlQXJyYXkgPSBmcm9tQnl0ZUFycmF5XG5cbnZhciBsb29rdXAgPSBbXVxudmFyIHJldkxvb2t1cCA9IFtdXG52YXIgQXJyID0gdHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnID8gVWludDhBcnJheSA6IEFycmF5XG5cbnZhciBjb2RlID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8nXG5mb3IgKHZhciBpID0gMCwgbGVuID0gY29kZS5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICBsb29rdXBbaV0gPSBjb2RlW2ldXG4gIHJldkxvb2t1cFtjb2RlLmNoYXJDb2RlQXQoaSldID0gaVxufVxuXG4vLyBTdXBwb3J0IGRlY29kaW5nIFVSTC1zYWZlIGJhc2U2NCBzdHJpbmdzLCBhcyBOb2RlLmpzIGRvZXMuXG4vLyBTZWU6IGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0Jhc2U2NCNVUkxfYXBwbGljYXRpb25zXG5yZXZMb29rdXBbJy0nLmNoYXJDb2RlQXQoMCldID0gNjJcbnJldkxvb2t1cFsnXycuY2hhckNvZGVBdCgwKV0gPSA2M1xuXG5mdW5jdGlvbiBnZXRMZW5zIChiNjQpIHtcbiAgdmFyIGxlbiA9IGI2NC5sZW5ndGhcblxuICBpZiAobGVuICUgNCA+IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgc3RyaW5nLiBMZW5ndGggbXVzdCBiZSBhIG11bHRpcGxlIG9mIDQnKVxuICB9XG5cbiAgLy8gVHJpbSBvZmYgZXh0cmEgYnl0ZXMgYWZ0ZXIgcGxhY2Vob2xkZXIgYnl0ZXMgYXJlIGZvdW5kXG4gIC8vIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2JlYXRnYW1taXQvYmFzZTY0LWpzL2lzc3Vlcy80MlxuICB2YXIgdmFsaWRMZW4gPSBiNjQuaW5kZXhPZignPScpXG4gIGlmICh2YWxpZExlbiA9PT0gLTEpIHZhbGlkTGVuID0gbGVuXG5cbiAgdmFyIHBsYWNlSG9sZGVyc0xlbiA9IHZhbGlkTGVuID09PSBsZW5cbiAgICA/IDBcbiAgICA6IDQgLSAodmFsaWRMZW4gJSA0KVxuXG4gIHJldHVybiBbdmFsaWRMZW4sIHBsYWNlSG9sZGVyc0xlbl1cbn1cblxuLy8gYmFzZTY0IGlzIDQvMyArIHVwIHRvIHR3byBjaGFyYWN0ZXJzIG9mIHRoZSBvcmlnaW5hbCBkYXRhXG5mdW5jdGlvbiBieXRlTGVuZ3RoIChiNjQpIHtcbiAgdmFyIGxlbnMgPSBnZXRMZW5zKGI2NClcbiAgdmFyIHZhbGlkTGVuID0gbGVuc1swXVxuICB2YXIgcGxhY2VIb2xkZXJzTGVuID0gbGVuc1sxXVxuICByZXR1cm4gKCh2YWxpZExlbiArIHBsYWNlSG9sZGVyc0xlbikgKiAzIC8gNCkgLSBwbGFjZUhvbGRlcnNMZW5cbn1cblxuZnVuY3Rpb24gX2J5dGVMZW5ndGggKGI2NCwgdmFsaWRMZW4sIHBsYWNlSG9sZGVyc0xlbikge1xuICByZXR1cm4gKCh2YWxpZExlbiArIHBsYWNlSG9sZGVyc0xlbikgKiAzIC8gNCkgLSBwbGFjZUhvbGRlcnNMZW5cbn1cblxuZnVuY3Rpb24gdG9CeXRlQXJyYXkgKGI2NCkge1xuICB2YXIgdG1wXG4gIHZhciBsZW5zID0gZ2V0TGVucyhiNjQpXG4gIHZhciB2YWxpZExlbiA9IGxlbnNbMF1cbiAgdmFyIHBsYWNlSG9sZGVyc0xlbiA9IGxlbnNbMV1cblxuICB2YXIgYXJyID0gbmV3IEFycihfYnl0ZUxlbmd0aChiNjQsIHZhbGlkTGVuLCBwbGFjZUhvbGRlcnNMZW4pKVxuXG4gIHZhciBjdXJCeXRlID0gMFxuXG4gIC8vIGlmIHRoZXJlIGFyZSBwbGFjZWhvbGRlcnMsIG9ubHkgZ2V0IHVwIHRvIHRoZSBsYXN0IGNvbXBsZXRlIDQgY2hhcnNcbiAgdmFyIGxlbiA9IHBsYWNlSG9sZGVyc0xlbiA+IDBcbiAgICA/IHZhbGlkTGVuIC0gNFxuICAgIDogdmFsaWRMZW5cblxuICB2YXIgaVxuICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpICs9IDQpIHtcbiAgICB0bXAgPVxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMTgpIHxcbiAgICAgIChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDEpXSA8PCAxMikgfFxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMildIDw8IDYpIHxcbiAgICAgIHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMyldXG4gICAgYXJyW2N1ckJ5dGUrK10gPSAodG1wID4+IDE2KSAmIDB4RkZcbiAgICBhcnJbY3VyQnl0ZSsrXSA9ICh0bXAgPj4gOCkgJiAweEZGXG4gICAgYXJyW2N1ckJ5dGUrK10gPSB0bXAgJiAweEZGXG4gIH1cblxuICBpZiAocGxhY2VIb2xkZXJzTGVuID09PSAyKSB7XG4gICAgdG1wID1cbiAgICAgIChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDIpIHxcbiAgICAgIChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDEpXSA+PiA0KVxuICAgIGFycltjdXJCeXRlKytdID0gdG1wICYgMHhGRlxuICB9XG5cbiAgaWYgKHBsYWNlSG9sZGVyc0xlbiA9PT0gMSkge1xuICAgIHRtcCA9XG4gICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkpXSA8PCAxMCkgfFxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldIDw8IDQpIHxcbiAgICAgIChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDIpXSA+PiAyKVxuICAgIGFycltjdXJCeXRlKytdID0gKHRtcCA+PiA4KSAmIDB4RkZcbiAgICBhcnJbY3VyQnl0ZSsrXSA9IHRtcCAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBhcnJcbn1cblxuZnVuY3Rpb24gdHJpcGxldFRvQmFzZTY0IChudW0pIHtcbiAgcmV0dXJuIGxvb2t1cFtudW0gPj4gMTggJiAweDNGXSArXG4gICAgbG9va3VwW251bSA+PiAxMiAmIDB4M0ZdICtcbiAgICBsb29rdXBbbnVtID4+IDYgJiAweDNGXSArXG4gICAgbG9va3VwW251bSAmIDB4M0ZdXG59XG5cbmZ1bmN0aW9uIGVuY29kZUNodW5rICh1aW50OCwgc3RhcnQsIGVuZCkge1xuICB2YXIgdG1wXG4gIHZhciBvdXRwdXQgPSBbXVxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkgKz0gMykge1xuICAgIHRtcCA9XG4gICAgICAoKHVpbnQ4W2ldIDw8IDE2KSAmIDB4RkYwMDAwKSArXG4gICAgICAoKHVpbnQ4W2kgKyAxXSA8PCA4KSAmIDB4RkYwMCkgK1xuICAgICAgKHVpbnQ4W2kgKyAyXSAmIDB4RkYpXG4gICAgb3V0cHV0LnB1c2godHJpcGxldFRvQmFzZTY0KHRtcCkpXG4gIH1cbiAgcmV0dXJuIG91dHB1dC5qb2luKCcnKVxufVxuXG5mdW5jdGlvbiBmcm9tQnl0ZUFycmF5ICh1aW50OCkge1xuICB2YXIgdG1wXG4gIHZhciBsZW4gPSB1aW50OC5sZW5ndGhcbiAgdmFyIGV4dHJhQnl0ZXMgPSBsZW4gJSAzIC8vIGlmIHdlIGhhdmUgMSBieXRlIGxlZnQsIHBhZCAyIGJ5dGVzXG4gIHZhciBwYXJ0cyA9IFtdXG4gIHZhciBtYXhDaHVua0xlbmd0aCA9IDE2MzgzIC8vIG11c3QgYmUgbXVsdGlwbGUgb2YgM1xuXG4gIC8vIGdvIHRocm91Z2ggdGhlIGFycmF5IGV2ZXJ5IHRocmVlIGJ5dGVzLCB3ZSdsbCBkZWFsIHdpdGggdHJhaWxpbmcgc3R1ZmYgbGF0ZXJcbiAgZm9yICh2YXIgaSA9IDAsIGxlbjIgPSBsZW4gLSBleHRyYUJ5dGVzOyBpIDwgbGVuMjsgaSArPSBtYXhDaHVua0xlbmd0aCkge1xuICAgIHBhcnRzLnB1c2goZW5jb2RlQ2h1bmsodWludDgsIGksIChpICsgbWF4Q2h1bmtMZW5ndGgpID4gbGVuMiA/IGxlbjIgOiAoaSArIG1heENodW5rTGVuZ3RoKSkpXG4gIH1cblxuICAvLyBwYWQgdGhlIGVuZCB3aXRoIHplcm9zLCBidXQgbWFrZSBzdXJlIHRvIG5vdCBmb3JnZXQgdGhlIGV4dHJhIGJ5dGVzXG4gIGlmIChleHRyYUJ5dGVzID09PSAxKSB7XG4gICAgdG1wID0gdWludDhbbGVuIC0gMV1cbiAgICBwYXJ0cy5wdXNoKFxuICAgICAgbG9va3VwW3RtcCA+PiAyXSArXG4gICAgICBsb29rdXBbKHRtcCA8PCA0KSAmIDB4M0ZdICtcbiAgICAgICc9PSdcbiAgICApXG4gIH0gZWxzZSBpZiAoZXh0cmFCeXRlcyA9PT0gMikge1xuICAgIHRtcCA9ICh1aW50OFtsZW4gLSAyXSA8PCA4KSArIHVpbnQ4W2xlbiAtIDFdXG4gICAgcGFydHMucHVzaChcbiAgICAgIGxvb2t1cFt0bXAgPj4gMTBdICtcbiAgICAgIGxvb2t1cFsodG1wID4+IDQpICYgMHgzRl0gK1xuICAgICAgbG9va3VwWyh0bXAgPDwgMikgJiAweDNGXSArXG4gICAgICAnPSdcbiAgICApXG4gIH1cblxuICByZXR1cm4gcGFydHMuam9pbignJylcbn1cbiIsIiIsIi8qIVxuICogVGhlIGJ1ZmZlciBtb2R1bGUgZnJvbSBub2RlLmpzLCBmb3IgdGhlIGJyb3dzZXIuXG4gKlxuICogQGF1dGhvciAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGh0dHBzOi8vZmVyb3NzLm9yZz5cbiAqIEBsaWNlbnNlICBNSVRcbiAqL1xuLyogZXNsaW50LWRpc2FibGUgbm8tcHJvdG8gKi9cblxuJ3VzZSBzdHJpY3QnXG5cbnZhciBiYXNlNjQgPSByZXF1aXJlKCdiYXNlNjQtanMnKVxudmFyIGllZWU3NTQgPSByZXF1aXJlKCdpZWVlNzU0JylcblxuZXhwb3J0cy5CdWZmZXIgPSBCdWZmZXJcbmV4cG9ydHMuU2xvd0J1ZmZlciA9IFNsb3dCdWZmZXJcbmV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVMgPSA1MFxuXG52YXIgS19NQVhfTEVOR1RIID0gMHg3ZmZmZmZmZlxuZXhwb3J0cy5rTWF4TGVuZ3RoID0gS19NQVhfTEVOR1RIXG5cbi8qKlxuICogSWYgYEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUYDpcbiAqICAgPT09IHRydWUgICAgVXNlIFVpbnQ4QXJyYXkgaW1wbGVtZW50YXRpb24gKGZhc3Rlc3QpXG4gKiAgID09PSBmYWxzZSAgIFByaW50IHdhcm5pbmcgYW5kIHJlY29tbWVuZCB1c2luZyBgYnVmZmVyYCB2NC54IHdoaWNoIGhhcyBhbiBPYmplY3RcbiAqICAgICAgICAgICAgICAgaW1wbGVtZW50YXRpb24gKG1vc3QgY29tcGF0aWJsZSwgZXZlbiBJRTYpXG4gKlxuICogQnJvd3NlcnMgdGhhdCBzdXBwb3J0IHR5cGVkIGFycmF5cyBhcmUgSUUgMTArLCBGaXJlZm94IDQrLCBDaHJvbWUgNyssIFNhZmFyaSA1LjErLFxuICogT3BlcmEgMTEuNissIGlPUyA0LjIrLlxuICpcbiAqIFdlIHJlcG9ydCB0aGF0IHRoZSBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgdHlwZWQgYXJyYXlzIGlmIHRoZSBhcmUgbm90IHN1YmNsYXNzYWJsZVxuICogdXNpbmcgX19wcm90b19fLiBGaXJlZm94IDQtMjkgbGFja3Mgc3VwcG9ydCBmb3IgYWRkaW5nIG5ldyBwcm9wZXJ0aWVzIHRvIGBVaW50OEFycmF5YFxuICogKFNlZTogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9Njk1NDM4KS4gSUUgMTAgbGFja3Mgc3VwcG9ydFxuICogZm9yIF9fcHJvdG9fXyBhbmQgaGFzIGEgYnVnZ3kgdHlwZWQgYXJyYXkgaW1wbGVtZW50YXRpb24uXG4gKi9cbkJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUID0gdHlwZWRBcnJheVN1cHBvcnQoKVxuXG5pZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUICYmIHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJlxuICAgIHR5cGVvZiBjb25zb2xlLmVycm9yID09PSAnZnVuY3Rpb24nKSB7XG4gIGNvbnNvbGUuZXJyb3IoXG4gICAgJ1RoaXMgYnJvd3NlciBsYWNrcyB0eXBlZCBhcnJheSAoVWludDhBcnJheSkgc3VwcG9ydCB3aGljaCBpcyByZXF1aXJlZCBieSAnICtcbiAgICAnYGJ1ZmZlcmAgdjUueC4gVXNlIGBidWZmZXJgIHY0LnggaWYgeW91IHJlcXVpcmUgb2xkIGJyb3dzZXIgc3VwcG9ydC4nXG4gIClcbn1cblxuZnVuY3Rpb24gdHlwZWRBcnJheVN1cHBvcnQgKCkge1xuICAvLyBDYW4gdHlwZWQgYXJyYXkgaW5zdGFuY2VzIGNhbiBiZSBhdWdtZW50ZWQ/XG4gIHRyeSB7XG4gICAgdmFyIGFyciA9IG5ldyBVaW50OEFycmF5KDEpXG4gICAgYXJyLl9fcHJvdG9fXyA9IHsgX19wcm90b19fOiBVaW50OEFycmF5LnByb3RvdHlwZSwgZm9vOiBmdW5jdGlvbiAoKSB7IHJldHVybiA0MiB9IH1cbiAgICByZXR1cm4gYXJyLmZvbygpID09PSA0MlxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlci5wcm90b3R5cGUsICdwYXJlbnQnLCB7XG4gIGVudW1lcmFibGU6IHRydWUsXG4gIGdldDogZnVuY3Rpb24gKCkge1xuICAgIGlmICghQnVmZmVyLmlzQnVmZmVyKHRoaXMpKSByZXR1cm4gdW5kZWZpbmVkXG4gICAgcmV0dXJuIHRoaXMuYnVmZmVyXG4gIH1cbn0pXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXIucHJvdG90eXBlLCAnb2Zmc2V0Jywge1xuICBlbnVtZXJhYmxlOiB0cnVlLFxuICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcih0aGlzKSkgcmV0dXJuIHVuZGVmaW5lZFxuICAgIHJldHVybiB0aGlzLmJ5dGVPZmZzZXRcbiAgfVxufSlcblxuZnVuY3Rpb24gY3JlYXRlQnVmZmVyIChsZW5ndGgpIHtcbiAgaWYgKGxlbmd0aCA+IEtfTUFYX0xFTkdUSCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdUaGUgdmFsdWUgXCInICsgbGVuZ3RoICsgJ1wiIGlzIGludmFsaWQgZm9yIG9wdGlvbiBcInNpemVcIicpXG4gIH1cbiAgLy8gUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAgdmFyIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGxlbmd0aClcbiAgYnVmLl9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgcmV0dXJuIGJ1ZlxufVxuXG4vKipcbiAqIFRoZSBCdWZmZXIgY29uc3RydWN0b3IgcmV0dXJucyBpbnN0YW5jZXMgb2YgYFVpbnQ4QXJyYXlgIHRoYXQgaGF2ZSB0aGVpclxuICogcHJvdG90eXBlIGNoYW5nZWQgdG8gYEJ1ZmZlci5wcm90b3R5cGVgLiBGdXJ0aGVybW9yZSwgYEJ1ZmZlcmAgaXMgYSBzdWJjbGFzcyBvZlxuICogYFVpbnQ4QXJyYXlgLCBzbyB0aGUgcmV0dXJuZWQgaW5zdGFuY2VzIHdpbGwgaGF2ZSBhbGwgdGhlIG5vZGUgYEJ1ZmZlcmAgbWV0aG9kc1xuICogYW5kIHRoZSBgVWludDhBcnJheWAgbWV0aG9kcy4gU3F1YXJlIGJyYWNrZXQgbm90YXRpb24gd29ya3MgYXMgZXhwZWN0ZWQgLS0gaXRcbiAqIHJldHVybnMgYSBzaW5nbGUgb2N0ZXQuXG4gKlxuICogVGhlIGBVaW50OEFycmF5YCBwcm90b3R5cGUgcmVtYWlucyB1bm1vZGlmaWVkLlxuICovXG5cbmZ1bmN0aW9uIEJ1ZmZlciAoYXJnLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpIHtcbiAgLy8gQ29tbW9uIGNhc2UuXG4gIGlmICh0eXBlb2YgYXJnID09PSAnbnVtYmVyJykge1xuICAgIGlmICh0eXBlb2YgZW5jb2RpbmdPck9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICdUaGUgXCJzdHJpbmdcIiBhcmd1bWVudCBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLiBSZWNlaXZlZCB0eXBlIG51bWJlcidcbiAgICAgIClcbiAgICB9XG4gICAgcmV0dXJuIGFsbG9jVW5zYWZlKGFyZylcbiAgfVxuICByZXR1cm4gZnJvbShhcmcsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbn1cblxuLy8gRml4IHN1YmFycmF5KCkgaW4gRVMyMDE2LiBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL3B1bGwvOTdcbmlmICh0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wuc3BlY2llcyAhPSBudWxsICYmXG4gICAgQnVmZmVyW1N5bWJvbC5zcGVjaWVzXSA9PT0gQnVmZmVyKSB7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXIsIFN5bWJvbC5zcGVjaWVzLCB7XG4gICAgdmFsdWU6IG51bGwsXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgIHdyaXRhYmxlOiBmYWxzZVxuICB9KVxufVxuXG5CdWZmZXIucG9vbFNpemUgPSA4MTkyIC8vIG5vdCB1c2VkIGJ5IHRoaXMgaW1wbGVtZW50YXRpb25cblxuZnVuY3Rpb24gZnJvbSAodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBmcm9tU3RyaW5nKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0KVxuICB9XG5cbiAgaWYgKEFycmF5QnVmZmVyLmlzVmlldyh2YWx1ZSkpIHtcbiAgICByZXR1cm4gZnJvbUFycmF5TGlrZSh2YWx1ZSlcbiAgfVxuXG4gIGlmICh2YWx1ZSA9PSBudWxsKSB7XG4gICAgdGhyb3cgVHlwZUVycm9yKFxuICAgICAgJ1RoZSBmaXJzdCBhcmd1bWVudCBtdXN0IGJlIG9uZSBvZiB0eXBlIHN0cmluZywgQnVmZmVyLCBBcnJheUJ1ZmZlciwgQXJyYXksICcgK1xuICAgICAgJ29yIEFycmF5LWxpa2UgT2JqZWN0LiBSZWNlaXZlZCB0eXBlICcgKyAodHlwZW9mIHZhbHVlKVxuICAgIClcbiAgfVxuXG4gIGlmIChpc0luc3RhbmNlKHZhbHVlLCBBcnJheUJ1ZmZlcikgfHxcbiAgICAgICh2YWx1ZSAmJiBpc0luc3RhbmNlKHZhbHVlLmJ1ZmZlciwgQXJyYXlCdWZmZXIpKSkge1xuICAgIHJldHVybiBmcm9tQXJyYXlCdWZmZXIodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbiAgfVxuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICdUaGUgXCJ2YWx1ZVwiIGFyZ3VtZW50IG11c3Qgbm90IGJlIG9mIHR5cGUgbnVtYmVyLiBSZWNlaXZlZCB0eXBlIG51bWJlcidcbiAgICApXG4gIH1cblxuICB2YXIgdmFsdWVPZiA9IHZhbHVlLnZhbHVlT2YgJiYgdmFsdWUudmFsdWVPZigpXG4gIGlmICh2YWx1ZU9mICE9IG51bGwgJiYgdmFsdWVPZiAhPT0gdmFsdWUpIHtcbiAgICByZXR1cm4gQnVmZmVyLmZyb20odmFsdWVPZiwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxuICB9XG5cbiAgdmFyIGIgPSBmcm9tT2JqZWN0KHZhbHVlKVxuICBpZiAoYikgcmV0dXJuIGJcblxuICBpZiAodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvUHJpbWl0aXZlICE9IG51bGwgJiZcbiAgICAgIHR5cGVvZiB2YWx1ZVtTeW1ib2wudG9QcmltaXRpdmVdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIEJ1ZmZlci5mcm9tKFxuICAgICAgdmFsdWVbU3ltYm9sLnRvUHJpbWl0aXZlXSgnc3RyaW5nJyksIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aFxuICAgIClcbiAgfVxuXG4gIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgJ1RoZSBmaXJzdCBhcmd1bWVudCBtdXN0IGJlIG9uZSBvZiB0eXBlIHN0cmluZywgQnVmZmVyLCBBcnJheUJ1ZmZlciwgQXJyYXksICcgK1xuICAgICdvciBBcnJheS1saWtlIE9iamVjdC4gUmVjZWl2ZWQgdHlwZSAnICsgKHR5cGVvZiB2YWx1ZSlcbiAgKVxufVxuXG4vKipcbiAqIEZ1bmN0aW9uYWxseSBlcXVpdmFsZW50IHRvIEJ1ZmZlcihhcmcsIGVuY29kaW5nKSBidXQgdGhyb3dzIGEgVHlwZUVycm9yXG4gKiBpZiB2YWx1ZSBpcyBhIG51bWJlci5cbiAqIEJ1ZmZlci5mcm9tKHN0clssIGVuY29kaW5nXSlcbiAqIEJ1ZmZlci5mcm9tKGFycmF5KVxuICogQnVmZmVyLmZyb20oYnVmZmVyKVxuICogQnVmZmVyLmZyb20oYXJyYXlCdWZmZXJbLCBieXRlT2Zmc2V0WywgbGVuZ3RoXV0pXG4gKiovXG5CdWZmZXIuZnJvbSA9IGZ1bmN0aW9uICh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBmcm9tKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG59XG5cbi8vIE5vdGU6IENoYW5nZSBwcm90b3R5cGUgKmFmdGVyKiBCdWZmZXIuZnJvbSBpcyBkZWZpbmVkIHRvIHdvcmthcm91bmQgQ2hyb21lIGJ1Zzpcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL3B1bGwvMTQ4XG5CdWZmZXIucHJvdG90eXBlLl9fcHJvdG9fXyA9IFVpbnQ4QXJyYXkucHJvdG90eXBlXG5CdWZmZXIuX19wcm90b19fID0gVWludDhBcnJheVxuXG5mdW5jdGlvbiBhc3NlcnRTaXplIChzaXplKSB7XG4gIGlmICh0eXBlb2Ygc2l6ZSAhPT0gJ251bWJlcicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcInNpemVcIiBhcmd1bWVudCBtdXN0IGJlIG9mIHR5cGUgbnVtYmVyJylcbiAgfSBlbHNlIGlmIChzaXplIDwgMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdUaGUgdmFsdWUgXCInICsgc2l6ZSArICdcIiBpcyBpbnZhbGlkIGZvciBvcHRpb24gXCJzaXplXCInKVxuICB9XG59XG5cbmZ1bmN0aW9uIGFsbG9jIChzaXplLCBmaWxsLCBlbmNvZGluZykge1xuICBhc3NlcnRTaXplKHNpemUpXG4gIGlmIChzaXplIDw9IDApIHtcbiAgICByZXR1cm4gY3JlYXRlQnVmZmVyKHNpemUpXG4gIH1cbiAgaWYgKGZpbGwgIT09IHVuZGVmaW5lZCkge1xuICAgIC8vIE9ubHkgcGF5IGF0dGVudGlvbiB0byBlbmNvZGluZyBpZiBpdCdzIGEgc3RyaW5nLiBUaGlzXG4gICAgLy8gcHJldmVudHMgYWNjaWRlbnRhbGx5IHNlbmRpbmcgaW4gYSBudW1iZXIgdGhhdCB3b3VsZFxuICAgIC8vIGJlIGludGVycHJldHRlZCBhcyBhIHN0YXJ0IG9mZnNldC5cbiAgICByZXR1cm4gdHlwZW9mIGVuY29kaW5nID09PSAnc3RyaW5nJ1xuICAgICAgPyBjcmVhdGVCdWZmZXIoc2l6ZSkuZmlsbChmaWxsLCBlbmNvZGluZylcbiAgICAgIDogY3JlYXRlQnVmZmVyKHNpemUpLmZpbGwoZmlsbClcbiAgfVxuICByZXR1cm4gY3JlYXRlQnVmZmVyKHNpemUpXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBmaWxsZWQgQnVmZmVyIGluc3RhbmNlLlxuICogYWxsb2Moc2l6ZVssIGZpbGxbLCBlbmNvZGluZ11dKVxuICoqL1xuQnVmZmVyLmFsbG9jID0gZnVuY3Rpb24gKHNpemUsIGZpbGwsIGVuY29kaW5nKSB7XG4gIHJldHVybiBhbGxvYyhzaXplLCBmaWxsLCBlbmNvZGluZylcbn1cblxuZnVuY3Rpb24gYWxsb2NVbnNhZmUgKHNpemUpIHtcbiAgYXNzZXJ0U2l6ZShzaXplKVxuICByZXR1cm4gY3JlYXRlQnVmZmVyKHNpemUgPCAwID8gMCA6IGNoZWNrZWQoc2l6ZSkgfCAwKVxufVxuXG4vKipcbiAqIEVxdWl2YWxlbnQgdG8gQnVmZmVyKG51bSksIGJ5IGRlZmF1bHQgY3JlYXRlcyBhIG5vbi16ZXJvLWZpbGxlZCBCdWZmZXIgaW5zdGFuY2UuXG4gKiAqL1xuQnVmZmVyLmFsbG9jVW5zYWZlID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgcmV0dXJuIGFsbG9jVW5zYWZlKHNpemUpXG59XG4vKipcbiAqIEVxdWl2YWxlbnQgdG8gU2xvd0J1ZmZlcihudW0pLCBieSBkZWZhdWx0IGNyZWF0ZXMgYSBub24temVyby1maWxsZWQgQnVmZmVyIGluc3RhbmNlLlxuICovXG5CdWZmZXIuYWxsb2NVbnNhZmVTbG93ID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgcmV0dXJuIGFsbG9jVW5zYWZlKHNpemUpXG59XG5cbmZ1bmN0aW9uIGZyb21TdHJpbmcgKHN0cmluZywgZW5jb2RpbmcpIHtcbiAgaWYgKHR5cGVvZiBlbmNvZGluZyAhPT0gJ3N0cmluZycgfHwgZW5jb2RpbmcgPT09ICcnKSB7XG4gICAgZW5jb2RpbmcgPSAndXRmOCdcbiAgfVxuXG4gIGlmICghQnVmZmVyLmlzRW5jb2RpbmcoZW5jb2RpbmcpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICB9XG5cbiAgdmFyIGxlbmd0aCA9IGJ5dGVMZW5ndGgoc3RyaW5nLCBlbmNvZGluZykgfCAwXG4gIHZhciBidWYgPSBjcmVhdGVCdWZmZXIobGVuZ3RoKVxuXG4gIHZhciBhY3R1YWwgPSBidWYud3JpdGUoc3RyaW5nLCBlbmNvZGluZylcblxuICBpZiAoYWN0dWFsICE9PSBsZW5ndGgpIHtcbiAgICAvLyBXcml0aW5nIGEgaGV4IHN0cmluZywgZm9yIGV4YW1wbGUsIHRoYXQgY29udGFpbnMgaW52YWxpZCBjaGFyYWN0ZXJzIHdpbGxcbiAgICAvLyBjYXVzZSBldmVyeXRoaW5nIGFmdGVyIHRoZSBmaXJzdCBpbnZhbGlkIGNoYXJhY3RlciB0byBiZSBpZ25vcmVkLiAoZS5nLlxuICAgIC8vICdhYnh4Y2QnIHdpbGwgYmUgdHJlYXRlZCBhcyAnYWInKVxuICAgIGJ1ZiA9IGJ1Zi5zbGljZSgwLCBhY3R1YWwpXG4gIH1cblxuICByZXR1cm4gYnVmXG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheUxpa2UgKGFycmF5KSB7XG4gIHZhciBsZW5ndGggPSBhcnJheS5sZW5ndGggPCAwID8gMCA6IGNoZWNrZWQoYXJyYXkubGVuZ3RoKSB8IDBcbiAgdmFyIGJ1ZiA9IGNyZWF0ZUJ1ZmZlcihsZW5ndGgpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpICs9IDEpIHtcbiAgICBidWZbaV0gPSBhcnJheVtpXSAmIDI1NVxuICB9XG4gIHJldHVybiBidWZcbn1cblxuZnVuY3Rpb24gZnJvbUFycmF5QnVmZmVyIChhcnJheSwgYnl0ZU9mZnNldCwgbGVuZ3RoKSB7XG4gIGlmIChieXRlT2Zmc2V0IDwgMCB8fCBhcnJheS5ieXRlTGVuZ3RoIDwgYnl0ZU9mZnNldCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdcIm9mZnNldFwiIGlzIG91dHNpZGUgb2YgYnVmZmVyIGJvdW5kcycpXG4gIH1cblxuICBpZiAoYXJyYXkuYnl0ZUxlbmd0aCA8IGJ5dGVPZmZzZXQgKyAobGVuZ3RoIHx8IDApKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1wibGVuZ3RoXCIgaXMgb3V0c2lkZSBvZiBidWZmZXIgYm91bmRzJylcbiAgfVxuXG4gIHZhciBidWZcbiAgaWYgKGJ5dGVPZmZzZXQgPT09IHVuZGVmaW5lZCAmJiBsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGFycmF5KVxuICB9IGVsc2UgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgYnVmID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXksIGJ5dGVPZmZzZXQpXG4gIH0gZWxzZSB7XG4gICAgYnVmID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXksIGJ5dGVPZmZzZXQsIGxlbmd0aClcbiAgfVxuXG4gIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gIGJ1Zi5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIHJldHVybiBidWZcbn1cblxuZnVuY3Rpb24gZnJvbU9iamVjdCAob2JqKSB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIob2JqKSkge1xuICAgIHZhciBsZW4gPSBjaGVja2VkKG9iai5sZW5ndGgpIHwgMFxuICAgIHZhciBidWYgPSBjcmVhdGVCdWZmZXIobGVuKVxuXG4gICAgaWYgKGJ1Zi5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBidWZcbiAgICB9XG5cbiAgICBvYmouY29weShidWYsIDAsIDAsIGxlbilcbiAgICByZXR1cm4gYnVmXG4gIH1cblxuICBpZiAob2JqLmxlbmd0aCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKHR5cGVvZiBvYmoubGVuZ3RoICE9PSAnbnVtYmVyJyB8fCBudW1iZXJJc05hTihvYmoubGVuZ3RoKSkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcigwKVxuICAgIH1cbiAgICByZXR1cm4gZnJvbUFycmF5TGlrZShvYmopXG4gIH1cblxuICBpZiAob2JqLnR5cGUgPT09ICdCdWZmZXInICYmIEFycmF5LmlzQXJyYXkob2JqLmRhdGEpKSB7XG4gICAgcmV0dXJuIGZyb21BcnJheUxpa2Uob2JqLmRhdGEpXG4gIH1cbn1cblxuZnVuY3Rpb24gY2hlY2tlZCAobGVuZ3RoKSB7XG4gIC8vIE5vdGU6IGNhbm5vdCB1c2UgYGxlbmd0aCA8IEtfTUFYX0xFTkdUSGAgaGVyZSBiZWNhdXNlIHRoYXQgZmFpbHMgd2hlblxuICAvLyBsZW5ndGggaXMgTmFOICh3aGljaCBpcyBvdGhlcndpc2UgY29lcmNlZCB0byB6ZXJvLilcbiAgaWYgKGxlbmd0aCA+PSBLX01BWF9MRU5HVEgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQXR0ZW1wdCB0byBhbGxvY2F0ZSBCdWZmZXIgbGFyZ2VyIHRoYW4gbWF4aW11bSAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAnc2l6ZTogMHgnICsgS19NQVhfTEVOR1RILnRvU3RyaW5nKDE2KSArICcgYnl0ZXMnKVxuICB9XG4gIHJldHVybiBsZW5ndGggfCAwXG59XG5cbmZ1bmN0aW9uIFNsb3dCdWZmZXIgKGxlbmd0aCkge1xuICBpZiAoK2xlbmd0aCAhPSBsZW5ndGgpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBlcWVxZXFcbiAgICBsZW5ndGggPSAwXG4gIH1cbiAgcmV0dXJuIEJ1ZmZlci5hbGxvYygrbGVuZ3RoKVxufVxuXG5CdWZmZXIuaXNCdWZmZXIgPSBmdW5jdGlvbiBpc0J1ZmZlciAoYikge1xuICByZXR1cm4gYiAhPSBudWxsICYmIGIuX2lzQnVmZmVyID09PSB0cnVlICYmXG4gICAgYiAhPT0gQnVmZmVyLnByb3RvdHlwZSAvLyBzbyBCdWZmZXIuaXNCdWZmZXIoQnVmZmVyLnByb3RvdHlwZSkgd2lsbCBiZSBmYWxzZVxufVxuXG5CdWZmZXIuY29tcGFyZSA9IGZ1bmN0aW9uIGNvbXBhcmUgKGEsIGIpIHtcbiAgaWYgKGlzSW5zdGFuY2UoYSwgVWludDhBcnJheSkpIGEgPSBCdWZmZXIuZnJvbShhLCBhLm9mZnNldCwgYS5ieXRlTGVuZ3RoKVxuICBpZiAoaXNJbnN0YW5jZShiLCBVaW50OEFycmF5KSkgYiA9IEJ1ZmZlci5mcm9tKGIsIGIub2Zmc2V0LCBiLmJ5dGVMZW5ndGgpXG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGEpIHx8ICFCdWZmZXIuaXNCdWZmZXIoYikpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgJ1RoZSBcImJ1ZjFcIiwgXCJidWYyXCIgYXJndW1lbnRzIG11c3QgYmUgb25lIG9mIHR5cGUgQnVmZmVyIG9yIFVpbnQ4QXJyYXknXG4gICAgKVxuICB9XG5cbiAgaWYgKGEgPT09IGIpIHJldHVybiAwXG5cbiAgdmFyIHggPSBhLmxlbmd0aFxuICB2YXIgeSA9IGIubGVuZ3RoXG5cbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IE1hdGgubWluKHgsIHkpOyBpIDwgbGVuOyArK2kpIHtcbiAgICBpZiAoYVtpXSAhPT0gYltpXSkge1xuICAgICAgeCA9IGFbaV1cbiAgICAgIHkgPSBiW2ldXG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIGlmICh4IDwgeSkgcmV0dXJuIC0xXG4gIGlmICh5IDwgeCkgcmV0dXJuIDFcbiAgcmV0dXJuIDBcbn1cblxuQnVmZmVyLmlzRW5jb2RpbmcgPSBmdW5jdGlvbiBpc0VuY29kaW5nIChlbmNvZGluZykge1xuICBzd2l0Y2ggKFN0cmluZyhlbmNvZGluZykudG9Mb3dlckNhc2UoKSkge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICBjYXNlICdsYXRpbjEnOlxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0dXJuIHRydWVcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuQnVmZmVyLmNvbmNhdCA9IGZ1bmN0aW9uIGNvbmNhdCAobGlzdCwgbGVuZ3RoKSB7XG4gIGlmICghQXJyYXkuaXNBcnJheShsaXN0KSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdFwiIGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycycpXG4gIH1cblxuICBpZiAobGlzdC5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gQnVmZmVyLmFsbG9jKDApXG4gIH1cblxuICB2YXIgaVxuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBsZW5ndGggPSAwXG4gICAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyArK2kpIHtcbiAgICAgIGxlbmd0aCArPSBsaXN0W2ldLmxlbmd0aFxuICAgIH1cbiAgfVxuXG4gIHZhciBidWZmZXIgPSBCdWZmZXIuYWxsb2NVbnNhZmUobGVuZ3RoKVxuICB2YXIgcG9zID0gMFxuICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7ICsraSkge1xuICAgIHZhciBidWYgPSBsaXN0W2ldXG4gICAgaWYgKGlzSW5zdGFuY2UoYnVmLCBVaW50OEFycmF5KSkge1xuICAgICAgYnVmID0gQnVmZmVyLmZyb20oYnVmKVxuICAgIH1cbiAgICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihidWYpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RcIiBhcmd1bWVudCBtdXN0IGJlIGFuIEFycmF5IG9mIEJ1ZmZlcnMnKVxuICAgIH1cbiAgICBidWYuY29weShidWZmZXIsIHBvcylcbiAgICBwb3MgKz0gYnVmLmxlbmd0aFxuICB9XG4gIHJldHVybiBidWZmZXJcbn1cblxuZnVuY3Rpb24gYnl0ZUxlbmd0aCAoc3RyaW5nLCBlbmNvZGluZykge1xuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHN0cmluZykpIHtcbiAgICByZXR1cm4gc3RyaW5nLmxlbmd0aFxuICB9XG4gIGlmIChBcnJheUJ1ZmZlci5pc1ZpZXcoc3RyaW5nKSB8fCBpc0luc3RhbmNlKHN0cmluZywgQXJyYXlCdWZmZXIpKSB7XG4gICAgcmV0dXJuIHN0cmluZy5ieXRlTGVuZ3RoXG4gIH1cbiAgaWYgKHR5cGVvZiBzdHJpbmcgIT09ICdzdHJpbmcnKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICdUaGUgXCJzdHJpbmdcIiBhcmd1bWVudCBtdXN0IGJlIG9uZSBvZiB0eXBlIHN0cmluZywgQnVmZmVyLCBvciBBcnJheUJ1ZmZlci4gJyArXG4gICAgICAnUmVjZWl2ZWQgdHlwZSAnICsgdHlwZW9mIHN0cmluZ1xuICAgIClcbiAgfVxuXG4gIHZhciBsZW4gPSBzdHJpbmcubGVuZ3RoXG4gIHZhciBtdXN0TWF0Y2ggPSAoYXJndW1lbnRzLmxlbmd0aCA+IDIgJiYgYXJndW1lbnRzWzJdID09PSB0cnVlKVxuICBpZiAoIW11c3RNYXRjaCAmJiBsZW4gPT09IDApIHJldHVybiAwXG5cbiAgLy8gVXNlIGEgZm9yIGxvb3AgdG8gYXZvaWQgcmVjdXJzaW9uXG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICBjYXNlICdsYXRpbjEnOlxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGxlblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4VG9CeXRlcyhzdHJpbmcpLmxlbmd0aFxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIGxlbiAqIDJcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBsZW4gPj4+IDFcbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIHJldHVybiBiYXNlNjRUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHtcbiAgICAgICAgICByZXR1cm4gbXVzdE1hdGNoID8gLTEgOiB1dGY4VG9CeXRlcyhzdHJpbmcpLmxlbmd0aCAvLyBhc3N1bWUgdXRmOFxuICAgICAgICB9XG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGhcblxuZnVuY3Rpb24gc2xvd1RvU3RyaW5nIChlbmNvZGluZywgc3RhcnQsIGVuZCkge1xuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuXG4gIC8vIE5vIG5lZWQgdG8gdmVyaWZ5IHRoYXQgXCJ0aGlzLmxlbmd0aCA8PSBNQVhfVUlOVDMyXCIgc2luY2UgaXQncyBhIHJlYWQtb25seVxuICAvLyBwcm9wZXJ0eSBvZiBhIHR5cGVkIGFycmF5LlxuXG4gIC8vIFRoaXMgYmVoYXZlcyBuZWl0aGVyIGxpa2UgU3RyaW5nIG5vciBVaW50OEFycmF5IGluIHRoYXQgd2Ugc2V0IHN0YXJ0L2VuZFxuICAvLyB0byB0aGVpciB1cHBlci9sb3dlciBib3VuZHMgaWYgdGhlIHZhbHVlIHBhc3NlZCBpcyBvdXQgb2YgcmFuZ2UuXG4gIC8vIHVuZGVmaW5lZCBpcyBoYW5kbGVkIHNwZWNpYWxseSBhcyBwZXIgRUNNQS0yNjIgNnRoIEVkaXRpb24sXG4gIC8vIFNlY3Rpb24gMTMuMy4zLjcgUnVudGltZSBTZW1hbnRpY3M6IEtleWVkQmluZGluZ0luaXRpYWxpemF0aW9uLlxuICBpZiAoc3RhcnQgPT09IHVuZGVmaW5lZCB8fCBzdGFydCA8IDApIHtcbiAgICBzdGFydCA9IDBcbiAgfVxuICAvLyBSZXR1cm4gZWFybHkgaWYgc3RhcnQgPiB0aGlzLmxlbmd0aC4gRG9uZSBoZXJlIHRvIHByZXZlbnQgcG90ZW50aWFsIHVpbnQzMlxuICAvLyBjb2VyY2lvbiBmYWlsIGJlbG93LlxuICBpZiAoc3RhcnQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgaWYgKGVuZCA9PT0gdW5kZWZpbmVkIHx8IGVuZCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgfVxuXG4gIGlmIChlbmQgPD0gMCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgLy8gRm9yY2UgY29lcnNpb24gdG8gdWludDMyLiBUaGlzIHdpbGwgYWxzbyBjb2VyY2UgZmFsc2V5L05hTiB2YWx1ZXMgdG8gMC5cbiAgZW5kID4+Pj0gMFxuICBzdGFydCA+Pj49IDBcblxuICBpZiAoZW5kIDw9IHN0YXJ0KSB7XG4gICAgcmV0dXJuICcnXG4gIH1cblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGhleFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgICAgcmV0dXJuIGFzY2lpU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnbGF0aW4xJzpcbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBsYXRpbjFTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICByZXR1cm4gYmFzZTY0U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIHV0ZjE2bGVTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoZW5jb2RpbmcgKyAnJykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuLy8gVGhpcyBwcm9wZXJ0eSBpcyB1c2VkIGJ5IGBCdWZmZXIuaXNCdWZmZXJgIChhbmQgdGhlIGBpcy1idWZmZXJgIG5wbSBwYWNrYWdlKVxuLy8gdG8gZGV0ZWN0IGEgQnVmZmVyIGluc3RhbmNlLiBJdCdzIG5vdCBwb3NzaWJsZSB0byB1c2UgYGluc3RhbmNlb2YgQnVmZmVyYFxuLy8gcmVsaWFibHkgaW4gYSBicm93c2VyaWZ5IGNvbnRleHQgYmVjYXVzZSB0aGVyZSBjb3VsZCBiZSBtdWx0aXBsZSBkaWZmZXJlbnRcbi8vIGNvcGllcyBvZiB0aGUgJ2J1ZmZlcicgcGFja2FnZSBpbiB1c2UuIFRoaXMgbWV0aG9kIHdvcmtzIGV2ZW4gZm9yIEJ1ZmZlclxuLy8gaW5zdGFuY2VzIHRoYXQgd2VyZSBjcmVhdGVkIGZyb20gYW5vdGhlciBjb3B5IG9mIHRoZSBgYnVmZmVyYCBwYWNrYWdlLlxuLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9pc3N1ZXMvMTU0XG5CdWZmZXIucHJvdG90eXBlLl9pc0J1ZmZlciA9IHRydWVcblxuZnVuY3Rpb24gc3dhcCAoYiwgbiwgbSkge1xuICB2YXIgaSA9IGJbbl1cbiAgYltuXSA9IGJbbV1cbiAgYlttXSA9IGlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zd2FwMTYgPSBmdW5jdGlvbiBzd2FwMTYgKCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbiAlIDIgIT09IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDE2LWJpdHMnKVxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IDIpIHtcbiAgICBzd2FwKHRoaXMsIGksIGkgKyAxKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc3dhcDMyID0gZnVuY3Rpb24gc3dhcDMyICgpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW4gJSA0ICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0J1ZmZlciBzaXplIG11c3QgYmUgYSBtdWx0aXBsZSBvZiAzMi1iaXRzJylcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArPSA0KSB7XG4gICAgc3dhcCh0aGlzLCBpLCBpICsgMylcbiAgICBzd2FwKHRoaXMsIGkgKyAxLCBpICsgMilcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnN3YXA2NCA9IGZ1bmN0aW9uIHN3YXA2NCAoKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuICUgOCAhPT0gMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdCdWZmZXIgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNjQtYml0cycpXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gOCkge1xuICAgIHN3YXAodGhpcywgaSwgaSArIDcpXG4gICAgc3dhcCh0aGlzLCBpICsgMSwgaSArIDYpXG4gICAgc3dhcCh0aGlzLCBpICsgMiwgaSArIDUpXG4gICAgc3dhcCh0aGlzLCBpICsgMywgaSArIDQpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgdmFyIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW5ndGggPT09IDApIHJldHVybiAnJ1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHV0ZjhTbGljZSh0aGlzLCAwLCBsZW5ndGgpXG4gIHJldHVybiBzbG93VG9TdHJpbmcuYXBwbHkodGhpcywgYXJndW1lbnRzKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvTG9jYWxlU3RyaW5nID0gQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZ1xuXG5CdWZmZXIucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uIGVxdWFscyAoYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihiKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlcicpXG4gIGlmICh0aGlzID09PSBiKSByZXR1cm4gdHJ1ZVxuICByZXR1cm4gQnVmZmVyLmNvbXBhcmUodGhpcywgYikgPT09IDBcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24gaW5zcGVjdCAoKSB7XG4gIHZhciBzdHIgPSAnJ1xuICB2YXIgbWF4ID0gZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFU1xuICBzdHIgPSB0aGlzLnRvU3RyaW5nKCdoZXgnLCAwLCBtYXgpLnJlcGxhY2UoLyguezJ9KS9nLCAnJDEgJykudHJpbSgpXG4gIGlmICh0aGlzLmxlbmd0aCA+IG1heCkgc3RyICs9ICcgLi4uICdcbiAgcmV0dXJuICc8QnVmZmVyICcgKyBzdHIgKyAnPidcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5jb21wYXJlID0gZnVuY3Rpb24gY29tcGFyZSAodGFyZ2V0LCBzdGFydCwgZW5kLCB0aGlzU3RhcnQsIHRoaXNFbmQpIHtcbiAgaWYgKGlzSW5zdGFuY2UodGFyZ2V0LCBVaW50OEFycmF5KSkge1xuICAgIHRhcmdldCA9IEJ1ZmZlci5mcm9tKHRhcmdldCwgdGFyZ2V0Lm9mZnNldCwgdGFyZ2V0LmJ5dGVMZW5ndGgpXG4gIH1cbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIodGFyZ2V0KSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAnVGhlIFwidGFyZ2V0XCIgYXJndW1lbnQgbXVzdCBiZSBvbmUgb2YgdHlwZSBCdWZmZXIgb3IgVWludDhBcnJheS4gJyArXG4gICAgICAnUmVjZWl2ZWQgdHlwZSAnICsgKHR5cGVvZiB0YXJnZXQpXG4gICAgKVxuICB9XG5cbiAgaWYgKHN0YXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICBzdGFydCA9IDBcbiAgfVxuICBpZiAoZW5kID09PSB1bmRlZmluZWQpIHtcbiAgICBlbmQgPSB0YXJnZXQgPyB0YXJnZXQubGVuZ3RoIDogMFxuICB9XG4gIGlmICh0aGlzU3RhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXNTdGFydCA9IDBcbiAgfVxuICBpZiAodGhpc0VuZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhpc0VuZCA9IHRoaXMubGVuZ3RoXG4gIH1cblxuICBpZiAoc3RhcnQgPCAwIHx8IGVuZCA+IHRhcmdldC5sZW5ndGggfHwgdGhpc1N0YXJ0IDwgMCB8fCB0aGlzRW5kID4gdGhpcy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignb3V0IG9mIHJhbmdlIGluZGV4JylcbiAgfVxuXG4gIGlmICh0aGlzU3RhcnQgPj0gdGhpc0VuZCAmJiBzdGFydCA+PSBlbmQpIHtcbiAgICByZXR1cm4gMFxuICB9XG4gIGlmICh0aGlzU3RhcnQgPj0gdGhpc0VuZCkge1xuICAgIHJldHVybiAtMVxuICB9XG4gIGlmIChzdGFydCA+PSBlbmQpIHtcbiAgICByZXR1cm4gMVxuICB9XG5cbiAgc3RhcnQgPj4+PSAwXG4gIGVuZCA+Pj49IDBcbiAgdGhpc1N0YXJ0ID4+Pj0gMFxuICB0aGlzRW5kID4+Pj0gMFxuXG4gIGlmICh0aGlzID09PSB0YXJnZXQpIHJldHVybiAwXG5cbiAgdmFyIHggPSB0aGlzRW5kIC0gdGhpc1N0YXJ0XG4gIHZhciB5ID0gZW5kIC0gc3RhcnRcbiAgdmFyIGxlbiA9IE1hdGgubWluKHgsIHkpXG5cbiAgdmFyIHRoaXNDb3B5ID0gdGhpcy5zbGljZSh0aGlzU3RhcnQsIHRoaXNFbmQpXG4gIHZhciB0YXJnZXRDb3B5ID0gdGFyZ2V0LnNsaWNlKHN0YXJ0LCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgIGlmICh0aGlzQ29weVtpXSAhPT0gdGFyZ2V0Q29weVtpXSkge1xuICAgICAgeCA9IHRoaXNDb3B5W2ldXG4gICAgICB5ID0gdGFyZ2V0Q29weVtpXVxuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cblxuICBpZiAoeCA8IHkpIHJldHVybiAtMVxuICBpZiAoeSA8IHgpIHJldHVybiAxXG4gIHJldHVybiAwXG59XG5cbi8vIEZpbmRzIGVpdGhlciB0aGUgZmlyc3QgaW5kZXggb2YgYHZhbGAgaW4gYGJ1ZmZlcmAgYXQgb2Zmc2V0ID49IGBieXRlT2Zmc2V0YCxcbi8vIE9SIHRoZSBsYXN0IGluZGV4IG9mIGB2YWxgIGluIGBidWZmZXJgIGF0IG9mZnNldCA8PSBgYnl0ZU9mZnNldGAuXG4vL1xuLy8gQXJndW1lbnRzOlxuLy8gLSBidWZmZXIgLSBhIEJ1ZmZlciB0byBzZWFyY2hcbi8vIC0gdmFsIC0gYSBzdHJpbmcsIEJ1ZmZlciwgb3IgbnVtYmVyXG4vLyAtIGJ5dGVPZmZzZXQgLSBhbiBpbmRleCBpbnRvIGBidWZmZXJgOyB3aWxsIGJlIGNsYW1wZWQgdG8gYW4gaW50MzJcbi8vIC0gZW5jb2RpbmcgLSBhbiBvcHRpb25hbCBlbmNvZGluZywgcmVsZXZhbnQgaXMgdmFsIGlzIGEgc3RyaW5nXG4vLyAtIGRpciAtIHRydWUgZm9yIGluZGV4T2YsIGZhbHNlIGZvciBsYXN0SW5kZXhPZlxuZnVuY3Rpb24gYmlkaXJlY3Rpb25hbEluZGV4T2YgKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKSB7XG4gIC8vIEVtcHR5IGJ1ZmZlciBtZWFucyBubyBtYXRjaFxuICBpZiAoYnVmZmVyLmxlbmd0aCA9PT0gMCkgcmV0dXJuIC0xXG5cbiAgLy8gTm9ybWFsaXplIGJ5dGVPZmZzZXRcbiAgaWYgKHR5cGVvZiBieXRlT2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgIGVuY29kaW5nID0gYnl0ZU9mZnNldFxuICAgIGJ5dGVPZmZzZXQgPSAwXG4gIH0gZWxzZSBpZiAoYnl0ZU9mZnNldCA+IDB4N2ZmZmZmZmYpIHtcbiAgICBieXRlT2Zmc2V0ID0gMHg3ZmZmZmZmZlxuICB9IGVsc2UgaWYgKGJ5dGVPZmZzZXQgPCAtMHg4MDAwMDAwMCkge1xuICAgIGJ5dGVPZmZzZXQgPSAtMHg4MDAwMDAwMFxuICB9XG4gIGJ5dGVPZmZzZXQgPSArYnl0ZU9mZnNldCAvLyBDb2VyY2UgdG8gTnVtYmVyLlxuICBpZiAobnVtYmVySXNOYU4oYnl0ZU9mZnNldCkpIHtcbiAgICAvLyBieXRlT2Zmc2V0OiBpdCBpdCdzIHVuZGVmaW5lZCwgbnVsbCwgTmFOLCBcImZvb1wiLCBldGMsIHNlYXJjaCB3aG9sZSBidWZmZXJcbiAgICBieXRlT2Zmc2V0ID0gZGlyID8gMCA6IChidWZmZXIubGVuZ3RoIC0gMSlcbiAgfVxuXG4gIC8vIE5vcm1hbGl6ZSBieXRlT2Zmc2V0OiBuZWdhdGl2ZSBvZmZzZXRzIHN0YXJ0IGZyb20gdGhlIGVuZCBvZiB0aGUgYnVmZmVyXG4gIGlmIChieXRlT2Zmc2V0IDwgMCkgYnl0ZU9mZnNldCA9IGJ1ZmZlci5sZW5ndGggKyBieXRlT2Zmc2V0XG4gIGlmIChieXRlT2Zmc2V0ID49IGJ1ZmZlci5sZW5ndGgpIHtcbiAgICBpZiAoZGlyKSByZXR1cm4gLTFcbiAgICBlbHNlIGJ5dGVPZmZzZXQgPSBidWZmZXIubGVuZ3RoIC0gMVxuICB9IGVsc2UgaWYgKGJ5dGVPZmZzZXQgPCAwKSB7XG4gICAgaWYgKGRpcikgYnl0ZU9mZnNldCA9IDBcbiAgICBlbHNlIHJldHVybiAtMVxuICB9XG5cbiAgLy8gTm9ybWFsaXplIHZhbFxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ3N0cmluZycpIHtcbiAgICB2YWwgPSBCdWZmZXIuZnJvbSh2YWwsIGVuY29kaW5nKVxuICB9XG5cbiAgLy8gRmluYWxseSwgc2VhcmNoIGVpdGhlciBpbmRleE9mIChpZiBkaXIgaXMgdHJ1ZSkgb3IgbGFzdEluZGV4T2ZcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcih2YWwpKSB7XG4gICAgLy8gU3BlY2lhbCBjYXNlOiBsb29raW5nIGZvciBlbXB0eSBzdHJpbmcvYnVmZmVyIGFsd2F5cyBmYWlsc1xuICAgIGlmICh2YWwubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gLTFcbiAgICB9XG4gICAgcmV0dXJuIGFycmF5SW5kZXhPZihidWZmZXIsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcilcbiAgfSBlbHNlIGlmICh0eXBlb2YgdmFsID09PSAnbnVtYmVyJykge1xuICAgIHZhbCA9IHZhbCAmIDB4RkYgLy8gU2VhcmNoIGZvciBhIGJ5dGUgdmFsdWUgWzAtMjU1XVxuICAgIGlmICh0eXBlb2YgVWludDhBcnJheS5wcm90b3R5cGUuaW5kZXhPZiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgaWYgKGRpcikge1xuICAgICAgICByZXR1cm4gVWludDhBcnJheS5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFVpbnQ4QXJyYXkucHJvdG90eXBlLmxhc3RJbmRleE9mLmNhbGwoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQpXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhcnJheUluZGV4T2YoYnVmZmVyLCBbIHZhbCBdLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKVxuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcigndmFsIG11c3QgYmUgc3RyaW5nLCBudW1iZXIgb3IgQnVmZmVyJylcbn1cblxuZnVuY3Rpb24gYXJyYXlJbmRleE9mIChhcnIsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcikge1xuICB2YXIgaW5kZXhTaXplID0gMVxuICB2YXIgYXJyTGVuZ3RoID0gYXJyLmxlbmd0aFxuICB2YXIgdmFsTGVuZ3RoID0gdmFsLmxlbmd0aFxuXG4gIGlmIChlbmNvZGluZyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgZW5jb2RpbmcgPSBTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICBpZiAoZW5jb2RpbmcgPT09ICd1Y3MyJyB8fCBlbmNvZGluZyA9PT0gJ3Vjcy0yJyB8fFxuICAgICAgICBlbmNvZGluZyA9PT0gJ3V0ZjE2bGUnIHx8IGVuY29kaW5nID09PSAndXRmLTE2bGUnKSB7XG4gICAgICBpZiAoYXJyLmxlbmd0aCA8IDIgfHwgdmFsLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgcmV0dXJuIC0xXG4gICAgICB9XG4gICAgICBpbmRleFNpemUgPSAyXG4gICAgICBhcnJMZW5ndGggLz0gMlxuICAgICAgdmFsTGVuZ3RoIC89IDJcbiAgICAgIGJ5dGVPZmZzZXQgLz0gMlxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWQgKGJ1ZiwgaSkge1xuICAgIGlmIChpbmRleFNpemUgPT09IDEpIHtcbiAgICAgIHJldHVybiBidWZbaV1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGJ1Zi5yZWFkVUludDE2QkUoaSAqIGluZGV4U2l6ZSlcbiAgICB9XG4gIH1cblxuICB2YXIgaVxuICBpZiAoZGlyKSB7XG4gICAgdmFyIGZvdW5kSW5kZXggPSAtMVxuICAgIGZvciAoaSA9IGJ5dGVPZmZzZXQ7IGkgPCBhcnJMZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHJlYWQoYXJyLCBpKSA9PT0gcmVhZCh2YWwsIGZvdW5kSW5kZXggPT09IC0xID8gMCA6IGkgLSBmb3VuZEluZGV4KSkge1xuICAgICAgICBpZiAoZm91bmRJbmRleCA9PT0gLTEpIGZvdW5kSW5kZXggPSBpXG4gICAgICAgIGlmIChpIC0gZm91bmRJbmRleCArIDEgPT09IHZhbExlbmd0aCkgcmV0dXJuIGZvdW5kSW5kZXggKiBpbmRleFNpemVcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChmb3VuZEluZGV4ICE9PSAtMSkgaSAtPSBpIC0gZm91bmRJbmRleFxuICAgICAgICBmb3VuZEluZGV4ID0gLTFcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGJ5dGVPZmZzZXQgKyB2YWxMZW5ndGggPiBhcnJMZW5ndGgpIGJ5dGVPZmZzZXQgPSBhcnJMZW5ndGggLSB2YWxMZW5ndGhcbiAgICBmb3IgKGkgPSBieXRlT2Zmc2V0OyBpID49IDA7IGktLSkge1xuICAgICAgdmFyIGZvdW5kID0gdHJ1ZVxuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCB2YWxMZW5ndGg7IGorKykge1xuICAgICAgICBpZiAocmVhZChhcnIsIGkgKyBqKSAhPT0gcmVhZCh2YWwsIGopKSB7XG4gICAgICAgICAgZm91bmQgPSBmYWxzZVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChmb3VuZCkgcmV0dXJuIGlcbiAgICB9XG4gIH1cblxuICByZXR1cm4gLTFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbmNsdWRlcyA9IGZ1bmN0aW9uIGluY2x1ZGVzICh2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSB7XG4gIHJldHVybiB0aGlzLmluZGV4T2YodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykgIT09IC0xXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5kZXhPZiA9IGZ1bmN0aW9uIGluZGV4T2YgKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIGJpZGlyZWN0aW9uYWxJbmRleE9mKHRoaXMsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIHRydWUpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUubGFzdEluZGV4T2YgPSBmdW5jdGlvbiBsYXN0SW5kZXhPZiAodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykge1xuICByZXR1cm4gYmlkaXJlY3Rpb25hbEluZGV4T2YodGhpcywgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZmFsc2UpXG59XG5cbmZ1bmN0aW9uIGhleFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgb2Zmc2V0ID0gTnVtYmVyKG9mZnNldCkgfHwgMFxuICB2YXIgcmVtYWluaW5nID0gYnVmLmxlbmd0aCAtIG9mZnNldFxuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9IE51bWJlcihsZW5ndGgpXG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gICAgfVxuICB9XG5cbiAgdmFyIHN0ckxlbiA9IHN0cmluZy5sZW5ndGhcblxuICBpZiAobGVuZ3RoID4gc3RyTGVuIC8gMikge1xuICAgIGxlbmd0aCA9IHN0ckxlbiAvIDJcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgdmFyIHBhcnNlZCA9IHBhcnNlSW50KHN0cmluZy5zdWJzdHIoaSAqIDIsIDIpLCAxNilcbiAgICBpZiAobnVtYmVySXNOYU4ocGFyc2VkKSkgcmV0dXJuIGlcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSBwYXJzZWRcbiAgfVxuICByZXR1cm4gaVxufVxuXG5mdW5jdGlvbiB1dGY4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcih1dGY4VG9CeXRlcyhzdHJpbmcsIGJ1Zi5sZW5ndGggLSBvZmZzZXQpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBhc2NpaVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIoYXNjaWlUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGxhdGluMVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGFzY2lpV3JpdGUoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBiYXNlNjRXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKGJhc2U2NFRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gdWNzMldyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIodXRmMTZsZVRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uIHdyaXRlIChzdHJpbmcsIG9mZnNldCwgbGVuZ3RoLCBlbmNvZGluZykge1xuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nKVxuICBpZiAob2Zmc2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICBlbmNvZGluZyA9ICd1dGY4J1xuICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gICAgb2Zmc2V0ID0gMFxuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nLCBlbmNvZGluZylcbiAgfSBlbHNlIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgIGVuY29kaW5nID0gb2Zmc2V0XG4gICAgbGVuZ3RoID0gdGhpcy5sZW5ndGhcbiAgICBvZmZzZXQgPSAwXG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcsIG9mZnNldFssIGxlbmd0aF1bLCBlbmNvZGluZ10pXG4gIH0gZWxzZSBpZiAoaXNGaW5pdGUob2Zmc2V0KSkge1xuICAgIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICAgIGlmIChpc0Zpbml0ZShsZW5ndGgpKSB7XG4gICAgICBsZW5ndGggPSBsZW5ndGggPj4+IDBcbiAgICAgIGlmIChlbmNvZGluZyA9PT0gdW5kZWZpbmVkKSBlbmNvZGluZyA9ICd1dGY4J1xuICAgIH0gZWxzZSB7XG4gICAgICBlbmNvZGluZyA9IGxlbmd0aFxuICAgICAgbGVuZ3RoID0gdW5kZWZpbmVkXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICdCdWZmZXIud3JpdGUoc3RyaW5nLCBlbmNvZGluZywgb2Zmc2V0WywgbGVuZ3RoXSkgaXMgbm8gbG9uZ2VyIHN1cHBvcnRlZCdcbiAgICApXG4gIH1cblxuICB2YXIgcmVtYWluaW5nID0gdGhpcy5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkIHx8IGxlbmd0aCA+IHJlbWFpbmluZykgbGVuZ3RoID0gcmVtYWluaW5nXG5cbiAgaWYgKChzdHJpbmcubGVuZ3RoID4gMCAmJiAobGVuZ3RoIDwgMCB8fCBvZmZzZXQgPCAwKSkgfHwgb2Zmc2V0ID4gdGhpcy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQXR0ZW1wdCB0byB3cml0ZSBvdXRzaWRlIGJ1ZmZlciBib3VuZHMnKVxuICB9XG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcblxuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuICBmb3IgKDs7KSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGhleFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgICAgcmV0dXJuIGFzY2lpV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnbGF0aW4xJzpcbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBsYXRpbjFXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICAvLyBXYXJuaW5nOiBtYXhMZW5ndGggbm90IHRha2VuIGludG8gYWNjb3VudCBpbiBiYXNlNjRXcml0ZVxuICAgICAgICByZXR1cm4gYmFzZTY0V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIHVjczJXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoJycgKyBlbmNvZGluZykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04gKCkge1xuICByZXR1cm4ge1xuICAgIHR5cGU6ICdCdWZmZXInLFxuICAgIGRhdGE6IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMuX2FyciB8fCB0aGlzLCAwKVxuICB9XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKHN0YXJ0ID09PSAwICYmIGVuZCA9PT0gYnVmLmxlbmd0aCkge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYpXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1Zi5zbGljZShzdGFydCwgZW5kKSlcbiAgfVxufVxuXG5mdW5jdGlvbiB1dGY4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG4gIHZhciByZXMgPSBbXVxuXG4gIHZhciBpID0gc3RhcnRcbiAgd2hpbGUgKGkgPCBlbmQpIHtcbiAgICB2YXIgZmlyc3RCeXRlID0gYnVmW2ldXG4gICAgdmFyIGNvZGVQb2ludCA9IG51bGxcbiAgICB2YXIgYnl0ZXNQZXJTZXF1ZW5jZSA9IChmaXJzdEJ5dGUgPiAweEVGKSA/IDRcbiAgICAgIDogKGZpcnN0Qnl0ZSA+IDB4REYpID8gM1xuICAgICAgICA6IChmaXJzdEJ5dGUgPiAweEJGKSA/IDJcbiAgICAgICAgICA6IDFcblxuICAgIGlmIChpICsgYnl0ZXNQZXJTZXF1ZW5jZSA8PSBlbmQpIHtcbiAgICAgIHZhciBzZWNvbmRCeXRlLCB0aGlyZEJ5dGUsIGZvdXJ0aEJ5dGUsIHRlbXBDb2RlUG9pbnRcblxuICAgICAgc3dpdGNoIChieXRlc1BlclNlcXVlbmNlKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBpZiAoZmlyc3RCeXRlIDwgMHg4MCkge1xuICAgICAgICAgICAgY29kZVBvaW50ID0gZmlyc3RCeXRlXG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4MUYpIDw8IDB4NiB8IChzZWNvbmRCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHg3Rikge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIHRoaXJkQnl0ZSA9IGJ1ZltpICsgMl1cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAodGhpcmRCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHhGKSA8PCAweEMgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpIDw8IDB4NiB8ICh0aGlyZEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweDdGRiAmJiAodGVtcENvZGVQb2ludCA8IDB4RDgwMCB8fCB0ZW1wQ29kZVBvaW50ID4gMHhERkZGKSkge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgNDpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIHRoaXJkQnl0ZSA9IGJ1ZltpICsgMl1cbiAgICAgICAgICBmb3VydGhCeXRlID0gYnVmW2kgKyAzXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwICYmICh0aGlyZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAoZm91cnRoQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4RikgPDwgMHgxMiB8IChzZWNvbmRCeXRlICYgMHgzRikgPDwgMHhDIHwgKHRoaXJkQnl0ZSAmIDB4M0YpIDw8IDB4NiB8IChmb3VydGhCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHhGRkZGICYmIHRlbXBDb2RlUG9pbnQgPCAweDExMDAwMCkge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjb2RlUG9pbnQgPT09IG51bGwpIHtcbiAgICAgIC8vIHdlIGRpZCBub3QgZ2VuZXJhdGUgYSB2YWxpZCBjb2RlUG9pbnQgc28gaW5zZXJ0IGFcbiAgICAgIC8vIHJlcGxhY2VtZW50IGNoYXIgKFUrRkZGRCkgYW5kIGFkdmFuY2Ugb25seSAxIGJ5dGVcbiAgICAgIGNvZGVQb2ludCA9IDB4RkZGRFxuICAgICAgYnl0ZXNQZXJTZXF1ZW5jZSA9IDFcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA+IDB4RkZGRikge1xuICAgICAgLy8gZW5jb2RlIHRvIHV0ZjE2IChzdXJyb2dhdGUgcGFpciBkYW5jZSlcbiAgICAgIGNvZGVQb2ludCAtPSAweDEwMDAwXG4gICAgICByZXMucHVzaChjb2RlUG9pbnQgPj4+IDEwICYgMHgzRkYgfCAweEQ4MDApXG4gICAgICBjb2RlUG9pbnQgPSAweERDMDAgfCBjb2RlUG9pbnQgJiAweDNGRlxuICAgIH1cblxuICAgIHJlcy5wdXNoKGNvZGVQb2ludClcbiAgICBpICs9IGJ5dGVzUGVyU2VxdWVuY2VcbiAgfVxuXG4gIHJldHVybiBkZWNvZGVDb2RlUG9pbnRzQXJyYXkocmVzKVxufVxuXG4vLyBCYXNlZCBvbiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yMjc0NzI3Mi82ODA3NDIsIHRoZSBicm93c2VyIHdpdGhcbi8vIHRoZSBsb3dlc3QgbGltaXQgaXMgQ2hyb21lLCB3aXRoIDB4MTAwMDAgYXJncy5cbi8vIFdlIGdvIDEgbWFnbml0dWRlIGxlc3MsIGZvciBzYWZldHlcbnZhciBNQVhfQVJHVU1FTlRTX0xFTkdUSCA9IDB4MTAwMFxuXG5mdW5jdGlvbiBkZWNvZGVDb2RlUG9pbnRzQXJyYXkgKGNvZGVQb2ludHMpIHtcbiAgdmFyIGxlbiA9IGNvZGVQb2ludHMubGVuZ3RoXG4gIGlmIChsZW4gPD0gTUFYX0FSR1VNRU5UU19MRU5HVEgpIHtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShTdHJpbmcsIGNvZGVQb2ludHMpIC8vIGF2b2lkIGV4dHJhIHNsaWNlKClcbiAgfVxuXG4gIC8vIERlY29kZSBpbiBjaHVua3MgdG8gYXZvaWQgXCJjYWxsIHN0YWNrIHNpemUgZXhjZWVkZWRcIi5cbiAgdmFyIHJlcyA9ICcnXG4gIHZhciBpID0gMFxuICB3aGlsZSAoaSA8IGxlbikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFxuICAgICAgU3RyaW5nLFxuICAgICAgY29kZVBvaW50cy5zbGljZShpLCBpICs9IE1BWF9BUkdVTUVOVFNfTEVOR1RIKVxuICAgIClcbiAgfVxuICByZXR1cm4gcmVzXG59XG5cbmZ1bmN0aW9uIGFzY2lpU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldICYgMHg3RilcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGxhdGluMVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGhleFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcblxuICBpZiAoIXN0YXJ0IHx8IHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmICghZW5kIHx8IGVuZCA8IDAgfHwgZW5kID4gbGVuKSBlbmQgPSBsZW5cblxuICB2YXIgb3V0ID0gJydcbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICBvdXQgKz0gdG9IZXgoYnVmW2ldKVxuICB9XG4gIHJldHVybiBvdXRcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGJ5dGVzID0gYnVmLnNsaWNlKHN0YXJ0LCBlbmQpXG4gIHZhciByZXMgPSAnJ1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0gKyAoYnl0ZXNbaSArIDFdICogMjU2KSlcbiAgfVxuICByZXR1cm4gcmVzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbiBzbGljZSAoc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgc3RhcnQgPSB+fnN0YXJ0XG4gIGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkID8gbGVuIDogfn5lbmRcblxuICBpZiAoc3RhcnQgPCAwKSB7XG4gICAgc3RhcnQgKz0gbGVuXG4gICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIH0gZWxzZSBpZiAoc3RhcnQgPiBsZW4pIHtcbiAgICBzdGFydCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IDApIHtcbiAgICBlbmQgKz0gbGVuXG4gICAgaWYgKGVuZCA8IDApIGVuZCA9IDBcbiAgfSBlbHNlIGlmIChlbmQgPiBsZW4pIHtcbiAgICBlbmQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICB2YXIgbmV3QnVmID0gdGhpcy5zdWJhcnJheShzdGFydCwgZW5kKVxuICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICBuZXdCdWYuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICByZXR1cm4gbmV3QnVmXG59XG5cbi8qXG4gKiBOZWVkIHRvIG1ha2Ugc3VyZSB0aGF0IGJ1ZmZlciBpc24ndCB0cnlpbmcgdG8gd3JpdGUgb3V0IG9mIGJvdW5kcy5cbiAqL1xuZnVuY3Rpb24gY2hlY2tPZmZzZXQgKG9mZnNldCwgZXh0LCBsZW5ndGgpIHtcbiAgaWYgKChvZmZzZXQgJSAxKSAhPT0gMCB8fCBvZmZzZXQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignb2Zmc2V0IGlzIG5vdCB1aW50JylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RyeWluZyB0byBhY2Nlc3MgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50TEUgPSBmdW5jdGlvbiByZWFkVUludExFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF1cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgaV0gKiBtdWxcbiAgfVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludEJFID0gZnVuY3Rpb24gcmVhZFVJbnRCRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG4gIH1cblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdXG4gIHZhciBtdWwgPSAxXG4gIHdoaWxlIChieXRlTGVuZ3RoID4gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIC0tYnl0ZUxlbmd0aF0gKiBtdWxcbiAgfVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbiByZWFkVUludDggKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMSwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2TEUgPSBmdW5jdGlvbiByZWFkVUludDE2TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZCRSA9IGZ1bmN0aW9uIHJlYWRVSW50MTZCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgOCkgfCB0aGlzW29mZnNldCArIDFdXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkxFID0gZnVuY3Rpb24gcmVhZFVJbnQzMkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAoKHRoaXNbb2Zmc2V0XSkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgMTYpKSArXG4gICAgICAodGhpc1tvZmZzZXQgKyAzXSAqIDB4MTAwMDAwMClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyQkUgPSBmdW5jdGlvbiByZWFkVUludDMyQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gKiAweDEwMDAwMDApICtcbiAgICAoKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgdGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50TEUgPSBmdW5jdGlvbiByZWFkSW50TEUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludEJFID0gZnVuY3Rpb24gcmVhZEludEJFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aFxuICB2YXIgbXVsID0gMVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWldXG4gIHdoaWxlIChpID4gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIC0taV0gKiBtdWxcbiAgfVxuICBtdWwgKj0gMHg4MFxuXG4gIGlmICh2YWwgPj0gbXVsKSB2YWwgLT0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpXG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQ4ID0gZnVuY3Rpb24gcmVhZEludDggKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMSwgdGhpcy5sZW5ndGgpXG4gIGlmICghKHRoaXNbb2Zmc2V0XSAmIDB4ODApKSByZXR1cm4gKHRoaXNbb2Zmc2V0XSlcbiAgcmV0dXJuICgoMHhmZiAtIHRoaXNbb2Zmc2V0XSArIDEpICogLTEpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2TEUgPSBmdW5jdGlvbiByZWFkSW50MTZMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG4gIHJldHVybiAodmFsICYgMHg4MDAwKSA/IHZhbCB8IDB4RkZGRjAwMDAgOiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZCRSA9IGZ1bmN0aW9uIHJlYWRJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAxXSB8ICh0aGlzW29mZnNldF0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkxFID0gZnVuY3Rpb24gcmVhZEludDMyTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0pIHxcbiAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAzXSA8PCAyNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJCRSA9IGZ1bmN0aW9uIHJlYWRJbnQzMkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdIDw8IDI0KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0TEUgPSBmdW5jdGlvbiByZWFkRmxvYXRMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdEJFID0gZnVuY3Rpb24gcmVhZEZsb2F0QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUxFID0gZnVuY3Rpb24gcmVhZERvdWJsZUxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgNTIsIDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUJFID0gZnVuY3Rpb24gcmVhZERvdWJsZUJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDUyLCA4KVxufVxuXG5mdW5jdGlvbiBjaGVja0ludCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wiYnVmZmVyXCIgYXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlciBpbnN0YW5jZScpXG4gIGlmICh2YWx1ZSA+IG1heCB8fCB2YWx1ZSA8IG1pbikgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1widmFsdWVcIiBhcmd1bWVudCBpcyBvdXQgb2YgYm91bmRzJylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGJ1Zi5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludExFID0gZnVuY3Rpb24gd3JpdGVVSW50TEUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIG1heEJ5dGVzID0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpIC0gMVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG1heEJ5dGVzLCAwKVxuICB9XG5cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRCRSA9IGZ1bmN0aW9uIHdyaXRlVUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBtYXhCeXRlcyA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKSAtIDFcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBtYXhCeXRlcywgMClcbiAgfVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aCAtIDFcbiAgdmFyIG11bCA9IDFcbiAgdGhpc1tvZmZzZXQgKyBpXSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoLS1pID49IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKHZhbHVlIC8gbXVsKSAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50OCA9IGZ1bmN0aW9uIHdyaXRlVUludDggKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweGZmLCAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2TEUgPSBmdW5jdGlvbiB3cml0ZVVJbnQxNkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2QkUgPSBmdW5jdGlvbiB3cml0ZVVJbnQxNkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyTEUgPSBmdW5jdGlvbiB3cml0ZVVJbnQzMkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHhmZmZmZmZmZiwgMClcbiAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSA+Pj4gMjQpXG4gIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyQkUgPSBmdW5jdGlvbiB3cml0ZVVJbnQzMkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHhmZmZmZmZmZiwgMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50TEUgPSBmdW5jdGlvbiB3cml0ZUludExFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsICg4ICogYnl0ZUxlbmd0aCkgLSAxKVxuXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbGltaXQgLSAxLCAtbGltaXQpXG4gIH1cblxuICB2YXIgaSA9IDBcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IDBcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgaWYgKHZhbHVlIDwgMCAmJiBzdWIgPT09IDAgJiYgdGhpc1tvZmZzZXQgKyBpIC0gMV0gIT09IDApIHtcbiAgICAgIHN1YiA9IDFcbiAgICB9XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICgodmFsdWUgLyBtdWwpID4+IDApIC0gc3ViICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludEJFID0gZnVuY3Rpb24gd3JpdGVJbnRCRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbGltaXQgPSBNYXRoLnBvdygyLCAoOCAqIGJ5dGVMZW5ndGgpIC0gMSlcblxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIGxpbWl0IC0gMSwgLWxpbWl0KVxuICB9XG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB2YXIgc3ViID0gMFxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIGlmICh2YWx1ZSA8IDAgJiYgc3ViID09PSAwICYmIHRoaXNbb2Zmc2V0ICsgaSArIDFdICE9PSAwKSB7XG4gICAgICBzdWIgPSAxXG4gICAgfVxuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAoKHZhbHVlIC8gbXVsKSA+PiAwKSAtIHN1YiAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQ4ID0gZnVuY3Rpb24gd3JpdGVJbnQ4ICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHg3ZiwgLTB4ODApXG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZiArIHZhbHVlICsgMVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZMRSA9IGZ1bmN0aW9uIHdyaXRlSW50MTZMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2QkUgPSBmdW5jdGlvbiB3cml0ZUludDE2QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweDdmZmYsIC0weDgwMDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkxFID0gZnVuY3Rpb24gd3JpdGVJbnQzMkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyQkUgPSBmdW5jdGlvbiB3cml0ZUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmZmZmZmICsgdmFsdWUgKyAxXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gMjQpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuZnVuY3Rpb24gY2hlY2tJRUVFNzU0IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKG9mZnNldCArIGV4dCA+IGJ1Zi5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbmRleCBvdXQgb2YgcmFuZ2UnKVxuICBpZiAob2Zmc2V0IDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRmxvYXQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDQsIDMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgsIC0zLjQwMjgyMzQ2NjM4NTI4ODZlKzM4KVxuICB9XG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDIzLCA0KVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRMRSA9IGZ1bmN0aW9uIHdyaXRlRmxvYXRMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdEJFID0gZnVuY3Rpb24gd3JpdGVGbG9hdEJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRG91YmxlIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA4LCAxLjc5NzY5MzEzNDg2MjMxNTdFKzMwOCwgLTEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4KVxuICB9XG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDUyLCA4KVxuICByZXR1cm4gb2Zmc2V0ICsgOFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlTEUgPSBmdW5jdGlvbiB3cml0ZURvdWJsZUxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVCRSA9IGZ1bmN0aW9uIHdyaXRlRG91YmxlQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbi8vIGNvcHkodGFyZ2V0QnVmZmVyLCB0YXJnZXRTdGFydD0wLCBzb3VyY2VTdGFydD0wLCBzb3VyY2VFbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uIGNvcHkgKHRhcmdldCwgdGFyZ2V0U3RhcnQsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIodGFyZ2V0KSkgdGhyb3cgbmV3IFR5cGVFcnJvcignYXJndW1lbnQgc2hvdWxkIGJlIGEgQnVmZmVyJylcbiAgaWYgKCFzdGFydCkgc3RhcnQgPSAwXG4gIGlmICghZW5kICYmIGVuZCAhPT0gMCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldFN0YXJ0ID49IHRhcmdldC5sZW5ndGgpIHRhcmdldFN0YXJ0ID0gdGFyZ2V0Lmxlbmd0aFxuICBpZiAoIXRhcmdldFN0YXJ0KSB0YXJnZXRTdGFydCA9IDBcbiAgaWYgKGVuZCA+IDAgJiYgZW5kIDwgc3RhcnQpIGVuZCA9IHN0YXJ0XG5cbiAgLy8gQ29weSAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm4gMFxuICBpZiAodGFyZ2V0Lmxlbmd0aCA9PT0gMCB8fCB0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIDBcblxuICAvLyBGYXRhbCBlcnJvciBjb25kaXRpb25zXG4gIGlmICh0YXJnZXRTdGFydCA8IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcigndGFyZ2V0U3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIH1cbiAgaWYgKHN0YXJ0IDwgMCB8fCBzdGFydCA+PSB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG4gIGlmIChlbmQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc291cmNlRW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIC8vIEFyZSB3ZSBvb2I/XG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldC5sZW5ndGggLSB0YXJnZXRTdGFydCA8IGVuZCAtIHN0YXJ0KSB7XG4gICAgZW5kID0gdGFyZ2V0Lmxlbmd0aCAtIHRhcmdldFN0YXJ0ICsgc3RhcnRcbiAgfVxuXG4gIHZhciBsZW4gPSBlbmQgLSBzdGFydFxuXG4gIGlmICh0aGlzID09PSB0YXJnZXQgJiYgdHlwZW9mIFVpbnQ4QXJyYXkucHJvdG90eXBlLmNvcHlXaXRoaW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAvLyBVc2UgYnVpbHQtaW4gd2hlbiBhdmFpbGFibGUsIG1pc3NpbmcgZnJvbSBJRTExXG4gICAgdGhpcy5jb3B5V2l0aGluKHRhcmdldFN0YXJ0LCBzdGFydCwgZW5kKVxuICB9IGVsc2UgaWYgKHRoaXMgPT09IHRhcmdldCAmJiBzdGFydCA8IHRhcmdldFN0YXJ0ICYmIHRhcmdldFN0YXJ0IDwgZW5kKSB7XG4gICAgLy8gZGVzY2VuZGluZyBjb3B5IGZyb20gZW5kXG4gICAgZm9yICh2YXIgaSA9IGxlbiAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICB0YXJnZXRbaSArIHRhcmdldFN0YXJ0XSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBVaW50OEFycmF5LnByb3RvdHlwZS5zZXQuY2FsbChcbiAgICAgIHRhcmdldCxcbiAgICAgIHRoaXMuc3ViYXJyYXkoc3RhcnQsIGVuZCksXG4gICAgICB0YXJnZXRTdGFydFxuICAgIClcbiAgfVxuXG4gIHJldHVybiBsZW5cbn1cblxuLy8gVXNhZ2U6XG4vLyAgICBidWZmZXIuZmlsbChudW1iZXJbLCBvZmZzZXRbLCBlbmRdXSlcbi8vICAgIGJ1ZmZlci5maWxsKGJ1ZmZlclssIG9mZnNldFssIGVuZF1dKVxuLy8gICAgYnVmZmVyLmZpbGwoc3RyaW5nWywgb2Zmc2V0WywgZW5kXV1bLCBlbmNvZGluZ10pXG5CdWZmZXIucHJvdG90eXBlLmZpbGwgPSBmdW5jdGlvbiBmaWxsICh2YWwsIHN0YXJ0LCBlbmQsIGVuY29kaW5nKSB7XG4gIC8vIEhhbmRsZSBzdHJpbmcgY2FzZXM6XG4gIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIGlmICh0eXBlb2Ygc3RhcnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBlbmNvZGluZyA9IHN0YXJ0XG4gICAgICBzdGFydCA9IDBcbiAgICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZW5kID09PSAnc3RyaW5nJykge1xuICAgICAgZW5jb2RpbmcgPSBlbmRcbiAgICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gICAgfVxuICAgIGlmIChlbmNvZGluZyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBlbmNvZGluZyAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2VuY29kaW5nIG11c3QgYmUgYSBzdHJpbmcnKVxuICAgIH1cbiAgICBpZiAodHlwZW9mIGVuY29kaW5nID09PSAnc3RyaW5nJyAmJiAhQnVmZmVyLmlzRW5jb2RpbmcoZW5jb2RpbmcpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgfVxuICAgIGlmICh2YWwubGVuZ3RoID09PSAxKSB7XG4gICAgICB2YXIgY29kZSA9IHZhbC5jaGFyQ29kZUF0KDApXG4gICAgICBpZiAoKGVuY29kaW5nID09PSAndXRmOCcgJiYgY29kZSA8IDEyOCkgfHxcbiAgICAgICAgICBlbmNvZGluZyA9PT0gJ2xhdGluMScpIHtcbiAgICAgICAgLy8gRmFzdCBwYXRoOiBJZiBgdmFsYCBmaXRzIGludG8gYSBzaW5nbGUgYnl0ZSwgdXNlIHRoYXQgbnVtZXJpYyB2YWx1ZS5cbiAgICAgICAgdmFsID0gY29kZVxuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIGlmICh0eXBlb2YgdmFsID09PSAnbnVtYmVyJykge1xuICAgIHZhbCA9IHZhbCAmIDI1NVxuICB9XG5cbiAgLy8gSW52YWxpZCByYW5nZXMgYXJlIG5vdCBzZXQgdG8gYSBkZWZhdWx0LCBzbyBjYW4gcmFuZ2UgY2hlY2sgZWFybHkuXG4gIGlmIChzdGFydCA8IDAgfHwgdGhpcy5sZW5ndGggPCBzdGFydCB8fCB0aGlzLmxlbmd0aCA8IGVuZCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdPdXQgb2YgcmFuZ2UgaW5kZXgnKVxuICB9XG5cbiAgaWYgKGVuZCA8PSBzdGFydCkge1xuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBzdGFydCA9IHN0YXJ0ID4+PiAwXG4gIGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkID8gdGhpcy5sZW5ndGggOiBlbmQgPj4+IDBcblxuICBpZiAoIXZhbCkgdmFsID0gMFxuXG4gIHZhciBpXG4gIGlmICh0eXBlb2YgdmFsID09PSAnbnVtYmVyJykge1xuICAgIGZvciAoaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICAgIHRoaXNbaV0gPSB2YWxcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdmFyIGJ5dGVzID0gQnVmZmVyLmlzQnVmZmVyKHZhbClcbiAgICAgID8gdmFsXG4gICAgICA6IEJ1ZmZlci5mcm9tKHZhbCwgZW5jb2RpbmcpXG4gICAgdmFyIGxlbiA9IGJ5dGVzLmxlbmd0aFxuICAgIGlmIChsZW4gPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSB2YWx1ZSBcIicgKyB2YWwgK1xuICAgICAgICAnXCIgaXMgaW52YWxpZCBmb3IgYXJndW1lbnQgXCJ2YWx1ZVwiJylcbiAgICB9XG4gICAgZm9yIChpID0gMDsgaSA8IGVuZCAtIHN0YXJ0OyArK2kpIHtcbiAgICAgIHRoaXNbaSArIHN0YXJ0XSA9IGJ5dGVzW2kgJSBsZW5dXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuLy8gSEVMUEVSIEZVTkNUSU9OU1xuLy8gPT09PT09PT09PT09PT09PVxuXG52YXIgSU5WQUxJRF9CQVNFNjRfUkUgPSAvW14rLzAtOUEtWmEtei1fXS9nXG5cbmZ1bmN0aW9uIGJhc2U2NGNsZWFuIChzdHIpIHtcbiAgLy8gTm9kZSB0YWtlcyBlcXVhbCBzaWducyBhcyBlbmQgb2YgdGhlIEJhc2U2NCBlbmNvZGluZ1xuICBzdHIgPSBzdHIuc3BsaXQoJz0nKVswXVxuICAvLyBOb2RlIHN0cmlwcyBvdXQgaW52YWxpZCBjaGFyYWN0ZXJzIGxpa2UgXFxuIGFuZCBcXHQgZnJvbSB0aGUgc3RyaW5nLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgc3RyID0gc3RyLnRyaW0oKS5yZXBsYWNlKElOVkFMSURfQkFTRTY0X1JFLCAnJylcbiAgLy8gTm9kZSBjb252ZXJ0cyBzdHJpbmdzIHdpdGggbGVuZ3RoIDwgMiB0byAnJ1xuICBpZiAoc3RyLmxlbmd0aCA8IDIpIHJldHVybiAnJ1xuICAvLyBOb2RlIGFsbG93cyBmb3Igbm9uLXBhZGRlZCBiYXNlNjQgc3RyaW5ncyAobWlzc2luZyB0cmFpbGluZyA9PT0pLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgd2hpbGUgKHN0ci5sZW5ndGggJSA0ICE9PSAwKSB7XG4gICAgc3RyID0gc3RyICsgJz0nXG4gIH1cbiAgcmV0dXJuIHN0clxufVxuXG5mdW5jdGlvbiB0b0hleCAobikge1xuICBpZiAobiA8IDE2KSByZXR1cm4gJzAnICsgbi50b1N0cmluZygxNilcbiAgcmV0dXJuIG4udG9TdHJpbmcoMTYpXG59XG5cbmZ1bmN0aW9uIHV0ZjhUb0J5dGVzIChzdHJpbmcsIHVuaXRzKSB7XG4gIHVuaXRzID0gdW5pdHMgfHwgSW5maW5pdHlcbiAgdmFyIGNvZGVQb2ludFxuICB2YXIgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aFxuICB2YXIgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcbiAgdmFyIGJ5dGVzID0gW11cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgY29kZVBvaW50ID0gc3RyaW5nLmNoYXJDb2RlQXQoaSlcblxuICAgIC8vIGlzIHN1cnJvZ2F0ZSBjb21wb25lbnRcbiAgICBpZiAoY29kZVBvaW50ID4gMHhEN0ZGICYmIGNvZGVQb2ludCA8IDB4RTAwMCkge1xuICAgICAgLy8gbGFzdCBjaGFyIHdhcyBhIGxlYWRcbiAgICAgIGlmICghbGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgICAvLyBubyBsZWFkIHlldFxuICAgICAgICBpZiAoY29kZVBvaW50ID4gMHhEQkZGKSB7XG4gICAgICAgICAgLy8gdW5leHBlY3RlZCB0cmFpbFxuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH0gZWxzZSBpZiAoaSArIDEgPT09IGxlbmd0aCkge1xuICAgICAgICAgIC8vIHVucGFpcmVkIGxlYWRcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gdmFsaWQgbGVhZFxuICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG5cbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8gMiBsZWFkcyBpbiBhIHJvd1xuICAgICAgaWYgKGNvZGVQb2ludCA8IDB4REMwMCkge1xuICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IGNvZGVQb2ludFxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyB2YWxpZCBzdXJyb2dhdGUgcGFpclxuICAgICAgY29kZVBvaW50ID0gKGxlYWRTdXJyb2dhdGUgLSAweEQ4MDAgPDwgMTAgfCBjb2RlUG9pbnQgLSAweERDMDApICsgMHgxMDAwMFxuICAgIH0gZWxzZSBpZiAobGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgLy8gdmFsaWQgYm1wIGNoYXIsIGJ1dCBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgfVxuXG4gICAgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcblxuICAgIC8vIGVuY29kZSB1dGY4XG4gICAgaWYgKGNvZGVQb2ludCA8IDB4ODApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMSkgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChjb2RlUG9pbnQpXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDgwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2IHwgMHhDMCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyB8IDB4RTAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTEwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDQpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDEyIHwgMHhGMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjb2RlIHBvaW50JylcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnl0ZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgKytpKSB7XG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGKVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMgKHN0ciwgdW5pdHMpIHtcbiAgdmFyIGMsIGhpLCBsb1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcblxuICAgIGMgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGhpID0gYyA+PiA4XG4gICAgbG8gPSBjICUgMjU2XG4gICAgYnl0ZUFycmF5LnB1c2gobG8pXG4gICAgYnl0ZUFycmF5LnB1c2goaGkpXG4gIH1cblxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMgKHN0cikge1xuICByZXR1cm4gYmFzZTY0LnRvQnl0ZUFycmF5KGJhc2U2NGNsZWFuKHN0cikpXG59XG5cbmZ1bmN0aW9uIGJsaXRCdWZmZXIgKHNyYywgZHN0LCBvZmZzZXQsIGxlbmd0aCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgaWYgKChpICsgb2Zmc2V0ID49IGRzdC5sZW5ndGgpIHx8IChpID49IHNyYy5sZW5ndGgpKSBicmVha1xuICAgIGRzdFtpICsgb2Zmc2V0XSA9IHNyY1tpXVxuICB9XG4gIHJldHVybiBpXG59XG5cbi8vIEFycmF5QnVmZmVyIG9yIFVpbnQ4QXJyYXkgb2JqZWN0cyBmcm9tIG90aGVyIGNvbnRleHRzIChpLmUuIGlmcmFtZXMpIGRvIG5vdCBwYXNzXG4vLyB0aGUgYGluc3RhbmNlb2ZgIGNoZWNrIGJ1dCB0aGV5IHNob3VsZCBiZSB0cmVhdGVkIGFzIG9mIHRoYXQgdHlwZS5cbi8vIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvaXNzdWVzLzE2NlxuZnVuY3Rpb24gaXNJbnN0YW5jZSAob2JqLCB0eXBlKSB7XG4gIHJldHVybiBvYmogaW5zdGFuY2VvZiB0eXBlIHx8XG4gICAgKG9iaiAhPSBudWxsICYmIG9iai5jb25zdHJ1Y3RvciAhPSBudWxsICYmIG9iai5jb25zdHJ1Y3Rvci5uYW1lICE9IG51bGwgJiZcbiAgICAgIG9iai5jb25zdHJ1Y3Rvci5uYW1lID09PSB0eXBlLm5hbWUpXG59XG5mdW5jdGlvbiBudW1iZXJJc05hTiAob2JqKSB7XG4gIC8vIEZvciBJRTExIHN1cHBvcnRcbiAgcmV0dXJuIG9iaiAhPT0gb2JqIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tc2VsZi1jb21wYXJlXG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBHZXRJbnRyaW5zaWMgPSByZXF1aXJlKCdnZXQtaW50cmluc2ljJyk7XG5cbnZhciBjYWxsQmluZCA9IHJlcXVpcmUoJy4vJyk7XG5cbnZhciAkaW5kZXhPZiA9IGNhbGxCaW5kKEdldEludHJpbnNpYygnU3RyaW5nLnByb3RvdHlwZS5pbmRleE9mJykpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGNhbGxCb3VuZEludHJpbnNpYyhuYW1lLCBhbGxvd01pc3NpbmcpIHtcblx0dmFyIGludHJpbnNpYyA9IEdldEludHJpbnNpYyhuYW1lLCAhIWFsbG93TWlzc2luZyk7XG5cdGlmICh0eXBlb2YgaW50cmluc2ljID09PSAnZnVuY3Rpb24nICYmICRpbmRleE9mKG5hbWUsICcucHJvdG90eXBlLicpID4gLTEpIHtcblx0XHRyZXR1cm4gY2FsbEJpbmQoaW50cmluc2ljKTtcblx0fVxuXHRyZXR1cm4gaW50cmluc2ljO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGJpbmQgPSByZXF1aXJlKCdmdW5jdGlvbi1iaW5kJyk7XG52YXIgR2V0SW50cmluc2ljID0gcmVxdWlyZSgnZ2V0LWludHJpbnNpYycpO1xuXG52YXIgJGFwcGx5ID0gR2V0SW50cmluc2ljKCclRnVuY3Rpb24ucHJvdG90eXBlLmFwcGx5JScpO1xudmFyICRjYWxsID0gR2V0SW50cmluc2ljKCclRnVuY3Rpb24ucHJvdG90eXBlLmNhbGwlJyk7XG52YXIgJHJlZmxlY3RBcHBseSA9IEdldEludHJpbnNpYygnJVJlZmxlY3QuYXBwbHklJywgdHJ1ZSkgfHwgYmluZC5jYWxsKCRjYWxsLCAkYXBwbHkpO1xuXG52YXIgJGdPUEQgPSBHZXRJbnRyaW5zaWMoJyVPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yJScsIHRydWUpO1xudmFyICRkZWZpbmVQcm9wZXJ0eSA9IEdldEludHJpbnNpYygnJU9iamVjdC5kZWZpbmVQcm9wZXJ0eSUnLCB0cnVlKTtcbnZhciAkbWF4ID0gR2V0SW50cmluc2ljKCclTWF0aC5tYXglJyk7XG5cbmlmICgkZGVmaW5lUHJvcGVydHkpIHtcblx0dHJ5IHtcblx0XHQkZGVmaW5lUHJvcGVydHkoe30sICdhJywgeyB2YWx1ZTogMSB9KTtcblx0fSBjYXRjaCAoZSkge1xuXHRcdC8vIElFIDggaGFzIGEgYnJva2VuIGRlZmluZVByb3BlcnR5XG5cdFx0JGRlZmluZVByb3BlcnR5ID0gbnVsbDtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGNhbGxCaW5kKG9yaWdpbmFsRnVuY3Rpb24pIHtcblx0dmFyIGZ1bmMgPSAkcmVmbGVjdEFwcGx5KGJpbmQsICRjYWxsLCBhcmd1bWVudHMpO1xuXHRpZiAoJGdPUEQgJiYgJGRlZmluZVByb3BlcnR5KSB7XG5cdFx0dmFyIGRlc2MgPSAkZ09QRChmdW5jLCAnbGVuZ3RoJyk7XG5cdFx0aWYgKGRlc2MuY29uZmlndXJhYmxlKSB7XG5cdFx0XHQvLyBvcmlnaW5hbCBsZW5ndGgsIHBsdXMgdGhlIHJlY2VpdmVyLCBtaW51cyBhbnkgYWRkaXRpb25hbCBhcmd1bWVudHMgKGFmdGVyIHRoZSByZWNlaXZlcilcblx0XHRcdCRkZWZpbmVQcm9wZXJ0eShcblx0XHRcdFx0ZnVuYyxcblx0XHRcdFx0J2xlbmd0aCcsXG5cdFx0XHRcdHsgdmFsdWU6IDEgKyAkbWF4KDAsIG9yaWdpbmFsRnVuY3Rpb24ubGVuZ3RoIC0gKGFyZ3VtZW50cy5sZW5ndGggLSAxKSkgfVxuXHRcdFx0KTtcblx0XHR9XG5cdH1cblx0cmV0dXJuIGZ1bmM7XG59O1xuXG52YXIgYXBwbHlCaW5kID0gZnVuY3Rpb24gYXBwbHlCaW5kKCkge1xuXHRyZXR1cm4gJHJlZmxlY3RBcHBseShiaW5kLCAkYXBwbHksIGFyZ3VtZW50cyk7XG59O1xuXG5pZiAoJGRlZmluZVByb3BlcnR5KSB7XG5cdCRkZWZpbmVQcm9wZXJ0eShtb2R1bGUuZXhwb3J0cywgJ2FwcGx5JywgeyB2YWx1ZTogYXBwbHlCaW5kIH0pO1xufSBlbHNlIHtcblx0bW9kdWxlLmV4cG9ydHMuYXBwbHkgPSBhcHBseUJpbmQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBpc0NhbGxhYmxlID0gcmVxdWlyZSgnaXMtY2FsbGFibGUnKTtcblxudmFyIHRvU3RyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbnZhciBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbnZhciBmb3JFYWNoQXJyYXkgPSBmdW5jdGlvbiBmb3JFYWNoQXJyYXkoYXJyYXksIGl0ZXJhdG9yLCByZWNlaXZlcikge1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBhcnJheS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBpZiAoaGFzT3duUHJvcGVydHkuY2FsbChhcnJheSwgaSkpIHtcbiAgICAgICAgICAgIGlmIChyZWNlaXZlciA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgaXRlcmF0b3IoYXJyYXlbaV0sIGksIGFycmF5KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaXRlcmF0b3IuY2FsbChyZWNlaXZlciwgYXJyYXlbaV0sIGksIGFycmF5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbnZhciBmb3JFYWNoU3RyaW5nID0gZnVuY3Rpb24gZm9yRWFjaFN0cmluZyhzdHJpbmcsIGl0ZXJhdG9yLCByZWNlaXZlcikge1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBzdHJpbmcubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgLy8gbm8gc3VjaCB0aGluZyBhcyBhIHNwYXJzZSBzdHJpbmcuXG4gICAgICAgIGlmIChyZWNlaXZlciA9PSBudWxsKSB7XG4gICAgICAgICAgICBpdGVyYXRvcihzdHJpbmcuY2hhckF0KGkpLCBpLCBzdHJpbmcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaXRlcmF0b3IuY2FsbChyZWNlaXZlciwgc3RyaW5nLmNoYXJBdChpKSwgaSwgc3RyaW5nKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbnZhciBmb3JFYWNoT2JqZWN0ID0gZnVuY3Rpb24gZm9yRWFjaE9iamVjdChvYmplY3QsIGl0ZXJhdG9yLCByZWNlaXZlcikge1xuICAgIGZvciAodmFyIGsgaW4gb2JqZWN0KSB7XG4gICAgICAgIGlmIChoYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgaykpIHtcbiAgICAgICAgICAgIGlmIChyZWNlaXZlciA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgaXRlcmF0b3Iob2JqZWN0W2tdLCBrLCBvYmplY3QpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpdGVyYXRvci5jYWxsKHJlY2VpdmVyLCBvYmplY3Rba10sIGssIG9iamVjdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG52YXIgZm9yRWFjaCA9IGZ1bmN0aW9uIGZvckVhY2gobGlzdCwgaXRlcmF0b3IsIHRoaXNBcmcpIHtcbiAgICBpZiAoIWlzQ2FsbGFibGUoaXRlcmF0b3IpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2l0ZXJhdG9yIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgIH1cblxuICAgIHZhciByZWNlaXZlcjtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSAzKSB7XG4gICAgICAgIHJlY2VpdmVyID0gdGhpc0FyZztcbiAgICB9XG5cbiAgICBpZiAodG9TdHIuY2FsbChsaXN0KSA9PT0gJ1tvYmplY3QgQXJyYXldJykge1xuICAgICAgICBmb3JFYWNoQXJyYXkobGlzdCwgaXRlcmF0b3IsIHJlY2VpdmVyKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBsaXN0ID09PSAnc3RyaW5nJykge1xuICAgICAgICBmb3JFYWNoU3RyaW5nKGxpc3QsIGl0ZXJhdG9yLCByZWNlaXZlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yRWFjaE9iamVjdChsaXN0LCBpdGVyYXRvciwgcmVjZWl2ZXIpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZm9yRWFjaDtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyogZXNsaW50IG5vLWludmFsaWQtdGhpczogMSAqL1xuXG52YXIgRVJST1JfTUVTU0FHRSA9ICdGdW5jdGlvbi5wcm90b3R5cGUuYmluZCBjYWxsZWQgb24gaW5jb21wYXRpYmxlICc7XG52YXIgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG52YXIgdG9TdHIgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xudmFyIGZ1bmNUeXBlID0gJ1tvYmplY3QgRnVuY3Rpb25dJztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBiaW5kKHRoYXQpIHtcbiAgICB2YXIgdGFyZ2V0ID0gdGhpcztcbiAgICBpZiAodHlwZW9mIHRhcmdldCAhPT0gJ2Z1bmN0aW9uJyB8fCB0b1N0ci5jYWxsKHRhcmdldCkgIT09IGZ1bmNUeXBlKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoRVJST1JfTUVTU0FHRSArIHRhcmdldCk7XG4gICAgfVxuICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuXG4gICAgdmFyIGJvdW5kO1xuICAgIHZhciBiaW5kZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzIGluc3RhbmNlb2YgYm91bmQpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSB0YXJnZXQuYXBwbHkoXG4gICAgICAgICAgICAgICAgdGhpcyxcbiAgICAgICAgICAgICAgICBhcmdzLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgaWYgKE9iamVjdChyZXN1bHQpID09PSByZXN1bHQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0LmFwcGx5KFxuICAgICAgICAgICAgICAgIHRoYXQsXG4gICAgICAgICAgICAgICAgYXJncy5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMpKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgYm91bmRMZW5ndGggPSBNYXRoLm1heCgwLCB0YXJnZXQubGVuZ3RoIC0gYXJncy5sZW5ndGgpO1xuICAgIHZhciBib3VuZEFyZ3MgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJvdW5kTGVuZ3RoOyBpKyspIHtcbiAgICAgICAgYm91bmRBcmdzLnB1c2goJyQnICsgaSk7XG4gICAgfVxuXG4gICAgYm91bmQgPSBGdW5jdGlvbignYmluZGVyJywgJ3JldHVybiBmdW5jdGlvbiAoJyArIGJvdW5kQXJncy5qb2luKCcsJykgKyAnKXsgcmV0dXJuIGJpbmRlci5hcHBseSh0aGlzLGFyZ3VtZW50cyk7IH0nKShiaW5kZXIpO1xuXG4gICAgaWYgKHRhcmdldC5wcm90b3R5cGUpIHtcbiAgICAgICAgdmFyIEVtcHR5ID0gZnVuY3Rpb24gRW1wdHkoKSB7fTtcbiAgICAgICAgRW1wdHkucHJvdG90eXBlID0gdGFyZ2V0LnByb3RvdHlwZTtcbiAgICAgICAgYm91bmQucHJvdG90eXBlID0gbmV3IEVtcHR5KCk7XG4gICAgICAgIEVtcHR5LnByb3RvdHlwZSA9IG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIGJvdW5kO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGltcGxlbWVudGF0aW9uID0gcmVxdWlyZSgnLi9pbXBsZW1lbnRhdGlvbicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kIHx8IGltcGxlbWVudGF0aW9uO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdW5kZWZpbmVkO1xuXG52YXIgJFN5bnRheEVycm9yID0gU3ludGF4RXJyb3I7XG52YXIgJEZ1bmN0aW9uID0gRnVuY3Rpb247XG52YXIgJFR5cGVFcnJvciA9IFR5cGVFcnJvcjtcblxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGNvbnNpc3RlbnQtcmV0dXJuXG52YXIgZ2V0RXZhbGxlZENvbnN0cnVjdG9yID0gZnVuY3Rpb24gKGV4cHJlc3Npb25TeW50YXgpIHtcblx0dHJ5IHtcblx0XHRyZXR1cm4gJEZ1bmN0aW9uKCdcInVzZSBzdHJpY3RcIjsgcmV0dXJuICgnICsgZXhwcmVzc2lvblN5bnRheCArICcpLmNvbnN0cnVjdG9yOycpKCk7XG5cdH0gY2F0Y2ggKGUpIHt9XG59O1xuXG52YXIgJGdPUEQgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yO1xuaWYgKCRnT1BEKSB7XG5cdHRyeSB7XG5cdFx0JGdPUEQoe30sICcnKTtcblx0fSBjYXRjaCAoZSkge1xuXHRcdCRnT1BEID0gbnVsbDsgLy8gdGhpcyBpcyBJRSA4LCB3aGljaCBoYXMgYSBicm9rZW4gZ09QRFxuXHR9XG59XG5cbnZhciB0aHJvd1R5cGVFcnJvciA9IGZ1bmN0aW9uICgpIHtcblx0dGhyb3cgbmV3ICRUeXBlRXJyb3IoKTtcbn07XG52YXIgVGhyb3dUeXBlRXJyb3IgPSAkZ09QRFxuXHQ/IChmdW5jdGlvbiAoKSB7XG5cdFx0dHJ5IHtcblx0XHRcdC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby11bnVzZWQtZXhwcmVzc2lvbnMsIG5vLWNhbGxlciwgbm8tcmVzdHJpY3RlZC1wcm9wZXJ0aWVzXG5cdFx0XHRhcmd1bWVudHMuY2FsbGVlOyAvLyBJRSA4IGRvZXMgbm90IHRocm93IGhlcmVcblx0XHRcdHJldHVybiB0aHJvd1R5cGVFcnJvcjtcblx0XHR9IGNhdGNoIChjYWxsZWVUaHJvd3MpIHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdC8vIElFIDggdGhyb3dzIG9uIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoYXJndW1lbnRzLCAnJylcblx0XHRcdFx0cmV0dXJuICRnT1BEKGFyZ3VtZW50cywgJ2NhbGxlZScpLmdldDtcblx0XHRcdH0gY2F0Y2ggKGdPUER0aHJvd3MpIHtcblx0XHRcdFx0cmV0dXJuIHRocm93VHlwZUVycm9yO1xuXHRcdFx0fVxuXHRcdH1cblx0fSgpKVxuXHQ6IHRocm93VHlwZUVycm9yO1xuXG52YXIgaGFzU3ltYm9scyA9IHJlcXVpcmUoJ2hhcy1zeW1ib2xzJykoKTtcblxudmFyIGdldFByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mIHx8IGZ1bmN0aW9uICh4KSB7IHJldHVybiB4Ll9fcHJvdG9fXzsgfTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1wcm90b1xuXG52YXIgbmVlZHNFdmFsID0ge307XG5cbnZhciBUeXBlZEFycmF5ID0gdHlwZW9mIFVpbnQ4QXJyYXkgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogZ2V0UHJvdG8oVWludDhBcnJheSk7XG5cbnZhciBJTlRSSU5TSUNTID0ge1xuXHQnJUFnZ3JlZ2F0ZUVycm9yJSc6IHR5cGVvZiBBZ2dyZWdhdGVFcnJvciA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBBZ2dyZWdhdGVFcnJvcixcblx0JyVBcnJheSUnOiBBcnJheSxcblx0JyVBcnJheUJ1ZmZlciUnOiB0eXBlb2YgQXJyYXlCdWZmZXIgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogQXJyYXlCdWZmZXIsXG5cdCclQXJyYXlJdGVyYXRvclByb3RvdHlwZSUnOiBoYXNTeW1ib2xzID8gZ2V0UHJvdG8oW11bU3ltYm9sLml0ZXJhdG9yXSgpKSA6IHVuZGVmaW5lZCxcblx0JyVBc3luY0Zyb21TeW5jSXRlcmF0b3JQcm90b3R5cGUlJzogdW5kZWZpbmVkLFxuXHQnJUFzeW5jRnVuY3Rpb24lJzogbmVlZHNFdmFsLFxuXHQnJUFzeW5jR2VuZXJhdG9yJSc6IG5lZWRzRXZhbCxcblx0JyVBc3luY0dlbmVyYXRvckZ1bmN0aW9uJSc6IG5lZWRzRXZhbCxcblx0JyVBc3luY0l0ZXJhdG9yUHJvdG90eXBlJSc6IG5lZWRzRXZhbCxcblx0JyVBdG9taWNzJSc6IHR5cGVvZiBBdG9taWNzID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IEF0b21pY3MsXG5cdCclQmlnSW50JSc6IHR5cGVvZiBCaWdJbnQgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogQmlnSW50LFxuXHQnJUJpZ0ludDY0QXJyYXklJzogdHlwZW9mIEJpZ0ludDY0QXJyYXkgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogQmlnSW50NjRBcnJheSxcblx0JyVCaWdVaW50NjRBcnJheSUnOiB0eXBlb2YgQmlnVWludDY0QXJyYXkgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogQmlnVWludDY0QXJyYXksXG5cdCclQm9vbGVhbiUnOiBCb29sZWFuLFxuXHQnJURhdGFWaWV3JSc6IHR5cGVvZiBEYXRhVmlldyA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBEYXRhVmlldyxcblx0JyVEYXRlJSc6IERhdGUsXG5cdCclZGVjb2RlVVJJJSc6IGRlY29kZVVSSSxcblx0JyVkZWNvZGVVUklDb21wb25lbnQlJzogZGVjb2RlVVJJQ29tcG9uZW50LFxuXHQnJWVuY29kZVVSSSUnOiBlbmNvZGVVUkksXG5cdCclZW5jb2RlVVJJQ29tcG9uZW50JSc6IGVuY29kZVVSSUNvbXBvbmVudCxcblx0JyVFcnJvciUnOiBFcnJvcixcblx0JyVldmFsJSc6IGV2YWwsIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tZXZhbFxuXHQnJUV2YWxFcnJvciUnOiBFdmFsRXJyb3IsXG5cdCclRmxvYXQzMkFycmF5JSc6IHR5cGVvZiBGbG9hdDMyQXJyYXkgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogRmxvYXQzMkFycmF5LFxuXHQnJUZsb2F0NjRBcnJheSUnOiB0eXBlb2YgRmxvYXQ2NEFycmF5ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IEZsb2F0NjRBcnJheSxcblx0JyVGaW5hbGl6YXRpb25SZWdpc3RyeSUnOiB0eXBlb2YgRmluYWxpemF0aW9uUmVnaXN0cnkgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogRmluYWxpemF0aW9uUmVnaXN0cnksXG5cdCclRnVuY3Rpb24lJzogJEZ1bmN0aW9uLFxuXHQnJUdlbmVyYXRvckZ1bmN0aW9uJSc6IG5lZWRzRXZhbCxcblx0JyVJbnQ4QXJyYXklJzogdHlwZW9mIEludDhBcnJheSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBJbnQ4QXJyYXksXG5cdCclSW50MTZBcnJheSUnOiB0eXBlb2YgSW50MTZBcnJheSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBJbnQxNkFycmF5LFxuXHQnJUludDMyQXJyYXklJzogdHlwZW9mIEludDMyQXJyYXkgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogSW50MzJBcnJheSxcblx0JyVpc0Zpbml0ZSUnOiBpc0Zpbml0ZSxcblx0JyVpc05hTiUnOiBpc05hTixcblx0JyVJdGVyYXRvclByb3RvdHlwZSUnOiBoYXNTeW1ib2xzID8gZ2V0UHJvdG8oZ2V0UHJvdG8oW11bU3ltYm9sLml0ZXJhdG9yXSgpKSkgOiB1bmRlZmluZWQsXG5cdCclSlNPTiUnOiB0eXBlb2YgSlNPTiA9PT0gJ29iamVjdCcgPyBKU09OIDogdW5kZWZpbmVkLFxuXHQnJU1hcCUnOiB0eXBlb2YgTWFwID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IE1hcCxcblx0JyVNYXBJdGVyYXRvclByb3RvdHlwZSUnOiB0eXBlb2YgTWFwID09PSAndW5kZWZpbmVkJyB8fCAhaGFzU3ltYm9scyA/IHVuZGVmaW5lZCA6IGdldFByb3RvKG5ldyBNYXAoKVtTeW1ib2wuaXRlcmF0b3JdKCkpLFxuXHQnJU1hdGglJzogTWF0aCxcblx0JyVOdW1iZXIlJzogTnVtYmVyLFxuXHQnJU9iamVjdCUnOiBPYmplY3QsXG5cdCclcGFyc2VGbG9hdCUnOiBwYXJzZUZsb2F0LFxuXHQnJXBhcnNlSW50JSc6IHBhcnNlSW50LFxuXHQnJVByb21pc2UlJzogdHlwZW9mIFByb21pc2UgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogUHJvbWlzZSxcblx0JyVQcm94eSUnOiB0eXBlb2YgUHJveHkgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogUHJveHksXG5cdCclUmFuZ2VFcnJvciUnOiBSYW5nZUVycm9yLFxuXHQnJVJlZmVyZW5jZUVycm9yJSc6IFJlZmVyZW5jZUVycm9yLFxuXHQnJVJlZmxlY3QlJzogdHlwZW9mIFJlZmxlY3QgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogUmVmbGVjdCxcblx0JyVSZWdFeHAlJzogUmVnRXhwLFxuXHQnJVNldCUnOiB0eXBlb2YgU2V0ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IFNldCxcblx0JyVTZXRJdGVyYXRvclByb3RvdHlwZSUnOiB0eXBlb2YgU2V0ID09PSAndW5kZWZpbmVkJyB8fCAhaGFzU3ltYm9scyA/IHVuZGVmaW5lZCA6IGdldFByb3RvKG5ldyBTZXQoKVtTeW1ib2wuaXRlcmF0b3JdKCkpLFxuXHQnJVNoYXJlZEFycmF5QnVmZmVyJSc6IHR5cGVvZiBTaGFyZWRBcnJheUJ1ZmZlciA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBTaGFyZWRBcnJheUJ1ZmZlcixcblx0JyVTdHJpbmclJzogU3RyaW5nLFxuXHQnJVN0cmluZ0l0ZXJhdG9yUHJvdG90eXBlJSc6IGhhc1N5bWJvbHMgPyBnZXRQcm90bygnJ1tTeW1ib2wuaXRlcmF0b3JdKCkpIDogdW5kZWZpbmVkLFxuXHQnJVN5bWJvbCUnOiBoYXNTeW1ib2xzID8gU3ltYm9sIDogdW5kZWZpbmVkLFxuXHQnJVN5bnRheEVycm9yJSc6ICRTeW50YXhFcnJvcixcblx0JyVUaHJvd1R5cGVFcnJvciUnOiBUaHJvd1R5cGVFcnJvcixcblx0JyVUeXBlZEFycmF5JSc6IFR5cGVkQXJyYXksXG5cdCclVHlwZUVycm9yJSc6ICRUeXBlRXJyb3IsXG5cdCclVWludDhBcnJheSUnOiB0eXBlb2YgVWludDhBcnJheSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBVaW50OEFycmF5LFxuXHQnJVVpbnQ4Q2xhbXBlZEFycmF5JSc6IHR5cGVvZiBVaW50OENsYW1wZWRBcnJheSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBVaW50OENsYW1wZWRBcnJheSxcblx0JyVVaW50MTZBcnJheSUnOiB0eXBlb2YgVWludDE2QXJyYXkgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogVWludDE2QXJyYXksXG5cdCclVWludDMyQXJyYXklJzogdHlwZW9mIFVpbnQzMkFycmF5ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IFVpbnQzMkFycmF5LFxuXHQnJVVSSUVycm9yJSc6IFVSSUVycm9yLFxuXHQnJVdlYWtNYXAlJzogdHlwZW9mIFdlYWtNYXAgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogV2Vha01hcCxcblx0JyVXZWFrUmVmJSc6IHR5cGVvZiBXZWFrUmVmID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IFdlYWtSZWYsXG5cdCclV2Vha1NldCUnOiB0eXBlb2YgV2Vha1NldCA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBXZWFrU2V0XG59O1xuXG50cnkge1xuXHRudWxsLmVycm9yOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXVudXNlZC1leHByZXNzaW9uc1xufSBjYXRjaCAoZSkge1xuXHQvLyBodHRwczovL2dpdGh1Yi5jb20vdGMzOS9wcm9wb3NhbC1zaGFkb3dyZWFsbS9wdWxsLzM4NCNpc3N1ZWNvbW1lbnQtMTM2NDI2NDIyOVxuXHR2YXIgZXJyb3JQcm90byA9IGdldFByb3RvKGdldFByb3RvKGUpKTtcblx0SU5UUklOU0lDU1snJUVycm9yLnByb3RvdHlwZSUnXSA9IGVycm9yUHJvdG87XG59XG5cbnZhciBkb0V2YWwgPSBmdW5jdGlvbiBkb0V2YWwobmFtZSkge1xuXHR2YXIgdmFsdWU7XG5cdGlmIChuYW1lID09PSAnJUFzeW5jRnVuY3Rpb24lJykge1xuXHRcdHZhbHVlID0gZ2V0RXZhbGxlZENvbnN0cnVjdG9yKCdhc3luYyBmdW5jdGlvbiAoKSB7fScpO1xuXHR9IGVsc2UgaWYgKG5hbWUgPT09ICclR2VuZXJhdG9yRnVuY3Rpb24lJykge1xuXHRcdHZhbHVlID0gZ2V0RXZhbGxlZENvbnN0cnVjdG9yKCdmdW5jdGlvbiogKCkge30nKTtcblx0fSBlbHNlIGlmIChuYW1lID09PSAnJUFzeW5jR2VuZXJhdG9yRnVuY3Rpb24lJykge1xuXHRcdHZhbHVlID0gZ2V0RXZhbGxlZENvbnN0cnVjdG9yKCdhc3luYyBmdW5jdGlvbiogKCkge30nKTtcblx0fSBlbHNlIGlmIChuYW1lID09PSAnJUFzeW5jR2VuZXJhdG9yJScpIHtcblx0XHR2YXIgZm4gPSBkb0V2YWwoJyVBc3luY0dlbmVyYXRvckZ1bmN0aW9uJScpO1xuXHRcdGlmIChmbikge1xuXHRcdFx0dmFsdWUgPSBmbi5wcm90b3R5cGU7XG5cdFx0fVxuXHR9IGVsc2UgaWYgKG5hbWUgPT09ICclQXN5bmNJdGVyYXRvclByb3RvdHlwZSUnKSB7XG5cdFx0dmFyIGdlbiA9IGRvRXZhbCgnJUFzeW5jR2VuZXJhdG9yJScpO1xuXHRcdGlmIChnZW4pIHtcblx0XHRcdHZhbHVlID0gZ2V0UHJvdG8oZ2VuLnByb3RvdHlwZSk7XG5cdFx0fVxuXHR9XG5cblx0SU5UUklOU0lDU1tuYW1lXSA9IHZhbHVlO1xuXG5cdHJldHVybiB2YWx1ZTtcbn07XG5cbnZhciBMRUdBQ1lfQUxJQVNFUyA9IHtcblx0JyVBcnJheUJ1ZmZlclByb3RvdHlwZSUnOiBbJ0FycmF5QnVmZmVyJywgJ3Byb3RvdHlwZSddLFxuXHQnJUFycmF5UHJvdG90eXBlJSc6IFsnQXJyYXknLCAncHJvdG90eXBlJ10sXG5cdCclQXJyYXlQcm90b19lbnRyaWVzJSc6IFsnQXJyYXknLCAncHJvdG90eXBlJywgJ2VudHJpZXMnXSxcblx0JyVBcnJheVByb3RvX2ZvckVhY2glJzogWydBcnJheScsICdwcm90b3R5cGUnLCAnZm9yRWFjaCddLFxuXHQnJUFycmF5UHJvdG9fa2V5cyUnOiBbJ0FycmF5JywgJ3Byb3RvdHlwZScsICdrZXlzJ10sXG5cdCclQXJyYXlQcm90b192YWx1ZXMlJzogWydBcnJheScsICdwcm90b3R5cGUnLCAndmFsdWVzJ10sXG5cdCclQXN5bmNGdW5jdGlvblByb3RvdHlwZSUnOiBbJ0FzeW5jRnVuY3Rpb24nLCAncHJvdG90eXBlJ10sXG5cdCclQXN5bmNHZW5lcmF0b3IlJzogWydBc3luY0dlbmVyYXRvckZ1bmN0aW9uJywgJ3Byb3RvdHlwZSddLFxuXHQnJUFzeW5jR2VuZXJhdG9yUHJvdG90eXBlJSc6IFsnQXN5bmNHZW5lcmF0b3JGdW5jdGlvbicsICdwcm90b3R5cGUnLCAncHJvdG90eXBlJ10sXG5cdCclQm9vbGVhblByb3RvdHlwZSUnOiBbJ0Jvb2xlYW4nLCAncHJvdG90eXBlJ10sXG5cdCclRGF0YVZpZXdQcm90b3R5cGUlJzogWydEYXRhVmlldycsICdwcm90b3R5cGUnXSxcblx0JyVEYXRlUHJvdG90eXBlJSc6IFsnRGF0ZScsICdwcm90b3R5cGUnXSxcblx0JyVFcnJvclByb3RvdHlwZSUnOiBbJ0Vycm9yJywgJ3Byb3RvdHlwZSddLFxuXHQnJUV2YWxFcnJvclByb3RvdHlwZSUnOiBbJ0V2YWxFcnJvcicsICdwcm90b3R5cGUnXSxcblx0JyVGbG9hdDMyQXJyYXlQcm90b3R5cGUlJzogWydGbG9hdDMyQXJyYXknLCAncHJvdG90eXBlJ10sXG5cdCclRmxvYXQ2NEFycmF5UHJvdG90eXBlJSc6IFsnRmxvYXQ2NEFycmF5JywgJ3Byb3RvdHlwZSddLFxuXHQnJUZ1bmN0aW9uUHJvdG90eXBlJSc6IFsnRnVuY3Rpb24nLCAncHJvdG90eXBlJ10sXG5cdCclR2VuZXJhdG9yJSc6IFsnR2VuZXJhdG9yRnVuY3Rpb24nLCAncHJvdG90eXBlJ10sXG5cdCclR2VuZXJhdG9yUHJvdG90eXBlJSc6IFsnR2VuZXJhdG9yRnVuY3Rpb24nLCAncHJvdG90eXBlJywgJ3Byb3RvdHlwZSddLFxuXHQnJUludDhBcnJheVByb3RvdHlwZSUnOiBbJ0ludDhBcnJheScsICdwcm90b3R5cGUnXSxcblx0JyVJbnQxNkFycmF5UHJvdG90eXBlJSc6IFsnSW50MTZBcnJheScsICdwcm90b3R5cGUnXSxcblx0JyVJbnQzMkFycmF5UHJvdG90eXBlJSc6IFsnSW50MzJBcnJheScsICdwcm90b3R5cGUnXSxcblx0JyVKU09OUGFyc2UlJzogWydKU09OJywgJ3BhcnNlJ10sXG5cdCclSlNPTlN0cmluZ2lmeSUnOiBbJ0pTT04nLCAnc3RyaW5naWZ5J10sXG5cdCclTWFwUHJvdG90eXBlJSc6IFsnTWFwJywgJ3Byb3RvdHlwZSddLFxuXHQnJU51bWJlclByb3RvdHlwZSUnOiBbJ051bWJlcicsICdwcm90b3R5cGUnXSxcblx0JyVPYmplY3RQcm90b3R5cGUlJzogWydPYmplY3QnLCAncHJvdG90eXBlJ10sXG5cdCclT2JqUHJvdG9fdG9TdHJpbmclJzogWydPYmplY3QnLCAncHJvdG90eXBlJywgJ3RvU3RyaW5nJ10sXG5cdCclT2JqUHJvdG9fdmFsdWVPZiUnOiBbJ09iamVjdCcsICdwcm90b3R5cGUnLCAndmFsdWVPZiddLFxuXHQnJVByb21pc2VQcm90b3R5cGUlJzogWydQcm9taXNlJywgJ3Byb3RvdHlwZSddLFxuXHQnJVByb21pc2VQcm90b190aGVuJSc6IFsnUHJvbWlzZScsICdwcm90b3R5cGUnLCAndGhlbiddLFxuXHQnJVByb21pc2VfYWxsJSc6IFsnUHJvbWlzZScsICdhbGwnXSxcblx0JyVQcm9taXNlX3JlamVjdCUnOiBbJ1Byb21pc2UnLCAncmVqZWN0J10sXG5cdCclUHJvbWlzZV9yZXNvbHZlJSc6IFsnUHJvbWlzZScsICdyZXNvbHZlJ10sXG5cdCclUmFuZ2VFcnJvclByb3RvdHlwZSUnOiBbJ1JhbmdlRXJyb3InLCAncHJvdG90eXBlJ10sXG5cdCclUmVmZXJlbmNlRXJyb3JQcm90b3R5cGUlJzogWydSZWZlcmVuY2VFcnJvcicsICdwcm90b3R5cGUnXSxcblx0JyVSZWdFeHBQcm90b3R5cGUlJzogWydSZWdFeHAnLCAncHJvdG90eXBlJ10sXG5cdCclU2V0UHJvdG90eXBlJSc6IFsnU2V0JywgJ3Byb3RvdHlwZSddLFxuXHQnJVNoYXJlZEFycmF5QnVmZmVyUHJvdG90eXBlJSc6IFsnU2hhcmVkQXJyYXlCdWZmZXInLCAncHJvdG90eXBlJ10sXG5cdCclU3RyaW5nUHJvdG90eXBlJSc6IFsnU3RyaW5nJywgJ3Byb3RvdHlwZSddLFxuXHQnJVN5bWJvbFByb3RvdHlwZSUnOiBbJ1N5bWJvbCcsICdwcm90b3R5cGUnXSxcblx0JyVTeW50YXhFcnJvclByb3RvdHlwZSUnOiBbJ1N5bnRheEVycm9yJywgJ3Byb3RvdHlwZSddLFxuXHQnJVR5cGVkQXJyYXlQcm90b3R5cGUlJzogWydUeXBlZEFycmF5JywgJ3Byb3RvdHlwZSddLFxuXHQnJVR5cGVFcnJvclByb3RvdHlwZSUnOiBbJ1R5cGVFcnJvcicsICdwcm90b3R5cGUnXSxcblx0JyVVaW50OEFycmF5UHJvdG90eXBlJSc6IFsnVWludDhBcnJheScsICdwcm90b3R5cGUnXSxcblx0JyVVaW50OENsYW1wZWRBcnJheVByb3RvdHlwZSUnOiBbJ1VpbnQ4Q2xhbXBlZEFycmF5JywgJ3Byb3RvdHlwZSddLFxuXHQnJVVpbnQxNkFycmF5UHJvdG90eXBlJSc6IFsnVWludDE2QXJyYXknLCAncHJvdG90eXBlJ10sXG5cdCclVWludDMyQXJyYXlQcm90b3R5cGUlJzogWydVaW50MzJBcnJheScsICdwcm90b3R5cGUnXSxcblx0JyVVUklFcnJvclByb3RvdHlwZSUnOiBbJ1VSSUVycm9yJywgJ3Byb3RvdHlwZSddLFxuXHQnJVdlYWtNYXBQcm90b3R5cGUlJzogWydXZWFrTWFwJywgJ3Byb3RvdHlwZSddLFxuXHQnJVdlYWtTZXRQcm90b3R5cGUlJzogWydXZWFrU2V0JywgJ3Byb3RvdHlwZSddXG59O1xuXG52YXIgYmluZCA9IHJlcXVpcmUoJ2Z1bmN0aW9uLWJpbmQnKTtcbnZhciBoYXNPd24gPSByZXF1aXJlKCdoYXMnKTtcbnZhciAkY29uY2F0ID0gYmluZC5jYWxsKEZ1bmN0aW9uLmNhbGwsIEFycmF5LnByb3RvdHlwZS5jb25jYXQpO1xudmFyICRzcGxpY2VBcHBseSA9IGJpbmQuY2FsbChGdW5jdGlvbi5hcHBseSwgQXJyYXkucHJvdG90eXBlLnNwbGljZSk7XG52YXIgJHJlcGxhY2UgPSBiaW5kLmNhbGwoRnVuY3Rpb24uY2FsbCwgU3RyaW5nLnByb3RvdHlwZS5yZXBsYWNlKTtcbnZhciAkc3RyU2xpY2UgPSBiaW5kLmNhbGwoRnVuY3Rpb24uY2FsbCwgU3RyaW5nLnByb3RvdHlwZS5zbGljZSk7XG52YXIgJGV4ZWMgPSBiaW5kLmNhbGwoRnVuY3Rpb24uY2FsbCwgUmVnRXhwLnByb3RvdHlwZS5leGVjKTtcblxuLyogYWRhcHRlZCBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9sb2Rhc2gvbG9kYXNoL2Jsb2IvNC4xNy4xNS9kaXN0L2xvZGFzaC5qcyNMNjczNS1MNjc0NCAqL1xudmFyIHJlUHJvcE5hbWUgPSAvW14lLltcXF1dK3xcXFsoPzooLT9cXGQrKD86XFwuXFxkKyk/KXwoW1wiJ10pKCg/Oig/IVxcMilbXlxcXFxdfFxcXFwuKSo/KVxcMilcXF18KD89KD86XFwufFxcW1xcXSkoPzpcXC58XFxbXFxdfCUkKSkvZztcbnZhciByZUVzY2FwZUNoYXIgPSAvXFxcXChcXFxcKT8vZzsgLyoqIFVzZWQgdG8gbWF0Y2ggYmFja3NsYXNoZXMgaW4gcHJvcGVydHkgcGF0aHMuICovXG52YXIgc3RyaW5nVG9QYXRoID0gZnVuY3Rpb24gc3RyaW5nVG9QYXRoKHN0cmluZykge1xuXHR2YXIgZmlyc3QgPSAkc3RyU2xpY2Uoc3RyaW5nLCAwLCAxKTtcblx0dmFyIGxhc3QgPSAkc3RyU2xpY2Uoc3RyaW5nLCAtMSk7XG5cdGlmIChmaXJzdCA9PT0gJyUnICYmIGxhc3QgIT09ICclJykge1xuXHRcdHRocm93IG5ldyAkU3ludGF4RXJyb3IoJ2ludmFsaWQgaW50cmluc2ljIHN5bnRheCwgZXhwZWN0ZWQgY2xvc2luZyBgJWAnKTtcblx0fSBlbHNlIGlmIChsYXN0ID09PSAnJScgJiYgZmlyc3QgIT09ICclJykge1xuXHRcdHRocm93IG5ldyAkU3ludGF4RXJyb3IoJ2ludmFsaWQgaW50cmluc2ljIHN5bnRheCwgZXhwZWN0ZWQgb3BlbmluZyBgJWAnKTtcblx0fVxuXHR2YXIgcmVzdWx0ID0gW107XG5cdCRyZXBsYWNlKHN0cmluZywgcmVQcm9wTmFtZSwgZnVuY3Rpb24gKG1hdGNoLCBudW1iZXIsIHF1b3RlLCBzdWJTdHJpbmcpIHtcblx0XHRyZXN1bHRbcmVzdWx0Lmxlbmd0aF0gPSBxdW90ZSA/ICRyZXBsYWNlKHN1YlN0cmluZywgcmVFc2NhcGVDaGFyLCAnJDEnKSA6IG51bWJlciB8fCBtYXRjaDtcblx0fSk7XG5cdHJldHVybiByZXN1bHQ7XG59O1xuLyogZW5kIGFkYXB0YXRpb24gKi9cblxudmFyIGdldEJhc2VJbnRyaW5zaWMgPSBmdW5jdGlvbiBnZXRCYXNlSW50cmluc2ljKG5hbWUsIGFsbG93TWlzc2luZykge1xuXHR2YXIgaW50cmluc2ljTmFtZSA9IG5hbWU7XG5cdHZhciBhbGlhcztcblx0aWYgKGhhc093bihMRUdBQ1lfQUxJQVNFUywgaW50cmluc2ljTmFtZSkpIHtcblx0XHRhbGlhcyA9IExFR0FDWV9BTElBU0VTW2ludHJpbnNpY05hbWVdO1xuXHRcdGludHJpbnNpY05hbWUgPSAnJScgKyBhbGlhc1swXSArICclJztcblx0fVxuXG5cdGlmIChoYXNPd24oSU5UUklOU0lDUywgaW50cmluc2ljTmFtZSkpIHtcblx0XHR2YXIgdmFsdWUgPSBJTlRSSU5TSUNTW2ludHJpbnNpY05hbWVdO1xuXHRcdGlmICh2YWx1ZSA9PT0gbmVlZHNFdmFsKSB7XG5cdFx0XHR2YWx1ZSA9IGRvRXZhbChpbnRyaW5zaWNOYW1lKTtcblx0XHR9XG5cdFx0aWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcgJiYgIWFsbG93TWlzc2luZykge1xuXHRcdFx0dGhyb3cgbmV3ICRUeXBlRXJyb3IoJ2ludHJpbnNpYyAnICsgbmFtZSArICcgZXhpc3RzLCBidXQgaXMgbm90IGF2YWlsYWJsZS4gUGxlYXNlIGZpbGUgYW4gaXNzdWUhJyk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGFsaWFzOiBhbGlhcyxcblx0XHRcdG5hbWU6IGludHJpbnNpY05hbWUsXG5cdFx0XHR2YWx1ZTogdmFsdWVcblx0XHR9O1xuXHR9XG5cblx0dGhyb3cgbmV3ICRTeW50YXhFcnJvcignaW50cmluc2ljICcgKyBuYW1lICsgJyBkb2VzIG5vdCBleGlzdCEnKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gR2V0SW50cmluc2ljKG5hbWUsIGFsbG93TWlzc2luZykge1xuXHRpZiAodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnIHx8IG5hbWUubGVuZ3RoID09PSAwKSB7XG5cdFx0dGhyb3cgbmV3ICRUeXBlRXJyb3IoJ2ludHJpbnNpYyBuYW1lIG11c3QgYmUgYSBub24tZW1wdHkgc3RyaW5nJyk7XG5cdH1cblx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxICYmIHR5cGVvZiBhbGxvd01pc3NpbmcgIT09ICdib29sZWFuJykge1xuXHRcdHRocm93IG5ldyAkVHlwZUVycm9yKCdcImFsbG93TWlzc2luZ1wiIGFyZ3VtZW50IG11c3QgYmUgYSBib29sZWFuJyk7XG5cdH1cblxuXHRpZiAoJGV4ZWMoL14lP1teJV0qJT8kLywgbmFtZSkgPT09IG51bGwpIHtcblx0XHR0aHJvdyBuZXcgJFN5bnRheEVycm9yKCdgJWAgbWF5IG5vdCBiZSBwcmVzZW50IGFueXdoZXJlIGJ1dCBhdCB0aGUgYmVnaW5uaW5nIGFuZCBlbmQgb2YgdGhlIGludHJpbnNpYyBuYW1lJyk7XG5cdH1cblx0dmFyIHBhcnRzID0gc3RyaW5nVG9QYXRoKG5hbWUpO1xuXHR2YXIgaW50cmluc2ljQmFzZU5hbWUgPSBwYXJ0cy5sZW5ndGggPiAwID8gcGFydHNbMF0gOiAnJztcblxuXHR2YXIgaW50cmluc2ljID0gZ2V0QmFzZUludHJpbnNpYygnJScgKyBpbnRyaW5zaWNCYXNlTmFtZSArICclJywgYWxsb3dNaXNzaW5nKTtcblx0dmFyIGludHJpbnNpY1JlYWxOYW1lID0gaW50cmluc2ljLm5hbWU7XG5cdHZhciB2YWx1ZSA9IGludHJpbnNpYy52YWx1ZTtcblx0dmFyIHNraXBGdXJ0aGVyQ2FjaGluZyA9IGZhbHNlO1xuXG5cdHZhciBhbGlhcyA9IGludHJpbnNpYy5hbGlhcztcblx0aWYgKGFsaWFzKSB7XG5cdFx0aW50cmluc2ljQmFzZU5hbWUgPSBhbGlhc1swXTtcblx0XHQkc3BsaWNlQXBwbHkocGFydHMsICRjb25jYXQoWzAsIDFdLCBhbGlhcykpO1xuXHR9XG5cblx0Zm9yICh2YXIgaSA9IDEsIGlzT3duID0gdHJ1ZTsgaSA8IHBhcnRzLmxlbmd0aDsgaSArPSAxKSB7XG5cdFx0dmFyIHBhcnQgPSBwYXJ0c1tpXTtcblx0XHR2YXIgZmlyc3QgPSAkc3RyU2xpY2UocGFydCwgMCwgMSk7XG5cdFx0dmFyIGxhc3QgPSAkc3RyU2xpY2UocGFydCwgLTEpO1xuXHRcdGlmIChcblx0XHRcdChcblx0XHRcdFx0KGZpcnN0ID09PSAnXCInIHx8IGZpcnN0ID09PSBcIidcIiB8fCBmaXJzdCA9PT0gJ2AnKVxuXHRcdFx0XHR8fCAobGFzdCA9PT0gJ1wiJyB8fCBsYXN0ID09PSBcIidcIiB8fCBsYXN0ID09PSAnYCcpXG5cdFx0XHQpXG5cdFx0XHQmJiBmaXJzdCAhPT0gbGFzdFxuXHRcdCkge1xuXHRcdFx0dGhyb3cgbmV3ICRTeW50YXhFcnJvcigncHJvcGVydHkgbmFtZXMgd2l0aCBxdW90ZXMgbXVzdCBoYXZlIG1hdGNoaW5nIHF1b3RlcycpO1xuXHRcdH1cblx0XHRpZiAocGFydCA9PT0gJ2NvbnN0cnVjdG9yJyB8fCAhaXNPd24pIHtcblx0XHRcdHNraXBGdXJ0aGVyQ2FjaGluZyA9IHRydWU7XG5cdFx0fVxuXG5cdFx0aW50cmluc2ljQmFzZU5hbWUgKz0gJy4nICsgcGFydDtcblx0XHRpbnRyaW5zaWNSZWFsTmFtZSA9ICclJyArIGludHJpbnNpY0Jhc2VOYW1lICsgJyUnO1xuXG5cdFx0aWYgKGhhc093bihJTlRSSU5TSUNTLCBpbnRyaW5zaWNSZWFsTmFtZSkpIHtcblx0XHRcdHZhbHVlID0gSU5UUklOU0lDU1tpbnRyaW5zaWNSZWFsTmFtZV07XG5cdFx0fSBlbHNlIGlmICh2YWx1ZSAhPSBudWxsKSB7XG5cdFx0XHRpZiAoIShwYXJ0IGluIHZhbHVlKSkge1xuXHRcdFx0XHRpZiAoIWFsbG93TWlzc2luZykge1xuXHRcdFx0XHRcdHRocm93IG5ldyAkVHlwZUVycm9yKCdiYXNlIGludHJpbnNpYyBmb3IgJyArIG5hbWUgKyAnIGV4aXN0cywgYnV0IHRoZSBwcm9wZXJ0eSBpcyBub3QgYXZhaWxhYmxlLicpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB2b2lkIHVuZGVmaW5lZDtcblx0XHRcdH1cblx0XHRcdGlmICgkZ09QRCAmJiAoaSArIDEpID49IHBhcnRzLmxlbmd0aCkge1xuXHRcdFx0XHR2YXIgZGVzYyA9ICRnT1BEKHZhbHVlLCBwYXJ0KTtcblx0XHRcdFx0aXNPd24gPSAhIWRlc2M7XG5cblx0XHRcdFx0Ly8gQnkgY29udmVudGlvbiwgd2hlbiBhIGRhdGEgcHJvcGVydHkgaXMgY29udmVydGVkIHRvIGFuIGFjY2Vzc29yXG5cdFx0XHRcdC8vIHByb3BlcnR5IHRvIGVtdWxhdGUgYSBkYXRhIHByb3BlcnR5IHRoYXQgZG9lcyBub3Qgc3VmZmVyIGZyb21cblx0XHRcdFx0Ly8gdGhlIG92ZXJyaWRlIG1pc3Rha2UsIHRoYXQgYWNjZXNzb3IncyBnZXR0ZXIgaXMgbWFya2VkIHdpdGhcblx0XHRcdFx0Ly8gYW4gYG9yaWdpbmFsVmFsdWVgIHByb3BlcnR5LiBIZXJlLCB3aGVuIHdlIGRldGVjdCB0aGlzLCB3ZVxuXHRcdFx0XHQvLyB1cGhvbGQgdGhlIGlsbHVzaW9uIGJ5IHByZXRlbmRpbmcgdG8gc2VlIHRoYXQgb3JpZ2luYWwgZGF0YVxuXHRcdFx0XHQvLyBwcm9wZXJ0eSwgaS5lLiwgcmV0dXJuaW5nIHRoZSB2YWx1ZSByYXRoZXIgdGhhbiB0aGUgZ2V0dGVyXG5cdFx0XHRcdC8vIGl0c2VsZi5cblx0XHRcdFx0aWYgKGlzT3duICYmICdnZXQnIGluIGRlc2MgJiYgISgnb3JpZ2luYWxWYWx1ZScgaW4gZGVzYy5nZXQpKSB7XG5cdFx0XHRcdFx0dmFsdWUgPSBkZXNjLmdldDtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR2YWx1ZSA9IHZhbHVlW3BhcnRdO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRpc093biA9IGhhc093bih2YWx1ZSwgcGFydCk7XG5cdFx0XHRcdHZhbHVlID0gdmFsdWVbcGFydF07XG5cdFx0XHR9XG5cblx0XHRcdGlmIChpc093biAmJiAhc2tpcEZ1cnRoZXJDYWNoaW5nKSB7XG5cdFx0XHRcdElOVFJJTlNJQ1NbaW50cmluc2ljUmVhbE5hbWVdID0gdmFsdWU7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdHJldHVybiB2YWx1ZTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBHZXRJbnRyaW5zaWMgPSByZXF1aXJlKCdnZXQtaW50cmluc2ljJyk7XG5cbnZhciAkZ09QRCA9IEdldEludHJpbnNpYygnJU9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IlJywgdHJ1ZSk7XG5cbmlmICgkZ09QRCkge1xuXHR0cnkge1xuXHRcdCRnT1BEKFtdLCAnbGVuZ3RoJyk7XG5cdH0gY2F0Y2ggKGUpIHtcblx0XHQvLyBJRSA4IGhhcyBhIGJyb2tlbiBnT1BEXG5cdFx0JGdPUEQgPSBudWxsO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gJGdPUEQ7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBvcmlnU3ltYm9sID0gdHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sO1xudmFyIGhhc1N5bWJvbFNoYW0gPSByZXF1aXJlKCcuL3NoYW1zJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaGFzTmF0aXZlU3ltYm9scygpIHtcblx0aWYgKHR5cGVvZiBvcmlnU3ltYm9sICE9PSAnZnVuY3Rpb24nKSB7IHJldHVybiBmYWxzZTsgfVxuXHRpZiAodHlwZW9mIFN5bWJvbCAhPT0gJ2Z1bmN0aW9uJykgeyByZXR1cm4gZmFsc2U7IH1cblx0aWYgKHR5cGVvZiBvcmlnU3ltYm9sKCdmb28nKSAhPT0gJ3N5bWJvbCcpIHsgcmV0dXJuIGZhbHNlOyB9XG5cdGlmICh0eXBlb2YgU3ltYm9sKCdiYXInKSAhPT0gJ3N5bWJvbCcpIHsgcmV0dXJuIGZhbHNlOyB9XG5cblx0cmV0dXJuIGhhc1N5bWJvbFNoYW0oKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qIGVzbGludCBjb21wbGV4aXR5OiBbMiwgMThdLCBtYXgtc3RhdGVtZW50czogWzIsIDMzXSAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBoYXNTeW1ib2xzKCkge1xuXHRpZiAodHlwZW9mIFN5bWJvbCAhPT0gJ2Z1bmN0aW9uJyB8fCB0eXBlb2YgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyAhPT0gJ2Z1bmN0aW9uJykgeyByZXR1cm4gZmFsc2U7IH1cblx0aWYgKHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgPT09ICdzeW1ib2wnKSB7IHJldHVybiB0cnVlOyB9XG5cblx0dmFyIG9iaiA9IHt9O1xuXHR2YXIgc3ltID0gU3ltYm9sKCd0ZXN0Jyk7XG5cdHZhciBzeW1PYmogPSBPYmplY3Qoc3ltKTtcblx0aWYgKHR5cGVvZiBzeW0gPT09ICdzdHJpbmcnKSB7IHJldHVybiBmYWxzZTsgfVxuXG5cdGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoc3ltKSAhPT0gJ1tvYmplY3QgU3ltYm9sXScpIHsgcmV0dXJuIGZhbHNlOyB9XG5cdGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoc3ltT2JqKSAhPT0gJ1tvYmplY3QgU3ltYm9sXScpIHsgcmV0dXJuIGZhbHNlOyB9XG5cblx0Ly8gdGVtcCBkaXNhYmxlZCBwZXIgaHR0cHM6Ly9naXRodWIuY29tL2xqaGFyYi9vYmplY3QuYXNzaWduL2lzc3Vlcy8xN1xuXHQvLyBpZiAoc3ltIGluc3RhbmNlb2YgU3ltYm9sKSB7IHJldHVybiBmYWxzZTsgfVxuXHQvLyB0ZW1wIGRpc2FibGVkIHBlciBodHRwczovL2dpdGh1Yi5jb20vV2ViUmVmbGVjdGlvbi9nZXQtb3duLXByb3BlcnR5LXN5bWJvbHMvaXNzdWVzLzRcblx0Ly8gaWYgKCEoc3ltT2JqIGluc3RhbmNlb2YgU3ltYm9sKSkgeyByZXR1cm4gZmFsc2U7IH1cblxuXHQvLyBpZiAodHlwZW9mIFN5bWJvbC5wcm90b3R5cGUudG9TdHJpbmcgIT09ICdmdW5jdGlvbicpIHsgcmV0dXJuIGZhbHNlOyB9XG5cdC8vIGlmIChTdHJpbmcoc3ltKSAhPT0gU3ltYm9sLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHN5bSkpIHsgcmV0dXJuIGZhbHNlOyB9XG5cblx0dmFyIHN5bVZhbCA9IDQyO1xuXHRvYmpbc3ltXSA9IHN5bVZhbDtcblx0Zm9yIChzeW0gaW4gb2JqKSB7IHJldHVybiBmYWxzZTsgfSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXJlc3RyaWN0ZWQtc3ludGF4LCBuby11bnJlYWNoYWJsZS1sb29wXG5cdGlmICh0eXBlb2YgT2JqZWN0LmtleXMgPT09ICdmdW5jdGlvbicgJiYgT2JqZWN0LmtleXMob2JqKS5sZW5ndGggIT09IDApIHsgcmV0dXJuIGZhbHNlOyB9XG5cblx0aWYgKHR5cGVvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyA9PT0gJ2Z1bmN0aW9uJyAmJiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvYmopLmxlbmd0aCAhPT0gMCkgeyByZXR1cm4gZmFsc2U7IH1cblxuXHR2YXIgc3ltcyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMob2JqKTtcblx0aWYgKHN5bXMubGVuZ3RoICE9PSAxIHx8IHN5bXNbMF0gIT09IHN5bSkgeyByZXR1cm4gZmFsc2U7IH1cblxuXHRpZiAoIU9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUuY2FsbChvYmosIHN5bSkpIHsgcmV0dXJuIGZhbHNlOyB9XG5cblx0aWYgKHR5cGVvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0dmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iaiwgc3ltKTtcblx0XHRpZiAoZGVzY3JpcHRvci52YWx1ZSAhPT0gc3ltVmFsIHx8IGRlc2NyaXB0b3IuZW51bWVyYWJsZSAhPT0gdHJ1ZSkgeyByZXR1cm4gZmFsc2U7IH1cblx0fVxuXG5cdHJldHVybiB0cnVlO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGhhc1N5bWJvbHMgPSByZXF1aXJlKCdoYXMtc3ltYm9scy9zaGFtcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGhhc1RvU3RyaW5nVGFnU2hhbXMoKSB7XG5cdHJldHVybiBoYXNTeW1ib2xzKCkgJiYgISFTeW1ib2wudG9TdHJpbmdUYWc7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgYmluZCA9IHJlcXVpcmUoJ2Z1bmN0aW9uLWJpbmQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBiaW5kLmNhbGwoRnVuY3Rpb24uY2FsbCwgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eSk7XG4iLCIvKiEgaWVlZTc1NC4gQlNELTMtQ2xhdXNlIExpY2Vuc2UuIEZlcm9zcyBBYm91a2hhZGlqZWggPGh0dHBzOi8vZmVyb3NzLm9yZy9vcGVuc291cmNlPiAqL1xuZXhwb3J0cy5yZWFkID0gZnVuY3Rpb24gKGJ1ZmZlciwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG1cbiAgdmFyIGVMZW4gPSAobkJ5dGVzICogOCkgLSBtTGVuIC0gMVxuICB2YXIgZU1heCA9ICgxIDw8IGVMZW4pIC0gMVxuICB2YXIgZUJpYXMgPSBlTWF4ID4+IDFcbiAgdmFyIG5CaXRzID0gLTdcbiAgdmFyIGkgPSBpc0xFID8gKG5CeXRlcyAtIDEpIDogMFxuICB2YXIgZCA9IGlzTEUgPyAtMSA6IDFcbiAgdmFyIHMgPSBidWZmZXJbb2Zmc2V0ICsgaV1cblxuICBpICs9IGRcblxuICBlID0gcyAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBzID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBlTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IGUgPSAoZSAqIDI1NikgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBtID0gZSAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBlID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBtTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IG0gPSAobSAqIDI1NikgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBpZiAoZSA9PT0gMCkge1xuICAgIGUgPSAxIC0gZUJpYXNcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpXG4gIH0gZWxzZSB7XG4gICAgbSA9IG0gKyBNYXRoLnBvdygyLCBtTGVuKVxuICAgIGUgPSBlIC0gZUJpYXNcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKVxufVxuXG5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24gKGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLCBjXG4gIHZhciBlTGVuID0gKG5CeXRlcyAqIDgpIC0gbUxlbiAtIDFcbiAgdmFyIGVNYXggPSAoMSA8PCBlTGVuKSAtIDFcbiAgdmFyIGVCaWFzID0gZU1heCA+PiAxXG4gIHZhciBydCA9IChtTGVuID09PSAyMyA/IE1hdGgucG93KDIsIC0yNCkgLSBNYXRoLnBvdygyLCAtNzcpIDogMClcbiAgdmFyIGkgPSBpc0xFID8gMCA6IChuQnl0ZXMgLSAxKVxuICB2YXIgZCA9IGlzTEUgPyAxIDogLTFcbiAgdmFyIHMgPSB2YWx1ZSA8IDAgfHwgKHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA8IDApID8gMSA6IDBcblxuICB2YWx1ZSA9IE1hdGguYWJzKHZhbHVlKVxuXG4gIGlmIChpc05hTih2YWx1ZSkgfHwgdmFsdWUgPT09IEluZmluaXR5KSB7XG4gICAgbSA9IGlzTmFOKHZhbHVlKSA/IDEgOiAwXG4gICAgZSA9IGVNYXhcbiAgfSBlbHNlIHtcbiAgICBlID0gTWF0aC5mbG9vcihNYXRoLmxvZyh2YWx1ZSkgLyBNYXRoLkxOMilcbiAgICBpZiAodmFsdWUgKiAoYyA9IE1hdGgucG93KDIsIC1lKSkgPCAxKSB7XG4gICAgICBlLS1cbiAgICAgIGMgKj0gMlxuICAgIH1cbiAgICBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIHZhbHVlICs9IHJ0IC8gY1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZSArPSBydCAqIE1hdGgucG93KDIsIDEgLSBlQmlhcylcbiAgICB9XG4gICAgaWYgKHZhbHVlICogYyA+PSAyKSB7XG4gICAgICBlKytcbiAgICAgIGMgLz0gMlxuICAgIH1cblxuICAgIGlmIChlICsgZUJpYXMgPj0gZU1heCkge1xuICAgICAgbSA9IDBcbiAgICAgIGUgPSBlTWF4XG4gICAgfSBlbHNlIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgbSA9ICgodmFsdWUgKiBjKSAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSBlICsgZUJpYXNcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IHZhbHVlICogTWF0aC5wb3coMiwgZUJpYXMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gMFxuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpIHt9XG5cbiAgZSA9IChlIDw8IG1MZW4pIHwgbVxuICBlTGVuICs9IG1MZW5cbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KSB7fVxuXG4gIGJ1ZmZlcltvZmZzZXQgKyBpIC0gZF0gfD0gcyAqIDEyOFxufVxuIiwiaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgaWYgKHN1cGVyQ3Rvcikge1xuICAgICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuICB9O1xufSBlbHNlIHtcbiAgLy8gb2xkIHNjaG9vbCBzaGltIGZvciBvbGQgYnJvd3NlcnNcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBpZiAoc3VwZXJDdG9yKSB7XG4gICAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICAgIGN0b3IucHJvdG90eXBlID0gbmV3IFRlbXBDdG9yKClcbiAgICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICAgIH1cbiAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaGFzVG9TdHJpbmdUYWcgPSByZXF1aXJlKCdoYXMtdG9zdHJpbmd0YWcvc2hhbXMnKSgpO1xudmFyIGNhbGxCb3VuZCA9IHJlcXVpcmUoJ2NhbGwtYmluZC9jYWxsQm91bmQnKTtcblxudmFyICR0b1N0cmluZyA9IGNhbGxCb3VuZCgnT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZycpO1xuXG52YXIgaXNTdGFuZGFyZEFyZ3VtZW50cyA9IGZ1bmN0aW9uIGlzQXJndW1lbnRzKHZhbHVlKSB7XG5cdGlmIChoYXNUb1N0cmluZ1RhZyAmJiB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIFN5bWJvbC50b1N0cmluZ1RhZyBpbiB2YWx1ZSkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXHRyZXR1cm4gJHRvU3RyaW5nKHZhbHVlKSA9PT0gJ1tvYmplY3QgQXJndW1lbnRzXSc7XG59O1xuXG52YXIgaXNMZWdhY3lBcmd1bWVudHMgPSBmdW5jdGlvbiBpc0FyZ3VtZW50cyh2YWx1ZSkge1xuXHRpZiAoaXNTdGFuZGFyZEFyZ3VtZW50cyh2YWx1ZSkpIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXHRyZXR1cm4gdmFsdWUgIT09IG51bGwgJiZcblx0XHR0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmXG5cdFx0dHlwZW9mIHZhbHVlLmxlbmd0aCA9PT0gJ251bWJlcicgJiZcblx0XHR2YWx1ZS5sZW5ndGggPj0gMCAmJlxuXHRcdCR0b1N0cmluZyh2YWx1ZSkgIT09ICdbb2JqZWN0IEFycmF5XScgJiZcblx0XHQkdG9TdHJpbmcodmFsdWUuY2FsbGVlKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbn07XG5cbnZhciBzdXBwb3J0c1N0YW5kYXJkQXJndW1lbnRzID0gKGZ1bmN0aW9uICgpIHtcblx0cmV0dXJuIGlzU3RhbmRhcmRBcmd1bWVudHMoYXJndW1lbnRzKTtcbn0oKSk7XG5cbmlzU3RhbmRhcmRBcmd1bWVudHMuaXNMZWdhY3lBcmd1bWVudHMgPSBpc0xlZ2FjeUFyZ3VtZW50czsgLy8gZm9yIHRlc3RzXG5cbm1vZHVsZS5leHBvcnRzID0gc3VwcG9ydHNTdGFuZGFyZEFyZ3VtZW50cyA/IGlzU3RhbmRhcmRBcmd1bWVudHMgOiBpc0xlZ2FjeUFyZ3VtZW50cztcbiIsIi8qIVxuICogRGV0ZXJtaW5lIGlmIGFuIG9iamVjdCBpcyBhIEJ1ZmZlclxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxodHRwczovL2Zlcm9zcy5vcmc+XG4gKiBAbGljZW5zZSAgTUlUXG4gKi9cblxuLy8gVGhlIF9pc0J1ZmZlciBjaGVjayBpcyBmb3IgU2FmYXJpIDUtNyBzdXBwb3J0LCBiZWNhdXNlIGl0J3MgbWlzc2luZ1xuLy8gT2JqZWN0LnByb3RvdHlwZS5jb25zdHJ1Y3Rvci4gUmVtb3ZlIHRoaXMgZXZlbnR1YWxseVxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob2JqKSB7XG4gIHJldHVybiBvYmogIT0gbnVsbCAmJiAoaXNCdWZmZXIob2JqKSB8fCBpc1Nsb3dCdWZmZXIob2JqKSB8fCAhIW9iai5faXNCdWZmZXIpXG59XG5cbmZ1bmN0aW9uIGlzQnVmZmVyIChvYmopIHtcbiAgcmV0dXJuICEhb2JqLmNvbnN0cnVjdG9yICYmIHR5cGVvZiBvYmouY29uc3RydWN0b3IuaXNCdWZmZXIgPT09ICdmdW5jdGlvbicgJiYgb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyKG9iailcbn1cblxuLy8gRm9yIE5vZGUgdjAuMTAgc3VwcG9ydC4gUmVtb3ZlIHRoaXMgZXZlbnR1YWxseS5cbmZ1bmN0aW9uIGlzU2xvd0J1ZmZlciAob2JqKSB7XG4gIHJldHVybiB0eXBlb2Ygb2JqLnJlYWRGbG9hdExFID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBvYmouc2xpY2UgPT09ICdmdW5jdGlvbicgJiYgaXNCdWZmZXIob2JqLnNsaWNlKDAsIDApKVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZm5Ub1N0ciA9IEZ1bmN0aW9uLnByb3RvdHlwZS50b1N0cmluZztcbnZhciByZWZsZWN0QXBwbHkgPSB0eXBlb2YgUmVmbGVjdCA9PT0gJ29iamVjdCcgJiYgUmVmbGVjdCAhPT0gbnVsbCAmJiBSZWZsZWN0LmFwcGx5O1xudmFyIGJhZEFycmF5TGlrZTtcbnZhciBpc0NhbGxhYmxlTWFya2VyO1xuaWYgKHR5cGVvZiByZWZsZWN0QXBwbHkgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSA9PT0gJ2Z1bmN0aW9uJykge1xuXHR0cnkge1xuXHRcdGJhZEFycmF5TGlrZSA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh7fSwgJ2xlbmd0aCcsIHtcblx0XHRcdGdldDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHR0aHJvdyBpc0NhbGxhYmxlTWFya2VyO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdGlzQ2FsbGFibGVNYXJrZXIgPSB7fTtcblx0XHQvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdGhyb3ctbGl0ZXJhbFxuXHRcdHJlZmxlY3RBcHBseShmdW5jdGlvbiAoKSB7IHRocm93IDQyOyB9LCBudWxsLCBiYWRBcnJheUxpa2UpO1xuXHR9IGNhdGNoIChfKSB7XG5cdFx0aWYgKF8gIT09IGlzQ2FsbGFibGVNYXJrZXIpIHtcblx0XHRcdHJlZmxlY3RBcHBseSA9IG51bGw7XG5cdFx0fVxuXHR9XG59IGVsc2Uge1xuXHRyZWZsZWN0QXBwbHkgPSBudWxsO1xufVxuXG52YXIgY29uc3RydWN0b3JSZWdleCA9IC9eXFxzKmNsYXNzXFxiLztcbnZhciBpc0VTNkNsYXNzRm4gPSBmdW5jdGlvbiBpc0VTNkNsYXNzRnVuY3Rpb24odmFsdWUpIHtcblx0dHJ5IHtcblx0XHR2YXIgZm5TdHIgPSBmblRvU3RyLmNhbGwodmFsdWUpO1xuXHRcdHJldHVybiBjb25zdHJ1Y3RvclJlZ2V4LnRlc3QoZm5TdHIpO1xuXHR9IGNhdGNoIChlKSB7XG5cdFx0cmV0dXJuIGZhbHNlOyAvLyBub3QgYSBmdW5jdGlvblxuXHR9XG59O1xuXG52YXIgdHJ5RnVuY3Rpb25PYmplY3QgPSBmdW5jdGlvbiB0cnlGdW5jdGlvblRvU3RyKHZhbHVlKSB7XG5cdHRyeSB7XG5cdFx0aWYgKGlzRVM2Q2xhc3NGbih2YWx1ZSkpIHsgcmV0dXJuIGZhbHNlOyB9XG5cdFx0Zm5Ub1N0ci5jYWxsKHZhbHVlKTtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSBjYXRjaCAoZSkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxufTtcbnZhciB0b1N0ciA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG52YXIgb2JqZWN0Q2xhc3MgPSAnW29iamVjdCBPYmplY3RdJztcbnZhciBmbkNsYXNzID0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbnZhciBnZW5DbGFzcyA9ICdbb2JqZWN0IEdlbmVyYXRvckZ1bmN0aW9uXSc7XG52YXIgZGRhQ2xhc3MgPSAnW29iamVjdCBIVE1MQWxsQ29sbGVjdGlvbl0nOyAvLyBJRSAxMVxudmFyIGRkYUNsYXNzMiA9ICdbb2JqZWN0IEhUTUwgZG9jdW1lbnQuYWxsIGNsYXNzXSc7XG52YXIgZGRhQ2xhc3MzID0gJ1tvYmplY3QgSFRNTENvbGxlY3Rpb25dJzsgLy8gSUUgOS0xMFxudmFyIGhhc1RvU3RyaW5nVGFnID0gdHlwZW9mIFN5bWJvbCA9PT0gJ2Z1bmN0aW9uJyAmJiAhIVN5bWJvbC50b1N0cmluZ1RhZzsgLy8gYmV0dGVyOiB1c2UgYGhhcy10b3N0cmluZ3RhZ2BcblxudmFyIGlzSUU2OCA9ICEoMCBpbiBbLF0pOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXNwYXJzZS1hcnJheXMsIGNvbW1hLXNwYWNpbmdcblxudmFyIGlzRERBID0gZnVuY3Rpb24gaXNEb2N1bWVudERvdEFsbCgpIHsgcmV0dXJuIGZhbHNlOyB9O1xuaWYgKHR5cGVvZiBkb2N1bWVudCA9PT0gJ29iamVjdCcpIHtcblx0Ly8gRmlyZWZveCAzIGNhbm9uaWNhbGl6ZXMgRERBIHRvIHVuZGVmaW5lZCB3aGVuIGl0J3Mgbm90IGFjY2Vzc2VkIGRpcmVjdGx5XG5cdHZhciBhbGwgPSBkb2N1bWVudC5hbGw7XG5cdGlmICh0b1N0ci5jYWxsKGFsbCkgPT09IHRvU3RyLmNhbGwoZG9jdW1lbnQuYWxsKSkge1xuXHRcdGlzRERBID0gZnVuY3Rpb24gaXNEb2N1bWVudERvdEFsbCh2YWx1ZSkge1xuXHRcdFx0LyogZ2xvYmFscyBkb2N1bWVudDogZmFsc2UgKi9cblx0XHRcdC8vIGluIElFIDYtOCwgdHlwZW9mIGRvY3VtZW50LmFsbCBpcyBcIm9iamVjdFwiIGFuZCBpdCdzIHRydXRoeVxuXHRcdFx0aWYgKChpc0lFNjggfHwgIXZhbHVlKSAmJiAodHlwZW9mIHZhbHVlID09PSAndW5kZWZpbmVkJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSkge1xuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdHZhciBzdHIgPSB0b1N0ci5jYWxsKHZhbHVlKTtcblx0XHRcdFx0XHRyZXR1cm4gKFxuXHRcdFx0XHRcdFx0c3RyID09PSBkZGFDbGFzc1xuXHRcdFx0XHRcdFx0fHwgc3RyID09PSBkZGFDbGFzczJcblx0XHRcdFx0XHRcdHx8IHN0ciA9PT0gZGRhQ2xhc3MzIC8vIG9wZXJhIDEyLjE2XG5cdFx0XHRcdFx0XHR8fCBzdHIgPT09IG9iamVjdENsYXNzIC8vIElFIDYtOFxuXHRcdFx0XHRcdCkgJiYgdmFsdWUoJycpID09IG51bGw7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZXFlcWVxXG5cdFx0XHRcdH0gY2F0Y2ggKGUpIHsgLyoqLyB9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHJlZmxlY3RBcHBseVxuXHQ/IGZ1bmN0aW9uIGlzQ2FsbGFibGUodmFsdWUpIHtcblx0XHRpZiAoaXNEREEodmFsdWUpKSB7IHJldHVybiB0cnVlOyB9XG5cdFx0aWYgKCF2YWx1ZSkgeyByZXR1cm4gZmFsc2U7IH1cblx0XHRpZiAodHlwZW9mIHZhbHVlICE9PSAnZnVuY3Rpb24nICYmIHR5cGVvZiB2YWx1ZSAhPT0gJ29iamVjdCcpIHsgcmV0dXJuIGZhbHNlOyB9XG5cdFx0dHJ5IHtcblx0XHRcdHJlZmxlY3RBcHBseSh2YWx1ZSwgbnVsbCwgYmFkQXJyYXlMaWtlKTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRpZiAoZSAhPT0gaXNDYWxsYWJsZU1hcmtlcikgeyByZXR1cm4gZmFsc2U7IH1cblx0XHR9XG5cdFx0cmV0dXJuICFpc0VTNkNsYXNzRm4odmFsdWUpICYmIHRyeUZ1bmN0aW9uT2JqZWN0KHZhbHVlKTtcblx0fVxuXHQ6IGZ1bmN0aW9uIGlzQ2FsbGFibGUodmFsdWUpIHtcblx0XHRpZiAoaXNEREEodmFsdWUpKSB7IHJldHVybiB0cnVlOyB9XG5cdFx0aWYgKCF2YWx1ZSkgeyByZXR1cm4gZmFsc2U7IH1cblx0XHRpZiAodHlwZW9mIHZhbHVlICE9PSAnZnVuY3Rpb24nICYmIHR5cGVvZiB2YWx1ZSAhPT0gJ29iamVjdCcpIHsgcmV0dXJuIGZhbHNlOyB9XG5cdFx0aWYgKGhhc1RvU3RyaW5nVGFnKSB7IHJldHVybiB0cnlGdW5jdGlvbk9iamVjdCh2YWx1ZSk7IH1cblx0XHRpZiAoaXNFUzZDbGFzc0ZuKHZhbHVlKSkgeyByZXR1cm4gZmFsc2U7IH1cblx0XHR2YXIgc3RyQ2xhc3MgPSB0b1N0ci5jYWxsKHZhbHVlKTtcblx0XHRpZiAoc3RyQ2xhc3MgIT09IGZuQ2xhc3MgJiYgc3RyQ2xhc3MgIT09IGdlbkNsYXNzICYmICEoL15cXFtvYmplY3QgSFRNTC8pLnRlc3Qoc3RyQ2xhc3MpKSB7IHJldHVybiBmYWxzZTsgfVxuXHRcdHJldHVybiB0cnlGdW5jdGlvbk9iamVjdCh2YWx1ZSk7XG5cdH07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB0b1N0ciA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG52YXIgZm5Ub1N0ciA9IEZ1bmN0aW9uLnByb3RvdHlwZS50b1N0cmluZztcbnZhciBpc0ZuUmVnZXggPSAvXlxccyooPzpmdW5jdGlvbik/XFwqLztcbnZhciBoYXNUb1N0cmluZ1RhZyA9IHJlcXVpcmUoJ2hhcy10b3N0cmluZ3RhZy9zaGFtcycpKCk7XG52YXIgZ2V0UHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Y7XG52YXIgZ2V0R2VuZXJhdG9yRnVuYyA9IGZ1bmN0aW9uICgpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBjb25zaXN0ZW50LXJldHVyblxuXHRpZiAoIWhhc1RvU3RyaW5nVGFnKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cdHRyeSB7XG5cdFx0cmV0dXJuIEZ1bmN0aW9uKCdyZXR1cm4gZnVuY3Rpb24qKCkge30nKSgpO1xuXHR9IGNhdGNoIChlKSB7XG5cdH1cbn07XG52YXIgR2VuZXJhdG9yRnVuY3Rpb247XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNHZW5lcmF0b3JGdW5jdGlvbihmbikge1xuXHRpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cdGlmIChpc0ZuUmVnZXgudGVzdChmblRvU3RyLmNhbGwoZm4pKSkge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cdGlmICghaGFzVG9TdHJpbmdUYWcpIHtcblx0XHR2YXIgc3RyID0gdG9TdHIuY2FsbChmbik7XG5cdFx0cmV0dXJuIHN0ciA9PT0gJ1tvYmplY3QgR2VuZXJhdG9yRnVuY3Rpb25dJztcblx0fVxuXHRpZiAoIWdldFByb3RvKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cdGlmICh0eXBlb2YgR2VuZXJhdG9yRnVuY3Rpb24gPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0dmFyIGdlbmVyYXRvckZ1bmMgPSBnZXRHZW5lcmF0b3JGdW5jKCk7XG5cdFx0R2VuZXJhdG9yRnVuY3Rpb24gPSBnZW5lcmF0b3JGdW5jID8gZ2V0UHJvdG8oZ2VuZXJhdG9yRnVuYykgOiBmYWxzZTtcblx0fVxuXHRyZXR1cm4gZ2V0UHJvdG8oZm4pID09PSBHZW5lcmF0b3JGdW5jdGlvbjtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB3aGljaFR5cGVkQXJyYXkgPSByZXF1aXJlKCd3aGljaC10eXBlZC1hcnJheScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzVHlwZWRBcnJheSh2YWx1ZSkge1xuXHRyZXR1cm4gISF3aGljaFR5cGVkQXJyYXkodmFsdWUpO1xufTtcbiIsIi8vICdwYXRoJyBtb2R1bGUgZXh0cmFjdGVkIGZyb20gTm9kZS5qcyB2OC4xMS4xIChvbmx5IHRoZSBwb3NpeCBwYXJ0KVxuLy8gdHJhbnNwbGl0ZWQgd2l0aCBCYWJlbFxuXG4vLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBhc3NlcnRQYXRoKHBhdGgpIHtcbiAgaWYgKHR5cGVvZiBwYXRoICE9PSAnc3RyaW5nJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1BhdGggbXVzdCBiZSBhIHN0cmluZy4gUmVjZWl2ZWQgJyArIEpTT04uc3RyaW5naWZ5KHBhdGgpKTtcbiAgfVxufVxuXG4vLyBSZXNvbHZlcyAuIGFuZCAuLiBlbGVtZW50cyBpbiBhIHBhdGggd2l0aCBkaXJlY3RvcnkgbmFtZXNcbmZ1bmN0aW9uIG5vcm1hbGl6ZVN0cmluZ1Bvc2l4KHBhdGgsIGFsbG93QWJvdmVSb290KSB7XG4gIHZhciByZXMgPSAnJztcbiAgdmFyIGxhc3RTZWdtZW50TGVuZ3RoID0gMDtcbiAgdmFyIGxhc3RTbGFzaCA9IC0xO1xuICB2YXIgZG90cyA9IDA7XG4gIHZhciBjb2RlO1xuICBmb3IgKHZhciBpID0gMDsgaSA8PSBwYXRoLmxlbmd0aDsgKytpKSB7XG4gICAgaWYgKGkgPCBwYXRoLmxlbmd0aClcbiAgICAgIGNvZGUgPSBwYXRoLmNoYXJDb2RlQXQoaSk7XG4gICAgZWxzZSBpZiAoY29kZSA9PT0gNDcgLyovKi8pXG4gICAgICBicmVhaztcbiAgICBlbHNlXG4gICAgICBjb2RlID0gNDcgLyovKi87XG4gICAgaWYgKGNvZGUgPT09IDQ3IC8qLyovKSB7XG4gICAgICBpZiAobGFzdFNsYXNoID09PSBpIC0gMSB8fCBkb3RzID09PSAxKSB7XG4gICAgICAgIC8vIE5PT1BcbiAgICAgIH0gZWxzZSBpZiAobGFzdFNsYXNoICE9PSBpIC0gMSAmJiBkb3RzID09PSAyKSB7XG4gICAgICAgIGlmIChyZXMubGVuZ3RoIDwgMiB8fCBsYXN0U2VnbWVudExlbmd0aCAhPT0gMiB8fCByZXMuY2hhckNvZGVBdChyZXMubGVuZ3RoIC0gMSkgIT09IDQ2IC8qLiovIHx8IHJlcy5jaGFyQ29kZUF0KHJlcy5sZW5ndGggLSAyKSAhPT0gNDYgLyouKi8pIHtcbiAgICAgICAgICBpZiAocmVzLmxlbmd0aCA+IDIpIHtcbiAgICAgICAgICAgIHZhciBsYXN0U2xhc2hJbmRleCA9IHJlcy5sYXN0SW5kZXhPZignLycpO1xuICAgICAgICAgICAgaWYgKGxhc3RTbGFzaEluZGV4ICE9PSByZXMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICBpZiAobGFzdFNsYXNoSW5kZXggPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgcmVzID0gJyc7XG4gICAgICAgICAgICAgICAgbGFzdFNlZ21lbnRMZW5ndGggPSAwO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlcyA9IHJlcy5zbGljZSgwLCBsYXN0U2xhc2hJbmRleCk7XG4gICAgICAgICAgICAgICAgbGFzdFNlZ21lbnRMZW5ndGggPSByZXMubGVuZ3RoIC0gMSAtIHJlcy5sYXN0SW5kZXhPZignLycpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGxhc3RTbGFzaCA9IGk7XG4gICAgICAgICAgICAgIGRvdHMgPSAwO1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgaWYgKHJlcy5sZW5ndGggPT09IDIgfHwgcmVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgcmVzID0gJyc7XG4gICAgICAgICAgICBsYXN0U2VnbWVudExlbmd0aCA9IDA7XG4gICAgICAgICAgICBsYXN0U2xhc2ggPSBpO1xuICAgICAgICAgICAgZG90cyA9IDA7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFsbG93QWJvdmVSb290KSB7XG4gICAgICAgICAgaWYgKHJlcy5sZW5ndGggPiAwKVxuICAgICAgICAgICAgcmVzICs9ICcvLi4nO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJlcyA9ICcuLic7XG4gICAgICAgICAgbGFzdFNlZ21lbnRMZW5ndGggPSAyO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAocmVzLmxlbmd0aCA+IDApXG4gICAgICAgICAgcmVzICs9ICcvJyArIHBhdGguc2xpY2UobGFzdFNsYXNoICsgMSwgaSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICByZXMgPSBwYXRoLnNsaWNlKGxhc3RTbGFzaCArIDEsIGkpO1xuICAgICAgICBsYXN0U2VnbWVudExlbmd0aCA9IGkgLSBsYXN0U2xhc2ggLSAxO1xuICAgICAgfVxuICAgICAgbGFzdFNsYXNoID0gaTtcbiAgICAgIGRvdHMgPSAwO1xuICAgIH0gZWxzZSBpZiAoY29kZSA9PT0gNDYgLyouKi8gJiYgZG90cyAhPT0gLTEpIHtcbiAgICAgICsrZG90cztcbiAgICB9IGVsc2Uge1xuICAgICAgZG90cyA9IC0xO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzO1xufVxuXG5mdW5jdGlvbiBfZm9ybWF0KHNlcCwgcGF0aE9iamVjdCkge1xuICB2YXIgZGlyID0gcGF0aE9iamVjdC5kaXIgfHwgcGF0aE9iamVjdC5yb290O1xuICB2YXIgYmFzZSA9IHBhdGhPYmplY3QuYmFzZSB8fCAocGF0aE9iamVjdC5uYW1lIHx8ICcnKSArIChwYXRoT2JqZWN0LmV4dCB8fCAnJyk7XG4gIGlmICghZGlyKSB7XG4gICAgcmV0dXJuIGJhc2U7XG4gIH1cbiAgaWYgKGRpciA9PT0gcGF0aE9iamVjdC5yb290KSB7XG4gICAgcmV0dXJuIGRpciArIGJhc2U7XG4gIH1cbiAgcmV0dXJuIGRpciArIHNlcCArIGJhc2U7XG59XG5cbnZhciBwb3NpeCA9IHtcbiAgLy8gcGF0aC5yZXNvbHZlKFtmcm9tIC4uLl0sIHRvKVxuICByZXNvbHZlOiBmdW5jdGlvbiByZXNvbHZlKCkge1xuICAgIHZhciByZXNvbHZlZFBhdGggPSAnJztcbiAgICB2YXIgcmVzb2x2ZWRBYnNvbHV0ZSA9IGZhbHNlO1xuICAgIHZhciBjd2Q7XG5cbiAgICBmb3IgKHZhciBpID0gYXJndW1lbnRzLmxlbmd0aCAtIDE7IGkgPj0gLTEgJiYgIXJlc29sdmVkQWJzb2x1dGU7IGktLSkge1xuICAgICAgdmFyIHBhdGg7XG4gICAgICBpZiAoaSA+PSAwKVxuICAgICAgICBwYXRoID0gYXJndW1lbnRzW2ldO1xuICAgICAgZWxzZSB7XG4gICAgICAgIGlmIChjd2QgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuICAgICAgICBwYXRoID0gY3dkO1xuICAgICAgfVxuXG4gICAgICBhc3NlcnRQYXRoKHBhdGgpO1xuXG4gICAgICAvLyBTa2lwIGVtcHR5IGVudHJpZXNcbiAgICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgcmVzb2x2ZWRQYXRoID0gcGF0aCArICcvJyArIHJlc29sdmVkUGF0aDtcbiAgICAgIHJlc29sdmVkQWJzb2x1dGUgPSBwYXRoLmNoYXJDb2RlQXQoMCkgPT09IDQ3IC8qLyovO1xuICAgIH1cblxuICAgIC8vIEF0IHRoaXMgcG9pbnQgdGhlIHBhdGggc2hvdWxkIGJlIHJlc29sdmVkIHRvIGEgZnVsbCBhYnNvbHV0ZSBwYXRoLCBidXRcbiAgICAvLyBoYW5kbGUgcmVsYXRpdmUgcGF0aHMgdG8gYmUgc2FmZSAobWlnaHQgaGFwcGVuIHdoZW4gcHJvY2Vzcy5jd2QoKSBmYWlscylcblxuICAgIC8vIE5vcm1hbGl6ZSB0aGUgcGF0aFxuICAgIHJlc29sdmVkUGF0aCA9IG5vcm1hbGl6ZVN0cmluZ1Bvc2l4KHJlc29sdmVkUGF0aCwgIXJlc29sdmVkQWJzb2x1dGUpO1xuXG4gICAgaWYgKHJlc29sdmVkQWJzb2x1dGUpIHtcbiAgICAgIGlmIChyZXNvbHZlZFBhdGgubGVuZ3RoID4gMClcbiAgICAgICAgcmV0dXJuICcvJyArIHJlc29sdmVkUGF0aDtcbiAgICAgIGVsc2VcbiAgICAgICAgcmV0dXJuICcvJztcbiAgICB9IGVsc2UgaWYgKHJlc29sdmVkUGF0aC5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gcmVzb2x2ZWRQYXRoO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gJy4nO1xuICAgIH1cbiAgfSxcblxuICBub3JtYWxpemU6IGZ1bmN0aW9uIG5vcm1hbGl6ZShwYXRoKSB7XG4gICAgYXNzZXJ0UGF0aChwYXRoKTtcblxuICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMCkgcmV0dXJuICcuJztcblxuICAgIHZhciBpc0Fic29sdXRlID0gcGF0aC5jaGFyQ29kZUF0KDApID09PSA0NyAvKi8qLztcbiAgICB2YXIgdHJhaWxpbmdTZXBhcmF0b3IgPSBwYXRoLmNoYXJDb2RlQXQocGF0aC5sZW5ndGggLSAxKSA9PT0gNDcgLyovKi87XG5cbiAgICAvLyBOb3JtYWxpemUgdGhlIHBhdGhcbiAgICBwYXRoID0gbm9ybWFsaXplU3RyaW5nUG9zaXgocGF0aCwgIWlzQWJzb2x1dGUpO1xuXG4gICAgaWYgKHBhdGgubGVuZ3RoID09PSAwICYmICFpc0Fic29sdXRlKSBwYXRoID0gJy4nO1xuICAgIGlmIChwYXRoLmxlbmd0aCA+IDAgJiYgdHJhaWxpbmdTZXBhcmF0b3IpIHBhdGggKz0gJy8nO1xuXG4gICAgaWYgKGlzQWJzb2x1dGUpIHJldHVybiAnLycgKyBwYXRoO1xuICAgIHJldHVybiBwYXRoO1xuICB9LFxuXG4gIGlzQWJzb2x1dGU6IGZ1bmN0aW9uIGlzQWJzb2x1dGUocGF0aCkge1xuICAgIGFzc2VydFBhdGgocGF0aCk7XG4gICAgcmV0dXJuIHBhdGgubGVuZ3RoID4gMCAmJiBwYXRoLmNoYXJDb2RlQXQoMCkgPT09IDQ3IC8qLyovO1xuICB9LFxuXG4gIGpvaW46IGZ1bmN0aW9uIGpvaW4oKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICByZXR1cm4gJy4nO1xuICAgIHZhciBqb2luZWQ7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyArK2kpIHtcbiAgICAgIHZhciBhcmcgPSBhcmd1bWVudHNbaV07XG4gICAgICBhc3NlcnRQYXRoKGFyZyk7XG4gICAgICBpZiAoYXJnLmxlbmd0aCA+IDApIHtcbiAgICAgICAgaWYgKGpvaW5lZCA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgIGpvaW5lZCA9IGFyZztcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGpvaW5lZCArPSAnLycgKyBhcmc7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChqb2luZWQgPT09IHVuZGVmaW5lZClcbiAgICAgIHJldHVybiAnLic7XG4gICAgcmV0dXJuIHBvc2l4Lm5vcm1hbGl6ZShqb2luZWQpO1xuICB9LFxuXG4gIHJlbGF0aXZlOiBmdW5jdGlvbiByZWxhdGl2ZShmcm9tLCB0bykge1xuICAgIGFzc2VydFBhdGgoZnJvbSk7XG4gICAgYXNzZXJ0UGF0aCh0byk7XG5cbiAgICBpZiAoZnJvbSA9PT0gdG8pIHJldHVybiAnJztcblxuICAgIGZyb20gPSBwb3NpeC5yZXNvbHZlKGZyb20pO1xuICAgIHRvID0gcG9zaXgucmVzb2x2ZSh0byk7XG5cbiAgICBpZiAoZnJvbSA9PT0gdG8pIHJldHVybiAnJztcblxuICAgIC8vIFRyaW0gYW55IGxlYWRpbmcgYmFja3NsYXNoZXNcbiAgICB2YXIgZnJvbVN0YXJ0ID0gMTtcbiAgICBmb3IgKDsgZnJvbVN0YXJ0IDwgZnJvbS5sZW5ndGg7ICsrZnJvbVN0YXJ0KSB7XG4gICAgICBpZiAoZnJvbS5jaGFyQ29kZUF0KGZyb21TdGFydCkgIT09IDQ3IC8qLyovKVxuICAgICAgICBicmVhaztcbiAgICB9XG4gICAgdmFyIGZyb21FbmQgPSBmcm9tLmxlbmd0aDtcbiAgICB2YXIgZnJvbUxlbiA9IGZyb21FbmQgLSBmcm9tU3RhcnQ7XG5cbiAgICAvLyBUcmltIGFueSBsZWFkaW5nIGJhY2tzbGFzaGVzXG4gICAgdmFyIHRvU3RhcnQgPSAxO1xuICAgIGZvciAoOyB0b1N0YXJ0IDwgdG8ubGVuZ3RoOyArK3RvU3RhcnQpIHtcbiAgICAgIGlmICh0by5jaGFyQ29kZUF0KHRvU3RhcnQpICE9PSA0NyAvKi8qLylcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHZhciB0b0VuZCA9IHRvLmxlbmd0aDtcbiAgICB2YXIgdG9MZW4gPSB0b0VuZCAtIHRvU3RhcnQ7XG5cbiAgICAvLyBDb21wYXJlIHBhdGhzIHRvIGZpbmQgdGhlIGxvbmdlc3QgY29tbW9uIHBhdGggZnJvbSByb290XG4gICAgdmFyIGxlbmd0aCA9IGZyb21MZW4gPCB0b0xlbiA/IGZyb21MZW4gOiB0b0xlbjtcbiAgICB2YXIgbGFzdENvbW1vblNlcCA9IC0xO1xuICAgIHZhciBpID0gMDtcbiAgICBmb3IgKDsgaSA8PSBsZW5ndGg7ICsraSkge1xuICAgICAgaWYgKGkgPT09IGxlbmd0aCkge1xuICAgICAgICBpZiAodG9MZW4gPiBsZW5ndGgpIHtcbiAgICAgICAgICBpZiAodG8uY2hhckNvZGVBdCh0b1N0YXJ0ICsgaSkgPT09IDQ3IC8qLyovKSB7XG4gICAgICAgICAgICAvLyBXZSBnZXQgaGVyZSBpZiBgZnJvbWAgaXMgdGhlIGV4YWN0IGJhc2UgcGF0aCBmb3IgYHRvYC5cbiAgICAgICAgICAgIC8vIEZvciBleGFtcGxlOiBmcm9tPScvZm9vL2Jhcic7IHRvPScvZm9vL2Jhci9iYXonXG4gICAgICAgICAgICByZXR1cm4gdG8uc2xpY2UodG9TdGFydCArIGkgKyAxKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGkgPT09IDApIHtcbiAgICAgICAgICAgIC8vIFdlIGdldCBoZXJlIGlmIGBmcm9tYCBpcyB0aGUgcm9vdFxuICAgICAgICAgICAgLy8gRm9yIGV4YW1wbGU6IGZyb209Jy8nOyB0bz0nL2ZvbydcbiAgICAgICAgICAgIHJldHVybiB0by5zbGljZSh0b1N0YXJ0ICsgaSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGZyb21MZW4gPiBsZW5ndGgpIHtcbiAgICAgICAgICBpZiAoZnJvbS5jaGFyQ29kZUF0KGZyb21TdGFydCArIGkpID09PSA0NyAvKi8qLykge1xuICAgICAgICAgICAgLy8gV2UgZ2V0IGhlcmUgaWYgYHRvYCBpcyB0aGUgZXhhY3QgYmFzZSBwYXRoIGZvciBgZnJvbWAuXG4gICAgICAgICAgICAvLyBGb3IgZXhhbXBsZTogZnJvbT0nL2Zvby9iYXIvYmF6JzsgdG89Jy9mb28vYmFyJ1xuICAgICAgICAgICAgbGFzdENvbW1vblNlcCA9IGk7XG4gICAgICAgICAgfSBlbHNlIGlmIChpID09PSAwKSB7XG4gICAgICAgICAgICAvLyBXZSBnZXQgaGVyZSBpZiBgdG9gIGlzIHRoZSByb290LlxuICAgICAgICAgICAgLy8gRm9yIGV4YW1wbGU6IGZyb209Jy9mb28nOyB0bz0nLydcbiAgICAgICAgICAgIGxhc3RDb21tb25TZXAgPSAwO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHZhciBmcm9tQ29kZSA9IGZyb20uY2hhckNvZGVBdChmcm9tU3RhcnQgKyBpKTtcbiAgICAgIHZhciB0b0NvZGUgPSB0by5jaGFyQ29kZUF0KHRvU3RhcnQgKyBpKTtcbiAgICAgIGlmIChmcm9tQ29kZSAhPT0gdG9Db2RlKVxuICAgICAgICBicmVhaztcbiAgICAgIGVsc2UgaWYgKGZyb21Db2RlID09PSA0NyAvKi8qLylcbiAgICAgICAgbGFzdENvbW1vblNlcCA9IGk7XG4gICAgfVxuXG4gICAgdmFyIG91dCA9ICcnO1xuICAgIC8vIEdlbmVyYXRlIHRoZSByZWxhdGl2ZSBwYXRoIGJhc2VkIG9uIHRoZSBwYXRoIGRpZmZlcmVuY2UgYmV0d2VlbiBgdG9gXG4gICAgLy8gYW5kIGBmcm9tYFxuICAgIGZvciAoaSA9IGZyb21TdGFydCArIGxhc3RDb21tb25TZXAgKyAxOyBpIDw9IGZyb21FbmQ7ICsraSkge1xuICAgICAgaWYgKGkgPT09IGZyb21FbmQgfHwgZnJvbS5jaGFyQ29kZUF0KGkpID09PSA0NyAvKi8qLykge1xuICAgICAgICBpZiAob3V0Lmxlbmd0aCA9PT0gMClcbiAgICAgICAgICBvdXQgKz0gJy4uJztcbiAgICAgICAgZWxzZVxuICAgICAgICAgIG91dCArPSAnLy4uJztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBMYXN0bHksIGFwcGVuZCB0aGUgcmVzdCBvZiB0aGUgZGVzdGluYXRpb24gKGB0b2ApIHBhdGggdGhhdCBjb21lcyBhZnRlclxuICAgIC8vIHRoZSBjb21tb24gcGF0aCBwYXJ0c1xuICAgIGlmIChvdXQubGVuZ3RoID4gMClcbiAgICAgIHJldHVybiBvdXQgKyB0by5zbGljZSh0b1N0YXJ0ICsgbGFzdENvbW1vblNlcCk7XG4gICAgZWxzZSB7XG4gICAgICB0b1N0YXJ0ICs9IGxhc3RDb21tb25TZXA7XG4gICAgICBpZiAodG8uY2hhckNvZGVBdCh0b1N0YXJ0KSA9PT0gNDcgLyovKi8pXG4gICAgICAgICsrdG9TdGFydDtcbiAgICAgIHJldHVybiB0by5zbGljZSh0b1N0YXJ0KTtcbiAgICB9XG4gIH0sXG5cbiAgX21ha2VMb25nOiBmdW5jdGlvbiBfbWFrZUxvbmcocGF0aCkge1xuICAgIHJldHVybiBwYXRoO1xuICB9LFxuXG4gIGRpcm5hbWU6IGZ1bmN0aW9uIGRpcm5hbWUocGF0aCkge1xuICAgIGFzc2VydFBhdGgocGF0aCk7XG4gICAgaWYgKHBhdGgubGVuZ3RoID09PSAwKSByZXR1cm4gJy4nO1xuICAgIHZhciBjb2RlID0gcGF0aC5jaGFyQ29kZUF0KDApO1xuICAgIHZhciBoYXNSb290ID0gY29kZSA9PT0gNDcgLyovKi87XG4gICAgdmFyIGVuZCA9IC0xO1xuICAgIHZhciBtYXRjaGVkU2xhc2ggPSB0cnVlO1xuICAgIGZvciAodmFyIGkgPSBwYXRoLmxlbmd0aCAtIDE7IGkgPj0gMTsgLS1pKSB7XG4gICAgICBjb2RlID0gcGF0aC5jaGFyQ29kZUF0KGkpO1xuICAgICAgaWYgKGNvZGUgPT09IDQ3IC8qLyovKSB7XG4gICAgICAgICAgaWYgKCFtYXRjaGVkU2xhc2gpIHtcbiAgICAgICAgICAgIGVuZCA9IGk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFdlIHNhdyB0aGUgZmlyc3Qgbm9uLXBhdGggc2VwYXJhdG9yXG4gICAgICAgIG1hdGNoZWRTbGFzaCA9IGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChlbmQgPT09IC0xKSByZXR1cm4gaGFzUm9vdCA/ICcvJyA6ICcuJztcbiAgICBpZiAoaGFzUm9vdCAmJiBlbmQgPT09IDEpIHJldHVybiAnLy8nO1xuICAgIHJldHVybiBwYXRoLnNsaWNlKDAsIGVuZCk7XG4gIH0sXG5cbiAgYmFzZW5hbWU6IGZ1bmN0aW9uIGJhc2VuYW1lKHBhdGgsIGV4dCkge1xuICAgIGlmIChleHQgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgZXh0ICE9PSAnc3RyaW5nJykgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJleHRcIiBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICAgYXNzZXJ0UGF0aChwYXRoKTtcblxuICAgIHZhciBzdGFydCA9IDA7XG4gICAgdmFyIGVuZCA9IC0xO1xuICAgIHZhciBtYXRjaGVkU2xhc2ggPSB0cnVlO1xuICAgIHZhciBpO1xuXG4gICAgaWYgKGV4dCAhPT0gdW5kZWZpbmVkICYmIGV4dC5sZW5ndGggPiAwICYmIGV4dC5sZW5ndGggPD0gcGF0aC5sZW5ndGgpIHtcbiAgICAgIGlmIChleHQubGVuZ3RoID09PSBwYXRoLmxlbmd0aCAmJiBleHQgPT09IHBhdGgpIHJldHVybiAnJztcbiAgICAgIHZhciBleHRJZHggPSBleHQubGVuZ3RoIC0gMTtcbiAgICAgIHZhciBmaXJzdE5vblNsYXNoRW5kID0gLTE7XG4gICAgICBmb3IgKGkgPSBwYXRoLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICAgIHZhciBjb2RlID0gcGF0aC5jaGFyQ29kZUF0KGkpO1xuICAgICAgICBpZiAoY29kZSA9PT0gNDcgLyovKi8pIHtcbiAgICAgICAgICAgIC8vIElmIHdlIHJlYWNoZWQgYSBwYXRoIHNlcGFyYXRvciB0aGF0IHdhcyBub3QgcGFydCBvZiBhIHNldCBvZiBwYXRoXG4gICAgICAgICAgICAvLyBzZXBhcmF0b3JzIGF0IHRoZSBlbmQgb2YgdGhlIHN0cmluZywgc3RvcCBub3dcbiAgICAgICAgICAgIGlmICghbWF0Y2hlZFNsYXNoKSB7XG4gICAgICAgICAgICAgIHN0YXJ0ID0gaSArIDE7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGZpcnN0Tm9uU2xhc2hFbmQgPT09IC0xKSB7XG4gICAgICAgICAgICAvLyBXZSBzYXcgdGhlIGZpcnN0IG5vbi1wYXRoIHNlcGFyYXRvciwgcmVtZW1iZXIgdGhpcyBpbmRleCBpbiBjYXNlXG4gICAgICAgICAgICAvLyB3ZSBuZWVkIGl0IGlmIHRoZSBleHRlbnNpb24gZW5kcyB1cCBub3QgbWF0Y2hpbmdcbiAgICAgICAgICAgIG1hdGNoZWRTbGFzaCA9IGZhbHNlO1xuICAgICAgICAgICAgZmlyc3ROb25TbGFzaEVuZCA9IGkgKyAxO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZXh0SWR4ID49IDApIHtcbiAgICAgICAgICAgIC8vIFRyeSB0byBtYXRjaCB0aGUgZXhwbGljaXQgZXh0ZW5zaW9uXG4gICAgICAgICAgICBpZiAoY29kZSA9PT0gZXh0LmNoYXJDb2RlQXQoZXh0SWR4KSkge1xuICAgICAgICAgICAgICBpZiAoLS1leHRJZHggPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgLy8gV2UgbWF0Y2hlZCB0aGUgZXh0ZW5zaW9uLCBzbyBtYXJrIHRoaXMgYXMgdGhlIGVuZCBvZiBvdXIgcGF0aFxuICAgICAgICAgICAgICAgIC8vIGNvbXBvbmVudFxuICAgICAgICAgICAgICAgIGVuZCA9IGk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIEV4dGVuc2lvbiBkb2VzIG5vdCBtYXRjaCwgc28gb3VyIHJlc3VsdCBpcyB0aGUgZW50aXJlIHBhdGhcbiAgICAgICAgICAgICAgLy8gY29tcG9uZW50XG4gICAgICAgICAgICAgIGV4dElkeCA9IC0xO1xuICAgICAgICAgICAgICBlbmQgPSBmaXJzdE5vblNsYXNoRW5kO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoc3RhcnQgPT09IGVuZCkgZW5kID0gZmlyc3ROb25TbGFzaEVuZDtlbHNlIGlmIChlbmQgPT09IC0xKSBlbmQgPSBwYXRoLmxlbmd0aDtcbiAgICAgIHJldHVybiBwYXRoLnNsaWNlKHN0YXJ0LCBlbmQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKGkgPSBwYXRoLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICAgIGlmIChwYXRoLmNoYXJDb2RlQXQoaSkgPT09IDQ3IC8qLyovKSB7XG4gICAgICAgICAgICAvLyBJZiB3ZSByZWFjaGVkIGEgcGF0aCBzZXBhcmF0b3IgdGhhdCB3YXMgbm90IHBhcnQgb2YgYSBzZXQgb2YgcGF0aFxuICAgICAgICAgICAgLy8gc2VwYXJhdG9ycyBhdCB0aGUgZW5kIG9mIHRoZSBzdHJpbmcsIHN0b3Agbm93XG4gICAgICAgICAgICBpZiAoIW1hdGNoZWRTbGFzaCkge1xuICAgICAgICAgICAgICBzdGFydCA9IGkgKyAxO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgaWYgKGVuZCA9PT0gLTEpIHtcbiAgICAgICAgICAvLyBXZSBzYXcgdGhlIGZpcnN0IG5vbi1wYXRoIHNlcGFyYXRvciwgbWFyayB0aGlzIGFzIHRoZSBlbmQgb2Ygb3VyXG4gICAgICAgICAgLy8gcGF0aCBjb21wb25lbnRcbiAgICAgICAgICBtYXRjaGVkU2xhc2ggPSBmYWxzZTtcbiAgICAgICAgICBlbmQgPSBpICsgMTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoZW5kID09PSAtMSkgcmV0dXJuICcnO1xuICAgICAgcmV0dXJuIHBhdGguc2xpY2Uoc3RhcnQsIGVuZCk7XG4gICAgfVxuICB9LFxuXG4gIGV4dG5hbWU6IGZ1bmN0aW9uIGV4dG5hbWUocGF0aCkge1xuICAgIGFzc2VydFBhdGgocGF0aCk7XG4gICAgdmFyIHN0YXJ0RG90ID0gLTE7XG4gICAgdmFyIHN0YXJ0UGFydCA9IDA7XG4gICAgdmFyIGVuZCA9IC0xO1xuICAgIHZhciBtYXRjaGVkU2xhc2ggPSB0cnVlO1xuICAgIC8vIFRyYWNrIHRoZSBzdGF0ZSBvZiBjaGFyYWN0ZXJzIChpZiBhbnkpIHdlIHNlZSBiZWZvcmUgb3VyIGZpcnN0IGRvdCBhbmRcbiAgICAvLyBhZnRlciBhbnkgcGF0aCBzZXBhcmF0b3Igd2UgZmluZFxuICAgIHZhciBwcmVEb3RTdGF0ZSA9IDA7XG4gICAgZm9yICh2YXIgaSA9IHBhdGgubGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgIHZhciBjb2RlID0gcGF0aC5jaGFyQ29kZUF0KGkpO1xuICAgICAgaWYgKGNvZGUgPT09IDQ3IC8qLyovKSB7XG4gICAgICAgICAgLy8gSWYgd2UgcmVhY2hlZCBhIHBhdGggc2VwYXJhdG9yIHRoYXQgd2FzIG5vdCBwYXJ0IG9mIGEgc2V0IG9mIHBhdGhcbiAgICAgICAgICAvLyBzZXBhcmF0b3JzIGF0IHRoZSBlbmQgb2YgdGhlIHN0cmluZywgc3RvcCBub3dcbiAgICAgICAgICBpZiAoIW1hdGNoZWRTbGFzaCkge1xuICAgICAgICAgICAgc3RhcnRQYXJ0ID0gaSArIDE7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgIGlmIChlbmQgPT09IC0xKSB7XG4gICAgICAgIC8vIFdlIHNhdyB0aGUgZmlyc3Qgbm9uLXBhdGggc2VwYXJhdG9yLCBtYXJrIHRoaXMgYXMgdGhlIGVuZCBvZiBvdXJcbiAgICAgICAgLy8gZXh0ZW5zaW9uXG4gICAgICAgIG1hdGNoZWRTbGFzaCA9IGZhbHNlO1xuICAgICAgICBlbmQgPSBpICsgMTtcbiAgICAgIH1cbiAgICAgIGlmIChjb2RlID09PSA0NiAvKi4qLykge1xuICAgICAgICAgIC8vIElmIHRoaXMgaXMgb3VyIGZpcnN0IGRvdCwgbWFyayBpdCBhcyB0aGUgc3RhcnQgb2Ygb3VyIGV4dGVuc2lvblxuICAgICAgICAgIGlmIChzdGFydERvdCA9PT0gLTEpXG4gICAgICAgICAgICBzdGFydERvdCA9IGk7XG4gICAgICAgICAgZWxzZSBpZiAocHJlRG90U3RhdGUgIT09IDEpXG4gICAgICAgICAgICBwcmVEb3RTdGF0ZSA9IDE7XG4gICAgICB9IGVsc2UgaWYgKHN0YXJ0RG90ICE9PSAtMSkge1xuICAgICAgICAvLyBXZSBzYXcgYSBub24tZG90IGFuZCBub24tcGF0aCBzZXBhcmF0b3IgYmVmb3JlIG91ciBkb3QsIHNvIHdlIHNob3VsZFxuICAgICAgICAvLyBoYXZlIGEgZ29vZCBjaGFuY2UgYXQgaGF2aW5nIGEgbm9uLWVtcHR5IGV4dGVuc2lvblxuICAgICAgICBwcmVEb3RTdGF0ZSA9IC0xO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdGFydERvdCA9PT0gLTEgfHwgZW5kID09PSAtMSB8fFxuICAgICAgICAvLyBXZSBzYXcgYSBub24tZG90IGNoYXJhY3RlciBpbW1lZGlhdGVseSBiZWZvcmUgdGhlIGRvdFxuICAgICAgICBwcmVEb3RTdGF0ZSA9PT0gMCB8fFxuICAgICAgICAvLyBUaGUgKHJpZ2h0LW1vc3QpIHRyaW1tZWQgcGF0aCBjb21wb25lbnQgaXMgZXhhY3RseSAnLi4nXG4gICAgICAgIHByZURvdFN0YXRlID09PSAxICYmIHN0YXJ0RG90ID09PSBlbmQgLSAxICYmIHN0YXJ0RG90ID09PSBzdGFydFBhcnQgKyAxKSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuICAgIHJldHVybiBwYXRoLnNsaWNlKHN0YXJ0RG90LCBlbmQpO1xuICB9LFxuXG4gIGZvcm1hdDogZnVuY3Rpb24gZm9ybWF0KHBhdGhPYmplY3QpIHtcbiAgICBpZiAocGF0aE9iamVjdCA9PT0gbnVsbCB8fCB0eXBlb2YgcGF0aE9iamVjdCAhPT0gJ29iamVjdCcpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcInBhdGhPYmplY3RcIiBhcmd1bWVudCBtdXN0IGJlIG9mIHR5cGUgT2JqZWN0LiBSZWNlaXZlZCB0eXBlICcgKyB0eXBlb2YgcGF0aE9iamVjdCk7XG4gICAgfVxuICAgIHJldHVybiBfZm9ybWF0KCcvJywgcGF0aE9iamVjdCk7XG4gIH0sXG5cbiAgcGFyc2U6IGZ1bmN0aW9uIHBhcnNlKHBhdGgpIHtcbiAgICBhc3NlcnRQYXRoKHBhdGgpO1xuXG4gICAgdmFyIHJldCA9IHsgcm9vdDogJycsIGRpcjogJycsIGJhc2U6ICcnLCBleHQ6ICcnLCBuYW1lOiAnJyB9O1xuICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHJldDtcbiAgICB2YXIgY29kZSA9IHBhdGguY2hhckNvZGVBdCgwKTtcbiAgICB2YXIgaXNBYnNvbHV0ZSA9IGNvZGUgPT09IDQ3IC8qLyovO1xuICAgIHZhciBzdGFydDtcbiAgICBpZiAoaXNBYnNvbHV0ZSkge1xuICAgICAgcmV0LnJvb3QgPSAnLyc7XG4gICAgICBzdGFydCA9IDE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YXJ0ID0gMDtcbiAgICB9XG4gICAgdmFyIHN0YXJ0RG90ID0gLTE7XG4gICAgdmFyIHN0YXJ0UGFydCA9IDA7XG4gICAgdmFyIGVuZCA9IC0xO1xuICAgIHZhciBtYXRjaGVkU2xhc2ggPSB0cnVlO1xuICAgIHZhciBpID0gcGF0aC5sZW5ndGggLSAxO1xuXG4gICAgLy8gVHJhY2sgdGhlIHN0YXRlIG9mIGNoYXJhY3RlcnMgKGlmIGFueSkgd2Ugc2VlIGJlZm9yZSBvdXIgZmlyc3QgZG90IGFuZFxuICAgIC8vIGFmdGVyIGFueSBwYXRoIHNlcGFyYXRvciB3ZSBmaW5kXG4gICAgdmFyIHByZURvdFN0YXRlID0gMDtcblxuICAgIC8vIEdldCBub24tZGlyIGluZm9cbiAgICBmb3IgKDsgaSA+PSBzdGFydDsgLS1pKSB7XG4gICAgICBjb2RlID0gcGF0aC5jaGFyQ29kZUF0KGkpO1xuICAgICAgaWYgKGNvZGUgPT09IDQ3IC8qLyovKSB7XG4gICAgICAgICAgLy8gSWYgd2UgcmVhY2hlZCBhIHBhdGggc2VwYXJhdG9yIHRoYXQgd2FzIG5vdCBwYXJ0IG9mIGEgc2V0IG9mIHBhdGhcbiAgICAgICAgICAvLyBzZXBhcmF0b3JzIGF0IHRoZSBlbmQgb2YgdGhlIHN0cmluZywgc3RvcCBub3dcbiAgICAgICAgICBpZiAoIW1hdGNoZWRTbGFzaCkge1xuICAgICAgICAgICAgc3RhcnRQYXJ0ID0gaSArIDE7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgIGlmIChlbmQgPT09IC0xKSB7XG4gICAgICAgIC8vIFdlIHNhdyB0aGUgZmlyc3Qgbm9uLXBhdGggc2VwYXJhdG9yLCBtYXJrIHRoaXMgYXMgdGhlIGVuZCBvZiBvdXJcbiAgICAgICAgLy8gZXh0ZW5zaW9uXG4gICAgICAgIG1hdGNoZWRTbGFzaCA9IGZhbHNlO1xuICAgICAgICBlbmQgPSBpICsgMTtcbiAgICAgIH1cbiAgICAgIGlmIChjb2RlID09PSA0NiAvKi4qLykge1xuICAgICAgICAgIC8vIElmIHRoaXMgaXMgb3VyIGZpcnN0IGRvdCwgbWFyayBpdCBhcyB0aGUgc3RhcnQgb2Ygb3VyIGV4dGVuc2lvblxuICAgICAgICAgIGlmIChzdGFydERvdCA9PT0gLTEpIHN0YXJ0RG90ID0gaTtlbHNlIGlmIChwcmVEb3RTdGF0ZSAhPT0gMSkgcHJlRG90U3RhdGUgPSAxO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXJ0RG90ICE9PSAtMSkge1xuICAgICAgICAvLyBXZSBzYXcgYSBub24tZG90IGFuZCBub24tcGF0aCBzZXBhcmF0b3IgYmVmb3JlIG91ciBkb3QsIHNvIHdlIHNob3VsZFxuICAgICAgICAvLyBoYXZlIGEgZ29vZCBjaGFuY2UgYXQgaGF2aW5nIGEgbm9uLWVtcHR5IGV4dGVuc2lvblxuICAgICAgICBwcmVEb3RTdGF0ZSA9IC0xO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdGFydERvdCA9PT0gLTEgfHwgZW5kID09PSAtMSB8fFxuICAgIC8vIFdlIHNhdyBhIG5vbi1kb3QgY2hhcmFjdGVyIGltbWVkaWF0ZWx5IGJlZm9yZSB0aGUgZG90XG4gICAgcHJlRG90U3RhdGUgPT09IDAgfHxcbiAgICAvLyBUaGUgKHJpZ2h0LW1vc3QpIHRyaW1tZWQgcGF0aCBjb21wb25lbnQgaXMgZXhhY3RseSAnLi4nXG4gICAgcHJlRG90U3RhdGUgPT09IDEgJiYgc3RhcnREb3QgPT09IGVuZCAtIDEgJiYgc3RhcnREb3QgPT09IHN0YXJ0UGFydCArIDEpIHtcbiAgICAgIGlmIChlbmQgIT09IC0xKSB7XG4gICAgICAgIGlmIChzdGFydFBhcnQgPT09IDAgJiYgaXNBYnNvbHV0ZSkgcmV0LmJhc2UgPSByZXQubmFtZSA9IHBhdGguc2xpY2UoMSwgZW5kKTtlbHNlIHJldC5iYXNlID0gcmV0Lm5hbWUgPSBwYXRoLnNsaWNlKHN0YXJ0UGFydCwgZW5kKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHN0YXJ0UGFydCA9PT0gMCAmJiBpc0Fic29sdXRlKSB7XG4gICAgICAgIHJldC5uYW1lID0gcGF0aC5zbGljZSgxLCBzdGFydERvdCk7XG4gICAgICAgIHJldC5iYXNlID0gcGF0aC5zbGljZSgxLCBlbmQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0Lm5hbWUgPSBwYXRoLnNsaWNlKHN0YXJ0UGFydCwgc3RhcnREb3QpO1xuICAgICAgICByZXQuYmFzZSA9IHBhdGguc2xpY2Uoc3RhcnRQYXJ0LCBlbmQpO1xuICAgICAgfVxuICAgICAgcmV0LmV4dCA9IHBhdGguc2xpY2Uoc3RhcnREb3QsIGVuZCk7XG4gICAgfVxuXG4gICAgaWYgKHN0YXJ0UGFydCA+IDApIHJldC5kaXIgPSBwYXRoLnNsaWNlKDAsIHN0YXJ0UGFydCAtIDEpO2Vsc2UgaWYgKGlzQWJzb2x1dGUpIHJldC5kaXIgPSAnLyc7XG5cbiAgICByZXR1cm4gcmV0O1xuICB9LFxuXG4gIHNlcDogJy8nLFxuICBkZWxpbWl0ZXI6ICc6JyxcbiAgd2luMzI6IG51bGwsXG4gIHBvc2l4OiBudWxsXG59O1xuXG5wb3NpeC5wb3NpeCA9IHBvc2l4O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBvc2l4O1xuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kT25jZUxpc3RlbmVyID0gbm9vcDtcblxucHJvY2Vzcy5saXN0ZW5lcnMgPSBmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gW10gfVxuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNCdWZmZXIoYXJnKSB7XG4gIHJldHVybiBhcmcgJiYgdHlwZW9mIGFyZyA9PT0gJ29iamVjdCdcbiAgICAmJiB0eXBlb2YgYXJnLmNvcHkgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLmZpbGwgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLnJlYWRVSW50OCA9PT0gJ2Z1bmN0aW9uJztcbn0iLCIvLyBDdXJyZW50bHkgaW4gc3luYyB3aXRoIE5vZGUuanMgbGliL2ludGVybmFsL3V0aWwvdHlwZXMuanNcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9jb21taXQvMTEyY2M3YzI3NTUxMjU0YWEyYjE3MDk4ZmI3NzQ4NjdmMDVlZDBkOVxuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBpc0FyZ3VtZW50c09iamVjdCA9IHJlcXVpcmUoJ2lzLWFyZ3VtZW50cycpO1xudmFyIGlzR2VuZXJhdG9yRnVuY3Rpb24gPSByZXF1aXJlKCdpcy1nZW5lcmF0b3ItZnVuY3Rpb24nKTtcbnZhciB3aGljaFR5cGVkQXJyYXkgPSByZXF1aXJlKCd3aGljaC10eXBlZC1hcnJheScpO1xudmFyIGlzVHlwZWRBcnJheSA9IHJlcXVpcmUoJ2lzLXR5cGVkLWFycmF5Jyk7XG5cbmZ1bmN0aW9uIHVuY3VycnlUaGlzKGYpIHtcbiAgcmV0dXJuIGYuY2FsbC5iaW5kKGYpO1xufVxuXG52YXIgQmlnSW50U3VwcG9ydGVkID0gdHlwZW9mIEJpZ0ludCAhPT0gJ3VuZGVmaW5lZCc7XG52YXIgU3ltYm9sU3VwcG9ydGVkID0gdHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCc7XG5cbnZhciBPYmplY3RUb1N0cmluZyA9IHVuY3VycnlUaGlzKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcpO1xuXG52YXIgbnVtYmVyVmFsdWUgPSB1bmN1cnJ5VGhpcyhOdW1iZXIucHJvdG90eXBlLnZhbHVlT2YpO1xudmFyIHN0cmluZ1ZhbHVlID0gdW5jdXJyeVRoaXMoU3RyaW5nLnByb3RvdHlwZS52YWx1ZU9mKTtcbnZhciBib29sZWFuVmFsdWUgPSB1bmN1cnJ5VGhpcyhCb29sZWFuLnByb3RvdHlwZS52YWx1ZU9mKTtcblxuaWYgKEJpZ0ludFN1cHBvcnRlZCkge1xuICB2YXIgYmlnSW50VmFsdWUgPSB1bmN1cnJ5VGhpcyhCaWdJbnQucHJvdG90eXBlLnZhbHVlT2YpO1xufVxuXG5pZiAoU3ltYm9sU3VwcG9ydGVkKSB7XG4gIHZhciBzeW1ib2xWYWx1ZSA9IHVuY3VycnlUaGlzKFN5bWJvbC5wcm90b3R5cGUudmFsdWVPZik7XG59XG5cbmZ1bmN0aW9uIGNoZWNrQm94ZWRQcmltaXRpdmUodmFsdWUsIHByb3RvdHlwZVZhbHVlT2YpIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgdHJ5IHtcbiAgICBwcm90b3R5cGVWYWx1ZU9mKHZhbHVlKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaChlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmV4cG9ydHMuaXNBcmd1bWVudHNPYmplY3QgPSBpc0FyZ3VtZW50c09iamVjdDtcbmV4cG9ydHMuaXNHZW5lcmF0b3JGdW5jdGlvbiA9IGlzR2VuZXJhdG9yRnVuY3Rpb247XG5leHBvcnRzLmlzVHlwZWRBcnJheSA9IGlzVHlwZWRBcnJheTtcblxuLy8gVGFrZW4gZnJvbSBoZXJlIGFuZCBtb2RpZmllZCBmb3IgYmV0dGVyIGJyb3dzZXIgc3VwcG9ydFxuLy8gaHR0cHM6Ly9naXRodWIuY29tL3NpbmRyZXNvcmh1cy9wLWlzLXByb21pc2UvYmxvYi9jZGEzNWE1MTNiZGEwM2Y5NzdhZDVjZGUzYTA3OWQyMzdlODJkN2VmL2luZGV4LmpzXG5mdW5jdGlvbiBpc1Byb21pc2UoaW5wdXQpIHtcblx0cmV0dXJuIChcblx0XHQoXG5cdFx0XHR0eXBlb2YgUHJvbWlzZSAhPT0gJ3VuZGVmaW5lZCcgJiZcblx0XHRcdGlucHV0IGluc3RhbmNlb2YgUHJvbWlzZVxuXHRcdCkgfHxcblx0XHQoXG5cdFx0XHRpbnB1dCAhPT0gbnVsbCAmJlxuXHRcdFx0dHlwZW9mIGlucHV0ID09PSAnb2JqZWN0JyAmJlxuXHRcdFx0dHlwZW9mIGlucHV0LnRoZW4gPT09ICdmdW5jdGlvbicgJiZcblx0XHRcdHR5cGVvZiBpbnB1dC5jYXRjaCA9PT0gJ2Z1bmN0aW9uJ1xuXHRcdClcblx0KTtcbn1cbmV4cG9ydHMuaXNQcm9taXNlID0gaXNQcm9taXNlO1xuXG5mdW5jdGlvbiBpc0FycmF5QnVmZmVyVmlldyh2YWx1ZSkge1xuICBpZiAodHlwZW9mIEFycmF5QnVmZmVyICE9PSAndW5kZWZpbmVkJyAmJiBBcnJheUJ1ZmZlci5pc1ZpZXcpIHtcbiAgICByZXR1cm4gQXJyYXlCdWZmZXIuaXNWaWV3KHZhbHVlKTtcbiAgfVxuXG4gIHJldHVybiAoXG4gICAgaXNUeXBlZEFycmF5KHZhbHVlKSB8fFxuICAgIGlzRGF0YVZpZXcodmFsdWUpXG4gICk7XG59XG5leHBvcnRzLmlzQXJyYXlCdWZmZXJWaWV3ID0gaXNBcnJheUJ1ZmZlclZpZXc7XG5cblxuZnVuY3Rpb24gaXNVaW50OEFycmF5KHZhbHVlKSB7XG4gIHJldHVybiB3aGljaFR5cGVkQXJyYXkodmFsdWUpID09PSAnVWludDhBcnJheSc7XG59XG5leHBvcnRzLmlzVWludDhBcnJheSA9IGlzVWludDhBcnJheTtcblxuZnVuY3Rpb24gaXNVaW50OENsYW1wZWRBcnJheSh2YWx1ZSkge1xuICByZXR1cm4gd2hpY2hUeXBlZEFycmF5KHZhbHVlKSA9PT0gJ1VpbnQ4Q2xhbXBlZEFycmF5Jztcbn1cbmV4cG9ydHMuaXNVaW50OENsYW1wZWRBcnJheSA9IGlzVWludDhDbGFtcGVkQXJyYXk7XG5cbmZ1bmN0aW9uIGlzVWludDE2QXJyYXkodmFsdWUpIHtcbiAgcmV0dXJuIHdoaWNoVHlwZWRBcnJheSh2YWx1ZSkgPT09ICdVaW50MTZBcnJheSc7XG59XG5leHBvcnRzLmlzVWludDE2QXJyYXkgPSBpc1VpbnQxNkFycmF5O1xuXG5mdW5jdGlvbiBpc1VpbnQzMkFycmF5KHZhbHVlKSB7XG4gIHJldHVybiB3aGljaFR5cGVkQXJyYXkodmFsdWUpID09PSAnVWludDMyQXJyYXknO1xufVxuZXhwb3J0cy5pc1VpbnQzMkFycmF5ID0gaXNVaW50MzJBcnJheTtcblxuZnVuY3Rpb24gaXNJbnQ4QXJyYXkodmFsdWUpIHtcbiAgcmV0dXJuIHdoaWNoVHlwZWRBcnJheSh2YWx1ZSkgPT09ICdJbnQ4QXJyYXknO1xufVxuZXhwb3J0cy5pc0ludDhBcnJheSA9IGlzSW50OEFycmF5O1xuXG5mdW5jdGlvbiBpc0ludDE2QXJyYXkodmFsdWUpIHtcbiAgcmV0dXJuIHdoaWNoVHlwZWRBcnJheSh2YWx1ZSkgPT09ICdJbnQxNkFycmF5Jztcbn1cbmV4cG9ydHMuaXNJbnQxNkFycmF5ID0gaXNJbnQxNkFycmF5O1xuXG5mdW5jdGlvbiBpc0ludDMyQXJyYXkodmFsdWUpIHtcbiAgcmV0dXJuIHdoaWNoVHlwZWRBcnJheSh2YWx1ZSkgPT09ICdJbnQzMkFycmF5Jztcbn1cbmV4cG9ydHMuaXNJbnQzMkFycmF5ID0gaXNJbnQzMkFycmF5O1xuXG5mdW5jdGlvbiBpc0Zsb2F0MzJBcnJheSh2YWx1ZSkge1xuICByZXR1cm4gd2hpY2hUeXBlZEFycmF5KHZhbHVlKSA9PT0gJ0Zsb2F0MzJBcnJheSc7XG59XG5leHBvcnRzLmlzRmxvYXQzMkFycmF5ID0gaXNGbG9hdDMyQXJyYXk7XG5cbmZ1bmN0aW9uIGlzRmxvYXQ2NEFycmF5KHZhbHVlKSB7XG4gIHJldHVybiB3aGljaFR5cGVkQXJyYXkodmFsdWUpID09PSAnRmxvYXQ2NEFycmF5Jztcbn1cbmV4cG9ydHMuaXNGbG9hdDY0QXJyYXkgPSBpc0Zsb2F0NjRBcnJheTtcblxuZnVuY3Rpb24gaXNCaWdJbnQ2NEFycmF5KHZhbHVlKSB7XG4gIHJldHVybiB3aGljaFR5cGVkQXJyYXkodmFsdWUpID09PSAnQmlnSW50NjRBcnJheSc7XG59XG5leHBvcnRzLmlzQmlnSW50NjRBcnJheSA9IGlzQmlnSW50NjRBcnJheTtcblxuZnVuY3Rpb24gaXNCaWdVaW50NjRBcnJheSh2YWx1ZSkge1xuICByZXR1cm4gd2hpY2hUeXBlZEFycmF5KHZhbHVlKSA9PT0gJ0JpZ1VpbnQ2NEFycmF5Jztcbn1cbmV4cG9ydHMuaXNCaWdVaW50NjRBcnJheSA9IGlzQmlnVWludDY0QXJyYXk7XG5cbmZ1bmN0aW9uIGlzTWFwVG9TdHJpbmcodmFsdWUpIHtcbiAgcmV0dXJuIE9iamVjdFRvU3RyaW5nKHZhbHVlKSA9PT0gJ1tvYmplY3QgTWFwXSc7XG59XG5pc01hcFRvU3RyaW5nLndvcmtpbmcgPSAoXG4gIHR5cGVvZiBNYXAgIT09ICd1bmRlZmluZWQnICYmXG4gIGlzTWFwVG9TdHJpbmcobmV3IE1hcCgpKVxuKTtcblxuZnVuY3Rpb24gaXNNYXAodmFsdWUpIHtcbiAgaWYgKHR5cGVvZiBNYXAgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIGlzTWFwVG9TdHJpbmcud29ya2luZ1xuICAgID8gaXNNYXBUb1N0cmluZyh2YWx1ZSlcbiAgICA6IHZhbHVlIGluc3RhbmNlb2YgTWFwO1xufVxuZXhwb3J0cy5pc01hcCA9IGlzTWFwO1xuXG5mdW5jdGlvbiBpc1NldFRvU3RyaW5nKHZhbHVlKSB7XG4gIHJldHVybiBPYmplY3RUb1N0cmluZyh2YWx1ZSkgPT09ICdbb2JqZWN0IFNldF0nO1xufVxuaXNTZXRUb1N0cmluZy53b3JraW5nID0gKFxuICB0eXBlb2YgU2V0ICE9PSAndW5kZWZpbmVkJyAmJlxuICBpc1NldFRvU3RyaW5nKG5ldyBTZXQoKSlcbik7XG5mdW5jdGlvbiBpc1NldCh2YWx1ZSkge1xuICBpZiAodHlwZW9mIFNldCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gaXNTZXRUb1N0cmluZy53b3JraW5nXG4gICAgPyBpc1NldFRvU3RyaW5nKHZhbHVlKVxuICAgIDogdmFsdWUgaW5zdGFuY2VvZiBTZXQ7XG59XG5leHBvcnRzLmlzU2V0ID0gaXNTZXQ7XG5cbmZ1bmN0aW9uIGlzV2Vha01hcFRvU3RyaW5nKHZhbHVlKSB7XG4gIHJldHVybiBPYmplY3RUb1N0cmluZyh2YWx1ZSkgPT09ICdbb2JqZWN0IFdlYWtNYXBdJztcbn1cbmlzV2Vha01hcFRvU3RyaW5nLndvcmtpbmcgPSAoXG4gIHR5cGVvZiBXZWFrTWFwICE9PSAndW5kZWZpbmVkJyAmJlxuICBpc1dlYWtNYXBUb1N0cmluZyhuZXcgV2Vha01hcCgpKVxuKTtcbmZ1bmN0aW9uIGlzV2Vha01hcCh2YWx1ZSkge1xuICBpZiAodHlwZW9mIFdlYWtNYXAgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIGlzV2Vha01hcFRvU3RyaW5nLndvcmtpbmdcbiAgICA/IGlzV2Vha01hcFRvU3RyaW5nKHZhbHVlKVxuICAgIDogdmFsdWUgaW5zdGFuY2VvZiBXZWFrTWFwO1xufVxuZXhwb3J0cy5pc1dlYWtNYXAgPSBpc1dlYWtNYXA7XG5cbmZ1bmN0aW9uIGlzV2Vha1NldFRvU3RyaW5nKHZhbHVlKSB7XG4gIHJldHVybiBPYmplY3RUb1N0cmluZyh2YWx1ZSkgPT09ICdbb2JqZWN0IFdlYWtTZXRdJztcbn1cbmlzV2Vha1NldFRvU3RyaW5nLndvcmtpbmcgPSAoXG4gIHR5cGVvZiBXZWFrU2V0ICE9PSAndW5kZWZpbmVkJyAmJlxuICBpc1dlYWtTZXRUb1N0cmluZyhuZXcgV2Vha1NldCgpKVxuKTtcbmZ1bmN0aW9uIGlzV2Vha1NldCh2YWx1ZSkge1xuICByZXR1cm4gaXNXZWFrU2V0VG9TdHJpbmcodmFsdWUpO1xufVxuZXhwb3J0cy5pc1dlYWtTZXQgPSBpc1dlYWtTZXQ7XG5cbmZ1bmN0aW9uIGlzQXJyYXlCdWZmZXJUb1N0cmluZyh2YWx1ZSkge1xuICByZXR1cm4gT2JqZWN0VG9TdHJpbmcodmFsdWUpID09PSAnW29iamVjdCBBcnJheUJ1ZmZlcl0nO1xufVxuaXNBcnJheUJ1ZmZlclRvU3RyaW5nLndvcmtpbmcgPSAoXG4gIHR5cGVvZiBBcnJheUJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgaXNBcnJheUJ1ZmZlclRvU3RyaW5nKG5ldyBBcnJheUJ1ZmZlcigpKVxuKTtcbmZ1bmN0aW9uIGlzQXJyYXlCdWZmZXIodmFsdWUpIHtcbiAgaWYgKHR5cGVvZiBBcnJheUJ1ZmZlciA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gaXNBcnJheUJ1ZmZlclRvU3RyaW5nLndvcmtpbmdcbiAgICA/IGlzQXJyYXlCdWZmZXJUb1N0cmluZyh2YWx1ZSlcbiAgICA6IHZhbHVlIGluc3RhbmNlb2YgQXJyYXlCdWZmZXI7XG59XG5leHBvcnRzLmlzQXJyYXlCdWZmZXIgPSBpc0FycmF5QnVmZmVyO1xuXG5mdW5jdGlvbiBpc0RhdGFWaWV3VG9TdHJpbmcodmFsdWUpIHtcbiAgcmV0dXJuIE9iamVjdFRvU3RyaW5nKHZhbHVlKSA9PT0gJ1tvYmplY3QgRGF0YVZpZXddJztcbn1cbmlzRGF0YVZpZXdUb1N0cmluZy53b3JraW5nID0gKFxuICB0eXBlb2YgQXJyYXlCdWZmZXIgIT09ICd1bmRlZmluZWQnICYmXG4gIHR5cGVvZiBEYXRhVmlldyAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgaXNEYXRhVmlld1RvU3RyaW5nKG5ldyBEYXRhVmlldyhuZXcgQXJyYXlCdWZmZXIoMSksIDAsIDEpKVxuKTtcbmZ1bmN0aW9uIGlzRGF0YVZpZXcodmFsdWUpIHtcbiAgaWYgKHR5cGVvZiBEYXRhVmlldyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gaXNEYXRhVmlld1RvU3RyaW5nLndvcmtpbmdcbiAgICA/IGlzRGF0YVZpZXdUb1N0cmluZyh2YWx1ZSlcbiAgICA6IHZhbHVlIGluc3RhbmNlb2YgRGF0YVZpZXc7XG59XG5leHBvcnRzLmlzRGF0YVZpZXcgPSBpc0RhdGFWaWV3O1xuXG4vLyBTdG9yZSBhIGNvcHkgb2YgU2hhcmVkQXJyYXlCdWZmZXIgaW4gY2FzZSBpdCdzIGRlbGV0ZWQgZWxzZXdoZXJlXG52YXIgU2hhcmVkQXJyYXlCdWZmZXJDb3B5ID0gdHlwZW9mIFNoYXJlZEFycmF5QnVmZmVyICE9PSAndW5kZWZpbmVkJyA/IFNoYXJlZEFycmF5QnVmZmVyIDogdW5kZWZpbmVkO1xuZnVuY3Rpb24gaXNTaGFyZWRBcnJheUJ1ZmZlclRvU3RyaW5nKHZhbHVlKSB7XG4gIHJldHVybiBPYmplY3RUb1N0cmluZyh2YWx1ZSkgPT09ICdbb2JqZWN0IFNoYXJlZEFycmF5QnVmZmVyXSc7XG59XG5mdW5jdGlvbiBpc1NoYXJlZEFycmF5QnVmZmVyKHZhbHVlKSB7XG4gIGlmICh0eXBlb2YgU2hhcmVkQXJyYXlCdWZmZXJDb3B5ID09PSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgaXNTaGFyZWRBcnJheUJ1ZmZlclRvU3RyaW5nLndvcmtpbmcgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgaXNTaGFyZWRBcnJheUJ1ZmZlclRvU3RyaW5nLndvcmtpbmcgPSBpc1NoYXJlZEFycmF5QnVmZmVyVG9TdHJpbmcobmV3IFNoYXJlZEFycmF5QnVmZmVyQ29weSgpKTtcbiAgfVxuXG4gIHJldHVybiBpc1NoYXJlZEFycmF5QnVmZmVyVG9TdHJpbmcud29ya2luZ1xuICAgID8gaXNTaGFyZWRBcnJheUJ1ZmZlclRvU3RyaW5nKHZhbHVlKVxuICAgIDogdmFsdWUgaW5zdGFuY2VvZiBTaGFyZWRBcnJheUJ1ZmZlckNvcHk7XG59XG5leHBvcnRzLmlzU2hhcmVkQXJyYXlCdWZmZXIgPSBpc1NoYXJlZEFycmF5QnVmZmVyO1xuXG5mdW5jdGlvbiBpc0FzeW5jRnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIE9iamVjdFRvU3RyaW5nKHZhbHVlKSA9PT0gJ1tvYmplY3QgQXN5bmNGdW5jdGlvbl0nO1xufVxuZXhwb3J0cy5pc0FzeW5jRnVuY3Rpb24gPSBpc0FzeW5jRnVuY3Rpb247XG5cbmZ1bmN0aW9uIGlzTWFwSXRlcmF0b3IodmFsdWUpIHtcbiAgcmV0dXJuIE9iamVjdFRvU3RyaW5nKHZhbHVlKSA9PT0gJ1tvYmplY3QgTWFwIEl0ZXJhdG9yXSc7XG59XG5leHBvcnRzLmlzTWFwSXRlcmF0b3IgPSBpc01hcEl0ZXJhdG9yO1xuXG5mdW5jdGlvbiBpc1NldEl0ZXJhdG9yKHZhbHVlKSB7XG4gIHJldHVybiBPYmplY3RUb1N0cmluZyh2YWx1ZSkgPT09ICdbb2JqZWN0IFNldCBJdGVyYXRvcl0nO1xufVxuZXhwb3J0cy5pc1NldEl0ZXJhdG9yID0gaXNTZXRJdGVyYXRvcjtcblxuZnVuY3Rpb24gaXNHZW5lcmF0b3JPYmplY3QodmFsdWUpIHtcbiAgcmV0dXJuIE9iamVjdFRvU3RyaW5nKHZhbHVlKSA9PT0gJ1tvYmplY3QgR2VuZXJhdG9yXSc7XG59XG5leHBvcnRzLmlzR2VuZXJhdG9yT2JqZWN0ID0gaXNHZW5lcmF0b3JPYmplY3Q7XG5cbmZ1bmN0aW9uIGlzV2ViQXNzZW1ibHlDb21waWxlZE1vZHVsZSh2YWx1ZSkge1xuICByZXR1cm4gT2JqZWN0VG9TdHJpbmcodmFsdWUpID09PSAnW29iamVjdCBXZWJBc3NlbWJseS5Nb2R1bGVdJztcbn1cbmV4cG9ydHMuaXNXZWJBc3NlbWJseUNvbXBpbGVkTW9kdWxlID0gaXNXZWJBc3NlbWJseUNvbXBpbGVkTW9kdWxlO1xuXG5mdW5jdGlvbiBpc051bWJlck9iamVjdCh2YWx1ZSkge1xuICByZXR1cm4gY2hlY2tCb3hlZFByaW1pdGl2ZSh2YWx1ZSwgbnVtYmVyVmFsdWUpO1xufVxuZXhwb3J0cy5pc051bWJlck9iamVjdCA9IGlzTnVtYmVyT2JqZWN0O1xuXG5mdW5jdGlvbiBpc1N0cmluZ09iamVjdCh2YWx1ZSkge1xuICByZXR1cm4gY2hlY2tCb3hlZFByaW1pdGl2ZSh2YWx1ZSwgc3RyaW5nVmFsdWUpO1xufVxuZXhwb3J0cy5pc1N0cmluZ09iamVjdCA9IGlzU3RyaW5nT2JqZWN0O1xuXG5mdW5jdGlvbiBpc0Jvb2xlYW5PYmplY3QodmFsdWUpIHtcbiAgcmV0dXJuIGNoZWNrQm94ZWRQcmltaXRpdmUodmFsdWUsIGJvb2xlYW5WYWx1ZSk7XG59XG5leHBvcnRzLmlzQm9vbGVhbk9iamVjdCA9IGlzQm9vbGVhbk9iamVjdDtcblxuZnVuY3Rpb24gaXNCaWdJbnRPYmplY3QodmFsdWUpIHtcbiAgcmV0dXJuIEJpZ0ludFN1cHBvcnRlZCAmJiBjaGVja0JveGVkUHJpbWl0aXZlKHZhbHVlLCBiaWdJbnRWYWx1ZSk7XG59XG5leHBvcnRzLmlzQmlnSW50T2JqZWN0ID0gaXNCaWdJbnRPYmplY3Q7XG5cbmZ1bmN0aW9uIGlzU3ltYm9sT2JqZWN0KHZhbHVlKSB7XG4gIHJldHVybiBTeW1ib2xTdXBwb3J0ZWQgJiYgY2hlY2tCb3hlZFByaW1pdGl2ZSh2YWx1ZSwgc3ltYm9sVmFsdWUpO1xufVxuZXhwb3J0cy5pc1N5bWJvbE9iamVjdCA9IGlzU3ltYm9sT2JqZWN0O1xuXG5mdW5jdGlvbiBpc0JveGVkUHJpbWl0aXZlKHZhbHVlKSB7XG4gIHJldHVybiAoXG4gICAgaXNOdW1iZXJPYmplY3QodmFsdWUpIHx8XG4gICAgaXNTdHJpbmdPYmplY3QodmFsdWUpIHx8XG4gICAgaXNCb29sZWFuT2JqZWN0KHZhbHVlKSB8fFxuICAgIGlzQmlnSW50T2JqZWN0KHZhbHVlKSB8fFxuICAgIGlzU3ltYm9sT2JqZWN0KHZhbHVlKVxuICApO1xufVxuZXhwb3J0cy5pc0JveGVkUHJpbWl0aXZlID0gaXNCb3hlZFByaW1pdGl2ZTtcblxuZnVuY3Rpb24gaXNBbnlBcnJheUJ1ZmZlcih2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnICYmIChcbiAgICBpc0FycmF5QnVmZmVyKHZhbHVlKSB8fFxuICAgIGlzU2hhcmVkQXJyYXlCdWZmZXIodmFsdWUpXG4gICk7XG59XG5leHBvcnRzLmlzQW55QXJyYXlCdWZmZXIgPSBpc0FueUFycmF5QnVmZmVyO1xuXG5bJ2lzUHJveHknLCAnaXNFeHRlcm5hbCcsICdpc01vZHVsZU5hbWVzcGFjZU9iamVjdCddLmZvckVhY2goZnVuY3Rpb24obWV0aG9kKSB7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBtZXRob2QsIHtcbiAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICB2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IobWV0aG9kICsgJyBpcyBub3Qgc3VwcG9ydGVkIGluIHVzZXJsYW5kJyk7XG4gICAgfVxuICB9KTtcbn0pO1xuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcnMgfHxcbiAgZnVuY3Rpb24gZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyhvYmopIHtcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iaik7XG4gICAgdmFyIGRlc2NyaXB0b3JzID0ge307XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBkZXNjcmlwdG9yc1trZXlzW2ldXSA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqLCBrZXlzW2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIGRlc2NyaXB0b3JzO1xuICB9O1xuXG52YXIgZm9ybWF0UmVnRXhwID0gLyVbc2RqJV0vZztcbmV4cG9ydHMuZm9ybWF0ID0gZnVuY3Rpb24oZikge1xuICBpZiAoIWlzU3RyaW5nKGYpKSB7XG4gICAgdmFyIG9iamVjdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgb2JqZWN0cy5wdXNoKGluc3BlY3QoYXJndW1lbnRzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiBvYmplY3RzLmpvaW4oJyAnKTtcbiAgfVxuXG4gIHZhciBpID0gMTtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gIHZhciBsZW4gPSBhcmdzLmxlbmd0aDtcbiAgdmFyIHN0ciA9IFN0cmluZyhmKS5yZXBsYWNlKGZvcm1hdFJlZ0V4cCwgZnVuY3Rpb24oeCkge1xuICAgIGlmICh4ID09PSAnJSUnKSByZXR1cm4gJyUnO1xuICAgIGlmIChpID49IGxlbikgcmV0dXJuIHg7XG4gICAgc3dpdGNoICh4KSB7XG4gICAgICBjYXNlICclcyc6IHJldHVybiBTdHJpbmcoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVkJzogcmV0dXJuIE51bWJlcihhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWonOlxuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhcmdzW2krK10pO1xuICAgICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgICAgcmV0dXJuICdbQ2lyY3VsYXJdJztcbiAgICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgfVxuICB9KTtcbiAgZm9yICh2YXIgeCA9IGFyZ3NbaV07IGkgPCBsZW47IHggPSBhcmdzWysraV0pIHtcbiAgICBpZiAoaXNOdWxsKHgpIHx8ICFpc09iamVjdCh4KSkge1xuICAgICAgc3RyICs9ICcgJyArIHg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciArPSAnICcgKyBpbnNwZWN0KHgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuXG4vLyBNYXJrIHRoYXQgYSBtZXRob2Qgc2hvdWxkIG5vdCBiZSB1c2VkLlxuLy8gUmV0dXJucyBhIG1vZGlmaWVkIGZ1bmN0aW9uIHdoaWNoIHdhcm5zIG9uY2UgYnkgZGVmYXVsdC5cbi8vIElmIC0tbm8tZGVwcmVjYXRpb24gaXMgc2V0LCB0aGVuIGl0IGlzIGEgbm8tb3AuXG5leHBvcnRzLmRlcHJlY2F0ZSA9IGZ1bmN0aW9uKGZuLCBtc2cpIHtcbiAgaWYgKHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiBwcm9jZXNzLm5vRGVwcmVjYXRpb24gPT09IHRydWUpIHtcbiAgICByZXR1cm4gZm47XG4gIH1cblxuICAvLyBBbGxvdyBmb3IgZGVwcmVjYXRpbmcgdGhpbmdzIGluIHRoZSBwcm9jZXNzIG9mIHN0YXJ0aW5nIHVwLlxuICBpZiAodHlwZW9mIHByb2Nlc3MgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGV4cG9ydHMuZGVwcmVjYXRlKGZuLCBtc2cpLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfVxuXG4gIHZhciB3YXJuZWQgPSBmYWxzZTtcbiAgZnVuY3Rpb24gZGVwcmVjYXRlZCgpIHtcbiAgICBpZiAoIXdhcm5lZCkge1xuICAgICAgaWYgKHByb2Nlc3MudGhyb3dEZXByZWNhdGlvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgICAgIH0gZWxzZSBpZiAocHJvY2Vzcy50cmFjZURlcHJlY2F0aW9uKSB7XG4gICAgICAgIGNvbnNvbGUudHJhY2UobXNnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IobXNnKTtcbiAgICAgIH1cbiAgICAgIHdhcm5lZCA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG5cbiAgcmV0dXJuIGRlcHJlY2F0ZWQ7XG59O1xuXG5cbnZhciBkZWJ1Z3MgPSB7fTtcbnZhciBkZWJ1Z0VudlJlZ2V4ID0gL14kLztcblxuaWYgKHByb2Nlc3MuZW52Lk5PREVfREVCVUcpIHtcbiAgdmFyIGRlYnVnRW52ID0gcHJvY2Vzcy5lbnYuTk9ERV9ERUJVRztcbiAgZGVidWdFbnYgPSBkZWJ1Z0Vudi5yZXBsYWNlKC9bfFxcXFx7fSgpW1xcXV4kKz8uXS9nLCAnXFxcXCQmJylcbiAgICAucmVwbGFjZSgvXFwqL2csICcuKicpXG4gICAgLnJlcGxhY2UoLywvZywgJyR8XicpXG4gICAgLnRvVXBwZXJDYXNlKCk7XG4gIGRlYnVnRW52UmVnZXggPSBuZXcgUmVnRXhwKCdeJyArIGRlYnVnRW52ICsgJyQnLCAnaScpO1xufVxuZXhwb3J0cy5kZWJ1Z2xvZyA9IGZ1bmN0aW9uKHNldCkge1xuICBzZXQgPSBzZXQudG9VcHBlckNhc2UoKTtcbiAgaWYgKCFkZWJ1Z3Nbc2V0XSkge1xuICAgIGlmIChkZWJ1Z0VudlJlZ2V4LnRlc3Qoc2V0KSkge1xuICAgICAgdmFyIHBpZCA9IHByb2Nlc3MucGlkO1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG1zZyA9IGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cyk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJyVzICVkOiAlcycsIHNldCwgcGlkLCBtc2cpO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHt9O1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVidWdzW3NldF07XG59O1xuXG5cbi8qKlxuICogRWNob3MgdGhlIHZhbHVlIG9mIGEgdmFsdWUuIFRyeXMgdG8gcHJpbnQgdGhlIHZhbHVlIG91dFxuICogaW4gdGhlIGJlc3Qgd2F5IHBvc3NpYmxlIGdpdmVuIHRoZSBkaWZmZXJlbnQgdHlwZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBUaGUgb2JqZWN0IHRvIHByaW50IG91dC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIG9wdGlvbnMgb2JqZWN0IHRoYXQgYWx0ZXJzIHRoZSBvdXRwdXQuXG4gKi9cbi8qIGxlZ2FjeTogb2JqLCBzaG93SGlkZGVuLCBkZXB0aCwgY29sb3JzKi9cbmZ1bmN0aW9uIGluc3BlY3Qob2JqLCBvcHRzKSB7XG4gIC8vIGRlZmF1bHQgb3B0aW9uc1xuICB2YXIgY3R4ID0ge1xuICAgIHNlZW46IFtdLFxuICAgIHN0eWxpemU6IHN0eWxpemVOb0NvbG9yXG4gIH07XG4gIC8vIGxlZ2FjeS4uLlxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSAzKSBjdHguZGVwdGggPSBhcmd1bWVudHNbMl07XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDQpIGN0eC5jb2xvcnMgPSBhcmd1bWVudHNbM107XG4gIGlmIChpc0Jvb2xlYW4ob3B0cykpIHtcbiAgICAvLyBsZWdhY3kuLi5cbiAgICBjdHguc2hvd0hpZGRlbiA9IG9wdHM7XG4gIH0gZWxzZSBpZiAob3B0cykge1xuICAgIC8vIGdvdCBhbiBcIm9wdGlvbnNcIiBvYmplY3RcbiAgICBleHBvcnRzLl9leHRlbmQoY3R4LCBvcHRzKTtcbiAgfVxuICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gIGlmIChpc1VuZGVmaW5lZChjdHguc2hvd0hpZGRlbikpIGN0eC5zaG93SGlkZGVuID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguZGVwdGgpKSBjdHguZGVwdGggPSAyO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmNvbG9ycykpIGN0eC5jb2xvcnMgPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jdXN0b21JbnNwZWN0KSkgY3R4LmN1c3RvbUluc3BlY3QgPSB0cnVlO1xuICBpZiAoY3R4LmNvbG9ycykgY3R4LnN0eWxpemUgPSBzdHlsaXplV2l0aENvbG9yO1xuICByZXR1cm4gZm9ybWF0VmFsdWUoY3R4LCBvYmosIGN0eC5kZXB0aCk7XG59XG5leHBvcnRzLmluc3BlY3QgPSBpbnNwZWN0O1xuXG5cbi8vIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQU5TSV9lc2NhcGVfY29kZSNncmFwaGljc1xuaW5zcGVjdC5jb2xvcnMgPSB7XG4gICdib2xkJyA6IFsxLCAyMl0sXG4gICdpdGFsaWMnIDogWzMsIDIzXSxcbiAgJ3VuZGVybGluZScgOiBbNCwgMjRdLFxuICAnaW52ZXJzZScgOiBbNywgMjddLFxuICAnd2hpdGUnIDogWzM3LCAzOV0sXG4gICdncmV5JyA6IFs5MCwgMzldLFxuICAnYmxhY2snIDogWzMwLCAzOV0sXG4gICdibHVlJyA6IFszNCwgMzldLFxuICAnY3lhbicgOiBbMzYsIDM5XSxcbiAgJ2dyZWVuJyA6IFszMiwgMzldLFxuICAnbWFnZW50YScgOiBbMzUsIDM5XSxcbiAgJ3JlZCcgOiBbMzEsIDM5XSxcbiAgJ3llbGxvdycgOiBbMzMsIDM5XVxufTtcblxuLy8gRG9uJ3QgdXNlICdibHVlJyBub3QgdmlzaWJsZSBvbiBjbWQuZXhlXG5pbnNwZWN0LnN0eWxlcyA9IHtcbiAgJ3NwZWNpYWwnOiAnY3lhbicsXG4gICdudW1iZXInOiAneWVsbG93JyxcbiAgJ2Jvb2xlYW4nOiAneWVsbG93JyxcbiAgJ3VuZGVmaW5lZCc6ICdncmV5JyxcbiAgJ251bGwnOiAnYm9sZCcsXG4gICdzdHJpbmcnOiAnZ3JlZW4nLFxuICAnZGF0ZSc6ICdtYWdlbnRhJyxcbiAgLy8gXCJuYW1lXCI6IGludGVudGlvbmFsbHkgbm90IHN0eWxpbmdcbiAgJ3JlZ2V4cCc6ICdyZWQnXG59O1xuXG5cbmZ1bmN0aW9uIHN0eWxpemVXaXRoQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgdmFyIHN0eWxlID0gaW5zcGVjdC5zdHlsZXNbc3R5bGVUeXBlXTtcblxuICBpZiAoc3R5bGUpIHtcbiAgICByZXR1cm4gJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVswXSArICdtJyArIHN0ciArXG4gICAgICAgICAgICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMV0gKyAnbSc7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHN0eWxpemVOb0NvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHJldHVybiBzdHI7XG59XG5cblxuZnVuY3Rpb24gYXJyYXlUb0hhc2goYXJyYXkpIHtcbiAgdmFyIGhhc2ggPSB7fTtcblxuICBhcnJheS5mb3JFYWNoKGZ1bmN0aW9uKHZhbCwgaWR4KSB7XG4gICAgaGFzaFt2YWxdID0gdHJ1ZTtcbiAgfSk7XG5cbiAgcmV0dXJuIGhhc2g7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0VmFsdWUoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzKSB7XG4gIC8vIFByb3ZpZGUgYSBob29rIGZvciB1c2VyLXNwZWNpZmllZCBpbnNwZWN0IGZ1bmN0aW9ucy5cbiAgLy8gQ2hlY2sgdGhhdCB2YWx1ZSBpcyBhbiBvYmplY3Qgd2l0aCBhbiBpbnNwZWN0IGZ1bmN0aW9uIG9uIGl0XG4gIGlmIChjdHguY3VzdG9tSW5zcGVjdCAmJlxuICAgICAgdmFsdWUgJiZcbiAgICAgIGlzRnVuY3Rpb24odmFsdWUuaW5zcGVjdCkgJiZcbiAgICAgIC8vIEZpbHRlciBvdXQgdGhlIHV0aWwgbW9kdWxlLCBpdCdzIGluc3BlY3QgZnVuY3Rpb24gaXMgc3BlY2lhbFxuICAgICAgdmFsdWUuaW5zcGVjdCAhPT0gZXhwb3J0cy5pbnNwZWN0ICYmXG4gICAgICAvLyBBbHNvIGZpbHRlciBvdXQgYW55IHByb3RvdHlwZSBvYmplY3RzIHVzaW5nIHRoZSBjaXJjdWxhciBjaGVjay5cbiAgICAgICEodmFsdWUuY29uc3RydWN0b3IgJiYgdmFsdWUuY29uc3RydWN0b3IucHJvdG90eXBlID09PSB2YWx1ZSkpIHtcbiAgICB2YXIgcmV0ID0gdmFsdWUuaW5zcGVjdChyZWN1cnNlVGltZXMsIGN0eCk7XG4gICAgaWYgKCFpc1N0cmluZyhyZXQpKSB7XG4gICAgICByZXQgPSBmb3JtYXRWYWx1ZShjdHgsIHJldCwgcmVjdXJzZVRpbWVzKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIC8vIFByaW1pdGl2ZSB0eXBlcyBjYW5ub3QgaGF2ZSBwcm9wZXJ0aWVzXG4gIHZhciBwcmltaXRpdmUgPSBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSk7XG4gIGlmIChwcmltaXRpdmUpIHtcbiAgICByZXR1cm4gcHJpbWl0aXZlO1xuICB9XG5cbiAgLy8gTG9vayB1cCB0aGUga2V5cyBvZiB0aGUgb2JqZWN0LlxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHZhbHVlKTtcbiAgdmFyIHZpc2libGVLZXlzID0gYXJyYXlUb0hhc2goa2V5cyk7XG5cbiAgaWYgKGN0eC5zaG93SGlkZGVuKSB7XG4gICAga2V5cyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHZhbHVlKTtcbiAgfVxuXG4gIC8vIElFIGRvZXNuJ3QgbWFrZSBlcnJvciBmaWVsZHMgbm9uLWVudW1lcmFibGVcbiAgLy8gaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L2llL2R3dzUyc2J0KHY9dnMuOTQpLmFzcHhcbiAgaWYgKGlzRXJyb3IodmFsdWUpXG4gICAgICAmJiAoa2V5cy5pbmRleE9mKCdtZXNzYWdlJykgPj0gMCB8fCBrZXlzLmluZGV4T2YoJ2Rlc2NyaXB0aW9uJykgPj0gMCkpIHtcbiAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgLy8gU29tZSB0eXBlIG9mIG9iamVjdCB3aXRob3V0IHByb3BlcnRpZXMgY2FuIGJlIHNob3J0Y3V0dGVkLlxuICBpZiAoa2V5cy5sZW5ndGggPT09IDApIHtcbiAgICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgIHZhciBuYW1lID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tGdW5jdGlvbicgKyBuYW1lICsgJ10nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH1cbiAgICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKERhdGUucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAnZGF0ZScpO1xuICAgIH1cbiAgICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIGJhc2UgPSAnJywgYXJyYXkgPSBmYWxzZSwgYnJhY2VzID0gWyd7JywgJ30nXTtcblxuICAvLyBNYWtlIEFycmF5IHNheSB0aGF0IHRoZXkgYXJlIEFycmF5XG4gIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgIGFycmF5ID0gdHJ1ZTtcbiAgICBicmFjZXMgPSBbJ1snLCAnXSddO1xuICB9XG5cbiAgLy8gTWFrZSBmdW5jdGlvbnMgc2F5IHRoYXQgdGhleSBhcmUgZnVuY3Rpb25zXG4gIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgIHZhciBuID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgYmFzZSA9ICcgW0Z1bmN0aW9uJyArIG4gKyAnXSc7XG4gIH1cblxuICAvLyBNYWtlIFJlZ0V4cHMgc2F5IHRoYXQgdGhleSBhcmUgUmVnRXhwc1xuICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGRhdGVzIHdpdGggcHJvcGVydGllcyBmaXJzdCBzYXkgdGhlIGRhdGVcbiAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgRGF0ZS5wcm90b3R5cGUudG9VVENTdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGVycm9yIHdpdGggbWVzc2FnZSBmaXJzdCBzYXkgdGhlIGVycm9yXG4gIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICBpZiAoa2V5cy5sZW5ndGggPT09IDAgJiYgKCFhcnJheSB8fCB2YWx1ZS5sZW5ndGggPT0gMCkpIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArIGJyYWNlc1sxXTtcbiAgfVxuXG4gIGlmIChyZWN1cnNlVGltZXMgPCAwKSB7XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbT2JqZWN0XScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG5cbiAgY3R4LnNlZW4ucHVzaCh2YWx1ZSk7XG5cbiAgdmFyIG91dHB1dDtcbiAgaWYgKGFycmF5KSB7XG4gICAgb3V0cHV0ID0gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cyk7XG4gIH0gZWxzZSB7XG4gICAgb3V0cHV0ID0ga2V5cy5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSk7XG4gICAgfSk7XG4gIH1cblxuICBjdHguc2Vlbi5wb3AoKTtcblxuICByZXR1cm4gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKSB7XG4gIGlmIChpc1VuZGVmaW5lZCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCd1bmRlZmluZWQnLCAndW5kZWZpbmVkJyk7XG4gIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICB2YXIgc2ltcGxlID0gJ1xcJycgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkucmVwbGFjZSgvXlwifFwiJC9nLCAnJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJykgKyAnXFwnJztcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoc2ltcGxlLCAnc3RyaW5nJyk7XG4gIH1cbiAgaWYgKGlzTnVtYmVyKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ251bWJlcicpO1xuICBpZiAoaXNCb29sZWFuKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ2Jvb2xlYW4nKTtcbiAgLy8gRm9yIHNvbWUgcmVhc29uIHR5cGVvZiBudWxsIGlzIFwib2JqZWN0XCIsIHNvIHNwZWNpYWwgY2FzZSBoZXJlLlxuICBpZiAoaXNOdWxsKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ251bGwnLCAnbnVsbCcpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEVycm9yKHZhbHVlKSB7XG4gIHJldHVybiAnWycgKyBFcnJvci5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgKyAnXSc7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cykge1xuICB2YXIgb3V0cHV0ID0gW107XG4gIGZvciAodmFyIGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYgKGhhc093blByb3BlcnR5KHZhbHVlLCBTdHJpbmcoaSkpKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIFN0cmluZyhpKSwgdHJ1ZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXQucHVzaCgnJyk7XG4gICAgfVxuICB9XG4gIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBpZiAoIWtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAga2V5LCB0cnVlKSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KSB7XG4gIHZhciBuYW1lLCBzdHIsIGRlc2M7XG4gIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHZhbHVlLCBrZXkpIHx8IHsgdmFsdWU6IHZhbHVlW2tleV0gfTtcbiAgaWYgKGRlc2MuZ2V0KSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlci9TZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoIWhhc093blByb3BlcnR5KHZpc2libGVLZXlzLCBrZXkpKSB7XG4gICAgbmFtZSA9ICdbJyArIGtleSArICddJztcbiAgfVxuICBpZiAoIXN0cikge1xuICAgIGlmIChjdHguc2Vlbi5pbmRleE9mKGRlc2MudmFsdWUpIDwgMCkge1xuICAgICAgaWYgKGlzTnVsbChyZWN1cnNlVGltZXMpKSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIHJlY3Vyc2VUaW1lcyAtIDEpO1xuICAgICAgfVxuICAgICAgaWYgKHN0ci5pbmRleE9mKCdcXG4nKSA+IC0xKSB7XG4gICAgICAgIGlmIChhcnJheSkge1xuICAgICAgICAgIHN0ciA9IHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKS5zbGljZSgyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHIgPSAnXFxuJyArIHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tDaXJjdWxhcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoaXNVbmRlZmluZWQobmFtZSkpIHtcbiAgICBpZiAoYXJyYXkgJiYga2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG4gICAgbmFtZSA9IEpTT04uc3RyaW5naWZ5KCcnICsga2V5KTtcbiAgICBpZiAobmFtZS5tYXRjaCgvXlwiKFthLXpBLVpfXVthLXpBLVpfMC05XSopXCIkLykpIHtcbiAgICAgIG5hbWUgPSBuYW1lLnNsaWNlKDEsIC0xKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnbmFtZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvKF5cInxcIiQpL2csIFwiJ1wiKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnc3RyaW5nJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5hbWUgKyAnOiAnICsgc3RyO1xufVxuXG5cbmZ1bmN0aW9uIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKSB7XG4gIHZhciBudW1MaW5lc0VzdCA9IDA7XG4gIHZhciBsZW5ndGggPSBvdXRwdXQucmVkdWNlKGZ1bmN0aW9uKHByZXYsIGN1cikge1xuICAgIG51bUxpbmVzRXN0Kys7XG4gICAgaWYgKGN1ci5pbmRleE9mKCdcXG4nKSA+PSAwKSBudW1MaW5lc0VzdCsrO1xuICAgIHJldHVybiBwcmV2ICsgY3VyLnJlcGxhY2UoL1xcdTAwMWJcXFtcXGRcXGQ/bS9nLCAnJykubGVuZ3RoICsgMTtcbiAgfSwgMCk7XG5cbiAgaWYgKGxlbmd0aCA+IDYwKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArXG4gICAgICAgICAgIChiYXNlID09PSAnJyA/ICcnIDogYmFzZSArICdcXG4gJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBvdXRwdXQuam9pbignLFxcbiAgJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBicmFjZXNbMV07XG4gIH1cblxuICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArICcgJyArIG91dHB1dC5qb2luKCcsICcpICsgJyAnICsgYnJhY2VzWzFdO1xufVxuXG5cbi8vIE5PVEU6IFRoZXNlIHR5cGUgY2hlY2tpbmcgZnVuY3Rpb25zIGludGVudGlvbmFsbHkgZG9uJ3QgdXNlIGBpbnN0YW5jZW9mYFxuLy8gYmVjYXVzZSBpdCBpcyBmcmFnaWxlIGFuZCBjYW4gYmUgZWFzaWx5IGZha2VkIHdpdGggYE9iamVjdC5jcmVhdGUoKWAuXG5leHBvcnRzLnR5cGVzID0gcmVxdWlyZSgnLi9zdXBwb3J0L3R5cGVzJyk7XG5cbmZ1bmN0aW9uIGlzQXJyYXkoYXIpIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkoYXIpO1xufVxuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gaXNCb29sZWFuKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nO1xufVxuZXhwb3J0cy5pc0Jvb2xlYW4gPSBpc0Jvb2xlYW47XG5cbmZ1bmN0aW9uIGlzTnVsbChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsID0gaXNOdWxsO1xuXG5mdW5jdGlvbiBpc051bGxPclVuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGxPclVuZGVmaW5lZCA9IGlzTnVsbE9yVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuZXhwb3J0cy5pc051bWJlciA9IGlzTnVtYmVyO1xuXG5mdW5jdGlvbiBpc1N0cmluZyhhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnO1xufVxuZXhwb3J0cy5pc1N0cmluZyA9IGlzU3RyaW5nO1xuXG5mdW5jdGlvbiBpc1N5bWJvbChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnO1xufVxuZXhwb3J0cy5pc1N5bWJvbCA9IGlzU3ltYm9sO1xuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuZXhwb3J0cy5pc1VuZGVmaW5lZCA9IGlzVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc1JlZ0V4cChyZSkge1xuICByZXR1cm4gaXNPYmplY3QocmUpICYmIG9iamVjdFRvU3RyaW5nKHJlKSA9PT0gJ1tvYmplY3QgUmVnRXhwXSc7XG59XG5leHBvcnRzLmlzUmVnRXhwID0gaXNSZWdFeHA7XG5leHBvcnRzLnR5cGVzLmlzUmVnRXhwID0gaXNSZWdFeHA7XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuZXhwb3J0cy5pc09iamVjdCA9IGlzT2JqZWN0O1xuXG5mdW5jdGlvbiBpc0RhdGUoZCkge1xuICByZXR1cm4gaXNPYmplY3QoZCkgJiYgb2JqZWN0VG9TdHJpbmcoZCkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cbmV4cG9ydHMuaXNEYXRlID0gaXNEYXRlO1xuZXhwb3J0cy50eXBlcy5pc0RhdGUgPSBpc0RhdGU7XG5cbmZ1bmN0aW9uIGlzRXJyb3IoZSkge1xuICByZXR1cm4gaXNPYmplY3QoZSkgJiZcbiAgICAgIChvYmplY3RUb1N0cmluZyhlKSA9PT0gJ1tvYmplY3QgRXJyb3JdJyB8fCBlIGluc3RhbmNlb2YgRXJyb3IpO1xufVxuZXhwb3J0cy5pc0Vycm9yID0gaXNFcnJvcjtcbmV4cG9ydHMudHlwZXMuaXNOYXRpdmVFcnJvciA9IGlzRXJyb3I7XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcblxuZnVuY3Rpb24gaXNQcmltaXRpdmUoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGwgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ251bWJlcicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3ltYm9sJyB8fCAgLy8gRVM2IHN5bWJvbFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3VuZGVmaW5lZCc7XG59XG5leHBvcnRzLmlzUHJpbWl0aXZlID0gaXNQcmltaXRpdmU7XG5cbmV4cG9ydHMuaXNCdWZmZXIgPSByZXF1aXJlKCcuL3N1cHBvcnQvaXNCdWZmZXInKTtcblxuZnVuY3Rpb24gb2JqZWN0VG9TdHJpbmcobykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pO1xufVxuXG5cbmZ1bmN0aW9uIHBhZChuKSB7XG4gIHJldHVybiBuIDwgMTAgPyAnMCcgKyBuLnRvU3RyaW5nKDEwKSA6IG4udG9TdHJpbmcoMTApO1xufVxuXG5cbnZhciBtb250aHMgPSBbJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJyxcbiAgICAgICAgICAgICAgJ09jdCcsICdOb3YnLCAnRGVjJ107XG5cbi8vIDI2IEZlYiAxNjoxOTozNFxuZnVuY3Rpb24gdGltZXN0YW1wKCkge1xuICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gIHZhciB0aW1lID0gW3BhZChkLmdldEhvdXJzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRNaW51dGVzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRTZWNvbmRzKCkpXS5qb2luKCc6Jyk7XG4gIHJldHVybiBbZC5nZXREYXRlKCksIG1vbnRoc1tkLmdldE1vbnRoKCldLCB0aW1lXS5qb2luKCcgJyk7XG59XG5cblxuLy8gbG9nIGlzIGp1c3QgYSB0aGluIHdyYXBwZXIgdG8gY29uc29sZS5sb2cgdGhhdCBwcmVwZW5kcyBhIHRpbWVzdGFtcFxuZXhwb3J0cy5sb2cgPSBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2coJyVzIC0gJXMnLCB0aW1lc3RhbXAoKSwgZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKSk7XG59O1xuXG5cbi8qKlxuICogSW5oZXJpdCB0aGUgcHJvdG90eXBlIG1ldGhvZHMgZnJvbSBvbmUgY29uc3RydWN0b3IgaW50byBhbm90aGVyLlxuICpcbiAqIFRoZSBGdW5jdGlvbi5wcm90b3R5cGUuaW5oZXJpdHMgZnJvbSBsYW5nLmpzIHJld3JpdHRlbiBhcyBhIHN0YW5kYWxvbmVcbiAqIGZ1bmN0aW9uIChub3Qgb24gRnVuY3Rpb24ucHJvdG90eXBlKS4gTk9URTogSWYgdGhpcyBmaWxlIGlzIHRvIGJlIGxvYWRlZFxuICogZHVyaW5nIGJvb3RzdHJhcHBpbmcgdGhpcyBmdW5jdGlvbiBuZWVkcyB0byBiZSByZXdyaXR0ZW4gdXNpbmcgc29tZSBuYXRpdmVcbiAqIGZ1bmN0aW9ucyBhcyBwcm90b3R5cGUgc2V0dXAgdXNpbmcgbm9ybWFsIEphdmFTY3JpcHQgZG9lcyBub3Qgd29yayBhc1xuICogZXhwZWN0ZWQgZHVyaW5nIGJvb3RzdHJhcHBpbmcgKHNlZSBtaXJyb3IuanMgaW4gcjExNDkwMykuXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB3aGljaCBuZWVkcyB0byBpbmhlcml0IHRoZVxuICogICAgIHByb3RvdHlwZS5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IHN1cGVyQ3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB0byBpbmhlcml0IHByb3RvdHlwZSBmcm9tLlxuICovXG5leHBvcnRzLmluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcblxuZXhwb3J0cy5fZXh0ZW5kID0gZnVuY3Rpb24ob3JpZ2luLCBhZGQpIHtcbiAgLy8gRG9uJ3QgZG8gYW55dGhpbmcgaWYgYWRkIGlzbid0IGFuIG9iamVjdFxuICBpZiAoIWFkZCB8fCAhaXNPYmplY3QoYWRkKSkgcmV0dXJuIG9yaWdpbjtcblxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGFkZCk7XG4gIHZhciBpID0ga2V5cy5sZW5ndGg7XG4gIHdoaWxlIChpLS0pIHtcbiAgICBvcmlnaW5ba2V5c1tpXV0gPSBhZGRba2V5c1tpXV07XG4gIH1cbiAgcmV0dXJuIG9yaWdpbjtcbn07XG5cbmZ1bmN0aW9uIGhhc093blByb3BlcnR5KG9iaiwgcHJvcCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCk7XG59XG5cbnZhciBrQ3VzdG9tUHJvbWlzaWZpZWRTeW1ib2wgPSB0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyA/IFN5bWJvbCgndXRpbC5wcm9taXNpZnkuY3VzdG9tJykgOiB1bmRlZmluZWQ7XG5cbmV4cG9ydHMucHJvbWlzaWZ5ID0gZnVuY3Rpb24gcHJvbWlzaWZ5KG9yaWdpbmFsKSB7XG4gIGlmICh0eXBlb2Ygb3JpZ2luYWwgIT09ICdmdW5jdGlvbicpXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwib3JpZ2luYWxcIiBhcmd1bWVudCBtdXN0IGJlIG9mIHR5cGUgRnVuY3Rpb24nKTtcblxuICBpZiAoa0N1c3RvbVByb21pc2lmaWVkU3ltYm9sICYmIG9yaWdpbmFsW2tDdXN0b21Qcm9taXNpZmllZFN5bWJvbF0pIHtcbiAgICB2YXIgZm4gPSBvcmlnaW5hbFtrQ3VzdG9tUHJvbWlzaWZpZWRTeW1ib2xdO1xuICAgIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcInV0aWwucHJvbWlzaWZ5LmN1c3RvbVwiIGFyZ3VtZW50IG11c3QgYmUgb2YgdHlwZSBGdW5jdGlvbicpO1xuICAgIH1cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZm4sIGtDdXN0b21Qcm9taXNpZmllZFN5bWJvbCwge1xuICAgICAgdmFsdWU6IGZuLCBlbnVtZXJhYmxlOiBmYWxzZSwgd3JpdGFibGU6IGZhbHNlLCBjb25maWd1cmFibGU6IHRydWVcbiAgICB9KTtcbiAgICByZXR1cm4gZm47XG4gIH1cblxuICBmdW5jdGlvbiBmbigpIHtcbiAgICB2YXIgcHJvbWlzZVJlc29sdmUsIHByb21pc2VSZWplY3Q7XG4gICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBwcm9taXNlUmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgICBwcm9taXNlUmVqZWN0ID0gcmVqZWN0O1xuICAgIH0pO1xuXG4gICAgdmFyIGFyZ3MgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgYXJncy5wdXNoKGFyZ3VtZW50c1tpXSk7XG4gICAgfVxuICAgIGFyZ3MucHVzaChmdW5jdGlvbiAoZXJyLCB2YWx1ZSkge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICBwcm9taXNlUmVqZWN0KGVycik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwcm9taXNlUmVzb2x2ZSh2YWx1ZSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0cnkge1xuICAgICAgb3JpZ2luYWwuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBwcm9taXNlUmVqZWN0KGVycik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb21pc2U7XG4gIH1cblxuICBPYmplY3Quc2V0UHJvdG90eXBlT2YoZm4sIE9iamVjdC5nZXRQcm90b3R5cGVPZihvcmlnaW5hbCkpO1xuXG4gIGlmIChrQ3VzdG9tUHJvbWlzaWZpZWRTeW1ib2wpIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShmbiwga0N1c3RvbVByb21pc2lmaWVkU3ltYm9sLCB7XG4gICAgdmFsdWU6IGZuLCBlbnVtZXJhYmxlOiBmYWxzZSwgd3JpdGFibGU6IGZhbHNlLCBjb25maWd1cmFibGU6IHRydWVcbiAgfSk7XG4gIHJldHVybiBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhcbiAgICBmbixcbiAgICBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzKG9yaWdpbmFsKVxuICApO1xufVxuXG5leHBvcnRzLnByb21pc2lmeS5jdXN0b20gPSBrQ3VzdG9tUHJvbWlzaWZpZWRTeW1ib2xcblxuZnVuY3Rpb24gY2FsbGJhY2tpZnlPblJlamVjdGVkKHJlYXNvbiwgY2IpIHtcbiAgLy8gYCFyZWFzb25gIGd1YXJkIGluc3BpcmVkIGJ5IGJsdWViaXJkIChSZWY6IGh0dHBzOi8vZ29vLmdsL3Q1SVM2TSkuXG4gIC8vIEJlY2F1c2UgYG51bGxgIGlzIGEgc3BlY2lhbCBlcnJvciB2YWx1ZSBpbiBjYWxsYmFja3Mgd2hpY2ggbWVhbnMgXCJubyBlcnJvclxuICAvLyBvY2N1cnJlZFwiLCB3ZSBlcnJvci13cmFwIHNvIHRoZSBjYWxsYmFjayBjb25zdW1lciBjYW4gZGlzdGluZ3Vpc2ggYmV0d2VlblxuICAvLyBcInRoZSBwcm9taXNlIHJlamVjdGVkIHdpdGggbnVsbFwiIG9yIFwidGhlIHByb21pc2UgZnVsZmlsbGVkIHdpdGggdW5kZWZpbmVkXCIuXG4gIGlmICghcmVhc29uKSB7XG4gICAgdmFyIG5ld1JlYXNvbiA9IG5ldyBFcnJvcignUHJvbWlzZSB3YXMgcmVqZWN0ZWQgd2l0aCBhIGZhbHN5IHZhbHVlJyk7XG4gICAgbmV3UmVhc29uLnJlYXNvbiA9IHJlYXNvbjtcbiAgICByZWFzb24gPSBuZXdSZWFzb247XG4gIH1cbiAgcmV0dXJuIGNiKHJlYXNvbik7XG59XG5cbmZ1bmN0aW9uIGNhbGxiYWNraWZ5KG9yaWdpbmFsKSB7XG4gIGlmICh0eXBlb2Ygb3JpZ2luYWwgIT09ICdmdW5jdGlvbicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJvcmlnaW5hbFwiIGFyZ3VtZW50IG11c3QgYmUgb2YgdHlwZSBGdW5jdGlvbicpO1xuICB9XG5cbiAgLy8gV2UgRE8gTk9UIHJldHVybiB0aGUgcHJvbWlzZSBhcyBpdCBnaXZlcyB0aGUgdXNlciBhIGZhbHNlIHNlbnNlIHRoYXRcbiAgLy8gdGhlIHByb21pc2UgaXMgYWN0dWFsbHkgc29tZWhvdyByZWxhdGVkIHRvIHRoZSBjYWxsYmFjaydzIGV4ZWN1dGlvblxuICAvLyBhbmQgdGhhdCB0aGUgY2FsbGJhY2sgdGhyb3dpbmcgd2lsbCByZWplY3QgdGhlIHByb21pc2UuXG4gIGZ1bmN0aW9uIGNhbGxiYWNraWZpZWQoKSB7XG4gICAgdmFyIGFyZ3MgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgYXJncy5wdXNoKGFyZ3VtZW50c1tpXSk7XG4gICAgfVxuXG4gICAgdmFyIG1heWJlQ2IgPSBhcmdzLnBvcCgpO1xuICAgIGlmICh0eXBlb2YgbWF5YmVDYiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIGxhc3QgYXJndW1lbnQgbXVzdCBiZSBvZiB0eXBlIEZ1bmN0aW9uJyk7XG4gICAgfVxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgY2IgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBtYXliZUNiLmFwcGx5KHNlbGYsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgICAvLyBJbiB0cnVlIG5vZGUgc3R5bGUgd2UgcHJvY2VzcyB0aGUgY2FsbGJhY2sgb24gYG5leHRUaWNrYCB3aXRoIGFsbCB0aGVcbiAgICAvLyBpbXBsaWNhdGlvbnMgKHN0YWNrLCBgdW5jYXVnaHRFeGNlcHRpb25gLCBgYXN5bmNfaG9va3NgKVxuICAgIG9yaWdpbmFsLmFwcGx5KHRoaXMsIGFyZ3MpXG4gICAgICAudGhlbihmdW5jdGlvbihyZXQpIHsgcHJvY2Vzcy5uZXh0VGljayhjYi5iaW5kKG51bGwsIG51bGwsIHJldCkpIH0sXG4gICAgICAgICAgICBmdW5jdGlvbihyZWopIHsgcHJvY2Vzcy5uZXh0VGljayhjYWxsYmFja2lmeU9uUmVqZWN0ZWQuYmluZChudWxsLCByZWosIGNiKSkgfSk7XG4gIH1cblxuICBPYmplY3Quc2V0UHJvdG90eXBlT2YoY2FsbGJhY2tpZmllZCwgT2JqZWN0LmdldFByb3RvdHlwZU9mKG9yaWdpbmFsKSk7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKGNhbGxiYWNraWZpZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGdldE93blByb3BlcnR5RGVzY3JpcHRvcnMob3JpZ2luYWwpKTtcbiAgcmV0dXJuIGNhbGxiYWNraWZpZWQ7XG59XG5leHBvcnRzLmNhbGxiYWNraWZ5ID0gY2FsbGJhY2tpZnk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBmb3JFYWNoID0gcmVxdWlyZSgnZm9yLWVhY2gnKTtcbnZhciBhdmFpbGFibGVUeXBlZEFycmF5cyA9IHJlcXVpcmUoJ2F2YWlsYWJsZS10eXBlZC1hcnJheXMnKTtcbnZhciBjYWxsQmluZCA9IHJlcXVpcmUoJ2NhbGwtYmluZCcpO1xudmFyIGNhbGxCb3VuZCA9IHJlcXVpcmUoJ2NhbGwtYmluZC9jYWxsQm91bmQnKTtcbnZhciBnT1BEID0gcmVxdWlyZSgnZ29wZCcpO1xuXG52YXIgJHRvU3RyaW5nID0gY2FsbEJvdW5kKCdPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nJyk7XG52YXIgaGFzVG9TdHJpbmdUYWcgPSByZXF1aXJlKCdoYXMtdG9zdHJpbmd0YWcvc2hhbXMnKSgpO1xuXG52YXIgZyA9IHR5cGVvZiBnbG9iYWxUaGlzID09PSAndW5kZWZpbmVkJyA/IGdsb2JhbCA6IGdsb2JhbFRoaXM7XG52YXIgdHlwZWRBcnJheXMgPSBhdmFpbGFibGVUeXBlZEFycmF5cygpO1xuXG52YXIgJHNsaWNlID0gY2FsbEJvdW5kKCdTdHJpbmcucHJvdG90eXBlLnNsaWNlJyk7XG52YXIgZ2V0UHJvdG90eXBlT2YgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Y7IC8vIHJlcXVpcmUoJ2dldHByb3RvdHlwZW9mJyk7XG5cbnZhciAkaW5kZXhPZiA9IGNhbGxCb3VuZCgnQXJyYXkucHJvdG90eXBlLmluZGV4T2YnLCB0cnVlKSB8fCBmdW5jdGlvbiBpbmRleE9mKGFycmF5LCB2YWx1ZSkge1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSArPSAxKSB7XG5cdFx0aWYgKGFycmF5W2ldID09PSB2YWx1ZSkge1xuXHRcdFx0cmV0dXJuIGk7XG5cdFx0fVxuXHR9XG5cdHJldHVybiAtMTtcbn07XG52YXIgY2FjaGUgPSB7IF9fcHJvdG9fXzogbnVsbCB9O1xuaWYgKGhhc1RvU3RyaW5nVGFnICYmIGdPUEQgJiYgZ2V0UHJvdG90eXBlT2YpIHtcblx0Zm9yRWFjaCh0eXBlZEFycmF5cywgZnVuY3Rpb24gKHR5cGVkQXJyYXkpIHtcblx0XHR2YXIgYXJyID0gbmV3IGdbdHlwZWRBcnJheV0oKTtcblx0XHRpZiAoU3ltYm9sLnRvU3RyaW5nVGFnIGluIGFycikge1xuXHRcdFx0dmFyIHByb3RvID0gZ2V0UHJvdG90eXBlT2YoYXJyKTtcblx0XHRcdHZhciBkZXNjcmlwdG9yID0gZ09QRChwcm90bywgU3ltYm9sLnRvU3RyaW5nVGFnKTtcblx0XHRcdGlmICghZGVzY3JpcHRvcikge1xuXHRcdFx0XHR2YXIgc3VwZXJQcm90byA9IGdldFByb3RvdHlwZU9mKHByb3RvKTtcblx0XHRcdFx0ZGVzY3JpcHRvciA9IGdPUEQoc3VwZXJQcm90bywgU3ltYm9sLnRvU3RyaW5nVGFnKTtcblx0XHRcdH1cblx0XHRcdGNhY2hlWyckJyArIHR5cGVkQXJyYXldID0gY2FsbEJpbmQoZGVzY3JpcHRvci5nZXQpO1xuXHRcdH1cblx0fSk7XG59IGVsc2Uge1xuXHRmb3JFYWNoKHR5cGVkQXJyYXlzLCBmdW5jdGlvbiAodHlwZWRBcnJheSkge1xuXHRcdHZhciBhcnIgPSBuZXcgZ1t0eXBlZEFycmF5XSgpO1xuXHRcdGNhY2hlWyckJyArIHR5cGVkQXJyYXldID0gY2FsbEJpbmQoYXJyLnNsaWNlKTtcblx0fSk7XG59XG5cbnZhciB0cnlUeXBlZEFycmF5cyA9IGZ1bmN0aW9uIHRyeUFsbFR5cGVkQXJyYXlzKHZhbHVlKSB7XG5cdHZhciBmb3VuZCA9IGZhbHNlO1xuXHRmb3JFYWNoKGNhY2hlLCBmdW5jdGlvbiAoZ2V0dGVyLCB0eXBlZEFycmF5KSB7XG5cdFx0aWYgKCFmb3VuZCkge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0aWYgKCckJyArIGdldHRlcih2YWx1ZSkgPT09IHR5cGVkQXJyYXkpIHtcblx0XHRcdFx0XHRmb3VuZCA9ICRzbGljZSh0eXBlZEFycmF5LCAxKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBjYXRjaCAoZSkgeyAvKiovIH1cblx0XHR9XG5cdH0pO1xuXHRyZXR1cm4gZm91bmQ7XG59O1xuXG52YXIgdHJ5U2xpY2VzID0gZnVuY3Rpb24gdHJ5QWxsU2xpY2VzKHZhbHVlKSB7XG5cdHZhciBmb3VuZCA9IGZhbHNlO1xuXHRmb3JFYWNoKGNhY2hlLCBmdW5jdGlvbiAoZ2V0dGVyLCBuYW1lKSB7XG5cdFx0aWYgKCFmb3VuZCkge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0Z2V0dGVyKHZhbHVlKTtcblx0XHRcdFx0Zm91bmQgPSAkc2xpY2UobmFtZSwgMSk7XG5cdFx0XHR9IGNhdGNoIChlKSB7IC8qKi8gfVxuXHRcdH1cblx0fSk7XG5cdHJldHVybiBmb3VuZDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gd2hpY2hUeXBlZEFycmF5KHZhbHVlKSB7XG5cdGlmICghdmFsdWUgfHwgdHlwZW9mIHZhbHVlICE9PSAnb2JqZWN0JykgeyByZXR1cm4gZmFsc2U7IH1cblx0aWYgKCFoYXNUb1N0cmluZ1RhZykge1xuXHRcdHZhciB0YWcgPSAkc2xpY2UoJHRvU3RyaW5nKHZhbHVlKSwgOCwgLTEpO1xuXHRcdGlmICgkaW5kZXhPZih0eXBlZEFycmF5cywgdGFnKSA+IC0xKSB7XG5cdFx0XHRyZXR1cm4gdGFnO1xuXHRcdH1cblx0XHRpZiAodGFnICE9PSAnT2JqZWN0Jykge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHQvLyBub2RlIDwgMC42IGhpdHMgaGVyZSBvbiByZWFsIFR5cGVkIEFycmF5c1xuXHRcdHJldHVybiB0cnlTbGljZXModmFsdWUpO1xuXHR9XG5cdGlmICghZ09QRCkgeyByZXR1cm4gbnVsbDsgfSAvLyB1bmtub3duIGVuZ2luZVxuXHRyZXR1cm4gdHJ5VHlwZWRBcnJheXModmFsdWUpO1xufTtcbiIsIlxuXG4oZnVuY3Rpb24oKSB7XG5cblxuLyogQ29weXJpZ2h0IChjKSAyMDE0IFRoZSBDaHJvbWl1bSBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYSBCU0Qtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZS4gKi9cblxuLyoqXG4gKiBAZmlsZW92ZXJ2aWV3IExvdy1sZXZlbCBET00gdHJhdmVyc2FsIHV0aWxpdHkgZnVuY3Rpb25zIHRvIGZpbmQgdGhlXG4gKiAgICAgbmV4dCAob3IgcHJldmlvdXMpIGNoYXJhY3Rlciwgd29yZCwgc2VudGVuY2UsIGxpbmUsIG9yIHBhcmFncmFwaCxcbiAqICAgICBpbiBhIGNvbXBsZXRlbHkgc3RhdGVsZXNzIG1hbm5lciB3aXRob3V0IGFjdHVhbGx5IG1hbmlwdWxhdGluZyB0aGVcbiAqICAgICBzZWxlY3Rpb24uXG4gKi9cblxuLyoqXG4gKiBBIGNsYXNzIHRvIHJlcHJlc2VudCBhIGN1cnNvciBsb2NhdGlvbiBpbiB0aGUgZG9jdW1lbnQsXG4gKiBsaWtlIHRoZSBzdGFydCBwb3NpdGlvbiBvciBlbmQgcG9zaXRpb24gb2YgYSBzZWxlY3Rpb24gcmFuZ2UuXG4gKlxuICogTGF0ZXIgdGhpcyBtYXkgYmUgZXh0ZW5kZWQgdG8gc3VwcG9ydCBcInZpcnR1YWwgdGV4dFwiIGZvciBhbiBvYmplY3QsXG4gKiBsaWtlIHRoZSBBTFQgdGV4dCBmb3IgYW4gaW1hZ2UuXG4gKlxuICogTm90ZTogd2UgY2FjaGUgdGhlIHRleHQgb2YgYSBwYXJ0aWN1bGFyIG5vZGUgYXQgdGhlIHRpbWUgd2VcbiAqIHRyYXZlcnNlIGludG8gaXQuIExhdGVyIHdlIHNob3VsZCBhZGQgc3VwcG9ydCBmb3IgZHluYW1pY2FsbHlcbiAqIHJlbG9hZGluZyBpdC5cbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZSBUaGUgRE9NIG5vZGUuXG4gKiBAcGFyYW0ge251bWJlcn0gaW5kZXggVGhlIGluZGV4IG9mIHRoZSBjaGFyYWN0ZXIgd2l0aGluIHRoZSBub2RlLlxuICogQHBhcmFtIHtzdHJpbmd9IHRleHQgVGhlIGNhY2hlZCB0ZXh0IGNvbnRlbnRzIG9mIHRoZSBub2RlLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmNvbnN0IEN1cnNvciA9IGZ1bmN0aW9uKG5vZGUsIGluZGV4LCB0ZXh0KSB7XG4gIHRoaXMubm9kZSA9IG5vZGU7XG4gIHRoaXMuaW5kZXggPSBpbmRleDtcbiAgdGhpcy50ZXh0ID0gdGV4dDtcbn07XG5cbi8qKlxuICogQHJldHVybiB7Q3Vyc29yfSBBIG5ldyBjdXJzb3IgcG9pbnRpbmcgdG8gdGhlIHNhbWUgbG9jYXRpb24uXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIG5ldyBDdXJzb3IodGhpcy5ub2RlLCB0aGlzLmluZGV4LCB0aGlzLnRleHQpO1xufTtcblxuLyoqXG4gKiBNb2RpZnkgdGhpcyBjdXJzb3IgdG8gcG9pbnQgdG8gdGhlIGxvY2F0aW9uIHRoYXQgYW5vdGhlciBjdXJzb3IgcG9pbnRzIHRvLlxuICogQHBhcmFtIHtDdXJzb3J9IG90aGVyQ3Vyc29yIFRoZSBjdXJzb3IgdG8gY29weSBmcm9tLlxuICovXG5DdXJzb3IucHJvdG90eXBlLmNvcHlGcm9tID0gZnVuY3Rpb24ob3RoZXJDdXJzb3IpIHtcbiAgdGhpcy5ub2RlID0gb3RoZXJDdXJzb3Iubm9kZTtcbiAgdGhpcy5pbmRleCA9IG90aGVyQ3Vyc29yLmluZGV4O1xuICB0aGlzLnRleHQgPSBvdGhlckN1cnNvci50ZXh0O1xufTtcblxuLyoqXG4gKiBVdGlsaXR5IGZ1bmN0aW9ucyBmb3Igc3RhdGVsZXNzIERPTSB0cmF2ZXJzYWwuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuY29uc3QgVHJhdmVyc2VVdGlsID0gZnVuY3Rpb24oKSB7fTtcblxuLyoqXG4gKiBHZXRzIHRoZSB0ZXh0IHJlcHJlc2VudGF0aW9uIG9mIGEgbm9kZS4gVGhpcyBhbGxvd3MgdXMgdG8gc3Vic3RpdHV0ZVxuICogYWx0IHRleHQsIG5hbWVzLCBvciB0aXRsZXMgZm9yIGh0bWwgZWxlbWVudHMgdGhhdCBwcm92aWRlIHRoZW0uXG4gKiBAcGFyYW0ge05vZGV9IG5vZGUgQSBET00gbm9kZS5cbiAqIEByZXR1cm4ge3N0cmluZ30gQSB0ZXh0IHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGUgbm9kZS5cbiAqL1xuVHJhdmVyc2VVdGlsLmdldE5vZGVUZXh0ID0gZnVuY3Rpb24obm9kZSkge1xuICBpZiAobm9kZS5jb25zdHJ1Y3RvciA9PSBUZXh0KSB7XG4gICAgcmV0dXJuIG5vZGUuZGF0YTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gJyc7XG4gIH1cbn07XG5cbi8qKlxuICogUmV0dXJuIHRydWUgaWYgYSBub2RlIHNob3VsZCBiZSB0cmVhdGVkIGFzIGEgbGVhZiBub2RlLCBiZWNhdXNlXG4gKiBpdHMgY2hpbGRyZW4gYXJlIHByb3BlcnRpZXMgb2YgdGhlIG9iamVjdCB0aGF0IHNob3VsZG4ndCBiZSB0cmF2ZXJzZWQuXG4gKlxuICogVE9ETyhkbWF6em9uaSk6IHJlcGxhY2UgdGhpcyB3aXRoIGEgcHJlZGljYXRlIHRoYXQgZGV0ZWN0cyBub2RlcyB3aXRoXG4gKiBBUklBIHJvbGVzIGFuZCBvdGhlciBvYmplY3RzIHRoYXQgaGF2ZSB0aGVpciBvd24gZGVzY3JpcHRpb24uXG4gKiBGb3Igbm93IHdlIGp1c3QgZGV0ZWN0IGEgY291cGxlIG9mIGNvbW1vbiBjYXNlcy5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IG5vZGUgQSBET00gbm9kZS5cbiAqIEByZXR1cm4ge2Jvb2xlYW59IFRydWUgaWYgdGhlIG5vZGUgc2hvdWxkIGJlIHRyZWF0ZWQgYXMgYSBsZWFmIG5vZGUuXG4gKi9cblRyYXZlcnNlVXRpbC50cmVhdEFzTGVhZk5vZGUgPSBmdW5jdGlvbihub2RlKSB7XG4gIHJldHVybiBub2RlLmNoaWxkTm9kZXMubGVuZ3RoID09IDAgfHxcbiAgICAgICAgIG5vZGUubm9kZU5hbWUgPT0gJ1NFTEVDVCcgfHxcbiAgICAgICAgIG5vZGUubm9kZU5hbWUgPT0gJ09CSkVDVCc7XG59O1xuXG4vKipcbiAqIFJldHVybiB0cnVlIG9ubHkgaWYgYSBzaW5nbGUgY2hhcmFjdGVyIGlzIHdoaXRlc3BhY2UuXG4gKiBGcm9tIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL1doaXRlc3BhY2VfaW5fdGhlX0RPTSxcbiAqIHdoaXRlc3BhY2UgaXMgZGVmaW5lZCBhcyBvbmUgb2YgdGhlIGNoYXJhY3RlcnNcbiAqICBcIlxcdFwiIFRBQiBcXHUwMDA5XG4gKiAgXCJcXG5cIiBMRiAgXFx1MDAwQVxuICogIFwiXFxyXCIgQ1IgIFxcdTAwMERcbiAqICBcIiBcIiAgU1BDIFxcdTAwMjAuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGMgQSBzdHJpbmcgY29udGFpbmluZyBhIHNpbmdsZSBjaGFyYWN0ZXIuXG4gKiBAcmV0dXJuIHtib29sZWFufSBUcnVlIGlmIHRoZSBjaGFyYWN0ZXIgaXMgd2hpdGVzcGFjZSwgb3RoZXJ3aXNlIGZhbHNlLlxuICovXG5UcmF2ZXJzZVV0aWwuaXNXaGl0ZXNwYWNlID0gZnVuY3Rpb24oYykge1xuICByZXR1cm4gKGMgPT0gJyAnIHx8IGMgPT0gJ1xcbicgfHwgYyA9PSAnXFxyJyB8fCBjID09ICdcXHQnKTtcbn07XG5cbi8qKlxuICogU2V0IHRoZSBzZWxlY3Rpb24gdG8gdGhlIHJhbmdlIGJldHdlZW4gdGhlIGdpdmVuIHN0YXJ0IGFuZCBlbmQgY3Vyc29ycy5cbiAqIEBwYXJhbSB7Q3Vyc29yfSBzdGFydCBUaGUgZGVzaXJlZCBzdGFydCBvZiB0aGUgc2VsZWN0aW9uLlxuICogQHBhcmFtIHtDdXJzb3J9IGVuZCBUaGUgZGVzaXJlZCBlbmQgb2YgdGhlIHNlbGVjdGlvbi5cbiAqIEByZXR1cm4ge1NlbGVjdGlvbn0gdGhlIHNlbGVjdGlvbiBvYmplY3QuXG4gKi9cblRyYXZlcnNlVXRpbC5zZXRTZWxlY3Rpb24gPSBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gIHZhciBzZWwgPSB3aW5kb3cuZ2V0U2VsZWN0aW9uKCk7XG4gIHNlbC5yZW1vdmVBbGxSYW5nZXMoKTtcbiAgdmFyIHJhbmdlID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKTtcbiAgcmFuZ2Uuc2V0U3RhcnQoc3RhcnQubm9kZSwgc3RhcnQuaW5kZXgpO1xuICByYW5nZS5zZXRFbmQoZW5kLm5vZGUsIGVuZC5pbmRleCk7XG4gIHNlbC5hZGRSYW5nZShyYW5nZSk7XG5cbiAgcmV0dXJuIHNlbDtcbn07XG5cbi8qKlxuICogVXNlIHRoZSBjb21wdXRlZCBDU1Mgc3R5bGUgdG8gZmlndXJlIG91dCBpZiB0aGlzIERPTSBub2RlIGlzIGN1cnJlbnRseVxuICogdmlzaWJsZS5cbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZSBBIEhUTUwgRE9NIG5vZGUuXG4gKiBAcmV0dXJuIHtib29sZWFufSBXaGV0aGVyIG9yIG5vdCB0aGUgaHRtbCBub2RlIGlzIHZpc2libGUuXG4gKi9cblRyYXZlcnNlVXRpbC5pc1Zpc2libGUgPSBmdW5jdGlvbihub2RlKSB7XG4gIGlmICghbm9kZS5zdHlsZSlcbiAgICByZXR1cm4gdHJ1ZTtcbiAgdmFyIHN0eWxlID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUoLyoqIEB0eXBlIHtFbGVtZW50fSAqLyhub2RlKSwgbnVsbCk7XG4gIHJldHVybiAoISFzdHlsZSAmJiBzdHlsZS5kaXNwbGF5ICE9ICdub25lJyAmJiBzdHlsZS52aXNpYmlsaXR5ICE9ICdoaWRkZW4nKTtcbn07XG5cbi8qKlxuICogVXNlIHRoZSBjbGFzcyBuYW1lIHRvIGZpZ3VyZSBvdXQgaWYgdGhpcyBET00gbm9kZSBzaG91bGQgYmUgdHJhdmVyc2VkLlxuICogQHBhcmFtIHtOb2RlfSBub2RlIEEgSFRNTCBET00gbm9kZS5cbiAqIEByZXR1cm4ge2Jvb2xlYW59IFdoZXRoZXIgb3Igbm90IHRoZSBodG1sIG5vZGUgc2hvdWxkIGJlIHRyYXZlcnNlZC5cbiAqL1xuVHJhdmVyc2VVdGlsLmlzU2tpcHBlZCA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgaWYgKG5vZGUuY29uc3RydWN0b3IgPT0gVGV4dClcbiAgICBub2RlID0gbm9kZS5wYXJlbnRFbGVtZW50O1xuICBpZiAobm9kZS5jbGFzc05hbWUgPT0gJ0NhcmV0QnJvd3NpbmdfQ2FyZXQnIHx8XG4gICAgICBub2RlLmNsYXNzTmFtZSA9PSAnQ2FyZXRCcm93c2luZ19BbmltYXRlQ2FyZXQnKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBNb3ZlcyB0aGUgY3Vyc29yIGZvcndhcmRzIHVudGlsIGl0IGhhcyBjcm9zc2VkIGV4YWN0bHkgb25lIGNoYXJhY3Rlci5cbiAqIEBwYXJhbSB7Q3Vyc29yfSBjdXJzb3IgVGhlIGN1cnNvciBsb2NhdGlvbiB3aGVyZSB0aGUgc2VhcmNoIHNob3VsZCBzdGFydC5cbiAqICAgICBPbiBleGl0LCB0aGUgY3Vyc29yIHdpbGwgYmUgaW1tZWRpYXRlbHkgdG8gdGhlIHJpZ2h0IG9mIHRoZVxuICogICAgIGNoYXJhY3RlciByZXR1cm5lZC5cbiAqIEBwYXJhbSB7QXJyYXk8Tm9kZT59IG5vZGVzQ3Jvc3NlZCBBbnkgSFRNTCBub2RlcyBjcm9zc2VkIGJldHdlZW4gdGhlXG4gKiAgICAgaW5pdGlhbCBhbmQgZmluYWwgY3Vyc29yIHBvc2l0aW9uIHdpbGwgYmUgcHVzaGVkIG9udG8gdGhpcyBhcnJheS5cbiAqIEByZXR1cm4gez9zdHJpbmd9IFRoZSBjaGFyYWN0ZXIgZm91bmQsIG9yIG51bGwgaWYgdGhlIGJvdHRvbSBvZiB0aGVcbiAqICAgICBkb2N1bWVudCBoYXMgYmVlbiByZWFjaGVkLlxuICovXG5UcmF2ZXJzZVV0aWwuZm9yd2FyZHNDaGFyID0gZnVuY3Rpb24oY3Vyc29yLCBub2Rlc0Nyb3NzZWQpIHtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICAvLyBNb3ZlIGRvd24gdW50aWwgd2UgZ2V0IHRvIGEgbGVhZiBub2RlLlxuICAgIHZhciBjaGlsZE5vZGUgPSBudWxsO1xuICAgIGlmICghVHJhdmVyc2VVdGlsLnRyZWF0QXNMZWFmTm9kZShjdXJzb3Iubm9kZSkpIHtcbiAgICAgIGZvciAodmFyIGkgPSBjdXJzb3IuaW5kZXg7IGkgPCBjdXJzb3Iubm9kZS5jaGlsZE5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBub2RlID0gY3Vyc29yLm5vZGUuY2hpbGROb2Rlc1tpXTtcbiAgICAgICAgaWYgKFRyYXZlcnNlVXRpbC5pc1NraXBwZWQobm9kZSkpIHtcbiAgICAgICAgICBub2Rlc0Nyb3NzZWQucHVzaChub2RlKTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoVHJhdmVyc2VVdGlsLmlzVmlzaWJsZShub2RlKSkge1xuICAgICAgICAgIGNoaWxkTm9kZSA9IG5vZGU7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGNoaWxkTm9kZSkge1xuICAgICAgY3Vyc29yLm5vZGUgPSBjaGlsZE5vZGU7XG4gICAgICBjdXJzb3IuaW5kZXggPSAwO1xuICAgICAgY3Vyc29yLnRleHQgPSBUcmF2ZXJzZVV0aWwuZ2V0Tm9kZVRleHQoY3Vyc29yLm5vZGUpO1xuICAgICAgaWYgKGN1cnNvci5ub2RlLmNvbnN0cnVjdG9yICE9IFRleHQpIHtcbiAgICAgICAgbm9kZXNDcm9zc2VkLnB1c2goY3Vyc29yLm5vZGUpO1xuICAgICAgfVxuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gUmV0dXJuIHRoZSBuZXh0IGNoYXJhY3RlciBmcm9tIHRoaXMgbGVhZiBub2RlLlxuICAgIGlmIChjdXJzb3IuaW5kZXggPCBjdXJzb3IudGV4dC5sZW5ndGgpXG4gICAgICByZXR1cm4gY3Vyc29yLnRleHRbY3Vyc29yLmluZGV4KytdO1xuXG4gICAgLy8gTW92ZSB0byB0aGUgbmV4dCBzaWJsaW5nLCBnb2luZyB1cCB0aGUgdHJlZSBhcyBuZWNlc3NhcnkuXG4gICAgd2hpbGUgKGN1cnNvci5ub2RlICE9IG51bGwpIHtcbiAgICAgIC8vIFRyeSB0byBtb3ZlIHRvIHRoZSBuZXh0IHNpYmxpbmcuXG4gICAgICB2YXIgc2libGluZ05vZGUgPSBudWxsO1xuICAgICAgZm9yICh2YXIgbm9kZSA9IGN1cnNvci5ub2RlLm5leHRTaWJsaW5nO1xuICAgICAgICAgICBub2RlICE9IG51bGw7XG4gICAgICAgICAgIG5vZGUgPSBub2RlLm5leHRTaWJsaW5nKSB7XG4gICAgICAgIGlmIChUcmF2ZXJzZVV0aWwuaXNTa2lwcGVkKG5vZGUpKSB7XG4gICAgICAgICAgbm9kZXNDcm9zc2VkLnB1c2gobm9kZSk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFRyYXZlcnNlVXRpbC5pc1Zpc2libGUobm9kZSkpIHtcbiAgICAgICAgICBzaWJsaW5nTm9kZSA9IG5vZGU7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChzaWJsaW5nTm9kZSkge1xuICAgICAgICBjdXJzb3Iubm9kZSA9IHNpYmxpbmdOb2RlO1xuICAgICAgICBjdXJzb3IudGV4dCA9IFRyYXZlcnNlVXRpbC5nZXROb2RlVGV4dChzaWJsaW5nTm9kZSk7XG4gICAgICAgIGN1cnNvci5pbmRleCA9IDA7XG5cbiAgICAgICAgaWYgKGN1cnNvci5ub2RlLmNvbnN0cnVjdG9yICE9IFRleHQpIHtcbiAgICAgICAgICBub2Rlc0Nyb3NzZWQucHVzaChjdXJzb3Iubm9kZSk7XG4gICAgICAgIH1cblxuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgLy8gT3RoZXJ3aXNlLCBtb3ZlIHRvIHRoZSBwYXJlbnQuXG4gICAgICBpZiAoY3Vyc29yLm5vZGUucGFyZW50Tm9kZSAmJlxuICAgICAgICAgIGN1cnNvci5ub2RlLnBhcmVudE5vZGUuY29uc3RydWN0b3IgIT0gSFRNTEJvZHlFbGVtZW50KSB7XG4gICAgICAgIGN1cnNvci5ub2RlID0gY3Vyc29yLm5vZGUucGFyZW50Tm9kZTtcbiAgICAgICAgY3Vyc29yLnRleHQgPSBudWxsO1xuICAgICAgICBjdXJzb3IuaW5kZXggPSAwO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIE1vdmVzIHRoZSBjdXJzb3IgYmFja3dhcmRzIHVudGlsIGl0IGhhcyBjcm9zc2VkIGV4YWN0bHkgb25lIGNoYXJhY3Rlci5cbiAqIEBwYXJhbSB7Q3Vyc29yfSBjdXJzb3IgVGhlIGN1cnNvciBsb2NhdGlvbiB3aGVyZSB0aGUgc2VhcmNoIHNob3VsZCBzdGFydC5cbiAqICAgICBPbiBleGl0LCB0aGUgY3Vyc29yIHdpbGwgYmUgaW1tZWRpYXRlbHkgdG8gdGhlIGxlZnQgb2YgdGhlXG4gKiAgICAgY2hhcmFjdGVyIHJldHVybmVkLlxuICogQHBhcmFtIHtBcnJheTxOb2RlPn0gbm9kZXNDcm9zc2VkIEFueSBIVE1MIG5vZGVzIGNyb3NzZWQgYmV0d2VlbiB0aGVcbiAqICAgICBpbml0aWFsIGFuZCBmaW5hbCBjdXJzb3IgcG9zaXRpb24gd2lsbCBiZSBwdXNoZWQgb250byB0aGlzIGFycmF5LlxuICogQHJldHVybiB7P3N0cmluZ30gVGhlIHByZXZpb3VzIGNoYXJhY3Rlciwgb3IgbnVsbCBpZiB0aGUgdG9wIG9mIHRoZVxuICogICAgIGRvY3VtZW50IGhhcyBiZWVuIHJlYWNoZWQuXG4gKi9cblRyYXZlcnNlVXRpbC5iYWNrd2FyZHNDaGFyID0gZnVuY3Rpb24oY3Vyc29yLCBub2Rlc0Nyb3NzZWQpIHtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICAvLyBNb3ZlIGRvd24gdW50aWwgd2UgZ2V0IHRvIGEgbGVhZiBub2RlLlxuICAgIHZhciBjaGlsZE5vZGUgPSBudWxsO1xuICAgIGlmICghVHJhdmVyc2VVdGlsLnRyZWF0QXNMZWFmTm9kZShjdXJzb3Iubm9kZSkpIHtcbiAgICAgIGZvciAodmFyIGkgPSBjdXJzb3IuaW5kZXggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICB2YXIgbm9kZSA9IGN1cnNvci5ub2RlLmNoaWxkTm9kZXNbaV07XG4gICAgICAgIGlmIChUcmF2ZXJzZVV0aWwuaXNTa2lwcGVkKG5vZGUpKSB7XG4gICAgICAgICAgbm9kZXNDcm9zc2VkLnB1c2gobm9kZSk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFRyYXZlcnNlVXRpbC5pc1Zpc2libGUobm9kZSkpIHtcbiAgICAgICAgICBjaGlsZE5vZGUgPSBub2RlO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChjaGlsZE5vZGUpIHtcbiAgICAgIGN1cnNvci5ub2RlID0gY2hpbGROb2RlO1xuICAgICAgY3Vyc29yLnRleHQgPSBUcmF2ZXJzZVV0aWwuZ2V0Tm9kZVRleHQoY3Vyc29yLm5vZGUpO1xuICAgICAgaWYgKGN1cnNvci50ZXh0Lmxlbmd0aClcbiAgICAgICAgY3Vyc29yLmluZGV4ID0gY3Vyc29yLnRleHQubGVuZ3RoO1xuICAgICAgZWxzZVxuICAgICAgICBjdXJzb3IuaW5kZXggPSBjdXJzb3Iubm9kZS5jaGlsZE5vZGVzLmxlbmd0aDtcbiAgICAgIGlmIChjdXJzb3Iubm9kZS5jb25zdHJ1Y3RvciAhPSBUZXh0KVxuICAgICAgICBub2Rlc0Nyb3NzZWQucHVzaChjdXJzb3Iubm9kZSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdGhlIHByZXZpb3VzIGNoYXJhY3RlciBmcm9tIHRoaXMgbGVhZiBub2RlLlxuICAgIGlmIChjdXJzb3IudGV4dC5sZW5ndGggPiAwICYmIGN1cnNvci5pbmRleCA+IDApIHtcbiAgICAgIHJldHVybiBjdXJzb3IudGV4dFstLWN1cnNvci5pbmRleF07XG4gICAgfVxuXG4gICAgLy8gTW92ZSB0byB0aGUgcHJldmlvdXMgc2libGluZywgZ29pbmcgdXAgdGhlIHRyZWUgYXMgbmVjZXNzYXJ5LlxuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAvLyBUcnkgdG8gbW92ZSB0byB0aGUgcHJldmlvdXMgc2libGluZy5cbiAgICAgIHZhciBzaWJsaW5nTm9kZSA9IG51bGw7XG4gICAgICBmb3IgKHZhciBub2RlID0gY3Vyc29yLm5vZGUucHJldmlvdXNTaWJsaW5nO1xuICAgICAgICAgICBub2RlICE9IG51bGw7XG4gICAgICAgICAgIG5vZGUgPSBub2RlLnByZXZpb3VzU2libGluZykge1xuICAgICAgICBpZiAoVHJhdmVyc2VVdGlsLmlzU2tpcHBlZChub2RlKSkge1xuICAgICAgICAgIG5vZGVzQ3Jvc3NlZC5wdXNoKG5vZGUpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChUcmF2ZXJzZVV0aWwuaXNWaXNpYmxlKG5vZGUpKSB7XG4gICAgICAgICAgc2libGluZ05vZGUgPSBub2RlO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoc2libGluZ05vZGUpIHtcbiAgICAgICAgY3Vyc29yLm5vZGUgPSBzaWJsaW5nTm9kZTtcbiAgICAgICAgY3Vyc29yLnRleHQgPSBUcmF2ZXJzZVV0aWwuZ2V0Tm9kZVRleHQoc2libGluZ05vZGUpO1xuICAgICAgICBpZiAoY3Vyc29yLnRleHQubGVuZ3RoKVxuICAgICAgICAgIGN1cnNvci5pbmRleCA9IGN1cnNvci50ZXh0Lmxlbmd0aDtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGN1cnNvci5pbmRleCA9IGN1cnNvci5ub2RlLmNoaWxkTm9kZXMubGVuZ3RoO1xuICAgICAgICBpZiAoY3Vyc29yLm5vZGUuY29uc3RydWN0b3IgIT0gVGV4dClcbiAgICAgICAgICBub2Rlc0Nyb3NzZWQucHVzaChjdXJzb3Iubm9kZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICAvLyBPdGhlcndpc2UsIG1vdmUgdG8gdGhlIHBhcmVudC5cbiAgICAgIGlmIChjdXJzb3Iubm9kZS5wYXJlbnROb2RlICYmXG4gICAgICAgICAgY3Vyc29yLm5vZGUucGFyZW50Tm9kZS5jb25zdHJ1Y3RvciAhPSBIVE1MQm9keUVsZW1lbnQpIHtcbiAgICAgICAgY3Vyc29yLm5vZGUgPSBjdXJzb3Iubm9kZS5wYXJlbnROb2RlO1xuICAgICAgICBjdXJzb3IudGV4dCA9IG51bGw7XG4gICAgICAgIGN1cnNvci5pbmRleCA9IDA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogRmluZHMgdGhlIG5leHQgY2hhcmFjdGVyLCBzdGFydGluZyBmcm9tIGVuZEN1cnNvci4gIFVwb24gZXhpdCwgc3RhcnRDdXJzb3JcbiAqIGFuZCBlbmRDdXJzb3Igd2lsbCBzdXJyb3VuZCB0aGUgbmV4dCBjaGFyYWN0ZXIuIElmIHNraXBXaGl0ZXNwYWNlIGlzXG4gKiB0cnVlLCB3aWxsIHNraXAgdW50aWwgYSByZWFsIGNoYXJhY3RlciBpcyBmb3VuZC4gT3RoZXJ3aXNlLCBpdCB3aWxsXG4gKiBhdHRlbXB0IHRvIHNlbGVjdCBhbGwgb2YgdGhlIHdoaXRlc3BhY2UgYmV0d2VlbiB0aGUgaW5pdGlhbCBwb3NpdGlvblxuICogb2YgZW5kQ3Vyc29yIGFuZCB0aGUgbmV4dCBub24td2hpdGVzcGFjZSBjaGFyYWN0ZXIuXG4gKiBAcGFyYW0ge0N1cnNvcn0gc3RhcnRDdXJzb3IgT24gZXhpdCwgcG9pbnRzIHRvIHRoZSBwb3NpdGlvbiBiZWZvcmVcbiAqICAgICB0aGUgY2hhci5cbiAqIEBwYXJhbSB7Q3Vyc29yfSBlbmRDdXJzb3IgVGhlIHBvc2l0aW9uIHRvIHN0YXJ0IHNlYXJjaGluZyBmb3IgdGhlIG5leHRcbiAqICAgICBjaGFyLiAgT24gZXhpdCwgd2lsbCBwb2ludCB0byB0aGUgcG9zaXRpb24gcGFzdCB0aGUgY2hhci5cbiAqIEBwYXJhbSB7QXJyYXk8Tm9kZT59IG5vZGVzQ3Jvc3NlZCBBbnkgSFRNTCBub2RlcyBjcm9zc2VkIGJldHdlZW4gdGhlXG4gKiAgICAgaW5pdGlhbCBhbmQgZmluYWwgY3Vyc29yIHBvc2l0aW9uIHdpbGwgYmUgcHVzaGVkIG9udG8gdGhpcyBhcnJheS5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gc2tpcFdoaXRlc3BhY2UgSWYgdHJ1ZSwgd2lsbCBrZWVwIHNjYW5uaW5nIHVudGlsIGFcbiAqICAgICBub24td2hpdGVzcGFjZSBjaGFyYWN0ZXIgaXMgZm91bmQuXG4gKiBAcmV0dXJuIHs/c3RyaW5nfSBUaGUgbmV4dCBjaGFyLCBvciBudWxsIGlmIHRoZSBib3R0b20gb2YgdGhlXG4gKiAgICAgZG9jdW1lbnQgaGFzIGJlZW4gcmVhY2hlZC5cbiAqL1xuVHJhdmVyc2VVdGlsLmdldE5leHRDaGFyID0gZnVuY3Rpb24oXG4gICAgc3RhcnRDdXJzb3IsIGVuZEN1cnNvciwgbm9kZXNDcm9zc2VkLCBza2lwV2hpdGVzcGFjZSkge1xuXG4gIC8vIFNhdmUgdGhlIHN0YXJ0aW5nIHBvc2l0aW9uIGFuZCBnZXQgdGhlIGZpcnN0IGNoYXJhY3Rlci5cbiAgc3RhcnRDdXJzb3IuY29weUZyb20oZW5kQ3Vyc29yKTtcbiAgdmFyIGMgPSBUcmF2ZXJzZVV0aWwuZm9yd2FyZHNDaGFyKGVuZEN1cnNvciwgbm9kZXNDcm9zc2VkKTtcbiAgaWYgKGMgPT0gbnVsbClcbiAgICByZXR1cm4gbnVsbDtcblxuICAvLyBLZWVwIHRyYWNrIG9mIHdoZXRoZXIgdGhlIGZpcnN0IGNoYXJhY3RlciB3YXMgd2hpdGVzcGFjZS5cbiAgdmFyIGluaXRpYWxXaGl0ZXNwYWNlID0gVHJhdmVyc2VVdGlsLmlzV2hpdGVzcGFjZShjKTtcblxuICAvLyBLZWVwIHNjYW5uaW5nIHVudGlsIHdlIGZpbmQgYSBub24td2hpdGVzcGFjZSBvciBub24tc2tpcHBlZCBjaGFyYWN0ZXIuXG4gIHdoaWxlICgoVHJhdmVyc2VVdGlsLmlzV2hpdGVzcGFjZShjKSkgfHxcbiAgICAgIChUcmF2ZXJzZVV0aWwuaXNTa2lwcGVkKGVuZEN1cnNvci5ub2RlKSkpIHtcbiAgICBjID0gVHJhdmVyc2VVdGlsLmZvcndhcmRzQ2hhcihlbmRDdXJzb3IsIG5vZGVzQ3Jvc3NlZCk7XG4gICAgaWYgKGMgPT0gbnVsbClcbiAgICAgIHJldHVybiBudWxsO1xuICB9XG4gIGlmIChza2lwV2hpdGVzcGFjZSB8fCAhaW5pdGlhbFdoaXRlc3BhY2UpIHtcbiAgICAvLyBJZiBza2lwV2hpdGVwYWNlIGlzIHRydWUsIG9yIGlmIHRoZSBmaXJzdCBjaGFyYWN0ZXIgd2UgZW5jb3VudGVyZWRcbiAgICAvLyB3YXMgbm90IHdoaXRlc3BhY2UsIHJldHVybiB0aGF0IG5vbi13aGl0ZXNwYWNlIGNoYXJhY3Rlci5cbiAgICBzdGFydEN1cnNvci5jb3B5RnJvbShlbmRDdXJzb3IpO1xuICAgIHN0YXJ0Q3Vyc29yLmluZGV4LS07XG4gICAgcmV0dXJuIGM7XG4gIH1cbiAgZWxzZSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlc0Nyb3NzZWQubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChUcmF2ZXJzZVV0aWwuaXNTa2lwcGVkKG5vZGVzQ3Jvc3NlZFtpXSkpIHtcbiAgICAgICAgLy8gV2UgbmVlZCB0byBtYWtlIHN1cmUgdGhhdCBzdGFydEN1cnNvciBhbmQgZW5kQ3Vyc29yIGFyZW4ndFxuICAgICAgICAvLyBzdXJyb3VuZGluZyBhIHNraXBwYWJsZSBub2RlLlxuICAgICAgICBlbmRDdXJzb3IuaW5kZXgtLTtcbiAgICAgICAgc3RhcnRDdXJzb3IuY29weUZyb20oZW5kQ3Vyc29yKTtcbiAgICAgICAgc3RhcnRDdXJzb3IuaW5kZXgtLTtcbiAgICAgICAgcmV0dXJuICcgJztcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gT3RoZXJ3aXNlLCByZXR1cm4gYWxsIG9mIHRoZSB3aGl0ZXNwYWNlIGJlZm9yZSB0aGF0IGxhc3QgY2hhcmFjdGVyLlxuICAgIGVuZEN1cnNvci5pbmRleC0tO1xuICAgIHJldHVybiAnICc7XG4gIH1cbn07XG5cbi8qKlxuICogRmluZHMgdGhlIHByZXZpb3VzIGNoYXJhY3Rlciwgc3RhcnRpbmcgZnJvbSBzdGFydEN1cnNvci4gIFVwb24gZXhpdCxcbiAqIHN0YXJ0Q3Vyc29yIGFuZCBlbmRDdXJzb3Igd2lsbCBzdXJyb3VuZCB0aGUgcHJldmlvdXMgY2hhcmFjdGVyLlxuICogSWYgc2tpcFdoaXRlc3BhY2UgaXMgdHJ1ZSwgd2lsbCBza2lwIHVudGlsIGEgcmVhbCBjaGFyYWN0ZXIgaXMgZm91bmQuXG4gKiBPdGhlcndpc2UsIGl0IHdpbGwgYXR0ZW1wdCB0byBzZWxlY3QgYWxsIG9mIHRoZSB3aGl0ZXNwYWNlIGJldHdlZW5cbiAqIHRoZSBpbml0aWFsIHBvc2l0aW9uIG9mIGVuZEN1cnNvciBhbmQgdGhlIG5leHQgbm9uLXdoaXRlc3BhY2UgY2hhcmFjdGVyLlxuICogQHBhcmFtIHtDdXJzb3J9IHN0YXJ0Q3Vyc29yIFRoZSBwb3NpdGlvbiB0byBzdGFydCBzZWFyY2hpbmcgZm9yIHRoZVxuICogICAgIGNoYXIuIE9uIGV4aXQsIHdpbGwgcG9pbnQgdG8gdGhlIHBvc2l0aW9uIGJlZm9yZSB0aGUgY2hhci5cbiAqIEBwYXJhbSB7Q3Vyc29yfSBlbmRDdXJzb3IgVGhlIHBvc2l0aW9uIHRvIHN0YXJ0IHNlYXJjaGluZyBmb3IgdGhlIG5leHRcbiAqICAgICBjaGFyLiBPbiBleGl0LCB3aWxsIHBvaW50IHRvIHRoZSBwb3NpdGlvbiBwYXN0IHRoZSBjaGFyLlxuICogQHBhcmFtIHtBcnJheTxOb2RlPn0gbm9kZXNDcm9zc2VkIEFueSBIVE1MIG5vZGVzIGNyb3NzZWQgYmV0d2VlbiB0aGVcbiAqICAgICBpbml0aWFsIGFuZCBmaW5hbCBjdXJzb3IgcG9zaXRpb24gd2lsbCBiZSBwdXNoZWQgb250byB0aGlzIGFycmF5LlxuICogQHBhcmFtIHtib29sZWFufSBza2lwV2hpdGVzcGFjZSBJZiB0cnVlLCB3aWxsIGtlZXAgc2Nhbm5pbmcgdW50aWwgYVxuICogICAgIG5vbi13aGl0ZXNwYWNlIGNoYXJhY3RlciBpcyBmb3VuZC5cbiAqIEByZXR1cm4gez9zdHJpbmd9IFRoZSBwcmV2aW91cyBjaGFyLCBvciBudWxsIGlmIHRoZSB0b3Agb2YgdGhlXG4gKiAgICAgZG9jdW1lbnQgaGFzIGJlZW4gcmVhY2hlZC5cbiAqL1xuVHJhdmVyc2VVdGlsLmdldFByZXZpb3VzQ2hhciA9IGZ1bmN0aW9uKFxuICAgIHN0YXJ0Q3Vyc29yLCBlbmRDdXJzb3IsIG5vZGVzQ3Jvc3NlZCwgc2tpcFdoaXRlc3BhY2UpIHtcblxuICAvLyBTYXZlIHRoZSBzdGFydGluZyBwb3NpdGlvbiBhbmQgZ2V0IHRoZSBmaXJzdCBjaGFyYWN0ZXIuXG4gIGVuZEN1cnNvci5jb3B5RnJvbShzdGFydEN1cnNvcik7XG4gIHZhciBjID0gVHJhdmVyc2VVdGlsLmJhY2t3YXJkc0NoYXIoc3RhcnRDdXJzb3IsIG5vZGVzQ3Jvc3NlZCk7XG4gIGlmIChjID09IG51bGwpXG4gICAgcmV0dXJuIG51bGw7XG5cbiAgLy8gS2VlcCB0cmFjayBvZiB3aGV0aGVyIHRoZSBmaXJzdCBjaGFyYWN0ZXIgd2FzIHdoaXRlc3BhY2UuXG4gIHZhciBpbml0aWFsV2hpdGVzcGFjZSA9IFRyYXZlcnNlVXRpbC5pc1doaXRlc3BhY2UoYyk7XG5cbiAgLy8gS2VlcCBzY2FubmluZyB1bnRpbCB3ZSBmaW5kIGEgbm9uLXdoaXRlc3BhY2Ugb3Igbm9uLXNraXBwZWQgY2hhcmFjdGVyLlxuICB3aGlsZSAoKFRyYXZlcnNlVXRpbC5pc1doaXRlc3BhY2UoYykpIHx8XG4gICAgICAoVHJhdmVyc2VVdGlsLmlzU2tpcHBlZChzdGFydEN1cnNvci5ub2RlKSkpIHtcbiAgICBjID0gVHJhdmVyc2VVdGlsLmJhY2t3YXJkc0NoYXIoc3RhcnRDdXJzb3IsIG5vZGVzQ3Jvc3NlZCk7XG4gICAgaWYgKGMgPT0gbnVsbClcbiAgICAgIHJldHVybiBudWxsO1xuICB9XG4gIGlmIChza2lwV2hpdGVzcGFjZSB8fCAhaW5pdGlhbFdoaXRlc3BhY2UpIHtcbiAgICAvLyBJZiBza2lwV2hpdGVwYWNlIGlzIHRydWUsIG9yIGlmIHRoZSBmaXJzdCBjaGFyYWN0ZXIgd2UgZW5jb3VudGVyZWRcbiAgICAvLyB3YXMgbm90IHdoaXRlc3BhY2UsIHJldHVybiB0aGF0IG5vbi13aGl0ZXNwYWNlIGNoYXJhY3Rlci5cbiAgICBlbmRDdXJzb3IuY29weUZyb20oc3RhcnRDdXJzb3IpO1xuICAgIGVuZEN1cnNvci5pbmRleCsrO1xuICAgIHJldHVybiBjO1xuICB9IGVsc2Uge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXNDcm9zc2VkLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoVHJhdmVyc2VVdGlsLmlzU2tpcHBlZChub2Rlc0Nyb3NzZWRbaV0pKSB7XG4gICAgICAgIHN0YXJ0Q3Vyc29yLmluZGV4Kys7XG4gICAgICAgIGVuZEN1cnNvci5jb3B5RnJvbShzdGFydEN1cnNvcik7XG4gICAgICAgIGVuZEN1cnNvci5pbmRleCsrO1xuICAgICAgICByZXR1cm4gJyAnO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBPdGhlcndpc2UsIHJldHVybiBhbGwgb2YgdGhlIHdoaXRlc3BhY2UgYmVmb3JlIHRoYXQgbGFzdCBjaGFyYWN0ZXIuXG4gICAgc3RhcnRDdXJzb3IuaW5kZXgrKztcbiAgICByZXR1cm4gJyAnO1xuICB9XG59O1xuXG4vKipcbiAqIEZpbmRzIHRoZSBuZXh0IHdvcmQsIHN0YXJ0aW5nIGZyb20gZW5kQ3Vyc29yLiAgVXBvbiBleGl0LCBzdGFydEN1cnNvclxuICogYW5kIGVuZEN1cnNvciB3aWxsIHN1cnJvdW5kIHRoZSBuZXh0IHdvcmQuICBBIHdvcmQgaXMgZGVmaW5lZCB0byBiZVxuICogYSBzdHJpbmcgb2YgMSBvciBtb3JlIG5vbi13aGl0ZXNwYWNlIGNoYXJhY3RlcnMgaW4gdGhlIHNhbWUgRE9NIG5vZGUuXG4gKiBAcGFyYW0ge0N1cnNvcn0gc3RhcnRDdXJzb3IgT24gZXhpdCwgd2lsbCBwb2ludCB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZVxuICogICAgIHdvcmQgcmV0dXJuZWQuXG4gKiBAcGFyYW0ge0N1cnNvcn0gZW5kQ3Vyc29yIFRoZSBwb3NpdGlvbiB0byBzdGFydCBzZWFyY2hpbmcgZm9yIHRoZSBuZXh0XG4gKiAgICAgd29yZC4gIE9uIGV4aXQsIHdpbGwgcG9pbnQgdG8gdGhlIGVuZCBvZiB0aGUgd29yZCByZXR1cm5lZC5cbiAqIEBwYXJhbSB7QXJyYXk8Tm9kZT59IG5vZGVzQ3Jvc3NlZCBBbnkgSFRNTCBub2RlcyBjcm9zc2VkIGJldHdlZW4gdGhlXG4gKiAgICAgaW5pdGlhbCBhbmQgZmluYWwgY3Vyc29yIHBvc2l0aW9uIHdpbGwgYmUgcHVzaGVkIG9udG8gdGhpcyBhcnJheS5cbiAqIEByZXR1cm4gez9zdHJpbmd9IFRoZSBuZXh0IHdvcmQsIG9yIG51bGwgaWYgdGhlIGJvdHRvbSBvZiB0aGVcbiAqICAgICBkb2N1bWVudCBoYXMgYmVlbiByZWFjaGVkLlxuICovXG5UcmF2ZXJzZVV0aWwuZ2V0TmV4dFdvcmQgPSBmdW5jdGlvbihzdGFydEN1cnNvciwgZW5kQ3Vyc29yLFxuICAgIG5vZGVzQ3Jvc3NlZCkge1xuXG4gIC8vIEZpbmQgdGhlIGZpcnN0IG5vbi13aGl0ZXNwYWNlIG9yIG5vbi1za2lwcGVkIGNoYXJhY3Rlci5cbiAgdmFyIGN1cnNvciA9IGVuZEN1cnNvci5jbG9uZSgpO1xuICB2YXIgYyA9IFRyYXZlcnNlVXRpbC5mb3J3YXJkc0NoYXIoY3Vyc29yLCBub2Rlc0Nyb3NzZWQpO1xuICBpZiAoYyA9PSBudWxsKVxuICAgIHJldHVybiBudWxsO1xuICB3aGlsZSAoKFRyYXZlcnNlVXRpbC5pc1doaXRlc3BhY2UoYykpIHx8XG4gICAgICAoVHJhdmVyc2VVdGlsLmlzU2tpcHBlZChjdXJzb3Iubm9kZSkpKSB7XG4gICAgYyA9IFRyYXZlcnNlVXRpbC5mb3J3YXJkc0NoYXIoY3Vyc29yLCBub2Rlc0Nyb3NzZWQpO1xuICAgIGlmIChjID09IG51bGwpXG4gICAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIFNldCBzdGFydEN1cnNvciB0byB0aGUgcG9zaXRpb24gaW1tZWRpYXRlbHkgYmVmb3JlIHRoZSBmaXJzdFxuICAvLyBjaGFyYWN0ZXIgaW4gb3VyIHdvcmQuIEl0J3Mgc2FmZSB0byBkZWNyZW1lbnQgfGluZGV4fCBiZWNhdXNlXG4gIC8vIGZvcndhcmRzQ2hhciBndWFyYW50ZWVzIHRoYXQgdGhlIGN1cnNvciB3aWxsIGJlIGltbWVkaWF0ZWx5IHRvIHRoZVxuICAvLyByaWdodCBvZiB0aGUgcmV0dXJuZWQgY2hhcmFjdGVyIG9uIGV4aXQuXG4gIHN0YXJ0Q3Vyc29yLmNvcHlGcm9tKGN1cnNvcik7XG4gIHN0YXJ0Q3Vyc29yLmluZGV4LS07XG5cbiAgLy8gS2VlcCBidWlsZGluZyB1cCBvdXIgd29yZCB1bnRpbCB3ZSByZWFjaCBhIHdoaXRlc3BhY2UgY2hhcmFjdGVyIG9yXG4gIC8vIHdvdWxkIGNyb3NzIGEgdGFnLiAgRG9uJ3QgYWN0dWFsbHkgcmV0dXJuIGFueSB0YWdzIGNyb3NzZWQsIGJlY2F1c2UgdGhpc1xuICAvLyB3b3JkIGdvZXMgdXAgdW50aWwgdGhlIHRhZyBib3VuZGFyeSBidXQgbm90IHBhc3QgaXQuXG4gIGVuZEN1cnNvci5jb3B5RnJvbShjdXJzb3IpO1xuICB2YXIgd29yZCA9IGM7XG4gIHZhciBuZXdOb2Rlc0Nyb3NzZWQgPSBbXTtcbiAgYyA9IFRyYXZlcnNlVXRpbC5mb3J3YXJkc0NoYXIoY3Vyc29yLCBuZXdOb2Rlc0Nyb3NzZWQpO1xuICBpZiAoYyA9PSBudWxsKSB7XG4gICAgcmV0dXJuIHdvcmQ7XG4gIH1cbiAgd2hpbGUgKCFUcmF2ZXJzZVV0aWwuaXNXaGl0ZXNwYWNlKGMpICYmXG4gICAgIG5ld05vZGVzQ3Jvc3NlZC5sZW5ndGggPT0gMCkge1xuICAgIHdvcmQgKz0gYztcbiAgICBlbmRDdXJzb3IuY29weUZyb20oY3Vyc29yKTtcbiAgICBjID0gVHJhdmVyc2VVdGlsLmZvcndhcmRzQ2hhcihjdXJzb3IsIG5ld05vZGVzQ3Jvc3NlZCk7XG4gICAgaWYgKGMgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHdvcmQ7XG4gICAgfVxuICB9XG4gIHJldHVybiB3b3JkO1xufTtcblxuLyoqXG4gKiBGaW5kcyB0aGUgcHJldmlvdXMgd29yZCwgc3RhcnRpbmcgZnJvbSBzdGFydEN1cnNvci4gIFVwb24gZXhpdCwgc3RhcnRDdXJzb3JcbiAqIGFuZCBlbmRDdXJzb3Igd2lsbCBzdXJyb3VuZCB0aGUgcHJldmlvdXMgd29yZC4gIEEgd29yZCBpcyBkZWZpbmVkIHRvIGJlXG4gKiBhIHN0cmluZyBvZiAxIG9yIG1vcmUgbm9uLXdoaXRlc3BhY2UgY2hhcmFjdGVycyBpbiB0aGUgc2FtZSBET00gbm9kZS5cbiAqIEBwYXJhbSB7Q3Vyc29yfSBzdGFydEN1cnNvciBUaGUgcG9zaXRpb24gdG8gc3RhcnQgc2VhcmNoaW5nIGZvciB0aGVcbiAqICAgICBwcmV2aW91cyB3b3JkLiAgT24gZXhpdCwgd2lsbCBwb2ludCB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZVxuICogICAgIHdvcmQgcmV0dXJuZWQuXG4gKiBAcGFyYW0ge0N1cnNvcn0gZW5kQ3Vyc29yIE9uIGV4aXQsIHdpbGwgcG9pbnQgdG8gdGhlIGVuZCBvZiB0aGVcbiAqICAgICB3b3JkIHJldHVybmVkLlxuICogQHBhcmFtIHtBcnJheTxOb2RlPn0gbm9kZXNDcm9zc2VkIEFueSBIVE1MIG5vZGVzIGNyb3NzZWQgYmV0d2VlbiB0aGVcbiAqICAgICBpbml0aWFsIGFuZCBmaW5hbCBjdXJzb3IgcG9zaXRpb24gd2lsbCBiZSBwdXNoZWQgb250byB0aGlzIGFycmF5LlxuICogQHJldHVybiB7P3N0cmluZ30gVGhlIHByZXZpb3VzIHdvcmQsIG9yIG51bGwgaWYgdGhlIGJvdHRvbSBvZiB0aGVcbiAqICAgICBkb2N1bWVudCBoYXMgYmVlbiByZWFjaGVkLlxuICovXG5UcmF2ZXJzZVV0aWwuZ2V0UHJldmlvdXNXb3JkID0gZnVuY3Rpb24oc3RhcnRDdXJzb3IsIGVuZEN1cnNvcixcbiAgICBub2Rlc0Nyb3NzZWQpIHtcbiAgLy8gRmluZCB0aGUgZmlyc3Qgbm9uLXdoaXRlc3BhY2Ugb3Igbm9uLXNraXBwZWQgY2hhcmFjdGVyLlxuICB2YXIgY3Vyc29yID0gc3RhcnRDdXJzb3IuY2xvbmUoKTtcbiAgdmFyIGMgPSBUcmF2ZXJzZVV0aWwuYmFja3dhcmRzQ2hhcihjdXJzb3IsIG5vZGVzQ3Jvc3NlZCk7XG4gIGlmIChjID09IG51bGwpXG4gICAgcmV0dXJuIG51bGw7XG4gIHdoaWxlICgoVHJhdmVyc2VVdGlsLmlzV2hpdGVzcGFjZShjKSB8fFxuICAgICAgKFRyYXZlcnNlVXRpbC5pc1NraXBwZWQoY3Vyc29yLm5vZGUpKSkpIHtcbiAgICBjID0gVHJhdmVyc2VVdGlsLmJhY2t3YXJkc0NoYXIoY3Vyc29yLCBub2Rlc0Nyb3NzZWQpO1xuICAgIGlmIChjID09IG51bGwpXG4gICAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIFNldCBlbmRDdXJzb3IgdG8gdGhlIHBvc2l0aW9uIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBmaXJzdFxuICAvLyBjaGFyYWN0ZXIgd2UndmUgZm91bmQgKHRoZSBsYXN0IGNoYXJhY3RlciBvZiB0aGUgd29yZCwgc2luY2Ugd2UncmVcbiAgLy8gc2VhcmNoaW5nIGJhY2t3YXJkcykuXG4gIGVuZEN1cnNvci5jb3B5RnJvbShjdXJzb3IpO1xuICBlbmRDdXJzb3IuaW5kZXgrKztcblxuICAvLyBLZWVwIGJ1aWxkaW5nIHVwIG91ciB3b3JkIHVudGlsIHdlIHJlYWNoIGEgd2hpdGVzcGFjZSBjaGFyYWN0ZXIgb3JcbiAgLy8gd291bGQgY3Jvc3MgYSB0YWcuICBEb24ndCBhY3R1YWxseSByZXR1cm4gYW55IHRhZ3MgY3Jvc3NlZCwgYmVjYXVzZSB0aGlzXG4gIC8vIHdvcmQgZ29lcyB1cCB1bnRpbCB0aGUgdGFnIGJvdW5kYXJ5IGJ1dCBub3QgcGFzdCBpdC5cbiAgc3RhcnRDdXJzb3IuY29weUZyb20oY3Vyc29yKTtcbiAgdmFyIHdvcmQgPSBjO1xuICB2YXIgbmV3Tm9kZXNDcm9zc2VkID0gW107XG4gIGMgPSBUcmF2ZXJzZVV0aWwuYmFja3dhcmRzQ2hhcihjdXJzb3IsIG5ld05vZGVzQ3Jvc3NlZCk7XG4gIGlmIChjID09IG51bGwpXG4gICAgcmV0dXJuIHdvcmQ7XG4gIHdoaWxlICghVHJhdmVyc2VVdGlsLmlzV2hpdGVzcGFjZShjKSAmJlxuICAgICAgbmV3Tm9kZXNDcm9zc2VkLmxlbmd0aCA9PSAwKSB7XG4gICAgd29yZCA9IGMgKyB3b3JkO1xuICAgIHN0YXJ0Q3Vyc29yLmNvcHlGcm9tKGN1cnNvcik7XG4gICAgYyA9IFRyYXZlcnNlVXRpbC5iYWNrd2FyZHNDaGFyKGN1cnNvciwgbmV3Tm9kZXNDcm9zc2VkKTtcbiAgICBpZiAoYyA9PSBudWxsKVxuICAgICAgcmV0dXJuIHdvcmQ7XG4gIH1cblxuICByZXR1cm4gd29yZDtcbn07XG5cbi8qKlxuICogRmluZHMgdGhlIG5leHQgc2VudGVuY2UsIHN0YXJ0aW5nIGZyb20gZW5kQ3Vyc29yLiAgVXBvbiBleGl0LFxuICogc3RhcnRDdXJzb3IgYW5kIGVuZEN1cnNvciB3aWxsIHN1cnJvdW5kIHRoZSBuZXh0IHNlbnRlbmNlLlxuICpcbiAqIEBwYXJhbSB7Q3Vyc29yfSBzdGFydEN1cnNvciBPbiBleGl0LCBtYXJrcyB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzZW50ZW5jZS5cbiAqIEBwYXJhbSB7Q3Vyc29yfSBlbmRDdXJzb3IgVGhlIHBvc2l0aW9uIHRvIHN0YXJ0IHNlYXJjaGluZyBmb3IgdGhlIG5leHRcbiAqICAgICBzZW50ZW5jZS4gIE9uIGV4aXQsIHdpbGwgcG9pbnQgdG8gdGhlIGVuZCBvZiB0aGUgcmV0dXJuZWQgc3RyaW5nLlxuICogQHBhcmFtIHtBcnJheTxOb2RlPn0gbm9kZXNDcm9zc2VkIEFueSBIVE1MIG5vZGVzIGNyb3NzZWQgYmV0d2VlbiB0aGVcbiAqICAgICBpbml0aWFsIGFuZCBmaW5hbCBjdXJzb3IgcG9zaXRpb24gd2lsbCBiZSBwdXNoZWQgb250byB0aGlzIGFycmF5LlxuICogQHBhcmFtIHtPYmplY3R9IGJyZWFrVGFncyBBc3NvY2lhdGl2ZSBhcnJheSBvZiB0YWdzIHRoYXQgc2hvdWxkIGJyZWFrXG4gKiAgICAgdGhlIHNlbnRlbmNlLlxuICogQHJldHVybiB7P3N0cmluZ30gVGhlIG5leHQgc2VudGVuY2UsIG9yIG51bGwgaWYgdGhlIGJvdHRvbSBvZiB0aGVcbiAqICAgICBkb2N1bWVudCBoYXMgYmVlbiByZWFjaGVkLlxuICovXG5UcmF2ZXJzZVV0aWwuZ2V0TmV4dFNlbnRlbmNlID0gZnVuY3Rpb24oXG4gICAgc3RhcnRDdXJzb3IsIGVuZEN1cnNvciwgbm9kZXNDcm9zc2VkLCBicmVha1RhZ3MpIHtcbiAgcmV0dXJuIFRyYXZlcnNlVXRpbC5nZXROZXh0U3RyaW5nKFxuICAgICAgc3RhcnRDdXJzb3IsIGVuZEN1cnNvciwgbm9kZXNDcm9zc2VkLFxuICAgICAgZnVuY3Rpb24oc3RyLCB3b3JkLCBub2Rlcykge1xuICAgICAgICBpZiAoc3RyLnN1YnN0cigtMSkgPT0gJy4nKVxuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKFRyYXZlcnNlVXRpbC5pc1NraXBwZWQobm9kZXNbaV0pKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHN0eWxlID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUobm9kZXNbaV0sIG51bGwpO1xuICAgICAgICAgIGlmIChzdHlsZSAmJiAoc3R5bGUuZGlzcGxheSAhPSAnaW5saW5lJyB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWtUYWdzW25vZGVzW2ldLnRhZ05hbWVdKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0pO1xufTtcblxuLyoqXG4gKiBGaW5kcyB0aGUgcHJldmlvdXMgc2VudGVuY2UsIHN0YXJ0aW5nIGZyb20gc3RhcnRDdXJzb3IuICBVcG9uIGV4aXQsXG4gKiBzdGFydEN1cnNvciBhbmQgZW5kQ3Vyc29yIHdpbGwgc3Vycm91bmQgdGhlIHByZXZpb3VzIHNlbnRlbmNlLlxuICpcbiAqIEBwYXJhbSB7Q3Vyc29yfSBzdGFydEN1cnNvciBUaGUgcG9zaXRpb24gdG8gc3RhcnQgc2VhcmNoaW5nIGZvciB0aGUgbmV4dFxuICogICAgIHNlbnRlbmNlLiAgT24gZXhpdCwgd2lsbCBwb2ludCB0byB0aGUgc3RhcnQgb2YgdGhlIHJldHVybmVkIHN0cmluZy5cbiAqIEBwYXJhbSB7Q3Vyc29yfSBlbmRDdXJzb3IgT24gZXhpdCwgdGhlIGVuZCBvZiB0aGUgcmV0dXJuZWQgc3RyaW5nLlxuICogQHBhcmFtIHtBcnJheTxOb2RlPn0gbm9kZXNDcm9zc2VkIEFueSBIVE1MIG5vZGVzIGNyb3NzZWQgYmV0d2VlbiB0aGVcbiAqICAgICBpbml0aWFsIGFuZCBmaW5hbCBjdXJzb3IgcG9zaXRpb24gd2lsbCBiZSBwdXNoZWQgb250byB0aGlzIGFycmF5LlxuICogQHBhcmFtIHtPYmplY3R9IGJyZWFrVGFncyBBc3NvY2lhdGl2ZSBhcnJheSBvZiB0YWdzIHRoYXQgc2hvdWxkIGJyZWFrXG4gKiAgICAgdGhlIHNlbnRlbmNlLlxuICogQHJldHVybiB7P3N0cmluZ30gVGhlIHByZXZpb3VzIHNlbnRlbmNlLCBvciBudWxsIGlmIHRoZSBib3R0b20gb2YgdGhlXG4gKiAgICAgZG9jdW1lbnQgaGFzIGJlZW4gcmVhY2hlZC5cbiAqL1xuVHJhdmVyc2VVdGlsLmdldFByZXZpb3VzU2VudGVuY2UgPSBmdW5jdGlvbihcbiAgICBzdGFydEN1cnNvciwgZW5kQ3Vyc29yLCBub2Rlc0Nyb3NzZWQsIGJyZWFrVGFncykge1xuICByZXR1cm4gVHJhdmVyc2VVdGlsLmdldFByZXZpb3VzU3RyaW5nKFxuICAgICAgc3RhcnRDdXJzb3IsIGVuZEN1cnNvciwgbm9kZXNDcm9zc2VkLFxuICAgICAgZnVuY3Rpb24oc3RyLCB3b3JkLCBub2Rlcykge1xuICAgICAgICBpZiAod29yZC5zdWJzdHIoLTEpID09ICcuJylcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChUcmF2ZXJzZVV0aWwuaXNTa2lwcGVkKG5vZGVzW2ldKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBzdHlsZSA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKG5vZGVzW2ldLCBudWxsKTtcbiAgICAgICAgICBpZiAoc3R5bGUgJiYgKHN0eWxlLmRpc3BsYXkgIT0gJ2lubGluZScgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrVGFnc1tub2Rlc1tpXS50YWdOYW1lXSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9KTtcbn07XG5cbi8qKlxuICogRmluZHMgdGhlIG5leHQgbGluZSwgc3RhcnRpbmcgZnJvbSBlbmRDdXJzb3IuICBVcG9uIGV4aXQsXG4gKiBzdGFydEN1cnNvciBhbmQgZW5kQ3Vyc29yIHdpbGwgc3Vycm91bmQgdGhlIG5leHQgbGluZS5cbiAqXG4gKiBAcGFyYW0ge0N1cnNvcn0gc3RhcnRDdXJzb3IgT24gZXhpdCwgbWFya3MgdGhlIGJlZ2lubmluZyBvZiB0aGUgbGluZS5cbiAqIEBwYXJhbSB7Q3Vyc29yfSBlbmRDdXJzb3IgVGhlIHBvc2l0aW9uIHRvIHN0YXJ0IHNlYXJjaGluZyBmb3IgdGhlIG5leHRcbiAqICAgICBsaW5lLiAgT24gZXhpdCwgd2lsbCBwb2ludCB0byB0aGUgZW5kIG9mIHRoZSByZXR1cm5lZCBzdHJpbmcuXG4gKiBAcGFyYW0ge0FycmF5PE5vZGU+fSBub2Rlc0Nyb3NzZWQgQW55IEhUTUwgbm9kZXMgY3Jvc3NlZCBiZXR3ZWVuIHRoZVxuICogICAgIGluaXRpYWwgYW5kIGZpbmFsIGN1cnNvciBwb3NpdGlvbiB3aWxsIGJlIHB1c2hlZCBvbnRvIHRoaXMgYXJyYXkuXG4gKiBAcGFyYW0ge251bWJlcn0gbGluZUxlbmd0aCBUaGUgbWF4aW11bSBudW1iZXIgb2YgY2hhcmFjdGVycyBpbiBhIGxpbmUuXG4gKiBAcGFyYW0ge09iamVjdH0gYnJlYWtUYWdzIEFzc29jaWF0aXZlIGFycmF5IG9mIHRhZ3MgdGhhdCBzaG91bGQgYnJlYWtcbiAqICAgICB0aGUgbGluZS5cbiAqIEByZXR1cm4gez9zdHJpbmd9IFRoZSBuZXh0IGxpbmUsIG9yIG51bGwgaWYgdGhlIGJvdHRvbSBvZiB0aGVcbiAqICAgICBkb2N1bWVudCBoYXMgYmVlbiByZWFjaGVkLlxuICovXG5UcmF2ZXJzZVV0aWwuZ2V0TmV4dExpbmUgPSBmdW5jdGlvbihcbiAgICBzdGFydEN1cnNvciwgZW5kQ3Vyc29yLCBub2Rlc0Nyb3NzZWQsIGxpbmVMZW5ndGgsIGJyZWFrVGFncykge1xuICByZXR1cm4gVHJhdmVyc2VVdGlsLmdldE5leHRTdHJpbmcoXG4gICAgICBzdGFydEN1cnNvciwgZW5kQ3Vyc29yLCBub2Rlc0Nyb3NzZWQsXG4gICAgICBmdW5jdGlvbihzdHIsIHdvcmQsIG5vZGVzKSB7XG4gICAgICAgIGlmIChzdHIubGVuZ3RoICsgd29yZC5sZW5ndGggKyAxID4gbGluZUxlbmd0aClcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChUcmF2ZXJzZVV0aWwuaXNTa2lwcGVkKG5vZGVzW2ldKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBzdHlsZSA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKG5vZGVzW2ldLCBudWxsKTtcbiAgICAgICAgICBpZiAoc3R5bGUgJiYgKHN0eWxlLmRpc3BsYXkgIT0gJ2lubGluZScgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrVGFnc1tub2Rlc1tpXS50YWdOYW1lXSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9KTtcbn07XG5cbi8qKlxuICogRmluZHMgdGhlIHByZXZpb3VzIGxpbmUsIHN0YXJ0aW5nIGZyb20gc3RhcnRDdXJzb3IuICBVcG9uIGV4aXQsXG4gKiBzdGFydEN1cnNvciBhbmQgZW5kQ3Vyc29yIHdpbGwgc3Vycm91bmQgdGhlIHByZXZpb3VzIGxpbmUuXG4gKlxuICogQHBhcmFtIHtDdXJzb3J9IHN0YXJ0Q3Vyc29yIFRoZSBwb3NpdGlvbiB0byBzdGFydCBzZWFyY2hpbmcgZm9yIHRoZSBuZXh0XG4gKiAgICAgbGluZS4gIE9uIGV4aXQsIHdpbGwgcG9pbnQgdG8gdGhlIHN0YXJ0IG9mIHRoZSByZXR1cm5lZCBzdHJpbmcuXG4gKiBAcGFyYW0ge0N1cnNvcn0gZW5kQ3Vyc29yIE9uIGV4aXQsIHRoZSBlbmQgb2YgdGhlIHJldHVybmVkIHN0cmluZy5cbiAqIEBwYXJhbSB7QXJyYXk8Tm9kZT59IG5vZGVzQ3Jvc3NlZCBBbnkgSFRNTCBub2RlcyBjcm9zc2VkIGJldHdlZW4gdGhlXG4gKiAgICAgaW5pdGlhbCBhbmQgZmluYWwgY3Vyc29yIHBvc2l0aW9uIHdpbGwgYmUgcHVzaGVkIG9udG8gdGhpcyBhcnJheS5cbiAqIEBwYXJhbSB7bnVtYmVyfSBsaW5lTGVuZ3RoIFRoZSBtYXhpbXVtIG51bWJlciBvZiBjaGFyYWN0ZXJzIGluIGEgbGluZS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBicmVha1RhZ3MgQXNzb2NpYXRpdmUgYXJyYXkgb2YgdGFncyB0aGF0IHNob3VsZCBicmVha1xuICogICAgIHRoZSBzZW50ZW5jZS5cbiAqICBAcmV0dXJuIHs/c3RyaW5nfSBUaGUgcHJldmlvdXMgbGluZSwgb3IgbnVsbCBpZiB0aGUgYm90dG9tIG9mIHRoZVxuICogICAgIGRvY3VtZW50IGhhcyBiZWVuIHJlYWNoZWQuXG4gKi9cblRyYXZlcnNlVXRpbC5nZXRQcmV2aW91c0xpbmUgPSBmdW5jdGlvbihcbiAgICBzdGFydEN1cnNvciwgZW5kQ3Vyc29yLCBub2Rlc0Nyb3NzZWQsIGxpbmVMZW5ndGgsIGJyZWFrVGFncykge1xuICByZXR1cm4gVHJhdmVyc2VVdGlsLmdldFByZXZpb3VzU3RyaW5nKFxuICAgICAgc3RhcnRDdXJzb3IsIGVuZEN1cnNvciwgbm9kZXNDcm9zc2VkLFxuICAgICAgZnVuY3Rpb24oc3RyLCB3b3JkLCBub2Rlcykge1xuICAgICAgICBpZiAoc3RyLmxlbmd0aCArIHdvcmQubGVuZ3RoICsgMSA+IGxpbmVMZW5ndGgpXG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAoVHJhdmVyc2VVdGlsLmlzU2tpcHBlZChub2Rlc1tpXSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgc3R5bGUgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShub2Rlc1tpXSwgbnVsbCk7XG4gICAgICAgICAgaWYgKHN0eWxlICYmIChzdHlsZS5kaXNwbGF5ICE9ICdpbmxpbmUnIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVha1RhZ3Nbbm9kZXNbaV0udGFnTmFtZV0pKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSk7XG59O1xuXG4vKipcbiAqIEZpbmRzIHRoZSBuZXh0IHBhcmFncmFwaCwgc3RhcnRpbmcgZnJvbSBlbmRDdXJzb3IuICBVcG9uIGV4aXQsXG4gKiBzdGFydEN1cnNvciBhbmQgZW5kQ3Vyc29yIHdpbGwgc3Vycm91bmQgdGhlIG5leHQgcGFyYWdyYXBoLlxuICpcbiAqIEBwYXJhbSB7Q3Vyc29yfSBzdGFydEN1cnNvciBPbiBleGl0LCBtYXJrcyB0aGUgYmVnaW5uaW5nIG9mIHRoZSBwYXJhZ3JhcGguXG4gKiBAcGFyYW0ge0N1cnNvcn0gZW5kQ3Vyc29yIFRoZSBwb3NpdGlvbiB0byBzdGFydCBzZWFyY2hpbmcgZm9yIHRoZSBuZXh0XG4gKiAgICAgcGFyYWdyYXBoLiAgT24gZXhpdCwgd2lsbCBwb2ludCB0byB0aGUgZW5kIG9mIHRoZSByZXR1cm5lZCBzdHJpbmcuXG4gKiBAcGFyYW0ge0FycmF5PE5vZGU+fSBub2Rlc0Nyb3NzZWQgQW55IEhUTUwgbm9kZXMgY3Jvc3NlZCBiZXR3ZWVuIHRoZVxuICogICAgIGluaXRpYWwgYW5kIGZpbmFsIGN1cnNvciBwb3NpdGlvbiB3aWxsIGJlIHB1c2hlZCBvbnRvIHRoaXMgYXJyYXkuXG4gKiBAcmV0dXJuIHs/c3RyaW5nfSBUaGUgbmV4dCBwYXJhZ3JhcGgsIG9yIG51bGwgaWYgdGhlIGJvdHRvbSBvZiB0aGVcbiAqICAgICBkb2N1bWVudCBoYXMgYmVlbiByZWFjaGVkLlxuICovXG5UcmF2ZXJzZVV0aWwuZ2V0TmV4dFBhcmFncmFwaCA9IGZ1bmN0aW9uKHN0YXJ0Q3Vyc29yLCBlbmRDdXJzb3IsXG4gICAgbm9kZXNDcm9zc2VkKSB7XG4gIHJldHVybiBUcmF2ZXJzZVV0aWwuZ2V0TmV4dFN0cmluZyhcbiAgICAgIHN0YXJ0Q3Vyc29yLCBlbmRDdXJzb3IsIG5vZGVzQ3Jvc3NlZCxcbiAgICAgIGZ1bmN0aW9uKHN0ciwgd29yZCwgbm9kZXMpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChUcmF2ZXJzZVV0aWwuaXNTa2lwcGVkKG5vZGVzW2ldKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBzdHlsZSA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKG5vZGVzW2ldLCBudWxsKTtcbiAgICAgICAgICBpZiAoc3R5bGUgJiYgc3R5bGUuZGlzcGxheSAhPSAnaW5saW5lJykge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0pO1xufTtcblxuLyoqXG4gKiBGaW5kcyB0aGUgcHJldmlvdXMgcGFyYWdyYXBoLCBzdGFydGluZyBmcm9tIHN0YXJ0Q3Vyc29yLiAgVXBvbiBleGl0LFxuICogc3RhcnRDdXJzb3IgYW5kIGVuZEN1cnNvciB3aWxsIHN1cnJvdW5kIHRoZSBwcmV2aW91cyBwYXJhZ3JhcGguXG4gKlxuICogQHBhcmFtIHtDdXJzb3J9IHN0YXJ0Q3Vyc29yIFRoZSBwb3NpdGlvbiB0byBzdGFydCBzZWFyY2hpbmcgZm9yIHRoZSBuZXh0XG4gKiAgICAgcGFyYWdyYXBoLiAgT24gZXhpdCwgd2lsbCBwb2ludCB0byB0aGUgc3RhcnQgb2YgdGhlIHJldHVybmVkIHN0cmluZy5cbiAqIEBwYXJhbSB7Q3Vyc29yfSBlbmRDdXJzb3IgT24gZXhpdCwgdGhlIGVuZCBvZiB0aGUgcmV0dXJuZWQgc3RyaW5nLlxuICogQHBhcmFtIHtBcnJheTxOb2RlPn0gbm9kZXNDcm9zc2VkIEFueSBIVE1MIG5vZGVzIGNyb3NzZWQgYmV0d2VlbiB0aGVcbiAqICAgICBpbml0aWFsIGFuZCBmaW5hbCBjdXJzb3IgcG9zaXRpb24gd2lsbCBiZSBwdXNoZWQgb250byB0aGlzIGFycmF5LlxuICogQHJldHVybiB7P3N0cmluZ30gVGhlIHByZXZpb3VzIHBhcmFncmFwaCwgb3IgbnVsbCBpZiB0aGUgYm90dG9tIG9mIHRoZVxuICogICAgIGRvY3VtZW50IGhhcyBiZWVuIHJlYWNoZWQuXG4gKi9cblRyYXZlcnNlVXRpbC5nZXRQcmV2aW91c1BhcmFncmFwaCA9IGZ1bmN0aW9uKFxuICAgIHN0YXJ0Q3Vyc29yLCBlbmRDdXJzb3IsIG5vZGVzQ3Jvc3NlZCkge1xuICByZXR1cm4gVHJhdmVyc2VVdGlsLmdldFByZXZpb3VzU3RyaW5nKFxuICAgICAgc3RhcnRDdXJzb3IsIGVuZEN1cnNvciwgbm9kZXNDcm9zc2VkLFxuICAgICAgZnVuY3Rpb24oc3RyLCB3b3JkLCBub2Rlcykge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKFRyYXZlcnNlVXRpbC5pc1NraXBwZWQobm9kZXNbaV0pKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHN0eWxlID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUobm9kZXNbaV0sIG51bGwpO1xuICAgICAgICAgIGlmIChzdHlsZSAmJiBzdHlsZS5kaXNwbGF5ICE9ICdpbmxpbmUnKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSk7XG59O1xuXG4vKipcbiAqIEN1c3RvbWl6YWJsZSBmdW5jdGlvbiB0byByZXR1cm4gdGhlIG5leHQgc3RyaW5nIG9mIHdvcmRzIGluIHRoZSBET00sIGJhc2VkXG4gKiBvbiBwcm92aWRlZCBmdW5jdGlvbnMgdG8gZGVjaWRlIHdoZW4gdG8gYnJlYWsgb25lIHN0cmluZyBhbmQgc3RhcnRcbiAqIHRoZSBuZXh0LiBUaGlzIGNhbiBiZSB1c2VkIHRvIGdldCB0aGUgbmV4dCBzZW50ZW5jZSwgbGluZSwgcGFyYWdyYXBoLFxuICogb3IgcG90ZW50aWFsbHkgb3RoZXIgZ3JhbnVsYXJpdGllcy5cbiAqXG4gKiBGaW5kcyB0aGUgbmV4dCBjb250aWd1b3VzIHN0cmluZywgc3RhcnRpbmcgZnJvbSBlbmRDdXJzb3IuICBVcG9uIGV4aXQsXG4gKiBzdGFydEN1cnNvciBhbmQgZW5kQ3Vyc29yIHdpbGwgc3Vycm91bmQgdGhlIG5leHQgc3RyaW5nLlxuICpcbiAqIFRoZSBicmVha0JlZm9yZSBmdW5jdGlvbiB0YWtlcyB0aHJlZSBwYXJhbWV0ZXJzLCBhbmRcbiAqIHNob3VsZCByZXR1cm4gdHJ1ZSBpZiB0aGUgc3RyaW5nIHNob3VsZCBiZSBicm9rZW4gYmVmb3JlIHRoZSBwcm9wb3NlZFxuICogbmV4dCB3b3JkOlxuICogICBzdHIgVGhlIHN0cmluZyBzbyBmYXIuXG4gKiAgIHdvcmQgVGhlIG5leHQgd29yZCB0byBiZSBhZGRlZC5cbiAqICAgbm9kZXNDcm9zc2VkIFRoZSBub2RlcyBjcm9zc2VkIGluIHJlYWNoaW5nIHRoaXMgbmV4dCB3b3JkLlxuICpcbiAqIEBwYXJhbSB7Q3Vyc29yfSBzdGFydEN1cnNvciBPbiBleGl0LCB3aWxsIHBvaW50IHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlXG4gKiAgICAgbmV4dCBzdHJpbmcuXG4gKiBAcGFyYW0ge0N1cnNvcn0gZW5kQ3Vyc29yIFRoZSBwb3NpdGlvbiB0byBzdGFydCBzZWFyY2hpbmcgZm9yIHRoZSBuZXh0XG4gKiAgICAgc3RyaW5nLiAgT24gZXhpdCwgd2lsbCBwb2ludCB0byB0aGUgZW5kIG9mIHRoZSByZXR1cm5lZCBzdHJpbmcuXG4gKiBAcGFyYW0ge0FycmF5PE5vZGU+fSBub2Rlc0Nyb3NzZWQgQW55IEhUTUwgbm9kZXMgY3Jvc3NlZCBiZXR3ZWVuIHRoZVxuICogICAgIGluaXRpYWwgYW5kIGZpbmFsIGN1cnNvciBwb3NpdGlvbiB3aWxsIGJlIHB1c2hlZCBvbnRvIHRoaXMgYXJyYXkuXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKHN0cmluZywgc3RyaW5nLCBBcnJheTxzdHJpbmc+KX0gYnJlYWtCZWZvcmVcbiAqICAgICBGdW5jdGlvbiB0aGF0IHRha2VzIHRoZSBzdHJpbmcgc28gZmFyLCBuZXh0IHdvcmQgdG8gYmUgYWRkZWQsIGFuZFxuICogICAgIG5vZGVzIGNyb3NzZWQsIGFuZCByZXR1cm5zIHRydWUgaWYgdGhlIHN0cmluZyBzaG91bGQgYmUgZW5kZWQgYmVmb3JlXG4gKiAgICAgYWRkaW5nIHRoaXMgd29yZC5cbiAqIEByZXR1cm4gez9zdHJpbmd9IFRoZSBuZXh0IHN0cmluZywgb3IgbnVsbCBpZiB0aGUgYm90dG9tIG9mIHRoZVxuICogICAgIGRvY3VtZW50IGhhcyBiZWVuIHJlYWNoZWQuXG4gKi9cblRyYXZlcnNlVXRpbC5nZXROZXh0U3RyaW5nID0gZnVuY3Rpb24oXG4gICAgc3RhcnRDdXJzb3IsIGVuZEN1cnNvciwgbm9kZXNDcm9zc2VkLCBicmVha0JlZm9yZSkge1xuICAvLyBHZXQgdGhlIGZpcnN0IHdvcmQgYW5kIHNldCB0aGUgc3RhcnQgY3Vyc29yIHRvIHRoZSBzdGFydCBvZiB0aGVcbiAgLy8gZmlyc3Qgd29yZC5cbiAgdmFyIHdvcmRTdGFydEN1cnNvciA9IGVuZEN1cnNvci5jbG9uZSgpO1xuICB2YXIgd29yZEVuZEN1cnNvciA9IGVuZEN1cnNvci5jbG9uZSgpO1xuICB2YXIgbmV3Tm9kZXNDcm9zc2VkID0gW107XG4gIHZhciBzdHIgPSAnJztcbiAgdmFyIHdvcmQgPSBUcmF2ZXJzZVV0aWwuZ2V0TmV4dFdvcmQoXG4gICAgICB3b3JkU3RhcnRDdXJzb3IsIHdvcmRFbmRDdXJzb3IsIG5ld05vZGVzQ3Jvc3NlZCk7XG4gIGlmICh3b3JkID09IG51bGwpXG4gICAgcmV0dXJuIG51bGw7XG4gIHN0YXJ0Q3Vyc29yLmNvcHlGcm9tKHdvcmRTdGFydEN1cnNvcik7XG5cbiAgLy8gQWx3YXlzIGFkZCB0aGUgZmlyc3Qgd29yZCB3aGVuIHRoZSBzdHJpbmcgaXMgZW1wdHksIGFuZCB0aGVuIGtlZXBcbiAgLy8gYWRkaW5nIG1vcmUgd29yZHMgYXMgbG9uZyBhcyBicmVha0JlZm9yZSByZXR1cm5zIGZhbHNlXG4gIHdoaWxlICghc3RyIHx8ICFicmVha0JlZm9yZShzdHIsIHdvcmQsIG5ld05vZGVzQ3Jvc3NlZCkpIHtcbiAgICAvLyBBcHBlbmQgdGhpcyB3b3JkLCBzZXQgdGhlIGVuZCBjdXJzb3IgdG8gdGhlIGVuZCBvZiB0aGlzIHdvcmQsIGFuZFxuICAgIC8vIHVwZGF0ZSB0aGUgcmV0dXJuZWQgbGlzdCBvZiBub2RlcyBjcm9zc2VkIHRvIGluY2x1ZGUgb25lcyB3ZSBjcm9zc2VkXG4gICAgLy8gaW4gcmVhY2hpbmcgdGhpcyB3b3JkLlxuICAgIGlmIChzdHIpXG4gICAgICBzdHIgKz0gJyAnO1xuICAgIHN0ciArPSB3b3JkO1xuICAgIG5vZGVzQ3Jvc3NlZCA9IG5vZGVzQ3Jvc3NlZC5jb25jYXQobmV3Tm9kZXNDcm9zc2VkKTtcbiAgICBlbmRDdXJzb3IuY29weUZyb20od29yZEVuZEN1cnNvcik7XG5cbiAgICAvLyBHZXQgdGhlIG5leHQgd29yZCBhbmQgZ28gYmFjayB0byB0aGUgdG9wIG9mIHRoZSBsb29wLlxuICAgIG5ld05vZGVzQ3Jvc3NlZCA9IFtdO1xuICAgIHdvcmQgPSBUcmF2ZXJzZVV0aWwuZ2V0TmV4dFdvcmQoXG4gICAgICAgIHdvcmRTdGFydEN1cnNvciwgd29yZEVuZEN1cnNvciwgbmV3Tm9kZXNDcm9zc2VkKTtcbiAgICBpZiAod29yZCA9PSBudWxsKVxuICAgICAgcmV0dXJuIHN0cjtcbiAgfVxuXG4gIHJldHVybiBzdHI7XG59O1xuXG4vKipcbiAqIEN1c3RvbWl6YWJsZSBmdW5jdGlvbiB0byByZXR1cm4gdGhlIHByZXZpb3VzIHN0cmluZyBvZiB3b3JkcyBpbiB0aGUgRE9NLFxuICogYmFzZWQgb24gcHJvdmlkZWQgZnVuY3Rpb25zIHRvIGRlY2lkZSB3aGVuIHRvIGJyZWFrIG9uZSBzdHJpbmcgYW5kIHN0YXJ0XG4gKiB0aGUgbmV4dC4gU2VlIGdldE5leHRTdHJpbmcsIGFib3ZlLCBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIEZpbmRzIHRoZSBwcmV2aW91cyBjb250aWd1b3VzIHN0cmluZywgc3RhcnRpbmcgZnJvbSBzdGFydEN1cnNvci4gIFVwb24gZXhpdCxcbiAqIHN0YXJ0Q3Vyc29yIGFuZCBlbmRDdXJzb3Igd2lsbCBzdXJyb3VuZCB0aGUgbmV4dCBzdHJpbmcuXG4gKlxuICogQHBhcmFtIHtDdXJzb3J9IHN0YXJ0Q3Vyc29yIFRoZSBwb3NpdGlvbiB0byBzdGFydCBzZWFyY2hpbmcgZm9yIHRoZVxuICogICAgIHByZXZpb3VzIHN0cmluZy4gIE9uIGV4aXQsIHdpbGwgcG9pbnQgdG8gdGhlIGJlZ2lubmluZyBvZiB0aGVcbiAqICAgICBzdHJpbmcgcmV0dXJuZWQuXG4gKiBAcGFyYW0ge0N1cnNvcn0gZW5kQ3Vyc29yIE9uIGV4aXQsIHdpbGwgcG9pbnQgdG8gdGhlIGVuZCBvZiB0aGVcbiAqICAgICBzdHJpbmcgcmV0dXJuZWQuXG4gKiBAcGFyYW0ge0FycmF5PE5vZGU+fSBub2Rlc0Nyb3NzZWQgQW55IEhUTUwgbm9kZXMgY3Jvc3NlZCBiZXR3ZWVuIHRoZVxuICogICAgIGluaXRpYWwgYW5kIGZpbmFsIGN1cnNvciBwb3NpdGlvbiB3aWxsIGJlIHB1c2hlZCBvbnRvIHRoaXMgYXJyYXkuXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKHN0cmluZywgc3RyaW5nLCBBcnJheTxzdHJpbmc+KX0gYnJlYWtCZWZvcmVcbiAqICAgICBGdW5jdGlvbiB0aGF0IHRha2VzIHRoZSBzdHJpbmcgc28gZmFyLCB0aGUgd29yZCB0byBiZSBhZGRlZCwgYW5kXG4gKiAgICAgbm9kZXMgY3Jvc3NlZCwgYW5kIHJldHVybnMgdHJ1ZSBpZiB0aGUgc3RyaW5nIHNob3VsZCBiZSBlbmRlZCBiZWZvcmVcbiAqICAgICBhZGRpbmcgdGhpcyB3b3JkLlxuICogQHJldHVybiB7P3N0cmluZ30gVGhlIG5leHQgc3RyaW5nLCBvciBudWxsIGlmIHRoZSB0b3Agb2YgdGhlXG4gKiAgICAgZG9jdW1lbnQgaGFzIGJlZW4gcmVhY2hlZC5cbiAqL1xuVHJhdmVyc2VVdGlsLmdldFByZXZpb3VzU3RyaW5nID0gZnVuY3Rpb24oXG4gICAgc3RhcnRDdXJzb3IsIGVuZEN1cnNvciwgbm9kZXNDcm9zc2VkLCBicmVha0JlZm9yZSkge1xuICAvLyBHZXQgdGhlIGZpcnN0IHdvcmQgYW5kIHNldCB0aGUgZW5kIGN1cnNvciB0byB0aGUgZW5kIG9mIHRoZVxuICAvLyBmaXJzdCB3b3JkLlxuICB2YXIgd29yZFN0YXJ0Q3Vyc29yID0gc3RhcnRDdXJzb3IuY2xvbmUoKTtcbiAgdmFyIHdvcmRFbmRDdXJzb3IgPSBzdGFydEN1cnNvci5jbG9uZSgpO1xuICB2YXIgbmV3Tm9kZXNDcm9zc2VkID0gW107XG4gIHZhciBzdHIgPSAnJztcbiAgdmFyIHdvcmQgPSBUcmF2ZXJzZVV0aWwuZ2V0UHJldmlvdXNXb3JkKFxuICAgICAgd29yZFN0YXJ0Q3Vyc29yLCB3b3JkRW5kQ3Vyc29yLCBuZXdOb2Rlc0Nyb3NzZWQpO1xuICBpZiAod29yZCA9PSBudWxsKVxuICAgIHJldHVybiBudWxsO1xuICBlbmRDdXJzb3IuY29weUZyb20od29yZEVuZEN1cnNvcik7XG5cbiAgLy8gQWx3YXlzIGFkZCB0aGUgZmlyc3Qgd29yZCB3aGVuIHRoZSBzdHJpbmcgaXMgZW1wdHksIGFuZCB0aGVuIGtlZXBcbiAgLy8gYWRkaW5nIG1vcmUgd29yZHMgYXMgbG9uZyBhcyBicmVha0JlZm9yZSByZXR1cm5zIGZhbHNlXG4gIHdoaWxlICghc3RyIHx8ICFicmVha0JlZm9yZShzdHIsIHdvcmQsIG5ld05vZGVzQ3Jvc3NlZCkpIHtcbiAgICAvLyBQcmVwZW5kIHRoaXMgd29yZCwgc2V0IHRoZSBzdGFydCBjdXJzb3IgdG8gdGhlIHN0YXJ0IG9mIHRoaXMgd29yZCwgYW5kXG4gICAgLy8gdXBkYXRlIHRoZSByZXR1cm5lZCBsaXN0IG9mIG5vZGVzIGNyb3NzZWQgdG8gaW5jbHVkZSBvbmVzIHdlIGNyb3NzZWRcbiAgICAvLyBpbiByZWFjaGluZyB0aGlzIHdvcmQuXG4gICAgaWYgKHN0cilcbiAgICAgIHN0ciA9ICcgJyArIHN0cjtcbiAgICBzdHIgPSB3b3JkICsgc3RyO1xuICAgIG5vZGVzQ3Jvc3NlZCA9IG5vZGVzQ3Jvc3NlZC5jb25jYXQobmV3Tm9kZXNDcm9zc2VkKTtcbiAgICBzdGFydEN1cnNvci5jb3B5RnJvbSh3b3JkU3RhcnRDdXJzb3IpO1xuICAgIC8vIEdldCB0aGUgcHJldmlvdXMgd29yZCBhbmQgZ28gYmFjayB0byB0aGUgdG9wIG9mIHRoZSBsb29wLlxuICAgIG5ld05vZGVzQ3Jvc3NlZCA9IFtdO1xuICAgIHdvcmQgPSBUcmF2ZXJzZVV0aWwuZ2V0UHJldmlvdXNXb3JkKFxuICAgICAgICB3b3JkU3RhcnRDdXJzb3IsIHdvcmRFbmRDdXJzb3IsIG5ld05vZGVzQ3Jvc3NlZCk7XG4gICAgaWYgKHdvcmQgPT0gbnVsbClcbiAgICAgIHJldHVybiBzdHI7XG4gIH1cblxuICByZXR1cm4gc3RyO1xufTtcblxubW9kdWxlLmV4cG9ydHMuQ3Vyc29yID0gQ3Vyc29yO1xubW9kdWxlLmV4cG9ydHMuVHJhdmVyc2VVdGlsID0gVHJhdmVyc2VVdGlsO1xuXG59KS5jYWxsKHRoaXMpO1xuIiwiKGZ1bmN0aW9uKCkge1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAndXNlIHN0cmljdCc7XG4gIHZhciBkZWJ1ZywgZGVmYXVsdHMsIGZyZWV6ZSwgaXNhLCBsb2csIHJlZiwgdHlwZXMsIHZhbGlkYXRlLCB2YWxpZGF0ZV9vcHRpb25hbCwgwrUsXG4gICAgYm91bmRNZXRob2RDaGVjayA9IGZ1bmN0aW9uKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgRXJyb3IoJ0JvdW5kIGluc3RhbmNlIG1ldGhvZCBhY2Nlc3NlZCBiZWZvcmUgYmluZGluZycpOyB9IH07XG5cbiAgwrUgPSByZXF1aXJlKCcuL21haW4nKTtcblxuICBsb2cgPSBjb25zb2xlLmxvZztcblxuICBkZWJ1ZyA9IGNvbnNvbGUuZGVidWc7XG5cbiAgZnJlZXplID0gT2JqZWN0LmZyZWV6ZTtcblxuICAoe3R5cGVzLCBpc2EsIHZhbGlkYXRlLCB2YWxpZGF0ZV9vcHRpb25hbH0gPSByZXF1aXJlKCcuL3R5cGVzJykpO1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgZGVmYXVsdHMgPSB7XG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBsYXRjaDoge1xuICAgICAgZHQ6IDM1MCAvLyB0aW1lIGluIG1pbGxpc2Vjb25kcyBiZXR3ZWVuIGZpcnN0IGFuZCBsYXN0IGtleSBldmVudCB0byB0cmlnZ2VyIGxhdGNoaW5nXG4gICAgfSxcbiAgICBcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIGtibGlrZV9ldmVudG5hbWVzOiBbXG4gICAgICAvLyAjIyMgVEFJTlQgbm90IGFsbCBvZiB0aGVzZSBldmVudHMgYXJlIG5lZWRlZFxuICAgICAgJ2NsaWNrJyxcbiAgICAgIC8vICdkYmxjbGljaycsICMgaW1wbGllZCAvIHByZWNlZGVkIGJ5IGBjbGlja2AgZXZlbnRcbiAgICAgIC8vICdkcmFnJywgJ2RyYWdlbmQnLCAnZHJhZ2VudGVyJywgJ2RyYWdsZWF2ZScsICdkcmFnb3ZlcicsICdkcmFnc3RhcnQnLFxuICAgICAgLy8gJ21vdXNlZG93bicsICdtb3VzZWVudGVyJywgJ21vdXNlbGVhdmUnLCAnbW91c2Vtb3ZlJywgJ21vdXNlb3V0JywgJ21vdXNlb3ZlcicsICdtb3VzZXVwJyxcbiAgICAgIC8vICdwb2ludGVyY2FuY2VsJyxcbiAgICAgICd3aGVlbCcsXG4gICAgICAncG9pbnRlcm1vdmUnLFxuICAgICAgJ3BvaW50ZXJvdXQnLFxuICAgICAgJ3BvaW50ZXJvdmVyJ1xuICAgIF0sXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyAncG9pbnRlcmRvd24nLFxuICAgIC8vICdwb2ludGVyZW50ZXInLFxuICAgIC8vICdwb2ludGVybGVhdmUnLFxuICAgIC8vICdwb2ludGVydXAnLFxuICAgIC8vIC0tLS0tLS0tLS0tLS0gVGllciBBOiB1YmlxdWl0b3VzLCB1bmVxdWl2b2NhbFxuICAgIG1vZGlmaWVyX25hbWVzOiBbJ0FsdCcsICdBbHRHcmFwaCcsICdDb250cm9sJywgJ01ldGEnLCAnU2hpZnQnLCAnQ2Fwc0xvY2snXVxuICB9O1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIC0tLS0tLS0tLS0tLS0gVGllciBCOiBzdGF0dXMgZG91YnRmdWxcbiAgLy8gJ0h5cGVyJyxcbiAgLy8gJ09TJyxcbiAgLy8gJ1N1cGVyJyxcbiAgLy8gJ1N5bWJvbCcsXG4gIC8vIC0tLS0tLS0tLS0tLS0gVGllciBDOiByYXJlLCBub3QgbmVlZGVkLCBvciBub3Qgc2Vuc2VkIGJ5IEpTXG4gIC8vICdGbicsXG4gIC8vICdGbkxvY2snLFxuICAvLyAnTnVtTG9jaycsXG4gIC8vICdTY3JvbGxMb2NrJyxcbiAgLy8gJ1N5bWJvbExvY2snLFxuICB0aGlzLl9LYiA9IChmdW5jdGlvbigpIHtcbiAgICBjbGFzcyBfS2Ige1xuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIGNvbnN0cnVjdG9yKGNmZykge1xuICAgICAgICB2YXIgaSwgbGVuLCBtb2RpZmllcl9uYW1lLCByZWY7XG4gICAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgIC8qIEdldCB0aGUgbGFzdCBrbm93biBrZXlib2FyZCBtb2RpZmllciBzdGF0ZS4gTk9URSBtYXkgYmUgZXh0ZW5kZWQgd2l0aCBgZXZlbnRgIGFyZ3VtZW50IElURi4gKi9cbiAgICAgICAgLy8gwrUuRE9NLmdldF9rYl9tb2RpZmllcl9zdGF0ZSA9ICgpID0+IHJldHVybiB7IC4uLnBydiwgfVxuXG4gICAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgIHRoaXMuZ2V0X2NoYW5nZWRfa2JfbW9kaWZpZXJfc3RhdGUgPSB0aGlzLmdldF9jaGFuZ2VkX2tiX21vZGlmaWVyX3N0YXRlLmJpbmQodGhpcyk7XG4gICAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICAgLy8gZ2V0X2tiX21vZGlmaWVyX3N0YXRlID0gKCBldmVudCwgdmFsdWUgKSA9PlxuICAgICAgICAvLyAgIEBfcHJ2X21vZGlmaWVycyA9IHt9XG4gICAgICAgIC8vICAgZm9yICggbW9kaWZpZXJfbmFtZSBvZiBAY2ZnLm1vZGlmaWVyX25hbWVzICkge1xuICAgICAgICAvLyAgICAgQF9wcnZfbW9kaWZpZXJzWyBtb2RpZmllcl9uYW1lIF0gPSBudWxsXG4gICAgICAgIC8vICAgZnJlZXplKCBAX3Bydl9tb2RpZmllcnMgKVxuXG4gICAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgIHRoaXMuX3NldF9jYXBzbG9ja19zdGF0ZSA9IHRoaXMuX3NldF9jYXBzbG9ja19zdGF0ZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmNmZyA9IHsuLi5kZWZhdWx0cywgLi4uY2ZnfTtcbiAgICAgICAgcmVmID0gdGhpcy5jZmcubW9kaWZpZXJfbmFtZXM7XG4gICAgICAgIGZvciAoaSA9IDAsIGxlbiA9IHJlZi5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgIG1vZGlmaWVyX25hbWUgPSByZWZbaV07XG4gICAgICAgICAgdGhpcy5fcHJ2X21vZGlmaWVyc1ttb2RpZmllcl9uYW1lXSA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgZnJlZXplKHRoaXMuX3Bydl9tb2RpZmllcnMpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgZ2V0X2NoYW5nZWRfa2JfbW9kaWZpZXJfc3RhdGUoKSB7XG4gICAgICAgIHZhciBhbnlfaGFzX2NoYW5nZWQsIGNoYW5nZWRfbW9kaWZpZXJzLCBjcnRfbW9kaWZpZXJzLCBpLCBsZW4sIG1vZGlmaWVyX25hbWUsIHJlZiwgc3RhdGUsIHRoaXNfaGFzX2NoYW5nZWQ7XG4gICAgICAgIC8qIFJldHVybiBrZXlib2FyZCBtb2RpZmllciBzdGF0ZSBpZiBpdCBoYXMgY2hhbmdlZCBzaW5jZSB0aGUgbGFzdCBjYWxsLCBvciBgbnVsbGAgaWYgaXQgaGFzbid0IGNoYW5nZWQuICovXG4gICAgICAgIC8vIGxvZyggJ14zMzk4OF4nLCB7IGV2ZW50LCB9IClcbiAgICAgICAgY3J0X21vZGlmaWVycyA9IHtcbiAgICAgICAgICBfdHlwZTogZXZlbnQudHlwZVxuICAgICAgICB9O1xuICAgICAgICBjaGFuZ2VkX21vZGlmaWVycyA9IHtcbiAgICAgICAgICBfdHlwZTogZXZlbnQudHlwZVxuICAgICAgICB9O1xuICAgICAgICBhbnlfaGFzX2NoYW5nZWQgPSBmYWxzZTtcbiAgICAgICAgcmVmID0gdGhpcy5jZmcubW9kaWZpZXJfbmFtZXM7XG4gICAgICAgIGZvciAoaSA9IDAsIGxlbiA9IHJlZi5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgIG1vZGlmaWVyX25hbWUgPSByZWZbaV07XG4gICAgICAgICAgc3RhdGUgPSBldmVudC5nZXRNb2RpZmllclN0YXRlKG1vZGlmaWVyX25hbWUpO1xuICAgICAgICAgIHRoaXNfaGFzX2NoYW5nZWQgPSB0aGlzLl9wcnZfbW9kaWZpZXJzW21vZGlmaWVyX25hbWVdICE9PSBzdGF0ZTtcbiAgICAgICAgICBhbnlfaGFzX2NoYW5nZWQgPSBhbnlfaGFzX2NoYW5nZWQgfHwgdGhpc19oYXNfY2hhbmdlZDtcbiAgICAgICAgICBjcnRfbW9kaWZpZXJzW21vZGlmaWVyX25hbWVdID0gc3RhdGU7XG4gICAgICAgICAgaWYgKHRoaXNfaGFzX2NoYW5nZWQpIHtcbiAgICAgICAgICAgIGNoYW5nZWRfbW9kaWZpZXJzW21vZGlmaWVyX25hbWVdID0gc3RhdGU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChhbnlfaGFzX2NoYW5nZWQpIHtcbiAgICAgICAgICB0aGlzLl9wcnZfbW9kaWZpZXJzID0gZnJlZXplKGNydF9tb2RpZmllcnMpO1xuICAgICAgICAgIHJldHVybiBjaGFuZ2VkX21vZGlmaWVycztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgX3NldF9jYXBzbG9ja19zdGF0ZShjYXBzbG9ja19hY3RpdmUpIHtcbiAgICAgICAgaWYgKGNhcHNsb2NrX2FjdGl2ZSA9PT0gdGhpcy5fY2Fwc2xvY2tfYWN0aXZlKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fY2Fwc2xvY2tfYWN0aXZlID0gY2Fwc2xvY2tfYWN0aXZlO1xuICAgICAgICDCtS5ET00uZW1pdF9jdXN0b21fZXZlbnQoJ8K1X2tiX2NhcHNsb2NrX2NoYW5nZWQnLCB7XG4gICAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAgICBDYXBzTG9jazogY2Fwc2xvY2tfYWN0aXZlXG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICB9O1xuXG4gICAgX0tiLnByb3RvdHlwZS5fcHJ2X21vZGlmaWVycyA9IHt9O1xuXG4gICAgX0tiLnByb3RvdHlwZS5fY2Fwc2xvY2tfYWN0aXZlID0gZmFsc2U7XG5cbiAgICByZXR1cm4gX0tiO1xuXG4gIH0pLmNhbGwodGhpcyk7XG5cbiAgLy8gIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyBvbl9wdXNoOiAoIGtleW5hbWVzLCBoYW5kbGVyICkgPT5cbiAgLy8ga2V5bmFtZXMgID0gWyBrZXluYW1lcywgXSB1bmxlc3MgaXNhLmxpc3Qga2V5bmFtZXNcbiAgLy8gdHlwZXMgICAgID0gWyB0eXBlcywgICAgXSB1bmxlc3MgaXNhLmxpc3QgdHlwZXNcbiAgLy8gdmFsaWRhdGUua2Jfa2V5bmFtZXMgIGtleW5hbWVzXG4gIC8vIHZhbGlkYXRlLmtiX3R5cGVzICAgICB0eXBlc1xuXG4gIC8vIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4gIC8vIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4gIC8vIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4gIC8vIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4gIC8vIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4gIC8vIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4gIHJlZiA9IHRoaXMuS2IgPSAoZnVuY3Rpb24oKSB7XG4gICAgY2xhc3MgS2IgZXh0ZW5kcyB0aGlzLl9LYiB7XG4gICAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoLi4uYXJndW1lbnRzKTtcbiAgICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICAgdGhpcy5faGFuZGxlcl9mcm9tX3dhdGNoZXIgPSB0aGlzLl9oYW5kbGVyX2Zyb21fd2F0Y2hlci5iaW5kKHRoaXMpO1xuICAgICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgICB0aGlzLl9saXN0ZW5fdG9fa2V5ID0gdGhpcy5fbGlzdGVuX3RvX2tleS5iaW5kKHRoaXMpO1xuICAgICAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgICAvLyBNQk1DRFxuICAgICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgICB0aGlzLl9saXN0ZW5fdG9fbW9kaWZpZXJzID0gdGhpcy5fbGlzdGVuX3RvX21vZGlmaWVycy5iaW5kKHRoaXMpO1xuICAgICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgICB0aGlzLl9lbWl0X21ibWNkX2tleV9ldmVudHMgPSB0aGlzLl9lbWl0X21ibWNkX2tleV9ldmVudHMuYmluZCh0aGlzKTtcbiAgICAgIH1cblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIF9nZXRfbGF0Y2hpbmdfa2V5bmFtZSgpIHtcbiAgICAgICAgdmFyIFIsIHJlZjEsIHJlZjEwLCByZWYxMSwgcmVmMTIsIHJlZjIsIHJlZjMsIHJlZjQsIHJlZjUsIHJlZjYsIHJlZjcsIHJlZjgsIHJlZjk7XG4gICAgICAgIGlmICghKChEYXRlLm5vdygpIC0gKChyZWYxID0gKHJlZjIgPSB0aGlzLl9zaHJlZ1swXSkgIT0gbnVsbCA/IHJlZjIudCA6IHZvaWQgMCkgIT0gbnVsbCA/IHJlZjEgOiAwKSkgPCB0aGlzLmNmZy5sYXRjaC5kdCkpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoKChyZWYzID0gdGhpcy5fc2hyZWdbMF0pICE9IG51bGwgPyByZWYzLmRpciA6IHZvaWQgMCkgIT09ICdkb3duJykge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGlmICgoKHJlZjQgPSB0aGlzLl9zaHJlZ1sxXSkgIT0gbnVsbCA/IHJlZjQuZGlyIDogdm9pZCAwKSAhPT0gJ3VwJykge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGlmICgoKHJlZjUgPSB0aGlzLl9zaHJlZ1syXSkgIT0gbnVsbCA/IHJlZjUuZGlyIDogdm9pZCAwKSAhPT0gJ2Rvd24nKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCgocmVmNiA9IHRoaXMuX3NocmVnWzNdKSAhPSBudWxsID8gcmVmNi5kaXIgOiB2b2lkIDApICE9PSAndXAnKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCgoKChyZWY5ID0gdGhpcy5fc2hyZWdbMF0pICE9IG51bGwgPyByZWY5Lm5hbWUgOiB2b2lkIDApICE9PSAocmVmOCA9IChyZWYxMCA9IHRoaXMuX3NocmVnWzFdKSAhPSBudWxsID8gcmVmMTAubmFtZSA6IHZvaWQgMCkgfHwgcmVmOCAhPT0gKHJlZjcgPSAocmVmMTEgPSB0aGlzLl9zaHJlZ1syXSkgIT0gbnVsbCA/IHJlZjExLm5hbWUgOiB2b2lkIDApKSB8fCByZWY3ICE9PSAoKHJlZjEyID0gdGhpcy5fc2hyZWdbM10pICE9IG51bGwgPyByZWYxMi5uYW1lIDogdm9pZCAwKSkpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBSID0gdGhpcy5fc2hyZWdbM10ubmFtZTtcbiAgICAgICAgcmV0dXJuIFI7XG4gICAgICB9XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBfaW5pdGlhbGl6ZV9sYXRjaGluZygpIHtcbiAgICAgICAgdmFyIHB1c2g7XG4gICAgICAgIGlmICh0aGlzLl9sYXRjaGluZ19pbml0aWFsaXplZCkge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2xhdGNoaW5nX2luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgcHVzaCA9IChkaXIsIGV2ZW50KSA9PiB7XG4gICAgICAgICAgdmFyIG5hbWU7XG4gICAgICAgICAgbmFtZSA9IGV2ZW50LmtleTtcbiAgICAgICAgICB0aGlzLl9zaHJlZy5wdXNoKHtcbiAgICAgICAgICAgIGRpcixcbiAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICB0OiBEYXRlLm5vdygpXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgd2hpbGUgKHRoaXMuX3NocmVnLmxlbmd0aCA+IDQpIHtcbiAgICAgICAgICAgIHRoaXMuX3NocmVnLnNoaWZ0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuICAgICAgICDCtS5ET00ub24oZG9jdW1lbnQsICdrZXlkb3duJywgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHB1c2goJ2Rvd24nLCBldmVudCk7XG4gICAgICAgIH0pO1xuICAgICAgICDCtS5ET00ub24oZG9jdW1lbnQsICdrZXl1cCcsIChldmVudCkgPT4ge1xuICAgICAgICAgIHJldHVybiBwdXNoKCd1cCcsIGV2ZW50KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgX2xpc3Rlbl90b19rZXlfcHVzaChrZXluYW1lLCBoYW5kbGVyKSB7XG4gICAgICAgIHZhciBiZWhhdmlvciwgc3RhdGU7XG4gICAgICAgIHN0YXRlID0gZmFsc2U7XG4gICAgICAgIGJlaGF2aW9yID0gJ3B1c2gnO1xuICAgICAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAgICAgwrUuRE9NLm9uKGRvY3VtZW50LCAna2V5ZG93bicsIChldmVudCkgPT4ge1xuICAgICAgICAgIGlmIChldmVudC5rZXkgIT09IGtleW5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzdGF0ZSA9IHRydWU7XG4gICAgICAgICAgaGFuZGxlcihmcmVlemUoe2tleW5hbWUsIGJlaGF2aW9yLCBzdGF0ZSwgZXZlbnR9KSk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0pO1xuICAgICAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAgICAgwrUuRE9NLm9uKGRvY3VtZW50LCAna2V5dXAnLCAoZXZlbnQpID0+IHtcbiAgICAgICAgICBpZiAoZXZlbnQua2V5ICE9PSBrZXluYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc3RhdGUgPSBmYWxzZTtcbiAgICAgICAgICBoYW5kbGVyKGZyZWV6ZSh7a2V5bmFtZSwgYmVoYXZpb3IsIHN0YXRlLCBldmVudH0pKTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIF9saXN0ZW5fdG9fa2V5X3RvZ2dsZShrZXluYW1lLCBoYW5kbGVyKSB7XG4gICAgICAgIHZhciBiZWhhdmlvciwgc2tpcF9uZXh0LCBzdGF0ZTtcbiAgICAgICAgc3RhdGUgPSBmYWxzZTtcbiAgICAgICAgYmVoYXZpb3IgPSAndG9nZ2xlJztcbiAgICAgICAgc2tpcF9uZXh0ID0gZmFsc2U7XG4gICAgICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgICAgICDCtS5ET00ub24oZG9jdW1lbnQsICdrZXlkb3duJywgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgaWYgKGV2ZW50LmtleSAhPT0ga2V5bmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzdGF0ZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHN0YXRlID0gdHJ1ZTtcbiAgICAgICAgICBza2lwX25leHQgPSB0cnVlO1xuICAgICAgICAgIC8vIGRlYnVnICdeX2xpc3Rlbl90b19rZXlAMjIzXicsICdrZXlkb3duJywgeyBrZXluYW1lLCBiZWhhdmlvciwgZW50cnksIH1cbiAgICAgICAgICBoYW5kbGVyKGZyZWV6ZSh7a2V5bmFtZSwgYmVoYXZpb3IsIHN0YXRlLCBldmVudH0pKTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgICAgICDCtS5ET00ub24oZG9jdW1lbnQsICdrZXl1cCcsIChldmVudCkgPT4ge1xuICAgICAgICAgIGlmIChldmVudC5rZXkgIT09IGtleW5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIXN0YXRlKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHNraXBfbmV4dCkge1xuICAgICAgICAgICAgc2tpcF9uZXh0ID0gZmFsc2U7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN0YXRlID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIGRlYnVnICdeX2xpc3Rlbl90b19rZXlAMjIzXicsICd0b2dnbGUva2V5dXAnLCB7IGtleW5hbWUsIGJlaGF2aW9yLCBlbnRyeSwgfVxuICAgICAgICAgIGhhbmRsZXIoZnJlZXplKHtrZXluYW1lLCBiZWhhdmlvciwgc3RhdGUsIGV2ZW50fSkpO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgX2xpc3Rlbl90b19rZXlfbGF0Y2goa2V5bmFtZSwgaGFuZGxlcikge1xuICAgICAgICB2YXIgYmVoYXZpb3IsIHN0YXRlO1xuICAgICAgICB0aGlzLl9pbml0aWFsaXplX2xhdGNoaW5nKCk7XG4gICAgICAgIHN0YXRlID0gZmFsc2U7XG4gICAgICAgIGJlaGF2aW9yID0gJ2xhdGNoJztcbiAgICAgICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgICAgIMK1LkRPTS5vbihkb2N1bWVudCwgJ2tleXVwJywgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgaWYgKGtleW5hbWUgPT09IHRoaXMuX2dldF9sYXRjaGluZ19rZXluYW1lKCkpIHtcbiAgICAgICAgICAgIHN0YXRlID0gIXN0YXRlO1xuICAgICAgICAgICAgaGFuZGxlcihmcmVlemUoe2tleW5hbWUsIGJlaGF2aW9yLCBzdGF0ZSwgZXZlbnR9KSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgX2xpc3Rlbl90b19rZXlfdGxhdGNoKGtleW5hbWUsIGhhbmRsZXIpIHtcbiAgICAgICAgdmFyIGJlaGF2aW9yLCBpc19sYXRjaGVkLCBzdGF0ZTtcbiAgICAgICAgc3RhdGUgPSBmYWxzZTtcbiAgICAgICAgYmVoYXZpb3IgPSAndGxhdGNoJztcbiAgICAgICAgaXNfbGF0Y2hlZCA9IGZhbHNlO1xuICAgICAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAgICAgdGhpcy5fbGlzdGVuX3RvX2tleShrZXluYW1lLCAnbGF0Y2gnLCAoZCkgPT4ge1xuICAgICAgICAgIHJldHVybiBpc19sYXRjaGVkID0gZC5zdGF0ZTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgICAgICDCtS5ET00ub24oZG9jdW1lbnQsICdrZXlkb3duJywgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgaWYgKGV2ZW50LmtleSAhPT0ga2V5bmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHN0YXRlID0gIWlzX2xhdGNoZWQ7XG4gICAgICAgICAgaGFuZGxlcihmcmVlemUoe2tleW5hbWUsIGJlaGF2aW9yLCBzdGF0ZSwgZXZlbnR9KSk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0pO1xuICAgICAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAgICAgwrUuRE9NLm9uKGRvY3VtZW50LCAna2V5dXAnLCAoZXZlbnQpID0+IHtcbiAgICAgICAgICBpZiAoZXZlbnQua2V5ICE9PSBrZXluYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc3RhdGUgPSBpc19sYXRjaGVkO1xuICAgICAgICAgIGhhbmRsZXIoZnJlZXplKHtrZXluYW1lLCBiZWhhdmlvciwgc3RhdGUsIGV2ZW50fSkpO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgX2xpc3Rlbl90b19rZXlfcHRsYXRjaChrZXluYW1lLCBoYW5kbGVyKSB7XG4gICAgICAgIHZhciBiZWhhdmlvciwgaXNfbGF0Y2hlZCwgc3RhdGU7XG4gICAgICAgIHN0YXRlID0gZmFsc2U7XG4gICAgICAgIGJlaGF2aW9yID0gJ3B0bGF0Y2gnO1xuICAgICAgICBpc19sYXRjaGVkID0gZmFsc2U7XG4gICAgICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgICAgICB0aGlzLl9saXN0ZW5fdG9fa2V5KGtleW5hbWUsICdsYXRjaCcsIChkKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGlzX2xhdGNoZWQgPSBkLnN0YXRlO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgICAgIMK1LkRPTS5vbihkb2N1bWVudCwgJ2tleWRvd24nLCAoZXZlbnQpID0+IHtcbiAgICAgICAgICBpZiAoZXZlbnQua2V5ICE9PSBrZXluYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGlzX2xhdGNoZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzdGF0ZSA9IHRydWU7XG4gICAgICAgICAgaGFuZGxlcihmcmVlemUoe2tleW5hbWUsIGJlaGF2aW9yLCBzdGF0ZSwgZXZlbnR9KSk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0pO1xuICAgICAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAgICAgwrUuRE9NLm9uKGRvY3VtZW50LCAna2V5dXAnLCAoZXZlbnQpID0+IHtcbiAgICAgICAgICBpZiAoZXZlbnQua2V5ICE9PSBrZXluYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGlzX2xhdGNoZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzdGF0ZSA9IGZhbHNlO1xuICAgICAgICAgIGhhbmRsZXIoZnJlZXplKHtrZXluYW1lLCBiZWhhdmlvciwgc3RhdGUsIGV2ZW50fSkpO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgX2xpc3Rlbl90b19rZXlfbnRsYXRjaChrZXluYW1lLCBoYW5kbGVyKSB7XG4gICAgICAgIHZhciBiZWhhdmlvciwgaXNfbGF0Y2hlZCwgc3RhdGU7XG4gICAgICAgIHN0YXRlID0gZmFsc2U7XG4gICAgICAgIGJlaGF2aW9yID0gJ250bGF0Y2gnO1xuICAgICAgICBpc19sYXRjaGVkID0gZmFsc2U7XG4gICAgICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgICAgICB0aGlzLl9saXN0ZW5fdG9fa2V5KGtleW5hbWUsICdsYXRjaCcsIChkKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGlzX2xhdGNoZWQgPSBkLnN0YXRlO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgICAgIMK1LkRPTS5vbihkb2N1bWVudCwgJ2tleWRvd24nLCAoZXZlbnQpID0+IHtcbiAgICAgICAgICBpZiAoZXZlbnQua2V5ICE9PSBrZXluYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFpc19sYXRjaGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc3RhdGUgPSBmYWxzZTtcbiAgICAgICAgICBoYW5kbGVyKGZyZWV6ZSh7a2V5bmFtZSwgYmVoYXZpb3IsIHN0YXRlLCBldmVudH0pKTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgICAgICDCtS5ET00ub24oZG9jdW1lbnQsICdrZXl1cCcsIChldmVudCkgPT4ge1xuICAgICAgICAgIGlmIChldmVudC5rZXkgIT09IGtleW5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWlzX2xhdGNoZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzdGF0ZSA9IHRydWU7XG4gICAgICAgICAgaGFuZGxlcihmcmVlemUoe2tleW5hbWUsIGJlaGF2aW9yLCBzdGF0ZSwgZXZlbnR9KSk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0pO1xuICAgICAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIF9oYW5kbGVyX2Zyb21fd2F0Y2hlcih3YXRjaGVyKSB7XG4gICAgICAgIGJvdW5kTWV0aG9kQ2hlY2sodGhpcywgcmVmKTtcbiAgICAgICAgLyogVEFJTlQgY291bGQgdXNlIHNpbmdsZSBmdW5jdGlvbiBmb3IgYWxsIGhhbmRsZXJzIHRoYXQgZW1pdCB0aGUgc2FtZSBldmVudCAqL1xuICAgICAgICB2YWxpZGF0ZS5rYl93YXRjaGVyKHdhdGNoZXIpO1xuICAgICAgICBpZiAoaXNhLmZ1bmN0aW9uKHdhdGNoZXIpKSB7XG4gICAgICAgICAgcmV0dXJuIHdhdGNoZXI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICByZXR1cm4gwrUuRE9NLmVtaXRfY3VzdG9tX2V2ZW50KHdhdGNoZXIsIHtcbiAgICAgICAgICAgIGRldGFpbDogZFxuICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICBfbGlzdGVuX3RvX2tleShrZXluYW1lLCBiZWhhdmlvciwgd2F0Y2hlcikge1xuICAgICAgICB2YXIgaGFuZGxlcjtcbiAgICAgICAgYm91bmRNZXRob2RDaGVjayh0aGlzLCByZWYpO1xuICAgICAgICBpZiAoa2V5bmFtZSA9PT0gJ1NwYWNlJykge1xuICAgICAgICAgIGtleW5hbWUgPSAnICc7XG4gICAgICAgIH1cbiAgICAgICAgdmFsaWRhdGUua2Jfa2V5bmFtZShrZXluYW1lKTtcbiAgICAgICAgdmFsaWRhdGUua2Jfa2V5dHlwZShiZWhhdmlvcik7XG4gICAgICAgIGhhbmRsZXIgPSB0aGlzLl9oYW5kbGVyX2Zyb21fd2F0Y2hlcih3YXRjaGVyKTtcbiAgICAgICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgICAgIHN3aXRjaCAoYmVoYXZpb3IpIHtcbiAgICAgICAgICBjYXNlICdwdXNoJzpcbiAgICAgICAgICAgIHRoaXMuX2xpc3Rlbl90b19rZXlfcHVzaChrZXluYW1lLCBoYW5kbGVyKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ3RvZ2dsZSc6XG4gICAgICAgICAgICB0aGlzLl9saXN0ZW5fdG9fa2V5X3RvZ2dsZShrZXluYW1lLCBoYW5kbGVyKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ2xhdGNoJzpcbiAgICAgICAgICAgIHRoaXMuX2xpc3Rlbl90b19rZXlfbGF0Y2goa2V5bmFtZSwgaGFuZGxlcik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICd0bGF0Y2gnOlxuICAgICAgICAgICAgdGhpcy5fbGlzdGVuX3RvX2tleV90bGF0Y2goa2V5bmFtZSwgaGFuZGxlcik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdudGxhdGNoJzpcbiAgICAgICAgICAgIHRoaXMuX2xpc3Rlbl90b19rZXlfbnRsYXRjaChrZXluYW1lLCBoYW5kbGVyKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ3B0bGF0Y2gnOlxuICAgICAgICAgICAgdGhpcy5fbGlzdGVuX3RvX2tleV9wdGxhdGNoKGtleW5hbWUsIGhhbmRsZXIpO1xuICAgICAgICB9XG4gICAgICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgICAgICByZXR1cm4gbnVsbC8qIE5PVEUgbWF5IHJldHVybiBhIGByZW1vdmVfbGlzdGVuZXJgIG1ldGhvZCBJVEYgKi87XG4gICAgICB9XG5cbiAgICAgIF9saXN0ZW5fdG9fbW9kaWZpZXJzKHdhdGNoZXIgPSBudWxsKSB7XG4gICAgICAgIHZhciBldmVudG5hbWUsIGhhbmRsZV9rYmxpa2VfZXZlbnQsIGhhbmRsZXIsIGksIGxlbiwgcmVmMTtcbiAgICAgICAgYm91bmRNZXRob2RDaGVjayh0aGlzLCByZWYpO1xuICAgICAgICBpZiAod2F0Y2hlciAhPSBudWxsKSB7XG4gICAgICAgICAgaGFuZGxlciA9IHRoaXMuX2hhbmRsZXJfZnJvbV93YXRjaGVyKHdhdGNoZXIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGhhbmRsZXIgPSB0aGlzLl9lbWl0X21ibWNkX2tleV9ldmVudHM7XG4gICAgICAgIH1cbiAgICAgICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgICAgIGhhbmRsZV9rYmxpa2VfZXZlbnQgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgICB2YXIgbW9kaWZpZXJfc3RhdGU7XG4gICAgICAgICAgbW9kaWZpZXJfc3RhdGUgPSB0aGlzLmdldF9jaGFuZ2VkX2tiX21vZGlmaWVyX3N0YXRlKGV2ZW50KTtcbiAgICAgICAgICBpZiAobW9kaWZpZXJfc3RhdGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgIGhhbmRsZXIobW9kaWZpZXJfc3RhdGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLl9zZXRfY2Fwc2xvY2tfc3RhdGUoZXZlbnQuZ2V0TW9kaWZpZXJTdGF0ZSgnQ2Fwc0xvY2snKSk7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH07XG4gICAgICAgIHJlZjEgPSB0aGlzLmNmZy5rYmxpa2VfZXZlbnRuYW1lcztcbiAgICAgICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgICAgIGZvciAoaSA9IDAsIGxlbiA9IHJlZjEubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICBldmVudG5hbWUgPSByZWYxW2ldO1xuICAgICAgICAgIMK1LkRPTS5vbihkb2N1bWVudCwgZXZlbnRuYW1lLCBoYW5kbGVfa2JsaWtlX2V2ZW50KTtcbiAgICAgICAgfVxuICAgICAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAgICAgwrUuRE9NLm9uKGRvY3VtZW50LCAna2V5ZG93bicsIChldmVudCkgPT4ge1xuICAgICAgICAgIC8vIGhhbmRsZV9rYmxpa2VfZXZlbnQgZXZlbnQgIyMjICEhISEhISEhISEhISEhISEhISEhISEgIyMjXG4gICAgICAgICAgLyogVEFJTlQgbG9naWMgaXMgcXVlc3Rpb25hYmxlICovXG4gICAgICAgICAgaWYgKGV2ZW50LmtleSA9PT0gJ0NhcHNMb2NrJykge1xuICAgICAgICAgICAgdGhpcy5fc2V0X2NhcHNsb2NrX3N0YXRlKCF0aGlzLl9jYXBzbG9ja19hY3RpdmUpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9zZXRfY2Fwc2xvY2tfc3RhdGUoZXZlbnQuZ2V0TW9kaWZpZXJTdGF0ZSgnQ2Fwc0xvY2snKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgICAgIMK1LkRPTS5vbihkb2N1bWVudCwgJ2tleXVwJywgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgaWYgKGV2ZW50LmtleSA9PT0gJ0NhcHNMb2NrJykge1xuICAgICAgICAgICAgLy8gaGFuZGxlX2tibGlrZV9ldmVudCBldmVudCAjIyMgISEhISEhISEhISEhISEhISEhISEhISAjIyNcbiAgICAgICAgICAgIC8qIFRBSU5UIGxvZ2ljIGlzIHF1ZXN0aW9uYWJsZSAqL1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMuX3NldF9jYXBzbG9ja19zdGF0ZShldmVudC5nZXRNb2RpZmllclN0YXRlKCdDYXBzTG9jaycpKTtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBfZW1pdF9tYm1jZF9rZXlfZXZlbnRzKGQpIHtcbiAgICAgICAgdmFyIGV2ZW50bmFtZSwga2V5LCBzdGF0ZTtcbiAgICAgICAgYm91bmRNZXRob2RDaGVjayh0aGlzLCByZWYpO1xuLyogQWNjZXB0cyBhbiBvYmplY3Qgd2l0aCBtb2RpZmllciBuYW1lcyBhcyBrZXlzLCBib29sZWFucyBhcyB2YWx1ZXM7IHdpbGwgZW1pdCBga2V5ZG93bmAsIGBrZXl1cGBcbiAgIGV2ZW50cyBhcyBuZWVkZWQuICovXG4vKiBUQUlOVCBvbmx5IGl0ZXJhdGUgb3ZlciBtb2RpZmllciBuYW1lcz8gKi9cbiAgICAgICAgZm9yIChrZXkgaW4gZCkge1xuICAgICAgICAgIHN0YXRlID0gZFtrZXldO1xuICAgICAgICAgIGlmIChrZXkgPT09ICdfdHlwZScpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBldmVudG5hbWUgPSBzdGF0ZSA/ICdrZXlkb3duJyA6ICdrZXl1cCc7XG4gICAgICAgICAgZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgS2V5Ym9hcmRFdmVudChldmVudG5hbWUsIHtrZXl9KSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICB9O1xuXG4gICAgLy8gIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vIF9kZWZhdWx0czogZnJlZXplIHtcbiAgICAvLyAgIHN0YXRlOiBmcmVlemUgeyBkb3duOiBmYWxzZSwgdXA6IGZhbHNlLCB0b2dnbGU6IGZhbHNlLCBsYXRjaDogZmFsc2UsIHRsYXRjaDogZmFsc2UsIH1cbiAgICAvLyAgIH1cblxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgS2IucHJvdG90eXBlLl9zaHJlZyA9IFtdO1xuXG4gICAgS2IucHJvdG90eXBlLl9sYXRjaGluZ19pbml0aWFsaXplZCA9IGZhbHNlO1xuXG4gICAgcmV0dXJuIEtiO1xuXG4gIH0pLmNhbGwodGhpcyk7XG5cbn0pLmNhbGwodGhpcyk7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWtiLmpzLm1hcCIsIihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICB2YXIgU2x1ZywgVFU7XG5cbiAgVFUgPSByZXF1aXJlKCcuLi9kZXBzL3RyYXZlcnNlX3V0aWwuanMnKTtcblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIFNsdWcgPSBjbGFzcyBTbHVnIHtcbiAgICBjb25zdHJ1Y3Rvcih7bGxuciwgcmxuciwgbm9kZSwgcmVjdGFuZ2xlfSkge1xuICAgICAgdGhpcy5sbG5yID0gbGxucjtcbiAgICAgIHRoaXMucmxuciA9IHJsbnI7XG4gICAgICB0aGlzLm5vZGUgPSBub2RlO1xuICAgICAgdGhpcy5yZWN0YW5nbGUgPSByZWN0YW5nbGU7XG4gICAgICByZXR1cm4gdm9pZCAwO1xuICAgIH1cblxuICB9O1xuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgdGhpcy5MaW5lZmluZGVyID0gY2xhc3MgTGluZWZpbmRlciB7XG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBjb25zdHJ1Y3RvcihjZmcpIHtcbiAgICAgIC8qIFRBSU5UIHVzZSBpbnRlcnR5cGUgKi9cbiAgICAgIHZhciBkZWZhdWx0cztcbiAgICAgIGRlZmF1bHRzID0ge1xuICAgICAgICBib3hfZWxlbWVudF9uYW1lOiAnZGl2JyxcbiAgICAgICAgYm94X2NsYXNzX25hbWU6ICdib3gnLFxuICAgICAgICB4eHhfaGVpZ2h0X2ZhY3RvcjogMSAvIDJcbiAgICAgIH07XG4gICAgICB0aGlzLi8qIHJlbGF0aXZlIG1pbmltdW0gaGVpZ2h0IHRvIHJlY29nbml6ZSBsaW5lIHN0ZXAgKi9jZmcgPSBPYmplY3QuZnJlZXplKHsuLi5kZWZhdWx0cywgLi4uY2ZnfSk7XG4gICAgICByZXR1cm4gdm9pZCAwO1xuICAgIH1cblxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgZHJhd19ib3gocmVjdGFuZ2xlKSB7XG4gICAgICB2YXIgYm94O1xuICAgICAgYm94ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0aGlzLmNmZy5ib3hfZWxlbWVudF9uYW1lKTtcbiAgICAgIGJveC5zdHlsZS50b3AgPSByZWN0YW5nbGUudG9wICsgJ3B4JztcbiAgICAgIGJveC5zdHlsZS5sZWZ0ID0gcmVjdGFuZ2xlLmxlZnQgKyAncHgnO1xuICAgICAgYm94LnN0eWxlLndpZHRoID0gcmVjdGFuZ2xlLndpZHRoIC0gMSArICdweCc7IC8vIGNvbGxhcHNlIGJvcmRlcnNcbiAgICAgIGJveC5zdHlsZS5oZWlnaHQgPSByZWN0YW5nbGUuaGVpZ2h0ICsgJ3B4JztcbiAgICAgIGJveC5jbGFzc0xpc3QuYWRkKHRoaXMuY2ZnLmJveF9jbGFzc19uYW1lKTtcbiAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYm94KTtcbiAgICAgIHJldHVybiBib3g7XG4gICAgfVxuXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICB4eHhfZHJhd19saW5lX2NvdmVyKHJlY3RhbmdsZSkge1xuICAgICAgdmFyIGJveDtcbiAgICAgIGJveCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGhpcy5jZmcuYm94X2VsZW1lbnRfbmFtZSk7XG4gICAgICBib3guc3R5bGUudG9wID0gcmVjdGFuZ2xlLnRvcCArICdweCc7XG4gICAgICBib3guc3R5bGUubGVmdCA9IHJlY3RhbmdsZS5sZWZ0ICsgJ3B4JztcbiAgICAgIGJveC5zdHlsZS53aWR0aCA9IHJlY3RhbmdsZS53aWR0aCAtIDEgKyAncHgnOyAvLyBjb2xsYXBzZSBib3JkZXJzXG4gICAgICBib3guc3R5bGUuaGVpZ2h0ID0gcmVjdGFuZ2xlLmhlaWdodCArICdweCc7XG4gICAgICBib3guY2xhc3NMaXN0LmFkZCh0aGlzLmNmZy5ib3hfY2xhc3NfbmFtZSk7XG4gICAgICBib3guY2xhc3NMaXN0LmFkZCgnY292ZXInKTtcbiAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYm94KTtcbiAgICAgIHJldHVybiBib3g7XG4gICAgfVxuXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBfZ2V0X25leHRfY2hyX3JlY3RhbmdsZXMobm9kZSwgYzEsIGMyKSB7XG4gICAgICB2YXIgcmFuZ2UsIHNlbGVjdGlvbjtcbiAgICAgIFRVLlRyYXZlcnNlVXRpbC5nZXROZXh0Q2hhcihjMSwgYzIsIFtdLCBmYWxzZSk7XG4gICAgICBzZWxlY3Rpb24gPSBUVS5UcmF2ZXJzZVV0aWwuc2V0U2VsZWN0aW9uKGMxLCBjMik7XG4gICAgICByYW5nZSA9IHNlbGVjdGlvbi5nZXRSYW5nZUF0KDApO1xuICAgICAgaWYgKCFub2RlLmNvbnRhaW5zKHJhbmdlLnN0YXJ0Q29udGFpbmVyLnBhcmVudE5vZGUpKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgaWYgKCFub2RlLmNvbnRhaW5zKHJhbmdlLmVuZENvbnRhaW5lci5wYXJlbnROb2RlKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIHJldHVybiByYW5nZS5nZXRDbGllbnRSZWN0cygpO1xuICAgIH1cblxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgKiB3YWxrX2Nocl9yZWN0YW5nbGVzX29mX25vZGUobm9kZSkge1xuICAgICAgdmFyIGMxLCBjMiwgcmVjdGFuZ2xlLCByZWN0YW5nbGVzLCB0ZXh0X25vZGU7XG4gICAgICB0ZXh0X25vZGUgPSBub2RlLmNoaWxkTm9kZXNbMF07XG4gICAgICBjMSA9IG5ldyBUVS5DdXJzb3IodGV4dF9ub2RlLCAwLCB0ZXh0X25vZGUuZGF0YSk7XG4gICAgICBjMiA9IG5ldyBUVS5DdXJzb3IodGV4dF9ub2RlLCAwLCB0ZXh0X25vZGUuZGF0YSk7XG4gICAgICBUVS5UcmF2ZXJzZVV0aWwuc2V0U2VsZWN0aW9uKGMxLCBjMik7XG4gICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICByZWN0YW5nbGVzID0gdGhpcy5fZ2V0X25leHRfY2hyX3JlY3RhbmdsZXMobm9kZSwgYzEsIGMyKTtcbiAgICAgICAgaWYgKHJlY3RhbmdsZXMgPT0gbnVsbCkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGZvciAocmVjdGFuZ2xlIG9mIHJlY3RhbmdsZXMpIHtcbiAgICAgICAgICB5aWVsZCBuZXcgRE9NUmVjdChyZWN0YW5nbGUubGVmdCArIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxMZWZ0LCByZWN0YW5nbGUudG9wICsgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcCwgcmVjdGFuZ2xlLndpZHRoLCByZWN0YW5nbGUuaGVpZ2h0KTsgLy8gbGVmdCAvLyB0b3AgLy8gd2lkdGggLy8gaGVpZ2h0XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgX3Jlc2V0X2xpbmVfd2Fsa2VyKHMpIHtcbiAgICAgIHMubWluX3RvcCA9ICsyZTMwODtcbiAgICAgIHMubWF4X2JvdHRvbSA9IC0yZTMwODtcbiAgICAgIHMubWluX2xlZnQgPSArMmUzMDg7XG4gICAgICBzLm1heF9yaWdodCA9IC0yZTMwODtcbiAgICAgIHMuYXZnX2hlaWdodCA9IDA7XG4gICAgICBzLmF2Z19ib3R0b20gPSAwO1xuICAgICAgcy5jb3VudCA9IDA7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICogd2Fsa19saW5lX3JlY3RhbmdsZXNfb2Zfbm9kZShub2RlKSB7XG4gICAgICB2YXIgcmVjdGFuZ2xlLCByZWYsIHM7XG4gICAgICB0aGlzLl9yZXNldF9saW5lX3dhbGtlcihzID0ge30pO1xuICAgICAgcmVmID0gdGhpcy53YWxrX2Nocl9yZWN0YW5nbGVzX29mX25vZGUobm9kZSk7XG4gICAgICBmb3IgKHJlY3RhbmdsZSBvZiByZWYpIHtcbiAgICAgICAgaWYgKHMuY291bnQgPiAwICYmIHJlY3RhbmdsZS5ib3R0b20gLSBzLmF2Z19ib3R0b20gPiBzLmF2Z19oZWlnaHQgKiB0aGlzLmNmZy54eHhfaGVpZ2h0X2ZhY3Rvcikge1xuICAgICAgICAgIHlpZWxkIG5ldyBET01SZWN0KHMubWluX2xlZnQsIHMubWluX3RvcCwgcy5tYXhfcmlnaHQgLSBzLm1pbl9sZWZ0LCBzLm1heF9ib3R0b20gLSBzLm1pbl90b3ApOyAvLyBsZWZ0IC8vIHRvcCAvLyB3aWR0aCAvLyBoZWlnaHRcbiAgICAgICAgICB0aGlzLl9yZXNldF9saW5lX3dhbGtlcihzKTtcbiAgICAgICAgfVxuICAgICAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAgICAgLy8gZHJhd19ib3ggcmVjdGFuZ2xlXG4gICAgICAgIHMuY291bnQrKztcbiAgICAgICAgcy5taW5fdG9wID0gTWF0aC5taW4ocy5taW5fdG9wLCByZWN0YW5nbGUudG9wKTtcbiAgICAgICAgcy5tYXhfYm90dG9tID0gTWF0aC5tYXgocy5tYXhfYm90dG9tLCByZWN0YW5nbGUuYm90dG9tKTtcbiAgICAgICAgcy5taW5fbGVmdCA9IE1hdGgubWluKHMubWluX2xlZnQsIHJlY3RhbmdsZS5sZWZ0KTtcbiAgICAgICAgcy5tYXhfcmlnaHQgPSBNYXRoLm1heChzLm1heF9yaWdodCwgcmVjdGFuZ2xlLnJpZ2h0KTtcbiAgICAgICAgcy5hdmdfaGVpZ2h0ID0gKHMuYXZnX2hlaWdodCAqIChzLmNvdW50IC0gMSkgLyBzLmNvdW50KSArIChyZWN0YW5nbGUuaGVpZ2h0ICogMSAvIHMuY291bnQpO1xuICAgICAgICBzLmF2Z19ib3R0b20gPSAocy5hdmdfYm90dG9tICogKHMuY291bnQgLSAxKSAvIHMuY291bnQpICsgKHJlY3RhbmdsZS5ib3R0b20gKiAxIC8gcy5jb3VudCk7XG4gICAgICB9XG4gICAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgICAgaWYgKHMuY291bnQgPiAwKSB7XG4gICAgICAgIHlpZWxkIG5ldyBET01SZWN0KHMubWluX2xlZnQsIHMubWluX3RvcCwgcy5tYXhfcmlnaHQgLSBzLm1pbl9sZWZ0LCBzLm1heF9ib3R0b20gLSBzLm1pbl90b3ApOyAvLyBsZWZ0IC8vIHRvcCAvLyB3aWR0aCAvLyBoZWlnaHRcbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgKiB3YWxrX3NsdWdzX29mX25vZGUobm9kZSkge1xuICAgICAgdmFyIGksIGlkeCwgbGVuLCBsaW5lX2NvdW50LCBsbG5yLCByZWN0YW5nbGUsIHJlY3RhbmdsZXMsIHJsbnI7XG4gICAgICByZWN0YW5nbGVzID0gWy4uLih0aGlzLndhbGtfbGluZV9yZWN0YW5nbGVzX29mX25vZGUobm9kZSkpXTtcbiAgICAgIGxpbmVfY291bnQgPSByZWN0YW5nbGVzLmxlbmd0aDtcbiAgICAgIGZvciAoaWR4ID0gaSA9IDAsIGxlbiA9IHJlY3RhbmdsZXMubGVuZ3RoOyBpIDwgbGVuOyBpZHggPSArK2kpIHtcbiAgICAgICAgcmVjdGFuZ2xlID0gcmVjdGFuZ2xlc1tpZHhdO1xuICAgICAgICBsbG5yID0gaWR4ICsgMTtcbiAgICAgICAgcmxuciA9IGxpbmVfY291bnQgLSBpZHg7XG4gICAgICAgIHlpZWxkIG5ldyBTbHVnKHtsbG5yLCBybG5yLCBub2RlLCByZWN0YW5nbGV9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICB9O1xuXG59KS5jYWxsKHRoaXMpO1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1saW5lZmluZGVyLmpzLm1hcCIsIihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICB0aGlzLnR5cGVzID0gbmV3IChyZXF1aXJlKCdpbnRlcnR5cGUnKSkuSW50ZXJ0eXBlKCk7XG5cbiAgT2JqZWN0LmFzc2lnbih0aGlzLCB0aGlzLnR5cGVzLmV4cG9ydCgpKTtcblxuICAvLyAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gQGRlY2xhcmUgJ2tiX2tleXR5cGVzJywgdGVzdHM6XG4gIC8vICAgXCJ4IGlzIGEgbGlzdCBvZiBrYl9rZXl0eXBlXCI6ICAgICAoIHggKSAtPiBAaXNhLmxpc3Rfb2YgJ2tiX2tleXR5cGUnLCB4XG4gIC8vICAgXCJ4IGlzIG5vdCBlbXB0eVwiOiAgICAgICAgICAgICAgICAgICAoIHggKSAtPiBub3QgQGlzYS5lbXB0eSB4XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB0aGlzLmRlY2xhcmUoJ2tiX2tleXR5cGUnLCB7XG4gICAgdGVzdHM6IHtcbiAgICAgIFwieCBpcyBvbmUgb2YgJ3RvZ2dsZScsICdsYXRjaCcsICd0bGF0Y2gnLCAncHRsYXRjaCcsICdudGxhdGNoJywgJ3B1c2gnXCI6IGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgcmV0dXJuIHggPT09ICd0b2dnbGUnIHx8IHggPT09ICdsYXRjaCcgfHwgeCA9PT0gJ3RsYXRjaCcgfHwgeCA9PT0gJ3B0bGF0Y2gnIHx8IHggPT09ICdudGxhdGNoJyB8fCB4ID09PSAncHVzaCc7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICAvLyAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gQGRlY2xhcmUgJ2tiX2tleW5hbWVzJywgdGVzdHM6XG4gIC8vICAgXCJ4IGlzIGEgbGlzdCBvZiBrYl9rZXluYW1lXCI6ICAoIHggKSAtPiBAaXNhLmxpc3Rfb2YgJ2tiX2tleW5hbWUnLCB4XG4gIC8vICAgXCJ4IGlzIG5vdCBlbXB0eVwiOiAgICAgICAgICAgICAgICAgICAoIHggKSAtPiBub3QgQGlzYS5lbXB0eSB4XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB0aGlzLmRlY2xhcmUoJ2tiX2tleW5hbWUnLCB7XG4gICAgdGVzdHM6IHtcbiAgICAgIFwieCBpcyBhIG5vbmVtcHR5X3RleHRcIjogZnVuY3Rpb24oeCkge1xuICAgICAgICByZXR1cm4gdGhpcy5pc2Eubm9uZW1wdHlfdGV4dCh4KTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgdGhpcy5kZWNsYXJlKCdrYl93YXRjaGVyJywge1xuICAgIHRlc3RzOiB7XG4gICAgICBcInggaXMgYSBmdW5jdGlvbiBvciBhIG5vbmVtcHR5X3RleHRcIjogZnVuY3Rpb24oeCkge1xuICAgICAgICByZXR1cm4gKHRoaXMuaXNhLmZ1bmN0aW9uKHgpKSB8fCAodGhpcy5pc2Eubm9uZW1wdHlfdGV4dCh4KSk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8qIFRBSU5UIHByb2JhYmx5IG5vdCBjb3JyZWN0IHRvIG9ubHkgY2hlY2sgZm9yIEVsZW1lbnQsIGF0IGxlYXN0IGluIHNvbWUgY2FzZXMgY291bGQgYmUgTm9kZSBhcyB3ZWxsICovXG4gIHRoaXMuZGVjbGFyZSgnZGVsZW1lbnQnLCBmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuICh4ID09PSBkb2N1bWVudCkgfHwgKHggaW5zdGFuY2VvZiBFbGVtZW50KTtcbiAgfSk7XG5cbiAgdGhpcy5kZWNsYXJlKCdlbGVtZW50JywgZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiB4IGluc3RhbmNlb2YgRWxlbWVudDtcbiAgfSk7XG5cbn0pLmNhbGwodGhpcyk7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXR5cGVzLmpzLm1hcCIsIihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG5cdHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IGZhY3RvcnkoZXhwb3J0cykgOlxuXHR0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUoWydleHBvcnRzJ10sIGZhY3RvcnkpIDpcblx0KGdsb2JhbCA9IGdsb2JhbCB8fCBzZWxmLCBmYWN0b3J5KGdsb2JhbC5sb3VwZSA9IHt9KSk7XG59KHRoaXMsIChmdW5jdGlvbiAoZXhwb3J0cykgeyAndXNlIHN0cmljdCc7XG5cblx0dmFyIGNvbW1vbmpzR2xvYmFsID0gdHlwZW9mIGdsb2JhbFRoaXMgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsVGhpcyA6IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDogdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcgPyBzZWxmIDoge307XG5cblx0ZnVuY3Rpb24gY3JlYXRlQ29tbW9uanNNb2R1bGUoZm4sIG1vZHVsZSkge1xuXHRcdHJldHVybiBtb2R1bGUgPSB7IGV4cG9ydHM6IHt9IH0sIGZuKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMpLCBtb2R1bGUuZXhwb3J0cztcblx0fVxuXG5cdHZhciB0eXBlRGV0ZWN0ID0gY3JlYXRlQ29tbW9uanNNb2R1bGUoZnVuY3Rpb24gKG1vZHVsZSwgZXhwb3J0cykge1xuXHQoZnVuY3Rpb24gKGdsb2JhbCwgZmFjdG9yeSkge1xuXHRcdCBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKSA7XG5cdH0oY29tbW9uanNHbG9iYWwsIChmdW5jdGlvbiAoKSB7XG5cdC8qICFcblx0ICogdHlwZS1kZXRlY3Rcblx0ICogQ29weXJpZ2h0KGMpIDIwMTMgamFrZSBsdWVyIDxqYWtlQGFsb2dpY2FscGFyYWRveC5jb20+XG5cdCAqIE1JVCBMaWNlbnNlZFxuXHQgKi9cblx0dmFyIHByb21pc2VFeGlzdHMgPSB0eXBlb2YgUHJvbWlzZSA9PT0gJ2Z1bmN0aW9uJztcblxuXHQvKiBlc2xpbnQtZGlzYWJsZSBuby11bmRlZiAqL1xuXHR2YXIgZ2xvYmFsT2JqZWN0ID0gdHlwZW9mIHNlbGYgPT09ICdvYmplY3QnID8gc2VsZiA6IGNvbW1vbmpzR2xvYmFsOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGlkLWJsYWNrbGlzdFxuXG5cdHZhciBzeW1ib2xFeGlzdHMgPSB0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJztcblx0dmFyIG1hcEV4aXN0cyA9IHR5cGVvZiBNYXAgIT09ICd1bmRlZmluZWQnO1xuXHR2YXIgc2V0RXhpc3RzID0gdHlwZW9mIFNldCAhPT0gJ3VuZGVmaW5lZCc7XG5cdHZhciB3ZWFrTWFwRXhpc3RzID0gdHlwZW9mIFdlYWtNYXAgIT09ICd1bmRlZmluZWQnO1xuXHR2YXIgd2Vha1NldEV4aXN0cyA9IHR5cGVvZiBXZWFrU2V0ICE9PSAndW5kZWZpbmVkJztcblx0dmFyIGRhdGFWaWV3RXhpc3RzID0gdHlwZW9mIERhdGFWaWV3ICE9PSAndW5kZWZpbmVkJztcblx0dmFyIHN5bWJvbEl0ZXJhdG9yRXhpc3RzID0gc3ltYm9sRXhpc3RzICYmIHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgIT09ICd1bmRlZmluZWQnO1xuXHR2YXIgc3ltYm9sVG9TdHJpbmdUYWdFeGlzdHMgPSBzeW1ib2xFeGlzdHMgJiYgdHlwZW9mIFN5bWJvbC50b1N0cmluZ1RhZyAhPT0gJ3VuZGVmaW5lZCc7XG5cdHZhciBzZXRFbnRyaWVzRXhpc3RzID0gc2V0RXhpc3RzICYmIHR5cGVvZiBTZXQucHJvdG90eXBlLmVudHJpZXMgPT09ICdmdW5jdGlvbic7XG5cdHZhciBtYXBFbnRyaWVzRXhpc3RzID0gbWFwRXhpc3RzICYmIHR5cGVvZiBNYXAucHJvdG90eXBlLmVudHJpZXMgPT09ICdmdW5jdGlvbic7XG5cdHZhciBzZXRJdGVyYXRvclByb3RvdHlwZSA9IHNldEVudHJpZXNFeGlzdHMgJiYgT2JqZWN0LmdldFByb3RvdHlwZU9mKG5ldyBTZXQoKS5lbnRyaWVzKCkpO1xuXHR2YXIgbWFwSXRlcmF0b3JQcm90b3R5cGUgPSBtYXBFbnRyaWVzRXhpc3RzICYmIE9iamVjdC5nZXRQcm90b3R5cGVPZihuZXcgTWFwKCkuZW50cmllcygpKTtcblx0dmFyIGFycmF5SXRlcmF0b3JFeGlzdHMgPSBzeW1ib2xJdGVyYXRvckV4aXN0cyAmJiB0eXBlb2YgQXJyYXkucHJvdG90eXBlW1N5bWJvbC5pdGVyYXRvcl0gPT09ICdmdW5jdGlvbic7XG5cdHZhciBhcnJheUl0ZXJhdG9yUHJvdG90eXBlID0gYXJyYXlJdGVyYXRvckV4aXN0cyAmJiBPYmplY3QuZ2V0UHJvdG90eXBlT2YoW11bU3ltYm9sLml0ZXJhdG9yXSgpKTtcblx0dmFyIHN0cmluZ0l0ZXJhdG9yRXhpc3RzID0gc3ltYm9sSXRlcmF0b3JFeGlzdHMgJiYgdHlwZW9mIFN0cmluZy5wcm90b3R5cGVbU3ltYm9sLml0ZXJhdG9yXSA9PT0gJ2Z1bmN0aW9uJztcblx0dmFyIHN0cmluZ0l0ZXJhdG9yUHJvdG90eXBlID0gc3RyaW5nSXRlcmF0b3JFeGlzdHMgJiYgT2JqZWN0LmdldFByb3RvdHlwZU9mKCcnW1N5bWJvbC5pdGVyYXRvcl0oKSk7XG5cdHZhciB0b1N0cmluZ0xlZnRTbGljZUxlbmd0aCA9IDg7XG5cdHZhciB0b1N0cmluZ1JpZ2h0U2xpY2VMZW5ndGggPSAtMTtcblx0LyoqXG5cdCAqICMjIyB0eXBlT2YgKG9iailcblx0ICpcblx0ICogVXNlcyBgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZ2AgdG8gZGV0ZXJtaW5lIHRoZSB0eXBlIG9mIGFuIG9iamVjdCxcblx0ICogbm9ybWFsaXNpbmcgYmVoYXZpb3VyIGFjcm9zcyBlbmdpbmUgdmVyc2lvbnMgJiB3ZWxsIG9wdGltaXNlZC5cblx0ICpcblx0ICogQHBhcmFtIHtNaXhlZH0gb2JqZWN0XG5cdCAqIEByZXR1cm4ge1N0cmluZ30gb2JqZWN0IHR5cGVcblx0ICogQGFwaSBwdWJsaWNcblx0ICovXG5cdGZ1bmN0aW9uIHR5cGVEZXRlY3Qob2JqKSB7XG5cdCAgLyogISBTcGVlZCBvcHRpbWlzYXRpb25cblx0ICAgKiBQcmU6XG5cdCAgICogICBzdHJpbmcgbGl0ZXJhbCAgICAgeCAzLDAzOSwwMzUgb3BzL3NlYyDCsTEuNjIlICg3OCBydW5zIHNhbXBsZWQpXG5cdCAgICogICBib29sZWFuIGxpdGVyYWwgICAgeCAxLDQyNCwxMzggb3BzL3NlYyDCsTQuNTQlICg3NSBydW5zIHNhbXBsZWQpXG5cdCAgICogICBudW1iZXIgbGl0ZXJhbCAgICAgeCAxLDY1MywxNTMgb3BzL3NlYyDCsTEuOTElICg4MiBydW5zIHNhbXBsZWQpXG5cdCAgICogICB1bmRlZmluZWQgICAgICAgICAgeCA5LDk3OCw2NjAgb3BzL3NlYyDCsTEuOTIlICg3NSBydW5zIHNhbXBsZWQpXG5cdCAgICogICBmdW5jdGlvbiAgICAgICAgICAgeCAyLDU1Niw3Njkgb3BzL3NlYyDCsTEuNzMlICg3NyBydW5zIHNhbXBsZWQpXG5cdCAgICogUG9zdDpcblx0ICAgKiAgIHN0cmluZyBsaXRlcmFsICAgICB4IDM4LDU2NCw3OTYgb3BzL3NlYyDCsTEuMTUlICg3OSBydW5zIHNhbXBsZWQpXG5cdCAgICogICBib29sZWFuIGxpdGVyYWwgICAgeCAzMSwxNDgsOTQwIG9wcy9zZWMgwrExLjEwJSAoNzkgcnVucyBzYW1wbGVkKVxuXHQgICAqICAgbnVtYmVyIGxpdGVyYWwgICAgIHggMzIsNjc5LDMzMCBvcHMvc2VjIMKxMS45MCUgKDc4IHJ1bnMgc2FtcGxlZClcblx0ICAgKiAgIHVuZGVmaW5lZCAgICAgICAgICB4IDMyLDM2MywzNjggb3BzL3NlYyDCsTEuMDclICg4MiBydW5zIHNhbXBsZWQpXG5cdCAgICogICBmdW5jdGlvbiAgICAgICAgICAgeCAzMSwyOTYsODcwIG9wcy9zZWMgwrEwLjk2JSAoODMgcnVucyBzYW1wbGVkKVxuXHQgICAqL1xuXHQgIHZhciB0eXBlb2ZPYmogPSB0eXBlb2Ygb2JqO1xuXHQgIGlmICh0eXBlb2ZPYmogIT09ICdvYmplY3QnKSB7XG5cdCAgICByZXR1cm4gdHlwZW9mT2JqO1xuXHQgIH1cblxuXHQgIC8qICEgU3BlZWQgb3B0aW1pc2F0aW9uXG5cdCAgICogUHJlOlxuXHQgICAqICAgbnVsbCAgICAgICAgICAgICAgIHggMjgsNjQ1LDc2NSBvcHMvc2VjIMKxMS4xNyUgKDgyIHJ1bnMgc2FtcGxlZClcblx0ICAgKiBQb3N0OlxuXHQgICAqICAgbnVsbCAgICAgICAgICAgICAgIHggMzYsNDI4LDk2MiBvcHMvc2VjIMKxMS4zNyUgKDg0IHJ1bnMgc2FtcGxlZClcblx0ICAgKi9cblx0ICBpZiAob2JqID09PSBudWxsKSB7XG5cdCAgICByZXR1cm4gJ251bGwnO1xuXHQgIH1cblxuXHQgIC8qICEgU3BlYyBDb25mb3JtYW5jZVxuXHQgICAqIFRlc3Q6IGBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwod2luZG93KWBgXG5cdCAgICogIC0gTm9kZSA9PT0gXCJbb2JqZWN0IGdsb2JhbF1cIlxuXHQgICAqICAtIENocm9tZSA9PT0gXCJbb2JqZWN0IGdsb2JhbF1cIlxuXHQgICAqICAtIEZpcmVmb3ggPT09IFwiW29iamVjdCBXaW5kb3ddXCJcblx0ICAgKiAgLSBQaGFudG9tSlMgPT09IFwiW29iamVjdCBXaW5kb3ddXCJcblx0ICAgKiAgLSBTYWZhcmkgPT09IFwiW29iamVjdCBXaW5kb3ddXCJcblx0ICAgKiAgLSBJRSAxMSA9PT0gXCJbb2JqZWN0IFdpbmRvd11cIlxuXHQgICAqICAtIElFIEVkZ2UgPT09IFwiW29iamVjdCBXaW5kb3ddXCJcblx0ICAgKiBUZXN0OiBgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHRoaXMpYGBcblx0ICAgKiAgLSBDaHJvbWUgV29ya2VyID09PSBcIltvYmplY3QgZ2xvYmFsXVwiXG5cdCAgICogIC0gRmlyZWZveCBXb3JrZXIgPT09IFwiW29iamVjdCBEZWRpY2F0ZWRXb3JrZXJHbG9iYWxTY29wZV1cIlxuXHQgICAqICAtIFNhZmFyaSBXb3JrZXIgPT09IFwiW29iamVjdCBEZWRpY2F0ZWRXb3JrZXJHbG9iYWxTY29wZV1cIlxuXHQgICAqICAtIElFIDExIFdvcmtlciA9PT0gXCJbb2JqZWN0IFdvcmtlckdsb2JhbFNjb3BlXVwiXG5cdCAgICogIC0gSUUgRWRnZSBXb3JrZXIgPT09IFwiW29iamVjdCBXb3JrZXJHbG9iYWxTY29wZV1cIlxuXHQgICAqL1xuXHQgIGlmIChvYmogPT09IGdsb2JhbE9iamVjdCkge1xuXHQgICAgcmV0dXJuICdnbG9iYWwnO1xuXHQgIH1cblxuXHQgIC8qICEgU3BlZWQgb3B0aW1pc2F0aW9uXG5cdCAgICogUHJlOlxuXHQgICAqICAgYXJyYXkgbGl0ZXJhbCAgICAgIHggMiw4ODgsMzUyIG9wcy9zZWMgwrEwLjY3JSAoODIgcnVucyBzYW1wbGVkKVxuXHQgICAqIFBvc3Q6XG5cdCAgICogICBhcnJheSBsaXRlcmFsICAgICAgeCAyMiw0NzksNjUwIG9wcy9zZWMgwrEwLjk2JSAoODEgcnVucyBzYW1wbGVkKVxuXHQgICAqL1xuXHQgIGlmIChcblx0ICAgIEFycmF5LmlzQXJyYXkob2JqKSAmJlxuXHQgICAgKHN5bWJvbFRvU3RyaW5nVGFnRXhpc3RzID09PSBmYWxzZSB8fCAhKFN5bWJvbC50b1N0cmluZ1RhZyBpbiBvYmopKVxuXHQgICkge1xuXHQgICAgcmV0dXJuICdBcnJheSc7XG5cdCAgfVxuXG5cdCAgLy8gTm90IGNhY2hpbmcgZXhpc3RlbmNlIG9mIGB3aW5kb3dgIGFuZCByZWxhdGVkIHByb3BlcnRpZXMgZHVlIHRvIHBvdGVudGlhbFxuXHQgIC8vIGZvciBgd2luZG93YCB0byBiZSB1bnNldCBiZWZvcmUgdGVzdHMgaW4gcXVhc2ktYnJvd3NlciBlbnZpcm9ubWVudHMuXG5cdCAgaWYgKHR5cGVvZiB3aW5kb3cgPT09ICdvYmplY3QnICYmIHdpbmRvdyAhPT0gbnVsbCkge1xuXHQgICAgLyogISBTcGVjIENvbmZvcm1hbmNlXG5cdCAgICAgKiAoaHR0cHM6Ly9odG1sLnNwZWMud2hhdHdnLm9yZy9tdWx0aXBhZ2UvYnJvd3NlcnMuaHRtbCNsb2NhdGlvbilcblx0ICAgICAqIFdoYXRXRyBIVE1MJDcuNy4zIC0gVGhlIGBMb2NhdGlvbmAgaW50ZXJmYWNlXG5cdCAgICAgKiBUZXN0OiBgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHdpbmRvdy5sb2NhdGlvbilgYFxuXHQgICAgICogIC0gSUUgPD0xMSA9PT0gXCJbb2JqZWN0IE9iamVjdF1cIlxuXHQgICAgICogIC0gSUUgRWRnZSA8PTEzID09PSBcIltvYmplY3QgT2JqZWN0XVwiXG5cdCAgICAgKi9cblx0ICAgIGlmICh0eXBlb2Ygd2luZG93LmxvY2F0aW9uID09PSAnb2JqZWN0JyAmJiBvYmogPT09IHdpbmRvdy5sb2NhdGlvbikge1xuXHQgICAgICByZXR1cm4gJ0xvY2F0aW9uJztcblx0ICAgIH1cblxuXHQgICAgLyogISBTcGVjIENvbmZvcm1hbmNlXG5cdCAgICAgKiAoaHR0cHM6Ly9odG1sLnNwZWMud2hhdHdnLm9yZy8jZG9jdW1lbnQpXG5cdCAgICAgKiBXaGF0V0cgSFRNTCQzLjEuMSAtIFRoZSBgRG9jdW1lbnRgIG9iamVjdFxuXHQgICAgICogTm90ZTogTW9zdCBicm93c2VycyBjdXJyZW50bHkgYWRoZXIgdG8gdGhlIFczQyBET00gTGV2ZWwgMiBzcGVjXG5cdCAgICAgKiAgICAgICAoaHR0cHM6Ly93d3cudzMub3JnL1RSL0RPTS1MZXZlbC0yLUhUTUwvaHRtbC5odG1sI0lELTI2ODA5MjY4KVxuXHQgICAgICogICAgICAgd2hpY2ggc3VnZ2VzdHMgdGhhdCBicm93c2VycyBzaG91bGQgdXNlIEhUTUxUYWJsZUNlbGxFbGVtZW50IGZvclxuXHQgICAgICogICAgICAgYm90aCBURCBhbmQgVEggZWxlbWVudHMuIFdoYXRXRyBzZXBhcmF0ZXMgdGhlc2UuXG5cdCAgICAgKiAgICAgICBXaGF0V0cgSFRNTCBzdGF0ZXM6XG5cdCAgICAgKiAgICAgICAgID4gRm9yIGhpc3RvcmljYWwgcmVhc29ucywgV2luZG93IG9iamVjdHMgbXVzdCBhbHNvIGhhdmUgYVxuXHQgICAgICogICAgICAgICA+IHdyaXRhYmxlLCBjb25maWd1cmFibGUsIG5vbi1lbnVtZXJhYmxlIHByb3BlcnR5IG5hbWVkXG5cdCAgICAgKiAgICAgICAgID4gSFRNTERvY3VtZW50IHdob3NlIHZhbHVlIGlzIHRoZSBEb2N1bWVudCBpbnRlcmZhY2Ugb2JqZWN0LlxuXHQgICAgICogVGVzdDogYE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChkb2N1bWVudClgYFxuXHQgICAgICogIC0gQ2hyb21lID09PSBcIltvYmplY3QgSFRNTERvY3VtZW50XVwiXG5cdCAgICAgKiAgLSBGaXJlZm94ID09PSBcIltvYmplY3QgSFRNTERvY3VtZW50XVwiXG5cdCAgICAgKiAgLSBTYWZhcmkgPT09IFwiW29iamVjdCBIVE1MRG9jdW1lbnRdXCJcblx0ICAgICAqICAtIElFIDw9MTAgPT09IFwiW29iamVjdCBEb2N1bWVudF1cIlxuXHQgICAgICogIC0gSUUgMTEgPT09IFwiW29iamVjdCBIVE1MRG9jdW1lbnRdXCJcblx0ICAgICAqICAtIElFIEVkZ2UgPD0xMyA9PT0gXCJbb2JqZWN0IEhUTUxEb2N1bWVudF1cIlxuXHQgICAgICovXG5cdCAgICBpZiAodHlwZW9mIHdpbmRvdy5kb2N1bWVudCA9PT0gJ29iamVjdCcgJiYgb2JqID09PSB3aW5kb3cuZG9jdW1lbnQpIHtcblx0ICAgICAgcmV0dXJuICdEb2N1bWVudCc7XG5cdCAgICB9XG5cblx0ICAgIGlmICh0eXBlb2Ygd2luZG93Lm5hdmlnYXRvciA9PT0gJ29iamVjdCcpIHtcblx0ICAgICAgLyogISBTcGVjIENvbmZvcm1hbmNlXG5cdCAgICAgICAqIChodHRwczovL2h0bWwuc3BlYy53aGF0d2cub3JnL211bHRpcGFnZS93ZWJhcHBhcGlzLmh0bWwjbWltZXR5cGVhcnJheSlcblx0ICAgICAgICogV2hhdFdHIEhUTUwkOC42LjEuNSAtIFBsdWdpbnMgLSBJbnRlcmZhY2UgTWltZVR5cGVBcnJheVxuXHQgICAgICAgKiBUZXN0OiBgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG5hdmlnYXRvci5taW1lVHlwZXMpYGBcblx0ICAgICAgICogIC0gSUUgPD0xMCA9PT0gXCJbb2JqZWN0IE1TTWltZVR5cGVzQ29sbGVjdGlvbl1cIlxuXHQgICAgICAgKi9cblx0ICAgICAgaWYgKHR5cGVvZiB3aW5kb3cubmF2aWdhdG9yLm1pbWVUeXBlcyA9PT0gJ29iamVjdCcgJiZcblx0ICAgICAgICAgIG9iaiA9PT0gd2luZG93Lm5hdmlnYXRvci5taW1lVHlwZXMpIHtcblx0ICAgICAgICByZXR1cm4gJ01pbWVUeXBlQXJyYXknO1xuXHQgICAgICB9XG5cblx0ICAgICAgLyogISBTcGVjIENvbmZvcm1hbmNlXG5cdCAgICAgICAqIChodHRwczovL2h0bWwuc3BlYy53aGF0d2cub3JnL211bHRpcGFnZS93ZWJhcHBhcGlzLmh0bWwjcGx1Z2luYXJyYXkpXG5cdCAgICAgICAqIFdoYXRXRyBIVE1MJDguNi4xLjUgLSBQbHVnaW5zIC0gSW50ZXJmYWNlIFBsdWdpbkFycmF5XG5cdCAgICAgICAqIFRlc3Q6IGBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobmF2aWdhdG9yLnBsdWdpbnMpYGBcblx0ICAgICAgICogIC0gSUUgPD0xMCA9PT0gXCJbb2JqZWN0IE1TUGx1Z2luc0NvbGxlY3Rpb25dXCJcblx0ICAgICAgICovXG5cdCAgICAgIGlmICh0eXBlb2Ygd2luZG93Lm5hdmlnYXRvci5wbHVnaW5zID09PSAnb2JqZWN0JyAmJlxuXHQgICAgICAgICAgb2JqID09PSB3aW5kb3cubmF2aWdhdG9yLnBsdWdpbnMpIHtcblx0ICAgICAgICByZXR1cm4gJ1BsdWdpbkFycmF5Jztcblx0ICAgICAgfVxuXHQgICAgfVxuXG5cdCAgICBpZiAoKHR5cGVvZiB3aW5kb3cuSFRNTEVsZW1lbnQgPT09ICdmdW5jdGlvbicgfHxcblx0ICAgICAgICB0eXBlb2Ygd2luZG93LkhUTUxFbGVtZW50ID09PSAnb2JqZWN0JykgJiZcblx0ICAgICAgICBvYmogaW5zdGFuY2VvZiB3aW5kb3cuSFRNTEVsZW1lbnQpIHtcblx0ICAgICAgLyogISBTcGVjIENvbmZvcm1hbmNlXG5cdCAgICAgICogKGh0dHBzOi8vaHRtbC5zcGVjLndoYXR3Zy5vcmcvbXVsdGlwYWdlL3dlYmFwcGFwaXMuaHRtbCNwbHVnaW5hcnJheSlcblx0ICAgICAgKiBXaGF0V0cgSFRNTCQ0LjQuNCAtIFRoZSBgYmxvY2txdW90ZWAgZWxlbWVudCAtIEludGVyZmFjZSBgSFRNTFF1b3RlRWxlbWVudGBcblx0ICAgICAgKiBUZXN0OiBgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2Jsb2NrcXVvdGUnKSlgYFxuXHQgICAgICAqICAtIElFIDw9MTAgPT09IFwiW29iamVjdCBIVE1MQmxvY2tFbGVtZW50XVwiXG5cdCAgICAgICovXG5cdCAgICAgIGlmIChvYmoudGFnTmFtZSA9PT0gJ0JMT0NLUVVPVEUnKSB7XG5cdCAgICAgICAgcmV0dXJuICdIVE1MUXVvdGVFbGVtZW50Jztcblx0ICAgICAgfVxuXG5cdCAgICAgIC8qICEgU3BlYyBDb25mb3JtYW5jZVxuXHQgICAgICAgKiAoaHR0cHM6Ly9odG1sLnNwZWMud2hhdHdnLm9yZy8jaHRtbHRhYmxlZGF0YWNlbGxlbGVtZW50KVxuXHQgICAgICAgKiBXaGF0V0cgSFRNTCQ0LjkuOSAtIFRoZSBgdGRgIGVsZW1lbnQgLSBJbnRlcmZhY2UgYEhUTUxUYWJsZURhdGFDZWxsRWxlbWVudGBcblx0ICAgICAgICogTm90ZTogTW9zdCBicm93c2VycyBjdXJyZW50bHkgYWRoZXIgdG8gdGhlIFczQyBET00gTGV2ZWwgMiBzcGVjXG5cdCAgICAgICAqICAgICAgIChodHRwczovL3d3dy53My5vcmcvVFIvRE9NLUxldmVsLTItSFRNTC9odG1sLmh0bWwjSUQtODI5MTUwNzUpXG5cdCAgICAgICAqICAgICAgIHdoaWNoIHN1Z2dlc3RzIHRoYXQgYnJvd3NlcnMgc2hvdWxkIHVzZSBIVE1MVGFibGVDZWxsRWxlbWVudCBmb3Jcblx0ICAgICAgICogICAgICAgYm90aCBURCBhbmQgVEggZWxlbWVudHMuIFdoYXRXRyBzZXBhcmF0ZXMgdGhlc2UuXG5cdCAgICAgICAqIFRlc3Q6IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZCcpKVxuXHQgICAgICAgKiAgLSBDaHJvbWUgPT09IFwiW29iamVjdCBIVE1MVGFibGVDZWxsRWxlbWVudF1cIlxuXHQgICAgICAgKiAgLSBGaXJlZm94ID09PSBcIltvYmplY3QgSFRNTFRhYmxlQ2VsbEVsZW1lbnRdXCJcblx0ICAgICAgICogIC0gU2FmYXJpID09PSBcIltvYmplY3QgSFRNTFRhYmxlQ2VsbEVsZW1lbnRdXCJcblx0ICAgICAgICovXG5cdCAgICAgIGlmIChvYmoudGFnTmFtZSA9PT0gJ1REJykge1xuXHQgICAgICAgIHJldHVybiAnSFRNTFRhYmxlRGF0YUNlbGxFbGVtZW50Jztcblx0ICAgICAgfVxuXG5cdCAgICAgIC8qICEgU3BlYyBDb25mb3JtYW5jZVxuXHQgICAgICAgKiAoaHR0cHM6Ly9odG1sLnNwZWMud2hhdHdnLm9yZy8jaHRtbHRhYmxlaGVhZGVyY2VsbGVsZW1lbnQpXG5cdCAgICAgICAqIFdoYXRXRyBIVE1MJDQuOS45IC0gVGhlIGB0ZGAgZWxlbWVudCAtIEludGVyZmFjZSBgSFRNTFRhYmxlSGVhZGVyQ2VsbEVsZW1lbnRgXG5cdCAgICAgICAqIE5vdGU6IE1vc3QgYnJvd3NlcnMgY3VycmVudGx5IGFkaGVyIHRvIHRoZSBXM0MgRE9NIExldmVsIDIgc3BlY1xuXHQgICAgICAgKiAgICAgICAoaHR0cHM6Ly93d3cudzMub3JnL1RSL0RPTS1MZXZlbC0yLUhUTUwvaHRtbC5odG1sI0lELTgyOTE1MDc1KVxuXHQgICAgICAgKiAgICAgICB3aGljaCBzdWdnZXN0cyB0aGF0IGJyb3dzZXJzIHNob3VsZCB1c2UgSFRNTFRhYmxlQ2VsbEVsZW1lbnQgZm9yXG5cdCAgICAgICAqICAgICAgIGJvdGggVEQgYW5kIFRIIGVsZW1lbnRzLiBXaGF0V0cgc2VwYXJhdGVzIHRoZXNlLlxuXHQgICAgICAgKiBUZXN0OiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGgnKSlcblx0ICAgICAgICogIC0gQ2hyb21lID09PSBcIltvYmplY3QgSFRNTFRhYmxlQ2VsbEVsZW1lbnRdXCJcblx0ICAgICAgICogIC0gRmlyZWZveCA9PT0gXCJbb2JqZWN0IEhUTUxUYWJsZUNlbGxFbGVtZW50XVwiXG5cdCAgICAgICAqICAtIFNhZmFyaSA9PT0gXCJbb2JqZWN0IEhUTUxUYWJsZUNlbGxFbGVtZW50XVwiXG5cdCAgICAgICAqL1xuXHQgICAgICBpZiAob2JqLnRhZ05hbWUgPT09ICdUSCcpIHtcblx0ICAgICAgICByZXR1cm4gJ0hUTUxUYWJsZUhlYWRlckNlbGxFbGVtZW50Jztcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH1cblxuXHQgIC8qICEgU3BlZWQgb3B0aW1pc2F0aW9uXG5cdCAgKiBQcmU6XG5cdCAgKiAgIEZsb2F0NjRBcnJheSAgICAgICB4IDYyNSw2NDQgb3BzL3NlYyDCsTEuNTglICg4MCBydW5zIHNhbXBsZWQpXG5cdCAgKiAgIEZsb2F0MzJBcnJheSAgICAgICB4IDEsMjc5LDg1MiBvcHMvc2VjIMKxMi45MSUgKDc3IHJ1bnMgc2FtcGxlZClcblx0ICAqICAgVWludDMyQXJyYXkgICAgICAgIHggMSwxNzgsMTg1IG9wcy9zZWMgwrExLjk1JSAoODMgcnVucyBzYW1wbGVkKVxuXHQgICogICBVaW50MTZBcnJheSAgICAgICAgeCAxLDAwOCwzODAgb3BzL3NlYyDCsTIuMjUlICg4MCBydW5zIHNhbXBsZWQpXG5cdCAgKiAgIFVpbnQ4QXJyYXkgICAgICAgICB4IDEsMTI4LDA0MCBvcHMvc2VjIMKxMi4xMSUgKDgxIHJ1bnMgc2FtcGxlZClcblx0ICAqICAgSW50MzJBcnJheSAgICAgICAgIHggMSwxNzAsMTE5IG9wcy9zZWMgwrEyLjg4JSAoODAgcnVucyBzYW1wbGVkKVxuXHQgICogICBJbnQxNkFycmF5ICAgICAgICAgeCAxLDE3NiwzNDggb3BzL3NlYyDCsTUuNzklICg4NiBydW5zIHNhbXBsZWQpXG5cdCAgKiAgIEludDhBcnJheSAgICAgICAgICB4IDEsMDU4LDcwNyBvcHMvc2VjIMKxNC45NCUgKDc3IHJ1bnMgc2FtcGxlZClcblx0ICAqICAgVWludDhDbGFtcGVkQXJyYXkgIHggMSwxMTAsNjMzIG9wcy9zZWMgwrE0LjIwJSAoODAgcnVucyBzYW1wbGVkKVxuXHQgICogUG9zdDpcblx0ICAqICAgRmxvYXQ2NEFycmF5ICAgICAgIHggNywxMDUsNjcxIG9wcy9zZWMgwrExMy40NyUgKDY0IHJ1bnMgc2FtcGxlZClcblx0ICAqICAgRmxvYXQzMkFycmF5ICAgICAgIHggNSw4ODcsOTEyIG9wcy9zZWMgwrExLjQ2JSAoODIgcnVucyBzYW1wbGVkKVxuXHQgICogICBVaW50MzJBcnJheSAgICAgICAgeCA2LDQ5MSw2NjEgb3BzL3NlYyDCsTEuNzYlICg3OSBydW5zIHNhbXBsZWQpXG5cdCAgKiAgIFVpbnQxNkFycmF5ICAgICAgICB4IDYsNTU5LDc5NSBvcHMvc2VjIMKxMS42NyUgKDgyIHJ1bnMgc2FtcGxlZClcblx0ICAqICAgVWludDhBcnJheSAgICAgICAgIHggNiw0NjMsOTY2IG9wcy9zZWMgwrExLjQzJSAoODUgcnVucyBzYW1wbGVkKVxuXHQgICogICBJbnQzMkFycmF5ICAgICAgICAgeCA1LDY0MSw4NDEgb3BzL3NlYyDCsTMuNDklICg4MSBydW5zIHNhbXBsZWQpXG5cdCAgKiAgIEludDE2QXJyYXkgICAgICAgICB4IDYsNTgzLDUxMSBvcHMvc2VjIMKxMS45OCUgKDgwIHJ1bnMgc2FtcGxlZClcblx0ICAqICAgSW50OEFycmF5ICAgICAgICAgIHggNiw2MDYsMDc4IG9wcy9zZWMgwrExLjc0JSAoODEgcnVucyBzYW1wbGVkKVxuXHQgICogICBVaW50OENsYW1wZWRBcnJheSAgeCA2LDYwMiwyMjQgb3BzL3NlYyDCsTEuNzclICg4MyBydW5zIHNhbXBsZWQpXG5cdCAgKi9cblx0ICB2YXIgc3RyaW5nVGFnID0gKHN5bWJvbFRvU3RyaW5nVGFnRXhpc3RzICYmIG9ialtTeW1ib2wudG9TdHJpbmdUYWddKTtcblx0ICBpZiAodHlwZW9mIHN0cmluZ1RhZyA9PT0gJ3N0cmluZycpIHtcblx0ICAgIHJldHVybiBzdHJpbmdUYWc7XG5cdCAgfVxuXG5cdCAgdmFyIG9ialByb3RvdHlwZSA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihvYmopO1xuXHQgIC8qICEgU3BlZWQgb3B0aW1pc2F0aW9uXG5cdCAgKiBQcmU6XG5cdCAgKiAgIHJlZ2V4IGxpdGVyYWwgICAgICB4IDEsNzcyLDM4NSBvcHMvc2VjIMKxMS44NSUgKDc3IHJ1bnMgc2FtcGxlZClcblx0ICAqICAgcmVnZXggY29uc3RydWN0b3IgIHggMiwxNDMsNjM0IG9wcy9zZWMgwrEyLjQ2JSAoNzggcnVucyBzYW1wbGVkKVxuXHQgICogUG9zdDpcblx0ICAqICAgcmVnZXggbGl0ZXJhbCAgICAgIHggMyw5MjgsMDA5IG9wcy9zZWMgwrEwLjY1JSAoNzggcnVucyBzYW1wbGVkKVxuXHQgICogICByZWdleCBjb25zdHJ1Y3RvciAgeCAzLDkzMSwxMDggb3BzL3NlYyDCsTAuNTglICg4NCBydW5zIHNhbXBsZWQpXG5cdCAgKi9cblx0ICBpZiAob2JqUHJvdG90eXBlID09PSBSZWdFeHAucHJvdG90eXBlKSB7XG5cdCAgICByZXR1cm4gJ1JlZ0V4cCc7XG5cdCAgfVxuXG5cdCAgLyogISBTcGVlZCBvcHRpbWlzYXRpb25cblx0ICAqIFByZTpcblx0ICAqICAgZGF0ZSAgICAgICAgICAgICAgIHggMiwxMzAsMDc0IG9wcy9zZWMgwrE0LjQyJSAoNjggcnVucyBzYW1wbGVkKVxuXHQgICogUG9zdDpcblx0ICAqICAgZGF0ZSAgICAgICAgICAgICAgIHggMyw5NTMsNzc5IG9wcy9zZWMgwrExLjM1JSAoNzcgcnVucyBzYW1wbGVkKVxuXHQgICovXG5cdCAgaWYgKG9ialByb3RvdHlwZSA9PT0gRGF0ZS5wcm90b3R5cGUpIHtcblx0ICAgIHJldHVybiAnRGF0ZSc7XG5cdCAgfVxuXG5cdCAgLyogISBTcGVjIENvbmZvcm1hbmNlXG5cdCAgICogKGh0dHA6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi82LjAvaW5kZXguaHRtbCNzZWMtcHJvbWlzZS5wcm90b3R5cGUtQEB0b3N0cmluZ3RhZylcblx0ICAgKiBFUzYkMjUuNC41LjQgLSBQcm9taXNlLnByb3RvdHlwZVtAQHRvU3RyaW5nVGFnXSBzaG91bGQgYmUgXCJQcm9taXNlXCI6XG5cdCAgICogVGVzdDogYE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChQcm9taXNlLnJlc29sdmUoKSlgYFxuXHQgICAqICAtIENocm9tZSA8PTQ3ID09PSBcIltvYmplY3QgT2JqZWN0XVwiXG5cdCAgICogIC0gRWRnZSA8PTIwID09PSBcIltvYmplY3QgT2JqZWN0XVwiXG5cdCAgICogIC0gRmlyZWZveCAyOS1MYXRlc3QgPT09IFwiW29iamVjdCBQcm9taXNlXVwiXG5cdCAgICogIC0gU2FmYXJpIDcuMS1MYXRlc3QgPT09IFwiW29iamVjdCBQcm9taXNlXVwiXG5cdCAgICovXG5cdCAgaWYgKHByb21pc2VFeGlzdHMgJiYgb2JqUHJvdG90eXBlID09PSBQcm9taXNlLnByb3RvdHlwZSkge1xuXHQgICAgcmV0dXJuICdQcm9taXNlJztcblx0ICB9XG5cblx0ICAvKiAhIFNwZWVkIG9wdGltaXNhdGlvblxuXHQgICogUHJlOlxuXHQgICogICBzZXQgICAgICAgICAgICAgICAgeCAyLDIyMiwxODYgb3BzL3NlYyDCsTEuMzElICg4MiBydW5zIHNhbXBsZWQpXG5cdCAgKiBQb3N0OlxuXHQgICogICBzZXQgICAgICAgICAgICAgICAgeCA0LDU0NSw4Nzkgb3BzL3NlYyDCsTEuMTMlICg4MyBydW5zIHNhbXBsZWQpXG5cdCAgKi9cblx0ICBpZiAoc2V0RXhpc3RzICYmIG9ialByb3RvdHlwZSA9PT0gU2V0LnByb3RvdHlwZSkge1xuXHQgICAgcmV0dXJuICdTZXQnO1xuXHQgIH1cblxuXHQgIC8qICEgU3BlZWQgb3B0aW1pc2F0aW9uXG5cdCAgKiBQcmU6XG5cdCAgKiAgIG1hcCAgICAgICAgICAgICAgICB4IDIsMzk2LDg0MiBvcHMvc2VjIMKxMS41OSUgKDgxIHJ1bnMgc2FtcGxlZClcblx0ICAqIFBvc3Q6XG5cdCAgKiAgIG1hcCAgICAgICAgICAgICAgICB4IDQsMTgzLDk0NSBvcHMvc2VjIMKxNi41OSUgKDgyIHJ1bnMgc2FtcGxlZClcblx0ICAqL1xuXHQgIGlmIChtYXBFeGlzdHMgJiYgb2JqUHJvdG90eXBlID09PSBNYXAucHJvdG90eXBlKSB7XG5cdCAgICByZXR1cm4gJ01hcCc7XG5cdCAgfVxuXG5cdCAgLyogISBTcGVlZCBvcHRpbWlzYXRpb25cblx0ICAqIFByZTpcblx0ICAqICAgd2Vha3NldCAgICAgICAgICAgIHggMSwzMjMsMjIwIG9wcy9zZWMgwrEyLjE3JSAoNzYgcnVucyBzYW1wbGVkKVxuXHQgICogUG9zdDpcblx0ICAqICAgd2Vha3NldCAgICAgICAgICAgIHggNCwyMzcsNTEwIG9wcy9zZWMgwrEyLjAxJSAoNzcgcnVucyBzYW1wbGVkKVxuXHQgICovXG5cdCAgaWYgKHdlYWtTZXRFeGlzdHMgJiYgb2JqUHJvdG90eXBlID09PSBXZWFrU2V0LnByb3RvdHlwZSkge1xuXHQgICAgcmV0dXJuICdXZWFrU2V0Jztcblx0ICB9XG5cblx0ICAvKiAhIFNwZWVkIG9wdGltaXNhdGlvblxuXHQgICogUHJlOlxuXHQgICogICB3ZWFrbWFwICAgICAgICAgICAgeCAxLDUwMCwyNjAgb3BzL3NlYyDCsTIuMDIlICg3OCBydW5zIHNhbXBsZWQpXG5cdCAgKiBQb3N0OlxuXHQgICogICB3ZWFrbWFwICAgICAgICAgICAgeCAzLDg4MSwzODQgb3BzL3NlYyDCsTEuNDUlICg4MiBydW5zIHNhbXBsZWQpXG5cdCAgKi9cblx0ICBpZiAod2Vha01hcEV4aXN0cyAmJiBvYmpQcm90b3R5cGUgPT09IFdlYWtNYXAucHJvdG90eXBlKSB7XG5cdCAgICByZXR1cm4gJ1dlYWtNYXAnO1xuXHQgIH1cblxuXHQgIC8qICEgU3BlYyBDb25mb3JtYW5jZVxuXHQgICAqIChodHRwOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNi4wL2luZGV4Lmh0bWwjc2VjLWRhdGF2aWV3LnByb3RvdHlwZS1AQHRvc3RyaW5ndGFnKVxuXHQgICAqIEVTNiQyNC4yLjQuMjEgLSBEYXRhVmlldy5wcm90b3R5cGVbQEB0b1N0cmluZ1RhZ10gc2hvdWxkIGJlIFwiRGF0YVZpZXdcIjpcblx0ICAgKiBUZXN0OiBgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG5ldyBEYXRhVmlldyhuZXcgQXJyYXlCdWZmZXIoMSkpKWBgXG5cdCAgICogIC0gRWRnZSA8PTEzID09PSBcIltvYmplY3QgT2JqZWN0XVwiXG5cdCAgICovXG5cdCAgaWYgKGRhdGFWaWV3RXhpc3RzICYmIG9ialByb3RvdHlwZSA9PT0gRGF0YVZpZXcucHJvdG90eXBlKSB7XG5cdCAgICByZXR1cm4gJ0RhdGFWaWV3Jztcblx0ICB9XG5cblx0ICAvKiAhIFNwZWMgQ29uZm9ybWFuY2Vcblx0ICAgKiAoaHR0cDovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzYuMC9pbmRleC5odG1sI3NlYy0lbWFwaXRlcmF0b3Jwcm90b3R5cGUlLUBAdG9zdHJpbmd0YWcpXG5cdCAgICogRVM2JDIzLjEuNS4yLjIgLSAlTWFwSXRlcmF0b3JQcm90b3R5cGUlW0BAdG9TdHJpbmdUYWddIHNob3VsZCBiZSBcIk1hcCBJdGVyYXRvclwiOlxuXHQgICAqIFRlc3Q6IGBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobmV3IE1hcCgpLmVudHJpZXMoKSlgYFxuXHQgICAqICAtIEVkZ2UgPD0xMyA9PT0gXCJbb2JqZWN0IE9iamVjdF1cIlxuXHQgICAqL1xuXHQgIGlmIChtYXBFeGlzdHMgJiYgb2JqUHJvdG90eXBlID09PSBtYXBJdGVyYXRvclByb3RvdHlwZSkge1xuXHQgICAgcmV0dXJuICdNYXAgSXRlcmF0b3InO1xuXHQgIH1cblxuXHQgIC8qICEgU3BlYyBDb25mb3JtYW5jZVxuXHQgICAqIChodHRwOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNi4wL2luZGV4Lmh0bWwjc2VjLSVzZXRpdGVyYXRvcnByb3RvdHlwZSUtQEB0b3N0cmluZ3RhZylcblx0ICAgKiBFUzYkMjMuMi41LjIuMiAtICVTZXRJdGVyYXRvclByb3RvdHlwZSVbQEB0b1N0cmluZ1RhZ10gc2hvdWxkIGJlIFwiU2V0IEl0ZXJhdG9yXCI6XG5cdCAgICogVGVzdDogYE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChuZXcgU2V0KCkuZW50cmllcygpKWBgXG5cdCAgICogIC0gRWRnZSA8PTEzID09PSBcIltvYmplY3QgT2JqZWN0XVwiXG5cdCAgICovXG5cdCAgaWYgKHNldEV4aXN0cyAmJiBvYmpQcm90b3R5cGUgPT09IHNldEl0ZXJhdG9yUHJvdG90eXBlKSB7XG5cdCAgICByZXR1cm4gJ1NldCBJdGVyYXRvcic7XG5cdCAgfVxuXG5cdCAgLyogISBTcGVjIENvbmZvcm1hbmNlXG5cdCAgICogKGh0dHA6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi82LjAvaW5kZXguaHRtbCNzZWMtJWFycmF5aXRlcmF0b3Jwcm90b3R5cGUlLUBAdG9zdHJpbmd0YWcpXG5cdCAgICogRVM2JDIyLjEuNS4yLjIgLSAlQXJyYXlJdGVyYXRvclByb3RvdHlwZSVbQEB0b1N0cmluZ1RhZ10gc2hvdWxkIGJlIFwiQXJyYXkgSXRlcmF0b3JcIjpcblx0ICAgKiBUZXN0OiBgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKFtdW1N5bWJvbC5pdGVyYXRvcl0oKSlgYFxuXHQgICAqICAtIEVkZ2UgPD0xMyA9PT0gXCJbb2JqZWN0IE9iamVjdF1cIlxuXHQgICAqL1xuXHQgIGlmIChhcnJheUl0ZXJhdG9yRXhpc3RzICYmIG9ialByb3RvdHlwZSA9PT0gYXJyYXlJdGVyYXRvclByb3RvdHlwZSkge1xuXHQgICAgcmV0dXJuICdBcnJheSBJdGVyYXRvcic7XG5cdCAgfVxuXG5cdCAgLyogISBTcGVjIENvbmZvcm1hbmNlXG5cdCAgICogKGh0dHA6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi82LjAvaW5kZXguaHRtbCNzZWMtJXN0cmluZ2l0ZXJhdG9ycHJvdG90eXBlJS1AQHRvc3RyaW5ndGFnKVxuXHQgICAqIEVTNiQyMS4xLjUuMi4yIC0gJVN0cmluZ0l0ZXJhdG9yUHJvdG90eXBlJVtAQHRvU3RyaW5nVGFnXSBzaG91bGQgYmUgXCJTdHJpbmcgSXRlcmF0b3JcIjpcblx0ICAgKiBUZXN0OiBgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKCcnW1N5bWJvbC5pdGVyYXRvcl0oKSlgYFxuXHQgICAqICAtIEVkZ2UgPD0xMyA9PT0gXCJbb2JqZWN0IE9iamVjdF1cIlxuXHQgICAqL1xuXHQgIGlmIChzdHJpbmdJdGVyYXRvckV4aXN0cyAmJiBvYmpQcm90b3R5cGUgPT09IHN0cmluZ0l0ZXJhdG9yUHJvdG90eXBlKSB7XG5cdCAgICByZXR1cm4gJ1N0cmluZyBJdGVyYXRvcic7XG5cdCAgfVxuXG5cdCAgLyogISBTcGVlZCBvcHRpbWlzYXRpb25cblx0ICAqIFByZTpcblx0ICAqICAgb2JqZWN0IGZyb20gbnVsbCAgIHggMiw0MjQsMzIwIG9wcy9zZWMgwrExLjY3JSAoNzYgcnVucyBzYW1wbGVkKVxuXHQgICogUG9zdDpcblx0ICAqICAgb2JqZWN0IGZyb20gbnVsbCAgIHggNSw4MzgsMDAwIG9wcy9zZWMgwrEwLjk5JSAoODQgcnVucyBzYW1wbGVkKVxuXHQgICovXG5cdCAgaWYgKG9ialByb3RvdHlwZSA9PT0gbnVsbCkge1xuXHQgICAgcmV0dXJuICdPYmplY3QnO1xuXHQgIH1cblxuXHQgIHJldHVybiBPYmplY3Rcblx0ICAgIC5wcm90b3R5cGVcblx0ICAgIC50b1N0cmluZ1xuXHQgICAgLmNhbGwob2JqKVxuXHQgICAgLnNsaWNlKHRvU3RyaW5nTGVmdFNsaWNlTGVuZ3RoLCB0b1N0cmluZ1JpZ2h0U2xpY2VMZW5ndGgpO1xuXHR9XG5cblx0cmV0dXJuIHR5cGVEZXRlY3Q7XG5cblx0fSkpKTtcblx0fSk7XG5cblx0ZnVuY3Rpb24gX3NsaWNlZFRvQXJyYXkoYXJyLCBpKSB7XG5cdCAgcmV0dXJuIF9hcnJheVdpdGhIb2xlcyhhcnIpIHx8IF9pdGVyYWJsZVRvQXJyYXlMaW1pdChhcnIsIGkpIHx8IF91bnN1cHBvcnRlZEl0ZXJhYmxlVG9BcnJheShhcnIsIGkpIHx8IF9ub25JdGVyYWJsZVJlc3QoKTtcblx0fVxuXG5cdGZ1bmN0aW9uIF9hcnJheVdpdGhIb2xlcyhhcnIpIHtcblx0ICBpZiAoQXJyYXkuaXNBcnJheShhcnIpKSByZXR1cm4gYXJyO1xuXHR9XG5cblx0ZnVuY3Rpb24gX2l0ZXJhYmxlVG9BcnJheUxpbWl0KGFyciwgaSkge1xuXHQgIGlmICh0eXBlb2YgU3ltYm9sID09PSBcInVuZGVmaW5lZFwiIHx8ICEoU3ltYm9sLml0ZXJhdG9yIGluIE9iamVjdChhcnIpKSkgcmV0dXJuO1xuXHQgIHZhciBfYXJyID0gW107XG5cdCAgdmFyIF9uID0gdHJ1ZTtcblx0ICB2YXIgX2QgPSBmYWxzZTtcblx0ICB2YXIgX2UgPSB1bmRlZmluZWQ7XG5cblx0ICB0cnkge1xuXHQgICAgZm9yICh2YXIgX2kgPSBhcnJbU3ltYm9sLml0ZXJhdG9yXSgpLCBfczsgIShfbiA9IChfcyA9IF9pLm5leHQoKSkuZG9uZSk7IF9uID0gdHJ1ZSkge1xuXHQgICAgICBfYXJyLnB1c2goX3MudmFsdWUpO1xuXG5cdCAgICAgIGlmIChpICYmIF9hcnIubGVuZ3RoID09PSBpKSBicmVhaztcblx0ICAgIH1cblx0ICB9IGNhdGNoIChlcnIpIHtcblx0ICAgIF9kID0gdHJ1ZTtcblx0ICAgIF9lID0gZXJyO1xuXHQgIH0gZmluYWxseSB7XG5cdCAgICB0cnkge1xuXHQgICAgICBpZiAoIV9uICYmIF9pW1wicmV0dXJuXCJdICE9IG51bGwpIF9pW1wicmV0dXJuXCJdKCk7XG5cdCAgICB9IGZpbmFsbHkge1xuXHQgICAgICBpZiAoX2QpIHRocm93IF9lO1xuXHQgICAgfVxuXHQgIH1cblxuXHQgIHJldHVybiBfYXJyO1xuXHR9XG5cblx0ZnVuY3Rpb24gX3Vuc3VwcG9ydGVkSXRlcmFibGVUb0FycmF5KG8sIG1pbkxlbikge1xuXHQgIGlmICghbykgcmV0dXJuO1xuXHQgIGlmICh0eXBlb2YgbyA9PT0gXCJzdHJpbmdcIikgcmV0dXJuIF9hcnJheUxpa2VUb0FycmF5KG8sIG1pbkxlbik7XG5cdCAgdmFyIG4gPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobykuc2xpY2UoOCwgLTEpO1xuXHQgIGlmIChuID09PSBcIk9iamVjdFwiICYmIG8uY29uc3RydWN0b3IpIG4gPSBvLmNvbnN0cnVjdG9yLm5hbWU7XG5cdCAgaWYgKG4gPT09IFwiTWFwXCIgfHwgbiA9PT0gXCJTZXRcIikgcmV0dXJuIEFycmF5LmZyb20obik7XG5cdCAgaWYgKG4gPT09IFwiQXJndW1lbnRzXCIgfHwgL14oPzpVaXxJKW50KD86OHwxNnwzMikoPzpDbGFtcGVkKT9BcnJheSQvLnRlc3QobikpIHJldHVybiBfYXJyYXlMaWtlVG9BcnJheShvLCBtaW5MZW4pO1xuXHR9XG5cblx0ZnVuY3Rpb24gX2FycmF5TGlrZVRvQXJyYXkoYXJyLCBsZW4pIHtcblx0ICBpZiAobGVuID09IG51bGwgfHwgbGVuID4gYXJyLmxlbmd0aCkgbGVuID0gYXJyLmxlbmd0aDtcblxuXHQgIGZvciAodmFyIGkgPSAwLCBhcnIyID0gbmV3IEFycmF5KGxlbik7IGkgPCBsZW47IGkrKykgYXJyMltpXSA9IGFycltpXTtcblxuXHQgIHJldHVybiBhcnIyO1xuXHR9XG5cblx0ZnVuY3Rpb24gX25vbkl0ZXJhYmxlUmVzdCgpIHtcblx0ICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiSW52YWxpZCBhdHRlbXB0IHRvIGRlc3RydWN0dXJlIG5vbi1pdGVyYWJsZSBpbnN0YW5jZS5cXG5JbiBvcmRlciB0byBiZSBpdGVyYWJsZSwgbm9uLWFycmF5IG9iamVjdHMgbXVzdCBoYXZlIGEgW1N5bWJvbC5pdGVyYXRvcl0oKSBtZXRob2QuXCIpO1xuXHR9XG5cblx0dmFyIGFuc2lDb2xvcnMgPSB7XG5cdCAgYm9sZDogWycxJywgJzIyJ10sXG5cdCAgZGltOiBbJzInLCAnMjInXSxcblx0ICBpdGFsaWM6IFsnMycsICcyMyddLFxuXHQgIHVuZGVybGluZTogWyc0JywgJzI0J10sXG5cdCAgLy8gNSAmIDYgYXJlIGJsaW5raW5nXG5cdCAgaW52ZXJzZTogWyc3JywgJzI3J10sXG5cdCAgaGlkZGVuOiBbJzgnLCAnMjgnXSxcblx0ICBzdHJpa2U6IFsnOScsICcyOSddLFxuXHQgIC8vIDEwLTIwIGFyZSBmb250c1xuXHQgIC8vIDIxLTI5IGFyZSByZXNldHMgZm9yIDEtOVxuXHQgIGJsYWNrOiBbJzMwJywgJzM5J10sXG5cdCAgcmVkOiBbJzMxJywgJzM5J10sXG5cdCAgZ3JlZW46IFsnMzInLCAnMzknXSxcblx0ICB5ZWxsb3c6IFsnMzMnLCAnMzknXSxcblx0ICBibHVlOiBbJzM0JywgJzM5J10sXG5cdCAgbWFnZW50YTogWyczNScsICczOSddLFxuXHQgIGN5YW46IFsnMzYnLCAnMzknXSxcblx0ICB3aGl0ZTogWyczNycsICczOSddLFxuXHQgIGJyaWdodGJsYWNrOiBbJzMwOzEnLCAnMzknXSxcblx0ICBicmlnaHRyZWQ6IFsnMzE7MScsICczOSddLFxuXHQgIGJyaWdodGdyZWVuOiBbJzMyOzEnLCAnMzknXSxcblx0ICBicmlnaHR5ZWxsb3c6IFsnMzM7MScsICczOSddLFxuXHQgIGJyaWdodGJsdWU6IFsnMzQ7MScsICczOSddLFxuXHQgIGJyaWdodG1hZ2VudGE6IFsnMzU7MScsICczOSddLFxuXHQgIGJyaWdodGN5YW46IFsnMzY7MScsICczOSddLFxuXHQgIGJyaWdodHdoaXRlOiBbJzM3OzEnLCAnMzknXSxcblx0ICBncmV5OiBbJzkwJywgJzM5J11cblx0fTtcblx0dmFyIHN0eWxlcyA9IHtcblx0ICBzcGVjaWFsOiAnY3lhbicsXG5cdCAgbnVtYmVyOiAneWVsbG93Jyxcblx0ICBib29sZWFuOiAneWVsbG93Jyxcblx0ICB1bmRlZmluZWQ6ICdncmV5Jyxcblx0ICBudWxsOiAnYm9sZCcsXG5cdCAgc3RyaW5nOiAnZ3JlZW4nLFxuXHQgIHN5bWJvbDogJ2dyZWVuJyxcblx0ICBkYXRlOiAnbWFnZW50YScsXG5cdCAgcmVnZXhwOiAncmVkJ1xuXHR9O1xuXHR2YXIgdHJ1bmNhdG9yID0gJ+KApic7XG5cblx0ZnVuY3Rpb24gY29sb3Jpc2UodmFsdWUsIHN0eWxlVHlwZSkge1xuXHQgIHZhciBjb2xvciA9IGFuc2lDb2xvcnNbc3R5bGVzW3N0eWxlVHlwZV1dIHx8IGFuc2lDb2xvcnNbc3R5bGVUeXBlXTtcblxuXHQgIGlmICghY29sb3IpIHtcblx0ICAgIHJldHVybiBTdHJpbmcodmFsdWUpO1xuXHQgIH1cblxuXHQgIHJldHVybiBcIlxceDFCW1wiLmNvbmNhdChjb2xvclswXSwgXCJtXCIpLmNvbmNhdChTdHJpbmcodmFsdWUpLCBcIlxceDFCW1wiKS5jb25jYXQoY29sb3JbMV0sIFwibVwiKTtcblx0fVxuXG5cdGZ1bmN0aW9uIG5vcm1hbGlzZU9wdGlvbnMoKSB7XG5cdCAgdmFyIF9yZWYgPSBhcmd1bWVudHMubGVuZ3RoID4gMCAmJiBhcmd1bWVudHNbMF0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1swXSA6IHt9LFxuXHQgICAgICBfcmVmJHNob3dIaWRkZW4gPSBfcmVmLnNob3dIaWRkZW4sXG5cdCAgICAgIHNob3dIaWRkZW4gPSBfcmVmJHNob3dIaWRkZW4gPT09IHZvaWQgMCA/IGZhbHNlIDogX3JlZiRzaG93SGlkZGVuLFxuXHQgICAgICBfcmVmJGRlcHRoID0gX3JlZi5kZXB0aCxcblx0ICAgICAgZGVwdGggPSBfcmVmJGRlcHRoID09PSB2b2lkIDAgPyAyIDogX3JlZiRkZXB0aCxcblx0ICAgICAgX3JlZiRjb2xvcnMgPSBfcmVmLmNvbG9ycyxcblx0ICAgICAgY29sb3JzID0gX3JlZiRjb2xvcnMgPT09IHZvaWQgMCA/IGZhbHNlIDogX3JlZiRjb2xvcnMsXG5cdCAgICAgIF9yZWYkY3VzdG9tSW5zcGVjdCA9IF9yZWYuY3VzdG9tSW5zcGVjdCxcblx0ICAgICAgY3VzdG9tSW5zcGVjdCA9IF9yZWYkY3VzdG9tSW5zcGVjdCA9PT0gdm9pZCAwID8gdHJ1ZSA6IF9yZWYkY3VzdG9tSW5zcGVjdCxcblx0ICAgICAgX3JlZiRzaG93UHJveHkgPSBfcmVmLnNob3dQcm94eSxcblx0ICAgICAgc2hvd1Byb3h5ID0gX3JlZiRzaG93UHJveHkgPT09IHZvaWQgMCA/IGZhbHNlIDogX3JlZiRzaG93UHJveHksXG5cdCAgICAgIF9yZWYkbWF4QXJyYXlMZW5ndGggPSBfcmVmLm1heEFycmF5TGVuZ3RoLFxuXHQgICAgICBtYXhBcnJheUxlbmd0aCA9IF9yZWYkbWF4QXJyYXlMZW5ndGggPT09IHZvaWQgMCA/IEluZmluaXR5IDogX3JlZiRtYXhBcnJheUxlbmd0aCxcblx0ICAgICAgX3JlZiRicmVha0xlbmd0aCA9IF9yZWYuYnJlYWtMZW5ndGgsXG5cdCAgICAgIGJyZWFrTGVuZ3RoID0gX3JlZiRicmVha0xlbmd0aCA9PT0gdm9pZCAwID8gSW5maW5pdHkgOiBfcmVmJGJyZWFrTGVuZ3RoLFxuXHQgICAgICBfcmVmJHNlZW4gPSBfcmVmLnNlZW4sXG5cdCAgICAgIHNlZW4gPSBfcmVmJHNlZW4gPT09IHZvaWQgMCA/IFtdIDogX3JlZiRzZWVuLFxuXHQgICAgICBfcmVmJHRydW5jYXRlID0gX3JlZi50cnVuY2F0ZSxcblx0ICAgICAgdHJ1bmNhdGUgPSBfcmVmJHRydW5jYXRlID09PSB2b2lkIDAgPyBJbmZpbml0eSA6IF9yZWYkdHJ1bmNhdGUsXG5cdCAgICAgIF9yZWYkc3R5bGl6ZSA9IF9yZWYuc3R5bGl6ZSxcblx0ICAgICAgc3R5bGl6ZSA9IF9yZWYkc3R5bGl6ZSA9PT0gdm9pZCAwID8gU3RyaW5nIDogX3JlZiRzdHlsaXplO1xuXG5cdCAgdmFyIG9wdGlvbnMgPSB7XG5cdCAgICBzaG93SGlkZGVuOiBCb29sZWFuKHNob3dIaWRkZW4pLFxuXHQgICAgZGVwdGg6IE51bWJlcihkZXB0aCksXG5cdCAgICBjb2xvcnM6IEJvb2xlYW4oY29sb3JzKSxcblx0ICAgIGN1c3RvbUluc3BlY3Q6IEJvb2xlYW4oY3VzdG9tSW5zcGVjdCksXG5cdCAgICBzaG93UHJveHk6IEJvb2xlYW4oc2hvd1Byb3h5KSxcblx0ICAgIG1heEFycmF5TGVuZ3RoOiBOdW1iZXIobWF4QXJyYXlMZW5ndGgpLFxuXHQgICAgYnJlYWtMZW5ndGg6IE51bWJlcihicmVha0xlbmd0aCksXG5cdCAgICB0cnVuY2F0ZTogTnVtYmVyKHRydW5jYXRlKSxcblx0ICAgIHNlZW46IHNlZW4sXG5cdCAgICBzdHlsaXplOiBzdHlsaXplXG5cdCAgfTtcblxuXHQgIGlmIChvcHRpb25zLmNvbG9ycykge1xuXHQgICAgb3B0aW9ucy5zdHlsaXplID0gY29sb3Jpc2U7XG5cdCAgfVxuXG5cdCAgcmV0dXJuIG9wdGlvbnM7XG5cdH1cblx0ZnVuY3Rpb24gdHJ1bmNhdGUoc3RyaW5nLCBsZW5ndGgpIHtcblx0ICB2YXIgdGFpbCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyICYmIGFyZ3VtZW50c1syXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzJdIDogdHJ1bmNhdG9yO1xuXHQgIHN0cmluZyA9IFN0cmluZyhzdHJpbmcpO1xuXHQgIHZhciB0YWlsTGVuZ3RoID0gdGFpbC5sZW5ndGg7XG5cdCAgdmFyIHN0cmluZ0xlbmd0aCA9IHN0cmluZy5sZW5ndGg7XG5cblx0ICBpZiAodGFpbExlbmd0aCA+IGxlbmd0aCAmJiBzdHJpbmdMZW5ndGggPiB0YWlsTGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gdGFpbDtcblx0ICB9XG5cblx0ICBpZiAoc3RyaW5nTGVuZ3RoID4gbGVuZ3RoICYmIHN0cmluZ0xlbmd0aCA+IHRhaWxMZW5ndGgpIHtcblx0ICAgIHJldHVybiBcIlwiLmNvbmNhdChzdHJpbmcuc2xpY2UoMCwgbGVuZ3RoIC0gdGFpbExlbmd0aCkpLmNvbmNhdCh0YWlsKTtcblx0ICB9XG5cblx0ICByZXR1cm4gc3RyaW5nO1xuXHR9IC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBjb21wbGV4aXR5XG5cblx0ZnVuY3Rpb24gaW5zcGVjdExpc3QobGlzdCwgb3B0aW9ucywgaW5zcGVjdEl0ZW0pIHtcblx0ICB2YXIgc2VwYXJhdG9yID0gYXJndW1lbnRzLmxlbmd0aCA+IDMgJiYgYXJndW1lbnRzWzNdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbM10gOiAnLCAnO1xuXHQgIGluc3BlY3RJdGVtID0gaW5zcGVjdEl0ZW0gfHwgb3B0aW9ucy5pbnNwZWN0O1xuXHQgIHZhciBzaXplID0gbGlzdC5sZW5ndGg7XG5cdCAgaWYgKHNpemUgPT09IDApIHJldHVybiAnJztcblx0ICB2YXIgb3JpZ2luYWxMZW5ndGggPSBvcHRpb25zLnRydW5jYXRlO1xuXHQgIHZhciBvdXRwdXQgPSAnJztcblx0ICB2YXIgcGVlayA9ICcnO1xuXHQgIHZhciB0cnVuY2F0ZWQgPSAnJztcblxuXHQgIGZvciAodmFyIGkgPSAwOyBpIDwgc2l6ZTsgaSArPSAxKSB7XG5cdCAgICB2YXIgbGFzdCA9IGkgKyAxID09PSBsaXN0Lmxlbmd0aDtcblx0ICAgIHZhciBzZWNvbmRUb0xhc3QgPSBpICsgMiA9PT0gbGlzdC5sZW5ndGg7XG5cdCAgICB0cnVuY2F0ZWQgPSBcIlwiLmNvbmNhdCh0cnVuY2F0b3IsIFwiKFwiKS5jb25jYXQobGlzdC5sZW5ndGggLSBpLCBcIilcIik7XG5cdCAgICB2YXIgdmFsdWUgPSBsaXN0W2ldOyAvLyBJZiB0aGVyZSBpcyBtb3JlIHRoYW4gb25lIHJlbWFpbmluZyB3ZSBuZWVkIHRvIGFjY291bnQgZm9yIGEgc2VwYXJhdG9yIG9mIGAsIGBcblxuXHQgICAgb3B0aW9ucy50cnVuY2F0ZSA9IG9yaWdpbmFsTGVuZ3RoIC0gb3V0cHV0Lmxlbmd0aCAtIChsYXN0ID8gMCA6IHNlcGFyYXRvci5sZW5ndGgpO1xuXHQgICAgdmFyIHN0cmluZyA9IHBlZWsgfHwgaW5zcGVjdEl0ZW0odmFsdWUsIG9wdGlvbnMpICsgKGxhc3QgPyAnJyA6IHNlcGFyYXRvcik7XG5cdCAgICB2YXIgbmV4dExlbmd0aCA9IG91dHB1dC5sZW5ndGggKyBzdHJpbmcubGVuZ3RoO1xuXHQgICAgdmFyIHRydW5jYXRlZExlbmd0aCA9IG5leHRMZW5ndGggKyB0cnVuY2F0ZWQubGVuZ3RoOyAvLyBJZiB0aGlzIGlzIHRoZSBsYXN0IGVsZW1lbnQsIGFuZCBhZGRpbmcgaXQgd291bGRcblx0ICAgIC8vIHRha2UgdXMgb3ZlciBsZW5ndGgsIGJ1dCBhZGRpbmcgdGhlIHRydW5jYXRvciB3b3VsZG4ndCAtIHRoZW4gYnJlYWsgbm93XG5cblx0ICAgIGlmIChsYXN0ICYmIG5leHRMZW5ndGggPiBvcmlnaW5hbExlbmd0aCAmJiBvdXRwdXQubGVuZ3RoICsgdHJ1bmNhdGVkLmxlbmd0aCA8PSBvcmlnaW5hbExlbmd0aCkge1xuXHQgICAgICBicmVhaztcblx0ICAgIH0gLy8gSWYgdGhpcyBpc24ndCB0aGUgbGFzdCBvciBzZWNvbmQgdG8gbGFzdCBlbGVtZW50IHRvIHNjYW4sXG5cdCAgICAvLyBidXQgdGhlIHN0cmluZyBpcyBhbHJlYWR5IG92ZXIgbGVuZ3RoIHRoZW4gYnJlYWsgaGVyZVxuXG5cblx0ICAgIGlmICghbGFzdCAmJiAhc2Vjb25kVG9MYXN0ICYmIHRydW5jYXRlZExlbmd0aCA+IG9yaWdpbmFsTGVuZ3RoKSB7XG5cdCAgICAgIGJyZWFrO1xuXHQgICAgfSAvLyBQZWVrIGF0IHRoZSBuZXh0IHN0cmluZyB0byBkZXRlcm1pbmUgaWYgd2Ugc2hvdWxkXG5cdCAgICAvLyBicmVhayBlYXJseSBiZWZvcmUgYWRkaW5nIHRoaXMgaXRlbSB0byB0aGUgb3V0cHV0XG5cblxuXHQgICAgcGVlayA9IGxhc3QgPyAnJyA6IGluc3BlY3RJdGVtKGxpc3RbaSArIDFdLCBvcHRpb25zKSArIChzZWNvbmRUb0xhc3QgPyAnJyA6IHNlcGFyYXRvcik7IC8vIElmIHdlIGhhdmUgb25lIGVsZW1lbnQgbGVmdCwgYnV0IHRoaXMgZWxlbWVudCBhbmRcblx0ICAgIC8vIHRoZSBuZXh0IHRha2VzIG92ZXIgbGVuZ3RoLCB0aGUgYnJlYWsgZWFybHlcblxuXHQgICAgaWYgKCFsYXN0ICYmIHNlY29uZFRvTGFzdCAmJiB0cnVuY2F0ZWRMZW5ndGggPiBvcmlnaW5hbExlbmd0aCAmJiBuZXh0TGVuZ3RoICsgcGVlay5sZW5ndGggPiBvcmlnaW5hbExlbmd0aCkge1xuXHQgICAgICBicmVhaztcblx0ICAgIH1cblxuXHQgICAgb3V0cHV0ICs9IHN0cmluZzsgLy8gSWYgdGhlIG5leHQgZWxlbWVudCB0YWtlcyB1cyB0byBsZW5ndGggLVxuXHQgICAgLy8gYnV0IHRoZXJlIGFyZSBtb3JlIGFmdGVyIHRoYXQsIHRoZW4gd2Ugc2hvdWxkIHRydW5jYXRlIG5vd1xuXG5cdCAgICBpZiAoIWxhc3QgJiYgIXNlY29uZFRvTGFzdCAmJiBuZXh0TGVuZ3RoICsgcGVlay5sZW5ndGggPj0gb3JpZ2luYWxMZW5ndGgpIHtcblx0ICAgICAgdHJ1bmNhdGVkID0gXCJcIi5jb25jYXQodHJ1bmNhdG9yLCBcIihcIikuY29uY2F0KGxpc3QubGVuZ3RoIC0gaSAtIDEsIFwiKVwiKTtcblx0ICAgICAgYnJlYWs7XG5cdCAgICB9XG5cblx0ICAgIHRydW5jYXRlZCA9ICcnO1xuXHQgIH1cblxuXHQgIHJldHVybiBcIlwiLmNvbmNhdChvdXRwdXQpLmNvbmNhdCh0cnVuY2F0ZWQpO1xuXHR9XG5cdGZ1bmN0aW9uIGluc3BlY3RQcm9wZXJ0eShfcmVmMiwgb3B0aW9ucykge1xuXHQgIHZhciBfcmVmMyA9IF9zbGljZWRUb0FycmF5KF9yZWYyLCAyKSxcblx0ICAgICAga2V5ID0gX3JlZjNbMF0sXG5cdCAgICAgIHZhbHVlID0gX3JlZjNbMV07XG5cblx0ICBvcHRpb25zLnRydW5jYXRlIC09IDI7XG5cblx0ICBpZiAodHlwZW9mIGtleSAhPT0gJ3N0cmluZycgJiYgdHlwZW9mIGtleSAhPT0gJ251bWJlcicpIHtcblx0ICAgIGtleSA9IFwiW1wiLmNvbmNhdChvcHRpb25zLmluc3BlY3Qoa2V5LCBvcHRpb25zKSwgXCJdXCIpO1xuXHQgIH1cblxuXHQgIG9wdGlvbnMudHJ1bmNhdGUgLT0ga2V5Lmxlbmd0aDtcblx0ICB2YWx1ZSA9IG9wdGlvbnMuaW5zcGVjdCh2YWx1ZSwgb3B0aW9ucyk7XG5cdCAgcmV0dXJuIFwiXCIuY29uY2F0KGtleSwgXCI6IFwiKS5jb25jYXQodmFsdWUpO1xuXHR9XG5cblx0ZnVuY3Rpb24gaW5zcGVjdEFycmF5KGFycmF5LCBvcHRpb25zKSB7XG5cdCAgLy8gT2JqZWN0LmtleXMgd2lsbCBhbHdheXMgb3V0cHV0IHRoZSBBcnJheSBpbmRpY2VzIGZpcnN0LCBzbyB3ZSBjYW4gc2xpY2UgYnlcblx0ICAvLyBgYXJyYXkubGVuZ3RoYCB0byBnZXQgbm9uLWluZGV4IHByb3BlcnRpZXNcblx0ICB2YXIgbm9uSW5kZXhQcm9wZXJ0aWVzID0gT2JqZWN0LmtleXMoYXJyYXkpLnNsaWNlKGFycmF5Lmxlbmd0aCk7XG5cdCAgaWYgKCFhcnJheS5sZW5ndGggJiYgIW5vbkluZGV4UHJvcGVydGllcy5sZW5ndGgpIHJldHVybiAnW10nO1xuXHQgIG9wdGlvbnMudHJ1bmNhdGUgLT0gNDtcblx0ICB2YXIgbGlzdENvbnRlbnRzID0gaW5zcGVjdExpc3QoYXJyYXksIG9wdGlvbnMpO1xuXHQgIG9wdGlvbnMudHJ1bmNhdGUgLT0gbGlzdENvbnRlbnRzLmxlbmd0aDtcblx0ICB2YXIgcHJvcGVydHlDb250ZW50cyA9ICcnO1xuXG5cdCAgaWYgKG5vbkluZGV4UHJvcGVydGllcy5sZW5ndGgpIHtcblx0ICAgIHByb3BlcnR5Q29udGVudHMgPSBpbnNwZWN0TGlzdChub25JbmRleFByb3BlcnRpZXMubWFwKGZ1bmN0aW9uIChrZXkpIHtcblx0ICAgICAgcmV0dXJuIFtrZXksIGFycmF5W2tleV1dO1xuXHQgICAgfSksIG9wdGlvbnMsIGluc3BlY3RQcm9wZXJ0eSk7XG5cdCAgfVxuXG5cdCAgcmV0dXJuIFwiWyBcIi5jb25jYXQobGlzdENvbnRlbnRzKS5jb25jYXQocHJvcGVydHlDb250ZW50cyA/IFwiLCBcIi5jb25jYXQocHJvcGVydHlDb250ZW50cykgOiAnJywgXCIgXVwiKTtcblx0fVxuXG5cdC8qICFcblx0ICogQ2hhaSAtIGdldEZ1bmNOYW1lIHV0aWxpdHlcblx0ICogQ29weXJpZ2h0KGMpIDIwMTItMjAxNiBKYWtlIEx1ZXIgPGpha2VAYWxvZ2ljYWxwYXJhZG94LmNvbT5cblx0ICogTUlUIExpY2Vuc2VkXG5cdCAqL1xuXG5cdC8qKlxuXHQgKiAjIyMgLmdldEZ1bmNOYW1lKGNvbnN0cnVjdG9yRm4pXG5cdCAqXG5cdCAqIFJldHVybnMgdGhlIG5hbWUgb2YgYSBmdW5jdGlvbi5cblx0ICogV2hlbiBhIG5vbi1mdW5jdGlvbiBpbnN0YW5jZSBpcyBwYXNzZWQsIHJldHVybnMgYG51bGxgLlxuXHQgKiBUaGlzIGFsc28gaW5jbHVkZXMgYSBwb2x5ZmlsbCBmdW5jdGlvbiBpZiBgYUZ1bmMubmFtZWAgaXMgbm90IGRlZmluZWQuXG5cdCAqXG5cdCAqIEBuYW1lIGdldEZ1bmNOYW1lXG5cdCAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmN0XG5cdCAqIEBuYW1lc3BhY2UgVXRpbHNcblx0ICogQGFwaSBwdWJsaWNcblx0ICovXG5cblx0dmFyIHRvU3RyaW5nID0gRnVuY3Rpb24ucHJvdG90eXBlLnRvU3RyaW5nO1xuXHR2YXIgZnVuY3Rpb25OYW1lTWF0Y2ggPSAvXFxzKmZ1bmN0aW9uKD86XFxzfFxccypcXC9cXCpbXig/OipcXC8pXStcXCpcXC9cXHMqKSooW15cXHNcXChcXC9dKykvO1xuXHRmdW5jdGlvbiBnZXRGdW5jTmFtZShhRnVuYykge1xuXHQgIGlmICh0eXBlb2YgYUZ1bmMgIT09ICdmdW5jdGlvbicpIHtcblx0ICAgIHJldHVybiBudWxsO1xuXHQgIH1cblxuXHQgIHZhciBuYW1lID0gJyc7XG5cdCAgaWYgKHR5cGVvZiBGdW5jdGlvbi5wcm90b3R5cGUubmFtZSA9PT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGFGdW5jLm5hbWUgPT09ICd1bmRlZmluZWQnKSB7XG5cdCAgICAvLyBIZXJlIHdlIHJ1biBhIHBvbHlmaWxsIGlmIEZ1bmN0aW9uIGRvZXMgbm90IHN1cHBvcnQgdGhlIGBuYW1lYCBwcm9wZXJ0eSBhbmQgaWYgYUZ1bmMubmFtZSBpcyBub3QgZGVmaW5lZFxuXHQgICAgdmFyIG1hdGNoID0gdG9TdHJpbmcuY2FsbChhRnVuYykubWF0Y2goZnVuY3Rpb25OYW1lTWF0Y2gpO1xuXHQgICAgaWYgKG1hdGNoKSB7XG5cdCAgICAgIG5hbWUgPSBtYXRjaFsxXTtcblx0ICAgIH1cblx0ICB9IGVsc2Uge1xuXHQgICAgLy8gSWYgd2UndmUgZ290IGEgYG5hbWVgIHByb3BlcnR5IHdlIGp1c3QgdXNlIGl0XG5cdCAgICBuYW1lID0gYUZ1bmMubmFtZTtcblx0ICB9XG5cblx0ICByZXR1cm4gbmFtZTtcblx0fVxuXG5cdHZhciBnZXRGdW5jTmFtZV8xID0gZ2V0RnVuY05hbWU7XG5cblx0dmFyIHRvU3RyaW5nVGFnID0gdHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnID8gU3ltYm9sLnRvU3RyaW5nVGFnIDogZmFsc2U7XG5cblx0dmFyIGdldEFycmF5TmFtZSA9IGZ1bmN0aW9uIGdldEFycmF5TmFtZShhcnJheSkge1xuXHQgIC8vIFdlIG5lZWQgdG8gc3BlY2lhbCBjYXNlIE5vZGUuanMnIEJ1ZmZlcnMsIHdoaWNoIHJlcG9ydCB0byBiZSBVaW50OEFycmF5XG5cdCAgaWYgKHR5cGVvZiBCdWZmZXIgPT09ICdmdW5jdGlvbicgJiYgYXJyYXkgaW5zdGFuY2VvZiBCdWZmZXIpIHtcblx0ICAgIHJldHVybiAnQnVmZmVyJztcblx0ICB9XG5cblx0ICBpZiAodG9TdHJpbmdUYWcgJiYgdG9TdHJpbmdUYWcgaW4gYXJyYXkpIHtcblx0ICAgIHJldHVybiBhcnJheVt0b1N0cmluZ1RhZ107XG5cdCAgfVxuXG5cdCAgcmV0dXJuIGdldEZ1bmNOYW1lXzEoYXJyYXkuY29uc3RydWN0b3IpO1xuXHR9O1xuXG5cdGZ1bmN0aW9uIGluc3BlY3RUeXBlZEFycmF5KGFycmF5LCBvcHRpb25zKSB7XG5cdCAgdmFyIG5hbWUgPSBnZXRBcnJheU5hbWUoYXJyYXkpO1xuXHQgIG9wdGlvbnMudHJ1bmNhdGUgLT0gbmFtZS5sZW5ndGggKyA0OyAvLyBPYmplY3Qua2V5cyB3aWxsIGFsd2F5cyBvdXRwdXQgdGhlIEFycmF5IGluZGljZXMgZmlyc3QsIHNvIHdlIGNhbiBzbGljZSBieVxuXHQgIC8vIGBhcnJheS5sZW5ndGhgIHRvIGdldCBub24taW5kZXggcHJvcGVydGllc1xuXG5cdCAgdmFyIG5vbkluZGV4UHJvcGVydGllcyA9IE9iamVjdC5rZXlzKGFycmF5KS5zbGljZShhcnJheS5sZW5ndGgpO1xuXHQgIGlmICghYXJyYXkubGVuZ3RoICYmICFub25JbmRleFByb3BlcnRpZXMubGVuZ3RoKSByZXR1cm4gXCJcIi5jb25jYXQobmFtZSwgXCJbXVwiKTsgLy8gQXMgd2Uga25vdyBUeXBlZEFycmF5cyBvbmx5IGNvbnRhaW4gVW5zaWduZWQgSW50ZWdlcnMsIHdlIGNhbiBza2lwIGluc3BlY3RpbmcgZWFjaCBvbmUgYW5kIHNpbXBseVxuXHQgIC8vIHN0eWxpc2UgdGhlIHRvU3RyaW5nKCkgdmFsdWUgb2YgdGhlbVxuXG5cdCAgdmFyIG91dHB1dCA9ICcnO1xuXG5cdCAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuXHQgICAgdmFyIHN0cmluZyA9IFwiXCIuY29uY2F0KG9wdGlvbnMuc3R5bGl6ZSh0cnVuY2F0ZShhcnJheVtpXSwgb3B0aW9ucy50cnVuY2F0ZSksICdudW1iZXInKSkuY29uY2F0KGFycmF5W2ldID09PSBhcnJheS5sZW5ndGggPyAnJyA6ICcsICcpO1xuXHQgICAgb3B0aW9ucy50cnVuY2F0ZSAtPSBzdHJpbmcubGVuZ3RoO1xuXG5cdCAgICBpZiAoYXJyYXlbaV0gIT09IGFycmF5Lmxlbmd0aCAmJiBvcHRpb25zLnRydW5jYXRlIDw9IDMpIHtcblx0ICAgICAgb3V0cHV0ICs9IFwiXCIuY29uY2F0KHRydW5jYXRvciwgXCIoXCIpLmNvbmNhdChhcnJheS5sZW5ndGggLSBhcnJheVtpXSArIDEsIFwiKVwiKTtcblx0ICAgICAgYnJlYWs7XG5cdCAgICB9XG5cblx0ICAgIG91dHB1dCArPSBzdHJpbmc7XG5cdCAgfVxuXG5cdCAgdmFyIHByb3BlcnR5Q29udGVudHMgPSAnJztcblxuXHQgIGlmIChub25JbmRleFByb3BlcnRpZXMubGVuZ3RoKSB7XG5cdCAgICBwcm9wZXJ0eUNvbnRlbnRzID0gaW5zcGVjdExpc3Qobm9uSW5kZXhQcm9wZXJ0aWVzLm1hcChmdW5jdGlvbiAoa2V5KSB7XG5cdCAgICAgIHJldHVybiBba2V5LCBhcnJheVtrZXldXTtcblx0ICAgIH0pLCBvcHRpb25zLCBpbnNwZWN0UHJvcGVydHkpO1xuXHQgIH1cblxuXHQgIHJldHVybiBcIlwiLmNvbmNhdChuYW1lLCBcIlsgXCIpLmNvbmNhdChvdXRwdXQpLmNvbmNhdChwcm9wZXJ0eUNvbnRlbnRzID8gXCIsIFwiLmNvbmNhdChwcm9wZXJ0eUNvbnRlbnRzKSA6ICcnLCBcIiBdXCIpO1xuXHR9XG5cblx0ZnVuY3Rpb24gaW5zcGVjdERhdGUoZGF0ZU9iamVjdCwgb3B0aW9ucykge1xuXHQgIC8vIElmIHdlIG5lZWQgdG8gLSB0cnVuY2F0ZSB0aGUgdGltZSBwb3J0aW9uLCBidXQgbmV2ZXIgdGhlIGRhdGVcblx0ICB2YXIgc3BsaXQgPSBkYXRlT2JqZWN0LnRvSlNPTigpLnNwbGl0KCdUJyk7XG5cdCAgdmFyIGRhdGUgPSBzcGxpdFswXTtcblx0ICByZXR1cm4gb3B0aW9ucy5zdHlsaXplKFwiXCIuY29uY2F0KGRhdGUsIFwiVFwiKS5jb25jYXQodHJ1bmNhdGUoc3BsaXRbMV0sIG9wdGlvbnMudHJ1bmNhdGUgLSBkYXRlLmxlbmd0aCAtIDEpKSwgJ2RhdGUnKTtcblx0fVxuXG5cdHZhciB0b1N0cmluZyQxID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuXHR2YXIgZ2V0RnVuY3Rpb25OYW1lID0gZnVuY3Rpb24oZm4pIHtcblx0ICBpZiAodG9TdHJpbmckMS5jYWxsKGZuKSAhPT0gJ1tvYmplY3QgRnVuY3Rpb25dJykgcmV0dXJuIG51bGxcblx0ICBpZiAoZm4ubmFtZSkgcmV0dXJuIGZuLm5hbWVcblx0ICB2YXIgbmFtZSA9IC9eXFxzKmZ1bmN0aW9uXFxzKihbXlxcKF0qKS9pbS5leGVjKGZuLnRvU3RyaW5nKCkpWzFdO1xuXHQgIHJldHVybiBuYW1lIHx8ICdhbm9ueW1vdXMnXG5cdH07XG5cblx0ZnVuY3Rpb24gaW5zcGVjdEZ1bmN0aW9uKGZ1bmMsIG9wdGlvbnMpIHtcblx0ICB2YXIgbmFtZSA9IGdldEZ1bmN0aW9uTmFtZShmdW5jKTtcblxuXHQgIGlmIChuYW1lID09PSAnYW5vbnltb3VzJykge1xuXHQgICAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZSgnW0Z1bmN0aW9uXScsICdzcGVjaWFsJyk7XG5cdCAgfVxuXG5cdCAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZShcIltGdW5jdGlvbiBcIi5jb25jYXQodHJ1bmNhdGUobmFtZSwgb3B0aW9ucy50cnVuY2F0ZSAtIDExKSwgXCJdXCIpLCAnc3BlY2lhbCcpO1xuXHR9XG5cblx0ZnVuY3Rpb24gaW5zcGVjdE1hcEVudHJ5KF9yZWYsIG9wdGlvbnMpIHtcblx0ICB2YXIgX3JlZjIgPSBfc2xpY2VkVG9BcnJheShfcmVmLCAyKSxcblx0ICAgICAga2V5ID0gX3JlZjJbMF0sXG5cdCAgICAgIHZhbHVlID0gX3JlZjJbMV07XG5cblx0ICBvcHRpb25zLnRydW5jYXRlIC09IDQ7XG5cdCAga2V5ID0gb3B0aW9ucy5pbnNwZWN0KGtleSwgb3B0aW9ucyk7XG5cdCAgb3B0aW9ucy50cnVuY2F0ZSAtPSBrZXkubGVuZ3RoO1xuXHQgIHZhbHVlID0gb3B0aW9ucy5pbnNwZWN0KHZhbHVlLCBvcHRpb25zKTtcblx0ICByZXR1cm4gXCJcIi5jb25jYXQoa2V5LCBcIiA9PiBcIikuY29uY2F0KHZhbHVlKTtcblx0fSAvLyBJRTExIGRvZXNuJ3Qgc3VwcG9ydCBgbWFwLmVudHJpZXMoKWBcblxuXG5cdGZ1bmN0aW9uIG1hcFRvRW50cmllcyhtYXApIHtcblx0ICB2YXIgZW50cmllcyA9IFtdO1xuXHQgIG1hcC5mb3JFYWNoKGZ1bmN0aW9uICh2YWx1ZSwga2V5KSB7XG5cdCAgICBlbnRyaWVzLnB1c2goW2tleSwgdmFsdWVdKTtcblx0ICB9KTtcblx0ICByZXR1cm4gZW50cmllcztcblx0fVxuXG5cdGZ1bmN0aW9uIGluc3BlY3RNYXAobWFwLCBvcHRpb25zKSB7XG5cdCAgdmFyIHNpemUgPSBtYXAuc2l6ZSAtIDE7XG5cblx0ICBpZiAoc2l6ZSA8PSAwKSB7XG5cdCAgICByZXR1cm4gJ01hcHt9Jztcblx0ICB9XG5cblx0ICBvcHRpb25zLnRydW5jYXRlIC09IDc7XG5cdCAgcmV0dXJuIFwiTWFweyBcIi5jb25jYXQoaW5zcGVjdExpc3QobWFwVG9FbnRyaWVzKG1hcCksIG9wdGlvbnMsIGluc3BlY3RNYXBFbnRyeSksIFwiIH1cIik7XG5cdH1cblxuXHR2YXIgaXNOYU4gPSBOdW1iZXIuaXNOYU4gfHwgZnVuY3Rpb24gKGkpIHtcblx0ICByZXR1cm4gaSAhPT0gaTtcblx0fTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1zZWxmLWNvbXBhcmVcblxuXG5cdGZ1bmN0aW9uIGluc3BlY3ROdW1iZXIobnVtYmVyLCBvcHRpb25zKSB7XG5cdCAgaWYgKGlzTmFOKG51bWJlcikpIHtcblx0ICAgIHJldHVybiBvcHRpb25zLnN0eWxpemUoJ05hTicsICdudW1iZXInKTtcblx0ICB9XG5cblx0ICBpZiAobnVtYmVyID09PSBJbmZpbml0eSkge1xuXHQgICAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZSgnSW5maW5pdHknLCAnbnVtYmVyJyk7XG5cdCAgfVxuXG5cdCAgaWYgKG51bWJlciA9PT0gLUluZmluaXR5KSB7XG5cdCAgICByZXR1cm4gb3B0aW9ucy5zdHlsaXplKCctSW5maW5pdHknLCAnbnVtYmVyJyk7XG5cdCAgfVxuXG5cdCAgaWYgKG51bWJlciA9PT0gMCkge1xuXHQgICAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZSgxIC8gbnVtYmVyID09PSBJbmZpbml0eSA/ICcrMCcgOiAnLTAnLCAnbnVtYmVyJyk7XG5cdCAgfVxuXG5cdCAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZSh0cnVuY2F0ZShudW1iZXIsIG9wdGlvbnMudHJ1bmNhdGUpLCAnbnVtYmVyJyk7XG5cdH1cblxuXHRmdW5jdGlvbiBpbnNwZWN0UmVnRXhwKHZhbHVlLCBvcHRpb25zKSB7XG5cdCAgdmFyIGZsYWdzID0gdmFsdWUudG9TdHJpbmcoKS5zcGxpdCgnLycpWzJdO1xuXHQgIHZhciBzb3VyY2VMZW5ndGggPSBvcHRpb25zLnRydW5jYXRlIC0gKDIgKyBmbGFncy5sZW5ndGgpO1xuXHQgIHZhciBzb3VyY2UgPSB2YWx1ZS5zb3VyY2U7XG5cdCAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZShcIi9cIi5jb25jYXQodHJ1bmNhdGUoc291cmNlLCBzb3VyY2VMZW5ndGgpLCBcIi9cIikuY29uY2F0KGZsYWdzKSwgJ3JlZ2V4cCcpO1xuXHR9XG5cblx0ZnVuY3Rpb24gYXJyYXlGcm9tU2V0KHNldCkge1xuXHQgIHZhciB2YWx1ZXMgPSBbXTtcblx0ICBzZXQuZm9yRWFjaChmdW5jdGlvbiAodmFsdWUpIHtcblx0ICAgIHZhbHVlcy5wdXNoKHZhbHVlKTtcblx0ICB9KTtcblx0ICByZXR1cm4gdmFsdWVzO1xuXHR9XG5cblx0ZnVuY3Rpb24gaW5zcGVjdFNldChzZXQsIG9wdGlvbnMpIHtcblx0ICBpZiAoc2V0LnNpemUgPT09IDApIHJldHVybiAnU2V0e30nO1xuXHQgIG9wdGlvbnMudHJ1bmNhdGUgLT0gNztcblx0ICByZXR1cm4gXCJTZXR7IFwiLmNvbmNhdChpbnNwZWN0TGlzdChhcnJheUZyb21TZXQoc2V0KSwgb3B0aW9ucyksIFwiIH1cIik7XG5cdH1cblxuXHR2YXIgc3RyaW5nRXNjYXBlQ2hhcnMgPSBuZXcgUmVnRXhwKFwiWydcXFxcdTAwMDAtXFxcXHUwMDFmXFxcXHUwMDdmLVxcXFx1MDA5ZlxcXFx1MDBhZFxcXFx1MDYwMC1cXFxcdTA2MDRcXFxcdTA3MGZcXFxcdTE3YjRcXFxcdTE3YjVcIiArIFwiXFxcXHUyMDBjLVxcXFx1MjAwZlxcXFx1MjAyOC1cXFxcdTIwMmZcXFxcdTIwNjAtXFxcXHUyMDZmXFxcXHVmZWZmXFxcXHVmZmYwLVxcXFx1ZmZmZl1cIiwgJ2cnKTtcblx0dmFyIGVzY2FwZUNoYXJhY3RlcnMgPSB7XG5cdCAgJ1xcYic6ICdcXFxcYicsXG5cdCAgJ1xcdCc6ICdcXFxcdCcsXG5cdCAgJ1xcbic6ICdcXFxcbicsXG5cdCAgJ1xcZic6ICdcXFxcZicsXG5cdCAgJ1xccic6ICdcXFxccicsXG5cdCAgXCInXCI6IFwiXFxcXCdcIixcblx0ICAnXFxcXCc6ICdcXFxcXFxcXCdcblx0fTtcblx0dmFyIGhleCA9IDE2O1xuXHR2YXIgdW5pY29kZUxlbmd0aCA9IDQ7XG5cblx0ZnVuY3Rpb24gZXNjYXBlKGNoYXIpIHtcblx0ICByZXR1cm4gZXNjYXBlQ2hhcmFjdGVyc1tjaGFyXSB8fCBcIlxcXFx1XCIuY29uY2F0KFwiMDAwMFwiLmNvbmNhdChjaGFyLmNoYXJDb2RlQXQoMCkudG9TdHJpbmcoaGV4KSkuc2xpY2UoLXVuaWNvZGVMZW5ndGgpKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGluc3BlY3RTdHJpbmcoc3RyaW5nLCBvcHRpb25zKSB7XG5cdCAgaWYgKHN0cmluZ0VzY2FwZUNoYXJzLnRlc3Qoc3RyaW5nKSkge1xuXHQgICAgc3RyaW5nID0gc3RyaW5nLnJlcGxhY2Uoc3RyaW5nRXNjYXBlQ2hhcnMsIGVzY2FwZSk7XG5cdCAgfVxuXG5cdCAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZShcIidcIi5jb25jYXQodHJ1bmNhdGUoc3RyaW5nLCBvcHRpb25zLnRydW5jYXRlIC0gMiksIFwiJ1wiKSwgJ3N0cmluZycpO1xuXHR9XG5cblx0ZnVuY3Rpb24gaW5zcGVjdFN5bWJvbCh2YWx1ZSkge1xuXHQgIGlmICgnZGVzY3JpcHRpb24nIGluIFN5bWJvbC5wcm90b3R5cGUpIHtcblx0ICAgIHJldHVybiBcIlN5bWJvbChcIi5jb25jYXQodmFsdWUuZGVzY3JpcHRpb24sIFwiKVwiKTtcblx0ICB9XG5cblx0ICByZXR1cm4gdmFsdWUudG9TdHJpbmcoKTtcblx0fVxuXG5cdHZhciBnZXRQcm9taXNlVmFsdWUgPSBmdW5jdGlvbiBnZXRQcm9taXNlVmFsdWUoKSB7XG5cdCAgcmV0dXJuICdQcm9taXNle+KApn0nO1xuXHR9O1xuXG5cdHRyeSB7XG5cdCAgdmFyIF9wcm9jZXNzJGJpbmRpbmcgPSBwcm9jZXNzLmJpbmRpbmcoJ3V0aWwnKSxcblx0ICAgICAgZ2V0UHJvbWlzZURldGFpbHMgPSBfcHJvY2VzcyRiaW5kaW5nLmdldFByb21pc2VEZXRhaWxzLFxuXHQgICAgICBrUGVuZGluZyA9IF9wcm9jZXNzJGJpbmRpbmcua1BlbmRpbmcsXG5cdCAgICAgIGtSZWplY3RlZCA9IF9wcm9jZXNzJGJpbmRpbmcua1JlamVjdGVkO1xuXG5cdCAgZ2V0UHJvbWlzZVZhbHVlID0gZnVuY3Rpb24gZ2V0UHJvbWlzZVZhbHVlKHZhbHVlLCBvcHRpb25zKSB7XG5cdCAgICB2YXIgX2dldFByb21pc2VEZXRhaWxzID0gZ2V0UHJvbWlzZURldGFpbHModmFsdWUpLFxuXHQgICAgICAgIF9nZXRQcm9taXNlRGV0YWlsczIgPSBfc2xpY2VkVG9BcnJheShfZ2V0UHJvbWlzZURldGFpbHMsIDIpLFxuXHQgICAgICAgIHN0YXRlID0gX2dldFByb21pc2VEZXRhaWxzMlswXSxcblx0ICAgICAgICBpbm5lclZhbHVlID0gX2dldFByb21pc2VEZXRhaWxzMlsxXTtcblxuXHQgICAgaWYgKHN0YXRlID09PSBrUGVuZGluZykge1xuXHQgICAgICByZXR1cm4gJ1Byb21pc2V7PHBlbmRpbmc+fSc7XG5cdCAgICB9XG5cblx0ICAgIHJldHVybiBcIlByb21pc2VcIi5jb25jYXQoc3RhdGUgPT09IGtSZWplY3RlZCA/ICchJyA6ICcnLCBcIntcIikuY29uY2F0KG9wdGlvbnMuaW5zcGVjdChpbm5lclZhbHVlLCBvcHRpb25zKSwgXCJ9XCIpO1xuXHQgIH07XG5cdH0gY2F0Y2ggKG5vdE5vZGUpIHtcblx0ICAvKiBpZ25vcmUgKi9cblx0fVxuXG5cdHZhciBpbnNwZWN0UHJvbWlzZSA9IGdldFByb21pc2VWYWx1ZTtcblxuXHRmdW5jdGlvbiBpbnNwZWN0T2JqZWN0KG9iamVjdCwgb3B0aW9ucykge1xuXHQgIHZhciBwcm9wZXJ0aWVzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob2JqZWN0KTtcblx0ICB2YXIgc3ltYm9scyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPyBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKG9iamVjdCkgOiBbXTtcblxuXHQgIGlmIChwcm9wZXJ0aWVzLmxlbmd0aCA9PT0gMCAmJiBzeW1ib2xzLmxlbmd0aCA9PT0gMCkge1xuXHQgICAgcmV0dXJuICd7fSc7XG5cdCAgfVxuXG5cdCAgb3B0aW9ucy50cnVuY2F0ZSAtPSA0O1xuXHQgIHZhciBwcm9wZXJ0eUNvbnRlbnRzID0gaW5zcGVjdExpc3QocHJvcGVydGllcy5tYXAoZnVuY3Rpb24gKGtleSkge1xuXHQgICAgcmV0dXJuIFtrZXksIG9iamVjdFtrZXldXTtcblx0ICB9KSwgb3B0aW9ucywgaW5zcGVjdFByb3BlcnR5KTtcblx0ICB2YXIgc3ltYm9sQ29udGVudHMgPSBpbnNwZWN0TGlzdChzeW1ib2xzLm1hcChmdW5jdGlvbiAoa2V5KSB7XG5cdCAgICByZXR1cm4gW2tleSwgb2JqZWN0W2tleV1dO1xuXHQgIH0pLCBvcHRpb25zLCBpbnNwZWN0UHJvcGVydHkpO1xuXHQgIHZhciBzZXAgPSAnJztcblxuXHQgIGlmIChwcm9wZXJ0eUNvbnRlbnRzICYmIHN5bWJvbENvbnRlbnRzKSB7XG5cdCAgICBzZXAgPSAnLCAnO1xuXHQgIH1cblxuXHQgIHJldHVybiBcInsgXCIuY29uY2F0KHByb3BlcnR5Q29udGVudHMpLmNvbmNhdChzZXApLmNvbmNhdChzeW1ib2xDb250ZW50cywgXCIgfVwiKTtcblx0fVxuXG5cdHZhciB0b1N0cmluZ1RhZyQxID0gdHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnID8gU3ltYm9sLnRvU3RyaW5nVGFnIDogZmFsc2U7XG5cdGZ1bmN0aW9uIGluc3BlY3RDbGFzcyh2YWx1ZSwgb3B0aW9ucykge1xuXHQgIHZhciBuYW1lID0gJyc7XG5cblx0ICBpZiAodG9TdHJpbmdUYWckMSAmJiB0b1N0cmluZ1RhZyQxIGluIHZhbHVlKSB7XG5cdCAgICBuYW1lID0gdmFsdWVbdG9TdHJpbmdUYWckMV07XG5cdCAgfVxuXG5cdCAgbmFtZSA9IG5hbWUgfHwgZ2V0RnVuY05hbWVfMSh2YWx1ZS5jb25zdHJ1Y3Rvcik7IC8vIEJhYmVsIHRyYW5zZm9ybXMgYW5vbnltb3VzIGNsYXNzZXMgdG8gdGhlIG5hbWUgYF9jbGFzc2BcblxuXHQgIGlmICghbmFtZSB8fCBuYW1lID09PSAnX2NsYXNzJykge1xuXHQgICAgbmFtZSA9ICc8QW5vbnltb3VzIENsYXNzPic7XG5cdCAgfVxuXG5cdCAgb3B0aW9ucy50cnVuY2F0ZSAtPSBuYW1lLmxlbmd0aDtcblx0ICByZXR1cm4gXCJcIi5jb25jYXQobmFtZSkuY29uY2F0KGluc3BlY3RPYmplY3QodmFsdWUsIG9wdGlvbnMpKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGluc3BlY3RBcmd1bWVudHMoYXJncywgb3B0aW9ucykge1xuXHQgIGlmIChhcmdzLmxlbmd0aCA9PT0gMCkgcmV0dXJuICdBcmd1bWVudHNbXSc7XG5cdCAgb3B0aW9ucy50cnVuY2F0ZSAtPSAxMztcblx0ICByZXR1cm4gXCJBcmd1bWVudHNbIFwiLmNvbmNhdChpbnNwZWN0TGlzdChhcmdzLCBvcHRpb25zKSwgXCIgXVwiKTtcblx0fVxuXG5cdHZhciBlcnJvcktleXMgPSBbJ3N0YWNrJywgJ2xpbmUnLCAnY29sdW1uJywgJ25hbWUnLCAnbWVzc2FnZScsICdmaWxlTmFtZScsICdsaW5lTnVtYmVyJywgJ2NvbHVtbk51bWJlcicsICdudW1iZXInLCAnZGVzY3JpcHRpb24nXTtcblx0ZnVuY3Rpb24gaW5zcGVjdE9iamVjdCQxKGVycm9yLCBvcHRpb25zKSB7XG5cdCAgdmFyIHByb3BlcnRpZXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhlcnJvcikuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHtcblx0ICAgIHJldHVybiBlcnJvcktleXMuaW5kZXhPZihrZXkpID09PSAtMTtcblx0ICB9KTtcblx0ICB2YXIgbmFtZSA9IGVycm9yLm5hbWU7XG5cdCAgb3B0aW9ucy50cnVuY2F0ZSAtPSBuYW1lLmxlbmd0aDtcblx0ICB2YXIgbWVzc2FnZSA9ICcnO1xuXG5cdCAgaWYgKHR5cGVvZiBlcnJvci5tZXNzYWdlID09PSAnc3RyaW5nJykge1xuXHQgICAgbWVzc2FnZSA9IHRydW5jYXRlKGVycm9yLm1lc3NhZ2UsIG9wdGlvbnMudHJ1bmNhdGUpO1xuXHQgIH0gZWxzZSB7XG5cdCAgICBwcm9wZXJ0aWVzLnVuc2hpZnQoJ21lc3NhZ2UnKTtcblx0ICB9XG5cblx0ICBtZXNzYWdlID0gbWVzc2FnZSA/IFwiOiBcIi5jb25jYXQobWVzc2FnZSkgOiAnJztcblx0ICBvcHRpb25zLnRydW5jYXRlIC09IG1lc3NhZ2UubGVuZ3RoICsgNTtcblx0ICB2YXIgcHJvcGVydHlDb250ZW50cyA9IGluc3BlY3RMaXN0KHByb3BlcnRpZXMubWFwKGZ1bmN0aW9uIChrZXkpIHtcblx0ICAgIHJldHVybiBba2V5LCBlcnJvcltrZXldXTtcblx0ICB9KSwgb3B0aW9ucywgaW5zcGVjdFByb3BlcnR5KTtcblx0ICByZXR1cm4gXCJcIi5jb25jYXQobmFtZSkuY29uY2F0KG1lc3NhZ2UpLmNvbmNhdChwcm9wZXJ0eUNvbnRlbnRzID8gXCIgeyBcIi5jb25jYXQocHJvcGVydHlDb250ZW50cywgXCIgfVwiKSA6ICcnKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGluc3BlY3RBdHRyaWJ1dGUoX3JlZiwgb3B0aW9ucykge1xuXHQgIHZhciBfcmVmMiA9IF9zbGljZWRUb0FycmF5KF9yZWYsIDIpLFxuXHQgICAgICBrZXkgPSBfcmVmMlswXSxcblx0ICAgICAgdmFsdWUgPSBfcmVmMlsxXTtcblxuXHQgIG9wdGlvbnMudHJ1bmNhdGUgLT0gMztcblxuXHQgIGlmICghdmFsdWUpIHtcblx0ICAgIHJldHVybiBcIlwiLmNvbmNhdChvcHRpb25zLnN0eWxpemUoa2V5LCAneWVsbG93JykpO1xuXHQgIH1cblxuXHQgIHJldHVybiBcIlwiLmNvbmNhdChvcHRpb25zLnN0eWxpemUoa2V5LCAneWVsbG93JyksIFwiPVwiKS5jb25jYXQob3B0aW9ucy5zdHlsaXplKFwiXFxcIlwiLmNvbmNhdCh2YWx1ZSwgXCJcXFwiXCIpLCAnc3RyaW5nJykpO1xuXHR9XG5cdGZ1bmN0aW9uIGluc3BlY3RIVE1MQ29sbGVjdGlvbihjb2xsZWN0aW9uLCBvcHRpb25zKSB7XG5cdCAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXVzZS1iZWZvcmUtZGVmaW5lXG5cdCAgcmV0dXJuIGluc3BlY3RMaXN0KGNvbGxlY3Rpb24sIG9wdGlvbnMsIGluc3BlY3RIVE1MLCAnXFxuJyk7XG5cdH1cblx0ZnVuY3Rpb24gaW5zcGVjdEhUTUwoZWxlbWVudCwgb3B0aW9ucykge1xuXHQgIHZhciBwcm9wZXJ0aWVzID0gZWxlbWVudC5nZXRBdHRyaWJ1dGVOYW1lcygpO1xuXHQgIHZhciBuYW1lID0gZWxlbWVudC50YWdOYW1lLnRvTG93ZXJDYXNlKCk7XG5cdCAgdmFyIGhlYWQgPSBvcHRpb25zLnN0eWxpemUoXCI8XCIuY29uY2F0KG5hbWUpLCAnc3BlY2lhbCcpO1xuXHQgIHZhciBoZWFkQ2xvc2UgPSBvcHRpb25zLnN0eWxpemUoXCI+XCIsICdzcGVjaWFsJyk7XG5cdCAgdmFyIHRhaWwgPSBvcHRpb25zLnN0eWxpemUoXCI8L1wiLmNvbmNhdChuYW1lLCBcIj5cIiksICdzcGVjaWFsJyk7XG5cdCAgb3B0aW9ucy50cnVuY2F0ZSAtPSBuYW1lLmxlbmd0aCAqIDIgKyA1O1xuXHQgIHZhciBwcm9wZXJ0eUNvbnRlbnRzID0gJyc7XG5cblx0ICBpZiAocHJvcGVydGllcy5sZW5ndGggPiAwKSB7XG5cdCAgICBwcm9wZXJ0eUNvbnRlbnRzICs9ICcgJztcblx0ICAgIHByb3BlcnR5Q29udGVudHMgKz0gaW5zcGVjdExpc3QocHJvcGVydGllcy5tYXAoZnVuY3Rpb24gKGtleSkge1xuXHQgICAgICByZXR1cm4gW2tleSwgZWxlbWVudC5nZXRBdHRyaWJ1dGUoa2V5KV07XG5cdCAgICB9KSwgb3B0aW9ucywgaW5zcGVjdEF0dHJpYnV0ZSwgJyAnKTtcblx0ICB9XG5cblx0ICBvcHRpb25zLnRydW5jYXRlIC09IHByb3BlcnR5Q29udGVudHMubGVuZ3RoO1xuXHQgIHZhciB0cnVuY2F0ZSA9IG9wdGlvbnMudHJ1bmNhdGU7XG5cdCAgdmFyIGNoaWxkcmVuID0gaW5zcGVjdEhUTUxDb2xsZWN0aW9uKGVsZW1lbnQuY2hpbGRyZW4sIG9wdGlvbnMpO1xuXG5cdCAgaWYgKGNoaWxkcmVuICYmIGNoaWxkcmVuLmxlbmd0aCA+IHRydW5jYXRlKSB7XG5cdCAgICBjaGlsZHJlbiA9IFwiXCIuY29uY2F0KHRydW5jYXRvciwgXCIoXCIpLmNvbmNhdChlbGVtZW50LmNoaWxkcmVuLmxlbmd0aCwgXCIpXCIpO1xuXHQgIH1cblxuXHQgIHJldHVybiBcIlwiLmNvbmNhdChoZWFkKS5jb25jYXQocHJvcGVydHlDb250ZW50cykuY29uY2F0KGhlYWRDbG9zZSkuY29uY2F0KGNoaWxkcmVuKS5jb25jYXQodGFpbCk7XG5cdH1cblxuXHQvKiAhXG5cdCAqIGxvdXBlXG5cdCAqIENvcHlyaWdodChjKSAyMDEzIEpha2UgTHVlciA8amFrZUBhbG9naWNhbHBhcmFkb3guY29tPlxuXHQgKiBNSVQgTGljZW5zZWRcblx0ICovXG5cdHZhciBzeW1ib2xzU3VwcG9ydGVkID0gdHlwZW9mIFN5bWJvbCA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgU3ltYm9sLmZvciA9PT0gJ2Z1bmN0aW9uJztcblx0dmFyIGNoYWlJbnNwZWN0ID0gc3ltYm9sc1N1cHBvcnRlZCA/IFN5bWJvbC5mb3IoJ2NoYWkvaW5zcGVjdCcpIDogJ0BAY2hhaS9pbnNwZWN0Jztcblx0dmFyIG5vZGVJbnNwZWN0ID0gZmFsc2U7XG5cblx0dHJ5IHtcblx0ICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZ2xvYmFsLXJlcXVpcmVcblx0ICBub2RlSW5zcGVjdCA9IHJlcXVpcmUoJ3V0aWwnKS5pbnNwZWN0LmN1c3RvbTtcblx0fSBjYXRjaCAobm9Ob2RlSW5zcGVjdCkge1xuXHQgIG5vZGVJbnNwZWN0ID0gZmFsc2U7XG5cdH1cblxuXHR2YXIgY29uc3RydWN0b3JNYXAgPSBuZXcgV2Vha01hcCgpO1xuXHR2YXIgc3RyaW5nVGFnTWFwID0ge307XG5cdHZhciBiYXNlVHlwZXNNYXAgPSB7XG5cdCAgdW5kZWZpbmVkOiBmdW5jdGlvbiB1bmRlZmluZWQkMSh2YWx1ZSwgb3B0aW9ucykge1xuXHQgICAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZSgndW5kZWZpbmVkJywgJ3VuZGVmaW5lZCcpO1xuXHQgIH0sXG5cdCAgbnVsbDogZnVuY3Rpb24gX251bGwodmFsdWUsIG9wdGlvbnMpIHtcblx0ICAgIHJldHVybiBvcHRpb25zLnN0eWxpemUobnVsbCwgJ251bGwnKTtcblx0ICB9LFxuXHQgIGJvb2xlYW46IGZ1bmN0aW9uIGJvb2xlYW4odmFsdWUsIG9wdGlvbnMpIHtcblx0ICAgIHJldHVybiBvcHRpb25zLnN0eWxpemUodmFsdWUsICdib29sZWFuJyk7XG5cdCAgfSxcblx0ICBCb29sZWFuOiBmdW5jdGlvbiBCb29sZWFuKHZhbHVlLCBvcHRpb25zKSB7XG5cdCAgICByZXR1cm4gb3B0aW9ucy5zdHlsaXplKHZhbHVlLCAnYm9vbGVhbicpO1xuXHQgIH0sXG5cdCAgbnVtYmVyOiBpbnNwZWN0TnVtYmVyLFxuXHQgIE51bWJlcjogaW5zcGVjdE51bWJlcixcblx0ICBzdHJpbmc6IGluc3BlY3RTdHJpbmcsXG5cdCAgU3RyaW5nOiBpbnNwZWN0U3RyaW5nLFxuXHQgIGZ1bmN0aW9uOiBpbnNwZWN0RnVuY3Rpb24sXG5cdCAgRnVuY3Rpb246IGluc3BlY3RGdW5jdGlvbixcblx0ICBzeW1ib2w6IGluc3BlY3RTeW1ib2wsXG5cdCAgLy8gQSBTeW1ib2wgcG9seWZpbGwgd2lsbCByZXR1cm4gYFN5bWJvbGAgbm90IGBzeW1ib2xgIGZyb20gdHlwZWRldGVjdFxuXHQgIFN5bWJvbDogaW5zcGVjdFN5bWJvbCxcblx0ICBBcnJheTogaW5zcGVjdEFycmF5LFxuXHQgIERhdGU6IGluc3BlY3REYXRlLFxuXHQgIE1hcDogaW5zcGVjdE1hcCxcblx0ICBTZXQ6IGluc3BlY3RTZXQsXG5cdCAgUmVnRXhwOiBpbnNwZWN0UmVnRXhwLFxuXHQgIFByb21pc2U6IGluc3BlY3RQcm9taXNlLFxuXHQgIC8vIFdlYWtTZXQsIFdlYWtNYXAgYXJlIHRvdGFsbHkgb3BhcXVlIHRvIHVzXG5cdCAgV2Vha1NldDogZnVuY3Rpb24gV2Vha1NldCh2YWx1ZSwgb3B0aW9ucykge1xuXHQgICAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZSgnV2Vha1NldHvigKZ9JywgJ3NwZWNpYWwnKTtcblx0ICB9LFxuXHQgIFdlYWtNYXA6IGZ1bmN0aW9uIFdlYWtNYXAodmFsdWUsIG9wdGlvbnMpIHtcblx0ICAgIHJldHVybiBvcHRpb25zLnN0eWxpemUoJ1dlYWtNYXB74oCmfScsICdzcGVjaWFsJyk7XG5cdCAgfSxcblx0ICBBcmd1bWVudHM6IGluc3BlY3RBcmd1bWVudHMsXG5cdCAgSW50OEFycmF5OiBpbnNwZWN0VHlwZWRBcnJheSxcblx0ICBVaW50OEFycmF5OiBpbnNwZWN0VHlwZWRBcnJheSxcblx0ICBVaW50OENsYW1wZWRBcnJheTogaW5zcGVjdFR5cGVkQXJyYXksXG5cdCAgSW50MTZBcnJheTogaW5zcGVjdFR5cGVkQXJyYXksXG5cdCAgVWludDE2QXJyYXk6IGluc3BlY3RUeXBlZEFycmF5LFxuXHQgIEludDMyQXJyYXk6IGluc3BlY3RUeXBlZEFycmF5LFxuXHQgIFVpbnQzMkFycmF5OiBpbnNwZWN0VHlwZWRBcnJheSxcblx0ICBGbG9hdDMyQXJyYXk6IGluc3BlY3RUeXBlZEFycmF5LFxuXHQgIEZsb2F0NjRBcnJheTogaW5zcGVjdFR5cGVkQXJyYXksXG5cdCAgR2VuZXJhdG9yOiBmdW5jdGlvbiBHZW5lcmF0b3IoKSB7XG5cdCAgICByZXR1cm4gJyc7XG5cdCAgfSxcblx0ICBEYXRhVmlldzogZnVuY3Rpb24gRGF0YVZpZXcoKSB7XG5cdCAgICByZXR1cm4gJyc7XG5cdCAgfSxcblx0ICBBcnJheUJ1ZmZlcjogZnVuY3Rpb24gQXJyYXlCdWZmZXIoKSB7XG5cdCAgICByZXR1cm4gJyc7XG5cdCAgfSxcblx0ICBFcnJvcjogaW5zcGVjdE9iamVjdCQxLFxuXHQgIEhUTUxDb2xsZWN0aW9uOiBpbnNwZWN0SFRNTENvbGxlY3Rpb24sXG5cdCAgTm9kZUxpc3Q6IGluc3BlY3RIVE1MQ29sbGVjdGlvblxuXHR9OyAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgY29tcGxleGl0eVxuXG5cdHZhciBpbnNwZWN0Q3VzdG9tID0gZnVuY3Rpb24gaW5zcGVjdEN1c3RvbSh2YWx1ZSwgb3B0aW9ucywgdHlwZSkge1xuXHQgIGlmIChjaGFpSW5zcGVjdCBpbiB2YWx1ZSAmJiB0eXBlb2YgdmFsdWVbY2hhaUluc3BlY3RdID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICByZXR1cm4gdmFsdWVbY2hhaUluc3BlY3RdKG9wdGlvbnMpO1xuXHQgIH1cblxuXHQgIGlmIChub2RlSW5zcGVjdCAmJiBub2RlSW5zcGVjdCBpbiB2YWx1ZSAmJiB0eXBlb2YgdmFsdWVbbm9kZUluc3BlY3RdID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICByZXR1cm4gdmFsdWVbbm9kZUluc3BlY3RdKG9wdGlvbnMuZGVwdGgsIG9wdGlvbnMpO1xuXHQgIH1cblxuXHQgIGlmICgnaW5zcGVjdCcgaW4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlLmluc3BlY3QgPT09ICdmdW5jdGlvbicpIHtcblx0ICAgIHJldHVybiB2YWx1ZS5pbnNwZWN0KG9wdGlvbnMuZGVwdGgsIG9wdGlvbnMpO1xuXHQgIH1cblxuXHQgIGlmICgnY29uc3RydWN0b3InIGluIHZhbHVlICYmIGNvbnN0cnVjdG9yTWFwLmhhcyh2YWx1ZS5jb25zdHJ1Y3RvcikpIHtcblx0ICAgIHJldHVybiBjb25zdHJ1Y3Rvck1hcC5nZXQodmFsdWUuY29uc3RydWN0b3IpKHZhbHVlLCBvcHRpb25zKTtcblx0ICB9XG5cblx0ICBpZiAoc3RyaW5nVGFnTWFwW3R5cGVdKSB7XG5cdCAgICByZXR1cm4gc3RyaW5nVGFnTWFwW3R5cGVdKHZhbHVlLCBvcHRpb25zKTtcblx0ICB9XG5cblx0ICByZXR1cm4gJyc7XG5cdH07IC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBjb21wbGV4aXR5XG5cblxuXHRmdW5jdGlvbiBpbnNwZWN0KHZhbHVlLCBvcHRpb25zKSB7XG5cdCAgb3B0aW9ucyA9IG5vcm1hbGlzZU9wdGlvbnMob3B0aW9ucyk7XG5cdCAgb3B0aW9ucy5pbnNwZWN0ID0gaW5zcGVjdDtcblx0ICB2YXIgX29wdGlvbnMgPSBvcHRpb25zLFxuXHQgICAgICBjdXN0b21JbnNwZWN0ID0gX29wdGlvbnMuY3VzdG9tSW5zcGVjdDtcblx0ICB2YXIgdHlwZSA9IHR5cGVEZXRlY3QodmFsdWUpOyAvLyBJZiBpdCBpcyBhIGJhc2UgdmFsdWUgdGhhdCB3ZSBhbHJlYWR5IHN1cHBvcnQsIHRoZW4gdXNlIExvdXBlJ3MgaW5zcGVjdG9yXG5cblx0ICBpZiAoYmFzZVR5cGVzTWFwW3R5cGVdKSB7XG5cdCAgICByZXR1cm4gYmFzZVR5cGVzTWFwW3R5cGVdKHZhbHVlLCBvcHRpb25zKTtcblx0ICB9XG5cblx0ICB2YXIgcHJvdG8gPSB2YWx1ZSA/IE9iamVjdC5nZXRQcm90b3R5cGVPZih2YWx1ZSkgOiBmYWxzZTsgLy8gSWYgaXQncyBhIHBsYWluIE9iamVjdCB0aGVuIHVzZSBMb3VwZSdzIGluc3BlY3RvclxuXG5cdCAgaWYgKHByb3RvID09PSBPYmplY3QucHJvdG90eXBlIHx8IHByb3RvID09PSBudWxsKSB7XG5cdCAgICByZXR1cm4gaW5zcGVjdE9iamVjdCh2YWx1ZSwgb3B0aW9ucyk7XG5cdCAgfSAvLyBTcGVjaWZpY2FsbHkgYWNjb3VudCBmb3IgSFRNTEVsZW1lbnRzXG5cdCAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXVuZGVmXG5cblxuXHQgIGlmICh2YWx1ZSAmJiB0eXBlb2YgSFRNTEVsZW1lbnQgPT09ICdmdW5jdGlvbicgJiYgdmFsdWUgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkge1xuXHQgICAgcmV0dXJuIGluc3BlY3RIVE1MKHZhbHVlLCBvcHRpb25zKTtcblx0ICB9IC8vIElmIGBvcHRpb25zLmN1c3RvbUluc3BlY3RgIGlzIHNldCB0byB0cnVlIHRoZW4gdHJ5IHRvIHVzZSB0aGUgY3VzdG9tIGluc3BlY3RvclxuXG5cblx0ICBpZiAoY3VzdG9tSW5zcGVjdCAmJiB2YWx1ZSkge1xuXHQgICAgdmFyIG91dHB1dCA9IGluc3BlY3RDdXN0b20odmFsdWUsIG9wdGlvbnMsIHR5cGUpO1xuXHQgICAgaWYgKG91dHB1dCkgcmV0dXJuIG91dHB1dDtcblx0ICB9IC8vIElmIGl0IGlzIGEgY2xhc3MsIGluc3BlY3QgaXQgbGlrZSBhbiBvYmplY3QgYnV0IGFkZCB0aGUgY29uc3RydWN0b3IgbmFtZVxuXG5cblx0ICBpZiAoJ2NvbnN0cnVjdG9yJyBpbiB2YWx1ZSAmJiB2YWx1ZS5jb25zdHJ1Y3RvciAhPT0gT2JqZWN0KSB7XG5cdCAgICByZXR1cm4gaW5zcGVjdENsYXNzKHZhbHVlLCBvcHRpb25zKTtcblx0ICB9IC8vIFdlIGhhdmUgcnVuIG91dCBvZiBvcHRpb25zISBKdXN0IHN0cmluZ2lmeSB0aGUgdmFsdWVcblxuXG5cdCAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZShTdHJpbmcodmFsdWUpLCB0eXBlKTtcblx0fVxuXHRmdW5jdGlvbiByZWdpc3RlckNvbnN0cnVjdG9yKGNvbnN0cnVjdG9yLCBpbnNwZWN0b3IpIHtcblx0ICBpZiAoY29uc3RydWN0b3JNYXAuaGFzKGNvbnN0cnVjdG9yKSkge1xuXHQgICAgcmV0dXJuIGZhbHNlO1xuXHQgIH1cblxuXHQgIGNvbnN0cnVjdG9yTWFwLmFkZChjb25zdHJ1Y3RvciwgaW5zcGVjdG9yKTtcblx0ICByZXR1cm4gdHJ1ZTtcblx0fVxuXHRmdW5jdGlvbiByZWdpc3RlclN0cmluZ1RhZyhzdHJpbmdUYWcsIGluc3BlY3Rvcikge1xuXHQgIGlmIChzdHJpbmdUYWcgaW4gc3RyaW5nVGFnTWFwKSB7XG5cdCAgICByZXR1cm4gZmFsc2U7XG5cdCAgfVxuXG5cdCAgc3RyaW5nVGFnTWFwW3N0cmluZ1RhZ10gPSBpbnNwZWN0b3I7XG5cdCAgcmV0dXJuIHRydWU7XG5cdH1cblx0dmFyIGN1c3RvbSA9IGNoYWlJbnNwZWN0O1xuXG5cdGV4cG9ydHMuY3VzdG9tID0gY3VzdG9tO1xuXHRleHBvcnRzLmRlZmF1bHQgPSBpbnNwZWN0O1xuXHRleHBvcnRzLmluc3BlY3QgPSBpbnNwZWN0O1xuXHRleHBvcnRzLnJlZ2lzdGVyQ29uc3RydWN0b3IgPSByZWdpc3RlckNvbnN0cnVjdG9yO1xuXHRleHBvcnRzLnJlZ2lzdGVyU3RyaW5nVGFnID0gcmVnaXN0ZXJTdHJpbmdUYWc7XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcblxufSkpKTtcbiIsIlxudmFyIHR5cGUgPSByZXF1aXJlKCcuL2prcm9zby10eXBlJylcblxuLy8gKGFueSwgYW55LCBbYXJyYXldKSAtPiBib29sZWFuXG5mdW5jdGlvbiBlcXVhbChhLCBiLCBtZW1vcyl7XG4gIC8vIEFsbCBpZGVudGljYWwgdmFsdWVzIGFyZSBlcXVpdmFsZW50XG4gIGlmIChhID09PSBiKSByZXR1cm4gdHJ1ZVxuICB2YXIgZm5BID0gdHlwZXNbdHlwZShhKV1cbiAgdmFyIGZuQiA9IHR5cGVzW3R5cGUoYildXG4gIHJldHVybiBmbkEgJiYgZm5BID09PSBmbkJcbiAgICA/IGZuQShhLCBiLCBtZW1vcylcbiAgICA6IGZhbHNlXG59XG5cbnZhciB0eXBlcyA9IHt9XG5cbi8vIChOdW1iZXIpIC0+IGJvb2xlYW5cbnR5cGVzLm51bWJlciA9IGZ1bmN0aW9uKGEsIGIpe1xuICByZXR1cm4gYSAhPT0gYSAmJiBiICE9PSBiLypOYW4gY2hlY2sqL1xufVxuXG4vLyAoZnVuY3Rpb24sIGZ1bmN0aW9uLCBhcnJheSkgLT4gYm9vbGVhblxudHlwZXNbJ2Z1bmN0aW9uJ10gPSBmdW5jdGlvbihhLCBiLCBtZW1vcyl7XG4gIHJldHVybiBhLnRvU3RyaW5nKCkgPT09IGIudG9TdHJpbmcoKVxuICAgIC8vIEZ1bmN0aW9ucyBjYW4gYWN0IGFzIG9iamVjdHNcbiAgICAmJiB0eXBlcy5vYmplY3QoYSwgYiwgbWVtb3MpXG4gICAgJiYgZXF1YWwoYS5wcm90b3R5cGUsIGIucHJvdG90eXBlKVxufVxuXG4vLyAoZGF0ZSwgZGF0ZSkgLT4gYm9vbGVhblxudHlwZXMuZGF0ZSA9IGZ1bmN0aW9uKGEsIGIpe1xuICByZXR1cm4gK2EgPT09ICtiXG59XG5cbi8vIChyZWdleHAsIHJlZ2V4cCkgLT4gYm9vbGVhblxudHlwZXMucmVnZXhwID0gZnVuY3Rpb24oYSwgYil7XG4gIHJldHVybiBhLnRvU3RyaW5nKCkgPT09IGIudG9TdHJpbmcoKVxufVxuXG4vLyAoRE9NRWxlbWVudCwgRE9NRWxlbWVudCkgLT4gYm9vbGVhblxudHlwZXMuZWxlbWVudCA9IGZ1bmN0aW9uKGEsIGIpe1xuICByZXR1cm4gYS5vdXRlckhUTUwgPT09IGIub3V0ZXJIVE1MXG59XG5cbi8vICh0ZXh0bm9kZSwgdGV4dG5vZGUpIC0+IGJvb2xlYW5cbnR5cGVzLnRleHRub2RlID0gZnVuY3Rpb24oYSwgYil7XG4gIHJldHVybiBhLnRleHRDb250ZW50ID09PSBiLnRleHRDb250ZW50XG59XG5cbi8vIGRlY29yYXRlIGZuIHRvIHByZXZlbnQgaXQgcmUtY2hlY2tpbmcgb2JqZWN0c1xuLy8gKGZ1bmN0aW9uKSAtPiBmdW5jdGlvblxuZnVuY3Rpb24gbWVtb0dhdXJkKGZuKXtcbiAgcmV0dXJuIGZ1bmN0aW9uKGEsIGIsIG1lbW9zKXtcbiAgICBpZiAoIW1lbW9zKSByZXR1cm4gZm4oYSwgYiwgW10pXG4gICAgdmFyIGkgPSBtZW1vcy5sZW5ndGgsIG1lbW9cbiAgICB3aGlsZSAobWVtbyA9IG1lbW9zWy0taV0pIHtcbiAgICAgIGlmIChtZW1vWzBdID09PSBhICYmIG1lbW9bMV0gPT09IGIpIHJldHVybiB0cnVlXG4gICAgfVxuICAgIHJldHVybiBmbihhLCBiLCBtZW1vcylcbiAgfVxufVxuXG50eXBlc1snYXJndW1lbnRzJ10gPVxudHlwZXNbJ2JpdC1hcnJheSddID1cbnR5cGVzLmFycmF5ID0gbWVtb0dhdXJkKGFycmF5RXF1YWwpXG5cbi8vIChhcnJheSwgYXJyYXksIGFycmF5KSAtPiBib29sZWFuXG5mdW5jdGlvbiBhcnJheUVxdWFsKGEsIGIsIG1lbW9zKXtcbiAgdmFyIGkgPSBhLmxlbmd0aFxuICBpZiAoaSAhPT0gYi5sZW5ndGgpIHJldHVybiBmYWxzZVxuICBtZW1vcy5wdXNoKFthLCBiXSlcbiAgd2hpbGUgKGktLSkge1xuICAgIGlmICghZXF1YWwoYVtpXSwgYltpXSwgbWVtb3MpKSByZXR1cm4gZmFsc2VcbiAgfVxuICByZXR1cm4gdHJ1ZVxufVxuXG50eXBlcy5vYmplY3QgPSBtZW1vR2F1cmQob2JqZWN0RXF1YWwpXG5cbi8vIChvYmplY3QsIG9iamVjdCwgYXJyYXkpIC0+IGJvb2xlYW5cbmZ1bmN0aW9uIG9iamVjdEVxdWFsKGEsIGIsIG1lbW9zKSB7XG4gIGlmICh0eXBlb2YgYS5lcXVhbCA9PSAnZnVuY3Rpb24nKSB7XG4gICAgbWVtb3MucHVzaChbYSwgYl0pXG4gICAgcmV0dXJuIGEuZXF1YWwoYiwgbWVtb3MpXG4gIH1cbiAgdmFyIGthID0gZ2V0RW51bWVyYWJsZVByb3BlcnRpZXMoYSlcbiAgdmFyIGtiID0gZ2V0RW51bWVyYWJsZVByb3BlcnRpZXMoYilcbiAgdmFyIGkgPSBrYS5sZW5ndGhcblxuICAvLyBzYW1lIG51bWJlciBvZiBwcm9wZXJ0aWVzXG4gIGlmIChpICE9PSBrYi5sZW5ndGgpIHJldHVybiBmYWxzZVxuXG4gIC8vIGFsdGhvdWdoIG5vdCBuZWNlc3NhcmlseSB0aGUgc2FtZSBvcmRlclxuICBrYS5zb3J0KClcbiAga2Iuc29ydCgpXG5cbiAgLy8gY2hlYXAga2V5IHRlc3RcbiAgd2hpbGUgKGktLSkgaWYgKGthW2ldICE9PSBrYltpXSkgcmV0dXJuIGZhbHNlXG5cbiAgLy8gcmVtZW1iZXJcbiAgbWVtb3MucHVzaChbYSwgYl0pXG5cbiAgLy8gaXRlcmF0ZSBhZ2FpbiB0aGlzIHRpbWUgZG9pbmcgYSB0aG9yb3VnaCBjaGVja1xuICBpID0ga2EubGVuZ3RoXG4gIHdoaWxlIChpLS0pIHtcbiAgICB2YXIga2V5ID0ga2FbaV1cbiAgICBpZiAoIWVxdWFsKGFba2V5XSwgYltrZXldLCBtZW1vcykpIHJldHVybiBmYWxzZVxuICB9XG5cbiAgcmV0dXJuIHRydWVcbn1cblxuLy8gKG9iamVjdCkgLT4gYXJyYXlcbmZ1bmN0aW9uIGdldEVudW1lcmFibGVQcm9wZXJ0aWVzIChvYmplY3QpIHtcbiAgdmFyIHJlc3VsdCA9IFtdXG4gIGZvciAodmFyIGsgaW4gb2JqZWN0KSBpZiAoayAhPT0gJ2NvbnN0cnVjdG9yJykge1xuICAgIHJlc3VsdC5wdXNoKGspXG4gIH1cbiAgcmV0dXJuIHJlc3VsdFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGVxdWFsXG5cbiIsIlxudmFyIHRvU3RyaW5nID0ge30udG9TdHJpbmdcbnZhciBEb21Ob2RlID0gdHlwZW9mIHdpbmRvdyAhPSAndW5kZWZpbmVkJ1xuICA/IHdpbmRvdy5Ob2RlXG4gIDogRnVuY3Rpb24gLy8gY291bGQgYmUgYW55IGZ1bmN0aW9uXG5cbi8qKlxuICogUmV0dXJuIHRoZSB0eXBlIG9mIHZhbC5cbiAqXG4gKiBAcGFyYW0ge01peGVkfSB2YWxcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHVibGljXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gZnVuY3Rpb24gdHlwZSh4KXtcbiAgdmFyIHR5cGUgPSB0eXBlb2YgeFxuICBpZiAodHlwZSAhPSAnb2JqZWN0JykgcmV0dXJuIHR5cGVcbiAgdHlwZSA9IHR5cGVzW3RvU3RyaW5nLmNhbGwoeCldXG4gIGlmICh0eXBlID09ICdvYmplY3QnKSB7XG4gICAgLy8gaW4gY2FzZSB0aGV5IGhhdmUgYmVlbiBwb2x5ZmlsbGVkXG4gICAgaWYgKHggaW5zdGFuY2VvZiBNYXApIHJldHVybiAnbWFwJ1xuICAgIGlmICh4IGluc3RhbmNlb2YgU2V0KSByZXR1cm4gJ3NldCdcbiAgICByZXR1cm4gJ29iamVjdCdcbiAgfVxuICBpZiAodHlwZSkgcmV0dXJuIHR5cGVcbiAgaWYgKHggaW5zdGFuY2VvZiBEb21Ob2RlKSBzd2l0Y2ggKHgubm9kZVR5cGUpIHtcbiAgICBjYXNlIDE6ICByZXR1cm4gJ2VsZW1lbnQnXG4gICAgY2FzZSAzOiAgcmV0dXJuICd0ZXh0LW5vZGUnXG4gICAgY2FzZSA5OiAgcmV0dXJuICdkb2N1bWVudCdcbiAgICBjYXNlIDExOiByZXR1cm4gJ2RvY3VtZW50LWZyYWdtZW50J1xuICAgIGRlZmF1bHQ6IHJldHVybiAnZG9tLW5vZGUnXG4gIH1cbn1cblxudmFyIHR5cGVzID0gZXhwb3J0cy50eXBlcyA9IHtcbiAgJ1tvYmplY3QgRnVuY3Rpb25dJzogJ2Z1bmN0aW9uJyxcbiAgJ1tvYmplY3QgRGF0ZV0nOiAnZGF0ZScsXG4gICdbb2JqZWN0IFJlZ0V4cF0nOiAncmVnZXhwJyxcbiAgJ1tvYmplY3QgQXJndW1lbnRzXSc6ICdhcmd1bWVudHMnLFxuICAnW29iamVjdCBBcnJheV0nOiAnYXJyYXknLFxuICAnW29iamVjdCBTZXRdJzogJ3NldCcsXG4gICdbb2JqZWN0IFN0cmluZ10nOiAnc3RyaW5nJyxcbiAgJ1tvYmplY3QgTnVsbF0nOiAnbnVsbCcsXG4gICdbb2JqZWN0IFVuZGVmaW5lZF0nOiAndW5kZWZpbmVkJyxcbiAgJ1tvYmplY3QgTnVtYmVyXSc6ICdudW1iZXInLFxuICAnW29iamVjdCBCb29sZWFuXSc6ICdib29sZWFuJyxcbiAgJ1tvYmplY3QgT2JqZWN0XSc6ICdvYmplY3QnLFxuICAnW29iamVjdCBNYXBdJzogJ21hcCcsXG4gICdbb2JqZWN0IFRleHRdJzogJ3RleHQtbm9kZScsXG4gICdbb2JqZWN0IFVpbnQ4QXJyYXldJzogJ2JpdC1hcnJheScsXG4gICdbb2JqZWN0IFVpbnQxNkFycmF5XSc6ICdiaXQtYXJyYXknLFxuICAnW29iamVjdCBVaW50MzJBcnJheV0nOiAnYml0LWFycmF5JyxcbiAgJ1tvYmplY3QgVWludDhDbGFtcGVkQXJyYXldJzogJ2JpdC1hcnJheScsXG4gICdbb2JqZWN0IEVycm9yXSc6ICdlcnJvcicsXG4gICdbb2JqZWN0IEZvcm1EYXRhXSc6ICdmb3JtLWRhdGEnLFxuICAnW29iamVjdCBGaWxlXSc6ICdmaWxlJyxcbiAgJ1tvYmplY3QgQmxvYl0nOiAnYmxvYidcbn1cblxuIiwiKGZ1bmN0aW9uIChnbG9iYWwsIGZhY3RvcnkpIHtcblx0dHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnID8gZmFjdG9yeShleHBvcnRzKSA6XG5cdHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZShbJ2V4cG9ydHMnXSwgZmFjdG9yeSkgOlxuXHQoZ2xvYmFsID0gdHlwZW9mIGdsb2JhbFRoaXMgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsVGhpcyA6IGdsb2JhbCB8fCBzZWxmLCBmYWN0b3J5KGdsb2JhbC5sb3VwZSA9IHt9KSk7XG59KHRoaXMsIChmdW5jdGlvbiAoZXhwb3J0cykgeyAndXNlIHN0cmljdCc7XG5cblx0dmFyIGNvbW1vbmpzR2xvYmFsID0gdHlwZW9mIGdsb2JhbFRoaXMgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsVGhpcyA6IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDogdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcgPyBzZWxmIDoge307XG5cblx0ZnVuY3Rpb24gY3JlYXRlQ29tbW9uanNNb2R1bGUoZm4pIHtcblx0ICB2YXIgbW9kdWxlID0geyBleHBvcnRzOiB7fSB9O1xuXHRcdHJldHVybiBmbihtb2R1bGUsIG1vZHVsZS5leHBvcnRzKSwgbW9kdWxlLmV4cG9ydHM7XG5cdH1cblxuXHR2YXIgdHlwZURldGVjdCA9IGNyZWF0ZUNvbW1vbmpzTW9kdWxlKGZ1bmN0aW9uIChtb2R1bGUsIGV4cG9ydHMpIHtcblx0KGZ1bmN0aW9uIChnbG9iYWwsIGZhY3RvcnkpIHtcblx0XHQgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCkgO1xuXHR9KGNvbW1vbmpzR2xvYmFsLCAoZnVuY3Rpb24gKCkge1xuXHQvKiAhXG5cdCAqIHR5cGUtZGV0ZWN0XG5cdCAqIENvcHlyaWdodChjKSAyMDEzIGpha2UgbHVlciA8amFrZUBhbG9naWNhbHBhcmFkb3guY29tPlxuXHQgKiBNSVQgTGljZW5zZWRcblx0ICovXG5cdHZhciBwcm9taXNlRXhpc3RzID0gdHlwZW9mIFByb21pc2UgPT09ICdmdW5jdGlvbic7XG5cblx0LyogZXNsaW50LWRpc2FibGUgbm8tdW5kZWYgKi9cblx0dmFyIGdsb2JhbE9iamVjdCA9IHR5cGVvZiBzZWxmID09PSAnb2JqZWN0JyA/IHNlbGYgOiBjb21tb25qc0dsb2JhbDsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBpZC1ibGFja2xpc3RcblxuXHR2YXIgc3ltYm9sRXhpc3RzID0gdHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCc7XG5cdHZhciBtYXBFeGlzdHMgPSB0eXBlb2YgTWFwICE9PSAndW5kZWZpbmVkJztcblx0dmFyIHNldEV4aXN0cyA9IHR5cGVvZiBTZXQgIT09ICd1bmRlZmluZWQnO1xuXHR2YXIgd2Vha01hcEV4aXN0cyA9IHR5cGVvZiBXZWFrTWFwICE9PSAndW5kZWZpbmVkJztcblx0dmFyIHdlYWtTZXRFeGlzdHMgPSB0eXBlb2YgV2Vha1NldCAhPT0gJ3VuZGVmaW5lZCc7XG5cdHZhciBkYXRhVmlld0V4aXN0cyA9IHR5cGVvZiBEYXRhVmlldyAhPT0gJ3VuZGVmaW5lZCc7XG5cdHZhciBzeW1ib2xJdGVyYXRvckV4aXN0cyA9IHN5bWJvbEV4aXN0cyAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yICE9PSAndW5kZWZpbmVkJztcblx0dmFyIHN5bWJvbFRvU3RyaW5nVGFnRXhpc3RzID0gc3ltYm9sRXhpc3RzICYmIHR5cGVvZiBTeW1ib2wudG9TdHJpbmdUYWcgIT09ICd1bmRlZmluZWQnO1xuXHR2YXIgc2V0RW50cmllc0V4aXN0cyA9IHNldEV4aXN0cyAmJiB0eXBlb2YgU2V0LnByb3RvdHlwZS5lbnRyaWVzID09PSAnZnVuY3Rpb24nO1xuXHR2YXIgbWFwRW50cmllc0V4aXN0cyA9IG1hcEV4aXN0cyAmJiB0eXBlb2YgTWFwLnByb3RvdHlwZS5lbnRyaWVzID09PSAnZnVuY3Rpb24nO1xuXHR2YXIgc2V0SXRlcmF0b3JQcm90b3R5cGUgPSBzZXRFbnRyaWVzRXhpc3RzICYmIE9iamVjdC5nZXRQcm90b3R5cGVPZihuZXcgU2V0KCkuZW50cmllcygpKTtcblx0dmFyIG1hcEl0ZXJhdG9yUHJvdG90eXBlID0gbWFwRW50cmllc0V4aXN0cyAmJiBPYmplY3QuZ2V0UHJvdG90eXBlT2YobmV3IE1hcCgpLmVudHJpZXMoKSk7XG5cdHZhciBhcnJheUl0ZXJhdG9yRXhpc3RzID0gc3ltYm9sSXRlcmF0b3JFeGlzdHMgJiYgdHlwZW9mIEFycmF5LnByb3RvdHlwZVtTeW1ib2wuaXRlcmF0b3JdID09PSAnZnVuY3Rpb24nO1xuXHR2YXIgYXJyYXlJdGVyYXRvclByb3RvdHlwZSA9IGFycmF5SXRlcmF0b3JFeGlzdHMgJiYgT2JqZWN0LmdldFByb3RvdHlwZU9mKFtdW1N5bWJvbC5pdGVyYXRvcl0oKSk7XG5cdHZhciBzdHJpbmdJdGVyYXRvckV4aXN0cyA9IHN5bWJvbEl0ZXJhdG9yRXhpc3RzICYmIHR5cGVvZiBTdHJpbmcucHJvdG90eXBlW1N5bWJvbC5pdGVyYXRvcl0gPT09ICdmdW5jdGlvbic7XG5cdHZhciBzdHJpbmdJdGVyYXRvclByb3RvdHlwZSA9IHN0cmluZ0l0ZXJhdG9yRXhpc3RzICYmIE9iamVjdC5nZXRQcm90b3R5cGVPZignJ1tTeW1ib2wuaXRlcmF0b3JdKCkpO1xuXHR2YXIgdG9TdHJpbmdMZWZ0U2xpY2VMZW5ndGggPSA4O1xuXHR2YXIgdG9TdHJpbmdSaWdodFNsaWNlTGVuZ3RoID0gLTE7XG5cdC8qKlxuXHQgKiAjIyMgdHlwZU9mIChvYmopXG5cdCAqXG5cdCAqIFVzZXMgYE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmdgIHRvIGRldGVybWluZSB0aGUgdHlwZSBvZiBhbiBvYmplY3QsXG5cdCAqIG5vcm1hbGlzaW5nIGJlaGF2aW91ciBhY3Jvc3MgZW5naW5lIHZlcnNpb25zICYgd2VsbCBvcHRpbWlzZWQuXG5cdCAqXG5cdCAqIEBwYXJhbSB7TWl4ZWR9IG9iamVjdFxuXHQgKiBAcmV0dXJuIHtTdHJpbmd9IG9iamVjdCB0eXBlXG5cdCAqIEBhcGkgcHVibGljXG5cdCAqL1xuXHRmdW5jdGlvbiB0eXBlRGV0ZWN0KG9iaikge1xuXHQgIC8qICEgU3BlZWQgb3B0aW1pc2F0aW9uXG5cdCAgICogUHJlOlxuXHQgICAqICAgc3RyaW5nIGxpdGVyYWwgICAgIHggMywwMzksMDM1IG9wcy9zZWMgwrExLjYyJSAoNzggcnVucyBzYW1wbGVkKVxuXHQgICAqICAgYm9vbGVhbiBsaXRlcmFsICAgIHggMSw0MjQsMTM4IG9wcy9zZWMgwrE0LjU0JSAoNzUgcnVucyBzYW1wbGVkKVxuXHQgICAqICAgbnVtYmVyIGxpdGVyYWwgICAgIHggMSw2NTMsMTUzIG9wcy9zZWMgwrExLjkxJSAoODIgcnVucyBzYW1wbGVkKVxuXHQgICAqICAgdW5kZWZpbmVkICAgICAgICAgIHggOSw5NzgsNjYwIG9wcy9zZWMgwrExLjkyJSAoNzUgcnVucyBzYW1wbGVkKVxuXHQgICAqICAgZnVuY3Rpb24gICAgICAgICAgIHggMiw1NTYsNzY5IG9wcy9zZWMgwrExLjczJSAoNzcgcnVucyBzYW1wbGVkKVxuXHQgICAqIFBvc3Q6XG5cdCAgICogICBzdHJpbmcgbGl0ZXJhbCAgICAgeCAzOCw1NjQsNzk2IG9wcy9zZWMgwrExLjE1JSAoNzkgcnVucyBzYW1wbGVkKVxuXHQgICAqICAgYm9vbGVhbiBsaXRlcmFsICAgIHggMzEsMTQ4LDk0MCBvcHMvc2VjIMKxMS4xMCUgKDc5IHJ1bnMgc2FtcGxlZClcblx0ICAgKiAgIG51bWJlciBsaXRlcmFsICAgICB4IDMyLDY3OSwzMzAgb3BzL3NlYyDCsTEuOTAlICg3OCBydW5zIHNhbXBsZWQpXG5cdCAgICogICB1bmRlZmluZWQgICAgICAgICAgeCAzMiwzNjMsMzY4IG9wcy9zZWMgwrExLjA3JSAoODIgcnVucyBzYW1wbGVkKVxuXHQgICAqICAgZnVuY3Rpb24gICAgICAgICAgIHggMzEsMjk2LDg3MCBvcHMvc2VjIMKxMC45NiUgKDgzIHJ1bnMgc2FtcGxlZClcblx0ICAgKi9cblx0ICB2YXIgdHlwZW9mT2JqID0gdHlwZW9mIG9iajtcblx0ICBpZiAodHlwZW9mT2JqICE9PSAnb2JqZWN0Jykge1xuXHQgICAgcmV0dXJuIHR5cGVvZk9iajtcblx0ICB9XG5cblx0ICAvKiAhIFNwZWVkIG9wdGltaXNhdGlvblxuXHQgICAqIFByZTpcblx0ICAgKiAgIG51bGwgICAgICAgICAgICAgICB4IDI4LDY0NSw3NjUgb3BzL3NlYyDCsTEuMTclICg4MiBydW5zIHNhbXBsZWQpXG5cdCAgICogUG9zdDpcblx0ICAgKiAgIG51bGwgICAgICAgICAgICAgICB4IDM2LDQyOCw5NjIgb3BzL3NlYyDCsTEuMzclICg4NCBydW5zIHNhbXBsZWQpXG5cdCAgICovXG5cdCAgaWYgKG9iaiA9PT0gbnVsbCkge1xuXHQgICAgcmV0dXJuICdudWxsJztcblx0ICB9XG5cblx0ICAvKiAhIFNwZWMgQ29uZm9ybWFuY2Vcblx0ICAgKiBUZXN0OiBgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHdpbmRvdylgYFxuXHQgICAqICAtIE5vZGUgPT09IFwiW29iamVjdCBnbG9iYWxdXCJcblx0ICAgKiAgLSBDaHJvbWUgPT09IFwiW29iamVjdCBnbG9iYWxdXCJcblx0ICAgKiAgLSBGaXJlZm94ID09PSBcIltvYmplY3QgV2luZG93XVwiXG5cdCAgICogIC0gUGhhbnRvbUpTID09PSBcIltvYmplY3QgV2luZG93XVwiXG5cdCAgICogIC0gU2FmYXJpID09PSBcIltvYmplY3QgV2luZG93XVwiXG5cdCAgICogIC0gSUUgMTEgPT09IFwiW29iamVjdCBXaW5kb3ddXCJcblx0ICAgKiAgLSBJRSBFZGdlID09PSBcIltvYmplY3QgV2luZG93XVwiXG5cdCAgICogVGVzdDogYE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh0aGlzKWBgXG5cdCAgICogIC0gQ2hyb21lIFdvcmtlciA9PT0gXCJbb2JqZWN0IGdsb2JhbF1cIlxuXHQgICAqICAtIEZpcmVmb3ggV29ya2VyID09PSBcIltvYmplY3QgRGVkaWNhdGVkV29ya2VyR2xvYmFsU2NvcGVdXCJcblx0ICAgKiAgLSBTYWZhcmkgV29ya2VyID09PSBcIltvYmplY3QgRGVkaWNhdGVkV29ya2VyR2xvYmFsU2NvcGVdXCJcblx0ICAgKiAgLSBJRSAxMSBXb3JrZXIgPT09IFwiW29iamVjdCBXb3JrZXJHbG9iYWxTY29wZV1cIlxuXHQgICAqICAtIElFIEVkZ2UgV29ya2VyID09PSBcIltvYmplY3QgV29ya2VyR2xvYmFsU2NvcGVdXCJcblx0ICAgKi9cblx0ICBpZiAob2JqID09PSBnbG9iYWxPYmplY3QpIHtcblx0ICAgIHJldHVybiAnZ2xvYmFsJztcblx0ICB9XG5cblx0ICAvKiAhIFNwZWVkIG9wdGltaXNhdGlvblxuXHQgICAqIFByZTpcblx0ICAgKiAgIGFycmF5IGxpdGVyYWwgICAgICB4IDIsODg4LDM1MiBvcHMvc2VjIMKxMC42NyUgKDgyIHJ1bnMgc2FtcGxlZClcblx0ICAgKiBQb3N0OlxuXHQgICAqICAgYXJyYXkgbGl0ZXJhbCAgICAgIHggMjIsNDc5LDY1MCBvcHMvc2VjIMKxMC45NiUgKDgxIHJ1bnMgc2FtcGxlZClcblx0ICAgKi9cblx0ICBpZiAoXG5cdCAgICBBcnJheS5pc0FycmF5KG9iaikgJiZcblx0ICAgIChzeW1ib2xUb1N0cmluZ1RhZ0V4aXN0cyA9PT0gZmFsc2UgfHwgIShTeW1ib2wudG9TdHJpbmdUYWcgaW4gb2JqKSlcblx0ICApIHtcblx0ICAgIHJldHVybiAnQXJyYXknO1xuXHQgIH1cblxuXHQgIC8vIE5vdCBjYWNoaW5nIGV4aXN0ZW5jZSBvZiBgd2luZG93YCBhbmQgcmVsYXRlZCBwcm9wZXJ0aWVzIGR1ZSB0byBwb3RlbnRpYWxcblx0ICAvLyBmb3IgYHdpbmRvd2AgdG8gYmUgdW5zZXQgYmVmb3JlIHRlc3RzIGluIHF1YXNpLWJyb3dzZXIgZW52aXJvbm1lbnRzLlxuXHQgIGlmICh0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JyAmJiB3aW5kb3cgIT09IG51bGwpIHtcblx0ICAgIC8qICEgU3BlYyBDb25mb3JtYW5jZVxuXHQgICAgICogKGh0dHBzOi8vaHRtbC5zcGVjLndoYXR3Zy5vcmcvbXVsdGlwYWdlL2Jyb3dzZXJzLmh0bWwjbG9jYXRpb24pXG5cdCAgICAgKiBXaGF0V0cgSFRNTCQ3LjcuMyAtIFRoZSBgTG9jYXRpb25gIGludGVyZmFjZVxuXHQgICAgICogVGVzdDogYE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh3aW5kb3cubG9jYXRpb24pYGBcblx0ICAgICAqICAtIElFIDw9MTEgPT09IFwiW29iamVjdCBPYmplY3RdXCJcblx0ICAgICAqICAtIElFIEVkZ2UgPD0xMyA9PT0gXCJbb2JqZWN0IE9iamVjdF1cIlxuXHQgICAgICovXG5cdCAgICBpZiAodHlwZW9mIHdpbmRvdy5sb2NhdGlvbiA9PT0gJ29iamVjdCcgJiYgb2JqID09PSB3aW5kb3cubG9jYXRpb24pIHtcblx0ICAgICAgcmV0dXJuICdMb2NhdGlvbic7XG5cdCAgICB9XG5cblx0ICAgIC8qICEgU3BlYyBDb25mb3JtYW5jZVxuXHQgICAgICogKGh0dHBzOi8vaHRtbC5zcGVjLndoYXR3Zy5vcmcvI2RvY3VtZW50KVxuXHQgICAgICogV2hhdFdHIEhUTUwkMy4xLjEgLSBUaGUgYERvY3VtZW50YCBvYmplY3Rcblx0ICAgICAqIE5vdGU6IE1vc3QgYnJvd3NlcnMgY3VycmVudGx5IGFkaGVyIHRvIHRoZSBXM0MgRE9NIExldmVsIDIgc3BlY1xuXHQgICAgICogICAgICAgKGh0dHBzOi8vd3d3LnczLm9yZy9UUi9ET00tTGV2ZWwtMi1IVE1ML2h0bWwuaHRtbCNJRC0yNjgwOTI2OClcblx0ICAgICAqICAgICAgIHdoaWNoIHN1Z2dlc3RzIHRoYXQgYnJvd3NlcnMgc2hvdWxkIHVzZSBIVE1MVGFibGVDZWxsRWxlbWVudCBmb3Jcblx0ICAgICAqICAgICAgIGJvdGggVEQgYW5kIFRIIGVsZW1lbnRzLiBXaGF0V0cgc2VwYXJhdGVzIHRoZXNlLlxuXHQgICAgICogICAgICAgV2hhdFdHIEhUTUwgc3RhdGVzOlxuXHQgICAgICogICAgICAgICA+IEZvciBoaXN0b3JpY2FsIHJlYXNvbnMsIFdpbmRvdyBvYmplY3RzIG11c3QgYWxzbyBoYXZlIGFcblx0ICAgICAqICAgICAgICAgPiB3cml0YWJsZSwgY29uZmlndXJhYmxlLCBub24tZW51bWVyYWJsZSBwcm9wZXJ0eSBuYW1lZFxuXHQgICAgICogICAgICAgICA+IEhUTUxEb2N1bWVudCB3aG9zZSB2YWx1ZSBpcyB0aGUgRG9jdW1lbnQgaW50ZXJmYWNlIG9iamVjdC5cblx0ICAgICAqIFRlc3Q6IGBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZG9jdW1lbnQpYGBcblx0ICAgICAqICAtIENocm9tZSA9PT0gXCJbb2JqZWN0IEhUTUxEb2N1bWVudF1cIlxuXHQgICAgICogIC0gRmlyZWZveCA9PT0gXCJbb2JqZWN0IEhUTUxEb2N1bWVudF1cIlxuXHQgICAgICogIC0gU2FmYXJpID09PSBcIltvYmplY3QgSFRNTERvY3VtZW50XVwiXG5cdCAgICAgKiAgLSBJRSA8PTEwID09PSBcIltvYmplY3QgRG9jdW1lbnRdXCJcblx0ICAgICAqICAtIElFIDExID09PSBcIltvYmplY3QgSFRNTERvY3VtZW50XVwiXG5cdCAgICAgKiAgLSBJRSBFZGdlIDw9MTMgPT09IFwiW29iamVjdCBIVE1MRG9jdW1lbnRdXCJcblx0ICAgICAqL1xuXHQgICAgaWYgKHR5cGVvZiB3aW5kb3cuZG9jdW1lbnQgPT09ICdvYmplY3QnICYmIG9iaiA9PT0gd2luZG93LmRvY3VtZW50KSB7XG5cdCAgICAgIHJldHVybiAnRG9jdW1lbnQnO1xuXHQgICAgfVxuXG5cdCAgICBpZiAodHlwZW9mIHdpbmRvdy5uYXZpZ2F0b3IgPT09ICdvYmplY3QnKSB7XG5cdCAgICAgIC8qICEgU3BlYyBDb25mb3JtYW5jZVxuXHQgICAgICAgKiAoaHR0cHM6Ly9odG1sLnNwZWMud2hhdHdnLm9yZy9tdWx0aXBhZ2Uvd2ViYXBwYXBpcy5odG1sI21pbWV0eXBlYXJyYXkpXG5cdCAgICAgICAqIFdoYXRXRyBIVE1MJDguNi4xLjUgLSBQbHVnaW5zIC0gSW50ZXJmYWNlIE1pbWVUeXBlQXJyYXlcblx0ICAgICAgICogVGVzdDogYE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChuYXZpZ2F0b3IubWltZVR5cGVzKWBgXG5cdCAgICAgICAqICAtIElFIDw9MTAgPT09IFwiW29iamVjdCBNU01pbWVUeXBlc0NvbGxlY3Rpb25dXCJcblx0ICAgICAgICovXG5cdCAgICAgIGlmICh0eXBlb2Ygd2luZG93Lm5hdmlnYXRvci5taW1lVHlwZXMgPT09ICdvYmplY3QnICYmXG5cdCAgICAgICAgICBvYmogPT09IHdpbmRvdy5uYXZpZ2F0b3IubWltZVR5cGVzKSB7XG5cdCAgICAgICAgcmV0dXJuICdNaW1lVHlwZUFycmF5Jztcblx0ICAgICAgfVxuXG5cdCAgICAgIC8qICEgU3BlYyBDb25mb3JtYW5jZVxuXHQgICAgICAgKiAoaHR0cHM6Ly9odG1sLnNwZWMud2hhdHdnLm9yZy9tdWx0aXBhZ2Uvd2ViYXBwYXBpcy5odG1sI3BsdWdpbmFycmF5KVxuXHQgICAgICAgKiBXaGF0V0cgSFRNTCQ4LjYuMS41IC0gUGx1Z2lucyAtIEludGVyZmFjZSBQbHVnaW5BcnJheVxuXHQgICAgICAgKiBUZXN0OiBgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG5hdmlnYXRvci5wbHVnaW5zKWBgXG5cdCAgICAgICAqICAtIElFIDw9MTAgPT09IFwiW29iamVjdCBNU1BsdWdpbnNDb2xsZWN0aW9uXVwiXG5cdCAgICAgICAqL1xuXHQgICAgICBpZiAodHlwZW9mIHdpbmRvdy5uYXZpZ2F0b3IucGx1Z2lucyA9PT0gJ29iamVjdCcgJiZcblx0ICAgICAgICAgIG9iaiA9PT0gd2luZG93Lm5hdmlnYXRvci5wbHVnaW5zKSB7XG5cdCAgICAgICAgcmV0dXJuICdQbHVnaW5BcnJheSc7XG5cdCAgICAgIH1cblx0ICAgIH1cblxuXHQgICAgaWYgKCh0eXBlb2Ygd2luZG93LkhUTUxFbGVtZW50ID09PSAnZnVuY3Rpb24nIHx8XG5cdCAgICAgICAgdHlwZW9mIHdpbmRvdy5IVE1MRWxlbWVudCA9PT0gJ29iamVjdCcpICYmXG5cdCAgICAgICAgb2JqIGluc3RhbmNlb2Ygd2luZG93LkhUTUxFbGVtZW50KSB7XG5cdCAgICAgIC8qICEgU3BlYyBDb25mb3JtYW5jZVxuXHQgICAgICAqIChodHRwczovL2h0bWwuc3BlYy53aGF0d2cub3JnL211bHRpcGFnZS93ZWJhcHBhcGlzLmh0bWwjcGx1Z2luYXJyYXkpXG5cdCAgICAgICogV2hhdFdHIEhUTUwkNC40LjQgLSBUaGUgYGJsb2NrcXVvdGVgIGVsZW1lbnQgLSBJbnRlcmZhY2UgYEhUTUxRdW90ZUVsZW1lbnRgXG5cdCAgICAgICogVGVzdDogYE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdibG9ja3F1b3RlJykpYGBcblx0ICAgICAgKiAgLSBJRSA8PTEwID09PSBcIltvYmplY3QgSFRNTEJsb2NrRWxlbWVudF1cIlxuXHQgICAgICAqL1xuXHQgICAgICBpZiAob2JqLnRhZ05hbWUgPT09ICdCTE9DS1FVT1RFJykge1xuXHQgICAgICAgIHJldHVybiAnSFRNTFF1b3RlRWxlbWVudCc7XG5cdCAgICAgIH1cblxuXHQgICAgICAvKiAhIFNwZWMgQ29uZm9ybWFuY2Vcblx0ICAgICAgICogKGh0dHBzOi8vaHRtbC5zcGVjLndoYXR3Zy5vcmcvI2h0bWx0YWJsZWRhdGFjZWxsZWxlbWVudClcblx0ICAgICAgICogV2hhdFdHIEhUTUwkNC45LjkgLSBUaGUgYHRkYCBlbGVtZW50IC0gSW50ZXJmYWNlIGBIVE1MVGFibGVEYXRhQ2VsbEVsZW1lbnRgXG5cdCAgICAgICAqIE5vdGU6IE1vc3QgYnJvd3NlcnMgY3VycmVudGx5IGFkaGVyIHRvIHRoZSBXM0MgRE9NIExldmVsIDIgc3BlY1xuXHQgICAgICAgKiAgICAgICAoaHR0cHM6Ly93d3cudzMub3JnL1RSL0RPTS1MZXZlbC0yLUhUTUwvaHRtbC5odG1sI0lELTgyOTE1MDc1KVxuXHQgICAgICAgKiAgICAgICB3aGljaCBzdWdnZXN0cyB0aGF0IGJyb3dzZXJzIHNob3VsZCB1c2UgSFRNTFRhYmxlQ2VsbEVsZW1lbnQgZm9yXG5cdCAgICAgICAqICAgICAgIGJvdGggVEQgYW5kIFRIIGVsZW1lbnRzLiBXaGF0V0cgc2VwYXJhdGVzIHRoZXNlLlxuXHQgICAgICAgKiBUZXN0OiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGQnKSlcblx0ICAgICAgICogIC0gQ2hyb21lID09PSBcIltvYmplY3QgSFRNTFRhYmxlQ2VsbEVsZW1lbnRdXCJcblx0ICAgICAgICogIC0gRmlyZWZveCA9PT0gXCJbb2JqZWN0IEhUTUxUYWJsZUNlbGxFbGVtZW50XVwiXG5cdCAgICAgICAqICAtIFNhZmFyaSA9PT0gXCJbb2JqZWN0IEhUTUxUYWJsZUNlbGxFbGVtZW50XVwiXG5cdCAgICAgICAqL1xuXHQgICAgICBpZiAob2JqLnRhZ05hbWUgPT09ICdURCcpIHtcblx0ICAgICAgICByZXR1cm4gJ0hUTUxUYWJsZURhdGFDZWxsRWxlbWVudCc7XG5cdCAgICAgIH1cblxuXHQgICAgICAvKiAhIFNwZWMgQ29uZm9ybWFuY2Vcblx0ICAgICAgICogKGh0dHBzOi8vaHRtbC5zcGVjLndoYXR3Zy5vcmcvI2h0bWx0YWJsZWhlYWRlcmNlbGxlbGVtZW50KVxuXHQgICAgICAgKiBXaGF0V0cgSFRNTCQ0LjkuOSAtIFRoZSBgdGRgIGVsZW1lbnQgLSBJbnRlcmZhY2UgYEhUTUxUYWJsZUhlYWRlckNlbGxFbGVtZW50YFxuXHQgICAgICAgKiBOb3RlOiBNb3N0IGJyb3dzZXJzIGN1cnJlbnRseSBhZGhlciB0byB0aGUgVzNDIERPTSBMZXZlbCAyIHNwZWNcblx0ICAgICAgICogICAgICAgKGh0dHBzOi8vd3d3LnczLm9yZy9UUi9ET00tTGV2ZWwtMi1IVE1ML2h0bWwuaHRtbCNJRC04MjkxNTA3NSlcblx0ICAgICAgICogICAgICAgd2hpY2ggc3VnZ2VzdHMgdGhhdCBicm93c2VycyBzaG91bGQgdXNlIEhUTUxUYWJsZUNlbGxFbGVtZW50IGZvclxuXHQgICAgICAgKiAgICAgICBib3RoIFREIGFuZCBUSCBlbGVtZW50cy4gV2hhdFdHIHNlcGFyYXRlcyB0aGVzZS5cblx0ICAgICAgICogVGVzdDogT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RoJykpXG5cdCAgICAgICAqICAtIENocm9tZSA9PT0gXCJbb2JqZWN0IEhUTUxUYWJsZUNlbGxFbGVtZW50XVwiXG5cdCAgICAgICAqICAtIEZpcmVmb3ggPT09IFwiW29iamVjdCBIVE1MVGFibGVDZWxsRWxlbWVudF1cIlxuXHQgICAgICAgKiAgLSBTYWZhcmkgPT09IFwiW29iamVjdCBIVE1MVGFibGVDZWxsRWxlbWVudF1cIlxuXHQgICAgICAgKi9cblx0ICAgICAgaWYgKG9iai50YWdOYW1lID09PSAnVEgnKSB7XG5cdCAgICAgICAgcmV0dXJuICdIVE1MVGFibGVIZWFkZXJDZWxsRWxlbWVudCc7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9XG5cblx0ICAvKiAhIFNwZWVkIG9wdGltaXNhdGlvblxuXHQgICogUHJlOlxuXHQgICogICBGbG9hdDY0QXJyYXkgICAgICAgeCA2MjUsNjQ0IG9wcy9zZWMgwrExLjU4JSAoODAgcnVucyBzYW1wbGVkKVxuXHQgICogICBGbG9hdDMyQXJyYXkgICAgICAgeCAxLDI3OSw4NTIgb3BzL3NlYyDCsTIuOTElICg3NyBydW5zIHNhbXBsZWQpXG5cdCAgKiAgIFVpbnQzMkFycmF5ICAgICAgICB4IDEsMTc4LDE4NSBvcHMvc2VjIMKxMS45NSUgKDgzIHJ1bnMgc2FtcGxlZClcblx0ICAqICAgVWludDE2QXJyYXkgICAgICAgIHggMSwwMDgsMzgwIG9wcy9zZWMgwrEyLjI1JSAoODAgcnVucyBzYW1wbGVkKVxuXHQgICogICBVaW50OEFycmF5ICAgICAgICAgeCAxLDEyOCwwNDAgb3BzL3NlYyDCsTIuMTElICg4MSBydW5zIHNhbXBsZWQpXG5cdCAgKiAgIEludDMyQXJyYXkgICAgICAgICB4IDEsMTcwLDExOSBvcHMvc2VjIMKxMi44OCUgKDgwIHJ1bnMgc2FtcGxlZClcblx0ICAqICAgSW50MTZBcnJheSAgICAgICAgIHggMSwxNzYsMzQ4IG9wcy9zZWMgwrE1Ljc5JSAoODYgcnVucyBzYW1wbGVkKVxuXHQgICogICBJbnQ4QXJyYXkgICAgICAgICAgeCAxLDA1OCw3MDcgb3BzL3NlYyDCsTQuOTQlICg3NyBydW5zIHNhbXBsZWQpXG5cdCAgKiAgIFVpbnQ4Q2xhbXBlZEFycmF5ICB4IDEsMTEwLDYzMyBvcHMvc2VjIMKxNC4yMCUgKDgwIHJ1bnMgc2FtcGxlZClcblx0ICAqIFBvc3Q6XG5cdCAgKiAgIEZsb2F0NjRBcnJheSAgICAgICB4IDcsMTA1LDY3MSBvcHMvc2VjIMKxMTMuNDclICg2NCBydW5zIHNhbXBsZWQpXG5cdCAgKiAgIEZsb2F0MzJBcnJheSAgICAgICB4IDUsODg3LDkxMiBvcHMvc2VjIMKxMS40NiUgKDgyIHJ1bnMgc2FtcGxlZClcblx0ICAqICAgVWludDMyQXJyYXkgICAgICAgIHggNiw0OTEsNjYxIG9wcy9zZWMgwrExLjc2JSAoNzkgcnVucyBzYW1wbGVkKVxuXHQgICogICBVaW50MTZBcnJheSAgICAgICAgeCA2LDU1OSw3OTUgb3BzL3NlYyDCsTEuNjclICg4MiBydW5zIHNhbXBsZWQpXG5cdCAgKiAgIFVpbnQ4QXJyYXkgICAgICAgICB4IDYsNDYzLDk2NiBvcHMvc2VjIMKxMS40MyUgKDg1IHJ1bnMgc2FtcGxlZClcblx0ICAqICAgSW50MzJBcnJheSAgICAgICAgIHggNSw2NDEsODQxIG9wcy9zZWMgwrEzLjQ5JSAoODEgcnVucyBzYW1wbGVkKVxuXHQgICogICBJbnQxNkFycmF5ICAgICAgICAgeCA2LDU4Myw1MTEgb3BzL3NlYyDCsTEuOTglICg4MCBydW5zIHNhbXBsZWQpXG5cdCAgKiAgIEludDhBcnJheSAgICAgICAgICB4IDYsNjA2LDA3OCBvcHMvc2VjIMKxMS43NCUgKDgxIHJ1bnMgc2FtcGxlZClcblx0ICAqICAgVWludDhDbGFtcGVkQXJyYXkgIHggNiw2MDIsMjI0IG9wcy9zZWMgwrExLjc3JSAoODMgcnVucyBzYW1wbGVkKVxuXHQgICovXG5cdCAgdmFyIHN0cmluZ1RhZyA9IChzeW1ib2xUb1N0cmluZ1RhZ0V4aXN0cyAmJiBvYmpbU3ltYm9sLnRvU3RyaW5nVGFnXSk7XG5cdCAgaWYgKHR5cGVvZiBzdHJpbmdUYWcgPT09ICdzdHJpbmcnKSB7XG5cdCAgICByZXR1cm4gc3RyaW5nVGFnO1xuXHQgIH1cblxuXHQgIHZhciBvYmpQcm90b3R5cGUgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Yob2JqKTtcblx0ICAvKiAhIFNwZWVkIG9wdGltaXNhdGlvblxuXHQgICogUHJlOlxuXHQgICogICByZWdleCBsaXRlcmFsICAgICAgeCAxLDc3MiwzODUgb3BzL3NlYyDCsTEuODUlICg3NyBydW5zIHNhbXBsZWQpXG5cdCAgKiAgIHJlZ2V4IGNvbnN0cnVjdG9yICB4IDIsMTQzLDYzNCBvcHMvc2VjIMKxMi40NiUgKDc4IHJ1bnMgc2FtcGxlZClcblx0ICAqIFBvc3Q6XG5cdCAgKiAgIHJlZ2V4IGxpdGVyYWwgICAgICB4IDMsOTI4LDAwOSBvcHMvc2VjIMKxMC42NSUgKDc4IHJ1bnMgc2FtcGxlZClcblx0ICAqICAgcmVnZXggY29uc3RydWN0b3IgIHggMyw5MzEsMTA4IG9wcy9zZWMgwrEwLjU4JSAoODQgcnVucyBzYW1wbGVkKVxuXHQgICovXG5cdCAgaWYgKG9ialByb3RvdHlwZSA9PT0gUmVnRXhwLnByb3RvdHlwZSkge1xuXHQgICAgcmV0dXJuICdSZWdFeHAnO1xuXHQgIH1cblxuXHQgIC8qICEgU3BlZWQgb3B0aW1pc2F0aW9uXG5cdCAgKiBQcmU6XG5cdCAgKiAgIGRhdGUgICAgICAgICAgICAgICB4IDIsMTMwLDA3NCBvcHMvc2VjIMKxNC40MiUgKDY4IHJ1bnMgc2FtcGxlZClcblx0ICAqIFBvc3Q6XG5cdCAgKiAgIGRhdGUgICAgICAgICAgICAgICB4IDMsOTUzLDc3OSBvcHMvc2VjIMKxMS4zNSUgKDc3IHJ1bnMgc2FtcGxlZClcblx0ICAqL1xuXHQgIGlmIChvYmpQcm90b3R5cGUgPT09IERhdGUucHJvdG90eXBlKSB7XG5cdCAgICByZXR1cm4gJ0RhdGUnO1xuXHQgIH1cblxuXHQgIC8qICEgU3BlYyBDb25mb3JtYW5jZVxuXHQgICAqIChodHRwOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNi4wL2luZGV4Lmh0bWwjc2VjLXByb21pc2UucHJvdG90eXBlLUBAdG9zdHJpbmd0YWcpXG5cdCAgICogRVM2JDI1LjQuNS40IC0gUHJvbWlzZS5wcm90b3R5cGVbQEB0b1N0cmluZ1RhZ10gc2hvdWxkIGJlIFwiUHJvbWlzZVwiOlxuXHQgICAqIFRlc3Q6IGBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoUHJvbWlzZS5yZXNvbHZlKCkpYGBcblx0ICAgKiAgLSBDaHJvbWUgPD00NyA9PT0gXCJbb2JqZWN0IE9iamVjdF1cIlxuXHQgICAqICAtIEVkZ2UgPD0yMCA9PT0gXCJbb2JqZWN0IE9iamVjdF1cIlxuXHQgICAqICAtIEZpcmVmb3ggMjktTGF0ZXN0ID09PSBcIltvYmplY3QgUHJvbWlzZV1cIlxuXHQgICAqICAtIFNhZmFyaSA3LjEtTGF0ZXN0ID09PSBcIltvYmplY3QgUHJvbWlzZV1cIlxuXHQgICAqL1xuXHQgIGlmIChwcm9taXNlRXhpc3RzICYmIG9ialByb3RvdHlwZSA9PT0gUHJvbWlzZS5wcm90b3R5cGUpIHtcblx0ICAgIHJldHVybiAnUHJvbWlzZSc7XG5cdCAgfVxuXG5cdCAgLyogISBTcGVlZCBvcHRpbWlzYXRpb25cblx0ICAqIFByZTpcblx0ICAqICAgc2V0ICAgICAgICAgICAgICAgIHggMiwyMjIsMTg2IG9wcy9zZWMgwrExLjMxJSAoODIgcnVucyBzYW1wbGVkKVxuXHQgICogUG9zdDpcblx0ICAqICAgc2V0ICAgICAgICAgICAgICAgIHggNCw1NDUsODc5IG9wcy9zZWMgwrExLjEzJSAoODMgcnVucyBzYW1wbGVkKVxuXHQgICovXG5cdCAgaWYgKHNldEV4aXN0cyAmJiBvYmpQcm90b3R5cGUgPT09IFNldC5wcm90b3R5cGUpIHtcblx0ICAgIHJldHVybiAnU2V0Jztcblx0ICB9XG5cblx0ICAvKiAhIFNwZWVkIG9wdGltaXNhdGlvblxuXHQgICogUHJlOlxuXHQgICogICBtYXAgICAgICAgICAgICAgICAgeCAyLDM5Niw4NDIgb3BzL3NlYyDCsTEuNTklICg4MSBydW5zIHNhbXBsZWQpXG5cdCAgKiBQb3N0OlxuXHQgICogICBtYXAgICAgICAgICAgICAgICAgeCA0LDE4Myw5NDUgb3BzL3NlYyDCsTYuNTklICg4MiBydW5zIHNhbXBsZWQpXG5cdCAgKi9cblx0ICBpZiAobWFwRXhpc3RzICYmIG9ialByb3RvdHlwZSA9PT0gTWFwLnByb3RvdHlwZSkge1xuXHQgICAgcmV0dXJuICdNYXAnO1xuXHQgIH1cblxuXHQgIC8qICEgU3BlZWQgb3B0aW1pc2F0aW9uXG5cdCAgKiBQcmU6XG5cdCAgKiAgIHdlYWtzZXQgICAgICAgICAgICB4IDEsMzIzLDIyMCBvcHMvc2VjIMKxMi4xNyUgKDc2IHJ1bnMgc2FtcGxlZClcblx0ICAqIFBvc3Q6XG5cdCAgKiAgIHdlYWtzZXQgICAgICAgICAgICB4IDQsMjM3LDUxMCBvcHMvc2VjIMKxMi4wMSUgKDc3IHJ1bnMgc2FtcGxlZClcblx0ICAqL1xuXHQgIGlmICh3ZWFrU2V0RXhpc3RzICYmIG9ialByb3RvdHlwZSA9PT0gV2Vha1NldC5wcm90b3R5cGUpIHtcblx0ICAgIHJldHVybiAnV2Vha1NldCc7XG5cdCAgfVxuXG5cdCAgLyogISBTcGVlZCBvcHRpbWlzYXRpb25cblx0ICAqIFByZTpcblx0ICAqICAgd2Vha21hcCAgICAgICAgICAgIHggMSw1MDAsMjYwIG9wcy9zZWMgwrEyLjAyJSAoNzggcnVucyBzYW1wbGVkKVxuXHQgICogUG9zdDpcblx0ICAqICAgd2Vha21hcCAgICAgICAgICAgIHggMyw4ODEsMzg0IG9wcy9zZWMgwrExLjQ1JSAoODIgcnVucyBzYW1wbGVkKVxuXHQgICovXG5cdCAgaWYgKHdlYWtNYXBFeGlzdHMgJiYgb2JqUHJvdG90eXBlID09PSBXZWFrTWFwLnByb3RvdHlwZSkge1xuXHQgICAgcmV0dXJuICdXZWFrTWFwJztcblx0ICB9XG5cblx0ICAvKiAhIFNwZWMgQ29uZm9ybWFuY2Vcblx0ICAgKiAoaHR0cDovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzYuMC9pbmRleC5odG1sI3NlYy1kYXRhdmlldy5wcm90b3R5cGUtQEB0b3N0cmluZ3RhZylcblx0ICAgKiBFUzYkMjQuMi40LjIxIC0gRGF0YVZpZXcucHJvdG90eXBlW0BAdG9TdHJpbmdUYWddIHNob3VsZCBiZSBcIkRhdGFWaWV3XCI6XG5cdCAgICogVGVzdDogYE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChuZXcgRGF0YVZpZXcobmV3IEFycmF5QnVmZmVyKDEpKSlgYFxuXHQgICAqICAtIEVkZ2UgPD0xMyA9PT0gXCJbb2JqZWN0IE9iamVjdF1cIlxuXHQgICAqL1xuXHQgIGlmIChkYXRhVmlld0V4aXN0cyAmJiBvYmpQcm90b3R5cGUgPT09IERhdGFWaWV3LnByb3RvdHlwZSkge1xuXHQgICAgcmV0dXJuICdEYXRhVmlldyc7XG5cdCAgfVxuXG5cdCAgLyogISBTcGVjIENvbmZvcm1hbmNlXG5cdCAgICogKGh0dHA6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi82LjAvaW5kZXguaHRtbCNzZWMtJW1hcGl0ZXJhdG9ycHJvdG90eXBlJS1AQHRvc3RyaW5ndGFnKVxuXHQgICAqIEVTNiQyMy4xLjUuMi4yIC0gJU1hcEl0ZXJhdG9yUHJvdG90eXBlJVtAQHRvU3RyaW5nVGFnXSBzaG91bGQgYmUgXCJNYXAgSXRlcmF0b3JcIjpcblx0ICAgKiBUZXN0OiBgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG5ldyBNYXAoKS5lbnRyaWVzKCkpYGBcblx0ICAgKiAgLSBFZGdlIDw9MTMgPT09IFwiW29iamVjdCBPYmplY3RdXCJcblx0ICAgKi9cblx0ICBpZiAobWFwRXhpc3RzICYmIG9ialByb3RvdHlwZSA9PT0gbWFwSXRlcmF0b3JQcm90b3R5cGUpIHtcblx0ICAgIHJldHVybiAnTWFwIEl0ZXJhdG9yJztcblx0ICB9XG5cblx0ICAvKiAhIFNwZWMgQ29uZm9ybWFuY2Vcblx0ICAgKiAoaHR0cDovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzYuMC9pbmRleC5odG1sI3NlYy0lc2V0aXRlcmF0b3Jwcm90b3R5cGUlLUBAdG9zdHJpbmd0YWcpXG5cdCAgICogRVM2JDIzLjIuNS4yLjIgLSAlU2V0SXRlcmF0b3JQcm90b3R5cGUlW0BAdG9TdHJpbmdUYWddIHNob3VsZCBiZSBcIlNldCBJdGVyYXRvclwiOlxuXHQgICAqIFRlc3Q6IGBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobmV3IFNldCgpLmVudHJpZXMoKSlgYFxuXHQgICAqICAtIEVkZ2UgPD0xMyA9PT0gXCJbb2JqZWN0IE9iamVjdF1cIlxuXHQgICAqL1xuXHQgIGlmIChzZXRFeGlzdHMgJiYgb2JqUHJvdG90eXBlID09PSBzZXRJdGVyYXRvclByb3RvdHlwZSkge1xuXHQgICAgcmV0dXJuICdTZXQgSXRlcmF0b3InO1xuXHQgIH1cblxuXHQgIC8qICEgU3BlYyBDb25mb3JtYW5jZVxuXHQgICAqIChodHRwOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNi4wL2luZGV4Lmh0bWwjc2VjLSVhcnJheWl0ZXJhdG9ycHJvdG90eXBlJS1AQHRvc3RyaW5ndGFnKVxuXHQgICAqIEVTNiQyMi4xLjUuMi4yIC0gJUFycmF5SXRlcmF0b3JQcm90b3R5cGUlW0BAdG9TdHJpbmdUYWddIHNob3VsZCBiZSBcIkFycmF5IEl0ZXJhdG9yXCI6XG5cdCAgICogVGVzdDogYE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChbXVtTeW1ib2wuaXRlcmF0b3JdKCkpYGBcblx0ICAgKiAgLSBFZGdlIDw9MTMgPT09IFwiW29iamVjdCBPYmplY3RdXCJcblx0ICAgKi9cblx0ICBpZiAoYXJyYXlJdGVyYXRvckV4aXN0cyAmJiBvYmpQcm90b3R5cGUgPT09IGFycmF5SXRlcmF0b3JQcm90b3R5cGUpIHtcblx0ICAgIHJldHVybiAnQXJyYXkgSXRlcmF0b3InO1xuXHQgIH1cblxuXHQgIC8qICEgU3BlYyBDb25mb3JtYW5jZVxuXHQgICAqIChodHRwOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNi4wL2luZGV4Lmh0bWwjc2VjLSVzdHJpbmdpdGVyYXRvcnByb3RvdHlwZSUtQEB0b3N0cmluZ3RhZylcblx0ICAgKiBFUzYkMjEuMS41LjIuMiAtICVTdHJpbmdJdGVyYXRvclByb3RvdHlwZSVbQEB0b1N0cmluZ1RhZ10gc2hvdWxkIGJlIFwiU3RyaW5nIEl0ZXJhdG9yXCI6XG5cdCAgICogVGVzdDogYE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCgnJ1tTeW1ib2wuaXRlcmF0b3JdKCkpYGBcblx0ICAgKiAgLSBFZGdlIDw9MTMgPT09IFwiW29iamVjdCBPYmplY3RdXCJcblx0ICAgKi9cblx0ICBpZiAoc3RyaW5nSXRlcmF0b3JFeGlzdHMgJiYgb2JqUHJvdG90eXBlID09PSBzdHJpbmdJdGVyYXRvclByb3RvdHlwZSkge1xuXHQgICAgcmV0dXJuICdTdHJpbmcgSXRlcmF0b3InO1xuXHQgIH1cblxuXHQgIC8qICEgU3BlZWQgb3B0aW1pc2F0aW9uXG5cdCAgKiBQcmU6XG5cdCAgKiAgIG9iamVjdCBmcm9tIG51bGwgICB4IDIsNDI0LDMyMCBvcHMvc2VjIMKxMS42NyUgKDc2IHJ1bnMgc2FtcGxlZClcblx0ICAqIFBvc3Q6XG5cdCAgKiAgIG9iamVjdCBmcm9tIG51bGwgICB4IDUsODM4LDAwMCBvcHMvc2VjIMKxMC45OSUgKDg0IHJ1bnMgc2FtcGxlZClcblx0ICAqL1xuXHQgIGlmIChvYmpQcm90b3R5cGUgPT09IG51bGwpIHtcblx0ICAgIHJldHVybiAnT2JqZWN0Jztcblx0ICB9XG5cblx0ICByZXR1cm4gT2JqZWN0XG5cdCAgICAucHJvdG90eXBlXG5cdCAgICAudG9TdHJpbmdcblx0ICAgIC5jYWxsKG9iailcblx0ICAgIC5zbGljZSh0b1N0cmluZ0xlZnRTbGljZUxlbmd0aCwgdG9TdHJpbmdSaWdodFNsaWNlTGVuZ3RoKTtcblx0fVxuXG5cdHJldHVybiB0eXBlRGV0ZWN0O1xuXG5cdH0pKSk7XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIF9zbGljZWRUb0FycmF5KGFyciwgaSkge1xuXHQgIHJldHVybiBfYXJyYXlXaXRoSG9sZXMoYXJyKSB8fCBfaXRlcmFibGVUb0FycmF5TGltaXQoYXJyLCBpKSB8fCBfdW5zdXBwb3J0ZWRJdGVyYWJsZVRvQXJyYXkoYXJyLCBpKSB8fCBfbm9uSXRlcmFibGVSZXN0KCk7XG5cdH1cblxuXHRmdW5jdGlvbiBfYXJyYXlXaXRoSG9sZXMoYXJyKSB7XG5cdCAgaWYgKEFycmF5LmlzQXJyYXkoYXJyKSkgcmV0dXJuIGFycjtcblx0fVxuXG5cdGZ1bmN0aW9uIF9pdGVyYWJsZVRvQXJyYXlMaW1pdChhcnIsIGkpIHtcblx0ICBpZiAodHlwZW9mIFN5bWJvbCA9PT0gXCJ1bmRlZmluZWRcIiB8fCAhKFN5bWJvbC5pdGVyYXRvciBpbiBPYmplY3QoYXJyKSkpIHJldHVybjtcblx0ICB2YXIgX2FyciA9IFtdO1xuXHQgIHZhciBfbiA9IHRydWU7XG5cdCAgdmFyIF9kID0gZmFsc2U7XG5cdCAgdmFyIF9lID0gdW5kZWZpbmVkO1xuXG5cdCAgdHJ5IHtcblx0ICAgIGZvciAodmFyIF9pID0gYXJyW1N5bWJvbC5pdGVyYXRvcl0oKSwgX3M7ICEoX24gPSAoX3MgPSBfaS5uZXh0KCkpLmRvbmUpOyBfbiA9IHRydWUpIHtcblx0ICAgICAgX2Fyci5wdXNoKF9zLnZhbHVlKTtcblxuXHQgICAgICBpZiAoaSAmJiBfYXJyLmxlbmd0aCA9PT0gaSkgYnJlYWs7XG5cdCAgICB9XG5cdCAgfSBjYXRjaCAoZXJyKSB7XG5cdCAgICBfZCA9IHRydWU7XG5cdCAgICBfZSA9IGVycjtcblx0ICB9IGZpbmFsbHkge1xuXHQgICAgdHJ5IHtcblx0ICAgICAgaWYgKCFfbiAmJiBfaVtcInJldHVyblwiXSAhPSBudWxsKSBfaVtcInJldHVyblwiXSgpO1xuXHQgICAgfSBmaW5hbGx5IHtcblx0ICAgICAgaWYgKF9kKSB0aHJvdyBfZTtcblx0ICAgIH1cblx0ICB9XG5cblx0ICByZXR1cm4gX2Fycjtcblx0fVxuXG5cdGZ1bmN0aW9uIF91bnN1cHBvcnRlZEl0ZXJhYmxlVG9BcnJheShvLCBtaW5MZW4pIHtcblx0ICBpZiAoIW8pIHJldHVybjtcblx0ICBpZiAodHlwZW9mIG8gPT09IFwic3RyaW5nXCIpIHJldHVybiBfYXJyYXlMaWtlVG9BcnJheShvLCBtaW5MZW4pO1xuXHQgIHZhciBuID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pLnNsaWNlKDgsIC0xKTtcblx0ICBpZiAobiA9PT0gXCJPYmplY3RcIiAmJiBvLmNvbnN0cnVjdG9yKSBuID0gby5jb25zdHJ1Y3Rvci5uYW1lO1xuXHQgIGlmIChuID09PSBcIk1hcFwiIHx8IG4gPT09IFwiU2V0XCIpIHJldHVybiBBcnJheS5mcm9tKG8pO1xuXHQgIGlmIChuID09PSBcIkFyZ3VtZW50c1wiIHx8IC9eKD86VWl8SSludCg/Ojh8MTZ8MzIpKD86Q2xhbXBlZCk/QXJyYXkkLy50ZXN0KG4pKSByZXR1cm4gX2FycmF5TGlrZVRvQXJyYXkobywgbWluTGVuKTtcblx0fVxuXG5cdGZ1bmN0aW9uIF9hcnJheUxpa2VUb0FycmF5KGFyciwgbGVuKSB7XG5cdCAgaWYgKGxlbiA9PSBudWxsIHx8IGxlbiA+IGFyci5sZW5ndGgpIGxlbiA9IGFyci5sZW5ndGg7XG5cblx0ICBmb3IgKHZhciBpID0gMCwgYXJyMiA9IG5ldyBBcnJheShsZW4pOyBpIDwgbGVuOyBpKyspIGFycjJbaV0gPSBhcnJbaV07XG5cblx0ICByZXR1cm4gYXJyMjtcblx0fVxuXG5cdGZ1bmN0aW9uIF9ub25JdGVyYWJsZVJlc3QoKSB7XG5cdCAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkludmFsaWQgYXR0ZW1wdCB0byBkZXN0cnVjdHVyZSBub24taXRlcmFibGUgaW5zdGFuY2UuXFxuSW4gb3JkZXIgdG8gYmUgaXRlcmFibGUsIG5vbi1hcnJheSBvYmplY3RzIG11c3QgaGF2ZSBhIFtTeW1ib2wuaXRlcmF0b3JdKCkgbWV0aG9kLlwiKTtcblx0fVxuXG5cdHZhciBhbnNpQ29sb3JzID0ge1xuXHQgIGJvbGQ6IFsnMScsICcyMiddLFxuXHQgIGRpbTogWycyJywgJzIyJ10sXG5cdCAgaXRhbGljOiBbJzMnLCAnMjMnXSxcblx0ICB1bmRlcmxpbmU6IFsnNCcsICcyNCddLFxuXHQgIC8vIDUgJiA2IGFyZSBibGlua2luZ1xuXHQgIGludmVyc2U6IFsnNycsICcyNyddLFxuXHQgIGhpZGRlbjogWyc4JywgJzI4J10sXG5cdCAgc3RyaWtlOiBbJzknLCAnMjknXSxcblx0ICAvLyAxMC0yMCBhcmUgZm9udHNcblx0ICAvLyAyMS0yOSBhcmUgcmVzZXRzIGZvciAxLTlcblx0ICBibGFjazogWyczMCcsICczOSddLFxuXHQgIHJlZDogWyczMScsICczOSddLFxuXHQgIGdyZWVuOiBbJzMyJywgJzM5J10sXG5cdCAgeWVsbG93OiBbJzMzJywgJzM5J10sXG5cdCAgYmx1ZTogWyczNCcsICczOSddLFxuXHQgIG1hZ2VudGE6IFsnMzUnLCAnMzknXSxcblx0ICBjeWFuOiBbJzM2JywgJzM5J10sXG5cdCAgd2hpdGU6IFsnMzcnLCAnMzknXSxcblx0ICBicmlnaHRibGFjazogWyczMDsxJywgJzM5J10sXG5cdCAgYnJpZ2h0cmVkOiBbJzMxOzEnLCAnMzknXSxcblx0ICBicmlnaHRncmVlbjogWyczMjsxJywgJzM5J10sXG5cdCAgYnJpZ2h0eWVsbG93OiBbJzMzOzEnLCAnMzknXSxcblx0ICBicmlnaHRibHVlOiBbJzM0OzEnLCAnMzknXSxcblx0ICBicmlnaHRtYWdlbnRhOiBbJzM1OzEnLCAnMzknXSxcblx0ICBicmlnaHRjeWFuOiBbJzM2OzEnLCAnMzknXSxcblx0ICBicmlnaHR3aGl0ZTogWyczNzsxJywgJzM5J10sXG5cdCAgZ3JleTogWyc5MCcsICczOSddXG5cdH07XG5cdHZhciBzdHlsZXMgPSB7XG5cdCAgc3BlY2lhbDogJ2N5YW4nLFxuXHQgIG51bWJlcjogJ3llbGxvdycsXG5cdCAgYm9vbGVhbjogJ3llbGxvdycsXG5cdCAgdW5kZWZpbmVkOiAnZ3JleScsXG5cdCAgbnVsbDogJ2JvbGQnLFxuXHQgIHN0cmluZzogJ2dyZWVuJyxcblx0ICBzeW1ib2w6ICdncmVlbicsXG5cdCAgZGF0ZTogJ21hZ2VudGEnLFxuXHQgIHJlZ2V4cDogJ3JlZCdcblx0fTtcblx0dmFyIHRydW5jYXRvciA9ICfigKYnO1xuXG5cdGZ1bmN0aW9uIGNvbG9yaXNlKHZhbHVlLCBzdHlsZVR5cGUpIHtcblx0ICB2YXIgY29sb3IgPSBhbnNpQ29sb3JzW3N0eWxlc1tzdHlsZVR5cGVdXSB8fCBhbnNpQ29sb3JzW3N0eWxlVHlwZV07XG5cblx0ICBpZiAoIWNvbG9yKSB7XG5cdCAgICByZXR1cm4gU3RyaW5nKHZhbHVlKTtcblx0ICB9XG5cblx0ICByZXR1cm4gXCJcXHgxQltcIi5jb25jYXQoY29sb3JbMF0sIFwibVwiKS5jb25jYXQoU3RyaW5nKHZhbHVlKSwgXCJcXHgxQltcIikuY29uY2F0KGNvbG9yWzFdLCBcIm1cIik7XG5cdH1cblxuXHRmdW5jdGlvbiBub3JtYWxpc2VPcHRpb25zKCkge1xuXHQgIHZhciBfcmVmID0gYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgYXJndW1lbnRzWzBdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMF0gOiB7fSxcblx0ICAgICAgX3JlZiRzaG93SGlkZGVuID0gX3JlZi5zaG93SGlkZGVuLFxuXHQgICAgICBzaG93SGlkZGVuID0gX3JlZiRzaG93SGlkZGVuID09PSB2b2lkIDAgPyBmYWxzZSA6IF9yZWYkc2hvd0hpZGRlbixcblx0ICAgICAgX3JlZiRkZXB0aCA9IF9yZWYuZGVwdGgsXG5cdCAgICAgIGRlcHRoID0gX3JlZiRkZXB0aCA9PT0gdm9pZCAwID8gMiA6IF9yZWYkZGVwdGgsXG5cdCAgICAgIF9yZWYkY29sb3JzID0gX3JlZi5jb2xvcnMsXG5cdCAgICAgIGNvbG9ycyA9IF9yZWYkY29sb3JzID09PSB2b2lkIDAgPyBmYWxzZSA6IF9yZWYkY29sb3JzLFxuXHQgICAgICBfcmVmJGN1c3RvbUluc3BlY3QgPSBfcmVmLmN1c3RvbUluc3BlY3QsXG5cdCAgICAgIGN1c3RvbUluc3BlY3QgPSBfcmVmJGN1c3RvbUluc3BlY3QgPT09IHZvaWQgMCA/IHRydWUgOiBfcmVmJGN1c3RvbUluc3BlY3QsXG5cdCAgICAgIF9yZWYkc2hvd1Byb3h5ID0gX3JlZi5zaG93UHJveHksXG5cdCAgICAgIHNob3dQcm94eSA9IF9yZWYkc2hvd1Byb3h5ID09PSB2b2lkIDAgPyBmYWxzZSA6IF9yZWYkc2hvd1Byb3h5LFxuXHQgICAgICBfcmVmJG1heEFycmF5TGVuZ3RoID0gX3JlZi5tYXhBcnJheUxlbmd0aCxcblx0ICAgICAgbWF4QXJyYXlMZW5ndGggPSBfcmVmJG1heEFycmF5TGVuZ3RoID09PSB2b2lkIDAgPyBJbmZpbml0eSA6IF9yZWYkbWF4QXJyYXlMZW5ndGgsXG5cdCAgICAgIF9yZWYkYnJlYWtMZW5ndGggPSBfcmVmLmJyZWFrTGVuZ3RoLFxuXHQgICAgICBicmVha0xlbmd0aCA9IF9yZWYkYnJlYWtMZW5ndGggPT09IHZvaWQgMCA/IEluZmluaXR5IDogX3JlZiRicmVha0xlbmd0aCxcblx0ICAgICAgX3JlZiRzZWVuID0gX3JlZi5zZWVuLFxuXHQgICAgICBzZWVuID0gX3JlZiRzZWVuID09PSB2b2lkIDAgPyBbXSA6IF9yZWYkc2Vlbixcblx0ICAgICAgX3JlZiR0cnVuY2F0ZSA9IF9yZWYudHJ1bmNhdGUsXG5cdCAgICAgIHRydW5jYXRlID0gX3JlZiR0cnVuY2F0ZSA9PT0gdm9pZCAwID8gSW5maW5pdHkgOiBfcmVmJHRydW5jYXRlLFxuXHQgICAgICBfcmVmJHN0eWxpemUgPSBfcmVmLnN0eWxpemUsXG5cdCAgICAgIHN0eWxpemUgPSBfcmVmJHN0eWxpemUgPT09IHZvaWQgMCA/IFN0cmluZyA6IF9yZWYkc3R5bGl6ZTtcblxuXHQgIHZhciBvcHRpb25zID0ge1xuXHQgICAgc2hvd0hpZGRlbjogQm9vbGVhbihzaG93SGlkZGVuKSxcblx0ICAgIGRlcHRoOiBOdW1iZXIoZGVwdGgpLFxuXHQgICAgY29sb3JzOiBCb29sZWFuKGNvbG9ycyksXG5cdCAgICBjdXN0b21JbnNwZWN0OiBCb29sZWFuKGN1c3RvbUluc3BlY3QpLFxuXHQgICAgc2hvd1Byb3h5OiBCb29sZWFuKHNob3dQcm94eSksXG5cdCAgICBtYXhBcnJheUxlbmd0aDogTnVtYmVyKG1heEFycmF5TGVuZ3RoKSxcblx0ICAgIGJyZWFrTGVuZ3RoOiBOdW1iZXIoYnJlYWtMZW5ndGgpLFxuXHQgICAgdHJ1bmNhdGU6IE51bWJlcih0cnVuY2F0ZSksXG5cdCAgICBzZWVuOiBzZWVuLFxuXHQgICAgc3R5bGl6ZTogc3R5bGl6ZVxuXHQgIH07XG5cblx0ICBpZiAob3B0aW9ucy5jb2xvcnMpIHtcblx0ICAgIG9wdGlvbnMuc3R5bGl6ZSA9IGNvbG9yaXNlO1xuXHQgIH1cblxuXHQgIHJldHVybiBvcHRpb25zO1xuXHR9XG5cdGZ1bmN0aW9uIHRydW5jYXRlKHN0cmluZywgbGVuZ3RoKSB7XG5cdCAgdmFyIHRhaWwgPSBhcmd1bWVudHMubGVuZ3RoID4gMiAmJiBhcmd1bWVudHNbMl0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1syXSA6IHRydW5jYXRvcjtcblx0ICBzdHJpbmcgPSBTdHJpbmcoc3RyaW5nKTtcblx0ICB2YXIgdGFpbExlbmd0aCA9IHRhaWwubGVuZ3RoO1xuXHQgIHZhciBzdHJpbmdMZW5ndGggPSBzdHJpbmcubGVuZ3RoO1xuXG5cdCAgaWYgKHRhaWxMZW5ndGggPiBsZW5ndGggJiYgc3RyaW5nTGVuZ3RoID4gdGFpbExlbmd0aCkge1xuXHQgICAgcmV0dXJuIHRhaWw7XG5cdCAgfVxuXG5cdCAgaWYgKHN0cmluZ0xlbmd0aCA+IGxlbmd0aCAmJiBzdHJpbmdMZW5ndGggPiB0YWlsTGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gXCJcIi5jb25jYXQoc3RyaW5nLnNsaWNlKDAsIGxlbmd0aCAtIHRhaWxMZW5ndGgpKS5jb25jYXQodGFpbCk7XG5cdCAgfVxuXG5cdCAgcmV0dXJuIHN0cmluZztcblx0fSAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgY29tcGxleGl0eVxuXG5cdGZ1bmN0aW9uIGluc3BlY3RMaXN0KGxpc3QsIG9wdGlvbnMsIGluc3BlY3RJdGVtKSB7XG5cdCAgdmFyIHNlcGFyYXRvciA9IGFyZ3VtZW50cy5sZW5ndGggPiAzICYmIGFyZ3VtZW50c1szXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzNdIDogJywgJztcblx0ICBpbnNwZWN0SXRlbSA9IGluc3BlY3RJdGVtIHx8IG9wdGlvbnMuaW5zcGVjdDtcblx0ICB2YXIgc2l6ZSA9IGxpc3QubGVuZ3RoO1xuXHQgIGlmIChzaXplID09PSAwKSByZXR1cm4gJyc7XG5cdCAgdmFyIG9yaWdpbmFsTGVuZ3RoID0gb3B0aW9ucy50cnVuY2F0ZTtcblx0ICB2YXIgb3V0cHV0ID0gJyc7XG5cdCAgdmFyIHBlZWsgPSAnJztcblx0ICB2YXIgdHJ1bmNhdGVkID0gJyc7XG5cblx0ICBmb3IgKHZhciBpID0gMDsgaSA8IHNpemU7IGkgKz0gMSkge1xuXHQgICAgdmFyIGxhc3QgPSBpICsgMSA9PT0gbGlzdC5sZW5ndGg7XG5cdCAgICB2YXIgc2Vjb25kVG9MYXN0ID0gaSArIDIgPT09IGxpc3QubGVuZ3RoO1xuXHQgICAgdHJ1bmNhdGVkID0gXCJcIi5jb25jYXQodHJ1bmNhdG9yLCBcIihcIikuY29uY2F0KGxpc3QubGVuZ3RoIC0gaSwgXCIpXCIpO1xuXHQgICAgdmFyIHZhbHVlID0gbGlzdFtpXTsgLy8gSWYgdGhlcmUgaXMgbW9yZSB0aGFuIG9uZSByZW1haW5pbmcgd2UgbmVlZCB0byBhY2NvdW50IGZvciBhIHNlcGFyYXRvciBvZiBgLCBgXG5cblx0ICAgIG9wdGlvbnMudHJ1bmNhdGUgPSBvcmlnaW5hbExlbmd0aCAtIG91dHB1dC5sZW5ndGggLSAobGFzdCA/IDAgOiBzZXBhcmF0b3IubGVuZ3RoKTtcblx0ICAgIHZhciBzdHJpbmcgPSBwZWVrIHx8IGluc3BlY3RJdGVtKHZhbHVlLCBvcHRpb25zKSArIChsYXN0ID8gJycgOiBzZXBhcmF0b3IpO1xuXHQgICAgdmFyIG5leHRMZW5ndGggPSBvdXRwdXQubGVuZ3RoICsgc3RyaW5nLmxlbmd0aDtcblx0ICAgIHZhciB0cnVuY2F0ZWRMZW5ndGggPSBuZXh0TGVuZ3RoICsgdHJ1bmNhdGVkLmxlbmd0aDsgLy8gSWYgdGhpcyBpcyB0aGUgbGFzdCBlbGVtZW50LCBhbmQgYWRkaW5nIGl0IHdvdWxkXG5cdCAgICAvLyB0YWtlIHVzIG92ZXIgbGVuZ3RoLCBidXQgYWRkaW5nIHRoZSB0cnVuY2F0b3Igd291bGRuJ3QgLSB0aGVuIGJyZWFrIG5vd1xuXG5cdCAgICBpZiAobGFzdCAmJiBuZXh0TGVuZ3RoID4gb3JpZ2luYWxMZW5ndGggJiYgb3V0cHV0Lmxlbmd0aCArIHRydW5jYXRlZC5sZW5ndGggPD0gb3JpZ2luYWxMZW5ndGgpIHtcblx0ICAgICAgYnJlYWs7XG5cdCAgICB9IC8vIElmIHRoaXMgaXNuJ3QgdGhlIGxhc3Qgb3Igc2Vjb25kIHRvIGxhc3QgZWxlbWVudCB0byBzY2FuLFxuXHQgICAgLy8gYnV0IHRoZSBzdHJpbmcgaXMgYWxyZWFkeSBvdmVyIGxlbmd0aCB0aGVuIGJyZWFrIGhlcmVcblxuXG5cdCAgICBpZiAoIWxhc3QgJiYgIXNlY29uZFRvTGFzdCAmJiB0cnVuY2F0ZWRMZW5ndGggPiBvcmlnaW5hbExlbmd0aCkge1xuXHQgICAgICBicmVhaztcblx0ICAgIH0gLy8gUGVlayBhdCB0aGUgbmV4dCBzdHJpbmcgdG8gZGV0ZXJtaW5lIGlmIHdlIHNob3VsZFxuXHQgICAgLy8gYnJlYWsgZWFybHkgYmVmb3JlIGFkZGluZyB0aGlzIGl0ZW0gdG8gdGhlIG91dHB1dFxuXG5cblx0ICAgIHBlZWsgPSBsYXN0ID8gJycgOiBpbnNwZWN0SXRlbShsaXN0W2kgKyAxXSwgb3B0aW9ucykgKyAoc2Vjb25kVG9MYXN0ID8gJycgOiBzZXBhcmF0b3IpOyAvLyBJZiB3ZSBoYXZlIG9uZSBlbGVtZW50IGxlZnQsIGJ1dCB0aGlzIGVsZW1lbnQgYW5kXG5cdCAgICAvLyB0aGUgbmV4dCB0YWtlcyBvdmVyIGxlbmd0aCwgdGhlIGJyZWFrIGVhcmx5XG5cblx0ICAgIGlmICghbGFzdCAmJiBzZWNvbmRUb0xhc3QgJiYgdHJ1bmNhdGVkTGVuZ3RoID4gb3JpZ2luYWxMZW5ndGggJiYgbmV4dExlbmd0aCArIHBlZWsubGVuZ3RoID4gb3JpZ2luYWxMZW5ndGgpIHtcblx0ICAgICAgYnJlYWs7XG5cdCAgICB9XG5cblx0ICAgIG91dHB1dCArPSBzdHJpbmc7IC8vIElmIHRoZSBuZXh0IGVsZW1lbnQgdGFrZXMgdXMgdG8gbGVuZ3RoIC1cblx0ICAgIC8vIGJ1dCB0aGVyZSBhcmUgbW9yZSBhZnRlciB0aGF0LCB0aGVuIHdlIHNob3VsZCB0cnVuY2F0ZSBub3dcblxuXHQgICAgaWYgKCFsYXN0ICYmICFzZWNvbmRUb0xhc3QgJiYgbmV4dExlbmd0aCArIHBlZWsubGVuZ3RoID49IG9yaWdpbmFsTGVuZ3RoKSB7XG5cdCAgICAgIHRydW5jYXRlZCA9IFwiXCIuY29uY2F0KHRydW5jYXRvciwgXCIoXCIpLmNvbmNhdChsaXN0Lmxlbmd0aCAtIGkgLSAxLCBcIilcIik7XG5cdCAgICAgIGJyZWFrO1xuXHQgICAgfVxuXG5cdCAgICB0cnVuY2F0ZWQgPSAnJztcblx0ICB9XG5cblx0ICByZXR1cm4gXCJcIi5jb25jYXQob3V0cHV0KS5jb25jYXQodHJ1bmNhdGVkKTtcblx0fVxuXHRmdW5jdGlvbiBpbnNwZWN0UHJvcGVydHkoX3JlZjIsIG9wdGlvbnMpIHtcblx0ICB2YXIgX3JlZjMgPSBfc2xpY2VkVG9BcnJheShfcmVmMiwgMiksXG5cdCAgICAgIGtleSA9IF9yZWYzWzBdLFxuXHQgICAgICB2YWx1ZSA9IF9yZWYzWzFdO1xuXG5cdCAgb3B0aW9ucy50cnVuY2F0ZSAtPSAyO1xuXG5cdCAgaWYgKHR5cGVvZiBrZXkgIT09ICdzdHJpbmcnICYmIHR5cGVvZiBrZXkgIT09ICdudW1iZXInKSB7XG5cdCAgICBrZXkgPSBcIltcIi5jb25jYXQob3B0aW9ucy5pbnNwZWN0KGtleSwgb3B0aW9ucyksIFwiXVwiKTtcblx0ICB9XG5cblx0ICBvcHRpb25zLnRydW5jYXRlIC09IGtleS5sZW5ndGg7XG5cdCAgdmFsdWUgPSBvcHRpb25zLmluc3BlY3QodmFsdWUsIG9wdGlvbnMpO1xuXHQgIHJldHVybiBcIlwiLmNvbmNhdChrZXksIFwiOiBcIikuY29uY2F0KHZhbHVlKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGluc3BlY3RBcnJheShhcnJheSwgb3B0aW9ucykge1xuXHQgIC8vIE9iamVjdC5rZXlzIHdpbGwgYWx3YXlzIG91dHB1dCB0aGUgQXJyYXkgaW5kaWNlcyBmaXJzdCwgc28gd2UgY2FuIHNsaWNlIGJ5XG5cdCAgLy8gYGFycmF5Lmxlbmd0aGAgdG8gZ2V0IG5vbi1pbmRleCBwcm9wZXJ0aWVzXG5cdCAgdmFyIG5vbkluZGV4UHJvcGVydGllcyA9IE9iamVjdC5rZXlzKGFycmF5KS5zbGljZShhcnJheS5sZW5ndGgpO1xuXHQgIGlmICghYXJyYXkubGVuZ3RoICYmICFub25JbmRleFByb3BlcnRpZXMubGVuZ3RoKSByZXR1cm4gJ1tdJztcblx0ICBvcHRpb25zLnRydW5jYXRlIC09IDQ7XG5cdCAgdmFyIGxpc3RDb250ZW50cyA9IGluc3BlY3RMaXN0KGFycmF5LCBvcHRpb25zKTtcblx0ICBvcHRpb25zLnRydW5jYXRlIC09IGxpc3RDb250ZW50cy5sZW5ndGg7XG5cdCAgdmFyIHByb3BlcnR5Q29udGVudHMgPSAnJztcblxuXHQgIGlmIChub25JbmRleFByb3BlcnRpZXMubGVuZ3RoKSB7XG5cdCAgICBwcm9wZXJ0eUNvbnRlbnRzID0gaW5zcGVjdExpc3Qobm9uSW5kZXhQcm9wZXJ0aWVzLm1hcChmdW5jdGlvbiAoa2V5KSB7XG5cdCAgICAgIHJldHVybiBba2V5LCBhcnJheVtrZXldXTtcblx0ICAgIH0pLCBvcHRpb25zLCBpbnNwZWN0UHJvcGVydHkpO1xuXHQgIH1cblxuXHQgIHJldHVybiBcIlsgXCIuY29uY2F0KGxpc3RDb250ZW50cykuY29uY2F0KHByb3BlcnR5Q29udGVudHMgPyBcIiwgXCIuY29uY2F0KHByb3BlcnR5Q29udGVudHMpIDogJycsIFwiIF1cIik7XG5cdH1cblxuXHQvKiAhXG5cdCAqIENoYWkgLSBnZXRGdW5jTmFtZSB1dGlsaXR5XG5cdCAqIENvcHlyaWdodChjKSAyMDEyLTIwMTYgSmFrZSBMdWVyIDxqYWtlQGFsb2dpY2FscGFyYWRveC5jb20+XG5cdCAqIE1JVCBMaWNlbnNlZFxuXHQgKi9cblxuXHQvKipcblx0ICogIyMjIC5nZXRGdW5jTmFtZShjb25zdHJ1Y3RvckZuKVxuXHQgKlxuXHQgKiBSZXR1cm5zIHRoZSBuYW1lIG9mIGEgZnVuY3Rpb24uXG5cdCAqIFdoZW4gYSBub24tZnVuY3Rpb24gaW5zdGFuY2UgaXMgcGFzc2VkLCByZXR1cm5zIGBudWxsYC5cblx0ICogVGhpcyBhbHNvIGluY2x1ZGVzIGEgcG9seWZpbGwgZnVuY3Rpb24gaWYgYGFGdW5jLm5hbWVgIGlzIG5vdCBkZWZpbmVkLlxuXHQgKlxuXHQgKiBAbmFtZSBnZXRGdW5jTmFtZVxuXHQgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jdFxuXHQgKiBAbmFtZXNwYWNlIFV0aWxzXG5cdCAqIEBhcGkgcHVibGljXG5cdCAqL1xuXG5cdHZhciB0b1N0cmluZyA9IEZ1bmN0aW9uLnByb3RvdHlwZS50b1N0cmluZztcblx0dmFyIGZ1bmN0aW9uTmFtZU1hdGNoID0gL1xccypmdW5jdGlvbig/Olxcc3xcXHMqXFwvXFwqW14oPzoqXFwvKV0rXFwqXFwvXFxzKikqKFteXFxzXFwoXFwvXSspLztcblx0ZnVuY3Rpb24gZ2V0RnVuY05hbWUoYUZ1bmMpIHtcblx0ICBpZiAodHlwZW9mIGFGdW5jICE9PSAnZnVuY3Rpb24nKSB7XG5cdCAgICByZXR1cm4gbnVsbDtcblx0ICB9XG5cblx0ICB2YXIgbmFtZSA9ICcnO1xuXHQgIGlmICh0eXBlb2YgRnVuY3Rpb24ucHJvdG90eXBlLm5hbWUgPT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBhRnVuYy5uYW1lID09PSAndW5kZWZpbmVkJykge1xuXHQgICAgLy8gSGVyZSB3ZSBydW4gYSBwb2x5ZmlsbCBpZiBGdW5jdGlvbiBkb2VzIG5vdCBzdXBwb3J0IHRoZSBgbmFtZWAgcHJvcGVydHkgYW5kIGlmIGFGdW5jLm5hbWUgaXMgbm90IGRlZmluZWRcblx0ICAgIHZhciBtYXRjaCA9IHRvU3RyaW5nLmNhbGwoYUZ1bmMpLm1hdGNoKGZ1bmN0aW9uTmFtZU1hdGNoKTtcblx0ICAgIGlmIChtYXRjaCkge1xuXHQgICAgICBuYW1lID0gbWF0Y2hbMV07XG5cdCAgICB9XG5cdCAgfSBlbHNlIHtcblx0ICAgIC8vIElmIHdlJ3ZlIGdvdCBhIGBuYW1lYCBwcm9wZXJ0eSB3ZSBqdXN0IHVzZSBpdFxuXHQgICAgbmFtZSA9IGFGdW5jLm5hbWU7XG5cdCAgfVxuXG5cdCAgcmV0dXJuIG5hbWU7XG5cdH1cblxuXHR2YXIgZ2V0RnVuY05hbWVfMSA9IGdldEZ1bmNOYW1lO1xuXG5cdHZhciBnZXRBcnJheU5hbWUgPSBmdW5jdGlvbiBnZXRBcnJheU5hbWUoYXJyYXkpIHtcblx0ICAvLyBXZSBuZWVkIHRvIHNwZWNpYWwgY2FzZSBOb2RlLmpzJyBCdWZmZXJzLCB3aGljaCByZXBvcnQgdG8gYmUgVWludDhBcnJheVxuXHQgIGlmICh0eXBlb2YgQnVmZmVyID09PSAnZnVuY3Rpb24nICYmIGFycmF5IGluc3RhbmNlb2YgQnVmZmVyKSB7XG5cdCAgICByZXR1cm4gJ0J1ZmZlcic7XG5cdCAgfVxuXG5cdCAgaWYgKGFycmF5W1N5bWJvbC50b1N0cmluZ1RhZ10pIHtcblx0ICAgIHJldHVybiBhcnJheVtTeW1ib2wudG9TdHJpbmdUYWddO1xuXHQgIH1cblxuXHQgIHJldHVybiBnZXRGdW5jTmFtZV8xKGFycmF5LmNvbnN0cnVjdG9yKTtcblx0fTtcblxuXHRmdW5jdGlvbiBpbnNwZWN0VHlwZWRBcnJheShhcnJheSwgb3B0aW9ucykge1xuXHQgIHZhciBuYW1lID0gZ2V0QXJyYXlOYW1lKGFycmF5KTtcblx0ICBvcHRpb25zLnRydW5jYXRlIC09IG5hbWUubGVuZ3RoICsgNDsgLy8gT2JqZWN0LmtleXMgd2lsbCBhbHdheXMgb3V0cHV0IHRoZSBBcnJheSBpbmRpY2VzIGZpcnN0LCBzbyB3ZSBjYW4gc2xpY2UgYnlcblx0ICAvLyBgYXJyYXkubGVuZ3RoYCB0byBnZXQgbm9uLWluZGV4IHByb3BlcnRpZXNcblxuXHQgIHZhciBub25JbmRleFByb3BlcnRpZXMgPSBPYmplY3Qua2V5cyhhcnJheSkuc2xpY2UoYXJyYXkubGVuZ3RoKTtcblx0ICBpZiAoIWFycmF5Lmxlbmd0aCAmJiAhbm9uSW5kZXhQcm9wZXJ0aWVzLmxlbmd0aCkgcmV0dXJuIFwiXCIuY29uY2F0KG5hbWUsIFwiW11cIik7IC8vIEFzIHdlIGtub3cgVHlwZWRBcnJheXMgb25seSBjb250YWluIFVuc2lnbmVkIEludGVnZXJzLCB3ZSBjYW4gc2tpcCBpbnNwZWN0aW5nIGVhY2ggb25lIGFuZCBzaW1wbHlcblx0ICAvLyBzdHlsaXNlIHRoZSB0b1N0cmluZygpIHZhbHVlIG9mIHRoZW1cblxuXHQgIHZhciBvdXRwdXQgPSAnJztcblxuXHQgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcblx0ICAgIHZhciBzdHJpbmcgPSBcIlwiLmNvbmNhdChvcHRpb25zLnN0eWxpemUodHJ1bmNhdGUoYXJyYXlbaV0sIG9wdGlvbnMudHJ1bmNhdGUpLCAnbnVtYmVyJykpLmNvbmNhdChpID09PSBhcnJheS5sZW5ndGggLSAxID8gJycgOiAnLCAnKTtcblx0ICAgIG9wdGlvbnMudHJ1bmNhdGUgLT0gc3RyaW5nLmxlbmd0aDtcblxuXHQgICAgaWYgKGFycmF5W2ldICE9PSBhcnJheS5sZW5ndGggJiYgb3B0aW9ucy50cnVuY2F0ZSA8PSAzKSB7XG5cdCAgICAgIG91dHB1dCArPSBcIlwiLmNvbmNhdCh0cnVuY2F0b3IsIFwiKFwiKS5jb25jYXQoYXJyYXkubGVuZ3RoIC0gYXJyYXlbaV0gKyAxLCBcIilcIik7XG5cdCAgICAgIGJyZWFrO1xuXHQgICAgfVxuXG5cdCAgICBvdXRwdXQgKz0gc3RyaW5nO1xuXHQgIH1cblxuXHQgIHZhciBwcm9wZXJ0eUNvbnRlbnRzID0gJyc7XG5cblx0ICBpZiAobm9uSW5kZXhQcm9wZXJ0aWVzLmxlbmd0aCkge1xuXHQgICAgcHJvcGVydHlDb250ZW50cyA9IGluc3BlY3RMaXN0KG5vbkluZGV4UHJvcGVydGllcy5tYXAoZnVuY3Rpb24gKGtleSkge1xuXHQgICAgICByZXR1cm4gW2tleSwgYXJyYXlba2V5XV07XG5cdCAgICB9KSwgb3B0aW9ucywgaW5zcGVjdFByb3BlcnR5KTtcblx0ICB9XG5cblx0ICByZXR1cm4gXCJcIi5jb25jYXQobmFtZSwgXCJbIFwiKS5jb25jYXQob3V0cHV0KS5jb25jYXQocHJvcGVydHlDb250ZW50cyA/IFwiLCBcIi5jb25jYXQocHJvcGVydHlDb250ZW50cykgOiAnJywgXCIgXVwiKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGluc3BlY3REYXRlKGRhdGVPYmplY3QsIG9wdGlvbnMpIHtcblx0ICAvLyBJZiB3ZSBuZWVkIHRvIC0gdHJ1bmNhdGUgdGhlIHRpbWUgcG9ydGlvbiwgYnV0IG5ldmVyIHRoZSBkYXRlXG5cdCAgdmFyIHNwbGl0ID0gZGF0ZU9iamVjdC50b0pTT04oKS5zcGxpdCgnVCcpO1xuXHQgIHZhciBkYXRlID0gc3BsaXRbMF07XG5cdCAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZShcIlwiLmNvbmNhdChkYXRlLCBcIlRcIikuY29uY2F0KHRydW5jYXRlKHNwbGl0WzFdLCBvcHRpb25zLnRydW5jYXRlIC0gZGF0ZS5sZW5ndGggLSAxKSksICdkYXRlJyk7XG5cdH1cblxuXHR2YXIgdG9TdHJpbmckMSA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cblx0dmFyIGdldEZ1bmN0aW9uTmFtZSA9IGZ1bmN0aW9uKGZuKSB7XG5cdCAgaWYgKHRvU3RyaW5nJDEuY2FsbChmbikgIT09ICdbb2JqZWN0IEZ1bmN0aW9uXScpIHJldHVybiBudWxsXG5cdCAgaWYgKGZuLm5hbWUpIHJldHVybiBmbi5uYW1lXG5cdCAgdHJ5IHtcblx0XHQgIHZhciBuYW1lID0gL15cXHMqZnVuY3Rpb25cXHMqKFteXFwoXSopL2ltLmV4ZWMoZm4udG9TdHJpbmcoKSlbMV07XG5cdCAgfSBjYXRjaCAoIGUgKSB7IHJldHVybiAnYW5vbnltb3VzJyB9O1xuXHQgIHJldHVybiBuYW1lIHx8ICdhbm9ueW1vdXMnXG5cdH07XG5cblx0ZnVuY3Rpb24gaW5zcGVjdEZ1bmN0aW9uKGZ1bmMsIG9wdGlvbnMpIHtcblx0ICB2YXIgbmFtZSA9IGdldEZ1bmN0aW9uTmFtZShmdW5jKTtcblxuXHQgIGlmIChuYW1lID09PSAnYW5vbnltb3VzJykge1xuXHQgICAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZSgnW0Z1bmN0aW9uXScsICdzcGVjaWFsJyk7XG5cdCAgfVxuXG5cdCAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZShcIltGdW5jdGlvbiBcIi5jb25jYXQodHJ1bmNhdGUobmFtZSwgb3B0aW9ucy50cnVuY2F0ZSAtIDExKSwgXCJdXCIpLCAnc3BlY2lhbCcpO1xuXHR9XG5cblx0ZnVuY3Rpb24gaW5zcGVjdE1hcEVudHJ5KF9yZWYsIG9wdGlvbnMpIHtcblx0ICB2YXIgX3JlZjIgPSBfc2xpY2VkVG9BcnJheShfcmVmLCAyKSxcblx0ICAgICAga2V5ID0gX3JlZjJbMF0sXG5cdCAgICAgIHZhbHVlID0gX3JlZjJbMV07XG5cblx0ICBvcHRpb25zLnRydW5jYXRlIC09IDQ7XG5cdCAga2V5ID0gb3B0aW9ucy5pbnNwZWN0KGtleSwgb3B0aW9ucyk7XG5cdCAgb3B0aW9ucy50cnVuY2F0ZSAtPSBrZXkubGVuZ3RoO1xuXHQgIHZhbHVlID0gb3B0aW9ucy5pbnNwZWN0KHZhbHVlLCBvcHRpb25zKTtcblx0ICByZXR1cm4gXCJcIi5jb25jYXQoa2V5LCBcIiA9PiBcIikuY29uY2F0KHZhbHVlKTtcblx0fSAvLyBJRTExIGRvZXNuJ3Qgc3VwcG9ydCBgbWFwLmVudHJpZXMoKWBcblxuXG5cdGZ1bmN0aW9uIG1hcFRvRW50cmllcyhtYXApIHtcblx0ICB2YXIgZW50cmllcyA9IFtdO1xuXHQgIG1hcC5mb3JFYWNoKGZ1bmN0aW9uICh2YWx1ZSwga2V5KSB7XG5cdCAgICBlbnRyaWVzLnB1c2goW2tleSwgdmFsdWVdKTtcblx0ICB9KTtcblx0ICByZXR1cm4gZW50cmllcztcblx0fVxuXG5cdGZ1bmN0aW9uIGluc3BlY3RNYXAobWFwLCBvcHRpb25zKSB7XG5cdCAgdmFyIHNpemUgPSBtYXAuc2l6ZSAtIDE7XG5cblx0ICBpZiAoc2l6ZSA8PSAwKSB7XG5cdCAgICByZXR1cm4gJ01hcHt9Jztcblx0ICB9XG5cblx0ICBvcHRpb25zLnRydW5jYXRlIC09IDc7XG5cdCAgcmV0dXJuIFwiTWFweyBcIi5jb25jYXQoaW5zcGVjdExpc3QobWFwVG9FbnRyaWVzKG1hcCksIG9wdGlvbnMsIGluc3BlY3RNYXBFbnRyeSksIFwiIH1cIik7XG5cdH1cblxuXHR2YXIgaXNOYU4gPSBOdW1iZXIuaXNOYU4gfHwgZnVuY3Rpb24gKGkpIHtcblx0ICByZXR1cm4gaSAhPT0gaTtcblx0fTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1zZWxmLWNvbXBhcmVcblxuXG5cdGZ1bmN0aW9uIGluc3BlY3ROdW1iZXIobnVtYmVyLCBvcHRpb25zKSB7XG5cdCAgaWYgKGlzTmFOKG51bWJlcikpIHtcblx0ICAgIHJldHVybiBvcHRpb25zLnN0eWxpemUoJ05hTicsICdudW1iZXInKTtcblx0ICB9XG5cblx0ICBpZiAobnVtYmVyID09PSBJbmZpbml0eSkge1xuXHQgICAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZSgnSW5maW5pdHknLCAnbnVtYmVyJyk7XG5cdCAgfVxuXG5cdCAgaWYgKG51bWJlciA9PT0gLUluZmluaXR5KSB7XG5cdCAgICByZXR1cm4gb3B0aW9ucy5zdHlsaXplKCctSW5maW5pdHknLCAnbnVtYmVyJyk7XG5cdCAgfVxuXG5cdCAgaWYgKG51bWJlciA9PT0gMCkge1xuXHQgICAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZSgxIC8gbnVtYmVyID09PSBJbmZpbml0eSA/ICcrMCcgOiAnLTAnLCAnbnVtYmVyJyk7XG5cdCAgfVxuXG5cdCAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZSh0cnVuY2F0ZShudW1iZXIsIG9wdGlvbnMudHJ1bmNhdGUpLCAnbnVtYmVyJyk7XG5cdH1cblxuXHRmdW5jdGlvbiBpbnNwZWN0UmVnRXhwKHZhbHVlLCBvcHRpb25zKSB7XG5cdCAgdmFyIGZsYWdzID0gdmFsdWUudG9TdHJpbmcoKS5zcGxpdCgnLycpWzJdO1xuXHQgIHZhciBzb3VyY2VMZW5ndGggPSBvcHRpb25zLnRydW5jYXRlIC0gKDIgKyBmbGFncy5sZW5ndGgpO1xuXHQgIHZhciBzb3VyY2UgPSB2YWx1ZS5zb3VyY2U7XG5cdCAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZShcIi9cIi5jb25jYXQodHJ1bmNhdGUoc291cmNlLCBzb3VyY2VMZW5ndGgpLCBcIi9cIikuY29uY2F0KGZsYWdzKSwgJ3JlZ2V4cCcpO1xuXHR9XG5cblx0ZnVuY3Rpb24gYXJyYXlGcm9tU2V0KHNldCkge1xuXHQgIHZhciB2YWx1ZXMgPSBbXTtcblx0ICBzZXQuZm9yRWFjaChmdW5jdGlvbiAodmFsdWUpIHtcblx0ICAgIHZhbHVlcy5wdXNoKHZhbHVlKTtcblx0ICB9KTtcblx0ICByZXR1cm4gdmFsdWVzO1xuXHR9XG5cblx0ZnVuY3Rpb24gaW5zcGVjdFNldChzZXQsIG9wdGlvbnMpIHtcblx0ICBpZiAoc2V0LnNpemUgPT09IDApIHJldHVybiAnU2V0e30nO1xuXHQgIG9wdGlvbnMudHJ1bmNhdGUgLT0gNztcblx0ICByZXR1cm4gXCJTZXR7IFwiLmNvbmNhdChpbnNwZWN0TGlzdChhcnJheUZyb21TZXQoc2V0KSwgb3B0aW9ucyksIFwiIH1cIik7XG5cdH1cblxuXHR2YXIgc3RyaW5nRXNjYXBlQ2hhcnMgPSBuZXcgUmVnRXhwKFwiWydcXFxcdTAwMDAtXFxcXHUwMDFmXFxcXHUwMDdmLVxcXFx1MDA5ZlxcXFx1MDBhZFxcXFx1MDYwMC1cXFxcdTA2MDRcXFxcdTA3MGZcXFxcdTE3YjRcXFxcdTE3YjVcIiArIFwiXFxcXHUyMDBjLVxcXFx1MjAwZlxcXFx1MjAyOC1cXFxcdTIwMmZcXFxcdTIwNjAtXFxcXHUyMDZmXFxcXHVmZWZmXFxcXHVmZmYwLVxcXFx1ZmZmZl1cIiwgJ2cnKTtcblx0dmFyIGVzY2FwZUNoYXJhY3RlcnMgPSB7XG5cdCAgJ1xcYic6ICdcXFxcYicsXG5cdCAgJ1xcdCc6ICdcXFxcdCcsXG5cdCAgJ1xcbic6ICdcXFxcbicsXG5cdCAgJ1xcZic6ICdcXFxcZicsXG5cdCAgJ1xccic6ICdcXFxccicsXG5cdCAgXCInXCI6IFwiXFxcXCdcIixcblx0ICAnXFxcXCc6ICdcXFxcXFxcXCdcblx0fTtcblx0dmFyIGhleCA9IDE2O1xuXHR2YXIgdW5pY29kZUxlbmd0aCA9IDQ7XG5cblx0ZnVuY3Rpb24gZXNjYXBlKGNoYXIpIHtcblx0ICByZXR1cm4gZXNjYXBlQ2hhcmFjdGVyc1tjaGFyXSB8fCBcIlxcXFx1XCIuY29uY2F0KFwiMDAwMFwiLmNvbmNhdChjaGFyLmNoYXJDb2RlQXQoMCkudG9TdHJpbmcoaGV4KSkuc2xpY2UoLXVuaWNvZGVMZW5ndGgpKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGluc3BlY3RTdHJpbmcoc3RyaW5nLCBvcHRpb25zKSB7XG5cdCAgaWYgKHN0cmluZ0VzY2FwZUNoYXJzLnRlc3Qoc3RyaW5nKSkge1xuXHQgICAgc3RyaW5nID0gc3RyaW5nLnJlcGxhY2Uoc3RyaW5nRXNjYXBlQ2hhcnMsIGVzY2FwZSk7XG5cdCAgfVxuXG5cdCAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZShcIidcIi5jb25jYXQodHJ1bmNhdGUoc3RyaW5nLCBvcHRpb25zLnRydW5jYXRlIC0gMiksIFwiJ1wiKSwgJ3N0cmluZycpO1xuXHR9XG5cblx0ZnVuY3Rpb24gaW5zcGVjdFN5bWJvbCh2YWx1ZSkge1xuXHQgIGlmICgnZGVzY3JpcHRpb24nIGluIFN5bWJvbC5wcm90b3R5cGUpIHtcblx0ICAgIHJldHVybiB2YWx1ZS5kZXNjcmlwdGlvbiA/IFwiU3ltYm9sKFwiLmNvbmNhdCh2YWx1ZS5kZXNjcmlwdGlvbiwgXCIpXCIpIDogJ1N5bWJvbCgpJztcblx0ICB9XG5cblx0ICByZXR1cm4gdmFsdWUudG9TdHJpbmcoKTtcblx0fVxuXG5cdHZhciBnZXRQcm9taXNlVmFsdWUgPSBmdW5jdGlvbiBnZXRQcm9taXNlVmFsdWUoKSB7XG5cdCAgcmV0dXJuICdQcm9taXNle+KApn0nO1xuXHR9O1xuXG5cdC8vIHRyeSB7XG5cdC8vICAgdmFyIF9wcm9jZXNzJGJpbmRpbmcgPSBwcm9jZXNzLmJpbmRpbmcoJ3V0aWwnKSxcblx0Ly8gICAgICAgZ2V0UHJvbWlzZURldGFpbHMgPSBfcHJvY2VzcyRiaW5kaW5nLmdldFByb21pc2VEZXRhaWxzLFxuXHQvLyAgICAgICBrUGVuZGluZyA9IF9wcm9jZXNzJGJpbmRpbmcua1BlbmRpbmcsXG5cdC8vICAgICAgIGtSZWplY3RlZCA9IF9wcm9jZXNzJGJpbmRpbmcua1JlamVjdGVkO1xuXG5cdC8vICAgZ2V0UHJvbWlzZVZhbHVlID0gZnVuY3Rpb24gZ2V0UHJvbWlzZVZhbHVlKHZhbHVlLCBvcHRpb25zKSB7XG5cdC8vICAgICB2YXIgX2dldFByb21pc2VEZXRhaWxzID0gZ2V0UHJvbWlzZURldGFpbHModmFsdWUpLFxuXHQvLyAgICAgICAgIF9nZXRQcm9taXNlRGV0YWlsczIgPSBfc2xpY2VkVG9BcnJheShfZ2V0UHJvbWlzZURldGFpbHMsIDIpLFxuXHQvLyAgICAgICAgIHN0YXRlID0gX2dldFByb21pc2VEZXRhaWxzMlswXSxcblx0Ly8gICAgICAgICBpbm5lclZhbHVlID0gX2dldFByb21pc2VEZXRhaWxzMlsxXTtcblxuXHQvLyAgICAgaWYgKHN0YXRlID09PSBrUGVuZGluZykge1xuXHQvLyAgICAgICByZXR1cm4gJ1Byb21pc2V7PHBlbmRpbmc+fSc7XG5cdC8vICAgICB9XG5cblx0Ly8gICAgIHJldHVybiBcIlByb21pc2VcIi5jb25jYXQoc3RhdGUgPT09IGtSZWplY3RlZCA/ICchJyA6ICcnLCBcIntcIikuY29uY2F0KG9wdGlvbnMuaW5zcGVjdChpbm5lclZhbHVlLCBvcHRpb25zKSwgXCJ9XCIpO1xuXHQvLyAgIH07XG5cdC8vIH0gY2F0Y2ggKG5vdE5vZGUpIHtcblx0Ly8gICAvKiBpZ25vcmUgKi9cblx0Ly8gfVxuXG5cdHZhciBpbnNwZWN0UHJvbWlzZSA9IGdldFByb21pc2VWYWx1ZTtcblxuXHRmdW5jdGlvbiBpbnNwZWN0T2JqZWN0KG9iamVjdCwgb3B0aW9ucykge1xuXHQgIHZhciBwcm9wZXJ0aWVzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob2JqZWN0KTtcblx0ICB2YXIgc3ltYm9scyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPyBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKG9iamVjdCkgOiBbXTtcblxuXHQgIGlmIChwcm9wZXJ0aWVzLmxlbmd0aCA9PT0gMCAmJiBzeW1ib2xzLmxlbmd0aCA9PT0gMCkge1xuXHQgICAgcmV0dXJuICd7fSc7XG5cdCAgfVxuXG5cdCAgb3B0aW9ucy50cnVuY2F0ZSAtPSA0O1xuXHQgIHZhciBwcm9wZXJ0eUNvbnRlbnRzID0gaW5zcGVjdExpc3QocHJvcGVydGllcy5tYXAoZnVuY3Rpb24gKGtleSkge1xuXHQgICAgcmV0dXJuIFtrZXksIG9iamVjdFtrZXldXTtcblx0ICB9KSwgb3B0aW9ucywgaW5zcGVjdFByb3BlcnR5KTtcblx0ICB2YXIgc3ltYm9sQ29udGVudHMgPSBpbnNwZWN0TGlzdChzeW1ib2xzLm1hcChmdW5jdGlvbiAoa2V5KSB7XG5cdCAgICByZXR1cm4gW2tleSwgb2JqZWN0W2tleV1dO1xuXHQgIH0pLCBvcHRpb25zLCBpbnNwZWN0UHJvcGVydHkpO1xuXHQgIHZhciBzZXAgPSAnJztcblxuXHQgIGlmIChwcm9wZXJ0eUNvbnRlbnRzICYmIHN5bWJvbENvbnRlbnRzKSB7XG5cdCAgICBzZXAgPSAnLCAnO1xuXHQgIH1cblxuXHQgIHJldHVybiBcInsgXCIuY29uY2F0KHByb3BlcnR5Q29udGVudHMpLmNvbmNhdChzZXApLmNvbmNhdChzeW1ib2xDb250ZW50cywgXCIgfVwiKTtcblx0fVxuXG5cdHZhciB0b1N0cmluZ1RhZyA9IHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZyA/IFN5bWJvbC50b1N0cmluZ1RhZyA6IGZhbHNlO1xuXHRmdW5jdGlvbiBpbnNwZWN0Q2xhc3ModmFsdWUsIG9wdGlvbnMpIHtcblx0ICB2YXIgbmFtZSA9ICcnO1xuXG5cdCAgaWYgKHRvU3RyaW5nVGFnICYmIHRvU3RyaW5nVGFnIGluIHZhbHVlKSB7XG5cdCAgICBuYW1lID0gdmFsdWVbdG9TdHJpbmdUYWddO1xuXHQgIH1cblxuXHQgIG5hbWUgPSBuYW1lIHx8IGdldEZ1bmNOYW1lXzEodmFsdWUuY29uc3RydWN0b3IpOyAvLyBCYWJlbCB0cmFuc2Zvcm1zIGFub255bW91cyBjbGFzc2VzIHRvIHRoZSBuYW1lIGBfY2xhc3NgXG5cblx0ICBpZiAoIW5hbWUgfHwgbmFtZSA9PT0gJ19jbGFzcycpIHtcblx0ICAgIG5hbWUgPSAnPEFub255bW91cyBDbGFzcz4nO1xuXHQgIH1cblxuXHQgIG9wdGlvbnMudHJ1bmNhdGUgLT0gbmFtZS5sZW5ndGg7XG5cdCAgcmV0dXJuIFwiXCIuY29uY2F0KG5hbWUpLmNvbmNhdChpbnNwZWN0T2JqZWN0KHZhbHVlLCBvcHRpb25zKSk7XG5cdH1cblxuXHRmdW5jdGlvbiBpbnNwZWN0QXJndW1lbnRzKGFyZ3MsIG9wdGlvbnMpIHtcblx0ICBpZiAoYXJncy5sZW5ndGggPT09IDApIHJldHVybiAnQXJndW1lbnRzW10nO1xuXHQgIG9wdGlvbnMudHJ1bmNhdGUgLT0gMTM7XG5cdCAgcmV0dXJuIFwiQXJndW1lbnRzWyBcIi5jb25jYXQoaW5zcGVjdExpc3QoYXJncywgb3B0aW9ucyksIFwiIF1cIik7XG5cdH1cblxuXHR2YXIgZXJyb3JLZXlzID0gWydzdGFjaycsICdsaW5lJywgJ2NvbHVtbicsICduYW1lJywgJ21lc3NhZ2UnLCAnZmlsZU5hbWUnLCAnbGluZU51bWJlcicsICdjb2x1bW5OdW1iZXInLCAnbnVtYmVyJywgJ2Rlc2NyaXB0aW9uJ107XG5cdGZ1bmN0aW9uIGluc3BlY3RPYmplY3QkMShlcnJvciwgb3B0aW9ucykge1xuXHQgIHZhciBwcm9wZXJ0aWVzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoZXJyb3IpLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XG5cdCAgICByZXR1cm4gZXJyb3JLZXlzLmluZGV4T2Yoa2V5KSA9PT0gLTE7XG5cdCAgfSk7XG5cdCAgdmFyIG5hbWUgPSBlcnJvci5uYW1lO1xuXHQgIG9wdGlvbnMudHJ1bmNhdGUgLT0gbmFtZS5sZW5ndGg7XG5cdCAgdmFyIG1lc3NhZ2UgPSAnJztcblxuXHQgIGlmICh0eXBlb2YgZXJyb3IubWVzc2FnZSA9PT0gJ3N0cmluZycpIHtcblx0ICAgIG1lc3NhZ2UgPSB0cnVuY2F0ZShlcnJvci5tZXNzYWdlLCBvcHRpb25zLnRydW5jYXRlKTtcblx0ICB9IGVsc2Uge1xuXHQgICAgcHJvcGVydGllcy51bnNoaWZ0KCdtZXNzYWdlJyk7XG5cdCAgfVxuXG5cdCAgbWVzc2FnZSA9IG1lc3NhZ2UgPyBcIjogXCIuY29uY2F0KG1lc3NhZ2UpIDogJyc7XG5cdCAgb3B0aW9ucy50cnVuY2F0ZSAtPSBtZXNzYWdlLmxlbmd0aCArIDU7XG5cdCAgdmFyIHByb3BlcnR5Q29udGVudHMgPSBpbnNwZWN0TGlzdChwcm9wZXJ0aWVzLm1hcChmdW5jdGlvbiAoa2V5KSB7XG5cdCAgICByZXR1cm4gW2tleSwgZXJyb3Jba2V5XV07XG5cdCAgfSksIG9wdGlvbnMsIGluc3BlY3RQcm9wZXJ0eSk7XG5cdCAgcmV0dXJuIFwiXCIuY29uY2F0KG5hbWUpLmNvbmNhdChtZXNzYWdlKS5jb25jYXQocHJvcGVydHlDb250ZW50cyA/IFwiIHsgXCIuY29uY2F0KHByb3BlcnR5Q29udGVudHMsIFwiIH1cIikgOiAnJyk7XG5cdH1cblxuXHRmdW5jdGlvbiBpbnNwZWN0QXR0cmlidXRlKF9yZWYsIG9wdGlvbnMpIHtcblx0ICB2YXIgX3JlZjIgPSBfc2xpY2VkVG9BcnJheShfcmVmLCAyKSxcblx0ICAgICAga2V5ID0gX3JlZjJbMF0sXG5cdCAgICAgIHZhbHVlID0gX3JlZjJbMV07XG5cblx0ICBvcHRpb25zLnRydW5jYXRlIC09IDM7XG5cblx0ICBpZiAoIXZhbHVlKSB7XG5cdCAgICByZXR1cm4gXCJcIi5jb25jYXQob3B0aW9ucy5zdHlsaXplKGtleSwgJ3llbGxvdycpKTtcblx0ICB9XG5cblx0ICByZXR1cm4gXCJcIi5jb25jYXQob3B0aW9ucy5zdHlsaXplKGtleSwgJ3llbGxvdycpLCBcIj1cIikuY29uY2F0KG9wdGlvbnMuc3R5bGl6ZShcIlxcXCJcIi5jb25jYXQodmFsdWUsIFwiXFxcIlwiKSwgJ3N0cmluZycpKTtcblx0fVxuXHRmdW5jdGlvbiBpbnNwZWN0SFRNTENvbGxlY3Rpb24oY29sbGVjdGlvbiwgb3B0aW9ucykge1xuXHQgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby11c2UtYmVmb3JlLWRlZmluZVxuXHQgIHJldHVybiBpbnNwZWN0TGlzdChjb2xsZWN0aW9uLCBvcHRpb25zLCBpbnNwZWN0SFRNTCwgJ1xcbicpO1xuXHR9XG5cdGZ1bmN0aW9uIGluc3BlY3RIVE1MKGVsZW1lbnQsIG9wdGlvbnMpIHtcblx0ICB2YXIgcHJvcGVydGllcyA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlTmFtZXMoKTtcblx0ICB2YXIgbmFtZSA9IGVsZW1lbnQudGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xuXHQgIHZhciBoZWFkID0gb3B0aW9ucy5zdHlsaXplKFwiPFwiLmNvbmNhdChuYW1lKSwgJ3NwZWNpYWwnKTtcblx0ICB2YXIgaGVhZENsb3NlID0gb3B0aW9ucy5zdHlsaXplKFwiPlwiLCAnc3BlY2lhbCcpO1xuXHQgIHZhciB0YWlsID0gb3B0aW9ucy5zdHlsaXplKFwiPC9cIi5jb25jYXQobmFtZSwgXCI+XCIpLCAnc3BlY2lhbCcpO1xuXHQgIG9wdGlvbnMudHJ1bmNhdGUgLT0gbmFtZS5sZW5ndGggKiAyICsgNTtcblx0ICB2YXIgcHJvcGVydHlDb250ZW50cyA9ICcnO1xuXG5cdCAgaWYgKHByb3BlcnRpZXMubGVuZ3RoID4gMCkge1xuXHQgICAgcHJvcGVydHlDb250ZW50cyArPSAnICc7XG5cdCAgICBwcm9wZXJ0eUNvbnRlbnRzICs9IGluc3BlY3RMaXN0KHByb3BlcnRpZXMubWFwKGZ1bmN0aW9uIChrZXkpIHtcblx0ICAgICAgcmV0dXJuIFtrZXksIGVsZW1lbnQuZ2V0QXR0cmlidXRlKGtleSldO1xuXHQgICAgfSksIG9wdGlvbnMsIGluc3BlY3RBdHRyaWJ1dGUsICcgJyk7XG5cdCAgfVxuXG5cdCAgb3B0aW9ucy50cnVuY2F0ZSAtPSBwcm9wZXJ0eUNvbnRlbnRzLmxlbmd0aDtcblx0ICB2YXIgdHJ1bmNhdGUgPSBvcHRpb25zLnRydW5jYXRlO1xuXHQgIHZhciBjaGlsZHJlbiA9IGluc3BlY3RIVE1MQ29sbGVjdGlvbihlbGVtZW50LmNoaWxkcmVuLCBvcHRpb25zKTtcblxuXHQgIGlmIChjaGlsZHJlbiAmJiBjaGlsZHJlbi5sZW5ndGggPiB0cnVuY2F0ZSkge1xuXHQgICAgY2hpbGRyZW4gPSBcIlwiLmNvbmNhdCh0cnVuY2F0b3IsIFwiKFwiKS5jb25jYXQoZWxlbWVudC5jaGlsZHJlbi5sZW5ndGgsIFwiKVwiKTtcblx0ICB9XG5cblx0ICByZXR1cm4gXCJcIi5jb25jYXQoaGVhZCkuY29uY2F0KHByb3BlcnR5Q29udGVudHMpLmNvbmNhdChoZWFkQ2xvc2UpLmNvbmNhdChjaGlsZHJlbikuY29uY2F0KHRhaWwpO1xuXHR9XG5cblx0LyogIVxuXHQgKiBsb3VwZVxuXHQgKiBDb3B5cmlnaHQoYykgMjAxMyBKYWtlIEx1ZXIgPGpha2VAYWxvZ2ljYWxwYXJhZG94LmNvbT5cblx0ICogTUlUIExpY2Vuc2VkXG5cdCAqL1xuXHR2YXIgc3ltYm9sc1N1cHBvcnRlZCA9IHR5cGVvZiBTeW1ib2wgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIFN5bWJvbC5mb3IgPT09ICdmdW5jdGlvbic7XG5cdHZhciBjaGFpSW5zcGVjdCA9IHN5bWJvbHNTdXBwb3J0ZWQgPyBTeW1ib2wuZm9yKCdjaGFpL2luc3BlY3QnKSA6ICdAQGNoYWkvaW5zcGVjdCc7XG5cdHZhciBub2RlSW5zcGVjdCA9IGZhbHNlO1xuXG5cdHRyeSB7XG5cdCAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGdsb2JhbC1yZXF1aXJlXG5cdCAgbm9kZUluc3BlY3QgPSByZXF1aXJlKCd1dGlsJykuaW5zcGVjdC5jdXN0b207XG5cdH0gY2F0Y2ggKG5vTm9kZUluc3BlY3QpIHtcblx0ICBub2RlSW5zcGVjdCA9IGZhbHNlO1xuXHR9XG5cblx0dmFyIGNvbnN0cnVjdG9yTWFwID0gbmV3IFdlYWtNYXAoKTtcblx0dmFyIHN0cmluZ1RhZ01hcCA9IHt9O1xuXHR2YXIgYmFzZVR5cGVzTWFwID0ge1xuXHQgIHVuZGVmaW5lZDogZnVuY3Rpb24gdW5kZWZpbmVkJDEodmFsdWUsIG9wdGlvbnMpIHtcblx0ICAgIHJldHVybiBvcHRpb25zLnN0eWxpemUoJ3VuZGVmaW5lZCcsICd1bmRlZmluZWQnKTtcblx0ICB9LFxuXHQgIG51bGw6IGZ1bmN0aW9uIF9udWxsKHZhbHVlLCBvcHRpb25zKSB7XG5cdCAgICByZXR1cm4gb3B0aW9ucy5zdHlsaXplKG51bGwsICdudWxsJyk7XG5cdCAgfSxcblx0ICBib29sZWFuOiBmdW5jdGlvbiBib29sZWFuKHZhbHVlLCBvcHRpb25zKSB7XG5cdCAgICByZXR1cm4gb3B0aW9ucy5zdHlsaXplKHZhbHVlLCAnYm9vbGVhbicpO1xuXHQgIH0sXG5cdCAgQm9vbGVhbjogZnVuY3Rpb24gQm9vbGVhbih2YWx1ZSwgb3B0aW9ucykge1xuXHQgICAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZSh2YWx1ZSwgJ2Jvb2xlYW4nKTtcblx0ICB9LFxuXHQgIG51bWJlcjogaW5zcGVjdE51bWJlcixcblx0ICBOdW1iZXI6IGluc3BlY3ROdW1iZXIsXG5cdCAgQmlnSW50OiBpbnNwZWN0TnVtYmVyLFxuXHQgIGJpZ2ludDogaW5zcGVjdE51bWJlcixcblx0ICBzdHJpbmc6IGluc3BlY3RTdHJpbmcsXG5cdCAgU3RyaW5nOiBpbnNwZWN0U3RyaW5nLFxuXHQgIGZ1bmN0aW9uOiBpbnNwZWN0RnVuY3Rpb24sXG5cdCAgRnVuY3Rpb246IGluc3BlY3RGdW5jdGlvbixcblx0ICBzeW1ib2w6IGluc3BlY3RTeW1ib2wsXG5cdCAgLy8gQSBTeW1ib2wgcG9seWZpbGwgd2lsbCByZXR1cm4gYFN5bWJvbGAgbm90IGBzeW1ib2xgIGZyb20gdHlwZWRldGVjdFxuXHQgIFN5bWJvbDogaW5zcGVjdFN5bWJvbCxcblx0ICBBcnJheTogaW5zcGVjdEFycmF5LFxuXHQgIERhdGU6IGluc3BlY3REYXRlLFxuXHQgIE1hcDogaW5zcGVjdE1hcCxcblx0ICBTZXQ6IGluc3BlY3RTZXQsXG5cdCAgUmVnRXhwOiBpbnNwZWN0UmVnRXhwLFxuXHQgIFByb21pc2U6IGluc3BlY3RQcm9taXNlLFxuXHQgIC8vIFdlYWtTZXQsIFdlYWtNYXAgYXJlIHRvdGFsbHkgb3BhcXVlIHRvIHVzXG5cdCAgV2Vha1NldDogZnVuY3Rpb24gV2Vha1NldCh2YWx1ZSwgb3B0aW9ucykge1xuXHQgICAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZSgnV2Vha1NldHvigKZ9JywgJ3NwZWNpYWwnKTtcblx0ICB9LFxuXHQgIFdlYWtNYXA6IGZ1bmN0aW9uIFdlYWtNYXAodmFsdWUsIG9wdGlvbnMpIHtcblx0ICAgIHJldHVybiBvcHRpb25zLnN0eWxpemUoJ1dlYWtNYXB74oCmfScsICdzcGVjaWFsJyk7XG5cdCAgfSxcblx0ICBBcmd1bWVudHM6IGluc3BlY3RBcmd1bWVudHMsXG5cdCAgSW50OEFycmF5OiBpbnNwZWN0VHlwZWRBcnJheSxcblx0ICBVaW50OEFycmF5OiBpbnNwZWN0VHlwZWRBcnJheSxcblx0ICBVaW50OENsYW1wZWRBcnJheTogaW5zcGVjdFR5cGVkQXJyYXksXG5cdCAgSW50MTZBcnJheTogaW5zcGVjdFR5cGVkQXJyYXksXG5cdCAgVWludDE2QXJyYXk6IGluc3BlY3RUeXBlZEFycmF5LFxuXHQgIEludDMyQXJyYXk6IGluc3BlY3RUeXBlZEFycmF5LFxuXHQgIFVpbnQzMkFycmF5OiBpbnNwZWN0VHlwZWRBcnJheSxcblx0ICBGbG9hdDMyQXJyYXk6IGluc3BlY3RUeXBlZEFycmF5LFxuXHQgIEZsb2F0NjRBcnJheTogaW5zcGVjdFR5cGVkQXJyYXksXG5cdCAgR2VuZXJhdG9yOiBmdW5jdGlvbiBHZW5lcmF0b3IoKSB7XG5cdCAgICByZXR1cm4gJyc7XG5cdCAgfSxcblx0ICBEYXRhVmlldzogZnVuY3Rpb24gRGF0YVZpZXcoKSB7XG5cdCAgICByZXR1cm4gJyc7XG5cdCAgfSxcblx0ICBBcnJheUJ1ZmZlcjogZnVuY3Rpb24gQXJyYXlCdWZmZXIoKSB7XG5cdCAgICByZXR1cm4gJyc7XG5cdCAgfSxcblx0ICBFcnJvcjogaW5zcGVjdE9iamVjdCQxLFxuXHQgIEhUTUxDb2xsZWN0aW9uOiBpbnNwZWN0SFRNTENvbGxlY3Rpb24sXG5cdCAgTm9kZUxpc3Q6IGluc3BlY3RIVE1MQ29sbGVjdGlvblxuXHR9OyAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgY29tcGxleGl0eVxuXG5cdHZhciBpbnNwZWN0Q3VzdG9tID0gZnVuY3Rpb24gaW5zcGVjdEN1c3RvbSh2YWx1ZSwgb3B0aW9ucywgdHlwZSkge1xuXHQgIGlmIChjaGFpSW5zcGVjdCBpbiB2YWx1ZSAmJiB0eXBlb2YgdmFsdWVbY2hhaUluc3BlY3RdID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICByZXR1cm4gdmFsdWVbY2hhaUluc3BlY3RdKG9wdGlvbnMpO1xuXHQgIH1cblxuXHQgIGlmIChub2RlSW5zcGVjdCAmJiBub2RlSW5zcGVjdCBpbiB2YWx1ZSAmJiB0eXBlb2YgdmFsdWVbbm9kZUluc3BlY3RdID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICByZXR1cm4gdmFsdWVbbm9kZUluc3BlY3RdKG9wdGlvbnMuZGVwdGgsIG9wdGlvbnMpO1xuXHQgIH1cblxuXHQgIGlmICgnaW5zcGVjdCcgaW4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlLmluc3BlY3QgPT09ICdmdW5jdGlvbicpIHtcblx0ICAgIHJldHVybiB2YWx1ZS5pbnNwZWN0KG9wdGlvbnMuZGVwdGgsIG9wdGlvbnMpO1xuXHQgIH1cblxuXHQgIGlmICgnY29uc3RydWN0b3InIGluIHZhbHVlICYmIGNvbnN0cnVjdG9yTWFwLmhhcyh2YWx1ZS5jb25zdHJ1Y3RvcikpIHtcblx0ICAgIHJldHVybiBjb25zdHJ1Y3Rvck1hcC5nZXQodmFsdWUuY29uc3RydWN0b3IpKHZhbHVlLCBvcHRpb25zKTtcblx0ICB9XG5cblx0ICBpZiAoc3RyaW5nVGFnTWFwW3R5cGVdKSB7XG5cdCAgICByZXR1cm4gc3RyaW5nVGFnTWFwW3R5cGVdKHZhbHVlLCBvcHRpb25zKTtcblx0ICB9XG5cblx0ICByZXR1cm4gJyc7XG5cdH07IC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBjb21wbGV4aXR5XG5cblxuXHRmdW5jdGlvbiBpbnNwZWN0KHZhbHVlLCBvcHRpb25zKSB7XG5cdCAgb3B0aW9ucyA9IG5vcm1hbGlzZU9wdGlvbnMob3B0aW9ucyk7XG5cdCAgb3B0aW9ucy5pbnNwZWN0ID0gaW5zcGVjdDtcblx0ICB2YXIgX29wdGlvbnMgPSBvcHRpb25zLFxuXHQgICAgICBjdXN0b21JbnNwZWN0ID0gX29wdGlvbnMuY3VzdG9tSW5zcGVjdDtcblx0ICB2YXIgdHlwZSA9IHR5cGVEZXRlY3QodmFsdWUpOyAvLyBJZiBpdCBpcyBhIGJhc2UgdmFsdWUgdGhhdCB3ZSBhbHJlYWR5IHN1cHBvcnQsIHRoZW4gdXNlIExvdXBlJ3MgaW5zcGVjdG9yXG5cdCAgaWYgKGJhc2VUeXBlc01hcFt0eXBlXSkge1xuXHQgICAgcmV0dXJuIGJhc2VUeXBlc01hcFt0eXBlXSh2YWx1ZSwgb3B0aW9ucyk7XG5cdCAgfSAvLyBJZiBgb3B0aW9ucy5jdXN0b21JbnNwZWN0YCBpcyBzZXQgdG8gdHJ1ZSB0aGVuIHRyeSB0byB1c2UgdGhlIGN1c3RvbSBpbnNwZWN0b3JcblxuXG5cdCAgaWYgKGN1c3RvbUluc3BlY3QgJiYgdmFsdWUpIHtcblx0ICAgIHZhciBvdXRwdXQgPSBpbnNwZWN0Q3VzdG9tKHZhbHVlLCBvcHRpb25zLCB0eXBlKTtcblx0ICAgIGlmIChvdXRwdXQpIHJldHVybiBpbnNwZWN0KG91dHB1dCwgb3B0aW9ucyk7XG5cdCAgfVxuXG5cdCAgdmFyIHByb3RvID0gdmFsdWUgPyBPYmplY3QuZ2V0UHJvdG90eXBlT2YodmFsdWUpIDogZmFsc2U7IC8vIElmIGl0J3MgYSBwbGFpbiBPYmplY3QgdGhlbiB1c2UgTG91cGUncyBpbnNwZWN0b3JcblxuXHQgIGlmIChwcm90byA9PT0gT2JqZWN0LnByb3RvdHlwZSB8fCBwcm90byA9PT0gbnVsbCkge1xuXHQgICAgcmV0dXJuIGluc3BlY3RPYmplY3QodmFsdWUsIG9wdGlvbnMpO1xuXHQgIH0gLy8gU3BlY2lmaWNhbGx5IGFjY291bnQgZm9yIEhUTUxFbGVtZW50c1xuXHQgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby11bmRlZlxuXG5cblx0ICBpZiAodmFsdWUgJiYgdHlwZW9mIEhUTUxFbGVtZW50ID09PSAnZnVuY3Rpb24nICYmIHZhbHVlIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcblx0ICAgIHJldHVybiBpbnNwZWN0SFRNTCh2YWx1ZSwgb3B0aW9ucyk7XG5cdCAgfSAvLyBJZiBpdCBpcyBhIGNsYXNzLCBpbnNwZWN0IGl0IGxpa2UgYW4gb2JqZWN0IGJ1dCBhZGQgdGhlIGNvbnN0cnVjdG9yIG5hbWVcblxuXG5cdCAgaWYgKCdjb25zdHJ1Y3RvcicgaW4gdmFsdWUgJiYgdmFsdWUuY29uc3RydWN0b3IgIT09IE9iamVjdCkge1xuXHQgICAgcmV0dXJuIGluc3BlY3RDbGFzcyh2YWx1ZSwgb3B0aW9ucyk7XG5cdCAgfSAvLyBXZSBoYXZlIHJ1biBvdXQgb2Ygb3B0aW9ucyEgSnVzdCBzdHJpbmdpZnkgdGhlIHZhbHVlXG5cblxuXHQgIHJldHVybiBvcHRpb25zLnN0eWxpemUoU3RyaW5nKHZhbHVlKSwgdHlwZSk7XG5cdH1cblx0ZnVuY3Rpb24gcmVnaXN0ZXJDb25zdHJ1Y3Rvcihjb25zdHJ1Y3RvciwgaW5zcGVjdG9yKSB7XG5cdCAgaWYgKGNvbnN0cnVjdG9yTWFwLmhhcyhjb25zdHJ1Y3RvcikpIHtcblx0ICAgIHJldHVybiBmYWxzZTtcblx0ICB9XG5cblx0ICBjb25zdHJ1Y3Rvck1hcC5hZGQoY29uc3RydWN0b3IsIGluc3BlY3Rvcik7XG5cdCAgcmV0dXJuIHRydWU7XG5cdH1cblx0ZnVuY3Rpb24gcmVnaXN0ZXJTdHJpbmdUYWcoc3RyaW5nVGFnLCBpbnNwZWN0b3IpIHtcblx0ICBpZiAoc3RyaW5nVGFnIGluIHN0cmluZ1RhZ01hcCkge1xuXHQgICAgcmV0dXJuIGZhbHNlO1xuXHQgIH1cblxuXHQgIHN0cmluZ1RhZ01hcFtzdHJpbmdUYWddID0gaW5zcGVjdG9yO1xuXHQgIHJldHVybiB0cnVlO1xuXHR9XG5cdHZhciBjdXN0b20gPSBjaGFpSW5zcGVjdDtcblxuXHRleHBvcnRzLmN1c3RvbSA9IGN1c3RvbTtcblx0ZXhwb3J0cy5kZWZhdWx0ID0gaW5zcGVjdDtcblx0ZXhwb3J0cy5pbnNwZWN0ID0gaW5zcGVjdDtcblx0ZXhwb3J0cy5yZWdpc3RlckNvbnN0cnVjdG9yID0gcmVnaXN0ZXJDb25zdHJ1Y3Rvcjtcblx0ZXhwb3J0cy5yZWdpc3RlclN0cmluZ1RhZyA9IHJlZ2lzdGVyU3RyaW5nVGFnO1xuXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG5cbn0pKSk7XG4iLCIoZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgdmFyIGpzX3R5cGVfb2YsIHJwciwgc2FkO1xuXG4gIC8vIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiAgdGhpcy5zYWQgPSBzYWQgPSBTeW1ib2woJ3NhZCcpO1xuXG4gICh7cnByLCBqc190eXBlX29mfSA9IHJlcXVpcmUoJy4vaGVscGVycycpKTtcblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHRoaXMuaXNfc2FkID0gZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiAoeCA9PT0gc2FkKSB8fCAoeCBpbnN0YW5jZW9mIEVycm9yKSB8fCAodGhpcy5pc19zYWRkZW5lZCh4KSk7XG4gIH07XG5cbiAgdGhpcy5pc19oYXBweSA9IGZ1bmN0aW9uKHgpIHtcbiAgICByZXR1cm4gIXRoaXMuaXNfc2FkKHgpO1xuICB9O1xuXG4gIHRoaXMuc2FkZGVuID0gZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiB7XG4gICAgICBbc2FkXTogdHJ1ZSxcbiAgICAgIF86IHhcbiAgICB9O1xuICB9O1xuXG4gIHRoaXMuaXNfc2FkZGVuZWQgPSBmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuICgoanNfdHlwZV9vZih4KSkgPT09ICdvYmplY3QnKSAmJiAoeFtzYWRdID09PSB0cnVlKTtcbiAgfTtcblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHRoaXMudW5zYWRkZW4gPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKHRoaXMuaXNfaGFwcHkoeCkpIHtcbiAgICAgIHJldHVybiB4O1xuICAgIH1cbiAgICB0aGlzLnZhbGlkYXRlLnNhZGRlbmVkKHgpO1xuICAgIHJldHVybiB4Ll87XG4gIH07XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB0aGlzLmRlY2xhcmVfY2hlY2sgPSBmdW5jdGlvbihuYW1lLCBjaGVja2VyKSB7XG4gICAgdGhpcy52YWxpZGF0ZS5ub25lbXB0eV90ZXh0KG5hbWUpO1xuICAgIHRoaXMudmFsaWRhdGUuZnVuY3Rpb24oY2hlY2tlcik7XG4gICAgaWYgKHRoaXMuc3BlY3NbbmFtZV0gIT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGDCtTgwMzIgdHlwZSAke3JwcihuYW1lKX0gYWxyZWFkeSBkZWNsYXJlZGApO1xuICAgIH1cbiAgICBpZiAodGhpcy5jaGVja3NbbmFtZV0gIT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGDCtTgwMzMgY2hlY2sgJHtycHIobmFtZSl9IGFscmVhZHkgZGVjbGFyZWRgKTtcbiAgICB9XG4gICAgdGhpcy5jaGVja3NbbmFtZV0gPSBjaGVja2VyO1xuICAgIHJldHVybiBudWxsO1xuICB9O1xuXG59KS5jYWxsKHRoaXMpO1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1jaGVja3MuanMubWFwIiwiKGZ1bmN0aW9uKCkge1xuICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gIC8vIHsgZXF1YWxzLCB9ICAgICAgICAgICAgICAgPSByZXF1aXJlICdjbmQnXG4gIHZhciBDSEVDS1MsIGFzc2lnbiwganIsIGpzX3R5cGVfb2YsIGpzaWRlbnRpZmllcl9wYXR0ZXJuLCB4cnByLFxuICAgIG1vZHVsbyA9IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuICgrYSAlIChiID0gK2IpICsgYikgJSBiOyB9O1xuXG4gICh7YXNzaWduLCBqciwgeHJwciwganNfdHlwZV9vZn0gPSByZXF1aXJlKCcuL2hlbHBlcnMnKSk7XG5cbiAgQ0hFQ0tTID0gcmVxdWlyZSgnLi9jaGVja3MnKTtcblxuICAvKiB0aHggdG9cbiAgICBodHRwczovL2dpdGh1Yi5jb20vbWF0aGlhc2J5bmVucy9tb3RoZXJlZmYuaW4vYmxvYi9tYXN0ZXIvanMtdmFyaWFibGVzL2VmZi5qc1xuICAgIGh0dHBzOi8vbWF0aGlhc2J5bmVucy5iZS9ub3Rlcy9qYXZhc2NyaXB0LWlkZW50aWZpZXJzLWVzNlxuICAqL1xuICAvLyBqc2lkZW50aWZpZXJfcGF0dGVybiAgICAgID0gL14oPzpbXFwkQS1aX2EtelxceEFBXFx4QjVcXHhCQVxceEMwLVxceEQ2XFx4RDgtXFx4RjZcXHhGOC1cXHUwMkMxXFx1MDJDNi1cXHUwMkQxXFx1MDJFMC1cXHUwMkU0XFx1MDJFQ1xcdTAyRUVcXHUwMzcwLVxcdTAzNzRcXHUwMzc2XFx1MDM3N1xcdTAzN0EtXFx1MDM3RFxcdTAzN0ZcXHUwMzg2XFx1MDM4OC1cXHUwMzhBXFx1MDM4Q1xcdTAzOEUtXFx1MDNBMVxcdTAzQTMtXFx1MDNGNVxcdTAzRjctXFx1MDQ4MVxcdTA0OEEtXFx1MDUyRlxcdTA1MzEtXFx1MDU1NlxcdTA1NTlcXHUwNTYxLVxcdTA1ODdcXHUwNUQwLVxcdTA1RUFcXHUwNUYwLVxcdTA1RjJcXHUwNjIwLVxcdTA2NEFcXHUwNjZFXFx1MDY2RlxcdTA2NzEtXFx1MDZEM1xcdTA2RDVcXHUwNkU1XFx1MDZFNlxcdTA2RUVcXHUwNkVGXFx1MDZGQS1cXHUwNkZDXFx1MDZGRlxcdTA3MTBcXHUwNzEyLVxcdTA3MkZcXHUwNzRELVxcdTA3QTVcXHUwN0IxXFx1MDdDQS1cXHUwN0VBXFx1MDdGNFxcdTA3RjVcXHUwN0ZBXFx1MDgwMC1cXHUwODE1XFx1MDgxQVxcdTA4MjRcXHUwODI4XFx1MDg0MC1cXHUwODU4XFx1MDhBMC1cXHUwOEI0XFx1MDkwNC1cXHUwOTM5XFx1MDkzRFxcdTA5NTBcXHUwOTU4LVxcdTA5NjFcXHUwOTcxLVxcdTA5ODBcXHUwOTg1LVxcdTA5OENcXHUwOThGXFx1MDk5MFxcdTA5OTMtXFx1MDlBOFxcdTA5QUEtXFx1MDlCMFxcdTA5QjJcXHUwOUI2LVxcdTA5QjlcXHUwOUJEXFx1MDlDRVxcdTA5RENcXHUwOUREXFx1MDlERi1cXHUwOUUxXFx1MDlGMFxcdTA5RjFcXHUwQTA1LVxcdTBBMEFcXHUwQTBGXFx1MEExMFxcdTBBMTMtXFx1MEEyOFxcdTBBMkEtXFx1MEEzMFxcdTBBMzJcXHUwQTMzXFx1MEEzNVxcdTBBMzZcXHUwQTM4XFx1MEEzOVxcdTBBNTktXFx1MEE1Q1xcdTBBNUVcXHUwQTcyLVxcdTBBNzRcXHUwQTg1LVxcdTBBOERcXHUwQThGLVxcdTBBOTFcXHUwQTkzLVxcdTBBQThcXHUwQUFBLVxcdTBBQjBcXHUwQUIyXFx1MEFCM1xcdTBBQjUtXFx1MEFCOVxcdTBBQkRcXHUwQUQwXFx1MEFFMFxcdTBBRTFcXHUwQUY5XFx1MEIwNS1cXHUwQjBDXFx1MEIwRlxcdTBCMTBcXHUwQjEzLVxcdTBCMjhcXHUwQjJBLVxcdTBCMzBcXHUwQjMyXFx1MEIzM1xcdTBCMzUtXFx1MEIzOVxcdTBCM0RcXHUwQjVDXFx1MEI1RFxcdTBCNUYtXFx1MEI2MVxcdTBCNzFcXHUwQjgzXFx1MEI4NS1cXHUwQjhBXFx1MEI4RS1cXHUwQjkwXFx1MEI5Mi1cXHUwQjk1XFx1MEI5OVxcdTBCOUFcXHUwQjlDXFx1MEI5RVxcdTBCOUZcXHUwQkEzXFx1MEJBNFxcdTBCQTgtXFx1MEJBQVxcdTBCQUUtXFx1MEJCOVxcdTBCRDBcXHUwQzA1LVxcdTBDMENcXHUwQzBFLVxcdTBDMTBcXHUwQzEyLVxcdTBDMjhcXHUwQzJBLVxcdTBDMzlcXHUwQzNEXFx1MEM1OC1cXHUwQzVBXFx1MEM2MFxcdTBDNjFcXHUwQzg1LVxcdTBDOENcXHUwQzhFLVxcdTBDOTBcXHUwQzkyLVxcdTBDQThcXHUwQ0FBLVxcdTBDQjNcXHUwQ0I1LVxcdTBDQjlcXHUwQ0JEXFx1MENERVxcdTBDRTBcXHUwQ0UxXFx1MENGMVxcdTBDRjJcXHUwRDA1LVxcdTBEMENcXHUwRDBFLVxcdTBEMTBcXHUwRDEyLVxcdTBEM0FcXHUwRDNEXFx1MEQ0RVxcdTBENUYtXFx1MEQ2MVxcdTBEN0EtXFx1MEQ3RlxcdTBEODUtXFx1MEQ5NlxcdTBEOUEtXFx1MERCMVxcdTBEQjMtXFx1MERCQlxcdTBEQkRcXHUwREMwLVxcdTBEQzZcXHUwRTAxLVxcdTBFMzBcXHUwRTMyXFx1MEUzM1xcdTBFNDAtXFx1MEU0NlxcdTBFODFcXHUwRTgyXFx1MEU4NFxcdTBFODdcXHUwRTg4XFx1MEU4QVxcdTBFOERcXHUwRTk0LVxcdTBFOTdcXHUwRTk5LVxcdTBFOUZcXHUwRUExLVxcdTBFQTNcXHUwRUE1XFx1MEVBN1xcdTBFQUFcXHUwRUFCXFx1MEVBRC1cXHUwRUIwXFx1MEVCMlxcdTBFQjNcXHUwRUJEXFx1MEVDMC1cXHUwRUM0XFx1MEVDNlxcdTBFREMtXFx1MEVERlxcdTBGMDBcXHUwRjQwLVxcdTBGNDdcXHUwRjQ5LVxcdTBGNkNcXHUwRjg4LVxcdTBGOENcXHUxMDAwLVxcdTEwMkFcXHUxMDNGXFx1MTA1MC1cXHUxMDU1XFx1MTA1QS1cXHUxMDVEXFx1MTA2MVxcdTEwNjVcXHUxMDY2XFx1MTA2RS1cXHUxMDcwXFx1MTA3NS1cXHUxMDgxXFx1MTA4RVxcdTEwQTAtXFx1MTBDNVxcdTEwQzdcXHUxMENEXFx1MTBEMC1cXHUxMEZBXFx1MTBGQy1cXHUxMjQ4XFx1MTI0QS1cXHUxMjREXFx1MTI1MC1cXHUxMjU2XFx1MTI1OFxcdTEyNUEtXFx1MTI1RFxcdTEyNjAtXFx1MTI4OFxcdTEyOEEtXFx1MTI4RFxcdTEyOTAtXFx1MTJCMFxcdTEyQjItXFx1MTJCNVxcdTEyQjgtXFx1MTJCRVxcdTEyQzBcXHUxMkMyLVxcdTEyQzVcXHUxMkM4LVxcdTEyRDZcXHUxMkQ4LVxcdTEzMTBcXHUxMzEyLVxcdTEzMTVcXHUxMzE4LVxcdTEzNUFcXHUxMzgwLVxcdTEzOEZcXHUxM0EwLVxcdTEzRjVcXHUxM0Y4LVxcdTEzRkRcXHUxNDAxLVxcdTE2NkNcXHUxNjZGLVxcdTE2N0ZcXHUxNjgxLVxcdTE2OUFcXHUxNkEwLVxcdTE2RUFcXHUxNkVFLVxcdTE2RjhcXHUxNzAwLVxcdTE3MENcXHUxNzBFLVxcdTE3MTFcXHUxNzIwLVxcdTE3MzFcXHUxNzQwLVxcdTE3NTFcXHUxNzYwLVxcdTE3NkNcXHUxNzZFLVxcdTE3NzBcXHUxNzgwLVxcdTE3QjNcXHUxN0Q3XFx1MTdEQ1xcdTE4MjAtXFx1MTg3N1xcdTE4ODAtXFx1MThBOFxcdTE4QUFcXHUxOEIwLVxcdTE4RjVcXHUxOTAwLVxcdTE5MUVcXHUxOTUwLVxcdTE5NkRcXHUxOTcwLVxcdTE5NzRcXHUxOTgwLVxcdTE5QUJcXHUxOUIwLVxcdTE5QzlcXHUxQTAwLVxcdTFBMTZcXHUxQTIwLVxcdTFBNTRcXHUxQUE3XFx1MUIwNS1cXHUxQjMzXFx1MUI0NS1cXHUxQjRCXFx1MUI4My1cXHUxQkEwXFx1MUJBRVxcdTFCQUZcXHUxQkJBLVxcdTFCRTVcXHUxQzAwLVxcdTFDMjNcXHUxQzRELVxcdTFDNEZcXHUxQzVBLVxcdTFDN0RcXHUxQ0U5LVxcdTFDRUNcXHUxQ0VFLVxcdTFDRjFcXHUxQ0Y1XFx1MUNGNlxcdTFEMDAtXFx1MURCRlxcdTFFMDAtXFx1MUYxNVxcdTFGMTgtXFx1MUYxRFxcdTFGMjAtXFx1MUY0NVxcdTFGNDgtXFx1MUY0RFxcdTFGNTAtXFx1MUY1N1xcdTFGNTlcXHUxRjVCXFx1MUY1RFxcdTFGNUYtXFx1MUY3RFxcdTFGODAtXFx1MUZCNFxcdTFGQjYtXFx1MUZCQ1xcdTFGQkVcXHUxRkMyLVxcdTFGQzRcXHUxRkM2LVxcdTFGQ0NcXHUxRkQwLVxcdTFGRDNcXHUxRkQ2LVxcdTFGREJcXHUxRkUwLVxcdTFGRUNcXHUxRkYyLVxcdTFGRjRcXHUxRkY2LVxcdTFGRkNcXHUyMDcxXFx1MjA3RlxcdTIwOTAtXFx1MjA5Q1xcdTIxMDJcXHUyMTA3XFx1MjEwQS1cXHUyMTEzXFx1MjExNVxcdTIxMTgtXFx1MjExRFxcdTIxMjRcXHUyMTI2XFx1MjEyOFxcdTIxMkEtXFx1MjEzOVxcdTIxM0MtXFx1MjEzRlxcdTIxNDUtXFx1MjE0OVxcdTIxNEVcXHUyMTYwLVxcdTIxODhcXHUyQzAwLVxcdTJDMkVcXHUyQzMwLVxcdTJDNUVcXHUyQzYwLVxcdTJDRTRcXHUyQ0VCLVxcdTJDRUVcXHUyQ0YyXFx1MkNGM1xcdTJEMDAtXFx1MkQyNVxcdTJEMjdcXHUyRDJEXFx1MkQzMC1cXHUyRDY3XFx1MkQ2RlxcdTJEODAtXFx1MkQ5NlxcdTJEQTAtXFx1MkRBNlxcdTJEQTgtXFx1MkRBRVxcdTJEQjAtXFx1MkRCNlxcdTJEQjgtXFx1MkRCRVxcdTJEQzAtXFx1MkRDNlxcdTJEQzgtXFx1MkRDRVxcdTJERDAtXFx1MkRENlxcdTJERDgtXFx1MkRERVxcdTMwMDUtXFx1MzAwN1xcdTMwMjEtXFx1MzAyOVxcdTMwMzEtXFx1MzAzNVxcdTMwMzgtXFx1MzAzQ1xcdTMwNDEtXFx1MzA5NlxcdTMwOUItXFx1MzA5RlxcdTMwQTEtXFx1MzBGQVxcdTMwRkMtXFx1MzBGRlxcdTMxMDUtXFx1MzEyRFxcdTMxMzEtXFx1MzE4RVxcdTMxQTAtXFx1MzFCQVxcdTMxRjAtXFx1MzFGRlxcdTM0MDAtXFx1NERCNVxcdTRFMDAtXFx1OUZENVxcdUEwMDAtXFx1QTQ4Q1xcdUE0RDAtXFx1QTRGRFxcdUE1MDAtXFx1QTYwQ1xcdUE2MTAtXFx1QTYxRlxcdUE2MkFcXHVBNjJCXFx1QTY0MC1cXHVBNjZFXFx1QTY3Ri1cXHVBNjlEXFx1QTZBMC1cXHVBNkVGXFx1QTcxNy1cXHVBNzFGXFx1QTcyMi1cXHVBNzg4XFx1QTc4Qi1cXHVBN0FEXFx1QTdCMC1cXHVBN0I3XFx1QTdGNy1cXHVBODAxXFx1QTgwMy1cXHVBODA1XFx1QTgwNy1cXHVBODBBXFx1QTgwQy1cXHVBODIyXFx1QTg0MC1cXHVBODczXFx1QTg4Mi1cXHVBOEIzXFx1QThGMi1cXHVBOEY3XFx1QThGQlxcdUE4RkRcXHVBOTBBLVxcdUE5MjVcXHVBOTMwLVxcdUE5NDZcXHVBOTYwLVxcdUE5N0NcXHVBOTg0LVxcdUE5QjJcXHVBOUNGXFx1QTlFMC1cXHVBOUU0XFx1QTlFNi1cXHVBOUVGXFx1QTlGQS1cXHVBOUZFXFx1QUEwMC1cXHVBQTI4XFx1QUE0MC1cXHVBQTQyXFx1QUE0NC1cXHVBQTRCXFx1QUE2MC1cXHVBQTc2XFx1QUE3QVxcdUFBN0UtXFx1QUFBRlxcdUFBQjFcXHVBQUI1XFx1QUFCNlxcdUFBQjktXFx1QUFCRFxcdUFBQzBcXHVBQUMyXFx1QUFEQi1cXHVBQUREXFx1QUFFMC1cXHVBQUVBXFx1QUFGMi1cXHVBQUY0XFx1QUIwMS1cXHVBQjA2XFx1QUIwOS1cXHVBQjBFXFx1QUIxMS1cXHVBQjE2XFx1QUIyMC1cXHVBQjI2XFx1QUIyOC1cXHVBQjJFXFx1QUIzMC1cXHVBQjVBXFx1QUI1Qy1cXHVBQjY1XFx1QUI3MC1cXHVBQkUyXFx1QUMwMC1cXHVEN0EzXFx1RDdCMC1cXHVEN0M2XFx1RDdDQi1cXHVEN0ZCXFx1RjkwMC1cXHVGQTZEXFx1RkE3MC1cXHVGQUQ5XFx1RkIwMC1cXHVGQjA2XFx1RkIxMy1cXHVGQjE3XFx1RkIxRFxcdUZCMUYtXFx1RkIyOFxcdUZCMkEtXFx1RkIzNlxcdUZCMzgtXFx1RkIzQ1xcdUZCM0VcXHVGQjQwXFx1RkI0MVxcdUZCNDNcXHVGQjQ0XFx1RkI0Ni1cXHVGQkIxXFx1RkJEMy1cXHVGRDNEXFx1RkQ1MC1cXHVGRDhGXFx1RkQ5Mi1cXHVGREM3XFx1RkRGMC1cXHVGREZCXFx1RkU3MC1cXHVGRTc0XFx1RkU3Ni1cXHVGRUZDXFx1RkYyMS1cXHVGRjNBXFx1RkY0MS1cXHVGRjVBXFx1RkY2Ni1cXHVGRkJFXFx1RkZDMi1cXHVGRkM3XFx1RkZDQS1cXHVGRkNGXFx1RkZEMi1cXHVGRkQ3XFx1RkZEQS1cXHVGRkRDXXxcXHVEODAwW1xcdURDMDAtXFx1REMwQlxcdURDMEQtXFx1REMyNlxcdURDMjgtXFx1REMzQVxcdURDM0NcXHVEQzNEXFx1REMzRi1cXHVEQzREXFx1REM1MC1cXHVEQzVEXFx1REM4MC1cXHVEQ0ZBXFx1REQ0MC1cXHVERDc0XFx1REU4MC1cXHVERTlDXFx1REVBMC1cXHVERUQwXFx1REYwMC1cXHVERjFGXFx1REYzMC1cXHVERjRBXFx1REY1MC1cXHVERjc1XFx1REY4MC1cXHVERjlEXFx1REZBMC1cXHVERkMzXFx1REZDOC1cXHVERkNGXFx1REZEMS1cXHVERkQ1XXxcXHVEODAxW1xcdURDMDAtXFx1REM5RFxcdUREMDAtXFx1REQyN1xcdUREMzAtXFx1REQ2M1xcdURFMDAtXFx1REYzNlxcdURGNDAtXFx1REY1NVxcdURGNjAtXFx1REY2N118XFx1RDgwMltcXHVEQzAwLVxcdURDMDVcXHVEQzA4XFx1REMwQS1cXHVEQzM1XFx1REMzN1xcdURDMzhcXHVEQzNDXFx1REMzRi1cXHVEQzU1XFx1REM2MC1cXHVEQzc2XFx1REM4MC1cXHVEQzlFXFx1RENFMC1cXHVEQ0YyXFx1RENGNFxcdURDRjVcXHVERDAwLVxcdUREMTVcXHVERDIwLVxcdUREMzlcXHVERDgwLVxcdUREQjdcXHVEREJFXFx1RERCRlxcdURFMDBcXHVERTEwLVxcdURFMTNcXHVERTE1LVxcdURFMTdcXHVERTE5LVxcdURFMzNcXHVERTYwLVxcdURFN0NcXHVERTgwLVxcdURFOUNcXHVERUMwLVxcdURFQzdcXHVERUM5LVxcdURFRTRcXHVERjAwLVxcdURGMzVcXHVERjQwLVxcdURGNTVcXHVERjYwLVxcdURGNzJcXHVERjgwLVxcdURGOTFdfFxcdUQ4MDNbXFx1REMwMC1cXHVEQzQ4XFx1REM4MC1cXHVEQ0IyXFx1RENDMC1cXHVEQ0YyXXxcXHVEODA0W1xcdURDMDMtXFx1REMzN1xcdURDODMtXFx1RENBRlxcdURDRDAtXFx1RENFOFxcdUREMDMtXFx1REQyNlxcdURENTAtXFx1REQ3MlxcdURENzZcXHVERDgzLVxcdUREQjJcXHVEREMxLVxcdUREQzRcXHVERERBXFx1REREQ1xcdURFMDAtXFx1REUxMVxcdURFMTMtXFx1REUyQlxcdURFODAtXFx1REU4NlxcdURFODhcXHVERThBLVxcdURFOERcXHVERThGLVxcdURFOURcXHVERTlGLVxcdURFQThcXHVERUIwLVxcdURFREVcXHVERjA1LVxcdURGMENcXHVERjBGXFx1REYxMFxcdURGMTMtXFx1REYyOFxcdURGMkEtXFx1REYzMFxcdURGMzJcXHVERjMzXFx1REYzNS1cXHVERjM5XFx1REYzRFxcdURGNTBcXHVERjVELVxcdURGNjFdfFxcdUQ4MDVbXFx1REM4MC1cXHVEQ0FGXFx1RENDNFxcdURDQzVcXHVEQ0M3XFx1REQ4MC1cXHVEREFFXFx1REREOC1cXHVERERCXFx1REUwMC1cXHVERTJGXFx1REU0NFxcdURFODAtXFx1REVBQVxcdURGMDAtXFx1REYxOV18XFx1RDgwNltcXHVEQ0EwLVxcdURDREZcXHVEQ0ZGXFx1REVDMC1cXHVERUY4XXxcXHVEODA4W1xcdURDMDAtXFx1REY5OV18XFx1RDgwOVtcXHVEQzAwLVxcdURDNkVcXHVEQzgwLVxcdURENDNdfFtcXHVEODBDXFx1RDg0MC1cXHVEODY4XFx1RDg2QS1cXHVEODZDXFx1RDg2Ri1cXHVEODcyXVtcXHVEQzAwLVxcdURGRkZdfFxcdUQ4MERbXFx1REMwMC1cXHVEQzJFXXxcXHVEODExW1xcdURDMDAtXFx1REU0Nl18XFx1RDgxQVtcXHVEQzAwLVxcdURFMzhcXHVERTQwLVxcdURFNUVcXHVERUQwLVxcdURFRURcXHVERjAwLVxcdURGMkZcXHVERjQwLVxcdURGNDNcXHVERjYzLVxcdURGNzdcXHVERjdELVxcdURGOEZdfFxcdUQ4MUJbXFx1REYwMC1cXHVERjQ0XFx1REY1MFxcdURGOTMtXFx1REY5Rl18XFx1RDgyQ1tcXHVEQzAwXFx1REMwMV18XFx1RDgyRltcXHVEQzAwLVxcdURDNkFcXHVEQzcwLVxcdURDN0NcXHVEQzgwLVxcdURDODhcXHVEQzkwLVxcdURDOTldfFxcdUQ4MzVbXFx1REMwMC1cXHVEQzU0XFx1REM1Ni1cXHVEQzlDXFx1REM5RVxcdURDOUZcXHVEQ0EyXFx1RENBNVxcdURDQTZcXHVEQ0E5LVxcdURDQUNcXHVEQ0FFLVxcdURDQjlcXHVEQ0JCXFx1RENCRC1cXHVEQ0MzXFx1RENDNS1cXHVERDA1XFx1REQwNy1cXHVERDBBXFx1REQwRC1cXHVERDE0XFx1REQxNi1cXHVERDFDXFx1REQxRS1cXHVERDM5XFx1REQzQi1cXHVERDNFXFx1REQ0MC1cXHVERDQ0XFx1REQ0NlxcdURENEEtXFx1REQ1MFxcdURENTItXFx1REVBNVxcdURFQTgtXFx1REVDMFxcdURFQzItXFx1REVEQVxcdURFREMtXFx1REVGQVxcdURFRkMtXFx1REYxNFxcdURGMTYtXFx1REYzNFxcdURGMzYtXFx1REY0RVxcdURGNTAtXFx1REY2RVxcdURGNzAtXFx1REY4OFxcdURGOEEtXFx1REZBOFxcdURGQUEtXFx1REZDMlxcdURGQzQtXFx1REZDQl18XFx1RDgzQVtcXHVEQzAwLVxcdURDQzRdfFxcdUQ4M0JbXFx1REUwMC1cXHVERTAzXFx1REUwNS1cXHVERTFGXFx1REUyMVxcdURFMjJcXHVERTI0XFx1REUyN1xcdURFMjktXFx1REUzMlxcdURFMzQtXFx1REUzN1xcdURFMzlcXHVERTNCXFx1REU0MlxcdURFNDdcXHVERTQ5XFx1REU0QlxcdURFNEQtXFx1REU0RlxcdURFNTFcXHVERTUyXFx1REU1NFxcdURFNTdcXHVERTU5XFx1REU1QlxcdURFNURcXHVERTVGXFx1REU2MVxcdURFNjJcXHVERTY0XFx1REU2Ny1cXHVERTZBXFx1REU2Qy1cXHVERTcyXFx1REU3NC1cXHVERTc3XFx1REU3OS1cXHVERTdDXFx1REU3RVxcdURFODAtXFx1REU4OVxcdURFOEItXFx1REU5QlxcdURFQTEtXFx1REVBM1xcdURFQTUtXFx1REVBOVxcdURFQUItXFx1REVCQl18XFx1RDg2OVtcXHVEQzAwLVxcdURFRDZcXHVERjAwLVxcdURGRkZdfFxcdUQ4NkRbXFx1REMwMC1cXHVERjM0XFx1REY0MC1cXHVERkZGXXxcXHVEODZFW1xcdURDMDAtXFx1REMxRFxcdURDMjAtXFx1REZGRl18XFx1RDg3M1tcXHVEQzAwLVxcdURFQTFdfFxcdUQ4N0VbXFx1REMwMC1cXHVERTFEXSkoPzpbXFwkMC05QS1aX2EtelxceEFBXFx4QjVcXHhCN1xceEJBXFx4QzAtXFx4RDZcXHhEOC1cXHhGNlxceEY4LVxcdTAyQzFcXHUwMkM2LVxcdTAyRDFcXHUwMkUwLVxcdTAyRTRcXHUwMkVDXFx1MDJFRVxcdTAzMDAtXFx1MDM3NFxcdTAzNzZcXHUwMzc3XFx1MDM3QS1cXHUwMzdEXFx1MDM3RlxcdTAzODYtXFx1MDM4QVxcdTAzOENcXHUwMzhFLVxcdTAzQTFcXHUwM0EzLVxcdTAzRjVcXHUwM0Y3LVxcdTA0ODFcXHUwNDgzLVxcdTA0ODdcXHUwNDhBLVxcdTA1MkZcXHUwNTMxLVxcdTA1NTZcXHUwNTU5XFx1MDU2MS1cXHUwNTg3XFx1MDU5MS1cXHUwNUJEXFx1MDVCRlxcdTA1QzFcXHUwNUMyXFx1MDVDNFxcdTA1QzVcXHUwNUM3XFx1MDVEMC1cXHUwNUVBXFx1MDVGMC1cXHUwNUYyXFx1MDYxMC1cXHUwNjFBXFx1MDYyMC1cXHUwNjY5XFx1MDY2RS1cXHUwNkQzXFx1MDZENS1cXHUwNkRDXFx1MDZERi1cXHUwNkU4XFx1MDZFQS1cXHUwNkZDXFx1MDZGRlxcdTA3MTAtXFx1MDc0QVxcdTA3NEQtXFx1MDdCMVxcdTA3QzAtXFx1MDdGNVxcdTA3RkFcXHUwODAwLVxcdTA4MkRcXHUwODQwLVxcdTA4NUJcXHUwOEEwLVxcdTA4QjRcXHUwOEUzLVxcdTA5NjNcXHUwOTY2LVxcdTA5NkZcXHUwOTcxLVxcdTA5ODNcXHUwOTg1LVxcdTA5OENcXHUwOThGXFx1MDk5MFxcdTA5OTMtXFx1MDlBOFxcdTA5QUEtXFx1MDlCMFxcdTA5QjJcXHUwOUI2LVxcdTA5QjlcXHUwOUJDLVxcdTA5QzRcXHUwOUM3XFx1MDlDOFxcdTA5Q0ItXFx1MDlDRVxcdTA5RDdcXHUwOURDXFx1MDlERFxcdTA5REYtXFx1MDlFM1xcdTA5RTYtXFx1MDlGMVxcdTBBMDEtXFx1MEEwM1xcdTBBMDUtXFx1MEEwQVxcdTBBMEZcXHUwQTEwXFx1MEExMy1cXHUwQTI4XFx1MEEyQS1cXHUwQTMwXFx1MEEzMlxcdTBBMzNcXHUwQTM1XFx1MEEzNlxcdTBBMzhcXHUwQTM5XFx1MEEzQ1xcdTBBM0UtXFx1MEE0MlxcdTBBNDdcXHUwQTQ4XFx1MEE0Qi1cXHUwQTREXFx1MEE1MVxcdTBBNTktXFx1MEE1Q1xcdTBBNUVcXHUwQTY2LVxcdTBBNzVcXHUwQTgxLVxcdTBBODNcXHUwQTg1LVxcdTBBOERcXHUwQThGLVxcdTBBOTFcXHUwQTkzLVxcdTBBQThcXHUwQUFBLVxcdTBBQjBcXHUwQUIyXFx1MEFCM1xcdTBBQjUtXFx1MEFCOVxcdTBBQkMtXFx1MEFDNVxcdTBBQzctXFx1MEFDOVxcdTBBQ0ItXFx1MEFDRFxcdTBBRDBcXHUwQUUwLVxcdTBBRTNcXHUwQUU2LVxcdTBBRUZcXHUwQUY5XFx1MEIwMS1cXHUwQjAzXFx1MEIwNS1cXHUwQjBDXFx1MEIwRlxcdTBCMTBcXHUwQjEzLVxcdTBCMjhcXHUwQjJBLVxcdTBCMzBcXHUwQjMyXFx1MEIzM1xcdTBCMzUtXFx1MEIzOVxcdTBCM0MtXFx1MEI0NFxcdTBCNDdcXHUwQjQ4XFx1MEI0Qi1cXHUwQjREXFx1MEI1NlxcdTBCNTdcXHUwQjVDXFx1MEI1RFxcdTBCNUYtXFx1MEI2M1xcdTBCNjYtXFx1MEI2RlxcdTBCNzFcXHUwQjgyXFx1MEI4M1xcdTBCODUtXFx1MEI4QVxcdTBCOEUtXFx1MEI5MFxcdTBCOTItXFx1MEI5NVxcdTBCOTlcXHUwQjlBXFx1MEI5Q1xcdTBCOUVcXHUwQjlGXFx1MEJBM1xcdTBCQTRcXHUwQkE4LVxcdTBCQUFcXHUwQkFFLVxcdTBCQjlcXHUwQkJFLVxcdTBCQzJcXHUwQkM2LVxcdTBCQzhcXHUwQkNBLVxcdTBCQ0RcXHUwQkQwXFx1MEJEN1xcdTBCRTYtXFx1MEJFRlxcdTBDMDAtXFx1MEMwM1xcdTBDMDUtXFx1MEMwQ1xcdTBDMEUtXFx1MEMxMFxcdTBDMTItXFx1MEMyOFxcdTBDMkEtXFx1MEMzOVxcdTBDM0QtXFx1MEM0NFxcdTBDNDYtXFx1MEM0OFxcdTBDNEEtXFx1MEM0RFxcdTBDNTVcXHUwQzU2XFx1MEM1OC1cXHUwQzVBXFx1MEM2MC1cXHUwQzYzXFx1MEM2Ni1cXHUwQzZGXFx1MEM4MS1cXHUwQzgzXFx1MEM4NS1cXHUwQzhDXFx1MEM4RS1cXHUwQzkwXFx1MEM5Mi1cXHUwQ0E4XFx1MENBQS1cXHUwQ0IzXFx1MENCNS1cXHUwQ0I5XFx1MENCQy1cXHUwQ0M0XFx1MENDNi1cXHUwQ0M4XFx1MENDQS1cXHUwQ0NEXFx1MENENVxcdTBDRDZcXHUwQ0RFXFx1MENFMC1cXHUwQ0UzXFx1MENFNi1cXHUwQ0VGXFx1MENGMVxcdTBDRjJcXHUwRDAxLVxcdTBEMDNcXHUwRDA1LVxcdTBEMENcXHUwRDBFLVxcdTBEMTBcXHUwRDEyLVxcdTBEM0FcXHUwRDNELVxcdTBENDRcXHUwRDQ2LVxcdTBENDhcXHUwRDRBLVxcdTBENEVcXHUwRDU3XFx1MEQ1Ri1cXHUwRDYzXFx1MEQ2Ni1cXHUwRDZGXFx1MEQ3QS1cXHUwRDdGXFx1MEQ4MlxcdTBEODNcXHUwRDg1LVxcdTBEOTZcXHUwRDlBLVxcdTBEQjFcXHUwREIzLVxcdTBEQkJcXHUwREJEXFx1MERDMC1cXHUwREM2XFx1MERDQVxcdTBEQ0YtXFx1MERENFxcdTBERDZcXHUwREQ4LVxcdTBEREZcXHUwREU2LVxcdTBERUZcXHUwREYyXFx1MERGM1xcdTBFMDEtXFx1MEUzQVxcdTBFNDAtXFx1MEU0RVxcdTBFNTAtXFx1MEU1OVxcdTBFODFcXHUwRTgyXFx1MEU4NFxcdTBFODdcXHUwRTg4XFx1MEU4QVxcdTBFOERcXHUwRTk0LVxcdTBFOTdcXHUwRTk5LVxcdTBFOUZcXHUwRUExLVxcdTBFQTNcXHUwRUE1XFx1MEVBN1xcdTBFQUFcXHUwRUFCXFx1MEVBRC1cXHUwRUI5XFx1MEVCQi1cXHUwRUJEXFx1MEVDMC1cXHUwRUM0XFx1MEVDNlxcdTBFQzgtXFx1MEVDRFxcdTBFRDAtXFx1MEVEOVxcdTBFREMtXFx1MEVERlxcdTBGMDBcXHUwRjE4XFx1MEYxOVxcdTBGMjAtXFx1MEYyOVxcdTBGMzVcXHUwRjM3XFx1MEYzOVxcdTBGM0UtXFx1MEY0N1xcdTBGNDktXFx1MEY2Q1xcdTBGNzEtXFx1MEY4NFxcdTBGODYtXFx1MEY5N1xcdTBGOTktXFx1MEZCQ1xcdTBGQzZcXHUxMDAwLVxcdTEwNDlcXHUxMDUwLVxcdTEwOURcXHUxMEEwLVxcdTEwQzVcXHUxMEM3XFx1MTBDRFxcdTEwRDAtXFx1MTBGQVxcdTEwRkMtXFx1MTI0OFxcdTEyNEEtXFx1MTI0RFxcdTEyNTAtXFx1MTI1NlxcdTEyNThcXHUxMjVBLVxcdTEyNURcXHUxMjYwLVxcdTEyODhcXHUxMjhBLVxcdTEyOERcXHUxMjkwLVxcdTEyQjBcXHUxMkIyLVxcdTEyQjVcXHUxMkI4LVxcdTEyQkVcXHUxMkMwXFx1MTJDMi1cXHUxMkM1XFx1MTJDOC1cXHUxMkQ2XFx1MTJEOC1cXHUxMzEwXFx1MTMxMi1cXHUxMzE1XFx1MTMxOC1cXHUxMzVBXFx1MTM1RC1cXHUxMzVGXFx1MTM2OS1cXHUxMzcxXFx1MTM4MC1cXHUxMzhGXFx1MTNBMC1cXHUxM0Y1XFx1MTNGOC1cXHUxM0ZEXFx1MTQwMS1cXHUxNjZDXFx1MTY2Ri1cXHUxNjdGXFx1MTY4MS1cXHUxNjlBXFx1MTZBMC1cXHUxNkVBXFx1MTZFRS1cXHUxNkY4XFx1MTcwMC1cXHUxNzBDXFx1MTcwRS1cXHUxNzE0XFx1MTcyMC1cXHUxNzM0XFx1MTc0MC1cXHUxNzUzXFx1MTc2MC1cXHUxNzZDXFx1MTc2RS1cXHUxNzcwXFx1MTc3MlxcdTE3NzNcXHUxNzgwLVxcdTE3RDNcXHUxN0Q3XFx1MTdEQ1xcdTE3RERcXHUxN0UwLVxcdTE3RTlcXHUxODBCLVxcdTE4MERcXHUxODEwLVxcdTE4MTlcXHUxODIwLVxcdTE4NzdcXHUxODgwLVxcdTE4QUFcXHUxOEIwLVxcdTE4RjVcXHUxOTAwLVxcdTE5MUVcXHUxOTIwLVxcdTE5MkJcXHUxOTMwLVxcdTE5M0JcXHUxOTQ2LVxcdTE5NkRcXHUxOTcwLVxcdTE5NzRcXHUxOTgwLVxcdTE5QUJcXHUxOUIwLVxcdTE5QzlcXHUxOUQwLVxcdTE5REFcXHUxQTAwLVxcdTFBMUJcXHUxQTIwLVxcdTFBNUVcXHUxQTYwLVxcdTFBN0NcXHUxQTdGLVxcdTFBODlcXHUxQTkwLVxcdTFBOTlcXHUxQUE3XFx1MUFCMC1cXHUxQUJEXFx1MUIwMC1cXHUxQjRCXFx1MUI1MC1cXHUxQjU5XFx1MUI2Qi1cXHUxQjczXFx1MUI4MC1cXHUxQkYzXFx1MUMwMC1cXHUxQzM3XFx1MUM0MC1cXHUxQzQ5XFx1MUM0RC1cXHUxQzdEXFx1MUNEMC1cXHUxQ0QyXFx1MUNENC1cXHUxQ0Y2XFx1MUNGOFxcdTFDRjlcXHUxRDAwLVxcdTFERjVcXHUxREZDLVxcdTFGMTVcXHUxRjE4LVxcdTFGMURcXHUxRjIwLVxcdTFGNDVcXHUxRjQ4LVxcdTFGNERcXHUxRjUwLVxcdTFGNTdcXHUxRjU5XFx1MUY1QlxcdTFGNURcXHUxRjVGLVxcdTFGN0RcXHUxRjgwLVxcdTFGQjRcXHUxRkI2LVxcdTFGQkNcXHUxRkJFXFx1MUZDMi1cXHUxRkM0XFx1MUZDNi1cXHUxRkNDXFx1MUZEMC1cXHUxRkQzXFx1MUZENi1cXHUxRkRCXFx1MUZFMC1cXHUxRkVDXFx1MUZGMi1cXHUxRkY0XFx1MUZGNi1cXHUxRkZDXFx1MjAwQ1xcdTIwMERcXHUyMDNGXFx1MjA0MFxcdTIwNTRcXHUyMDcxXFx1MjA3RlxcdTIwOTAtXFx1MjA5Q1xcdTIwRDAtXFx1MjBEQ1xcdTIwRTFcXHUyMEU1LVxcdTIwRjBcXHUyMTAyXFx1MjEwN1xcdTIxMEEtXFx1MjExM1xcdTIxMTVcXHUyMTE4LVxcdTIxMURcXHUyMTI0XFx1MjEyNlxcdTIxMjhcXHUyMTJBLVxcdTIxMzlcXHUyMTNDLVxcdTIxM0ZcXHUyMTQ1LVxcdTIxNDlcXHUyMTRFXFx1MjE2MC1cXHUyMTg4XFx1MkMwMC1cXHUyQzJFXFx1MkMzMC1cXHUyQzVFXFx1MkM2MC1cXHUyQ0U0XFx1MkNFQi1cXHUyQ0YzXFx1MkQwMC1cXHUyRDI1XFx1MkQyN1xcdTJEMkRcXHUyRDMwLVxcdTJENjdcXHUyRDZGXFx1MkQ3Ri1cXHUyRDk2XFx1MkRBMC1cXHUyREE2XFx1MkRBOC1cXHUyREFFXFx1MkRCMC1cXHUyREI2XFx1MkRCOC1cXHUyREJFXFx1MkRDMC1cXHUyREM2XFx1MkRDOC1cXHUyRENFXFx1MkREMC1cXHUyREQ2XFx1MkREOC1cXHUyRERFXFx1MkRFMC1cXHUyREZGXFx1MzAwNS1cXHUzMDA3XFx1MzAyMS1cXHUzMDJGXFx1MzAzMS1cXHUzMDM1XFx1MzAzOC1cXHUzMDNDXFx1MzA0MS1cXHUzMDk2XFx1MzA5OS1cXHUzMDlGXFx1MzBBMS1cXHUzMEZBXFx1MzBGQy1cXHUzMEZGXFx1MzEwNS1cXHUzMTJEXFx1MzEzMS1cXHUzMThFXFx1MzFBMC1cXHUzMUJBXFx1MzFGMC1cXHUzMUZGXFx1MzQwMC1cXHU0REI1XFx1NEUwMC1cXHU5RkQ1XFx1QTAwMC1cXHVBNDhDXFx1QTREMC1cXHVBNEZEXFx1QTUwMC1cXHVBNjBDXFx1QTYxMC1cXHVBNjJCXFx1QTY0MC1cXHVBNjZGXFx1QTY3NC1cXHVBNjdEXFx1QTY3Ri1cXHVBNkYxXFx1QTcxNy1cXHVBNzFGXFx1QTcyMi1cXHVBNzg4XFx1QTc4Qi1cXHVBN0FEXFx1QTdCMC1cXHVBN0I3XFx1QTdGNy1cXHVBODI3XFx1QTg0MC1cXHVBODczXFx1QTg4MC1cXHVBOEM0XFx1QThEMC1cXHVBOEQ5XFx1QThFMC1cXHVBOEY3XFx1QThGQlxcdUE4RkRcXHVBOTAwLVxcdUE5MkRcXHVBOTMwLVxcdUE5NTNcXHVBOTYwLVxcdUE5N0NcXHVBOTgwLVxcdUE5QzBcXHVBOUNGLVxcdUE5RDlcXHVBOUUwLVxcdUE5RkVcXHVBQTAwLVxcdUFBMzZcXHVBQTQwLVxcdUFBNERcXHVBQTUwLVxcdUFBNTlcXHVBQTYwLVxcdUFBNzZcXHVBQTdBLVxcdUFBQzJcXHVBQURCLVxcdUFBRERcXHVBQUUwLVxcdUFBRUZcXHVBQUYyLVxcdUFBRjZcXHVBQjAxLVxcdUFCMDZcXHVBQjA5LVxcdUFCMEVcXHVBQjExLVxcdUFCMTZcXHVBQjIwLVxcdUFCMjZcXHVBQjI4LVxcdUFCMkVcXHVBQjMwLVxcdUFCNUFcXHVBQjVDLVxcdUFCNjVcXHVBQjcwLVxcdUFCRUFcXHVBQkVDXFx1QUJFRFxcdUFCRjAtXFx1QUJGOVxcdUFDMDAtXFx1RDdBM1xcdUQ3QjAtXFx1RDdDNlxcdUQ3Q0ItXFx1RDdGQlxcdUY5MDAtXFx1RkE2RFxcdUZBNzAtXFx1RkFEOVxcdUZCMDAtXFx1RkIwNlxcdUZCMTMtXFx1RkIxN1xcdUZCMUQtXFx1RkIyOFxcdUZCMkEtXFx1RkIzNlxcdUZCMzgtXFx1RkIzQ1xcdUZCM0VcXHVGQjQwXFx1RkI0MVxcdUZCNDNcXHVGQjQ0XFx1RkI0Ni1cXHVGQkIxXFx1RkJEMy1cXHVGRDNEXFx1RkQ1MC1cXHVGRDhGXFx1RkQ5Mi1cXHVGREM3XFx1RkRGMC1cXHVGREZCXFx1RkUwMC1cXHVGRTBGXFx1RkUyMC1cXHVGRTJGXFx1RkUzM1xcdUZFMzRcXHVGRTRELVxcdUZFNEZcXHVGRTcwLVxcdUZFNzRcXHVGRTc2LVxcdUZFRkNcXHVGRjEwLVxcdUZGMTlcXHVGRjIxLVxcdUZGM0FcXHVGRjNGXFx1RkY0MS1cXHVGRjVBXFx1RkY2Ni1cXHVGRkJFXFx1RkZDMi1cXHVGRkM3XFx1RkZDQS1cXHVGRkNGXFx1RkZEMi1cXHVGRkQ3XFx1RkZEQS1cXHVGRkRDXXxcXHVEODAwW1xcdURDMDAtXFx1REMwQlxcdURDMEQtXFx1REMyNlxcdURDMjgtXFx1REMzQVxcdURDM0NcXHVEQzNEXFx1REMzRi1cXHVEQzREXFx1REM1MC1cXHVEQzVEXFx1REM4MC1cXHVEQ0ZBXFx1REQ0MC1cXHVERDc0XFx1RERGRFxcdURFODAtXFx1REU5Q1xcdURFQTAtXFx1REVEMFxcdURFRTBcXHVERjAwLVxcdURGMUZcXHVERjMwLVxcdURGNEFcXHVERjUwLVxcdURGN0FcXHVERjgwLVxcdURGOURcXHVERkEwLVxcdURGQzNcXHVERkM4LVxcdURGQ0ZcXHVERkQxLVxcdURGRDVdfFxcdUQ4MDFbXFx1REMwMC1cXHVEQzlEXFx1RENBMC1cXHVEQ0E5XFx1REQwMC1cXHVERDI3XFx1REQzMC1cXHVERDYzXFx1REUwMC1cXHVERjM2XFx1REY0MC1cXHVERjU1XFx1REY2MC1cXHVERjY3XXxcXHVEODAyW1xcdURDMDAtXFx1REMwNVxcdURDMDhcXHVEQzBBLVxcdURDMzVcXHVEQzM3XFx1REMzOFxcdURDM0NcXHVEQzNGLVxcdURDNTVcXHVEQzYwLVxcdURDNzZcXHVEQzgwLVxcdURDOUVcXHVEQ0UwLVxcdURDRjJcXHVEQ0Y0XFx1RENGNVxcdUREMDAtXFx1REQxNVxcdUREMjAtXFx1REQzOVxcdUREODAtXFx1RERCN1xcdUREQkVcXHVEREJGXFx1REUwMC1cXHVERTAzXFx1REUwNVxcdURFMDZcXHVERTBDLVxcdURFMTNcXHVERTE1LVxcdURFMTdcXHVERTE5LVxcdURFMzNcXHVERTM4LVxcdURFM0FcXHVERTNGXFx1REU2MC1cXHVERTdDXFx1REU4MC1cXHVERTlDXFx1REVDMC1cXHVERUM3XFx1REVDOS1cXHVERUU2XFx1REYwMC1cXHVERjM1XFx1REY0MC1cXHVERjU1XFx1REY2MC1cXHVERjcyXFx1REY4MC1cXHVERjkxXXxcXHVEODAzW1xcdURDMDAtXFx1REM0OFxcdURDODAtXFx1RENCMlxcdURDQzAtXFx1RENGMl18XFx1RDgwNFtcXHVEQzAwLVxcdURDNDZcXHVEQzY2LVxcdURDNkZcXHVEQzdGLVxcdURDQkFcXHVEQ0QwLVxcdURDRThcXHVEQ0YwLVxcdURDRjlcXHVERDAwLVxcdUREMzRcXHVERDM2LVxcdUREM0ZcXHVERDUwLVxcdURENzNcXHVERDc2XFx1REQ4MC1cXHVEREM0XFx1RERDQS1cXHVERENDXFx1REREMC1cXHVERERBXFx1REREQ1xcdURFMDAtXFx1REUxMVxcdURFMTMtXFx1REUzN1xcdURFODAtXFx1REU4NlxcdURFODhcXHVERThBLVxcdURFOERcXHVERThGLVxcdURFOURcXHVERTlGLVxcdURFQThcXHVERUIwLVxcdURFRUFcXHVERUYwLVxcdURFRjlcXHVERjAwLVxcdURGMDNcXHVERjA1LVxcdURGMENcXHVERjBGXFx1REYxMFxcdURGMTMtXFx1REYyOFxcdURGMkEtXFx1REYzMFxcdURGMzJcXHVERjMzXFx1REYzNS1cXHVERjM5XFx1REYzQy1cXHVERjQ0XFx1REY0N1xcdURGNDhcXHVERjRCLVxcdURGNERcXHVERjUwXFx1REY1N1xcdURGNUQtXFx1REY2M1xcdURGNjYtXFx1REY2Q1xcdURGNzAtXFx1REY3NF18XFx1RDgwNVtcXHVEQzgwLVxcdURDQzVcXHVEQ0M3XFx1RENEMC1cXHVEQ0Q5XFx1REQ4MC1cXHVEREI1XFx1RERCOC1cXHVEREMwXFx1REREOC1cXHVEREREXFx1REUwMC1cXHVERTQwXFx1REU0NFxcdURFNTAtXFx1REU1OVxcdURFODAtXFx1REVCN1xcdURFQzAtXFx1REVDOVxcdURGMDAtXFx1REYxOVxcdURGMUQtXFx1REYyQlxcdURGMzAtXFx1REYzOV18XFx1RDgwNltcXHVEQ0EwLVxcdURDRTlcXHVEQ0ZGXFx1REVDMC1cXHVERUY4XXxcXHVEODA4W1xcdURDMDAtXFx1REY5OV18XFx1RDgwOVtcXHVEQzAwLVxcdURDNkVcXHVEQzgwLVxcdURENDNdfFtcXHVEODBDXFx1RDg0MC1cXHVEODY4XFx1RDg2QS1cXHVEODZDXFx1RDg2Ri1cXHVEODcyXVtcXHVEQzAwLVxcdURGRkZdfFxcdUQ4MERbXFx1REMwMC1cXHVEQzJFXXxcXHVEODExW1xcdURDMDAtXFx1REU0Nl18XFx1RDgxQVtcXHVEQzAwLVxcdURFMzhcXHVERTQwLVxcdURFNUVcXHVERTYwLVxcdURFNjlcXHVERUQwLVxcdURFRURcXHVERUYwLVxcdURFRjRcXHVERjAwLVxcdURGMzZcXHVERjQwLVxcdURGNDNcXHVERjUwLVxcdURGNTlcXHVERjYzLVxcdURGNzdcXHVERjdELVxcdURGOEZdfFxcdUQ4MUJbXFx1REYwMC1cXHVERjQ0XFx1REY1MC1cXHVERjdFXFx1REY4Ri1cXHVERjlGXXxcXHVEODJDW1xcdURDMDBcXHVEQzAxXXxcXHVEODJGW1xcdURDMDAtXFx1REM2QVxcdURDNzAtXFx1REM3Q1xcdURDODAtXFx1REM4OFxcdURDOTAtXFx1REM5OVxcdURDOURcXHVEQzlFXXxcXHVEODM0W1xcdURENjUtXFx1REQ2OVxcdURENkQtXFx1REQ3MlxcdUREN0ItXFx1REQ4MlxcdUREODUtXFx1REQ4QlxcdUREQUEtXFx1RERBRFxcdURFNDItXFx1REU0NF18XFx1RDgzNVtcXHVEQzAwLVxcdURDNTRcXHVEQzU2LVxcdURDOUNcXHVEQzlFXFx1REM5RlxcdURDQTJcXHVEQ0E1XFx1RENBNlxcdURDQTktXFx1RENBQ1xcdURDQUUtXFx1RENCOVxcdURDQkJcXHVEQ0JELVxcdURDQzNcXHVEQ0M1LVxcdUREMDVcXHVERDA3LVxcdUREMEFcXHVERDBELVxcdUREMTRcXHVERDE2LVxcdUREMUNcXHVERDFFLVxcdUREMzlcXHVERDNCLVxcdUREM0VcXHVERDQwLVxcdURENDRcXHVERDQ2XFx1REQ0QS1cXHVERDUwXFx1REQ1Mi1cXHVERUE1XFx1REVBOC1cXHVERUMwXFx1REVDMi1cXHVERURBXFx1REVEQy1cXHVERUZBXFx1REVGQy1cXHVERjE0XFx1REYxNi1cXHVERjM0XFx1REYzNi1cXHVERjRFXFx1REY1MC1cXHVERjZFXFx1REY3MC1cXHVERjg4XFx1REY4QS1cXHVERkE4XFx1REZBQS1cXHVERkMyXFx1REZDNC1cXHVERkNCXFx1REZDRS1cXHVERkZGXXxcXHVEODM2W1xcdURFMDAtXFx1REUzNlxcdURFM0ItXFx1REU2Q1xcdURFNzVcXHVERTg0XFx1REU5Qi1cXHVERTlGXFx1REVBMS1cXHVERUFGXXxcXHVEODNBW1xcdURDMDAtXFx1RENDNFxcdURDRDAtXFx1RENENl18XFx1RDgzQltcXHVERTAwLVxcdURFMDNcXHVERTA1LVxcdURFMUZcXHVERTIxXFx1REUyMlxcdURFMjRcXHVERTI3XFx1REUyOS1cXHVERTMyXFx1REUzNC1cXHVERTM3XFx1REUzOVxcdURFM0JcXHVERTQyXFx1REU0N1xcdURFNDlcXHVERTRCXFx1REU0RC1cXHVERTRGXFx1REU1MVxcdURFNTJcXHVERTU0XFx1REU1N1xcdURFNTlcXHVERTVCXFx1REU1RFxcdURFNUZcXHVERTYxXFx1REU2MlxcdURFNjRcXHVERTY3LVxcdURFNkFcXHVERTZDLVxcdURFNzJcXHVERTc0LVxcdURFNzdcXHVERTc5LVxcdURFN0NcXHVERTdFXFx1REU4MC1cXHVERTg5XFx1REU4Qi1cXHVERTlCXFx1REVBMS1cXHVERUEzXFx1REVBNS1cXHVERUE5XFx1REVBQi1cXHVERUJCXXxcXHVEODY5W1xcdURDMDAtXFx1REVENlxcdURGMDAtXFx1REZGRl18XFx1RDg2RFtcXHVEQzAwLVxcdURGMzRcXHVERjQwLVxcdURGRkZdfFxcdUQ4NkVbXFx1REMwMC1cXHVEQzFEXFx1REMyMC1cXHVERkZGXXxcXHVEODczW1xcdURDMDAtXFx1REVBMV18XFx1RDg3RVtcXHVEQzAwLVxcdURFMURdfFxcdURCNDBbXFx1REQwMC1cXHVEREVGXSkqJC9cbiAganNpZGVudGlmaWVyX3BhdHRlcm4gPSAvXig/OlskX118XFxwe0lEX1N0YXJ0fSkoPzpbJF9cXHV7MjAwY31cXHV7MjAwZH1dfFxccHtJRF9Db250aW51ZX0pKiQvdTtcblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFhNTCBOYW1lcywgSURzXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLypcblxuICAqIGh0dHBzOi8vd3d3LnczLm9yZy9UUi94bWwvI05ULU5hbWVcbiAgKiBPYnNlcnZlIHRoYXQgaW4gSFRNTDUgKGJ1dCBub3QgZWFybGllciB2ZXJzaW9ucyksIG1vc3QgcmVzdHJpY3Rpb25zIG9uIElEIHZhbHVlcyBoYXZlIGJlZW4gcmVtb3ZlZDsgdG9cbiAgICBxdW90ZTogXCJUaGVyZSBhcmUgbm8gb3RoZXIgcmVzdHJpY3Rpb25zIG9uIHdoYXQgZm9ybSBhbiBJRCBjYW4gdGFrZTsgaW4gcGFydGljdWxhciwgSURzIGNhbiBjb25zaXN0IG9mXG4gICAganVzdCBkaWdpdHMsIHN0YXJ0IHdpdGggYSBkaWdpdCwgc3RhcnQgd2l0aCBhbiB1bmRlcnNjb3JlLCBjb25zaXN0IG9mIGp1c3QgcHVuY3R1YXRpb24sIGV0Yy5cIlxuXG4gIFs0XSAgICAgTmFtZVN0YXJ0Q2hhciAgICA6Oj0gICAgXCI6XCIgfCBbQS1aXSB8IFwiX1wiIHwgW2Etel0gfCBbI3hDMC0jeEQ2XSB8IFsjeEQ4LSN4RjZdIHwgWyN4RjgtI3gyRkZdIHwgWyN4MzcwLSN4MzdEXSB8IFsjeDM3Ri0jeDFGRkZdIHwgWyN4MjAwQy0jeDIwMERdIHwgWyN4MjA3MC0jeDIxOEZdIHwgWyN4MkMwMC0jeDJGRUZdIHwgWyN4MzAwMS0jeEQ3RkZdIHwgWyN4RjkwMC0jeEZEQ0ZdIHwgWyN4RkRGMC0jeEZGRkRdIHwgWyN4MTAwMDAtI3hFRkZGRl1cbiAgWzRhXSAgICBOYW1lQ2hhciAgICAgOjo9ICAgIE5hbWVTdGFydENoYXIgfCBcIi1cIiB8IFwiLlwiIHwgWzAtOV0gfCAjeEI3IHwgWyN4MDMwMC0jeDAzNkZdIHwgWyN4MjAzRi0jeDIwNDBdXG4gIFs1XSAgICAgTmFtZSAgICAgOjo9ICAgIE5hbWVTdGFydENoYXIgKE5hbWVDaGFyKSpcblxuICAgKi9cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBPVEYgR2x5cGggTmFtZXNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvKlxuXG4gIEZyb20gaHR0cHM6Ly9hZG9iZS10eXBlLXRvb2xzLmdpdGh1Yi5pby9hZmRrby9PcGVuVHlwZUZlYXR1cmVGaWxlU3BlY2lmaWNhdGlvbi5odG1sIzIuZi5pXG5cbiAgPiBBIGdseXBoIG5hbWUgbWF5IGJlIHVwIHRvIDYzIGNoYXJhY3RlcnMgaW4gbGVuZ3RoLCBtdXN0IGJlIGVudGlyZWx5IGNvbXByaXNlZCBvZiBjaGFyYWN0ZXJzIGZyb20gdGhlXG4gID4gZm9sbG93aW5nIHNldDpcbiAgPlxuICA+IGBgYFxuICA+IEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaXG4gID4gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXpcbiAgPiAwMTIzNDU2Nzg5XG4gID4gLiAgIyBwZXJpb2RcbiAgPiBfICAjIHVuZGVyc2NvcmVcbiAgPiBgYGBcbiAgPlxuICA+IGFuZCBtdXN0IG5vdCBzdGFydCB3aXRoIGEgZGlnaXQgb3IgcGVyaW9kLiBUaGUgb25seSBleGNlcHRpb24gaXMgdGhlIHNwZWNpYWwgY2hhcmFjdGVyIOKAnC5ub3RkZWbigJ0uXG4gID5cbiAgPiDigJx0d29jZW50c+KAnSwg4oCcYTHigJ0sIGFuZCDigJxf4oCdIGFyZSB2YWxpZCBnbHlwaCBuYW1lcy4g4oCcMmNlbnRz4oCdIGFuZCDigJwudHdvY2VudHPigJ0gYXJlIOKAnG5vdC5cblxuICAqL1xuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFRZUEUgREVDTEFSQVRJT05TXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgdGhpcy5kZWNsYXJlX3R5cGVzID0gZnVuY3Rpb24oKSB7XG4gICAgLyogTk9URSB0byBiZSBjYWxsZWQgYXMgYCggcmVxdWlyZSAnLi9kZWNsYXJhdGlvbnMnICkuZGVjbGFyZV90eXBlcy5hcHBseSBpbnN0YW5jZWAgKi9cbiAgICB0aGlzLmRlY2xhcmUoJ251bGwnLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuIHggPT09IG51bGw7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCd1bmRlZmluZWQnLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuIHggPT09IHZvaWQgMDtcbiAgICB9KTtcbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIHRoaXMuZGVjbGFyZSgnc2FkJywgKHgpID0+IHtcbiAgICAgIHJldHVybiBDSEVDS1MuaXNfc2FkKHgpO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnaGFwcHknLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuIENIRUNLUy5pc19oYXBweSh4KTtcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ3NhZGRlbmVkJywgKHgpID0+IHtcbiAgICAgIHJldHVybiBDSEVDS1MuaXNfc2FkZGVuZWQoeCk7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdzeW1ib2wnLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnc3ltYm9sJztcbiAgICB9KTtcbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIHRoaXMuZGVjbGFyZSgnYm9vbGVhbicsIHtcbiAgICAgIHRlc3RzOiB7XG4gICAgICAgIFwieCBpcyB0cnVlIG9yIGZhbHNlXCI6ICh4KSA9PiB7XG4gICAgICAgICAgcmV0dXJuICh4ID09PSB0cnVlKSB8fCAoeCA9PT0gZmFsc2UpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgY2FzdHM6IHtcbiAgICAgICAgZmxvYXQ6ICh4KSA9PiB7XG4gICAgICAgICAgaWYgKHgpIHtcbiAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIHRoaXMuZGVjbGFyZSgnbmFuJywgKHgpID0+IHtcbiAgICAgIHJldHVybiBOdW1iZXIuaXNOYU4oeCk7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdmaW5pdGUnLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuIE51bWJlci5pc0Zpbml0ZSh4KTtcbiAgICB9KTtcbiAgICB0aGlzLi8qIFRBSU5UIG1ha2Ugc3VyZSBubyBub24tbnVtYmVycyBzbGlwIHRocm91Z2ggKi9kZWNsYXJlKCdpbnRlZ2VyJywgKHgpID0+IHtcbiAgICAgIHJldHVybiBOdW1iZXIuaXNJbnRlZ2VyKHgpO1xuICAgIH0pO1xuICAgIHRoaXMuLyogVEFJTlQgbWFrZSBzdXJlIG5vIG5vbi1udW1iZXJzIHNsaXAgdGhyb3VnaCAqL2RlY2xhcmUoJ3NhZmVpbnRlZ2VyJywgKHgpID0+IHtcbiAgICAgIHJldHVybiBOdW1iZXIuaXNTYWZlSW50ZWdlcih4KTtcbiAgICB9KTtcbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIC8qIEZUVEIgd2UgYXJlIHJldGFpbmluZyBgbnVtYmVyYCBhcyBhIGxlc3MtcHJlZmVycmVkIHN5bm9ueW0gZm9yIGBmbG9hdGA7IGluIHRoZSBmdXR1cmUsIGBudW1iZXJgIG1heVxuICAgICBiZSByZW1vdmVkIGJlY2F1c2UgaXQgY29uZmxpY3RzIHdpdGggSlMgdXNhZ2UgKHdoZXJlIGl0IGluY2x1ZGVzIGBOYU5gIGFuZCBgKy8tSW5maW5pdHlgKSBhbmQsIG1vcmVvdmVyLFxuICAgICBpcyBub3QgdHJ1dGhmdWwgKGJlY2F1c2UgaXQgaXMgYSBwb29yIHJlcHJlc2VudGF0aW9uIG9mIHdoYXQgdGhlIG1vZGVybiB1bmRlcnN0YW5kaW5nIG9mICdudW1iZXInIGluIHRoZVxuICAgICBtYXRoZW1hdGljYWwgc2Vuc2Ugd291bGQgaW1wbHkpLiAqL1xuICAgIC8qIE5PVEUgcmVtb3ZlZCBpbiB2ODogYEBzcGVjcy5udW1iZXIgPSBAc3BlY3MuZmxvYXRgICovXG4gICAgdGhpcy4vKiBUQUlOVCBtYWtlIHN1cmUgbm8gbm9uLW51bWJlcnMgc2xpcCB0aHJvdWdoICovZGVjbGFyZSgnbnVtYmVyJywgKHgpID0+IHtcbiAgICAgIHJldHVybiBmYWxzZTsgLy8gdGhyb3cgbmV3IEVycm9yIFwiXmludGVydHlwZUA4NDc0NF4gdHlwZSAnbnVtYmVyJyBpcyBkZXByZWNhdGVkXCJcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ2Zsb2F0Jywge1xuICAgICAgdGVzdHM6ICh4KSA9PiB7XG4gICAgICAgIHJldHVybiBOdW1iZXIuaXNGaW5pdGUoeCk7XG4gICAgICB9LFxuICAgICAgY2FzdHM6IHtcbiAgICAgICAgYm9vbGVhbjogKHgpID0+IHtcbiAgICAgICAgICBpZiAoeCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGludGVnZXI6ICh4KSA9PiB7XG4gICAgICAgICAgcmV0dXJuIE1hdGgucm91bmQoeCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIHRoaXMuZGVjbGFyZSgnZnJvemVuJywgKHgpID0+IHtcbiAgICAgIHJldHVybiBPYmplY3QuaXNGcm96ZW4oeCk7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdzZWFsZWQnLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuIE9iamVjdC5pc1NlYWxlZCh4KTtcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ2V4dGVuc2libGUnLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuIE9iamVjdC5pc0V4dGVuc2libGUoeCk7XG4gICAgfSk7XG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICB0aGlzLmRlY2xhcmUoJ251bWVyaWMnLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuIChqc190eXBlX29mKHgpKSA9PT0gJ251bWJlcic7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdmdW5jdGlvbicsICh4KSA9PiB7XG4gICAgICByZXR1cm4gKGpzX3R5cGVfb2YoeCkpID09PSAnZnVuY3Rpb24nO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnYXN5bmNmdW5jdGlvbicsICh4KSA9PiB7XG4gICAgICByZXR1cm4gKGpzX3R5cGVfb2YoeCkpID09PSAnYXN5bmNmdW5jdGlvbic7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdnZW5lcmF0b3JmdW5jdGlvbicsICh4KSA9PiB7XG4gICAgICByZXR1cm4gKGpzX3R5cGVfb2YoeCkpID09PSAnZ2VuZXJhdG9yZnVuY3Rpb24nO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnYXN5bmNnZW5lcmF0b3JmdW5jdGlvbicsICh4KSA9PiB7XG4gICAgICByZXR1cm4gKGpzX3R5cGVfb2YoeCkpID09PSAnYXN5bmNnZW5lcmF0b3JmdW5jdGlvbic7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdhc3luY2dlbmVyYXRvcicsICh4KSA9PiB7XG4gICAgICByZXR1cm4gKGpzX3R5cGVfb2YoeCkpID09PSAnYXN5bmNnZW5lcmF0b3InO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnZ2VuZXJhdG9yJywgKHgpID0+IHtcbiAgICAgIHJldHVybiAoanNfdHlwZV9vZih4KSkgPT09ICdnZW5lcmF0b3InO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnZGF0ZScsICh4KSA9PiB7XG4gICAgICByZXR1cm4gKGpzX3R5cGVfb2YoeCkpID09PSAnZGF0ZSc7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdsaXN0aXRlcmF0b3InLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuIChqc190eXBlX29mKHgpKSA9PT0gJ2FycmF5aXRlcmF0b3InO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgndGV4dGl0ZXJhdG9yJywgKHgpID0+IHtcbiAgICAgIHJldHVybiAoanNfdHlwZV9vZih4KSkgPT09ICdzdHJpbmdpdGVyYXRvcic7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdzZXRpdGVyYXRvcicsICh4KSA9PiB7XG4gICAgICByZXR1cm4gKGpzX3R5cGVfb2YoeCkpID09PSAnc2V0aXRlcmF0b3InO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnbWFwaXRlcmF0b3InLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuIChqc190eXBlX29mKHgpKSA9PT0gJ21hcGl0ZXJhdG9yJztcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ2NhbGxhYmxlJywgKHgpID0+IHtcbiAgICAgIHZhciByZWY7XG4gICAgICByZXR1cm4gKHJlZiA9IHRoaXMudHlwZV9vZih4KSkgPT09ICdmdW5jdGlvbicgfHwgcmVmID09PSAnYXN5bmNmdW5jdGlvbicgfHwgcmVmID09PSAnZ2VuZXJhdG9yZnVuY3Rpb24nO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgncHJvbWlzZScsICh4KSA9PiB7XG4gICAgICByZXR1cm4gKHRoaXMuaXNhLm5hdGl2ZXByb21pc2UoeCkpIHx8ICh0aGlzLmlzYS50aGVuYWJsZSh4KSk7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCduYXRpdmVwcm9taXNlJywgKHgpID0+IHtcbiAgICAgIHJldHVybiB4IGluc3RhbmNlb2YgUHJvbWlzZTtcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ3RoZW5hYmxlJywgKHgpID0+IHtcbiAgICAgIHJldHVybiAodGhpcy50eXBlX29mKHggIT0gbnVsbCA/IHgudGhlbiA6IHZvaWQgMCkpID09PSAnZnVuY3Rpb24nO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnaW1tZWRpYXRlJywgZnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuICF0aGlzLmlzYS5wcm9taXNlKHgpO1xuICAgIH0pO1xuICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgdGhpcy5kZWNsYXJlKCd0cnV0aHknLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuICEheDtcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ2ZhbHN5JywgKHgpID0+IHtcbiAgICAgIHJldHVybiAheDtcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ3RydWUnLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuIHggPT09IHRydWU7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdmYWxzZScsICh4KSA9PiB7XG4gICAgICByZXR1cm4geCA9PT0gZmFsc2U7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCd1bnNldCcsICh4KSA9PiB7XG4gICAgICByZXR1cm4geCA9PSBudWxsO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnbm90dW5zZXQnLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuIHggIT0gbnVsbDtcbiAgICB9KTtcbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIHRoaXMuZGVjbGFyZSgnZXZlbicsICh4KSA9PiB7XG4gICAgICByZXR1cm4gKHRoaXMuaXNhLnNhZmVpbnRlZ2VyKHgpKSAmJiAobW9kdWxvKHgsIDIpKSA9PT0gMDtcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ29kZCcsICh4KSA9PiB7XG4gICAgICByZXR1cm4gKHRoaXMuaXNhLnNhZmVpbnRlZ2VyKHgpKSAmJiAobW9kdWxvKHgsIDIpKSA9PT0gMTtcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ2NhcmRpbmFsJywgZnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuICh0aGlzLmlzYS5zYWZlaW50ZWdlcih4KSkgJiYgKHRoaXMuaXNhLm5vbm5lZ2F0aXZlKHgpKTtcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ25vbm5lZ2F0aXZlJywgKHgpID0+IHtcbiAgICAgIHJldHVybiAodGhpcy5pc2EuaW5mbG9hdCh4KSkgJiYgKHggPj0gMCk7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdwb3NpdGl2ZScsICh4KSA9PiB7XG4gICAgICByZXR1cm4gKHRoaXMuaXNhLmluZmxvYXQoeCkpICYmICh4ID4gMCk7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdwb3NpdGl2ZV9mbG9hdCcsICh4KSA9PiB7XG4gICAgICByZXR1cm4gKHRoaXMuaXNhLmZsb2F0KHgpKSAmJiAoeCA+IDApO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgncG9zaXRpdmVfaW50ZWdlcicsICh4KSA9PiB7XG4gICAgICByZXR1cm4gKHRoaXMuaXNhLmludGVnZXIoeCkpICYmICh4ID4gMCk7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCduZWdhdGl2ZV9pbnRlZ2VyJywgKHgpID0+IHtcbiAgICAgIHJldHVybiAodGhpcy5pc2EuaW50ZWdlcih4KSkgJiYgKHggPCAwKTtcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ3plcm8nLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuIHggPT09IDA7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdpbmZpbml0eScsICh4KSA9PiB7XG4gICAgICByZXR1cm4gKHggPT09ICsyZTMwOCkgfHwgKHggPT09IC0yZTMwOCk7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdpbmZsb2F0JywgKHgpID0+IHtcbiAgICAgIHJldHVybiAodGhpcy5pc2EuZmxvYXQoeCkpIHx8ICh4ID09PSAyZTMwOCkgfHwgKHggPT09IC0yZTMwOCk7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdub25wb3NpdGl2ZScsICh4KSA9PiB7XG4gICAgICByZXR1cm4gKHRoaXMuaXNhLmluZmxvYXQoeCkpICYmICh4IDw9IDApO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnbmVnYXRpdmUnLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuICh0aGlzLmlzYS5pbmZsb2F0KHgpKSAmJiAoeCA8IDApO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnbmVnYXRpdmVfZmxvYXQnLCAoeCkgPT4ge1xuICAgICAgcmV0dXJuICh0aGlzLmlzYS5mbG9hdCh4KSkgJiYgKHggPCAwKTtcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ3Byb3Blcl9mcmFjdGlvbicsICh4KSA9PiB7XG4gICAgICByZXR1cm4gKHRoaXMuaXNhLmZsb2F0KHgpKSAmJiAoKDAgPD0geCAmJiB4IDw9IDEpKTtcbiAgICB9KTtcbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIHRoaXMuZGVjbGFyZSgnZW1wdHknLCBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gKHRoaXMuaGFzX3NpemUoeCkpICYmICh0aGlzLnNpemVfb2YoeCkpID09PSAwO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnc2luZ3VsYXInLCBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gKHRoaXMuaGFzX3NpemUoeCkpICYmICh0aGlzLnNpemVfb2YoeCkpID09PSAxO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnbm9uZW1wdHknLCBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gKHRoaXMuaGFzX3NpemUoeCkpICYmICh0aGlzLnNpemVfb2YoeCkpID4gMDtcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ3BsdXJhbCcsIGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiAodGhpcy5oYXNfc2l6ZSh4KSkgJiYgKHRoaXMuc2l6ZV9vZih4KSkgPiAxO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnYmxhbmtfdGV4dCcsIGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiAodGhpcy5pc2EudGV4dCh4KSkgJiYgKCh4Lm1hdGNoKC9eXFxzKiQvdXMpKSAhPSBudWxsKTtcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ25vbmJsYW5rX3RleHQnLCBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gKHRoaXMuaXNhLnRleHQoeCkpICYmICgoeC5tYXRjaCgvXlxccyokL3VzKSkgPT0gbnVsbCk7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdjaHInLCBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gKHRoaXMuaXNhLnRleHQoeCkpICYmICgoeC5tYXRjaCgvXi4kL3VzKSkgIT0gbnVsbCk7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdub25lbXB0eV90ZXh0JywgZnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuICh0aGlzLmlzYS50ZXh0KHgpKSAmJiAodGhpcy5pc2Eubm9uZW1wdHkoeCkpO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnbm9uZW1wdHlfbGlzdCcsIGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiAodGhpcy5pc2EubGlzdCh4KSkgJiYgKHRoaXMuaXNhLm5vbmVtcHR5KHgpKTtcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ25vbmVtcHR5X29iamVjdCcsIGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiAodGhpcy5pc2Eub2JqZWN0KHgpKSAmJiAodGhpcy5pc2Eubm9uZW1wdHkoeCkpO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnbm9uZW1wdHlfc2V0JywgZnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuICh0aGlzLmlzYS5zZXQoeCkpICYmICh0aGlzLmlzYS5ub25lbXB0eSh4KSk7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdub25lbXB0eV9tYXAnLCBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gKHRoaXMuaXNhLm1hcCh4KSkgJiYgKHRoaXMuaXNhLm5vbmVtcHR5KHgpKTtcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ2VtcHR5X3RleHQnLCBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gKHRoaXMuaXNhLnRleHQoeCkpICYmICh0aGlzLmlzYS5lbXB0eSh4KSk7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdlbXB0eV9saXN0JywgZnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuICh0aGlzLmlzYS5saXN0KHgpKSAmJiAodGhpcy5pc2EuZW1wdHkoeCkpO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnZW1wdHlfb2JqZWN0JywgZnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuICh0aGlzLmlzYS5vYmplY3QoeCkpICYmICh0aGlzLmlzYS5lbXB0eSh4KSk7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdlbXB0eV9zZXQnLCBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gKHRoaXMuaXNhLnNldCh4KSkgJiYgKHRoaXMuaXNhLmVtcHR5KHgpKTtcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ2VtcHR5X21hcCcsIGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiAodGhpcy5pc2EubWFwKHgpKSAmJiAodGhpcy5pc2EuZW1wdHkoeCkpO1xuICAgIH0pO1xuICAgIC8vIGlzX2dpdmVuICAgICAgICAgICAgICAgICAgPSAoIHggKSAtPiBub3QgWyBudWxsLCB1bmRlZmluZWQsIE5hTiwgJycsIF0uaW5jbHVkZXMgeFxuICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgdGhpcy5kZWNsYXJlKCdidWZmZXInLCB7XG4gICAgICBzaXplOiAnbGVuZ3RoJ1xuICAgIH0sICh4KSA9PiB7XG4gICAgICByZXR1cm4gQnVmZmVyLmlzQnVmZmVyKHgpO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnYXJyYXlidWZmZXInLCB7XG4gICAgICBzaXplOiAnbGVuZ3RoJ1xuICAgIH0sICh4KSA9PiB7XG4gICAgICByZXR1cm4gKGpzX3R5cGVfb2YoeCkpID09PSAnYXJyYXlidWZmZXInO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnaW50OGFycmF5Jywge1xuICAgICAgc2l6ZTogJ2xlbmd0aCdcbiAgICB9LCAoeCkgPT4ge1xuICAgICAgcmV0dXJuIChqc190eXBlX29mKHgpKSA9PT0gJ2ludDhhcnJheSc7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCd1aW50OGFycmF5Jywge1xuICAgICAgc2l6ZTogJ2xlbmd0aCdcbiAgICB9LCAoeCkgPT4ge1xuICAgICAgcmV0dXJuIChqc190eXBlX29mKHgpKSA9PT0gJ3VpbnQ4YXJyYXknO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgndWludDhjbGFtcGVkYXJyYXknLCB7XG4gICAgICBzaXplOiAnbGVuZ3RoJ1xuICAgIH0sICh4KSA9PiB7XG4gICAgICByZXR1cm4gKGpzX3R5cGVfb2YoeCkpID09PSAndWludDhjbGFtcGVkYXJyYXknO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnaW50MTZhcnJheScsIHtcbiAgICAgIHNpemU6ICdsZW5ndGgnXG4gICAgfSwgKHgpID0+IHtcbiAgICAgIHJldHVybiAoanNfdHlwZV9vZih4KSkgPT09ICdpbnQxNmFycmF5JztcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ3VpbnQxNmFycmF5Jywge1xuICAgICAgc2l6ZTogJ2xlbmd0aCdcbiAgICB9LCAoeCkgPT4ge1xuICAgICAgcmV0dXJuIChqc190eXBlX29mKHgpKSA9PT0gJ3VpbnQxNmFycmF5JztcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ2ludDMyYXJyYXknLCB7XG4gICAgICBzaXplOiAnbGVuZ3RoJ1xuICAgIH0sICh4KSA9PiB7XG4gICAgICByZXR1cm4gKGpzX3R5cGVfb2YoeCkpID09PSAnaW50MzJhcnJheSc7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCd1aW50MzJhcnJheScsIHtcbiAgICAgIHNpemU6ICdsZW5ndGgnXG4gICAgfSwgKHgpID0+IHtcbiAgICAgIHJldHVybiAoanNfdHlwZV9vZih4KSkgPT09ICd1aW50MzJhcnJheSc7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdmbG9hdDMyYXJyYXknLCB7XG4gICAgICBzaXplOiAnbGVuZ3RoJ1xuICAgIH0sICh4KSA9PiB7XG4gICAgICByZXR1cm4gKGpzX3R5cGVfb2YoeCkpID09PSAnZmxvYXQzMmFycmF5JztcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ2Zsb2F0NjRhcnJheScsIHtcbiAgICAgIHNpemU6ICdsZW5ndGgnXG4gICAgfSwgKHgpID0+IHtcbiAgICAgIHJldHVybiAoanNfdHlwZV9vZih4KSkgPT09ICdmbG9hdDY0YXJyYXknO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnbGlzdCcsIHtcbiAgICAgIHNpemU6ICdsZW5ndGgnXG4gICAgfSwgKHgpID0+IHtcbiAgICAgIHJldHVybiAoanNfdHlwZV9vZih4KSkgPT09ICdhcnJheSc7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdzZXQnLCB7XG4gICAgICBzaXplOiAnc2l6ZSdcbiAgICB9LCBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gKGpzX3R5cGVfb2YoeCkpID09PSAnc2V0JztcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ21hcCcsIHtcbiAgICAgIHNpemU6ICdzaXplJ1xuICAgIH0sIGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiAoanNfdHlwZV9vZih4KSkgPT09ICdtYXAnO1xuICAgIH0pO1xuICAgIHRoaXMuZGVjbGFyZSgnd2Vha21hcCcsIGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiAoanNfdHlwZV9vZih4KSkgPT09ICd3ZWFrbWFwJztcbiAgICB9KTtcbiAgICB0aGlzLmRlY2xhcmUoJ3dlYWtzZXQnLCBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gKGpzX3R5cGVfb2YoeCkpID09PSAnd2Vha3NldCc7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdlcnJvcicsIGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiAoanNfdHlwZV9vZih4KSkgPT09ICdlcnJvcic7XG4gICAgfSk7XG4gICAgdGhpcy5kZWNsYXJlKCdyZWdleCcsIGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiAoanNfdHlwZV9vZih4KSkgPT09ICdyZWdleHAnO1xuICAgIH0pO1xuICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgdGhpcy5kZWNsYXJlKCdvYmplY3QnLCB7XG4gICAgICB0ZXN0czogKHgpID0+IHtcbiAgICAgICAgcmV0dXJuIChqc190eXBlX29mKHgpKSA9PT0gJ29iamVjdCc7XG4gICAgICB9LFxuICAgICAgc2l6ZTogKHgpID0+IHtcbiAgICAgICAgcmV0dXJuIChPYmplY3Qua2V5cyh4KSkubGVuZ3RoO1xuICAgICAgfVxuICAgIH0pO1xuICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgdGhpcy5kZWNsYXJlKCdnbG9iYWwnLCB7XG4gICAgICB0ZXN0czogKHgpID0+IHtcbiAgICAgICAgcmV0dXJuIChqc190eXBlX29mKHgpKSA9PT0gJ2dsb2JhbCc7XG4gICAgICB9LFxuICAgICAgc2l6ZTogKHgpID0+IHtcbiAgICAgICAgcmV0dXJuIChPYmplY3Qua2V5cyh4KSkubGVuZ3RoO1xuICAgICAgfVxuICAgIH0pO1xuICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgdGhpcy5kZWNsYXJlKCd0ZXh0Jywge1xuICAgICAgdGVzdHM6ICh4KSA9PiB7XG4gICAgICAgIHJldHVybiAoanNfdHlwZV9vZih4KSkgPT09ICdzdHJpbmcnO1xuICAgICAgfSxcbiAgICAgIHNpemU6IGZ1bmN0aW9uKHgsIHNlbGVjdG9yID0gJ2NvZGV1bml0cycpIHtcbiAgICAgICAgdmFyIHJlZjtcbiAgICAgICAgc3dpdGNoIChzZWxlY3Rvcikge1xuICAgICAgICAgIGNhc2UgJ2NvZGVwb2ludHMnOlxuICAgICAgICAgICAgcmV0dXJuIChBcnJheS5mcm9tKHgpKS5sZW5ndGg7XG4gICAgICAgICAgY2FzZSAnY29kZXVuaXRzJzpcbiAgICAgICAgICAgIHJldHVybiB4Lmxlbmd0aDtcbiAgICAgICAgICBjYXNlICdieXRlcyc6XG4gICAgICAgICAgICByZXR1cm4gQnVmZmVyLmJ5dGVMZW5ndGgoeCwgKHJlZiA9IHR5cGVvZiBzZXR0aW5ncyAhPT0gXCJ1bmRlZmluZWRcIiAmJiBzZXR0aW5ncyAhPT0gbnVsbCA/IHNldHRpbmdzWydlbmNvZGluZyddIDogdm9pZCAwKSAhPSBudWxsID8gcmVmIDogJ3V0Zi04Jyk7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgdW5rbm93biBjb3VudGluZyBzZWxlY3RvciAke3JwcihzZWxlY3Rvcil9YCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIHRoaXMuZGVjbGFyZSgnbGlzdF9vZicsIHtcbiAgICAgIHRlc3RzOiB7XG4gICAgICAgIFwieCBpcyBhIGxpc3RcIjogKHR5cGUsIHgsIC4uLnhQKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuaXNhLmxpc3QoeCk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qIFRBSU5UIHNob3VsZCBjaGVjayBmb3IgYEBpc2EudHlwZSB0eXBlYCAqL1xuICAgICAgICBcInR5cGUgaXMgbm9uZW1wdHlfdGV4dFwiOiAodHlwZSwgeCwgLi4ueFApID0+IHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5pc2Eubm9uZW1wdHlfdGV4dCh0eXBlKTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJhbGwgZWxlbWVudHMgcGFzcyB0ZXN0XCI6ICh0eXBlLCB4LCAuLi54UCkgPT4ge1xuICAgICAgICAgIHJldHVybiB4LmV2ZXJ5KCh4eCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNhKHR5cGUsIHh4LCAuLi54UCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIHRoaXMuZGVjbGFyZSgnb2JqZWN0X29mJywge1xuICAgICAgdGVzdHM6IHtcbiAgICAgICAgXCJ4IGlzIGEgb2JqZWN0XCI6ICh0eXBlLCB4LCAuLi54UCkgPT4ge1xuICAgICAgICAgIHJldHVybiB0aGlzLmlzYS5vYmplY3QoeCk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qIFRBSU5UIHNob3VsZCBjaGVjayBmb3IgYEBpc2EudHlwZSB0eXBlYCAqL1xuICAgICAgICBcInR5cGUgaXMgbm9uZW1wdHlfdGV4dFwiOiAodHlwZSwgeCwgLi4ueFApID0+IHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5pc2Eubm9uZW1wdHlfdGV4dCh0eXBlKTtcbiAgICAgICAgfSxcbiAgICAgICAgXCJhbGwgZWxlbWVudHMgcGFzcyB0ZXN0XCI6ICh0eXBlLCB4LCAuLi54UCkgPT4ge1xuICAgICAgICAgIHZhciBfLCB4eDtcbiAgICAgICAgICBmb3IgKF8gaW4geCkge1xuICAgICAgICAgICAgeHggPSB4W19dO1xuICAgICAgICAgICAgaWYgKCF0aGlzLmlzYSh0eXBlLCB4eCwgLi4ueFApKSB7XG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIHRoaXMuZGVjbGFyZSgnanNpZGVudGlmaWVyJywge1xuICAgICAgdGVzdHM6ICh4KSA9PiB7XG4gICAgICAgIHJldHVybiAodGhpcy5pc2EudGV4dCh4KSkgJiYganNpZGVudGlmaWVyX3BhdHRlcm4udGVzdCh4KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIHRoaXMuZGVjbGFyZSgnaW50MnRleHQnLCB7XG4gICAgICB0ZXN0czogKHgpID0+IHtcbiAgICAgICAgcmV0dXJuICh0aGlzLmlzYS50ZXh0KHgpKSAmJiAoKHgubWF0Y2goL15bMDFdKyQvKSkgIT0gbnVsbCk7XG4gICAgICB9LFxuICAgICAgY2FzdHM6IHtcbiAgICAgICAgZmxvYXQ6ICh4KSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHBhcnNlSW50KHgsIDIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICB0aGlzLmRlY2xhcmUoJ2ludDEwdGV4dCcsIHtcbiAgICAgIHRlc3RzOiAoeCkgPT4ge1xuICAgICAgICByZXR1cm4gKHRoaXMuaXNhLnRleHQoeCkpICYmICgoeC5tYXRjaCgvXlswLTldKyQvKSkgIT0gbnVsbCk7XG4gICAgICB9LFxuICAgICAgY2FzdHM6IHtcbiAgICAgICAgZmxvYXQ6ICh4KSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHBhcnNlSW50KHgsIDEwKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgdGhpcy5kZWNsYXJlKCdpbnQxNnRleHQnLCB7XG4gICAgICB0ZXN0czogKHgpID0+IHtcbiAgICAgICAgcmV0dXJuICh0aGlzLmlzYS50ZXh0KHgpKSAmJiAoKHgubWF0Y2goL15bMC05YS1mQS1GXSskLykpICE9IG51bGwpO1xuICAgICAgfSxcbiAgICAgIGNhc3RzOiB7XG4gICAgICAgIGZsb2F0OiAoeCkgPT4ge1xuICAgICAgICAgIHJldHVybiBwYXJzZUludCh4LCAxNik7XG4gICAgICAgIH0sXG4gICAgICAgIGludDJ0ZXh0OiAoeCkgPT4ge1xuICAgICAgICAgIHJldHVybiAocGFyc2VJbnQoeCwgMTYpKS50b1N0cmluZygyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgdGhpcy4vKiBUQUlOVCBjb3VsZCB1c2UgYGNhc3QoKWAgQVBJICovZGVjbGFyZSgnaW50MzInLCBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gKHRoaXMuaXNhLmludGVnZXIoeCkpICYmICgoLTIxNDc0ODM2NDggPD0geCAmJiB4IDw9IDIxNDc0ODM2NDcpKTtcbiAgICB9KTtcbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIHRoaXMuZGVjbGFyZSgndm5yJywgZnVuY3Rpb24oeCkge1xuICAgICAgLyogQSB2ZWN0b3JpYWwgbnVtYmVyIChWTlIpIGlzIGEgbm9uLWVtcHR5IGFycmF5IG9mIG51bWJlcnMsIGluY2x1ZGluZyBpbmZpbml0eS4gKi9cbiAgICAgIHJldHVybiAodGhpcy5pc2FfbGlzdF9vZi5pbmZsb2F0KHgpKSAmJiAoeC5sZW5ndGggPiAwKTtcbiAgICB9KTtcbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIHJldHVybiB0aGlzLmRlY2xhcmUoJ2ZzX3N0YXRzJywge1xuICAgICAgdGVzdHM6IHtcbiAgICAgICAgJ3ggaXMgYW4gb2JqZWN0JzogZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLmlzYS5vYmplY3QoeCk7XG4gICAgICAgIH0sXG4gICAgICAgICd4LnNpemUgaXMgYSBjYXJkaW5hbCc6IGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5pc2EuY2FyZGluYWwoeC5zaXplKTtcbiAgICAgICAgfSxcbiAgICAgICAgJ3guYXRpbWVNcyBpcyBhIGZsb2F0JzogZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLmlzYS5mbG9hdCh4LmF0aW1lTXMpO1xuICAgICAgICB9LFxuICAgICAgICAneC5hdGltZSBpcyBhIGRhdGUnOiBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuaXNhLmRhdGUoeC5hdGltZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFRZUEUgREVDTEFSQVRJT05TXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgdGhpcy5kZWNsYXJlX2NoZWNrcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBGUywgUEFUSDtcbiAgICBQQVRIID0gcmVxdWlyZSgncGF0aCcpO1xuICAgIEZTID0gcmVxdWlyZSgnZnMnKTtcbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIC8qIE5PVEU6IHdpbGwgdGhyb3cgZXJyb3IgdW5sZXNzIHBhdGggZXhpc3RzLCBlcnJvciBpcyBpbXBsaWNpdGx5IGNhdWdodCwgcmVwcmVzZW50cyBzYWQgcGF0aCAqL1xuICAgIHRoaXMuZGVjbGFyZV9jaGVjaygnZnNvX2V4aXN0cycsIGZ1bmN0aW9uKHBhdGgsIHN0YXRzID0gbnVsbCkge1xuICAgICAgcmV0dXJuIEZTLnN0YXRTeW5jKHBhdGgpO1xuICAgIH0pO1xuICAgIC8vIHRyeSAoIHN0YXRzID8gRlMuc3RhdFN5bmMgcGF0aCApIGNhdGNoIGVycm9yIHRoZW4gZXJyb3JcbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIHRoaXMuZGVjbGFyZV9jaGVjaygnaXNfZmlsZScsIGZ1bmN0aW9uKHBhdGgsIHN0YXRzID0gbnVsbCkge1xuICAgICAgdmFyIGJhZDtcbiAgICAgIGlmICh0aGlzLmlzX3NhZCgoYmFkID0gc3RhdHMgPSB0aGlzLmNoZWNrLmZzb19leGlzdHMocGF0aCwgc3RhdHMpKSkpIHtcbiAgICAgICAgcmV0dXJuIGJhZDtcbiAgICAgIH1cbiAgICAgIGlmIChzdGF0cy5pc0ZpbGUoKSkge1xuICAgICAgICByZXR1cm4gc3RhdHM7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5zYWRkZW4oYG5vdCBhIGZpbGU6ICR7cGF0aH1gKTtcbiAgICB9KTtcbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIHJldHVybiB0aGlzLmRlY2xhcmVfY2hlY2soJ2lzX2pzb25fZmlsZScsIGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgIHZhciBlcnJvcjtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBKU09OLnBhcnNlKEZTLnJlYWRGaWxlU3luYyhwYXRoKSk7XG4gICAgICB9IGNhdGNoIChlcnJvcjEpIHtcbiAgICAgICAgZXJyb3IgPSBlcnJvcjE7XG4gICAgICAgIHJldHVybiBlcnJvcjtcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcblxuICAvLyAjLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4vLyBAZGVjbGFyZV9jaGVjayAnZXF1YWxzJywgKCBhLCBQLi4uICkgLT5cbi8vICAgZm9yIGIgaW4gUFxuLy8gICAgIHJldHVybiBDSEVDS1Muc2FkIHVubGVzcyBlcXVhbHMgYSwgYlxuLy8gICByZXR1cm4gdHJ1ZVxuLyogbm90IHN1cHBvcnRlZCB1bnRpbCB3ZSBmaWd1cmUgb3V0IGhvdyB0byBkbyBpdCBpbiBzdHJpY3QgbW9kZTogKi9cbi8vIEBkZWNsYXJlICdhcmd1bWVudHMnLCAgICAgICAgICAgICAgICAgICAgICggeCApIC0+ICgganNfdHlwZV9vZiB4ICkgaXMgJ2FyZ3VtZW50cydcblxuICAvLyBBcnJheS5pc0FycmF5XG4vLyBBcnJheUJ1ZmZlci5pc1ZpZXdcbi8vIEF0b21pY3MuaXNMb2NrRnJlZVxuLy8gQnVmZmVyLmlzQnVmZmVyXG4vLyBCdWZmZXIuaXNFbmNvZGluZ1xuLy8gY29uc3RydWN0b3IuaXNcbi8vIGNvbnN0cnVjdG9yLmlzRXh0ZW5zaWJsZVxuLy8gY29uc3RydWN0b3IuaXNGcm96ZW5cbi8vIGNvbnN0cnVjdG9yLmlzU2VhbGVkXG4vLyBOdW1iZXIuaXNGaW5pdGVcbi8vIE51bWJlci5pc0ludGVnZXJcbi8vIE51bWJlci5pc05hTlxuLy8gTnVtYmVyLmlzU2FmZUludGVnZXJcbi8vIE9iamVjdC5pc1xuLy8gT2JqZWN0LmlzRXh0ZW5zaWJsZVxuLy8gT2JqZWN0LmlzRnJvemVuXG4vLyBPYmplY3QuaXNTZWFsZWRcbi8vIFJlZmxlY3QuaXNFeHRlbnNpYmxlXG4vLyByb290LmlzRmluaXRlXG4vLyByb290LmlzTmFOXG4vLyBTeW1ib2wuaXNDb25jYXRTcHJlYWRhYmxlXG5cbn0pLmNhbGwodGhpcyk7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRlY2xhcmF0aW9ucy5qcy5tYXAiLCIoZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgdmFyIGFzc2lnbiwgY29uc3RydWN0b3Jfb2ZfZ2VuZXJhdG9ycywgY29weV9pZl9vcmlnaW5hbCwgaXNhX2NvcHksIGpyLCBqc190eXBlX29mLCBycHIsIHhycHIsXG4gICAgaW5kZXhPZiA9IFtdLmluZGV4T2Y7XG5cbiAgLy8jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuICAoe2Fzc2lnbiwganIsIHJwciwgeHJwciwganNfdHlwZV9vZn0gPSByZXF1aXJlKCcuL2hlbHBlcnMnKSk7XG5cbiAgaXNhX2NvcHkgPSBTeW1ib2woJ2lzYV9jb3B5Jyk7XG5cbiAgY29uc3RydWN0b3Jfb2ZfZ2VuZXJhdG9ycyA9ICgoZnVuY3Rpb24qKCkge1xuICAgIHJldHVybiAoeWllbGQgNDIpO1xuICB9KSgpKS5jb25zdHJ1Y3RvcjtcblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8qIFRBSU5UIG1ha2UgY2F0YWxvZyBvZiBhbGwgJ2RlZXAgSlMnIG5hbWVzIHRoYXQgbXVzdCBuZXZlciBiZSB1c2VkIGFzIHR5cGVzLCBiL2MgZS5nIGEgdHlwZSAnYmluZCdcbiAgd291bGQgc2hhZG93IG5hdGl2ZSBgZi5iaW5kKClgICovXG4gIHRoaXMuaWxsZWdhbF90eXBlcyA9IFsnYmluZCcsICd0b1N0cmluZycsICd2YWx1ZU9mJ107XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBjb3B5X2lmX29yaWdpbmFsID0gZnVuY3Rpb24oeCkge1xuICAgIHZhciBSO1xuICAgIGlmICh4W2lzYV9jb3B5XSkge1xuICAgICAgcmV0dXJuIHg7XG4gICAgfVxuICAgIFIgPSBhc3NpZ24oe30sIHgpO1xuICAgIFJbaXNhX2NvcHldID0gdHJ1ZTtcbiAgICByZXR1cm4gUjtcbiAgfTtcblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHRoaXMuX3NhdGlzZmllc19hbGxfYXNwZWN0cyA9IGZ1bmN0aW9uKHR5cGUsIC4uLnhQKSB7XG4gICAgaWYgKCh0aGlzLl9nZXRfdW5zYXRpc2ZpZWRfYXNwZWN0KHR5cGUsIC4uLnhQKSkgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHRoaXMuX2dldF91bnNhdGlzZmllZF9hc3BlY3QgPSBmdW5jdGlvbih0eXBlLCAuLi54UCkge1xuICAgIHZhciBhc3BlY3QsIGZhY3R1YWxfdHlwZSwgcmVmLCBzcGVjLCB0ZXN0O1xuICAgIC8qIENoZWNrIHdpdGggYHR5cGVfb2YoKWAgaWYgdHlwZSBub3QgaW4gc3BlYzogKi9cbiAgICBpZiAoKHNwZWMgPSB0aGlzLnNwZWNzW3R5cGVdKSA9PSBudWxsKSB7XG4gICAgICBpZiAoKGZhY3R1YWxfdHlwZSA9IHRoaXMudHlwZV9vZiguLi54UCkpID09PSB0eXBlKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGAke3Jwcih0eXBlKX0gaXMgYSBrbm93biB0eXBlYDtcbiAgICB9XG4gICAgcmVmID0gc3BlYy50ZXN0cztcbiAgICAvKiBDaGVjayBhbGwgY29uc3RyYWludHMgaW4gc3BlYzogKi9cbiAgICBmb3IgKGFzcGVjdCBpbiByZWYpIHtcbiAgICAgIHRlc3QgPSByZWZbYXNwZWN0XTtcbiAgICAgIGlmICghdGVzdC5hcHBseSh0aGlzLCB4UCkpIHtcbiAgICAgICAgcmV0dXJuIGFzcGVjdDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH07XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB0aGlzLnR5cGVfb2YgPSBmdW5jdGlvbih4KSB7XG4gICAgdmFyIFIsIGFyaXR5LCBjLCB0YWduYW1lO1xuICAgIGlmICgoYXJpdHkgPSBhcmd1bWVudHMubGVuZ3RoKSAhPT0gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBeNzc0Nl4gZXhwZWN0ZWQgMSBhcmd1bWVudCwgZ290ICR7YXJpdHl9YCk7XG4gICAgfVxuICAgIGlmICh4ID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gJ251bGwnO1xuICAgIH1cbiAgICBpZiAoeCA9PT0gdm9pZCAwKSB7XG4gICAgICByZXR1cm4gJ3VuZGVmaW5lZCc7XG4gICAgfVxuICAgIGlmICgoeCA9PT0gMmUzMDgpIHx8ICh4ID09PSAtMmUzMDgpKSB7XG4gICAgICByZXR1cm4gJ2luZmluaXR5JztcbiAgICB9XG4gICAgaWYgKCh4ID09PSB0cnVlKSB8fCAoeCA9PT0gZmFsc2UpKSB7XG4gICAgICByZXR1cm4gJ2Jvb2xlYW4nO1xuICAgIH1cbiAgICBpZiAoTnVtYmVyLmlzTmFOKHgpKSB7XG4gICAgICByZXR1cm4gJ25hbic7XG4gICAgfVxuICAgIGlmIChCdWZmZXIuaXNCdWZmZXIoeCkpIHtcbiAgICAgIHJldHVybiAnYnVmZmVyJztcbiAgICB9XG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICBpZiAoKCh0YWduYW1lID0geFtTeW1ib2wudG9TdHJpbmdUYWddKSAhPSBudWxsKSAmJiAodHlwZW9mIHRhZ25hbWUpID09PSAnc3RyaW5nJykge1xuICAgICAgaWYgKHRhZ25hbWUgPT09ICdBcnJheSBJdGVyYXRvcicpIHtcbiAgICAgICAgcmV0dXJuICdhcnJheWl0ZXJhdG9yJztcbiAgICAgIH1cbiAgICAgIGlmICh0YWduYW1lID09PSAnU3RyaW5nIEl0ZXJhdG9yJykge1xuICAgICAgICByZXR1cm4gJ3N0cmluZ2l0ZXJhdG9yJztcbiAgICAgIH1cbiAgICAgIGlmICh0YWduYW1lID09PSAnTWFwIEl0ZXJhdG9yJykge1xuICAgICAgICByZXR1cm4gJ21hcGl0ZXJhdG9yJztcbiAgICAgIH1cbiAgICAgIGlmICh0YWduYW1lID09PSAnU2V0IEl0ZXJhdG9yJykge1xuICAgICAgICByZXR1cm4gJ3NldGl0ZXJhdG9yJztcbiAgICAgIH1cbiAgICAgIHJldHVybiB0YWduYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgfVxuICAgIGlmICgoYyA9IHguY29uc3RydWN0b3IpID09PSB2b2lkIDApIHtcbiAgICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgICAvKiBEb21lbmljIERlbmljb2xhIERldmljZSwgc2VlIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8zMDU2MDU4MSAqL1xuICAgICAgcmV0dXJuICdudWxsb2JqZWN0JztcbiAgICB9XG4gICAgaWYgKCh0eXBlb2YgYykgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiAnb2JqZWN0JztcbiAgICB9XG4gICAgaWYgKChSID0gYy5uYW1lLnRvTG93ZXJDYXNlKCkpID09PSAnJykge1xuICAgICAgaWYgKHguY29uc3RydWN0b3IgPT09IGNvbnN0cnVjdG9yX29mX2dlbmVyYXRvcnMpIHtcbiAgICAgICAgcmV0dXJuICdnZW5lcmF0b3InO1xuICAgICAgfVxuICAgICAgLyogTk9URTogdGhyb3cgZXJyb3Igc2luY2UgdGhpcyBzaG91bGQgbmV2ZXIgaGFwcGVuICovXG4gICAgICByZXR1cm4gKChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeCkpLnNsaWNlKDgsIC0xKSkudG9Mb3dlckNhc2UoKTtcbiAgICB9XG4gICAgaWYgKCh0eXBlb2YgeCA9PT0gJ29iamVjdCcpICYmIChSID09PSAnYm9vbGVhbicgfHwgUiA9PT0gJ251bWJlcicgfHwgUiA9PT0gJ3N0cmluZycpKSB7XG4vLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuLyogTWFyayBNaWxsZXIgRGV2aWNlICovICAgICAgcmV0dXJuICd3cmFwcGVyJztcbiAgICB9XG4gICAgaWYgKFIgPT09ICdudW1iZXInKSB7XG4gICAgICByZXR1cm4gJ2Zsb2F0JztcbiAgICB9XG4gICAgaWYgKFIgPT09ICdyZWdleHAnKSB7XG4gICAgICByZXR1cm4gJ3JlZ2V4JztcbiAgICB9XG4gICAgaWYgKFIgPT09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gJ3RleHQnO1xuICAgIH1cbiAgICBpZiAoUiA9PT0gJ2FycmF5Jykge1xuICAgICAgcmV0dXJuICdsaXN0JztcbiAgICB9XG4gICAgaWYgKFIgPT09ICdmdW5jdGlvbicgJiYgeC50b1N0cmluZygpLnN0YXJ0c1dpdGgoJ2NsYXNzICcpKSB7XG4gICAgICAvKiB0aHggdG8gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9hLzI5MDk0MjA5ICovXG4gICAgICAvKiBUQUlOVCBtYXkgcHJvZHVjZSBhbiBhcmJpdHJhcmlseSBsb25nIHRocm93YXdheSBzdHJpbmcgKi9cbiAgICAgIHJldHVybiAnY2xhc3MnO1xuICAgIH1cbiAgICByZXR1cm4gUjtcbiAgfTtcblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHRoaXMudHlwZXNfb2YgPSBmdW5jdGlvbiguLi54UCkge1xuICAgIHZhciBSLCBhc3BlY3QsIG9rLCByZWYsIHJlZjEsIHNwZWMsIHRlc3QsIHR5cGU7XG4gICAgUiA9IFtdO1xuICAgIHJlZiA9IHRoaXMuc3BlY3M7XG4gICAgZm9yICh0eXBlIGluIHJlZikge1xuICAgICAgc3BlYyA9IHJlZlt0eXBlXTtcbiAgICAgIG9rID0gdHJ1ZTtcbiAgICAgIHJlZjEgPSBzcGVjLnRlc3RzO1xuICAgICAgZm9yIChhc3BlY3QgaW4gcmVmMSkge1xuICAgICAgICB0ZXN0ID0gcmVmMVthc3BlY3RdO1xuICAgICAgICBpZiAoIXRlc3QuYXBwbHkodGhpcywgeFApKSB7XG4gICAgICAgICAgb2sgPSBmYWxzZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKG9rKSB7XG4gICAgICAgIFIucHVzaCh0eXBlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIFI7XG4gIH07XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB0aGlzLmRlY2xhcmUgPSBmdW5jdGlvbiguLi5QKS8qIHR5cGUsIHNwZWM/LCB0ZXN0PyAqLyB7XG4gICAgdmFyIGFyaXR5O1xuICAgIHN3aXRjaCAoYXJpdHkgPSBQLmxlbmd0aCkge1xuICAgICAgY2FzZSAxOlxuICAgICAgICByZXR1cm4gdGhpcy5fZGVjbGFyZV8xKC4uLlApO1xuICAgICAgY2FzZSAyOlxuICAgICAgICByZXR1cm4gdGhpcy5fZGVjbGFyZV8yKC4uLlApO1xuICAgICAgY2FzZSAzOlxuICAgICAgICByZXR1cm4gdGhpcy5fZGVjbGFyZV8zKC4uLlApO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYMK1Njc0NiBleHBlY3RlZCBiZXR3ZWVuIDEgYW5kIDMgYXJndW1lbnRzLCBnb3QgJHthcml0eX1gKTtcbiAgfTtcblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHRoaXMuX2RlY2xhcmVfMSA9IGZ1bmN0aW9uKHNwZWMpIHtcbiAgICB2YXIgVDtcbiAgICBpZiAoKFQgPSBqc190eXBlX29mKHNwZWMpKSAhPT0gJ29iamVjdCcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgwrU2ODY5IGV4cGVjdGVkIGFuIG9iamVjdCBmb3Igc3BlYywgZ290IGEgJHtUfWApO1xuICAgIH1cbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIGlmICgoVCA9IGpzX3R5cGVfb2Yoc3BlYy50eXBlKSkgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYMK1Njk5MiBleHBlY3RlZCBhIHRleHQgZm9yIHNwZWMudHlwZSwgZ290IGEgJHtUfWApO1xuICAgIH1cbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIHN3aXRjaCAoKFQgPSBqc190eXBlX29mKHNwZWMudGVzdHMpKSkge1xuICAgICAgY2FzZSAnZnVuY3Rpb24nOlxuICAgICAgICBzcGVjLnRlc3RzID0ge1xuICAgICAgICAgIG1haW46IHNwZWMudGVzdHNcbiAgICAgICAgfTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICBudWxsO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgwrU3MTE1IGV4cGVjdGVkIGFuIG9iamVjdCBmb3Igc3BlYy50ZXN0cywgZ290IGEgJHtUfWApO1xuICAgIH1cbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIHJldHVybiB0aGlzLl9kZWNsYXJlKHNwZWMpO1xuICB9O1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgdGhpcy5fZGVjbGFyZV8yID0gZnVuY3Rpb24odHlwZSwgc3BlY19vcl90ZXN0KSB7XG4gICAgdmFyIFQsIHNwZWM7XG4gICAgc3dpdGNoIChUID0ganNfdHlwZV9vZihzcGVjX29yX3Rlc3QpKSB7XG4gICAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAgIGNhc2UgJ2Z1bmN0aW9uJzpcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlY2xhcmVfMSh7XG4gICAgICAgICAgdHlwZSxcbiAgICAgICAgICB0ZXN0czoge1xuICAgICAgICAgICAgbWFpbjogc3BlY19vcl90ZXN0XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgICAgY2FzZSAnYXN5bmNmdW5jdGlvbic6XG4gICAgICAgIHRocm93IFwiwrU3MjM4IGFzeW5jaHJvbm91cyBmdW5jdGlvbnMgbm90IHlldCBzdXBwb3J0ZWRcIjtcbiAgICB9XG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICBpZiAoVCAhPT0gJ29iamVjdCcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgwrU3MzYxIGV4cGVjdGVkIGFuIG9iamVjdCwgZ290IGEgJHtUfSBmb3Igc3BlY2ApO1xuICAgIH1cbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIGlmICgoc3BlY19vcl90ZXN0LnR5cGUgIT0gbnVsbCkgJiYgKCFzcGVjX29yX3Rlc3QudHlwZSA9PT0gdHlwZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgwrU3NDg0IHR5cGUgZGVjbGFyYXRpb25zICR7cnByKHR5cGUpfSBhbmQgJHtycHIoc3BlY19vcl90ZXN0LnR5cGUpfSBkbyBub3QgbWF0Y2hgKTtcbiAgICB9XG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICBzcGVjID0gY29weV9pZl9vcmlnaW5hbChzcGVjX29yX3Rlc3QpO1xuICAgIHNwZWMudHlwZSA9IHR5cGU7XG4gICAgcmV0dXJuIHRoaXMuX2RlY2xhcmVfMShzcGVjKTtcbiAgfTtcblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHRoaXMuX2RlY2xhcmVfMyA9IGZ1bmN0aW9uKHR5cGUsIHNwZWMsIHRlc3QpIHtcbiAgICB2YXIgVDtcbiAgICBpZiAoKFQgPSBqc190eXBlX29mKHNwZWMpKSAhPT0gJ29iamVjdCcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgwrU3NjA3IGV4cGVjdGVkIGFuIG9iamVjdCwgZ290IGEgJHtUfSBmb3Igc3BlY2ApO1xuICAgIH1cbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIGlmICgoVCA9IGpzX3R5cGVfb2YodGVzdCkpICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYMK1NzczMCBleHBlY3RlZCBhIGZ1bmN0aW9uIGZvciB0ZXN0LCBnb3QgYSAke1R9YCk7XG4gICAgfVxuICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgaWYgKHNwZWMudGVzdHMgIT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiwrU3ODUzIHNwZWMgY2Fubm90IGhhdmUgdGVzdHMgd2hlbiB0ZXN0cyBhcmUgcGFzc2VkIGFzIGFyZ3VtZW50XCIpO1xuICAgIH1cbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIHNwZWMgPSBjb3B5X2lmX29yaWdpbmFsKHNwZWMpO1xuICAgIHNwZWMudGVzdHMgPSB7XG4gICAgICBtYWluOiB0ZXN0XG4gICAgfTtcbiAgICByZXR1cm4gdGhpcy5fZGVjbGFyZV8yKHR5cGUsIHNwZWMpO1xuICB9O1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgdGhpcy5fZGVjbGFyZSA9IGZ1bmN0aW9uKHNwZWMpIHtcbiAgICB2YXIgdHlwZTtcbiAgICBzcGVjID0gY29weV9pZl9vcmlnaW5hbChzcGVjKTtcbiAgICBkZWxldGUgc3BlY1tpc2FfY29weV07XG4gICAgKHt0eXBlfSA9IHNwZWMpO1xuICAgIHNwZWMudHlwZSA9IHR5cGU7XG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICBpZiAoaW5kZXhPZi5jYWxsKHRoaXMuaWxsZWdhbF90eXBlcywgdHlwZSkgPj0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGDCtTc5NzYgJHtycHIodHlwZSl9IGlzIG5vdCBhIGxlZ2FsIHR5cGUgbmFtZWApO1xuICAgIH1cbiAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgIGlmICh0aGlzLnNwZWNzW3R5cGVdICE9IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgwrU4MDk5IHR5cGUgJHtycHIodHlwZSl9IGFscmVhZHkgZGVjbGFyZWRgKTtcbiAgICB9XG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICB0aGlzLnNwZWNzW3R5cGVdID0gc3BlYztcbiAgICB0aGlzLmlzYVt0eXBlXSA9ICguLi5QKSA9PiB7XG4gICAgICByZXR1cm4gdGhpcy5pc2EodHlwZSwgLi4uUCk7XG4gICAgfTtcbiAgICAvLyBAdmFsaWRhdGVbIHR5cGUgXSAgICA9ICggUC4uLiApID0+IEB2YWxpZGF0ZSB0eXBlLCBQLi4uXG4gICAgc3BlYy5zaXplID0gdGhpcy5fc2l6ZW9mX21ldGhvZF9mcm9tX3NwZWModHlwZSwgc3BlYyk7XG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICByZXR1cm4gbnVsbDtcbiAgfTtcblxufSkuY2FsbCh0aGlzKTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGVjbGFyaW5nLmpzLm1hcCIsIihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICB2YXIgTE9VUEUsIGluc3BlY3QsIHJwcixcbiAgICBpbmRleE9mID0gW10uaW5kZXhPZjtcblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICh7aW5zcGVjdH0gPSByZXF1aXJlKCd1dGlsJykpO1xuXG4gIHRoaXMuYXNzaWduID0gT2JqZWN0LmFzc2lnbjtcblxuICAvLyBAanIgICAgICAgICAgID0gSlNPTi5zdHJpbmdpZnlcbiAgTE9VUEUgPSByZXF1aXJlKCcuLi9kZXBzL2xvdXBlLmpzJyk7XG5cbiAgdGhpcy5ycHIgPSBycHIgPSAoeCkgPT4ge1xuICAgIHJldHVybiBMT1VQRS5pbnNwZWN0KHgsIHtcbiAgICAgIGN1c3RvbUluc3BlY3Q6IGZhbHNlXG4gICAgfSk7XG4gIH07XG5cbiAgdGhpcy54cnByID0gZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiAocnByKHgpKS5zbGljZSgwLCAxMDI1KTtcbiAgfTtcblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFRZUEVfT0YgRkxBVk9SU1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHRoaXMuZG9tZW5pY19kZW5pY29sYV9kZXZpY2UgPSAoeCkgPT4ge1xuICAgIHZhciByZWYsIHJlZjE7XG4gICAgcmV0dXJuIChyZWYgPSB4ICE9IG51bGwgPyAocmVmMSA9IHguY29uc3RydWN0b3IpICE9IG51bGwgPyByZWYxLm5hbWUgOiB2b2lkIDAgOiB2b2lkIDApICE9IG51bGwgPyByZWYgOiAnLi8uJztcbiAgfTtcblxuICB0aGlzLm1hcmtfbWlsbGVyX2RldmljZSA9ICh4KSA9PiB7XG4gICAgcmV0dXJuIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeCkpLnNsaWNlKDgsIC0xKTtcbiAgfTtcblxuICB0aGlzLm1hcmtfbWlsbGVyX2RldmljZV8yID0gKHgpID0+IHtcbiAgICByZXR1cm4gKChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeCkpLnNsaWNlKDgsIC0xKSkudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9cXHMrL2csICcnKTtcbiAgfTtcblxuICB0aGlzLmpzX3R5cGVfb2YgPSAoeCkgPT4ge1xuICAgIHJldHVybiAoKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4KSkuc2xpY2UoOCwgLTEpKS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1xccysvZywgJycpO1xuICB9O1xuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHRoaXMuZ2V0X3JwcnNfb2ZfdHBycyA9IGZ1bmN0aW9uKHRwcnMpIHtcbiAgICAvKiBgdHByczogdGVzdCBwYXJhbWV0ZXJzLCBpLmUuIGFkZGl0aW9uYWwgYXJndW1lbnRzIHRvIHR5cGUgdGVzdGVyLCBhcyBpbiBgbXVsdGlwbGVfb2YgeCwgNGAgKi9cbiAgICB2YXIgcnByX29mX3RwcnMsIHNycHJfb2ZfdHBycztcbiAgICBycHJfb2ZfdHBycyA9IChmdW5jdGlvbigpIHtcbiAgICAgIHN3aXRjaCAodHBycy5sZW5ndGgpIHtcbiAgICAgICAgY2FzZSAwOlxuICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIHJldHVybiBgJHtycHIodHByc1swXSl9YDtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICByZXR1cm4gYCR7cnByKHRwcnMpfWA7XG4gICAgICB9XG4gICAgfSkoKTtcbiAgICBzcnByX29mX3RwcnMgPSAoZnVuY3Rpb24oKSB7XG4gICAgICBzd2l0Y2ggKHJwcl9vZl90cHJzLmxlbmd0aCkge1xuICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHJldHVybiAnICcgKyBycHJfb2ZfdHBycztcbiAgICAgIH1cbiAgICB9KSgpO1xuICAgIHJldHVybiB7cnByX29mX3RwcnMsIHNycHJfb2ZfdHByc307XG4gIH07XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB0aGlzLmludGVyc2VjdGlvbl9vZiA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICB2YXIgeDtcbiAgICBhID0gWy4uLmFdLnNvcnQoKTtcbiAgICBiID0gWy4uLmJdLnNvcnQoKTtcbiAgICByZXR1cm4gKChmdW5jdGlvbigpIHtcbiAgICAgIHZhciBpLCBsZW4sIHJlc3VsdHM7XG4gICAgICByZXN1bHRzID0gW107XG4gICAgICBmb3IgKGkgPSAwLCBsZW4gPSBhLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIHggPSBhW2ldO1xuICAgICAgICBpZiAoaW5kZXhPZi5jYWxsKGIsIHgpID49IDApIHtcbiAgICAgICAgICByZXN1bHRzLnB1c2goeCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHRzO1xuICAgIH0pKCkpLnNvcnQoKTtcbiAgfTtcblxufSkuY2FsbCh0aGlzKTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aGVscGVycy5qcy5tYXAiLCIoZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgdmFyIEhFTFBFUlMsIE11bHRpbWl4LCBhc3NpZ24sIGNhc3QsIGNoZWNrLCBkZWNsYXJhdGlvbnMsIGdldF9ycHJzX29mX3RwcnMsIGlzYSwgaXNhX2xpc3Rfb2YsIGlzYV9vYmplY3Rfb2YsIGlzYV9vcHRpb25hbCwgamtfZXF1YWxzLCBqciwganNfdHlwZV9vZiwgcnByLCBzYWQsIHZhbGlkYXRlLCB2YWxpZGF0ZV9saXN0X29mLCB2YWxpZGF0ZV9vYmplY3Rfb2YsIHZhbGlkYXRlX29wdGlvbmFsLCB4cnByO1xuXG4gIC8vIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiAgTXVsdGltaXggPSByZXF1aXJlKCdtdWx0aW1peCcpO1xuXG4gIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgSEVMUEVSUyA9IHJlcXVpcmUoJy4vaGVscGVycycpO1xuXG4gICh7YXNzaWduLCBqciwgcnByLCB4cnByLCBnZXRfcnByc19vZl90cHJzLCBqc190eXBlX29mfSA9IEhFTFBFUlMpO1xuXG4gIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgZGVjbGFyYXRpb25zID0gcmVxdWlyZSgnLi9kZWNsYXJhdGlvbnMnKTtcblxuICBzYWQgPSAocmVxdWlyZSgnLi9jaGVja3MnKSkuc2FkO1xuXG4gIGprX2VxdWFscyA9IHJlcXVpcmUoJy4uL2RlcHMvamtyb3NvLWVxdWFscycpO1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgaXNhID0gZnVuY3Rpb24odHlwZSwgLi4ueFApIHtcbiAgICByZXR1cm4gdGhpcy5fc2F0aXNmaWVzX2FsbF9hc3BlY3RzKHR5cGUsIC4uLnhQKTtcbiAgfTtcblxuICBpc2FfbGlzdF9vZiA9IGZ1bmN0aW9uKHR5cGUsIC4uLnhQKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNhLmxpc3Rfb2YodHlwZSwgLi4ueFApO1xuICB9O1xuXG4gIGlzYV9vYmplY3Rfb2YgPSBmdW5jdGlvbih0eXBlLCAuLi54UCkge1xuICAgIHJldHVybiB0aGlzLmlzYS5vYmplY3Rfb2YodHlwZSwgLi4ueFApO1xuICB9O1xuXG4gIHZhbGlkYXRlX2xpc3Rfb2YgPSBmdW5jdGlvbih0eXBlLCAuLi54UCkge1xuICAgIHJldHVybiB0aGlzLnZhbGlkYXRlLmxpc3Rfb2YodHlwZSwgLi4ueFApO1xuICB9O1xuXG4gIHZhbGlkYXRlX29iamVjdF9vZiA9IGZ1bmN0aW9uKHR5cGUsIC4uLnhQKSB7XG4gICAgcmV0dXJuIHRoaXMudmFsaWRhdGUub2JqZWN0X29mKHR5cGUsIC4uLnhQKTtcbiAgfTtcblxuICBpc2Ffb3B0aW9uYWwgPSBmdW5jdGlvbih0eXBlLCAuLi54UCkge1xuICAgIHJldHVybiAoeFBbMF0gPT0gbnVsbCkgfHwgdGhpcy5fc2F0aXNmaWVzX2FsbF9hc3BlY3RzKHR5cGUsIC4uLnhQKTtcbiAgfTtcblxuICB2YWxpZGF0ZV9vcHRpb25hbCA9IGZ1bmN0aW9uKHR5cGUsIC4uLnhQKSB7XG4gICAgcmV0dXJuICh4UFswXSA9PSBudWxsKSB8fCB0aGlzLnZhbGlkYXRlKHR5cGUsIC4uLnhQKTtcbiAgfTtcblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGNhc3QgPSBmdW5jdGlvbih0eXBlX2EsIHR5cGVfYiwgeCwgLi4ueFApIHtcbiAgICB2YXIgY2FzdHMsIGNvbnZlcnRlcjtcbiAgICB0aGlzLnZhbGlkYXRlKHR5cGVfYSwgeCwgLi4ueFApO1xuICAgIGlmICh0eXBlX2EgPT09IHR5cGVfYikge1xuICAgICAgcmV0dXJuIHg7XG4gICAgfVxuICAgIGlmICh0aGlzLmlzYSh0eXBlX2IsIHgsIC4uLnhQKSkge1xuICAgICAgcmV0dXJuIHg7XG4gICAgfVxuICAgIGlmICgoY2FzdHMgPSB0aGlzLnNwZWNzW3R5cGVfYV0uY2FzdHMpICE9IG51bGwpIHtcbiAgICAgIGlmICgoY29udmVydGVyID0gY2FzdHNbdHlwZV9iXSkgIT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gY29udmVydGVyLmNhbGwodGhpcywgeCwgLi4ueFApO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAodHlwZV9iID09PSAndGV4dCcvKiBUQUlOVCB1c2UgYmV0dGVyIG1ldGhvZCBsaWtlIHV0aWwuaW5zcGVjdCAqLykge1xuICAgICAgcmV0dXJuIGAke3h9YDtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKGBeaW50ZXJ0eXBlL2Nhc3RAMTIzNF4gdW5hYmxlIHRvIGNhc3QgYSAke3R5cGVfYX0gYXMgJHt0eXBlX2J9YCk7XG4gIH07XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBjaGVjayA9IGZ1bmN0aW9uKHR5cGUsIHgsIC4uLnhQKSB7XG4gICAgdmFyIGVycm9yO1xuICAgIGlmICh0aGlzLnNwZWNzW3R5cGVdICE9IG51bGwpIHtcbiAgICAgIGlmICh0aGlzLmlzYSh0eXBlLCB4LCAuLi54UCkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gc2FkO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoKGNoZWNrID0gdGhpcy5jaGVja3NbdHlwZV0pID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgXmludGVydHlwZS9jaGVja0AxMzQ1XiB1bmtub3duIHR5cGUgb3IgY2hlY2sgJHtycHIodHlwZSl9YCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICByZXR1cm4gY2hlY2suY2FsbCh0aGlzLCB4LCAuLi54UCk7XG4gICAgfSBjYXRjaCAoZXJyb3IxKSB7XG4gICAgICBlcnJvciA9IGVycm9yMTtcbiAgICAgIHJldHVybiBlcnJvcjtcbiAgICB9XG4gIH07XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB2YWxpZGF0ZSA9IGZ1bmN0aW9uKHR5cGUsIC4uLnhQKSB7XG4gICAgdmFyIFAsIGFzcGVjdCwgbWVzc2FnZSwgcnByX29mX3RwcnMsIHNycHJfb2ZfdHBycywgeDtcbiAgICBpZiAoKGFzcGVjdCA9IHRoaXMuX2dldF91bnNhdGlzZmllZF9hc3BlY3QodHlwZSwgLi4ueFApKSA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgW3gsIC4uLlBdID0geFA7XG4gICAgKHtycHJfb2ZfdHBycywgc3Jwcl9vZl90cHJzfSA9IGdldF9ycHJzX29mX3RwcnMoUCkpO1xuICAgIG1lc3NhZ2UgPSBhc3BlY3QgPT09ICdtYWluJyA/IGBeaW50ZXJ0eXBlL3ZhbGlkYXRlQDE0NTZeIG5vdCBhIHZhbGlkICR7dHlwZX06ICR7eHJwcih4KX0ke3NycHJfb2ZfdHByc31gIDogYF5pbnRlcnR5cGUvdmFsaWRhdGVAMTU2N14gbm90IGEgdmFsaWQgJHt0eXBlfSAodmlvbGF0ZXMgJHtycHIoYXNwZWN0KX0pOiAke3hycHIoeCl9JHtzcnByX29mX3RwcnN9YDtcbiAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSk7XG4gIH07XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICB0aGlzLkludGVydHlwZSA9IChmdW5jdGlvbigpIHtcbiAgICBjbGFzcyBJbnRlcnR5cGUgZXh0ZW5kcyBNdWx0aW1peCB7XG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgY29uc3RydWN0b3IodGFyZ2V0ID0gbnVsbCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAgICAgLyogVEFJTlQgYnVnIGluIE11bHRpTWl4LCBzaG91bGQgYmUgcG9zc2libGUgdG8gZGVjbGFyZSBtZXRob2RzIGluIGNsYXNzLCBub3QgdGhlIGNvbnN0cnVjdG9yLFxuICAgICAgICAgICBhbmQgc3RpbGwgZ2V0IGEgYm91bmQgdmVyc2lvbiB3aXRoIGBleHBvcnQoKWA7IGRlY2xhcmluZyB0aGVtIGhlcmUgRlRUQiAqL1xuICAgICAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAgICAgdGhpcy5zYWQgPSBzYWQ7XG4gICAgICAgIHRoaXMuc3BlY3MgPSB7fTtcbiAgICAgICAgdGhpcy5jaGVja3MgPSB7fTtcbiAgICAgICAgdGhpcy5pc2EgPSBNdWx0aW1peC5nZXRfa2V5bWV0aG9kX3Byb3h5KHRoaXMsIGlzYSk7XG4gICAgICAgIHRoaXMuaXNhX29wdGlvbmFsID0gTXVsdGltaXguZ2V0X2tleW1ldGhvZF9wcm94eSh0aGlzLCBpc2Ffb3B0aW9uYWwpO1xuICAgICAgICB0aGlzLmlzYV9saXN0X29mID0gTXVsdGltaXguZ2V0X2tleW1ldGhvZF9wcm94eSh0aGlzLCBpc2FfbGlzdF9vZik7XG4gICAgICAgIHRoaXMuaXNhX29iamVjdF9vZiA9IE11bHRpbWl4LmdldF9rZXltZXRob2RfcHJveHkodGhpcywgaXNhX29iamVjdF9vZik7XG4gICAgICAgIHRoaXMuY2FzdCA9IE11bHRpbWl4LmdldF9rZXltZXRob2RfcHJveHkodGhpcywgY2FzdCk7XG4gICAgICAgIHRoaXMudmFsaWRhdGUgPSBNdWx0aW1peC5nZXRfa2V5bWV0aG9kX3Byb3h5KHRoaXMsIHZhbGlkYXRlKTtcbiAgICAgICAgdGhpcy52YWxpZGF0ZV9vcHRpb25hbCA9IE11bHRpbWl4LmdldF9rZXltZXRob2RfcHJveHkodGhpcywgdmFsaWRhdGVfb3B0aW9uYWwpO1xuICAgICAgICB0aGlzLnZhbGlkYXRlX2xpc3Rfb2YgPSBNdWx0aW1peC5nZXRfa2V5bWV0aG9kX3Byb3h5KHRoaXMsIHZhbGlkYXRlX2xpc3Rfb2YpO1xuICAgICAgICB0aGlzLnZhbGlkYXRlX29iamVjdF9vZiA9IE11bHRpbWl4LmdldF9rZXltZXRob2RfcHJveHkodGhpcywgdmFsaWRhdGVfb2JqZWN0X29mKTtcbiAgICAgICAgdGhpcy5jaGVjayA9IE11bHRpbWl4LmdldF9rZXltZXRob2RfcHJveHkodGhpcywgY2hlY2spO1xuICAgICAgICB0aGlzLm5vd2FpdCA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB0aGlzLnZhbGlkYXRlLmltbWVkaWF0ZSh4KTtcbiAgICAgICAgICByZXR1cm4geDtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5faGVscGVycyA9IEhFTFBFUlM7XG4gICAgICAgIGRlY2xhcmF0aW9ucy5kZWNsYXJlX3R5cGVzLmFwcGx5KHRoaXMpO1xuICAgICAgICBkZWNsYXJhdGlvbnMuZGVjbGFyZV9jaGVja3MuYXBwbHkodGhpcyk7XG4gICAgICAgIGlmICh0YXJnZXQgIT0gbnVsbCkge1xuICAgICAgICAgIHRoaXMuZXhwb3J0KHRhcmdldCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIGVxdWFscyhhLCAuLi5QKSB7XG4gICAgICAgIHZhciBhcml0eSwgYiwgaSwgbGVuLCB0eXBlX29mX2E7XG4gICAgICAgIGlmICgoYXJpdHkgPSBhcmd1bWVudHMubGVuZ3RoKSA8IDIpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYF5pbnRlcnR5cGUvZXF1YWxzQDM0ODleIGV4cGVjdGVkIGF0IGxlYXN0IDIgYXJndW1lbnRzLCBnb3QgJHthcml0eX1gKTtcbiAgICAgICAgfVxuICAgICAgICB0eXBlX29mX2EgPSB0aGlzLnR5cGVfb2YoYSk7XG4gICAgICAgIGZvciAoaSA9IDAsIGxlbiA9IFAubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICBiID0gUFtpXTtcbiAgICAgICAgICBpZiAodHlwZV9vZl9hICE9PSB0aGlzLnR5cGVfb2YoYikpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCh0eXBlX29mX2EgPT09ICdzZXQnIHx8IHR5cGVfb2ZfYSA9PT0gJ21hcCcpICYmIHRoaXMuZXF1YWxzKFsuLi5hXSwgWy4uLmJdKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghamtfZXF1YWxzKGEsIGIpKSB7XG4gICAgICAgICAgICAvKiBUQUlOVCB0aGlzIGNhbGwgaW52b2x2ZXMgaXRzIG93biB0eXBlY2hlY2tpbmcgY29kZSBhbmQgdGh1cyBtYXkgbXlzdGVyaW91c2x5IGZhaWwgKi9cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICB9O1xuXG4gICAgLy8gQGV4dGVuZCAgIG9iamVjdF93aXRoX2NsYXNzX3Byb3BlcnRpZXNcbiAgICBJbnRlcnR5cGUuaW5jbHVkZShyZXF1aXJlKCcuL3NpemluZycpKTtcblxuICAgIEludGVydHlwZS5pbmNsdWRlKHJlcXVpcmUoJy4vZGVjbGFyaW5nJykpO1xuXG4gICAgSW50ZXJ0eXBlLmluY2x1ZGUocmVxdWlyZSgnLi9jaGVja3MnKSk7XG5cbiAgICByZXR1cm4gSW50ZXJ0eXBlO1xuXG4gIH0pLmNhbGwodGhpcyk7XG5cbn0pLmNhbGwodGhpcyk7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPW1haW4uanMubWFwIiwiKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG4gIHZhciBhc3NpZ24sIGpyLCBqc190eXBlX29mLCB4cnByO1xuXG4gIC8vIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiAgKHthc3NpZ24sIGpyLCB4cnByLCBqc190eXBlX29mfSA9IHJlcXVpcmUoJy4vaGVscGVycycpKTtcblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIE9CSkVDVCBTSVpFU1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHRoaXMuX3NpemVvZl9tZXRob2RfZnJvbV9zcGVjID0gZnVuY3Rpb24odHlwZSwgc3BlYykge1xuICAgIHJldHVybiAoKHMpID0+IHtcbiAgICAgIHZhciBUO1xuICAgICAgaWYgKHMgPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIHN3aXRjaCAoVCA9IGpzX3R5cGVfb2YocykpIHtcbiAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuIHhbc107XG4gICAgICAgICAgfTtcbiAgICAgICAgY2FzZSAnZnVuY3Rpb24nOlxuICAgICAgICAgIHJldHVybiBzLyogVEFJTlQgZGlzYWxsb3dzIGFzeW5jIGZ1bnRpb25zICovO1xuICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBzLyogVEFJTlQgYWxsb3dzIE5hTiwgSW5maW5pdHkgKi87XG4gICAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHRocm93IG5ldyBFcnJvcihgwrUzMDk4OCBleHBlY3RlZCBudWxsLCBhIHRleHQgb3IgYSBmdW5jdGlvbiBmb3Igc2l6ZSBvZiAke3R5cGV9LCBnb3QgYSAke1R9YCk7XG4gICAgfSkoc3BlYy5zaXplKTtcbiAgfTtcblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHRoaXMuc2l6ZV9vZiA9IGZ1bmN0aW9uKHgsIC4uLlApIHtcbiAgICAvKiBUaGUgYHNpemVfb2YoKWAgbWV0aG9kIHVzZXMgYSBwZXItdHlwZSBjb25maWd1cmFibGUgbWV0aG9kb2xvZ3kgdG8gcmV0dXJuIHRoZSBzaXplIG9mIGEgZ2l2ZW4gdmFsdWU7XG4gICAgIHN1Y2ggbWV0aG9kb2xvZ3kgbWF5IHBlcm1pdCBvciBuZWNlc3NpdGF0ZSBwYXNzaW5nIGFkZGl0aW9uYWwgYXJndW1lbnRzIChzdWNoIGFzIGBzaXplX29mIHRleHRgLCB3aGljaFxuICAgICBjb21lcyBpbiBzZXZlcmFsIGZsYXZvcnMgZGVwZW5kaW5nIG9uIHdoZXRoZXIgYnl0ZXMgb3IgY29kZXBvaW50cyBhcmUgdG8gYmUgY291bnRlZCkuIEFzIHN1Y2gsIGl0IGlzIGFcbiAgICAgbW9kZWwgZm9yIGhvdyB0byBpbXBsZW1lbnQgR28tbGlrZSBtZXRob2QgZGlzcGF0Y2hpbmcuICovXG4gICAgdmFyIGdldHRlciwgcmVmLCB0eXBlO1xuICAgIHR5cGUgPSB0aGlzLnR5cGVfb2YoeCk7XG4gICAgaWYgKCEodGhpcy5pc2EuZnVuY3Rpb24oKGdldHRlciA9IChyZWYgPSB0aGlzLnNwZWNzW3R5cGVdKSAhPSBudWxsID8gcmVmLnNpemUgOiB2b2lkIDApKSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgwrU4ODc5MyB1bmFibGUgdG8gZ2V0IHNpemUgb2YgYSAke3R5cGV9YCk7XG4gICAgfVxuICAgIHJldHVybiBnZXR0ZXIoeCwgLi4uUCk7XG4gIH07XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvKiBUQUlOVCBmYXVsdHkgaW1wbGVtZW50YXRpb246XG4gICAqIGRvZXMgbm90IHVzZSBzaXplX29mIGJ1dCBsZW5ndGhcbiAgICogZG9lcyBub3QgYWNjZXB0IGFkZGl0aW9uYWwgYXJndW1lbnRzIGFzIG5lZWRlZCBmb3IgdGV4dHNcbiAgICogcmlza3MgdG8gYnJlYWsgY29kZXBvaW50cyBhcGFydFxuICAgICovXG4gIHRoaXMuZmlyc3Rfb2YgPSBmdW5jdGlvbihjb2xsZWN0aW9uKSB7XG4gICAgcmV0dXJuIGNvbGxlY3Rpb25bMF07XG4gIH07XG5cbiAgdGhpcy5sYXN0X29mID0gZnVuY3Rpb24oY29sbGVjdGlvbikge1xuICAgIHJldHVybiBjb2xsZWN0aW9uW2NvbGxlY3Rpb24ubGVuZ3RoIC0gMV07XG4gIH07XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB0aGlzLmFyaXR5X29mID0gZnVuY3Rpb24oeCkge1xuICAgIHZhciB0eXBlO1xuICAgIGlmICgodHlwZSA9IHRoaXMuc3VwZXJ0eXBlX29mKHgpKSAhPT0gJ2NhbGxhYmxlJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGDCtTg4NzMzIGV4cGVjdGVkIGEgY2FsbGFibGUsIGdvdCBhICR7dHlwZX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHgubGVuZ3RoO1xuICB9O1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgdGhpcy5oYXNfc2l6ZSA9IGZ1bmN0aW9uKHgpIHtcbiAgICB2YXIgcmVmO1xuICAgIHJldHVybiB0aGlzLmlzYS5mdW5jdGlvbigocmVmID0gdGhpcy5zcGVjc1t0aGlzLnR5cGVfb2YoeCldKSAhPSBudWxsID8gcmVmLnNpemUgOiB2b2lkIDApO1xuICB9O1xuXG59KS5jYWxsKHRoaXMpO1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1zaXppbmcuanMubWFwIiwiKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gT0JKRUNUIFBST1BFUlRZIENBVEFMT0dVSU5HXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgdGhpcy5rZXlzX29mID0gZnVuY3Rpb24oLi4uUCkge1xuICAgIHJldHVybiB0aGlzLnZhbHVlc19vZih0aGlzLndhbGtfa2V5c19vZiguLi5QKSk7XG4gIH07XG5cbiAgdGhpcy5hbGxfa2V5c19vZiA9IGZ1bmN0aW9uKC4uLlApIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZXNfb2YodGhpcy53YWxrX2FsbF9rZXlzX29mKC4uLlApKTtcbiAgfTtcblxuICB0aGlzLmFsbF9vd25fa2V5c19vZiA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoeCAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoeCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gIH07XG5cbiAgdGhpcy53YWxrX2FsbF9vd25fa2V5c19vZiA9IGZ1bmN0aW9uKih4KSB7XG4gICAgdmFyIGksIGssIGxlbiwgcmVmLCByZXN1bHRzO1xuICAgIHJlZiA9IHRoaXMuYWxsX293bl9rZXlzX29mKHgpO1xuICAgIHJlc3VsdHMgPSBbXTtcbiAgICBmb3IgKGkgPSAwLCBsZW4gPSByZWYubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGsgPSByZWZbaV07XG4gICAgICByZXN1bHRzLnB1c2goKHlpZWxkIGspKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB0aGlzLndhbGtfa2V5c19vZiA9IGZ1bmN0aW9uKih4LCBzZXR0aW5ncykge1xuICAgIHZhciBkZWZhdWx0cywgaywgcmVzdWx0cztcbiAgICBkZWZhdWx0cyA9IHtcbiAgICAgIHNraXBfdW5kZWZpbmVkOiB0cnVlXG4gICAgfTtcbiAgICBzZXR0aW5ncyA9IHsuLi5kZWZhdWx0cywgLi4uc2V0dGluZ3N9O1xuICAgIHJlc3VsdHMgPSBbXTtcbiAgICBmb3IgKGsgaW4geCkge1xuICAgICAgaWYgKCh4W2tdID09PSB2b2lkIDApICYmIHNldHRpbmdzLnNraXBfdW5kZWZpbmVkKSB7XG4gICAgICAgIC8qIFRBSU5UIHNob3VsZCB1c2UgcHJvcGVydHkgZGVzY3JpcHRvcnMgdG8gYXZvaWQgcG9zc2libGUgc2lkZSBlZmZlY3RzICovXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgcmVzdWx0cy5wdXNoKCh5aWVsZCBrKSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgdGhpcy53YWxrX2FsbF9rZXlzX29mID0gZnVuY3Rpb24oeCwgc2V0dGluZ3MpIHtcbiAgICB2YXIgZGVmYXVsdHM7XG4gICAgZGVmYXVsdHMgPSB7XG4gICAgICBza2lwX29iamVjdDogdHJ1ZSxcbiAgICAgIHNraXBfdW5kZWZpbmVkOiB0cnVlXG4gICAgfTtcbiAgICBzZXR0aW5ncyA9IHsuLi5kZWZhdWx0cywgLi4uc2V0dGluZ3N9O1xuICAgIHJldHVybiB0aGlzLl93YWxrX2FsbF9rZXlzX29mKHgsIG5ldyBTZXQoKSwgc2V0dGluZ3MpO1xuICB9O1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgdGhpcy5fd2Fsa19hbGxfa2V5c19vZiA9IGZ1bmN0aW9uKih4LCBzZWVuLCBzZXR0aW5ncykge1xuICAgIC8qIFRBSU5UIHNob3VsZCB1c2UgcHJvcGVydHkgZGVzY3JpcHRvcnMgdG8gYXZvaWQgcG9zc2libGUgc2lkZSBlZmZlY3RzICovXG4gICAgLyogVEFJTlQgdHJ5aW5nIHRvIGFjY2VzcyBgYXJndW1lbnRzYCBjYXVzZXMgZXJyb3IgKi9cbiAgICB2YXIgZXJyb3IsIGssIHByb3RvLCByZWYsIHZhbHVlO1xuICAgIGlmICgoIXNldHRpbmdzLnNraXBfb2JqZWN0KSAmJiB4ID09PSBPYmplY3QucHJvdG90eXBlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJlZiA9IHRoaXMud2Fsa19hbGxfb3duX2tleXNfb2YoeCk7XG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICBmb3IgKGsgb2YgcmVmKSB7XG4gICAgICBpZiAoc2Vlbi5oYXMoaykpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBzZWVuLmFkZChrKTtcbiAgICAgIHRyeSB7XG4gICAgICAgIHZhbHVlID0geFtrXTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yMSkge1xuICAgICAgICBlcnJvciA9IGVycm9yMTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAoKHZhbHVlID09PSB2b2lkIDApICYmIHNldHRpbmdzLnNraXBfdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKHNldHRpbmdzLnN5bWJvbCAhPSBudWxsKSB7XG4gICAgICAgIGlmICh2YWx1ZSA9PSBudWxsKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF2YWx1ZVtzZXR0aW5ncy5zeW1ib2xdKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHlpZWxkIGs7XG4gICAgfVxuICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgaWYgKChwcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZih4KSkgIT0gbnVsbCkge1xuICAgICAgcmV0dXJuICh5aWVsZCogdGhpcy5fd2Fsa19hbGxfa2V5c19vZihwcm90bywgc2Vlbiwgc2V0dGluZ3MpKTtcbiAgICB9XG4gIH07XG5cbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvKiBUdXJuIGl0ZXJhdG9ycyBpbnRvIGxpc3RzLCBjb3B5IGxpc3RzOiAqL1xuICB0aGlzLnZhbHVlc19vZiA9IGZ1bmN0aW9uKHgpIHtcbiAgICByZXR1cm4gWy4uLnhdO1xuICB9O1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgdGhpcy5oYXNfa2V5cyA9IGZ1bmN0aW9uKHgsIC4uLlApIHtcbiAgICB2YXIgaSwga2V5LCBsZW4sIHJlZjtcbiAgICBpZiAoeCA9PSBudWxsKSB7XG4gICAgICAvKiBPYnNlcnZlIHRoYXQgYGhhc19rZXlzKClgIGFsd2F5cyBjb25zaWRlcnMgYHVuZGVmaW5lZGAgYXMgJ25vdCBzZXQnICovXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuLyogVEFJTlQgb3IgdGhyb3cgZXJyb3IgKi8gICAgcmVmID0gUC5mbGF0KDJlMzA4KTtcbiAgICBmb3IgKGkgPSAwLCBsZW4gPSByZWYubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGtleSA9IHJlZltpXTtcbiAgICAgIGlmICh4W2tleV0gPT09IHZvaWQgMCkge1xuICAgICAgICAvKiBUQUlOVCBzaG91bGQgdXNlIHByb3BlcnR5IGRlc2NyaXB0b3JzIHRvIGF2b2lkIHBvc3NpYmxlIHNpZGUgZWZmZWN0cyAqL1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9O1xuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgdGhpcy5oYXNfa2V5ID0gZnVuY3Rpb24oeCwga2V5KSB7XG4gICAgcmV0dXJuIHRoaXMuaGFzX2tleXMoeCwga2V5KTtcbiAgfTtcblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHRoaXMuaGFzX29ubHlfa2V5cyA9IGZ1bmN0aW9uKHgsIC4uLlApIHtcbiAgICB2YXIga2V5cywgcHJvYmVzO1xuICAgIHByb2JlcyA9IChQLmZsYXQoMmUzMDgpKS5zb3J0KCk7XG4gICAga2V5cyA9ICh0aGlzLnZhbHVlc19vZih0aGlzLmtleXNfb2YoeCkpKS5zb3J0KCk7XG4gICAgcmV0dXJuIHByb2Jlcy5sZW5ndGggPSBrZXlzLmxlbmd0aCAmJiBwcm9iZXMuZXZlcnkoZnVuY3Rpb24oeCwgaWR4KSB7XG4gICAgICByZXR1cm4geCA9PT0ga2V5c1tpZHhdO1xuICAgIH0pO1xuICB9O1xuXG59KS5jYWxsKHRoaXMpO1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1jYXRhbG9ndWluZy5qcy5tYXAiLCIoZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgdmFyIE11bHRpbWl4LCBtb2R1bGVfa2V5d29yZHMsXG4gICAgaW5kZXhPZiA9IFtdLmluZGV4T2Y7XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBNT0RVTEUgTUVUQUNMQVNTIHByb3ZpZGVzIHN0YXRpYyBtZXRob2RzIGBAZXh0ZW5kKClgLCBgQGluY2x1ZGUoKWBcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvKiBUaGUgbGl0dGxlIGRhbmNlIGFyb3VuZCB0aGUgbW9kdWxlX2tleXdvcmRzIHZhcmlhYmxlIGlzIHRvIGVuc3VyZSB3ZSBoYXZlIGNhbGxiYWNrIHN1cHBvcnQgd2hlbiBtaXhpbnNcbiAgZXh0ZW5kIGEgY2xhc3MuIFNlZSBodHRwczovL2FyY3R1cm8uZ2l0aHViLmlvL2xpYnJhcnkvY29mZmVlc2NyaXB0LzAzX2NsYXNzZXMuaHRtbCAqL1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIG1vZHVsZV9rZXl3b3JkcyA9IFsnZXh0ZW5kZWQnLCAnaW5jbHVkZWQnXTtcblxuICBNdWx0aW1peCA9IChmdW5jdGlvbigpIHtcbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgY2xhc3MgTXVsdGltaXgge1xuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIHN0YXRpYyBleHRlbmQob2JqZWN0LCBzZXR0aW5ncyA9IG51bGwpIHtcbiAgICAgICAgdmFyIGtleSwgcmVmLCB2YWx1ZTtcbiAgICAgICAgc2V0dGluZ3MgPSB7Li4ue1xuICAgICAgICAgICAgb3ZlcndyaXRlOiB0cnVlXG4gICAgICAgICAgfSwgLi4uKHNldHRpbmdzICE9IG51bGwgPyBzZXR0aW5ncyA6IG51bGwpfTtcbiAgICAgICAgZm9yIChrZXkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgdmFsdWUgPSBvYmplY3Rba2V5XTtcbiAgICAgICAgICBpZiAoIShpbmRleE9mLmNhbGwobW9kdWxlX2tleXdvcmRzLCBrZXkpIDwgMCkpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoKCFzZXR0aW5ncy5vdmVyd3JpdGUpICYmICgodGhpcy5wcm90b3R5cGVba2V5XSAhPSBudWxsKSB8fCAodGhpc1trZXldICE9IG51bGwpKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBebXVsdGltaXgvaW5jbHVkZUA1Njg0IG92ZXJ3cml0ZSBzZXQgdG8gZmFsc2UgYnV0IG5hbWUgYWxyZWFkeSBzZXQ6ICR7SlNPTi5zdHJpbmdpZnkoa2V5KX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpc1trZXldID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKChyZWYgPSBvYmplY3QuZXh0ZW5kZWQpICE9IG51bGwpIHtcbiAgICAgICAgICByZWYuYXBwbHkodGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBzdGF0aWMgaW5jbHVkZShvYmplY3QsIHNldHRpbmdzID0gbnVsbCkge1xuICAgICAgICB2YXIga2V5LCByZWYsIHZhbHVlO1xuICAgICAgICBzZXR0aW5ncyA9IHsuLi57XG4gICAgICAgICAgICBvdmVyd3JpdGU6IHRydWVcbiAgICAgICAgICB9LCAuLi4oc2V0dGluZ3MgIT0gbnVsbCA/IHNldHRpbmdzIDogbnVsbCl9O1xuICAgICAgICBmb3IgKGtleSBpbiBvYmplY3QpIHtcbiAgICAgICAgICB2YWx1ZSA9IG9iamVjdFtrZXldO1xuICAgICAgICAgIGlmICghKGluZGV4T2YuY2FsbChtb2R1bGVfa2V5d29yZHMsIGtleSkgPCAwKSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgoIXNldHRpbmdzLm92ZXJ3cml0ZSkgJiYgKCh0aGlzLnByb3RvdHlwZVtrZXldICE9IG51bGwpIHx8ICh0aGlzW2tleV0gIT0gbnVsbCkpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYF5tdWx0aW1peC9pbmNsdWRlQDU2ODMgb3ZlcndyaXRlIHNldCB0byBmYWxzZSBidXQgbmFtZSBhbHJlYWR5IHNldDogJHtKU09OLnN0cmluZ2lmeShrZXkpfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBBc3NpZ24gcHJvcGVydGllcyB0byB0aGUgcHJvdG90eXBlXG4gICAgICAgICAgdGhpcy5wcm90b3R5cGVba2V5XSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGlmICgocmVmID0gb2JqZWN0LmluY2x1ZGVkKSAhPSBudWxsKSB7XG4gICAgICAgICAgcmVmLmFwcGx5KHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgZXhwb3J0KHRhcmdldCA9IG51bGwpIHtcbiAgICAgICAgLyogUmV0dXJuIGFuIG9iamVjdCB3aXRoIG1ldGhvZHMsIGJvdW5kIHRvIHRoZSBjdXJyZW50IGluc3RhbmNlLiAqL1xuICAgICAgICB2YXIgUiwgaywgcmVmLCByZWYxLCB2O1xuICAgICAgICBSID0gdGFyZ2V0ICE9IG51bGwgPyB0YXJnZXQgOiB7fTtcbiAgICAgICAgcmVmID0gKHJlcXVpcmUoJy4vY2F0YWxvZ3VpbmcnKSkud2Fsa19hbGxfa2V5c19vZih0aGlzKTtcbiAgICAgICAgZm9yIChrIG9mIHJlZikge1xuICAgICAgICAgIHYgPSB0aGlzW2tdO1xuICAgICAgICAgIGlmICgodiAhPSBudWxsID8gdi5iaW5kIDogdm9pZCAwKSA9PSBudWxsKSB7XG4gICAgICAgICAgICBSW2tdID0gdjtcbiAgICAgICAgICB9IGVsc2UgaWYgKChyZWYxID0gdltNdWx0aW1peC5pc2Ffa2V5bWV0aG9kX3Byb3h5XSkgIT0gbnVsbCA/IHJlZjEgOiBmYWxzZSkge1xuICAgICAgICAgICAgUltrXSA9IE11bHRpbWl4LmdldF9rZXltZXRob2RfcHJveHkodGhpcywgdik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFJba10gPSB2LmJpbmQodGhpcyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBSO1xuICAgICAgfVxuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgZ2V0X215X3Byb3RvdHlwZSgpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5nZXRQcm90b3R5cGVPZihPYmplY3QuZ2V0UHJvdG90eXBlT2YodGhpcykpO1xuICAgICAgfVxuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgbmV3KC4uLlApIHtcbiAgICAgICAgcmV0dXJuIG5ldyB0aGlzLmNvbnN0cnVjdG9yKC4uLlApO1xuICAgICAgfVxuXG4gICAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gS0VZTUVUSE9EIEZBQ1RPUllcbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBzdGF0aWMgZ2V0X2tleW1ldGhvZF9wcm94eShiaW5kX3RhcmdldCwgZikge1xuICAgICAgICB2YXIgUjtcbiAgICAgICAgUiA9IG5ldyBQcm94eShmLmJpbmQoYmluZF90YXJnZXQpLCB7XG4gICAgICAgICAgZ2V0OiBmdW5jdGlvbih0YXJnZXQsIGtleSkge1xuICAgICAgICAgICAgaWYgKGtleSA9PT0gJ2JpbmQnKSB7IC8vIC4uLiBvdGhlciBwcm9wZXJ0aWVzIC4uLlxuICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0W2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoKHR5cGVvZiBrZXkpID09PSAnc3ltYm9sJykge1xuICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0W2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oLi4ueFApIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldChrZXksIC4uLnhQKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgUltNdWx0aW1peC5pc2Ffa2V5bWV0aG9kX3Byb3h5XSA9IHRydWU7XG4gICAgICAgIHJldHVybiBSO1xuICAgICAgfVxuXG4gICAgfTtcblxuICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gQGpzX3R5cGVfb2YgPSAoIHggKSAtPiByZXR1cm4gKCAoIE9iamVjdDo6dG9TdHJpbmcuY2FsbCB4ICkuc2xpY2UgOCwgLTEgKS50b0xvd2VyQ2FzZSgpXG4gICAgTXVsdGltaXguaXNhX2tleW1ldGhvZF9wcm94eSA9IFN5bWJvbCgncHJveHknKTtcblxuICAgIHJldHVybiBNdWx0aW1peDtcblxuICB9KS5jYWxsKHRoaXMpO1xuXG4gIC8vIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiAgbW9kdWxlLmV4cG9ydHMgPSBNdWx0aW1peDtcblxufSkuY2FsbCh0aGlzKTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bWFpbi5qcy5tYXAiLCIoZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgdmFyIERvbSwgSU5URVJURVhULCBUZXh0LCBkZWJ1ZywgaXNhLCBsb3VwZSwgbWlzZml0LCB0eXBlcywgdmFsaWRhdGU7XG5cbiAgbG91cGUgPSByZXF1aXJlKCcuLi9sb3VwZS5qcycpO1xuXG4gIG1pc2ZpdCA9IFN5bWJvbCgnbWlzZml0Jyk7XG5cbiAgZGVidWcgPSBjb25zb2xlLmRlYnVnO1xuXG4gICh7dHlwZXMsIGlzYSwgdmFsaWRhdGV9ID0gcmVxdWlyZSgnLi90eXBlcycpKTtcblxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIElOVEVSVEVYVCA9IHtcbiAgICBjYW1lbGl6ZTogZnVuY3Rpb24odGV4dCkge1xuICAgICAgLyogdGh4IHRvIGh0dHBzOi8vZ2l0aHViLmNvbS9sb2Rhc2gvbG9kYXNoL2Jsb2IvbWFzdGVyL2NhbWVsQ2FzZS5qcyAqL1xuICAgICAgdmFyIGksIGlkeCwgcmVmLCB3b3JkLCB3b3JkcztcbiAgICAgIHdvcmRzID0gdGV4dC5zcGxpdCgnLScpO1xuICAgICAgZm9yIChpZHggPSBpID0gMSwgcmVmID0gd29yZHMubGVuZ3RoOyBpIDwgcmVmOyBpZHggPSBpICs9ICsxKSB7XG4gICAgICAgIHdvcmQgPSB3b3Jkc1tpZHhdO1xuICAgICAgICBpZiAod29yZCA9PT0gJycpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICB3b3Jkc1tpZHhdID0gd29yZFswXS50b1VwcGVyQ2FzZSgpICsgd29yZC5zbGljZSgxKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB3b3Jkcy5qb2luKCcnKTtcbiAgICB9XG4gIH07XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgVGV4dCA9IGNsYXNzIFRleHQge1xuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgcnByKHgpIHtcbiAgICAgIHJldHVybiBsb3VwZS5pbnNwZWN0KHgpO1xuICAgIH1cblxuICAgIF9wZW4xKHgpIHtcbiAgICAgIGlmIChpc2EudGV4dCh4KSkge1xuICAgICAgICByZXR1cm4geDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJwcih4KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBwZW4oLi4uUCkge1xuICAgICAgcmV0dXJuIChQLm1hcCgoeCkgPT4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGVuMSh4KTtcbiAgICAgIH0pKS5qb2luKCcgJyk7XG4gICAgfVxuXG4gICAgcGVuX2VzY2FwZSguLi5QKSB7XG4gICAgICByZXR1cm4gKFAubWFwKCh4KSA9PiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wZW5fZXNjYXBlMSh4KTtcbiAgICAgIH0pKS5qb2luKCcgJyk7XG4gICAgfVxuXG4gICAgbG9nKC4uLlApIHtcbiAgICAgIHJldHVybiBjb25zb2xlLmxvZyh0aGlzLnBlbiguLi5QKSk7XG4gICAgfVxuXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBfcGVuX2VzY2FwZTEoeCkge1xuICAgICAgaWYgKGlzYS50ZXh0KHgpKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lc2NhcGUoeCk7XG4gICAgICB9XG4gICAgICBpZiAoaXNhLmVsZW1lbnQoeCkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VzY2FwZSh4Lm91dGVySFRNTCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5ycHIoeCk7XG4gICAgfVxuXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBfZXNjYXBlKHgpIHtcbiAgICAgIHJldHVybiB4LnJlcGxhY2UoLyYvZywgJyZhbXA7JykucmVwbGFjZSgvPC9nLCAnJmx0OycpLnJlcGxhY2UoLz4vZywgJyZndDsnKTtcbiAgICB9XG5cbiAgfTtcblxuICBEb20gPSAoZnVuY3Rpb24oKSB7XG4gICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIGNsYXNzIERvbSB7IC8vIGV4dGVuZHMgTXVsdGltaXhcbiAgICAgIC8qIGluc3BpcmVkIGJ5IGh0dHA6Ly95b3VtaWdodG5vdG5lZWRqcXVlcnkuY29tXG4gICAgICAgYW5kIGh0dHBzOi8vYmxvZy5nYXJzdGFzaW8uY29tL3lvdS1kb250LW5lZWQtanF1ZXJ5ICovXG4gICAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgcmVhZHkoZikge1xuICAgICAgICAvLyB0aHggdG8gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9hLzcwNTMxOTcvNzU2ODA5MVxuICAgICAgICAvLyBmdW5jdGlvbiByKGYpey9pbi8udGVzdChkb2N1bWVudC5yZWFkeVN0YXRlKT9zZXRUaW1lb3V0KHIsOSxmKTpmKCl9XG4gICAgICAgIHZhbGlkYXRlLmZ1bmN0aW9uKGYpO1xuICAgICAgICBpZiAoL2luLy50ZXN0KGRvY3VtZW50LnJlYWR5U3RhdGUpKSB7XG4gICAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoKCgpID0+IHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlYWR5KGYpO1xuICAgICAgICAgIH0pLCA5KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZigpO1xuICAgICAgfVxuXG4gICAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gV0FSTklOR1MsIE5PVElGSUNBVElPTlNcbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBfbm90aWZ5KG1lc3NhZ2UpIHtcbiAgICAgICAgdmFyIGJvZHksIGlkLCBtZXNzYWdlX2JveCwgbWVzc2FnZV9wLCBzdHlsZTtcbiAgICAgICAgaWQgPSAnbXNnYng0OTU3Myc7XG4gICAgICAgIG1lc3NhZ2VfYm94ID0gdGhpcy5zZWxlY3QoYCR7aWR9YCwgbnVsbCk7XG4gICAgICAgIGlmIChtZXNzYWdlX2JveCA9PT0gbnVsbCkge1xuICAgICAgICAgIGJvZHkgPSB0aGlzLnNlbGVjdCgnYm9keScsIG51bGwpO1xuICAgICAgICAgIC8qIFRBSU5UIGJvZHkgZWxlbWVudCBjYW5ub3QgYmUgZm91bmQgd2hlbiBtZXRob2QgaXMgY2FsbGVkIGJlZm9yZSBkb2N1bWVudCByZWFkeSwgYnV0IHdlIGNvdWxkIHN0aWxsXG4gICAgICAgICAgICAgICBjb25zdHJ1Y3QgZWxlbWVudCBpbW1lZGlhdGVseSwgYXBwZW5kIGl0IG9uIGRvY3VtZW50IHJlYWR5ICovXG4gICAgICAgICAgaWYgKGJvZHkgPT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzdHlsZSA9IFwiYmFja2dyb3VuZDojMTgxNzFkO1wiO1xuICAgICAgICAgIHN0eWxlICs9IFwicG9zaXRpb246Zml4ZWQ7XCI7XG4gICAgICAgICAgc3R5bGUgKz0gXCJib3R0b206MG1tO1wiO1xuICAgICAgICAgIHN0eWxlICs9IFwiYm9yZGVyOjFtbSBkYXNoZWQgI2UyZmYwMDtcIjtcbiAgICAgICAgICBzdHlsZSArPSBcInBhZGRpbmctbGVmdDozbW07XCI7XG4gICAgICAgICAgc3R5bGUgKz0gXCJwYWRkaW5nLXJpZ2h0OjNtbTtcIjtcbiAgICAgICAgICBzdHlsZSArPSBcInBhZGRpbmctYm90dG9tOjNtbTtcIjtcbiAgICAgICAgICBzdHlsZSArPSBcImZvbnQtZmFtaWx5OnNhbnMtc2VyaWY7XCI7XG4gICAgICAgICAgc3R5bGUgKz0gXCJmb250LXdlaWdodDpib2xkICFpbXBvcnRhbnQ7XCI7XG4gICAgICAgICAgc3R5bGUgKz0gXCJmb250LXNpemU6M21tO1wiO1xuICAgICAgICAgIHN0eWxlICs9IFwiY29sb3I6I2UyZmYwMDtcIjtcbiAgICAgICAgICBzdHlsZSArPSBcIndpZHRoOjEwMCU7XCI7XG4gICAgICAgICAgc3R5bGUgKz0gXCJtYXgtaGVpZ2h0OjMwbW07XCI7XG4gICAgICAgICAgc3R5bGUgKz0gXCJvdmVyZmxvdy15OnNjcm9sbDtcIjtcbiAgICAgICAgICBtZXNzYWdlX2JveCA9IHRoaXMucGFyc2Vfb25lKGA8ZGl2IGlkPSR7aWR9IHN0eWxlPScke3N0eWxlfSc+PC9kaXY+YCk7XG4gICAgICAgICAgdGhpcy5hcHBlbmQoYm9keSwgbWVzc2FnZV9ib3gpO1xuICAgICAgICB9XG4gICAgICAgIG1lc3NhZ2VfcCA9IFwiPHAgc3R5bGU9J3BhZGRpbmctdG9wOjNtbTsnPlwiO1xuICAgICAgICBtZXNzYWdlX3AgKz0gXCLimqDvuI8mbmJzcDs8c3Ryb25nPlwiO1xuICAgICAgICBtZXNzYWdlX3AgKz0gwrUuVEVYVC5wZW5fZXNjYXBlKG1lc3NhZ2UpO1xuICAgICAgICBtZXNzYWdlX3AgKz0gXCI8L3N0cm9uZz48L3A+XCI7XG4gICAgICAgIG1lc3NhZ2VfcCA9IHRoaXMucGFyc2Vfb25lKG1lc3NhZ2VfcCk7XG4gICAgICAgIHRoaXMuaW5zZXJ0X2FzX2xhc3QobWVzc2FnZV9ib3gsIG1lc3NhZ2VfcCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgd2FybiguLi5QKSB7XG4gICAgICAgIC8qIENvbnN0cnVjdCBhIHRleHQgbWVzc2FnZSBmb3IgZGlzcGxheSBpbiBjb25zb2xlIGFuZCBpbiBub3RpZmljYXRpb24gYm94LCBhbG9uZ3NpZGUgd2l0aCBhIHN0YWNrIHRyYWNlXG4gICAgICAgICAgIHRvIGJlIHNob3duIG9ubHkgaW4gdGhlIGNvbnNvbGUsIHByZWNlZCBieSB0aGUgb3JpZ2luYWwgYXJndW1lbnRzIGFzIHBhc3NlZCBpbnRvIHRoaXMgZnVuY3Rpb24sXG4gICAgICAgICAgIG1lYW5pbmcgdGhhdCBhbnkgRE9NIGVsZW1lbnRzIHdpbGwgYmUgZXhwYW5kYWJsZSBsaW5rcyB0byB0aGVpciB2aXNpYmxlIHJlcHJlc2VudGF0aW9ucyBvbiB0aGUgSFRNTFxuICAgICAgICAgICBwYWdlLiAqL1xuICAgICAgICB2YXIgZXJyb3IsIG1lc3NhZ2U7XG4gICAgICAgIG1lc3NhZ2UgPSDCtS5URVhULnBlbiguLi5QKTtcbiAgICAgICAgZXJyb3IgPSBuZXcgRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIGNvbnNvbGUuZ3JvdXBDb2xsYXBzZWQoUFswXSk7XG4gICAgICAgIGNvbnNvbGUud2FybiguLi5QKTtcbiAgICAgICAgY29uc29sZS5ncm91cEVuZCgpO1xuICAgICAgICByZXR1cm4gdGhpcy5fbm90aWZ5KG1lc3NhZ2UpO1xuICAgICAgfVxuXG4gICAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgLyogTk9URSBgwrUuRE9NLnNlbGVjdCgpYCB0byBiZSBkZXByZWNhdGVkIGluIGZhdm9yIG9mIGDCtS5ET00uc2VsZWN0X2ZpcnN0KClgICovXG4gICAgICBzZWxlY3Qoc2VsZWN0b3IsIGZhbGxiYWNrID0gbWlzZml0KSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNlbGVjdF9maXJzdChkb2N1bWVudCwgc2VsZWN0b3IsIGZhbGxiYWNrKTtcbiAgICAgIH1cblxuICAgICAgc2VsZWN0X2ZpcnN0KHNlbGVjdG9yLCBmYWxsYmFjayA9IG1pc2ZpdCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zZWxlY3RfZnJvbShkb2N1bWVudCwgc2VsZWN0b3IsIGZhbGxiYWNrKTtcbiAgICAgIH1cblxuICAgICAgc2VsZWN0X2FsbChzZWxlY3Rvcikge1xuICAgICAgICByZXR1cm4gdGhpcy5zZWxlY3RfYWxsX2Zyb20oZG9jdW1lbnQsIHNlbGVjdG9yKTtcbiAgICAgIH1cblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIC8qIE5PVEUgYMK1LkRPTS5zZWxlY3RfZnJvbSgpYCB0byBiZSBkZXByZWNhdGVkIGluIGZhdm9yIG9mIGDCtS5ET00uc2VsZWN0X2ZpcnN0X2Zyb20oKWAgKi9cbiAgICAgIHNlbGVjdF9mcm9tKGVsZW1lbnQsIHNlbGVjdG9yLCBmYWxsYmFjayA9IG1pc2ZpdCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zZWxlY3RfZmlyc3RfZnJvbShlbGVtZW50LCBzZWxlY3RvciwgZmFsbGJhY2spO1xuICAgICAgfVxuXG4gICAgICBzZWxlY3RfZmlyc3RfZnJvbShlbGVtZW50LCBzZWxlY3RvciwgZmFsbGJhY2sgPSBtaXNmaXQpIHtcbiAgICAgICAgdmFyIFI7XG4gICAgICAgIHZhbGlkYXRlLmRlbGVtZW50KGVsZW1lbnQpO1xuICAgICAgICB2YWxpZGF0ZS5ub25lbXB0eV90ZXh0KHNlbGVjdG9yKTtcbiAgICAgICAgaWYgKChSID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKSkgPT0gbnVsbCkge1xuICAgICAgICAgIGlmIChmYWxsYmFjayA9PT0gbWlzZml0KSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYF7CtURPTS9zZWxlY3RfZnJvbUA3NzU4XiBubyBzdWNoIGVsZW1lbnQ6ICR7wrUuVEVYVC5ycHIoc2VsZWN0b3IpfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gZmFsbGJhY2s7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFI7XG4gICAgICB9XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBzZWxlY3RfYWxsX2Zyb20oZWxlbWVudCwgc2VsZWN0b3IpIHtcbiAgICAgICAgdmFsaWRhdGUuZGVsZW1lbnQoZWxlbWVudCk7XG4gICAgICAgIHZhbGlkYXRlLm5vbmVtcHR5X3RleHQoc2VsZWN0b3IpO1xuICAgICAgICByZXR1cm4gZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICAgIH1cblxuICAgICAgLy8gQXJyYXkuZnJvbSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwgc2VsZWN0b3JcblxuICAgICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgc2VsZWN0X2lkKGlkLCBmYWxsYmFjayA9IG1pc2ZpdCkge1xuICAgICAgICB2YXIgUjtcbiAgICAgICAgdmFsaWRhdGUubm9uZW1wdHlfdGV4dChpZCk7XG4gICAgICAgIGlmICgoUiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKSkgPT0gbnVsbCkge1xuICAgICAgICAgIGlmIChmYWxsYmFjayA9PT0gbWlzZml0KSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYF7CtURPTS9zZWxlY3RfaWRANzc1OF4gbm8gZWxlbWVudCB3aXRoIElEOiAke8K1LlRFWFQucnByKGlkKX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGZhbGxiYWNrO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBSO1xuICAgICAgfVxuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgbWF0Y2hlc19zZWxlY3RvcihlbGVtZW50LCBzZWxlY3Rvcikge1xuICAgICAgICBpZiAoIWlzYS5mdW5jdGlvbihlbGVtZW50ICE9IG51bGwgPyBlbGVtZW50Lm1hdGNoZXMgOiB2b2lkIDApKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBewrVET00vc2VsZWN0X2lkQDc3NTgxXiBleHBlY3RlZCBlbGVtZW50IHdpdGggXFxgbWF0Y2goKVxcYCBtZXRob2QsIGdvdCAke8K1LlRFWFQucnByKGVsZW1lbnQpfWApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlbGVtZW50Lm1hdGNoZXMoc2VsZWN0b3IpO1xuICAgICAgfVxuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgZ2V0KGVsZW1lbnQsIG5hbWUpIHtcbiAgICAgICAgdmFsaWRhdGUuZWxlbWVudChlbGVtZW50KTtcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQuZ2V0QXR0cmlidXRlKG5hbWUpO1xuICAgICAgfVxuXG4gICAgICBnZXRfbnVtZXJpYyhlbGVtZW50LCBuYW1lKSB7XG4gICAgICAgIHJldHVybiBwYXJzZUZsb2F0KHRoaXMuZ2V0KGVsZW1lbnQsIG5hbWUpKTtcbiAgICAgIH1cblxuICAgICAgLy8gV2hlbiBjYWxsZWQgd2l0aCB0d28gYXJndW1lbnRzIGFzIGluIGBzZXQgZGl2LCAnYmFyJ2AsIHdpbGwgc2V0IHZhbHVlcy1sZXNzIGF0dHJpYnV0ZSAoYDxkaXYgYmFyPmApXG4gICAgICBzZXQoZWxlbWVudCwgbmFtZSwgdmFsdWUgPSAnJykge1xuICAgICAgICB2YWxpZGF0ZS5lbGVtZW50KGVsZW1lbnQpO1xuICAgICAgICByZXR1cm4gZWxlbWVudC5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpO1xuICAgICAgfVxuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgZ2V0X2NsYXNzZXMoZWxlbWVudCkge1xuICAgICAgICB2YWxpZGF0ZS5lbGVtZW50KGVsZW1lbnQpO1xuICAgICAgICByZXR1cm4gZWxlbWVudC5jbGFzc0xpc3Q7XG4gICAgICB9XG5cbiAgICAgIGFkZF9jbGFzcyhlbGVtZW50LCBuYW1lKSB7XG4gICAgICAgIHZhbGlkYXRlLmVsZW1lbnQoZWxlbWVudCk7XG4gICAgICAgIHJldHVybiBlbGVtZW50LmNsYXNzTGlzdC5hZGQobmFtZSk7XG4gICAgICB9XG5cbiAgICAgIGhhc19jbGFzcyhlbGVtZW50LCBuYW1lKSB7XG4gICAgICAgIHZhbGlkYXRlLmVsZW1lbnQoZWxlbWVudCk7XG4gICAgICAgIHJldHVybiBlbGVtZW50LmNsYXNzTGlzdC5jb250YWlucyhuYW1lKTtcbiAgICAgIH1cblxuICAgICAgcmVtb3ZlX2NsYXNzKGVsZW1lbnQsIG5hbWUpIHtcbiAgICAgICAgdmFsaWRhdGUuZWxlbWVudChlbGVtZW50KTtcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShuYW1lKTtcbiAgICAgIH1cblxuICAgICAgdG9nZ2xlX2NsYXNzKGVsZW1lbnQsIG5hbWUpIHtcbiAgICAgICAgdmFsaWRhdGUuZWxlbWVudChlbGVtZW50KTtcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQuY2xhc3NMaXN0LnRvZ2dsZShuYW1lKTtcbiAgICAgIH1cblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIHN3YXBfY2xhc3MoZWxlbWVudCwgb2xkX25hbWUsIG5ld19uYW1lKSB7XG4gICAgICAgIGVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShvbGRfbmFtZSk7XG4gICAgICAgIHJldHVybiBlbGVtZW50LmNsYXNzTGlzdC5hZGQobmV3X25hbWUpO1xuICAgICAgfVxuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgaGlkZShlbGVtZW50KSB7XG4gICAgICAgIHZhbGlkYXRlLmVsZW1lbnQoZWxlbWVudCk7XG4gICAgICAgIHJldHVybiBlbGVtZW50LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICB9XG5cbiAgICAgIHNob3coZWxlbWVudCkge1xuICAgICAgICB2YWxpZGF0ZS5lbGVtZW50KGVsZW1lbnQpO1xuICAgICAgICByZXR1cm4gZWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gJyc7XG4gICAgICB9XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBnZXRfbGl2ZV9zdHlsZXMoZWxlbWVudCkge1xuICAgICAgICByZXR1cm4gZ2V0Q29tcHV0ZWRTdHlsZShlbGVtZW50KTtcbiAgICAgIH1cblxuICAgICAgLypcbiAgICAgIGdsb2JhbFRoaXMuZ2V0X3N0eWxlID0gKCBlbGVtZW50LCBwc2V1ZG9fc2VsZWN0b3IsIGF0dHJpYnV0ZV9uYW1lICkgLT5cbiAgICAgICAgdW5sZXNzIGF0dHJpYnV0ZV9uYW1lP1xuICAgICAgICAgIFsgcHNldWRvX3NlbGVjdG9yLCBhdHRyaWJ1dGVfbmFtZSwgXSA9IFsgdW5kZWZpbmVkLCBwc2V1ZG9fc2VsZWN0b3IsIF1cbiAgICAgICAgc3R5bGUgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSBlbGVtZW50LCBwc2V1ZG9fc2VsZWN0b3JcbiAgICAgICAgcmV0dXJuIHN0eWxlLmdldFByb3BlcnR5VmFsdWUgYXR0cmlidXRlX25hbWVcbiAgICAgICovXG4gICAgICAvKiBUQUlOVCBhbHNvIHVzZSBwc2V1ZG9fc2VsZWN0b3IsIHNlZSBhYm92ZSAqL1xuICAgICAgLyogdmFsaWRhdGlvbiBkb25lIGJ5IG1ldGhvZCAqL1xuICAgICAgLyogdmFsaWRhdGlvbiBkb25lIGJ5IG1ldGhvZCAqLyAgICAgIGdldF9zdHlsZV92YWx1ZShlbGVtZW50LCBuYW1lKSB7XG4gICAgICAgIHJldHVybiAoZ2V0Q29tcHV0ZWRTdHlsZShlbGVtZW50KSlbbmFtZV07XG4gICAgICB9XG5cbiAgICAgIGdldF9udW1lcmljX3N0eWxlX3ZhbHVlKGVsZW1lbnQsIG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIHBhcnNlRmxvYXQoKGdldENvbXB1dGVkU3R5bGUoZWxlbWVudCkpW25hbWVdKTtcbiAgICAgIH1cblxuICAgICAgLyogdGh4IHRvIGh0dHBzOi8vZGF2aWR3YWxzaC5uYW1lL2Nzcy12YXJpYWJsZXMtamF2YXNjcmlwdCAqL1xuICAgICAgZ2V0X3Byb3BfdmFsdWUoZWxlbWVudCwgbmFtZSkge1xuICAgICAgICByZXR1cm4gKGdldENvbXB1dGVkU3R5bGUoZWxlbWVudCkpLmdldFByb3BlcnR5VmFsdWUobmFtZSk7XG4gICAgICB9XG5cbiAgICAgIGdldF9udW1lcmljX3Byb3BfdmFsdWUoZWxlbWVudCwgbmFtZSkge1xuICAgICAgICByZXR1cm4gcGFyc2VGbG9hdCgoZ2V0Q29tcHV0ZWRTdHlsZShlbGVtZW50KSkuZ2V0UHJvcGVydHlWYWx1ZShuYW1lKSk7XG4gICAgICB9XG5cbiAgICAgIC8qIHRoeCB0byBodHRwczovL2Rhdmlkd2Fsc2gubmFtZS9jc3MtdmFyaWFibGVzLWphdmFzY3JpcHQgKi9cbiAgICAgIGdldF9nbG9iYWxfcHJvcF92YWx1ZShuYW1lKSB7XG4gICAgICAgIHJldHVybiAoZ2V0Q29tcHV0ZWRTdHlsZShkb2N1bWVudCkpLmdldFByb3BlcnR5VmFsdWUobmFtZSk7XG4gICAgICB9XG5cbiAgICAgIGdldF9udW1lcmljX2dsb2JhbF9wcm9wX3ZhbHVlKG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIHBhcnNlRmxvYXQoKGdldENvbXB1dGVkU3R5bGUoZG9jdW1lbnQpKS5nZXRQcm9wZXJ0eVZhbHVlKG5hbWUpKTtcbiAgICAgIH1cblxuICAgICAgc2V0X2dsb2JhbF9wcm9wX3ZhbHVlKG5hbWUsIHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUuc2V0UHJvcGVydHkobmFtZSwgdmFsdWUpO1xuICAgICAgfVxuXG4gICAgICAvLyAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIC8vIHNldF9wcm9wX2RlZmF1bHRzID0gLT5cbiAgICAgIC8vICAgIyMjIFRoZXJlIHNob3VkIGJlIGEgYmV0dGVyIHdheSB0byBpbmplY3Qgc3R5bGVzICMjI1xuICAgICAgLy8gICByZXR1cm4gbnVsbCBpZiBfc2V0X3Byb3BfZGVmYXVsdHNcbiAgICAgIC8vICAgIyBoZWFkX2RvbSA9IMK1LkRPTS5zZWxlY3RfZmlyc3QgJ2hlYWQnXG4gICAgICAvLyAgICMgc3R5bGVfdHh0ID0gXCJcIlwiXG4gICAgICAvLyAgICMgPHN0eWxlPlxuICAgICAgLy8gICAjICAgKiB7XG4gICAgICAvLyAgICMgICAgIG91dGxpbmU6ICAgICAgIDJweCBzb2xpZCB5ZWxsb3c7IH1cbiAgICAgIC8vICAgIyAgIDwvc3R5bGU+XG4gICAgICAvLyAgICMgXCJcIlwiXG4gICAgICAvLyAgICMgaGVhZF9kb20uaW5uZXJIVE1MID0gc3R5bGVfdHh0ICsgaGVhZF9kb20uaW5uZXJIVE1MXG4gICAgICAvLyAgIHRvcGhhdF9kb20gPSDCtS5ET00uc2VsZWN0X2ZpcnN0ICcjdG9waGF0J1xuICAgICAgLy8gICDCtS5ET00uaW5zZXJ0X2JlZm9yZSB0b3BoYXRfZG9tLCDCtS5ET00ucGFyc2Vfb25lIFwiXCJcIlxuICAgICAgLy8gICA8c3R5bGU+XG4gICAgICAvLyAgICAgKiB7XG4gICAgICAvLyAgICAgICBvdXRsaW5lOiAgICAgICAycHggc29saWQgeWVsbG93OyB9XG4gICAgICAvLyAgICAgOnJvb3Qge1xuICAgICAgLy8gICAgICAgLS1oc3RuLXNsaWRlci10cmFjay1iZ2NvbG9yOiAgICBsaW1lOyB9XG4gICAgICAvLyAgICAgPC9zdHlsZT5cbiAgICAgIC8vICAgXCJcIlwiXG4gICAgICAvLyAgIHJldHVybiBudWxsXG5cbiAgICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIHNldF9zdHlsZV9ydWxlKGVsZW1lbnQsIG5hbWUsIHZhbHVlKSB7XG4gICAgICAgIC8qIHNlZSBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvRWxlbWVudENTU0lubGluZVN0eWxlL3N0eWxlICovXG4gICAgICAgIHZhbGlkYXRlLmVsZW1lbnQoZWxlbWVudCk7XG4gICAgICAgIHZhbGlkYXRlLm5vbmVtcHR5X3RleHQobmFtZSk7XG4gICAgICAgIHJldHVybiBlbGVtZW50LnN0eWxlW0lOVEVSVEVYVC5jYW1lbGl6ZShuYW1lKV0gPSB2YWx1ZTtcbiAgICAgIH1cblxuICAgICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIEVMRU1FTlQgQ1JFQVRJT05cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBwYXJzZV9vbmUoZWxlbWVudF9odG1sKSB7XG4gICAgICAgIHZhciBSLCBsZW5ndGg7XG4gICAgICAgIFIgPSB0aGlzLnBhcnNlX2FsbChlbGVtZW50X2h0bWwpO1xuICAgICAgICBpZiAoKGxlbmd0aCA9IFIubGVuZ3RoKSAhPT0gMSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgXsK1RE9NL3BhcnNlX29uZUA3NTU4XiBleHBlY3RlZCBIVE1MIGZvciAxIGVsZW1lbnQgYnV0IGdvdCAke2xlbmd0aH1gKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gUlswXTtcbiAgICAgIH1cblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIHBhcnNlX2FsbChodG1sKSB7XG4gICAgICAgIHZhciBSO1xuICAgICAgICAvKiBUQUlOVCByZXR1cm4gQXJyYXkgb3IgSFRNTENvbGxlY3Rpb24/ICovXG4gICAgICAgIHZhbGlkYXRlLm5vbmVtcHR5X3RleHQoaHRtbCk7XG4gICAgICAgIFIgPSBkb2N1bWVudC5pbXBsZW1lbnRhdGlvbi5jcmVhdGVIVE1MRG9jdW1lbnQoKTtcbiAgICAgICAgUi5ib2R5LmlubmVySFRNTCA9IGh0bWw7XG4gICAgICAgIHJldHVybiBSLmJvZHkuY2hpbGRyZW47XG4gICAgICB9XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBuZXdfZWxlbWVudCh4bmFtZSwgLi4uUCkge1xuICAgICAgICAvKiBUQUlOVCBhbmFseXplIHhuYW1lIChhIGxhIGBkaXYjaWQ0Mi5mb28uYmFyYCkgYXMgZG9uZSBpbiBJbnRlcnRleHQuQ3Vwb2ZodG1sICovXG4gICAgICAgIC8qIFRBSU5UIGluIHNvbWUgY2FzZXMgdXNpbmcgaW5uZXJIVE1MLCBkb2N1bWVudEZyYWdtZW50IG1heSBiZSBhZHZhbnRhZ2VvdXMgKi9cbiAgICAgICAgdmFyIFIsIGF0dHJpYnV0ZXMsIGksIGssIGxlbiwgcCwgdGV4dCwgdjtcbiAgICAgICAgUiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoeG5hbWUpO1xuICAgICAgICBhdHRyaWJ1dGVzID0ge307XG4gICAgICAgIHRleHQgPSBudWxsO1xuICAgICAgICBmb3IgKGkgPSAwLCBsZW4gPSBQLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgcCA9IFBbaV07XG4gICAgICAgICAgaWYgKGlzYS50ZXh0KHApKSB7XG4gICAgICAgICAgICB0ZXh0ID0gcDtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBhdHRyaWJ1dGVzID0gT2JqZWN0LmFzc2lnbihhdHRyaWJ1dGVzLCBwKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGV4dCAhPSBudWxsKSB7XG4gICAgICAgICAgLyogVEFJTlQgY2hlY2sgdHlwZT8gKi8gICAgICAgICAgUi50ZXh0Q29udGVudCA9IHRleHQ7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChrIGluIGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICB2ID0gYXR0cmlidXRlc1trXTtcbiAgICAgICAgICBSLnNldEF0dHJpYnV0ZShrLCB2KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gUjtcbiAgICAgIH1cblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIGRlZXBfY29weShlbGVtZW50KSB7XG4gICAgICAgIHJldHVybiBlbGVtZW50LmNsb25lTm9kZSh0cnVlKTtcbiAgICAgIH1cblxuICAgICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIE9VVEVSLCBJTk5FUiBIVE1MXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgZ2V0X2lubmVyX2h0bWwoZWxlbWVudCkge1xuICAgICAgICB2YWxpZGF0ZS5lbGVtZW50KGVsZW1lbnQpO1xuICAgICAgICByZXR1cm4gZWxlbWVudC5pbm5lckhUTUw7XG4gICAgICB9XG5cbiAgICAgIGdldF9vdXRlcl9odG1sKGVsZW1lbnQpIHtcbiAgICAgICAgdmFsaWRhdGUuZWxlbWVudChlbGVtZW50KTtcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQub3V0ZXJIVE1MO1xuICAgICAgfVxuXG4gICAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gSU5TRVJUSU9OXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgaW5zZXJ0KHBvc2l0aW9uLCB0YXJnZXQsIHgpIHtcbiAgICAgICAgc3dpdGNoIChwb3NpdGlvbikge1xuICAgICAgICAgIGNhc2UgJ2JlZm9yZSc6XG4gICAgICAgICAgY2FzZSAnYmVmb3JlYmVnaW4nOlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5zZXJ0X2JlZm9yZSh0YXJnZXQsIHgpO1xuICAgICAgICAgIGNhc2UgJ2FzX2ZpcnN0JzpcbiAgICAgICAgICBjYXNlICdhZnRlcmJlZ2luJzpcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmluc2VydF9hc19maXJzdCh0YXJnZXQsIHgpO1xuICAgICAgICAgIGNhc2UgJ2FzX2xhc3QnOlxuICAgICAgICAgIGNhc2UgJ2JlZm9yZWVuZCc6XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbnNlcnRfYXNfbGFzdCh0YXJnZXQsIHgpO1xuICAgICAgICAgIGNhc2UgJ2FmdGVyJzpcbiAgICAgICAgICBjYXNlICdhZnRlcmVuZCc6XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbnNlcnRfYWZ0ZXIodGFyZ2V0LCB4KTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYF7CtURPTS9pbnNlcnRANzc1OF4gbm90IGEgdmFsaWQgcG9zaXRpb246ICR7wrUuVEVYVC5ycHIocG9zaXRpb24pfWApO1xuICAgICAgfVxuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgLyogTk9URSBwZW5kaW5nIHByYWN0aWNhbCBjb25zaWRlcmF0aW9ucyBhbmQgYmVuY2htYXJrcyB3ZSB3aWxsIHByb2JhYmx5IHJlbW92ZSBvbmUgb2YgdGhlIHR3byBzZXRzXG4gICAgICAgb2YgaW5zZXJ0aW9uIG1ldGhvZHMgKi9cbiAgICAgIGluc2VydF9iZWZvcmUodGFyZ2V0LCB4KSB7XG4gICAgICAgIHZhbGlkYXRlLmVsZW1lbnQodGFyZ2V0KTtcbiAgICAgICAgcmV0dXJuIHRhcmdldC5pbnNlcnRBZGphY2VudEVsZW1lbnQoJ2JlZm9yZWJlZ2luJywgeCk7XG4gICAgICB9XG5cbiAgICAgIGluc2VydF9hc19maXJzdCh0YXJnZXQsIHgpIHtcbiAgICAgICAgdmFsaWRhdGUuZWxlbWVudCh0YXJnZXQpO1xuICAgICAgICByZXR1cm4gdGFyZ2V0Lmluc2VydEFkamFjZW50RWxlbWVudCgnYWZ0ZXJiZWdpbicsIHgpO1xuICAgICAgfVxuXG4gICAgICBpbnNlcnRfYXNfbGFzdCh0YXJnZXQsIHgpIHtcbiAgICAgICAgdmFsaWRhdGUuZWxlbWVudCh0YXJnZXQpO1xuICAgICAgICByZXR1cm4gdGFyZ2V0Lmluc2VydEFkamFjZW50RWxlbWVudCgnYmVmb3JlZW5kJywgeCk7XG4gICAgICB9XG5cbiAgICAgIGluc2VydF9hZnRlcih0YXJnZXQsIHgpIHtcbiAgICAgICAgdmFsaWRhdGUuZWxlbWVudCh0YXJnZXQpO1xuICAgICAgICByZXR1cm4gdGFyZ2V0Lmluc2VydEFkamFjZW50RWxlbWVudCgnYWZ0ZXJlbmQnLCB4KTtcbiAgICAgIH1cblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIGJlZm9yZSh0YXJnZXQsIC4uLngpIHtcbiAgICAgICAgdmFsaWRhdGUuZWxlbWVudCh0YXJnZXQpO1xuICAgICAgICByZXR1cm4gdGFyZ2V0LmJlZm9yZSguLi54KTtcbiAgICAgIH1cblxuICAgICAgcHJlcGVuZCh0YXJnZXQsIC4uLngpIHtcbiAgICAgICAgdmFsaWRhdGUuZWxlbWVudCh0YXJnZXQpO1xuICAgICAgICByZXR1cm4gdGFyZ2V0LnByZXBlbmQoLi4ueCk7XG4gICAgICB9XG5cbiAgICAgIGFwcGVuZCh0YXJnZXQsIC4uLngpIHtcbiAgICAgICAgdmFsaWRhdGUuZWxlbWVudCh0YXJnZXQpO1xuICAgICAgICByZXR1cm4gdGFyZ2V0LmFwcGVuZCguLi54KTtcbiAgICAgIH1cblxuICAgICAgYWZ0ZXIodGFyZ2V0LCAuLi54KSB7XG4gICAgICAgIHZhbGlkYXRlLmVsZW1lbnQodGFyZ2V0KTtcbiAgICAgICAgcmV0dXJuIHRhcmdldC5hZnRlciguLi54KTtcbiAgICAgIH1cblxuICAgICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIFJFTU9WQUxcbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICByZW1vdmUoZWxlbWVudCkge1xuICAgICAgICAvKiBzZWUgaHR0cDovL3lvdW1pZ2h0bm90bmVlZGpxdWVyeS5jb20vI3JlbW92ZSAqL1xuICAgICAgICB2YWxpZGF0ZS5lbGVtZW50KGVsZW1lbnQpO1xuICAgICAgICByZXR1cm4gZWxlbWVudC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGVsZW1lbnQpO1xuICAgICAgfVxuXG4gICAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gR0VPTUVUUllcbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAvKiBOT1RFIG9ic2VydmUgdGhhdCBgRE9NLmdldF9vZmZzZXRfdG9wKClgIGFuZCBgZWxlbWVudC5vZmZzZXRUb3BgIGFyZSB0d28gZGlmZmVyZW50IHRoaW5nczsgdGVybWlub2xvZ3lcbiAgICAgICBpcyBjb25mdXNpbmcgaGVyZSwgc28gY29uc2lkZXIgcmVuYW1pbmcgdG8gYXZvaWQgYG9mZnNldGAgYWx0b2dldGhlciAqL1xuICAgICAgZ2V0X29mZnNldF90b3AoZWxlbWVudCkge1xuICAgICAgICByZXR1cm4gKHRoaXMuZ2V0X29mZnNldChlbGVtZW50KSkudG9wO1xuICAgICAgfVxuXG4gICAgICBnZXRfb2Zmc2V0X2xlZnQoZWxlbWVudCkge1xuICAgICAgICByZXR1cm4gKHRoaXMuZ2V0X29mZnNldChlbGVtZW50KSkubGVmdDtcbiAgICAgIH1cblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIGdldF9vZmZzZXQoZWxlbWVudCkge1xuICAgICAgICB2YXIgcmVjdGFuZ2xlO1xuICAgICAgICAvKiBzZWUgaHR0cDovL3lvdW1pZ2h0bm90bmVlZGpxdWVyeS5jb20vI29mZnNldCAqL1xuICAgICAgICB2YWxpZGF0ZS5lbGVtZW50KGVsZW1lbnQpO1xuICAgICAgICByZWN0YW5nbGUgPSBlbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHRvcDogcmVjdGFuZ2xlLnRvcCArIGRvY3VtZW50LmJvZHkuc2Nyb2xsVG9wLFxuICAgICAgICAgIGxlZnQ6IHJlY3RhbmdsZS5sZWZ0ICsgZG9jdW1lbnQuYm9keS5zY3JvbGxMZWZ0XG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAvKiBzZWUgaHR0cDovL3lvdW1pZ2h0bm90bmVlZGpxdWVyeS5jb20vI2dldF93aWR0aCAqL1xuICAgICAgZ2V0X3dpZHRoKGVsZW1lbnQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0X251bWVyaWNfc3R5bGVfdmFsdWUoZWxlbWVudCwgJ3dpZHRoJyk7XG4gICAgICB9XG5cbiAgICAgIGdldF9oZWlnaHQoZWxlbWVudCkge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRfbnVtZXJpY19zdHlsZV92YWx1ZShlbGVtZW50LCAnaGVpZ2h0Jyk7XG4gICAgICB9XG5cbiAgICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAvLyBFVkVOVFNcbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBvbihlbGVtZW50LCBuYW1lLCBoYW5kbGVyKSB7XG4gICAgICAgIC8qIFRBSU5UIGFkZCBvcHRpb25zICovXG4gICAgICAgIC8qIHNlZSBodHRwOi8veW91bWlnaHRub3RuZWVkanF1ZXJ5LmNvbS8jb24sIGh0dHA6Ly95b3VtaWdodG5vdG5lZWRqcXVlcnkuY29tLyNkZWxlZ2F0ZSAqL1xuICAgICAgICAvKiBBbHNvIG5vdGUgdGhlIGFkZGl0aW9uIG9mIGEgYHBhc3NpdmU6IGZhbHNlYCBwYXJhbWV0ZXIgKGFzIGluIGBodG1sX2RvbS5hZGRFdmVudExpc3RlbmVyICd3aGVlbCcsIGYsXG4gICAgICAgICAgIHsgcGFzc2l2ZTogZmFsc2UsIH1gKTsgc2VlIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vYS81NTQ2MTYzMi8yNTYzNjE7IGFwcGFyZW50bHkgaXQgaXMgYSByZWNlbnRseVxuICAgICAgICAgICBpbnRyb2R1Y2VkIGZlYXR1cmUgb2YgYnJvd3NlciBldmVudCBwcm9jZXNzaW5nOyBzZWUgYWxzbyBbSlF1ZXJ5IGlzc3VlICMyODcxICpBZGQgc3VwcG9ydCBmb3IgcGFzc2l2ZVxuICAgICAgICAgICBldmVudCBsaXN0ZW5lcnMqXShodHRwczovL2dpdGh1Yi5jb20vanF1ZXJ5L2pxdWVyeS9pc3N1ZXMvMjg3MSksIG9wZW4gYXMgb2YgRGVjIDIwMjAgKi9cbiAgICAgICAgdmFsaWRhdGUuZGVsZW1lbnQoZWxlbWVudCk7XG4gICAgICAgIHZhbGlkYXRlLm5vbmVtcHR5X3RleHQobmFtZSk7XG4gICAgICAgIHZhbGlkYXRlLmZ1bmN0aW9uKGhhbmRsZXIpO1xuICAgICAgICByZXR1cm4gZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKG5hbWUsIGhhbmRsZXIsIGZhbHNlKTtcbiAgICAgIH1cblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIGVtaXRfY3VzdG9tX2V2ZW50KG5hbWUsIG9wdGlvbnMpIHtcbiAgICAgICAgLy8gdGh4IHRvIGh0dHBzOi8vd3d3LmphdmFzY3JpcHR0dXRvcmlhbC5uZXQvamF2YXNjcmlwdC1kb20vamF2YXNjcmlwdC1jdXN0b20tZXZlbnRzL1xuICAgICAgICAvKiBBY2MuIHRvIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9FdmVudC9FdmVudCxcbiAgICAgICAgICAgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL0N1c3RvbUV2ZW50L0N1c3RvbUV2ZW50LCBhbGxvd2FibGUgZmllbGRzIGZvciBgb3B0aW9uc2BcbiAgICAgICAgICAgaW5jbHVkZSBgYnViYmxlc2AsIGBjYW5jZWxhYmxlYCwgYGNvbXBvc2VkYCwgYGRldGFpbGA7IHRoZSBsYXN0IG9uZSBtYXkgY29udGFpbiBhcmJpdHJhcnkgZGF0YSBhbmQgY2FuXG4gICAgICAgICAgIGJlIHJldHJpZXZlZCBhcyBgZXZlbnQuZGV0YWlsYC4gKi9cbiAgICAgICAgdmFsaWRhdGUubm9uZW1wdHlfdGV4dChuYW1lKTtcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KG5hbWUsIG9wdGlvbnMpKTtcbiAgICAgIH1cblxuICAgICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIERSQUdHQUJMRVNcbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBtYWtlX2RyYWdnYWJsZShlbGVtZW50KSB7XG4gICAgICAgIHZhciBpZCwgb25fZHJhZ19zdGFydCwgb25fZHJvcDtcbiAgICAgICAgLyogdGh4IHRvIGh0dHA6Ly9qc2ZpZGRsZS5uZXQvcm9iZXJ0Yy9rS3VxSC9cbiAgICAgICAgICAgaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9hLzYyMzk4ODIvNzU2ODA5MSAqL1xuICAgICAgICB0aGlzLl9hdHRhY2hfZHJhZ292ZXIoKTtcbiAgICAgICAgdGhpcy5fcHJ2X2RyYWdnYWJsZV9pZCsrO1xuICAgICAgICBpZCA9IHRoaXMuX3Bydl9kcmFnZ2FibGVfaWQ7XG4gICAgICAgIHRoaXMuc2V0KGVsZW1lbnQsICdkcmFnZ2FibGUnLCB0cnVlKTtcbiAgICAgICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgICAgIHRoaXMub24oZWxlbWVudCwgJ2RyYWdzdGFydCcsIG9uX2RyYWdfc3RhcnQgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgIHZhciBzdHlsZSwgeCwgeTtcbiAgICAgICAgICBzdHlsZSA9IMK1LkRPTS5nZXRfbGl2ZV9zdHlsZXMoZXZlbnQudGFyZ2V0KTtcbiAgICAgICAgICB4ID0gKHBhcnNlSW50KHN0eWxlLmxlZnQsIDEwKSkgLSBldmVudC5jbGllbnRYO1xuICAgICAgICAgIHkgPSAocGFyc2VJbnQoc3R5bGUudG9wLCAxMCkpIC0gZXZlbnQuY2xpZW50WTtcbiAgICAgICAgICByZXR1cm4gZXZlbnQuZGF0YVRyYW5zZmVyLnNldERhdGEoJ2FwcGxpY2F0aW9uL2pzb24nLCBKU09OLnN0cmluZ2lmeSh7eCwgeSwgaWR9KSk7XG4gICAgICAgIH0pO1xuICAgICAgICAvLy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAgICAgdGhpcy5vbihkb2N1bWVudC5ib2R5LCAnZHJvcCcsIG9uX2Ryb3AgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgIHZhciBsZWZ0LCB0b3AsIHRyYW5zZmVyO1xuICAgICAgICAgIHRyYW5zZmVyID0gSlNPTi5wYXJzZShldmVudC5kYXRhVHJhbnNmZXIuZ2V0RGF0YSgnYXBwbGljYXRpb24vanNvbicpKTtcbiAgICAgICAgICBpZiAoaWQgIT09IHRyYW5zZmVyLmlkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGxlZnQgPSBldmVudC5jbGllbnRYICsgdHJhbnNmZXIueCArICdweCc7XG4gICAgICAgICAgdG9wID0gZXZlbnQuY2xpZW50WSArIHRyYW5zZmVyLnkgKyAncHgnO1xuICAgICAgICAgIMK1LkRPTS5zZXRfc3R5bGVfcnVsZShlbGVtZW50LCAnbGVmdCcsIGxlZnQpO1xuICAgICAgICAgIMK1LkRPTS5zZXRfc3R5bGVfcnVsZShlbGVtZW50LCAndG9wJywgdG9wKTtcbiAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIF9hdHRhY2hfZHJhZ292ZXIoKSB7XG4gICAgICAgIHZhciBvbl9kcmFnb3ZlcjtcbiAgICAgICAgLyogVEFJTlQgQXBwYXJlbnRseSBuZWVkIGZvciBjb3JyZWN0IGRyYWdnaW5nIGJlaGF2aW9yLCBidXQgd2hhdCBpZiB3ZSB3YW50ZWQgdG8gaGFuZGxlIHRoaXMgZXZlbnQ/ICovXG4gICAgICAgIHRoaXMub24oZG9jdW1lbnQuYm9keSwgJ2RyYWdvdmVyJywgb25fZHJhZ292ZXIgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5fYXR0YWNoX2RyYWdvdmVyID0gZnVuY3Rpb24oKSB7fTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICB9O1xuXG4gICAgLy8uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICBEb20ucHJvdG90eXBlLl9wcnZfZHJhZ2dhYmxlX2lkID0gMDtcblxuICAgIHJldHVybiBEb207XG5cbiAgfSkuY2FsbCh0aGlzKTtcblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIE1BR0lDXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgdGhpcy5fbWFnaWMgPSBTeW1ib2wuZm9yKCfCtURPTScpO1xuXG4gIHRoaXMuVEVYVCA9IG5ldyBUZXh0KCk7XG5cbiAgdGhpcy5ET00gPSBuZXcgRG9tKCk7XG5cbiAgdGhpcy5MSU5FRklOREVSID0gcmVxdWlyZSgnLi9saW5lZmluZGVyJyk7XG5cbiAgdGhpcy5LQiA9IG5ldyAocmVxdWlyZSgnLi9rYicpKS5LYigpO1xuXG4gIC8vIG1vZHVsZS5leHBvcnRzLnJwciAgICAgPz0gbW9kdWxlLmV4cG9ydHMuwrUuVEVYVC5ycHIuYmluZCggwrUuVEVYVCApXG4vLyBtb2R1bGUuZXhwb3J0cy5sb2cgICAgID89IG1vZHVsZS5leHBvcnRzLsK1LlRFWFQubG9nLmJpbmQoIMK1LlRFWFQgKVxuLypcblxuaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9hLzExNzk4OC83NTY4MDkxXG5cbmlubmVySFRNTCBpcyByZW1hcmthYmx5IGZhc3QsIGFuZCBpbiBtYW55IGNhc2VzIHlvdSB3aWxsIGdldCB0aGUgYmVzdCByZXN1bHRzIGp1c3Qgc2V0dGluZyB0aGF0IChJIHdvdWxkXG5qdXN0IHVzZSBhcHBlbmQpLlxuXG5Ib3dldmVyLCBpZiB0aGVyZSBpcyBtdWNoIGFscmVhZHkgaW4gXCJteWRpdlwiIHRoZW4geW91IGFyZSBmb3JjaW5nIHRoZSBicm93c2VyIHRvIHBhcnNlIGFuZCByZW5kZXIgYWxsIG9mXG50aGF0IGNvbnRlbnQgYWdhaW4gKGV2ZXJ5dGhpbmcgdGhhdCB3YXMgdGhlcmUgYmVmb3JlLCBwbHVzIGFsbCBvZiB5b3VyIG5ldyBjb250ZW50KS4gWW91IGNhbiBhdm9pZCB0aGlzIGJ5XG5hcHBlbmRpbmcgYSBkb2N1bWVudCBmcmFnbWVudCBvbnRvIFwibXlkaXZcIiBpbnN0ZWFkOlxuXG52YXIgZnJhZyA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbmZyYWcuaW5uZXJIVE1MID0gaHRtbDtcbiQoXCIjbXlkaXZcIikuYXBwZW5kKGZyYWcpO1xuSW4gdGhpcyB3YXksIG9ubHkgeW91ciBuZXcgY29udGVudCBnZXRzIHBhcnNlZCAodW5hdm9pZGFibGUpIGFuZCB0aGUgZXhpc3RpbmcgY29udGVudCBkb2VzIG5vdC5cblxuRURJVDogTXkgYmFkLi4uIEkndmUgZGlzY292ZXJlZCB0aGF0IGlubmVySFRNTCBpc24ndCB3ZWxsIHN1cHBvcnRlZCBvbiBkb2N1bWVudCBmcmFnbWVudHMuIFlvdSBjYW4gdXNlIHRoZVxuc2FtZSB0ZWNobmlxdWUgd2l0aCBhbnkgbm9kZSB0eXBlLiBGb3IgeW91ciBleGFtcGxlLCB5b3UgY291bGQgY3JlYXRlIHRoZSByb290IHRhYmxlIG5vZGUgYW5kIGluc2VydCB0aGVcbmlubmVySFRNTCBpbnRvIHRoYXQ6XG5cbnZhciBmcmFnID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGFibGUnKTtcbmZyYWcuaW5uZXJIVE1MID0gdGFibGVJbm5lckh0bWw7XG4kKFwiI215ZGl2XCIpLmFwcGVuZChmcmFnKTtcblxuKi9cblxufSkuY2FsbCh0aGlzKTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bWFpbi5qcy5tYXAiXX0=
