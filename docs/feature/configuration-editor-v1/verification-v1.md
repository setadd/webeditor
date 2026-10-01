# 首版整体验收记录

初验日期：2026-10-01；审查修复复验：2026-10-02。环境：Windows、本机 Microsoft Edge、Node.js 22.22.0、Vue 3.5 / Element Plus 2.14 / X6 3.1。浏览器验收使用隔离上下文及端口 5194，不接触日常站点保存。

代表性工程为演示项目：2 个页面、11 个图元（主页9个、详情页2个）、4 张嵌入 PNG。它覆盖混合编排和规则联动；没有进行千级图元、大图片压力或跨浏览器性能基准，不声明容量或帧率上限。

## 回归结果

最终验证：类型检查、生产构建与 49 项测试通过。测试包括浏览器真实操作和规则函数的公共输入/输出两处已确认边界。生产构建存在单包超过 500 KB 的体积提示，未影响本机功能验收。

运行命令：`npm test -- --workers=4`、`npm run build`。以下文件名均链接可复现测试；每行“实际”表示对应浏览器断言、规则输出断言或已查看的截图结果，非仅根据实现代码推断。

| 编号 | 操作 | 预期 | 实际结果 | 证据 |
| --- | --- | --- | --- | --- |
| A01 | 同页添加设备、文字、指标、趋势图 | 四类共存，属性修改准确 | 通过，演示页面混合显示 | [data](../../../tests/data.spec.ts)、[演示](../../../tests/acceptance.spec.ts) |
| A02 | 绘制三种线条并拖路径柄、移动设备 | 自由路径变化，不吸附设备 | 通过，曲线控制点改变、撤销恢复，设备移动不改变线路 | [lines](../../../tests/lines.spec.ts) |
| A03 | 改粗细、虚线、双端箭头，保存刷新 | 外观和保存一致 | 通过 | [lines](../../../tests/lines.spec.ts) |
| A04 | 正向、反向、速度及停止 | 流动方向与速度改变，底线保留 | 通过，实际 dash offset 及动画方向/时长变化 | [flow](../../../tests/flow.spec.ts)、[动画帧1](evidence/flow-frame-1.png)、[帧2](evidence/flow-frame-2.png) |
| A05 | 改流量、运行状态和可用性 | 自动切流向/停止，保留基础值 | 通过，负流量反向、停机优先、恢复基础 | [flow-rules](../../../tests/flow-rules.spec.ts) |
| A06 | 上传背景，四种模式和透明度 | 背景正确、不选中、不影响前景 | 通过，保存发布保留 | [background](../../../tests/background.spec.ts) |
| A07 | 撤销布局、规则、图片、背景并重做 | 单次拖动单步撤销，新分支清重做 | 通过 | [editing](../../../tests/editing.spec.ts)、[rules-ui](../../../tests/rules-ui.spec.ts)、[background](../../../tests/background.spec.ts) |
| A08 | 多选、框选、复制粘贴、删除、全选 | 独立身份且保留图片和规则 | 通过；另验证小页粘贴统一位移、过大拒绝、跨项目清剪贴板 | [editing](../../../tests/editing.spec.ts)、[states](../../../tests/states.spec.ts)、[acceptance](../../../tests/acceptance.spec.ts) |
| A09 | 锁定/隐藏/恢复、层级撤销与保存 | 不误编辑，图元可找回 | 通过；带图片组合中的锁定也保护删除 | [layers](../../../tests/layers.spec.ts)、[acceptance](../../../tests/acceptance.spec.ts) |
| A10 | 混合曲线组合移动、解组、对齐分布 | 相对位置、控制点和身份保持 | 通过，属性 X 修改带动组成员，复制组独立 | [layers](../../../tests/layers.spec.ts) |
| A11 | 50%缩放后拖动绘线、网格、平移、适应及100% | 坐标正确、网格不吸附、视图不标脏 | 通过；适应包含旋转负边缘，视口实际产生滚动 | [acceptance](../../../tests/acceptance.spec.ts) |
| A12 | 温度依次79、80、81、79 | 仅81变红并恢复基础 | 通过 | [rules](../../../tests/rules.spec.ts)、[rules-ui](../../../tests/rules-ui.spec.ts) |
| A13 | 多点位且/或、六比较及优先级排序 | 各属性首个命中 | 通过，颜色/图片/流动独立选取 | [rules](../../../tests/rules.spec.ts)、[rules-ui](../../../tests/rules-ui.spec.ts) |
| A14 | 运行、停止、故障切图 | 图片变化，几何/身份不变 | 通过，默认/运行/故障 PNG 随规则切换 | [states](../../../tests/states.spec.ts) |
| A15 | 手动预览图片并退出 | 不覆盖默认，不标脏 | 通过 | [states](../../../tests/states.spec.ts) |
| A16 | 依赖点位不可用后恢复 | 默认图片、异常提示、停止流动；恢复重求值 | 通过，包括只被规则引用的点位 | [rules](../../../tests/rules.spec.ts)、[states](../../../tests/states.spec.ts)、[flow-rules](../../../tests/flow-rules.spec.ts) |
| A17 | 保存、刷新、重新选择查看 | 页面/图片/背景/规则/曲线/布局保留 | 通过 | [editor](../../../tests/editor.spec.ts)、[background](../../../tests/background.spec.ts)、[acceptance](../../../tests/acceptance.spec.ts) |
| A18 | 演示导出后在新上下文导入 | 无原始图片文件也可继续运行 | 通过，两页和4张图片可重新发布并跳转 | [transfer](../../../tests/transfer.spec.ts)、[acceptance](../../../tests/acceptance.spec.ts) |
| A19 | 非法备份、未知点位、损坏资源、写入中断 | 错误明确，不破坏原有效内容 | 通过 | [transfer](../../../tests/transfer.spec.ts)、[editor](../../../tests/editor.spec.ts)、[publication](../../../tests/publication.spec.ts) |
| A20 | 发布A后编辑B再打开/刷新，重新发布 | 先A，重新发布后B | 通过 | [publication](../../../tests/publication.spec.ts) |
| A21 | 运行中删除/快捷键、详情、缩放 | 禁编辑、允许查看，草稿不变 | 通过，编辑面板不出现 | [publication](../../../tests/publication.spec.ts)、[runtime](../../../tests/runtime.spec.ts)、[acceptance](../../../tests/acceptance.spec.ts) |
| A22 | 跳页、名称/数据状态筛选、历史范围及清除 | 结果准确、仅作用运行视图 | 通过，多页切换详情关闭，运行数据订阅随作用域清理 | [runtime](../../../tests/runtime.spec.ts)、[flow-rules](../../../tests/flow-rules.spec.ts) |
| A23 | 输入时快捷键，未保存替换选择取消 | 不误删，取消保留 | 通过 | [editing](../../../tests/editing.spec.ts)、[transfer](../../../tests/transfer.spec.ts) |
| A24 | 载入演示→联动→复制分组→保存重开→备份导入→发布 | 整链路共存 | 通过，画像/线条/图表共同响应 | [acceptance](../../../tests/acceptance.spec.ts) |

## 视觉复核

已逐张查看以下截图。1280 宽时项目动作换行，保存/发布/导入/页面与视图控件均可达；1680 宽时保留三栏编辑区域。修复了趋势标题继承坐标导致覆盖曲线、数值文本左侧越出卡片的问题，截图已重新生成。

- [编辑器 1280×900](evidence/editor-1280.png)
- [编辑器 1680×1000](evidence/editor-1680.png)
- [运行预览 1280×900](evidence/runtime-1280.png)
- [运行预览 1680×1000](evidence/runtime-1680.png)

动画不是静态截图即可证明：流动验收使用两帧 dash offset 变化、方向和动画时长断言，另保留任务05两张视觉帧。页面切换/退出后旧画布DOM与其动画随卸载清理；没有把此功能性验证宣称为长时间内存压力测试。

## 复现与限制

运行 `npm run dev`，点击“载入演示项目”“适应内容”，按根目录 README 的快速体验操作。演示使用模拟温度/运行/故障/流量；未接真实平台、设备控制或服务器发布。本机保存限定浏览器来源，导出文件用于备份。仅单层组合，跨项目不保留内部剪贴板。

## 审查后复验

2026-10-02：Standards 轴0项发现；Spec 轴2项P2均修复，见 [审查记录](review.md)。新增5项浏览器用例验证绘线Enter/Esc输入隔离、旋转缩放手柄局部坐标、对角锚点、最小尺寸、页面边界和一次撤销。完整49项测试及构建通过。
