import { test, expect } from "@playwright/test";

test.describe("homepage conversion funnel", () => {
  test("renders key acquisition messages", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /업로드 한 번으로,\s*원하는 포맷으로 바로 변환/i })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "100% 무료" })).toBeVisible();
    await expect(page.getByText("100% 무료 · 서버 업로드 없음")).toBeVisible();
    await expect(page.getByText("왜 Extension Converter인가요?", { exact: false })).toBeVisible();
  });

  test("shows conversion CTA guidance before format selection", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("이미지를 드래그하거나 클릭하여 업로드")).toBeVisible();
  });

  test("renders FAQ entries and FAQ structured data", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "자주 묻는 질문" })).toBeVisible();
    await expect(page.getByText("정말 무료인가요?")).toBeVisible();
    await expect(page.getByText("파일이 서버로 업로드되나요?")).toBeVisible();
    await expect(page.getByText("어떤 포맷을 지원하나요?")).toBeVisible();

    const hasFaqSchema = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      return scripts.some((script) => script.textContent?.includes('"@type":"FAQPage"'));
    });
    expect(hasFaqSchema).toBe(true);
  });
});
