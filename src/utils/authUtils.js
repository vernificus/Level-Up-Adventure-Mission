/**
 * Universal elevated user check: returns true if user is super admin / admin
 * by assigned role or authorized administrator email.
 * @param {Object} user - User profile object containing role and/or email
 * @returns {boolean}
 */
export function isAdminUser(user) {
  if (!user) return false;
  const role = user.role;
  const email = (user.email || '').toLowerCase().trim();
  return (
    role === 'admin' ||
    role === 'super_admin' ||
    role === 'super admin' ||
    email === 'matthew.harbert@lcps.org' ||
    email === 'propellevelup@lcps.org'
  );
}
