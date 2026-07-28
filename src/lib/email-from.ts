// All Resend sends use this address. Once send.tmstatsgolf.com is verified in
// Resend, production needs no change — this default matches it. Override with
// the EMAIL_FROM env var if the sender ever changes.
export const EMAIL_FROM = process.env.EMAIL_FROM ?? 'TM Stats <noreply@send.tmstatsgolf.com>'
