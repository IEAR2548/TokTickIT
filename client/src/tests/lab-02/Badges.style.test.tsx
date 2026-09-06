import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "../../components/Badge";

describe("Badge style contract", () => {
    it("status NEW renders badge-status-new with label 'NEW'", () => {
        render(<Badge kind="status" value="NEW" />);
        const badge = screen.getByTestId("badge-status");
        expect(badge).toHaveTextContent("NEW");
        expect(badge.className).toContain("badge-status-new");
    });

    it.each([
        ["LOW", "badge-priority-low", "Low"],
        ["MEDIUM", "badge-priority-medium", "Medium"],
        ["HIGH", "badge-priority-high", "High"],
        ["CRITICAL", "badge-priority-critical", "Critical"],
    ] as const)("priority %s renders class %s with label %s", (value, expectedClass, expectedLabel) => {
        render(<Badge kind="priority" value={value} />);
        const badge = screen.getByTestId("badge-priority");
        expect(badge).toHaveTextContent(expectedLabel);
        expect(badge.className).toContain(expectedClass);
    });

    it("falls back to the raw value for an unrecognized status", () => {
        render(<Badge kind="status" value="ON_HOLD" />);
        const badge = screen.getByTestId("badge-status");
        expect(badge).toHaveTextContent("ON_HOLD");
        expect(badge.className).toContain("badge-status-on_hold");
    });
});