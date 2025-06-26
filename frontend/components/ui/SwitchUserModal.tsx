import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Card } from './Card';
import { Input } from './Input';
import { Skeleton } from './Skeleton';
import { User } from 'lucide-react';
import axios from 'axios';

interface UserInfo {
  id: number;
  name: string;
  email: string;
  photoUrl?: string;
  lightspeedEmployeeId?: string;
}

interface SwitchUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  allUsers: UserInfo[];
  loading?: boolean;
}

export const SwitchUserModal: React.FC<SwitchUserModalProps> = ({ isOpen, onClose, allUsers, loading }) => {
  const [search, setSearch] = useState('');
  const [recentUsers, setRecentUsers] = useState<UserInfo[]>([]);
  const [switching, setSwitching] = useState(false);
  const [switchMessage, setSwitchMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Load recent users from localStorage
      const stored = localStorage.getItem('recentUsers');
      if (stored) {
        try {
          setRecentUsers(JSON.parse(stored));
        } catch {
          setRecentUsers([]);
        }
      } else {
        setRecentUsers([]);
      }
      setSwitching(false);
      setSwitchMessage('');
    }
  }, [isOpen]);

  const filteredAllUsers = allUsers.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleUserClick = async (user: UserInfo) => {
    setSwitching(true);
    setSwitchMessage('Preparing to switch user...');
    try {
      // Try to call backend to delete sessions if admin and user has lightspeedEmployeeId
      if (user.lightspeedEmployeeId) {
        setSwitchMessage('Logging out user from all Lightspeed sessions...');
        await axios.delete(`/api/ls/users/${user.lightspeedEmployeeId}/sessions`);
        setSwitchMessage('All sessions cleared. Redirecting to login...');
        setTimeout(() => {
          window.location.href = `/api/auth/start-lightspeed?email=${encodeURIComponent(user.email)}`;
        }, 1000);
        return;
      }
    } catch (err) {
      // If not admin or API fails, fallback to logout URL
      setSwitchMessage('Could not clear sessions via API. Logging out from Lightspeed in a new tab...');
      window.open(`https://${process.env.NEXT_PUBLIC_LS_DOMAIN}.retail.lightspeed.app/logout`, '_blank');
      setSwitchMessage('Please complete logout in the new tab, then return here and click Continue.');
      // Show a Continue button
      return;
    }
    // Fallback: open logout URL and show instructions
    setSwitchMessage('Logging out from Lightspeed in a new tab...');
    window.open(`https://${process.env.NEXT_PUBLIC_LS_DOMAIN}.retail.lightspeed.app/logout`, '_blank');
    setSwitchMessage('Please complete logout in the new tab, then return here and click Continue.');
  };

  const handleContinue = (user: UserInfo) => {
    window.location.href = `/api/auth/start-lightspeed?email=${encodeURIComponent(user.email)}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-2">Switch to a different user</h2>
        <Input
          placeholder="Enter name of user"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-4"
          disabled={switching}
        />
      </div>
      {switching ? (
        <div className="flex flex-col items-center gap-4 py-8">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="text-center text-gray-700 dark:text-gray-200 font-semibold">{switchMessage}</div>
          {switchMessage.includes('Continue') && (
            <button
              className="mt-4 px-6 py-2 bg-accent text-white rounded-lg font-bold shadow"
              onClick={() => handleContinue(filteredAllUsers[0])}
            >
              Continue
            </button>
          )}
        </div>
      ) : (
        <>
          {recentUsers.length > 0 && (
            <div className="mb-6">
              <div className="text-xs text-gray-500 mb-2 font-semibold">Recent users</div>
              <div className="flex flex-col gap-2">
                {recentUsers.map(user => (
                  <Card key={user.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/10" onClick={() => handleUserClick(user)}>
                    {user.photoUrl ? (
                      <img src={user.photoUrl} alt={user.name} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <User size={20} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{user.name}</div>
                      <div className="text-xs text-gray-500 truncate">{user.email}</div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
          <div>
            <div className="text-xs text-gray-500 mb-2 font-semibold">All users</div>
            <div className="flex flex-col gap-2">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))
              ) : (
                filteredAllUsers.map(user => (
                  <Card key={user.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/10" onClick={() => handleUserClick(user)}>
                    {user.photoUrl ? (
                      <img src={user.photoUrl} alt={user.name} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <User size={20} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{user.name}</div>
                      <div className="text-xs text-gray-500 truncate">{user.email}</div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}; 