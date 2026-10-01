import { test, expect } from "@playwright/test";
test("负流量规则改变真实流向，停机优先级、异常恢复与基础配置独立", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "绘制曲线", exact: true }).click();
  const b = await page.getByTestId("canvas").boundingBox();
  if (!b) throw Error();
  for (const [x, y] of [
    [300, 250],
    [350, 200],
    [460, 330],
    [520, 250],
  ])
    await page.mouse.click(b.x + x, b.y + y);
  await page.getByRole("button", { name: "完成线条", exact: true }).click();
  await page.getByLabel("启用流动", { exact: true }).check();
  await page.getByRole("button", { name: "添加显示规则", exact: true }).click();
  await page.getByLabel("规则1条件1点位").selectOption("flow");
  await page.getByLabel("规则1条件1比较").selectOption("lt");
  await page.getByLabel("规则1条件1阈值").fill("0");
  await page.getByLabel("规则1颜色").fill("");
  await page.getByLabel("规则1配置流动").check();
  await page.getByLabel("规则1流动方向").selectOption("reverse");
  await page.getByLabel("规则1流动速度").fill("2");
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  const flow = page.locator("[data-flow-path]");
  await page.getByLabel("模拟流量", { exact: true }).fill("-5");
  await expect(flow).toHaveCSS("animation-direction", "reverse");
  await expect(flow).toHaveCSS("animation-duration", "0.5s");
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
  await expect(page.getByLabel("流动方向", { exact: true })).toHaveValue(
    "forward",
  );
  await page.getByLabel("模拟流量", { exact: true }).fill("5");
  await expect(flow).toHaveCSS("animation-direction", "normal");
  await expect(flow).toHaveCSS("animation-duration", "1s");
  await page.getByLabel("流量可用", { exact: true }).uncheck();
  await expect(flow).toHaveCSS("animation-name", "none");
  await expect(page.getByText("数据异常：曲线", { exact: true })).toBeVisible();
  await page.getByLabel("模拟流量", { exact: true }).fill("-3");
  await page.getByLabel("流量可用", { exact: true }).check();
  await expect(flow).toHaveCSS("animation-direction", "reverse");
  await page.getByRole("button", { name: "添加显示规则", exact: true }).click();
  await page.getByLabel("规则2条件1点位").selectOption("running");
  await page.getByLabel("规则2条件1比较").selectOption("eq");
  await page.getByLabel("规则2条件1阈值").fill("0");
  await page.getByLabel("规则2颜色").fill("#ff0000");
  await page.getByLabel("规则2配置流动").check();
  await page.getByLabel("规则2流动方向").selectOption("stopped");
  await page.getByLabel("模拟运行状态", { exact: true }).fill("0");
  await expect(flow).toHaveCSS("animation-direction", "reverse");
  await expect(page.locator("[data-line-path]")).toHaveAttribute(
    "stroke",
    "#ff0000",
  );
  await page.getByRole("button", { name: "上移规则2", exact: true }).click();
  await expect(flow).toHaveCSS("animation-name", "none");
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(flow).toHaveCSS("animation-direction", "reverse");
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await page.reload();
  await page
    .getByRole("button", { name: "选择图元 曲线", exact: true })
    .click();
  await expect(page.getByLabel("规则1流动方向")).toHaveValue("reverse");
  await expect(page.getByLabel("规则2流动方向")).toHaveValue("stopped");
});

test("三类线路按运行状态启停，发布快照保留规则且退出清理", async ({ page }) => {
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
    await page
      .getByRole("button", { name: "添加显示规则", exact: true })
      .click();
    await page.getByLabel("规则1条件1点位").selectOption("running");
    await page.getByLabel("规则1条件1比较").selectOption("eq");
    await page.getByLabel("规则1条件1阈值").fill("1");
    await page.getByLabel("规则1配置流动").check();
  }
  await page.getByLabel("模拟运行状态", { exact: true }).fill("0");
  for (const flow of await page.locator("[data-flow-path]").all())
    await expect(flow).toHaveCSS("animation-name", "none");
  await page.getByLabel("模拟运行状态", { exact: true }).fill("1");
  for (const flow of await page.locator("[data-flow-path]").all())
    await expect(flow).toHaveCSS("animation-name", "diagram-line-flow");
  const flow = page.locator("[data-flow-path]").first();
  const offset = await flow.evaluate(
    (e) => getComputedStyle(e).strokeDashoffset,
  );
  await page.waitForTimeout(150);
  expect(
    await flow.evaluate((e) => getComputedStyle(e).strokeDashoffset),
  ).not.toBe(offset);
  await page.getByRole("button", { name: "发布到本机", exact: true }).click();
  await expect(page.getByText("本机发布成功", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "打开发布版本", exact: true }).click();
  await expect(page.locator("[data-flow-path]")).toHaveCount(3);
  await expect(flow).toHaveCSS("animation-name", "diagram-line-flow");
  await page.getByRole("button", { name: "返回编辑", exact: true }).click();
  await expect(page.locator("[data-flow-path]")).toHaveCount(3);
});
