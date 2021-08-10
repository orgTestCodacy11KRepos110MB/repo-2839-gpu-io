precision highp float;
precision highp int;

@import ./Utils;

// Cannot use int vertex attributes: https://stackoverflow.com/questions/27874983/webgl-how-to-use-integer-attributes-in-glsl
attribute float a_internal_index; // Index of point.

uniform sampler2D u_internal_positions; // Texture lookup with position data.
uniform vec2 u_internal_dimensions;
uniform vec2 u_internal_scale;
uniform bool u_internal_positionWithAccumulation;

varying vec2 v_UV;

void main() {
	// Calculate a uv based on the point's index attribute.
	vec2 particleUV = vec2(
		modI(a_internal_index, u_internal_dimensions.x),
		floor(floor(a_internal_index + 0.5) / u_internal_dimensions.x)
	) / u_internal_dimensions;

	// Calculate a global uv for the viewport.
	// Lookup vertex position and scale to [0, 1] range.
	// We have packed a 2D displacement with the position.
	vec4 positionData = texture2D(u_internal_positions, particleUV);
	// position = first two components plus last two components (optional accumulation buffer).
	vec2 positionAbsolute = positionData.rg;
	if (u_internal_positionWithAccumulation) positionAbsolute += positionData.ba;
	v_UV = positionAbsolute * u_internal_scale;

	// Calculate position in [-1, 1] range.
	vec2 position = v_UV * 2.0 - 1.0;

	gl_Position = vec4(position, 0, 1);
}