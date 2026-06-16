// Builds a wa.me link that opens WhatsApp with a pre-filled message —
// sends from the user's own WhatsApp, no Business API needed.
export function waLink(phone: string, text: string): string {
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) digits = '27' + digits.slice(1) // SA local → international
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}
