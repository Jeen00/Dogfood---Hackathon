import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MapPin, EnvelopeSimple, Clock, ChatCircle, Question } from '@phosphor-icons/react';
import PageLayout from '../components/PageLayout';
import { Heading, Subheading, PrimaryButton, Input, Label } from '../components/Theme';
import { useNavigate } from 'react-router-dom';

export default function ContactPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState({ loading: false, error: null, success: false });

  const fadeIn = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-100px" },
    transition: { duration: 0.8, ease: "easeOut" }
  };

  const cardStyle = "p-8 rounded-2xl bg-black/60 backdrop-blur-2xl border border-white/20 shadow-2xl transition-all duration-500 hover:bg-[var(--card-hover-bg)] hover:border-white/40";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: null, success: false });

    if (!formData.name || !formData.email || !formData.message) {
      setStatus({ loading: false, error: 'Please fill in all required fields.', success: false });
      return;
    }

    if (!formData.email.includes('@') || formData.email.length < 5) {
      setStatus({ loading: false, error: 'Please enter a valid email address.', success: false });
      return;
    }

    if (formData.message.length < 10) {
      setStatus({ loading: false, error: 'Message must be at least 10 characters long.', success: false });
      return;
    }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ loading: false, error: null, success: true });
        setFormData({ name: '', email: '', subject: '', message: '' });
        // Hide success pill after 5s
        setTimeout(() => setStatus(s => ({ ...s, success: false })), 5000);
      } else {
        setStatus({ loading: false, error: data.error || 'Failed to send message.', success: false });
      }
    } catch (err) {
      setStatus({ loading: false, error: 'Network error. Please try again.', success: false });
    }
  };

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto px-6 py-12 space-y-24 mb-32 w-full">
        
        {/* Hero */}
        <motion.section {...fadeIn} className="text-center max-w-3xl mx-auto space-y-6 pt-12">
          <Heading className="!text-5xl lg:!text-7xl font-bold">Contact Us</Heading>
          <p className="text-xl text-white/70 font-light leading-relaxed">
            Have questions about hosting an event or participating? We are here to help. Drop us a line.
          </p>
        </motion.section>

        {/* Success/Error Notifications */}
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 pointer-events-none">
          {status.success && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="p-4 rounded-full bg-emerald-500/20 border border-emerald-500/50 backdrop-blur-md text-emerald-100 text-center text-sm font-medium shadow-lg flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Message sent successfully! We'll be in touch.
            </motion.div>
          )}
          {status.error && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="p-4 rounded-full bg-red-500/20 border border-red-500/50 backdrop-blur-md text-red-100 text-center text-sm font-medium shadow-lg flex items-center justify-center gap-2 mt-4">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              {status.error}
            </motion.div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Contact Form */}
          <motion.section {...fadeIn} className={`${cardStyle} h-fit`} style={{ '--card-hover-bg': 'rgba(255,255,255,0.02)' }}>
            <Subheading className="mb-8 text-xl">Send a Message</Subheading>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Your Name *</Label>
                  <Input 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Address *</Label>
                  <Input 
                    type="email" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                    placeholder="jane@example.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input 
                  type="text" 
                  value={formData.subject} 
                  onChange={e => setFormData({...formData, subject: e.target.value})} 
                  placeholder="How can we help?"
                />
              </div>
              <div className="space-y-2 flex flex-col">
                <Label>Message *</Label>
                <textarea 
                  value={formData.message} 
                  onChange={e => setFormData({...formData, message: e.target.value})} 
                  placeholder="Write your message here..."
                  className="w-full bg-white/[0.08] backdrop-blur-xl border border-white/15 rounded-md p-4 text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-white/40 focus:border-white/40 focus:bg-white/[0.14] transition-all text-sm font-light tracking-wide shadow-inner min-h-[150px] resize-y"
                />
              </div>
              <PrimaryButton type="submit" disabled={status.loading} className="mt-4">
                {status.loading ? 'Sending...' : 'Send Message'}
              </PrimaryButton>
            </form>
          </motion.section>

          {/* Info Side */}
          <div className="space-y-8">
            <motion.section {...fadeIn} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className={cardStyle} style={{ '--card-hover-bg': 'rgba(255,255,255,0.05)' }}>
                <EnvelopeSimple size={32} className="text-sky-400 mb-4" />
                <h3 className="text-lg font-semibold tracking-wider mb-1">Email Us</h3>
                <p className="text-white/50 font-light text-sm">hello@dogfoodhq.com</p>
                <p className="text-white/50 font-light text-sm">support@dogfoodhq.com</p>
              </div>
              
              <div className={cardStyle} style={{ '--card-hover-bg': 'rgba(255,255,255,0.05)' }}>
                <Clock size={32} className="text-emerald-400 mb-4" />
                <h3 className="text-lg font-semibold tracking-wider mb-1">Working Hours</h3>
                <p className="text-white/50 font-light text-sm">Monday - Friday</p>
                <p className="text-white/50 font-light text-sm">9:00 AM - 6:00 PM (PST)</p>
              </div>

              <div className={`${cardStyle} sm:col-span-2 relative overflow-hidden`} style={{ '--card-hover-bg': 'rgba(255,255,255,0.05)' }}>
                <div className="relative z-10 flex items-start gap-4">
                  <MapPin size={32} className="text-fuchsia-400 shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold tracking-wider mb-1">Headquarters</h3>
                    <p className="text-white/50 font-light text-sm">123 Innovation Drive</p>
                    <p className="text-white/50 font-light text-sm">San Francisco, CA 94105</p>
                  </div>
                </div>
                {/* Map placeholder pattern */}
                <div className="absolute top-0 right-0 bottom-0 w-1/2 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
              </div>
            </motion.section>

            {/* FAQ Preview */}
            <motion.section {...fadeIn} className={`${cardStyle} flex items-center justify-between cursor-pointer group`} style={{ '--card-hover-bg': 'rgba(255,255,255,0.05)' }} onClick={() => navigate('/faq')}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                  <Question size={24} className="text-white/70" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold tracking-wider group-hover:text-white transition-colors">Check the FAQ</h3>
                  <p className="text-white/50 font-light text-sm">Quick answers to common questions</p>
                </div>
              </div>
              <ChatCircle size={24} className="text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </motion.section>
          </div>
        </div>

      </div>
    </PageLayout>
  );
}
