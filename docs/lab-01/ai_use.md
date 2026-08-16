# AI Use and Reflection (Lab 01)

I used the **Antigravity** coding agent through my Google Cloud Platform account. I mainly used **Gemini 3.6 Flash (High)** as the LLM.

## Selected Key Prompts

| Prompt Name | Actual Prompt Text | My Reflection |
| :--- | :--- | :--- |
| **Plan Lab 1 Implementation** | อธิบายงานทั้งหมด และสรุป 4 issues ประเด็นสำคัญที่ต้องทำอย่างละเอียด ผลลัพธ์ การทดสอบ และลำดับการทำทั้งหมด | My Reflection: ทำให้เข้าใจรายละเอียด และเห็นภาพงานทั้งหมดอย่างละเอียด |
| **Deep Dive into API Health Check Criteria** | Acceptance criteria:<br>• GET /api/health returns HTTP 200.<br>• The JSON response contains status = ok and service = TokTickIT API.<br>• A Supertest test verifies the endpoint.<br>• The React page displays the backend status based on a real API call.<br>• A useful error message appears when the backend is unavailable.<br><br>ขอวิธีการทดสอบแต่ละ criteria อย่างละเอียดและเป็นขั้นตอน ระบุด้วยว่าถ้าผ่านผลลัพธ์จะเป็นอย่างไร | My Reflection: ช่วยให้เข้าใจทั้งตอนที่ตรวจงานเพื่อนและตอนที่ทำงานตัวเอง ว่าผลลัพธ์ที่ถูกต้องควรเป็นอย่างไร |
| **Guidance on Code Quality & Tooling** | เช็คโค้ดทั้งในเรื่องของ type การ import โครงสร้างไฟล์ และอื่นๆที่จำเป็น มีอะไรที่ควรปรับแก้ไหม | My Reflection: ช่วยในการตรวจทาน Type Safety และ ความถูกต้องทั้งโปรเจกต์ก่อน Commit |
| **Deep Dive into Create and seed IT request categories** | Acceptance criteria:<br>• A Prisma Category model exists with id, unique name, and createdAt.<br>• A migration creates the Category table.<br>• The seed inserts Account and Access, Hardware, Software, and Network.<br>• The seed is safe to run more than once without duplicates.<br>• Database credentials are not committed.<br><br>ขอวิธีการทดสอบแต่ละ criteria อย่างละเอียดและเป็นขั้นตอน ระบุด้วยว่าถ้าผ่านผลลัพธ์จะเป็นยังไง | My Reflection: ช่วยทำให้เข้าใจและเห็นภาพว่าแต่ละ Acceptance Criteria ควรจะออกมาหน้าตาเป็นยังไง |
| **Handle Prisma v7 Migration & Configuration** | แก้ไข Breaking Changes ของ Prisma v7 (Error `No seed command configured`, `P1012` schema validation, Driver Adapters) | My Reflection: ได้รู้ว่า Prisma v7 มีการเปลี่ยนแปลงอะไรบ้าง การสร้าง `prisma.config.ts` และการย้าย `DATABASE_URL` จาก schema เข้า config |
| **Review Test Coverage Against Requirements** | สรุปถ้าอ้างอิงตามเอกสารไฟล์เทสต้องมีอะไรบ้างลิสต์มา โค้ดเทสต่อไปนี้ถูกต้องและครอบคลุมไหม | My Reflection: prompt นี้ช่วยให้ตรวจสอบว่ามีจุดที่ตกหล่นไหมที่อาจจะไม่ได้เทส |
| **Review All Files** | อ้างอิงจากเอสารที่ส่งไป ตรวจสอบซอร์สโค้ดและเอกสารทั้งหมดในโปรเจกต์ TokTickIT ให้แน่ใจว่าโปรเจกต์ทำงานได้อย่างถูกต้องและเป็นไปตามข้อกำหนดในเอกสารทั้งหมด | My Reflection: ช่วยตรวจสอบว่าโค้ดทั้งหมดมีความถูกต้องและสอดคล้องกับเอกสารก่อนจะส่งไหม |