import { test, expect } from "@playwright/test";
test("真实流动方向速度停止，基础虚线保持且动画不标脏", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "绘制直线", exact: true }).click();
  const b = await page.getByTestId("canvas").boundingBox();
  if (!b) throw Error();
  await page.mouse.click(b.x + 300, b.y + 280);
  await page.mouse.click(b.x + 550, b.y + 360);
  await page.getByRole("button", { name: "完成线条", exact: true }).click();
  await page.getByLabel("线型", { exact: true }).selectOption("dashed");
  await page.getByLabel("线宽", { exact: true }).fill("12");
  await page.getByLabel("线宽", { exact: true }).press("Tab");
  await page.getByLabel("启用流动", { exact: true }).check();
  const flow = page.locator("[data-flow-path]");
  await expect(flow).toHaveCSS("animation-direction", "normal");
  await expect(flow).toHaveCSS("animation-duration", "1s");
  const offset = await flow.evaluate(
    (e) => getComputedStyle(e).strokeDashoffset,
  );
  await page.waitForTimeout(150);
  expect(
    await flow.evaluate((e) => getComputedStyle(e).strokeDashoffset),
  ).not.toBe(offset);
  await page.getByLabel("流动方向", { exact: true }).selectOption("reverse");
  await expect(flow).toHaveCSS("animation-direction", "reverse");
  await page.getByLabel("流动速度", { exact: true }).fill("2");
  await page.getByLabel("流动速度", { exact: true }).press("Tab");
  await expect(flow).toHaveCSS("animation-duration", "0.5s");
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await page.waitForTimeout(250);
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
  await page.reload();
  await page
    .getByRole("button", { name: "选择图元 直线", exact: true })
    .click();
  await expect(flow).toHaveCSS("animation-direction", "reverse");
  await expect(flow).toHaveCSS("animation-duration", "0.5s");
  await page.getByLabel("流动方向", { exact: true }).selectOption("stopped");
  await expect(flow).toHaveCSS("animation-name", "none");
  await expect(page.locator("[data-line-path]")).toHaveAttribute(
    "stroke-dasharray",
    "10 6",
  );
  await expect(page.locator("[data-line-path]")).toBeVisible();
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(flow).toHaveCSS("animation-direction", "reverse");
});
test("三种路径视觉流动独立于箭头，删除重建清理动画", async ({ page }, info) => {
  await page.goto("/");
  for (const [name, points] of [
    [
      "直线",
      [
        [300, 200],
        [520, 200],
      ],
    ],
    [
      "折线",
      [
        [300, 290],
        [390, 250],
        [520, 290],
      ],
    ],
    [
      "曲线",
      [
        [300, 360],
        [350, 420],
        [450, 300],
        [520, 360],
      ],
    ],
  ] as const) {
    await page
      .getByRole("button", { name: "绘制" + name, exact: true })
      .click();
    const b = await page.getByTestId("canvas").boundingBox();
    if (!b) throw Error();
    for (const [x, y] of points) await page.mouse.click(b.x + x, b.y + y);
    await page.getByRole("button", { name: "完成线条", exact: true }).click();
    await page.getByLabel("线宽", { exact: true }).fill("12");
    await page.getByLabel("线宽", { exact: true }).press("Tab");
    await page.getByLabel("终点箭头", { exact: true }).check();
    await page.getByLabel("启用流动", { exact: true }).check();
  }
  await expect(page.locator("[data-flow-path]")).toHaveCount(3);
  const clip = page.getByTestId("canvas");
  const first = await clip.screenshot({
    path: info.outputPath("flow-frame-1.png"),
  });
  await page.waitForTimeout(180);
  const second = await clip.screenshot({
    path: info.outputPath("flow-frame-2.png"),
  });
  expect(first.equals(second)).toBe(false);
  await info.attach("流动第一帧", { body: first, contentType: "image/png" });
  await info.attach("流动第二帧", { body: second, contentType: "image/png" });
  await page.getByRole("button", { name: "全选", exact: true }).click();
  await page.getByRole("button", { name: "删除", exact: true }).click();
  await expect(page.locator("[data-flow-path]")).toHaveCount(0);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(page.locator("[data-flow-path]")).toHaveCount(3);
  await page.getByRole("button", { name: "预览草稿", exact: true }).click();
  await expect(page.locator("[data-flow-path]")).toHaveCount(3);
  await expect(page.getByLabel("路径点 1", { exact: true })).toHaveCount(0);
});
