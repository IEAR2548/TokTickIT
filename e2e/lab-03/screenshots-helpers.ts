import { Page } from "@playwright/test";

// Ref: docs/lab-03/ui-spec.md section 10 — screenshot capture conventions for
// Issue #37. Follows the e2e/lab-02/screenshots.*.spec.ts pattern exactly:
// explicit setViewportSize per test, full-page capture, sticky header frozen
// so it does not smear down the page in fullPage shots.

export const SCREENSHOT_VIEWPORTS = [
    { name: "desktop", width: 1280, height: 800 },
    { name: "tablet", width: 820, height: 1180 },
    { name: "mobile", width: 375, height: 800 },
] as const;

/**
 * Lab 2 screenshot specs freeze the sticky app-shell header (position: static)
 * before a fullPage capture — fullPage screenshots otherwise repeat/overlay the
 * fixed header down the stitched image.
 */
export async function freezeStickyHeaderForScreenshot(page: Page) {
    await page.addStyleTag({ content: ".app-shell-header { position: static !important; }" });
}

/**
 * Full-page screenshot into artifacts/lab-03/screenshots/<screen>/<name>.png.
 */
export async function captureLab3Screenshot(page: Page, screen: string, name: string) {
    await freezeStickyHeaderForScreenshot(page);
    await page.screenshot({ path: `artifacts/lab-03/screenshots/${screen}/${name}.png`, fullPage: true });
}
