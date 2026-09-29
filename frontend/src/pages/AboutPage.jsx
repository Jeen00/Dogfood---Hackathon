import React from 'react';
import { motion } from 'motion/react';
import { Users, ChartBar, Desktop, Code, TerminalWindow } from '@phosphor-icons/react';
import PageLayout from '../components/PageLayout';
import { Heading, Subheading, PrimaryButton } from '../components/Theme';
import { useNavigate } from 'react-router-dom';

export default function AboutPage() {
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
          <Heading className="!text-5xl lg:!text-7xl font-bold">About Us</Heading>
          <p className="text-xl text-white/70 font-light leading-relaxed">
            We are the team behind DOGFOOD Hackathon 2026. Discover our journey, our mission, and the people who make this platform tick.
          </p>
        </motion.section>

        {/* Our Story */}
        <motion.section {...fadeIn} className="space-y-8">
          <Subheading>Our Story</Subheading>
          <div className={cardStyle} style={{ '--card-hover-bg': 'rgba(255,255,255,0.05)' }}>
            <p className="text-white/80 leading-relaxed font-light text-lg space-y-4">
              <span className="block mb-4">It started with a simple observation: hackathons are incredible catalysts for innovation, but the platforms managing them often fall short. They are either too complex, lacking transparency in judging, or simply uninspiring.</span>
              <span className="block">In early 2025, a group of developers, designers, and organizers came together to build something better. We wanted a platform that treated every participant as a first-class citizen and every judge's time with respect. After months of late-night coding sessions and "dogfooding" our own product, DOGFOOD 2026 was born.</span>
            </p>
          </div>
        </motion.section>

        {/* What We Do */}
        <motion.section {...fadeIn} className="space-y-8">
          <Subheading>What We Do</Subheading>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Empower Builders', desc: 'We provide tools that help developers form teams, submit projects, and showcase their skills globally.', icon: Code, color: '#38BDF8' },
              { title: 'Fair Evaluation', desc: 'Our Z-score normalized judging system ensures every project gets a fair shot, eliminating bias.', icon: Scales, color: '#34D399' },
              { title: 'Seamless Operations', desc: 'Organizers get a bird\'s-eye view of the event, with real-time stats and automated workflows.', icon: Desktop, color: '#F472B6' }
            ].map((item, i) => (
              <motion.div key={i} className={cardStyle} style={{ '--card-hover-bg': 'rgba(255,255,255,0.05)' }} whileHover={{ y: -10 }}>
                <item.icon size={48} weight="duotone" color={item.color} className="mb-6 opacity-80" />
                <h3 className="text-2xl font-semibold mb-3 tracking-wide">{item.title}</h3>
                <p className="text-white/60 font-light">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* How it Works */}
        <motion.section {...fadeIn} className="space-y-8">
          <Subheading>How The Platform Works</Subheading>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { role: 'Participant', steps: ['1. Create an account', '2. Join a team via invite', '3. Submit your repo & demo'] },
              { role: 'Judge', steps: ['1. Accept invitation', '2. Review assigned projects', '3. Submit weighted scores'] },
              { role: 'Organizer', steps: ['1. Configure event rubric', '2. Monitor live progress', '3. Export normalized results'] }
            ].map((r, i) => (
              <div key={i} className={cardStyle} style={{ '--card-hover-bg': 'rgba(255,255,255,0.05)' }}>
                <h3 className="text-xl font-bold tracking-widest uppercase mb-6 text-white/90 border-b border-white/10 pb-4">{r.role}</h3>
                <ul className="space-y-4">
                  {r.steps.map((step, j) => (
                    <li key={j} className="text-white/70 font-light flex items-center gap-3">
                      <div className="h-1.5 w-1.5 rounded-full bg-white/40" />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Team Section */}
        <motion.section {...fadeIn} className="space-y-8">
          <Subheading className="text-center">Meet The Team</Subheading>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: 'Alex Rivera', role: 'Lead Architect' },
              { name: 'Sam Chen', role: 'UX Director' },
              { name: 'Jordan Hayes', role: 'Backend Eng' },
              { name: 'Taylor Swift', role: 'Community Lead' }
            ].map((member, i) => (
              <motion.div key={i} className={`${cardStyle} text-center flex flex-col items-center justify-center py-10`} style={{ '--card-hover-bg': 'rgba(255,255,255,0.05)' }} whileHover={{ scale: 1.05 }}>
                <div className="w-20 h-20 rounded-full bg-white/10 mb-4 flex items-center justify-center border border-white/20">
                  <Users size={32} className="text-white/50" />
                </div>
                <h4 className="text-lg font-semibold tracking-wider">{member.name}</h4>
                <p className="text-sm text-white/50 font-light mt-1">{member.role}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Numbers */}
        <motion.section {...fadeIn} className="space-y-8">
          <div className="p-12 rounded-2xl bg-black/80 backdrop-blur-3xl border border-white/20 shadow-2xl flex flex-col md:flex-row justify-around items-center gap-10">
            {[
              { label: 'Lines of Code', val: '120k+' },
              { label: 'Happy Hackers', val: '5,000+' },
              { label: 'Projects Submitted', val: '850+' },
              { label: 'Fairness Score', val: '100%' }
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl md:text-5xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50 mb-2">{stat.val}</div>
                <div className="text-xs uppercase tracking-[0.2em] text-white/40">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* CTA */}
        <motion.section {...fadeIn} className="flex justify-center pt-10">
          <PrimaryButton className="max-w-xs" onClick={() => navigate('/signup')}>
            Join The Revolution
          </PrimaryButton>
        </motion.section>

      </div>
    </PageLayout>
  );
}
