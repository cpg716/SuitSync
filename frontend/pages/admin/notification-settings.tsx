import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Textarea } from '../../components/ui/Textarea';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { useToast } from '../../components/ToastContext';
import { useAuth } from '../../src/AuthContext';
import { Bell, Mail, MessageSquare, Clock, Settings, Save, RotateCcw } from 'lucide-react';
import { api } from '../../lib/apiClient';

interface NotificationSettings {
  id: number;
  reminderIntervals: string;
  earlyMorningCutoff: string;
  emailSubject: string;
  emailBody: string;
  smsBody: string;
  pickupReadySubject: string;
  pickupReadyEmail: string;
  pickupReadySms: string;
}

export default function NotificationSettings() {
  const router = useRouter();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('reminders');

  // Check admin access
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Load settings
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/notification-settings');
      setSettings(response.data);
    } catch (error: any) {
      toastError('Failed to load notification settings');
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      await api.put('/api/admin/notification-settings', settings);
      success('Notification settings saved successfully');
    } catch (error: any) {
      toastError('Failed to save notification settings');
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset to default settings? This will lose all customizations.')) {
      setSettings({
        id: 1,
        reminderIntervals: '24,3',
        earlyMorningCutoff: '09:30',
        emailSubject: 'Reminder: Your appointment at {shopName}',
        emailBody: 'Hi {customerName},\n\nThis is a reminder for your appointment with {partyName} on {dateTime}.\n\nThank you!',
        smsBody: 'Reminder: {partyName} appointment on {dateTime} at {shopName}.',
        pickupReadySubject: 'Your garment is ready for pickup!',
        pickupReadyEmail: 'Hi {customerName},\n\nYour garment for {partyName} is ready for pickup!\n\nPlease visit us at your earliest convenience.',
        pickupReadySms: 'Your garment for {partyName} is ready for pickup at {shopName}!'
      });
    }
  };

  const updateSettings = (field: keyof NotificationSettings, value: string) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!settings) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <Card className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Settings Not Found</h2>
            <p className="text-gray-600 mb-4">Unable to load notification settings.</p>
            <Button onClick={loadSettings}>Retry</Button>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-4 sm:py-6 max-w-4xl">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Settings className="h-6 w-6 sm:h-8 sm:w-8" />
            <span className="hidden sm:inline">Notification Settings</span>
            <span className="sm:hidden">Notifications</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">
            Configure appointment reminders, message templates, and notification timing
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="reminders" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Reminder Timing</span>
              <span className="sm:hidden">Timing</span>
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Email Templates</span>
              <span className="sm:hidden">Email</span>
            </TabsTrigger>
            <TabsTrigger value="sms" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">SMS Templates</span>
              <span className="sm:hidden">SMS</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reminders" className="mt-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Reminder Timing Configuration</h3>
              
              <div className="space-y-6">
                <div>
                  <Label htmlFor="reminderIntervals">Reminder Intervals (hours before appointment)</Label>
                  <Input
                    id="reminderIntervals"
                    value={settings.reminderIntervals}
                    onChange={(e) => updateSettings('reminderIntervals', e.target.value)}
                    placeholder="24,3"
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Comma-separated list of hours before appointment to send reminders (e.g., "24,3" for 24 hours and 3 hours before)
                  </p>
                </div>

                <div>
                  <Label htmlFor="earlyMorningCutoff">Early Morning Cutoff Time</Label>
                  <Input
                    id="earlyMorningCutoff"
                    type="time"
                    value={settings.earlyMorningCutoff}
                    onChange={(e) => updateSettings('earlyMorningCutoff', e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    For appointments before this time, send 1-hour reminder instead of 3-hour reminder
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Current Configuration</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">24h before</Badge>
                      <span>First reminder sent</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">3h before</Badge>
                      <span>Second reminder sent (or 1h for appointments before {settings.earlyMorningCutoff})</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="email" className="mt-6">
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Appointment Reminder Email</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="emailSubject">Email Subject</Label>
                    <Input
                      id="emailSubject"
                      value={settings.emailSubject}
                      onChange={(e) => updateSettings('emailSubject', e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="emailBody">Email Body</Label>
                    <Textarea
                      id="emailBody"
                      value={settings.emailBody}
                      onChange={(e) => updateSettings('emailBody', e.target.value)}
                      rows={6}
                      className="mt-1"
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Pickup Ready Email</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="pickupReadySubject">Email Subject</Label>
                    <Input
                      id="pickupReadySubject"
                      value={settings.pickupReadySubject}
                      onChange={(e) => updateSettings('pickupReadySubject', e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="pickupReadyEmail">Email Body</Label>
                    <Textarea
                      id="pickupReadyEmail"
                      value={settings.pickupReadyEmail}
                      onChange={(e) => updateSettings('pickupReadyEmail', e.target.value)}
                      rows={6}
                      className="mt-1"
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-gray-50 dark:bg-gray-800">
                <h4 className="font-medium mb-2">Available Placeholders</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Badge variant="outline">{'{customerName}'}</Badge>
                  <Badge variant="outline">{'{partyName}'}</Badge>
                  <Badge variant="outline">{'{dateTime}'}</Badge>
                  <Badge variant="outline">{'{shopName}'}</Badge>
                  <Badge variant="outline">{'{appointmentType}'}</Badge>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sms" className="mt-6">
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Appointment Reminder SMS</h3>
                
                <div>
                  <Label htmlFor="smsBody">SMS Message</Label>
                  <Textarea
                    id="smsBody"
                    value={settings.smsBody}
                    onChange={(e) => updateSettings('smsBody', e.target.value)}
                    rows={3}
                    className="mt-1"
                    maxLength={160}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Keep SMS messages under 160 characters for best delivery rates
                  </p>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Pickup Ready SMS</h3>
                
                <div>
                  <Label htmlFor="pickupReadySms">SMS Message</Label>
                  <Textarea
                    id="pickupReadySms"
                    value={settings.pickupReadySms}
                    onChange={(e) => updateSettings('pickupReadySms', e.target.value)}
                    rows={3}
                    className="mt-1"
                    maxLength={160}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Keep SMS messages under 160 characters for best delivery rates
                  </p>
                </div>
              </Card>

              <Card className="p-4 bg-gray-50 dark:bg-gray-800">
                <h4 className="font-medium mb-2">Available Placeholders</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Badge variant="outline">{'{customerName}'}</Badge>
                  <Badge variant="outline">{'{partyName}'}</Badge>
                  <Badge variant="outline">{'{dateTime}'}</Badge>
                  <Badge variant="outline">{'{shopName}'}</Badge>
                  <Badge variant="outline">{'{appointmentType}'}</Badge>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex items-center justify-center gap-2 order-2 sm:order-1"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Reset to Defaults</span>
            <span className="sm:hidden">Reset</span>
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center gap-2 min-w-[120px] order-1 sm:order-2"
          >
            {saving ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                <span className="hidden sm:inline">Saving...</span>
                <span className="sm:hidden">Saving</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">Save Settings</span>
                <span className="sm:hidden">Save</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
