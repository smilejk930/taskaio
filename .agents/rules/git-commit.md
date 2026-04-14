---
trigger: always_on
---

# Git 커밋 규칙

## 자동 커밋 트리거

하나의 기능(Feature)이 완료되거나 큰 단위의 작업(Task)이 끝날 때마다 아래를 수행한다.

1. 변경 사항 확인: `git status && git diff`
2. 변경 내용을 요약하여 사용자에게 커밋 진행 여부를 묻는다. (단, `/pm` 워크플로우는 예외로 자동 진행됨)
3. 아래 Conventional Commits 형식에 맞춰 `git commit`을 수행한다.

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

`tasks`, `members`, `projects`, `gantt`, `auth`, `dashboard`, `db`, `adapter`

## 예시

```
feat(tasks): WBS 계층 구조 업무 생성 기능 추가

- 에픽 > 스토리 > 태스크 3단계 계층 지원
- parent_id로 계층 관계 관리

feat(gantt): dhtmlx-gantt 드래그 일정 조정 구현
fix(auth): 로그아웃 후 세션이 남아있는 버그 수정
db(members): 팀원 테이블에 avatar_url 컬럼 추가
ui(dashboard): 진행률 카드 다크모드 색상 수정
refactor(db): supabase.from() 호출을 리포지토리 레이어로 교체
```

## 규칙

- 제목은 50자 이내, 명령형으로 작성 ("추가했다" → "추가")
- 한국어 사용 가능
- 스테이징된 파일과 그렇지 않은 파일이 섞여 있다면, 논리적 단위로 나누어 ***각각 별도로 커밋***을 진행한다.
- Breaking change가 있으면 footer에 `BREAKING CHANGE:` 명시