import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "../../components/Badge";

// Ref: docs/lab-03/ui-spec.md Section 1
// Ref: docs/lab-03/tests.md STYLE-01

describe("Lab 3 Badge style contract (STYLE-01)", () => {
    it.each([
        ["REQUESTER", "badge-role-requester", "Requester"],
        ["IT_STAFF", "badge-role-it_staff", "IT Staff"],
        ["ADMINISTRATOR", "badge-role-administrator", "Administrator"],
    ] as const)(
        "role %s renders class %s with label %s",
        (value, expectedClass, expectedLabel) => {
            render(<Badge kind="role" value={value} />);
            const badge = screen.getByTestId("badge-role");
            expect(badge).toHaveTextContent(expectedLabel);
            expect(badge.className).toContain(expectedClass);
        }
    );
});
