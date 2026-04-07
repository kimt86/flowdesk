# Architecture Decisions — FlowDesk

## 2026-04-06 — 기존 기술 스택 확인 (gf-adopt)

### 결정
현재 기술 스택을 그대로 유지한다.

### 스택
- Next.js 13.5.6 (App Router)
- TypeScript 5
- SQLite (LibSQL/Turso) + Drizzle ORM
- Tailwind CSS 3.4.1 + Radix UI
- Remark/Rehype 마크다운 파이프라인

### 근거
- 1차 구현이 완료된 상태이며, 핵심 기능이 모두 동작
- 마크다운 파일 기반 워크플로우와 SQLite 하이브리드 구조가 요구사항에 적합
- 로컬 파일 시스템 의존은 단일 사용자/팀 환경에서 적절한 선택
