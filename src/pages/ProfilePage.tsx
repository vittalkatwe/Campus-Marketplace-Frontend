import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export const ProfilePage = () => {
  const { token } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) return;
      try {
        const response = await api.getProfile(token);
        console.log(response);
        setProfile(response.data);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }
    };
    fetchProfile();
  }, [token]);

  if (!profile) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Profile</h1>
      <img
        src={profile.profilePicUrl || '/default-avatar.png'}
        alt="Profile"
        className="w-24 h-24 rounded-full mb-4"
      />
      <p><strong>Email:</strong> {profile.email}</p>
      <p><strong>Bio:</strong> {profile.bio || 'No bio set'}</p>
      <p><strong>Account Verified:</strong> {profile.verifiedAt ? 'Yes' : 'No'}</p>
      <p><strong>Enabled:</strong> {profile.enabled ? 'Yes' : 'No'}</p>
      <p><strong>Last Login:</strong> {profile.lastLoginAt || 'Never'}</p>
      <p><strong>Created At:</strong> {profile.createdAt || 'Unknown'}</p>
    </div>
  );
};
