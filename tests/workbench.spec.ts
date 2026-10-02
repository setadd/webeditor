import { expect, test } from "@playwright/test";

for (const width of [1280, 1680]) {
  test(`${width}px 工作台面板收起扩大画布，切换页签不污染保存或撤销`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.getByRole("button", { name: "添加设备", exact: true }).click();
    await page.getByRole("button", { name: "保存到本机", exact: true }).click();
    await expect(page.getByTestId("save-state")).toHaveText("已保存");
    const canvas = page.getByTestId("view-scroll");
    const before = (await canvas.boundingBox())!;
    for (const name of ["切换组件库", "切换图层", "切换属性面板"]) {
      await page.getByRole("button", { name, exact: true }).click();
    }
    await expect
      .poll(async () => (await canvas.boundingBox())!.width)
      .toBeGreaterThan(before.width + 500);
    for (const name of ["切换组件库", "切换图层", "切换属性面板"]) {
      await page.getByRole("button", { name, exact: true }).click();
    }
    for (const name of ["数据", "规则", "页面", "属性"]) {
      await page.getByRole("tab", { name, exact: true }).click();
      await expect(
        page.getByRole("tabpanel", { name, exact: true }),
      ).toBeVisible();
      await expect(page.getByRole("tabpanel")).toHaveCount(1);
    }
    await expect(page.getByTestId("save-state")).toHaveText("已保存");
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBe(width);
    await page.getByRole("button", { name: "撤销", exact: true }).click();
    await expect(page.getByRole("button", { name: /选择图元/ })).toHaveCount(0);
    await page.getByRole("button", { name: "重做", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "选择图元 设备 1", exact: true }),
    ).toBeVisible();
  });
}

test("组件分类与搜索组合过滤，添加后打开属性并可绑定数据", async ({ page }) => {
  await page.goto("/");
  const categories = page.getByRole("navigation", { name: "组件分类" });
  await categories.getByRole("button", { name: "图表", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "添加趋势图", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "添加设备", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("textbox", { name: "搜索组件" }).fill("趋势");
  await expect(
    page.getByRole("button", { name: "添加指标", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "切换属性面板", exact: true }).click();
  await page.getByRole("button", { name: "添加趋势图", exact: true }).click();
  await expect(
    page.getByRole("tabpanel", { name: "属性", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "数据", exact: true }).click();
  await page
    .getByLabel("绑定点位", { exact: true })
    .selectOption("temperature");
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
  await page.reload();
  await page
    .getByRole("button", { name: "选择图元 趋势图 1", exact: true })
    .click();
  await page.getByRole("tab", { name: "数据", exact: true }).click();
  await expect(page.getByLabel("绑定点位", { exact: true })).toHaveValue(
    "temperature",
  );
});
