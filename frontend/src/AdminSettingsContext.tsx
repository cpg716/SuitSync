import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from '../components/ToastContext';
import { api } from '../lib/apiClient';

interface AdminSettings {
    podiumApiKey?: string;
    sendgridApiKey?: string;
    sendgridFrom?: string;
    apiBaseUrl?: string;
    syncFrequency?: number;
    reminderIntervals?: string;
    emailSubject?: string;
    emailBody?: string;
    smsBody?: string;
}

interface AdminSettingsContextType {
    settings: AdminSettings;
    loading: boolean;
    updateSetting: (key: keyof AdminSettings, value: any) => void;
    saveSettings: () => Promise<void>;
    refreshSettings: () => Promise<void>;
    unsavedChanges: boolean;
}

const defaultSettings: AdminSettings = {
    podiumApiKey: '',
    sendgridApiKey: '',
    sendgridFrom: '',
    apiBaseUrl: '',
    syncFrequency: 15,
    reminderIntervals: '24,4',
    emailSubject: '',
    emailBody: '',
    smsBody: '',
};

const AdminSettingsContext = createContext<AdminSettingsContextType>({
    settings: defaultSettings,
    loading: false,
    updateSetting: () => {},
    saveSettings: async () => {},
    refreshSettings: async () => {},
    unsavedChanges: false,
});

export const useAdminSettings = () => useContext(AdminSettingsContext);

export const AdminSettingsProvider = ({ children }: { children: ReactNode }) => {
    const { user, loading: authLoading } = useAuth();
    const [settings, setSettings] = useState<AdminSettings>(defaultSettings);
    const [original, setOriginal] = useState<AdminSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);
    const { success, error } = useToast();

    const fetchSettings = useCallback(async () => {
        if (!user || user.role !== 'admin') {
            setSettings(defaultSettings);
            setOriginal(defaultSettings);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const res = await api.get('/admin/settings');
            setSettings({ ...defaultSettings, ...(typeof res.data === 'object' && res.data !== null ? res.data : {}) });
            setOriginal({ ...defaultSettings, ...(typeof res.data === 'object' && res.data !== null ? res.data : {}) });
        } catch (err) {
            error(err.response?.data?.error || 'Failed to fetch settings');
        } finally {
            setLoading(false);
        }
    }, [user, error]);

    useEffect(() => {
        if (!authLoading) {
            fetchSettings();
        }
    }, [authLoading, fetchSettings]);

    const updateSetting = (key: keyof AdminSettings, value: any) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    const saveSettings = async () => {
        try {
            setLoading(true);
            const res = await api.post('/admin/settings', settings);
            setSettings({ ...defaultSettings, ...(typeof res.data === 'object' && res.data !== null ? res.data : {}) });
            setOriginal({ ...defaultSettings, ...(typeof res.data === 'object' && res.data !== null ? res.data : {}) });
            success('Settings saved!');
        } catch (err) {
            error(err.response?.data?.error || 'Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    const unsavedChanges = JSON.stringify(settings) !== JSON.stringify(original);

    return (
        <AdminSettingsContext.Provider value={{ settings, loading, updateSetting, saveSettings, refreshSettings: fetchSettings, unsavedChanges }}>
            {children}
        </AdminSettingsContext.Provider>
    );
};