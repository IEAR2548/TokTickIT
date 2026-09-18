# Lab 3 AI Use and Reflection

## LLM Used

I used the **Antigravity** coding agent through my Google Cloud Platform account, pairing with **Claude Opus 4.6, Claude Sonnet, and Gemini 3.8 Flash**.

---

## Seed Credentials & Default Password

Per `specification.md` Decision **D-9** and **BR-38**, all seeded accounts and migrated `DevRequester` accounts requiring initial password change share one documented local-dev-only default password:

- **Initial Password:** `DevPass@2026!`
- **Compliance:** Satisfies **BR-07** (≥8 characters, uppercase, lowercase, number, and special character).
- **Behavior:** Seeded with `mustChangePassword = true`, forcing the user to undergo the Change Password workflow before normal application access.

---

## Key Prompts Table

The following table documents the key prompts used during the Lab 3 Specification, Design, and Test Planning phase (Issue #29: Spec DD).

| # | Prompt Name | Actual Prompt Text | Purpose / Outcome |
|---|---|---|---|
| 1 | **Creating Specification Documents** | "เขียนไฟล์ specification.md, api-spec.md, ui-spec.md, tests.md ตามlabsheet Lab 3 อย่างละเอียด" | ได้ไฟล์ specification.md, api-spec.md, ui-spec.md, tests.md ที่มีเนื้อหาตาม labsheet Lab 3 |
| 2 | **Role Boundary & Decision D-10** | "ตรวจสอบทั้ง 4 ไฟล์เทียบกับ labsheet Lab 3 ว่าถุกต้องไหม มีจุดไหนตกหล่นมั้ย" | ตรวจสอบความสอดคล้องระหว่าง Handout requirements กับ specification.md, api-spec.md, ui-spec.md, tests.md ค้นพบบั๊ก enum IT Priority ขาด CRITICAL และความชัดเจนของ Admin ticket operations |
| 3 | **TDD for Safety Invariants & Rules** | "ขอตัวอย่างการเขียน failing test สำหรับ User Management API โดยเน้น Safety Rules: ห้าม deactivate ตัวเอง, ห้ามปลด Admin คนสุดท้าย และการ enforce mustChangePassword" | บังคับให้เขียน test 400 Bad Request ระดับ API ครอบคลุมก่อนเริ่มเขียน controller และ service ป้องกันช่องโหว่ด้านความปลอดภัย |
| 4 | **Data Isolation & XSS Prevention** | "ตรวจสอบ controller และ client components ของ Ticket Detail ให้แน่ใจว่า Internal Notes จะไม่รั่วไหลไปถึง Requester ทั้งในระดับ API response และ UI rendering พร้อมเขียนเทสต์กัน XSS ในคอมเมนต์" | ยืนยันการแยก visibility ของ Internal Note (Staff only) และรับประกันว่า HTML tags ใน comment จะถูก escape เป็น plain text เสมอ |
| 5 | **Responsive Layout & Visual Inspection** | "ขอแนวทางการเขียน Playwright script เพื่อ capture screenshot 6 หน้าจอหลักใน 3 viewports (Desktop 1280px, Tablet 768px, Mobile 375px) พร้อมตรวจสอบ visual regression และ layout checklist ตาม ui-spec 10" | ได้ automated visual inspection suite และชุดรูปภาพ screenshot 18 รูปใน `artifacts/lab-03/screenshots/` |
| 6 | **E2E Test & Gap Discovery** | "ตรวจสอบ flow User Administration และเช็คว่ามีฟังก์ชันไหนใน ui-spec ที่ระบบยังขาดอยู่" | พบ Gap ว่าระบบยังขาด Status Filter (Active/Inactive) ในหน้า User Management จึงได้ implement เพิ่มทั้ง Server API-31, UI-14 และ E2E-05 จนเสร็จ |
| 7 | **Pre-PR Audit & TDD Commit Order** | "ตรวจสอบ issue e2e ว่าทำเสร็จหมดรึยัง ถ้าเสร็จหมดแล้วอัปเดต test.md, ขอ PR description สั้นๆ และช่วยจัดลำดับ commit ตาม TDD ให้หน่อย" | ยืนยันผลเทสต์ผ่านครบทุกชุด (Client, Server, E2E, Spec Invariants) และได้ commit plan ที่แยก commit Red/Green/Refactor เป็นระเบียบ์ |

---

## My Reflection

Lab 3 เน้นเรื่อง Security และ RBAC มากขึ้น ทำให้รู้ว่าการสั่งให้ AI เขียนโค้ดตรงๆ จะหลุด Business Rules การใช้ TDD โดยบังคับให้ AI สร้าง Integration หรือ Security Tests ก่อนเขียนโค้ดจริง จะช่วยคุมไม่ให้โค้ดส่วนอื่นพัง โดยเฉพาะเรื่อง Authorization (requireRole) และการซ่อน InternalNote ไม่ให้หลุดไปหา Requester

นอกจากนี้ การเขียน E2E Test ร่วมกับ AI ยังช่วยให้เจอข้อผิดพลาดที่ตกหล่นไป เช่น ฟิลเตอร์สถานะ Active/Inactive ในหน้า Admin ที่ลืมทำในตอนแรก ทำให้ย้อนกลับไปเก็บรายละเอียดได้ครบ ส่วนเรื่อง Responsive UI ถึง AI จะช่วยเจนสคริปต์แคปหน้าจอ Playwright ทั้ง 3 Viewports ได้ไว แต่สุดท้ายก็ยังต้องตรวจทาน เช็ค Layout อยู่ดี