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

---

## Pull Requests Received (as Author)

List all Pull Requests you authored that received peer review.

| PR Title / Branch | PR Link | My Review Comment | Partner's Response | Outcome |
|---|---|---|---|---|
| `feature/53-lab4-spec` → `lab4-staging` | [#60](https://github.com/IEAR2548/TokTickIT/pull/60) | ✅ Key Checks Passed<br>1. **Schema & Data Model Integrity (specification.md, api-spec.md)**<br>กำหนดชนิดข้อมูล id, ticketId, performedById เป็น Int ถูกต้องตรงตามโมเดล Prisma และ Postgres เดิม<br>กำหนด ticketId เป็น non-nullable พร้อม onDelete: Restrict เพื่อบังคับกติกา BR-01 ในระดับ Database ไม่ให้เกิด orphaned records<br>นำฟิลด์ appearsResolved และ updatedAt เดิมบนตาราง Ticket มาใช้งานต่ออย่างเหมาะสม ไม่มีการเพิ่มคอลัมน์ซ้ำซ้อนใน Migration (§9.4)<br>2. **Status Transition Matrix & Lab 3 Compatibility (specification.md §5.1)**<br>ตาราง Status Transition Matrix ได้รับการปรับปรุงให้ครอบคลุม Open → Waiting for Requester, Resolved → Reopened, และ Reopened → Waiting for Requester สอดคล้องกับ ticketStatus.validator.ts เดิม และไม่ทำลาย Regression Unit Tests ของ Lab 3<br>แยก Error Code ชัดเจน: INVALID_TRANSITION (400 Bad Request) สำหรับการเปลี่ยนสถานะผิดกฎ และ STALE_UPDATE (409 Conflict) สำหรับ Optimistic Concurrency พร้อมระบุวิธีที่ Frontend จะแยก self-retry ออกจาก external conflict (§10.1, Assumption #14–#15)<br>3. **Resolution Gate & Backward Compatibility (specification.md, api-spec.md, tests.md)**<br>บังคับใช้ resolutionSummary ในการเปลี่ยนสถานะสู่ Resolved / Closed ตาม Lab 3 BR-22 (400 RESOLUTION_SUMMARY_REQUIRED) พร้อมเพิ่ม test case API-29 รองรับการทดสอบ Traceability 100%<br>4. **UI Specification & Testing Conventions (ui-spec.md)**<br>ออกแบบหน้าจอครอบคลุมทั้ง IT Staff Dashboard (5 การ์ด), Requester Dashboard (4 การ์ด), Actions Taken Timeline/Form (จำกัดสิทธิ์แก้ไข 15 นาทีตาม BR-10), และ Status Controls<br>เพิ่ม Visual & Accessibility Checklist 9 ข้อ ครบตามเกณฑ์ Rubric Part 9 ใน 3 viewports (1280px, 768px, 375px)<br>กำหนด convention ของ data-testid ครบทุกคอมโพเนนต์ (Section 7) ช่วยให้การเขียน Vitest Component Tests และ Playwright E2E ใช้อ้างอิง selector ตรงกัน<br>**5. Test Traceability (tests.md)**<br>วางแผนประเภทการทดสอบครบ 10 รูปแบบตามเกณฑ์ Handout Section 10 พร้อมกำหนดสถานะเริ่มต้นเป็น Planned และใช้ path client/src/tests/lab-04/ และ server/tests/lab-04/ ถูกต้อง | ขอบคุณสำหรับคอมเม้นต์ที่ยาวสุด ๆ ของคุณ คุณเจตนินทร์ | Approved |
| `feature/54-lab4-actions-taken` → `lab4-staging` | [#61](https://github.com/IEAR2548/TokTickIT/pull/61) | Approved ✅ Database model ActionTaken strictly enforces BR-01 (ticketId NOT NULL, onDelete: Restrict). Actions Taken CRUD APIs fully implement Idempotency-Key, 5s deduplication fallback, 15m edit window, cancelled ticket guard, and optimistic concurrency. Verified 19/19 Lab 4 tests and 230/230 server regression tests pass with zero errors. | thank you very much | Approved |
| `feature/55-lab4-actions-taken-ui` → `lab4-staging` | [#62](https://github.com/IEAR2548/TokTickIT/pull/62) |  |  | Pending |
