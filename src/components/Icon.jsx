// Lightweight stroke icons. 1.6 stroke for crisp at 18-20px.
export default function Icon({ name, size = 18, stroke = 1.6, className, style }) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: stroke,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    style,
  };
  switch (name) {
    case 'dashboard':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      );
    case 'users':
      return (
        <svg {...props}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 20c.7-3.2 3-5 5.5-5s4.8 1.8 5.5 5" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M15.5 14.5c2.6.2 4.5 1.7 5 4.5" />
        </svg>
      );
    case 'user':
      return (
        <svg {...props}>
          <circle cx="12" cy="8" r="3.6" />
          <path d="M5 20c.8-3.6 3.4-5.5 7-5.5s6.2 1.9 7 5.5" />
        </svg>
      );
    case 'user-plus':
      return (
        <svg {...props}>
          <circle cx="10" cy="8" r="3.2" />
          <path d="M3 20c.7-3.2 3-5 7-5s6.3 1.8 7 5" />
          <path d="M19 8v6M16 11h6" />
        </svg>
      );
    case 'doc':
      return (
        <svg {...props}>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h6M9 17h4" />
        </svg>
      );
    case 'folder':
      return (
        <svg {...props}>
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...props}>
          <rect x="3.5" y="5" width="17" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3.5 10h17" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...props}>
          <path d="M12 3l8 3v6c0 4.5-3.2 8.3-8 9-4.8-.7-8-4.5-8-9V6z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case 'chart':
      return (
        <svg {...props}>
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <rect x="8" y="11" width="3" height="6" rx=".5" />
          <rect x="13" y="7" width="3" height="10" rx=".5" />
          <rect x="18" y="14" width="2" height="3" rx=".5" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      );
    case 'search':
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      );
    case 'bell':
      return (
        <svg {...props}>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        </svg>
      );
    case 'plus':
      return (
        <svg {...props}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'minus':
      return (
        <svg {...props}>
          <path d="M5 12h14" />
        </svg>
      );
    case 'check':
      return (
        <svg {...props}>
          <path d="m4.5 12 5 5 10-11" />
        </svg>
      );
    case 'x':
      return (
        <svg {...props}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      );
    case 'chevron-down':
      return (
        <svg {...props}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case 'chevron-right':
      return (
        <svg {...props}>
          <path d="m9 6 6 6-6 6" />
        </svg>
      );
    case 'chevron-left':
      return (
        <svg {...props}>
          <path d="m15 6-6 6 6 6" />
        </svg>
      );
    case 'menu':
      return (
        <svg {...props}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );
    case 'panel-left':
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M9 4v16" />
        </svg>
      );
    case 'filter':
      return (
        <svg {...props}>
          <path d="M3 5h18l-7 9v5l-4 2v-7z" />
        </svg>
      );
    case 'more-h':
      return (
        <svg {...props}>
          <circle cx="6" cy="12" r="1.4" />
          <circle cx="12" cy="12" r="1.4" />
          <circle cx="18" cy="12" r="1.4" />
        </svg>
      );
    case 'more-v':
      return (
        <svg {...props}>
          <circle cx="12" cy="6" r="1.4" />
          <circle cx="12" cy="12" r="1.4" />
          <circle cx="12" cy="18" r="1.4" />
        </svg>
      );
    case 'upload':
      return (
        <svg {...props}>
          <path d="M12 16V4" />
          <path d="m7 9 5-5 5 5" />
          <path d="M5 20h14" />
        </svg>
      );
    case 'camera':
      return (
        <svg {...props}>
          <path d="M4 8h3l2-2h6l2 2h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
          <circle cx="12" cy="13.5" r="3.5" />
        </svg>
      );
    case 'download':
      return (
        <svg {...props}>
          <path d="M12 4v12" />
          <path d="m7 11 5 5 5-5" />
          <path d="M5 20h14" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...props}>
          <path d="M4 7h16" />
          <path d="M9 7V4h6v3" />
          <path d="m6 7 1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
          <path d="M10 11v7M14 11v7" />
        </svg>
      );
    case 'edit':
      return (
        <svg {...props}>
          <path d="M4 20h4l10-10-4-4L4 16z" />
          <path d="m14 6 4 4" />
        </svg>
      );
    case 'eye':
      return (
        <svg {...props}>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'lock':
      return (
        <svg {...props}>
          <rect x="4.5" y="11" width="15" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 1 1 8 0v4" />
        </svg>
      );
    case 'mail':
      return (
        <svg {...props}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 7 9-7" />
        </svg>
      );
    case 'phone':
      return (
        <svg {...props}>
          <path d="M5 4h3l2 5-3 1.5a11 11 0 0 0 6.5 6.5L15 14l5 2v3a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z" />
        </svg>
      );
    case 'logout':
      return (
        <svg {...props}>
          <path d="M9 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3" />
          <path d="m15 8 4 4-4 4" />
          <path d="M19 12H9" />
        </svg>
      );
    case 'moon':
      return (
        <svg {...props}>
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      );
    case 'sun':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
        </svg>
      );
    case 'key':
      return (
        <svg {...props}>
          <circle cx="8" cy="14" r="4" />
          <path d="m11 11 9-9" />
          <path d="m15 7 3 3" />
        </svg>
      );
    case 'history':
      return (
        <svg {...props}>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
          <path d="M12 8v5l3 2" />
        </svg>
      );
    case 'gavel':
      return (
        <svg {...props}>
          <path d="m14 6 6 6" />
          <path d="m11 9 6 6" />
          <path d="M9.5 11.5 4 17l3 3 5.5-5.5" />
          <path d="M14 6l3-3 4 4-3 3" />
          <path d="M5 21h14" />
        </svg>
      );
    case 'print':
      return (
        <svg {...props}>
          <path d="M6 9V3h12v6" />
          <rect x="3.5" y="9" width="17" height="8" rx="2" />
          <path d="M6 14h12v7H6z" />
        </svg>
      );
    case 'scale':
      return (
        <svg {...props}>
          <path d="M12 3v18M5 8l-3 6h6zM19 8l-3 6h6zM5 21h14M7 8h10" />
        </svg>
      );
    case 'alert':
      return (
        <svg {...props}>
          <path d="M12 3 2 21h20z" />
          <path d="M12 10v5" />
          <circle cx="12" cy="18" r=".8" fill="currentColor" />
        </svg>
      );
    case 'info':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v6" />
          <circle cx="12" cy="8" r=".8" fill="currentColor" />
        </svg>
      );
    case 'umbrella':
      return (
        <svg {...props}>
          <path d="M2.5 12a9.5 9.5 0 0 1 19 0z" />
          <path d="M12 12v7a2 2 0 0 0 4 0" />
          <path d="M12 3v1" />
        </svg>
      );
    case 'gift':
      return (
        <svg {...props}>
          <rect x="3" y="9" width="18" height="12" rx="1" />
          <path d="M3 14h18" />
          <path d="M12 9v12" />
          <path d="M8 9c-2 0-3-1.5-2-3s3-1 4 1c1-2 3-2.5 4-1s0 3-2 3" />
        </svg>
      );
    case 'fingerprint':
      return (
        <svg {...props}>
          <path d="M6 11a6 6 0 0 1 12 0v3" />
          <path d="M9 13v1a3 3 0 0 0 6 0" />
          <path d="M9 18a4 4 0 0 0 .5 2" />
          <path d="M14.5 20a8 8 0 0 0 .5-3" />
        </svg>
      );
    case 'qr':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <path d="M14 14h3v3M21 14v7M14 19v2M19 19h2" />
        </svg>
      );
    case 'globe':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
      );
    case 'building':
      return (
        <svg {...props}>
          <rect x="4" y="3" width="16" height="18" rx="1.5" />
          <path d="M9 8h2M9 12h2M9 16h2M14 8h2M14 12h2M14 16h2" />
        </svg>
      );
    case 'briefcase':
      return (
        <svg {...props}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M3 13h18" />
        </svg>
      );
    case 'scan':
      return (
        <svg {...props}>
          <path d="M4 8V6a2 2 0 0 1 2-2h2" />
          <path d="M4 16v2a2 2 0 0 0 2 2h2" />
          <path d="M16 4h2a2 2 0 0 1 2 2v2" />
          <path d="M16 20h2a2 2 0 0 0 2-2v-2" />
          <path d="M4 12h16" />
        </svg>
      );
    case 'share':
      return (
        <svg {...props}>
          <circle cx="6" cy="12" r="2.5" />
          <circle cx="18" cy="6" r="2.5" />
          <circle cx="18" cy="18" r="2.5" />
          <path d="m8 11 8-4M8 13l8 4" />
        </svg>
      );
    case 'link':
      return (
        <svg {...props}>
          <path d="M9 15a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7L11 7.5" />
          <path d="M15 9a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7L13 16.5" />
        </svg>
      );
    case 'sparkle':
      return (
        <svg {...props}>
          <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
          <path d="m6 6 3 3M15 15l3 3M18 6l-3 3M9 15l-3 3" />
        </svg>
      );
    case 'pen':
      return (
        <svg {...props}>
          <path d="M14 4l6 6L9 21H3v-6z" />
        </svg>
      );
    case 'image':
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="10" r="2" />
          <path d="m4 19 5-5 4 4 3-3 4 4" />
        </svg>
      );
    case 'pdf':
      return (
        <svg {...props}>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5" />
          <path d="M8.5 14h7M8.5 17h5" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
  }
}
