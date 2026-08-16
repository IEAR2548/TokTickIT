# Peer Reviewer Documentation (Lab 01)

## Reviewer Details
- **Reviewer Name**: jetanin naitho
- **Student ID**: 6707501011
- **GitHub Username**: jetanin (Jetanin Naitho)

## Pull Request Reviews

### 1. PRs Reviewed BY My Partner (on my Pull Requests)

| PR Title / Branch | PR Link | Partner's Review Comment | My Response |
| :--- | :--- | :--- | :--- |
| `feature/1-project-foundation` → `lab1-staging` | [#5](https://github.com/IEAR2548/TokTickIT/pull/5) | Its ok! Feature 1 has done. Ready for do next step. :) | Thank you, Mr. In. |
| `feature/2-health-check` → `lab1-staging` | [#6](https://github.com/IEAR2548/TokTickIT/pull/6) | All features can run correctly and meet the all acceptance criteria. Ready to merge krub. | – |
| `feature/3-category-seed` → `lab1-staging` | [#7](https://github.com/IEAR2548/TokTickIT/pull/7) | ✅ Category model มี id, unique name, createdAt ครบ<br>✅ Migration สร้างตาราง Category สำเร็จ<br>✅ Seed insert ครบ 4 categories ตรงชื่อ<br>✅ รัน seed ซ้ำ 3 รอบแล้วไม่มีข้อมูลซ้ำ (ยังคง 4 แถว)<br>✅ ไม่พบ .env หรือรหัสผ่านจริงถูก commit<br>Good job Mr.Ear. U have been approved for merge. | – |
| `feature/4-category-list` → `lab1-staging` | [#8](https://github.com/IEAR2548/TokTickIT/pull/8) | Pending – PR not yet reviewed | – |

### 2. PRs I Reviewed FOR My Partner

| PR Title / Branch | PR Link | My Review Comment | Partner's Response |
| :--- | :--- | :--- | :--- |
| `feature/1-project-foundation` → `lab1-staging` | [#5](https://github.com/jetanin/toktickit/pull/5) | Very good mr.In! All criteria pass. Ready to merge. | Thank you krub. |
| `feature/2-health-check` → `lab1-staging` | [#6](https://github.com/jetanin/toktickit/pull/6) | Approved! I've tested the API health check endpoint and the frontend:<br>- GET /api/health returns status 200 with the correct JSON response.<br>- Supertest passes.<br>- Frontend handles both online and offline backend states correctly.<br><br>But I recommend changing error strings like `HTTP error! Status: 502` to something more user-friendly and easy to understand — for example, "Unable to connect to the server. Please try again later." | I have already fixed the error alert. |
| `feature/3-category-seed` → `lab1-staging` | [#7](https://github.com/jetanin/toktickit/pull/7) | Approved! Passed all safety checks and criteria:<br>- **Schema & Migration**: The Category model and migration function without issues.<br>- **Idempotent Seed**: Running the data seed multiple times correctly adds all 4 category items without creating duplicates.<br>- **Security**: The .env file is ignored, database credentials are not exposed, and DATABASE_URL is securely loaded via process.env.<br>Ready to merge. | Thanks MR.Ear. |
| `feature/4-category-list` → `lab1-staging` | [#8](https://github.com/jetanin/toktickit/pull/8) | Everything passes except for "A Vitest test verifies the category-list UI behavior" due to a path error in `vitest.config.ts`. You can fix it by updating `setupFiles` from `./test/setupTests.ts` to `./test/lab-01/setupTests.ts`. | Thanks Mr.Phapangkorn. I already fixed it. |