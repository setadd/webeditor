# 本地任务管理

规格和任务保存在 docs/feature/ 下。

## 存放约定

- 每个功能一个目录：docs/feature/<feature-slug>/。
- 正式规格：docs/feature/<feature-slug>/spec.md。
- 开发任务：docs/feature/<feature-slug>/issues/<NN>-<slug>.md，从 01 编号，每个任务独立成文。
- 规格和任务开头使用 Status: 记录分类状态，标签见 triage-labels.md。
- 任务依赖使用 Blocked by: 列出前置任务编号；无依赖写 none。
- 补充讨论追加到文末的 ## Comments。
- 发布到任务跟踪系统，指创建或更新上述本地文件。
- 获取任务，指读取用户指定路径或功能目录内对应编号的文件。

## 决策探索任务

使用 wayfinder 时，决策地图保存为 docs/feature/<effort>/map.md，
子任务保存为该目录下的 issues/NN-<slug>.md。

子任务使用 Type: 标明 research、prototype、grilling 或 task，
使用 Status: claimed 或 resolved 记录领取和解决状态。
全部前置任务 resolved 后才可领取；先记录 claimed 再开展工作。
解决后添加 ## Answer，并将结论及链接写回决策地图。
