import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer, DarkCard, Heading } from '../components/Theme';
import { ArrowLeft, Bell, Check } from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <PageContainer>
      <div className="p-6 md:p-12 max-w-4xl mx-auto w-full space-y-8">
        <button
          onClick={() => navigate(-1)}
          className="text-white/40 hover:text-white text-xs tracking-[0.2em] uppercase inline-flex items-center gap-2 transition-colors cursor-pointer bg-transparent border-none font-medium mb-4"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div className="flex items-center justify-between">
          <Heading>Notifications</Heading>
          {notifications.some(n => !n.is_read) && (
            <button onClick={markAllAsRead} className="text-[10px] uppercase tracking-widest text-white/50 hover:text-white transition-colors flex items-center gap-2">
              <Check size={12} /> Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-white/50 text-sm font-light">Loading...</p>
        ) : notifications.length === 0 ? (
          <DarkCard className="text-center py-16 text-white/50 text-sm font-light uppercase tracking-widest">
            No notifications
          </DarkCard>
        ) : (
          <div className="space-y-4">
            {notifications.map(n => (
              <DarkCard key={n.id} hoverColor="hover:bg-white/[0.08]" className={`p-6 ${n.is_read ? 'opacity-70' : 'border-sky-500/30'}`}>
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className={`mt-1 ${n.is_read ? 'text-white/30' : 'text-sky-400'}`}>
                      <Bell size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">{n.title}</h4>
                      <p className="text-white/60 text-xs font-light mt-1">{n.message}</p>
                      <p className="text-white/30 text-[10px] uppercase tracking-widest mt-3">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  {!n.is_read && (
                    <button onClick={() => markAsRead(n.id)} className="text-white/40 hover:text-white transition-colors">
                      <Check size={16} />
                    </button>
                  )}
                </div>
              </DarkCard>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
