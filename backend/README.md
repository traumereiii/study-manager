# 차곡 서버

Kotlin 2.4.21 · Spring Boot 4.1.1 · JDK 25 · **Gradle 9.8.1** · **MySQL 8.0** · **JPA**.

서버 PRD의 P0 API를 구현한다. 기존 Vue `StudyApi`와 같은 DTO를 반환한다. 프런트엔드(`../frontend`)는 `npm run dev:server`로 이 서버와 연동하며, 로그인 화면과 HTTP 어댑터(`src/api/http`)를 제공한다. 서버는 알 수 없는 JSON 필드를 거부하므로 DTO를 바꾸면 어댑터의 요청 본문도 함께 수정한다.

## 실행

JDK 25와 MySQL 8 환경이 필요하다. Docker Compose와 통합 테스트는 MySQL 8.0.46을 사용한다.

저장소 루트에서 PowerShell로 실행한다.

```powershell
cd backend
Copy-Item .env.example .env
docker compose up -d mysql

$env:DB_PASSWORD = 'chagok-local-password'
$env:JWT_SECRET = 'local-development-only-change-this-jwt-secret-2026'
.\gradlew.bat bootRun
```

`.env`는 Compose가 읽는다. Gradle로 실행하는 앱에는 환경변수를 직접 지정한다. `.env`의 비밀번호를 변경했다면 `DB_PASSWORD`도 같은 값으로 지정한다. 예시 비밀번호와 JWT 키는 로컬 개발용이다. JWT 키는 최소 32바이트이며 설정이 없거나 너무 짧으면 서버가 시작되지 않는다.

기존 MySQL을 사용한다면 `chagok` 데이터베이스와 계정을 준비한 뒤 환경변수를 지정한다. Flyway가 테이블과 기본 설정을 만들며, Hibernate는 스키마를 검증한다. 학습용 예시 데이터는 자동 생성하지 않는다.

| 환경변수 | 기본값 / 의미 |
| --- | --- |
| `DB_URL` | `jdbc:mysql://localhost:3306/chagok?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true` |
| `DB_USERNAME` | `chagok` |
| `DB_PASSWORD` | 필수 |
| `JWT_SECRET` | 필수, 32바이트 이상의 서명 키 |
| `SERVER_PORT` | `8080` |
| `CORS_ORIGINS` | `http://localhost:5173`, 여러 출처는 쉼표로 구분 |

로컬 3306 포트를 이미 사용한다면 Compose의 호스트 포트를 바꾸고 `DB_URL`에도 같은 포트를 지정한다. 설정을 변경해도 기존 DB 볼륨의 계정 비밀번호는 자동 변경되지 않는다.

상태 확인: `GET http://localhost:8080/actuator/health`.

## JWT 인증

계정은 요청한 대로 **`admin / admin1234`**로 고정돼 있다. 회원가입과 사용자별 공간은 없다. 비밀번호 비교는 BCrypt를 사용한다.

| 메서드 | 경로 | 요청 / 동작 |
| --- | --- | --- |
| POST | `/api/v1/auth/login` | `{ "username": "admin", "password": "admin1234" }` |
| POST | `/api/v1/auth/refresh` | `{ "refreshToken": "..." }`, 두 토큰 재발급 |
| POST | `/api/v1/auth/logout` | AccessToken 필요, 해당 로그인 세션 폐기 |
| GET | `/api/v1/auth/me` | AccessToken 필요, `{ "username": "admin" }` |

로그인·재발급 응답:

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "tokenType": "Bearer",
  "expiresIn": 7200,
  "accessExpiresAt": "2026-10-16T08:00:00Z",
  "refreshExpiresAt": "2026-11-16T06:00:00Z"
}
```

- AccessToken은 발급 후 **2시간**이다.
- RefreshToken은 최초 로그인 시각에서 **달력상 1개월(UTC)**이다. 1월 31일의 다음 달 만료일은 2월 말일이다.
- 재발급 시 RefreshToken을 교체하고 이전 토큰은 거부한다. 최초 만료일은 연장하지 않는다. 동시 재발급은 한 요청만 성공한다.
- 토큰은 HS256 서명·issuer·subject·발급/만료 시각·토큰 종류를 검증한다. RefreshToken으로 업무 API를 호출할 수 없다.
- DB에는 RefreshToken 원문 대신 SHA-256 해시를 저장한다.
- 업무 API 요청마다 로그인 세션의 폐기 여부를 확인한다. 로그아웃하면 그 세션의 이전·현재 AccessToken과 RefreshToken을 모두 거부한다. 다른 로그인 세션은 유지한다.
- 토큰은 응답 JSON으로 전달하고 요청은 `Authorization: Bearer <accessToken>`을 사용한다. 쿠키·HTTP 세션·Basic 인증은 사용하지 않는다.

로그인부터 조회까지:

```powershell
$login = Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/v1/auth/login `
  -ContentType 'application/json' -Body '{"username":"admin","password":"admin1234"}'
$headers = @{ Authorization = "Bearer $($login.accessToken)" }
Invoke-RestMethod -Uri http://localhost:8080/api/v1/bootstrap -Headers $headers
```

AccessToken 만료로 401을 받으면 RefreshToken으로 재발급한 뒤 새 AccessToken을 사용한다. 재발급 요청에는 만료한 AccessToken 헤더를 붙이지 않는다. RefreshToken도 만료됐거나 재사용·폐기됐으면 다시 로그인한다.

## 학습 API

아래 API는 모두 AccessToken이 필요하다. 상세 입력은 [서버 PRD](../docs/SERVER_PRD.md)와 [프런트엔드 타입](../frontend/src/types/index.ts)을 따른다.

| 메서드 | `/api/v1` 이후 경로 | 기능 |
| --- | --- | --- |
| GET | `/bootstrap` | 전체 문제집·카드·이력·설정 조회 |
| POST | `/books` | 문제집 생성 |
| PUT | `/books/{bookId}` | 문제집 수정 |
| PATCH | `/books/{bookId}/state` | 보관·휴지통·복원 |
| DELETE | `/books/{bookId}` | 휴지통 문제집 완전 삭제 |
| POST | `/books/{bookId}/cards` | 문제 생성 |
| PUT | `/cards/{cardId}` | 문제 수정 |
| DELETE | `/cards/{cardId}` | 문제 삭제, 평가 이력 보존 |
| POST | `/cards/{cardId}/level-reset` | Level 1 초기화 |
| POST | `/evaluations` | 평가·레벨·최근 학습일 저장 |
| POST | `/books/{bookId}/completion` | 당일 완료 저장 |
| PUT | `/settings` | 설정 저장 |
| PUT | `/settings/alarm-last-date` | `{ "date": "2026-10-16" }` |

평가 요청에는 동작별 UUID `Idempotency-Key` 헤더가 필수다. 응답을 받지 못해 재시도할 때는 **같은 키와 본문**을 사용한다. 다른 학습 평가는 새 키를 사용한다. 동일 요청을 재시도하면 최초 응답을 재현하며 레벨과 이력을 중복 변경하지 않는다.

```json
{
  "bookId": "문제집 UUID",
  "cardId": "카드 UUID",
  "known": true,
  "durationMs": 12000,
  "revealMs": 8000
}
```

날짜는 `Asia/Seoul`, 시각은 UTC ISO 문자열이다. 정답 공개·제한시간·학습 순서·통계 집계는 현재처럼 프런트엔드가 담당한다. 서버는 완료 선언을 저장하며 모든 문제 풀이 여부를 검증하는 서버 학습 세션은 구현하지 않는다.

이미지는 기존 `assets` Data URL 맵으로 받고 반환한다. PNG·JPEG·WebP, 파일별 2 MiB, 카드당 5개·합계 10 MiB, JSON 요청은 16 MiB까지다. 실제 형식·해상도·디코딩·본문 참조를 검증한다. DB에는 카드와 별도로 이미지 바이트를 저장한다. 본문·이미지·평가 원문은 로그에 기록하지 않는다.

전체 조회 방식이므로 소규모 개인용 데이터에 적합하다. 부분 조회·통계 집계·이미지 URL 전환·기존 localStorage 가져오기는 후속 범위다.

## 테스트와 패키징

Docker가 실행 중이어야 한다. 통합 테스트는 Testcontainers가 만든 **격리된 MySQL 8**을 사용하고 종료 시 정리한다. 로컬 개발 DB를 테스트에 사용하지 않으며 외부 DB로 대체하거나 테스트를 자동 생략하지 않는다.

```powershell
.\gradlew.bat test
.\gradlew.bat bootJar
java -jar build/libs/chagok-backend-0.1.0.jar
```

테스트 범위: 인증 실패·토큰 수명·만료·회전·동시 재발급·로그아웃, 문제집 상태, 문제 유형과 이미지, 동시 평가·멱등성, DB 실패 전체 롤백, 삭제 이력 보존, 서울 자정, 설정과 요청 크기 제한.

Kotlin 공식 문서의 Gradle 완전 지원 표는 2.4.21 기준 최대 9.7.0까지다. 사용자 지정인 9.8.1을 유지하며 실제 빌드·통합 테스트로 이 프로젝트 조합을 검증한다. [Kotlin Gradle 호환성](https://kotlinlang.org/docs/gradle-configure-project.html), [Spring Boot 요구사항](https://docs.spring.io/spring-boot/system-requirements.html)
