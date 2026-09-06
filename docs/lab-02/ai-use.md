# Lab 2 AI Use and Reflection

## LLM Used

I used the **Antigravity** coding agent through my Google Cloud Platform account. I mainly used **Claude Sonnet 4.6 and Gemini 3.7 Flash** as the LLM.

---

## Key Prompts Table

The following table documents 6-10 selected key prompts used during Lab 2. These represent the most impactful interactions with the AI assistant during specification, design, and implementation phases.

| # | Prompt Name | Actual Prompt Text | Purpose / Outcome |
|---|---|---|---|
| 1 | **Plan Lab 2 Implementation** | "ช่วยอธิบายงานที่ต้องทำทั้งหมดในเอกสาร lab_02_sheet อย่างละเอียด และขอ workflow ตั้งแต่ต้นจนจบงานไม่ตกหล่นแม้แต่อย่างเดียว พร้อมบอกหน้าที่อ้างอิงมา" | ทำให้เข้าใจ และดึงใจความสำคัญออกมาว่าต้องทำอะไรก่อนหลังเป็นขั้นเป็นตอน |
| 2 | **Write Lab 2 Documents** | "เขียนไฟล์ specifiationmd, ai-use.md, test.md และ ui-spec.md ใน docs/lab-02/ ตามเอกสาร docs/lab-02/Lab_02_labsheet.pdf เขียนอย่างถูกต้อง รอบคอบ ไม่ตกหล่นตามเอกสาร และระบุในแชทนี้ด้วยว่าอ้างอิงตามเอกสารหน้าไหนแต่ไม่ต้องระบุในไฟล์" | เพื่อให้แชทเอไอเขียนเอกสารตามที่กำหนดไว้ใน Lab 2 |
| 3 | **Verify Lab 2 Implementation** | "โปรเจคนี้ C:\Kmutt\Senior\CPE334\toktickit อ่านไฟล์ specification.md, tests.md, ui-spec.md, api-spec.md แล้วตรวจสอบไฟล์ต่อไปนี้ว่าถูกต้อง ครบถ้วน สมบูรณ์ไหม <br>server/src/services/requesters.service.ts, server/src/controllers/requesters.controller.ts, server/src/routes/requesters.route.ts, server/tests/lab-02/requesters.api.test.ts <br>client/src/api/requesters.api.ts, client/src/context/RequesterContext.tsx, client/src/pages/RequesterSelection.tsx, client/src/components/RequesterGuard.tsx, client/src/tests/lab-02, RequesterSelect.test.tsx, client/src/tests/lab-02/RequesterGuard.test.tsx <br>client/src/tests/lab-02, RequesterBadge.test.tsx, client/src/components/RequesterBadge.tsx และไฟล์ที่เกี่ยวข้องอื่นๆ <br>เฉพาะ Issue [Lab2]: Development Requester Context " | เพื่อให้เอไอตรวจสอบความถูกต้องของไฟล์ต่างๆ ก่อนที่จะไป issue ถัดไป |
| 4 | **Visual Bug Diagnosis from Screenshots** | "แก้ไขโค้ดให้ generate screen shot ได้อย่างถูกต้อง ถ้าต้องการไฟล์อะไรบอกเพิ่มก่อนทำ ผลลัพธ์โค้ดเดิมเป็นดังรูปภาพ" | ใช้ภาพ screenshot 17 รูปเทียบกับ Playwright script เพื่อ diagnose บั๊กจริง (sticky header duplication, race condition, ไฟล์ค้างจาก run ก่อนหน้า) แทนการอธิบายปัญหาเป็นข้อความ |
| 5 | **Update Test** | "อัพเดทเทสให้ถูกต้องกับโค้ดปัจจุบัน ห้ามอัปเดตโดยไม่มีการทดสอบ" | เพื่ออัปเดต test.md ให้เป็นปัจจุบันตามผลการ test |
| 6 | **Update Readme** | "ตรวจสอบไฟล์ และอัพเดท readme.md ให้เป็นปัจจุบัน " | เพื่ออัปเดต readme.md ให้เป็นปัจจุบันตามโครงสร้างไฟล์ที่เปลี่ยนแปลง  |
| 7 | **Run Test and Audit** | "ช่วยเช็ค Definition of Done ใน specification.md ก่อนเปิด PR เข้า main โดยรันเทสต์ทั้งหมด (server, client, และ e2e ใช้ --workers=1) พร้อมตรวจห้ามมี .skip, .only หรือ TODO ค้างอยู่ หากเทสต์พังให้หยุดแจ้งทันที บรรทัดไหน ไฟล์ไหน; แต่ถ้าผ่านหมด ค่อยนำ FR/BR/AC มาเทียบผลเทสต์ ลิสต์ข้อที่ขาด coverage ตรวจเช็กคำสั่งใน README และไฟล์ Prisma migration จากนั้นสรุปสั้นๆ ลง docs/lab-02/internal-notes/release-audit.md และร่าง PR description ต่อท้ายได้เลย (หากมีจุดไม่ผ่านห้ามร่าง PRเด็ดขาด)" | เพื่อให้มั่นใจว่าทุกอย่างถูกต้องก่อน merge leb2-staging เข้า main |

## Reflection
My Reflection:
In Lab 2, using AI as a thought partner helped speed up both the documentation and technical implementation. The key was providing precise context—like feeding it `specification.md` alongside actual source code—rather than just asking for raw code.

The biggest learning curve was handling complex debugging, especially for flaky E2E tests and environment issues. We used Playwright screenshots and trace analysis to fix visual bugs, resolved timing issues by syncing UI steps with API network responses, and fixed infinite server restarts by isolating the file watcher from the storage directory.

Finally, forcing strict audit prompts to verify the Definition of Done (DoD) ensured we didn't miss edge cases or skipped tests. This lab proved that AI is most powerful when driven by clear constraints, systematic debugging, and continuous validation.