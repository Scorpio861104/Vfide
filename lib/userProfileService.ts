// User Profile & Username Management

import { UserProfile, UsernameRegistry } from '@/types/userProfile';

const STORAGE_KEYS = {
  PROFILE: 'vfide_profile',
  USERNAME_REGISTRY: 'vfide_username_registry',
  PROFILES_CACHE: 'vfide_profiles_cache',
};

export class UserProfileService {
  // Get user's own profile
  static getMyProfile(address: string): UserProfile | null {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEYS.PROFILE}_${address}`);
      if (stored) {
        return JSON.parse(stored);
      }
      return null;
    } catch (e) {
      console.error('Failed to load profile:', e);
      return null;
    }
  }

  // Save user's own profile
  static saveMyProfile(profile: UserProfile): boolean {
    try {
      localStorage.setItem(`${STORAGE_KEYS.PROFILE}_${profile.address}`, JSON.stringify(profile));
      
      // Update username registry if username exists
      if (profile.username) {
        this.registerUsername(profile.username, profile.address);
      }
      
      // Update profiles cache
      this.cacheProfile(profile);
      
      return true;
    } catch (e) {
      console.error('Failed to save profile:', e);
      return false;
    }
  }

  // Get any user's profile (from cache)
  static getProfile(address: string): UserProfile | null {
    try {
      const cache = localStorage.getItem(STORAGE_KEYS.PROFILES_CACHE);
      if (cache) {
        const profiles: Record<string, UserProfile> = JSON.parse(cache);
        return profiles[address.toLowerCase()] || null;
      }
      return null;
    } catch (e) {
      console.error('Failed to get cached profile:', e);
      return null;
    }
  }

  // Cache a profile for quick lookup
  static cacheProfile(profile: UserProfile): void {
    try {
      const cache = localStorage.getItem(STORAGE_KEYS.PROFILES_CACHE);
      const profiles: Record<string, UserProfile> = cache ? JSON.parse(cache) : {};
      profiles[profile.address.toLowerCase()] = profile;
      localStorage.setItem(STORAGE_KEYS.PROFILES_CACHE, JSON.stringify(profiles));
    } catch (e) {
      console.error('Failed to cache profile:', e);
    }
  }

  // Check if username is available
  static isUsernameAvailable(username: string, myAddress: string): boolean {
    try {
      const registry = this.getUsernameRegistry();
      const owner = registry[username.toLowerCase()];
      return !owner || owner.toLowerCase() === myAddress.toLowerCase();
    } catch (e) {
      console.error('Failed to check username availability:', e);
      return false;
    }
  }

  // Register username
  static registerUsername(username: string, address: string): void {
    try {
      const registry = this.getUsernameRegistry();
      
      // Remove old username if exists
      Object.keys(registry).forEach(key => {
        const value = registry[key];
        if (value && value.toLowerCase() === address.toLowerCase()) {
          delete registry[key];
        }
      });
      
      // Register new username
      registry[username.toLowerCase()] = address;
      localStorage.setItem(STORAGE_KEYS.USERNAME_REGISTRY, JSON.stringify(registry));
    } catch (e) {
      console.error('Failed to register username:', e);
    }
  }

  // Get username registry
  static getUsernameRegistry(): UsernameRegistry {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USERNAME_REGISTRY);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.error('Failed to load username registry:', e);
      return {};
    }
  }

  // Resolve username to address
  static resolveUsername(username: string): string | null {
    const registry = this.getUsernameRegistry();
    return registry[username.toLowerCase()] || null;
  }

  // Resolve address to username
  static resolveAddress(address: string): string | null {
    const profile = this.getProfile(address);
    return profile?.username || null;
  }

  // Get display name for address (username > display name > truncated address)
  static getDisplayName(address: string): string {
    const profile = this.getProfile(address);
    if (profile?.username) {
      return `@${profile.username}`;
    }
    if (profile?.displayName) {
      return profile.displayName;
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  // Search profiles by username
  static searchByUsername(query: string): UserProfile[] {
    try {
      const cache = localStorage.getItem(STORAGE_KEYS.PROFILES_CACHE);
      if (!cache) return [];
      
      const profiles: Record<string, UserProfile> = JSON.parse(cache);
      const lowerQuery = query.toLowerCase();
      
      return Object.values(profiles).filter(profile => 
        profile.username?.toLowerCase().includes(lowerQuery) ||
        profile.displayName?.toLowerCase().includes(lowerQuery)
      );
    } catch (e) {
      console.error('Failed to search profiles:', e);
      return [];
    }
  }
}
