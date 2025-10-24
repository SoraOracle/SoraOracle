import React, { useState, useEffect } from 'react';
import { useProfile } from '../contexts/ProfileContext';
import './ProfileModal.css';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { profile, isNewUser, createProfile, updateProfile } = useProfile();
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (isOpen && profile) {
      setUsername(profile.username || '');
      setBio(profile.bio || '');
    } else if (isOpen && isNewUser) {
      setUsername('');
      setBio('');
    }
  }, [isOpen, profile, isNewUser]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNewUser) {
      createProfile(username, bio);
    } else {
      updateProfile({ username, bio });
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content profile-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isNewUser ? 'Create Your Profile' : 'Edit Profile'}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Your username"
              required
              maxLength={30}
            />
          </div>

          <div className="form-group">
            <label>Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              maxLength={200}
              rows={4}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {isNewUser ? 'Create Profile' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
