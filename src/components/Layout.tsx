import { useState, ReactNode } from 'react';
import { Users, MessageSquare, User, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: ReactNode;
  activeTab: 'communities' | 'messages' | 'profile';
  onTabChange: (tab: 'communities' | 'messages' | 'profile') => void;
}

export const Layout = ({ children, activeTab, onTabChange }: LayoutProps) => {
  const { userEmail, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Campus Marketplace</h1>
              <p className="text-xs text-slate-600">{userEmail}</p>
            </div>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition"
          >
            {mobileMenuOpen ? <X className="w-6 h-6 text-slate-700" /> : <Menu className="w-6 h-6 text-slate-700" />}
          </button>

          <button
            onClick={handleLogout}
            className="hidden lg:flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-4 pt-4 border-t border-slate-200 flex flex-col space-y-1">
            <button
              onClick={() => {
                onTabChange('communities');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'communities' ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Users className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">Communities</span>
            </button>

            <button
              onClick={() => {
                onTabChange('messages');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'messages' ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <MessageSquare className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">Messages</span>
            </button>

            <button
              onClick={() => {
                onTabChange('profile');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'profile' ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <User className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">Profile</span>
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </header>

      {/* Sidebar + Main */}
      <div className="flex-1 flex overflow-hidden">
        <nav className="w-20 lg:w-64 bg-white border-r border-slate-200 flex flex-col">
          <div className="flex-1 p-2 space-y-1">
            {/* Communities */}
            <button
              onClick={() => onTabChange('communities')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'communities' ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Users className="w-5 h-5 flex-shrink-0" />
              <span className="hidden lg:block font-medium">Communities</span>
            </button>

            {/* Messages */}
            <button
              onClick={() => onTabChange('messages')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'messages' ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <MessageSquare className="w-5 h-5 flex-shrink-0" />
              <span className="hidden lg:block font-medium">Messages</span>
            </button>

            {/* Profile */}
            <button
              onClick={() => onTabChange('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'profile' ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <User className="w-5 h-5 flex-shrink-0" />
              <span className="hidden lg:block font-medium">Profile</span>
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
};
