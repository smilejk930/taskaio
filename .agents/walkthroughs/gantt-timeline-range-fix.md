# Walkthrough: 간트차트 타임라인 범위 동적 조절 (Dynamic Timeline Range Fit)

## 구현 배경
- 기존 간트차트는 기본적으로 프로젝트 처음 시작 시점 등에 맞춰 고정되거나, `fit_tasks` 설정에 의해 새로고침 시에만 제한적으로 범위를 세팅했습니다.
- 이로 인해 특정 담당자나 상태로 필터링을 변경했을 때, 해당 업무들이 존재하는 날짜가 타임라인 밖으로 짤려 보이는 문제가 있었습니다. (예: 4월 업무가 필터에 걸려도 타임라인 눈금이 3월 30일까지만 되어있어 보이지 않음)
- 이를 해결하기 위해, 필터링 결과(`tasks`)에 맞게 dhtmlx-gantt의 `start_date` 및 `end_date`를 수동으로 동적 계산해주는 로직을 구현했습니다.

## 구현된 파일
- **수정**: `src/components/gantt/GanttChart.tsx`
  - `tasks` 렌더링을 처리하는 `useEffect` 안쪽의 `g.clearAll()` 직후 로직을 수정했습니다.
  - 필터링된 `tasks`를 순회하며 `minDate`(최소 시작일)와 `maxDate`(최대 종료일)를 구합니다.
  - 여유로운 타임라인 시야를 위해, 구해진 `minDate`에서 7일을 빼고, `maxDate`에서 7일을 더하여 `g.config.start_date`와 `g.config.end_date`에 바인딩합니다.
  - 데이터가 비어있을 경우, 예기치 않은 오류나 빈 화면 깨짐을 방지하기 위해 오늘 날짜 기준 양옆 15일로 스케일 범위를 고정합니다.

```diff
-            g.clearAll()
-            document.querySelectorAll('.gantt_marker').forEach(m => m.remove());
-
-            // 업무명 및 업무 설명 길이에 따른 가변 행 높이 자동 계산
-            const processedTasks = tasks.map(t => {
+            g.clearAll()
+            document.querySelectorAll('.gantt_marker').forEach(m => m.remove());
+
+            // 업무 필터링 및 변동에 맞춰 동적으로 타임라인(가로축) 범위 계산
+            if (tasks && tasks.length > 0) {
+                let minDate = new Date('9999-12-31').getTime();
+                let maxDate = new Date('1970-01-01').getTime();
+                let hasValidDate = false;
+
+                tasks.forEach(t => {
+                    if (t.start_date && !t.unscheduled) {
+                        const st = t.start_date.getTime();
+                        if (st < minDate) minDate = st;
+                        
+                        // ganttTasks에서 end_date가 Date 객체로 오는 경우 또는 duration 기반 계산
+                        const endDateObj = t.end_date || new Date(st + (t.duration * 24 * 60 * 60 * 1000));
+                        const et = endDateObj.getTime();
+                        if (et > maxDate) maxDate = et;
+                        hasValidDate = true;
+                    }
+                });
+
+                if (hasValidDate) {
...
```

## 완료 기준 체크
- [x] 특정 조건 필터 적용 시 렌더링되지 않았던 월(예: 4월)이 업무 범위에 포함될 경우 타임라인이 해당 일자까지 정상적으로 확장/세팅되어 노출된다.
- [x] 필터링 조건 변경으로 눈에 보이는 데이터 기간이 변경될 때마다 간트차트의 표시 영역이 해당 업무에 적합한 범위로 즉시 반응하며 축소 및 확장된다.
- [x] 필터 결과가 없을 경우 오늘 날짜 기준으로 빈 간트차트 UI가 정상적으로 유지된다.

## 테스트
브라우저 환경에서 담당자('김성현')로 필터링했을 때, 기존에 잘리던 4월 업무들이 모두 표시되며, 그에 맞게 타임라인 눈금이 `2026-03-19` ~ `2026-04-11` 처럼 최적화된 마진을 가지고 올바르게 세팅됨을 확인했습니다.

`/test-feature`를 실행하여 전체 시스템 회귀 검증을 진행하세요.

## 다음 단계 제안 (선택)
- dhtmlx-gantt에서 태스크를 마우스로 타임라인 경계선 밖으로 드래그할 때, 경계선 밖으로 넘어가면 페이지 스크롤 또는 스케일 범위가 자동으로 늘어나도록 설정(`gantt.config.fit_tasks = true;` 등)을 추가할 수 있습니다. 현재 로직에서는 명시적으로 정해진 스케일 바운더리 안에서만 이동이 가능합니다. 확장이 잦다면 리뷰해볼 만한 포인트입니다.
