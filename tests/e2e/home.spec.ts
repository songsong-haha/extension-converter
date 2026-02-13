import { test, expect } from "@playwright/test";

test.describe("homepage conversion funnel", () => {
  test("renders key acquisition messages", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /이미지 확장자 변환,\s*업로드 한 번으로 완료/i })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "100% 무료" })).toBeVisible();
    await expect(page.getByText("100% 무료 · 서버 업로드 없음")).toBeVisible();
    await expect(page.getByText("왜 Extension Converter인가요?", { exact: false })).toBeVisible();
  });

  test("shows conversion CTA guidance before format selection", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("이미지를 드래그하거나 클릭하여 업로드")).toBeVisible();
  });
});
