/**
 * Metallic Icon Components
 * Clean, industrial metal-styled SVG icons for navigation
 */

interface IconProps {
  className?: string;
  size?: number;
}

// Metallic Headhunter Icon
export function MetalHeadhunterIcon({ className = "", size = 24 }: IconProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="metal-gradient-1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9CA3AF" />
          <stop offset="50%" stopColor="#D1D5DB" />
          <stop offset="100%" stopColor="#6B7280" />
        </linearGradient>
        <linearGradient id="metal-shine-1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      
      {/* Target crosshair */}
      <circle cx="12" cy="12" r="9" stroke="url(#metal-gradient-1)" strokeWidth="1.5" fill="none"/>
      <circle cx="12" cy="12" r="5" stroke="url(#metal-gradient-1)" strokeWidth="1.5" fill="none"/>
      <circle cx="12" cy="12" r="2" fill="url(#metal-gradient-1)"/>
      
      {/* Crosshair lines */}
      <line x1="12" y1="3" x2="12" y2="7" stroke="url(#metal-gradient-1)" strokeWidth="1.5"/>
      <line x1="12" y1="17" x2="12" y2="21" stroke="url(#metal-gradient-1)" strokeWidth="1.5"/>
      <line x1="3" y1="12" x2="7" y2="12" stroke="url(#metal-gradient-1)" strokeWidth="1.5"/>
      <line x1="17" y1="12" x2="21" y2="12" stroke="url(#metal-gradient-1)" strokeWidth="1.5"/>
      
      {/* Metallic shine overlay */}
      <circle cx="12" cy="12" r="9" fill="url(#metal-shine-1)" opacity="0.6"/>
    </svg>
  );
}

// Metallic Vault Icon
export function MetalVaultIcon({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="vault-metal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#B0B0B5" />
          <stop offset="50%" stopColor="#E5E5EA" />
          <stop offset="100%" stopColor="#808085" />
        </linearGradient>
      </defs>
      
      {/* Vault door */}
      <rect x="4" y="4" width="16" height="16" rx="1" stroke="url(#vault-metal)" strokeWidth="1.5" fill="none"/>
      <rect x="6" y="6" width="12" height="12" rx="0.5" stroke="url(#vault-metal)" strokeWidth="1" fill="none"/>
      
      {/* Lock mechanism circle */}
      <circle cx="12" cy="12" r="4" stroke="url(#vault-metal)" strokeWidth="1.5" fill="none"/>
      <circle cx="12" cy="12" r="2" fill="url(#vault-metal)"/>
      
      {/* Lock lines */}
      <line x1="12" y1="12" x2="12" y2="15" stroke="url(#vault-metal)" strokeWidth="1.5"/>
      
      {/* Bolts */}
      <circle cx="7" cy="7" r="0.5" fill="url(#vault-metal)"/>
      <circle cx="17" cy="7" r="0.5" fill="url(#vault-metal)"/>
      <circle cx="7" cy="17" r="0.5" fill="url(#vault-metal)"/>
      <circle cx="17" cy="17" r="0.5" fill="url(#vault-metal)"/>
    </svg>
  );
}

// Metallic Shield (Security) Icon
export function MetalShieldIcon({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="shield-metal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A8A8AD" />
          <stop offset="50%" stopColor="#D8D8DD" />
          <stop offset="100%" stopColor="#707075" />
        </linearGradient>
        <radialGradient id="shield-radial">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#000000" stopOpacity="0.2"/>
        </radialGradient>
      </defs>
      
      {/* Shield shape */}
      <path 
        d="M12 3L4 6V11C4 16 7.5 20 12 22C16.5 20 20 16 20 11V6L12 3Z" 
        stroke="url(#shield-metal)" 
        strokeWidth="1.5" 
        fill="none"
      />
      
      {/* Inner shield detail */}
      <path 
        d="M12 5L6 7.5V11C6 14.5 8.5 17.5 12 19.5C15.5 17.5 18 14.5 18 11V7.5L12 5Z" 
        fill="url(#shield-radial)" 
        opacity="0.3"
      />
      
      {/* Check mark */}
      <path d="M9 12L11 14L15 10" stroke="url(#shield-metal)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Metallic Merchant Icon
export function MetalMerchantIcon({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="merchant-metal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9FA4B0" />
          <stop offset="50%" stopColor="#CDD1DB" />
          <stop offset="100%" stopColor="#6A6F7A" />
        </linearGradient>
      </defs>
      
      {/* Store front */}
      <path d="M3 9L5 3H19L21 9" stroke="url(#merchant-metal)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M3 9V20H21V9" stroke="url(#merchant-metal)" strokeWidth="1.5" strokeLinejoin="round"/>
      
      {/* Awning curves */}
      <path d="M5 9C5 10 6 11 7 11C8 11 9 10 9 9" stroke="url(#merchant-metal)" strokeWidth="1" fill="none"/>
      <path d="M9 9C9 10 10 11 11 11C12 11 13 10 13 9" stroke="url(#merchant-metal)" strokeWidth="1" fill="none"/>
      <path d="M13 9C13 10 14 11 15 11C16 11 17 10 17 9" stroke="url(#merchant-metal)" strokeWidth="1" fill="none"/>
      <path d="M17 9C17 10 18 11 19 11C20 11 21 10 21 9" stroke="url(#merchant-metal)" strokeWidth="1" fill="none"/>
      
      {/* Door */}
      <rect x="10" y="13" width="4" height="7" stroke="url(#merchant-metal)" strokeWidth="1.2" fill="none"/>
      <circle cx="13" cy="16" r="0.5" fill="url(#merchant-metal)"/>
    </svg>
  );
}

// Metallic Governance Icon
export function MetalGovernanceIcon({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="gov-metal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A5AAB5" />
          <stop offset="50%" stopColor="#D5DAE5" />
          <stop offset="100%" stopColor="#757A85" />
        </linearGradient>
      </defs>
      
      {/* Classical building */}
      <path d="M3 20H21" stroke="url(#gov-metal)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M4 20V11H20V20" stroke="url(#gov-metal)" strokeWidth="1.5"/>
      
      {/* Columns */}
      <line x1="7" y1="11" x2="7" y2="20" stroke="url(#gov-metal)" strokeWidth="1.2"/>
      <line x1="12" y1="11" x2="12" y2="20" stroke="url(#gov-metal)" strokeWidth="1.2"/>
      <line x1="17" y1="11" x2="17" y2="20" stroke="url(#gov-metal)" strokeWidth="1.2"/>
      
      {/* Roof */}
      <path d="M2 11L12 4L22 11" stroke="url(#gov-metal)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      
      {/* Triangle pediment */}
      <path d="M4 11L12 5L20 11" fill="url(#gov-metal)" opacity="0.2"/>
    </svg>
  );
}

// Metallic Social Icon  
export function MetalSocialIcon({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="social-metal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9CA1AC" />
          <stop offset="50%" stopColor="#CCD1DC" />
          <stop offset="100%" stopColor="#6C7177" />
        </linearGradient>
      </defs>
      
      {/* Connected nodes */}
      <circle cx="6" cy="12" r="2.5" stroke="url(#social-metal)" strokeWidth="1.5" fill="none"/>
      <circle cx="18" cy="7" r="2.5" stroke="url(#social-metal)" strokeWidth="1.5" fill="none"/>
      <circle cx="18" cy="17" r="2.5" stroke="url(#social-metal)" strokeWidth="1.5" fill="none"/>
      
      {/* Connection lines */}
      <line x1="8" y1="11" x2="16" y2="8" stroke="url(#social-metal)" strokeWidth="1.2"/>
      <line x1="8" y1="13" x2="16" y2="16" stroke="url(#social-metal)" strokeWidth="1.2"/>
    </svg>
  );
}

// Metallic Dashboard Icon
export function MetalDashboardIcon({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="dash-metal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A0A5B0" />
          <stop offset="50%" stopColor="#D0D5E0" />
          <stop offset="100%" stopColor="#707580" />
        </linearGradient>
      </defs>
      
      {/* Grid squares */}
      <rect x="3" y="3" width="8" height="8" rx="1" stroke="url(#dash-metal)" strokeWidth="1.5" fill="none"/>
      <rect x="13" y="3" width="8" height="8" rx="1" stroke="url(#dash-metal)" strokeWidth="1.5" fill="none"/>
      <rect x="3" y="13" width="8" height="8" rx="1" stroke="url(#dash-metal)" strokeWidth="1.5" fill="none"/>
      <rect x="13" y="13" width="8" height="8" rx="1" stroke="url(#dash-metal)" strokeWidth="1.5" fill="none"/>
      
      {/* Inner details */}
      <circle cx="7" cy="7" r="1" fill="url(#dash-metal)"/>
      <rect x="15" y="5" width="4" height="1" rx="0.5" fill="url(#dash-metal)"/>
      <rect x="15" y="8" width="3" height="1" rx="0.5" fill="url(#dash-metal)"/>
      <line x1="5" y1="17" x2="9" y2="17" stroke="url(#dash-metal)" strokeWidth="1"/>
      <line x1="15" y1="15" x2="19" y2="19" stroke="url(#dash-metal)" strokeWidth="1"/>
      <line x1="19" y1="15" x2="15" y2="19" stroke="url(#dash-metal)" strokeWidth="1"/>
    </svg>
  );
}

// Metallic Rewards Icon
export function MetalRewardsIcon({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="reward-metal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#B5AA90" />
          <stop offset="50%" stopColor="#E5DAC0" />
          <stop offset="100%" stopColor="#857A60" />
        </linearGradient>
        <radialGradient id="reward-shine">
          <stop offset="0%" stopColor="#FFF8E0" stopOpacity="0.6"/>
          <stop offset="100%" stopColor="#B5AA90" stopOpacity="0"/>
        </radialGradient>
      </defs>
      
      {/* Trophy cup */}
      <path d="M7 8V6C7 5 8 4 9 4H15C16 4 17 5 17 6V8" stroke="url(#reward-metal)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M7 8C7 12 9 14 12 14C15 14 17 12 17 8" stroke="url(#reward-metal)" strokeWidth="1.5"/>
      
      {/* Handles */}
      <path d="M7 8C5 8 4 9 4 10C4 11 5 12 7 12" stroke="url(#reward-metal)" strokeWidth="1.2" fill="none"/>
      <path d="M17 8C19 8 20 9 20 10C20 11 19 12 17 12" stroke="url(#reward-metal)" strokeWidth="1.2" fill="none"/>
      
      {/* Base */}
      <path d="M10 14V17H14V14" stroke="url(#reward-metal)" strokeWidth="1.5"/>
      <rect x="8" y="17" width="8" height="2" rx="0.5" stroke="url(#reward-metal)" strokeWidth="1.5" fill="none"/>
      
      {/* Star on cup */}
      <path d="M12 7L12.5 8.5L14 9L12.5 9.5L12 11L11.5 9.5L10 9L11.5 8.5L12 7Z" fill="url(#reward-shine)"/>
    </svg>
  );
}

// Metallic Token Launch Icon
export function MetalTokenIcon({ className = "", size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="token-metal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A8A8AD" />
          <stop offset="50%" stopColor="#D8D8DD" />
          <stop offset="100%" stopColor="#787880" />
        </linearGradient>
      </defs>
      
      {/* Coin */}
      <circle cx="12" cy="12" r="8" stroke="url(#token-metal)" strokeWidth="1.5" fill="none"/>
      <circle cx="12" cy="12" r="6" stroke="url(#token-metal)" strokeWidth="1" fill="none"/>
      
      {/* V symbol */}
      <path d="M9 9L12 15L15 9" stroke="url(#token-metal)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      
      {/* Launch arrow */}
      <path d="M17 6L20 3M20 3L17 0M20 3H16" stroke="url(#token-metal)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
