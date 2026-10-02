import { contextAction } from "./helpers/contextAction";
import { test, expect } from "@playwright/test";
test("锁定阻止属性编辑和删除，隐藏图元可恢复且保存", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加设备", exact: true }).click();
  await page.getByRole("button", { name: "锁定 设备 1", exact: true }).click();
  await page.getByLabel("X 坐标", { exact: true }).fill("200");
  await page.getByLabel("X 坐标", { exact: true }).press("Tab");
  await page.getByRole("button", { name: "删除", exact: true }).click();
  await expect(
    page.getByTestId("canvas").getByText("设备 1", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "隐藏 设备 1", exact: true }).click();
  await expect(
    page.getByTestId("canvas").getByText("设备 1", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "显示 设备 1", exact: true }).click();
  await page.getByRole("button", { name: "解锁 设备 1", exact: true }).click();
  await page
    .getByRole("button", { name: "选择图元 设备 1", exact: true })
    .click();
  await expect(page.getByLabel("X 坐标", { exact: true })).toHaveValue("96");
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
  await page.reload();
  await expect(
    page.getByTestId("canvas").getByText("设备 1", { exact: true }).first(),
  ).toBeVisible();
});

test("组合移动、复制组合独立、解组保留位置与层级撤销", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加设备", exact: true }).click();
  await page.getByLabel("X 坐标", { exact: true }).fill("100");
  await page.getByLabel("Y 坐标", { exact: true }).fill("100");
  await page.getByRole("button", { name: "添加文字", exact: true }).click();
  await page.getByLabel("X 坐标", { exact: true }).fill("400");
  await page.getByLabel("Y 坐标", { exact: true }).fill("200");
  await page.getByRole("button", { name: "全选", exact: true }).click();
  await contextAction(page, "组合");
  await page
    .getByRole("button", { name: "选择图元 设备 1", exact: true })
    .click();
  await page.getByLabel("X 坐标", { exact: true }).fill("150");
  await page.getByLabel("X 坐标", { exact: true }).press("Tab");
  await page
    .getByRole("button", { name: "选择图元 文字 1", exact: true })
    .click();
  // Group selection keeps the first member in properties; clear group to inspect independent coordinates.
  await contextAction(page, "取消组合");
  await page
    .getByRole("button", { name: "选择图元 文字 1", exact: true })
    .click();
  await expect(page.getByLabel("X 坐标", { exact: true })).toHaveValue("450");
  await page.getByRole("button", { name: "全选", exact: true }).click();
  await contextAction(page, "组合");
  await page.getByRole("button", { name: "重复", exact: true }).click();
  await page.getByLabel("X 坐标", { exact: true }).fill("200");
  await page.getByLabel("X 坐标", { exact: true }).press("Tab");
  await contextAction(page, "取消组合");
  await page
    .getByRole("button", { name: "选择图元 设备 1", exact: true })
    .last()
    .click();
  await expect(page.getByLabel("X 坐标", { exact: true })).toHaveValue("150");
  await contextAction(page, "置顶");
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
});

test("混合曲线组合移动、锁定控制柄以及三对象对齐分布", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加设备", exact: true }).click();
  await page.getByRole("button", { name: "绘制曲线", exact: true }).click();
  const c = await page.getByTestId("canvas").boundingBox();
  if (!c) throw Error();
  for (const [x, y] of [
    [300, 300],
    [350, 250],
    [400, 350],
    [450, 300],
  ])
    await page.mouse.click(c.x + x!, c.y + y!);
  await page.getByRole("button", { name: "完成线条", exact: true }).click();
  const before = await page.locator("[data-line-path]").getAttribute("d");
  await page.getByRole("button", { name: "全选", exact: true }).click();
  await contextAction(page, "组合");
  await page
    .getByRole("button", { name: "选择图元 设备 1", exact: true })
    .click();
  await page.getByLabel("X 坐标", { exact: true }).fill("146");
  await page.getByLabel("X 坐标", { exact: true }).press("Tab");
  await expect(page.locator("[data-line-path]")).toHaveAttribute("d", before!);
  await contextAction(page, "取消组合");
  await page
    .getByRole("button", { name: "选择图元 曲线", exact: true })
    .click();
  await expect(page.getByLabel("X 坐标", { exact: true })).toHaveValue("350");
  await page.getByRole("button", { name: "锁定 曲线", exact: true }).click();
  await expect(page.getByLabel("路径点 1", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "解锁 曲线", exact: true }).click();
  await page.getByRole("button", { name: "添加文字", exact: true }).click();
  await page.getByLabel("X 坐标", { exact: true }).fill("650");
  await page.getByLabel("X 坐标", { exact: true }).press("Tab");
  await page.getByRole("button", { name: "全选", exact: true }).click();
  await contextAction(page, "水平等距");
  await contextAction(page, "顶对齐");
  await page
    .getByRole("button", { name: "选择图元 曲线", exact: true })
    .click();
  await expect(page.getByLabel("Y 坐标", { exact: true })).toHaveValue("96");
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
});
