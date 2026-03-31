# Feature Spec: Gantt Holiday Tooltip Improvement

## 1. 개요
현재 간트차트의 일자 헤더(Scale Cell)에 마우스 오버 시 표시되는 휴일 정보 툴팁의 반응 속도와 디자인을 개선합니다. 브라우저 기본 `title` 속성 대신 DHTMLX Gantt의 커스텀 툴팁 스타일을 적용하여 일관된 사용자 경험을 제공합니다.

## 2. 요구사항 및 문제점
- **문제점 1 (속도):** 현재 HTML `title` 속성을 사용하고 있어 브라우저가 툴팁을 띄우는 데 지연 시간(약 1초)이 발생함.
- **문제점 2 (디자인):** 간트차트 업무(Task) 툴팁과 디자인이 상이하여 이질감이 느껴짐.
- **요구사항:** 
    - 마우스 오버 시 즉시 툴팁이 나타나야 함.
    - 툴팁 디자인을 `GanttChart.tsx` 내 `tooltip_text` 템플릿과 동일하게 맞춤.

## 3. 기술적 해결 방안
- **브라우저 기본 툴팁 제거:** `g.config.scales`의 `format` 함수에서 `title` 속성 제거.
- **커스텀 툴팁 엔진 구현:**
    - `g.config.tooltip_timeout = 0` (또는 매우 작게) 설정을 검토하여 반응성 향상. (업무 툴팁과 공유되므로 주의)
    - 스케일 셀(`day_scale_cell`)에 마우스가 들어가고 나갈 때(`mouseover/mouseout`) 커스텀 툴팁을 트리거하도록 리스너 추가.
    - DHTMLX Gantt의 `gantt.ext.tooltip`을 활용하거나 수동으로 DOM 툴팁 생성.
    - 성능을 위해 `holidayInfoMap` (Map)을 사용한 $O(1)$ 데이터 조회 유지.
- **스타일 동기화:** `tooltip_text` 템플릿에서 정의한 CSS 디자인을 공용 툴팁 컴포넌트나 스타일시트에 정의된 내용과 맞춤.

## 4. 변경 파일
- `src/components/gantt/GanttChart.tsx`

## 5. 단계별 구현 계획
1. **HTML/CSS 정의:** `GanttChart.tsx` 내부 스타일 주입 시 툴팁을 위한 CSS 추가.
2. **이벤트 핸들러:** 
    - `day_scale_cell` 요소에 `mouseenter`, `mouseleave`, `mousemove` 이벤트를 위임(Delegation) 방식으로 처리하여 성능 확보.
    - 해당 셀의 날짜를 추출하여 휴일 명칭 포맷팅.
3. **툴팁 표시:** 
    - 간트차트 툴팁 레이아웃과 동일한 마크업 생성 및 표시.
4. **기존 `title` 속성 제거.**

## 6. 테스트 케이스
- [ ] 일자 헤더에 마우스 오버 시 즉시 툴팁이 나타나는가?
- [ ] 툴팁의 내용이 해당 날짜의 휴일/연차 정보를 정확히 포함하는가?
- [ ] 툴팁의 디자인이 업무(Task) 툴팁과 동일한 스타일인가?
- [ ] 화면 스크롤 시 툴팁 위치가 정확하게 유지되거나 닫히는가?
