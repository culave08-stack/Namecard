# 명함 스캐너 웹앱 — 설계 문서

- **작성일**: 2026-05-08
- **상태**: 승인됨 (Phase 1 구현 진입 가능)
- **작성자**: 사용자 + Claude Code 협업 브레인스토밍
- **다음 단계**: writing-plans 스킬로 Phase 1 구현 계획 작성

---

## 1. 프로젝트 개요

영업·사업개발 담당자가 행사장에서 받은 명함을 빠르게 디지털화하는 모바일 우선 반응형 웹앱.

**핵심 흐름**: 명함 촬영/업로드 → AI 자동 추출 → 사용자 보완 → IndexedDB 저장 → 엑셀 내보내기.

**타깃 환경**:
- 1차: 모바일 브라우저 (iOS Safari, Android Chrome)
- 보조: 데스크톱 브라우저 (max-width 480~640px 중앙 정렬)
- 인증: 없음 (Phase 1~4 전체에서 단일 사용자 가정, 멀티유저는 향후 별도 스펙)

---

## 2. 기술 스택 (확정)

| 영역 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | Next.js 14 App Router + TypeScript | 사용자 명시 |
| 스타일링 | Tailwind CSS + shadcn/ui | 필요한 컴포넌트만 추가 |
| 카메라 | `getUserMedia` 1차, `<input capture="environment">` 폴백 | |
| AI OCR | Anthropic Claude API (`claude-opus-4-7`) vision | env로 sonnet 다운그레이드 가능 |
| DB (Phase 1~) | IndexedDB via Dexie | Repository 인터페이스로 추상화 → Phase 2+ Supabase 확장 대비 |
| 엑셀 내보내기 | SheetJS (xlsx) | Phase 3 |
| 다국어 | next-intl | Phase 1엔 ko 로케일만, 구조만 미리 |
| PWA | manifest + next-pwa | Phase 4 |
| 폼 | react-hook-form + zod | |
| 테스트 | Vitest + fake-indexeddb | 핵심 로직만, UI는 수동 QA |
| 배포 | Vercel | API Route body 4.5MB 제한 → 1600px 리사이즈로 충분히 수용 |

### AI 모델 결정 근거
사용자가 정확도 우선으로 `claude-opus-4-7` 선택. 호출당 비용은 sonnet 대비 약 5배. 운영 시 트래픽이 늘면 `ANTHROPIC_MODEL` 환경변수로 `claude-sonnet-4-6`로 다운그레이드 가능하게 코드 작성.

---

## 3. 폴더 구조

```
Namecard/
├── app/                              # Next.js App Router
│   ├── (main)/
│   │   ├── page.tsx                  # 홈: [+ 명함 추가] CTA + 직전 저장 카드 1건
│   │   ├── scan/page.tsx             # 캡처→분석→폼 단일 페이지 (step state)
│   │   └── layout.tsx
│   ├── api/scan/route.ts             # Claude vision 프록시 (POST: front+back base64 → JSON)
│   ├── layout.tsx                    # NextIntlProvider, ThemeProvider
│   └── globals.css
│
├── components/
│   ├── ui/                           # shadcn/ui generated
│   ├── scan/
│   │   ├── CameraCapture.tsx         # getUserMedia + file fallback + 86×54 가이드 프레임
│   │   ├── ImagePreview.tsx          # 미리보기 + 재촬영
│   │   ├── ScanProgress.tsx          # 분석중 스피너
│   │   └── BusinessCardForm.tsx      # 추출 결과 편집 폼 (RHF + Zod)
│   └── shared/
│       └── AiBadge.tsx               # ✨ AI 배지
│
├── lib/
│   ├── ai/
│   │   ├── client.ts                 # Anthropic SDK (서버 전용)
│   │   ├── prompt.ts                 # 시스템 프롬프트 + 출력 스키마
│   │   └── parse.ts                  # 응답 → BusinessCard partial 변환 + Zod 검증
│   ├── image/
│   │   └── resize.ts                 # canvas 리사이즈 (1600px 변, JPEG 0.8)
│   ├── db/
│   │   ├── schema.ts                 # Dexie 스키마
│   │   ├── repository.ts             # CardRepository 인터페이스
│   │   └── dexie-repository.ts       # Dexie 구현체
│   └── i18n/
│       ├── config.ts                 # next-intl 설정
│       └── messages/ko.json
│
├── types/
│   └── business-card.ts              # BusinessCard interface, enums
│
├── tests/
│   ├── ai/parse.test.ts
│   ├── image/resize.test.ts
│   └── db/repository.test.ts         # fake-indexeddb
│
├── public/icons/                     # PWA용 (Phase 4)
│
├── .env.local.example                # ANTHROPIC_API_KEY=, ANTHROPIC_MODEL=claude-opus-4-7
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── components.json                   # shadcn 설정
└── vitest.config.ts
```

### 설계 의도
- `lib/db/repository.ts`에 인터페이스 정의 + `dexie-repository.ts`가 구현. Phase 2+ Supabase 도입 시 `supabase-repository.ts`만 새로 작성.
- `app/(main)/scan/page.tsx`에서 `'camera' | 'preview' | 'analyzing' | 'form'` step state로 전체 흐름 처리 (라우팅 복잡도 최소화).
- API 키는 `app/api/scan/route.ts` 서버 핸들러에서만 접근. 클라이언트 번들에 절대 포함하지 않음.

---

## 4. 데이터 모델

```typescript
// types/business-card.ts

export type InterestedService =
  | 'kinderboard'
  | 'lumitiq'
  | 'artbongbong'
  | 'turuturu'
  | 'aidt'
  | 'other';

export type DetectedLanguage = 'ko' | 'en' | 'vi' | 'ja';
export type Confidence = 'low' | 'mid' | 'high';

export interface Country {
  name: string;   // 한글명 ("베트남")
  code: string;   // ISO 2-letter ("VN")
}

export interface BusinessCard {
  id: string;                              // uuid v4
  createdAt: string;                       // ISO 8601
  updatedAt: string;
  frontImage: Blob;                        // IDB에 직접 저장
  backImage?: Blob;
  companyName: string;                     // 필수
  website?: string;
  websiteGuessed?: boolean;
  country?: Country;
  personName: string;                      // 필수
  position?: string;
  industry?: string;
  interestedService: InterestedService;
  interestedServiceOther?: string;
  note?: string;
  detectedLanguage?: DetectedLanguage;
  aiFilledFields: string[];                // ["companyName", "personName", ...]
  aiConfidence?: Partial<Record<keyof BusinessCard, Confidence>>;
}
```

**저장 전략**: 이미지를 base64 문자열이 아닌 `Blob`으로 저장. 화면 렌더 시 `URL.createObjectURL()` → `useEffect` cleanup에서 `revokeObjectURL`.

**폼 초기값 정책**:
- `interestedService`: AI가 추출하지 않는 사용자 의도 필드. 초기값 없음 (`undefined`). Zod로 required 검증 → 사용자가 명시적으로 선택해야 저장 가능.
- `companyName`, `personName`: AI prefill 또는 빈 문자열. Zod로 required 검증.
- `aiFilledFields`: AI 성공 시 채워진 필드 키 배열, 실패/수동 입력 시 빈 배열.

---

## 5. 주요 아키텍처 선택지 (확정)

| 영역 | 채택 | 불채택 대안 (사유) |
|---|---|---|
| 이미지 저장 | IDB에 Blob, 화면 렌더 시 ObjectURL | 썸네일 별도 저장 — Phase 1엔 카드 수 적어 over-engineering |
| 폼 검증 | RHF + Zod | Server Action — 클라이언트 IDB 저장이라 SA 이점 적음 |
| 카메라 | getUserMedia 시도 → 실패 시 file input 자동 폴백 | 무조건 file input — 데스크톱 UX 떨어짐 |
| API 응답 검증 | Claude JSON → Zod 파싱 | 그냥 JSON.parse — LLM 응답 변형에 취약 |
| 상태관리 | 컴포넌트 로컬 + useReducer (scan 흐름) | Zustand — Phase 1 스코프엔 과함 |
| PWA | Phase 1엔 manifest 미설치 | Phase 1부터 SW — 디버깅 비용↑ |

---

## 6. AI OCR 통합

### 6.1 Route Handler 계약

**`POST /api/scan`**

요청:
```json
{
  "frontImage": "data:image/jpeg;base64,...",
  "backImage": "data:image/jpeg;base64,..."
}
```

응답 (200):
```json
{
  "companyName": "...",
  "website": "...",
  "websiteGuessed": false,
  "country": { "name": "베트남", "code": "VN" },
  "personName": "...",
  "position": "...",
  "industry": "...",
  "detectedLanguage": "vi",
  "confidence": {
    "companyName": "high",
    "personName": "high",
    "website": "low"
  }
}
```

응답 (4xx/5xx): `{ "error": string, "code": "ai_failed" | "invalid_image" | "timeout" }`. 클라이언트는 이 경우 "수동 입력으로 진행" 버튼을 노출.

### 6.2 시스템 프롬프트
사용자 스펙에 명시된 프롬프트 그대로 사용. JSON 외 텍스트 금지를 강제.

### 6.3 응답 검증 — Zod 스키마
```typescript
const ScanResultSchema = z.object({
  companyName: z.string().nullable(),
  website: z.string().nullable(),
  websiteGuessed: z.boolean().default(false),
  country: z.object({ name: z.string(), code: z.string().length(2) }).nullable(),
  personName: z.string().nullable(),
  position: z.string().nullable(),
  industry: z.string().nullable(),
  detectedLanguage: z.enum(['ko', 'en', 'vi', 'ja']).nullable(),
  confidence: z.record(z.enum(['low', 'mid', 'high'])).optional(),
});
```
파싱 실패 시 `ai_failed` 응답.

### 6.4 비용/성능 고려
- 클라이언트가 1600px·JPEG 0.8로 리사이즈 후 전송 → base64 ≈ 800KB-1.2MB (Vercel 4.5MB 제한 내)
- 앞면 1장 호출 ≈ 2-4초 (opus 4.7), 앞+뒤 2장 ≈ 4-7초
- 타임아웃: 클라이언트 30초, Vercel hobby maxDuration 60초로 설정

---

## 7. UX 흐름 (Phase 1)

```
[홈]  → [+ 명함 추가] 버튼
   │
   v
[scan: step='camera']  → 카메라 또는 파일 입력 (앞면)
   │                    → 캡처 후 step='preview'
   v
[scan: step='preview']  → 앞면 미리보기 + 뒷면 추가 (선택) + [재촬영] / [분석 시작]
   │                    → step='analyzing'
   v
[scan: step='analyzing'] → 스피너 + "AI가 명함을 분석 중입니다..."
   │                    → 성공: step='form' (prefill됨)
   │                    → 실패: 토스트 + [수동 입력으로 진행] (step='form', prefill 없음)
   v
[scan: step='form']     → 폼 편집 → [저장] → IDB 저장 → 토스트 "저장 완료" → 홈으로 복귀
```

**홈 화면 (Phase 1 임시):**
- 빈 상태: "아직 저장된 명함이 없습니다" + [+ 명함 추가]
- 저장된 카드 있음: "직전 저장 카드: 회사명 / 담당자명" 1건만 표시 (목록 화면은 Phase 2)

**폼 UI 디테일 (Phase 1):**
- AI 자동 채운 필드: 라벨 옆에 작은 ✨ "AI" 배지. 사용자가 입력값을 변경하면 RHF `dirtyFields` 추적해 배지 제거.
- `websiteGuessed === true`인 필드: 입력창 옆에 ⚠️ 아이콘 + "추정값" 라벨. 사용자가 편집 시 `websiteGuessed`를 false로 갱신 + 배지 제거.
- 신뢰도 low 필드: 입력창에 노란 테두리 (`ring-2 ring-yellow-400`).
- `industry` 자동완성: **Phase 1 범위 외**. Phase 1엔 plain text input. Phase 2에서 누적 데이터 기반 suggestion 추가.

---

## 8. 단계별 구현 (Phase 분할)

### Phase 1 — MVP 핵심 흐름 ★ 본 스펙 범위
1. Next.js 14 + TS + Tailwind + ESLint 부트스트랩
2. shadcn/ui init + 필수 컴포넌트(Button, Input, Label, Select, Textarea, Toast)
3. next-intl 구조 + ko 로케일 채움
4. CameraCapture (getUserMedia + 폴백 + 가이드 프레임)
5. 이미지 리사이즈(1600px, JPEG 0.8)
6. `app/api/scan/route.ts` + Claude vision + Zod 검증
7. BusinessCardForm (RHF + Zod, AI 배지, low confidence 노란 테두리)
8. Dexie 스키마 + CardRepository 인터페이스 + dexie-repository 구현
9. 홈 화면에 직전 1건 표시
10. Vitest로 parse / resize / repository 단위 테스트

### Phase 2 — 목록/상세
- 목록 카드 그리드 (회사명·담당자·국가·관심서비스 뱃지·등록일)
- 검색 (회사명/담당자명) + 필터 (관심서비스, 국가) + 정렬 (등록일)
- 상세 페이지 (모든 필드 + 원본 이미지 확대 보기)
- 수정/삭제

### Phase 3 — 엑셀 내보내기
- SheetJS 통합
- 전체/선택 export
- 파일명 `명함목록_YYYYMMDD_HHmm.xlsx`
- 컬럼 순서 + 헤더 스타일 + 너비 자동 조정

### Phase 4 — 다듬기
- en/vi/ja 로케일 추가, UI 토글
- 다크모드 (시스템 + 수동)
- PWA (manifest + service worker, next-pwa)
- 빈 상태 일러스트, 에러 처리 폴리싱
- 모바일 UX 최종 점검

---

## 9. Phase 1 종료 기준 (테스트 시나리오)

| 시나리오 | 기대 동작 |
|---|---|
| 모바일 크롬에서 `pnpm dev` 접속 → [+ 명함 추가] | 후면 카메라 자동 활성화 |
| 명함 촬영 → 앞면 1장만으로 분석 | 3-6초 후 폼에 회사명·담당자·국가 prefill, AI 배지 표시 |
| 앞+뒤 2장으로 분석 | 동일하게 폼 prefill, detectedLanguage 정확 |
| 신뢰도 low 필드 | 노란 테두리 강조 표시 |
| AI 자동 채운 필드 사용자 편집 | AI 배지 사라짐 |
| 저장 후 새로고침 | 홈 화면에 직전 카드 1건 표시 (IDB 영속) |
| 데스크톱 크롬 webcam | 동일 흐름 동작 |
| 데스크톱 파일 업로드 | 동일 흐름 동작 |
| 권한 거부된 모바일 | file input 폴백 자동 동작 |
| AI API 의도적 실패 (잘못된 키) | 토스트 + [수동 입력으로 진행] 버튼 노출 |
| `pnpm test` | 모든 단위 테스트 통과 |

---

## 10. 보안 / 운영 주의

- `ANTHROPIC_API_KEY`는 `.env.local`에만 저장. `.env.local.example`을 git에 커밋.
- API 키는 서버 컴포넌트/Route Handler에서만 import. 클라이언트 번들 0 노출 보장.
- IndexedDB 저장 용량은 브라우저별 quota(보통 수십~수백 MB) 내. Phase 4에서 quota 모니터링 추가 검토.
- Base64 변환·이미지 리사이즈는 클라이언트 메모리 부담이 있으니 작업 후 즉시 GC 가능하도록 변수 스코프 최소화.

---

## 11. 결정 로그 (브레인스토밍 합의)

| # | 결정 | 사유 |
|---|---|---|
| 1 | AI 모델 = `claude-opus-4-7` | 사용자가 정확도 우선 선택. env로 sonnet 다운그레이드 가능. |
| 2 | 배포 = Vercel | Next.js 기본, body 4.5MB 제한 내 수용 가능. |
| 3 | i18n = 구조만 미리, ko만 채움 | Phase 4 도입 비용 절감. |
| 4 | 테스트 = 핵심 로직만 Vitest | MVP 속도와 안정성 균형. |
| 5 | 수동 입력 = AI 실패 시 폴백만 | 메인 흐름은 스캔. 폴백 경로로 회복성 확보. |
| 6 | DB 추상화 = 인터페이스 도입 (Phase 1부터) | Phase 2 Supabase 확장 시 비용 큼 → 미리 분리. |
| 7 | 홈 화면 = 직전 1건 표시 | 저장 직후 시각적 피드백. 목록은 Phase 2. |
