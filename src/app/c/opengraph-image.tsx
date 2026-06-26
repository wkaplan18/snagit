import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'SnagIT — Log it. Fix it. Done.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(145deg, #0b2558 0%, #1A56DB 55%, #3b74e8 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle radial glow top-right */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            right: -80,
            width: 600,
            height: 600,
            background: 'radial-gradient(circle, rgba(255,255,255,0.10) 0%, transparent 70%)',
          }}
        />
        {/* Subtle radial glow bottom-left */}
        <div
          style={{
            position: 'absolute',
            bottom: -100,
            left: -60,
            width: 500,
            height: 500,
            background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
          }}
        />

        {/* Icon box */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 108,
            height: 108,
            background: 'rgba(255,255,255,0.14)',
            borderRadius: 28,
            border: '2px solid rgba(255,255,255,0.28)',
            marginBottom: 36,
          }}
        >
          {/* Crosshair icon matching app icon.svg */}
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="18" stroke="white" strokeWidth="3.5" fill="none" opacity="0.95" />
            <circle cx="32" cy="32" r="5.5" fill="white" />
            <line x1="32" y1="6"  x2="32" y2="17" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="32" y1="47" x2="32" y2="58" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="6"  y1="32" x2="17" y2="32" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="47" y1="32" x2="58" y2="32" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Wordmark */}
        <div
          style={{
            fontSize: 92,
            fontWeight: 800,
            color: 'white',
            letterSpacing: '-3px',
            lineHeight: 1,
            marginBottom: 22,
          }}
        >
          SnagIT
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 34,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.78)',
            letterSpacing: '0.5px',
          }}
        >
          Log it. Fix it. Done.
        </div>

        {/* Domain badge */}
        <div
          style={{
            position: 'absolute',
            bottom: 44,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(255,255,255,0.12)',
            borderRadius: 99,
            padding: '8px 20px',
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 99,
              background: '#4ade80',
            }}
          />
          <span
            style={{
              fontSize: 18,
              color: 'rgba(255,255,255,0.6)',
              fontWeight: 500,
              letterSpacing: '0.5px',
            }}
          >
            snagitapp.co.za
          </span>
        </div>
      </div>
    ),
    { ...size }
  )
}
