# FlowDesk

## Design System

DESIGN.md를 **모든 시각적·UI 작업 전에 반드시 먼저 읽을 것**. 모든 서체, 컬러, 여백, 미감 방향이 거기에 정의되어 있다. 사용자의 명시적 승인 없이 편차 금지. 방향은 "한지와 먹 · Hanji + Ink" — 에디토리얼 뉴스프린트, Paperlogy/Pretendard/IBM Plex, 단청 레드 단일 accent, 헤어라인 기반, 그림자 금지, 순회색 금지.

QA·디자인 리뷰 모드에서는 DESIGN.md와 어긋나는 모든 코드를 플래그할 것.

## 언어

이 프로젝트의 사용자에게 보내는 모든 응답은 **한글**로 작성한다. 코드·경로·기술 용어는 영어 그대로 유지.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:

- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
