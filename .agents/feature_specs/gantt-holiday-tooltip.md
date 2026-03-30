# Feature Spec: Gantt Scale Holiday Tooltip (일정 현황 휴일 툴팁)

일정 현황(Gantt chart)의 상단 날짜 헤더(Day Scale)에 마우스 오버 시, 해당 일자가 휴일(공휴일, 연차 등)로 등록되어 있다면 툴팁으로 휴일 명칭을 표시합니다.

## 1. 개요
- **목적**: 사용자가 간트차트를 보면서 특정 일자가 왜 휴일 색상(빨간색/노란색)으로 표시되는지 즉시 확인할 수 있도록 함.
- **대상**: `GanttChart` 컴포넌트의 일간 스케일(`day` scale) 헤더.

## 2. 세부 설계 사항

### 2.1 데이터 구조 개선
- 현재 `holidayDateMap`은 휴일 타입(`public` | `leave`)만 키로 가지고 있음.
- 이를 개선하여 `holidayInfoMap`으로 변경하고, 각 날짜별 휴일 이름 목록(`names: string[]`)을 포함하도록 함.
    - 예: `Map<string, { type: string, names: string[] }>`

### 2.2 간트 스케일 템플릿 수정
- `gantt.config.scales` 설정 중 `day` 단위의 `format` 함수를 수정.
- `holidayInfoMap`에서 해당 날짜의 휴일 정보를 조회.
- 휴일 정보가 있으면 HTML `title` 속성이 포함된 `<span>` 태그를 반환.
    - 예: `<span title="추석, 개인연차">30 (월)</span>`
- 브라우저 기본 툴팁을 사용하여 안정성을 확보하되, 스타일링이 더 필요할 경우 별도 CSS 처리를 검토.

### 2.3 제약 사항 및 고려 사항
- **다중 휴일**: 한 날짜에 공휴일과 연차가 겹칠 수 있으므로 모든 이름을 쉼표로 구분하여 합산 표시.
- **성능**: `format` 함수는 렌더링 시 자주 호출되므로 `useMemo`로 가공된 Map을 `Ref`로 참조하여 성능 저하를 방지.
- **반응형**: 스케일이 변경(`week`, `month`)될 때는 툴팁 표시 여부를 결정 (일단 `day` 스케일에서만 지원).

## 3. 구현 단계
1. `src/components/gantt/GanttChart.tsx` 분석 및 `holidayInfoMap` 생성 로직 구현.
2. `gantt.config.scales`의 `day` 포맷 템플릿 수정.
3. 관련 CSS 스타일 점검 (필요 시).
4. 빌드 및 테스트.

## 4. 기대 결과
- 사용자가 간트차트 상단 날짜 헤더에 마우스 오버 시 휴일 이름이 툴팁으로 나타남.
- "30 (월)" 위에 마우스 위치 시 "근로자의 날" 등의 메시지 노출.
