import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Card } from './Card';
import { Input } from './Input';
import { Skeleton } from './Skeleton';
import { UserAvatar } from './UserAvatar';
import { User, Clock, X, LogOut } from 'lucide-react';
import axios from 'axios';

interface UserInfo {
  id: number;
  name: string;
  email: string;
  photoUrl?: string;
  lightspeedEmployeeId?: string;
}

interface CachedUserInfo extends UserInfo {
  lastActive: string;
  loginTime: string;
}

interface SwitchUserModalProps {
  open: boolean;
  onClose: () => void;
  allUsers: UserInfo[];
  loading?: boolean;
  onUserSelect: (selectedUser: UserInfo) => void;
}

export const SwitchUserModal: React.FC<SwitchUserModalProps> = ({
  open,
  onClose,
  allUsers,
  loading,
  onUserSelect
}) => {
  const [search, setSearch] = useState('');
  const [cachedUsers, setCachedUsers] = useState<CachedUserInfo[]>([]);
  const [switching, setSwitching] = useState(false);
  const [switchMessage, setSwitchMessage] = useState('');
  const [loadingCached, setLoadingCached] = useState(false);
  const [activeUserId, setActiveUserId] = useState<number | null>(null);

  // Load cached users when modal opens
  useEffect(() => {
    if (open) {
      loadCachedUsers();
      setSwitching(false);
      setSwitchMessage('');
    }
  }, [open]);

  const loadCachedUsers = async () => {
    setLoadingCached(true);
    try {
      const response = await axios.get('http://localhost:3000/api/user-switch/cached-users', { withCredentials: true });
      if (response.data && (response.data as any).success) {
        setCachedUsers((response.data as any).users);
        setActiveUserId((response.data as any).activeUserId);
      }
    } catch (error) {
      console.error('Error loading cached users:', error);
    } finally {
      setLoadingCached(false);
    }
  };

  const filteredAllUsers = allUsers.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCachedUsers = cachedUsers.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleCachedUserClick = async (user: CachedUserInfo) => {
    if (user.id === activeUserId) {
      // Already active user, just close modal
      onClose();
      return;
    }

    setSwitching(true);
    setSwitchMessage('Switching user...');

    try {
      const response = await axios.post('http://localhost:3000/api/user-switch/switch-user', {
        userId: user.id
      }, { withCredentials: true });

      if ((response.data as any).success) {
        setSwitchMessage('Switch successful! Refreshing...');
        // Notify parent component and refresh page
        if (onUserSelect) {
          onUserSelect(user);
        }
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else if ((response.data as any).requiresAuth) {
        setSwitchMessage('Session expired. Redirecting to login...');
        setTimeout(() => {
          window.location.href = (response.data as any).authUrl || `/api/auth/start-lightspeed?email=${encodeURIComponent(user.email)}`;
        }, 1000);
      }
    } catch (error: any) {
      console.error('Error switching user:', error);
      setSwitchMessage('Failed to switch user. Please try again.');
      setTimeout(() => {
        setSwitching(false);
        setSwitchMessage('');
      }, 2000);
    }
  };

  const handleNewUserClick = async (user: UserInfo) => {
    setSwitching(true);
    setSwitchMessage('Redirecting to authentication...');

    // Redirect to Lightspeed OAuth for new authentication
    setTimeout(() => {
      window.location.href = `/api/auth/start-lightspeed?email=${encodeURIComponent(user.email)}`;
    }, 500);
  };

  const handleRemoveUser = async (user: CachedUserInfo, event: React.MouseEvent) => {
    event.stopPropagation();

    if (user.id === activeUserId) {
      alert('Cannot remove the currently active user');
      return;
    }

    try {
      await axios.delete(`http://localhost:3000/api/user-switch/cached-users/${user.id}`, { withCredentials: true });
      // Reload cached users
      await loadCachedUsers();
    } catch (error) {
      console.error('Error removing user:', error);
      alert('Failed to remove user from cache');
    }
  };

  const formatLastActive = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-2">Switch User</h2>
        <Input
          placeholder="Search users..."
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
        </div>
      ) : (
        <div className="space-y-6">
          {/* Cached Users Section */}
          {(loadingCached || filteredCachedUsers.length > 0) && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} className="text-green-600" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Quick Switch ({cachedUsers.length} cached)
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {loadingCached ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <Card key={i} className="flex items-center gap-3 p-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </Card>
                  ))
                ) : (
                  filteredCachedUsers.map(user => (
                    <Card
                      key={user.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/10 ${
                        user.id === activeUserId ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20' : ''
                      }`}
                      onClick={() => handleCachedUserClick(user)}
                    >
                      <UserAvatar
                        user={user}
                        size="md"
                        showName={false}
                        showEmail={false}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold truncate">{user.name}</span>
                          {user.id === activeUserId && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{user.email}</div>
                        <div className="text-xs text-gray-400">
                          Last active: {formatLastActive(user.lastActive)}
                        </div>
                      </div>
                      {user.id !== activeUserId && (
                        <button
                          onClick={(e) => handleRemoveUser(user, e)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          title="Remove from cache"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* All Users Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <User size={16} className="text-blue-600" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                All Users (requires authentication)
              </span>
            </div>
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </Card>
                ))
              ) : (
                filteredAllUsers
                  .filter(user => !cachedUsers.find(cached => cached.id === user.id))
                  .map(user => (
                    <Card
                      key={user.id}
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/10 opacity-75"
                      onClick={() => handleNewUserClick(user)}
                    >
                      <UserAvatar
                        user={user}
                        size="md"
                        showName={false}
                        showEmail={false}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{user.name}</div>
                        <div className="text-xs text-gray-500 truncate">{user.email}</div>
                        <div className="text-xs text-blue-500">Click to authenticate</div>
                      </div>
                      <LogOut size={16} className="text-gray-400" />
                    </Card>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};