import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from '@phosphor-icons/react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Footer from './Footer';
import DinoIcon from './DinoIcon';

export default function PageLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks = [
    { label: 'About Us', path: '/about' },
    { label: 'Our Motive', path: '/motive' },
    { label: 'Reviews', path: '/reviews' },
    { label: 'Contact Us', path: '/contact' }
  ];

  return (
    <div className="bg-[#0a0d12] min-h-screen text-white font-sans selection:bg-white/30 overflow-x-hidden flex flex-col relative">
      <div className="fixed inset-0 z-0 bg-[#0a0d12]" />

      {/* Navbar */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="absolute top-0 left-0 w-full z-50 pointer-events-auto"
      >
        <div className="flex items-center justify-between px-6 py-6 border-b border-white/10 bg-black/40 backdrop-blur-2xl">
          <div className="w-1/3 flex justify-start">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-sm font-semibold tracking-wider text-white border border-white/10 shadow-sm cursor-pointer"
            >
              <ArrowLeft size={16} /> Back
            </button>
          </div>
          
          <div className="w-1/3 flex justify-center">
            <div className="flex items-center gap-4 group cursor-pointer" onClick={() => navigate('/')}>
              <div className="relative flex flex-col items-center">
                <DinoIcon className="w-10 h-8 -ml-1 transition-transform group-hover:-translate-y-0.5 duration-300 text-white" style={{ fill: 'currentColor' }} />
                <div className="w-8 h-[2px] mt-0.5 bg-white" />
              </div>
              <span className="font-bold tracking-[0.1em] text-lg uppercase flex items-start gap-1 text-white">
                DOGFOOD<span className="text-[10px] mt-0.5 opacity-60">Ar</span>
              </span>
            </div>
          </div>
          
          <div className="w-1/3 hidden md:flex items-center justify-end gap-6 lg:gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.path}
                className={`text-xs lg:text-sm font-semibold tracking-wider transition-all hover:-translate-y-0.5 hover:opacity-100 ${location.pathname === link.path ? 'text-white border-b-2 border-white pb-1' : 'text-white/60'}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </motion.nav>

      {/* Main Content */}
      <main className="flex-1 relative z-10 flex flex-col pt-32">
        {children}
      </main>

      {/* Footer */}
      <div className="relative z-10 w-full bg-black/40 backdrop-blur-2xl border-t border-white/10 mt-auto">
        <Footer />
      </div>
    </div>
  );
}
