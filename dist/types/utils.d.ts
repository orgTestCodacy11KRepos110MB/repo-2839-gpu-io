import { CompileTimeVars, ErrorCallback, GLSLVersion } from './Constants';
export declare function insertDefinesAfterVersionDeclaration(glslVersion: GLSLVersion, shaderSource: string, defines: CompileTimeVars): string;
export declare function compileShader(gl: WebGLRenderingContext | WebGL2RenderingContext, glslVersion: GLSLVersion, shaderSource: string, shaderType: number, programName: string, _errorCallback: ErrorCallback, defines?: CompileTimeVars): WebGLShader | null;
export declare function initGLProgram(gl: WebGLRenderingContext | WebGL2RenderingContext, fragmentShader: WebGLShader, vertexShader: WebGLShader, name: string, _errorCallback: ErrorCallback): WebGLProgram | undefined;
export declare function isWebGL2(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean;
export declare function isWebGL2Supported(): boolean;
export declare function getMediumpPrecision(): "mediump" | "highp";
export declare function isPowerOf2(value: number): boolean;
export declare function initSequentialFloatArray(length: number): Float32Array;
