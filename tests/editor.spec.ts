import { expect, test } from "@playwright/test";

test("数据库事务中断不能提前报告保存成功", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加文字", exact: true }).click();
  await page.getByLabel("显示文字", { exact: true }).fill("事务中断前的画布");
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (
      ...args: Parameters<typeof original>
    ) {
      const request = original.apply(this, args);
      request.addEventListener("success", () => this.transaction.abort(), {
        once: true,
      });
      return request;
    };
  });
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "保存失败" }),
  ).toBeVisible();
  await expect(page.getByTestId("save-state")).toHaveText("未保存");
  await expect(
    page.getByTestId("canvas").getByText("事务中断前的画布", { exact: true }),
  ).toBeVisible();
});

test("创建页面并编辑设备与文字，保存刷新后完整恢复", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "新建页面", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("页面名称").fill("冷却水泵房");
  await dialog.getByLabel("画布宽度").fill("1200");
  await dialog.getByLabel("画布高度").fill("800");
  await dialog.getByRole("button", { name: "创建页面", exact: true }).click();
  await expect(page.getByTestId("page-title")).toHaveText("冷却水泵房");
  await page.getByRole("button", { name: "添加设备", exact: true }).click();
  await page.getByLabel("图元名称", { exact: true }).fill("循环水泵 P-01");
  await page.getByLabel("显示文字", { exact: true }).fill("运行设备");
  await page.getByLabel("X 坐标", { exact: true }).fill("160");
  await page.getByLabel("Y 坐标", { exact: true }).fill("180");
  await page.getByLabel("基础颜色", { exact: true }).fill("#2563eb");
  await page.getByLabel("基础颜色", { exact: true }).press("Tab");
  const deviceId = await page
    .getByLabel("图元标识", { exact: true })
    .inputValue();
  await page.getByRole("button", { name: "添加文字", exact: true }).click();
  await page.getByLabel("图元名称", { exact: true }).fill("区域标题");
  await page.getByLabel("显示文字", { exact: true }).fill("一号冷却回路");
  const textId = await page
    .getByLabel("图元标识", { exact: true })
    .inputValue();
  expect(deviceId).not.toBe(textId);
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
  await page.reload();
  await expect(page.getByTestId("page-title")).toHaveText("冷却水泵房");
  await expect(page.getByTestId("page-size")).toHaveText("1200 × 800");
  await expect(
    page.getByTestId("canvas").getByText("运行设备", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByTestId("canvas").getByText("运行设备", { exact: true }),
  ).toHaveCSS("fill", "rgb(37, 99, 235)");
  await expect(
    page.getByTestId("canvas").getByText("一号冷却回路", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "选择图元 循环水泵 P-01", exact: true })
    .click();
  await expect(page.getByLabel("图元标识", { exact: true })).toHaveValue(
    deviceId,
  );
  await expect(page.getByLabel("图元名称", { exact: true })).toHaveValue(
    "循环水泵 P-01",
  );
  await expect(page.getByLabel("X 坐标", { exact: true })).toHaveValue("160");
  await expect(page.getByLabel("Y 坐标", { exact: true })).toHaveValue("180");
  await expect(page.getByLabel("基础颜色", { exact: true })).toHaveValue(
    "#2563eb",
  );
  await page
    .getByRole("button", { name: "选择图元 区域标题", exact: true })
    .click();
  await expect(page.getByLabel("图元标识", { exact: true })).toHaveValue(
    textId,
  );
});

test("设备文字排布在设备卡片内", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加设备", exact: true }).click();
  await page.getByLabel("显示文字", { exact: true }).fill("一号循环泵");
  const canvas = await page.getByTestId("canvas").boundingBox();
  const text = await page
    .getByTestId("canvas")
    .getByText("一号循环泵", { exact: true })
    .boundingBox();
  if (!canvas || !text) throw new Error("画布文字未渲染");
  expect(text.y + text.height).toBeLessThanOrEqual(canvas.y + 96 + 112);
  expect(text.x + text.width).toBeLessThanOrEqual(canvas.x + 96 + 184);
});

test("拖动图元后位置与选择保持正确，最小画布中新图元不越界", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "新建页面", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("画布宽度").fill("400");
  await dialog.getByLabel("画布高度").fill("300");
  await dialog.getByRole("button", { name: "创建页面", exact: true }).click();
  await page.getByRole("button", { name: "添加设备", exact: true }).click();
  const device = page
    .getByTestId("canvas")
    .getByText("设备 1", { exact: true })
    .last();
  const box = await device.boundingBox();
  if (!box) throw new Error("设备没有渲染");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 40,
    box.y + box.height / 2 + 30,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect(page.getByLabel("X 坐标", { exact: true })).toHaveValue("136");
  await expect(page.getByLabel("Y 坐标", { exact: true })).toHaveValue("126");
  for (let i = 0; i < 7; i++)
    await page.getByRole("button", { name: "添加文字", exact: true }).click();
  const x = Number(
    await page.getByLabel("X 坐标", { exact: true }).inputValue(),
  );
  const y = Number(
    await page.getByLabel("Y 坐标", { exact: true }).inputValue(),
  );
  expect(x).toBeLessThanOrEqual(160);
  expect(y).toBeLessThanOrEqual(252);
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
  await page.reload();
  await page
    .getByRole("button", { name: "选择图元 设备 1", exact: true })
    .click();
  await expect(page.getByLabel("X 坐标", { exact: true })).toHaveValue("136");
  await expect(page.getByLabel("Y 坐标", { exact: true })).toHaveValue("126");
});

test("写入失败保留画布修改，重新打开仍是上次成功保存的内容", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加设备", exact: true }).click();
  await page.getByLabel("显示文字", { exact: true }).fill("已保存版本");
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
  await page
    .getByLabel("显示文字", { exact: true })
    .fill("失败后仍要保留的修改");
  // Inject an outage only at the browser storage boundary, not in application code.
  await page.evaluate(() => {
    const original = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (
      ...args: Parameters<typeof original>
    ) {
      if (args[1] === "readwrite")
        throw new DOMException("Storage full", "QuotaExceededError");
      return original.apply(this, args);
    };
  });
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "保存失败" }),
  ).toBeVisible();
  await expect(page.getByTestId("save-state")).toHaveText("未保存");
  await expect(page.getByLabel("显示文字", { exact: true })).toHaveValue(
    "失败后仍要保留的修改",
  );
  await page.getByRole("button", { name: "打开本机", exact: true }).click();
  await page.getByRole("button", { name: "继续", exact: true }).click();
  await expect(
    page.getByTestId("canvas").getByText("已保存版本", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
});
