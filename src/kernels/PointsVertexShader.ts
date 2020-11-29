// Vertex shader for points.
export default `
precision highp float;
precision highp int;

// Cannot use int vertex attributes: https://stackoverflow.com/questions/27874983/webgl-how-to-use-integer-attributes-in-glsl
attribute float aIndex; // Index of point.

uniform sampler2D u_positions; // Texture lookup with position data.
uniform vec2 u_positionDimensions;
uniform vec2 u_scale;
uniform float u_pointSize;

varying vec2 vUV;
varying vec2 vParticleUV;

/**
 * Returns accurate MOD when arguments are approximate integers.
 */
float modI(float a, float b) {
    float m = a - floor((a + 0.5) / b) * b;
    return floor(m + 0.5);
}

void main() {
	// Calculate a uv based on the point's index attribute.
	vParticleUV = vec2(modI(aIndex, u_positionDimensions.x), floor(floor(aIndex + 0.5) / u_positionDimensions.x)) / u_positionDimensions;

	// Calculate a global uv for the viewport.
	// Lookup vertex position and scale to [0, 1] range.
	vUV = texture2D(u_positions, vParticleUV).xy * u_scale;

	// Calculate position in [-1, 1] range.
	vec2 position = vUV * 2.0 - 1.0;

	gl_PointSize = u_pointSize;
	gl_Position = vec4(position, 0, 1);
}
`;