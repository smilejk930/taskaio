---
trigger: manual
---

# Git 커밋 메시지 규칙

이 규칙은
- `@git-commit` 으로 명시적으로 호출했을 때 적용된다.
- github-mcp를 사용했을 때 적용된다


## Conventional Commits 형식

```
<type>(<scope>): <description>

[optional body]
[optional footer]
```

## Type 목록

| type | 사용 상황 |
|---|---|
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `ui` | UI/스타일 변경 (기능 무관) |
| `db` | DB 스키마 / 마이그레이션 변경 |
| `refactor` | 기능 변경 없는 코드 구조 개선 |
| `docs` | 문서, 주석 변경 |
| `chore` | 빌드 설정, 패키지 업데이트 등 |
| `test` | 테스트 코드 추가/수정 |

## Scope 예시 (taskaio 기준)

`tasks`, `members`, `projects`, `gantt`, `auth`, `dashboard`, `db`

## 예시

```
feat(tasks): WBS 계층 구조 업무 생성 기능 추가

- 에픽 > 스토리 > 태스크 3단계 계층 지원
- parent_id로 계층 관계 관리

feat(gantt): dhtmlx-gantt 드래그 일정 조정 구현
fix(auth): 로그아웃 후 세션이 남아있는 버그 수정
db(members): 팀원 테이블에 avatar_url 컬럼 추가
ui(dashboard): 진행률 카드 다크모드 색상 수정
```

## 규칙

- 제목은 50자 이내, 명령형으로 작성 ("추가했다" → "추가")
- 한국어 사용 가능
- Breaking change가 있으면 footer에 `BREAKING CHANGE:` 명시
