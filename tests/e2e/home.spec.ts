import { test, expect } from "@playwright/test";

test.describe("homepage conversion funnel", () => {
  test("shows trust proof copy after conversion completes", async ({ page }) => {
    await page.goto("/?lang=ko");

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
    await page.goto("/?lang=ko");

    await expect(
      page.getByRole("heading", { name: /업로드 한 번으로,\s*원하는 포맷으로 바로 변환/i })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "100% 무료" })).toBeVisible();
    await expect(page.getByText("100% 무료 · 서버 업로드 없음")).toBeVisible();
    await expect(page.getByText("왜 Extension Converter인가요?", { exact: false })).toBeVisible();
  });

  test("renders english homepage copy when lang query is en", async ({ page }) => {
    await page.goto("/?lang=en");

    await expect(
      page.getByRole("heading", { name: /One upload,\s*instant conversion to your target format/i })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "100% free" })).toBeVisible();
    await expect(page.getByText("100% free · no server uploads")).toBeVisible();
    await expect(page.getByText("Frequently asked questions")).toBeVisible();
    await expect(page.getByText("Is it really free?")).toBeVisible();
  });

  test("falls back to accept-language when lang query is missing", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      extraHTTPHeaders: {
        "accept-language": "en-US,en;q=0.9,ko;q=0.8",
      },
    });
    const page = await context.newPage();

    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: /One upload,\s*instant conversion to your target format/i,
      })
    ).toBeVisible();

    await context.close();
  });

  test("prioritizes lang query and falls back via locale negotiation", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      extraHTTPHeaders: {
        "accept-language": "en-US,en;q=0.9",
      },
    });
    const page = await context.newPage();

    await page.goto("/?lang=ko");
    await expect(
      page.getByRole("heading", {
        name: /업로드 한 번으로,\s*원하는 포맷으로 바로 변환/i,
      })
    ).toBeVisible();

    await page.goto("/?lang=fr");
    await expect(
      page.getByRole("heading", {
        name: /One upload,\s*instant conversion to your target format/i,
      })
    ).toBeVisible();

    await context.close();

    const unsupportedContext = await browser.newContext({
      extraHTTPHeaders: {
        "accept-language": "fr-FR,fr;q=0.9",
      },
    });
    const unsupportedPage = await unsupportedContext.newPage();

    await unsupportedPage.goto("/?lang=fr");
    await expect(
      unsupportedPage.getByRole("heading", {
        name: /One upload,\s*instant conversion to your target format/i,
      })
    ).toBeVisible();

    await unsupportedContext.close();
  });

  test("shows conversion CTA guidance before format selection", async ({ page }) => {
    await page.goto("/?lang=ko");
    await expect(page.getByText("이미지를 드래그하거나 클릭하여 업로드")).toBeVisible();
  });

  test("shows inline format selection tip after file upload", async ({ page }) => {
    await page.goto("/?lang=ko");

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
    await expect(
      page.getByText("파일은 브라우저 안에서만 처리되며 서버로 업로드되지 않습니다.")
    ).toBeVisible();
  });

  test("shows failure guide with retry and alternative formats on conversion error", async ({ page }) => {
    await page.goto("/");

    await page.locator('input[type="file"]').setInputFiles({
      name: "broken.png",
      mimeType: "image/png",
      buffer: Buffer.from("not-a-real-image"),
    });

    await page.getByRole("button", { name: /^JPG/i }).click();
    await page.getByRole("button", { name: /PNG\s*→\s*JPG 변환/ }).click();

    await expect(page.getByText("변환에 실패했어요.")).toBeVisible();
    await expect(page.getByText("파일은 서버로 업로드되지 않았습니다.")).toBeVisible();
    await expect(page.getByRole("button", { name: "같은 설정으로 다시 시도" })).toBeVisible();
    await expect(page.getByText("다른 포맷으로 시도")).toBeVisible();
    await expect(page.getByRole("button", { name: "webp", exact: true })).toBeVisible();
  });

  test("renders english converter widget guidance and actions", async ({ page }) => {
    await page.goto("/?lang=en");
    await expect(page.getByText("Drag an image here or click to upload")).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles({
      name: "tiny.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7VQ0YAAAAASUVORK5CYII=",
        "base64"
      ),
    });

    await expect(
      page.getByText("Tip: Keep PNG for transparency, or choose WebP for smaller files.")
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Choose a format" })).toBeVisible();

    await page.getByRole("button", { name: /^JPG/i }).click();
    await expect(page.getByRole("button", { name: "Convert PNG → JPG" })).toBeVisible();
  });

  test("completes conversion with english trust copy", async ({ page }) => {
    await page.goto("/?lang=en");

    await page.locator('input[type="file"]').setInputFiles({
      name: "tiny.gif",
      mimeType: "image/gif",
      buffer: Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
        "base64"
      ),
    });

    await page.getByRole("button", { name: /^PNG/i }).click();
    await page.getByRole("button", { name: /Convert GIF → PNG/ }).click();

    await expect(
      page.getByText("Your file is processed only in your browser and is never uploaded to a server.")
    ).toBeVisible();
  });

  test("localizes metadata and FAQ schema by selected locale", async ({ page }) => {
    await page.goto("/?lang=en");
    await expect(page).toHaveTitle("ExtensionConverter — Free image format converter");
    const englishDescription = await page
      .locator('meta[name="description"]')
      .getAttribute("content");
    expect(englishDescription).toContain(
      "Convert PNG, JPG, WebP, GIF, BMP, AVIF, and ICO in seconds."
    );
    const hasEnglishFaqSchema = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      return scripts.some((script) =>
        script.textContent?.includes('"name":"Is it really free?"')
      );
    });
    expect(hasEnglishFaqSchema).toBe(true);

    await page.goto("/?lang=ko");
    await expect(page).toHaveTitle("ExtensionConverter — 무료 이미지 포맷 변환기");
    const koreanDescription = await page
      .locator('meta[name="description"]')
      .getAttribute("content");
    expect(koreanDescription).toContain("PNG, JPG, WebP, GIF, BMP, AVIF, ICO를 3초만에 변환하세요.");
    const hasKoreanFaqSchema = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      return scripts.some((script) =>
        script.textContent?.includes('"name":"정말 무료인가요?"')
      );
    });
    expect(hasKoreanFaqSchema).toBe(true);
  });

  test("renders FAQ entries and FAQ structured data", async ({ page }) => {
    await page.goto("/?lang=ko");

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
