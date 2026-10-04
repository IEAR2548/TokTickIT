# Lab 4 Reviewer Record

## Author Identity
- **Author Name**: Paphangkorn Luanseng
- **Student ID**: 67070501083
- **GitHub Username**: IEAR2548 (Paphangkorn Luanseng)

## Reviewer Identity
- **Reviewer Name**: jetanin naitho
- **Student ID**: 67070501011
- **GitHub Username**: jetanin (Jetanin Naitho)

---

## Pull Requests Reviewed (as Reviewer)

List all Pull Requests you reviewed for your partner or team member.

| PR Title / Branch | PR Link | Partner's Review Comment | My Response | Outcome |
|---|---|---|---|---|
| `feature/1-lab4-specification` → `lab4-staging` | [#54](https://github.com/jetanin/toktickit/pull/54) | Approved<br><br>Reviewed all specification documents in docs/lab-04/ (specification.md, api-spec.md, ui-spec.md, and tests.md). The engineering contract is complete, robust, internally consistent, and preserves 100% backward compatibility with Labs 1–3.<br><br>FRs, BRs, ACs, and REST API contracts are fully defined with end-to-end traceability.<br>Test plan comprehensively covers API, UI, E2E, and regression verification adhering to Spec-DD principles.<br>UI specification strictly follows the Zen Green design system across all viewports. | Thank u หลายๆ | Approved |
| `feature/2-actions-taken-foundation` → `lab4-staging` | [#55](https://github.com/jetanin/toktickit/pull/55) | Approved<br>The ActionTaken database schema, migration, and CRUD APIs fully conform to the Lab 4 specification. RBAC, caller auto-attribution (performedById), and follow-up validation rules are strictly enforced. The accompanying test suite comprehensively covers the test inventory (API-01 through API-10b). | none | Approved |
| `feature/3-actions-taken-ui` → `lab4-staging` | [#56](https://github.com/jetanin/toktickit/pull/56) | Approved.<br><br>UI implementation on TicketDetail strictly complies with Lab 4 UI Spec (Section 3.4) and Zen Green design tokens.<br>Actions Taken table/card views, modal validations (mandatory description/result, conditional follow-up note), auto-captured Performed By, and role-based read-only views for Requesters are properly handled.<br>All 7/7 component tests in ActionsTaken.test.tsx and 81/81 client regression tests pass without errors. | thank u mr.Ear | Approved |
| `feature/4-ticket-workflow` → `lab4-staging` | [#57](https://github.com/jetanin/toktickit/pull/57) | Approved.

Status transition matrix strictly conforms to spec across both frontend dropdown controls and server endpoints.
Resolution Gate properly enforces >= 1 Action Taken and mandatory resolution summary (1-1,000 chars) while preserving backward compatibility.
Optimistic Concurrency Control is fully functional with Ticket version tracking, 409 CONCURRENCY_CONFLICT handling, and the UI warning banner per UI-spec Section 3.5 C.
All client tests (86/86 across 13 suites) and comprehensive server workflow test cases pass cleanly. | --- | Approved |
| `feature/5-role-dashboards` → `lab4-staging` | [#58](https://github.com/jetanin/toktickit/pull/58) | Approved.

- Resolution Gate is now universally enforced on the backend, preventing any direct API bypass while keeping legacy regression suites green.
- Client-side validation in TicketDetail is hardened to strictly require Action Date/Time and Assignee.
- State transitions from Resolved (Closed, Reopened) are verified.
- All 88/88 client tests across 13 suites pass with zero failures. | --- | Approved |

---

## Pull Requests Received (as Author)

List all Pull Requests you authored that received peer review.

| PR Title / Branch | PR Link | My Review Comment | Partner's Response | Outcome |
|---|---|---|---|---|
| `feature/53-lab4-spec` → `lab4-staging` | [#60](https://github.com/IEAR2548/TokTickIT/pull/60) | ✅ Key Checks Passed<br>1. **Schema & Data Model Integrity (specification.md, api-spec.md)**<br>กำหนดชนิดข้อมูล id, ticketId, performedById เป็น Int ถูกต้องตรงตามโมเดล Prisma และ Postgres เดิม<br>กำหนด ticketId เป็น non-nullable พร้อม onDelete: Restrict เพื่อบังคับกติกา BR-01 ในระดับ Database ไม่ให้เกิด orphaned records<br>นำฟิลด์ appearsResolved และ updatedAt เดิมบนตาราง Ticket มาใช้งานต่ออย่างเหมาะสม ไม่มีการเพิ่มคอลัมน์ซ้ำซ้อนใน Migration (§9.4)<br>2. **Status Transition Matrix & Lab 3 Compatibility (specification.md §5.1)**<br>ตาราง Status Transition Matrix ได้รับการปรับปรุงให้ครอบคลุม Open → Waiting for Requester, Resolved → Reopened, และ Reopened → Waiting for Requester สอดคล้องกับ ticketStatus.validator.ts เดิม และไม่ทำลาย Regression Unit Tests ของ Lab 3<br>แยก Error Code ชัดเจน: INVALID_TRANSITION (400 Bad Request) สำหรับการเปลี่ยนสถานะผิดกฎ และ STALE_UPDATE (409 Conflict) สำหรับ Optimistic Concurrency พร้อมระบุวิธีที่ Frontend จะแยก self-retry ออกจาก external conflict (§10.1, Assumption #14–#15)<br>3. **Resolution Gate & Backward Compatibility (specification.md, api-spec.md, tests.md)**<br>บังคับใช้ resolutionSummary ในการเปลี่ยนสถานะสู่ Resolved / Closed ตาม Lab 3 BR-22 (400 RESOLUTION_SUMMARY_REQUIRED) พร้อมเพิ่ม test case API-29 รองรับการทดสอบ Traceability 100%<br>4. **UI Specification & Testing Conventions (ui-spec.md)**<br>ออกแบบหน้าจอครอบคลุมทั้ง IT Staff Dashboard (5 การ์ด), Requester Dashboard (4 การ์ด), Actions Taken Timeline/Form (จำกัดสิทธิ์แก้ไข 15 นาทีตาม BR-10), และ Status Controls<br>เพิ่ม Visual & Accessibility Checklist 9 ข้อ ครบตามเกณฑ์ Rubric Part 9 ใน 3 viewports (1280px, 768px, 375px)<br>กำหนด convention ของ data-testid ครบทุกคอมโพเนนต์ (Section 7) ช่วยให้การเขียน Vitest Component Tests และ Playwright E2E ใช้อ้างอิง selector ตรงกัน<br>**5. Test Traceability (tests.md)**<br>วางแผนประเภทการทดสอบครบ 10 รูปแบบตามเกณฑ์ Handout Section 10 พร้อมกำหนดสถานะเริ่มต้นเป็น Planned และใช้ path client/src/tests/lab-04/ และ server/tests/lab-04/ ถูกต้อง | ขอบคุณสำหรับคอมเม้นต์ที่ยาวสุด ๆ ของคุณ คุณเจตนินทร์ | Approved |
| `feature/54-lab4-actions-taken` → `lab4-staging` | [#61](https://github.com/IEAR2548/TokTickIT/pull/61) | Approved ✅ Database model ActionTaken strictly enforces BR-01 (ticketId NOT NULL, onDelete: Restrict). Actions Taken CRUD APIs fully implement Idempotency-Key, 5s deduplication fallback, 15m edit window, cancelled ticket guard, and optimistic concurrency. Verified 19/19 Lab 4 tests and 230/230 server regression tests pass with zero errors. | thank you very much | Approved |
| `feature/55-lab4-actions-taken-ui` → `lab4-staging` | [#62](https://github.com/IEAR2548/TokTickIT/pull/62) | Approved ✅ Actions Taken UI panel fully conforms to ui-spec.md §3; strictly enforces 15m edit window, role boundaries (Requester read-only), 409 STALE_UPDATE draft recovery, and mobile stacked reflow with zero overflow. Server BR-04 validator gap closed. Verified 15/15 component tests, 9/9 responsive/axe E2E tests, and 238/238 server regression tests pass. | Okay, I will delete this branch. | Approved |
| `feature/56-lab4-ticket-workflow` → `lab4-staging` | [#63](https://github.com/IEAR2548/TokTickIT/pull/63) | Approved ✅ Ticket workflow fully implements §5.1 matrix, resolution gate (BR-06/07), role-aware cancel (BR-15), 409 STALE_UPDATE conflict/self-retry branching (§10.1), and BR-16 appearsResolved reset. Verified 70/70 Lab 4 server tests (281/281 full regression) and 24/24 client tests (110/110 full regression) pass with zero errors. | Thank you for everything, my friend. | Approved |
| `feature/57-lab4-dashboards` → `lab4-staging` | [#64](https://github.com/IEAR2548/TokTickIT/pull/64) | Approved ✅ ตรวจสอบละเอียดครบถ้วนตาม docs/lab-04/: Dashboards FR-10..12, Status Exclusivity (BR-11), Open+Reopened bucket (BR-12), 7-day UTC+7 window (BR-13) และ Interactive Links Pre-filtered สมบูรณ์ทุกจุด ทดสอบ 78/78 Server, 29/29 Client, 6/6 E2E ผ่านครบ (289 Server / 115 Client Full regression tests 0 failures) | Ok, I am deleting this branch now. | Approved |
| `feature/58-lab4-hardening` → `lab4-staging` | [#65](https://github.com/IEAR2548/TokTickIT/pull/65) |---|---| Pending |