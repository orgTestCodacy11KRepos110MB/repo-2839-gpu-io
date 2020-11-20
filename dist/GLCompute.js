"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GLCompute = void 0;
var DefaultVertexShader_1 = require("./kernels/DefaultVertexShader");
var PassThroughFragmentShader_1 = require("./kernels/PassThroughFragmentShader");
var packFloat32ToRGBA8FragmentShader_1 = require("./kernels/packFloat32ToRGBA8FragmentShader");
var DataLayer_1 = require("./DataLayer");
var GPUProgram_1 = require("./GPUProgram");
var utils_1 = require("./utils");
var fsQuadPositions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
var boundaryPositions = new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]);
var unitCirclePoints = [0, 0];
var NUM_SEGMENTS_CIRCLE = 20;
for (var i = 0; i <= NUM_SEGMENTS_CIRCLE; i++) {
    unitCirclePoints.push(Math.cos(2 * Math.PI * i / NUM_SEGMENTS_CIRCLE), Math.sin(2 * Math.PI * i / NUM_SEGMENTS_CIRCLE));
}
var circlePositions = new Float32Array(unitCirclePoints);
var GLCompute = /** @class */ (function () {
    function GLCompute(gl, canvasEl, options, 
    // Optionally pass in an error callback in case we want to handle errors related to webgl support.
    // e.g. throw up a modal telling user this will not work on their device.
    errorCallback) {
        if (errorCallback === void 0) { errorCallback = function (message) { throw new Error(message); }; }
        this.errorState = false;
        // Save callback in case we run into an error.
        var self = this;
        this.errorCallback = function (message) {
            if (self.errorState) {
                return;
            }
            self.errorState = true;
            if (errorCallback)
                errorCallback(message);
        };
        // Init GL.
        if (!gl) {
            // Init a gl context if not passed in.
            gl = canvasEl.getContext('webgl2', options)
                || canvasEl.getContext('webgl', options)
                || canvasEl.getContext('experimental-webgl', options);
            if (gl === null) {
                this.errorCallback('Unable to initialize WebGL context.');
                return;
            }
        }
        if (utils_1.isWebGL2(gl)) {
            console.log('Using WebGL 2.0 context.');
        }
        else {
            console.log('Using WebGL 1.0 context.');
        }
        this.gl = gl;
        // GL setup.
        // Disable depth testing globally.
        gl.disable(gl.DEPTH_TEST);
        // Set unpack alignment to 1 so we can have textures of arbitrary dimensions.
        // https://stackoverflow.com/questions/51582282/error-when-creating-textures-in-webgl-with-the-rgb-format
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        // TODO: look into more of these: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/pixelStorei
        // // Some implementations of HTMLCanvasElement's or OffscreenCanvas's CanvasRenderingContext2D store color values
        // // internally in premultiplied form. If such a canvas is uploaded to a WebGL texture with the
        // // UNPACK_PREMULTIPLY_ALPHA_WEBGL pixel storage parameter set to false, the color channels will have to be un-multiplied
        // // by the alpha channel, which is a lossy operation. The WebGL implementation therefore can not guarantee that colors
        // // with alpha < 1.0 will be preserved losslessly when first drawn to a canvas via CanvasRenderingContext2D and then
        // // uploaded to a WebGL texture when the UNPACK_PREMULTIPLY_ALPHA_WEBGL pixel storage parameter is set to false.
        // gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        // Init a default vertex shader that just passes through screen coords.
        var defaultVertexShader = utils_1.compileShader(gl, this.errorCallback, DefaultVertexShader_1.default, gl.VERTEX_SHADER);
        if (!defaultVertexShader) {
            this.errorCallback('Unable to initialize fullscreen quad vertex shader.');
            return;
        }
        this.defaultVertexShader = defaultVertexShader;
        // Init a program to pass values from one texture to another.
        this.passThroughProgram = this.initProgram('passThrough', PassThroughFragmentShader_1.default, [
            {
                name: 'u_state',
                value: 0,
                dataType: 'INT',
            },
        ]);
        // Create vertex buffers.
        this.quadPositionsBuffer = this.initVertexBuffer(fsQuadPositions);
        this.boundaryPositionsBuffer = this.initVertexBuffer(boundaryPositions);
        this.circlePositionsBuffer = this.initVertexBuffer(circlePositions);
        // Unbind active buffer.
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        // Canvas setup.
        this.onResize(canvasEl);
        // Log number of textures available.
        var maxTexturesInFragmentShader = this.gl.getParameter(this.gl.MAX_TEXTURE_IMAGE_UNITS);
        console.log(maxTexturesInFragmentShader + " textures max.");
    }
    GLCompute.prototype.initVertexBuffer = function (data) {
        var _a = this, errorCallback = _a.errorCallback, gl = _a.gl;
        var buffer = gl.createBuffer();
        if (!buffer) {
            errorCallback('Unable to allocate gl buffer.');
            return;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        // Add buffer data.
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        return buffer;
    };
    GLCompute.prototype.initProgram = function (name, fragmentShaderOrSource, uniforms, vertexShaderOrSource) {
        var _a = this, gl = _a.gl, errorCallback = _a.errorCallback;
        return new GPUProgram_1.GPUProgram(name, gl, errorCallback, vertexShaderOrSource ? vertexShaderOrSource : this.defaultVertexShader, fragmentShaderOrSource, uniforms);
    };
    ;
    GLCompute.prototype.initDataLayer = function (name, options, writable, numBuffers) {
        if (writable === void 0) { writable = false; }
        if (numBuffers === void 0) { numBuffers = 1; }
        var _a = this, gl = _a.gl, errorCallback = _a.errorCallback;
        return new DataLayer_1.DataLayer(name, gl, options, errorCallback, writable, numBuffers);
    };
    ;
    GLCompute.prototype.onResize = function (canvasEl) {
        var gl = this.gl;
        var width = canvasEl.clientWidth;
        var height = canvasEl.clientHeight;
        // Set correct canvas pixel size.
        // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/By_example/Canvas_size_and_WebGL
        canvasEl.width = width;
        canvasEl.height = height;
        // Save dimensions.
        this.width = width;
        this.height = height;
    };
    ;
    GLCompute.prototype.drawSetup = function (program, fullscreenRender, inputLayers, outputLayer) {
        var gl = this.gl;
        // Check if we are in an error state.
        if (!program.program) {
            return;
        }
        // CAUTION: the order of these next few lines is important.
        // Get a shallow copy of current textures.
        // This line must come before this.setOutput() as it depends on current internal state.
        var inputTextures = inputLayers.map(function (layer) { return layer.getCurrentStateTexture(); });
        // Set output framebuffer.
        // This may modify WebGL internal state.
        this.setOutputLayer(fullscreenRender, inputLayers, outputLayer);
        // Set current program.
        gl.useProgram(program.program);
        // Set input textures.
        for (var i = 0; i < inputTextures.length; i++) {
            gl.activeTexture(gl.TEXTURE0 + i);
            gl.bindTexture(gl.TEXTURE_2D, inputTextures[i]);
        }
    };
    GLCompute.prototype.setOutputLayer = function (fullscreenRender, inputLayers, outputLayer) {
        var _a = this, gl = _a.gl, passThroughProgram = _a.passThroughProgram;
        // Render to screen.
        if (!outputLayer) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            // Resize viewport.
            var _b = this, width_1 = _b.width, height_1 = _b.height;
            gl.viewport(0, 0, width_1, height_1);
            return;
        }
        // Check if output is same as one of input layers.
        if (inputLayers.indexOf(outputLayer) > -1) {
            if (outputLayer.numBuffers === 1) {
                throw new Error("\nCannot use same buffer for input and output of a program.\nTry increasing the number of buffers in your output layer to at least 2 so you\ncan render to nextState using currentState as an input.");
            }
            if (fullscreenRender) {
                // Render and increment buffer so we are rendering to a different target
                // than the input texture.
                outputLayer.bindOutputBuffer(true);
            }
            else {
                // Pass input texture through to output.
                this.step(passThroughProgram, [outputLayer], outputLayer);
                // Render to output without incrementing buffer.
                outputLayer.bindOutputBuffer(false);
            }
        }
        else {
            // Render to current buffer.
            outputLayer.bindOutputBuffer(false);
        }
        // Resize viewport.
        var _c = outputLayer.getDimensions(), width = _c.width, height = _c.height;
        gl.viewport(0, 0, width, height);
    };
    ;
    GLCompute.prototype.setPositionAttribute = function (program) {
        var gl = this.gl;
        // Point attribute to the currently bound VBO.
        var location = gl.getAttribLocation(program.program, 'aPosition');
        gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
        // Enable the attribute.
        gl.enableVertexAttribArray(location);
    };
    GLCompute.prototype.setIndexAttribute = function (program) {
        var gl = this.gl;
        // Point attribute to the currently bound VBO.
        var location = gl.getAttribLocation(program.program, 'aIndex');
        gl.vertexAttribPointer(location, 1, gl.FLOAT, false, 0, 0);
        // Enable the attribute.
        gl.enableVertexAttribArray(location);
    };
    // Step for entire fullscreen quad.
    GLCompute.prototype.step = function (program, inputLayers, outputLayer, // Undefined renders to screen.
    options) {
        if (inputLayers === void 0) { inputLayers = []; }
        var _a = this, gl = _a.gl, errorState = _a.errorState, quadPositionsBuffer = _a.quadPositionsBuffer;
        // Ignore if we are in error state.
        if (errorState) {
            return;
        }
        // Do setup - this must come first.
        this.drawSetup(program, true, inputLayers, outputLayer);
        // Update uniforms and buffers.
        program.setUniform('u_scale', [1, 1], 'FLOAT');
        program.setUniform('u_translation', [0, 0], 'FLOAT');
        gl.bindBuffer(gl.ARRAY_BUFFER, quadPositionsBuffer);
        this.setPositionAttribute(program);
        // Draw.
        if (options === null || options === void 0 ? void 0 : options.shouldBlendAlpha) {
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        }
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.disable(gl.BLEND);
    };
    // Step program only for a strip of px along the boundary.
    GLCompute.prototype.stepBoundary = function (program, inputLayers, outputLayer, // Undefined renders to screen.
    options) {
        if (inputLayers === void 0) { inputLayers = []; }
        var _a = this, gl = _a.gl, errorState = _a.errorState, boundaryPositionsBuffer = _a.boundaryPositionsBuffer;
        // Ignore if we are in error state.
        if (errorState) {
            return;
        }
        // Do setup - this must come first.
        this.drawSetup(program, false, inputLayers, outputLayer);
        // Update uniforms and buffers.
        // Frame needs to be offset and scaled so that all four sides are in viewport.
        // @ts-ignore
        var _b = outputLayer ? outputLayer.getDimensions() : this, width = _b.width, height = _b.height;
        var onePx = [1 / width, 1 / height];
        program.setUniform('u_scale', [1 - onePx[0], 1 - onePx[1]], 'FLOAT');
        program.setUniform('u_translation', onePx, 'FLOAT');
        gl.bindBuffer(gl.ARRAY_BUFFER, boundaryPositionsBuffer);
        this.setPositionAttribute(program);
        // Draw.
        if (options === null || options === void 0 ? void 0 : options.shouldBlendAlpha) {
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        }
        gl.drawArrays(gl.LINE_LOOP, 0, 4);
        gl.disable(gl.BLEND);
    };
    // Step program for all but a strip of px along the boundary.
    GLCompute.prototype.stepNonBoundary = function (program, inputLayers, outputLayer, // Undefined renders to screen.
    options) {
        if (inputLayers === void 0) { inputLayers = []; }
        var _a = this, gl = _a.gl, errorState = _a.errorState, quadPositionsBuffer = _a.quadPositionsBuffer;
        // Ignore if we are in error state.
        if (errorState) {
            return;
        }
        // Do setup - this must come first.
        this.drawSetup(program, false, inputLayers, outputLayer);
        // Update uniforms and buffers.
        // @ts-ignore
        var _b = outputLayer ? outputLayer.getDimensions() : this, width = _b.width, height = _b.height;
        var onePx = [1 / width, 1 / height];
        program.setUniform('u_scale', [1 - 2 * onePx[0], 1 - 2 * onePx[1]], 'FLOAT');
        program.setUniform('u_translation', onePx, 'FLOAT');
        gl.bindBuffer(gl.ARRAY_BUFFER, quadPositionsBuffer);
        this.setPositionAttribute(program);
        // Draw.
        if (options === null || options === void 0 ? void 0 : options.shouldBlendAlpha) {
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        }
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.disable(gl.BLEND);
    };
    // Step program only for a circular spot.
    GLCompute.prototype.stepCircle = function (program, position, // position is in screen space coords.
    radius, // radius is in px.
    inputLayers, outputLayer, // Undefined renders to screen.
    options) {
        if (inputLayers === void 0) { inputLayers = []; }
        var _a = this, gl = _a.gl, errorState = _a.errorState, circlePositionsBuffer = _a.circlePositionsBuffer, width = _a.width, height = _a.height;
        // Ignore if we are in error state.
        if (errorState) {
            return;
        }
        // Do setup - this must come first.
        this.drawSetup(program, false, inputLayers, outputLayer);
        // Update uniforms and buffers.
        program.setUniform('u_scale', [radius / width, radius / height], 'FLOAT');
        program.setUniform('u_translation', [2 * position[0] / width - 1, 2 * position[1] / height - 1], 'FLOAT');
        gl.bindBuffer(gl.ARRAY_BUFFER, circlePositionsBuffer);
        this.setPositionAttribute(program);
        // Draw.
        if (options === null || options === void 0 ? void 0 : options.shouldBlendAlpha) {
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        }
        gl.drawArrays(gl.TRIANGLE_FAN, 0, NUM_SEGMENTS_CIRCLE + 2);
        gl.disable(gl.BLEND);
    };
    GLCompute.prototype.drawPoints = function (program, inputLayers, outputLayer, options) {
        var _a = this, gl = _a.gl, errorState = _a.errorState, width = _a.width, height = _a.height, pointIndexArray = _a.pointIndexArray;
        // Ignore if we are in error state.
        if (errorState) {
            return;
        }
        if (inputLayers.length < 1) {
            throw new Error("Invalid inputLayers for drawPoints on " + program.name + ": must pass a positionDataLayer as first element of inputLayers.");
        }
        var positionLayer = inputLayers[0];
        // Check that numPoints is valid.
        var length = positionLayer.getLength();
        var numPoints = (options === null || options === void 0 ? void 0 : options.numPoints) || length;
        if (numPoints > length) {
            throw new Error("Invalid numPoint " + numPoints + " for positionDataLayer of length " + length + ".");
        }
        // Set default pointSize.
        var pointSize = (options === null || options === void 0 ? void 0 : options.pointSize) || 1;
        // Do setup - this must come first.
        this.drawSetup(program, false, inputLayers, outputLayer);
        // Update uniforms and buffers.
        program.setUniform('u_scale', [1 / width, 1 / height], 'FLOAT');
        program.setUniform('u_pointSize', pointSize, 'FLOAT');
        var positionLayerDimensions = positionLayer.getDimensions();
        program.setUniform('u_positionDimensions', [positionLayerDimensions.width, positionLayerDimensions.height], 'FLOAT');
        if (this.pointIndexBuffer === undefined || (pointIndexArray && pointIndexArray.length < numPoints)) {
            // Have to use float32 array bc int is not supported as a vertex attribute type.
            var indices = new Float32Array(length);
            for (var i = 0; i < length; i++) {
                indices[i] = i;
            }
            this.pointIndexArray = indices;
            this.pointIndexBuffer = this.initVertexBuffer(indices);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.pointIndexBuffer);
        this.setIndexAttribute(program);
        // Draw.
        // Default to blend === true.
        var shouldBlendAlpha = (options === null || options === void 0 ? void 0 : options.shouldBlendAlpha) === false ? false : true;
        if (shouldBlendAlpha) {
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        }
        gl.drawArrays(gl.POINTS, 0, numPoints);
        gl.disable(gl.BLEND);
    };
    GLCompute.prototype.getContext = function () {
        return this.gl;
    };
    GLCompute.prototype.getValues = function (dataLayer) {
        var _a = this, gl = _a.gl, errorCallback = _a.errorCallback, defaultVertexShader = _a.defaultVertexShader;
        var _b = this, packFloat32ToRGBA8Program = _b.packFloat32ToRGBA8Program, packToRGBA8OutputBuffer = _b.packToRGBA8OutputBuffer;
        // Init program if needed.
        if (!packFloat32ToRGBA8Program) {
            packFloat32ToRGBA8Program = new GPUProgram_1.GPUProgram('packFloat32ToRGBA8', gl, errorCallback, defaultVertexShader, packFloat32ToRGBA8FragmentShader_1.default, [
                {
                    name: 'u_floatTexture',
                    value: 0,
                    dataType: 'INT',
                },
            ]);
            this.packFloat32ToRGBA8Program = packFloat32ToRGBA8Program;
        }
        var type = dataLayer.getType();
        if (type !== 'float16' && type !== 'float32') {
            throw new Error("Unsupported type " + type + " for getValues().");
        }
        var dimensions = dataLayer.getDimensions();
        var numComponents = dataLayer.getNumComponent();
        var outputWidth = dimensions.width * numComponents;
        var outputHeight = dimensions.height;
        // Init output buffer if needed.
        if (!packToRGBA8OutputBuffer) {
            packToRGBA8OutputBuffer = new DataLayer_1.DataLayer('packToRGBA8Output', gl, {
                dimensions: [outputWidth, outputHeight],
                type: 'uint8',
                numComponents: 4,
            }, errorCallback, true, 1);
        }
        else {
            // Resize if needed.
            packToRGBA8OutputBuffer.resize([outputWidth, outputHeight]);
        }
        // Pack to bytes.
        packFloat32ToRGBA8Program.setUniform('u_floatTextureDim', [dimensions.width, dimensions.height], 'FLOAT');
        packFloat32ToRGBA8Program.setUniform('u_numFloatComponents', numComponents, 'FLOAT');
        this.step(packFloat32ToRGBA8Program, [dataLayer], packToRGBA8OutputBuffer);
        // Read result.
        if (this.readyToRead()) {
            var pixels = new Uint8Array(outputWidth * outputHeight * 4);
            gl.readPixels(0, 0, outputWidth, outputHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            return new Float32Array(pixels.buffer);
        }
        else {
            throw new Error("Unable to read values from Buffer with status: " + gl.checkFramebufferStatus(gl.FRAMEBUFFER) + ".");
        }
    };
    GLCompute.prototype.readyToRead = function () {
        var gl = this.gl;
        return gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE;
    };
    ;
    GLCompute.prototype.reset = function () {
    };
    ;
    GLCompute.prototype.destroy = function () {
        // TODO: Need to implement this.
    };
    return GLCompute;
}());
exports.GLCompute = GLCompute;
//# sourceMappingURL=GLCompute.js.map