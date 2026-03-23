---
description: Drizzle ORM 기반으로 DB 스키마를 변경하고 모든 DB_TYPE(supabase|postgres|sqlite)에 호환되는 마이그레이션을 적용한다.
---

# DB Migrate

## 원칙
- 모든 스키마 변경은 **Drizzle 스키마 파일** (`src/lib/db/schema/`)을 먼저 수정한다.
- 마이그레이션 SQL은 `drizzle-kit`이 자동 생성한다. 수동 작성을 최소화한다.
- RLS 정책은 추가하지 않는다. 권한 검증은 Server Action에서 처리한다.
- 기존 데이터에 영향을 주는 변경(컬럼 삭제, 타입 변경)은 반드시 위험도를 명시한다.

---

## Steps

### 1. 변경 사항 정리
추가/수정/삭제할 테이블, 컬럼, 인덱스를 목록화하고 사용자에게 확인한다.

```
⚠️ 위험 변경 예시 (데이터 손실 가능)
- 컬럼 삭제: tasks.legacy_field 제거
- 타입 변경: tasks.priority (text → integer)
```

### 2. Drizzle 스키마 수정
`src/lib/db/schema/{table}.ts` 파일을 수정한다.

**PostgreSQL + SQLite 동시 호환 스키마 예시:**
```ts
// src/lib/db/schema/tasks.ts
import { pgTable, sqliteTable, text, integer } from 'drizzle-orm/...'

// DB_TYPE에 따라 테이블 빌더를 분기
const table = process.env.DB_TYPE === 'sqlite' ? sqliteTable : pgTable

export const tasks = table('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  status: text('status').notNull().default('todo'),
  projectId: text('project_id').notNull(),
})
```

### 3. 마이그레이션 파일 생성
drizzle-kit으로 마이그레이션 SQL을 자동 생성한다.

```bash
# PostgreSQL
pnpm drizzle-kit generate --dialect=postgresql

# SQLite
pnpm drizzle-kit generate --dialect=sqlite
```

생성된 파일 위치: `drizzle/migrations/`
파일명 형식: `{timestamp}_{description}.sql`

변경 내용이 의도와 다르면 이 단계에서 스키마를 수정하고 재생성한다.

### 4. 마이그레이션 적용

```bash
# 개발 환경 (DB_TYPE에 따라 자동 분기됨)
pnpm drizzle-kit migrate

# 또는 앱 시작 시 자동 적용되도록 설정된 경우 확인만
# src/lib/db/index.ts 의 migrate() 호출 여부 확인
```

적용 후 오류가 없는지 확인한다.

### 5. 타입 자동 반영 확인
Drizzle은 스키마 파일이 곧 타입이므로 별도 타입 생성 명령이 필요 없다.
스키마 수정 후 TypeScript 오류가 없는지 확인한다.

```bash
pnpm tsc --noEmit
```

### 6. 영향 코드 수정
타입 오류가 발생한 파일을 찾아 수정한다.

```bash
pnpm build   # 빌드 통과 여부로 최종 확인
```

### 7. 완료 보고
아래 항목을 보고한다.

- 변경된 스키마 요약 (테이블/컬럼)
- 생성된 마이그레이션 파일 경로
- 영향받은 코드 파일 목록
- 커밋 메시지를 `db: ...` 형식으로 제안