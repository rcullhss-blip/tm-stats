// The admin account. Always compare against the email on the signed-in auth
// user (supabase.auth.getUser()), never the email column in public.users:
// that row is editable by its owner, so it cannot be trusted for access.
export const ADMIN_EMAIL = 'rcullhss@gmail.com'

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase() === ADMIN_EMAIL
}
