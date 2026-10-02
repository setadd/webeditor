import type { Page } from "@playwright/test";

export async function contextAction(page: Page, name: string) {
  await page
    .getByRole("button", { name: /选择图元/, pressed: true })
    .first()
    .click({ button: "right" });
  await page
    .getByRole("menu", { name: "画布操作" })
    .getByRole("menuitem", { name, exact: true })
    .click();
}
