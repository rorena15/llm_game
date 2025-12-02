shader_type canvas_item;

uniform sampler2D screen_texture : hint_screen_texture, filter_nearest;
// 스캔라인 개수 (높을수록 촘촘해서 잘 보임)
uniform float scanline_count : hint_range(0, 1800) = 120.0;

void fragment() {
	// 1. 화면 휘어짐 (아주 살짝만 남김: 4.0 -> 9.0)
	vec2 uv = SCREEN_UV;
	uv -= 0.5;
	uv *= 1.01; // 줌인도 살짝만
	uv.x *= 1.0 + pow(abs(uv.y) / 6.0, 2.0);
	uv.y *= 1.0 + pow(abs(uv.x) / 6.0, 2.0);
	uv += 0.5;
	
	// 화면 밖 검은색 처리
	if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
		COLOR = vec4(0.0, 0.0, 0.0, 1.0);
	} else {
		// 2. 스캔라인 (투명도 조절: 글자를 덜 가리게)
		float s = sin(uv.y * scanline_count * 3.14159 * 2.0);
		s = (s * 0.5 + 0.5) * 0.9 + 0.1; 
		vec4 scan_line = vec4(vec3(pow(s, 0.10)), 1.0); // 0.25 -> 0.15 (선을 더 연하게)
		
		// 3. 색수차 (번짐 대폭 감소: 0.002 -> 0.0008)
		float r = texture(screen_texture, uv + vec2(0.0008, 0.0)).r;
		float g = texture(screen_texture, uv).g;
		float b = texture(screen_texture, uv - vec2(0.0008, 0.0)).b;
		
		COLOR = vec4(r, g, b, 1.0) * scan_line;
	}
}