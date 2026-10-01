import { test, expect } from "@playwright/test";
test("视图缩放网格平移不改文档，缩放后拖动和绘线坐标正确", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加设备", exact: true }).click();
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
  await page.getByLabel("画布缩放", { exact: true }).selectOption("0.5");
  await page.getByRole("button", { name: "显示网格", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
  const device = page
    .getByTestId("canvas")
    .getByText("设备 1", { exact: true })
    .last();
  const box = await device.boundingBox();
  if (!box) throw Error();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 20,
    box.y + box.height / 2 + 15,
    { steps: 6 },
  );
  await page.mouse.up();
  await expect(page.getByLabel("X 坐标", { exact: true })).toHaveValue("136");
  await expect(page.getByLabel("Y 坐标", { exact: true })).toHaveValue("126");
  await page.getByRole("button", { name: "绘制直线", exact: true }).click();
  const canvas = await page.getByTestId("canvas").boundingBox();
  if (!canvas) throw Error();
  await page.mouse.click(canvas.x + 101, canvas.y + 151);
  await page.mouse.click(canvas.x + 181, canvas.y + 161);
  await page.getByRole("button", { name: "完成线条", exact: true }).click();
  await expect(page.getByLabel("X 坐标", { exact: true })).toHaveValue("202");
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
  await page.getByRole("button", { name: "适应内容", exact: true }).click();
  await page.getByRole("button", { name: "恢复100%", exact: true }).click();
  await page.getByRole("button", { name: "平移画布", exact: true }).click();
  const view = page.getByTestId("view-scroll");
  await view.hover();
  await page.mouse.down();
  await page.mouse.move(600, 500, { steps: 4 });
  await page.mouse.up();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
  await page.getByRole("button", { name: "预览草稿", exact: true }).click();
  await page.getByLabel("画布缩放", { exact: true }).selectOption("0.75");
  await page.getByRole("button", { name: "返回编辑", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
});

import { readFile } from "node:fs/promises";
test("完整演示图片规则流动与复制组合保护，保存备份跨存储恢复发布", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "载入演示项目", exact: true }).click();
  await expect(page.getByTestId("page-title")).toHaveText(
    "冷却回路 · 实时监控",
  );
  await page.getByRole("button", { name: "适应内容", exact: true }).click();
  const image = page.getByTestId("canvas").locator("image");
  await expect(image).toHaveCount(1);
  const running = await image.getAttribute("href");
  await page.getByLabel("模拟温度", { exact: true }).fill("81");
  await expect(
    page.getByTestId("canvas").getByText("81 °C", { exact: true }).last(),
  ).toHaveCSS("fill", "rgb(220, 38, 38)");
  await page.getByLabel("模拟故障状态", { exact: true }).fill("1");
  await expect(image).not.toHaveAttribute("href", running!);
  await page.getByLabel("模拟流量", { exact: true }).fill("-1");
  await expect(page.locator("[data-flow-path]").first()).toHaveCSS(
    "animation-direction",
    "reverse",
  );
  await page.getByLabel("模拟运行状态", { exact: true }).fill("0");
  await expect(page.locator("[data-flow-path]").first()).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.getByLabel("故障状态可用", { exact: true }).uncheck();
  await expect(
    page.getByText("数据异常：循环水泵 P-01", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("故障状态可用", { exact: true }).check();
  await page.getByLabel("模拟故障状态", { exact: true }).fill("0");
  await page.getByLabel("模拟运行状态", { exact: true }).fill("1");
  await page.getByLabel("模拟流量", { exact: true }).fill("12");
  await page.getByLabel("模拟温度", { exact: true }).fill("79");
  await page
    .getByRole("button", { name: "选择图元 循环水泵 P-01", exact: true })
    .click();
  const id = await page.getByLabel("图元标识", { exact: true }).inputValue();
  await page.getByRole("button", { name: "重复", exact: true }).click();
  await expect(image).toHaveCount(2);
  await expect(page.getByLabel("图元标识", { exact: true })).not.toHaveValue(
    id,
  );
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(image).toHaveCount(1);
  await page
    .getByRole("button", { name: "选择图元 循环水泵 P-01", exact: true })
    .click();
  await page
    .getByRole("button", { name: "选择图元 供水管线", exact: true })
    .click({ modifiers: ["Control"] });
  await page.getByRole("button", { name: "组合", exact: true }).click();
  await page.getByLabel("X 坐标", { exact: true }).fill("255");
  await page.getByLabel("X 坐标", { exact: true }).press("Tab");
  await page
    .getByRole("button", { name: "锁定 循环水泵 P-01", exact: true })
    .click();
  await page.getByRole("button", { name: "删除", exact: true }).click();
  await expect(image).toHaveCount(1);
  await page
    .getByRole("button", { name: "解锁 循环水泵 P-01", exact: true })
    .click();
  await page
    .getByRole("button", { name: "隐藏 循环水泵 P-01", exact: true })
    .click();
  await expect(image).toHaveCount(0);
  await page
    .getByRole("button", { name: "显示 循环水泵 P-01", exact: true })
    .click();
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
  await page.reload();
  await expect(page.getByTestId("canvas").locator("image")).toHaveCount(1);
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出项目", exact: true }).click();
  const backup = await readFile((await (await dl).path())!);
  const context = await browser.newContext();
  const other = await context.newPage();
  await other.goto(page.url());
  await expect(other.getByLabel("导入项目文件", { exact: true })).toBeEnabled();
  await other
    .getByLabel("导入项目文件", { exact: true })
    .setInputFiles({
      name: "demo.json",
      mimeType: "application/json",
      buffer: backup,
    });
  await expect(
    other.getByText("项目已导入，请保存到本机", { exact: true }),
  ).toBeVisible();
  await other.getByRole("button", { name: "发布到本机", exact: true }).click();
  await expect(other.getByText("本机发布成功", { exact: true })).toBeVisible();
  await other
    .getByRole("button", { name: "打开发布版本", exact: true })
    .click();
  await expect(other.getByTestId("canvas").locator("image")).toHaveCount(1);
  await other
    .getByRole("button", { name: "查看图元 设备详情 →", exact: true })
    .click();
  await expect(
    other
      .getByTestId("runtime")
      .getByText("本机发布版本 · 设备详情", { exact: true }),
  ).toBeVisible();
  await context.close();
});

test("跨页面粘贴整体适应边界，超大选择拒绝且切项目清空剪贴板", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加设备", exact: true }).click();
  await page.getByLabel("X 坐标", { exact: true }).fill("700");
  await page.getByRole("button", { name: "重复", exact: true }).click();
  await page.getByRole("button", { name: "全选", exact: true }).click();
  await page.getByRole("button", { name: "复制", exact: true }).click();
  await page.getByRole("button", { name: "新建页面", exact: true }).click();
  await page.getByRole("dialog").getByLabel("画布宽度").fill("400");
  await page.getByRole("dialog").getByLabel("画布高度").fill("300");
  await page.getByRole("button", { name: "创建页面", exact: true }).click();
  await page.getByRole("button", { name: "粘贴", exact: true }).click();
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await page.getByRole("button", { name: "粘贴", exact: true }).click();
  await expect(
    page.getByTestId("canvas").getByText("设备 1", { exact: true }),
  ).toHaveCount(0);
});

test("无法容纳的粘贴拒绝，带图片的新项目不保留旧剪贴板", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加设备", exact: true }).click();
  await page.getByLabel("X 坐标", { exact: true }).fill("0");
  await page.getByRole("button", { name: "添加设备", exact: true }).click();
  await page.getByLabel("X 坐标", { exact: true }).fill("700");
  await page.getByRole("button", { name: "全选", exact: true }).click();
  await page.getByRole("button", { name: "复制", exact: true }).click();
  await page.getByRole("button", { name: "新建页面", exact: true }).click();
  await page.getByRole("dialog").getByLabel("画布宽度").fill("400");
  await page.getByRole("dialog").getByLabel("画布高度").fill("300");
  await page.getByRole("button", { name: "创建页面", exact: true }).click();
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
  await page.getByRole("button", { name: "粘贴", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("整体尺寸超出");
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
  await page.getByRole("button", { name: "载入演示项目", exact: true }).click();
  await page
    .getByRole("button", { name: "选择图元 循环水泵 P-01", exact: true })
    .click();
  await page.getByRole("button", { name: "复制", exact: true }).click();
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await page.getByRole("button", { name: "粘贴", exact: true }).click();
  await expect(page.getByTestId("canvas").locator("image")).toHaveCount(0);
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
});
