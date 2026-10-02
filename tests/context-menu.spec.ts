import { test, expect } from "@playwright/test";

test("旋转多选按可见包围框中心粘贴", async ({ page }) => {
  await page.goto("/");
  for (const [x, width, rotation] of [
    [0, 100, 90],
    [200, 20, 0],
  ]) {
    await page.getByRole("button", { name: "添加设备", exact: true }).click();
    for (const [label, value] of [
      ["X 坐标", x],
      ["Y 坐标", 0],
      ["宽度", width],
      ["高度", 20],
      ["旋转角度", rotation],
    ] as const) {
      await page.getByLabel(label, { exact: true }).fill(String(value));
      await page.getByLabel(label, { exact: true }).press("Tab");
    }
  }
  await page.getByRole("button", { name: "全选", exact: true }).click();
  await page
    .getByRole("button", { name: "选择图元 设备 1", exact: true })
    .click({ button: "right" });
  const menu = page.getByRole("menu", { name: "画布操作" });
  await menu.getByRole("menuitem", { name: "复制", exact: true }).click();
  const origin = (await page.getByTestId("canvas").boundingBox())!;
  await page.mouse.click(origin.x + 450, origin.y + 350, { button: "right" });
  await menu.getByRole("menuitem", { name: "粘贴", exact: true }).click();
  await expect(page.getByLabel("X 坐标", { exact: true })).toHaveValue("320");
  await expect(page.getByLabel("Y 坐标", { exact: true })).toHaveValue("340");
});

test("右键切换目标、保留多选，层级与锁定保护正确", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加设备", exact: true }).click();
  await page.getByRole("button", { name: "添加文字", exact: true }).click();
  const menu = page.getByRole("menu", { name: "画布操作" });
  const device = page.getByRole("button", {
    name: "选择图元 设备 1",
    exact: true,
  });
  await device.click({ button: "right" });
  await expect(device).toHaveAttribute("aria-pressed", "true");
  await menu.getByRole("menuitem", { name: "置顶", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /选择图元/ }).first(),
  ).toHaveAccessibleName("选择图元 设备 1");
  await device.click({ button: "right" });
  await menu.getByRole("menuitem", { name: "置底", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /选择图元/ }).last(),
  ).toHaveAccessibleName("选择图元 设备 1");
  await page.getByRole("button", { name: "全选", exact: true }).click();
  await device.click({ button: "right" });
  await expect(page.getByText("已选 2 项", { exact: true })).toBeVisible();
  await menu.getByRole("menuitem", { name: "组合", exact: true }).click();
  await device.click({ button: "right" });
  await menu.getByRole("menuitem", { name: "锁定", exact: true }).click();
  await device.click({ button: "right" });
  for (const name of ["删除", "置顶", "取消组合", "左对齐"]) {
    await expect(
      menu.getByRole("menuitem", { name, exact: true }),
    ).toBeDisabled();
  }
  await expect(
    menu.getByRole("menuitem", { name: "复制", exact: true }),
  ).toBeEnabled();
  await menu.getByRole("menuitem", { name: "解锁", exact: true }).click();
  await device.click({ button: "right" });
  await menu.getByRole("menuitem", { name: "取消组合", exact: true }).click();
  await device.click({ button: "right" });
  await menu.getByRole("menuitem", { name: "隐藏", exact: true }).click();
  await expect(
    page.getByTestId("canvas").locator(".x6-node:visible"),
  ).toHaveCount(0);
  await device.click({ button: "right" });
  await menu.getByRole("menuitem", { name: "显示", exact: true }).click();
  await expect(
    page.getByTestId("canvas").locator(".x6-node:visible"),
  ).toHaveCount(2);
});

test("空白菜单贴边可用、关闭不改文档，运行模式无编辑菜单", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加设备", exact: true }).click();
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  const view = page.getByTestId("view-scroll");
  const bounds = (await view.boundingBox())!;
  await page.mouse.click(
    bounds.x + bounds.width - 4,
    bounds.y + bounds.height - 4,
    { button: "right" },
  );
  const menu = page.getByRole("menu", { name: "画布操作" });
  await expect(
    menu.getByRole("menuitem", { name: "粘贴", exact: true }),
  ).toBeDisabled();
  await expect(
    menu.getByRole("menuitem", { name: "删除", exact: true }),
  ).toBeDisabled();
  const box = (await menu.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await page.keyboard.press("End");
  await expect(
    menu.getByRole("menuitem", { name: "全选", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(menu).toHaveCount(0);
  await page
    .getByTestId("canvas")
    .locator(".x6-node")
    .click({ button: "right" });
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "选择图元 设备 1", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
  await page.getByRole("button", { name: "预览草稿", exact: true }).click();
  await page
    .getByTestId("canvas")
    .locator(".x6-node")
    .click({ button: "right" });
  await expect(menu).toHaveCount(0);
});

test("右键复制并在空白位置粘贴，删除可撤销", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加设备", exact: true }).click();
  const node = page.getByTestId("canvas").locator(".x6-node").first();
  await node.click({ button: "right" });
  const menu = page.getByRole("menu", { name: "画布操作" });
  await expect(menu).toBeVisible();
  await menu.getByRole("menuitem", { name: "复制", exact: true }).click();
  const origin = (await page.getByTestId("canvas").boundingBox())!;
  await page.mouse.click(origin.x + 450, origin.y + 350, { button: "right" });
  await menu.getByRole("menuitem", { name: "粘贴", exact: true }).click();
  await expect(page.getByRole("button", { name: /选择图元/ })).toHaveCount(2);
  await expect(page.getByLabel("X 坐标", { exact: true })).toHaveValue("358");
  await expect(page.getByLabel("Y 坐标", { exact: true })).toHaveValue("294");
  await page
    .getByTestId("canvas")
    .locator(".x6-node")
    .last()
    .click({ button: "right" });
  await menu.getByRole("menuitem", { name: "删除", exact: true }).click();
  await expect(page.getByRole("button", { name: /选择图元/ })).toHaveCount(1);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(page.getByRole("button", { name: /选择图元/ })).toHaveCount(2);
});
