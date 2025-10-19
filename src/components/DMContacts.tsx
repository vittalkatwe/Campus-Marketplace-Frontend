import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

interface DMContactsProps {
  onSelectUser: (email: string) => void;
}

export const DMContacts = ({ onSelectUser }: DMContactsProps) => {
  const { token } = useAuth();
  const [contacts, setContacts] = useState<{ id: string; email: string }[]>([]);

  useEffect(() => {
    if (!token) return;

    const fetchContacts = async () => {
      try {
        const users = await api.getDMContacts(token);
        setContacts(users);
      } catch (err) {
        console.error('Failed to fetch contacts:', err);
      }
    };

    fetchContacts();
  }, [token]);

  return (
    <div>
      {contacts.map((user) => (
        <div
          key={user.id} // stable unique key
          className="p-2 hover:bg-slate-100 cursor-pointer"
          onClick={() => onSelectUser(user.email)}
        >
          {user.email}
        </div>
      ))}
    </div>
  );
};
