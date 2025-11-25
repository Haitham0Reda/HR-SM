---
description: Clean up remaining school references in test files
---

## Steps

1. **Edit testHelpers**
   - Open `server/testing/controllers/testHelpers.js`.
   - Remove the `createTestSchool` function definition (lines 27-33 in the current file).
   - Save the file.

2. **Update imports in controller test files**
   - For each file in `server/testing/controllers` that contains the import line:
     ```js
     import { createMockResponse, createMockRequest, createTestSchool, createTestUser, cleanupTestData } from './testHelpers.js';
     ```
     replace it with:
     ```js
     import { createMockResponse, createMockRequest, createTestUser, cleanupTestData } from './testHelpers.js';
     ```
   - This can be done with a bulk replace or individually.

3. **Remove `testSchool` variable and creation**
   - In each controller test file, locate the declaration `let mockReq, mockRes, testSchool, testUser;` and change it to `let mockReq, mockRes, testUser;`.
   - In the `beforeEach` block, delete the line `testSchool = await createTestSchool();`.
   - Update the `createTestUser` call to remove the school argument, e.g. change:
     ```js
     testUser = await createTestUser(testSchool._id, null, null);
     ```
     to:
     ```js
     testUser = await createTestUser(null, null);
     ```
   - Adjust any other code that referenced `testSchool` accordingly (usually none after removal).

4. **Run a final grep to ensure no leftover references**
   - Execute:
     ```
     grep -iR "school" server/testing
     ```
   - Verify that the output only contains intentional non‑test references (e.g., documentation) or is empty.

5. **Run the test suite**
   - In the project root, run:
     ```
     npm test
     ```
   - Ensure all tests pass. If any fail due to missing `testSchool`, adjust the specific test as needed following steps 2‑3.

6. **Commit the changes**
   - Add and commit all modified files:
     ```
     git add server/testing/controllers/*.test.js server/testing/controllers/testHelpers.js
     git commit -m "Remove all school test helpers and references"
     ```

**Note:** This workflow assumes the test suite does not require a school entity for any remaining functionality. If a specific test still needs a school, consider mocking the related fields directly on the user/department/position objects instead of creating a separate school document.
