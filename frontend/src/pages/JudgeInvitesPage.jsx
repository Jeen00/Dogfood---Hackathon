import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer, DarkCard, WhiteCard, Heading, PrimaryButton, SecondaryButton } from '../components/Theme';
import { ArrowLeft, Check, X } from 'lucide-react';

export default function JudgeInvitesPage() {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchInvites();
  }, []);

  const fetchInvites = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/judge-invites');
      const data = await res.json();
      if (res.ok) {
        setInvites(data.invites || []);
      } else {
        setError(data.error || 'Failed to load invites.');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    try {
      const res = await fetch(`/invites/judge-invites/${id}/${action}`, { method: 'POST' });
      if (res.ok) {
        setInvites(invites.filter(inv => inv.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || `Failed to ${action} invite`);
      }
    } catch (err) {
      alert('Network error');
    }
  };

  return (
    <PageContainer>
      <div className="p-6 md:p-12 max-w-5xl mx-auto w-full space-y-8">
        <button
          onClick={() => navigate('/judge/dashboard')}
          className="text-white/40 hover:text-white text-xs tracking-[0.2em] uppercase inline-flex items-center gap-2 transition-colors cursor-pointer bg-transparent border-none font-medium mb-4"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>

        <Heading>Your Event Invites</Heading>
        
        {loading ? (
          <p className="text-white/50 text-sm font-light">Loading invites...</p>
        ) : error ? (
          <p className="text-red-400 text-sm font-light">{error}</p>
        ) : invites.length === 0 ? (
          <WhiteCard className="text-center py-16">
            <p className="text-black/50 text-sm font-medium uppercase tracking-widest">No pending invites.</p>
          </WhiteCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {invites.map((invite, index) => (
              <DarkCard key={invite.id} hoverColor="hover:bg-sky-900/60" hoverGlow={true} className="flex flex-col">
                <div className="flex-1 space-y-2 mb-6">
                  <div className="text-[10px] font-bold tracking-[0.2em] text-sky-400 uppercase">Event Invite</div>
                  <h3 className="text-xl font-medium tracking-wide">{invite.event_name}</h3>
                  <p className="text-white/60 text-sm font-light">You have been invited to judge tracks for this event.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <SecondaryButton onClick={() => handleAction(invite.id, 'reject')} className="!text-red-400 hover:!text-red-300">
                    <X size={14} /> Decline
                  </SecondaryButton>
                  <PrimaryButton onClick={() => handleAction(invite.id, 'accept')}>
                    <Check size={14} /> Accept
                  </PrimaryButton>
                </div>
              </DarkCard>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
