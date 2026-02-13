import { test, expect } from "@playwright/test";

test.describe("homepage conversion funnel", () => {
  test("shows trust proof copy after conversion completes", async ({ page }) => {
    await page.goto("/");

    await page.locator('input[type="file"]').setInputFiles({
      name: "tiny.gif",
      mimeType: "image/gif",
      buffer: Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
        "base64"
      ),
    });

    await page.getByRole("button", { name: /^PNG/i }).click();
    await page.getByRole("button", { name: /GIF\s*→\s*PNG 변환/ }).click();

    await expect(page.getByText("안심하세요. 파일은 브라우저 안에서만 처리되며 서버로 업로드되지 않습니다.")).toBeVisible();
  });

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

  test("shows inline format selection tip after file upload", async ({ page }) => {
    await page.goto("/");

    await page.locator('input[type="file"]').setInputFiles({
      name: "tiny.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7VQ0YAAAAASUVORK5CYII=",
        "base64"
      ),
    });

    await expect(
      page.getByText("팁: 투명 배경 유지가 필요하면 PNG, 용량을 줄이려면 WebP를 선택하세요.")
    ).toBeVisible();
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
