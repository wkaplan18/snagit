import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: { token: string } }) {
  let projectName = 'Snag Report'

  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/projects?share_token=eq.${params.token}&select=name&limit=1`
    const res = await fetch(url, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    })
    const data = await res.json()
    if (data?.[0]?.name) projectName = data[0].name
  } catch {}

  const fontSize = projectName.length > 30 ? 60 : 76

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(145deg, #050E1F 0%, #0a1628 60%, #0f1d35 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
          padding: '0 80px',
        }}
      >
        <div style={{ position: 'absolute', top: -120, right: -80, width: 600, height: 600, background: 'radial-gradient(circle, rgba(26,86,219,0.15) 0%, transparent 70%)' }} />

        {/* SnagIT wordmark top-left — bigger */}
        <div style={{ position: 'absolute', top: 48, left: 64, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 80, height: 80, background: 'white', borderRadius: 20, boxShadow: '0 6px 24px rgba(0,0,0,0.35)' }}>
            <svg width="54" height="54" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="7" fill="#1A56DB"/>
              <circle cx="16" cy="16" r="8" stroke="white" strokeWidth="2" fill="none" opacity="0.9"/>
              <circle cx="16" cy="16" r="2.5" fill="white"/>
              <line x1="16" y1="4"  x2="16" y2="9"  stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="16" y1="23" x2="16" y2="28" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="4"  y1="16" x2="9"  y2="16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="23" y1="16" x2="28" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ display: 'flex', fontSize: 52, fontWeight: 800, letterSpacing: '-1.5px' }}>
            <span style={{ color: 'white' }}>Snag</span>
            <span style={{ color: '#22C55E' }}>IT</span>
          </div>
        </div>

        {/* Badge — bigger, solid */}
        <div style={{ display: 'flex', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#1A56DB', borderRadius: 99, padding: '14px 32px' }}>
            <div style={{ width: 10, height: 10, borderRadius: 99, background: '#4ade80' }} />
            <span style={{ fontSize: 30, fontWeight: 700, color: 'white', letterSpacing: '0.3px' }}>Snag Report</span>
          </div>
        </div>

        {/* Project name — unchanged, user confirmed this is perfect */}
        <div style={{ display: 'flex', fontSize, fontWeight: 800, color: 'white', letterSpacing: '-2px', lineHeight: 1.1, textAlign: 'center', maxWidth: 960 }}>
          {projectName}
        </div>

        {/* Footer — bigger and more visible */}
        <div style={{ position: 'absolute', bottom: 44, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 99, padding: '12px 28px' }}>
          <div style={{ width: 8, height: 8, borderRadius: 99, background: '#4ade80' }} />
          <span style={{ fontSize: 26, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>snagitapp.co.za</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
