---
name: lint-and-build
description: 기능 구현 완료 후 배포 전 lint와 build 검증이 필요할 때 사용. builder가 구현 완료 후 자동 호출하며 Stop Hook에서도 실행된다.
---

# Lint & Build 검증

구현된 코드가 배포 가능한 상태인지 검증한다.

## 실행 순서

### 1단계: ESLint
```bash
cd /d/develop/workspace/taskaio && pnpm lint 2>&1
```
- 경고 포함 모든 lint 오류를 수정한다
- 통과 후 2단계로 진행한다

### 2단계: 프로덕션 빌드
```bash
cd /d/develop/workspace/taskaio && pnpm build 2>&1
```
- 빌드 실패 시 오류를 읽고 수정 후 재실행한다
- 타입 오류, import 오류, 환경변수 누락 등을 확인한다

## 완료 조건
두 단계 모두 통과해야 "배포 검증 완료"를 보고한다.
하나라도 실패하면 오류를 수정하고 전체를 재실행한다.
