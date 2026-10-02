import { test, expect } from "@playwright/test";

test("多页面独立内容、重命名和保存恢复", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加文字", exact: true }).click();
  await page.getByLabel("显示文字", { exact: true }).fill("第一页内容");
  await page.getByRole("button", { name: "新建页面", exact: true }).click();
  await page.getByRole("dialog").getByLabel("页面名称").fill("第二页");
  await page.getByRole("button", { name: "创建页面", exact: true }).click();
  await expect(page.getByTestId("canvas").getByText("第一页内容")).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "添加文字", exact: true }).click();
  await page.getByLabel("显示文字", { exact: true }).fill("第二页内容");
  await page.getByLabel("当前页面名称", { exact: true }).fill("第二页改名");
  await page.getByLabel("当前页面名称", { exact: true }).press("Tab");
  await page
    .getByLabel("切换页面", { exact: true })
    .selectOption({ label: "未命名组态" });
  await expect(
    page.getByTestId("canvas").getByText("第一页内容"),
  ).toBeVisible();
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
  await page.reload();
  await page
    .getByLabel("切换页面", { exact: true })
    .selectOption({ label: "第二页改名" });
  await expect(
    page.getByTestId("canvas").getByText("第二页内容"),
  ).toBeVisible();
});

test("预览只读、发布快照独立于草稿并支持刷新和重新发布", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加文字", exact: true }).click();
  await page.getByLabel("显示文字", { exact: true }).fill("版本 A");
  await page.getByRole("button", { name: "预览草稿", exact: true }).click();
  await expect(
    page.getByTestId("runtime").getByText("版本 A", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "添加文字", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Delete");
  await page.keyboard.press("Control+z");
  await page.getByRole("button", { name: "返回编辑", exact: true }).click();
  await page.getByRole("button", { name: "发布到本机", exact: true }).click();
  await expect(page.getByText("本机发布成功", { exact: true })).toBeVisible();
  await expect(page.getByTestId("save-state")).toHaveText("未保存");
  await page.getByLabel("显示文字", { exact: true }).fill("版本 B");
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await page.getByRole("button", { name: "项目菜单", exact: true }).click();
  await page.getByRole("button", { name: "打开发布版本", exact: true }).click();
  await expect(
    page.getByTestId("runtime").getByText("版本 A", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByTestId("runtime").getByText("版本 A", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "返回编辑", exact: true }).click();
  await expect(
    page.getByTestId("canvas").getByText("版本 B", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "发布到本机", exact: true }).click();
  await expect(page.getByText("本机发布成功", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "项目菜单", exact: true }).click();
  await page.getByRole("button", { name: "打开发布版本", exact: true }).click();
  await expect(
    page.getByTestId("runtime").getByText("版本 B", { exact: true }),
  ).toBeVisible();
});

test("新建项目保护未保存内容，发布失败保留原快照", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加文字", exact: true }).click();
  await page.getByLabel("显示文字", { exact: true }).fill("有效快照");
  await page.getByRole("button", { name: "发布到本机", exact: true }).click();
  await expect(page.getByText("本机发布成功", { exact: true })).toBeVisible();
  await page.getByLabel("显示文字", { exact: true }).fill("未发布修改");
  await page.getByRole("button", { name: "项目菜单", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await page.getByRole("button", { name: "返回编辑", exact: true }).click();
  await expect(page.getByLabel("显示文字", { exact: true })).toHaveValue(
    "未发布修改",
  );
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
  await page.getByRole("button", { name: "发布到本机", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "发布失败" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "项目菜单", exact: true }).click();
  await page.getByRole("button", { name: "打开发布版本", exact: true }).click();
  await expect(
    page.getByTestId("runtime").getByText("有效快照", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "返回编辑", exact: true }).click();
  await expect(page.getByLabel("显示文字", { exact: true })).toHaveValue(
    "未发布修改",
  );
});
