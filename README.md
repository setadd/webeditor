# 组态工作台

基于 Vue 3、Element Plus 和 AntV X6 的浏览器组态编辑器。

当前实现任务 01：新建单张组态页面，放置设备占位图元和文字，编辑名称、显示文字、坐标及基础颜色，拖动图元，保存到本机并重新打开。

## 本机运行

需要 Node.js 22.12 或以上版本。

```sh
npm ci
npm run dev
```

打开 http://127.0.0.1:5173 。开发服务仅监听本机。构建生产文件使用 `npm run build`，本机查看构建结果使用 `npm run preview`。

## 使用

1. 点击“新建页面”，填写名称、宽度与高度。
2. 在组件库点击“设备”或“文字”添加图元。
3. 拖动画布中的图元；或从图元列表选择对象，在属性栏修改名称、文字、X/Y 坐标和颜色。
4. 点击“保存到本机”，等待顶部状态变为“已保存”。刷新会恢复最近一次成功保存。
5. “打开本机”重新读取最近一次保存。若有图元修改尚未保存，先确认是否离开修改。

当前版本仅保留一个活动页面的本机保存，新建页面后保存会替换上一次保存。数据存储在当前浏览器、当前站点来源的 IndexedDB 中；更换浏览器、端口或主机名会使用不同存储，清除站点数据会移除保存内容。

写入失败会保留画布修改并显示错误，不会显示保存成功；读取到损坏或不兼容内容时阻止直接覆盖，用户可重试读取或明确新建页面。

## 验证

```sh
npm run typecheck
npm test
npm run build
```

浏览器测试默认使用本机 Microsoft Edge，无需额外下载测试浏览器。其他环境可安装 Playwright Chromium 并设置 `PLAYWRIGHT_CHANNEL=chromium`；例如在 PowerShell 中：

```powershell
npx playwright install chromium
$env:PLAYWRIGHT_CHANNEL = 'chromium'
npm test
```

测试使用独立浏览器上下文和 5174 端口，不读取正常使用时 5173 端口的本机保存。测试涵盖新建、属性编辑、稳定标识、拖动、最小画布边界、文字排布、刷新恢复和存储故障。

人工复核：创建 1200 × 800 页面，添加水泵和标题；将水泵设为 X=160、Y=180、蓝色，保存并刷新；确认显示、属性及图元标识一致。再拖动设备并保存，确认重新打开保留位置。

## 后续范围

撤销重做、自由曲线、流动动画、背景图片、模拟数据、状态图片、显示规则、多页面发布和导入导出尚未实现，按[开发任务](docs/feature/configuration-editor-v1/README.md)继续推进。

完整范围见[首版规格](docs/feature/configuration-editor-v1/spec.md)。任务管理采用本地 Markdown，约定见 [AGENTS.md](AGENTS.md)。

## 技术参考

- [AntV X6 画布文档](https://x6.antv.antgroup.com/tutorial/basic/graph)
- [Element Plus](https://element-plus.org/)
