# Feature Spec: DB Connection Leak Fix (Local PostgreSQL)

## 목적
로컬 PostgreSQL 환경에서 `FATAL: sorry, too many clients already` 에러가 발생하는 것을 방지하기 위해 DB 커넥션 관리 로직을 최적화하고 인스턴스 캐싱을 전 환경(Dev/Prod)에서 보장합니다.

## 사용자 시나리오
1. 사용자가 로컬에서 개발 서버를 실행하고 다양한 페이지(Gantt, Tasks)를 조회한다.
2. 시스템은 `globalThis`에 저장된 단일 DB 인스턴스와 커넥션 풀을 재사용한다.
3. HMR(Hot Module Replacement) 발생 시에도 기존 연결을 최대한 유지하여 DB 서버의 `max_connections` 제한을 넘지 않도록 한다.

## DB 변경사항
- 없음 (Drizzle 스키마 변경 불필요)

## 구현 목록
### Core Logic
- `src/lib/db/index.ts`: 
  - `getDbInstance()`에서 `production` 환경을 포함한 모든 환경에서 캐싱을 활성화.
  - `postgres` 클라이언트(Driver)를 Drizzle 인스턴스와 별개로 또는 결합하여 전역 캐싱하여 중복 생성 방지.
  - `max` 연결 수 하향 조정 (10 -> 8) 및 `idle_timeout` 단축 (10s) 등 최적화 설정 적용.

## 엣지 케이스 처리
- **HMR(Hot Module Replacement)**: 개발 환경에서 소스 수정 시 `globalThis`를 통해 기존 연결이 유지되도록 처리.
- **Node.js Process Lifecycle**: 프로세스 종료 시 커넥션이 안전하게 닫히도록 유도 (필요 시).

## 완료 기준
- [x] 수동 분석: `src/lib/db/index.ts`의 누수 포인트 확인 완료.
- [ ] 코드 수정: 인스턴스 전역 캐싱 적용.
- [ ] 검증: `Too many clients` 에러가 재발하지 않음을 확인.
