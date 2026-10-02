import { test, expect } from "@playwright/test";
test("配置规则在仅规则依赖点位上变色恢复，保存保持规则且数据不标脏", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加文字", exact: true }).click();
  await page.getByLabel("显示文字", { exact: true }).fill("温度显示规则");
  await page.getByRole("tab", { name: "规则", exact: true }).click();
  await page.getByRole("button", { name: "添加显示规则", exact: true }).click();
  await page.getByLabel("规则1条件1比较").selectOption("gt");
  await page.getByLabel("规则1条件1阈值").fill("80");
  await page.getByLabel("规则1颜色").fill("#ff0000");
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
  const label = page
    .getByTestId("canvas")
    .getByText("温度显示规则", { exact: true });
  await page.getByRole("tab", { name: "数据", exact: true }).click();
  await page.getByLabel("模拟温度", { exact: true }).fill("81");
  await expect(label).toHaveCSS("fill", "rgb(255, 0, 0)");
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
  await page.getByLabel("模拟温度", { exact: true }).fill("79");
  await expect(label).toHaveCSS("fill", "rgb(51, 65, 85)");
  await page.getByLabel("温度可用", { exact: true }).uncheck();
  await expect(
    page.getByText("数据异常：文字 1", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "选择图元 文字 1", exact: true })
    .click();
  await page.getByRole("tab", { name: "规则", exact: true }).click();
  await expect(page.getByLabel("规则1条件1阈值")).toHaveValue("80");
});

test("复合条件、优先级排序和删除可以撤销，预览共用规则", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加文字", exact: true }).click();
  await page.getByLabel("显示文字", { exact: true }).fill("组合规则");
  await page.getByRole("tab", { name: "规则", exact: true }).click();
  await page.getByRole("button", { name: "添加显示规则", exact: true }).click();
  await page.getByLabel("规则1颜色").fill("#ff0000");
  await page
    .getByRole("button", { name: "规则1添加条件", exact: true })
    .click();
  await page.getByLabel("规则1条件组合").selectOption("any");
  await page.getByRole("button", { name: "添加显示规则", exact: true }).click();
  await page.getByLabel("规则2颜色").fill("#0000ff");
  await page.getByRole("tab", { name: "数据", exact: true }).click();
  await page.getByLabel("模拟温度", { exact: true }).fill("81");
  const label = page
    .getByTestId("canvas")
    .getByText("组合规则", { exact: true });
  await expect(label).toHaveCSS("fill", "rgb(255, 0, 0)");
  await page.getByRole("tab", { name: "规则", exact: true }).click();
  await page.getByRole("button", { name: "上移规则2", exact: true }).click();
  await expect(label).toHaveCSS("fill", "rgb(0, 0, 255)");
  await page.getByRole("button", { name: "删除规则1", exact: true }).click();
  await expect(label).toHaveCSS("fill", "rgb(255, 0, 0)");
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(label).toHaveCSS("fill", "rgb(0, 0, 255)");
  await page.getByRole("button", { name: "预览草稿", exact: true }).click();
  await expect(
    page.getByTestId("runtime").getByText("组合规则", { exact: true }),
  ).toHaveCSS("fill", "rgb(0, 0, 255)");
});
