import { CompileTimeVars, ErrorCallback, GLSLPrecision, GLSLVersion } from './Constants';
export declare function makeShaderHeader(glslVersion: GLSLVersion, intPrecision: GLSLPrecision, floatPrecision: GLSLPrecision, defines?: CompileTimeVars): string;
export declare function compileShader(gl: WebGLRenderingContext | WebGL2RenderingContext, glslVersion: GLSLVersion, intPrecision: GLSLPrecision, floatPrecision: GLSLPrecision, shaderSource: string, shaderType: number, programName: string, _errorCallback: ErrorCallback, defines?: CompileTimeVars): WebGLShader | null;
export declare function initGLProgram(gl: WebGLRenderingContext | WebGL2RenderingContext, fragmentShader: WebGLShader, vertexShader: WebGLShader, name: string, _errorCallback: ErrorCallback): WebGLProgram | undefined;
export declare function isWebGL2(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean;
export declare function isWebGL2Supported(): boolean;
export declare function isHighpSupportedInVertexShader(): boolean;
export declare function isHighpSupportedInFragmentShader(): boolean;
export declare function getVertexShaderMediumpPrecision(): "highp" | "mediump";
export declare function getFragmentShaderMediumpPrecision(): "highp" | "mediump";
export declare function isPowerOf2(value: number): boolean;
export declare function initSequentialFloatArray(length: number): Float32Array;
export declare function preprocessVertShader(shaderSource: string, glslVersion: GLSLVersion): string;
export declare function preprocessFragShader(shaderSource: string, glslVersion: GLSLVersion): string;