// 계정 탈퇴 Edge Function
// Google Play 정책 준수를 위한 self-service 계정 삭제
// CASCADE 설정으로 auth.users 삭제 시 public.users / user_books / reviews 자동 정리

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

// Edge Runtime이 자동 주입하는 환경변수만 사용 — 하드코딩 금지
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
	Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// 응답 일반화 — Supabase 내부 에러 메시지를 그대로 노출하지 않기 위함
function jsonResponse(
	body: Record<string, unknown>,
	status: number,
): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...corsHeaders, "Content-Type": "application/json" },
	});
}

Deno.serve(async (req: Request) => {
	// preflight
	const preflight = handleCorsPreflight(req);
	if (preflight) return preflight;

	// POST만 허용 — IDOR 방지를 위해 body로 user_id를 받지 않음
	if (req.method !== "POST") {
		return jsonResponse(
			{ success: false, message: "허용되지 않은 요청입니다." },
			405,
		);
	}

	// 환경변수 누락 방어 — 운영 배포 시 자동 주입되지만 방어적으로 체크
	if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
		console.error("[delete-account] missing required env vars");
		return jsonResponse(
			{ success: false, message: "서버 설정 오류입니다." },
			500,
		);
	}

	// Authorization 헤더 추출 — 호출자 본인만 자기 계정을 삭제할 수 있음
	const authHeader = req.headers.get("Authorization") ?? "";
	const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
	if (!jwt) {
		return jsonResponse(
			{ success: false, message: "인증이 필요합니다." },
			401,
		);
	}

	// 1) JWT 검증용 클라이언트 (anon 키 + 호출자 토큰)
	const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
		global: { headers: { Authorization: `Bearer ${jwt}` } },
		auth: { persistSession: false, autoRefreshToken: false },
	});

	const { data: userData, error: userErr } = await userClient.auth.getUser(jwt);
	if (userErr || !userData?.user) {
		// 만료/위조 토큰 — 일반화된 메시지로 응답
		return jsonResponse(
			{ success: false, message: "인증이 유효하지 않습니다." },
			401,
		);
	}

	const userId = userData.user.id;

	// 2) admin 권한 클라이언트 — Service Role 키는 절대 응답·로그에 노출 금지
	const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		auth: { persistSession: false, autoRefreshToken: false },
	});

	// 3) 계정 삭제 (CASCADE로 관련 테이블 정리됨)
	const { error: deleteErr } = await adminClient.auth.admin.deleteUser(userId);
	if (deleteErr) {
		// 내부 메시지는 서버 로그에만, 클라이언트엔 일반화된 메시지
		console.error(
			`[delete-account] failed userId=${userId} code=${
				// deno-lint-ignore no-explicit-any
				(deleteErr as any).status ?? "unknown"
			}`,
		);
		return jsonResponse(
			{ success: false, message: "계정 삭제에 실패했습니다." },
			500,
		);
	}

	// PII(이메일 등)는 로그에 남기지 않음 — UUID만
	console.log(`[delete-account] success userId=${userId}`);

	// NOTE: 동일 사용자의 단시간 반복 호출은 Supabase Edge Function 기본 rate limit으로
	// 1차 방어된다. 추가로 user_id 기반 중복 호출 차단이 필요하면 Redis/Upstash나
	// 별도 테이블에 in-flight 플래그를 두는 방식을 검토할 것. 현재 트래픽 규모에서는
	// 과도한 구현으로 판단해 보류.

	return jsonResponse({ success: true }, 200);
});
