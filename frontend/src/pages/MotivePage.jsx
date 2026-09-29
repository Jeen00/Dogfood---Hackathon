import React from 'react';
import { motion } from 'motion/react';
import { Target, Heart, Lightning, ShieldCheck, Flag, GitCommit } from '@phosphor-icons/react';
import PageLayout from '../components/PageLayout';
import { Heading, Subheading, PrimaryButton } from '../components/Theme';
import { useNavigate } from 'react-router-dom';

export default function MotivePage() {
  const navigate = useNavigate();

  const fadeIn = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-100px" },
    transition: { duration: 0.8, ease: "easeOut" }
  };

  const cardStyle = "p-8 rounded-2xl bg-black/60 backdrop-blur-2xl border border-white/20 shadow-2xl transition-all duration-500 hover:bg-[var(--card-hover-bg)] hover:border-white/40";

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto px-6 py-12 space-y-32 mb-32 w-full">
        
        {/* Hero */}
        <motion.section {...fadeIn} className="text-center max-w-3xl mx-auto space-y-6 pt-12">
          <Heading className="!text-5xl lg:!text-7xl font-bold">Our Motive</Heading>
          <p className="text-2xl text-white/90 font-medium tracking-wide">
            Building the gold standard for hackathon infrastructure.
          </p>
        </motion.section>

        {/* Why We Started & Mission */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.section {...fadeIn} className={`${cardStyle} space-y-6`} style={{ '--card-hover-bg': 'rgba(255,255,255,0.05)' }}>
            <Subheading className="text-xl border-b border-white/10 pb-4">Why We Started</Subheading>
            <p className="text-white/70 font-light leading-relaxed">
              We were tired of fragmented systems. Participants using one app to chat, another to submit, and organizers manually wrestling with spreadsheets to figure out who won. The friction of the tools was getting in the way of the actual hacking. We started DOGFOOD to eliminate that friction.
            </p>
          </motion.section>

          <motion.section {...fadeIn} className={`${cardStyle} space-y-6`} style={{ '--card-hover-bg': 'rgba(255,255,255,0.05)' }}>
            <Subheading className="text-xl border-b border-white/10 pb-4">Our Mission</Subheading>
            <p className="text-white/70 font-light leading-relaxed">
              To provide an open, transparent, and effortlessly scalable platform that allows organizers to host world-class hackathons, while giving participants the ultimate stage to showcase their engineering prowess without administrative headaches.
            </p>
          </motion.section>
        </div>

        {/* Values */}
        <motion.section {...fadeIn} className="space-y-12">
          <Subheading className="text-center">Our Core Values</Subheading>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Transparency', desc: 'Open judging rubrics and normalized scores.', icon: Target, color: '#38BDF8' },
              { title: 'Community', desc: 'Built by hackers, for hackers.', icon: Heart, color: '#F472B6' },
              { title: 'Speed', desc: 'Fast, responsive, and reliable infrastructure.', icon: Lightning, color: '#FBBF24' },
              { title: 'Integrity', desc: 'Strict role isolation and fair play enforcement.', icon: ShieldCheck, color: '#34D399' }
            ].map((v, i) => (
              <motion.div key={i} className={`${cardStyle} flex flex-col items-center text-center`} style={{ '--card-hover-bg': 'rgba(255,255,255,0.05)' }} whileHover={{ y: -10 }}>
                <v.icon size={42} weight="duotone" color={v.color} className="mb-6 opacity-90" />
                <h3 className="text-lg font-bold tracking-widest uppercase mb-3">{v.title}</h3>
                <p className="text-sm text-white/50 font-light leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* What We Want to Change */}
        <motion.section {...fadeIn} className="space-y-8 max-w-4xl mx-auto">
          <Subheading className="text-center mb-10">What We Want To Change</Subheading>
          <div className="space-y-6">
            {[
              "Eliminate the 'spreadsheet nightmare' for organizers during judging.",
              "Stop the bias of 'easy graders' vs 'hard graders' using mathematical normalization.",
              "Provide real-time visibility into project submissions and team formations.",
              "Ensure platform stability even when 5,000 users submit projects in the final 10 minutes."
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <Flag size={24} className="text-white/40 shrink-0 mt-1" />
                <p className="text-lg font-light text-white/80">{item}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Roadmap */}
        <motion.section {...fadeIn} className="space-y-12">
          <Subheading className="text-center">The Roadmap</Subheading>
          <div className={`${cardStyle} relative overflow-hidden`} style={{ '--card-hover-bg': 'rgba(255,255,255,0.02)' }}>
            <div className="absolute left-[39px] md:left-1/2 top-10 bottom-10 w-px bg-white/10" />
            <div className="space-y-12 relative z-10">
              {[
                { date: 'Q1 2025', title: 'The Alpha Build', desc: 'Initial concept and database schema finalized.' },
                { date: 'Q3 2025', title: 'Beta Testing', desc: 'First internal dogfooding with 50 test users.' },
                { date: 'Q1 2026', title: 'Public Launch', desc: 'DOGFOOD 2026 platform goes live globally.' },
                { date: 'Q4 2026', title: 'V2 Expansion', desc: 'Adding AI-assisted rubric evaluation and global leaderboards.' }
              ].map((phase, i) => (
                <div key={i} className={`flex flex-col md:flex-row items-start md:items-center gap-6 ${i % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                  <div className={`flex-1 ${i % 2 === 0 ? 'md:text-left' : 'md:text-right'} pl-16 md:pl-0`}>
                    <h4 className="text-xl font-bold tracking-widest text-white/90">{phase.title}</h4>
                    <p className="text-sm text-white/50 font-light mt-2">{phase.desc}</p>
                  </div>
                  <div className="absolute left-6 md:relative md:left-auto w-10 h-10 rounded-full bg-black border-2 border-white/30 flex items-center justify-center z-10 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                    <GitCommit size={20} className="text-white/70" />
                  </div>
                  <div className={`flex-1 ${i % 2 === 0 ? 'md:text-right' : 'md:text-left'} hidden md:block`}>
                    <span className="text-sm font-mono tracking-widest text-white/40">{phase.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* CTA */}
        <motion.section {...fadeIn} className="flex justify-center pt-10">
          <PrimaryButton className="max-w-xs" onClick={() => navigate('/tracks')}>
            Explore The Tracks
          </PrimaryButton>
        </motion.section>

      </div>
    </PageLayout>
  );
}
