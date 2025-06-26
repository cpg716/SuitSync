import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from '../components/ToastContext';
import { api } from '../lib/apiClient';

interface AdminSettings {
    reminderIntervals: string;
    emailSubject: string;
    emailBody: string;
    smsBody: string;
}

const AdminSettingsContext = createContext({
    settings: null as AdminSettings | null,
    loading: false,
    updateSettings: async (newSettings: Partial<AdminSettings>) => {},
});

export const useAdminSettings = () => useContext(AdminSettingsContext);

export const AdminSettingsProvider = ({ children }: { children: ReactNode }) => {
    const { user, loading: authLoading } = useAuth();
    const [settings, setSettings] = useState<AdminSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const { success, error } = useToast();

    const fetchSettings = useCallback(async () => {
        if (user?.role !== 'admin') {
            setSettings(null);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const res = await api.get('/admin/settings');
            setSettings(res.data);
        } catch (err) {
            if (err.response?.status !== 403) {
                error(err.response?.data?.error || 'Failed to fetch settings');
            }
        } finally {
            setLoading(false);
        }
    }, [user, error]);

    useEffect(() => {
        if (!authLoading) {
            fetchSettings();
        }
    }, [authLoading, fetchSettings]);

    const updateSettings = async (newSettings: Partial<AdminSettings>) => {
        if (user?.role !== 'admin') {
            error("You don't have permission to update settings.");
            return;
        }
        try {
            const res = await api.post('/admin/settings', newSettings);
            setSettings(res.data);
            success('Settings saved!');
        } catch (err) {
            error(err.response?.data?.error || 'Failed to save settings');
        }
    };

    return (
        <AdminSettingsContext.Provider value={{ settings, loading, updateSettings }}>
            {children}
        </AdminSettingsContext.Provider>
    );
};