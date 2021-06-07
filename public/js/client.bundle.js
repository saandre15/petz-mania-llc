/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/@lixuc/jsmpeg/index.js":
/*!*********************************************!*\
  !*** ./node_modules/@lixuc/jsmpeg/index.js ***!
  \*********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const JSMpeg = __webpack_require__(/*! ./src/jsmpeg */ "./node_modules/@lixuc/jsmpeg/src/jsmpeg.js");

JSMpeg.VideoElement = __webpack_require__(/*! ./src/video-element */ "./node_modules/@lixuc/jsmpeg/src/video-element.js");
JSMpeg.Player = __webpack_require__(/*! ./src/player */ "./node_modules/@lixuc/jsmpeg/src/player.js");
JSMpeg.BitBuffer = __webpack_require__(/*! ./src/buffer */ "./node_modules/@lixuc/jsmpeg/src/buffer.js");
JSMpeg.Source.Ajax = __webpack_require__(/*! ./src/ajax */ "./node_modules/@lixuc/jsmpeg/src/ajax.js");
JSMpeg.Source.AjaxProgressive = __webpack_require__(/*! ./src/ajax-progressive */ "./node_modules/@lixuc/jsmpeg/src/ajax-progressive.js");
JSMpeg.Source.WebSocket = __webpack_require__(/*! ./src/websocket */ "./node_modules/@lixuc/jsmpeg/src/websocket.js");
JSMpeg.Demuxer.TS = __webpack_require__(/*! ./src/ts */ "./node_modules/@lixuc/jsmpeg/src/ts.js");
JSMpeg.Decoder.Base = __webpack_require__(/*! ./src/decoder */ "./node_modules/@lixuc/jsmpeg/src/decoder.js");
JSMpeg.Decoder.MPEG1Video = __webpack_require__(/*! ./src/mpeg1 */ "./node_modules/@lixuc/jsmpeg/src/mpeg1.js");
JSMpeg.Decoder.MP2Audio = __webpack_require__(/*! ./src/mp2 */ "./node_modules/@lixuc/jsmpeg/src/mp2.js");
JSMpeg.Renderer.WebGL = __webpack_require__(/*! ./src/webgl */ "./node_modules/@lixuc/jsmpeg/src/webgl.js");
JSMpeg.Renderer.Canvas2D = __webpack_require__(/*! ./src/canvas2d */ "./node_modules/@lixuc/jsmpeg/src/canvas2d.js");
JSMpeg.AudioOutput.WebAudio = __webpack_require__(/*! ./src/webaudio */ "./node_modules/@lixuc/jsmpeg/src/webaudio.js");

module.exports = JSMpeg;


/***/ }),

/***/ "./node_modules/@lixuc/jsmpeg/src/ajax-progressive.js":
/*!************************************************************!*\
  !*** ./node_modules/@lixuc/jsmpeg/src/ajax-progressive.js ***!
  \************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const JSMpeg = __webpack_require__(/*! ./jsmpeg */ "./node_modules/@lixuc/jsmpeg/src/jsmpeg.js");

var AjaxProgressiveSource = function(url, options) {
	this.url = url;
	this.destination = null;
	this.request = null;

	this.completed = false;
	this.established = false;
	this.progress = 0;

	this.fileSize = 0;
	this.loadedSize = 0;
	this.chunkSize = options.chunkSize || 1024*1024;

	this.isLoading = false;
	this.loadStartTime = 0;
	this.throttled = options.throttled !== false;
	this.aborted = false;
};

AjaxProgressiveSource.prototype.connect = function(destination) {
	this.destination = destination;
};

AjaxProgressiveSource.prototype.start = function() {
	this.request = new XMLHttpRequest();

	this.request.onreadystatechange = function() {
		if (this.request.readyState === this.request.DONE) {
			this.fileSize = parseInt(
				this.request.getResponseHeader("Content-Length")
			);
			this.loadNextChunk();
		}
	}.bind(this);

	this.request.onprogress = this.onProgress.bind(this);
	this.request.open('HEAD', this.url);
	this.request.send();
};

AjaxProgressiveSource.prototype.resume = function(secondsHeadroom) {
	if (this.isLoading || !this.throttled) {
		return;
	}

	// Guess the worst case loading time with lots of safety margin. This is
	// somewhat arbitrary...
	var worstCaseLoadingTime = this.loadTime * 8 + 2;
	if (worstCaseLoadingTime > secondsHeadroom) {
		this.loadNextChunk();
	}
};

AjaxProgressiveSource.prototype.destroy = function() {
	this.request.abort();
	this.aborted = true;
};

AjaxProgressiveSource.prototype.loadNextChunk = function() {
	var start = this.loadedSize,
		end = Math.min(this.loadedSize + this.chunkSize-1, this.fileSize-1);

	if (start >= this.fileSize || this.aborted) {
		this.completed = true;
		return;
	}

	this.isLoading = true;
	this.loadStartTime = JSMpeg.Now();
	this.request = new XMLHttpRequest();

	this.request.onreadystatechange = function() {
		if (
			this.request.readyState === this.request.DONE &&
			this.request.status >= 200 && this.request.status < 300
		) {
			this.onChunkLoad(this.request.response);
		}
		else if (this.request.readyState === this.request.DONE) {
			// Retry?
			if (this.loadFails++ < 3) {
				this.loadNextChunk();
			}
		}
	}.bind(this);

	if (start === 0) {
		this.request.onprogress = this.onProgress.bind(this);
	}

	this.request.open('GET', this.url+'?'+start+"-"+end);
	this.request.setRequestHeader("Range", "bytes="+start+"-"+end);
	this.request.responseType = "arraybuffer";
	this.request.send();
};

AjaxProgressiveSource.prototype.onProgress = function(ev) {
	this.progress = (ev.loaded / ev.total);
};

AjaxProgressiveSource.prototype.onChunkLoad = function(data) {
	this.established = true;
	this.progress = 1;
	this.loadedSize += data.byteLength;
	this.loadFails = 0;
	this.isLoading = false;

	if (this.destination) {
		this.destination.write(data);
	}

	this.loadTime = JSMpeg.Now() - this.loadStartTime;
	if (!this.throttled) {
		this.loadNextChunk();
	}
};

module.exports = AjaxProgressiveSource;


/***/ }),

/***/ "./node_modules/@lixuc/jsmpeg/src/ajax.js":
/*!************************************************!*\
  !*** ./node_modules/@lixuc/jsmpeg/src/ajax.js ***!
  \************************************************/
/***/ ((module) => {

var AjaxSource = function(url, options) {
	this.url = url;
	this.destination = null;
	this.request = null;

	this.completed = false;
	this.established = false;
	this.progress = 0;
};

AjaxSource.prototype.connect = function(destination) {
	this.destination = destination;
};

AjaxSource.prototype.start = function() {
	this.request = new XMLHttpRequest();

	this.request.onreadystatechange = function() {
		if (
			this.request.readyState === this.request.DONE &&
			this.request.status === 200
		) {
			this.onLoad(this.request.response);
		}
	}.bind(this);

	this.request.onprogress = this.onProgress.bind(this);
	this.request.open('GET', this.url);
	this.request.responseType = "arraybuffer";
	this.request.send();
};

AjaxSource.prototype.resume = function(secondsHeadroom) {
	// Nothing to do here
};

AjaxSource.prototype.destroy = function() {
	this.request.abort();
};

AjaxSource.prototype.onProgress = function(ev) {
	this.progress = (ev.loaded / ev.total);
};

AjaxSource.prototype.onLoad = function(data) {
	this.established = true;
	this.completed = true;
	this.progress = 1;

	if (this.destination) {
		this.destination.write(data);
	}
};

module.exports = AjaxSource;


/***/ }),

/***/ "./node_modules/@lixuc/jsmpeg/src/buffer.js":
/*!**************************************************!*\
  !*** ./node_modules/@lixuc/jsmpeg/src/buffer.js ***!
  \**************************************************/
/***/ ((module) => {

var BitBuffer = function(bufferOrLength, mode) {
	if (typeof(bufferOrLength) === 'object') {
		this.bytes = (bufferOrLength instanceof Uint8Array)
			? bufferOrLength
			: new Uint8Array(bufferOrLength);

		this.byteLength = this.bytes.length;
	}
	else {
		this.bytes = new Uint8Array(bufferOrLength || 1024*1024);
		this.byteLength = 0;
	}

	this.mode = mode || BitBuffer.MODE.EXPAND;
	this.index = 0;
};

BitBuffer.prototype.resize = function(size) {
	var newBytes = new Uint8Array(size);
	if (this.byteLength !== 0) {
		this.byteLength = Math.min(this.byteLength, size);
		newBytes.set(this.bytes, 0, this.byteLength);
	}
	this.bytes = newBytes;
	this.index = Math.min(this.index, this.byteLength << 3);
};

BitBuffer.prototype.evict = function(sizeNeeded) {
	var bytePos = this.index >> 3,
		available = this.bytes.length - this.byteLength;

	// If the current index is the write position, we can simply reset both
	// to 0. Also reset (and throw away yet unread data) if we won't be able
	// to fit the new data in even after a normal eviction.
	if (
		this.index === this.byteLength << 3 ||
		sizeNeeded > available + bytePos // emergency evac
	) {
		this.byteLength = 0;
		this.index = 0;
		return;
	}
	else if (bytePos === 0) {
		// Nothing read yet - we can't evict anything
		return;
	}

	// Some browsers don't support copyWithin() yet - we may have to do
	// it manually using set and a subarray
	if (this.bytes.copyWithin) {
		this.bytes.copyWithin(0, bytePos, this.byteLength);
	}
	else {
		this.bytes.set(this.bytes.subarray(bytePos, this.byteLength));
	}

	this.byteLength = this.byteLength - bytePos;
	this.index -= bytePos << 3;
	return;
};

BitBuffer.prototype.write = function(buffers) {
	var isArrayOfBuffers = (typeof(buffers[0]) === 'object'),
		totalLength = 0,
		available = this.bytes.length - this.byteLength;

	// Calculate total byte length
	if (isArrayOfBuffers) {
		var totalLength = 0;
		for (var i = 0; i < buffers.length; i++) {
			totalLength += buffers[i].byteLength;
		}
	}
	else {
		totalLength = buffers.byteLength;
	}

	// Do we need to resize or evict?
	if (totalLength > available) {
		if (this.mode === BitBuffer.MODE.EXPAND) {
			var newSize = Math.max(
				this.bytes.length * 2,
				totalLength - available
			);
			this.resize(newSize)
		}
		else {
			this.evict(totalLength);
		}
	}

	if (isArrayOfBuffers) {
		for (var i = 0; i < buffers.length; i++) {
			this.appendSingleBuffer(buffers[i]);
		}
	}
	else {
		this.appendSingleBuffer(buffers);
	}
};

BitBuffer.prototype.appendSingleBuffer = function(buffer) {
	buffer = buffer instanceof Uint8Array
		? buffer
		: new Uint8Array(buffer);

	this.bytes.set(buffer, this.byteLength);
	this.byteLength += buffer.length;
};

BitBuffer.prototype.findNextStartCode = function() {
	for (var i = (this.index+7 >> 3); i < this.byteLength; i++) {
		if(
			this.bytes[i] == 0x00 &&
			this.bytes[i+1] == 0x00 &&
			this.bytes[i+2] == 0x01
		) {
			this.index = (i+4) << 3;
			return this.bytes[i+3];
		}
	}
	this.index = (this.byteLength << 3);
	return -1;
};

BitBuffer.prototype.findStartCode = function(code) {
	var current = 0;
	while (true) {
		current = this.findNextStartCode();
		if (current === code || current === -1) {
			return current;
		}
	}
	return -1;
};

BitBuffer.prototype.nextBytesAreStartCode = function() {
	var i = (this.index+7 >> 3);
	return (
		i >= this.byteLength || (
			this.bytes[i] == 0x00 &&
			this.bytes[i+1] == 0x00 &&
			this.bytes[i+2] == 0x01
		)
	);
};

BitBuffer.prototype.peek = function(count) {
	var offset = this.index;
	var value = 0;
	while (count) {
		var currentByte = this.bytes[offset >> 3],
			remaining = 8 - (offset & 7), // remaining bits in byte
			read = remaining < count ? remaining : count, // bits in this run
			shift = remaining - read,
			mask = (0xff >> (8-read));

		value = (value << read) | ((currentByte & (mask << shift)) >> shift);

		offset += read;
		count -= read;
	}

	return value;
}

BitBuffer.prototype.read = function(count) {
	var value = this.peek(count);
	this.index += count;
	return value;
};

BitBuffer.prototype.skip = function(count) {
	return (this.index += count);
};

BitBuffer.prototype.rewind = function(count) {
	this.index = Math.max(this.index - count, 0);
};

BitBuffer.prototype.has = function(count) {
	return ((this.byteLength << 3) - this.index) >= count;
};

BitBuffer.MODE = {
	EVICT: 1,
	EXPAND: 2
};

module.exports = BitBuffer;


/***/ }),

/***/ "./node_modules/@lixuc/jsmpeg/src/canvas2d.js":
/*!****************************************************!*\
  !*** ./node_modules/@lixuc/jsmpeg/src/canvas2d.js ***!
  \****************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const JSMpeg = __webpack_require__(/*! ./jsmpeg */ "./node_modules/@lixuc/jsmpeg/src/jsmpeg.js");

var CanvasRenderer = function(options) {
	this.canvas = options.canvas || document.createElement('canvas');
	this.silence = options.disableGl && options.silence;
	this.width = this.canvas.width;
	this.height = this.canvas.height;
	this.enabled = true;

	this.context = this.canvas.getContext('2d');
};

CanvasRenderer.prototype.destroy = function() {
	// Nothing to do here
};

CanvasRenderer.prototype.resize = function(width, height) {
	this.width = width|0;
	this.height = height|0;

	this.canvas.width = this.width;
	this.canvas.height = this.height;

	this.imageData = this.context.getImageData(0, 0, this.width, this.height);
	JSMpeg.Fill(this.imageData.data, 255);
};

CanvasRenderer.prototype.renderProgress = function(progress) {
	var
		w = this.canvas.width,
		h = this.canvas.height,
		ctx = this.context;

	ctx.fillStyle = '#222';
	ctx.fillRect(0, 0, w, h);
	ctx.fillStyle = '#fff';
	ctx.fillRect(0, h - h * progress, w, h * progress);
};

CanvasRenderer.prototype.render = function(y, cb, cr) {
	this.YCbCrToRGBA(y, cb, cr, this.imageData.data);
	if (!this.silence) this.context.putImageData(this.imageData, 0, 0);
};

CanvasRenderer.prototype.YCbCrToRGBA = function(y, cb, cr, rgba) {
	if (!this.enabled) {
		return;
	}

	// Chroma values are the same for each block of 4 pixels, so we proccess
	// 2 lines at a time, 2 neighboring pixels each.
	// I wish we could use 32bit writes to the RGBA buffer instead of writing
	// each byte separately, but we need the automatic clamping of the RGBA
	// buffer.

	var w = ((this.width + 15) >> 4) << 4,
		w2 = w >> 1;

	var yIndex1 = 0,
		yIndex2 = w,
		yNext2Lines = w + (w - this.width);

	var cIndex = 0,
		cNextLine = w2 - (this.width >> 1);

	var rgbaIndex1 = 0,
		rgbaIndex2 = this.width * 4,
		rgbaNext2Lines = this.width * 4;

	var cols = this.width >> 1,
		rows = this.height >> 1;

	var ccb, ccr, r, g, b;

	for (var row = 0; row < rows; row++) {
		for (var col = 0; col < cols; col++) {
			ccb = cb[cIndex];
			ccr = cr[cIndex];
			cIndex++;

			r = (ccb + ((ccb * 103) >> 8)) - 179;
			g = ((ccr * 88) >> 8) - 44 + ((ccb * 183) >> 8) - 91;
			b = (ccr + ((ccr * 198) >> 8)) - 227;

			// Line 1
			var y1 = y[yIndex1++];
			var y2 = y[yIndex1++];
			rgba[rgbaIndex1]   = y1 + r;
			rgba[rgbaIndex1+1] = y1 - g;
			rgba[rgbaIndex1+2] = y1 + b;
			rgba[rgbaIndex1+4] = y2 + r;
			rgba[rgbaIndex1+5] = y2 - g;
			rgba[rgbaIndex1+6] = y2 + b;
			rgbaIndex1 += 8;

			// Line 2
			var y3 = y[yIndex2++];
			var y4 = y[yIndex2++];
			rgba[rgbaIndex2]   = y3 + r;
			rgba[rgbaIndex2+1] = y3 - g;
			rgba[rgbaIndex2+2] = y3 + b;
			rgba[rgbaIndex2+4] = y4 + r;
			rgba[rgbaIndex2+5] = y4 - g;
			rgba[rgbaIndex2+6] = y4 + b;
			rgbaIndex2 += 8;
		}

		yIndex1 += yNext2Lines;
		yIndex2 += yNext2Lines;
		rgbaIndex1 += rgbaNext2Lines;
		rgbaIndex2 += rgbaNext2Lines;
		cIndex += cNextLine;
	}
};

module.exports = CanvasRenderer;


/***/ }),

/***/ "./node_modules/@lixuc/jsmpeg/src/decoder.js":
/*!***************************************************!*\
  !*** ./node_modules/@lixuc/jsmpeg/src/decoder.js ***!
  \***************************************************/
/***/ ((module) => {

var BaseDecoder = function(options) {
	this.destination = null;
	this.canPlay = false;

	this.collectTimestamps = !options.streaming;
	this.timestamps = [];
	this.timestampIndex = 0;

	this.startTime = 0;
	this.decodedTime = 0;

	Object.defineProperty(this, 'currentTime', {get: this.getCurrentTime});
};

BaseDecoder.prototype.connect = function(destination) {
	this.destination = destination;
};

BaseDecoder.prototype.write = function(pts, buffers) {
	if (this.collectTimestamps) {
		if (this.timestamps.length === 0) {
			this.startTime = pts;
			this.decodedTime = pts;
		}
		this.timestamps.push({index: this.bits.byteLength << 3, time: pts});
	}

	this.bits.write(buffers);
	this.canPlay = true;
};

BaseDecoder.prototype.seek = function(time) {
	if (!this.collectTimestamps) {
		return;
	}

	this.timestampIndex = 0;
	for (var i = 0; i < this.timestamps.length; i++) {
		if (this.timestamps[i].time > time) {
			break;
		}
		this.timestampIndex = i;
	}

	var ts = this.timestamps[this.timestampIndex];
	if (ts) {
		this.bits.index = ts.index;
		this.decodedTime = ts.time;
	}
	else {
		this.bits.index = 0;
		this.decodedTime = this.startTime;
	}
};

BaseDecoder.prototype.decode = function() {
	this.advanceDecodedTime(0);
};

BaseDecoder.prototype.advanceDecodedTime = function(seconds) {
	if (this.collectTimestamps) {
		var newTimestampIndex = -1;
		for (var i = this.timestampIndex; i < this.timestamps.length; i++) {
			if (this.timestamps[i].index > this.bits.index) {
				break;
			}
			newTimestampIndex = i;
		}

		// Did we find a new PTS, different from the last? If so, we don't have
		// to advance the decoded time manually and can instead sync it exactly
		// to the PTS.
		if (
			newTimestampIndex !== -1 &&
			newTimestampIndex !== this.timestampIndex
		) {
			this.timestampIndex = newTimestampIndex;
			this.decodedTime = this.timestamps[this.timestampIndex].time;
			return;
		}
	}

	this.decodedTime += seconds;
};

BaseDecoder.prototype.getCurrentTime = function() {
	return this.decodedTime;
};

module.exports = BaseDecoder;


/***/ }),

/***/ "./node_modules/@lixuc/jsmpeg/src/jsmpeg.js":
/*!**************************************************!*\
  !*** ./node_modules/@lixuc/jsmpeg/src/jsmpeg.js ***!
  \**************************************************/
/***/ ((module) => {

/*! jsmpeg v1.0 | (c) Dominic Szablewski | MIT license */


// This sets up the JSMpeg "Namespace". The object is empty apart from the Now()
// utility function and the automatic CreateVideoElements() after DOMReady.
var JSMpeg = {

	// The Player sets up the connections between source, demuxer, decoders,
	// renderer and audio output. It ties everything together, is responsible
	// of scheduling decoding and provides some convenience methods for
	// external users.
	Player: null,

	// A Video Element wraps the Player, shows HTML controls to start/pause
	// the video and handles Audio unlocking on iOS. VideoElements can be
	// created directly in HTML using the <div class="jsmpeg"/> tag.
	VideoElement: null,

	// The BitBuffer wraps a Uint8Array and allows reading an arbitrary number
	// of bits at a time. On writing, the BitBuffer either expands its
	// internal buffer (for static files) or deletes old data (for streaming).
	BitBuffer: null,

	// A Source provides raw data from HTTP, a WebSocket connection or any
	// other mean. Sources must support the following API:
	//   .connect(destinationNode)
	//   .write(buffer)
	//   .start() - start reading
	//   .resume(headroom) - continue reading; headroom to play pos in seconds
	//   .established - boolean, true after connection is established
	//   .completed - boolean, true if the source is completely loaded
	//   .progress - float 0-1
	Source: {},

	// A Demuxer may sit between a Source and a Decoder. It separates the
	// incoming raw data into Video, Audio and other Streams. API:
	//   .connect(streamId, destinationNode)
	//   .write(buffer)
	//   .currentTime – float, in seconds
	//   .startTime - float, in seconds
	Demuxer: {},

	// A Decoder accepts an incoming Stream of raw Audio or Video data, buffers
	// it and upon `.decode()` decodes a single frame of data. Video decoders
	// call `destinationNode.render(Y, Cr, CB)` with the decoded pixel data;
	// Audio decoders call `destinationNode.play(left, right)` with the decoded
	// PCM data. API:
	//   .connect(destinationNode)
	//   .write(pts, buffer)
	//   .decode()
	//   .seek(time)
	//   .currentTime - float, in seconds
	//   .startTime - float, in seconds
	Decoder: {},

	// A Renderer accepts raw YCrCb data in 3 separate buffers via the render()
	// method. Renderers typically convert the data into the RGBA color space
	// and draw it on a Canvas, but other output - such as writing PNGs - would
	// be conceivable. API:
	//   .render(y, cr, cb) - pixel data as Uint8Arrays
	//   .enabled - wether the renderer does anything upon receiving data
	Renderer: {},

	// Audio Outputs accept raw Stero PCM data in 2 separate buffers via the
	// play() method. Outputs typically play the audio on the user's device.
	// API:
	//   .play(sampleRate, left, right) - rate in herz; PCM data as Uint8Arrays
	//   .stop()
	//   .enqueuedTime - float, in seconds
	//   .enabled - wether the output does anything upon receiving data
	AudioOutput: {},

	Now: function() {
		return window.performance ? window.performance.now() / 1000 : Date.now() / 1000;
	},

	CreateVideoElements: function() {
		var elements = document.querySelectorAll('.jsmpeg');
		for (var i = 0; i < elements.length; i++) {
			new JSMpeg.VideoElement(elements[i]);
		}
	},

	Fill: function(array, value) {
		if (array.fill) {
			array.fill(value);
		}
		else {
			for (var i = 0; i < array.length; i++) {
				array[i] = value;
			}
		}
	}
};
module.exports = JSMpeg;

// Automatically create players for all found <div class="jsmpeg"/> elements.
// if (document.readyState === 'complete') {
// 	JSMpeg.CreateVideoElements();
// }
// else {
// 	document.addEventListener('DOMContentLoaded', JSMpeg.CreateVideoElements);
// }


/***/ }),

/***/ "./node_modules/@lixuc/jsmpeg/src/mp2.js":
/*!***********************************************!*\
  !*** ./node_modules/@lixuc/jsmpeg/src/mp2.js ***!
  \***********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// Based on kjmp2 by Martin J. Fiedler
// http://keyj.emphy.de/kjmp2/
const JSMpeg = __webpack_require__(/*! ./jsmpeg */ "./node_modules/@lixuc/jsmpeg/src/jsmpeg.js");

var MP2 = function(options) {
	JSMpeg.Decoder.Base.call(this, options);

	var bufferSize = options.audioBufferSize || 128*1024;
	var bufferMode = options.streaming
		? JSMpeg.BitBuffer.MODE.EVICT
		: JSMpeg.BitBuffer.MODE.EXPAND;

	this.bits = new JSMpeg.BitBuffer(bufferSize, bufferMode);

	this.left = new Float32Array(1152);
	this.right = new Float32Array(1152);
	this.sampleRate = 44100;

	this.D = new Float32Array(1024);
	this.D.set(MP2.SYNTHESIS_WINDOW, 0);
	this.D.set(MP2.SYNTHESIS_WINDOW, 512);
	this.V = new Float32Array(1024);
	this.U = new Int32Array(32);
	this.VPos = 0;

	this.allocation = [new Array(32), new Array(32)];
	this.scaleFactorInfo = [new Uint8Array(32), new Uint8Array(32)];
	this.scaleFactor = [new Array(32), new Array(32)];
	this.sample = [new Array(32), new Array(32)];

	for (var j = 0; j < 2; j++) {
		for (var i = 0; i < 32; i++) {
			this.scaleFactor[j][i] = [0, 0, 0];
			this.sample[j][i] = [0, 0, 0];
		}
	}
};

MP2.prototype = Object.create(JSMpeg.Decoder.Base.prototype);
MP2.prototype.constructor = MP2;

MP2.prototype.decode = function() {
	var pos = this.bits.index >> 3;
	if (pos >= this.bits.byteLength) {
		return false;
	}

	var decoded = this.decodeFrame(this.left, this.right);
	this.bits.index = (pos + decoded) << 3;

	if (!decoded) {
		return false;
	}

	if (this.destination) {
		this.destination.play(this.sampleRate, this.left, this.right);
	}

	this.advanceDecodedTime(this.left.length / this.sampleRate);
	return true;
};

MP2.prototype.getCurrentTime = function() {
	var enqueuedTime = this.destination ? this.destination.enqueuedTime : 0;
	return this.decodedTime - enqueuedTime;
};

MP2.prototype.decodeFrame = function(left, right) {
	// Check for valid header: syncword OK, MPEG-Audio Layer 2
	var sync = this.bits.read(11),
		version = this.bits.read(2),
		layer = this.bits.read(2),
		hasCRC = !this.bits.read(1);

	if (
		sync !== MP2.FRAME_SYNC ||
		version !== MP2.VERSION.MPEG_1 ||
		layer !== MP2.LAYER.II
	) {
		return 0; // Invalid header or unsupported version
	}

	var bitrateIndex = this.bits.read(4) - 1;
	if (bitrateIndex > 13) {
		return 0;  // Invalid bit rate or 'free format'
	}

	var sampleRateIndex = this.bits.read(2);
	var sampleRate = MP2.SAMPLE_RATE[sampleRateIndex];
	if (sampleRateIndex === 3) {
		return 0; // Invalid sample rate
	}
	if (version === MP2.VERSION.MPEG_2) {
		sampleRateIndex += 4;
		bitrateIndex += 14;
	}
	var padding = this.bits.read(1),
		privat = this.bits.read(1),
		mode = this.bits.read(2);

	// Parse the mode_extension, set up the stereo bound
	var bound = 0;
	if (mode === MP2.MODE.JOINT_STEREO) {
		bound = (this.bits.read(2) + 1) << 2;
	}
	else {
		this.bits.skip(2);
		bound = (mode === MP2.MODE.MONO) ? 0 : 32;
	}

	// Discard the last 4 bits of the header and the CRC value, if present
	this.bits.skip(4);
	if (hasCRC) {
		this.bits.skip(16);
	}

	// Compute the frame size
	var bitrate = MP2.BIT_RATE[bitrateIndex],
		sampleRate = MP2.SAMPLE_RATE[sampleRateIndex],
		frameSize = ((144000 * bitrate / sampleRate) + padding)|0;


	// Prepare the quantizer table lookups
	var tab3 = 0;
	var sblimit = 0;
	if (version === MP2.VERSION.MPEG_2) {
		// MPEG-2 (LSR)
		tab3 = 2;
		sblimit = 30;
	}
	else {
		// MPEG-1
		var tab1 = (mode === MP2.MODE.MONO) ? 0 : 1;
		var tab2 = MP2.QUANT_LUT_STEP_1[tab1][bitrateIndex];
		tab3 = MP2.QUANT_LUT_STEP_2[tab2][sampleRateIndex];
		sblimit = tab3 & 63;
		tab3 >>= 6;
	}

	if (bound > sblimit) {
		bound = sblimit;
	}

	// Read the allocation information
	for (var sb = 0; sb < bound; sb++) {
		this.allocation[0][sb] = this.readAllocation(sb, tab3);
		this.allocation[1][sb] = this.readAllocation(sb, tab3);
	}

	for (var sb = bound; sb < sblimit; sb++) {
		this.allocation[0][sb] =
			this.allocation[1][sb] =
			this.readAllocation(sb, tab3);
	}

	// Read scale factor selector information
	var channels = (mode === MP2.MODE.MONO) ? 1 : 2;
	for (var sb = 0;  sb < sblimit; sb++) {
		for (ch = 0;  ch < channels; ch++) {
			if (this.allocation[ch][sb]) {
				this.scaleFactorInfo[ch][sb] = this.bits.read(2);
			}
		}
		if (mode === MP2.MODE.MONO) {
			this.scaleFactorInfo[1][sb] = this.scaleFactorInfo[0][sb];
		}
	}

	// Read scale factors
	for (var sb = 0;  sb < sblimit; sb++) {
		for (var ch = 0;  ch < channels; ch++) {
			if (this.allocation[ch][sb]) {
				var sf = this.scaleFactor[ch][sb];
				switch (this.scaleFactorInfo[ch][sb]) {
					case 0:
						sf[0] = this.bits.read(6);
						sf[1] = this.bits.read(6);
						sf[2] = this.bits.read(6);
						break;
					case 1:
						sf[0] =
						sf[1] = this.bits.read(6);
						sf[2] = this.bits.read(6);
						break;
					case 2:
						sf[0] =
						sf[1] =
						sf[2] = this.bits.read(6);
						break;
					case 3:
						sf[0] = this.bits.read(6);
						sf[1] =
						sf[2] = this.bits.read(6);
						break;
				}
			}
		}
		if (mode === MP2.MODE.MONO) {
			this.scaleFactor[1][sb][0] = this.scaleFactor[0][sb][0];
			this.scaleFactor[1][sb][1] = this.scaleFactor[0][sb][1];
			this.scaleFactor[1][sb][2] = this.scaleFactor[0][sb][2];
		}
	}

	// Coefficient input and reconstruction
	var outPos = 0;
	for (var part = 0; part < 3; part++) {
		for (var granule = 0; granule < 4; granule++) {

			// Read the samples
			for (var sb = 0; sb < bound; sb++) {
				this.readSamples(0, sb, part);
				this.readSamples(1, sb, part);
			}
			for (var sb = bound; sb < sblimit; sb++) {
				this.readSamples(0, sb, part);
				this.sample[1][sb][0] = this.sample[0][sb][0];
				this.sample[1][sb][1] = this.sample[0][sb][1];
				this.sample[1][sb][2] = this.sample[0][sb][2];
			}
			for (var sb = sblimit; sb < 32; sb++) {
				this.sample[0][sb][0] = 0;
				this.sample[0][sb][1] = 0;
				this.sample[0][sb][2] = 0;
				this.sample[1][sb][0] = 0;
				this.sample[1][sb][1] = 0;
				this.sample[1][sb][2] = 0;
			}

			// Synthesis loop
			for (var p = 0; p < 3; p++) {
				// Shifting step
				this.VPos = (this.VPos - 64) & 1023;

				for (var ch = 0;  ch < 2; ch++) {
					MP2.MatrixTransform(this.sample[ch], p, this.V, this.VPos);

					// Build U, windowing, calculate output
					JSMpeg.Fill(this.U, 0);

					var dIndex = 512 - (this.VPos >> 1);
					var vIndex = (this.VPos % 128) >> 1;
					while (vIndex < 1024) {
						for (var i = 0; i < 32; ++i) {
							this.U[i] += this.D[dIndex++] * this.V[vIndex++];
						}

						vIndex += 128-32;
						dIndex += 64-32;
					}

					vIndex = (128-32 + 1024) - vIndex;
					dIndex -= (512 - 32);
					while (vIndex < 1024) {
						for (var i = 0; i < 32; ++i) {
							this.U[i] += this.D[dIndex++] * this.V[vIndex++];
						}

						vIndex += 128-32;
						dIndex += 64-32;
					}

					// Output samples
					var outChannel = ch === 0 ? left : right;
					for (var j = 0; j < 32; j++) {
						outChannel[outPos + j] = this.U[j] / 2147418112;
					}
				} // End of synthesis channel loop
				outPos += 32;
			} // End of synthesis sub-block loop

		} // Decoding of the granule finished
	}

	this.sampleRate = sampleRate;
	return frameSize;
};

MP2.prototype.readAllocation = function(sb, tab3) {
	var tab4 = MP2.QUANT_LUT_STEP_3[tab3][sb];
	var qtab = MP2.QUANT_LUT_STEP4[tab4 & 15][this.bits.read(tab4 >> 4)];
	return qtab ? (MP2.QUANT_TAB[qtab - 1]) : 0;
};

MP2.prototype.readSamples = function(ch, sb, part) {
	var q = this.allocation[ch][sb],
		sf = this.scaleFactor[ch][sb][part],
		sample = this.sample[ch][sb],
		val = 0;

	if (!q) {
		// No bits allocated for this subband
		sample[0] = sample[1] = sample[2] = 0;
		return;
	}

	// Resolve scalefactor
	if (sf === 63) {
		sf = 0;
	}
	else {
		var shift = (sf / 3)|0;
		sf = (MP2.SCALEFACTOR_BASE[sf % 3] + ((1 << shift) >> 1)) >> shift;
	}

	// Decode samples
	var adj = q.levels;
	if (q.group) {
		// Decode grouped samples
		val = this.bits.read(q.bits);
		sample[0] = val % adj;
		val = (val / adj)|0;
		sample[1] = val % adj;
		sample[2] = (val / adj)|0;
	}
	else {
		// Decode direct samples
		sample[0] = this.bits.read(q.bits);
		sample[1] = this.bits.read(q.bits);
		sample[2] = this.bits.read(q.bits);
	}

	// Postmultiply samples
	var scale = (65536 / (adj + 1))|0;
	adj = ((adj + 1) >> 1) - 1;

	val = (adj - sample[0]) * scale;
	sample[0] = (val * (sf >> 12) + ((val * (sf & 4095) + 2048) >> 12)) >> 12;

	val = (adj - sample[1]) * scale;
	sample[1] = (val * (sf >> 12) + ((val * (sf & 4095) + 2048) >> 12)) >> 12;

	val = (adj - sample[2]) * scale;
	sample[2] = (val * (sf >> 12) + ((val * (sf & 4095) + 2048) >> 12)) >> 12;
};

MP2.MatrixTransform = function(s, ss, d, dp) {
	var t01, t02, t03, t04, t05, t06, t07, t08, t09, t10, t11, t12,
		t13, t14, t15, t16, t17, t18, t19, t20, t21, t22, t23, t24,
		t25, t26, t27, t28, t29, t30, t31, t32, t33;

	t01 = s[ 0][ss] + s[31][ss]; t02 = (s[ 0][ss] - s[31][ss]) * 0.500602998235;
	t03 = s[ 1][ss] + s[30][ss]; t04 = (s[ 1][ss] - s[30][ss]) * 0.505470959898;
	t05 = s[ 2][ss] + s[29][ss]; t06 = (s[ 2][ss] - s[29][ss]) * 0.515447309923;
	t07 = s[ 3][ss] + s[28][ss]; t08 = (s[ 3][ss] - s[28][ss]) * 0.53104259109;
	t09 = s[ 4][ss] + s[27][ss]; t10 = (s[ 4][ss] - s[27][ss]) * 0.553103896034;
	t11 = s[ 5][ss] + s[26][ss]; t12 = (s[ 5][ss] - s[26][ss]) * 0.582934968206;
	t13 = s[ 6][ss] + s[25][ss]; t14 = (s[ 6][ss] - s[25][ss]) * 0.622504123036;
	t15 = s[ 7][ss] + s[24][ss]; t16 = (s[ 7][ss] - s[24][ss]) * 0.674808341455;
	t17 = s[ 8][ss] + s[23][ss]; t18 = (s[ 8][ss] - s[23][ss]) * 0.744536271002;
	t19 = s[ 9][ss] + s[22][ss]; t20 = (s[ 9][ss] - s[22][ss]) * 0.839349645416;
	t21 = s[10][ss] + s[21][ss]; t22 = (s[10][ss] - s[21][ss]) * 0.972568237862;
	t23 = s[11][ss] + s[20][ss]; t24 = (s[11][ss] - s[20][ss]) * 1.16943993343;
	t25 = s[12][ss] + s[19][ss]; t26 = (s[12][ss] - s[19][ss]) * 1.48416461631;
	t27 = s[13][ss] + s[18][ss]; t28 = (s[13][ss] - s[18][ss]) * 2.05778100995;
	t29 = s[14][ss] + s[17][ss]; t30 = (s[14][ss] - s[17][ss]) * 3.40760841847;
	t31 = s[15][ss] + s[16][ss]; t32 = (s[15][ss] - s[16][ss]) * 10.1900081235;

	t33 = t01 + t31; t31 = (t01 - t31) * 0.502419286188;
	t01 = t03 + t29; t29 = (t03 - t29) * 0.52249861494;
	t03 = t05 + t27; t27 = (t05 - t27) * 0.566944034816;
	t05 = t07 + t25; t25 = (t07 - t25) * 0.64682178336;
	t07 = t09 + t23; t23 = (t09 - t23) * 0.788154623451;
	t09 = t11 + t21; t21 = (t11 - t21) * 1.06067768599;
	t11 = t13 + t19; t19 = (t13 - t19) * 1.72244709824;
	t13 = t15 + t17; t17 = (t15 - t17) * 5.10114861869;
	t15 = t33 + t13; t13 = (t33 - t13) * 0.509795579104;
	t33 = t01 + t11; t01 = (t01 - t11) * 0.601344886935;
	t11 = t03 + t09; t09 = (t03 - t09) * 0.899976223136;
	t03 = t05 + t07; t07 = (t05 - t07) * 2.56291544774;
	t05 = t15 + t03; t15 = (t15 - t03) * 0.541196100146;
	t03 = t33 + t11; t11 = (t33 - t11) * 1.30656296488;
	t33 = t05 + t03; t05 = (t05 - t03) * 0.707106781187;
	t03 = t15 + t11; t15 = (t15 - t11) * 0.707106781187;
	t03 += t15;
	t11 = t13 + t07; t13 = (t13 - t07) * 0.541196100146;
	t07 = t01 + t09; t09 = (t01 - t09) * 1.30656296488;
	t01 = t11 + t07; t07 = (t11 - t07) * 0.707106781187;
	t11 = t13 + t09; t13 = (t13 - t09) * 0.707106781187;
	t11 += t13; t01 += t11;
	t11 += t07; t07 += t13;
	t09 = t31 + t17; t31 = (t31 - t17) * 0.509795579104;
	t17 = t29 + t19; t29 = (t29 - t19) * 0.601344886935;
	t19 = t27 + t21; t21 = (t27 - t21) * 0.899976223136;
	t27 = t25 + t23; t23 = (t25 - t23) * 2.56291544774;
	t25 = t09 + t27; t09 = (t09 - t27) * 0.541196100146;
	t27 = t17 + t19; t19 = (t17 - t19) * 1.30656296488;
	t17 = t25 + t27; t27 = (t25 - t27) * 0.707106781187;
	t25 = t09 + t19; t19 = (t09 - t19) * 0.707106781187;
	t25 += t19;
	t09 = t31 + t23; t31 = (t31 - t23) * 0.541196100146;
	t23 = t29 + t21; t21 = (t29 - t21) * 1.30656296488;
	t29 = t09 + t23; t23 = (t09 - t23) * 0.707106781187;
	t09 = t31 + t21; t31 = (t31 - t21) * 0.707106781187;
	t09 += t31;	t29 += t09;	t09 += t23;	t23 += t31;
	t17 += t29;	t29 += t25;	t25 += t09;	t09 += t27;
	t27 += t23;	t23 += t19; t19 += t31;
	t21 = t02 + t32; t02 = (t02 - t32) * 0.502419286188;
	t32 = t04 + t30; t04 = (t04 - t30) * 0.52249861494;
	t30 = t06 + t28; t28 = (t06 - t28) * 0.566944034816;
	t06 = t08 + t26; t08 = (t08 - t26) * 0.64682178336;
	t26 = t10 + t24; t10 = (t10 - t24) * 0.788154623451;
	t24 = t12 + t22; t22 = (t12 - t22) * 1.06067768599;
	t12 = t14 + t20; t20 = (t14 - t20) * 1.72244709824;
	t14 = t16 + t18; t16 = (t16 - t18) * 5.10114861869;
	t18 = t21 + t14; t14 = (t21 - t14) * 0.509795579104;
	t21 = t32 + t12; t32 = (t32 - t12) * 0.601344886935;
	t12 = t30 + t24; t24 = (t30 - t24) * 0.899976223136;
	t30 = t06 + t26; t26 = (t06 - t26) * 2.56291544774;
	t06 = t18 + t30; t18 = (t18 - t30) * 0.541196100146;
	t30 = t21 + t12; t12 = (t21 - t12) * 1.30656296488;
	t21 = t06 + t30; t30 = (t06 - t30) * 0.707106781187;
	t06 = t18 + t12; t12 = (t18 - t12) * 0.707106781187;
	t06 += t12;
	t18 = t14 + t26; t26 = (t14 - t26) * 0.541196100146;
	t14 = t32 + t24; t24 = (t32 - t24) * 1.30656296488;
	t32 = t18 + t14; t14 = (t18 - t14) * 0.707106781187;
	t18 = t26 + t24; t24 = (t26 - t24) * 0.707106781187;
	t18 += t24; t32 += t18;
	t18 += t14; t26 = t14 + t24;
	t14 = t02 + t16; t02 = (t02 - t16) * 0.509795579104;
	t16 = t04 + t20; t04 = (t04 - t20) * 0.601344886935;
	t20 = t28 + t22; t22 = (t28 - t22) * 0.899976223136;
	t28 = t08 + t10; t10 = (t08 - t10) * 2.56291544774;
	t08 = t14 + t28; t14 = (t14 - t28) * 0.541196100146;
	t28 = t16 + t20; t20 = (t16 - t20) * 1.30656296488;
	t16 = t08 + t28; t28 = (t08 - t28) * 0.707106781187;
	t08 = t14 + t20; t20 = (t14 - t20) * 0.707106781187;
	t08 += t20;
	t14 = t02 + t10; t02 = (t02 - t10) * 0.541196100146;
	t10 = t04 + t22; t22 = (t04 - t22) * 1.30656296488;
	t04 = t14 + t10; t10 = (t14 - t10) * 0.707106781187;
	t14 = t02 + t22; t02 = (t02 - t22) * 0.707106781187;
	t14 += t02;	t04 += t14;	t14 += t10;	t10 += t02;
	t16 += t04;	t04 += t08;	t08 += t14;	t14 += t28;
	t28 += t10;	t10 += t20;	t20 += t02;	t21 += t16;
	t16 += t32;	t32 += t04;	t04 += t06;	t06 += t08;
	t08 += t18;	t18 += t14;	t14 += t30;	t30 += t28;
	t28 += t26;	t26 += t10;	t10 += t12;	t12 += t20;
	t20 += t24;	t24 += t02;

	d[dp + 48] = -t33;
	d[dp + 49] = d[dp + 47] = -t21;
	d[dp + 50] = d[dp + 46] = -t17;
	d[dp + 51] = d[dp + 45] = -t16;
	d[dp + 52] = d[dp + 44] = -t01;
	d[dp + 53] = d[dp + 43] = -t32;
	d[dp + 54] = d[dp + 42] = -t29;
	d[dp + 55] = d[dp + 41] = -t04;
	d[dp + 56] = d[dp + 40] = -t03;
	d[dp + 57] = d[dp + 39] = -t06;
	d[dp + 58] = d[dp + 38] = -t25;
	d[dp + 59] = d[dp + 37] = -t08;
	d[dp + 60] = d[dp + 36] = -t11;
	d[dp + 61] = d[dp + 35] = -t18;
	d[dp + 62] = d[dp + 34] = -t09;
	d[dp + 63] = d[dp + 33] = -t14;
	d[dp + 32] = -t05;
	d[dp +  0] = t05; d[dp + 31] = -t30;
	d[dp +  1] = t30; d[dp + 30] = -t27;
	d[dp +  2] = t27; d[dp + 29] = -t28;
	d[dp +  3] = t28; d[dp + 28] = -t07;
	d[dp +  4] = t07; d[dp + 27] = -t26;
	d[dp +  5] = t26; d[dp + 26] = -t23;
	d[dp +  6] = t23; d[dp + 25] = -t10;
	d[dp +  7] = t10; d[dp + 24] = -t15;
	d[dp +  8] = t15; d[dp + 23] = -t12;
	d[dp +  9] = t12; d[dp + 22] = -t19;
	d[dp + 10] = t19; d[dp + 21] = -t20;
	d[dp + 11] = t20; d[dp + 20] = -t13;
	d[dp + 12] = t13; d[dp + 19] = -t24;
	d[dp + 13] = t24; d[dp + 18] = -t31;
	d[dp + 14] = t31; d[dp + 17] = -t02;
	d[dp + 15] = t02; d[dp + 16] =  0.0;
};

MP2.FRAME_SYNC = 0x7ff;

MP2.VERSION = {
	MPEG_2_5: 0x0,
	MPEG_2: 0x2,
	MPEG_1: 0x3
};

MP2.LAYER = {
	III: 0x1,
	II: 0x2,
	I: 0x3
};

MP2.MODE = {
	STEREO: 0x0,
	JOINT_STEREO: 0x1,
	DUAL_CHANNEL: 0x2,
	MONO: 0x3
};

MP2.SAMPLE_RATE = new Uint16Array([
	44100, 48000, 32000, 0, // MPEG-1
	22050, 24000, 16000, 0  // MPEG-2
]);

MP2.BIT_RATE = new Uint16Array([
	32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, // MPEG-1
	 8, 16, 24, 32, 40, 48,  56,  64,  80,  96, 112, 128, 144, 160  // MPEG-2
]);

MP2.SCALEFACTOR_BASE = new Uint32Array([
	0x02000000, 0x01965FEA, 0x01428A30
]);

MP2.SYNTHESIS_WINDOW = new Float32Array([
	     0.0,     -0.5,     -0.5,     -0.5,     -0.5,     -0.5,
	    -0.5,     -1.0,     -1.0,     -1.0,     -1.0,     -1.5,
	    -1.5,     -2.0,     -2.0,     -2.5,     -2.5,     -3.0,
	    -3.5,     -3.5,     -4.0,     -4.5,     -5.0,     -5.5,
	    -6.5,     -7.0,     -8.0,     -8.5,     -9.5,    -10.5,
	   -12.0,    -13.0,    -14.5,    -15.5,    -17.5,    -19.0,
	   -20.5,    -22.5,    -24.5,    -26.5,    -29.0,    -31.5,
	   -34.0,    -36.5,    -39.5,    -42.5,    -45.5,    -48.5,
	   -52.0,    -55.5,    -58.5,    -62.5,    -66.0,    -69.5,
	   -73.5,    -77.0,    -80.5,    -84.5,    -88.0,    -91.5,
	   -95.0,    -98.0,   -101.0,   -104.0,    106.5,    109.0,
	   111.0,    112.5,    113.5,    114.0,    114.0,    113.5,
	   112.0,    110.5,    107.5,    104.0,    100.0,     94.5,
	    88.5,     81.5,     73.0,     63.5,     53.0,     41.5,
	    28.5,     14.5,     -1.0,    -18.0,    -36.0,    -55.5,
	   -76.5,    -98.5,   -122.0,   -147.0,   -173.5,   -200.5,
	  -229.5,   -259.5,   -290.5,   -322.5,   -355.5,   -389.5,
	  -424.0,   -459.5,   -495.5,   -532.0,   -568.5,   -605.0,
	  -641.5,   -678.0,   -714.0,   -749.0,   -783.5,   -817.0,
	  -849.0,   -879.5,   -908.5,   -935.0,   -959.5,   -981.0,
	 -1000.5,  -1016.0,  -1028.5,  -1037.5,  -1042.5,  -1043.5,
	 -1040.0,  -1031.5,   1018.5,   1000.0,    976.0,    946.5,
	   911.0,    869.5,    822.0,    767.5,    707.0,    640.0,
	   565.5,    485.0,    397.0,    302.5,    201.0,     92.5,
	   -22.5,   -144.0,   -272.5,   -407.0,   -547.5,   -694.0,
	  -846.0,  -1003.0,  -1165.0,  -1331.5,  -1502.0,  -1675.5,
	 -1852.5,  -2031.5,  -2212.5,  -2394.0,  -2576.5,  -2758.5,
	 -2939.5,  -3118.5,  -3294.5,  -3467.5,  -3635.5,  -3798.5,
	 -3955.0,  -4104.5,  -4245.5,  -4377.5,  -4499.0,  -4609.5,
	 -4708.0,  -4792.5,  -4863.5,  -4919.0,  -4958.0,  -4979.5,
	 -4983.0,  -4967.5,  -4931.5,  -4875.0,  -4796.0,  -4694.5,
	 -4569.5,  -4420.0,  -4246.0,  -4046.0,  -3820.0,  -3567.0,
	  3287.0,   2979.5,   2644.0,   2280.5,   1888.0,   1467.5,
	  1018.5,    541.0,     35.0,   -499.0,  -1061.0,  -1650.0,
	 -2266.5,  -2909.0,  -3577.0,  -4270.0,  -4987.5,  -5727.5,
	 -6490.0,  -7274.0,  -8077.5,  -8899.5,  -9739.0, -10594.5,
	-11464.5, -12347.0, -13241.0, -14144.5, -15056.0, -15973.5,
	-16895.5, -17820.0, -18744.5, -19668.0, -20588.0, -21503.0,
	-22410.5, -23308.5, -24195.0, -25068.5, -25926.5, -26767.0,
	-27589.0, -28389.0, -29166.5, -29919.0, -30644.5, -31342.0,
	-32009.5, -32645.0, -33247.0, -33814.5, -34346.0, -34839.5,
	-35295.0, -35710.0, -36084.5, -36417.5, -36707.5, -36954.0,
	-37156.5, -37315.0, -37428.0, -37496.0,  37519.0,  37496.0,
	 37428.0,  37315.0,  37156.5,  36954.0,  36707.5,  36417.5,
	 36084.5,  35710.0,  35295.0,  34839.5,  34346.0,  33814.5,
	 33247.0,  32645.0,  32009.5,  31342.0,  30644.5,  29919.0,
	 29166.5,  28389.0,  27589.0,  26767.0,  25926.5,  25068.5,
	 24195.0,  23308.5,  22410.5,  21503.0,  20588.0,  19668.0,
	 18744.5,  17820.0,  16895.5,  15973.5,  15056.0,  14144.5,
	 13241.0,  12347.0,  11464.5,  10594.5,   9739.0,   8899.5,
	  8077.5,   7274.0,   6490.0,   5727.5,   4987.5,   4270.0,
	  3577.0,   2909.0,   2266.5,   1650.0,   1061.0,    499.0,
	   -35.0,   -541.0,  -1018.5,  -1467.5,  -1888.0,  -2280.5,
	 -2644.0,  -2979.5,   3287.0,   3567.0,   3820.0,   4046.0,
	  4246.0,   4420.0,   4569.5,   4694.5,   4796.0,   4875.0,
	  4931.5,   4967.5,   4983.0,   4979.5,   4958.0,   4919.0,
	  4863.5,   4792.5,   4708.0,   4609.5,   4499.0,   4377.5,
	  4245.5,   4104.5,   3955.0,   3798.5,   3635.5,   3467.5,
	  3294.5,   3118.5,   2939.5,   2758.5,   2576.5,   2394.0,
	  2212.5,   2031.5,   1852.5,   1675.5,   1502.0,   1331.5,
	  1165.0,   1003.0,    846.0,    694.0,    547.5,    407.0,
	   272.5,    144.0,     22.5,    -92.5,   -201.0,   -302.5,
	  -397.0,   -485.0,   -565.5,   -640.0,   -707.0,   -767.5,
	  -822.0,   -869.5,   -911.0,   -946.5,   -976.0,  -1000.0,
	  1018.5,   1031.5,   1040.0,   1043.5,   1042.5,   1037.5,
	  1028.5,   1016.0,   1000.5,    981.0,    959.5,    935.0,
	   908.5,    879.5,    849.0,    817.0,    783.5,    749.0,
	   714.0,    678.0,    641.5,    605.0,    568.5,    532.0,
	   495.5,    459.5,    424.0,    389.5,    355.5,    322.5,
	   290.5,    259.5,    229.5,    200.5,    173.5,    147.0,
	   122.0,     98.5,     76.5,     55.5,     36.0,     18.0,
		1.0,    -14.5,    -28.5,    -41.5,    -53.0,    -63.5,
	   -73.0,    -81.5,    -88.5,    -94.5,   -100.0,   -104.0,
	  -107.5,   -110.5,   -112.0,   -113.5,   -114.0,   -114.0,
	  -113.5,   -112.5,   -111.0,   -109.0,    106.5,    104.0,
	   101.0,     98.0,     95.0,     91.5,     88.0,     84.5,
	    80.5,     77.0,     73.5,     69.5,     66.0,     62.5,
	    58.5,     55.5,     52.0,     48.5,     45.5,     42.5,
	    39.5,     36.5,     34.0,     31.5,     29.0,     26.5,
	    24.5,     22.5,     20.5,     19.0,     17.5,     15.5,
	    14.5,     13.0,     12.0,     10.5,      9.5,      8.5,
	     8.0,      7.0,      6.5,      5.5,      5.0,      4.5,
	     4.0,      3.5,      3.5,      3.0,      2.5,      2.5,
	     2.0,      2.0,      1.5,      1.5,      1.0,      1.0,
	     1.0,      1.0,      0.5,      0.5,      0.5,      0.5,
	     0.5,      0.5
]);

// Quantizer lookup, step 1: bitrate classes
MP2.QUANT_LUT_STEP_1 = [
 	// 32, 48, 56, 64, 80, 96,112,128,160,192,224,256,320,384 <- bitrate
	[   0,  0,  1,  1,  1,  2,  2,  2,  2,  2,  2,  2,  2,  2], // mono
	// 16, 24, 28, 32, 40, 48, 56, 64, 80, 96,112,128,160,192 <- bitrate / chan
	[   0,  0,  0,  0,  0,  0,  1,  1,  1,  2,  2,  2,  2,  2] // stereo
];

// Quantizer lookup, step 2: bitrate class, sample rate -> B2 table idx, sblimit
MP2.QUANT_TAB = {
	A: (27 | 64), // Table 3-B.2a: high-rate, sblimit = 27
	B: (30 | 64), // Table 3-B.2b: high-rate, sblimit = 30
	C:   8,       // Table 3-B.2c:  low-rate, sblimit =  8
	D:  12        // Table 3-B.2d:  low-rate, sblimit = 12
};

MP2.QUANT_LUT_STEP_2 = [
	//   44.1 kHz,        48 kHz,          32 kHz
	[MP2.QUANT_TAB.C, MP2.QUANT_TAB.C, MP2.QUANT_TAB.D], // 32 - 48 kbit/sec/ch
	[MP2.QUANT_TAB.A, MP2.QUANT_TAB.A, MP2.QUANT_TAB.A], // 56 - 80 kbit/sec/ch
	[MP2.QUANT_TAB.B, MP2.QUANT_TAB.A, MP2.QUANT_TAB.B]  // 96+	 kbit/sec/ch
];

// Quantizer lookup, step 3: B2 table, subband -> nbal, row index
// (upper 4 bits: nbal, lower 4 bits: row index)
MP2.QUANT_LUT_STEP_3 = [
	// Low-rate table (3-B.2c and 3-B.2d)
	[
		0x44,0x44,
	  	0x34,0x34,0x34,0x34,0x34,0x34,0x34,0x34,0x34,0x34
	],
	// High-rate table (3-B.2a and 3-B.2b)
	[
		0x43,0x43,0x43,
		0x42,0x42,0x42,0x42,0x42,0x42,0x42,0x42,
		0x31,0x31,0x31,0x31,0x31,0x31,0x31,0x31,0x31,0x31,0x31,0x31,
		0x20,0x20,0x20,0x20,0x20,0x20,0x20
	],
	// MPEG-2 LSR table (B.2 in ISO 13818-3)
	[
		0x45,0x45,0x45,0x45,
		0x34,0x34,0x34,0x34,0x34,0x34,0x34,
		0x24,0x24,0x24,0x24,0x24,0x24,0x24,0x24,0x24,0x24,
					   0x24,0x24,0x24,0x24,0x24,0x24,0x24,0x24,0x24
	]
];

// Quantizer lookup, step 4: table row, allocation[] value -> quant table index
MP2.QUANT_LUT_STEP4 = [
	[0, 1, 2, 17],
	[0, 1, 2, 3, 4, 5, 6, 17],
	[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 17],
	[0, 1, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
	[0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17],
	[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
];

MP2.QUANT_TAB = [
	{levels:     3, group: 1, bits:  5},  //  1
	{levels:     5, group: 1, bits:  7},  //  2
	{levels:     7, group: 0, bits:  3},  //  3
	{levels:     9, group: 1, bits: 10},  //  4
	{levels:    15, group: 0, bits:  4},  //  5
	{levels:    31, group: 0, bits:  5},  //  6
	{levels:    63, group: 0, bits:  6},  //  7
	{levels:   127, group: 0, bits:  7},  //  8
	{levels:   255, group: 0, bits:  8},  //  9
	{levels:   511, group: 0, bits:  9},  // 10
	{levels:  1023, group: 0, bits: 10},  // 11
	{levels:  2047, group: 0, bits: 11},  // 12
	{levels:  4095, group: 0, bits: 12},  // 13
	{levels:  8191, group: 0, bits: 13},  // 14
	{levels: 16383, group: 0, bits: 14},  // 15
	{levels: 32767, group: 0, bits: 15},  // 16
	{levels: 65535, group: 0, bits: 16}   // 17
];

module.exports = MP2;


/***/ }),

/***/ "./node_modules/@lixuc/jsmpeg/src/mpeg1.js":
/*!*************************************************!*\
  !*** ./node_modules/@lixuc/jsmpeg/src/mpeg1.js ***!
  \*************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// Inspired by Java MPEG-1 Video Decoder and Player by Zoltan Korandi
// https://sourceforge.net/projects/javampeg1video/
const JSMpeg = __webpack_require__(/*! ./jsmpeg */ "./node_modules/@lixuc/jsmpeg/src/jsmpeg.js");

var MPEG1 = function(options) {
	JSMpeg.Decoder.Base.call(this, options);

	var bufferSize = options.videoBufferSize || 512*1024;
	var bufferMode = options.streaming
		? JSMpeg.BitBuffer.MODE.EVICT
		: JSMpeg.BitBuffer.MODE.EXPAND;

	this.bits = new JSMpeg.BitBuffer(bufferSize, bufferMode);

	this.customIntraQuantMatrix = new Uint8Array(64);
	this.customNonIntraQuantMatrix = new Uint8Array(64);
	this.blockData = new Int32Array(64);

	this.currentFrame = 0;
	this.decodeFirstFrame = options.decodeFirstFrame !== false;
};

MPEG1.prototype = Object.create(JSMpeg.Decoder.Base.prototype);
MPEG1.prototype.constructor = MPEG1;

MPEG1.prototype.write = function(pts, buffers) {
	JSMpeg.Decoder.Base.prototype.write.call(this, pts, buffers);

	if (!this.hasSequenceHeader) {
		if (this.bits.findStartCode(MPEG1.START.SEQUENCE) === -1) {
			return false;
		}
		this.decodeSequenceHeader();

		if (this.decodeFirstFrame) {
			this.decode();
		}
	}
};

MPEG1.prototype.decode = function() {
	if (!this.hasSequenceHeader) {
		return false;
	}

	if (this.bits.findStartCode(MPEG1.START.PICTURE) === -1) {
		var bufferedBytes = this.bits.byteLength - (this.bits.index >> 3);
		return false;
	}

	this.decodePicture();
	this.advanceDecodedTime(1/this.frameRate);
	return true;
};

MPEG1.prototype.readHuffman = function(codeTable) {
	var state = 0;
	do {
		state = codeTable[state + this.bits.read(1)];
	} while (state >= 0 && codeTable[state] !== 0);
	return codeTable[state+2];
};


// Sequence Layer

MPEG1.prototype.frameRate = 30;
MPEG1.prototype.decodeSequenceHeader = function() {
	var newWidth = this.bits.read(12),
		newHeight = this.bits.read(12);

	// skip pixel aspect ratio
	this.bits.skip(4);

	this.frameRate = MPEG1.PICTURE_RATE[this.bits.read(4)];

	// skip bitRate, marker, bufferSize and constrained bit
	this.bits.skip(18 + 1 + 10 + 1);

	if (newWidth !== this.width || newHeight !== this.height) {
		this.width = newWidth;
		this.height = newHeight;

		this.initBuffers();

		if (this.destination) {
			this.destination.resize(newWidth, newHeight);
		}
	}

	if (this.bits.read(1)) { // load custom intra quant matrix?
		for (var i = 0; i < 64; i++) {
			this.customIntraQuantMatrix[MPEG1.ZIG_ZAG[i]] = this.bits.read(8);
		}
		this.intraQuantMatrix = this.customIntraQuantMatrix;
	}

	if (this.bits.read(1)) { // load custom non intra quant matrix?
		for (var i = 0; i < 64; i++) {
			var idx = MPEG1.ZIG_ZAG[i];
			this.customNonIntraQuantMatrix[idx] = this.bits.read(8);
		}
		this.nonIntraQuantMatrix = this.customNonIntraQuantMatrix;
	}

	this.hasSequenceHeader = true;
};

MPEG1.prototype.initBuffers = function() {
	this.intraQuantMatrix = MPEG1.DEFAULT_INTRA_QUANT_MATRIX;
	this.nonIntraQuantMatrix = MPEG1.DEFAULT_NON_INTRA_QUANT_MATRIX;

	this.mbWidth = (this.width + 15) >> 4;
	this.mbHeight = (this.height + 15) >> 4;
	this.mbSize = this.mbWidth * this.mbHeight;

	this.codedWidth = this.mbWidth << 4;
	this.codedHeight = this.mbHeight << 4;
	this.codedSize = this.codedWidth * this.codedHeight;

	this.halfWidth = this.mbWidth << 3;
	this.halfHeight = this.mbHeight << 3;

	// Allocated buffers and resize the canvas
	this.currentY = new Uint8ClampedArray(this.codedSize);
	this.currentY32 = new Uint32Array(this.currentY.buffer);

	this.currentCr = new Uint8ClampedArray(this.codedSize >> 2);
	this.currentCr32 = new Uint32Array(this.currentCr.buffer);

	this.currentCb = new Uint8ClampedArray(this.codedSize >> 2);
	this.currentCb32 = new Uint32Array(this.currentCb.buffer);


	this.forwardY = new Uint8ClampedArray(this.codedSize);
	this.forwardY32 = new Uint32Array(this.forwardY.buffer);

	this.forwardCr = new Uint8ClampedArray(this.codedSize >> 2);
	this.forwardCr32 = new Uint32Array(this.forwardCr.buffer);

	this.forwardCb = new Uint8ClampedArray(this.codedSize >> 2);
	this.forwardCb32 = new Uint32Array(this.forwardCb.buffer);
};


// Picture Layer

MPEG1.prototype.currentY = null;
MPEG1.prototype.currentCr = null;
MPEG1.prototype.currentCb = null;

MPEG1.prototype.pictureType = 0;

// Buffers for motion compensation
MPEG1.prototype.forwardY = null;
MPEG1.prototype.forwardCr = null;
MPEG1.prototype.forwardCb = null;

MPEG1.prototype.fullPelForward = false;
MPEG1.prototype.forwardFCode = 0;
MPEG1.prototype.forwardRSize = 0;
MPEG1.prototype.forwardF = 0;

MPEG1.prototype.decodePicture = function(skipOutput) {
	this.currentFrame++;

	this.bits.skip(10); // skip temporalReference
	this.pictureType = this.bits.read(3);
	this.bits.skip(16); // skip vbv_delay

	// Skip B and D frames or unknown coding type
	if (this.pictureType <= 0 || this.pictureType >= MPEG1.PICTURE_TYPE.B) {
		return;
	}

	// full_pel_forward, forward_f_code
	if (this.pictureType === MPEG1.PICTURE_TYPE.PREDICTIVE) {
		this.fullPelForward = this.bits.read(1);
		this.forwardFCode = this.bits.read(3);
		if (this.forwardFCode === 0) {
			// Ignore picture with zero forward_f_code
			return;
		}
		this.forwardRSize = this.forwardFCode - 1;
		this.forwardF = 1 << this.forwardRSize;
	}

	var code = 0;
	do {
		code = this.bits.findNextStartCode();
	} while (code === MPEG1.START.EXTENSION || code === MPEG1.START.USER_DATA );


	while (code >= MPEG1.START.SLICE_FIRST && code <= MPEG1.START.SLICE_LAST) {
		this.decodeSlice(code & 0x000000FF);
		code = this.bits.findNextStartCode();
	}

	if (code !== -1) {
		// We found the next start code; rewind 32bits and let the main loop
		// handle it.
		this.bits.rewind(32);
	}

	// Invoke decode callbacks
	if (this.destination) {
		this.destination.render(this.currentY, this.currentCr, this.currentCb);
	}

	// If this is a reference picutre then rotate the prediction pointers
	if (
		this.pictureType === MPEG1.PICTURE_TYPE.INTRA ||
		this.pictureType === MPEG1.PICTURE_TYPE.PREDICTIVE
	) {
		var
			tmpY = this.forwardY,
			tmpY32 = this.forwardY32,
			tmpCr = this.forwardCr,
			tmpCr32 = this.forwardCr32,
			tmpCb = this.forwardCb,
			tmpCb32 = this.forwardCb32;

		this.forwardY = this.currentY;
		this.forwardY32 = this.currentY32;
		this.forwardCr = this.currentCr;
		this.forwardCr32 = this.currentCr32;
		this.forwardCb = this.currentCb;
		this.forwardCb32 = this.currentCb32;

		this.currentY = tmpY;
		this.currentY32 = tmpY32;
		this.currentCr = tmpCr;
		this.currentCr32 = tmpCr32;
		this.currentCb = tmpCb;
		this.currentCb32 = tmpCb32;
	}
};


// Slice Layer

MPEG1.prototype.quantizerScale = 0;
MPEG1.prototype.sliceBegin = false;

MPEG1.prototype.decodeSlice = function(slice) {
	this.sliceBegin = true;
	this.macroblockAddress = (slice - 1) * this.mbWidth - 1;

	// Reset motion vectors and DC predictors
	this.motionFwH = this.motionFwHPrev = 0;
	this.motionFwV = this.motionFwVPrev = 0;
	this.dcPredictorY  = 128;
	this.dcPredictorCr = 128;
	this.dcPredictorCb = 128;

	this.quantizerScale = this.bits.read(5);

	// skip extra bits
	while (this.bits.read(1)) {
		this.bits.skip(8);
	}

	do {
		this.decodeMacroblock();
	} while (!this.bits.nextBytesAreStartCode());
};


// Macroblock Layer

MPEG1.prototype.macroblockAddress = 0;
MPEG1.prototype.mbRow = 0;
MPEG1.prototype.mbCol = 0;

MPEG1.prototype.macroblockType = 0;
MPEG1.prototype.macroblockIntra = false;
MPEG1.prototype.macroblockMotFw = false;

MPEG1.prototype.motionFwH = 0;
MPEG1.prototype.motionFwV = 0;
MPEG1.prototype.motionFwHPrev = 0;
MPEG1.prototype.motionFwVPrev = 0;

MPEG1.prototype.decodeMacroblock = function() {
	// Decode macroblock_address_increment
	var
		increment = 0,
		t = this.readHuffman(MPEG1.MACROBLOCK_ADDRESS_INCREMENT);

	while (t === 34) {
		// macroblock_stuffing
		t = this.readHuffman(MPEG1.MACROBLOCK_ADDRESS_INCREMENT);
	}
	while (t === 35) {
		// macroblock_escape
		increment += 33;
		t = this.readHuffman(MPEG1.MACROBLOCK_ADDRESS_INCREMENT);
	}
	increment += t;

	// Process any skipped macroblocks
	if (this.sliceBegin) {
		// The first macroblock_address_increment of each slice is relative
		// to beginning of the preverious row, not the preverious macroblock
		this.sliceBegin = false;
		this.macroblockAddress += increment;
	}
	else {
		if (this.macroblockAddress + increment >= this.mbSize) {
			// Illegal (too large) macroblock_address_increment
			return;
		}
		if (increment > 1) {
			// Skipped macroblocks reset DC predictors
			this.dcPredictorY  = 128;
			this.dcPredictorCr = 128;
			this.dcPredictorCb = 128;

			// Skipped macroblocks in P-pictures reset motion vectors
			if (this.pictureType === MPEG1.PICTURE_TYPE.PREDICTIVE) {
				this.motionFwH = this.motionFwHPrev = 0;
				this.motionFwV = this.motionFwVPrev = 0;
			}
		}

		// Predict skipped macroblocks
		while (increment > 1) {
			this.macroblockAddress++;
			this.mbRow = (this.macroblockAddress / this.mbWidth)|0;
			this.mbCol = this.macroblockAddress % this.mbWidth;
			this.copyMacroblock(
				this.motionFwH, this.motionFwV,
				this.forwardY, this.forwardCr, this.forwardCb
			);
			increment--;
		}
		this.macroblockAddress++;
	}
	this.mbRow = (this.macroblockAddress / this.mbWidth)|0;
	this.mbCol = this.macroblockAddress % this.mbWidth;

	// Process the current macroblock
	var mbTable = MPEG1.MACROBLOCK_TYPE[this.pictureType];
	this.macroblockType = this.readHuffman(mbTable);
	this.macroblockIntra = (this.macroblockType & 0x01);
	this.macroblockMotFw = (this.macroblockType & 0x08);

	// Quantizer scale
	if ((this.macroblockType & 0x10) !== 0) {
		this.quantizerScale = this.bits.read(5);
	}

	if (this.macroblockIntra) {
		// Intra-coded macroblocks reset motion vectors
		this.motionFwH = this.motionFwHPrev = 0;
		this.motionFwV = this.motionFwVPrev = 0;
	}
	else {
		// Non-intra macroblocks reset DC predictors
		this.dcPredictorY = 128;
		this.dcPredictorCr = 128;
		this.dcPredictorCb = 128;

		this.decodeMotionVectors();
		this.copyMacroblock(
			this.motionFwH, this.motionFwV,
			this.forwardY, this.forwardCr, this.forwardCb
		);
	}

	// Decode blocks
	var cbp = ((this.macroblockType & 0x02) !== 0)
		? this.readHuffman(MPEG1.CODE_BLOCK_PATTERN)
		: (this.macroblockIntra ? 0x3f : 0);

	for (var block = 0, mask = 0x20; block < 6; block++) {
		if ((cbp & mask) !== 0) {
			this.decodeBlock(block);
		}
		mask >>= 1;
	}
};


MPEG1.prototype.decodeMotionVectors = function() {
	var code, d, r = 0;

	// Forward
	if (this.macroblockMotFw) {
		// Horizontal forward
		code = this.readHuffman(MPEG1.MOTION);
		if ((code !== 0) && (this.forwardF !== 1)) {
			r = this.bits.read(this.forwardRSize);
			d = ((Math.abs(code) - 1) << this.forwardRSize) + r + 1;
			if (code < 0) {
				d = -d;
			}
		}
		else {
			d = code;
		}

		this.motionFwHPrev += d;
		if (this.motionFwHPrev > (this.forwardF << 4) - 1) {
			this.motionFwHPrev -= this.forwardF << 5;
		}
		else if (this.motionFwHPrev < ((-this.forwardF) << 4)) {
			this.motionFwHPrev += this.forwardF << 5;
		}

		this.motionFwH = this.motionFwHPrev;
		if (this.fullPelForward) {
			this.motionFwH <<= 1;
		}

		// Vertical forward
		code = this.readHuffman(MPEG1.MOTION);
		if ((code !== 0) && (this.forwardF !== 1)) {
			r = this.bits.read(this.forwardRSize);
			d = ((Math.abs(code) - 1) << this.forwardRSize) + r + 1;
			if (code < 0) {
				d = -d;
			}
		}
		else {
			d = code;
		}

		this.motionFwVPrev += d;
		if (this.motionFwVPrev > (this.forwardF << 4) - 1) {
			this.motionFwVPrev -= this.forwardF << 5;
		}
		else if (this.motionFwVPrev < ((-this.forwardF) << 4)) {
			this.motionFwVPrev += this.forwardF << 5;
		}

		this.motionFwV = this.motionFwVPrev;
		if (this.fullPelForward) {
			this.motionFwV <<= 1;
		}
	}
	else if (this.pictureType === MPEG1.PICTURE_TYPE.PREDICTIVE) {
		// No motion information in P-picture, reset vectors
		this.motionFwH = this.motionFwHPrev = 0;
		this.motionFwV = this.motionFwVPrev = 0;
	}
};

MPEG1.prototype.copyMacroblock = function(motionH, motionV, sY, sCr, sCb) {
	var
		width, scan,
		H, V, oddH, oddV,
		src, dest, last;

	// We use 32bit writes here
	var dY = this.currentY32,
		dCb = this.currentCb32,
		dCr = this.currentCr32;

	// Luminance
	width = this.codedWidth;
	scan = width - 16;

	H = motionH >> 1;
	V = motionV >> 1;
	oddH = (motionH & 1) === 1;
	oddV = (motionV & 1) === 1;

	src = ((this.mbRow << 4) + V) * width + (this.mbCol << 4) + H;
	dest = (this.mbRow * width + this.mbCol) << 2;
	last = dest + (width << 2);

	var x, y1, y2, y;
	if (oddH) {
		if (oddV) {
			while (dest < last) {
				y1 = sY[src] + sY[src+width]; src++;
				for (x = 0; x < 4; x++) {
					y2 = sY[src] + sY[src+width]; src++;
					y = (((y1 + y2 + 2) >> 2) & 0xff);

					y1 = sY[src] + sY[src+width]; src++;
					y |= (((y1 + y2 + 2) << 6) & 0xff00);

					y2 = sY[src] + sY[src+width]; src++;
					y |= (((y1 + y2 + 2) << 14) & 0xff0000);

					y1 = sY[src] + sY[src+width]; src++;
					y |= (((y1 + y2 + 2) << 22) & 0xff000000);

					dY[dest++] = y;
				}
				dest += scan >> 2; src += scan-1;
			}
		}
		else {
			while (dest < last) {
				y1 = sY[src++];
				for (x = 0; x < 4; x++) {
					y2 = sY[src++];
					y = (((y1 + y2 + 1) >> 1) & 0xff);

					y1 = sY[src++];
					y |= (((y1 + y2 + 1) << 7) & 0xff00);

					y2 = sY[src++];
					y |= (((y1 + y2 + 1) << 15) & 0xff0000);

					y1 = sY[src++];
					y |= (((y1 + y2 + 1) << 23) & 0xff000000);

					dY[dest++] = y;
				}
				dest += scan >> 2; src += scan-1;
			}
		}
	}
	else {
		if (oddV) {
			while (dest < last) {
				for (x = 0; x < 4; x++) {
					y = (((sY[src] + sY[src+width] + 1) >> 1) & 0xff); src++;
					y |= (((sY[src] + sY[src+width] + 1) << 7) & 0xff00); src++;
					y |= (((sY[src] + sY[src+width] + 1) << 15) & 0xff0000); src++;
					y |= (((sY[src] + sY[src+width] + 1) << 23) & 0xff000000); src++;

					dY[dest++] = y;
				}
				dest += scan >> 2; src += scan;
			}
		}
		else {
			while (dest < last) {
				for (x = 0; x < 4; x++) {
					y = sY[src]; src++;
					y |= sY[src] << 8; src++;
					y |= sY[src] << 16; src++;
					y |= sY[src] << 24; src++;

					dY[dest++] = y;
				}
				dest += scan >> 2; src += scan;
			}
		}
	}

	// Chrominance

	width = this.halfWidth;
	scan = width - 8;

	H = (motionH/2) >> 1;
	V = (motionV/2) >> 1;
	oddH = ((motionH/2) & 1) === 1;
	oddV = ((motionV/2) & 1) === 1;

	src = ((this.mbRow << 3) + V) * width + (this.mbCol << 3) + H;
	dest = (this.mbRow * width + this.mbCol) << 1;
	last = dest + (width << 1);

	var cr1, cr2, cr,
		cb1, cb2, cb;
	if (oddH) {
		if (oddV) {
			while (dest < last) {
				cr1 = sCr[src] + sCr[src+width];
				cb1 = sCb[src] + sCb[src+width];
				src++;
				for (x = 0; x < 2; x++) {
					cr2 = sCr[src] + sCr[src+width];
					cb2 = sCb[src] + sCb[src+width]; src++;
					cr = (((cr1 + cr2 + 2) >> 2) & 0xff);
					cb = (((cb1 + cb2 + 2) >> 2) & 0xff);

					cr1 = sCr[src] + sCr[src+width];
					cb1 = sCb[src] + sCb[src+width]; src++;
					cr |= (((cr1 + cr2 + 2) << 6) & 0xff00);
					cb |= (((cb1 + cb2 + 2) << 6) & 0xff00);

					cr2 = sCr[src] + sCr[src+width];
					cb2 = sCb[src] + sCb[src+width]; src++;
					cr |= (((cr1 + cr2 + 2) << 14) & 0xff0000);
					cb |= (((cb1 + cb2 + 2) << 14) & 0xff0000);

					cr1 = sCr[src] + sCr[src+width];
					cb1 = sCb[src] + sCb[src+width]; src++;
					cr |= (((cr1 + cr2 + 2) << 22) & 0xff000000);
					cb |= (((cb1 + cb2 + 2) << 22) & 0xff000000);

					dCr[dest] = cr;
					dCb[dest] = cb;
					dest++;
				}
				dest += scan >> 2; src += scan-1;
			}
		}
		else {
			while (dest < last) {
				cr1 = sCr[src];
				cb1 = sCb[src];
				src++;
				for (x = 0; x < 2; x++) {
					cr2 = sCr[src];
					cb2 = sCb[src++];
					cr = (((cr1 + cr2 + 1) >> 1) & 0xff);
					cb = (((cb1 + cb2 + 1) >> 1) & 0xff);

					cr1 = sCr[src];
					cb1 = sCb[src++];
					cr |= (((cr1 + cr2 + 1) << 7) & 0xff00);
					cb |= (((cb1 + cb2 + 1) << 7) & 0xff00);

					cr2 = sCr[src];
					cb2 = sCb[src++];
					cr |= (((cr1 + cr2 + 1) << 15) & 0xff0000);
					cb |= (((cb1 + cb2 + 1) << 15) & 0xff0000);

					cr1 = sCr[src];
					cb1 = sCb[src++];
					cr |= (((cr1 + cr2 + 1) << 23) & 0xff000000);
					cb |= (((cb1 + cb2 + 1) << 23) & 0xff000000);

					dCr[dest] = cr;
					dCb[dest] = cb;
					dest++;
				}
				dest += scan >> 2; src += scan-1;
			}
		}
	}
	else {
		if (oddV) {
			while (dest < last) {
				for (x = 0; x < 2; x++) {
					cr = (((sCr[src] + sCr[src+width] + 1) >> 1) & 0xff);
					cb = (((sCb[src] + sCb[src+width] + 1) >> 1) & 0xff); src++;

					cr |= (((sCr[src] + sCr[src+width] + 1) << 7) & 0xff00);
					cb |= (((sCb[src] + sCb[src+width] + 1) << 7) & 0xff00); src++;

					cr |= (((sCr[src] + sCr[src+width] + 1) << 15) & 0xff0000);
					cb |= (((sCb[src] + sCb[src+width] + 1) << 15) & 0xff0000); src++;

					cr |= (((sCr[src] + sCr[src+width] + 1) << 23) & 0xff000000);
					cb |= (((sCb[src] + sCb[src+width] + 1) << 23) & 0xff000000); src++;

					dCr[dest] = cr;
					dCb[dest] = cb;
					dest++;
				}
				dest += scan >> 2; src += scan;
			}
		}
		else {
			while (dest < last) {
				for (x = 0; x < 2; x++) {
					cr = sCr[src];
					cb = sCb[src]; src++;

					cr |= sCr[src] << 8;
					cb |= sCb[src] << 8; src++;

					cr |= sCr[src] << 16;
					cb |= sCb[src] << 16; src++;

					cr |= sCr[src] << 24;
					cb |= sCb[src] << 24; src++;

					dCr[dest] = cr;
					dCb[dest] = cb;
					dest++;
				}
				dest += scan >> 2; src += scan;
			}
		}
	}
};


// Block layer

MPEG1.prototype.dcPredictorY = 0;
MPEG1.prototype.dcPredictorCr = 0;
MPEG1.prototype.dcPredictorCb = 0;

MPEG1.prototype.blockData = null;

MPEG1.prototype.decodeBlock = function(block) {

	var
		n = 0,
		quantMatrix;

	// Decode DC coefficient of intra-coded blocks
	if (this.macroblockIntra) {
		var
			predictor,
			dctSize;

		// DC prediction

		if (block < 4) {
			predictor = this.dcPredictorY;
			dctSize = this.readHuffman(MPEG1.DCT_DC_SIZE_LUMINANCE);
		}
		else {
			predictor = (block === 4 ? this.dcPredictorCr : this.dcPredictorCb);
			dctSize = this.readHuffman(MPEG1.DCT_DC_SIZE_CHROMINANCE);
		}

		// Read DC coeff
		if (dctSize > 0) {
			var differential = this.bits.read(dctSize);
			if ((differential & (1 << (dctSize - 1))) !== 0) {
				this.blockData[0] = predictor + differential;
			}
			else {
				this.blockData[0] = predictor + ((-1 << dctSize)|(differential+1));
			}
		}
		else {
			this.blockData[0] = predictor;
		}

		// Save predictor value
		if (block < 4) {
			this.dcPredictorY = this.blockData[0];
		}
		else if (block === 4) {
			this.dcPredictorCr = this.blockData[0];
		}
		else {
			this.dcPredictorCb = this.blockData[0];
		}

		// Dequantize + premultiply
		this.blockData[0] <<= (3 + 5);

		quantMatrix = this.intraQuantMatrix;
		n = 1;
	}
	else {
		quantMatrix = this.nonIntraQuantMatrix;
	}

	// Decode AC coefficients (+DC for non-intra)
	var level = 0;
	while (true) {
		var
			run = 0,
			coeff = this.readHuffman(MPEG1.DCT_COEFF);

		if ((coeff === 0x0001) && (n > 0) && (this.bits.read(1) === 0)) {
			// end_of_block
			break;
		}
		if (coeff === 0xffff) {
			// escape
			run = this.bits.read(6);
			level = this.bits.read(8);
			if (level === 0) {
				level = this.bits.read(8);
			}
			else if (level === 128) {
				level = this.bits.read(8) - 256;
			}
			else if (level > 128) {
				level = level - 256;
			}
		}
		else {
			run = coeff >> 8;
			level = coeff & 0xff;
			if (this.bits.read(1)) {
				level = -level;
			}
		}

		n += run;
		var dezigZagged = MPEG1.ZIG_ZAG[n];
		n++;

		// Dequantize, oddify, clip
		level <<= 1;
		if (!this.macroblockIntra) {
			level += (level < 0 ? -1 : 1);
		}
		level = (level * this.quantizerScale * quantMatrix[dezigZagged]) >> 4;
		if ((level & 1) === 0) {
			level -= level > 0 ? 1 : -1;
		}
		if (level > 2047) {
			level = 2047;
		}
		else if (level < -2048) {
			level = -2048;
		}

		// Save premultiplied coefficient
		this.blockData[dezigZagged] = level * MPEG1.PREMULTIPLIER_MATRIX[dezigZagged];
	}

	// Move block to its place
	var
		destArray,
		destIndex,
		scan;

	if (block < 4) {
		destArray = this.currentY;
		scan = this.codedWidth - 8;
		destIndex = (this.mbRow * this.codedWidth + this.mbCol) << 4;
		if ((block & 1) !== 0) {
			destIndex += 8;
		}
		if ((block & 2) !== 0) {
			destIndex += this.codedWidth << 3;
		}
	}
	else {
		destArray = (block === 4) ? this.currentCb : this.currentCr;
		scan = (this.codedWidth >> 1) - 8;
		destIndex = ((this.mbRow * this.codedWidth) << 2) + (this.mbCol << 3);
	}

	if (this.macroblockIntra) {
		// Overwrite (no prediction)
		if (n === 1) {
			MPEG1.CopyValueToDestination((this.blockData[0] + 128) >> 8, destArray, destIndex, scan);
			this.blockData[0] = 0;
		}
		else {
			MPEG1.IDCT(this.blockData);
			MPEG1.CopyBlockToDestination(this.blockData, destArray, destIndex, scan);
			JSMpeg.Fill(this.blockData, 0);
		}
	}
	else {
		// Add data to the predicted macroblock
		if (n === 1) {
			MPEG1.AddValueToDestination((this.blockData[0] + 128) >> 8, destArray, destIndex, scan);
			this.blockData[0] = 0;
		}
		else {
			MPEG1.IDCT(this.blockData);
			MPEG1.AddBlockToDestination(this.blockData, destArray, destIndex, scan);
			JSMpeg.Fill(this.blockData, 0);
		}
	}

	n = 0;
};

MPEG1.CopyBlockToDestination = function(block, dest, index, scan) {
	for (var n = 0; n < 64; n += 8, index += scan+8) {
		dest[index+0] = block[n+0];
		dest[index+1] = block[n+1];
		dest[index+2] = block[n+2];
		dest[index+3] = block[n+3];
		dest[index+4] = block[n+4];
		dest[index+5] = block[n+5];
		dest[index+6] = block[n+6];
		dest[index+7] = block[n+7];
	}
};

MPEG1.AddBlockToDestination = function(block, dest, index, scan) {
	for (var n = 0; n < 64; n += 8, index += scan+8) {
		dest[index+0] += block[n+0];
		dest[index+1] += block[n+1];
		dest[index+2] += block[n+2];
		dest[index+3] += block[n+3];
		dest[index+4] += block[n+4];
		dest[index+5] += block[n+5];
		dest[index+6] += block[n+6];
		dest[index+7] += block[n+7];
	}
};

MPEG1.CopyValueToDestination = function(value, dest, index, scan) {
	for (var n = 0; n < 64; n += 8, index += scan+8) {
		dest[index+0] = value;
		dest[index+1] = value;
		dest[index+2] = value;
		dest[index+3] = value;
		dest[index+4] = value;
		dest[index+5] = value;
		dest[index+6] = value;
		dest[index+7] = value;
	}
};

MPEG1.AddValueToDestination = function(value, dest, index, scan) {
	for (var n = 0; n < 64; n += 8, index += scan+8) {
		dest[index+0] += value;
		dest[index+1] += value;
		dest[index+2] += value;
		dest[index+3] += value;
		dest[index+4] += value;
		dest[index+5] += value;
		dest[index+6] += value;
		dest[index+7] += value;
	}
};

MPEG1.IDCT = function(block) {
	// See http://vsr.informatik.tu-chemnitz.de/~jan/MPEG/HTML/IDCT.html
	// for more info.

	var
		b1, b3, b4, b6, b7, tmp1, tmp2, m0,
		x0, x1, x2, x3, x4, y3, y4, y5, y6, y7;

	// Transform columns
	for (var i = 0; i < 8; ++i) {
		b1 = block[4*8+i];
		b3 = block[2*8+i] + block[6*8+i];
		b4 = block[5*8+i] - block[3*8+i];
		tmp1 = block[1*8+i] + block[7*8+i];
		tmp2 = block[3*8+i] + block[5*8+i];
		b6 = block[1*8+i] - block[7*8+i];
		b7 = tmp1 + tmp2;
		m0 = block[0*8+i];
		x4 = ((b6*473 - b4*196 + 128) >> 8) - b7;
		x0 = x4 - (((tmp1 - tmp2)*362 + 128) >> 8);
		x1 = m0 - b1;
		x2 = (((block[2*8+i] - block[6*8+i])*362 + 128) >> 8) - b3;
		x3 = m0 + b1;
		y3 = x1 + x2;
		y4 = x3 + b3;
		y5 = x1 - x2;
		y6 = x3 - b3;
		y7 = -x0 - ((b4*473 + b6*196 + 128) >> 8);
		block[0*8+i] = b7 + y4;
		block[1*8+i] = x4 + y3;
		block[2*8+i] = y5 - x0;
		block[3*8+i] = y6 - y7;
		block[4*8+i] = y6 + y7;
		block[5*8+i] = x0 + y5;
		block[6*8+i] = y3 - x4;
		block[7*8+i] = y4 - b7;
	}

	// Transform rows
	for (var i = 0; i < 64; i += 8) {
		b1 = block[4+i];
		b3 = block[2+i] + block[6+i];
		b4 = block[5+i] - block[3+i];
		tmp1 = block[1+i] + block[7+i];
		tmp2 = block[3+i] + block[5+i];
		b6 = block[1+i] - block[7+i];
		b7 = tmp1 + tmp2;
		m0 = block[0+i];
		x4 = ((b6*473 - b4*196 + 128) >> 8) - b7;
		x0 = x4 - (((tmp1 - tmp2)*362 + 128) >> 8);
		x1 = m0 - b1;
		x2 = (((block[2+i] - block[6+i])*362 + 128) >> 8) - b3;
		x3 = m0 + b1;
		y3 = x1 + x2;
		y4 = x3 + b3;
		y5 = x1 - x2;
		y6 = x3 - b3;
		y7 = -x0 - ((b4*473 + b6*196 + 128) >> 8);
		block[0+i] = (b7 + y4 + 128) >> 8;
		block[1+i] = (x4 + y3 + 128) >> 8;
		block[2+i] = (y5 - x0 + 128) >> 8;
		block[3+i] = (y6 - y7 + 128) >> 8;
		block[4+i] = (y6 + y7 + 128) >> 8;
		block[5+i] = (x0 + y5 + 128) >> 8;
		block[6+i] = (y3 - x4 + 128) >> 8;
		block[7+i] = (y4 - b7 + 128) >> 8;
	}
};


// VLC Tables and Constants

MPEG1.PICTURE_RATE = [
	0.000, 23.976, 24.000, 25.000, 29.970, 30.000, 50.000, 59.940,
	60.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000
];

MPEG1.ZIG_ZAG = new Uint8Array([
	 0,  1,  8, 16,  9,  2,  3, 10,
	17, 24, 32, 25, 18, 11,  4,  5,
	12, 19, 26, 33, 40, 48, 41, 34,
	27, 20, 13,  6,  7, 14, 21, 28,
	35, 42, 49, 56, 57, 50, 43, 36,
	29, 22, 15, 23, 30, 37, 44, 51,
	58, 59, 52, 45, 38, 31, 39, 46,
	53, 60, 61, 54, 47, 55, 62, 63
]);

MPEG1.DEFAULT_INTRA_QUANT_MATRIX = new Uint8Array([
	 8, 16, 19, 22, 26, 27, 29, 34,
	16, 16, 22, 24, 27, 29, 34, 37,
	19, 22, 26, 27, 29, 34, 34, 38,
	22, 22, 26, 27, 29, 34, 37, 40,
	22, 26, 27, 29, 32, 35, 40, 48,
	26, 27, 29, 32, 35, 40, 48, 58,
	26, 27, 29, 34, 38, 46, 56, 69,
	27, 29, 35, 38, 46, 56, 69, 83
]);

MPEG1.DEFAULT_NON_INTRA_QUANT_MATRIX = new Uint8Array([
	16, 16, 16, 16, 16, 16, 16, 16,
	16, 16, 16, 16, 16, 16, 16, 16,
	16, 16, 16, 16, 16, 16, 16, 16,
	16, 16, 16, 16, 16, 16, 16, 16,
	16, 16, 16, 16, 16, 16, 16, 16,
	16, 16, 16, 16, 16, 16, 16, 16,
	16, 16, 16, 16, 16, 16, 16, 16,
	16, 16, 16, 16, 16, 16, 16, 16
]);

MPEG1.PREMULTIPLIER_MATRIX = new Uint8Array([
	32, 44, 42, 38, 32, 25, 17,  9,
	44, 62, 58, 52, 44, 35, 24, 12,
	42, 58, 55, 49, 42, 33, 23, 12,
	38, 52, 49, 44, 38, 30, 20, 10,
	32, 44, 42, 38, 32, 25, 17,  9,
	25, 35, 33, 30, 25, 20, 14,  7,
	17, 24, 23, 20, 17, 14,  9,  5,
	 9, 12, 12, 10,  9,  7,  5,  2
]);

// MPEG-1 VLC

//  macroblock_stuffing decodes as 34.
//  macroblock_escape decodes as 35.

MPEG1.MACROBLOCK_ADDRESS_INCREMENT = new Int16Array([
	 1*3,  2*3,  0, //   0
	 3*3,  4*3,  0, //   1  0
	   0,    0,  1, //   2  1.
	 5*3,  6*3,  0, //   3  00
	 7*3,  8*3,  0, //   4  01
	 9*3, 10*3,  0, //   5  000
	11*3, 12*3,  0, //   6  001
	   0,    0,  3, //   7  010.
	   0,    0,  2, //   8  011.
	13*3, 14*3,  0, //   9  0000
	15*3, 16*3,  0, //  10  0001
	   0,    0,  5, //  11  0010.
	   0,    0,  4, //  12  0011.
	17*3, 18*3,  0, //  13  0000 0
	19*3, 20*3,  0, //  14  0000 1
	   0,    0,  7, //  15  0001 0.
	   0,    0,  6, //  16  0001 1.
	21*3, 22*3,  0, //  17  0000 00
	23*3, 24*3,  0, //  18  0000 01
	25*3, 26*3,  0, //  19  0000 10
	27*3, 28*3,  0, //  20  0000 11
	  -1, 29*3,  0, //  21  0000 000
	  -1, 30*3,  0, //  22  0000 001
	31*3, 32*3,  0, //  23  0000 010
	33*3, 34*3,  0, //  24  0000 011
	35*3, 36*3,  0, //  25  0000 100
	37*3, 38*3,  0, //  26  0000 101
	   0,    0,  9, //  27  0000 110.
	   0,    0,  8, //  28  0000 111.
	39*3, 40*3,  0, //  29  0000 0001
	41*3, 42*3,  0, //  30  0000 0011
	43*3, 44*3,  0, //  31  0000 0100
	45*3, 46*3,  0, //  32  0000 0101
	   0,    0, 15, //  33  0000 0110.
	   0,    0, 14, //  34  0000 0111.
	   0,    0, 13, //  35  0000 1000.
	   0,    0, 12, //  36  0000 1001.
	   0,    0, 11, //  37  0000 1010.
	   0,    0, 10, //  38  0000 1011.
	47*3,   -1,  0, //  39  0000 0001 0
	  -1, 48*3,  0, //  40  0000 0001 1
	49*3, 50*3,  0, //  41  0000 0011 0
	51*3, 52*3,  0, //  42  0000 0011 1
	53*3, 54*3,  0, //  43  0000 0100 0
	55*3, 56*3,  0, //  44  0000 0100 1
	57*3, 58*3,  0, //  45  0000 0101 0
	59*3, 60*3,  0, //  46  0000 0101 1
	61*3,   -1,  0, //  47  0000 0001 00
	  -1, 62*3,  0, //  48  0000 0001 11
	63*3, 64*3,  0, //  49  0000 0011 00
	65*3, 66*3,  0, //  50  0000 0011 01
	67*3, 68*3,  0, //  51  0000 0011 10
	69*3, 70*3,  0, //  52  0000 0011 11
	71*3, 72*3,  0, //  53  0000 0100 00
	73*3, 74*3,  0, //  54  0000 0100 01
	   0,    0, 21, //  55  0000 0100 10.
	   0,    0, 20, //  56  0000 0100 11.
	   0,    0, 19, //  57  0000 0101 00.
	   0,    0, 18, //  58  0000 0101 01.
	   0,    0, 17, //  59  0000 0101 10.
	   0,    0, 16, //  60  0000 0101 11.
	   0,    0, 35, //  61  0000 0001 000. -- macroblock_escape
	   0,    0, 34, //  62  0000 0001 111. -- macroblock_stuffing
	   0,    0, 33, //  63  0000 0011 000.
	   0,    0, 32, //  64  0000 0011 001.
	   0,    0, 31, //  65  0000 0011 010.
	   0,    0, 30, //  66  0000 0011 011.
	   0,    0, 29, //  67  0000 0011 100.
	   0,    0, 28, //  68  0000 0011 101.
	   0,    0, 27, //  69  0000 0011 110.
	   0,    0, 26, //  70  0000 0011 111.
	   0,    0, 25, //  71  0000 0100 000.
	   0,    0, 24, //  72  0000 0100 001.
	   0,    0, 23, //  73  0000 0100 010.
	   0,    0, 22  //  74  0000 0100 011.
]);

//  macroblock_type bitmap:
//    0x10  macroblock_quant
//    0x08  macroblock_motion_forward
//    0x04  macroblock_motion_backward
//    0x02  macrobkock_pattern
//    0x01  macroblock_intra
//

MPEG1.MACROBLOCK_TYPE_INTRA = new Int8Array([
	 1*3,  2*3,     0, //   0
	  -1,  3*3,     0, //   1  0
	   0,    0,  0x01, //   2  1.
	   0,    0,  0x11  //   3  01.
]);

MPEG1.MACROBLOCK_TYPE_PREDICTIVE = new Int8Array([
	 1*3,  2*3,     0, //  0
	 3*3,  4*3,     0, //  1  0
	   0,    0,  0x0a, //  2  1.
	 5*3,  6*3,     0, //  3  00
	   0,    0,  0x02, //  4  01.
	 7*3,  8*3,     0, //  5  000
	   0,    0,  0x08, //  6  001.
	 9*3, 10*3,     0, //  7  0000
	11*3, 12*3,     0, //  8  0001
	  -1, 13*3,     0, //  9  00000
	   0,    0,  0x12, // 10  00001.
	   0,    0,  0x1a, // 11  00010.
	   0,    0,  0x01, // 12  00011.
	   0,    0,  0x11  // 13  000001.
]);

MPEG1.MACROBLOCK_TYPE_B = new Int8Array([
	 1*3,  2*3,     0,  //  0
	 3*3,  5*3,     0,  //  1  0
	 4*3,  6*3,     0,  //  2  1
	 8*3,  7*3,     0,  //  3  00
	   0,    0,  0x0c,  //  4  10.
	 9*3, 10*3,     0,  //  5  01
	   0,    0,  0x0e,  //  6  11.
	13*3, 14*3,     0,  //  7  001
	12*3, 11*3,     0,  //  8  000
	   0,    0,  0x04,  //  9  010.
	   0,    0,  0x06,  // 10  011.
	18*3, 16*3,     0,  // 11  0001
	15*3, 17*3,     0,  // 12  0000
	   0,    0,  0x08,  // 13  0010.
	   0,    0,  0x0a,  // 14  0011.
	  -1, 19*3,     0,  // 15  00000
	   0,    0,  0x01,  // 16  00011.
	20*3, 21*3,     0,  // 17  00001
	   0,    0,  0x1e,  // 18  00010.
	   0,    0,  0x11,  // 19  000001.
	   0,    0,  0x16,  // 20  000010.
	   0,    0,  0x1a   // 21  000011.
]);

MPEG1.MACROBLOCK_TYPE = [
	null,
	MPEG1.MACROBLOCK_TYPE_INTRA,
	MPEG1.MACROBLOCK_TYPE_PREDICTIVE,
	MPEG1.MACROBLOCK_TYPE_B
];

MPEG1.CODE_BLOCK_PATTERN = new Int16Array([
	  2*3,   1*3,   0,  //   0
	  3*3,   6*3,   0,  //   1  1
	  4*3,   5*3,   0,  //   2  0
	  8*3,  11*3,   0,  //   3  10
	 12*3,  13*3,   0,  //   4  00
	  9*3,   7*3,   0,  //   5  01
	 10*3,  14*3,   0,  //   6  11
	 20*3,  19*3,   0,  //   7  011
	 18*3,  16*3,   0,  //   8  100
	 23*3,  17*3,   0,  //   9  010
	 27*3,  25*3,   0,  //  10  110
	 21*3,  28*3,   0,  //  11  101
	 15*3,  22*3,   0,  //  12  000
	 24*3,  26*3,   0,  //  13  001
	    0,     0,  60,  //  14  111.
	 35*3,  40*3,   0,  //  15  0000
	 44*3,  48*3,   0,  //  16  1001
	 38*3,  36*3,   0,  //  17  0101
	 42*3,  47*3,   0,  //  18  1000
	 29*3,  31*3,   0,  //  19  0111
	 39*3,  32*3,   0,  //  20  0110
	    0,     0,  32,  //  21  1010.
	 45*3,  46*3,   0,  //  22  0001
	 33*3,  41*3,   0,  //  23  0100
	 43*3,  34*3,   0,  //  24  0010
	    0,     0,   4,  //  25  1101.
	 30*3,  37*3,   0,  //  26  0011
	    0,     0,   8,  //  27  1100.
	    0,     0,  16,  //  28  1011.
	    0,     0,  44,  //  29  0111 0.
	 50*3,  56*3,   0,  //  30  0011 0
	    0,     0,  28,  //  31  0111 1.
	    0,     0,  52,  //  32  0110 1.
	    0,     0,  62,  //  33  0100 0.
	 61*3,  59*3,   0,  //  34  0010 1
	 52*3,  60*3,   0,  //  35  0000 0
	    0,     0,   1,  //  36  0101 1.
	 55*3,  54*3,   0,  //  37  0011 1
	    0,     0,  61,  //  38  0101 0.
	    0,     0,  56,  //  39  0110 0.
	 57*3,  58*3,   0,  //  40  0000 1
	    0,     0,   2,  //  41  0100 1.
	    0,     0,  40,  //  42  1000 0.
	 51*3,  62*3,   0,  //  43  0010 0
	    0,     0,  48,  //  44  1001 0.
	 64*3,  63*3,   0,  //  45  0001 0
	 49*3,  53*3,   0,  //  46  0001 1
	    0,     0,  20,  //  47  1000 1.
	    0,     0,  12,  //  48  1001 1.
	 80*3,  83*3,   0,  //  49  0001 10
	    0,     0,  63,  //  50  0011 00.
	 77*3,  75*3,   0,  //  51  0010 00
	 65*3,  73*3,   0,  //  52  0000 00
	 84*3,  66*3,   0,  //  53  0001 11
	    0,     0,  24,  //  54  0011 11.
	    0,     0,  36,  //  55  0011 10.
	    0,     0,   3,  //  56  0011 01.
	 69*3,  87*3,   0,  //  57  0000 10
	 81*3,  79*3,   0,  //  58  0000 11
	 68*3,  71*3,   0,  //  59  0010 11
	 70*3,  78*3,   0,  //  60  0000 01
	 67*3,  76*3,   0,  //  61  0010 10
	 72*3,  74*3,   0,  //  62  0010 01
	 86*3,  85*3,   0,  //  63  0001 01
	 88*3,  82*3,   0,  //  64  0001 00
	   -1,  94*3,   0,  //  65  0000 000
	 95*3,  97*3,   0,  //  66  0001 111
	    0,     0,  33,  //  67  0010 100.
	    0,     0,   9,  //  68  0010 110.
	106*3, 110*3,   0,  //  69  0000 100
	102*3, 116*3,   0,  //  70  0000 010
	    0,     0,   5,  //  71  0010 111.
	    0,     0,  10,  //  72  0010 010.
	 93*3,  89*3,   0,  //  73  0000 001
	    0,     0,   6,  //  74  0010 011.
	    0,     0,  18,  //  75  0010 001.
	    0,     0,  17,  //  76  0010 101.
	    0,     0,  34,  //  77  0010 000.
	113*3, 119*3,   0,  //  78  0000 011
	103*3, 104*3,   0,  //  79  0000 111
	 90*3,  92*3,   0,  //  80  0001 100
	109*3, 107*3,   0,  //  81  0000 110
	117*3, 118*3,   0,  //  82  0001 001
	101*3,  99*3,   0,  //  83  0001 101
	 98*3,  96*3,   0,  //  84  0001 110
	100*3,  91*3,   0,  //  85  0001 011
	114*3, 115*3,   0,  //  86  0001 010
	105*3, 108*3,   0,  //  87  0000 101
	112*3, 111*3,   0,  //  88  0001 000
	121*3, 125*3,   0,  //  89  0000 0011
	    0,     0,  41,  //  90  0001 1000.
	    0,     0,  14,  //  91  0001 0111.
	    0,     0,  21,  //  92  0001 1001.
	124*3, 122*3,   0,  //  93  0000 0010
	120*3, 123*3,   0,  //  94  0000 0001
	    0,     0,  11,  //  95  0001 1110.
	    0,     0,  19,  //  96  0001 1101.
	    0,     0,   7,  //  97  0001 1111.
	    0,     0,  35,  //  98  0001 1100.
	    0,     0,  13,  //  99  0001 1011.
	    0,     0,  50,  // 100  0001 0110.
	    0,     0,  49,  // 101  0001 1010.
	    0,     0,  58,  // 102  0000 0100.
	    0,     0,  37,  // 103  0000 1110.
	    0,     0,  25,  // 104  0000 1111.
	    0,     0,  45,  // 105  0000 1010.
	    0,     0,  57,  // 106  0000 1000.
	    0,     0,  26,  // 107  0000 1101.
	    0,     0,  29,  // 108  0000 1011.
	    0,     0,  38,  // 109  0000 1100.
	    0,     0,  53,  // 110  0000 1001.
	    0,     0,  23,  // 111  0001 0001.
	    0,     0,  43,  // 112  0001 0000.
	    0,     0,  46,  // 113  0000 0110.
	    0,     0,  42,  // 114  0001 0100.
	    0,     0,  22,  // 115  0001 0101.
	    0,     0,  54,  // 116  0000 0101.
	    0,     0,  51,  // 117  0001 0010.
	    0,     0,  15,  // 118  0001 0011.
	    0,     0,  30,  // 119  0000 0111.
	    0,     0,  39,  // 120  0000 0001 0.
	    0,     0,  47,  // 121  0000 0011 0.
	    0,     0,  55,  // 122  0000 0010 1.
	    0,     0,  27,  // 123  0000 0001 1.
	    0,     0,  59,  // 124  0000 0010 0.
	    0,     0,  31   // 125  0000 0011 1.
]);

MPEG1.MOTION = new Int16Array([
	  1*3,   2*3,   0,  //   0
	  4*3,   3*3,   0,  //   1  0
	    0,     0,   0,  //   2  1.
	  6*3,   5*3,   0,  //   3  01
	  8*3,   7*3,   0,  //   4  00
	    0,     0,  -1,  //   5  011.
	    0,     0,   1,  //   6  010.
	  9*3,  10*3,   0,  //   7  001
	 12*3,  11*3,   0,  //   8  000
	    0,     0,   2,  //   9  0010.
	    0,     0,  -2,  //  10  0011.
	 14*3,  15*3,   0,  //  11  0001
	 16*3,  13*3,   0,  //  12  0000
	 20*3,  18*3,   0,  //  13  0000 1
	    0,     0,   3,  //  14  0001 0.
	    0,     0,  -3,  //  15  0001 1.
	 17*3,  19*3,   0,  //  16  0000 0
	   -1,  23*3,   0,  //  17  0000 00
	 27*3,  25*3,   0,  //  18  0000 11
	 26*3,  21*3,   0,  //  19  0000 01
	 24*3,  22*3,   0,  //  20  0000 10
	 32*3,  28*3,   0,  //  21  0000 011
	 29*3,  31*3,   0,  //  22  0000 101
	   -1,  33*3,   0,  //  23  0000 001
	 36*3,  35*3,   0,  //  24  0000 100
	    0,     0,  -4,  //  25  0000 111.
	 30*3,  34*3,   0,  //  26  0000 010
	    0,     0,   4,  //  27  0000 110.
	    0,     0,  -7,  //  28  0000 0111.
	    0,     0,   5,  //  29  0000 1010.
	 37*3,  41*3,   0,  //  30  0000 0100
	    0,     0,  -5,  //  31  0000 1011.
	    0,     0,   7,  //  32  0000 0110.
	 38*3,  40*3,   0,  //  33  0000 0011
	 42*3,  39*3,   0,  //  34  0000 0101
	    0,     0,  -6,  //  35  0000 1001.
	    0,     0,   6,  //  36  0000 1000.
	 51*3,  54*3,   0,  //  37  0000 0100 0
	 50*3,  49*3,   0,  //  38  0000 0011 0
	 45*3,  46*3,   0,  //  39  0000 0101 1
	 52*3,  47*3,   0,  //  40  0000 0011 1
	 43*3,  53*3,   0,  //  41  0000 0100 1
	 44*3,  48*3,   0,  //  42  0000 0101 0
	    0,     0,  10,  //  43  0000 0100 10.
	    0,     0,   9,  //  44  0000 0101 00.
	    0,     0,   8,  //  45  0000 0101 10.
	    0,     0,  -8,  //  46  0000 0101 11.
	 57*3,  66*3,   0,  //  47  0000 0011 11
	    0,     0,  -9,  //  48  0000 0101 01.
	 60*3,  64*3,   0,  //  49  0000 0011 01
	 56*3,  61*3,   0,  //  50  0000 0011 00
	 55*3,  62*3,   0,  //  51  0000 0100 00
	 58*3,  63*3,   0,  //  52  0000 0011 10
	    0,     0, -10,  //  53  0000 0100 11.
	 59*3,  65*3,   0,  //  54  0000 0100 01
	    0,     0,  12,  //  55  0000 0100 000.
	    0,     0,  16,  //  56  0000 0011 000.
	    0,     0,  13,  //  57  0000 0011 110.
	    0,     0,  14,  //  58  0000 0011 100.
	    0,     0,  11,  //  59  0000 0100 010.
	    0,     0,  15,  //  60  0000 0011 010.
	    0,     0, -16,  //  61  0000 0011 001.
	    0,     0, -12,  //  62  0000 0100 001.
	    0,     0, -14,  //  63  0000 0011 101.
	    0,     0, -15,  //  64  0000 0011 011.
	    0,     0, -11,  //  65  0000 0100 011.
	    0,     0, -13   //  66  0000 0011 111.
]);

MPEG1.DCT_DC_SIZE_LUMINANCE = new Int8Array([
	  2*3,   1*3, 0,  //   0
	  6*3,   5*3, 0,  //   1  1
	  3*3,   4*3, 0,  //   2  0
	    0,     0, 1,  //   3  00.
	    0,     0, 2,  //   4  01.
	  9*3,   8*3, 0,  //   5  11
	  7*3,  10*3, 0,  //   6  10
	    0,     0, 0,  //   7  100.
	 12*3,  11*3, 0,  //   8  111
	    0,     0, 4,  //   9  110.
	    0,     0, 3,  //  10  101.
	 13*3,  14*3, 0,  //  11  1111
	    0,     0, 5,  //  12  1110.
	    0,     0, 6,  //  13  1111 0.
	 16*3,  15*3, 0,  //  14  1111 1
	 17*3,    -1, 0,  //  15  1111 11
	    0,     0, 7,  //  16  1111 10.
	    0,     0, 8   //  17  1111 110.
]);

MPEG1.DCT_DC_SIZE_CHROMINANCE = new Int8Array([
	  2*3,   1*3, 0,  //   0
	  4*3,   3*3, 0,  //   1  1
	  6*3,   5*3, 0,  //   2  0
	  8*3,   7*3, 0,  //   3  11
	    0,     0, 2,  //   4  10.
	    0,     0, 1,  //   5  01.
	    0,     0, 0,  //   6  00.
	 10*3,   9*3, 0,  //   7  111
	    0,     0, 3,  //   8  110.
	 12*3,  11*3, 0,  //   9  1111
	    0,     0, 4,  //  10  1110.
	 14*3,  13*3, 0,  //  11  1111 1
	    0,     0, 5,  //  12  1111 0.
	 16*3,  15*3, 0,  //  13  1111 11
	    0,     0, 6,  //  14  1111 10.
	 17*3,    -1, 0,  //  15  1111 111
	    0,     0, 7,  //  16  1111 110.
	    0,     0, 8   //  17  1111 1110.
]);

//  dct_coeff bitmap:
//    0xff00  run
//    0x00ff  level

//  Decoded values are unsigned. Sign bit follows in the stream.

//  Interpretation of the value 0x0001
//    for dc_coeff_first:  run=0, level=1
//    for dc_coeff_next:   If the next bit is 1: run=0, level=1
//                         If the next bit is 0: end_of_block

//  escape decodes as 0xffff.

MPEG1.DCT_COEFF = new Int32Array([
	  1*3,   2*3,      0,  //   0
	  4*3,   3*3,      0,  //   1  0
	    0,     0, 0x0001,  //   2  1.
	  7*3,   8*3,      0,  //   3  01
	  6*3,   5*3,      0,  //   4  00
	 13*3,   9*3,      0,  //   5  001
	 11*3,  10*3,      0,  //   6  000
	 14*3,  12*3,      0,  //   7  010
	    0,     0, 0x0101,  //   8  011.
	 20*3,  22*3,      0,  //   9  0011
	 18*3,  21*3,      0,  //  10  0001
	 16*3,  19*3,      0,  //  11  0000
	    0,     0, 0x0201,  //  12  0101.
	 17*3,  15*3,      0,  //  13  0010
	    0,     0, 0x0002,  //  14  0100.
	    0,     0, 0x0003,  //  15  0010 1.
	 27*3,  25*3,      0,  //  16  0000 0
	 29*3,  31*3,      0,  //  17  0010 0
	 24*3,  26*3,      0,  //  18  0001 0
	 32*3,  30*3,      0,  //  19  0000 1
	    0,     0, 0x0401,  //  20  0011 0.
	 23*3,  28*3,      0,  //  21  0001 1
	    0,     0, 0x0301,  //  22  0011 1.
	    0,     0, 0x0102,  //  23  0001 10.
	    0,     0, 0x0701,  //  24  0001 00.
	    0,     0, 0xffff,  //  25  0000 01. -- escape
	    0,     0, 0x0601,  //  26  0001 01.
	 37*3,  36*3,      0,  //  27  0000 00
	    0,     0, 0x0501,  //  28  0001 11.
	 35*3,  34*3,      0,  //  29  0010 00
	 39*3,  38*3,      0,  //  30  0000 11
	 33*3,  42*3,      0,  //  31  0010 01
	 40*3,  41*3,      0,  //  32  0000 10
	 52*3,  50*3,      0,  //  33  0010 010
	 54*3,  53*3,      0,  //  34  0010 001
	 48*3,  49*3,      0,  //  35  0010 000
	 43*3,  45*3,      0,  //  36  0000 001
	 46*3,  44*3,      0,  //  37  0000 000
	    0,     0, 0x0801,  //  38  0000 111.
	    0,     0, 0x0004,  //  39  0000 110.
	    0,     0, 0x0202,  //  40  0000 100.
	    0,     0, 0x0901,  //  41  0000 101.
	 51*3,  47*3,      0,  //  42  0010 011
	 55*3,  57*3,      0,  //  43  0000 0010
	 60*3,  56*3,      0,  //  44  0000 0001
	 59*3,  58*3,      0,  //  45  0000 0011
	 61*3,  62*3,      0,  //  46  0000 0000
	    0,     0, 0x0a01,  //  47  0010 0111.
	    0,     0, 0x0d01,  //  48  0010 0000.
	    0,     0, 0x0006,  //  49  0010 0001.
	    0,     0, 0x0103,  //  50  0010 0101.
	    0,     0, 0x0005,  //  51  0010 0110.
	    0,     0, 0x0302,  //  52  0010 0100.
	    0,     0, 0x0b01,  //  53  0010 0011.
	    0,     0, 0x0c01,  //  54  0010 0010.
	 76*3,  75*3,      0,  //  55  0000 0010 0
	 67*3,  70*3,      0,  //  56  0000 0001 1
	 73*3,  71*3,      0,  //  57  0000 0010 1
	 78*3,  74*3,      0,  //  58  0000 0011 1
	 72*3,  77*3,      0,  //  59  0000 0011 0
	 69*3,  64*3,      0,  //  60  0000 0001 0
	 68*3,  63*3,      0,  //  61  0000 0000 0
	 66*3,  65*3,      0,  //  62  0000 0000 1
	 81*3,  87*3,      0,  //  63  0000 0000 01
	 91*3,  80*3,      0,  //  64  0000 0001 01
	 82*3,  79*3,      0,  //  65  0000 0000 11
	 83*3,  86*3,      0,  //  66  0000 0000 10
	 93*3,  92*3,      0,  //  67  0000 0001 10
	 84*3,  85*3,      0,  //  68  0000 0000 00
	 90*3,  94*3,      0,  //  69  0000 0001 00
	 88*3,  89*3,      0,  //  70  0000 0001 11
	    0,     0, 0x0203,  //  71  0000 0010 11.
	    0,     0, 0x0104,  //  72  0000 0011 00.
	    0,     0, 0x0007,  //  73  0000 0010 10.
	    0,     0, 0x0402,  //  74  0000 0011 11.
	    0,     0, 0x0502,  //  75  0000 0010 01.
	    0,     0, 0x1001,  //  76  0000 0010 00.
	    0,     0, 0x0f01,  //  77  0000 0011 01.
	    0,     0, 0x0e01,  //  78  0000 0011 10.
	105*3, 107*3,      0,  //  79  0000 0000 111
	111*3, 114*3,      0,  //  80  0000 0001 011
	104*3,  97*3,      0,  //  81  0000 0000 010
	125*3, 119*3,      0,  //  82  0000 0000 110
	 96*3,  98*3,      0,  //  83  0000 0000 100
	   -1, 123*3,      0,  //  84  0000 0000 000
	 95*3, 101*3,      0,  //  85  0000 0000 001
	106*3, 121*3,      0,  //  86  0000 0000 101
	 99*3, 102*3,      0,  //  87  0000 0000 011
	113*3, 103*3,      0,  //  88  0000 0001 110
	112*3, 116*3,      0,  //  89  0000 0001 111
	110*3, 100*3,      0,  //  90  0000 0001 000
	124*3, 115*3,      0,  //  91  0000 0001 010
	117*3, 122*3,      0,  //  92  0000 0001 101
	109*3, 118*3,      0,  //  93  0000 0001 100
	120*3, 108*3,      0,  //  94  0000 0001 001
	127*3, 136*3,      0,  //  95  0000 0000 0010
	139*3, 140*3,      0,  //  96  0000 0000 1000
	130*3, 126*3,      0,  //  97  0000 0000 0101
	145*3, 146*3,      0,  //  98  0000 0000 1001
	128*3, 129*3,      0,  //  99  0000 0000 0110
	    0,     0, 0x0802,  // 100  0000 0001 0001.
	132*3, 134*3,      0,  // 101  0000 0000 0011
	155*3, 154*3,      0,  // 102  0000 0000 0111
	    0,     0, 0x0008,  // 103  0000 0001 1101.
	137*3, 133*3,      0,  // 104  0000 0000 0100
	143*3, 144*3,      0,  // 105  0000 0000 1110
	151*3, 138*3,      0,  // 106  0000 0000 1010
	142*3, 141*3,      0,  // 107  0000 0000 1111
	    0,     0, 0x000a,  // 108  0000 0001 0011.
	    0,     0, 0x0009,  // 109  0000 0001 1000.
	    0,     0, 0x000b,  // 110  0000 0001 0000.
	    0,     0, 0x1501,  // 111  0000 0001 0110.
	    0,     0, 0x0602,  // 112  0000 0001 1110.
	    0,     0, 0x0303,  // 113  0000 0001 1100.
	    0,     0, 0x1401,  // 114  0000 0001 0111.
	    0,     0, 0x0702,  // 115  0000 0001 0101.
	    0,     0, 0x1101,  // 116  0000 0001 1111.
	    0,     0, 0x1201,  // 117  0000 0001 1010.
	    0,     0, 0x1301,  // 118  0000 0001 1001.
	148*3, 152*3,      0,  // 119  0000 0000 1101
	    0,     0, 0x0403,  // 120  0000 0001 0010.
	153*3, 150*3,      0,  // 121  0000 0000 1011
	    0,     0, 0x0105,  // 122  0000 0001 1011.
	131*3, 135*3,      0,  // 123  0000 0000 0001
	    0,     0, 0x0204,  // 124  0000 0001 0100.
	149*3, 147*3,      0,  // 125  0000 0000 1100
	172*3, 173*3,      0,  // 126  0000 0000 0101 1
	162*3, 158*3,      0,  // 127  0000 0000 0010 0
	170*3, 161*3,      0,  // 128  0000 0000 0110 0
	168*3, 166*3,      0,  // 129  0000 0000 0110 1
	157*3, 179*3,      0,  // 130  0000 0000 0101 0
	169*3, 167*3,      0,  // 131  0000 0000 0001 0
	174*3, 171*3,      0,  // 132  0000 0000 0011 0
	178*3, 177*3,      0,  // 133  0000 0000 0100 1
	156*3, 159*3,      0,  // 134  0000 0000 0011 1
	164*3, 165*3,      0,  // 135  0000 0000 0001 1
	183*3, 182*3,      0,  // 136  0000 0000 0010 1
	175*3, 176*3,      0,  // 137  0000 0000 0100 0
	    0,     0, 0x0107,  // 138  0000 0000 1010 1.
	    0,     0, 0x0a02,  // 139  0000 0000 1000 0.
	    0,     0, 0x0902,  // 140  0000 0000 1000 1.
	    0,     0, 0x1601,  // 141  0000 0000 1111 1.
	    0,     0, 0x1701,  // 142  0000 0000 1111 0.
	    0,     0, 0x1901,  // 143  0000 0000 1110 0.
	    0,     0, 0x1801,  // 144  0000 0000 1110 1.
	    0,     0, 0x0503,  // 145  0000 0000 1001 0.
	    0,     0, 0x0304,  // 146  0000 0000 1001 1.
	    0,     0, 0x000d,  // 147  0000 0000 1100 1.
	    0,     0, 0x000c,  // 148  0000 0000 1101 0.
	    0,     0, 0x000e,  // 149  0000 0000 1100 0.
	    0,     0, 0x000f,  // 150  0000 0000 1011 1.
	    0,     0, 0x0205,  // 151  0000 0000 1010 0.
	    0,     0, 0x1a01,  // 152  0000 0000 1101 1.
	    0,     0, 0x0106,  // 153  0000 0000 1011 0.
	180*3, 181*3,      0,  // 154  0000 0000 0111 1
	160*3, 163*3,      0,  // 155  0000 0000 0111 0
	196*3, 199*3,      0,  // 156  0000 0000 0011 10
	    0,     0, 0x001b,  // 157  0000 0000 0101 00.
	203*3, 185*3,      0,  // 158  0000 0000 0010 01
	202*3, 201*3,      0,  // 159  0000 0000 0011 11
	    0,     0, 0x0013,  // 160  0000 0000 0111 00.
	    0,     0, 0x0016,  // 161  0000 0000 0110 01.
	197*3, 207*3,      0,  // 162  0000 0000 0010 00
	    0,     0, 0x0012,  // 163  0000 0000 0111 01.
	191*3, 192*3,      0,  // 164  0000 0000 0001 10
	188*3, 190*3,      0,  // 165  0000 0000 0001 11
	    0,     0, 0x0014,  // 166  0000 0000 0110 11.
	184*3, 194*3,      0,  // 167  0000 0000 0001 01
	    0,     0, 0x0015,  // 168  0000 0000 0110 10.
	186*3, 193*3,      0,  // 169  0000 0000 0001 00
	    0,     0, 0x0017,  // 170  0000 0000 0110 00.
	204*3, 198*3,      0,  // 171  0000 0000 0011 01
	    0,     0, 0x0019,  // 172  0000 0000 0101 10.
	    0,     0, 0x0018,  // 173  0000 0000 0101 11.
	200*3, 205*3,      0,  // 174  0000 0000 0011 00
	    0,     0, 0x001f,  // 175  0000 0000 0100 00.
	    0,     0, 0x001e,  // 176  0000 0000 0100 01.
	    0,     0, 0x001c,  // 177  0000 0000 0100 11.
	    0,     0, 0x001d,  // 178  0000 0000 0100 10.
	    0,     0, 0x001a,  // 179  0000 0000 0101 01.
	    0,     0, 0x0011,  // 180  0000 0000 0111 10.
	    0,     0, 0x0010,  // 181  0000 0000 0111 11.
	189*3, 206*3,      0,  // 182  0000 0000 0010 11
	187*3, 195*3,      0,  // 183  0000 0000 0010 10
	218*3, 211*3,      0,  // 184  0000 0000 0001 010
	    0,     0, 0x0025,  // 185  0000 0000 0010 011.
	215*3, 216*3,      0,  // 186  0000 0000 0001 000
	    0,     0, 0x0024,  // 187  0000 0000 0010 100.
	210*3, 212*3,      0,  // 188  0000 0000 0001 110
	    0,     0, 0x0022,  // 189  0000 0000 0010 110.
	213*3, 209*3,      0,  // 190  0000 0000 0001 111
	221*3, 222*3,      0,  // 191  0000 0000 0001 100
	219*3, 208*3,      0,  // 192  0000 0000 0001 101
	217*3, 214*3,      0,  // 193  0000 0000 0001 001
	223*3, 220*3,      0,  // 194  0000 0000 0001 011
	    0,     0, 0x0023,  // 195  0000 0000 0010 101.
	    0,     0, 0x010b,  // 196  0000 0000 0011 100.
	    0,     0, 0x0028,  // 197  0000 0000 0010 000.
	    0,     0, 0x010c,  // 198  0000 0000 0011 011.
	    0,     0, 0x010a,  // 199  0000 0000 0011 101.
	    0,     0, 0x0020,  // 200  0000 0000 0011 000.
	    0,     0, 0x0108,  // 201  0000 0000 0011 111.
	    0,     0, 0x0109,  // 202  0000 0000 0011 110.
	    0,     0, 0x0026,  // 203  0000 0000 0010 010.
	    0,     0, 0x010d,  // 204  0000 0000 0011 010.
	    0,     0, 0x010e,  // 205  0000 0000 0011 001.
	    0,     0, 0x0021,  // 206  0000 0000 0010 111.
	    0,     0, 0x0027,  // 207  0000 0000 0010 001.
	    0,     0, 0x1f01,  // 208  0000 0000 0001 1011.
	    0,     0, 0x1b01,  // 209  0000 0000 0001 1111.
	    0,     0, 0x1e01,  // 210  0000 0000 0001 1100.
	    0,     0, 0x1002,  // 211  0000 0000 0001 0101.
	    0,     0, 0x1d01,  // 212  0000 0000 0001 1101.
	    0,     0, 0x1c01,  // 213  0000 0000 0001 1110.
	    0,     0, 0x010f,  // 214  0000 0000 0001 0011.
	    0,     0, 0x0112,  // 215  0000 0000 0001 0000.
	    0,     0, 0x0111,  // 216  0000 0000 0001 0001.
	    0,     0, 0x0110,  // 217  0000 0000 0001 0010.
	    0,     0, 0x0603,  // 218  0000 0000 0001 0100.
	    0,     0, 0x0b02,  // 219  0000 0000 0001 1010.
	    0,     0, 0x0e02,  // 220  0000 0000 0001 0111.
	    0,     0, 0x0d02,  // 221  0000 0000 0001 1000.
	    0,     0, 0x0c02,  // 222  0000 0000 0001 1001.
	    0,     0, 0x0f02   // 223  0000 0000 0001 0110.
]);

MPEG1.PICTURE_TYPE = {
	INTRA: 1,
	PREDICTIVE: 2,
	B: 3
};

MPEG1.START = {
	SEQUENCE: 0xB3,
	SLICE_FIRST: 0x01,
	SLICE_LAST: 0xAF,
	PICTURE: 0x00,
	EXTENSION: 0xB5,
	USER_DATA: 0xB2
};

module.exports = MPEG1;


/***/ }),

/***/ "./node_modules/@lixuc/jsmpeg/src/player.js":
/*!**************************************************!*\
  !*** ./node_modules/@lixuc/jsmpeg/src/player.js ***!
  \**************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const JSMpeg = __webpack_require__(/*! ./jsmpeg */ "./node_modules/@lixuc/jsmpeg/src/jsmpeg.js");

var Player = function(url, options) {
	this.options = options || {};

	if (options.source) {
		this.source = new options.source(url, options);
		options.streaming = !!this.source.streaming;
	}
	else if (url.match(/^wss?:\/\//)) {
		this.source = new JSMpeg.Source.WebSocket(url, options);
		options.streaming = true;
	}
	else if (options.progressive !== false) {
		this.source = new JSMpeg.Source.AjaxProgressive(url, options);
		options.streaming = false;
	}
	else {
		this.source = new JSMpeg.Source.Ajax(url, options);
		options.streaming = false;
	}

	this.maxAudioLag = options.maxAudioLag || 0.25;
	this.loop = options.loop !== false;
	this.autoplay = !!options.autoplay || options.streaming;

	this.demuxer = new JSMpeg.Demuxer.TS(options);
	this.source.connect(this.demuxer);

	if (options.video !== false) {
		this.video = new JSMpeg.Decoder.MPEG1Video(options);
		this.renderer = !options.disableGl && JSMpeg.Renderer.WebGL.IsSupported()
			? new JSMpeg.Renderer.WebGL(options)
			: new JSMpeg.Renderer.Canvas2D(options);
		this.demuxer.connect(JSMpeg.Demuxer.TS.STREAM.VIDEO_1, this.video);
		this.video.connect(this.renderer);
	}

	if (options.audio !== false && JSMpeg.AudioOutput.WebAudio.IsSupported()) {
		this.audio = new JSMpeg.Decoder.MP2Audio(options);
		this.audioOut = new JSMpeg.AudioOutput.WebAudio(options);
		this.demuxer.connect(JSMpeg.Demuxer.TS.STREAM.AUDIO_1, this.audio);
		this.audio.connect(this.audioOut);
	}

	Object.defineProperty(this, 'currentTime', {
		get: this.getCurrentTime,
		set: this.setCurrentTime
	});
	Object.defineProperty(this, 'volume', {
		get: this.getVolume,
		set: this.setVolume
	});

	this.unpauseOnShow = false;
	if (options.pauseWhenHidden !== false) {
		document.addEventListener('visibilitychange', this.showHide.bind(this));
	}

	this.source.start();

	if (this.autoplay) {
		this.play();
	}
};

Player.prototype.showHide = function(ev) {
	if (document.visibilityState === 'hidden') {
		this.unpauseOnShow = this.wantsToPlay;
		this.pause();
	}
	else if (this.unpauseOnShow) {
		this.play();
	}
};

Player.prototype.play = function(ev) {
	this.animationId = requestAnimationFrame(this.update.bind(this));
	this.wantsToPlay = true;
};

Player.prototype.pause = function(ev) {
	cancelAnimationFrame(this.animationId);
	this.wantsToPlay = false;
	this.isPlaying = false;

	if (this.audio && this.audio.canPlay) {
		// Seek to the currentTime again - audio may already be enqueued a bit
		// further, so we have to rewind it.
		this.audioOut.stop();
		this.seek(this.currentTime);
	}
};

Player.prototype.getVolume = function() {
	return this.audioOut ? this.audioOut.volume : 0;
};

Player.prototype.setVolume = function(volume) {
	if (this.audioOut) {
		this.audioOut.volume = volume;
	}
};

Player.prototype.stop = function(ev) {
	this.pause();
	this.seek(0);
	if (this.video && this.options.decodeFirstFrame !== false) {
		this.video.decode();
	}
};

Player.prototype.destroy = function() {
	this.pause();
	if (this.source) this.source.destroy();
	if (this.renderer) this.renderer.destroy();
	if (this.audioOut) this.audioOut.destroy();
};

Player.prototype.seek = function(time) {
	var startOffset = this.audio && this.audio.canPlay
		? this.audio.startTime
		: this.video.startTime;

	if (this.video) {
		this.video.seek(time + startOffset);
	}
	if (this.audio) {
		this.audio.seek(time + startOffset);
	}

	this.startTime = JSMpeg.Now() - time;
};

Player.prototype.getCurrentTime = function() {
	return this.audio && this.audio.canPlay
		? this.audio.currentTime - this.audio.startTime
		: this.video.currentTime - this.video.startTime;
};

Player.prototype.setCurrentTime = function(time) {
	this.seek(time);
};

Player.prototype.update = function() {
	this.animationId = requestAnimationFrame(this.update.bind(this));

	if (!this.source.established) {
		if (this.renderer) {
			this.renderer.renderProgress(this.source.progress);
		}
		return;
	}

	if (!this.isPlaying) {
		this.isPlaying = true;
		this.startTime = JSMpeg.Now() - this.currentTime;
	}

	if (this.options.streaming) {
		this.updateForStreaming();
	}
	else {
		this.updateForStaticFile();
	}
};

Player.prototype.updateForStreaming = function() {
	// When streaming, immediately decode everything we have buffered up until
	// now to minimize playback latency.

	if (this.video) {
		this.video.decode();
	}

	if (this.audio) {
		var decoded = false;
		do {
			// If there's a lot of audio enqueued already, disable output and
			// catch up with the encoding.
			if (this.audioOut.enqueuedTime > this.maxAudioLag) {
				this.audioOut.resetEnqueuedTime();
				this.audioOut.enabled = false;
			}
			decoded = this.audio.decode();
		} while (decoded);
		this.audioOut.enabled = true;
	}
};

Player.prototype.updateForStaticFile = function() {
	var notEnoughData = false,
		headroom = 0;

	// If we have an audio track, we always try to sync the video to the audio.
	// Gaps and discontinuities are far more percetable in audio than in video.

	if (this.audio && this.audio.canPlay) {
		// Do we have to decode and enqueue some more audio data?
		while (
			!notEnoughData &&
			this.audio.decodedTime - this.audio.currentTime < 0.25
		) {
			notEnoughData = !this.audio.decode();
		}

		// Sync video to audio
		if (this.video && this.video.currentTime < this.audio.currentTime) {
			notEnoughData = !this.video.decode();
		}

		headroom = this.demuxer.currentTime - this.audio.currentTime;
	}


	else if (this.video) {
		// Video only - sync it to player's wallclock
		var targetTime = (JSMpeg.Now() - this.startTime) + this.video.startTime,
			lateTime = targetTime - this.video.currentTime,
			frameTime = 1/this.video.frameRate;

		if (this.video && lateTime > 0) {
			// If the video is too far behind (>2 frames), simply reset the
			// target time to the next frame instead of trying to catch up.
			if (lateTime > frameTime * 2) {
				this.startTime += lateTime;
			}

			notEnoughData = !this.video.decode();
		}

		headroom = this.demuxer.currentTime - targetTime;
	}

	// Notify the source of the playhead headroom, so it can decide whether to
	// continue loading further data.
	this.source.resume(headroom);

	// If we failed to decode and the source is complete, it means we reached
	// the end of our data. We may want to loop.
	if (notEnoughData && this.source.completed) {
		if (this.loop) {
			this.seek(0);
		}
		else {
			this.pause();
		}
	}
};

module.exports = Player;


/***/ }),

/***/ "./node_modules/@lixuc/jsmpeg/src/ts.js":
/*!**********************************************!*\
  !*** ./node_modules/@lixuc/jsmpeg/src/ts.js ***!
  \**********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const JSMpeg = __webpack_require__(/*! ./jsmpeg */ "./node_modules/@lixuc/jsmpeg/src/jsmpeg.js");

var TS = function(options) {
	this.bits = null;
	this.leftoverBytes = null;

	this.guessVideoFrameEnd = true;
	this.pidsToStreamIds = {};

	this.pesPacketInfo = {};
	this.startTime = 0;
	this.currentTime = 0;
};

TS.prototype.connect = function(streamId, destination) {
	this.pesPacketInfo[streamId] = {
		destination: destination,
		currentLength: 0,
		totalLength: 0,
		pts: 0,
		buffers: []
	};
};

TS.prototype.write = function(buffer) {
	if (this.leftoverBytes) {
		var totalLength = buffer.byteLength + this.leftoverBytes.byteLength;
		this.bits = new JSMpeg.BitBuffer(totalLength);
		this.bits.write([this.leftoverBytes, buffer]);
	}
	else {
		this.bits = new JSMpeg.BitBuffer(buffer);
	}

	while (this.bits.has(188 << 3) && this.parsePacket()) {}

	var leftoverCount = this.bits.byteLength - (this.bits.index >> 3);
	this.leftoverBytes = leftoverCount > 0
		? this.bits.bytes.subarray(this.bits.index >> 3)
		: null;
};

TS.prototype.parsePacket = function() {
	// Check if we're in sync with packet boundaries; attempt to resync if not.
	if (this.bits.read(8) !== 0x47) {
		if (!this.resync()) {
			// Couldn't resync; maybe next time...
			return false;
		}
	}

	var end = (this.bits.index >> 3) + 187;
	var transportError = this.bits.read(1),
		payloadStart = this.bits.read(1),
		transportPriority = this.bits.read(1),
		pid = this.bits.read(13),
		transportScrambling = this.bits.read(2),
		adaptationField = this.bits.read(2),
		continuityCounter = this.bits.read(4);


	// If this is the start of a new payload; signal the end of the previous
	// frame, if we didn't do so already.
	var streamId = this.pidsToStreamIds[pid];
	if (payloadStart && streamId) {
		var pi = this.pesPacketInfo[streamId];
		if (pi && pi.currentLength) {
			this.packetComplete(pi);
		}
	}

	// Extract current payload
	if (adaptationField & 0x1) {
		if ((adaptationField & 0x2)) {
			var adaptationFieldLength = this.bits.read(8);
			this.bits.skip(adaptationFieldLength << 3);
		}

		if (payloadStart && this.bits.nextBytesAreStartCode()) {
			this.bits.skip(24);
			streamId = this.bits.read(8);
			this.pidsToStreamIds[pid] = streamId;

			var packetLength = this.bits.read(16)
			this.bits.skip(8);
			var ptsDtsFlag = this.bits.read(2);
			this.bits.skip(6);
			var headerLength = this.bits.read(8);
			var payloadBeginIndex = this.bits.index + (headerLength << 3);

			var pi = this.pesPacketInfo[streamId];
			if (pi) {
				var pts = 0;
				if (ptsDtsFlag & 0x2) {
					// The Presentation Timestamp is encoded as 33(!) bit
					// integer, but has a "marker bit" inserted at weird places
					// in between, making the whole thing 5 bytes in size.
					// You can't make this shit up...
					this.bits.skip(4);
					var p32_30 = this.bits.read(3);
					this.bits.skip(1);
					var p29_15 = this.bits.read(15);
					this.bits.skip(1);
					var p14_0 = this.bits.read(15);
					this.bits.skip(1);

					// Can't use bit shifts here; we need 33 bits of precision,
					// so we're using JavaScript's double number type. Also
					// divide by the 90khz clock to get the pts in seconds.
					pts = (p32_30 * 1073741824 + p29_15 * 32768 + p14_0)/90000;

					this.currentTime = pts;
					if (this.startTime === -1) {
						this.startTime = pts;
					}
				}

				var payloadLength = packetLength
					? packetLength - headerLength - 3
					: 0;
				this.packetStart(pi, pts, payloadLength);
			}

			// Skip the rest of the header without parsing it
			this.bits.index = payloadBeginIndex;
		}

		if (streamId) {
			// Attempt to detect if the PES packet is complete. For Audio (and
			// other) packets, we received a total packet length with the PES
			// header, so we can check the current length.

			// For Video packets, we have to guess the end by detecting if this
			// TS packet was padded - there's no good reason to pad a TS packet
			// in between, but it might just fit exactly. If this fails, we can
			// only wait for the next PES header for that stream.

			var pi = this.pesPacketInfo[streamId];
			if (pi) {
				var start = this.bits.index >> 3;
				var complete = this.packetAddData(pi, start, end);

				var hasPadding = !payloadStart && (adaptationField & 0x2);
				if (complete || (this.guessVideoFrameEnd && hasPadding)) {
					this.packetComplete(pi);
				}
			}
		}
	}

	this.bits.index = end << 3;
	return true;
};

TS.prototype.resync = function() {
	// Check if we have enough data to attempt a resync. We need 5 full packets.
	if (!this.bits.has((188 * 6) << 3)) {
		return false;
	}

	var byteIndex = this.bits.index >> 3;

	// Look for the first sync token in the first 187 bytes
	for (var i = 0; i < 187; i++) {
		if (this.bits.bytes[byteIndex + i] === 0x47) {

			// Look for 4 more sync tokens, each 188 bytes appart
			var foundSync = true;
			for (var j = 1; j < 5; j++) {
				if (this.bits.bytes[byteIndex + i + 188 * j] !== 0x47) {
					foundSync = false;
					break;
				}
			}

			if (foundSync) {
				this.bits.index = (byteIndex + i + 1) << 3;
				return true;
			}
		}
	}

	// In theory, we shouldn't arrive here. If we do, we had enough data but
	// still didn't find sync - this can only happen if we were fed garbage
	// data. Check your source!
	console.warn('JSMpeg: Possible garbage data. Skipping.');
	this.bits.skip(187 << 3);
	return false;
};

TS.prototype.packetStart = function(pi, pts, payloadLength) {
	pi.totalLength = payloadLength;
	pi.currentLength = 0;
	pi.pts = pts;
};

TS.prototype.packetAddData = function(pi, start, end) {
	pi.buffers.push(this.bits.bytes.subarray(start, end));
	pi.currentLength += end - start;

	var complete = (pi.totalLength !== 0 && pi.currentLength >= pi.totalLength);
	return complete;
};

TS.prototype.packetComplete = function(pi) {
	pi.destination.write(pi.pts, pi.buffers);
	pi.totalLength = 0;
	pi.currentLength = 0;
	pi.buffers = [];
};

TS.STREAM = {
	PACK_HEADER: 0xBA,
	SYSTEM_HEADER: 0xBB,
	PROGRAM_MAP: 0xBC,
	PRIVATE_1: 0xBD,
	PADDING: 0xBE,
	PRIVATE_2: 0xBF,
	AUDIO_1: 0xC0,
	VIDEO_1: 0xE0,
	DIRECTORY: 0xFF
};

module.exports = TS;


/***/ }),

/***/ "./node_modules/@lixuc/jsmpeg/src/video-element.js":
/*!*********************************************************!*\
  !*** ./node_modules/@lixuc/jsmpeg/src/video-element.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const JSMpeg = __webpack_require__(/*! ./jsmpeg */ "./node_modules/@lixuc/jsmpeg/src/jsmpeg.js");

var VideoElement = function(element) {
	var url = element.dataset.url;

	if (!url) {
		throw ("VideoElement has no `data-url` attribute");
	}

	// Setup the div container, canvas and play button
	var addStyles = function(element, styles) {
		for (var name in styles) {
			element.style[name] = styles[name];
		}
	};

	this.container = element;
	addStyles(this.container, {
		display: 'inline-block',
		position: 'relative',
		minWidth: '80px', minHeight: '80px'
	});

	this.canvas = document.createElement('canvas');
	this.canvas.width = 960;
	this.canvas.height = 540;
	addStyles(this.canvas, {
		display: 'block',
		width: '100%'
	});
	this.container.appendChild(this.canvas);

	this.playButton = document.createElement('div');
	this.playButton.innerHTML = VideoElement.PLAY_BUTTON;
	addStyles(this.playButton, {
		zIndex: 2, position: 'absolute',
		top: '0', bottom: '0', left: '0', right: '0',
		maxWidth: '75px', maxHeight: '75px',
		margin: 'auto',
		opacity: '0.7',
		cursor: 'pointer'
	});
	this.container.appendChild(this.playButton);

	// Parse the data-options - we try to decode the values as json. This way
	// we can get proper boolean and number values. If JSON.parse() fails,
	// treat it as a string.
	var options = {canvas: this.canvas};
	for (var option in element.dataset) {
		try {
			options[option] = JSON.parse(element.dataset[option]);
		}
		catch(err) {
			options[option] = element.dataset[option];
		}
	}

	// Create the player instance
	this.player = new JSMpeg.Player(url, options);
	element.playerInstance = this.player;

	// Setup the poster element, if any
	if (options.poster && !options.autoplay && !this.player.options.streaming) {
		options.decodeFirstFrame = false;
		this.poster = new Image();
		this.poster.src = options.poster;
		this.poster.addEventListener('load', this.posterLoaded)
		addStyles(this.poster, {
			display: 'block', zIndex: 1, position: 'absolute',
			top: 0, left: 0, bottom: 0, right: 0
		});
		this.container.appendChild(this.poster);
	}

	// Add the click handler if this video is pausable
	if (!this.player.options.streaming) {
		this.container.addEventListener('click', this.onClick.bind(this));
	}

	// Hide the play button if this video immediately begins playing
	if (options.autoplay || this.player.options.streaming) {
		this.playButton.style.display = 'none';
	}

	// Set up the unlock audio buton for iOS devices. iOS only allows us to
	// play audio after a user action has initiated playing. For autoplay or
	// streaming players we set up a muted speaker icon as the button. For all
	// others, we can simply use the play button.
	if (this.player.audioOut && !this.player.audioOut.unlocked) {
		var unlockAudioElement = this.container;

		if (options.autoplay || this.player.options.streaming) {
			this.unmuteButton = document.createElement('div');
			this.unmuteButton.innerHTML = VideoElement.UNMUTE_BUTTON;
			addStyles(this.unmuteButton, {
				zIndex: 2, position: 'absolute',
				bottom: '10px', right: '20px',
				width: '75px', height: '75px',
				margin: 'auto',
				opacity: '0.7',
				cursor: 'pointer'
			});
			this.container.appendChild(this.unmuteButton);
			unlockAudioElement = this.unmuteButton;
		}

		this.unlockAudioBound = this.onUnlockAudio.bind(this, unlockAudioElement);
		unlockAudioElement.addEventListener('touchstart', this.unlockAudioBound, false);
		unlockAudioElement.addEventListener('click', this.unlockAudioBound, true);
	}
};

VideoElement.prototype.onUnlockAudio = function(element, ev) {
	if (this.unmuteButton) {
		ev.preventDefault();
		ev.stopPropagation();
	}
	this.player.audioOut.unlock(function(){
		if (this.unmuteButton) {
			this.unmuteButton.style.display = 'none';
		}
		element.removeEventListener('touchstart', this.unlockAudioBound);
		element.removeEventListener('click', this.unlockAudioBound);
	}.bind(this));
};

VideoElement.prototype.onClick = function(ev) {
	if (this.player.isPlaying) {
		this.player.pause();
		this.playButton.style.display = 'block';
	}
	else {
		this.player.play();
		this.playButton.style.display = 'none';
		if (this.poster) {
			this.poster.style.display = 'none';
		}
	}
};

VideoElement.PLAY_BUTTON =
	'<svg style="max-width: 75px; max-height: 75px;" ' +
		'viewBox="0 0 200 200" alt="Play video">' +
		'<circle cx="100" cy="100" r="90" fill="none" '+
			'stroke-width="15" stroke="#fff"/>' +
		'<polygon points="70, 55 70, 145 145, 100" fill="#fff"/>' +
	'</svg>';

VideoElement.UNMUTE_BUTTON =
	'<svg style="max-width: 75px; max-height: 75px;" viewBox="0 0 75 75">' +
		'<polygon class="audio-speaker" stroke="none" fill="#fff" '+
			'points="39,13 22,28 6,28 6,47 21,47 39,62 39,13"/>' +
		'<g stroke="#fff" stroke-width="5">' +
			'<path d="M 49,50 69,26"/>' +
			'<path d="M 69,50 49,26"/>' +
		'</g>' +
	'</svg>';

module.exports = VideoElement;


/***/ }),

/***/ "./node_modules/@lixuc/jsmpeg/src/webaudio.js":
/*!****************************************************!*\
  !*** ./node_modules/@lixuc/jsmpeg/src/webaudio.js ***!
  \****************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const JSMpeg = __webpack_require__(/*! ./jsmpeg */ "./node_modules/@lixuc/jsmpeg/src/jsmpeg.js");

var WebAudioOut = function(options) {
	this.context = WebAudioOut.CachedContext =
		WebAudioOut.CachedContext ||
		new (window.AudioContext || window.webkitAudioContext)();

	this.gain = this.context.createGain();
	this.destination = this.gain;

	// Keep track of the number of connections to this AudioContext, so we
	// can safely close() it when we're the only one connected to it.
	this.gain.connect(this.context.destination);
	this.context._connections = (this.context._connections || 0) + 1;

	this.startTime = 0;
	this.buffer = null;
	this.wallclockStartTime = 0;
	this.volume = 1;
	this.enabled = true;

	this.unlocked = !WebAudioOut.NeedsUnlocking();

	Object.defineProperty(this, 'enqueuedTime', {get: this.getEnqueuedTime});
};

WebAudioOut.prototype.destroy = function() {
	this.gain.disconnect();
	this.context._connections--;

	if (this.context._connections === 0) {
		this.context.close();
		WebAudioOut.CachedContext = null;
	}
};

WebAudioOut.prototype.play = function(sampleRate, left, right) {
	if (!this.enabled) {
		return;
	}

	// If the context is not unlocked yet, we simply advance the start time
	// to "fake" actually playing audio. This will keep the video in sync.
	if (!this.unlocked) {
		var ts = JSMpeg.Now()
		if (this.wallclockStartTime < ts) {
			this.wallclockStartTime = ts;
		}
		this.wallclockStartTime += left.length / sampleRate;
		return;
	}


	this.gain.gain.value = this.volume;

	var buffer = this.context.createBuffer(2, left.length, sampleRate);
	buffer.getChannelData(0).set(left);
	buffer.getChannelData(1).set(right);

	var source = this.context.createBufferSource();
	source.buffer = buffer;
	source.connect(this.destination);

	var now = this.context.currentTime;
	var duration = buffer.duration;
	if (this.startTime < now) {
		this.startTime = now;
		this.wallclockStartTime = JSMpeg.Now();
	}

	source.start(this.startTime);
	this.startTime += duration;
	this.wallclockStartTime += duration;
};

WebAudioOut.prototype.stop = function() {
	// Meh; there seems to be no simple way to get a list of currently
	// active source nodes from the Audio Context, and maintaining this
	// list ourselfs would be a pain, so we just set the gain to 0
	// to cut off all enqueued audio instantly.
	this.gain.gain.value = 0;
};

WebAudioOut.prototype.getEnqueuedTime = function() {
	// The AudioContext.currentTime is only updated every so often, so if we
	// want to get exact timing, we need to rely on the system time.
	return Math.max(this.wallclockStartTime - JSMpeg.Now(), 0)
};

WebAudioOut.prototype.resetEnqueuedTime = function() {
	this.startTime = this.context.currentTime;
	this.wallclockStartTime = JSMpeg.Now();
};

WebAudioOut.prototype.unlock = function(callback) {
	if (this.unlocked) {
		if (callback) {
			callback();
		}
		return;
	}

	this.unlockCallback = callback;

	// Create empty buffer and play it
	var buffer = this.context.createBuffer(1, 1, 22050);
	var source = this.context.createBufferSource();
	source.buffer = buffer;
	source.connect(this.destination);
	source.start(0);

	setTimeout(this.checkIfUnlocked.bind(this, source, 0), 0);
};

WebAudioOut.prototype.checkIfUnlocked = function(source, attempt) {
	if (
		source.playbackState === source.PLAYING_STATE ||
		source.playbackState === source.FINISHED_STATE
	) {
		this.unlocked = true;
		if (this.unlockCallback) {
			this.unlockCallback();
			this.unlockCallback = null;
		}
	}
	else if (attempt < 10) {
		// Jeez, what a shit show. Thanks iOS!
		setTimeout(this.checkIfUnlocked.bind(this, source, attempt+1), 100);
	}
};

WebAudioOut.NeedsUnlocking = function() {
	return /iPhone|iPad|iPod/i.test(navigator.userAgent);
};

WebAudioOut.IsSupported = function() {
	return (window.AudioContext || window.webkitAudioContext);
};

WebAudioOut.CachedContext = null;

module.exports = WebAudioOut;


/***/ }),

/***/ "./node_modules/@lixuc/jsmpeg/src/webgl.js":
/*!*************************************************!*\
  !*** ./node_modules/@lixuc/jsmpeg/src/webgl.js ***!
  \*************************************************/
/***/ ((module) => {

var WebGLRenderer = function(options) {
	this.canvas = options.canvas || document.createElement('canvas');
	this.width = this.canvas.width;
	this.height = this.canvas.height;
	this.enabled = true;

	var contextCreateOptions = {
		preserveDrawingBuffer: !!options.preserveDrawingBuffer,
		alpha: false,
		depth: false,
		stencil: false,
		antialias: false
	};

	this.gl =
		this.canvas.getContext('webgl', contextCreateOptions) ||
		this.canvas.getContext('experimental-webgl', contextCreateOptions);

	if (!this.gl) {
		throw new Error('Failed to get WebGL Context');
	}

	var gl = this.gl;
	var vertexAttr = null;

	// Init buffers
	this.vertexBuffer = gl.createBuffer();
	var vertexCoords = new Float32Array([0, 0, 0, 1, 1, 0, 1, 1]);
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, vertexCoords, gl.STATIC_DRAW);

	// Setup the main YCrCbToRGBA shader
	this.program = this.createProgram(
		WebGLRenderer.SHADER.VERTEX_IDENTITY,
		WebGLRenderer.SHADER.FRAGMENT_YCRCB_TO_RGBA
	);
	vertexAttr = gl.getAttribLocation(this.program, 'vertex');
	gl.enableVertexAttribArray(vertexAttr);
	gl.vertexAttribPointer(vertexAttr, 2, gl.FLOAT, false, 0, 0);

	this.textureY = this.createTexture(0, 'textureY');
	this.textureCb = this.createTexture(1, 'textureCb');
	this.textureCr = this.createTexture(2, 'textureCr');


	// Setup the loading animation shader
	this.loadingProgram = this.createProgram(
		WebGLRenderer.SHADER.VERTEX_IDENTITY,
		WebGLRenderer.SHADER.FRAGMENT_LOADING
	);
	vertexAttr = gl.getAttribLocation(this.loadingProgram, 'vertex');
	gl.enableVertexAttribArray(vertexAttr);
	gl.vertexAttribPointer(vertexAttr, 2, gl.FLOAT, false, 0, 0);

	this.shouldCreateUnclampedViews = !this.allowsClampedTextureData();
};

WebGLRenderer.prototype.destroy = function() {
	var gl = this.gl;

	gl.deleteTexture(this.textureY);
	gl.deleteTexture(this.textureCb);
	gl.deleteTexture(this.textureCr);

	gl.deleteProgram(this.program);
	gl.deleteProgram(this.loadingProgram);

	gl.deleteBuffer(this.vertexBuffer);
};

WebGLRenderer.prototype.resize = function(width, height) {
	this.width = width|0;
	this.height = height|0;

	this.canvas.width = this.width;
	this.canvas.height = this.height;

	this.gl.useProgram(this.program);
	this.gl.viewport(0, 0, this.width, this.height);
};

WebGLRenderer.prototype.createTexture = function(index, name) {
	var gl = this.gl;
	var texture = gl.createTexture();

	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.uniform1i(gl.getUniformLocation(this.program, name), index);

	return texture;
};

WebGLRenderer.prototype.createProgram = function(vsh, fsh) {
	var gl = this.gl;
	var program = gl.createProgram();

	gl.attachShader(program, this.compileShader(gl.VERTEX_SHADER, vsh));
	gl.attachShader(program, this.compileShader(gl.FRAGMENT_SHADER, fsh));
	gl.linkProgram(program);
	gl.useProgram(program);

	return program;
};

WebGLRenderer.prototype.compileShader = function(type, source) {
	var gl = this.gl;
	var shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		throw new Error(gl.getShaderInfoLog(shader));
	}

	return shader;
};

WebGLRenderer.prototype.allowsClampedTextureData = function() {
	var gl = this.gl;
	var texture = gl.createTexture();

	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(
		gl.TEXTURE_2D, 0, gl.LUMINANCE, 1, 1, 0,
		gl.LUMINANCE, gl.UNSIGNED_BYTE, new Uint8ClampedArray([0])
	);
	return (gl.getError() === 0);
};

WebGLRenderer.prototype.renderProgress = function(progress) {
	var gl = this.gl;

	gl.useProgram(this.loadingProgram);

	var loc = gl.getUniformLocation(this.loadingProgram, 'progress');
	gl.uniform1f(loc, progress);

	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};

WebGLRenderer.prototype.render = function(y, cb, cr) {
	if (!this.enabled) {
		return;
	}

	var gl = this.gl;
	var w = ((this.width + 15) >> 4) << 4,
		h = this.height,
		w2 = w >> 1,
		h2 = h >> 1;

	// In some browsers WebGL doesn't like Uint8ClampedArrays (this is a bug
	// and should be fixed soon-ish), so we have to create a Uint8Array view
	// for each plane.
	if (this.shouldCreateUnclampedViews) {
		y = new Uint8Array(y.buffer),
		cb = new Uint8Array(cb.buffer),
		cr = new Uint8Array(cr.buffer);
	}

	gl.useProgram(this.program);

	this.updateTexture(gl.TEXTURE0, this.textureY, w, h, y);
	this.updateTexture(gl.TEXTURE1, this.textureCb, w2, h2, cb);
	this.updateTexture(gl.TEXTURE2, this.textureCr, w2, h2, cr);

	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};

WebGLRenderer.prototype.updateTexture = function(unit, texture, w, h, data) {
	var gl = this.gl;
	gl.activeTexture(unit);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(
		gl.TEXTURE_2D, 0, gl.LUMINANCE, w, h, 0,
		gl.LUMINANCE, gl.UNSIGNED_BYTE, data
	);
}

WebGLRenderer.IsSupported = function() {
	try {
		if (!window.WebGLRenderingContext) {
			return false;
		}

		var canvas = document.createElement('canvas');
		return !!(
			canvas.getContext('webgl') ||
			canvas.getContext('experimental-webgl')
		);
	}
	catch (err) {
		return false;
	}
};

WebGLRenderer.SHADER = {
	FRAGMENT_YCRCB_TO_RGBA: [
		'precision mediump float;',
		'uniform sampler2D textureY;',
		'uniform sampler2D textureCb;',
		'uniform sampler2D textureCr;',
		'varying vec2 texCoord;',

		'mat4 rec601 = mat4(',
			'1.16438,  0.00000,  1.59603, -0.87079,',
			'1.16438, -0.39176, -0.81297,  0.52959,',
			'1.16438,  2.01723,  0.00000, -1.08139,',
			'0, 0, 0, 1',
		');',

		'void main() {',
			'float y = texture2D(textureY, texCoord).r;',
			'float cb = texture2D(textureCb, texCoord).r;',
			'float cr = texture2D(textureCr, texCoord).r;',

			'gl_FragColor = vec4(y, cr, cb, 1.0) * rec601;',
		'}'
	].join('\n'),

	FRAGMENT_LOADING: [
		'precision mediump float;',
		'uniform float progress;',
		'varying vec2 texCoord;',

		'void main() {',
			'float c = ceil(progress-(1.0-texCoord.y));',
			'gl_FragColor = vec4(c,c,c,1);',
		'}'
	].join('\n'),

	VERTEX_IDENTITY: [
		'attribute vec2 vertex;',
		'varying vec2 texCoord;',

		'void main() {',
			'texCoord = vertex;',
			'gl_Position = vec4((vertex * 2.0 - 1.0) * vec2(1, -1), 0.0, 1.0);',
		'}'
	].join('\n')
};

module.exports = WebGLRenderer;


/***/ }),

/***/ "./node_modules/@lixuc/jsmpeg/src/websocket.js":
/*!*****************************************************!*\
  !*** ./node_modules/@lixuc/jsmpeg/src/websocket.js ***!
  \*****************************************************/
/***/ ((module) => {

var WSSource = function(url, options) {
	this.url = url;
	this.options = options;
	this.socket = null;

	this.callbacks = {connect: [], data: []};
	this.destination = null;

	this.reconnectInterval = options.reconnectInterval !== undefined
		? options.reconnectInterval
		: 5;
	this.shouldAttemptReconnect = !!this.reconnectInterval;

	this.completed = false;
	this.established = false;
	this.progress = 0;

	this.reconnectTimeoutId = 0;
};

WSSource.prototype.connect = function(destination) {
	this.destination = destination;
};

WSSource.prototype.destroy = function() {
	clearTimeout(this.reconnectTimeoutId);
	this.shouldAttemptReconnect = false;
	this.socket.close();
};

WSSource.prototype.start = function() {
	this.shouldAttemptReconnect = !!this.reconnectInterval;
	this.progress = 0;
	this.established = false;

	this.socket = new WebSocket(this.url, this.options.protocols || null);
	this.socket.binaryType = 'arraybuffer';
	this.socket.onmessage = this.onMessage.bind(this);
	this.socket.onopen = this.onOpen.bind(this);
	this.socket.onerror = this.onClose.bind(this);
	this.socket.onclose = this.onClose.bind(this);
};

WSSource.prototype.resume = function(secondsHeadroom) {
	// Nothing to do here
};

WSSource.prototype.onOpen = function() {
	this.progress = 1;
	this.established = true;
};

WSSource.prototype.onClose = function() {
	if (this.shouldAttemptReconnect) {
		clearTimeout(this.reconnectTimeoutId);
		this.reconnectTimeoutId = setTimeout(function(){
			this.start();
		}.bind(this), this.reconnectInterval*1000);
	}
};

WSSource.prototype.onMessage = function(ev) {
	if (this.destination) {
		this.destination.write(ev.data);
	}
};

module.exports = WSSource;


/***/ }),

/***/ "./src/common/view/career.pug":
/*!************************************!*\
  !*** ./src/common/view/career.pug ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "career.html");

/***/ }),

/***/ "./src/common/view/dog-boarding.pug":
/*!******************************************!*\
  !*** ./src/common/view/dog-boarding.pug ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "dog-boarding.html");

/***/ }),

/***/ "./src/common/view/dog-daycare.pug":
/*!*****************************************!*\
  !*** ./src/common/view/dog-daycare.pug ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "dog-daycare.html");

/***/ }),

/***/ "./src/common/view/dog-grooming.pug":
/*!******************************************!*\
  !*** ./src/common/view/dog-grooming.pug ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "dog-grooming.html");

/***/ }),

/***/ "./src/common/view/dog-training.pug":
/*!******************************************!*\
  !*** ./src/common/view/dog-training.pug ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "dog-training.html");

/***/ }),

/***/ "./src/common/view/dog-wash.pug":
/*!**************************************!*\
  !*** ./src/common/view/dog-wash.pug ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "dog-wash.html");

/***/ }),

/***/ "./src/common/view/emails/new-account.pug":
/*!************************************************!*\
  !*** ./src/common/view/emails/new-account.pug ***!
  \************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "new-account.html");

/***/ }),

/***/ "./src/common/view/emails/to-company.pug":
/*!***********************************************!*\
  !*** ./src/common/view/emails/to-company.pug ***!
  \***********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "to-company.html");

/***/ }),

/***/ "./src/common/view/http-error.pug":
/*!****************************************!*\
  !*** ./src/common/view/http-error.pug ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "http-error.html");

/***/ }),

/***/ "./src/common/view/index.pug":
/*!***********************************!*\
  !*** ./src/common/view/index.pug ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "index.html");

/***/ }),

/***/ "./src/common/view/job-success.pug":
/*!*****************************************!*\
  !*** ./src/common/view/job-success.pug ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "job-success.html");

/***/ }),

/***/ "./src/common/view/job.pug":
/*!*********************************!*\
  !*** ./src/common/view/job.pug ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "job.html");

/***/ }),

/***/ "./src/common/view/other.pug":
/*!***********************************!*\
  !*** ./src/common/view/other.pug ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "other.html");

/***/ }),

/***/ "./src/common/view/policies.pug":
/*!**************************************!*\
  !*** ./src/common/view/policies.pug ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "policies.html");

/***/ }),

/***/ "./src/common/view/price.pug":
/*!***********************************!*\
  !*** ./src/common/view/price.pug ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "price.html");

/***/ }),

/***/ "./src/common/view/sign-up-success.pug":
/*!*********************************************!*\
  !*** ./src/common/view/sign-up-success.pug ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "sign-up-success.html");

/***/ }),

/***/ "./src/common/view/sign-up.pug":
/*!*************************************!*\
  !*** ./src/common/view/sign-up.pug ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "sign-up.html");

/***/ }),

/***/ "./src/common/view/support.pug":
/*!*************************************!*\
  !*** ./src/common/view/support.pug ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "support.html");

/***/ }),

/***/ "./src/common/view/templates/alert.pug":
/*!*********************************************!*\
  !*** ./src/common/view/templates/alert.pug ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "alert.html");

/***/ }),

/***/ "./src/common/view/templates/basic-requirements.pug":
/*!**********************************************************!*\
  !*** ./src/common/view/templates/basic-requirements.pug ***!
  \**********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "basic-requirements.html");

/***/ }),

/***/ "./src/common/view/templates/boarding-hours.pug":
/*!******************************************************!*\
  !*** ./src/common/view/templates/boarding-hours.pug ***!
  \******************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "boarding-hours.html");

/***/ }),

/***/ "./src/common/view/templates/contact-us.pug":
/*!**************************************************!*\
  !*** ./src/common/view/templates/contact-us.pug ***!
  \**************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "contact-us.html");

/***/ }),

/***/ "./src/common/view/templates/features.pug":
/*!************************************************!*\
  !*** ./src/common/view/templates/features.pug ***!
  \************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "features.html");

/***/ }),

/***/ "./src/common/view/templates/footer.pug":
/*!**********************************************!*\
  !*** ./src/common/view/templates/footer.pug ***!
  \**********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "footer.html");

/***/ }),

/***/ "./src/common/view/templates/gallery.pug":
/*!***********************************************!*\
  !*** ./src/common/view/templates/gallery.pug ***!
  \***********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "gallery.html");

/***/ }),

/***/ "./src/common/view/templates/get-started.pug":
/*!***************************************************!*\
  !*** ./src/common/view/templates/get-started.pug ***!
  \***************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "get-started.html");

/***/ }),

/***/ "./src/common/view/templates/header.pug":
/*!**********************************************!*\
  !*** ./src/common/view/templates/header.pug ***!
  \**********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "header.html");

/***/ }),

/***/ "./src/common/view/templates/holidays.pug":
/*!************************************************!*\
  !*** ./src/common/view/templates/holidays.pug ***!
  \************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "holidays.html");

/***/ }),

/***/ "./src/common/view/templates/hours-of-operation.pug":
/*!**********************************************************!*\
  !*** ./src/common/view/templates/hours-of-operation.pug ***!
  \**********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "hours-of-operation.html");

/***/ }),

/***/ "./src/common/view/templates/nav.pug":
/*!*******************************************!*\
  !*** ./src/common/view/templates/nav.pug ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "nav.html");

/***/ }),

/***/ "./src/common/view/templates/price-nav.pug":
/*!*************************************************!*\
  !*** ./src/common/view/templates/price-nav.pug ***!
  \*************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "price-nav.html");

/***/ }),

/***/ "./src/common/view/templates/price-table.pug":
/*!***************************************************!*\
  !*** ./src/common/view/templates/price-table.pug ***!
  \***************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "price-table.html");

/***/ }),

/***/ "./src/common/view/templates/review.pug":
/*!**********************************************!*\
  !*** ./src/common/view/templates/review.pug ***!
  \**********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "review.html");

/***/ }),

/***/ "./src/common/view/templates/sign-up-module.pug":
/*!******************************************************!*\
  !*** ./src/common/view/templates/sign-up-module.pug ***!
  \******************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "sign-up-module.html");

/***/ }),

/***/ "./src/common/view/tour.pug":
/*!**********************************!*\
  !*** ./src/common/view/tour.pug ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "tour.html");

/***/ }),

/***/ "./src/common/view/verify.pug":
/*!************************************!*\
  !*** ./src/common/view/verify.pug ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "verify.html");

/***/ }),

/***/ "./src/common/view/webcam-login.pug":
/*!******************************************!*\
  !*** ./src/common/view/webcam-login.pug ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "webcam-login.html");

/***/ }),

/***/ "./src/common/view/webcam.pug":
/*!************************************!*\
  !*** ./src/common/view/webcam.pug ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__webpack_require__.p + "webcam.html");

/***/ }),

/***/ "./src/client/scss/main.scss":
/*!***********************************!*\
  !*** ./src/client/scss/main.scss ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
// extracted by mini-css-extract-plugin


/***/ }),

/***/ "./node_modules/photoswipe/dist/photoswipe-ui-default.js":
/*!***************************************************************!*\
  !*** ./node_modules/photoswipe/dist/photoswipe-ui-default.js ***!
  \***************************************************************/
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_RESULT__;/*! PhotoSwipe Default UI - 4.1.3 - 2019-01-08
* http://photoswipe.com
* Copyright (c) 2019 Dmitry Semenov; */
/**
*
* UI on top of main sliding area (caption, arrows, close button, etc.).
* Built just using public methods/properties of PhotoSwipe.
* 
*/
(function (root, factory) { 
	if (true) {
		!(__WEBPACK_AMD_DEFINE_FACTORY__ = (factory),
		__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
		(__WEBPACK_AMD_DEFINE_FACTORY__.call(exports, __webpack_require__, exports, module)) :
		__WEBPACK_AMD_DEFINE_FACTORY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	} else {}
})(this, function () {

	'use strict';



var PhotoSwipeUI_Default =
 function(pswp, framework) {

	var ui = this;
	var _overlayUIUpdated = false,
		_controlsVisible = true,
		_fullscrenAPI,
		_controls,
		_captionContainer,
		_fakeCaptionContainer,
		_indexIndicator,
		_shareButton,
		_shareModal,
		_shareModalHidden = true,
		_initalCloseOnScrollValue,
		_isIdle,
		_listen,

		_loadingIndicator,
		_loadingIndicatorHidden,
		_loadingIndicatorTimeout,

		_galleryHasOneSlide,

		_options,
		_defaultUIOptions = {
			barsSize: {top:44, bottom:'auto'},
			closeElClasses: ['item', 'caption', 'zoom-wrap', 'ui', 'top-bar'], 
			timeToIdle: 4000, 
			timeToIdleOutside: 1000,
			loadingIndicatorDelay: 1000, // 2s
			
			addCaptionHTMLFn: function(item, captionEl /*, isFake */) {
				if(!item.title) {
					captionEl.children[0].innerHTML = '';
					return false;
				}
				captionEl.children[0].innerHTML = item.title;
				return true;
			},

			closeEl:true,
			captionEl: true,
			fullscreenEl: true,
			zoomEl: true,
			shareEl: true,
			counterEl: true,
			arrowEl: true,
			preloaderEl: true,

			tapToClose: false,
			tapToToggleControls: true,

			clickToCloseNonZoomable: true,

			shareButtons: [
				{id:'facebook', label:'Share on Facebook', url:'https://www.facebook.com/sharer/sharer.php?u={{url}}'},
				{id:'twitter', label:'Tweet', url:'https://twitter.com/intent/tweet?text={{text}}&url={{url}}'},
				{id:'pinterest', label:'Pin it', url:'http://www.pinterest.com/pin/create/button/'+
													'?url={{url}}&media={{image_url}}&description={{text}}'},
				{id:'download', label:'Download image', url:'{{raw_image_url}}', download:true}
			],
			getImageURLForShare: function( /* shareButtonData */ ) {
				return pswp.currItem.src || '';
			},
			getPageURLForShare: function( /* shareButtonData */ ) {
				return window.location.href;
			},
			getTextForShare: function( /* shareButtonData */ ) {
				return pswp.currItem.title || '';
			},
				
			indexIndicatorSep: ' / ',
			fitControlsWidth: 1200

		},
		_blockControlsTap,
		_blockControlsTapTimeout;



	var _onControlsTap = function(e) {
			if(_blockControlsTap) {
				return true;
			}


			e = e || window.event;

			if(_options.timeToIdle && _options.mouseUsed && !_isIdle) {
				// reset idle timer
				_onIdleMouseMove();
			}


			var target = e.target || e.srcElement,
				uiElement,
				clickedClass = target.getAttribute('class') || '',
				found;

			for(var i = 0; i < _uiElements.length; i++) {
				uiElement = _uiElements[i];
				if(uiElement.onTap && clickedClass.indexOf('pswp__' + uiElement.name ) > -1 ) {
					uiElement.onTap();
					found = true;

				}
			}

			if(found) {
				if(e.stopPropagation) {
					e.stopPropagation();
				}
				_blockControlsTap = true;

				// Some versions of Android don't prevent ghost click event 
				// when preventDefault() was called on touchstart and/or touchend.
				// 
				// This happens on v4.3, 4.2, 4.1, 
				// older versions strangely work correctly, 
				// but just in case we add delay on all of them)	
				var tapDelay = framework.features.isOldAndroid ? 600 : 30;
				_blockControlsTapTimeout = setTimeout(function() {
					_blockControlsTap = false;
				}, tapDelay);
			}

		},
		_fitControlsInViewport = function() {
			return !pswp.likelyTouchDevice || _options.mouseUsed || screen.width > _options.fitControlsWidth;
		},
		_togglePswpClass = function(el, cName, add) {
			framework[ (add ? 'add' : 'remove') + 'Class' ](el, 'pswp__' + cName);
		},

		// add class when there is just one item in the gallery
		// (by default it hides left/right arrows and 1ofX counter)
		_countNumItems = function() {
			var hasOneSlide = (_options.getNumItemsFn() === 1);

			if(hasOneSlide !== _galleryHasOneSlide) {
				_togglePswpClass(_controls, 'ui--one-slide', hasOneSlide);
				_galleryHasOneSlide = hasOneSlide;
			}
		},
		_toggleShareModalClass = function() {
			_togglePswpClass(_shareModal, 'share-modal--hidden', _shareModalHidden);
		},
		_toggleShareModal = function() {

			_shareModalHidden = !_shareModalHidden;
			
			
			if(!_shareModalHidden) {
				_toggleShareModalClass();
				setTimeout(function() {
					if(!_shareModalHidden) {
						framework.addClass(_shareModal, 'pswp__share-modal--fade-in');
					}
				}, 30);
			} else {
				framework.removeClass(_shareModal, 'pswp__share-modal--fade-in');
				setTimeout(function() {
					if(_shareModalHidden) {
						_toggleShareModalClass();
					}
				}, 300);
			}
			
			if(!_shareModalHidden) {
				_updateShareURLs();
			}
			return false;
		},

		_openWindowPopup = function(e) {
			e = e || window.event;
			var target = e.target || e.srcElement;

			pswp.shout('shareLinkClick', e, target);

			if(!target.href) {
				return false;
			}

			if( target.hasAttribute('download') ) {
				return true;
			}

			window.open(target.href, 'pswp_share', 'scrollbars=yes,resizable=yes,toolbar=no,'+
										'location=yes,width=550,height=420,top=100,left=' + 
										(window.screen ? Math.round(screen.width / 2 - 275) : 100)  );

			if(!_shareModalHidden) {
				_toggleShareModal();
			}
			
			return false;
		},
		_updateShareURLs = function() {
			var shareButtonOut = '',
				shareButtonData,
				shareURL,
				image_url,
				page_url,
				share_text;

			for(var i = 0; i < _options.shareButtons.length; i++) {
				shareButtonData = _options.shareButtons[i];

				image_url = _options.getImageURLForShare(shareButtonData);
				page_url = _options.getPageURLForShare(shareButtonData);
				share_text = _options.getTextForShare(shareButtonData);

				shareURL = shareButtonData.url.replace('{{url}}', encodeURIComponent(page_url) )
									.replace('{{image_url}}', encodeURIComponent(image_url) )
									.replace('{{raw_image_url}}', image_url )
									.replace('{{text}}', encodeURIComponent(share_text) );

				shareButtonOut += '<a href="' + shareURL + '" target="_blank" '+
									'class="pswp__share--' + shareButtonData.id + '"' +
									(shareButtonData.download ? 'download' : '') + '>' + 
									shareButtonData.label + '</a>';

				if(_options.parseShareButtonOut) {
					shareButtonOut = _options.parseShareButtonOut(shareButtonData, shareButtonOut);
				}
			}
			_shareModal.children[0].innerHTML = shareButtonOut;
			_shareModal.children[0].onclick = _openWindowPopup;

		},
		_hasCloseClass = function(target) {
			for(var  i = 0; i < _options.closeElClasses.length; i++) {
				if( framework.hasClass(target, 'pswp__' + _options.closeElClasses[i]) ) {
					return true;
				}
			}
		},
		_idleInterval,
		_idleTimer,
		_idleIncrement = 0,
		_onIdleMouseMove = function() {
			clearTimeout(_idleTimer);
			_idleIncrement = 0;
			if(_isIdle) {
				ui.setIdle(false);
			}
		},
		_onMouseLeaveWindow = function(e) {
			e = e ? e : window.event;
			var from = e.relatedTarget || e.toElement;
			if (!from || from.nodeName === 'HTML') {
				clearTimeout(_idleTimer);
				_idleTimer = setTimeout(function() {
					ui.setIdle(true);
				}, _options.timeToIdleOutside);
			}
		},
		_setupFullscreenAPI = function() {
			if(_options.fullscreenEl && !framework.features.isOldAndroid) {
				if(!_fullscrenAPI) {
					_fullscrenAPI = ui.getFullscreenAPI();
				}
				if(_fullscrenAPI) {
					framework.bind(document, _fullscrenAPI.eventK, ui.updateFullscreen);
					ui.updateFullscreen();
					framework.addClass(pswp.template, 'pswp--supports-fs');
				} else {
					framework.removeClass(pswp.template, 'pswp--supports-fs');
				}
			}
		},
		_setupLoadingIndicator = function() {
			// Setup loading indicator
			if(_options.preloaderEl) {
			
				_toggleLoadingIndicator(true);

				_listen('beforeChange', function() {

					clearTimeout(_loadingIndicatorTimeout);

					// display loading indicator with delay
					_loadingIndicatorTimeout = setTimeout(function() {

						if(pswp.currItem && pswp.currItem.loading) {

							if( !pswp.allowProgressiveImg() || (pswp.currItem.img && !pswp.currItem.img.naturalWidth)  ) {
								// show preloader if progressive loading is not enabled, 
								// or image width is not defined yet (because of slow connection)
								_toggleLoadingIndicator(false); 
								// items-controller.js function allowProgressiveImg
							}
							
						} else {
							_toggleLoadingIndicator(true); // hide preloader
						}

					}, _options.loadingIndicatorDelay);
					
				});
				_listen('imageLoadComplete', function(index, item) {
					if(pswp.currItem === item) {
						_toggleLoadingIndicator(true);
					}
				});

			}
		},
		_toggleLoadingIndicator = function(hide) {
			if( _loadingIndicatorHidden !== hide ) {
				_togglePswpClass(_loadingIndicator, 'preloader--active', !hide);
				_loadingIndicatorHidden = hide;
			}
		},
		_applyNavBarGaps = function(item) {
			var gap = item.vGap;

			if( _fitControlsInViewport() ) {
				
				var bars = _options.barsSize; 
				if(_options.captionEl && bars.bottom === 'auto') {
					if(!_fakeCaptionContainer) {
						_fakeCaptionContainer = framework.createEl('pswp__caption pswp__caption--fake');
						_fakeCaptionContainer.appendChild( framework.createEl('pswp__caption__center') );
						_controls.insertBefore(_fakeCaptionContainer, _captionContainer);
						framework.addClass(_controls, 'pswp__ui--fit');
					}
					if( _options.addCaptionHTMLFn(item, _fakeCaptionContainer, true) ) {

						var captionSize = _fakeCaptionContainer.clientHeight;
						gap.bottom = parseInt(captionSize,10) || 44;
					} else {
						gap.bottom = bars.top; // if no caption, set size of bottom gap to size of top
					}
				} else {
					gap.bottom = bars.bottom === 'auto' ? 0 : bars.bottom;
				}
				
				// height of top bar is static, no need to calculate it
				gap.top = bars.top;
			} else {
				gap.top = gap.bottom = 0;
			}
		},
		_setupIdle = function() {
			// Hide controls when mouse is used
			if(_options.timeToIdle) {
				_listen('mouseUsed', function() {
					
					framework.bind(document, 'mousemove', _onIdleMouseMove);
					framework.bind(document, 'mouseout', _onMouseLeaveWindow);

					_idleInterval = setInterval(function() {
						_idleIncrement++;
						if(_idleIncrement === 2) {
							ui.setIdle(true);
						}
					}, _options.timeToIdle / 2);
				});
			}
		},
		_setupHidingControlsDuringGestures = function() {

			// Hide controls on vertical drag
			_listen('onVerticalDrag', function(now) {
				if(_controlsVisible && now < 0.95) {
					ui.hideControls();
				} else if(!_controlsVisible && now >= 0.95) {
					ui.showControls();
				}
			});

			// Hide controls when pinching to close
			var pinchControlsHidden;
			_listen('onPinchClose' , function(now) {
				if(_controlsVisible && now < 0.9) {
					ui.hideControls();
					pinchControlsHidden = true;
				} else if(pinchControlsHidden && !_controlsVisible && now > 0.9) {
					ui.showControls();
				}
			});

			_listen('zoomGestureEnded', function() {
				pinchControlsHidden = false;
				if(pinchControlsHidden && !_controlsVisible) {
					ui.showControls();
				}
			});

		};



	var _uiElements = [
		{ 
			name: 'caption', 
			option: 'captionEl',
			onInit: function(el) {  
				_captionContainer = el; 
			} 
		},
		{ 
			name: 'share-modal', 
			option: 'shareEl',
			onInit: function(el) {  
				_shareModal = el;
			},
			onTap: function() {
				_toggleShareModal();
			} 
		},
		{ 
			name: 'button--share', 
			option: 'shareEl',
			onInit: function(el) { 
				_shareButton = el;
			},
			onTap: function() {
				_toggleShareModal();
			} 
		},
		{ 
			name: 'button--zoom', 
			option: 'zoomEl',
			onTap: pswp.toggleDesktopZoom
		},
		{ 
			name: 'counter', 
			option: 'counterEl',
			onInit: function(el) {  
				_indexIndicator = el;
			} 
		},
		{ 
			name: 'button--close', 
			option: 'closeEl',
			onTap: pswp.close
		},
		{ 
			name: 'button--arrow--left', 
			option: 'arrowEl',
			onTap: pswp.prev
		},
		{ 
			name: 'button--arrow--right', 
			option: 'arrowEl',
			onTap: pswp.next
		},
		{ 
			name: 'button--fs', 
			option: 'fullscreenEl',
			onTap: function() {  
				if(_fullscrenAPI.isFullscreen()) {
					_fullscrenAPI.exit();
				} else {
					_fullscrenAPI.enter();
				}
			} 
		},
		{ 
			name: 'preloader', 
			option: 'preloaderEl',
			onInit: function(el) {  
				_loadingIndicator = el;
			} 
		}

	];

	var _setupUIElements = function() {
		var item,
			classAttr,
			uiElement;

		var loopThroughChildElements = function(sChildren) {
			if(!sChildren) {
				return;
			}

			var l = sChildren.length;
			for(var i = 0; i < l; i++) {
				item = sChildren[i];
				classAttr = item.className;

				for(var a = 0; a < _uiElements.length; a++) {
					uiElement = _uiElements[a];

					if(classAttr.indexOf('pswp__' + uiElement.name) > -1  ) {

						if( _options[uiElement.option] ) { // if element is not disabled from options
							
							framework.removeClass(item, 'pswp__element--disabled');
							if(uiElement.onInit) {
								uiElement.onInit(item);
							}
							
							//item.style.display = 'block';
						} else {
							framework.addClass(item, 'pswp__element--disabled');
							//item.style.display = 'none';
						}
					}
				}
			}
		};
		loopThroughChildElements(_controls.children);

		var topBar =  framework.getChildByClass(_controls, 'pswp__top-bar');
		if(topBar) {
			loopThroughChildElements( topBar.children );
		}
	};


	

	ui.init = function() {

		// extend options
		framework.extend(pswp.options, _defaultUIOptions, true);

		// create local link for fast access
		_options = pswp.options;

		// find pswp__ui element
		_controls = framework.getChildByClass(pswp.scrollWrap, 'pswp__ui');

		// create local link
		_listen = pswp.listen;


		_setupHidingControlsDuringGestures();

		// update controls when slides change
		_listen('beforeChange', ui.update);

		// toggle zoom on double-tap
		_listen('doubleTap', function(point) {
			var initialZoomLevel = pswp.currItem.initialZoomLevel;
			if(pswp.getZoomLevel() !== initialZoomLevel) {
				pswp.zoomTo(initialZoomLevel, point, 333);
			} else {
				pswp.zoomTo(_options.getDoubleTapZoom(false, pswp.currItem), point, 333);
			}
		});

		// Allow text selection in caption
		_listen('preventDragEvent', function(e, isDown, preventObj) {
			var t = e.target || e.srcElement;
			if(
				t && 
				t.getAttribute('class') && e.type.indexOf('mouse') > -1 && 
				( t.getAttribute('class').indexOf('__caption') > 0 || (/(SMALL|STRONG|EM)/i).test(t.tagName) ) 
			) {
				preventObj.prevent = false;
			}
		});

		// bind events for UI
		_listen('bindEvents', function() {
			framework.bind(_controls, 'pswpTap click', _onControlsTap);
			framework.bind(pswp.scrollWrap, 'pswpTap', ui.onGlobalTap);

			if(!pswp.likelyTouchDevice) {
				framework.bind(pswp.scrollWrap, 'mouseover', ui.onMouseOver);
			}
		});

		// unbind events for UI
		_listen('unbindEvents', function() {
			if(!_shareModalHidden) {
				_toggleShareModal();
			}

			if(_idleInterval) {
				clearInterval(_idleInterval);
			}
			framework.unbind(document, 'mouseout', _onMouseLeaveWindow);
			framework.unbind(document, 'mousemove', _onIdleMouseMove);
			framework.unbind(_controls, 'pswpTap click', _onControlsTap);
			framework.unbind(pswp.scrollWrap, 'pswpTap', ui.onGlobalTap);
			framework.unbind(pswp.scrollWrap, 'mouseover', ui.onMouseOver);

			if(_fullscrenAPI) {
				framework.unbind(document, _fullscrenAPI.eventK, ui.updateFullscreen);
				if(_fullscrenAPI.isFullscreen()) {
					_options.hideAnimationDuration = 0;
					_fullscrenAPI.exit();
				}
				_fullscrenAPI = null;
			}
		});


		// clean up things when gallery is destroyed
		_listen('destroy', function() {
			if(_options.captionEl) {
				if(_fakeCaptionContainer) {
					_controls.removeChild(_fakeCaptionContainer);
				}
				framework.removeClass(_captionContainer, 'pswp__caption--empty');
			}

			if(_shareModal) {
				_shareModal.children[0].onclick = null;
			}
			framework.removeClass(_controls, 'pswp__ui--over-close');
			framework.addClass( _controls, 'pswp__ui--hidden');
			ui.setIdle(false);
		});
		

		if(!_options.showAnimationDuration) {
			framework.removeClass( _controls, 'pswp__ui--hidden');
		}
		_listen('initialZoomIn', function() {
			if(_options.showAnimationDuration) {
				framework.removeClass( _controls, 'pswp__ui--hidden');
			}
		});
		_listen('initialZoomOut', function() {
			framework.addClass( _controls, 'pswp__ui--hidden');
		});

		_listen('parseVerticalMargin', _applyNavBarGaps);
		
		_setupUIElements();

		if(_options.shareEl && _shareButton && _shareModal) {
			_shareModalHidden = true;
		}

		_countNumItems();

		_setupIdle();

		_setupFullscreenAPI();

		_setupLoadingIndicator();
	};

	ui.setIdle = function(isIdle) {
		_isIdle = isIdle;
		_togglePswpClass(_controls, 'ui--idle', isIdle);
	};

	ui.update = function() {
		// Don't update UI if it's hidden
		if(_controlsVisible && pswp.currItem) {
			
			ui.updateIndexIndicator();

			if(_options.captionEl) {
				_options.addCaptionHTMLFn(pswp.currItem, _captionContainer);

				_togglePswpClass(_captionContainer, 'caption--empty', !pswp.currItem.title);
			}

			_overlayUIUpdated = true;

		} else {
			_overlayUIUpdated = false;
		}

		if(!_shareModalHidden) {
			_toggleShareModal();
		}

		_countNumItems();
	};

	ui.updateFullscreen = function(e) {

		if(e) {
			// some browsers change window scroll position during the fullscreen
			// so PhotoSwipe updates it just in case
			setTimeout(function() {
				pswp.setScrollOffset( 0, framework.getScrollY() );
			}, 50);
		}
		
		// toogle pswp--fs class on root element
		framework[ (_fullscrenAPI.isFullscreen() ? 'add' : 'remove') + 'Class' ](pswp.template, 'pswp--fs');
	};

	ui.updateIndexIndicator = function() {
		if(_options.counterEl) {
			_indexIndicator.innerHTML = (pswp.getCurrentIndex()+1) + 
										_options.indexIndicatorSep + 
										_options.getNumItemsFn();
		}
	};
	
	ui.onGlobalTap = function(e) {
		e = e || window.event;
		var target = e.target || e.srcElement;

		if(_blockControlsTap) {
			return;
		}

		if(e.detail && e.detail.pointerType === 'mouse') {

			// close gallery if clicked outside of the image
			if(_hasCloseClass(target)) {
				pswp.close();
				return;
			}

			if(framework.hasClass(target, 'pswp__img')) {
				if(pswp.getZoomLevel() === 1 && pswp.getZoomLevel() <= pswp.currItem.fitRatio) {
					if(_options.clickToCloseNonZoomable) {
						pswp.close();
					}
				} else {
					pswp.toggleDesktopZoom(e.detail.releasePoint);
				}
			}
			
		} else {

			// tap anywhere (except buttons) to toggle visibility of controls
			if(_options.tapToToggleControls) {
				if(_controlsVisible) {
					ui.hideControls();
				} else {
					ui.showControls();
				}
			}

			// tap to close gallery
			if(_options.tapToClose && (framework.hasClass(target, 'pswp__img') || _hasCloseClass(target)) ) {
				pswp.close();
				return;
			}
			
		}
	};
	ui.onMouseOver = function(e) {
		e = e || window.event;
		var target = e.target || e.srcElement;

		// add class when mouse is over an element that should close the gallery
		_togglePswpClass(_controls, 'ui--over-close', _hasCloseClass(target));
	};

	ui.hideControls = function() {
		framework.addClass(_controls,'pswp__ui--hidden');
		_controlsVisible = false;
	};

	ui.showControls = function() {
		_controlsVisible = true;
		if(!_overlayUIUpdated) {
			ui.update();
		}
		framework.removeClass(_controls,'pswp__ui--hidden');
	};

	ui.supportsFullscreen = function() {
		var d = document;
		return !!(d.exitFullscreen || d.mozCancelFullScreen || d.webkitExitFullscreen || d.msExitFullscreen);
	};

	ui.getFullscreenAPI = function() {
		var dE = document.documentElement,
			api,
			tF = 'fullscreenchange';

		if (dE.requestFullscreen) {
			api = {
				enterK: 'requestFullscreen',
				exitK: 'exitFullscreen',
				elementK: 'fullscreenElement',
				eventK: tF
			};

		} else if(dE.mozRequestFullScreen ) {
			api = {
				enterK: 'mozRequestFullScreen',
				exitK: 'mozCancelFullScreen',
				elementK: 'mozFullScreenElement',
				eventK: 'moz' + tF
			};

			

		} else if(dE.webkitRequestFullscreen) {
			api = {
				enterK: 'webkitRequestFullscreen',
				exitK: 'webkitExitFullscreen',
				elementK: 'webkitFullscreenElement',
				eventK: 'webkit' + tF
			};

		} else if(dE.msRequestFullscreen) {
			api = {
				enterK: 'msRequestFullscreen',
				exitK: 'msExitFullscreen',
				elementK: 'msFullscreenElement',
				eventK: 'MSFullscreenChange'
			};
		}

		if(api) {
			api.enter = function() { 
				// disable close-on-scroll in fullscreen
				_initalCloseOnScrollValue = _options.closeOnScroll; 
				_options.closeOnScroll = false; 

				if(this.enterK === 'webkitRequestFullscreen') {
					pswp.template[this.enterK]( Element.ALLOW_KEYBOARD_INPUT );
				} else {
					return pswp.template[this.enterK](); 
				}
			};
			api.exit = function() { 
				_options.closeOnScroll = _initalCloseOnScrollValue;

				return document[this.exitK](); 

			};
			api.isFullscreen = function() { return document[this.elementK]; };
		}

		return api;
	};



};
return PhotoSwipeUI_Default;


});


/***/ }),

/***/ "./node_modules/photoswipe/dist/photoswipe.js":
/*!****************************************************!*\
  !*** ./node_modules/photoswipe/dist/photoswipe.js ***!
  \****************************************************/
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_RESULT__;/*! PhotoSwipe - v4.1.3 - 2019-01-08
* http://photoswipe.com
* Copyright (c) 2019 Dmitry Semenov; */
(function (root, factory) { 
	if (true) {
		!(__WEBPACK_AMD_DEFINE_FACTORY__ = (factory),
		__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
		(__WEBPACK_AMD_DEFINE_FACTORY__.call(exports, __webpack_require__, exports, module)) :
		__WEBPACK_AMD_DEFINE_FACTORY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	} else {}
})(this, function () {

	'use strict';
	var PhotoSwipe = function(template, UiClass, items, options){

/*>>framework-bridge*/
/**
 *
 * Set of generic functions used by gallery.
 * 
 * You're free to modify anything here as long as functionality is kept.
 * 
 */
var framework = {
	features: null,
	bind: function(target, type, listener, unbind) {
		var methodName = (unbind ? 'remove' : 'add') + 'EventListener';
		type = type.split(' ');
		for(var i = 0; i < type.length; i++) {
			if(type[i]) {
				target[methodName]( type[i], listener, false);
			}
		}
	},
	isArray: function(obj) {
		return (obj instanceof Array);
	},
	createEl: function(classes, tag) {
		var el = document.createElement(tag || 'div');
		if(classes) {
			el.className = classes;
		}
		return el;
	},
	getScrollY: function() {
		var yOffset = window.pageYOffset;
		return yOffset !== undefined ? yOffset : document.documentElement.scrollTop;
	},
	unbind: function(target, type, listener) {
		framework.bind(target,type,listener,true);
	},
	removeClass: function(el, className) {
		var reg = new RegExp('(\\s|^)' + className + '(\\s|$)');
		el.className = el.className.replace(reg, ' ').replace(/^\s\s*/, '').replace(/\s\s*$/, ''); 
	},
	addClass: function(el, className) {
		if( !framework.hasClass(el,className) ) {
			el.className += (el.className ? ' ' : '') + className;
		}
	},
	hasClass: function(el, className) {
		return el.className && new RegExp('(^|\\s)' + className + '(\\s|$)').test(el.className);
	},
	getChildByClass: function(parentEl, childClassName) {
		var node = parentEl.firstChild;
		while(node) {
			if( framework.hasClass(node, childClassName) ) {
				return node;
			}
			node = node.nextSibling;
		}
	},
	arraySearch: function(array, value, key) {
		var i = array.length;
		while(i--) {
			if(array[i][key] === value) {
				return i;
			} 
		}
		return -1;
	},
	extend: function(o1, o2, preventOverwrite) {
		for (var prop in o2) {
			if (o2.hasOwnProperty(prop)) {
				if(preventOverwrite && o1.hasOwnProperty(prop)) {
					continue;
				}
				o1[prop] = o2[prop];
			}
		}
	},
	easing: {
		sine: {
			out: function(k) {
				return Math.sin(k * (Math.PI / 2));
			},
			inOut: function(k) {
				return - (Math.cos(Math.PI * k) - 1) / 2;
			}
		},
		cubic: {
			out: function(k) {
				return --k * k * k + 1;
			}
		}
		/*
			elastic: {
				out: function ( k ) {

					var s, a = 0.1, p = 0.4;
					if ( k === 0 ) return 0;
					if ( k === 1 ) return 1;
					if ( !a || a < 1 ) { a = 1; s = p / 4; }
					else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
					return ( a * Math.pow( 2, - 10 * k) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) + 1 );

				},
			},
			back: {
				out: function ( k ) {
					var s = 1.70158;
					return --k * k * ( ( s + 1 ) * k + s ) + 1;
				}
			}
		*/
	},

	/**
	 * 
	 * @return {object}
	 * 
	 * {
	 *  raf : request animation frame function
	 *  caf : cancel animation frame function
	 *  transfrom : transform property key (with vendor), or null if not supported
	 *  oldIE : IE8 or below
	 * }
	 * 
	 */
	detectFeatures: function() {
		if(framework.features) {
			return framework.features;
		}
		var helperEl = framework.createEl(),
			helperStyle = helperEl.style,
			vendor = '',
			features = {};

		// IE8 and below
		features.oldIE = document.all && !document.addEventListener;

		features.touch = 'ontouchstart' in window;

		if(window.requestAnimationFrame) {
			features.raf = window.requestAnimationFrame;
			features.caf = window.cancelAnimationFrame;
		}

		features.pointerEvent = !!(window.PointerEvent) || navigator.msPointerEnabled;

		// fix false-positive detection of old Android in new IE
		// (IE11 ua string contains "Android 4.0")
		
		if(!features.pointerEvent) { 

			var ua = navigator.userAgent;

			// Detect if device is iPhone or iPod and if it's older than iOS 8
			// http://stackoverflow.com/a/14223920
			// 
			// This detection is made because of buggy top/bottom toolbars
			// that don't trigger window.resize event.
			// For more info refer to _isFixedPosition variable in core.js

			if (/iP(hone|od)/.test(navigator.platform)) {
				var v = (navigator.appVersion).match(/OS (\d+)_(\d+)_?(\d+)?/);
				if(v && v.length > 0) {
					v = parseInt(v[1], 10);
					if(v >= 1 && v < 8 ) {
						features.isOldIOSPhone = true;
					}
				}
			}

			// Detect old Android (before KitKat)
			// due to bugs related to position:fixed
			// http://stackoverflow.com/questions/7184573/pick-up-the-android-version-in-the-browser-by-javascript
			
			var match = ua.match(/Android\s([0-9\.]*)/);
			var androidversion =  match ? match[1] : 0;
			androidversion = parseFloat(androidversion);
			if(androidversion >= 1 ) {
				if(androidversion < 4.4) {
					features.isOldAndroid = true; // for fixed position bug & performance
				}
				features.androidVersion = androidversion; // for touchend bug
			}	
			features.isMobileOpera = /opera mini|opera mobi/i.test(ua);

			// p.s. yes, yes, UA sniffing is bad, propose your solution for above bugs.
		}
		
		var styleChecks = ['transform', 'perspective', 'animationName'],
			vendors = ['', 'webkit','Moz','ms','O'],
			styleCheckItem,
			styleName;

		for(var i = 0; i < 4; i++) {
			vendor = vendors[i];

			for(var a = 0; a < 3; a++) {
				styleCheckItem = styleChecks[a];

				// uppercase first letter of property name, if vendor is present
				styleName = vendor + (vendor ? 
										styleCheckItem.charAt(0).toUpperCase() + styleCheckItem.slice(1) : 
										styleCheckItem);
			
				if(!features[styleCheckItem] && styleName in helperStyle ) {
					features[styleCheckItem] = styleName;
				}
			}

			if(vendor && !features.raf) {
				vendor = vendor.toLowerCase();
				features.raf = window[vendor+'RequestAnimationFrame'];
				if(features.raf) {
					features.caf = window[vendor+'CancelAnimationFrame'] || 
									window[vendor+'CancelRequestAnimationFrame'];
				}
			}
		}
			
		if(!features.raf) {
			var lastTime = 0;
			features.raf = function(fn) {
				var currTime = new Date().getTime();
				var timeToCall = Math.max(0, 16 - (currTime - lastTime));
				var id = window.setTimeout(function() { fn(currTime + timeToCall); }, timeToCall);
				lastTime = currTime + timeToCall;
				return id;
			};
			features.caf = function(id) { clearTimeout(id); };
		}

		// Detect SVG support
		features.svg = !!document.createElementNS && 
						!!document.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGRect;

		framework.features = features;

		return features;
	}
};

framework.detectFeatures();

// Override addEventListener for old versions of IE
if(framework.features.oldIE) {

	framework.bind = function(target, type, listener, unbind) {
		
		type = type.split(' ');

		var methodName = (unbind ? 'detach' : 'attach') + 'Event',
			evName,
			_handleEv = function() {
				listener.handleEvent.call(listener);
			};

		for(var i = 0; i < type.length; i++) {
			evName = type[i];
			if(evName) {

				if(typeof listener === 'object' && listener.handleEvent) {
					if(!unbind) {
						listener['oldIE' + evName] = _handleEv;
					} else {
						if(!listener['oldIE' + evName]) {
							return false;
						}
					}

					target[methodName]( 'on' + evName, listener['oldIE' + evName]);
				} else {
					target[methodName]( 'on' + evName, listener);
				}

			}
		}
	};
	
}

/*>>framework-bridge*/

/*>>core*/
//function(template, UiClass, items, options)

var self = this;

/**
 * Static vars, don't change unless you know what you're doing.
 */
var DOUBLE_TAP_RADIUS = 25, 
	NUM_HOLDERS = 3;

/**
 * Options
 */
var _options = {
	allowPanToNext:true,
	spacing: 0.12,
	bgOpacity: 1,
	mouseUsed: false,
	loop: true,
	pinchToClose: true,
	closeOnScroll: true,
	closeOnVerticalDrag: true,
	verticalDragRange: 0.75,
	hideAnimationDuration: 333,
	showAnimationDuration: 333,
	showHideOpacity: false,
	focus: true,
	escKey: true,
	arrowKeys: true,
	mainScrollEndFriction: 0.35,
	panEndFriction: 0.35,
	isClickableElement: function(el) {
        return el.tagName === 'A';
    },
    getDoubleTapZoom: function(isMouseClick, item) {
    	if(isMouseClick) {
    		return 1;
    	} else {
    		return item.initialZoomLevel < 0.7 ? 1 : 1.33;
    	}
    },
    maxSpreadZoom: 1.33,
	modal: true,

	// not fully implemented yet
	scaleMode: 'fit' // TODO
};
framework.extend(_options, options);


/**
 * Private helper variables & functions
 */

var _getEmptyPoint = function() { 
		return {x:0,y:0}; 
	};

var _isOpen,
	_isDestroying,
	_closedByScroll,
	_currentItemIndex,
	_containerStyle,
	_containerShiftIndex,
	_currPanDist = _getEmptyPoint(),
	_startPanOffset = _getEmptyPoint(),
	_panOffset = _getEmptyPoint(),
	_upMoveEvents, // drag move, drag end & drag cancel events array
	_downEvents, // drag start events array
	_globalEventHandlers,
	_viewportSize = {},
	_currZoomLevel,
	_startZoomLevel,
	_translatePrefix,
	_translateSufix,
	_updateSizeInterval,
	_itemsNeedUpdate,
	_currPositionIndex = 0,
	_offset = {},
	_slideSize = _getEmptyPoint(), // size of slide area, including spacing
	_itemHolders,
	_prevItemIndex,
	_indexDiff = 0, // difference of indexes since last content update
	_dragStartEvent,
	_dragMoveEvent,
	_dragEndEvent,
	_dragCancelEvent,
	_transformKey,
	_pointerEventEnabled,
	_isFixedPosition = true,
	_likelyTouchDevice,
	_modules = [],
	_requestAF,
	_cancelAF,
	_initalClassName,
	_initalWindowScrollY,
	_oldIE,
	_currentWindowScrollY,
	_features,
	_windowVisibleSize = {},
	_renderMaxResolution = false,
	_orientationChangeTimeout,


	// Registers PhotoSWipe module (History, Controller ...)
	_registerModule = function(name, module) {
		framework.extend(self, module.publicMethods);
		_modules.push(name);
	},

	_getLoopedId = function(index) {
		var numSlides = _getNumItems();
		if(index > numSlides - 1) {
			return index - numSlides;
		} else  if(index < 0) {
			return numSlides + index;
		}
		return index;
	},
	
	// Micro bind/trigger
	_listeners = {},
	_listen = function(name, fn) {
		if(!_listeners[name]) {
			_listeners[name] = [];
		}
		return _listeners[name].push(fn);
	},
	_shout = function(name) {
		var listeners = _listeners[name];

		if(listeners) {
			var args = Array.prototype.slice.call(arguments);
			args.shift();

			for(var i = 0; i < listeners.length; i++) {
				listeners[i].apply(self, args);
			}
		}
	},

	_getCurrentTime = function() {
		return new Date().getTime();
	},
	_applyBgOpacity = function(opacity) {
		_bgOpacity = opacity;
		self.bg.style.opacity = opacity * _options.bgOpacity;
	},

	_applyZoomTransform = function(styleObj,x,y,zoom,item) {
		if(!_renderMaxResolution || (item && item !== self.currItem) ) {
			zoom = zoom / (item ? item.fitRatio : self.currItem.fitRatio);	
		}
			
		styleObj[_transformKey] = _translatePrefix + x + 'px, ' + y + 'px' + _translateSufix + ' scale(' + zoom + ')';
	},
	_applyCurrentZoomPan = function( allowRenderResolution ) {
		if(_currZoomElementStyle) {

			if(allowRenderResolution) {
				if(_currZoomLevel > self.currItem.fitRatio) {
					if(!_renderMaxResolution) {
						_setImageSize(self.currItem, false, true);
						_renderMaxResolution = true;
					}
				} else {
					if(_renderMaxResolution) {
						_setImageSize(self.currItem);
						_renderMaxResolution = false;
					}
				}
			}
			

			_applyZoomTransform(_currZoomElementStyle, _panOffset.x, _panOffset.y, _currZoomLevel);
		}
	},
	_applyZoomPanToItem = function(item) {
		if(item.container) {

			_applyZoomTransform(item.container.style, 
								item.initialPosition.x, 
								item.initialPosition.y, 
								item.initialZoomLevel,
								item);
		}
	},
	_setTranslateX = function(x, elStyle) {
		elStyle[_transformKey] = _translatePrefix + x + 'px, 0px' + _translateSufix;
	},
	_moveMainScroll = function(x, dragging) {

		if(!_options.loop && dragging) {
			var newSlideIndexOffset = _currentItemIndex + (_slideSize.x * _currPositionIndex - x) / _slideSize.x,
				delta = Math.round(x - _mainScrollPos.x);

			if( (newSlideIndexOffset < 0 && delta > 0) || 
				(newSlideIndexOffset >= _getNumItems() - 1 && delta < 0) ) {
				x = _mainScrollPos.x + delta * _options.mainScrollEndFriction;
			} 
		}
		
		_mainScrollPos.x = x;
		_setTranslateX(x, _containerStyle);
	},
	_calculatePanOffset = function(axis, zoomLevel) {
		var m = _midZoomPoint[axis] - _offset[axis];
		return _startPanOffset[axis] + _currPanDist[axis] + m - m * ( zoomLevel / _startZoomLevel );
	},
	
	_equalizePoints = function(p1, p2) {
		p1.x = p2.x;
		p1.y = p2.y;
		if(p2.id) {
			p1.id = p2.id;
		}
	},
	_roundPoint = function(p) {
		p.x = Math.round(p.x);
		p.y = Math.round(p.y);
	},

	_mouseMoveTimeout = null,
	_onFirstMouseMove = function() {
		// Wait until mouse move event is fired at least twice during 100ms
		// We do this, because some mobile browsers trigger it on touchstart
		if(_mouseMoveTimeout ) { 
			framework.unbind(document, 'mousemove', _onFirstMouseMove);
			framework.addClass(template, 'pswp--has_mouse');
			_options.mouseUsed = true;
			_shout('mouseUsed');
		}
		_mouseMoveTimeout = setTimeout(function() {
			_mouseMoveTimeout = null;
		}, 100);
	},

	_bindEvents = function() {
		framework.bind(document, 'keydown', self);

		if(_features.transform) {
			// don't bind click event in browsers that don't support transform (mostly IE8)
			framework.bind(self.scrollWrap, 'click', self);
		}
		

		if(!_options.mouseUsed) {
			framework.bind(document, 'mousemove', _onFirstMouseMove);
		}

		framework.bind(window, 'resize scroll orientationchange', self);

		_shout('bindEvents');
	},

	_unbindEvents = function() {
		framework.unbind(window, 'resize scroll orientationchange', self);
		framework.unbind(window, 'scroll', _globalEventHandlers.scroll);
		framework.unbind(document, 'keydown', self);
		framework.unbind(document, 'mousemove', _onFirstMouseMove);

		if(_features.transform) {
			framework.unbind(self.scrollWrap, 'click', self);
		}

		if(_isDragging) {
			framework.unbind(window, _upMoveEvents, self);
		}

		clearTimeout(_orientationChangeTimeout);

		_shout('unbindEvents');
	},
	
	_calculatePanBounds = function(zoomLevel, update) {
		var bounds = _calculateItemSize( self.currItem, _viewportSize, zoomLevel );
		if(update) {
			_currPanBounds = bounds;
		}
		return bounds;
	},
	
	_getMinZoomLevel = function(item) {
		if(!item) {
			item = self.currItem;
		}
		return item.initialZoomLevel;
	},
	_getMaxZoomLevel = function(item) {
		if(!item) {
			item = self.currItem;
		}
		return item.w > 0 ? _options.maxSpreadZoom : 1;
	},

	// Return true if offset is out of the bounds
	_modifyDestPanOffset = function(axis, destPanBounds, destPanOffset, destZoomLevel) {
		if(destZoomLevel === self.currItem.initialZoomLevel) {
			destPanOffset[axis] = self.currItem.initialPosition[axis];
			return true;
		} else {
			destPanOffset[axis] = _calculatePanOffset(axis, destZoomLevel); 

			if(destPanOffset[axis] > destPanBounds.min[axis]) {
				destPanOffset[axis] = destPanBounds.min[axis];
				return true;
			} else if(destPanOffset[axis] < destPanBounds.max[axis] ) {
				destPanOffset[axis] = destPanBounds.max[axis];
				return true;
			}
		}
		return false;
	},

	_setupTransforms = function() {

		if(_transformKey) {
			// setup 3d transforms
			var allow3dTransform = _features.perspective && !_likelyTouchDevice;
			_translatePrefix = 'translate' + (allow3dTransform ? '3d(' : '(');
			_translateSufix = _features.perspective ? ', 0px)' : ')';	
			return;
		}

		// Override zoom/pan/move functions in case old browser is used (most likely IE)
		// (so they use left/top/width/height, instead of CSS transform)
	
		_transformKey = 'left';
		framework.addClass(template, 'pswp--ie');

		_setTranslateX = function(x, elStyle) {
			elStyle.left = x + 'px';
		};
		_applyZoomPanToItem = function(item) {

			var zoomRatio = item.fitRatio > 1 ? 1 : item.fitRatio,
				s = item.container.style,
				w = zoomRatio * item.w,
				h = zoomRatio * item.h;

			s.width = w + 'px';
			s.height = h + 'px';
			s.left = item.initialPosition.x + 'px';
			s.top = item.initialPosition.y + 'px';

		};
		_applyCurrentZoomPan = function() {
			if(_currZoomElementStyle) {

				var s = _currZoomElementStyle,
					item = self.currItem,
					zoomRatio = item.fitRatio > 1 ? 1 : item.fitRatio,
					w = zoomRatio * item.w,
					h = zoomRatio * item.h;

				s.width = w + 'px';
				s.height = h + 'px';


				s.left = _panOffset.x + 'px';
				s.top = _panOffset.y + 'px';
			}
			
		};
	},

	_onKeyDown = function(e) {
		var keydownAction = '';
		if(_options.escKey && e.keyCode === 27) { 
			keydownAction = 'close';
		} else if(_options.arrowKeys) {
			if(e.keyCode === 37) {
				keydownAction = 'prev';
			} else if(e.keyCode === 39) { 
				keydownAction = 'next';
			}
		}

		if(keydownAction) {
			// don't do anything if special key pressed to prevent from overriding default browser actions
			// e.g. in Chrome on Mac cmd+arrow-left returns to previous page
			if( !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey ) {
				if(e.preventDefault) {
					e.preventDefault();
				} else {
					e.returnValue = false;
				} 
				self[keydownAction]();
			}
		}
	},

	_onGlobalClick = function(e) {
		if(!e) {
			return;
		}

		// don't allow click event to pass through when triggering after drag or some other gesture
		if(_moved || _zoomStarted || _mainScrollAnimating || _verticalDragInitiated) {
			e.preventDefault();
			e.stopPropagation();
		}
	},

	_updatePageScrollOffset = function() {
		self.setScrollOffset(0, framework.getScrollY());		
	};
	


	



// Micro animation engine
var _animations = {},
	_numAnimations = 0,
	_stopAnimation = function(name) {
		if(_animations[name]) {
			if(_animations[name].raf) {
				_cancelAF( _animations[name].raf );
			}
			_numAnimations--;
			delete _animations[name];
		}
	},
	_registerStartAnimation = function(name) {
		if(_animations[name]) {
			_stopAnimation(name);
		}
		if(!_animations[name]) {
			_numAnimations++;
			_animations[name] = {};
		}
	},
	_stopAllAnimations = function() {
		for (var prop in _animations) {

			if( _animations.hasOwnProperty( prop ) ) {
				_stopAnimation(prop);
			} 
			
		}
	},
	_animateProp = function(name, b, endProp, d, easingFn, onUpdate, onComplete) {
		var startAnimTime = _getCurrentTime(), t;
		_registerStartAnimation(name);

		var animloop = function(){
			if ( _animations[name] ) {
				
				t = _getCurrentTime() - startAnimTime; // time diff
				//b - beginning (start prop)
				//d - anim duration

				if ( t >= d ) {
					_stopAnimation(name);
					onUpdate(endProp);
					if(onComplete) {
						onComplete();
					}
					return;
				}
				onUpdate( (endProp - b) * easingFn(t/d) + b );

				_animations[name].raf = _requestAF(animloop);
			}
		};
		animloop();
	};
	


var publicMethods = {

	// make a few local variables and functions public
	shout: _shout,
	listen: _listen,
	viewportSize: _viewportSize,
	options: _options,

	isMainScrollAnimating: function() {
		return _mainScrollAnimating;
	},
	getZoomLevel: function() {
		return _currZoomLevel;
	},
	getCurrentIndex: function() {
		return _currentItemIndex;
	},
	isDragging: function() {
		return _isDragging;
	},	
	isZooming: function() {
		return _isZooming;
	},
	setScrollOffset: function(x,y) {
		_offset.x = x;
		_currentWindowScrollY = _offset.y = y;
		_shout('updateScrollOffset', _offset);
	},
	applyZoomPan: function(zoomLevel,panX,panY,allowRenderResolution) {
		_panOffset.x = panX;
		_panOffset.y = panY;
		_currZoomLevel = zoomLevel;
		_applyCurrentZoomPan( allowRenderResolution );
	},

	init: function() {

		if(_isOpen || _isDestroying) {
			return;
		}

		var i;

		self.framework = framework; // basic functionality
		self.template = template; // root DOM element of PhotoSwipe
		self.bg = framework.getChildByClass(template, 'pswp__bg');

		_initalClassName = template.className;
		_isOpen = true;
				
		_features = framework.detectFeatures();
		_requestAF = _features.raf;
		_cancelAF = _features.caf;
		_transformKey = _features.transform;
		_oldIE = _features.oldIE;
		
		self.scrollWrap = framework.getChildByClass(template, 'pswp__scroll-wrap');
		self.container = framework.getChildByClass(self.scrollWrap, 'pswp__container');

		_containerStyle = self.container.style; // for fast access

		// Objects that hold slides (there are only 3 in DOM)
		self.itemHolders = _itemHolders = [
			{el:self.container.children[0] , wrap:0, index: -1},
			{el:self.container.children[1] , wrap:0, index: -1},
			{el:self.container.children[2] , wrap:0, index: -1}
		];

		// hide nearby item holders until initial zoom animation finishes (to avoid extra Paints)
		_itemHolders[0].el.style.display = _itemHolders[2].el.style.display = 'none';

		_setupTransforms();

		// Setup global events
		_globalEventHandlers = {
			resize: self.updateSize,

			// Fixes: iOS 10.3 resize event
			// does not update scrollWrap.clientWidth instantly after resize
			// https://github.com/dimsemenov/PhotoSwipe/issues/1315
			orientationchange: function() {
				clearTimeout(_orientationChangeTimeout);
				_orientationChangeTimeout = setTimeout(function() {
					if(_viewportSize.x !== self.scrollWrap.clientWidth) {
						self.updateSize();
					}
				}, 500);
			},
			scroll: _updatePageScrollOffset,
			keydown: _onKeyDown,
			click: _onGlobalClick
		};

		// disable show/hide effects on old browsers that don't support CSS animations or transforms, 
		// old IOS, Android and Opera mobile. Blackberry seems to work fine, even older models.
		var oldPhone = _features.isOldIOSPhone || _features.isOldAndroid || _features.isMobileOpera;
		if(!_features.animationName || !_features.transform || oldPhone) {
			_options.showAnimationDuration = _options.hideAnimationDuration = 0;
		}

		// init modules
		for(i = 0; i < _modules.length; i++) {
			self['init' + _modules[i]]();
		}
		
		// init
		if(UiClass) {
			var ui = self.ui = new UiClass(self, framework);
			ui.init();
		}

		_shout('firstUpdate');
		_currentItemIndex = _currentItemIndex || _options.index || 0;
		// validate index
		if( isNaN(_currentItemIndex) || _currentItemIndex < 0 || _currentItemIndex >= _getNumItems() ) {
			_currentItemIndex = 0;
		}
		self.currItem = _getItemAt( _currentItemIndex );

		
		if(_features.isOldIOSPhone || _features.isOldAndroid) {
			_isFixedPosition = false;
		}
		
		template.setAttribute('aria-hidden', 'false');
		if(_options.modal) {
			if(!_isFixedPosition) {
				template.style.position = 'absolute';
				template.style.top = framework.getScrollY() + 'px';
			} else {
				template.style.position = 'fixed';
			}
		}

		if(_currentWindowScrollY === undefined) {
			_shout('initialLayout');
			_currentWindowScrollY = _initalWindowScrollY = framework.getScrollY();
		}
		
		// add classes to root element of PhotoSwipe
		var rootClasses = 'pswp--open ';
		if(_options.mainClass) {
			rootClasses += _options.mainClass + ' ';
		}
		if(_options.showHideOpacity) {
			rootClasses += 'pswp--animate_opacity ';
		}
		rootClasses += _likelyTouchDevice ? 'pswp--touch' : 'pswp--notouch';
		rootClasses += _features.animationName ? ' pswp--css_animation' : '';
		rootClasses += _features.svg ? ' pswp--svg' : '';
		framework.addClass(template, rootClasses);

		self.updateSize();

		// initial update
		_containerShiftIndex = -1;
		_indexDiff = null;
		for(i = 0; i < NUM_HOLDERS; i++) {
			_setTranslateX( (i+_containerShiftIndex) * _slideSize.x, _itemHolders[i].el.style);
		}

		if(!_oldIE) {
			framework.bind(self.scrollWrap, _downEvents, self); // no dragging for old IE
		}	

		_listen('initialZoomInEnd', function() {
			self.setContent(_itemHolders[0], _currentItemIndex-1);
			self.setContent(_itemHolders[2], _currentItemIndex+1);

			_itemHolders[0].el.style.display = _itemHolders[2].el.style.display = 'block';

			if(_options.focus) {
				// focus causes layout, 
				// which causes lag during the animation, 
				// that's why we delay it untill the initial zoom transition ends
				template.focus();
			}
			 

			_bindEvents();
		});

		// set content for center slide (first time)
		self.setContent(_itemHolders[1], _currentItemIndex);
		
		self.updateCurrItem();

		_shout('afterInit');

		if(!_isFixedPosition) {

			// On all versions of iOS lower than 8.0, we check size of viewport every second.
			// 
			// This is done to detect when Safari top & bottom bars appear, 
			// as this action doesn't trigger any events (like resize). 
			// 
			// On iOS8 they fixed this.
			// 
			// 10 Nov 2014: iOS 7 usage ~40%. iOS 8 usage 56%.
			
			_updateSizeInterval = setInterval(function() {
				if(!_numAnimations && !_isDragging && !_isZooming && (_currZoomLevel === self.currItem.initialZoomLevel)  ) {
					self.updateSize();
				}
			}, 1000);
		}

		framework.addClass(template, 'pswp--visible');
	},

	// Close the gallery, then destroy it
	close: function() {
		if(!_isOpen) {
			return;
		}

		_isOpen = false;
		_isDestroying = true;
		_shout('close');
		_unbindEvents();

		_showOrHide(self.currItem, null, true, self.destroy);
	},

	// destroys the gallery (unbinds events, cleans up intervals and timeouts to avoid memory leaks)
	destroy: function() {
		_shout('destroy');

		if(_showOrHideTimeout) {
			clearTimeout(_showOrHideTimeout);
		}
		
		template.setAttribute('aria-hidden', 'true');
		template.className = _initalClassName;

		if(_updateSizeInterval) {
			clearInterval(_updateSizeInterval);
		}

		framework.unbind(self.scrollWrap, _downEvents, self);

		// we unbind scroll event at the end, as closing animation may depend on it
		framework.unbind(window, 'scroll', self);

		_stopDragUpdateLoop();

		_stopAllAnimations();

		_listeners = null;
	},

	/**
	 * Pan image to position
	 * @param {Number} x     
	 * @param {Number} y     
	 * @param {Boolean} force Will ignore bounds if set to true.
	 */
	panTo: function(x,y,force) {
		if(!force) {
			if(x > _currPanBounds.min.x) {
				x = _currPanBounds.min.x;
			} else if(x < _currPanBounds.max.x) {
				x = _currPanBounds.max.x;
			}

			if(y > _currPanBounds.min.y) {
				y = _currPanBounds.min.y;
			} else if(y < _currPanBounds.max.y) {
				y = _currPanBounds.max.y;
			}
		}
		
		_panOffset.x = x;
		_panOffset.y = y;
		_applyCurrentZoomPan();
	},
	
	handleEvent: function (e) {
		e = e || window.event;
		if(_globalEventHandlers[e.type]) {
			_globalEventHandlers[e.type](e);
		}
	},


	goTo: function(index) {

		index = _getLoopedId(index);

		var diff = index - _currentItemIndex;
		_indexDiff = diff;

		_currentItemIndex = index;
		self.currItem = _getItemAt( _currentItemIndex );
		_currPositionIndex -= diff;
		
		_moveMainScroll(_slideSize.x * _currPositionIndex);
		

		_stopAllAnimations();
		_mainScrollAnimating = false;

		self.updateCurrItem();
	},
	next: function() {
		self.goTo( _currentItemIndex + 1);
	},
	prev: function() {
		self.goTo( _currentItemIndex - 1);
	},

	// update current zoom/pan objects
	updateCurrZoomItem: function(emulateSetContent) {
		if(emulateSetContent) {
			_shout('beforeChange', 0);
		}

		// itemHolder[1] is middle (current) item
		if(_itemHolders[1].el.children.length) {
			var zoomElement = _itemHolders[1].el.children[0];
			if( framework.hasClass(zoomElement, 'pswp__zoom-wrap') ) {
				_currZoomElementStyle = zoomElement.style;
			} else {
				_currZoomElementStyle = null;
			}
		} else {
			_currZoomElementStyle = null;
		}
		
		_currPanBounds = self.currItem.bounds;	
		_startZoomLevel = _currZoomLevel = self.currItem.initialZoomLevel;

		_panOffset.x = _currPanBounds.center.x;
		_panOffset.y = _currPanBounds.center.y;

		if(emulateSetContent) {
			_shout('afterChange');
		}
	},


	invalidateCurrItems: function() {
		_itemsNeedUpdate = true;
		for(var i = 0; i < NUM_HOLDERS; i++) {
			if( _itemHolders[i].item ) {
				_itemHolders[i].item.needsUpdate = true;
			}
		}
	},

	updateCurrItem: function(beforeAnimation) {

		if(_indexDiff === 0) {
			return;
		}

		var diffAbs = Math.abs(_indexDiff),
			tempHolder;

		if(beforeAnimation && diffAbs < 2) {
			return;
		}


		self.currItem = _getItemAt( _currentItemIndex );
		_renderMaxResolution = false;
		
		_shout('beforeChange', _indexDiff);

		if(diffAbs >= NUM_HOLDERS) {
			_containerShiftIndex += _indexDiff + (_indexDiff > 0 ? -NUM_HOLDERS : NUM_HOLDERS);
			diffAbs = NUM_HOLDERS;
		}
		for(var i = 0; i < diffAbs; i++) {
			if(_indexDiff > 0) {
				tempHolder = _itemHolders.shift();
				_itemHolders[NUM_HOLDERS-1] = tempHolder; // move first to last

				_containerShiftIndex++;
				_setTranslateX( (_containerShiftIndex+2) * _slideSize.x, tempHolder.el.style);
				self.setContent(tempHolder, _currentItemIndex - diffAbs + i + 1 + 1);
			} else {
				tempHolder = _itemHolders.pop();
				_itemHolders.unshift( tempHolder ); // move last to first

				_containerShiftIndex--;
				_setTranslateX( _containerShiftIndex * _slideSize.x, tempHolder.el.style);
				self.setContent(tempHolder, _currentItemIndex + diffAbs - i - 1 - 1);
			}
			
		}

		// reset zoom/pan on previous item
		if(_currZoomElementStyle && Math.abs(_indexDiff) === 1) {

			var prevItem = _getItemAt(_prevItemIndex);
			if(prevItem.initialZoomLevel !== _currZoomLevel) {
				_calculateItemSize(prevItem , _viewportSize );
				_setImageSize(prevItem);
				_applyZoomPanToItem( prevItem ); 				
			}

		}

		// reset diff after update
		_indexDiff = 0;

		self.updateCurrZoomItem();

		_prevItemIndex = _currentItemIndex;

		_shout('afterChange');
		
	},



	updateSize: function(force) {
		
		if(!_isFixedPosition && _options.modal) {
			var windowScrollY = framework.getScrollY();
			if(_currentWindowScrollY !== windowScrollY) {
				template.style.top = windowScrollY + 'px';
				_currentWindowScrollY = windowScrollY;
			}
			if(!force && _windowVisibleSize.x === window.innerWidth && _windowVisibleSize.y === window.innerHeight) {
				return;
			}
			_windowVisibleSize.x = window.innerWidth;
			_windowVisibleSize.y = window.innerHeight;

			//template.style.width = _windowVisibleSize.x + 'px';
			template.style.height = _windowVisibleSize.y + 'px';
		}



		_viewportSize.x = self.scrollWrap.clientWidth;
		_viewportSize.y = self.scrollWrap.clientHeight;

		_updatePageScrollOffset();

		_slideSize.x = _viewportSize.x + Math.round(_viewportSize.x * _options.spacing);
		_slideSize.y = _viewportSize.y;

		_moveMainScroll(_slideSize.x * _currPositionIndex);

		_shout('beforeResize'); // even may be used for example to switch image sources


		// don't re-calculate size on inital size update
		if(_containerShiftIndex !== undefined) {

			var holder,
				item,
				hIndex;

			for(var i = 0; i < NUM_HOLDERS; i++) {
				holder = _itemHolders[i];
				_setTranslateX( (i+_containerShiftIndex) * _slideSize.x, holder.el.style);

				hIndex = _currentItemIndex+i-1;

				if(_options.loop && _getNumItems() > 2) {
					hIndex = _getLoopedId(hIndex);
				}

				// update zoom level on items and refresh source (if needsUpdate)
				item = _getItemAt( hIndex );

				// re-render gallery item if `needsUpdate`,
				// or doesn't have `bounds` (entirely new slide object)
				if( item && (_itemsNeedUpdate || item.needsUpdate || !item.bounds) ) {

					self.cleanSlide( item );
					
					self.setContent( holder, hIndex );

					// if "center" slide
					if(i === 1) {
						self.currItem = item;
						self.updateCurrZoomItem(true);
					}

					item.needsUpdate = false;

				} else if(holder.index === -1 && hIndex >= 0) {
					// add content first time
					self.setContent( holder, hIndex );
				}
				if(item && item.container) {
					_calculateItemSize(item, _viewportSize);
					_setImageSize(item);
					_applyZoomPanToItem( item );
				}
				
			}
			_itemsNeedUpdate = false;
		}	

		_startZoomLevel = _currZoomLevel = self.currItem.initialZoomLevel;
		_currPanBounds = self.currItem.bounds;

		if(_currPanBounds) {
			_panOffset.x = _currPanBounds.center.x;
			_panOffset.y = _currPanBounds.center.y;
			_applyCurrentZoomPan( true );
		}
		
		_shout('resize');
	},
	
	// Zoom current item to
	zoomTo: function(destZoomLevel, centerPoint, speed, easingFn, updateFn) {
		/*
			if(destZoomLevel === 'fit') {
				destZoomLevel = self.currItem.fitRatio;
			} else if(destZoomLevel === 'fill') {
				destZoomLevel = self.currItem.fillRatio;
			}
		*/

		if(centerPoint) {
			_startZoomLevel = _currZoomLevel;
			_midZoomPoint.x = Math.abs(centerPoint.x) - _panOffset.x ;
			_midZoomPoint.y = Math.abs(centerPoint.y) - _panOffset.y ;
			_equalizePoints(_startPanOffset, _panOffset);
		}

		var destPanBounds = _calculatePanBounds(destZoomLevel, false),
			destPanOffset = {};

		_modifyDestPanOffset('x', destPanBounds, destPanOffset, destZoomLevel);
		_modifyDestPanOffset('y', destPanBounds, destPanOffset, destZoomLevel);

		var initialZoomLevel = _currZoomLevel;
		var initialPanOffset = {
			x: _panOffset.x,
			y: _panOffset.y
		};

		_roundPoint(destPanOffset);

		var onUpdate = function(now) {
			if(now === 1) {
				_currZoomLevel = destZoomLevel;
				_panOffset.x = destPanOffset.x;
				_panOffset.y = destPanOffset.y;
			} else {
				_currZoomLevel = (destZoomLevel - initialZoomLevel) * now + initialZoomLevel;
				_panOffset.x = (destPanOffset.x - initialPanOffset.x) * now + initialPanOffset.x;
				_panOffset.y = (destPanOffset.y - initialPanOffset.y) * now + initialPanOffset.y;
			}

			if(updateFn) {
				updateFn(now);
			}

			_applyCurrentZoomPan( now === 1 );
		};

		if(speed) {
			_animateProp('customZoomTo', 0, 1, speed, easingFn || framework.easing.sine.inOut, onUpdate);
		} else {
			onUpdate(1);
		}
	}


};


/*>>core*/

/*>>gestures*/
/**
 * Mouse/touch/pointer event handlers.
 * 
 * separated from @core.js for readability
 */

var MIN_SWIPE_DISTANCE = 30,
	DIRECTION_CHECK_OFFSET = 10; // amount of pixels to drag to determine direction of swipe

var _gestureStartTime,
	_gestureCheckSpeedTime,

	// pool of objects that are used during dragging of zooming
	p = {}, // first point
	p2 = {}, // second point (for zoom gesture)
	delta = {},
	_currPoint = {},
	_startPoint = {},
	_currPointers = [],
	_startMainScrollPos = {},
	_releaseAnimData,
	_posPoints = [], // array of points during dragging, used to determine type of gesture
	_tempPoint = {},

	_isZoomingIn,
	_verticalDragInitiated,
	_oldAndroidTouchEndTimeout,
	_currZoomedItemIndex = 0,
	_centerPoint = _getEmptyPoint(),
	_lastReleaseTime = 0,
	_isDragging, // at least one pointer is down
	_isMultitouch, // at least two _pointers are down
	_zoomStarted, // zoom level changed during zoom gesture
	_moved,
	_dragAnimFrame,
	_mainScrollShifted,
	_currentPoints, // array of current touch points
	_isZooming,
	_currPointsDistance,
	_startPointsDistance,
	_currPanBounds,
	_mainScrollPos = _getEmptyPoint(),
	_currZoomElementStyle,
	_mainScrollAnimating, // true, if animation after swipe gesture is running
	_midZoomPoint = _getEmptyPoint(),
	_currCenterPoint = _getEmptyPoint(),
	_direction,
	_isFirstMove,
	_opacityChanged,
	_bgOpacity,
	_wasOverInitialZoom,

	_isEqualPoints = function(p1, p2) {
		return p1.x === p2.x && p1.y === p2.y;
	},
	_isNearbyPoints = function(touch0, touch1) {
		return Math.abs(touch0.x - touch1.x) < DOUBLE_TAP_RADIUS && Math.abs(touch0.y - touch1.y) < DOUBLE_TAP_RADIUS;
	},
	_calculatePointsDistance = function(p1, p2) {
		_tempPoint.x = Math.abs( p1.x - p2.x );
		_tempPoint.y = Math.abs( p1.y - p2.y );
		return Math.sqrt(_tempPoint.x * _tempPoint.x + _tempPoint.y * _tempPoint.y);
	},
	_stopDragUpdateLoop = function() {
		if(_dragAnimFrame) {
			_cancelAF(_dragAnimFrame);
			_dragAnimFrame = null;
		}
	},
	_dragUpdateLoop = function() {
		if(_isDragging) {
			_dragAnimFrame = _requestAF(_dragUpdateLoop);
			_renderMovement();
		}
	},
	_canPan = function() {
		return !(_options.scaleMode === 'fit' && _currZoomLevel ===  self.currItem.initialZoomLevel);
	},
	
	// find the closest parent DOM element
	_closestElement = function(el, fn) {
	  	if(!el || el === document) {
	  		return false;
	  	}

	  	// don't search elements above pswp__scroll-wrap
	  	if(el.getAttribute('class') && el.getAttribute('class').indexOf('pswp__scroll-wrap') > -1 ) {
	  		return false;
	  	}

	  	if( fn(el) ) {
	  		return el;
	  	}

	  	return _closestElement(el.parentNode, fn);
	},

	_preventObj = {},
	_preventDefaultEventBehaviour = function(e, isDown) {
	    _preventObj.prevent = !_closestElement(e.target, _options.isClickableElement);

		_shout('preventDragEvent', e, isDown, _preventObj);
		return _preventObj.prevent;

	},
	_convertTouchToPoint = function(touch, p) {
		p.x = touch.pageX;
		p.y = touch.pageY;
		p.id = touch.identifier;
		return p;
	},
	_findCenterOfPoints = function(p1, p2, pCenter) {
		pCenter.x = (p1.x + p2.x) * 0.5;
		pCenter.y = (p1.y + p2.y) * 0.5;
	},
	_pushPosPoint = function(time, x, y) {
		if(time - _gestureCheckSpeedTime > 50) {
			var o = _posPoints.length > 2 ? _posPoints.shift() : {};
			o.x = x;
			o.y = y; 
			_posPoints.push(o);
			_gestureCheckSpeedTime = time;
		}
	},

	_calculateVerticalDragOpacityRatio = function() {
		var yOffset = _panOffset.y - self.currItem.initialPosition.y; // difference between initial and current position
		return 1 -  Math.abs( yOffset / (_viewportSize.y / 2)  );
	},

	
	// points pool, reused during touch events
	_ePoint1 = {},
	_ePoint2 = {},
	_tempPointsArr = [],
	_tempCounter,
	_getTouchPoints = function(e) {
		// clean up previous points, without recreating array
		while(_tempPointsArr.length > 0) {
			_tempPointsArr.pop();
		}

		if(!_pointerEventEnabled) {
			if(e.type.indexOf('touch') > -1) {

				if(e.touches && e.touches.length > 0) {
					_tempPointsArr[0] = _convertTouchToPoint(e.touches[0], _ePoint1);
					if(e.touches.length > 1) {
						_tempPointsArr[1] = _convertTouchToPoint(e.touches[1], _ePoint2);
					}
				}
				
			} else {
				_ePoint1.x = e.pageX;
				_ePoint1.y = e.pageY;
				_ePoint1.id = '';
				_tempPointsArr[0] = _ePoint1;//_ePoint1;
			}
		} else {
			_tempCounter = 0;
			// we can use forEach, as pointer events are supported only in modern browsers
			_currPointers.forEach(function(p) {
				if(_tempCounter === 0) {
					_tempPointsArr[0] = p;
				} else if(_tempCounter === 1) {
					_tempPointsArr[1] = p;
				}
				_tempCounter++;

			});
		}
		return _tempPointsArr;
	},

	_panOrMoveMainScroll = function(axis, delta) {

		var panFriction,
			overDiff = 0,
			newOffset = _panOffset[axis] + delta[axis],
			startOverDiff,
			dir = delta[axis] > 0,
			newMainScrollPosition = _mainScrollPos.x + delta.x,
			mainScrollDiff = _mainScrollPos.x - _startMainScrollPos.x,
			newPanPos,
			newMainScrollPos;

		// calculate fdistance over the bounds and friction
		if(newOffset > _currPanBounds.min[axis] || newOffset < _currPanBounds.max[axis]) {
			panFriction = _options.panEndFriction;
			// Linear increasing of friction, so at 1/4 of viewport it's at max value. 
			// Looks not as nice as was expected. Left for history.
			// panFriction = (1 - (_panOffset[axis] + delta[axis] + panBounds.min[axis]) / (_viewportSize[axis] / 4) );
		} else {
			panFriction = 1;
		}
		
		newOffset = _panOffset[axis] + delta[axis] * panFriction;

		// move main scroll or start panning
		if(_options.allowPanToNext || _currZoomLevel === self.currItem.initialZoomLevel) {


			if(!_currZoomElementStyle) {
				
				newMainScrollPos = newMainScrollPosition;

			} else if(_direction === 'h' && axis === 'x' && !_zoomStarted ) {
				
				if(dir) {
					if(newOffset > _currPanBounds.min[axis]) {
						panFriction = _options.panEndFriction;
						overDiff = _currPanBounds.min[axis] - newOffset;
						startOverDiff = _currPanBounds.min[axis] - _startPanOffset[axis];
					}
					
					// drag right
					if( (startOverDiff <= 0 || mainScrollDiff < 0) && _getNumItems() > 1 ) {
						newMainScrollPos = newMainScrollPosition;
						if(mainScrollDiff < 0 && newMainScrollPosition > _startMainScrollPos.x) {
							newMainScrollPos = _startMainScrollPos.x;
						}
					} else {
						if(_currPanBounds.min.x !== _currPanBounds.max.x) {
							newPanPos = newOffset;
						}
						
					}

				} else {

					if(newOffset < _currPanBounds.max[axis] ) {
						panFriction =_options.panEndFriction;
						overDiff = newOffset - _currPanBounds.max[axis];
						startOverDiff = _startPanOffset[axis] - _currPanBounds.max[axis];
					}

					if( (startOverDiff <= 0 || mainScrollDiff > 0) && _getNumItems() > 1 ) {
						newMainScrollPos = newMainScrollPosition;

						if(mainScrollDiff > 0 && newMainScrollPosition < _startMainScrollPos.x) {
							newMainScrollPos = _startMainScrollPos.x;
						}

					} else {
						if(_currPanBounds.min.x !== _currPanBounds.max.x) {
							newPanPos = newOffset;
						}
					}

				}


				//
			}

			if(axis === 'x') {

				if(newMainScrollPos !== undefined) {
					_moveMainScroll(newMainScrollPos, true);
					if(newMainScrollPos === _startMainScrollPos.x) {
						_mainScrollShifted = false;
					} else {
						_mainScrollShifted = true;
					}
				}

				if(_currPanBounds.min.x !== _currPanBounds.max.x) {
					if(newPanPos !== undefined) {
						_panOffset.x = newPanPos;
					} else if(!_mainScrollShifted) {
						_panOffset.x += delta.x * panFriction;
					}
				}

				return newMainScrollPos !== undefined;
			}

		}

		if(!_mainScrollAnimating) {
			
			if(!_mainScrollShifted) {
				if(_currZoomLevel > self.currItem.fitRatio) {
					_panOffset[axis] += delta[axis] * panFriction;
				
				}
			}

			
		}
		
	},

	// Pointerdown/touchstart/mousedown handler
	_onDragStart = function(e) {

		// Allow dragging only via left mouse button.
		// As this handler is not added in IE8 - we ignore e.which
		// 
		// http://www.quirksmode.org/js/events_properties.html
		// https://developer.mozilla.org/en-US/docs/Web/API/event.button
		if(e.type === 'mousedown' && e.button > 0  ) {
			return;
		}

		if(_initialZoomRunning) {
			e.preventDefault();
			return;
		}

		if(_oldAndroidTouchEndTimeout && e.type === 'mousedown') {
			return;
		}

		if(_preventDefaultEventBehaviour(e, true)) {
			e.preventDefault();
		}



		_shout('pointerDown');

		if(_pointerEventEnabled) {
			var pointerIndex = framework.arraySearch(_currPointers, e.pointerId, 'id');
			if(pointerIndex < 0) {
				pointerIndex = _currPointers.length;
			}
			_currPointers[pointerIndex] = {x:e.pageX, y:e.pageY, id: e.pointerId};
		}
		


		var startPointsList = _getTouchPoints(e),
			numPoints = startPointsList.length;

		_currentPoints = null;

		_stopAllAnimations();

		// init drag
		if(!_isDragging || numPoints === 1) {

			

			_isDragging = _isFirstMove = true;
			framework.bind(window, _upMoveEvents, self);

			_isZoomingIn = 
				_wasOverInitialZoom = 
				_opacityChanged = 
				_verticalDragInitiated = 
				_mainScrollShifted = 
				_moved = 
				_isMultitouch = 
				_zoomStarted = false;

			_direction = null;

			_shout('firstTouchStart', startPointsList);

			_equalizePoints(_startPanOffset, _panOffset);

			_currPanDist.x = _currPanDist.y = 0;
			_equalizePoints(_currPoint, startPointsList[0]);
			_equalizePoints(_startPoint, _currPoint);

			//_equalizePoints(_startMainScrollPos, _mainScrollPos);
			_startMainScrollPos.x = _slideSize.x * _currPositionIndex;

			_posPoints = [{
				x: _currPoint.x,
				y: _currPoint.y
			}];

			_gestureCheckSpeedTime = _gestureStartTime = _getCurrentTime();

			//_mainScrollAnimationEnd(true);
			_calculatePanBounds( _currZoomLevel, true );
			
			// Start rendering
			_stopDragUpdateLoop();
			_dragUpdateLoop();
			
		}

		// init zoom
		if(!_isZooming && numPoints > 1 && !_mainScrollAnimating && !_mainScrollShifted) {
			_startZoomLevel = _currZoomLevel;
			_zoomStarted = false; // true if zoom changed at least once

			_isZooming = _isMultitouch = true;
			_currPanDist.y = _currPanDist.x = 0;

			_equalizePoints(_startPanOffset, _panOffset);

			_equalizePoints(p, startPointsList[0]);
			_equalizePoints(p2, startPointsList[1]);

			_findCenterOfPoints(p, p2, _currCenterPoint);

			_midZoomPoint.x = Math.abs(_currCenterPoint.x) - _panOffset.x;
			_midZoomPoint.y = Math.abs(_currCenterPoint.y) - _panOffset.y;
			_currPointsDistance = _startPointsDistance = _calculatePointsDistance(p, p2);
		}


	},

	// Pointermove/touchmove/mousemove handler
	_onDragMove = function(e) {

		e.preventDefault();

		if(_pointerEventEnabled) {
			var pointerIndex = framework.arraySearch(_currPointers, e.pointerId, 'id');
			if(pointerIndex > -1) {
				var p = _currPointers[pointerIndex];
				p.x = e.pageX;
				p.y = e.pageY; 
			}
		}

		if(_isDragging) {
			var touchesList = _getTouchPoints(e);
			if(!_direction && !_moved && !_isZooming) {

				if(_mainScrollPos.x !== _slideSize.x * _currPositionIndex) {
					// if main scroll position is shifted – direction is always horizontal
					_direction = 'h';
				} else {
					var diff = Math.abs(touchesList[0].x - _currPoint.x) - Math.abs(touchesList[0].y - _currPoint.y);
					// check the direction of movement
					if(Math.abs(diff) >= DIRECTION_CHECK_OFFSET) {
						_direction = diff > 0 ? 'h' : 'v';
						_currentPoints = touchesList;
					}
				}
				
			} else {
				_currentPoints = touchesList;
			}
		}	
	},
	// 
	_renderMovement =  function() {

		if(!_currentPoints) {
			return;
		}

		var numPoints = _currentPoints.length;

		if(numPoints === 0) {
			return;
		}

		_equalizePoints(p, _currentPoints[0]);

		delta.x = p.x - _currPoint.x;
		delta.y = p.y - _currPoint.y;

		if(_isZooming && numPoints > 1) {
			// Handle behaviour for more than 1 point

			_currPoint.x = p.x;
			_currPoint.y = p.y;
		
			// check if one of two points changed
			if( !delta.x && !delta.y && _isEqualPoints(_currentPoints[1], p2) ) {
				return;
			}

			_equalizePoints(p2, _currentPoints[1]);


			if(!_zoomStarted) {
				_zoomStarted = true;
				_shout('zoomGestureStarted');
			}
			
			// Distance between two points
			var pointsDistance = _calculatePointsDistance(p,p2);

			var zoomLevel = _calculateZoomLevel(pointsDistance);

			// slightly over the of initial zoom level
			if(zoomLevel > self.currItem.initialZoomLevel + self.currItem.initialZoomLevel / 15) {
				_wasOverInitialZoom = true;
			}

			// Apply the friction if zoom level is out of the bounds
			var zoomFriction = 1,
				minZoomLevel = _getMinZoomLevel(),
				maxZoomLevel = _getMaxZoomLevel();

			if ( zoomLevel < minZoomLevel ) {
				
				if(_options.pinchToClose && !_wasOverInitialZoom && _startZoomLevel <= self.currItem.initialZoomLevel) {
					// fade out background if zooming out
					var minusDiff = minZoomLevel - zoomLevel;
					var percent = 1 - minusDiff / (minZoomLevel / 1.2);

					_applyBgOpacity(percent);
					_shout('onPinchClose', percent);
					_opacityChanged = true;
				} else {
					zoomFriction = (minZoomLevel - zoomLevel) / minZoomLevel;
					if(zoomFriction > 1) {
						zoomFriction = 1;
					}
					zoomLevel = minZoomLevel - zoomFriction * (minZoomLevel / 3);
				}
				
			} else if ( zoomLevel > maxZoomLevel ) {
				// 1.5 - extra zoom level above the max. E.g. if max is x6, real max 6 + 1.5 = 7.5
				zoomFriction = (zoomLevel - maxZoomLevel) / ( minZoomLevel * 6 );
				if(zoomFriction > 1) {
					zoomFriction = 1;
				}
				zoomLevel = maxZoomLevel + zoomFriction * minZoomLevel;
			}

			if(zoomFriction < 0) {
				zoomFriction = 0;
			}

			// distance between touch points after friction is applied
			_currPointsDistance = pointsDistance;

			// _centerPoint - The point in the middle of two pointers
			_findCenterOfPoints(p, p2, _centerPoint);
		
			// paning with two pointers pressed
			_currPanDist.x += _centerPoint.x - _currCenterPoint.x;
			_currPanDist.y += _centerPoint.y - _currCenterPoint.y;
			_equalizePoints(_currCenterPoint, _centerPoint);

			_panOffset.x = _calculatePanOffset('x', zoomLevel);
			_panOffset.y = _calculatePanOffset('y', zoomLevel);

			_isZoomingIn = zoomLevel > _currZoomLevel;
			_currZoomLevel = zoomLevel;
			_applyCurrentZoomPan();

		} else {

			// handle behaviour for one point (dragging or panning)

			if(!_direction) {
				return;
			}

			if(_isFirstMove) {
				_isFirstMove = false;

				// subtract drag distance that was used during the detection direction  

				if( Math.abs(delta.x) >= DIRECTION_CHECK_OFFSET) {
					delta.x -= _currentPoints[0].x - _startPoint.x;
				}
				
				if( Math.abs(delta.y) >= DIRECTION_CHECK_OFFSET) {
					delta.y -= _currentPoints[0].y - _startPoint.y;
				}
			}

			_currPoint.x = p.x;
			_currPoint.y = p.y;

			// do nothing if pointers position hasn't changed
			if(delta.x === 0 && delta.y === 0) {
				return;
			}

			if(_direction === 'v' && _options.closeOnVerticalDrag) {
				if(!_canPan()) {
					_currPanDist.y += delta.y;
					_panOffset.y += delta.y;

					var opacityRatio = _calculateVerticalDragOpacityRatio();

					_verticalDragInitiated = true;
					_shout('onVerticalDrag', opacityRatio);

					_applyBgOpacity(opacityRatio);
					_applyCurrentZoomPan();
					return ;
				}
			}

			_pushPosPoint(_getCurrentTime(), p.x, p.y);

			_moved = true;
			_currPanBounds = self.currItem.bounds;
			
			var mainScrollChanged = _panOrMoveMainScroll('x', delta);
			if(!mainScrollChanged) {
				_panOrMoveMainScroll('y', delta);

				_roundPoint(_panOffset);
				_applyCurrentZoomPan();
			}

		}

	},
	
	// Pointerup/pointercancel/touchend/touchcancel/mouseup event handler
	_onDragRelease = function(e) {

		if(_features.isOldAndroid ) {

			if(_oldAndroidTouchEndTimeout && e.type === 'mouseup') {
				return;
			}

			// on Android (v4.1, 4.2, 4.3 & possibly older) 
			// ghost mousedown/up event isn't preventable via e.preventDefault,
			// which causes fake mousedown event
			// so we block mousedown/up for 600ms
			if( e.type.indexOf('touch') > -1 ) {
				clearTimeout(_oldAndroidTouchEndTimeout);
				_oldAndroidTouchEndTimeout = setTimeout(function() {
					_oldAndroidTouchEndTimeout = 0;
				}, 600);
			}
			
		}

		_shout('pointerUp');

		if(_preventDefaultEventBehaviour(e, false)) {
			e.preventDefault();
		}

		var releasePoint;

		if(_pointerEventEnabled) {
			var pointerIndex = framework.arraySearch(_currPointers, e.pointerId, 'id');
			
			if(pointerIndex > -1) {
				releasePoint = _currPointers.splice(pointerIndex, 1)[0];

				if(navigator.msPointerEnabled) {
					var MSPOINTER_TYPES = {
						4: 'mouse', // event.MSPOINTER_TYPE_MOUSE
						2: 'touch', // event.MSPOINTER_TYPE_TOUCH 
						3: 'pen' // event.MSPOINTER_TYPE_PEN
					};
					releasePoint.type = MSPOINTER_TYPES[e.pointerType];

					if(!releasePoint.type) {
						releasePoint.type = e.pointerType || 'mouse';
					}
				} else {
					releasePoint.type = e.pointerType || 'mouse';
				}

			}
		}

		var touchList = _getTouchPoints(e),
			gestureType,
			numPoints = touchList.length;

		if(e.type === 'mouseup') {
			numPoints = 0;
		}

		// Do nothing if there were 3 touch points or more
		if(numPoints === 2) {
			_currentPoints = null;
			return true;
		}

		// if second pointer released
		if(numPoints === 1) {
			_equalizePoints(_startPoint, touchList[0]);
		}				


		// pointer hasn't moved, send "tap release" point
		if(numPoints === 0 && !_direction && !_mainScrollAnimating) {
			if(!releasePoint) {
				if(e.type === 'mouseup') {
					releasePoint = {x: e.pageX, y: e.pageY, type:'mouse'};
				} else if(e.changedTouches && e.changedTouches[0]) {
					releasePoint = {x: e.changedTouches[0].pageX, y: e.changedTouches[0].pageY, type:'touch'};
				}		
			}

			_shout('touchRelease', e, releasePoint);
		}

		// Difference in time between releasing of two last touch points (zoom gesture)
		var releaseTimeDiff = -1;

		// Gesture completed, no pointers left
		if(numPoints === 0) {
			_isDragging = false;
			framework.unbind(window, _upMoveEvents, self);

			_stopDragUpdateLoop();

			if(_isZooming) {
				// Two points released at the same time
				releaseTimeDiff = 0;
			} else if(_lastReleaseTime !== -1) {
				releaseTimeDiff = _getCurrentTime() - _lastReleaseTime;
			}
		}
		_lastReleaseTime = numPoints === 1 ? _getCurrentTime() : -1;
		
		if(releaseTimeDiff !== -1 && releaseTimeDiff < 150) {
			gestureType = 'zoom';
		} else {
			gestureType = 'swipe';
		}

		if(_isZooming && numPoints < 2) {
			_isZooming = false;

			// Only second point released
			if(numPoints === 1) {
				gestureType = 'zoomPointerUp';
			}
			_shout('zoomGestureEnded');
		}

		_currentPoints = null;
		if(!_moved && !_zoomStarted && !_mainScrollAnimating && !_verticalDragInitiated) {
			// nothing to animate
			return;
		}
	
		_stopAllAnimations();

		
		if(!_releaseAnimData) {
			_releaseAnimData = _initDragReleaseAnimationData();
		}
		
		_releaseAnimData.calculateSwipeSpeed('x');


		if(_verticalDragInitiated) {

			var opacityRatio = _calculateVerticalDragOpacityRatio();

			if(opacityRatio < _options.verticalDragRange) {
				self.close();
			} else {
				var initalPanY = _panOffset.y,
					initialBgOpacity = _bgOpacity;

				_animateProp('verticalDrag', 0, 1, 300, framework.easing.cubic.out, function(now) {
					
					_panOffset.y = (self.currItem.initialPosition.y - initalPanY) * now + initalPanY;

					_applyBgOpacity(  (1 - initialBgOpacity) * now + initialBgOpacity );
					_applyCurrentZoomPan();
				});

				_shout('onVerticalDrag', 1);
			}

			return;
		}


		// main scroll 
		if(  (_mainScrollShifted || _mainScrollAnimating) && numPoints === 0) {
			var itemChanged = _finishSwipeMainScrollGesture(gestureType, _releaseAnimData);
			if(itemChanged) {
				return;
			}
			gestureType = 'zoomPointerUp';
		}

		// prevent zoom/pan animation when main scroll animation runs
		if(_mainScrollAnimating) {
			return;
		}
		
		// Complete simple zoom gesture (reset zoom level if it's out of the bounds)  
		if(gestureType !== 'swipe') {
			_completeZoomGesture();
			return;
		}
	
		// Complete pan gesture if main scroll is not shifted, and it's possible to pan current image
		if(!_mainScrollShifted && _currZoomLevel > self.currItem.fitRatio) {
			_completePanGesture(_releaseAnimData);
		}
	},


	// Returns object with data about gesture
	// It's created only once and then reused
	_initDragReleaseAnimationData  = function() {
		// temp local vars
		var lastFlickDuration,
			tempReleasePos;

		// s = this
		var s = {
			lastFlickOffset: {},
			lastFlickDist: {},
			lastFlickSpeed: {},
			slowDownRatio:  {},
			slowDownRatioReverse:  {},
			speedDecelerationRatio:  {},
			speedDecelerationRatioAbs:  {},
			distanceOffset:  {},
			backAnimDestination: {},
			backAnimStarted: {},
			calculateSwipeSpeed: function(axis) {
				

				if( _posPoints.length > 1) {
					lastFlickDuration = _getCurrentTime() - _gestureCheckSpeedTime + 50;
					tempReleasePos = _posPoints[_posPoints.length-2][axis];
				} else {
					lastFlickDuration = _getCurrentTime() - _gestureStartTime; // total gesture duration
					tempReleasePos = _startPoint[axis];
				}
				s.lastFlickOffset[axis] = _currPoint[axis] - tempReleasePos;
				s.lastFlickDist[axis] = Math.abs(s.lastFlickOffset[axis]);
				if(s.lastFlickDist[axis] > 20) {
					s.lastFlickSpeed[axis] = s.lastFlickOffset[axis] / lastFlickDuration;
				} else {
					s.lastFlickSpeed[axis] = 0;
				}
				if( Math.abs(s.lastFlickSpeed[axis]) < 0.1 ) {
					s.lastFlickSpeed[axis] = 0;
				}
				
				s.slowDownRatio[axis] = 0.95;
				s.slowDownRatioReverse[axis] = 1 - s.slowDownRatio[axis];
				s.speedDecelerationRatio[axis] = 1;
			},

			calculateOverBoundsAnimOffset: function(axis, speed) {
				if(!s.backAnimStarted[axis]) {

					if(_panOffset[axis] > _currPanBounds.min[axis]) {
						s.backAnimDestination[axis] = _currPanBounds.min[axis];
						
					} else if(_panOffset[axis] < _currPanBounds.max[axis]) {
						s.backAnimDestination[axis] = _currPanBounds.max[axis];
					}

					if(s.backAnimDestination[axis] !== undefined) {
						s.slowDownRatio[axis] = 0.7;
						s.slowDownRatioReverse[axis] = 1 - s.slowDownRatio[axis];
						if(s.speedDecelerationRatioAbs[axis] < 0.05) {

							s.lastFlickSpeed[axis] = 0;
							s.backAnimStarted[axis] = true;

							_animateProp('bounceZoomPan'+axis,_panOffset[axis], 
								s.backAnimDestination[axis], 
								speed || 300, 
								framework.easing.sine.out, 
								function(pos) {
									_panOffset[axis] = pos;
									_applyCurrentZoomPan();
								}
							);

						}
					}
				}
			},

			// Reduces the speed by slowDownRatio (per 10ms)
			calculateAnimOffset: function(axis) {
				if(!s.backAnimStarted[axis]) {
					s.speedDecelerationRatio[axis] = s.speedDecelerationRatio[axis] * (s.slowDownRatio[axis] + 
												s.slowDownRatioReverse[axis] - 
												s.slowDownRatioReverse[axis] * s.timeDiff / 10);

					s.speedDecelerationRatioAbs[axis] = Math.abs(s.lastFlickSpeed[axis] * s.speedDecelerationRatio[axis]);
					s.distanceOffset[axis] = s.lastFlickSpeed[axis] * s.speedDecelerationRatio[axis] * s.timeDiff;
					_panOffset[axis] += s.distanceOffset[axis];

				}
			},

			panAnimLoop: function() {
				if ( _animations.zoomPan ) {
					_animations.zoomPan.raf = _requestAF(s.panAnimLoop);

					s.now = _getCurrentTime();
					s.timeDiff = s.now - s.lastNow;
					s.lastNow = s.now;
					
					s.calculateAnimOffset('x');
					s.calculateAnimOffset('y');

					_applyCurrentZoomPan();
					
					s.calculateOverBoundsAnimOffset('x');
					s.calculateOverBoundsAnimOffset('y');


					if (s.speedDecelerationRatioAbs.x < 0.05 && s.speedDecelerationRatioAbs.y < 0.05) {

						// round pan position
						_panOffset.x = Math.round(_panOffset.x);
						_panOffset.y = Math.round(_panOffset.y);
						_applyCurrentZoomPan();
						
						_stopAnimation('zoomPan');
						return;
					}
				}

			}
		};
		return s;
	},

	_completePanGesture = function(animData) {
		// calculate swipe speed for Y axis (paanning)
		animData.calculateSwipeSpeed('y');

		_currPanBounds = self.currItem.bounds;
		
		animData.backAnimDestination = {};
		animData.backAnimStarted = {};

		// Avoid acceleration animation if speed is too low
		if(Math.abs(animData.lastFlickSpeed.x) <= 0.05 && Math.abs(animData.lastFlickSpeed.y) <= 0.05 ) {
			animData.speedDecelerationRatioAbs.x = animData.speedDecelerationRatioAbs.y = 0;

			// Run pan drag release animation. E.g. if you drag image and release finger without momentum.
			animData.calculateOverBoundsAnimOffset('x');
			animData.calculateOverBoundsAnimOffset('y');
			return true;
		}

		// Animation loop that controls the acceleration after pan gesture ends
		_registerStartAnimation('zoomPan');
		animData.lastNow = _getCurrentTime();
		animData.panAnimLoop();
	},


	_finishSwipeMainScrollGesture = function(gestureType, _releaseAnimData) {
		var itemChanged;
		if(!_mainScrollAnimating) {
			_currZoomedItemIndex = _currentItemIndex;
		}


		
		var itemsDiff;

		if(gestureType === 'swipe') {
			var totalShiftDist = _currPoint.x - _startPoint.x,
				isFastLastFlick = _releaseAnimData.lastFlickDist.x < 10;

			// if container is shifted for more than MIN_SWIPE_DISTANCE, 
			// and last flick gesture was in right direction
			if(totalShiftDist > MIN_SWIPE_DISTANCE && 
				(isFastLastFlick || _releaseAnimData.lastFlickOffset.x > 20) ) {
				// go to prev item
				itemsDiff = -1;
			} else if(totalShiftDist < -MIN_SWIPE_DISTANCE && 
				(isFastLastFlick || _releaseAnimData.lastFlickOffset.x < -20) ) {
				// go to next item
				itemsDiff = 1;
			}
		}

		var nextCircle;

		if(itemsDiff) {
			
			_currentItemIndex += itemsDiff;

			if(_currentItemIndex < 0) {
				_currentItemIndex = _options.loop ? _getNumItems()-1 : 0;
				nextCircle = true;
			} else if(_currentItemIndex >= _getNumItems()) {
				_currentItemIndex = _options.loop ? 0 : _getNumItems()-1;
				nextCircle = true;
			}

			if(!nextCircle || _options.loop) {
				_indexDiff += itemsDiff;
				_currPositionIndex -= itemsDiff;
				itemChanged = true;
			}
			

			
		}

		var animateToX = _slideSize.x * _currPositionIndex;
		var animateToDist = Math.abs( animateToX - _mainScrollPos.x );
		var finishAnimDuration;


		if(!itemChanged && animateToX > _mainScrollPos.x !== _releaseAnimData.lastFlickSpeed.x > 0) {
			// "return to current" duration, e.g. when dragging from slide 0 to -1
			finishAnimDuration = 333; 
		} else {
			finishAnimDuration = Math.abs(_releaseAnimData.lastFlickSpeed.x) > 0 ? 
									animateToDist / Math.abs(_releaseAnimData.lastFlickSpeed.x) : 
									333;

			finishAnimDuration = Math.min(finishAnimDuration, 400);
			finishAnimDuration = Math.max(finishAnimDuration, 250);
		}

		if(_currZoomedItemIndex === _currentItemIndex) {
			itemChanged = false;
		}
		
		_mainScrollAnimating = true;
		
		_shout('mainScrollAnimStart');

		_animateProp('mainScroll', _mainScrollPos.x, animateToX, finishAnimDuration, framework.easing.cubic.out, 
			_moveMainScroll,
			function() {
				_stopAllAnimations();
				_mainScrollAnimating = false;
				_currZoomedItemIndex = -1;
				
				if(itemChanged || _currZoomedItemIndex !== _currentItemIndex) {
					self.updateCurrItem();
				}
				
				_shout('mainScrollAnimComplete');
			}
		);

		if(itemChanged) {
			self.updateCurrItem(true);
		}

		return itemChanged;
	},

	_calculateZoomLevel = function(touchesDistance) {
		return  1 / _startPointsDistance * touchesDistance * _startZoomLevel;
	},

	// Resets zoom if it's out of bounds
	_completeZoomGesture = function() {
		var destZoomLevel = _currZoomLevel,
			minZoomLevel = _getMinZoomLevel(),
			maxZoomLevel = _getMaxZoomLevel();

		if ( _currZoomLevel < minZoomLevel ) {
			destZoomLevel = minZoomLevel;
		} else if ( _currZoomLevel > maxZoomLevel ) {
			destZoomLevel = maxZoomLevel;
		}

		var destOpacity = 1,
			onUpdate,
			initialOpacity = _bgOpacity;

		if(_opacityChanged && !_isZoomingIn && !_wasOverInitialZoom && _currZoomLevel < minZoomLevel) {
			//_closedByScroll = true;
			self.close();
			return true;
		}

		if(_opacityChanged) {
			onUpdate = function(now) {
				_applyBgOpacity(  (destOpacity - initialOpacity) * now + initialOpacity );
			};
		}

		self.zoomTo(destZoomLevel, 0, 200,  framework.easing.cubic.out, onUpdate);
		return true;
	};


_registerModule('Gestures', {
	publicMethods: {

		initGestures: function() {

			// helper function that builds touch/pointer/mouse events
			var addEventNames = function(pref, down, move, up, cancel) {
				_dragStartEvent = pref + down;
				_dragMoveEvent = pref + move;
				_dragEndEvent = pref + up;
				if(cancel) {
					_dragCancelEvent = pref + cancel;
				} else {
					_dragCancelEvent = '';
				}
			};

			_pointerEventEnabled = _features.pointerEvent;
			if(_pointerEventEnabled && _features.touch) {
				// we don't need touch events, if browser supports pointer events
				_features.touch = false;
			}

			if(_pointerEventEnabled) {
				if(navigator.msPointerEnabled) {
					// IE10 pointer events are case-sensitive
					addEventNames('MSPointer', 'Down', 'Move', 'Up', 'Cancel');
				} else {
					addEventNames('pointer', 'down', 'move', 'up', 'cancel');
				}
			} else if(_features.touch) {
				addEventNames('touch', 'start', 'move', 'end', 'cancel');
				_likelyTouchDevice = true;
			} else {
				addEventNames('mouse', 'down', 'move', 'up');	
			}

			_upMoveEvents = _dragMoveEvent + ' ' + _dragEndEvent  + ' ' +  _dragCancelEvent;
			_downEvents = _dragStartEvent;

			if(_pointerEventEnabled && !_likelyTouchDevice) {
				_likelyTouchDevice = (navigator.maxTouchPoints > 1) || (navigator.msMaxTouchPoints > 1);
			}
			// make variable public
			self.likelyTouchDevice = _likelyTouchDevice; 
			
			_globalEventHandlers[_dragStartEvent] = _onDragStart;
			_globalEventHandlers[_dragMoveEvent] = _onDragMove;
			_globalEventHandlers[_dragEndEvent] = _onDragRelease; // the Kraken

			if(_dragCancelEvent) {
				_globalEventHandlers[_dragCancelEvent] = _globalEventHandlers[_dragEndEvent];
			}

			// Bind mouse events on device with detected hardware touch support, in case it supports multiple types of input.
			if(_features.touch) {
				_downEvents += ' mousedown';
				_upMoveEvents += ' mousemove mouseup';
				_globalEventHandlers.mousedown = _globalEventHandlers[_dragStartEvent];
				_globalEventHandlers.mousemove = _globalEventHandlers[_dragMoveEvent];
				_globalEventHandlers.mouseup = _globalEventHandlers[_dragEndEvent];
			}

			if(!_likelyTouchDevice) {
				// don't allow pan to next slide from zoomed state on Desktop
				_options.allowPanToNext = false;
			}
		}

	}
});


/*>>gestures*/

/*>>show-hide-transition*/
/**
 * show-hide-transition.js:
 *
 * Manages initial opening or closing transition.
 *
 * If you're not planning to use transition for gallery at all,
 * you may set options hideAnimationDuration and showAnimationDuration to 0,
 * and just delete startAnimation function.
 * 
 */


var _showOrHideTimeout,
	_showOrHide = function(item, img, out, completeFn) {

		if(_showOrHideTimeout) {
			clearTimeout(_showOrHideTimeout);
		}

		_initialZoomRunning = true;
		_initialContentSet = true;
		
		// dimensions of small thumbnail {x:,y:,w:}.
		// Height is optional, as calculated based on large image.
		var thumbBounds; 
		if(item.initialLayout) {
			thumbBounds = item.initialLayout;
			item.initialLayout = null;
		} else {
			thumbBounds = _options.getThumbBoundsFn && _options.getThumbBoundsFn(_currentItemIndex);
		}

		var duration = out ? _options.hideAnimationDuration : _options.showAnimationDuration;

		var onComplete = function() {
			_stopAnimation('initialZoom');
			if(!out) {
				_applyBgOpacity(1);
				if(img) {
					img.style.display = 'block';
				}
				framework.addClass(template, 'pswp--animated-in');
				_shout('initialZoom' + (out ? 'OutEnd' : 'InEnd'));
			} else {
				self.template.removeAttribute('style');
				self.bg.removeAttribute('style');
			}

			if(completeFn) {
				completeFn();
			}
			_initialZoomRunning = false;
		};

		// if bounds aren't provided, just open gallery without animation
		if(!duration || !thumbBounds || thumbBounds.x === undefined) {

			_shout('initialZoom' + (out ? 'Out' : 'In') );

			_currZoomLevel = item.initialZoomLevel;
			_equalizePoints(_panOffset,  item.initialPosition );
			_applyCurrentZoomPan();

			template.style.opacity = out ? 0 : 1;
			_applyBgOpacity(1);

			if(duration) {
				setTimeout(function() {
					onComplete();
				}, duration);
			} else {
				onComplete();
			}

			return;
		}

		var startAnimation = function() {
			var closeWithRaf = _closedByScroll,
				fadeEverything = !self.currItem.src || self.currItem.loadError || _options.showHideOpacity;
			
			// apply hw-acceleration to image
			if(item.miniImg) {
				item.miniImg.style.webkitBackfaceVisibility = 'hidden';
			}

			if(!out) {
				_currZoomLevel = thumbBounds.w / item.w;
				_panOffset.x = thumbBounds.x;
				_panOffset.y = thumbBounds.y - _initalWindowScrollY;

				self[fadeEverything ? 'template' : 'bg'].style.opacity = 0.001;
				_applyCurrentZoomPan();
			}

			_registerStartAnimation('initialZoom');
			
			if(out && !closeWithRaf) {
				framework.removeClass(template, 'pswp--animated-in');
			}

			if(fadeEverything) {
				if(out) {
					framework[ (closeWithRaf ? 'remove' : 'add') + 'Class' ](template, 'pswp--animate_opacity');
				} else {
					setTimeout(function() {
						framework.addClass(template, 'pswp--animate_opacity');
					}, 30);
				}
			}

			_showOrHideTimeout = setTimeout(function() {

				_shout('initialZoom' + (out ? 'Out' : 'In') );
				

				if(!out) {

					// "in" animation always uses CSS transitions (instead of rAF).
					// CSS transition work faster here, 
					// as developer may also want to animate other things, 
					// like ui on top of sliding area, which can be animated just via CSS
					
					_currZoomLevel = item.initialZoomLevel;
					_equalizePoints(_panOffset,  item.initialPosition );
					_applyCurrentZoomPan();
					_applyBgOpacity(1);

					if(fadeEverything) {
						template.style.opacity = 1;
					} else {
						_applyBgOpacity(1);
					}

					_showOrHideTimeout = setTimeout(onComplete, duration + 20);
				} else {

					// "out" animation uses rAF only when PhotoSwipe is closed by browser scroll, to recalculate position
					var destZoomLevel = thumbBounds.w / item.w,
						initialPanOffset = {
							x: _panOffset.x,
							y: _panOffset.y
						},
						initialZoomLevel = _currZoomLevel,
						initalBgOpacity = _bgOpacity,
						onUpdate = function(now) {
							
							if(now === 1) {
								_currZoomLevel = destZoomLevel;
								_panOffset.x = thumbBounds.x;
								_panOffset.y = thumbBounds.y  - _currentWindowScrollY;
							} else {
								_currZoomLevel = (destZoomLevel - initialZoomLevel) * now + initialZoomLevel;
								_panOffset.x = (thumbBounds.x - initialPanOffset.x) * now + initialPanOffset.x;
								_panOffset.y = (thumbBounds.y - _currentWindowScrollY - initialPanOffset.y) * now + initialPanOffset.y;
							}
							
							_applyCurrentZoomPan();
							if(fadeEverything) {
								template.style.opacity = 1 - now;
							} else {
								_applyBgOpacity( initalBgOpacity - now * initalBgOpacity );
							}
						};

					if(closeWithRaf) {
						_animateProp('initialZoom', 0, 1, duration, framework.easing.cubic.out, onUpdate, onComplete);
					} else {
						onUpdate(1);
						_showOrHideTimeout = setTimeout(onComplete, duration + 20);
					}
				}
			
			}, out ? 25 : 90); // Main purpose of this delay is to give browser time to paint and
					// create composite layers of PhotoSwipe UI parts (background, controls, caption, arrows).
					// Which avoids lag at the beginning of scale transition.
		};
		startAnimation();

		
	};

/*>>show-hide-transition*/

/*>>items-controller*/
/**
*
* Controller manages gallery items, their dimensions, and their content.
* 
*/

var _items,
	_tempPanAreaSize = {},
	_imagesToAppendPool = [],
	_initialContentSet,
	_initialZoomRunning,
	_controllerDefaultOptions = {
		index: 0,
		errorMsg: '<div class="pswp__error-msg"><a href="%url%" target="_blank">The image</a> could not be loaded.</div>',
		forceProgressiveLoading: false, // TODO
		preload: [1,1],
		getNumItemsFn: function() {
			return _items.length;
		}
	};


var _getItemAt,
	_getNumItems,
	_initialIsLoop,
	_getZeroBounds = function() {
		return {
			center:{x:0,y:0}, 
			max:{x:0,y:0}, 
			min:{x:0,y:0}
		};
	},
	_calculateSingleItemPanBounds = function(item, realPanElementW, realPanElementH ) {
		var bounds = item.bounds;

		// position of element when it's centered
		bounds.center.x = Math.round((_tempPanAreaSize.x - realPanElementW) / 2);
		bounds.center.y = Math.round((_tempPanAreaSize.y - realPanElementH) / 2) + item.vGap.top;

		// maximum pan position
		bounds.max.x = (realPanElementW > _tempPanAreaSize.x) ? 
							Math.round(_tempPanAreaSize.x - realPanElementW) : 
							bounds.center.x;
		
		bounds.max.y = (realPanElementH > _tempPanAreaSize.y) ? 
							Math.round(_tempPanAreaSize.y - realPanElementH) + item.vGap.top : 
							bounds.center.y;
		
		// minimum pan position
		bounds.min.x = (realPanElementW > _tempPanAreaSize.x) ? 0 : bounds.center.x;
		bounds.min.y = (realPanElementH > _tempPanAreaSize.y) ? item.vGap.top : bounds.center.y;
	},
	_calculateItemSize = function(item, viewportSize, zoomLevel) {

		if (item.src && !item.loadError) {
			var isInitial = !zoomLevel;
			
			if(isInitial) {
				if(!item.vGap) {
					item.vGap = {top:0,bottom:0};
				}
				// allows overriding vertical margin for individual items
				_shout('parseVerticalMargin', item);
			}


			_tempPanAreaSize.x = viewportSize.x;
			_tempPanAreaSize.y = viewportSize.y - item.vGap.top - item.vGap.bottom;

			if (isInitial) {
				var hRatio = _tempPanAreaSize.x / item.w;
				var vRatio = _tempPanAreaSize.y / item.h;

				item.fitRatio = hRatio < vRatio ? hRatio : vRatio;
				//item.fillRatio = hRatio > vRatio ? hRatio : vRatio;

				var scaleMode = _options.scaleMode;

				if (scaleMode === 'orig') {
					zoomLevel = 1;
				} else if (scaleMode === 'fit') {
					zoomLevel = item.fitRatio;
				}

				if (zoomLevel > 1) {
					zoomLevel = 1;
				}

				item.initialZoomLevel = zoomLevel;
				
				if(!item.bounds) {
					// reuse bounds object
					item.bounds = _getZeroBounds(); 
				}
			}

			if(!zoomLevel) {
				return;
			}

			_calculateSingleItemPanBounds(item, item.w * zoomLevel, item.h * zoomLevel);

			if (isInitial && zoomLevel === item.initialZoomLevel) {
				item.initialPosition = item.bounds.center;
			}

			return item.bounds;
		} else {
			item.w = item.h = 0;
			item.initialZoomLevel = item.fitRatio = 1;
			item.bounds = _getZeroBounds();
			item.initialPosition = item.bounds.center;

			// if it's not image, we return zero bounds (content is not zoomable)
			return item.bounds;
		}
		
	},

	


	_appendImage = function(index, item, baseDiv, img, preventAnimation, keepPlaceholder) {
		

		if(item.loadError) {
			return;
		}

		if(img) {

			item.imageAppended = true;
			_setImageSize(item, img, (item === self.currItem && _renderMaxResolution) );
			
			baseDiv.appendChild(img);

			if(keepPlaceholder) {
				setTimeout(function() {
					if(item && item.loaded && item.placeholder) {
						item.placeholder.style.display = 'none';
						item.placeholder = null;
					}
				}, 500);
			}
		}
	},
	


	_preloadImage = function(item) {
		item.loading = true;
		item.loaded = false;
		var img = item.img = framework.createEl('pswp__img', 'img');
		var onComplete = function() {
			item.loading = false;
			item.loaded = true;

			if(item.loadComplete) {
				item.loadComplete(item);
			} else {
				item.img = null; // no need to store image object
			}
			img.onload = img.onerror = null;
			img = null;
		};
		img.onload = onComplete;
		img.onerror = function() {
			item.loadError = true;
			onComplete();
		};		

		img.src = item.src;// + '?a=' + Math.random();

		return img;
	},
	_checkForError = function(item, cleanUp) {
		if(item.src && item.loadError && item.container) {

			if(cleanUp) {
				item.container.innerHTML = '';
			}

			item.container.innerHTML = _options.errorMsg.replace('%url%',  item.src );
			return true;
			
		}
	},
	_setImageSize = function(item, img, maxRes) {
		if(!item.src) {
			return;
		}

		if(!img) {
			img = item.container.lastChild;
		}

		var w = maxRes ? item.w : Math.round(item.w * item.fitRatio),
			h = maxRes ? item.h : Math.round(item.h * item.fitRatio);
		
		if(item.placeholder && !item.loaded) {
			item.placeholder.style.width = w + 'px';
			item.placeholder.style.height = h + 'px';
		}

		img.style.width = w + 'px';
		img.style.height = h + 'px';
	},
	_appendImagesPool = function() {

		if(_imagesToAppendPool.length) {
			var poolItem;

			for(var i = 0; i < _imagesToAppendPool.length; i++) {
				poolItem = _imagesToAppendPool[i];
				if( poolItem.holder.index === poolItem.index ) {
					_appendImage(poolItem.index, poolItem.item, poolItem.baseDiv, poolItem.img, false, poolItem.clearPlaceholder);
				}
			}
			_imagesToAppendPool = [];
		}
	};
	


_registerModule('Controller', {

	publicMethods: {

		lazyLoadItem: function(index) {
			index = _getLoopedId(index);
			var item = _getItemAt(index);

			if(!item || ((item.loaded || item.loading) && !_itemsNeedUpdate)) {
				return;
			}

			_shout('gettingData', index, item);

			if (!item.src) {
				return;
			}

			_preloadImage(item);
		},
		initController: function() {
			framework.extend(_options, _controllerDefaultOptions, true);
			self.items = _items = items;
			_getItemAt = self.getItemAt;
			_getNumItems = _options.getNumItemsFn; //self.getNumItems;



			_initialIsLoop = _options.loop;
			if(_getNumItems() < 3) {
				_options.loop = false; // disable loop if less then 3 items
			}

			_listen('beforeChange', function(diff) {

				var p = _options.preload,
					isNext = diff === null ? true : (diff >= 0),
					preloadBefore = Math.min(p[0], _getNumItems() ),
					preloadAfter = Math.min(p[1], _getNumItems() ),
					i;


				for(i = 1; i <= (isNext ? preloadAfter : preloadBefore); i++) {
					self.lazyLoadItem(_currentItemIndex+i);
				}
				for(i = 1; i <= (isNext ? preloadBefore : preloadAfter); i++) {
					self.lazyLoadItem(_currentItemIndex-i);
				}
			});

			_listen('initialLayout', function() {
				self.currItem.initialLayout = _options.getThumbBoundsFn && _options.getThumbBoundsFn(_currentItemIndex);
			});

			_listen('mainScrollAnimComplete', _appendImagesPool);
			_listen('initialZoomInEnd', _appendImagesPool);



			_listen('destroy', function() {
				var item;
				for(var i = 0; i < _items.length; i++) {
					item = _items[i];
					// remove reference to DOM elements, for GC
					if(item.container) {
						item.container = null; 
					}
					if(item.placeholder) {
						item.placeholder = null;
					}
					if(item.img) {
						item.img = null;
					}
					if(item.preloader) {
						item.preloader = null;
					}
					if(item.loadError) {
						item.loaded = item.loadError = false;
					}
				}
				_imagesToAppendPool = null;
			});
		},


		getItemAt: function(index) {
			if (index >= 0) {
				return _items[index] !== undefined ? _items[index] : false;
			}
			return false;
		},

		allowProgressiveImg: function() {
			// 1. Progressive image loading isn't working on webkit/blink 
			//    when hw-acceleration (e.g. translateZ) is applied to IMG element.
			//    That's why in PhotoSwipe parent element gets zoom transform, not image itself.
			//    
			// 2. Progressive image loading sometimes blinks in webkit/blink when applying animation to parent element.
			//    That's why it's disabled on touch devices (mainly because of swipe transition)
			//    
			// 3. Progressive image loading sometimes doesn't work in IE (up to 11).

			// Don't allow progressive loading on non-large touch devices
			return _options.forceProgressiveLoading || !_likelyTouchDevice || _options.mouseUsed || screen.width > 1200; 
			// 1200 - to eliminate touch devices with large screen (like Chromebook Pixel)
		},

		setContent: function(holder, index) {

			if(_options.loop) {
				index = _getLoopedId(index);
			}

			var prevItem = self.getItemAt(holder.index);
			if(prevItem) {
				prevItem.container = null;
			}
	
			var item = self.getItemAt(index),
				img;
			
			if(!item) {
				holder.el.innerHTML = '';
				return;
			}

			// allow to override data
			_shout('gettingData', index, item);

			holder.index = index;
			holder.item = item;

			// base container DIV is created only once for each of 3 holders
			var baseDiv = item.container = framework.createEl('pswp__zoom-wrap'); 

			

			if(!item.src && item.html) {
				if(item.html.tagName) {
					baseDiv.appendChild(item.html);
				} else {
					baseDiv.innerHTML = item.html;
				}
			}

			_checkForError(item);

			_calculateItemSize(item, _viewportSize);
			
			if(item.src && !item.loadError && !item.loaded) {

				item.loadComplete = function(item) {

					// gallery closed before image finished loading
					if(!_isOpen) {
						return;
					}

					// check if holder hasn't changed while image was loading
					if(holder && holder.index === index ) {
						if( _checkForError(item, true) ) {
							item.loadComplete = item.img = null;
							_calculateItemSize(item, _viewportSize);
							_applyZoomPanToItem(item);

							if(holder.index === _currentItemIndex) {
								// recalculate dimensions
								self.updateCurrZoomItem();
							}
							return;
						}
						if( !item.imageAppended ) {
							if(_features.transform && (_mainScrollAnimating || _initialZoomRunning) ) {
								_imagesToAppendPool.push({
									item:item,
									baseDiv:baseDiv,
									img:item.img,
									index:index,
									holder:holder,
									clearPlaceholder:true
								});
							} else {
								_appendImage(index, item, baseDiv, item.img, _mainScrollAnimating || _initialZoomRunning, true);
							}
						} else {
							// remove preloader & mini-img
							if(!_initialZoomRunning && item.placeholder) {
								item.placeholder.style.display = 'none';
								item.placeholder = null;
							}
						}
					}

					item.loadComplete = null;
					item.img = null; // no need to store image element after it's added

					_shout('imageLoadComplete', index, item);
				};

				if(framework.features.transform) {
					
					var placeholderClassName = 'pswp__img pswp__img--placeholder'; 
					placeholderClassName += (item.msrc ? '' : ' pswp__img--placeholder--blank');

					var placeholder = framework.createEl(placeholderClassName, item.msrc ? 'img' : '');
					if(item.msrc) {
						placeholder.src = item.msrc;
					}
					
					_setImageSize(item, placeholder);

					baseDiv.appendChild(placeholder);
					item.placeholder = placeholder;

				}
				

				

				if(!item.loading) {
					_preloadImage(item);
				}


				if( self.allowProgressiveImg() ) {
					// just append image
					if(!_initialContentSet && _features.transform) {
						_imagesToAppendPool.push({
							item:item, 
							baseDiv:baseDiv, 
							img:item.img, 
							index:index, 
							holder:holder
						});
					} else {
						_appendImage(index, item, baseDiv, item.img, true, true);
					}
				}
				
			} else if(item.src && !item.loadError) {
				// image object is created every time, due to bugs of image loading & delay when switching images
				img = framework.createEl('pswp__img', 'img');
				img.style.opacity = 1;
				img.src = item.src;
				_setImageSize(item, img);
				_appendImage(index, item, baseDiv, img, true);
			}
			

			if(!_initialContentSet && index === _currentItemIndex) {
				_currZoomElementStyle = baseDiv.style;
				_showOrHide(item, (img ||item.img) );
			} else {
				_applyZoomPanToItem(item);
			}

			holder.el.innerHTML = '';
			holder.el.appendChild(baseDiv);
		},

		cleanSlide: function( item ) {
			if(item.img ) {
				item.img.onload = item.img.onerror = null;
			}
			item.loaded = item.loading = item.img = item.imageAppended = false;
		}

	}
});

/*>>items-controller*/

/*>>tap*/
/**
 * tap.js:
 *
 * Displatches tap and double-tap events.
 * 
 */

var tapTimer,
	tapReleasePoint = {},
	_dispatchTapEvent = function(origEvent, releasePoint, pointerType) {		
		var e = document.createEvent( 'CustomEvent' ),
			eDetail = {
				origEvent:origEvent, 
				target:origEvent.target, 
				releasePoint: releasePoint, 
				pointerType:pointerType || 'touch'
			};

		e.initCustomEvent( 'pswpTap', true, true, eDetail );
		origEvent.target.dispatchEvent(e);
	};

_registerModule('Tap', {
	publicMethods: {
		initTap: function() {
			_listen('firstTouchStart', self.onTapStart);
			_listen('touchRelease', self.onTapRelease);
			_listen('destroy', function() {
				tapReleasePoint = {};
				tapTimer = null;
			});
		},
		onTapStart: function(touchList) {
			if(touchList.length > 1) {
				clearTimeout(tapTimer);
				tapTimer = null;
			}
		},
		onTapRelease: function(e, releasePoint) {
			if(!releasePoint) {
				return;
			}

			if(!_moved && !_isMultitouch && !_numAnimations) {
				var p0 = releasePoint;
				if(tapTimer) {
					clearTimeout(tapTimer);
					tapTimer = null;

					// Check if taped on the same place
					if ( _isNearbyPoints(p0, tapReleasePoint) ) {
						_shout('doubleTap', p0);
						return;
					}
				}

				if(releasePoint.type === 'mouse') {
					_dispatchTapEvent(e, releasePoint, 'mouse');
					return;
				}

				var clickedTagName = e.target.tagName.toUpperCase();
				// avoid double tap delay on buttons and elements that have class pswp__single-tap
				if(clickedTagName === 'BUTTON' || framework.hasClass(e.target, 'pswp__single-tap') ) {
					_dispatchTapEvent(e, releasePoint);
					return;
				}

				_equalizePoints(tapReleasePoint, p0);

				tapTimer = setTimeout(function() {
					_dispatchTapEvent(e, releasePoint);
					tapTimer = null;
				}, 300);
			}
		}
	}
});

/*>>tap*/

/*>>desktop-zoom*/
/**
 *
 * desktop-zoom.js:
 *
 * - Binds mousewheel event for paning zoomed image.
 * - Manages "dragging", "zoomed-in", "zoom-out" classes.
 *   (which are used for cursors and zoom icon)
 * - Adds toggleDesktopZoom function.
 * 
 */

var _wheelDelta;
	
_registerModule('DesktopZoom', {

	publicMethods: {

		initDesktopZoom: function() {

			if(_oldIE) {
				// no zoom for old IE (<=8)
				return;
			}

			if(_likelyTouchDevice) {
				// if detected hardware touch support, we wait until mouse is used,
				// and only then apply desktop-zoom features
				_listen('mouseUsed', function() {
					self.setupDesktopZoom();
				});
			} else {
				self.setupDesktopZoom(true);
			}

		},

		setupDesktopZoom: function(onInit) {

			_wheelDelta = {};

			var events = 'wheel mousewheel DOMMouseScroll';
			
			_listen('bindEvents', function() {
				framework.bind(template, events,  self.handleMouseWheel);
			});

			_listen('unbindEvents', function() {
				if(_wheelDelta) {
					framework.unbind(template, events, self.handleMouseWheel);
				}
			});

			self.mouseZoomedIn = false;

			var hasDraggingClass,
				updateZoomable = function() {
					if(self.mouseZoomedIn) {
						framework.removeClass(template, 'pswp--zoomed-in');
						self.mouseZoomedIn = false;
					}
					if(_currZoomLevel < 1) {
						framework.addClass(template, 'pswp--zoom-allowed');
					} else {
						framework.removeClass(template, 'pswp--zoom-allowed');
					}
					removeDraggingClass();
				},
				removeDraggingClass = function() {
					if(hasDraggingClass) {
						framework.removeClass(template, 'pswp--dragging');
						hasDraggingClass = false;
					}
				};

			_listen('resize' , updateZoomable);
			_listen('afterChange' , updateZoomable);
			_listen('pointerDown', function() {
				if(self.mouseZoomedIn) {
					hasDraggingClass = true;
					framework.addClass(template, 'pswp--dragging');
				}
			});
			_listen('pointerUp', removeDraggingClass);

			if(!onInit) {
				updateZoomable();
			}
			
		},

		handleMouseWheel: function(e) {

			if(_currZoomLevel <= self.currItem.fitRatio) {
				if( _options.modal ) {

					if (!_options.closeOnScroll || _numAnimations || _isDragging) {
						e.preventDefault();
					} else if(_transformKey && Math.abs(e.deltaY) > 2) {
						// close PhotoSwipe
						// if browser supports transforms & scroll changed enough
						_closedByScroll = true;
						self.close();
					}

				}
				return true;
			}

			// allow just one event to fire
			e.stopPropagation();

			// https://developer.mozilla.org/en-US/docs/Web/Events/wheel
			_wheelDelta.x = 0;

			if('deltaX' in e) {
				if(e.deltaMode === 1 /* DOM_DELTA_LINE */) {
					// 18 - average line height
					_wheelDelta.x = e.deltaX * 18;
					_wheelDelta.y = e.deltaY * 18;
				} else {
					_wheelDelta.x = e.deltaX;
					_wheelDelta.y = e.deltaY;
				}
			} else if('wheelDelta' in e) {
				if(e.wheelDeltaX) {
					_wheelDelta.x = -0.16 * e.wheelDeltaX;
				}
				if(e.wheelDeltaY) {
					_wheelDelta.y = -0.16 * e.wheelDeltaY;
				} else {
					_wheelDelta.y = -0.16 * e.wheelDelta;
				}
			} else if('detail' in e) {
				_wheelDelta.y = e.detail;
			} else {
				return;
			}

			_calculatePanBounds(_currZoomLevel, true);

			var newPanX = _panOffset.x - _wheelDelta.x,
				newPanY = _panOffset.y - _wheelDelta.y;

			// only prevent scrolling in nonmodal mode when not at edges
			if (_options.modal ||
				(
				newPanX <= _currPanBounds.min.x && newPanX >= _currPanBounds.max.x &&
				newPanY <= _currPanBounds.min.y && newPanY >= _currPanBounds.max.y
				) ) {
				e.preventDefault();
			}

			// TODO: use rAF instead of mousewheel?
			self.panTo(newPanX, newPanY);
		},

		toggleDesktopZoom: function(centerPoint) {
			centerPoint = centerPoint || {x:_viewportSize.x/2 + _offset.x, y:_viewportSize.y/2 + _offset.y };

			var doubleTapZoomLevel = _options.getDoubleTapZoom(true, self.currItem);
			var zoomOut = _currZoomLevel === doubleTapZoomLevel;
			
			self.mouseZoomedIn = !zoomOut;

			self.zoomTo(zoomOut ? self.currItem.initialZoomLevel : doubleTapZoomLevel, centerPoint, 333);
			framework[ (!zoomOut ? 'add' : 'remove') + 'Class'](template, 'pswp--zoomed-in');
		}

	}
});


/*>>desktop-zoom*/

/*>>history*/
/**
 *
 * history.js:
 *
 * - Back button to close gallery.
 * 
 * - Unique URL for each slide: example.com/&pid=1&gid=3
 *   (where PID is picture index, and GID and gallery index)
 *   
 * - Switch URL when slides change.
 * 
 */


var _historyDefaultOptions = {
	history: true,
	galleryUID: 1
};

var _historyUpdateTimeout,
	_hashChangeTimeout,
	_hashAnimCheckTimeout,
	_hashChangedByScript,
	_hashChangedByHistory,
	_hashReseted,
	_initialHash,
	_historyChanged,
	_closedFromURL,
	_urlChangedOnce,
	_windowLoc,

	_supportsPushState,

	_getHash = function() {
		return _windowLoc.hash.substring(1);
	},
	_cleanHistoryTimeouts = function() {

		if(_historyUpdateTimeout) {
			clearTimeout(_historyUpdateTimeout);
		}

		if(_hashAnimCheckTimeout) {
			clearTimeout(_hashAnimCheckTimeout);
		}
	},

	// pid - Picture index
	// gid - Gallery index
	_parseItemIndexFromURL = function() {
		var hash = _getHash(),
			params = {};

		if(hash.length < 5) { // pid=1
			return params;
		}

		var i, vars = hash.split('&');
		for (i = 0; i < vars.length; i++) {
			if(!vars[i]) {
				continue;
			}
			var pair = vars[i].split('=');	
			if(pair.length < 2) {
				continue;
			}
			params[pair[0]] = pair[1];
		}
		if(_options.galleryPIDs) {
			// detect custom pid in hash and search for it among the items collection
			var searchfor = params.pid;
			params.pid = 0; // if custom pid cannot be found, fallback to the first item
			for(i = 0; i < _items.length; i++) {
				if(_items[i].pid === searchfor) {
					params.pid = i;
					break;
				}
			}
		} else {
			params.pid = parseInt(params.pid,10)-1;
		}
		if( params.pid < 0 ) {
			params.pid = 0;
		}
		return params;
	},
	_updateHash = function() {

		if(_hashAnimCheckTimeout) {
			clearTimeout(_hashAnimCheckTimeout);
		}


		if(_numAnimations || _isDragging) {
			// changing browser URL forces layout/paint in some browsers, which causes noticable lag during animation
			// that's why we update hash only when no animations running
			_hashAnimCheckTimeout = setTimeout(_updateHash, 500);
			return;
		}
		
		if(_hashChangedByScript) {
			clearTimeout(_hashChangeTimeout);
		} else {
			_hashChangedByScript = true;
		}


		var pid = (_currentItemIndex + 1);
		var item = _getItemAt( _currentItemIndex );
		if(item.hasOwnProperty('pid')) {
			// carry forward any custom pid assigned to the item
			pid = item.pid;
		}
		var newHash = _initialHash + '&'  +  'gid=' + _options.galleryUID + '&' + 'pid=' + pid;

		if(!_historyChanged) {
			if(_windowLoc.hash.indexOf(newHash) === -1) {
				_urlChangedOnce = true;
			}
			// first time - add new hisory record, then just replace
		}

		var newURL = _windowLoc.href.split('#')[0] + '#' +  newHash;

		if( _supportsPushState ) {

			if('#' + newHash !== window.location.hash) {
				history[_historyChanged ? 'replaceState' : 'pushState']('', document.title, newURL);
			}

		} else {
			if(_historyChanged) {
				_windowLoc.replace( newURL );
			} else {
				_windowLoc.hash = newHash;
			}
		}
		
		

		_historyChanged = true;
		_hashChangeTimeout = setTimeout(function() {
			_hashChangedByScript = false;
		}, 60);
	};



	

_registerModule('History', {

	

	publicMethods: {
		initHistory: function() {

			framework.extend(_options, _historyDefaultOptions, true);

			if( !_options.history ) {
				return;
			}


			_windowLoc = window.location;
			_urlChangedOnce = false;
			_closedFromURL = false;
			_historyChanged = false;
			_initialHash = _getHash();
			_supportsPushState = ('pushState' in history);


			if(_initialHash.indexOf('gid=') > -1) {
				_initialHash = _initialHash.split('&gid=')[0];
				_initialHash = _initialHash.split('?gid=')[0];
			}
			

			_listen('afterChange', self.updateURL);
			_listen('unbindEvents', function() {
				framework.unbind(window, 'hashchange', self.onHashChange);
			});


			var returnToOriginal = function() {
				_hashReseted = true;
				if(!_closedFromURL) {

					if(_urlChangedOnce) {
						history.back();
					} else {

						if(_initialHash) {
							_windowLoc.hash = _initialHash;
						} else {
							if (_supportsPushState) {

								// remove hash from url without refreshing it or scrolling to top
								history.pushState('', document.title,  _windowLoc.pathname + _windowLoc.search );
							} else {
								_windowLoc.hash = '';
							}
						}
					}
					
				}

				_cleanHistoryTimeouts();
			};


			_listen('unbindEvents', function() {
				if(_closedByScroll) {
					// if PhotoSwipe is closed by scroll, we go "back" before the closing animation starts
					// this is done to keep the scroll position
					returnToOriginal();
				}
			});
			_listen('destroy', function() {
				if(!_hashReseted) {
					returnToOriginal();
				}
			});
			_listen('firstUpdate', function() {
				_currentItemIndex = _parseItemIndexFromURL().pid;
			});

			

			
			var index = _initialHash.indexOf('pid=');
			if(index > -1) {
				_initialHash = _initialHash.substring(0, index);
				if(_initialHash.slice(-1) === '&') {
					_initialHash = _initialHash.slice(0, -1);
				}
			}
			

			setTimeout(function() {
				if(_isOpen) { // hasn't destroyed yet
					framework.bind(window, 'hashchange', self.onHashChange);
				}
			}, 40);
			
		},
		onHashChange: function() {

			if(_getHash() === _initialHash) {

				_closedFromURL = true;
				self.close();
				return;
			}
			if(!_hashChangedByScript) {

				_hashChangedByHistory = true;
				self.goTo( _parseItemIndexFromURL().pid );
				_hashChangedByHistory = false;
			}
			
		},
		updateURL: function() {

			// Delay the update of URL, to avoid lag during transition, 
			// and to not to trigger actions like "refresh page sound" or "blinking favicon" to often
			
			_cleanHistoryTimeouts();
			

			if(_hashChangedByHistory) {
				return;
			}

			if(!_historyChanged) {
				_updateHash(); // first time
			} else {
				_historyUpdateTimeout = setTimeout(_updateHash, 800);
			}
		}
	
	}
});


/*>>history*/
	framework.extend(self, publicMethods); };
	return PhotoSwipe;
});

/***/ }),

/***/ "./src/client/js/controller/GalleryController.js":
/*!*******************************************************!*\
  !*** ./src/client/js/controller/GalleryController.js ***!
  \*******************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ GalleryController),
/* harmony export */   "photoswipe": () => (/* binding */ photoswipe)
/* harmony export */ });
/* harmony import */ var photoswipe__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! photoswipe */ "./node_modules/photoswipe/dist/photoswipe.js");
/* harmony import */ var photoswipe__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(photoswipe__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var photoswipe_dist_photoswipe_ui_default__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! photoswipe/dist/photoswipe-ui-default */ "./node_modules/photoswipe/dist/photoswipe-ui-default.js");
/* harmony import */ var photoswipe_dist_photoswipe_ui_default__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(photoswipe_dist_photoswipe_ui_default__WEBPACK_IMPORTED_MODULE_1__);



const grooming_items = [
  {
    src:
      "https://res.cloudinary.com/petzmania/image/upload/c_fill,h_756,w_756/v1577903995/grooming/grooming1.jpg",
    w: 756,
    h: 756
  },
  {
    src:
      "https://res.cloudinary.com/petzmania/image/upload/c_fill,h_534,w_534/v1577903999/grooming/groomin2.jpg",
    w: 534,
    h: 534
  },
  {
    src:
      "https://res.cloudinary.com/petzmania/image/upload/c_fill,h_480,w_480/v1577904002/grooming/grooming3.jpg",
    w: 480,
    h: 480
  },
  {
    src:
      "https://res.cloudinary.com/petzmania/image/upload/c_fill,h_720,w_720/v1577904006/grooming/grooming4.jpg",
    w: 720,
    h: 720
  },
  {
    src:
      "https://res.cloudinary.com/petzmania/image/upload/c_fill,h_720,w_720/v1577904009/grooming/grooming5.jpg",
    w: 720,
    h: 720
  },
  {
    src:
      "https://res.cloudinary.com/petzmania/image/upload/c_fill,h_533,w_533/v1577904014/grooming/grooming6.jpg",
    w: 533,
    h: 533
  },
  {
    src:
      "https://res.cloudinary.com/petzmania/image/upload/c_fill,h_720,w_720/v1577904018/grooming/grooming7.jpg",
    w: 720,
    h: 720
  },
  {
    src:
      "https://res.cloudinary.com/petzmania/image/upload/c_fill,h_450,w_450/v1577904021/grooming/grooming8.jpg",
    w: 450,
    h: 450
  }
];
/**
 *
 * @param {"grooming"} gallery Gallery Type
 * @param {string} selector DOM name
 */
function GalleryController(gallery, selector) {
  const pictures = document.querySelector(selector);
  let items;
  if (gallery === "grooming") {
    items = grooming_items;
  }
  for (let i = 0; i < items.length; i++) {
    const div = document.createElement("a");
    div.href = "#";
    div.onclick = e => {
      e.preventDefault();
      photoswipe(items, i);
    };
    const image = document.createElement("img");
    image.src = items[i].src;
    image.className = "img-fluid";
    div.className = "col-md-3 col-6";
    div.append(image);
    pictures.append(div);
  }
}
/**
 *
 * @param {PhotoSwipe.Item[]} items
 * @param {number} index
 */
function photoswipe(items, index) {
  const dom = document.querySelector(".pswp");
  if (dom) {
    const gallery = new (photoswipe__WEBPACK_IMPORTED_MODULE_0___default())(dom, (photoswipe_dist_photoswipe_ui_default__WEBPACK_IMPORTED_MODULE_1___default()), items, {
      index,
      fullscreenEl: true
    });
    gallery.init();
  }
}


/***/ }),

/***/ "./src/client/js/controller/cameraController.js":
/*!******************************************************!*\
  !*** ./src/client/js/controller/cameraController.js ***!
  \******************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "createUrl": () => (/* binding */ createUrl),
/* harmony export */   "changeStream": () => (/* binding */ changeStream)
/* harmony export */ });
/* harmony import */ var _view_cameraView__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../view/cameraView */ "./src/client/js/view/cameraView.js");


const createUrl = (channel) => {
  const url = `wss://stream.petzmania.net:90${channel < 10 ? '0' : '' }${channel}`;
  return url;
}

const changeStream = () => {
  _view_cameraView__WEBPACK_IMPORTED_MODULE_0__.default.changeStream();
}

/***/ }),

/***/ "./src/client/js/controller/carouselController.js":
/*!********************************************************!*\
  !*** ./src/client/js/controller/carouselController.js ***!
  \********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "scrollSlider": () => (/* binding */ scrollSlider)
/* harmony export */ });
const scrollSlider = () => {
  const options = {
    root: null,
    rootMargin: '-50% 0px',
    threshold: [0.0 ,1.0],
  };
  let percent = 0;  
  const logic = (entries, observer) => {
    entries.forEach(entry => {
        let el = entry.target;
        console.log(entry);
        if(entry.isIntersecting === true) {
          document.body.addEventListener('wheel', (e) => {
            if(percent === 0) {
              if(e.deltaY > 0) {
                e.preventDefault();
                percent++;
                el.style.transfrom = `translateX(-${percent}%)`;
              } else {
                e.preventDefault();
                return;
              }
            } else if(percent === 75) {
              observer.disconnect();
              return;
            } else {
              e.preventDefault();
              e.deltaY > 0 ? percent++ : percent--;
              el.style.transform = `translateX(-${percent}%)`;
            }
          });
          let starty = 0;
          let previousDist = 0;
          let dist = 0;
          document.body.addEventListener('touchstart' , (e) => {
            const touch = e.changedTouches[0];
            starty = parseInt(touch.clientY);
          }, {
            passive: false
          });
          document.body.addEventListener('touchmove', (e) => {
            const touch = e.changedTouches[0];
            dist = parseInt(touch.clientY) - starty;
            let move = (dist - previousDist) * 0.01;
            if(percent === 0) {
              if(dist < 0) {
                e.preventDefault();
                percent++;
                el.style.transform = `translateX(-${percent}%)`;
                
              } else {
                e.preventDefault();
                return;
              }
            } else if(percent === 75) {
              observer.disconnect();
            } else {
              e.preventDefault();
              move < 0 ? percent++ : percent--;
              el.style.transform = `translateX(-${percent}%)`;
              
            }
            previousDist = dist;
          }, {
            passive: false,
          });
          window.location.hash = 'feature';
        }
      }
    );
  }
  return new IntersectionObserver(logic, options);
}

/***/ }),

/***/ "./src/client/js/controller/copyController.js":
/*!****************************************************!*\
  !*** ./src/client/js/controller/copyController.js ***!
  \****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "copyInputBox": () => (/* binding */ copyInputBox)
/* harmony export */ });
const copyInputBox = (e) => {
  const inputGroup = e.target.closest('.input-group');
  const inputBox = inputGroup.querySelector('input[type="text"]');
  inputBox.select();
  document.execCommand('copy');
  return inputBox.value;
}

/***/ }),

/***/ "./src/client/js/controller/navController.js":
/*!***************************************************!*\
  !*** ./src/client/js/controller/navController.js ***!
  \***************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _view_navView__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../view/navView */ "./src/client/js/view/navView.js");


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((e) => {
  // CLose the old UI
  _view_navView__WEBPACK_IMPORTED_MODULE_0__.close();
  // Open New UI
  _view_navView__WEBPACK_IMPORTED_MODULE_0__.open(e);
});

/***/ }),

/***/ "./src/client/js/view/base.js":
/*!************************************!*\
  !*** ./src/client/js/view/base.js ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "DOMstrings": () => (/* binding */ DOMstrings)
/* harmony export */ });
const DOMstrings = {
  navDropdown: document.querySelectorAll('.nav__dropdown'),
  navList: document.querySelectorAll('.nav__list'),
  showcaseList: document.querySelector('.showcase-list'),
  UUIDCopyBtn: document.querySelector('#UUIDCopyBtn'),
  noStream: document.querySelector('#no_stream'),
  streamContainer: document.querySelector('#stream__container'),
  changeStreamBtn: document.querySelectorAll('.stream__btn'),
  streamCanvas: document.querySelector('#stream__canvas'),
}

/***/ }),

/***/ "./src/client/js/view/cameraView.js":
/*!******************************************!*\
  !*** ./src/client/js/view/cameraView.js ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _view_base__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../view/base */ "./src/client/js/view/base.js");


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  changeStream: (channel) => {
    const noStream = document.querySelector('#no_stream');
    if(noStream) {
      _view_base__WEBPACK_IMPORTED_MODULE_0__.DOMstrings.streamContainer.removeChild(noStream);
    }
    const canvas = document.querySelector('#stream__canvas');
    if(canvas) {
      canvas.parentElement.removeChild(canvas);
    }
    const canvasHTML = 
    `<div id="stream__box">
      <canvas id="stream__canvas"></canvas>
      <img src="https://res.cloudinary.com/petzmania/image/upload/v1552796920/PetzManiaLogo.png" alt="Logo" id="stream__logo">
    </div>`;
    document.querySelector('#stream__container').insertAdjacentHTML('afterbegin', canvasHTML);
  }
});

/***/ }),

/***/ "./src/client/js/view/navView.js":
/*!***************************************!*\
  !*** ./src/client/js/view/navView.js ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "open": () => (/* binding */ open),
/* harmony export */   "close": () => (/* binding */ close)
/* harmony export */ });
/* harmony import */ var _base__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./base */ "./src/client/js/view/base.js");



const open = (e) => {
  const target = e.target.dataset['toggle'];
  Array.from(_base__WEBPACK_IMPORTED_MODULE_0__.DOMstrings.navList).forEach(cur => {
    if(cur.id === target) {
      cur.style.display = 'block';
    }
  });
}

const close = () => {
  Array.from(_base__WEBPACK_IMPORTED_MODULE_0__.DOMstrings.navList).forEach(cur => cur.style.display = 'none');
}


/***/ }),

/***/ "./src/common/view sync recursive \\.pug$":
/*!**************************************!*\
  !*** ./src/common/view/ sync \.pug$ ***!
  \**************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var map = {
	"./career.pug": "./src/common/view/career.pug",
	"./dog-boarding.pug": "./src/common/view/dog-boarding.pug",
	"./dog-daycare.pug": "./src/common/view/dog-daycare.pug",
	"./dog-grooming.pug": "./src/common/view/dog-grooming.pug",
	"./dog-training.pug": "./src/common/view/dog-training.pug",
	"./dog-wash.pug": "./src/common/view/dog-wash.pug",
	"./emails/new-account.pug": "./src/common/view/emails/new-account.pug",
	"./emails/to-company.pug": "./src/common/view/emails/to-company.pug",
	"./http-error.pug": "./src/common/view/http-error.pug",
	"./index.pug": "./src/common/view/index.pug",
	"./job-success.pug": "./src/common/view/job-success.pug",
	"./job.pug": "./src/common/view/job.pug",
	"./other.pug": "./src/common/view/other.pug",
	"./policies.pug": "./src/common/view/policies.pug",
	"./price.pug": "./src/common/view/price.pug",
	"./sign-up-success.pug": "./src/common/view/sign-up-success.pug",
	"./sign-up.pug": "./src/common/view/sign-up.pug",
	"./support.pug": "./src/common/view/support.pug",
	"./templates/alert.pug": "./src/common/view/templates/alert.pug",
	"./templates/basic-requirements.pug": "./src/common/view/templates/basic-requirements.pug",
	"./templates/boarding-hours.pug": "./src/common/view/templates/boarding-hours.pug",
	"./templates/contact-us.pug": "./src/common/view/templates/contact-us.pug",
	"./templates/features.pug": "./src/common/view/templates/features.pug",
	"./templates/footer.pug": "./src/common/view/templates/footer.pug",
	"./templates/gallery.pug": "./src/common/view/templates/gallery.pug",
	"./templates/get-started.pug": "./src/common/view/templates/get-started.pug",
	"./templates/header.pug": "./src/common/view/templates/header.pug",
	"./templates/holidays.pug": "./src/common/view/templates/holidays.pug",
	"./templates/hours-of-operation.pug": "./src/common/view/templates/hours-of-operation.pug",
	"./templates/nav.pug": "./src/common/view/templates/nav.pug",
	"./templates/price-nav.pug": "./src/common/view/templates/price-nav.pug",
	"./templates/price-table.pug": "./src/common/view/templates/price-table.pug",
	"./templates/review.pug": "./src/common/view/templates/review.pug",
	"./templates/sign-up-module.pug": "./src/common/view/templates/sign-up-module.pug",
	"./tour.pug": "./src/common/view/tour.pug",
	"./verify.pug": "./src/common/view/verify.pug",
	"./webcam-login.pug": "./src/common/view/webcam-login.pug",
	"./webcam.pug": "./src/common/view/webcam.pug"
};


function webpackContext(req) {
	var id = webpackContextResolve(req);
	return __webpack_require__(id);
}
function webpackContextResolve(req) {
	if(!__webpack_require__.o(map, req)) {
		var e = new Error("Cannot find module '" + req + "'");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	}
	return map[req];
}
webpackContext.keys = function webpackContextKeys() {
	return Object.keys(map);
};
webpackContext.resolve = webpackContextResolve;
module.exports = webpackContext;
webpackContext.id = "./src/common/view sync recursive \\.pug$";

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		var scriptUrl;
/******/ 		if (__webpack_require__.g.importScripts) scriptUrl = __webpack_require__.g.location + "";
/******/ 		var document = __webpack_require__.g.document;
/******/ 		if (!scriptUrl && document) {
/******/ 			if (document.currentScript)
/******/ 				scriptUrl = document.currentScript.src
/******/ 			if (!scriptUrl) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				if(scripts.length) scriptUrl = scripts[scripts.length - 1].src
/******/ 			}
/******/ 		}
/******/ 		// When supporting browsers where an automatic publicPath is not supported you must specify an output.publicPath manually via configuration
/******/ 		// or pass an empty string ("") and set the __webpack_public_path__ variable from your code to use your own logic.
/******/ 		if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");
/******/ 		scriptUrl = scriptUrl.replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/");
/******/ 		__webpack_require__.p = scriptUrl + "../";
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
/*!********************************!*\
  !*** ./src/client/js/index.js ***!
  \********************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _scss_main_scss__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../scss/main.scss */ "./src/client/scss/main.scss");
/* harmony import */ var _view_base__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./view/base */ "./src/client/js/view/base.js");
/* harmony import */ var _controller_navController__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./controller/navController */ "./src/client/js/controller/navController.js");
/* harmony import */ var _controller_carouselController__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./controller/carouselController */ "./src/client/js/controller/carouselController.js");
/* harmony import */ var _controller_copyController__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./controller/copyController */ "./src/client/js/controller/copyController.js");
/* harmony import */ var _controller_cameraController__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./controller/cameraController */ "./src/client/js/controller/cameraController.js");
/* harmony import */ var _lixuc_jsmpeg__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! @lixuc/jsmpeg */ "./node_modules/@lixuc/jsmpeg/index.js");
/* harmony import */ var _lixuc_jsmpeg__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(_lixuc_jsmpeg__WEBPACK_IMPORTED_MODULE_6__);
/* harmony import */ var _controller_GalleryController__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./controller/GalleryController */ "./src/client/js/controller/GalleryController.js");


const pug = __webpack_require__("./src/common/view sync recursive \\.pug$")
pug.keys().forEach(pug)

;







let state = {};

(function() {
  $('[data-toggle="tooltip"]').tooltip();
  $("#date").prepend(`${new Date().getFullYear()}`);
})();

window.onload = function() {
  (0,_controller_GalleryController__WEBPACK_IMPORTED_MODULE_7__.default)("grooming", "#gallery__grooming");
};

if (_view_base__WEBPACK_IMPORTED_MODULE_1__.DOMstrings.showcaseList) {
  let observer = _controller_carouselController__WEBPACK_IMPORTED_MODULE_3__.scrollSlider();
  observer.observe(_view_base__WEBPACK_IMPORTED_MODULE_1__.DOMstrings.showcaseList);
}

if (_view_base__WEBPACK_IMPORTED_MODULE_1__.DOMstrings.navDropdown) {
  Array.from(_view_base__WEBPACK_IMPORTED_MODULE_1__.DOMstrings.navDropdown).forEach(cur =>
    cur.addEventListener("click", e => {
      e.preventDefault();
      (0,_controller_navController__WEBPACK_IMPORTED_MODULE_2__.default)(e);
    })
  );
}
if (_view_base__WEBPACK_IMPORTED_MODULE_1__.DOMstrings.UUIDCopyBtn) {
  _view_base__WEBPACK_IMPORTED_MODULE_1__.DOMstrings.UUIDCopyBtn.addEventListener("click", e => {
    e.preventDefault();
    _controller_copyController__WEBPACK_IMPORTED_MODULE_4__.copyInputBox(e);
    alert("The IP Address has been copied!");
  });
}

if (_view_base__WEBPACK_IMPORTED_MODULE_1__.DOMstrings.changeStreamBtn) {
  Array.from(_view_base__WEBPACK_IMPORTED_MODULE_1__.DOMstrings.changeStreamBtn).forEach(cur =>
    cur.addEventListener("click", e => {
      const channel = e.target.children[0].dataset.channel;
      const url = _controller_cameraController__WEBPACK_IMPORTED_MODULE_5__.createUrl(channel);
      _controller_cameraController__WEBPACK_IMPORTED_MODULE_5__.changeStream();
      const newCanvas = document.querySelector("#stream__canvas");
      state.player = null;
      state.player = new _lixuc_jsmpeg__WEBPACK_IMPORTED_MODULE_6__.Player(url, { canvas: newCanvas });
    })
  );
}

})();

/******/ })()
;
//# sourceMappingURL=client.bundle.js.map