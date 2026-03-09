---
trigger: always_on
---

# Auto Commit Rule

개발 중 하나의 기능(Feature)이 완료되거나, 계획했던 큰 단위의 작업(Task)이 하나 끝날 때마다 다음을 수행하세요:
1. 지금까지의 변경 사항(git status 및 git diff)을 확인합니다.
2. 커밋을 진행해도 되는지 사용자에게 요약해서 물어봅니다. (또는 "자동으로 커밋을 실행합니다.")
3. Conventional Commits(예: feat:, fix:, docs:) 양식에 맞춰 적절한 커밋 메시지를 작성하여 `git commit`을 수행하세요.