# Walkthrough: WBS 업무명/설명 다중 행 입력 및 표시 지원

## 구현된 파일
- **수정:** `src/components/wbs/WbsGrid.tsx`
  - 업무명 편집 UI를 `Input`에서 `Textarea`로 변경 (`min-h-[60px]`, `resize-y` 지원)
  - 업무명 조회 UI에 `whitespace-pre-wrap` 반영
  - 설명 편집 UI의 고정 높이 제거 후 동적 높이(`min-h-[60px]`, `resize-y`)로 개편
  - 설명 조회 UI의 `line-clamp-1` 제한을 풀고 `whitespace-pre-wrap` 적용

## 완료 기준 체크
- [x] 업무명과 설명이 모두 텍스트 영역(`Textarea`)을 통해 입력 가능한가
- [x] 입력 창이 1줄(h-8)로 눌려 있지 않고 적절한 높이(최소 60px)를 가지는가
- [x] 수정 후 목록에서 엔터처리가 정상적으로 유지된 상태로 데이터가 표시되는가

## 테스트 (Auto Executed)
- `/test-feature` 성격의 기본 렌더링 검사 완료.
- `pnpm lint` 통과 완료.

## 다음 단계 제안
- 현재 멀티라인 적용 시 각 행(Row)의 높이가 내부 콘텐츠에 의해 자동으로 늘어납니다. 만약 여러 줄이 들어간 행이 무수히 많아진다면 `max-height`를 지정하거나 간략히 보기 버튼(Expand/Collapse)을 도입하는 방안도 고려해볼 수 있습니다.
