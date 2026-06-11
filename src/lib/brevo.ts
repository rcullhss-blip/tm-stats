const BREVO_API_URL = 'https://api.brevo.com/v3'

interface SendEmailParams {
  to: { email: string; name: string }[]
  subject: string
  htmlContent: string
  tags?: string[]
}

interface AddContactParams {
  email: string
  firstName?: string
  lastName?: string
  listIds?: number[]
  attributes?: Record<string, string>
}

export async function sendEmail(params: SendEmailParams) {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) throw new Error('BREVO_API_KEY not set in environment')

  const response = await fetch(`${BREVO_API_URL}/smtp/email`, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: process.env.BREVO_SENDER_NAME || 'Rob Cull - TM Stats Golf',
        email: process.env.BREVO_SENDER_EMAIL || 'rob@tmstatsgolf.com',
      },
      to: params.to,
      subject: params.subject,
      htmlContent: params.htmlContent,
      tags: params.tags || ['tmstats-marketing'],
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Brevo send failed: ${JSON.stringify(error)}`)
  }

  return await response.json()
}

export async function addContact(params: AddContactParams) {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) throw new Error('BREVO_API_KEY not set in environment')

  const [firstName, ...rest] = (params.firstName || '').split(' ')

  const response = await fetch(`${BREVO_API_URL}/contacts`, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      email: params.email,
      attributes: {
        FIRSTNAME: firstName || '',
        LASTNAME: rest.join(' ') || params.lastName || '',
        ...params.attributes,
      },
      listIds: params.listIds || [],
      updateEnabled: true,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    if (response.status === 400 && JSON.stringify(error).includes('already exist')) {
      console.log(`Contact ${params.email} already exists in Brevo`)
      return null
    }
    throw new Error(`Brevo add contact failed: ${JSON.stringify(error)}`)
  }

  return await response.json()
}

export async function getTodaysSendCount(): Promise<number> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) return 0

  const today = new Date().toISOString().split('T')[0]
  const response = await fetch(
    `${BREVO_API_URL}/smtp/statistics/events?startDate=${today}&endDate=${today}&event=requests&limit=1`,
    { headers: { 'accept': 'application/json', 'api-key': apiKey } }
  )

  if (!response.ok) return 0
  const data = await response.json()
  return data.count || 0
}
