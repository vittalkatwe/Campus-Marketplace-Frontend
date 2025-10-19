import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";

interface UserProfile {
  id: number;
  email: string;
  bio?: string;
  profilePicUrl?: string;
  createdAt?: string;
  verifiedAt?: string;
  lastLoginAt?: string;
}

export const Profile = () => {
  const { token } = useAuth();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await api.getProfile(token!);
        setUser(data);
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchProfile();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-600">
        Loading profile...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full text-slate-600">
        No profile data available.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start p-6 overflow-auto">
      <div className="bg-white shadow-md rounded-2xl p-6 w-full max-w-lg text-center">
        <img
          src={user.profilePicUrl}
          alt="Profile"
          className="w-32 h-32 rounded-full mx-auto mb-4 object-cover border-4 border-blue-100"
        />
        <h2 className="text-xl font-semibold text-slate-800">{user.email}</h2>
        {user.bio && <p className="text-slate-600 mt-2">{user.bio}</p>}

        <div className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-600 space-y-2">
          {user.createdAt && (
            <p>
              <strong>Joined:</strong>{" "}
              {new Date(user.createdAt).toLocaleDateString()}
            </p>
          )}
          {user.verifiedAt && (
            <p>
              <strong>Verified:</strong>{" "}
              {new Date(user.verifiedAt).toLocaleDateString()}
            </p>
          )}
          {user.lastLoginAt && (
            <p>
              <strong>Last Login:</strong>{" "}
              {new Date(user.lastLoginAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
