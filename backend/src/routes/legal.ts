import { Router } from 'express';

const router = Router();

const html = (title: string, body: string) => `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title} — moodlit</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #faf9f7; color: #1a1a1a; padding: 40px 20px 80px; }
  .wrap { max-width: 720px; margin: 0 auto; }
  h1 { font-size: 26px; font-weight: 700; margin-bottom: 6px; }
  .meta { font-size: 13px; color: #888; margin-bottom: 40px; }
  h2 { font-size: 16px; font-weight: 600; margin-top: 36px; margin-bottom: 10px; }
  p, li { font-size: 14px; line-height: 1.8; color: #333; }
  ul { padding-left: 20px; }
  li { margin-bottom: 4px; }
  a { color: #4a6fa5; }
</style>
</head>
<body>
<div class="wrap">
${body}
</div>
</body>
</html>`;

router.get('/privacy', (_req, res) => {
	res.setHeader('Content-Type', 'text/html; charset=utf-8');
	res.send(
		html(
			'개인정보처리방침',
			`
<h1>개인정보처리방침</h1>
<p class="meta">시행일: 2025년 1월 1일 &nbsp;|&nbsp; 최종 수정: 2025년 1월 1일</p>

<p>moodlit(이하 "서비스")은 이용자의 개인정보를 소중히 여기며, 「개인정보 보호법」을 준수합니다.</p>

<h2>1. 수집하는 개인정보 항목</h2>
<ul>
  <li>회원가입·로그인: 이메일 주소, 닉네임(선택)</li>
  <li>서비스 이용 중 생성: 독서 기록, 독서 리뷰, AI 추천 이력</li>
</ul>

<h2>2. 개인정보 수집·이용 목적</h2>
<ul>
  <li>회원 식별 및 서비스 제공</li>
  <li>독서 기록 저장 및 AI 도서 추천</li>
  <li>서비스 개선 및 오류 대응</li>
</ul>

<h2>3. 개인정보 보관 및 파기</h2>
<p>회원 탈퇴 시 모든 개인정보를 즉시 파기합니다. 법령에 따라 보존이 필요한 정보는 해당 기간 동안 보관 후 파기합니다.</p>

<h2>4. 개인정보 제3자 제공</h2>
<p>서비스는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 다만 아래 업체에 처리를 위탁합니다.</p>
<ul>
  <li>Supabase Inc. — 데이터베이스 및 인증 (미국, EU GDPR 준수)</li>
  <li>OpenAI, L.L.C. — AI 추천 처리 (미국)</li>
</ul>

<h2>5. 이용자의 권리</h2>
<p>이용자는 언제든지 앱 내 마이페이지에서 계정 탈퇴를 통해 모든 개인정보 삭제를 요청할 수 있습니다.</p>

<h2>6. 문의</h2>
<p>개인정보 관련 문의: <a href="mailto:yellowgreen423@gmail.com">yellowgreen423@gmail.com</a></p>
`,
		),
	);
});

router.get('/terms', (_req, res) => {
	res.setHeader('Content-Type', 'text/html; charset=utf-8');
	res.send(
		html(
			'이용약관',
			`
<h1>이용약관</h1>
<p class="meta">시행일: 2025년 1월 1일 &nbsp;|&nbsp; 최종 수정: 2025년 1월 1일</p>

<h2>제1조 (목적)</h2>
<p>본 약관은 moodlit(이하 "서비스")의 이용 조건 및 절차, 이용자와 서비스 운영자의 권리·의무를 규정합니다.</p>

<h2>제2조 (서비스 이용)</h2>
<ul>
  <li>서비스는 만 14세 이상 누구나 이용할 수 있습니다.</li>
  <li>이용자는 정확한 정보로 가입해야 하며, 계정은 본인만 사용할 수 있습니다.</li>
</ul>

<h2>제3조 (금지 행위)</h2>
<ul>
  <li>타인의 계정 도용 또는 서비스 부정 이용</li>
  <li>서비스 운영을 방해하는 행위</li>
  <li>법령 또는 공서양속에 반하는 콘텐츠 등록</li>
</ul>

<h2>제4조 (서비스 변경 및 중단)</h2>
<p>운영자는 서비스 개선을 위해 내용을 변경하거나, 불가피한 사유로 서비스를 일시 중단할 수 있습니다. 중요한 변경 사항은 앱 내 공지로 안내합니다.</p>

<h2>제5조 (면책)</h2>
<p>서비스는 천재지변, 불가항력적 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다. AI 추천 결과는 참고용이며, 그 정확성을 보장하지 않습니다.</p>

<h2>제6조 (준거법)</h2>
<p>본 약관은 대한민국 법령에 따라 해석됩니다.</p>

<h2>문의</h2>
<p><a href="mailto:yellowgreen423@gmail.com">yellowgreen423@gmail.com</a></p>
`,
		),
	);
});

export default router;
