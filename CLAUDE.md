# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**차곡**은 문제집 단위로 학습 카드를 관리하고 `알아요 / 몰라요`로 암기 레벨(1~5)을 올리는 개인 학습 앱이다. 저장소에는 같은 제품의 세 구현이 함께 있다.

| 디렉터리 | 역할 | 상태 |
| --- | --- | --- |
| `prototype/` | 바닐라 JS 브라우저 프로토타입(빌드 없음). 제품 동작의 원본 기준 | 유지 |
| `frontend/` | `prototype/`을 포팅한 Vue 3 앱. 모킹 API 또는 백엔드와 연동(로그인 화면 포함) | 현재 UI |
| `backend/` | Kotlin·Spring Boot·MySQL 서버 | 구현됨, 프런트엔드와 연동됨 |

문서는 한국어로 작성한다. `docs/PRD.md`(제품, prototype 기준), `docs/SERVER_PRD.md`(서버 요구사항), `DESIGN.md`(색상·타이포·컴포넌트 규칙)를 새 화면·기능 작업 전에 확인한다. 서버 범위는 `frontend/`의 최신 구현을 우선한다(보관/휴지통/완전 삭제, Markdown·이미지, 카드 통계는 prototype에 없거나 다르다).

루트의 `INFRA.md`는 사용할 리포트 서버(`rpt-safed`)의 구성 메모다. `.gitignore` 대상이므로 커밋하지 않는다(IP·경로 등 운영 정보 포함).

## 명령어

Windows PowerShell 기준이다.

```powershell
# 프런트엔드 (frontend/)
npm install
npm run dev                    # 모킹 API, http://localhost:5173 (로그인 admin / admin1234)
npm run dev:server             # 백엔드 연동(--mode server): /api 를 localhost:8080 으로 프록시
npm run build                  # vue-tsc 타입 검사 + vite build
npm run typecheck
npm test                       # vitest run (jsdom, src/**/*.spec.ts)
npx vitest run src/stores/stores.spec.ts -t "정답 확인 후 평가"   # 단일 파일/테스트

# 서버 (backend/) — JDK 25, Docker 필요
Copy-Item .env.example .env; docker compose up -d mysql
$env:DB_PASSWORD='chagok-local-password'; $env:JWT_SECRET='local-development-only-change-this-jwt-secret-2026'
.\gradlew.bat bootRun          # http://localhost:8080, /actuator/health
.\gradlew.bat test             # Testcontainers가 격리된 MySQL 8을 직접 띄움(로컬 DB·외부 DB 사용 안 함)
.\gradlew.bat test --tests "com.chagok.BackendIntegrationTest"

# 프로토타입 (prototype/)
node verify.cjs                # 화면이 아니라 데이터/로직만 검증
```

린터·포매터는 설정돼 있지 않다.

## 프런트엔드 아키텍처 (`frontend/src`)

- **API 경계가 핵심이다.** 화면과 Pinia 스토어는 `api/types.ts`의 `StudyApi`, `api/auth.ts`의 `AuthApi` 계약에만 의존한다. `api/index.ts`의 `api`·`authApi`는 현재 구현을 위임하는 Proxy이고 `setApi()`/`setAuthApi()`로 교체한다. 구현은 `VITE_API_MODE`로 고른다: 기본(모킹)은 `api/mock/`(메모리 + `localStorage` 키 `chagok-vue-mock-v1`, 시드는 `mock/seed.ts`), `http`(`.env.server`, `.env.production`)는 `api/http/`(`/api/v1`)이다.
- **HTTP 계층(`api/http`)**: `client.ts`가 Bearer 헤더, 401 시 RefreshToken 재발급(동시 요청은 한 번만) 후 1회 재시도, 서버 `{code,message}` → `ApiError` 변환을 맡는다. 재발급까지 실패하면 `api/session.ts`의 `notifySessionExpired`로 `main.ts`가 로그인 화면으로 보낸다. 서버는 알 수 없는 JSON 필드를 거부(`fail-on-unknown-properties`)하므로 `api/http/index.ts`는 요청 본문 필드를 명시해 만든다.
- 인증 흐름: `router/index.ts`의 `beforeEach`가 `auth.restore()` → 비로그인이면 `/login?redirect=` → 로그인 후 `app.bootstrap()`으로 데이터를 불러온다. 로그인 화면은 `meta.public` 이며 `App.vue`가 사이드바·상단바 없이 렌더한다.
- 스토어 테스트는 매번 `setApi(createMockApi({ storage: null }))`(인증은 `setAuthApi(createMockAuthApi(null))`)로 격리한다. HTTP 계층 테스트는 가짜 `fetch`를 주입한다(`api/http/http.spec.ts`).
- 데이터 로드: 라우터 가드가 로그인 후 `stores/app.ts`의 `bootstrap()`(전체 문제집·카드·이력·설정을 한 번에 로드)을 호출하고, 로그아웃·세션 만료 시 `reset()`으로 비운다. `main.ts`는 첫 이동이 끝난 뒤 마운트하고 처리하지 못한 오류는 토스트로 보여 준다.
- 학습 세션 상태(진행 위치·타이머 마감 시각·남은 시간)는 `stores/study.ts`에만 있다. 학습 중 카드 수정 화면(`?from=study`)으로 나갔다 오면 `suspendTimer`/`armTimer`로 남은 시간을 이어가므로, 타이머 로직을 건드릴 때 이 흐름을 깨지 않는다.
- 입력 검증은 `utils/validation.ts`(`ValidationError`)에 모여 있고 서버 `InputValidation.kt`와 같은 규칙을 가져야 한다(이름 1~60자, 선다형 보기 4개·서로 다름, 빈칸형 밑줄, 제한시간 0~600, 이미지 PNG/JPEG/WebP 2MB 등). 규칙을 바꾸면 양쪽을 함께 수정한다.
- Markdown은 `utils/markdown.ts`의 `renderMarkdown`(marked + DOMPurify)만 거친다. 이미지는 본문의 `asset:<id>` 참조를 카드의 `assets` 맵(Data URL)으로 치환하고, 허용된 data URL만 표시한다. `v-html`에 다른 경로의 HTML을 넣지 않는다.
- 스타일은 `styles/tokens → base → components → pages` 순이며 값은 `DESIGN.md` 토큰을 따른다.
- 라우팅은 history 모드다(prototype은 해시 라우팅). 문제 관리의 검색·레벨·페이지는 URL 쿼리(`q`, `level`, `page`)가 상태다.

## 서버 아키텍처 (`backend/src/main/kotlin/com/chagok`)

- 패키지: `auth`(JWT 로그인/재발급/로그아웃), `study`(엔티티·DTO·서비스·컨트롤러), `common`(오류 응답, 요청 크기 필터). 스키마는 Flyway(`db/migration/V1__initial_schema.sql`)가 만들고 Hibernate는 검증만 한다. 시드 데이터는 만들지 않는다.
- **API는 프런트엔드 `StudyApi` DTO와 같은 모양**을 반환한다(`GET /api/v1/bootstrap`이 전체 조회). DTO나 필드를 바꾸면 `frontend/src/types/index.ts`와 `api/types.ts`를 같이 맞춘다.
- 인증: 계정은 `admin / admin1234` 고정, 단일 사용자 공간. 비밀번호는 BCrypt, 토큰은 HS256 JWT(Access 2시간, Refresh 최초 로그인 기준 달력 1개월). Refresh는 DB에 SHA-256 해시로만 저장하고 재발급 시 회전하며(이전 토큰 거부, 만료일 연장 없음), 업무 API는 요청마다 로그인 세션 폐기 여부를 확인한다. 쿠키·HTTP 세션은 쓰지 않는다.
- `StudyService`는 클래스 전체가 `READ_COMMITTED` 트랜잭션이고 문제집·카드를 `lockById`(비관적 잠금)로 읽는다. 동시 평가·삭제의 일관성이 이 잠금 순서에 의존하므로 조회 방식을 바꿀 때 주의한다. `bootstrap`만 `REPEATABLE_READ` 읽기 전용이다.
- 평가(`POST /evaluations`)는 `Idempotency-Key` 헤더가 필수이며 같은 키·본문 재시도는 최초 응답을 재현한다. 카드 삭제·레벨 초기화 후에도 평가 이력은 보존한다.
- 책임 분담: 정답 공개·제한시간·학습 순서·통계 집계는 **프런트엔드**가 담당하고, 서버는 평가·레벨·완료 선언을 저장만 한다(서버 학습 세션 없음). 날짜는 `Asia/Seoul`, 시각은 UTC ISO 문자열.
- 본문·이미지·평가 원문은 로그에 남기지 않는다. 이미지는 Data URL 맵으로 주고받고 DB에는 카드와 별도 테이블로 저장한다.
- 환경변수 `DB_PASSWORD`, `JWT_SECRET`(32바이트 이상)이 없으면 서버가 시작되지 않는다. 기본 `DB_USERNAME=chagok`, `CORS_ORIGINS=http://localhost:5173`.

## 작업 시 주의

- `.mcp.json`에는 비밀값을 넣지 않는다(이전에 DB 비밀번호가 스테이징된 적이 있다). 커밋 전 `git diff --cached`로 확인한다.
- Windows 환경이라 git이 LF→CRLF 경고를 낸다. 내용 문제가 아니다.
