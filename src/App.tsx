import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Verify } from './pages/Verify';
import { Communities } from './pages/Communities';
import { DirectMessages } from './pages/DirectMessages';
import { Layout } from './components/Layout';
import { Profile } from './pages/Profile';

type AuthScreen = 'login' | 'register' | 'verify';

function AuthFlow() {
  const { isAuthenticated } = useAuth();
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  const [verifyEmail, setVerifyEmail] = useState('');

  const handleRegisterSuccess = (email: string) => {
    setVerifyEmail(email);
    setAuthScreen('verify');
  };

  const handleVerifySuccess = () => {
    setAuthScreen('login');
  };

  if (isAuthenticated) {
    return <MainApp />;
  }

  switch (authScreen) {
    case 'register':
      return (
        <Register
          onSuccess={handleRegisterSuccess}
          onSwitchToLogin={() => setAuthScreen('login')}
        />
      );
    case 'verify':
      return (
        <Verify
          email={verifyEmail}
          onSuccess={handleVerifySuccess}
        />
      );
    default:
      return (
        <Login
          onSwitchToRegister={() => setAuthScreen('register')}
        />
      );
  }
}

function MainApp() {
  const [activeTab, setActiveTab] = useState<'communities' | 'messages' | 'profile'>('communities');

  return (
    <WebSocketProvider>
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === 'communities' && <Communities />}
        {activeTab === 'messages' && <DirectMessages />}
        {activeTab === 'profile' && <Profile />}
      </Layout>
    </WebSocketProvider>
  );
}


function App() {
  return (
    <AuthProvider>
      <AuthFlow />
    </AuthProvider>
  );
}

export default App;
