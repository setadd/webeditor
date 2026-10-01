import { expect, test } from "@playwright/test";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=",
  "base64",
);
test("背景颜色、嵌入图片、四种铺放与透明度保存恢复且不参与选择", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("上传背景图", { exact: true })).toBeEnabled();
  await page.getByLabel("背景颜色", { exact: true }).fill("#ddeeff");
  await page
    .getByLabel("上传背景图", { exact: true })
    .setInputFiles({ name: "floor.png", mimeType: "image/png", buffer: png });
  const image = page.getByTestId("background-image");
  await expect(image).toHaveCSS("background-size", "contain");
  for (const [mode, size, repeat] of [
    ["cover", "cover", "no-repeat"],
    ["stretch", "100% 100%", "no-repeat"],
    ["tile", "auto", "repeat"],
    ["contain", "contain", "no-repeat"],
  ]) {
    await page.getByLabel("背景图片模式", { exact: true }).selectOption(mode);
    await expect(image).toHaveCSS("background-size", size);
    await expect(image).toHaveCSS("background-repeat", repeat);
  }
  await page.getByLabel("背景图片透明度", { exact: true }).fill("40");
  await expect(image).toHaveCSS("opacity", "0.4");
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(image).toHaveCSS("opacity", "1");
  await page.getByRole("button", { name: "重做", exact: true }).click();
  await page.getByRole("button", { name: "添加设备", exact: true }).click();
  await expect(page.getByRole("button", { name: /选择图元/ })).toHaveCount(1);
  await expect(page.getByTestId("canvas")).toHaveCSS("opacity", "1");
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await page.reload();
  await expect(image).toHaveCSS("opacity", "0.4");
  await expect(page.getByTestId("background-color")).toHaveCSS(
    "background-color",
    "rgb(221, 238, 255)",
  );
  await expect(image).toHaveCSS("background-image", /data:image\/png;base64/);
  await page.getByRole("button", { name: "移除背景图", exact: true }).click();
  await expect(image).toHaveCSS("background-image", "none");
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(image).toHaveCSS("background-image", /data:image\/png;base64/);
});
test("替换图片可撤销，拒绝不支持/损坏/超限图片并保留有效背景", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("上传背景图", { exact: true })).toBeEnabled();
  const input = page.getByLabel("上传背景图", { exact: true });
  await input.setInputFiles({
    name: "original.png",
    mimeType: "image/png",
    buffer: png,
  });
  const image = page.getByTestId("background-image");
  await expect(image).toHaveCSS("background-image", /data:image\/png;base64/);
  for (const mime of ["image/jpeg", "image/webp"]) {
    const url = await page.evaluate((type) => {
      const canvas = document.createElement("canvas");
      canvas.width = 10;
      canvas.height = 10;
      canvas.getContext("2d")!.fillRect(0, 0, 10, 10);
      return canvas.toDataURL(type);
    }, mime);
    await input.setInputFiles({
      name: "replacement",
      mimeType: mime,
      buffer: Buffer.from(url.split(",")[1], "base64"),
    });
    await expect(image).toHaveCSS("background-image", new RegExp(mime));
    await page.getByRole("button", { name: "撤销", exact: true }).click();
    await expect(image).toHaveCSS("background-image", /data:image\/png;base64/);
  }
  await input.setInputFiles({
    name: "bad.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg/>"),
  });
  await expect(page.getByRole("alert")).toContainText("仅支持");
  await input.setInputFiles({
    name: "bad.png",
    mimeType: "image/png",
    buffer: Buffer.from("not an image"),
  });
  await expect(page.getByRole("alert")).toContainText("图片内容无法读取");
  await input.setInputFiles({
    name: "large.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
  });
  await expect(page.getByRole("alert")).toContainText("不能超过 5 MB");
  await expect(image).toHaveCSS("background-image", /data:image\/png;base64/);
});
test("读取和存储失败时保留画面及上次有效保存", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("上传背景图", { exact: true })).toBeEnabled();
  const input = page.getByLabel("上传背景图", { exact: true });
  await input.setInputFiles({
    name: "floor.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect(page.getByTestId("background-image")).toHaveCSS(
    "background-image",
    /data:image\/png;base64/,
  );
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await page.evaluate(() => {
    FileReader.prototype.readAsDataURL = function () {
      this.dispatchEvent(new ProgressEvent("error"));
    };
  });
  await input.setInputFiles({
    name: "floor.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect(
    page.getByRole("alert").filter({ hasText: "图片读取失败" }),
  ).toContainText("图片读取失败");
  await page.getByLabel("背景颜色", { exact: true }).fill("#112233");
  await page.evaluate(() => {
    IDBDatabase.prototype.transaction = function () {
      throw new DOMException("容量不足", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(page.getByText(/保存失败：/)).toBeVisible();
  await expect(page.getByTestId("background-color")).toHaveCSS(
    "background-color",
    "rgb(17, 34, 51)",
  );
  await page.reload();
  await expect(page.getByTestId("background-color")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await expect(page.getByTestId("background-image")).toHaveCSS(
    "background-image",
    /data:image\/png;base64/,
  );
});
test("不同页面背景随发布快照保存并按逻辑画布尺寸显示", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("上传背景图", { exact: true })).toBeEnabled();
  await page
    .getByLabel("上传背景图", { exact: true })
    .setInputFiles({ name: "floor.png", mimeType: "image/png", buffer: png });
  await expect(page.getByTestId("background-image")).toHaveCSS(
    "background-image",
    /data:image\/png;base64/,
  );
  await page.getByRole("button", { name: "新建页面", exact: true }).click();
  await page.getByRole("dialog").getByLabel("页面名称").fill("第二页");
  await page.getByRole("button", { name: "创建页面", exact: true }).click();
  await page.getByRole("button", { name: "发布到本机", exact: true }).click();
  await expect(page.getByText("本机发布成功", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "打开发布版本", exact: true }).click();
  await page
    .getByLabel("切换页面", { exact: true })
    .selectOption({ label: "未命名组态" });
  await expect(page.getByTestId("background-image")).toHaveCSS(
    "background-image",
    /data:image\/png;base64/,
  );
  await expect(page.getByTestId("background-color")).toHaveCSS(
    "width",
    "960px",
  );
  await expect(page.getByLabel("上传背景图", { exact: true })).toHaveCount(0);
  await page.reload();
  await page
    .getByLabel("切换页面", { exact: true })
    .selectOption({ label: "未命名组态" });
  await expect(page.getByTestId("background-image")).toHaveCSS(
    "background-image",
    /data:image\/png;base64/,
  );
});
