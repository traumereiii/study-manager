# 포함된 라이브러리

별도 설치 없이 파일로 실행할 수 있도록 배포 파일을 저장합니다.

- Marked 18.1.1: `marked.umd.js`, MIT, 라이선스 `MARKED-LICENSE`
  - 출처: https://cdn.jsdelivr.net/npm/marked@18.1.1/lib/marked.umd.js
  - 문서: https://github.com/markedjs/marked
- DOMPurify 3.4.17: `purify.min.js`, Apache-2.0 또는 MPL-2.0, 라이선스 `DOMPURIFY-LICENSE`
  - 출처: https://cdn.jsdelivr.net/npm/dompurify@3.4.17/dist/purify.min.js
  - 문서: https://github.com/cure53/DOMPurify

Markdown 변환 결과는 DOMPurify의 허용 목록으로 정리한 후 표시합니다. 라이브러리를 갱신하면 Markdown·이미지 표시 및 악성 HTML/URL 관련 브라우저 검증을 함께 실행합니다.
