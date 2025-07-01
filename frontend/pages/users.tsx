import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../src/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { UserAvatar } from '../components/ui/UserAvatar';
import { useToast } from '../components/ToastContext';
import { User, RefreshCw, Download } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { apiFetch } from '../lib/apiClient';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  photoUrl?: string;
  lightspeedEmployeeId?: string;
  createdAt: string;
  updatedAt: string;
}

interface UsersData {
  localUsers: User[];
  lightspeedUsers: any[];
}

export default function UsersPage() {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [users, setUsers] = useState<UsersData | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [onClose, setOnClose] = useState(() => () => {});
  const [error, setError] = useState<string | null>(null);

  // Fetch users function
  const fetchUsers = async () => {
    try {
      const response = await apiFetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
        console.log('Users page - Users data:', data);
      } else if (response.status === 401) {
        toastError('You must be logged in to view users.');
        setError('You must be logged in to view users.');
        window.location.href = '/login';
      } else if (response.status === 404) {
        toastError('User list is unavailable.');
        setError('User list is unavailable.');
      } else {
        toastError('Failed to fetch users');
        setError('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toastError('Error fetching users');
      setError('Error fetching users');
    } finally {
      setLoading(false);
    }
  };

  // Sync user photos function
  const syncUserPhotos = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/sync/user-photos', {
        method: 'POST',
        credentials: 'include'
      });
      if (response.ok) {
        toastSuccess('User photo sync started');
        // Refresh users after a delay
        setTimeout(() => {
          fetchUsers();
        }, 3000);
      } else {
        const errorData = await response.json();
        toastError(errorData.error || 'Failed to start user photo sync');
      }
    } catch (error) {
      console.error('Error syncing user photos:', error);
      toastError('Error syncing user photos');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (!user) {
    return (
      <Layout title="Users">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p>You must be logged in to access this page.</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Users">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-red-600">{error}</h1>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Users">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">User Management</h1>
          <div className="space-x-2">
            <Button onClick={fetchUsers} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={syncUserPhotos} disabled={syncing} size="sm">
              <Download className="w-4 h-4 mr-2" />
              {syncing ? 'Syncing Photos...' : 'Sync Photos'}
            </Button>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-8">Loading users...</div>
        ) : (
          <>
            {/* Current User Card */}
            <Card>
              <CardHeader>
                <CardTitle>Current User (You)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 p-4 border rounded-lg bg-blue-50">
                  <UserAvatar
                    user={user}
                    size="xl"
                    showName={false}
                    showEmail={false}
                  />
                  <div className="flex-1">
                    <div className="font-bold text-lg">{user.name}</div>
                    <div className="text-gray-600">{user.email}</div>
                    <div className="text-sm text-blue-600">
                      {user.photoUrl ? 'Photo loaded from Lightspeed' : 'No photo available'}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge>{user.role === 'admin' ? 'destructive' : 'secondary'}</Badge>
                    {user.photoUrl && (
                      <Badge className="text-green-600">✓ Photo</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* All Users */}
            {users && (
              <Card>
                <CardHeader>
                  <CardTitle>All Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Local Users */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Local Users ({users.localUsers.length})</h3>
                      <div className="grid gap-4">
                        {users.localUsers.map((userData) => (
                          <div key={userData.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                            <UserAvatar
                              user={userData}
                              size="lg"
                              showName={false}
                              showEmail={false}
                            />
                            <div className="flex-1">
                              <div className="font-medium">{userData.name}</div>
                              <div className="text-sm text-gray-500">{userData.email}</div>
                              {userData.lightspeedEmployeeId && (
                                <div className="text-xs text-blue-600">Lightspeed ID: {userData.lightspeedEmployeeId}</div>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge>{userData.role === 'admin' ? 'destructive' : 'secondary'}</Badge>
                              {userData.photoUrl && (
                                <Badge className="text-green-600">✓ Photo</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Lightspeed Users */}
                    {users.lightspeedUsers.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Lightspeed Users ({users.lightspeedUsers.length})</h3>
                        <div className="grid gap-4">
                          {users.lightspeedUsers.map((lsUser) => (
                            <div key={lsUser.id} className="flex items-center space-x-4 p-4 border rounded-lg bg-blue-50">
                              <UserAvatar
                                user={{
                                  id: lsUser.id,
                                  name: lsUser.display_name,
                                  email: lsUser.email,
                                  photoUrl: lsUser.photo
                                }}
                                size="lg"
                                showName={false}
                                showEmail={false}
                              />
                              <div className="flex-1">
                                <div className="font-medium">{lsUser.display_name}</div>
                                <div className="text-sm text-gray-500">{lsUser.email}</div>
                                <div className="text-xs text-blue-600">Lightspeed User (ID: {lsUser.id})</div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge>{lsUser.account_type}</Badge>
                                {lsUser.photo && (
                                  <Badge className="text-green-600">✓ Photo</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
} 