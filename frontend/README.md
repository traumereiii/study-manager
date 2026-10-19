# 차곡 프론트엔드 (Vue 3)

`prototype/`의 브라우저 프로토타입을 Vue 3로 옮긴 화면입니다. 데이터는 **모킹 API**(서버 없이 동작) 또는 **백엔드 서버**(`backend/`)에서 가져오며, 실행 모드로 고릅니다.

## 실행

```powershell
cd frontend
npm install
npm run dev         # 모킹 API — http://localhost:5173 (서버 불필요)
npm run dev:server  # 백엔드 연동 — /api 를 http://localhost:8080 으로 프록시
npm run build       # 타입 검사 + 프로덕션 빌드(서버 연동 모드)
npm test           # 단위 테스트(Vitest)
```

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| 프레임워크 | Vue 3 (`<script setup>`), TypeScript |
| 빌드 | Vite |
| 라우팅 | Vue Router (history 모드) |
| 상태 관리 | Pinia |
| Markdown | marked + DOMPurify (허용한 태그·URL만 표시) |
| 테스트 | Vitest + jsdom |

## 구조

```text
src/
  api/            StudyApi·AuthApi 계약, 모킹(mock/)·HTTP(http/) 구현, 주입 지점(index.ts)
  stores/         auth · books · history · settings · study(학습 세션) · toast · app
  views/          목록 · 상세 · 학습 · 문제 관리 · 문제집 폼 · 문제 폼 · 통계 · 설정
  components/     공통 UI (카드, 마크다운 편집기, 확인 대화상자, 토스트 등)
  composables/    useConfirm, useAlarm, useRequiredBook
  utils/          검증, 마크다운 변환, 검색·페이징, 날짜
  styles/         tokens → base → components → pages (DESIGN.md 기준)
```

## 실행 모드와 로그인

| 모드 | 실행 | 데이터 | 로그인 |
| --- | --- | --- | --- |
| 모킹 | `npm run dev` | 메모리 + `localStorage` | `admin` / `admin1234` (로그인 화면에 안내) |
| 서버 | `npm run dev:server`, 프로덕션 빌드 | `/api/v1` (백엔드) | 서버의 JWT 로그인 |

- 모드는 `VITE_API_MODE`(`http` 이면 서버, 그 외 모킹)로 정합니다. 설정은 `.env.server`(`vite --mode server`), `.env.production`에 있습니다.
- 개발 서버는 `/api` 를 `VITE_PROXY_TARGET`(기본 `http://localhost:8080`)으로 넘기므로 CORS 설정이 필요 없습니다. 프로덕션은 같은 도메인의 nginx 가 `/api` 를 백엔드로 넘기는 구성을 가정하며, 경로가 다르면 `VITE_API_BASE_URL` 로 바꿉니다.
- 로그인하지 않으면 `/login?redirect=…` 로 이동하고, 로그인 후 원래 화면으로 돌아옵니다. 로그아웃은 상단바에 있습니다.
- AccessToken 이 만료되면 RefreshToken 으로 자동 재발급한 뒤 요청을 한 번 다시 보냅니다. 재발급도 실패하면 로그인 화면으로 이동합니다. 토큰은 `localStorage`(`chagok-auth-v1`)에 보관합니다.
- 서버 오류 메시지는 그대로 화면에 표시하고, 평가 요청은 `Idempotency-Key` 와 함께 보내 연결이 끊겨 재시도해도 중복 반영되지 않습니다.

## 라우트

| 경로 | 화면 |
| --- | --- |
| `/books?tab=archived\|deleted` | 문제집 목록 (학습 중·보관함·삭제됨) |
| `/books/new` | 문제집 만들기 |
| `/books/:bookId` | 문제집 상세 |
| `/books/:bookId/edit` | 문제집 수정 |
| `/books/:bookId/manage?q&level&page` | 문제 관리 (검색·레벨 필터·페이징) |
| `/books/:bookId/cards/new` | 문제 만들기 |
| `/books/:bookId/cards/:cardId/edit?from=study` | 문제 수정 |
| `/books/:bookId/study` | 학습 |
| `/stats` · `/settings` | 학습 통계 · 설정 |
| `/login?redirect&reason` | 로그인 (로그인 없이 접근 가능한 유일한 화면) |

## 모킹 데이터

- `src/api/mock/seed.ts`가 예시 문제집 5개(학습 중 3, 보관 1, 삭제 1)와 최근 7일 학습 기록을 만듭니다.
- 변경 내용은 메모리와 `localStorage`(`chagok-vue-mock-v1`)에 반영되어 새로고침 후에도 유지됩니다. 초기화하려면 브라우저 저장소에서 해당 키를 삭제하세요.
- 화면과 스토어는 `StudyApi`(`src/api/types.ts`)·`AuthApi`(`src/api/auth.ts`) 계약에만 의존합니다. 서버 모드의 구현은 `src/api/http/`에 있으며 `src/api/index.ts`가 모드에 맞게 연결합니다.

## 프로토타입과 달라진 점

- 해시 라우팅 대신 history 라우팅을 사용합니다.
- `window.confirm`을 접근 가능한 확인 대화상자로 바꿨습니다.
- 진행 중인 학습 세션은 새로고침하면 복원하지 않고 문제집 상세로 돌아갑니다(기존과 동일).
