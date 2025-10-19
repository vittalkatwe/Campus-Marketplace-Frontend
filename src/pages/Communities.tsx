import { useState, useEffect } from 'react';
import { Users, Loader2 } from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Community } from '../types';
import { CommunityChat } from '../components/CommunityChat';

export const Communities = () => {
  const { token } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);

  useEffect(() => {
    const fetchCommunities = async () => {
      if (!token) return;

      try {
        const data = await api.getCommunities(token);
        setCommunities(data);
      } catch (error) {
        console.error('Failed to fetch communities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCommunities();
  }, [token]);

  if (selectedCommunity) {
    return (
      <CommunityChat
        community={selectedCommunity}
        onBack={() => setSelectedCommunity(null)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-slate-200 p-6">
        <h1 className="text-2xl font-bold text-slate-900">Communities</h1>
        <p className="text-slate-600 mt-1">Join conversations with your campus</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : communities.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No communities available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {communities.map((community) => (
              <button
                key={community.id}
                onClick={() => setSelectedCommunity(community)}
                className="bg-white border border-slate-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-lg transition text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 mb-1 truncate">
                      {community.name}
                    </h3>
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {community.description}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      Created {new Date(community.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
