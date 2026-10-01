# 组态编辑器首版开发任务

依据[正式规格](./spec.md)，已登记 14 个独立任务。用户于 2026-10-01 确认拆分和依赖。任务 01–14 已完成；ready-for-agent 是需求分类标签，实际交付状态见各票 Execution 字段和验收清单。

## 任务与依赖

| 编号 | 任务 | 前置任务 | 验收覆盖 |
| --- | --- | --- | --- |
| 01 | [最小编辑与保存闭环](./issues/01-minimal-editor-save.md) | 无 | A01、A17（基础部分） |
| 02 | [基础编辑与撤销重做](./issues/02-editing-history.md) | 01 | A07、A08、A23（基础部分） |
| 03 | [自由直线、折线与曲线](./issues/03-free-lines-curves.md) | 02 | A02、A03；扩展 A07、A17 |
| 04 | [背景与本地图片资源](./issues/04-background-image-assets.md) | 02 | A06；扩展 A07、A17、A19 |
| 05 | [手动配置线条流动](./issues/05-manual-line-flow.md) | 03 | A04；扩展 A07、A17 |
| 06 | [模拟点位与混合数据展示](./issues/06-mock-data-mixed-widgets.md) | 01 | A01；A16、A17（点位与图表部分） |
| 07 | [条件驱动的颜色变化](./issues/07-conditional-color-rules.md) | 06 | A12、A13；A16（规则部分）；扩展 A07、A17 |
| 08 | [一个图元的多图片状态切换](./issues/08-state-image-switching.md) | 04、07 | A14、A15、A16；扩展 A07、A17 |
| 09 | [数据驱动的流动动画](./issues/09-data-driven-flow.md) | 05、07 | A05、A13、A16；扩展 A07、A17 |
| 10 | [图层、对齐与组合编辑](./issues/10-layers-layout-groups.md) | 02、03 | A09、A10；扩展 A07、A08、A17 |
| 11 | [多页面、预览与本机发布](./issues/11-pages-preview-publication.md) | 01 | A20、A21；扩展 A17、A23 |
| 12 | [业务查看、跳转与筛选](./issues/12-runtime-details-navigation-filters.md) | 06、11 | A22；扩展 A21 |
| 13 | [完整项目导入导出与失败保护](./issues/13-portable-project-import-export.md) | 04、11 | A18、A19；扩展 A17 |
| 14 | [完整场景验收与交互补齐](./issues/14-complete-editor-acceptance.md) | 08、09、10、12、13 | A01–A24（全量），A11（本票交付） |

## 开始顺序

任务 01–14 均已完成。首版证据见 [A01–A24 验收记录](./verification-v1.md)，各票保留具体测试和 Execution 字段。

随后每次选择所有前置任务均已完成的任务。各票中的验收、保存恢复及适用测试随功能交付，不延后到 14。14 汇总全量验收并补齐视图操作。

## 覆盖说明

- A01–A24 均有任务负责，14 进行组合场景回归；A11 的画布视图交互由 14 直接交付。
- 51 条用户故事均已分配到功能任务；跨功能行为在相应票扩展并由 14 验证。
- 测试保持已确认的两处边界：浏览器实际操作和显示规则输入输出。
- 每个任务单独维护内容、依赖和验收清单；以任务文件为准更新执行状态，不修改父规格来标记子任务完成。
