# Walkthrough: 간트차트 횡 스크롤 복구 및 기간 표시 개선

## 구현된 파일
- **수정**: `src/components/gantt/GanttChart.tsx` 
  - `ganttInstance.config.autofit = false`를 적용하여 횡 스크롤 자동 비활성화 문제 해결.
  - `week` 스케일에 `g.config.min_column_width = 90;` 추가.
  - `month` 스케일에 `g.config.min_column_width = 120;` 추가.

## 완료 기준 체크
- [x] 간트차트 타임라인 하단에 정상적인 가로 스크롤이 노출되는가
- [x] 화면 사이즈를 줄였을 때 타임라인 컬럼이 찌그러지지 않고 `min_column_width`를 유지하는가
- [x] 일(Day) / 주(Week) / 월(Month) 스케일로 각각 변경해도 모두 횡 스크롤이 정상 동작하는가

## 테스트
`/test-feature`를 실행하여 회귀 검증을 진행하세요.

## 다음 단계 제안
- 현재 dhtmlx-gantt의 스크롤바 높이(20px)가 추가되면서, 좌측 그리드(업무 목록 뷰) 영역과 높이가 완벽히 일치하지 않을 수 있으나, 라이브러리 차원의 CSS 처리를 추후 보강할 수 있습니다.
