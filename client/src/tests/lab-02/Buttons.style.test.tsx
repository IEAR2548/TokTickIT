import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "../../components/form/Button";

describe("Button style contract", () => {
    it.each([
        ["primary", "btn-primary"],
        ["secondary", "btn-secondary"],
        ["tertiary", "btn-tertiary"],
        ["destructive", "btn-destructive"],
    ] as const)("variant=%s renders class %s", (variant, expectedClass) => {
        render(<Button variant={variant}>Click me</Button>);
        const btn = screen.getByRole("button", { name: "Click me" });
        expect(btn.className).toContain(expectedClass);
        expect(btn.className).toContain("btn");
    });

    it("defaults to the primary variant when none is given", () => {
        render(<Button>Click me</Button>);
        expect(screen.getByRole("button", { name: "Click me" }).className).toContain("btn-primary");
    });

    it("adds btn-busy and disables the button while busy, showing the busy label", () => {
        render(
            <Button busy busyLabel="Submitting…">
                Submit
            </Button>
        );
        const btn = screen.getByRole("button", { name: "Submitting…" });
        expect(btn.className).toContain("btn-busy");
        expect(btn).toBeDisabled();
        expect(btn).toHaveAttribute("aria-busy", "true");
        expect(screen.queryByText("Submit")).not.toBeInTheDocument();
    });

    it("disables the button when disabled=true without adding btn-busy (plain disabled != busy)", () => {
        render(<Button disabled>Submit</Button>);
        const btn = screen.getByRole("button", { name: "Submit" });
        expect(btn).toBeDisabled();
        expect(btn.className).not.toContain("btn-busy");
    });
});