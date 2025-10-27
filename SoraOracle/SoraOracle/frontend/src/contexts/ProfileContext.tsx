import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ProfileService, UserProfile } from '../services/profileService';
import { useWallet } from '@sora-oracle/sdk/hooks';

interface ProfileContextType {
  profile: UserProfile | null;
  isNewUser: boolean;
  createProfile: (username: string, bio?: string, avatar?: string) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  refreshProfile: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useWallet();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      const existing = ProfileService.getProfile(address);
      if (existing) {
        setProfile(existing);
        setIsNewUser(false);
      } else {
        setProfile(null);
        setIsNewUser(true);
      }
    } else {
      setProfile(null);
      setIsNewUser(false);
    }
  }, [address, isConnected]);

  const createProfile = (username: string, bio: string = '', avatar?: string) => {
    if (!address) return;
    const newProfile = ProfileService.createProfile(address, username, bio, avatar);
    setProfile(newProfile);
    setIsNewUser(false);
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    if (!address) return;
    const updated = ProfileService.updateProfile(address, updates);
    if (updated) setProfile(updated);
  };

  const refreshProfile = () => {
    if (!address) return;
    const current = ProfileService.getProfile(address);
    setProfile(current);
  };

  return (
    <ProfileContext.Provider value={{ profile, isNewUser, createProfile, updateProfile, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within ProfileProvider');
  }
  return context;
}
