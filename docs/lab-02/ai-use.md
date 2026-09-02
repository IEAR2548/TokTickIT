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
| 2 | **Verify Lab 2 Implementation** | "โปรเจคนี้ C:\Kmutt\Senior\CPE334\toktickit อ่านไฟล์ specification.md, tests.md, ui-spec.md, api-spec.md แล้วตรวจสอบไฟล์ต่อไปนี้ว่าถูกต้อง ครบถ้วน สมบูรณ์ไหม <br>server/src/services/requesters.service.ts, server/src/controllers/requesters.controller.ts, server/src/routes/requesters.route.ts, server/tests/lab-02/requesters.api.test.ts <br>client/src/api/requesters.api.ts, client/src/context/RequesterContext.tsx, client/src/pages/RequesterSelection.tsx, client/src/components/RequesterGuard.tsx, client/src/tests/lab-02, RequesterSelect.test.tsx, client/src/tests/lab-02/RequesterGuard.test.tsx <br>client/src/tests/lab-02, RequesterBadge.test.tsx, client/src/components/RequesterBadge.tsx และไฟล์ที่เกี่ยวข้องอื่นๆ <br>เฉพาะ Issue [Lab2]: Development Requester Context " | เพื่อให้เอไอตรวจสอบความถูกต้องของไฟล์ต่างๆ ก่อนที่จะไป issue ถัดไป |

## Reflection
My Reflection: