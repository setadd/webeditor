import { test, expect } from "@playwright/test";
test("混合组件绑定实时点位，模拟数据不修改草稿，保存后恢复", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加指标", exact: true }).click();
  await page
    .getByLabel("绑定点位", { exact: true })
    .selectOption("temperature");
  await expect(
    page.getByTestId("canvas").getByText("25 °C", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await page.getByLabel("模拟温度", { exact: true }).fill("81");
  await expect(
    page.getByTestId("canvas").getByText("81 °C", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
  await page.getByLabel("温度可用", { exact: true }).uncheck();
  await expect(
    page.getByTestId("canvas").getByText("数据不可用", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "选择图元 指标 1", exact: true })
    .click();
  await expect(page.getByLabel("绑定点位", { exact: true })).toHaveValue(
    "temperature",
  );
  await expect(
    page.getByTestId("canvas").getByText("25 °C", { exact: true }),
  ).toBeVisible();
});
test("设备和趋势图显示对应数据，历史范围可调整并随绑定保存", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加设备", exact: true }).click();
  await page.getByLabel("绑定点位", { exact: true }).selectOption("running");
  await expect(
    page.getByTestId("canvas").getByText("1", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "添加趋势图", exact: true }).click();
  await page
    .getByLabel("绑定点位", { exact: true })
    .selectOption("temperature");
  await page.getByLabel("历史时间范围", { exact: true }).selectOption("15");
  const plot = page
    .getByTestId("canvas")
    .getByRole("img", { name: "历史趋势曲线" });
  await expect(plot).toHaveAttribute("d", /M.+L/);
  const before = await plot.getAttribute("d");
  await page.getByLabel("模拟温度", { exact: true }).fill("81");
  await expect(plot).not.toHaveAttribute("d", before!);
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await page.reload();
  await page
    .getByRole("button", { name: "选择图元 趋势图 1", exact: true })
    .click();
  await expect(page.getByLabel("历史时间范围", { exact: true })).toHaveValue(
    "15",
  );
  await page.getByLabel("绑定点位", { exact: true }).selectOption("");
  await expect(plot).toHaveAttribute("d", "");
});
