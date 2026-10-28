import assert from 'node:assert';
import { isAdminUser } from '../src/utils/authUtils.js';

console.log('Testing isAdminUser...');

// 1. Roles
assert.strictEqual(isAdminUser({ role: 'admin' }), true);
assert.strictEqual(isAdminUser({ role: 'super_admin' }), true);
assert.strictEqual(isAdminUser({ role: 'super admin' }), true);
assert.strictEqual(isAdminUser({ role: 'teacher' }), false);
assert.strictEqual(isAdminUser({ role: 'student' }), false);

// 2. Email checks
assert.strictEqual(isAdminUser({ email: 'matthew.harbert@lcps.org' }), true);
assert.strictEqual(isAdminUser({ email: 'MATTHEW.HARBERT@LCPS.ORG' }), true);
assert.strictEqual(isAdminUser({ email: 'propellevelup@lcps.org' }), true);
assert.strictEqual(isAdminUser({ email: 'other.teacher@school.org' }), false);

// 3. Edge cases
assert.strictEqual(isAdminUser(null), false);
assert.strictEqual(isAdminUser(undefined), false);
assert.strictEqual(isAdminUser({}), false);

console.log('✔ isAdminUser tests passed successfully!');
