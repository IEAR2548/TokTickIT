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

---

## My Reflection