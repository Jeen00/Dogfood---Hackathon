import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer, DarkCard, WhiteCard, Heading, Label, Input, PrimaryButton, SecondaryButton } from '../components/Theme';
import { ArrowLeft, Trash, Send } from 'lucide-react';

export default function OrganizerInvitesPage() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [invites, setInvites] = useState([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/organizer/events')
      .then(res => res.json())
      .then(data => {
        setEvents(data.events || []);
        if (data.events?.length > 0) {
          setSelectedEventId(data.events[0].id);
        }
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load events');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedEventId) fetchInvites(selectedEventId);
  }, [selectedEventId]);

  const fetchInvites = async (eventId) => {
    try {
      const res = await fetch(`/api/invites?event_id=${eventId}`);
      const data = await res.json();
      if (res.ok) setInvites(data.invites || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, event_id: selectedEventId })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message || 'Invite sent!');
        setEmail('');
        fetchInvites(selectedEventId);
      } else {
        setError(data.error || 'Failed to send invite');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  const handleCancelInvite = async (id) => {
    try {
      const res = await fetch(`/api/invites/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setInvites(invites.filter(i => i.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to cancel invite');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  return (
    <PageContainer>
      <div className="p-6 md:p-12 max-w-5xl mx-auto w-full space-y-8">
        <button
          onClick={() => navigate('/organizer/dashboard')}
          className="text-white/40 hover:text-white text-xs tracking-[0.2em] uppercase inline-flex items-center gap-2 transition-colors cursor-pointer bg-transparent border-none font-medium mb-4"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>

        <Heading>Judge Invites</Heading>

        {loading ? (
          <p className="text-white/50 text-sm font-light">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <WhiteCard className="col-span-1 flex flex-col space-y-6">
              <h3 className="text-xl font-medium tracking-wide">Invite a Judge</h3>
              <form onSubmit={handleSendInvite} className="space-y-4">
                <div className="flex flex-col gap-1.5 text-black">
                  <label className="text-[11px] font-medium text-black/70 tracking-[0.15em] uppercase">Select Event</label>
                  <select 
                    value={selectedEventId} 
                    onChange={e => setSelectedEventId(e.target.value)}
                    className="w-full bg-black/[0.05] border border-black/10 rounded-[20px] h-12 px-4 text-black focus:outline-none"
                  >
                    {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 text-black">
                  <label className="text-[11px] font-medium text-black/70 tracking-[0.15em] uppercase">Judge Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="judge@example.com"
                    className="w-full bg-black/[0.05] border border-black/10 rounded-[20px] h-12 px-4 text-black placeholder:text-black/35 focus:outline-none"
                  />
                </div>
                {error && <p className="text-xs font-light text-red-500">{error}</p>}
                {success && <p className="text-xs font-light text-emerald-600">{success}</p>}
                <button 
                  type="submit" 
                  className="w-full py-3.5 bg-black text-white font-medium tracking-[0.15em] uppercase text-xs rounded-full hover:bg-black/80 transition-all cursor-pointer mt-4"
                >
                  Send Invite
                </button>
              </form>
            </WhiteCard>

            <DarkCard className="col-span-2 space-y-6" hoverColor="">
              <h3 className="text-xl font-medium tracking-wide">Pending & Accepted Invites</h3>
              <div className="space-y-4">
                {invites.length === 0 ? (
                  <p className="text-white/40 text-sm font-light text-center py-12 border border-white/10 rounded-2xl">No invites sent for this event.</p>
                ) : (
                  invites.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/10 rounded-2xl">
                      <div>
                        <div className="text-sm font-medium">{inv.judge_email}</div>
                        <div className="text-[10px] text-white/50 uppercase tracking-widest mt-1">
                          Status: <span className={inv.status === 'accepted' ? 'text-emerald-400' : inv.status === 'rejected' ? 'text-red-400' : 'text-amber-400'}>{inv.status}</span>
                        </div>
                      </div>
                      {inv.status === 'pending' && (
                        <button onClick={() => handleCancelInvite(inv.id)} className="text-red-400 hover:bg-red-400/10 p-2 rounded-full transition-colors">
                          <Trash size={16} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </DarkCard>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
