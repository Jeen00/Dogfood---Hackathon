import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageContainer, DarkCard, Heading, Input, Label, PrimaryButton, SecondaryButton } from '../components/Theme';
import { ArrowLeft } from 'lucide-react';

export default function TeamJoinPage() {
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!code) {
      setError('Please enter an invite code.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/teams/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Successfully joined team: ${data.team_name}`);
        setTimeout(() => navigate('/participant/dashboard'), 2000);
      } else {
        setError(data.error || 'Failed to join team.');
      }
    } catch (err) {
      setError('Network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <DarkCard className="w-full max-w-md space-y-6">
          <button
            onClick={() => navigate('/participant/dashboard')}
            className="text-white/40 hover:text-white text-xs tracking-[0.2em] uppercase inline-flex items-center gap-2 transition-colors cursor-pointer bg-transparent border-none font-medium mb-2"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          
          <div>
            <Heading>Join Team</Heading>
            <p className="text-white/60 text-sm font-light mt-2">
              Enter a team invite code to join your teammates.
            </p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label>Invite Code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. T-XYZ123"
              />
            </div>
            {error && <p className="text-xs font-light text-red-400">{error}</p>}
            {success && <p className="text-xs font-light text-emerald-400">{success}</p>}
            <PrimaryButton type="submit" disabled={loading}>
              {loading ? 'Joining...' : 'Join Team'}
            </PrimaryButton>
          </form>
        </DarkCard>
      </div>
    </PageContainer>
  );
}
