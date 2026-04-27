// 모바일 앱은 same-origin이 아니므로 모든 출처 허용
// 인증은 Authorization 헤더(JWT)로만 검증한다 — Origin 기반 신뢰는 하지 않음
export const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Max-Age": "86400",
};

// preflight(OPTIONS) 공통 처리
export function handleCorsPreflight(req: Request): Response | null {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}
	return null;
}
