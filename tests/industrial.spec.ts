import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("透明设备图片可镜像，文字样式撤销恢复旧默认", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "设备", exact: true }).click();
  await page.getByRole("button", { name: "添加图片", exact: true }).click();
  const url = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 40;
    canvas.height = 40;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#0088ee";
    ctx.fillRect(0, 0, 20, 40);
    return canvas.toDataURL();
  });
  await page
    .getByLabel("上传默认图片", { exact: true })
    .setInputFiles({
      name: "pump.png",
      mimeType: "image/png",
      buffer: Buffer.from(url.split(",")[1]!, "base64"),
    });
  const node = page.getByTestId("canvas").locator(".x6-node");
  await expect(node.locator("rect").first()).toHaveAttribute(
    "fill",
    "transparent",
  );
  await page.getByLabel("水平镜像", { exact: true }).check();
  await expect(node.locator("image")).toHaveAttribute(
    "transform",
    /scale\(-1 1\)/,
  );
  await page.getByRole("button", { name: "基础", exact: true }).click();
  await page.getByRole("button", { name: "添加文字", exact: true }).click();
  const text = page
    .getByTestId("canvas")
    .getByText("在右侧编辑显示文字", { exact: true });
  await page.getByLabel("字号", { exact: true }).fill("32");
  await page.getByLabel("字号", { exact: true }).press("Tab");
  await expect(text).toHaveCSS("font-size", "32px");
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(text).toHaveCSS("font-size", "20px");
});

test("三类工业示例可编辑、备份恢复和发布跳页", async ({ page, browser }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "项目菜单", exact: true }).click();
  await page
    .getByRole("button", { name: "载入工业组态示例", exact: true })
    .click();
  await page.getByRole("button", { name: "适应内容", exact: true }).click();
  await expect(page.getByTestId("canvas")).toContainText("6 段母线");
  await page
    .getByLabel("切换页面", { exact: true })
    .selectOption({ label: "暖通工艺图" });
  await page.getByRole("button", { name: "适应内容", exact: true }).click();
  await expect(page.locator("[data-flow-path]").first()).toHaveAttribute(
    "stroke",
    "#ff5555",
  );
  await page
    .getByRole("button", { name: "选择图元 流动管线", exact: true })
    .first()
    .click();
  await page.getByLabel("线型", { exact: true }).selectOption("dotted");
  await page.getByLabel("端点样式", { exact: true }).selectOption("square");
  await page.getByLabel("折角样式", { exact: true }).selectOption("bevel");
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await page.getByRole("button", { name: "发布到本机", exact: true }).click();
  await expect(page.getByText("本机发布成功", { exact: true })).toBeVisible();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "项目菜单", exact: true }).click();
  await page.getByRole("button", { name: "导出项目", exact: true }).click();
  const backup = await readFile((await (await pending).path())!);
  const context = await browser.newContext();
  const restored = await context.newPage();
  await restored.goto(page.url());
  await restored.getByLabel("导入项目文件", { exact: true }).setInputFiles({
    name: "industrial.json",
    mimeType: "application/json",
    buffer: backup,
  });
  await expect(
    restored.getByText("项目已导入，请保存到本机", { exact: true }),
  ).toBeVisible();
  await restored
    .getByRole("button", { name: "选择图元 流动管线", exact: true })
    .first()
    .click();
  await expect(restored.getByLabel("线型", { exact: true })).toHaveValue(
    "dotted",
  );
  await expect(restored.getByLabel("折角样式", { exact: true })).toHaveValue(
    "bevel",
  );
  await context.close();
  await page.getByRole("button", { name: "项目菜单", exact: true }).click();
  await page.getByRole("button", { name: "打开发布版本", exact: true }).click();
  await page
    .getByTestId("canvas")
    .getByText("查看斜向管网图", { exact: true })
    .last()
    .click();
  await expect(page.getByTestId("canvas")).toContainText("能源站 · 斜向管网");
});

test("电气符号和透明数据文字可拖入、配置并保存", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "电气", exact: true }).click();
  await page
    .getByRole("button", { name: "添加断路器", exact: true })
    .dragTo(page.getByTestId("view-scroll"), {
      targetPosition: { x: 250, y: 180 },
    });
  await expect(page.getByLabel("图元名称", { exact: true })).toHaveValue(
    "断路器",
  );
  await page.getByLabel("水平镜像", { exact: true }).check();
  await page.getByRole("button", { name: "基础", exact: true }).click();
  await page.getByRole("button", { name: "添加数据文字", exact: true }).click();
  await page.getByLabel("字号", { exact: true }).fill("28");
  await page.getByLabel("字号", { exact: true }).press("Tab");
  await page.getByLabel("数值前缀", { exact: true }).fill("Ua:");
  await page.getByLabel("数值前缀", { exact: true }).press("Tab");
  await page.getByRole("tab", { name: "数据", exact: true }).click();
  await page.getByLabel("绑定点位", { exact: true }).selectOption("voltage");
  await expect(page.getByTestId("canvas")).toContainText("Ua:380.00 V");
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await page.reload();
  await expect(page.getByTestId("canvas")).toContainText("Ua:380.00 V");
  await page
    .getByRole("button", { name: "选择图元 断路器", exact: true })
    .click();
  await expect(page.getByLabel("水平镜像", { exact: true })).toBeChecked();
});
