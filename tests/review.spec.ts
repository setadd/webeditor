import { test, expect } from "@playwright/test";
test("绘线路径快捷键避让名称输入与弹窗", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "绘制折线", exact: true }).click();
  const canvas = await page.getByTestId("canvas").boundingBox();
  if (!canvas) throw Error();
  await page.mouse.click(canvas.x + 250, canvas.y + 150);
  await page.mouse.click(canvas.x + 350, canvas.y + 180);
  await page.getByLabel("当前页面名称", { exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-line-path]")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "完成线条", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "完成线条", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "新建页面", exact: true }).click();
  await page.getByRole("dialog").getByLabel("页面名称").focus();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "完成线条", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "完成线条", exact: true }).click();
  await expect(page.locator("[data-line-path]")).toHaveCount(1);
});

for (const scenario of [
  {
    angle: 0,
    scale: 1,
    dx: 40,
    dy: 20,
    width: 224,
    height: 132,
    x: 200,
    y: 200,
  },
  {
    angle: 90,
    scale: 1,
    dx: 40,
    dy: 0,
    width: 184,
    height: 72,
    x: 220,
    y: 220,
  },
  {
    angle: 45,
    scale: 0.5,
    dx: 14,
    dy: 14,
    width: 224,
    height: 112,
    x: 194,
    y: 214,
  },
])
  test(`旋转${scenario.angle}度在${scenario.scale * 100}%缩放调整大小保持对角锚点并一次撤销`, async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "添加设备", exact: true }).click();
    await page.getByLabel("X 坐标", { exact: true }).fill("200");
    await page.getByLabel("Y 坐标", { exact: true }).fill("200");
    await page
      .getByLabel("旋转角度", { exact: true })
      .fill(String(scenario.angle));
    await page.getByLabel("旋转角度", { exact: true }).press("Tab");
    await page
      .getByLabel("画布缩放", { exact: true })
      .selectOption(String(scenario.scale));
    const handle = page.getByRole("button", { name: "调整大小", exact: true });
    const before = await handle.boundingBox();
    if (!before) throw Error();
    const cx = before.x + before.width / 2,
      cy = before.y + before.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + scenario.dx, cy + scenario.dy, { steps: 8 });
    await page.mouse.up();
    for (const [label, value] of [
      ["宽度", scenario.width],
      ["高度", scenario.height],
      ["X 坐标", scenario.x],
      ["Y 坐标", scenario.y],
    ] as const)
      expect(
        Math.abs(
          Number(await page.getByLabel(label, { exact: true }).inputValue()) -
            value,
        ),
      ).toBeLessThanOrEqual(1);
    const after = await handle.boundingBox();
    if (!after) throw Error();
    expect(
      Math.abs(after.x + after.width / 2 - cx - scenario.dx),
    ).toBeLessThanOrEqual(2);
    expect(
      Math.abs(after.y + after.height / 2 - cy - scenario.dy),
    ).toBeLessThanOrEqual(2);
    await page.getByRole("button", { name: "撤销", exact: true }).click();
    await expect(page.getByLabel("宽度", { exact: true })).toHaveValue("184");
    await expect(page.getByLabel("高度", { exact: true })).toHaveValue("112");
    await expect(page.getByLabel("X 坐标", { exact: true })).toHaveValue("200");
    await expect(page.getByLabel("Y 坐标", { exact: true })).toHaveValue("200");
  });

test("旋转缩放在最小尺寸和页面边缘停止且可保存", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加设备", exact: true }).click();
  await page.getByLabel("X 坐标", { exact: true }).fill("200");
  await page.getByLabel("Y 坐标", { exact: true }).fill("200");
  await page.getByLabel("旋转角度", { exact: true }).fill("90");
  await page.getByLabel("旋转角度", { exact: true }).press("Tab");
  const drag = async (dx: number) => {
    const b = await page
      .getByRole("button", { name: "调整大小", exact: true })
      .boundingBox();
    if (!b) throw Error();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + dx, b.y + b.height / 2, {
      steps: 8,
    });
    await page.mouse.up();
  };
  await drag(200);
  await expect(page.getByLabel("高度", { exact: true })).toHaveValue("20");
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await page.getByLabel("X 坐标", { exact: true }).fill("5");
  await page.getByLabel("Y 坐标", { exact: true }).fill("5");
  await page.getByLabel("Y 坐标", { exact: true }).press("Tab");
  await drag(-100);
  await expect(page.getByLabel("X 坐标", { exact: true })).toHaveValue("0");
  await expect(page.getByLabel("Y 坐标", { exact: true })).toHaveValue("0");
  await expect(page.getByLabel("高度", { exact: true })).toHaveValue("122");
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
});
