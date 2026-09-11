import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";

// Ref: Lab 3 handout section 9 (Spec DD Deliverable), section 10 (Test DD),
// section 12 (Required Repository Increment)
//
// "TDD for documentation" — re-run this after every docs/lab-03/*.md edit for the
// rest of the sprint.
//
// FIXED in this revision: two describe blocks below ("HTTP status code
// completeness" and "Pagination page-size wording") asserted facts about Lab 2's
// actual conventions that were verified FALSE against Lab 2's own
// docs/lab-02/api-spec.md and specification.md:
//   - Lab 2 never used 410/413/415 anywhere. Its attachment endpoints reject
//     unsupported file types and oversized files with 400 (UNSUPPORTED_FILE_TYPE /
//     FILE_TOO_LARGE), consistently, in the same HTTP Status Code Reference table
//     style Lab 3 reuses. Asserting 410/413/415 "must be documented because they're
//     inherited from Lab 2" was asserting something Lab 2 never had.
//   - Lab 2's actual permitted page sizes are 10/25/50 (see Lab 2 BR-24: "Permitted
//     page sizes: 10, 25, 50", and Lab 2 api-spec.md's GET /api/tickets pageSize
//     parameter). The literal string "10/25/50" in Lab 3's api-spec.md is therefore
//     CORRECT and matches Lab 2 exactly — it was never a typo. The prior version of
//     this test had the wrong value (10/20/50) hardcoded as "the real convention"
//     and would have forced a real regression (deviating from Lab 2) to pass a
//     factually incorrect check.
// Both blocks were rewritten below to assert the actual, verified Lab 2 conventions
// instead. If Lab 2's own convention is ever intentionally changed, update the
// verified source-of-truth comment above alongside the assertion, not just the
// assertion.

// Ref: Lab 3 handout section 12 (Required Repository Increment) — docs/lab-03/
// lives at the REPOSITORY ROOT (sibling to server/, client/, e2e/), not inside
// server/. This file itself lives at server/scripts/, so reaching repo root
// requires going up TWO levels (scripts/ -> server/ -> repo root), then into
// docs/lab-03/.
const DOCS_DIR = path.join(__dirname, "..", "..", "docs", "lab-03");

function read(filename: string): string {
    return fs.readFileSync(path.join(DOCS_DIR, filename), "utf-8");
}

function extractIds(content: string, prefix: "FR" | "BR" | "AC"): number[] {
    const pattern = new RegExp(`\\*\\*${prefix}-(\\d+)\\*\\*`, "g");
    const ids: number[] = [];
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
        ids.push(Number(match[1]));
    }
    return [...new Set(ids)].sort((a, b) => a - b);
}

function assertSequentialFromOne(ids: number[], label: string) {
    expect(ids.length, `${label}: found zero entries`).toBeGreaterThan(0);
    expect(ids[0], `${label}: numbering must start at 01`).toBe(1);
    for (let i = 1; i < ids.length; i++) {
        expect(
            ids[i],
            `${label}: gap detected between ${label}-${String(ids[i - 1]).padStart(2, "0")} and the next entry (found ${ids[i]}, expected ${ids[i - 1] + 1})`
        ).toBe(ids[i - 1] + 1);
    }
}

/** Extracts unique AC-NN numbers that appear as plain "AC-NN" substrings (not requiring bold markers). */
function extractPlainAcIds(content: string): number[] {
    const pattern = /AC-(\d+)/g;
    const ids: number[] = [];
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
        ids.push(Number(match[1]));
    }
    return [...new Set(ids)];
}

describe("Lab 3 spec consistency (specification.md, api-spec.md, ui-spec.md, tests.md)", () => {
    let specification: string;
    let apiSpec: string;
    let uiSpec: string;
    let tests: string;

    beforeAll(() => {
        specification = read("specification.md");
        apiSpec = read("api-spec.md");
        uiSpec = read("ui-spec.md");
        tests = read("tests.md");
    });

    describe("Numbering integrity", () => {
        it("FR-NN in specification.md is sequential starting at FR-01", () => {
            assertSequentialFromOne(extractIds(specification, "FR"), "FR");
        });

        it("BR-NN in specification.md is sequential starting at BR-01", () => {
            assertSequentialFromOne(extractIds(specification, "BR"), "BR");
        });

        it("AC-NN in specification.md is sequential starting at AC-01", () => {
            assertSequentialFromOne(extractIds(specification, "AC"), "AC");
        });

        it("the Definition of Done range statements match the actual highest FR/BR/AC found", () => {
            const maxFR = Math.max(...extractIds(specification, "FR"));
            const maxBR = Math.max(...extractIds(specification, "BR"));
            const maxAC = Math.max(...extractIds(specification, "AC"));

            expect(
                specification.includes(`FR-01…FR-${String(maxFR).padStart(2, "0")}`),
                `DoD checklist should say "FR-01…FR-${String(maxFR).padStart(2, "0")}" to match the actual highest FR found`
            ).toBe(true);
            expect(
                specification.includes(`BR-01…BR-${String(maxBR).padStart(2, "0")}`),
                `DoD checklist should say "BR-01…BR-${String(maxBR).padStart(2, "0")}" to match the actual highest BR found`
            ).toBe(true);
            expect(
                specification.includes(`AC-01…AC-${String(maxAC).padStart(2, "0")}`),
                `DoD checklist should say "AC-01…AC-${String(maxAC).padStart(2, "0")}" to match the actual highest AC found`
            ).toBe(true);
        });
    });

    describe("AC traceability into tests.md (both directions)", () => {
        it("every AC in specification.md appears at least once in tests.md", () => {
            const acIds = extractIds(specification, "AC");
            const missing: string[] = [];

            for (const id of acIds) {
                const acLabel = `AC-${String(id).padStart(2, "0")}`;
                if (!tests.includes(acLabel)) {
                    missing.push(acLabel);
                }
            }

            expect(
                missing,
                `The following ACs from specification.md have NO row in tests.md: ${missing.join(", ")}`
            ).toEqual([]);
        });

        it("tests.md contains no orphan AC reference that doesn't exist in specification.md", () => {
            const specAcIds = new Set(extractIds(specification, "AC"));
            const orphans: string[] = [];
            for (const id of extractPlainAcIds(tests)) {
                if (!specAcIds.has(id)) orphans.push(`AC-${id}`);
            }

            expect(
                orphans,
                "tests.md references an AC that does not exist in specification.md (typo, or specification.md needs updating first)"
            ).toEqual([]);
        });

        it("every AC-NN in tests.md's traceability table (section 3) has a matching row in the planned-tests table (section 2)", () => {
            const plannedSection = tests.split("## 2. Planned Tests")[1]?.split("## 3.")[0] ?? "";
            const traceSection = tests.split("## 3. Acceptance-Criterion Traceability")[1]?.split("## 4.")[0] ?? "";

            const plannedIds = new Set(extractPlainAcIds(plannedSection));
            const traceIds = extractPlainAcIds(traceSection);

            const missingFromPlanned = [...new Set(traceIds.filter((id) => !plannedIds.has(id)))];
            expect(
                missingFromPlanned.map((id) => `AC-${id}`),
                "Section 3 traceability references AC IDs not found anywhere in the section 2 planned-tests table"
            ).toEqual([]);
        });
    });

    describe("Required conflict resolutions are explicit (specification.md section 11)", () => {
        const requiredDecisions: Array<{ label: string; mustMention: string[] }> = [
            { label: "App name (TikTockIT vs TokTickIT)", mustMention: ["TokTickIT", "TikTockIT"] },
            { label: "No email-delivery UI", mustMention: ["email"] },
            { label: "Service Actions tab omission", mustMention: ["Service Actions"] },
            { label: "No admin user-list pagination", mustMention: ["pagination"] },
            { label: "IT Staff Create Ticket nav visibility", mustMention: ["Create Ticket"] },
            { label: "Administrator staff-ticket-operation permissions", mustMention: ["D-10", "authorization matrix"] },
        ];

        it.each(requiredDecisions)("$label is addressed in specification.md", ({ mustMention }) => {
            for (const keyword of mustMention) {
                expect(
                    specification.toLowerCase().includes(keyword.toLowerCase()),
                    `specification.md never mentions "${keyword}" — this known decision point may be unresolved`
                ).toBe(true);
            }
        });
    });

    describe("Required repository structure paths appear in tests.md (handout section 12)", () => {
        const requiredTestFiles = [
            "server/tests/lab-03/auth.api.test.ts",
            "server/tests/lab-03/authorization.api.test.ts",
            "server/tests/lab-03/staff-queue.api.test.ts",
            "server/tests/lab-03/staff-ticket-detail.api.test.ts",
            "server/tests/lab-03/comments-notes.api.test.ts",
            "server/tests/lab-03/users-admin.api.test.ts",
        ];

        it.each(requiredTestFiles)("tests.md references %s at least once", (filePath) => {
            expect(tests.includes(filePath)).toBe(true);
        });

        it("tests.md references at least one E2E spec under e2e/lab-03/", () => {
            expect(/e2e\/lab-03\/[\w-]+\.spec\.ts/.test(tests)).toBe(true);
        });

        it("unit test files live under server/tests/lab-03/unit/, not colocated with src/", () => {
            const unitFilePattern = /`(server\/[\w/.-]+\.unit\.test\.ts)`/g;
            const offenders: string[] = [];
            let match: RegExpExecArray | null;
            while ((match = unitFilePattern.exec(tests)) !== null) {
                if (!match[1].startsWith("server/tests/lab-03/unit/")) {
                    offenders.push(match[1]);
                }
            }
            expect(
                offenders,
                `Unit test file(s) not under server/tests/lab-03/unit/: ${offenders.join(", ")}`
            ).toEqual([]);
        });
    });

    describe("Endpoint agreement between specification.md and api-spec.md", () => {
        it("auth endpoints are present in both files", () => {
            const authPaths = ["/api/auth/login", "/api/auth/logout", "/api/auth/me", "/api/auth/change-password"];
            for (const p of authPaths) {
                expect(specification.includes(p), `specification.md missing ${p}`).toBe(true);
                expect(apiSpec.includes(p), `api-spec.md missing ${p}`).toBe(true);
            }
        });

        it("admin endpoints are present in both files", () => {
            expect(specification.includes("/api/admin/users")).toBe(true);
            expect(apiSpec.includes("/api/admin/users")).toBe(true);
        });
    });

    describe("ui-spec.md covers every screen named in specification.md's UI summary", () => {
        const requiredScreens = ["Login", "Change Password", "Ticket Queue", "Ticket Detail", "User Management"];

        it.each(requiredScreens)('ui-spec.md has a section mentioning "%s"', (screenName) => {
            expect(uiSpec.includes(screenName)).toBe(true);
        });
    });

    describe("HTTP status code completeness in api-spec.md", () => {
        // CORRECTED: previously asserted 410/413/415 were "inherited unchanged from
        // Lab 2 attachment endpoints." Verified false — Lab 2's api-spec.md HTTP
        // Status Code Reference table only ever had 200/201/400/403/404/500, and its
        // attachment validation (unsupported type, oversized file) both return 400
        // with a specific error code (UNSUPPORTED_FILE_TYPE / FILE_TOO_LARGE), never
        // 415/413. There is nothing in either lab to inherit 410 from either.
        // This block now checks the actual complete status set Lab 3 introduces
        // relative to Lab 2 (adds 401, 409 for sessions/conflicts) instead.
        it.each(["200", "400", "401", "403", "404", "409", "500"])(
            "status %s is documented in the HTTP Status Code Reference table",
            (status) => {
                expect(
                    new RegExp(`\\|\\s*${status}(?:/\\d+)?\\s*\\|`).test(apiSpec),
                    `api-spec.md's HTTP Status Code Reference table is missing ${status}`
                ).toBe(true);
            }
        );

        it("does NOT introduce 410, 413, or 415 (no such codes exist in Lab 2 or Lab 3 scope)", () => {
            const statusTableSection = apiSpec.split("## HTTP Status Code Reference")[1] ?? "";
            for (const status of ["410", "413", "415"]) {
                expect(
                    new RegExp(`\\|\\s*${status}\\s*\\|`).test(statusTableSection),
                    `api-spec.md's HTTP Status Code Reference table lists ${status}, which neither Lab 2 nor ` +
                    "Lab 3's approved scope ever used — verify this wasn't introduced by mistake"
                ).toBe(false);
            }
        });
    });

    describe("Pagination page-size wording matches actual Lab 2 convention", () => {
        // CORRECTED: previously asserted the real convention was 10/20/50 and
        // flagged "10/25/50" as a typo. Verified false against Lab 2's own BR-24
        // ("Permitted page sizes: 10, 25, 50") and Lab 2 api-spec.md's GET
        // /api/tickets pageSize parameter — the real, documented Lab 2 convention
        // is 10/25/50. The assertions below were inverted to match verified fact.
        it("api-spec.md says 10/25/50, matching Lab 2's documented convention", () => {
            expect(
                apiSpec.includes("10/25/50"),
                "api-spec.md should state the 10/25/50 page sizes it claims to reuse from Lab 2 " +
                "(see Lab 2 BR-24: \"Permitted page sizes: 10, 25, 50\")"
            ).toBe(true);
        });

        it("api-spec.md does not introduce 10/20/50 (not Lab 2's actual convention)", () => {
            expect(
                apiSpec.includes("10/20/50"),
                "api-spec.md contains \"10/20/50\", which does not match Lab 2's documented " +
                "convention of 10/25/50 (BR-24) — verify this wasn't introduced by mistake"
            ).toBe(false);
        });
    });

    describe("Cross-file feature consistency: appears-resolved indicator", () => {
        it("if ui-spec.md specifies the staff-side appears-resolved badge, tests.md must have a test for it", () => {
            const uiSpecMentionsIt = uiSpec.includes("appears-resolved-badge") || uiSpec.includes("appearsResolved");
            if (!uiSpecMentionsIt) return; // nothing to check if the feature isn't specified at all

            const testsMentionsIt =
                tests.toLowerCase().includes("appears-resolved") || tests.toLowerCase().includes("appears resolved");
            expect(
                testsMentionsIt,
                "ui-spec.md specifies the appears-resolved indicator but tests.md has no matching test row " +
                "(this exact gap has regressed twice — see StaffTicketDetail's appears-resolved-badge)"
            ).toBe(true);
        });
    });

    describe("tests.md rows are all 'Planned' — no implementation exists yet", () => {
        it("contains no 'Pass' status in the planned-tests table", () => {
            const passInTableCell = /\|\s*Pass\s*\|/.test(tests);
            expect(
                passInTableCell,
                "tests.md has a 'Pass' row already, but no implementation Issue has landed yet — " +
                "either this was written prematurely, or this check needs updating for the current Issue"
            ).toBe(false);
        });
    });
});