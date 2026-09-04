# Lab 2 Reviewer Record

## Reviewer Identity

- **Reviewer Name**: jetanin naitho
- **Student ID**: 6707501011
- **GitHub Username**: jetanin (Jetanin Naitho)

---

## Pull Requests Reviewed (as Reviewer)

List all Pull Requests you reviewed for your partner or team member.

| PR Title / Branch | PR Link | Partner's Review Comment | My Response | Outcome |
|---|---|---|---|---|
| `feature/11-lab2-docs` → `lab2-staging` | [#20](https://github.com/IEAR2548/TokTickIT/pull/20) | Its ok. All docs are complete. | thanks Mr.Jetanin. | Approved |
| `feature/12-lab2-db-schema` → `lab2-staging` | [#21](https://github.com/IEAR2548/TokTickIT/pull/21) | Verified schema.prisma and migration 20260901182421_init_lab2_schema against specification.md, api-spec.md, and ui-spec.md. Models, enums, indexes, and seed idempotency all passed 100%. | thanks Mr.Jetanin | Approved |
| `feature/13-lab2-requester-context` → `lab2-staging` | [#22](https://github.com/IEAR2548/TokTickIT/pull/22) | ✅ Approved<br><br>• **Server:** เพิ่ม GET /api/requesters ตามโครงสร้าง Service-Controller-Route กรองเฉพาะ isActive: true และ expose เฉพาะ id, name, email ผ่าน DTO<br>• **Client State:** เพิ่ม RequesterContext (พร้อม sessionStorage) และ RequesterGuard สำหรับ redirect ไปหน้าเลือก requester<br>• **Client UI:** เพิ่มหน้า RequesterSelection (ครบทั้ง 4 states: Loading / Empty / Failure+Retry / Ready) และ RequesterBadge ใน App Shell<br>• **Routing:** ต่อ react-router-dom เข้ากับ App.tsx ด้วย `<BrowserRouter>`<br>• **Tests:** Server 11/11 ✅ \| Client 11/11 ✅ \| vite build ✅ | Thank you for your effort, Mr.Jetanin. | Approved |
| `feature/14-lab2-create-ticket` → `lab2-staging` | [#23](https://github.com/IEAR2548/TokTickIT/pull/23) | | | |

---

## Pull Requests Received (as Author)

List all Pull Requests you authored that received peer review.

| PR Title / Branch | PR Link | My Review Comment | Partner's Response | Outcome |
|---|---|---|---|---|
| `feature/1-lab2-specification` → `lab2-staging` | [#11](https://github.com/jetanin/toktickit/pull/11) | เพิ่มไฟล์<br><br>• **docs/lab-02/reviewer.md**<br>• **docs/lab-02/ai-use.md**<br>• **tests.md — ขาดสำคัญมาก (Section 9.2):**<br>&nbsp;&nbsp;- ไม่มี Unit tests เลย (เช่น ticket number format)<br>&nbsp;&nbsp;- ไม่มี E2E tests เลย (Lab Sheet กำหนดให้ใช้ Playwright e2e/lab-02/)<br>&nbsp;&nbsp;- ไม่มี UI style tests และ responsive tests<br>&nbsp;&nbsp;- ทุก test row ขาด column "Automated Test File" (Lab Sheet Section 9.1 กำหนดให้ระบุ path จริง เช่น server/tests/lab-02/tickets.api.test.ts)<br><br>• **specification.md:**<br>&nbsp;&nbsp;- ขาด BR เรื่อง duplicate-submission prevention และ form data retained after API failure<br>&nbsp;&nbsp;- ขาด BR เรื่อง safe filename/storage และ upload failure compensation (ticket สร้างได้ แต่ attachment fail)<br>&nbsp;&nbsp;- ขาด index/constraint decisions และ justification อย่างน้อย 1 ข้อ (Lab Sheet Section 5.2 บังคับ)<br>&nbsp;&nbsp;- Seed data spec ไม่ระบุจำนวนขั้นต่ำ: ≥6 Related Systems, ≥4 active Requesters, ≥1 inactive Requester<br>&nbsp;&nbsp;- ขาด AC สำหรับ Requester switching, responsive, API failure state<br><br>• **api-spec.md:**<br>&nbsp;&nbsp;- ทุก endpoint ไม่มี HTTP 500 unexpected error response<br>&nbsp;&nbsp;- GET /api/tickets ขาด invalid-parameter behavior และ secondary sort<br>&nbsp;&nbsp;- GET /api/tickets/:id ไม่มี example response JSON เลย<br><br>• **ui-spec.md:**<br>&nbsp;&nbsp;- Requester Selection Screen ขาด: loading state, empty state (กรณีไม่มี active requesters), API-failure state<br>&nbsp;&nbsp;- Button hierarchy ขาด Tertiary button<br>&nbsp;&nbsp;- ขาด unavailable attachment state<br><br>• **ส่วนที่ดีแล้ว:**<br>&nbsp;&nbsp;- โครงสร้าง specification.md ถูกต้องครบ<br>&nbsp;&nbsp;- Zen Green color tokens ตรงทุกค่า<br>&nbsp;&nbsp;- API endpoints ครบ 10 capabilities<br>&nbsp;&nbsp;- AC-01–08 เขียน Given-When-Then ได้ดี<br>&nbsp;&nbsp;- AC Traceability Matrix ครบ<br><br>รอแก้ไข reviewer.md, ai-use.md, และ tests.md ก่อนจะ approve | แก้ไข reviewer.md, ai-use.md, และ tests.md พร้อมทั้งเพิ่ม reviewer.md และ ai-use.md แล้ว | Changes Requested |
| `feature/1-lab2-specification` → `lab2-staging` | [#11](https://github.com/jetanin/toktickit/pull/11) | ควรร่างโครงมาก่อน<br><br>• **reviewer.md** — ต้องมี: reviewer identity, PR links, comments given/received, responses, approvals<br>• **ai-use.md** — ต้องมี: LLM ที่ใช้, ตาราง 6–10 key prompts, "My Reflection"<br>• **specification.md Section 8 (API Contract):** ขาด endpoint GET /api/attachments/:id (retrieve attachment metadata) ซึ่งมีใน api-spec.md<br>• **api-spec.md — GET /api/tickets:** ระบุ default limit=8 แต่ไม่ได้บอก max permitted page size คืออะไร<br>• **ui-spec.md Section 5:** ขาด "All sizes" viewport rule: "No clipped labels, overlapping messages, hidden buttons, or unreadable attachment names"<br>• **tests.md — AC-11:** AC-11 (API failure state) ถูก mark ว่า "manual verification" เท่านั้น ควรเพิ่ม automated test ระดับ API เพื่อให้ traceable | I already draft both reviewer.md and ai-use.md then completed all problems that u tell me. | Changes Requested |
| `feature/1-lab2-specification` → `lab2-staging` | [#11](https://github.com/jetanin/toktickit/pull/11) | Everything is ok. Thanks for your effort. Ready to merge! | Thank you kub MR.Paphangkorn | Approved |
| `feature/2-requester-context` → `lab2-staging` | [#20](https://github.com/jetanin/toktickit/pull/20) | Your schema looks great—it's ready for the next step. | thank u kub | Approved |
| `feature/3-tickets-and-attachments` → `lab2-staging` | [#23](https://github.com/jetanin/toktickit/pull/23) | Verified all Backend APIs (/api/tickets, /api/attachments, and reference data) and Frontend screens (CreateTicket, MyTickets, TicketDetail). Validations, ownership isolation, attachment lifecycle, pagination, and Zen Green responsive layout are fully implemented. All 50 server tests and 20 client tests passed. | Thanks kub Mr.Paphangkorn. | Approved |
| `feature/4-responsive-qa` → `lab2-staging` | [#24](https://github.com/jetanin/toktickit/pull/24) | | | |
| `feature/5-` → `lab2-staging` | [#23](https://github.com/jetanin/toktickit/pull/23) | | | |