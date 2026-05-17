# 它们之间的关系

App.tsx
  ├─ ThemeProvider (useTheme)
  ├─ SoundProvider (useSoundSettings)
  └─ PlanProvider (usePlanWebSocket)
      └─ WorkflowPage.tsx
          └─ useWorkflowState (核心！)
              ├─ 使用 usePlanContext (检查套餐限制)
              └─ 使用 useSoundSettings (播放音效)