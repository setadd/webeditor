import { test, expect } from "@playwright/test";

test("适应内容可同时显示相距四万像素的图元", async ({ page }) => {
  await page.goto("/");
  for (const x of [-20000, 20000]) {
    await page.getByRole("button", { name: "添加设备", exact: true }).click();
    await page.getByLabel("X 坐标", { exact: true }).fill(String(x));
    await page.getByLabel("X 坐标", { exact: true }).press("Tab");
  }
  await page.getByRole("button", { name: "适应内容", exact: true }).click();
  const viewport = (await page.getByTestId("view-scroll").boundingBox())!;
  for (const node of await page
    .getByTestId("canvas")
    .locator(".x6-node")
    .all()) {
    const box = (await node.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(viewport.x);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.x + viewport.width);
    expect(box.y).toBeGreaterThanOrEqual(viewport.y);
    expect(box.y + box.height).toBeLessThanOrEqual(
      viewport.y + viewport.height,
    );
  }
});

test("负坐标、超出原尺寸的图元可保存重开并在发布版点击", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加设备", exact: true }).click();
  await page.getByLabel("X 坐标", { exact: true }).fill("-400");
  await page.getByLabel("Y 坐标", { exact: true }).fill("1800");
  await page.getByLabel("宽度", { exact: true }).fill("1200");
  await page.getByLabel("宽度", { exact: true }).press("Tab");
  await expect(page.getByLabel("X 坐标", { exact: true })).toHaveValue("-400");
  await expect(page.getByLabel("Y 坐标", { exact: true })).toHaveValue("1800");
  await expect(page.getByLabel("宽度", { exact: true })).toHaveValue("1200");
  await page.getByRole("tab", { name: "规则", exact: true }).click();
  await page.getByLabel("点击动作", { exact: true }).selectOption("details");
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
  await page.reload();
  await page
    .getByRole("button", { name: "选择图元 设备 1", exact: true })
    .click();
  await expect(page.getByLabel("X 坐标", { exact: true })).toHaveValue("-400");
  await expect(page.getByLabel("Y 坐标", { exact: true })).toHaveValue("1800");
  await page.getByRole("button", { name: "发布到本机", exact: true }).click();
  await expect(page.getByText("本机发布成功", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "项目菜单", exact: true }).click();
  await page.getByRole("button", { name: "打开发布版本", exact: true }).click();
  await page.getByTestId("canvas").locator(".x6-node").click();
  await expect(page.getByRole("dialog", { name: "图元详情" })).toContainText(
    "设备 1",
  );
});

test("原点外可拖入设备并绘制自由线条，平移不抢占绘图", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "添加设备", exact: true }),
  ).toBeEnabled();
  const view = page.getByTestId("view-scroll");
  const v = (await view.boundingBox())!;
  await view.hover({ position: { x: 100, y: 100 } });
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(v.x + 400, v.y + 300, { steps: 8 });
  await page.mouse.up({ button: "middle" });
  await expect
    .poll(async () => (await page.getByTestId("canvas").boundingBox())!.x)
    .toBe(v.x + 324);
  await page
    .getByRole("button", { name: "添加设备", exact: true })
    .dragTo(view, { targetPosition: { x: 100, y: 100 } });
  await expect(page.getByLabel("X 坐标", { exact: true })).toHaveValue("-316");
  await expect(page.getByLabel("Y 坐标", { exact: true })).toHaveValue("-180");
  const node = page.getByTestId("canvas").locator(".x6-node").first();
  const n = (await node.boundingBox())!;
  await page.mouse.move(n.x + n.width / 2, n.y + n.height / 2);
  await page.mouse.down();
  await page.mouse.move(n.x + n.width / 2 + 40, n.y + n.height / 2 + 30, {
    steps: 6,
  });
  await page.mouse.up();
  await expect(page.getByLabel("X 坐标", { exact: true })).toHaveValue("-276");
  await expect(page.getByLabel("Y 坐标", { exact: true })).toHaveValue("-150");
  await page.getByRole("button", { name: "绘制直线", exact: true }).click();
  const origin = (await page.getByTestId("canvas").boundingBox())!;
  await page.mouse.click(origin.x - 200, origin.y - 40);
  await page.mouse.click(origin.x + 130, origin.y - 20);
  await page.getByRole("button", { name: "完成线条", exact: true }).click();
  await expect(page.getByLabel("X 坐标", { exact: true })).toHaveValue("-200");
  await expect(page.getByLabel("Y 坐标", { exact: true })).toHaveValue("-40");
  await expect(page.getByLabel("宽度", { exact: true })).toHaveValue("330");
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
});

test("远处曲线控制点、框选组合与复制不受背景范围限制", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加设备", exact: true }).click();
  await page.getByLabel("X 坐标", { exact: true }).fill("50000");
  await page.getByLabel("Y 坐标", { exact: true }).fill("-60000");
  await page.getByLabel("Y 坐标", { exact: true }).press("Tab");
  await page.getByRole("button", { name: "适应内容", exact: true }).click();
  await page.getByRole("button", { name: "恢复100%", exact: true }).click();
  const origin = (await page.getByTestId("canvas").boundingBox())!;
  await page.getByRole("button", { name: "绘制曲线", exact: true }).click();
  for (const [x, y] of [
    [49920, -60060],
    [50000, -59900],
    [50200, -60040],
    [50380, -59880],
  ])
    await page.mouse.click(origin.x + x, origin.y + y);
  await page.getByRole("button", { name: "完成线条", exact: true }).click();
  await expect(page.getByLabel("X 坐标", { exact: true })).toHaveValue("49920");
  await expect(page.getByLabel("Y 坐标", { exact: true })).toHaveValue(
    "-60060",
  );
  const h = (await page
    .getByRole("button", { name: "路径点 1", exact: true })
    .boundingBox())!;
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(h.x + h.width / 2 - 50, h.y + h.height / 2 - 70, {
    steps: 6,
  });
  await page.mouse.up();
  await expect(page.getByLabel("X 坐标", { exact: true })).toHaveValue("49870");
  await expect(page.getByLabel("Y 坐标", { exact: true })).toHaveValue(
    "-60130",
  );
  await page.mouse.move(origin.x + 49840, origin.y - 60150);
  await page.mouse.down();
  await page.mouse.move(origin.x + 50400, origin.y - 59830, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByText("已选 2 项", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "组合", exact: true }).click();
  await page.getByRole("button", { name: "重复", exact: true }).click();
  await expect(page.getByRole("button", { name: /选择图元/ })).toHaveCount(4);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(page.getByRole("button", { name: /选择图元/ })).toHaveCount(2);
  await page
    .getByRole("button", { name: "选择图元 设备 1", exact: true })
    .click();
  await page.getByLabel("X 坐标", { exact: true }).fill("-50000");
  await page.getByLabel("X 坐标", { exact: true }).press("Tab");
  await page.getByRole("button", { name: "取消组合", exact: true }).click();
  await page
    .getByRole("button", { name: "选择图元 曲线", exact: true })
    .click();
  await expect(page.getByLabel("X 坐标", { exact: true })).toHaveValue(
    "-50130",
  );
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
});
