import { test, expect } from "@playwright/test";
test("发布版本详情与项目页面跳转，运行筛选不修改草稿", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加设备", exact: true }).click();
  await page.getByLabel("图元名称", { exact: true }).fill("温度泵");
  await page
    .getByLabel("绑定点位", { exact: true })
    .selectOption("temperature");
  await page.getByLabel("点击动作", { exact: true }).selectOption("details");
  await page.getByRole("button", { name: "添加文字", exact: true }).click();
  await page.getByLabel("图元名称", { exact: true }).fill("导航入口");
  await page.getByRole("button", { name: "新建页面", exact: true }).click();
  await page.getByRole("dialog").getByLabel("页面名称").fill("设备二楼");
  await page.getByRole("button", { name: "创建页面", exact: true }).click();
  await page
    .getByLabel("切换页面", { exact: true })
    .selectOption({ label: "未命名组态" });
  await page
    .getByRole("button", { name: "选择图元 导航入口", exact: true })
    .click();
  await page.getByLabel("点击动作", { exact: true }).selectOption("navigate");
  await page
    .getByLabel("跳转目标页面", { exact: true })
    .selectOption({ label: "设备二楼" });
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
  await page.getByRole("button", { name: "发布到本机", exact: true }).click();
  await expect(page.getByText("本机发布成功", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "打开发布版本", exact: true }).click();
  await page
    .getByRole("button", { name: "查看图元 温度泵", exact: true })
    .click();
  const details = page.getByRole("dialog", { name: "图元详情" });
  await expect(details).toContainText("温度泵");
  await expect(details).toContainText("25 °C");
  await expect(details).toContainText("正常");
  await details.getByRole("button", { name: "关闭详情", exact: true }).click();
  await page.getByLabel("按名称筛选", { exact: true }).fill("温度");
  await expect(
    page.getByText("当前页面图元列表：1 / 2", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "清除筛选", exact: true }).click();
  await page
    .getByRole("button", { name: "查看图元 导航入口", exact: true })
    .click();
  await expect(
    page
      .getByTestId("runtime")
      .getByText("本机发布版本 · 设备二楼", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "返回编辑", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
});

test("规则异常状态筛选、历史范围与画布详情，退出后不影响配置", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加趋势图", exact: true }).click();
  await page
    .getByLabel("绑定点位", { exact: true })
    .selectOption("temperature");
  await page.getByLabel("图元名称", { exact: true }).fill("温度趋势");
  await page.getByLabel("点击动作", { exact: true }).selectOption("details");
  await page.getByRole("button", { name: "添加文字", exact: true }).click();
  await page.getByLabel("图元名称", { exact: true }).fill("故障指示");
  await page.getByLabel("显示文字", { exact: true }).fill("故障指示文字");
  await page.getByRole("button", { name: "添加显示规则", exact: true }).click();
  await page.getByLabel("规则1条件1点位").selectOption("fault");
  await page.getByLabel("故障状态可用", { exact: true }).uncheck();
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
  await page.getByRole("button", { name: "预览草稿", exact: true }).click();
  await page.getByLabel("按状态筛选", { exact: true }).selectOption("数据异常");
  await expect(
    page.getByRole("button", { name: "查看图元 故障指示", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "查看图元 温度趋势", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "清除筛选", exact: true }).click();
  const plot = page.getByRole("img", { name: "历史趋势曲线", exact: true });
  const before = await plot.getAttribute("d");
  await page.getByLabel("运行历史时间范围", { exact: true }).selectOption("15");
  await expect(plot).not.toHaveAttribute("d", before!);
  await page.getByTestId("canvas").getByText("25 °C", { exact: true }).click();
  await expect(page.getByRole("dialog", { name: "图元详情" })).toContainText(
    "温度趋势",
  );
  await page.getByRole("button", { name: "关闭详情", exact: true }).click();
  await page.getByRole("button", { name: "返回编辑", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
  await page
    .getByRole("button", { name: "选择图元 温度趋势", exact: true })
    .click();
  await expect(page.getByLabel("历史时间范围", { exact: true })).toHaveValue(
    "60",
  );
  await expect(page.getByLabel("模拟温度", { exact: true })).toHaveValue("25");
});
