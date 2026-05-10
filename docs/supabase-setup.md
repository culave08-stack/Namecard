# Supabase Setup Guide (Phase 2.5)

Phase 2.5에서 IndexedDB → Supabase로 백엔드 전환되었습니다. 처음 한 번만 따라하시면 됩니다.

## 1. Supabase 프로젝트 준비

이미 프로젝트가 있다면 건너뜁니다. 새로 만든다면:
1. https://supabase.com 가입 → New project
2. DB 비밀번호 설정 (잊지 마세요)
3. Region: Korea/Northeast Asia (Seoul) 권장
4. 프로젝트 생성 후 약 2분 대기

## 2. 스키마 적용

Supabase Dashboard → **SQL Editor** → New query → `docs/supabase-schema.sql` 전체 내용 붙여넣기 → **Run**.

성공 시:
- `public.cards` 테이블 생성
- RLS 정책 4건 (select/insert/update/delete, 모두 본인 row만)
- `card-images` Storage 버킷 (private) 생성
- Storage 정책 3건 (본인 폴더만 업로드/조회/삭제)

확인:
- Database → Tables → `cards` 가 보이는지
- Storage → `card-images` 버킷이 보이는지

## 3. Auth 설정

Authentication → **Sign In / Up** → Email provider:
- **Enable email provider**: ON
- **Confirm email**: 개인 사용이라면 OFF 권장 (가입 즉시 로그인 가능). 외부 공개라면 ON 후 SMTP 설정.

## 4. 환경 변수

### 로컬 (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

Supabase Dashboard → Project Settings → API → `Project URL` 과 `anon public` 키 복사.

### Vercel
Vercel Dashboard → 프로젝트 → Settings → Environment Variables → 동일하게 추가 (Production/Preview/Development 모두 체크) → Save → Deployments → 최신 deployment → ⋯ → Redeploy.

## 5. 로컬에서 확인

```bash
npm run dev
```

http://localhost:3000 → 자동으로 /login 으로 리다이렉트 → 회원가입 → 홈으로 진입.

## 6. 동작 확인 체크리스트

- [ ] /login 에서 회원가입 → 자동 로그인 → / 진입
- [ ] [+ 명함 추가] → 명함 촬영 → 분석 → 저장 → 홈으로 복귀
- [ ] 홈에 직전 카드 표시 (Supabase Storage signed URL)
- [ ] /cards 목록에 저장한 카드 표시
- [ ] /cards/[id] 상세에서 [수정] 동작
- [ ] [삭제] 동작 후 목록에서 제거
- [ ] 로그아웃 → /login 리다이렉트
- [ ] 다른 이메일로 가입 → 첫 사용자의 카드가 안 보임 (RLS 정상)

## 7. 트러블슈팅

| 증상 | 원인 / 해결 |
|---|---|
| / 접속 시 무한 리다이렉트 | env 변수 빠짐 또는 잘못된 키. .env.local + Vercel 모두 확인. |
| 명함 저장 시 "Front image upload failed" | Storage 정책 미설정. SQL 다시 실행. |
| "Card insert failed: new row violates row-level security policy" | RLS 정책 누락. SQL 다시 실행. |
| 이미지가 403 / 만료 | signed URL TTL 1시간. 페이지 새로고침 시 자동 갱신. |

## 8. 비용 감각

Supabase Free tier (현재 사용량):
- DB row: ~500 bytes/명함 → 500MB ÷ 500B ≈ 100만 카드 저장 가능
- Storage: 1GB ÷ 평균 200KB/이미지 ≈ 5,000장 (앞·뒤 합산)
- Auth MAU: 50,000명까지 무료
- Egress: 5GB/월 (signed URL로 다운로드되는 이미지 전송량 포함)

소규모 영업팀 (~수십명, 누적 카드 ~수천장)은 무료 한도로 충분합니다.
