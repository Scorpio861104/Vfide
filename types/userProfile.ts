// Username/Account Name System

export interface UserProfile {
  address: string;
  username?: string;
  displayName?: string;
  bio?: string;
  avatar?: string; // IPFS hash or URL
  proofScore?: number;
  joinedDate: number;
  lastUpdated: number;
}

export interface UsernameRegistry {
  [username: string]: string; // username -> wallet address mapping
}

export const USERNAME_CONSTRAINTS = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 20,
  PATTERN: /^[a-zA-Z0-9_-]+$/, // alphanumeric, underscore, hyphen only
  RESERVED: ['admin', 'vfide', 'system', 'official', 'support', 'help', 'null', 'undefined'],
};

export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username) {
    return { valid: false, error: 'Username is required' };
  }

  if (username.length < USERNAME_CONSTRAINTS.MIN_LENGTH) {
    return { valid: false, error: `Username must be at least ${USERNAME_CONSTRAINTS.MIN_LENGTH} characters` };
  }

  if (username.length > USERNAME_CONSTRAINTS.MAX_LENGTH) {
    return { valid: false, error: `Username must be at most ${USERNAME_CONSTRAINTS.MAX_LENGTH} characters` };
  }

  if (!USERNAME_CONSTRAINTS.PATTERN.test(username)) {
    return { valid: false, error: 'Username can only contain letters, numbers, underscore, and hyphen' };
  }

  if (USERNAME_CONSTRAINTS.RESERVED.includes(username.toLowerCase())) {
    return { valid: false, error: 'This username is reserved' };
  }

  return { valid: true };
}

export function formatUserDisplay(profile?: UserProfile, address?: string): string {
  if (profile?.username) {
    return `@${profile.username}`;
  }
  if (profile?.displayName) {
    return profile.displayName;
  }
  if (address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
  return 'Unknown';
}
