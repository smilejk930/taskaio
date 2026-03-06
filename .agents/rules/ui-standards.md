---
trigger: always_on
---

# UI/UX 디자인 규칙

## shadcn/ui 우선 원칙

shadcn/ui에 있는 컴포넌트는 반드시 shadcn/ui를 사용한다. 직접 HTML + CSS로 구현하지 않는다.

```
버튼 → Button
입력 → Input
모달 → Dialog
알림 → Toast (sonner)
테이블 → DataTable (@tanstack/react-table)
날짜 입력 → Calendar + DatePicker
로딩 → Skeleton
```

## 상태·우선순위 색상 (전체 통일)

업무 상태와 우선순위 색상은 아래 기준으로만 표현하고, 임의로 변경하지 않는다.

```typescript
// 업무 상태
const statusStyle = {
  todo:        'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100  text-blue-700',
  review:      'bg-yellow-100 text-yellow-700',
  done:        'bg-green-100 text-green-700',
} as const

// 우선순위 (shadcn Badge variant)
const priorityVariant = {
  urgent: 'destructive',
  high:   'default',
  medium: 'secondary',
  low:    'outline',
} as const
```

## 반응형 브레이크포인트

| 기기 | 너비 | Tailwind 접두사 |
|---|---|---|
| 모바일 | 375px~ | (기본) |
| 태블릿 | 768px~ | `md:` |
| 데스크탑 | 1280px~ | `xl:` |

## 다크모드

`next-themes`를 사용하고, `ThemeProvider`는 루트 레이아웃에서 한 번만 선언한다.
색상은 항상 Tailwind의 semantic 클래스(`bg-background`, `text-foreground` 등)를 사용한다.

## 로딩 / 에러 상태 처리

- 데이터 로딩 중: `Skeleton` 컴포넌트로 레이아웃 유지
- 사용자 액션 성공: `toast.success('메시지')`
- 사용자 액션 실패: `toast.error('메시지', { description: error.message })`
- 페이지 에러: Next.js `error.tsx` + `not-found.tsx` 파일 활용