// WhatsApp Business API integration via Interakt (SA-friendly)
// Swap baseUrl / apiKey for Twilio if preferred

const INTERAKT_API_URL = 'https://api.interakt.ai/v1/public/message/'
const API_KEY = process.env.INTERAKT_API_KEY ?? ''
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? ''

interface WhatsAppSnagPayload {
  contractorName: string
  contractorWhatsApp: string
  projectName: string
  unitName: string
  roomName: string
  description: string
  contractorToken: string
}

export async function sendSnagAssignedWhatsApp(payload: WhatsAppSnagPayload) {
  const link = `${BASE_URL}/c/${payload.contractorToken}`

  const message = {
    countryCode: '27',
    phoneNumber: payload.contractorWhatsApp.replace(/\D/g, '').replace(/^27/, '').replace(/^0/, ''),
    callbackData: 'snag_assigned',
    type: 'Template',
    template: {
      name: 'snag_assigned_v1',
      languageCode: 'en',
      bodyValues: [
        payload.contractorName,
        payload.projectName,
        `${payload.unitName} → ${payload.roomName}`,
        payload.description,
        link,
      ],
    },
  }

  const res = await fetch(INTERAKT_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(API_KEY).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`WhatsApp send failed: ${err}`)
  }

  return res.json()
}

export async function sendResolutionApprovalWhatsApp(
  managerWhatsApp: string,
  managerName: string,
  snagTitle: string,
  contractorName: string,
  approvalLink: string
) {
  const message = {
    countryCode: '27',
    phoneNumber: managerWhatsApp.replace(/\D/g, '').replace(/^27/, '').replace(/^0/, ''),
    callbackData: 'snag_resolved',
    type: 'Template',
    template: {
      name: 'snag_resolved_v1',
      languageCode: 'en',
      bodyValues: [managerName, snagTitle, contractorName, approvalLink],
    },
  }

  await fetch(INTERAKT_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(API_KEY).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  })
}
