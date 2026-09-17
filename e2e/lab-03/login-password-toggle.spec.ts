import { test, expect } from "@playwright/test";

// Ref: docs/lab-03/ui-spec.md section 2 — Login password field with a
// show/hide toggle icon INSIDE the input box. Ref: docs/lab-03/tests.md VISUAL-07.
//
// Regression guards:
// 1. bootstrap-icons was installed but its CSS was never imported, so the
//    bi-eye glyph rendered as an empty box — icon-only control, no icon.
// 2. The toggle must sit INSIDE the password input box (overlaid on the
//    right edge), not as a separate attached button beside it.

test.describe("VISUAL-07: Login show/hide password eye icon (inside the input box)", () => {
    test("eye glyph renders inside the password input and toggles visibility", async ({ page }) => {
        await page.goto("/login");
        const toggle = page.locator("button[aria-label='Show password']");
        await expect(toggle).toBeVisible();

        // bootstrap-icons declares the glyph on ::before (the <i> inherits the
        // button font), so the pseudo-element's computed style is the proof.
        const { fontFamily, content } = await toggle.locator("i").evaluate((el) => {
            const s = getComputedStyle(el, "::before");
            return { fontFamily: s.fontFamily, content: s.content };
        });
        expect(fontFamily).toContain("bootstrap-icons");
        expect(content).not.toBe("none");

        // Icon-only control carries its accessible name (ui-spec §9)
        await expect(toggle).toHaveAttribute("aria-label", "Show password");

        // Geometry: the toggle is overlaid INSIDE the input box — its box lies
        // within the input's vertical bounds and hugs the input's right edge.
        const input = page.getByTestId("login-password");
        const inputBox = await input.boundingBox();
        const toggleBox = await toggle.boundingBox();
        expect(inputBox).not.toBeNull();
        expect(toggleBox).not.toBeNull();
        expect(toggleBox!.y).toBeGreaterThanOrEqual(inputBox!.y);
        expect(toggleBox!.y + toggleBox!.height).toBeLessThanOrEqual(inputBox!.y + inputBox!.height + 1);
        // Right edge of the toggle stays inside the input's right edge
        expect(toggleBox!.x + toggleBox!.width).toBeLessThanOrEqual(inputBox!.x + inputBox!.width + 1);

        // Clicking toggles the password field between hidden/visible text
        await expect(input).toHaveAttribute("type", "password");
        await toggle.click();
        await expect(input).toHaveAttribute("type", "text");
        await expect(page.locator("button[aria-label='Hide password']")).toBeVisible();

        // The same button's aria-label changed after the first click — re-locate
        await page.locator("button[aria-label='Hide password']").click();
        await expect(input).toHaveAttribute("type", "password");
    });
});
