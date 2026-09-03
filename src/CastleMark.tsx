/**
 * Logotipo del Castillo Ambulante (homenaje a *El castillo ambulante de Howl*).
 * SVG a color plano sobre el anillo verde de la marca.
 */
export function CastleMark({ size = 34 }: { size?: number }) {
  return (
    <div className="brand-mark" role="img" aria-label="Castillo ambulante de Howl">
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
        <g transform="translate(32 32) scale(.8) translate(-32 -32)">
          <ellipse cx="32" cy="61.3" rx="21" ry="2.6" fill="#7aae63" opacity=".55" />
          <rect x="12" y="24" width="15" height="28" rx="1.5" fill="#5c8492" />
          <polygon points="9,25 30,25 19.5,11" fill="#c24127" />
          <rect x="24" y="28" width="22" height="24" rx="2" fill="#6b95a3" />
          <rect x="30" y="19" width="5" height="9" rx="1" fill="#a36a3c" />
          <circle cx="33.5" cy="13" r="2.8" fill="#e8ece7" opacity=".85" />
          <circle cx="37.5" cy="9" r="2.2" fill="#e8ece7" opacity=".55" />
          <rect x="40" y="14" width="15" height="38" rx="1.5" fill="#7da3b0" />
          <polygon points="37,15 58,15 47.5,3" fill="#2f4f8f" />
          <line x1="47.5" y1="3" x2="47.5" y2="1" stroke="#4a3428" strokeWidth="1.4" />
          <circle cx="47.5" cy="1" r="1.2" fill="#e2764e" />
          <path d="M4.8 47.5 L20.2 47.5 L16 41.5 L9 41.5 Z" fill="#7a4a2e" />
          <rect x="6" y="47" width="13" height="9" rx="2" fill="#a63d1d" />
          <rect x="9.5" y="50" width="5" height="4" rx="1" fill="#ffe9a8" />
          <path d="M31.5 52 v-3.5 a3.7 3.7 0 0 1 7.4 0 v3.5 Z" fill="#8a5a3c" />
          <rect x="16.5" y="30" width="4" height="5" rx="1" fill="#ffe9a8" />
          <rect x="16.5" y="39" width="4" height="5" rx="1" fill="#ffe9a8" />
          <rect x="28" y="33" width="4" height="5" rx="1" fill="#ffe9a8" />
          <rect x="38" y="33" width="4" height="5" rx="1" fill="#ffe9a8" />
          <rect x="28" y="42" width="4" height="5" rx="1" fill="#ffe9a8" />
          <rect x="38" y="42" width="4" height="5" rx="1" fill="#ffe9a8" />
          <rect x="45.5" y="20" width="4" height="6" rx="1" fill="#ffe9a8" />
          <rect x="45.5" y="30" width="4" height="6" rx="1" fill="#ffe9a8" />
          <rect x="45.5" y="40" width="4" height="6" rx="1" fill="#ffe9a8" />
          <rect x="14" y="52" width="3" height="7.5" rx="1.3" fill="#4a3428" />
          <rect x="48" y="52" width="3" height="7.5" rx="1.3" fill="#4a3428" />
          <path d="M11.5 58.5 Q14.5 61.5 17.5 58.5" fill="none" stroke="#4a3428" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M47.5 58.5 Q50.5 61.5 53.5 58.5" fill="none" stroke="#4a3428" strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  )
}