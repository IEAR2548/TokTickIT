# AI Use and Reflection (Lab 01)

I used the **Antigravity** coding agent through my Google Cloud Platform account. I mainly used **Gemini 3.6 Flash (High)** as the LLM.

## Selected Key Prompts

| Prompt Name | Actual Prompt Text | My Reflection |
| :--- | :--- | :--- |
| **Plan Lab 1 Implementation** | อธิบายงานทั้งหมด และสรุป 4 issues ประเด็นสำคัญที่ต้องทำอย่างละเอียด ผลลัพธ์ การทดสอบ และลำดับการทำทั้งหมด | 
My Reflection: ทำให้เข้าใจรายละเอียด และเห็นภาพงานทั้งหมดอย่างละเอียด
| **Deep Dive into API Health Check Criteria** | """Acceptance criteria:
· GET /api/health returns HTTP 200.
· The JSON response contains status = ok and service = TokTickIT API.
· A Supertest test verifies the endpoint.
· The React page displays the backend status based on a real API call.
· A useful error message appears when the backend is unavailable.""" ขอวิธีการทดสอบแต่ละ criteria อย่างละเอียดและเป็นขั้นตอน ระบุด้วยว่าถ้าผ่านผลลัพธ์จะเป็นอย่างไร | My Reflection: ช่วยให้เข้าใจทั้งตอนที่ตรวจงานเพิ่มและตอนที่ทำงานตัวเอง ว่าผลลัพธ์ที่ถูกต้องควรเป็นอย่างไร
| **Guidance on Code Quality & Tooling** | เช็คโค้ดทั้งในเรื่องของ type การ import โครงสร้างไฟล์ และอื่นๆที่จำเป็น มีอะไรที่ควรปรับแก้ไหม | My Reflection: ช่วยในการตรวจทาน Type Safety และ ความถูกต้องทั้งโปรเจกต์ก่อน Commit