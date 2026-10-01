import { test, expect } from "@playwright/test";
test("状态图片自动切换、异常回退和手动预览保留图元身份与草稿", async ({
  page,
}) => {
  await page.goto("/");
  const colors = ["#bbbbbb", "#00ff00", "#ff0000"];
  const urls = await page.evaluate(
    (colors) =>
      colors.map((color) => {
        const c = document.createElement("canvas");
        c.width = 32;
        c.height = 32;
        const x = c.getContext("2d")!;
        x.fillStyle = color;
        x.fillRect(0, 0, 32, 32);
        return c.toDataURL();
      }),
    colors,
  );
  await page.getByRole("button", { name: "添加设备", exact: true }).click();
  const id = await page.getByLabel("图元标识", { exact: true }).inputValue();
  await page.getByLabel("上传默认图片", { exact: true }).setInputFiles({
    name: "default.png",
    mimeType: "image/png",
    buffer: Buffer.from(urls[0]!.split(",")[1]!, "base64"),
  });
  const image = page.getByTestId("canvas").locator("image");
  await expect(image).toHaveAttribute("href", urls[0]!);
  await page.getByLabel("上传状态图片", { exact: true }).setInputFiles({
    name: "running.png",
    mimeType: "image/png",
    buffer: Buffer.from(urls[1]!.split(",")[1]!, "base64"),
  });
  await page.getByLabel("规则1条件1点位").selectOption("running");
  await page.getByLabel("规则1条件1比较").selectOption("eq");
  await page.getByLabel("规则1条件1阈值").fill("1");
  await page.getByLabel("上传状态图片", { exact: true }).setInputFiles({
    name: "fault.png",
    mimeType: "image/png",
    buffer: Buffer.from(urls[2]!.split(",")[1]!, "base64"),
  });
  await page.getByLabel("规则2条件1点位").selectOption("fault");
  await page.getByLabel("规则2条件1比较").selectOption("eq");
  await page.getByLabel("规则2条件1阈值").fill("1");
  await page.getByRole("button", { name: "上移规则2", exact: true }).click();
  await page.getByLabel("模拟运行状态", { exact: true }).fill("1");
  await page.getByLabel("模拟故障状态", { exact: true }).fill("0");
  await expect(image).toHaveAttribute("href", urls[1]!);
  await page.getByLabel("模拟故障状态", { exact: true }).fill("1");
  await expect(image).toHaveAttribute("href", urls[2]!);
  await page.getByLabel("故障状态可用", { exact: true }).uncheck();
  await expect(image).toHaveAttribute("href", urls[0]!);
  await expect(
    page.getByText("数据异常：设备 1", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("故障状态可用", { exact: true }).check();
  await expect(image).toHaveAttribute("href", urls[2]!);
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await page
    .getByRole("button", { name: "预览图片 running.png", exact: true })
    .click();
  await expect(image).toHaveAttribute("href", urls[1]!);
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
  await page.getByRole("button", { name: "结束图片预览", exact: true }).click();
  await expect(image).toHaveAttribute("href", urls[2]!);
  await expect(page.getByLabel("图元标识", { exact: true })).toHaveValue(id);
  await expect(page.getByLabel("X 坐标", { exact: true })).toHaveValue("96");
  await page.getByLabel("模拟运行状态", { exact: true }).fill("0");
  await page.getByLabel("模拟故障状态", { exact: true }).fill("0");
  await expect(image).toHaveAttribute("href", urls[0]!);
  await page.reload();
  await page
    .getByRole("button", { name: "选择图元 设备 1", exact: true })
    .click();
  await expect(page.getByLabel("规则1条件1点位")).toHaveValue("fault");
  await page.getByLabel("模拟运行状态", { exact: true }).fill("0");
  await expect(page.getByLabel("图元标识", { exact: true })).toHaveValue(id);
  await expect(image).toHaveAttribute("href", urls[0]!);
});
test("图片编辑撤销、复制独立身份并发布图片快照", async ({ page }) => {
  await page.goto("/");
  const url = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 24;
    c.height = 24;
    c.getContext("2d")!.fillRect(0, 0, 24, 24);
    return c.toDataURL();
  });
  await page.getByRole("button", { name: "添加设备", exact: true }).click();
  await page.getByLabel("上传默认图片", { exact: true }).setInputFiles({
    name: "base.png",
    mimeType: "image/png",
    buffer: Buffer.from(url.split(",")[1]!, "base64"),
  });
  await expect(page.getByTestId("canvas").locator("image")).toBeVisible();
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(page.getByTestId("canvas").locator("image")).toBeHidden();
  await page.getByRole("button", { name: "重做", exact: true }).click();
  await expect(page.getByTestId("canvas").locator("image")).toHaveAttribute(
    "href",
    url,
  );
  const originalId = await page
    .getByLabel("图元标识", { exact: true })
    .inputValue();
  await page.getByRole("button", { name: "重复", exact: true }).click();
  expect(
    await page.getByLabel("图元标识", { exact: true }).inputValue(),
  ).not.toBe(originalId);
  await expect(page.getByTestId("canvas").locator("image")).toHaveCount(2);
  await expect(
    page.getByTestId("canvas").locator("image").last(),
  ).toHaveAttribute("href", url);
  await page
    .getByRole("button", { name: "预览图片 base.png", exact: true })
    .click();
  await page.getByRole("button", { name: "发布到本机", exact: true }).click();
  await page.getByRole("button", { name: "打开发布版本", exact: true }).click();
  await expect(page.getByTestId("runtime").locator("image")).toHaveCount(2);
  await expect(
    page.getByTestId("runtime").locator("image").last(),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByTestId("runtime").locator("image").last(),
  ).toHaveAttribute("href", url);
});
