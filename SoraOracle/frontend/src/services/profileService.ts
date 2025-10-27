export interface UserProfile {
  address: string;
  username: string;
  bio: string;
  avatar?: string;
  createdAt: number;
  totalBets: number;
  totalWinnings: string;
}

const STORAGE_KEY = 'sora_user_profiles';

export class ProfileService {
  private static getProfiles(): Record<string, UserProfile> {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  }

  private static saveProfiles(profiles: Record<string, UserProfile>): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  }

  static getProfile(address: string): UserProfile | null {
    const profiles = this.getProfiles();
    return profiles[address.toLowerCase()] || null;
  }

  static createProfile(address: string, username: string, bio: string = '', avatar?: string): UserProfile {
    const profiles = this.getProfiles();
    const profile: UserProfile = {
      address: address.toLowerCase(),
      username,
      bio,
      avatar,
      createdAt: Date.now(),
      totalBets: 0,
      totalWinnings: '0'
    };
    profiles[address.toLowerCase()] = profile;
    this.saveProfiles(profiles);
    return profile;
  }

  static updateProfile(address: string, updates: Partial<UserProfile>): UserProfile | null {
    const profiles = this.getProfiles();
    const profile = profiles[address.toLowerCase()];
    if (!profile) return null;

    const updated = { ...profile, ...updates, address: profile.address };
    profiles[address.toLowerCase()] = updated;
    this.saveProfiles(profiles);
    return updated;
  }

  static incrementBets(address: string): void {
    const profile = this.getProfile(address);
    if (profile) {
      this.updateProfile(address, { totalBets: profile.totalBets + 1 });
    }
  }

  static addWinnings(address: string, amount: string): void {
    const profile = this.getProfile(address);
    if (profile) {
      const current = parseFloat(profile.totalWinnings || '0');
      const additional = parseFloat(amount);
      this.updateProfile(address, { totalWinnings: (current + additional).toString() });
    }
  }
}
