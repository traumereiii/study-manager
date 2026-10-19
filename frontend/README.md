# 차곡 프론트엔드 (Vue 3)

`prototype/`의 브라우저 프로토타입을 Vue 3로 옮긴 화면입니다. 서버는 아직 없으며 데이터는 **모킹 API**가 제공합니다.

## 실행

```powershell
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # 타입 검사 + 프로덕션 빌드
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
  api/            StudyApi 계약(types.ts), 모킹 구현(mock/), 주입 지점(index.ts)
  stores/         books · history · settings · study(학습 세션) · toast · app
  views/          목록 · 상세 · 학습 · 문제 관리 · 문제집 폼 · 문제 폼 · 통계 · 설정
  components/     공통 UI (카드, 마크다운 편집기, 확인 대화상자, 토스트 등)
  composables/    useConfirm, useAlarm, useRequiredBook
  utils/          검증, 마크다운 변환, 검색·페이징, 날짜
  styles/         tokens → base → components → pages (DESIGN.md 기준)
```

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

## 모킹 데이터

- `src/api/mock/seed.ts`가 예시 문제집 5개(학습 중 3, 보관 1, 삭제 1)와 최근 7일 학습 기록을 만듭니다.
- 변경 내용은 메모리와 `localStorage`(`chagok-vue-mock-v1`)에 반영되어 새로고침 후에도 유지됩니다. 초기화하려면 브라우저 저장소에서 해당 키를 삭제하세요.
- 서버 연동 시 `StudyApi`(`src/api/types.ts`)를 구현한 HTTP 클라이언트를 만들어 `src/api/index.ts`의 `setApi`로 교체하면 화면·스토어는 수정하지 않아도 됩니다.

## 프로토타입과 달라진 점

- 해시 라우팅 대신 history 라우팅을 사용합니다.
- `window.confirm`을 접근 가능한 확인 대화상자로 바꿨습니다.
- 진행 중인 학습 세션은 새로고침하면 복원하지 않고 문제집 상세로 돌아갑니다(기존과 동일).
