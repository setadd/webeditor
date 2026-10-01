import { expect, test } from "@playwright/test";
test("批量复制删除撤销与分支，输入不触发删除", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加设备", exact: true }).click();
  const original = await page
    .getByLabel("图元标识", { exact: true })
    .inputValue();
  await page.getByRole("button", { name: "重复", exact: true }).click();
  expect(
    await page.getByLabel("图元标识", { exact: true }).inputValue(),
  ).not.toBe(original);
  await page.getByRole("button", { name: "全选", exact: true }).click();
  await page.getByRole("button", { name: "删除", exact: true }).click();
  await expect(page.getByRole("button", { name: /选择图元/ })).toHaveCount(0);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(page.getByRole("button", { name: /选择图元/ })).toHaveCount(2);
  await page.getByRole("button", { name: "添加文字", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "重做", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("显示文字", { exact: true }).focus();
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Delete");
  await expect(page.getByRole("button", { name: /选择图元/ })).toHaveCount(3);
});
test("一次拖动一步撤销，尺寸旋转保存恢复", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加设备", exact: true }).click();
  const node = page
    .getByTestId("canvas")
    .getByText("设备 1", { exact: true })
    .last();
  const b = await node.boundingBox();
  if (!b) throw Error();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 50, b.y + b.height / 2 + 40, {
    steps: 10,
  });
  await page.mouse.up();
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(page.getByLabel("X 坐标", { exact: true })).toHaveValue("96");
  await page.getByLabel("宽度", { exact: true }).fill("220");
  await page.getByLabel("旋转角度", { exact: true }).fill("30");
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await page.reload();
  await page
    .getByRole("button", { name: "选择图元 设备 1", exact: true })
    .click();
  await expect(page.getByLabel("宽度", { exact: true })).toHaveValue("220");
  await expect(page.getByLabel("旋转角度", { exact: true })).toHaveValue("30");
});
test("框选追加选择、拖动手柄和未保存取消保护", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加设备", exact: true }).click();
  await page.getByRole("button", { name: "添加文字", exact: true }).click();
  await page
    .getByRole("button", { name: "选择图元 设备 1", exact: true })
    .click();
  await page
    .getByRole("button", { name: "选择图元 文字 1", exact: true })
    .click({ modifiers: ["Shift"] });
  await expect(page.getByText("已选 2 项", { exact: true })).toBeVisible();
  const canvas = await page.getByTestId("canvas").boundingBox();
  if (!canvas) throw Error();
  await page.mouse.move(canvas.x + 70, canvas.y + 70);
  await page.mouse.down();
  await page.mouse.move(canvas.x + 400, canvas.y + 250, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByText("已选 2 项", { exact: true })).toBeVisible();
  const handle = await page
    .getByRole("button", { name: "调整大小", exact: true })
    .boundingBox();
  if (!handle) throw Error();
  await page.mouse.move(handle.x + 6, handle.y + 6);
  await page.mouse.down();
  await page.mouse.move(handle.x + 36, handle.y + 26, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByLabel("宽度", { exact: true })).toHaveValue("214");
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(page.getByLabel("宽度", { exact: true })).toHaveValue("184");
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await page.getByRole("button", { name: "全选", exact: true }).click();
  await page.getByRole("button", { name: "删除", exact: true }).click();
  await page.getByRole("button", { name: "打开本机", exact: true }).click();
  await page.getByRole("button", { name: "返回编辑", exact: true }).click();
  await expect(page.getByRole("button", { name: /选择图元/ })).toHaveCount(0);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
});
