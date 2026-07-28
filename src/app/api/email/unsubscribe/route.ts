import { createServiceClient } from '@/lib/supabase/service'
import { unsubscribeSig } from '@/lib/lifecycle-emails'

// One-click unsubscribe from lifecycle emails. Link is signed so it can't be
// used to opt other people out.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const sig = searchParams.get('sig')

  const page = (title: string, body: string) =>
    new Response(
      `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head>
      <body style="background:#0F1117;color:#F0F0F0;font-family:-apple-system,Helvetica,Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
        <div style="text-align:center;padding:32px;max-width:400px;">
          <p style="color:#CC2222;font-weight:bold;letter-spacing:2px;margin-bottom:16px;">TM STATS</p>
          <h1 style="font-size:20px;margin-bottom:12px;">${title}</h1>
          <p style="color:#9A9DB0;font-size:14px;line-height:1.6;">${body}</p>
        </div>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )

  if (!id || !sig || sig !== unsubscribeSig(id)) {
    return page('Invalid link', 'This unsubscribe link is not valid. If you want to stop receiving emails, contact info@tmstatsgolf.com.')
  }

  const supabase = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('users').update({ email_opt_out: true }).eq('id', id)

  return page('You are unsubscribed', 'You will no longer receive emails from TM Stats. Your account and all your data are unaffected.')
}
