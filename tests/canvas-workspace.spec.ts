import { test, expect } from "@playwright/test";

test("组件从库拖入缩放画布，落点准确且一步撤销重做并保存", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("画布缩放", { exact: true }).selectOption("0.5");
  await page
    .getByRole("button", { name: "添加设备", exact: true })
    .dragTo(page.getByTestId("canvas"), { targetPosition: { x: 160, y: 140 } });
  await expect(page.getByRole("button", { name: /选择图元/ })).toHaveCount(1);
  await expect(page.getByLabel("X 坐标", { exact: true })).toHaveValue("228");
  await expect(page.getByLabel("Y 坐标", { exact: true })).toHaveValue("224");
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(page.getByRole("button", { name: /选择图元/ })).toHaveCount(0);
  await page.getByRole("button", { name: "重做", exact: true }).click();
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
  await page.reload();
  await page
    .getByRole("button", { name: "选择图元 设备 1", exact: true })
    .click();
  await expect(page.getByLabel("X 坐标", { exact: true })).toHaveValue("228");
});

test("工作区可跨越页面边缘双向平移，滚轮以鼠标位置缩放且不修改文档", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加设备", exact: true }).click();
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
  const view = page.getByTestId("view-scroll");
  const canvas = page.getByTestId("canvas");
  const v = (await view.boundingBox())!;
  const before = (await canvas.boundingBox())!;
  await page.mouse.move(v.x + 300, v.y + 200);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(v.x + 480, v.y + 330, { steps: 8 });
  await page.mouse.up({ button: "middle" });
  await expect
    .poll(async () => Math.round((await canvas.boundingBox())!.x - before.x))
    .toBe(180);
  await expect
    .poll(async () => Math.round((await canvas.boundingBox())!.y - before.y))
    .toBe(130);
  await page.mouse.move(v.x + 480, v.y + 330);
  await page.keyboard.down("Space");
  await page.mouse.down();
  await page.mouse.move(v.x + 80, v.y + 80, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up("Space");
  await expect
    .poll(async () => Math.round((await canvas.boundingBox())!.x - before.x))
    .toBe(-220);
  const current = (await canvas.boundingBox())!;
  const anchor = { x: current.x + 300, y: current.y + 200 };
  await page.mouse.move(anchor.x, anchor.y);
  await page.mouse.wheel(0, -200);
  await expect
    .poll(async () => (await canvas.boundingBox())!.width)
    .toBeGreaterThan(current.width);
  const zoomed = (await canvas.boundingBox())!;
  expect((anchor.x - zoomed.x) / zoomed.width).toBeCloseTo(
    300 / current.width,
    2,
  );
  expect((anchor.y - zoomed.y) / zoomed.height).toBeCloseTo(
    200 / current.height,
    2,
  );
  await expect(page.getByLabel("X 坐标", { exact: true })).toHaveValue("96");
  await expect(page.getByLabel("Y 坐标", { exact: true })).toHaveValue("96");
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
  await page.getByRole("button", { name: "适应内容", exact: true }).click();
  const device = (await canvas.locator(".x6-node").boundingBox())!;
  expect(device.x).toBeGreaterThanOrEqual(v.x);
  expect(device.x + device.width).toBeLessThanOrEqual(v.x + v.width);
});

test("平移后四类组件均可拖入，可跨过原点，拖到工作区外不新增", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("画布缩放", { exact: true }).selectOption("0.5");
  const view = page.getByTestId("view-scroll");
  const v = (await view.boundingBox())!;
  await page.mouse.move(v.x + 300, v.y + 200);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(v.x + 360, v.y + 250, { steps: 6 });
  await page.mouse.up({ button: "middle" });
  for (const [name, x, y, expectedX, expectedY] of [
    ["设备", 120, 100, "148", "144"],
    ["趋势图", 140, 110, "120", "130"],
    ["指标", 160, 120, "200", "184"],
    ["文字", 180, 130, "240", "236"],
  ] as const) {
    await page
      .getByRole("button", { name: "添加" + name, exact: true })
      .dragTo(page.getByTestId("canvas"), { targetPosition: { x, y } });
    await expect(page.getByLabel("X 坐标", { exact: true })).toHaveValue(
      expectedX,
    );
    await expect(page.getByLabel("Y 坐标", { exact: true })).toHaveValue(
      expectedY,
    );
  }
  await expect(page.getByRole("button", { name: /选择图元/ })).toHaveCount(4);
  await page
    .getByRole("button", { name: "添加设备", exact: true })
    .dragTo(page.getByTestId("canvas"), { targetPosition: { x: 3, y: 4 } });
  await expect(page.getByLabel("X 坐标", { exact: true })).toHaveValue("-86");
  await expect(page.getByLabel("Y 坐标", { exact: true })).toHaveValue("-48");
  await page
    .getByRole("button", { name: "添加设备", exact: true })
    .dragTo(page.getByTestId("page-title"));
  await expect(page.getByRole("button", { name: /选择图元/ })).toHaveCount(5);
  await page
    .getByRole("button", { name: "添加设备", exact: true })
    .dragTo(view, { targetPosition: { x: 5, y: 5 } });
  await expect(page.getByRole("button", { name: /选择图元/ })).toHaveCount(6);
});

test("低缩放下触控板小幅滚轮输入可连续累积", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("画布缩放", { exact: true }).selectOption("0.25");
  const canvas = page.getByTestId("canvas");
  const before = (await canvas.boundingBox())!.width;
  const view = (await page.getByTestId("view-scroll").boundingBox())!;
  await page.mouse.move(view.x + 80, view.y + 80);
  for (let i = 0; i < 16; i++) await page.mouse.wheel(0, -5);
  await expect
    .poll(async () => (await canvas.boundingBox())!.width)
    .toBeGreaterThan(before + 15);
});
