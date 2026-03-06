---
description: Supabase 데이터베이스 스키마를 안전하게 변경하는 워크플로우. 테이블 생성/수정, 컬럼 추가, RLS 정책 변경 등 모든 DB 변경에 사용한다. `/db-migrate` 로 호출한다.
---

# DB Migrate

## Steps

1. **변경 사항 정리**
   추가/수정/삭제할 테이블, 컬럼, 인덱스, RLS 정책을 목록화하고 사용자에게 확인한다. 기존 데이터에 영향을 주는 변경(컬럼 삭제, 타입 변경)이 있으면 위험도를 명시한다.

2. **마이그레이션 파일 생성**
   `supabase/migrations/` 폴더에 파일을 생성한다. 파일명 형식: `YYYYMMDDHHMMSS_{description}.sql`
   파일 안에 `-- UP`(적용) 섹션과 `-- DOWN`(롤백) 섹션을 모두 작성한다.
   ```sql
   -- UP
   alter table tasks add column tag text[];

   -- DOWN
   alter table tasks drop column tag;
   ```

3. **RLS 정책 업데이트**
   신규 테이블이면 RLS를 반드시 활성화한다. 기존 테이블의 접근 범위가 바뀌면 정책도 함께 수정한다.
   ```sql
   alter table {table_name} enable row level security;
   ```

4. **로컬 적용 및 검증**
   로컬 Supabase에 마이그레이션을 적용하고 오류가 없는지 확인한다.
   ```bash
   npx supabase db push
   ```

5. **TypeScript 타입 재생성**
   스키마 변경 후 반드시 타입 파일을 갱신한다.
   ```bash
   npx supabase gen types typescript --local > src/types/supabase.ts
   ```

6. **코드 영향도 수정**
   타입 오류가 발생한 파일을 찾아 수정한다. 빌드 성공 여부로 최종 확인한다.
   ```bash
   pnpm build
   ```

7. **완료 보고**
   변경된 스키마 요약, 영향받은 코드 파일 목록을 보고한다. 커밋 메시지를 `db` type으로 제안한다.
