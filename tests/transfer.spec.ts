import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("完整项目备份在隔离存储中恢复背景和多页面且不自动发布", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加设备", exact: true }).click();
  const id = await page.getByLabel("图元标识", { exact: true }).inputValue();
  const url = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 4;
    c.height = 4;
    c.getContext("2d")!.fillRect(0, 0, 4, 4);
    return c.toDataURL();
  });
  await page.getByRole("tab", { name: "页面", exact: true }).click();
  await page
    .getByLabel("上传背景图", { exact: true })
    .setInputFiles({
      name: "plan.png",
      mimeType: "image/png",
      buffer: Buffer.from(url.split(",")[1]!, "base64"),
    });
  await page.getByRole("button", { name: "新建页面", exact: true }).click();
  await page.getByRole("dialog").getByLabel("页面名称").fill("第二页");
  await page.getByRole("button", { name: "创建页面", exact: true }).click();
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "项目菜单", exact: true }).click();
  await page.getByRole("button", { name: "导出项目", exact: true }).click();
  const download = await downloadPromise;
  const backup = await readFile((await download.path())!);
  await expect(page.getByTestId("save-state")).toHaveText("已保存");
  const context = await browser.newContext();
  const restored = await context.newPage();
  await restored.goto(page.url());
  await restored
    .getByLabel("导入项目文件", { exact: true })
    .setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: backup,
    });
  await expect(
    restored.getByText("项目已导入，请保存到本机", { exact: true }),
  ).toBeVisible();
  await expect(restored.getByTestId("save-state")).toHaveText("未保存");
  await restored
    .getByLabel("切换页面", { exact: true })
    .selectOption({ label: "未命名组态" });
  await expect(restored.getByTestId("background-image")).toHaveCSS(
    "background-image",
    /data:image\/png;base64/,
  );
  await restored
    .getByRole("button", { name: "选择图元 设备 1", exact: true })
    .click();
  await expect(restored.getByLabel("图元标识", { exact: true })).toHaveValue(
    id,
  );
  await restored
    .getByRole("button", { name: "保存到本机", exact: true })
    .click();
  await restored.reload();
  await expect(restored.getByTestId("background-image")).toHaveCSS(
    "background-image",
    /data:image\/png;base64/,
  );
  await restored.getByRole("button", { name: "项目菜单", exact: true }).click();
  await restored
    .getByRole("button", { name: "打开发布版本", exact: true })
    .click();
  await expect(restored.getByText(/尚无本机发布版本/)).toBeVisible();
  await context.close();
});

test("损坏备份、未知点位和无效图片均原子拒绝，取消替换保留草稿", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加设备", exact: true }).click();
  const id = await page.getByLabel("图元标识", { exact: true }).inputValue();
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  const dp = page.waitForEvent("download");
  await page.getByRole("button", { name: "项目菜单", exact: true }).click();
  await page.getByRole("button", { name: "导出项目", exact: true }).click();
  const backup = JSON.parse(await readFile((await (await dp).path())!, "utf8"));
  const cases = [
    { ...backup, formatVersion: 99 },
    { ...backup, elements: [backup.elements[0], backup.elements[0]] },
    {
      ...backup,
      elements: [{ ...backup.elements[0], binding: "unknown-point" }],
    },
    {
      ...backup,
      elements: [{ ...backup.elements[0], defaultImageId: "missing" }],
    },
    {
      ...backup,
      elements: [
        {
          ...backup.elements[0],
          interaction: { action: "navigate", pageId: "missing" },
        },
      ],
    },
    { ...backup, elements: [{ ...backup.elements[0], x: null }] },
    { ...backup, elements: [{ ...backup.elements[0], symbol: "unknown-symbol" }] },
    { ...backup, elements: [{ ...backup.elements[0], visual: { fontSize: 0 } }] },
    { ...backup, elements: [{ ...backup.elements[0], visual: { decimals: 2.5 } }] },
    ...["mode", "align", "imageFit"].map((key, index) => ({ ...backup, elements: [{ ...backup.elements[0], visual: { [key]: [["plain"], ["left"], ["stretch"]][index] } }] })),
    ...["lineCap", "lineJoin"].map(key => ({ ...backup, elements: [{ ...backup.elements[0], kind: "line", line: { type: "straight", points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], strokeWidth: 2, dash: "solid", startArrow: false, endArrow: false, [key]: ["round"] } }] })),
    { ...backup, elements: [{ ...backup.elements[0], visual: { fill: "url(https://example.invalid/image)" } }] },
    {
      ...backup,
      assets: {
        fake: {
          id: "fake",
          name: "broken.png",
          mime: "image/png",
          dataUrl: "data:image/png;base64,aW52YWxpZA==",
        },
      },
    },
  ];
  for (const value of ["not-json", ...cases.map((v) => JSON.stringify(v))]) {
    await page
      .getByLabel("导入项目文件", { exact: true })
      .setInputFiles({
        name: "bad.json",
        mimeType: "application/json",
        buffer: Buffer.from(value),
      });
    await expect(
      page.getByRole("alert").filter({ hasText: "导入失败" }).last(),
    ).toBeVisible();
    await expect(page.getByLabel("图元标识", { exact: true })).toHaveValue(id);
    await expect(page.getByTestId("save-state")).toHaveText("已保存");
  }
  await page.getByLabel("显示文字", { exact: true }).fill("未保存修改");
  await page
    .getByLabel("导入项目文件", { exact: true })
    .setInputFiles({
      name: "good.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backup)),
    });
  await page.getByRole("button", { name: "返回编辑", exact: true }).click();
  await expect(page.getByLabel("显示文字", { exact: true })).toHaveValue(
    "未保存修改",
  );
  await expect(page.getByTestId("save-state")).toHaveText("未保存");
  await page.evaluate(() => {
    File.prototype.text = () => Promise.reject(new Error("read failed"));
  });
  await page
    .getByLabel("导入项目文件", { exact: true })
    .setInputFiles({
      name: "read-error.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backup)),
    });
  await expect(
    page.getByRole("alert").filter({ hasText: "文件读取失败" }),
  ).toBeVisible();
  await expect(page.getByLabel("显示文字", { exact: true })).toHaveValue(
    "未保存修改",
  );
});

test("写入失败仍可备份，导入不改变已保存草稿和已发布快照", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加文字", exact: true }).click();
  await page.getByLabel("显示文字", { exact: true }).fill("有效原稿");
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await page.getByRole("button", { name: "发布到本机", exact: true }).click();
  await expect(page.getByText("本机发布成功", { exact: true })).toBeVisible();
  await page.getByLabel("显示文字", { exact: true }).fill("需要备份的修改");
  await page.evaluate(() => {
    IDBDatabase.prototype.transaction = function () {
      throw new DOMException("容量不足", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "保存到本机", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "保存失败" }),
  ).toBeVisible();
  const dp = page.waitForEvent("download");
  await page.getByRole("button", { name: "项目菜单", exact: true }).click();
  await page.getByRole("button", { name: "导出项目", exact: true }).click();
  const backup = await readFile((await (await dp).path())!);
  expect(JSON.parse(backup.toString()).elements[0].text).toBe("需要备份的修改");
  await page.reload();
  await page
    .getByRole("button", { name: "选择图元 文字 1", exact: true })
    .click();
  await expect(page.getByLabel("显示文字", { exact: true })).toHaveValue(
    "有效原稿",
  );
  await page
    .getByLabel("导入项目文件", { exact: true })
    .setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: backup,
    });
  await expect(
    page.getByText("项目已导入，请保存到本机", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "选择图元 文字 1", exact: true })
    .click();
  await expect(page.getByLabel("显示文字", { exact: true })).toHaveValue(
    "需要备份的修改",
  );
  await page.getByRole("button", { name: "项目菜单", exact: true }).click();
  await page.getByRole("button", { name: "打开发布版本", exact: true }).click();
  await expect(
    page.getByTestId("runtime").getByText("有效原稿", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "返回编辑", exact: true }).click();
  await page.reload();
  await page
    .getByRole("button", { name: "选择图元 文字 1", exact: true })
    .click();
  await expect(page.getByLabel("显示文字", { exact: true })).toHaveValue(
    "有效原稿",
  );
});
