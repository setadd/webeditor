import { test, expect } from "@playwright/test";
test("自由绘制三种路径，拖动控制柄及一次撤销", async ({ page }) => {
  await page.goto("/");
  for (const [name, points] of [
    [
      "直线",
      [
        [300, 250],
        [450, 300],
      ],
    ],
    [
      "折线",
      [
        [310, 320],
        [390, 350],
        [460, 320],
      ],
    ],
    [
      "曲线",
      [
        [300, 400],
        [350, 360],
        [430, 460],
        [480, 400],
      ],
    ],
  ] as const) {
    await page
      .getByRole("button", { name: "绘制" + name, exact: true })
      .click();
    const canvas = await page.getByTestId("canvas").boundingBox();
    if (!canvas) throw Error();
    for (const [x, y] of points)
      await page.mouse.click(canvas.x + x, canvas.y + y);
    await page.getByRole("button", { name: "完成线条", exact: true }).click();
  }
  await expect(page.locator("[data-line-path]")).toHaveCount(3);
  const curve = page.locator("[data-line-path]").last();
  const before = await curve.getAttribute("d");
  const handle = await page
    .getByLabel("路径点 2", { exact: true })
    .boundingBox();
  if (!handle) throw Error();
  await page.mouse.move(handle.x + 5, handle.y + 5);
  await page.mouse.down();
  await page.mouse.move(handle.x + 35, handle.y + 25, { steps: 8 });
  await page.mouse.up();
  await expect(curve).not.toHaveAttribute("d", before!);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(curve).toHaveAttribute("d", before!);
});
test("自由端点不吸附设备，线型箭头与尺寸旋转复制保存恢复", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加设备", exact: true }).click();
  await page.getByRole("button", { name: "绘制直线", exact: true }).click();
  const b = await page.getByTestId("canvas").boundingBox();
  if (!b) throw Error();
  await page.mouse.click(b.x + 97, b.y + 97);
  await page.mouse.click(b.x + 303, b.y + 239);
  await page.getByRole("button", { name: "完成线条", exact: true }).click();
  await expect(page.getByLabel("X 坐标", { exact: true })).toHaveValue("97");
  const d = await page.locator("[data-line-path]").getAttribute("d");
  await page
    .getByRole("button", { name: "选择图元 设备 1", exact: true })
    .click();
  await page.getByLabel("X 坐标", { exact: true }).fill("150");
  await page.getByLabel("X 坐标", { exact: true }).press("Tab");
  await expect(page.locator("[data-line-path]")).toHaveAttribute("d", d!);
  await page
    .getByRole("button", { name: "选择图元 直线", exact: true })
    .click();
  await expect(page.getByLabel("X 坐标", { exact: true })).toHaveValue("97");
  await page.getByLabel("线宽", { exact: true }).fill("8");
  await page.getByLabel("线宽", { exact: true }).press("Tab");
  await page.getByLabel("线型", { exact: true }).selectOption("dashed");
  await page.getByLabel("起点箭头", { exact: true }).check();
  await page.getByLabel("终点箭头", { exact: true }).check();
  await expect(page.locator("[data-line-path]")).toHaveAttribute(
    "stroke-width",
    "8",
  );
  await expect(page.locator("[data-line-path]")).toHaveAttribute(
    "stroke-dasharray",
    "10 6",
  );
  await expect(page.locator("[data-line-path]")).toHaveAttribute(
    "marker-end",
    /url/,
  );
  await page.getByLabel("宽度", { exact: true }).fill("250");
  await page.getByLabel("旋转角度", { exact: true }).fill("30");
  await page.getByLabel("旋转角度", { exact: true }).press("Tab");
  await page.getByRole("button", { name: "重复", exact: true }).click();
  await expect(page.locator("[data-line-path]")).toHaveCount(2);
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await page.reload();
  await expect(page.locator("[data-line-path]")).toHaveCount(2);
  await page
    .getByRole("button", { name: "选择图元 直线", exact: true })
    .first()
    .click();
  await expect(page.getByLabel("旋转角度", { exact: true })).toHaveValue("30");
  await expect(page.getByLabel("线型", { exact: true })).toHaveValue("dashed");
  await page.getByRole("button", { name: "绘制折线", exact: true }).click();
  await page.mouse.click(b.x + 400, b.y + 200);
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-line-path]")).toHaveCount(2);
});
