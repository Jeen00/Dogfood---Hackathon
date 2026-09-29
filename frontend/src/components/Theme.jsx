import React from 'react';
import { Link } from 'react-router-dom';

// ─── Main Container ──────────────────────────────────────────────────────────
export function PageContainer({ children, className = '' }) {
  return (
    <main className={`relative flex min-h-screen w-full bg-[#0a0d12] text-white font-sans selection:bg-white/30 overflow-y-auto transition-all duration-500 ${className}`}>
      {/* Background Video */}
      <video
        className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none"
        autoPlay
        muted
        loop
        playsInline
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260826_124724_bc041163-d651-425f-aea3-2acc1efc2c96.mp4"
          type="video/mp4"
        />
      </video>
      <div className="relative z-10 w-full min-h-screen flex flex-col">
        {children}
      </div>
    </main>
  );
}

// ─── Auth Layout ─────────────────────────────────────────────────────────────
export function AuthLayout({ children }) {
  return (
    <PageContainer className="flex min-h-screen p-4 sm:p-6 md:p-8">
      <div className="m-auto w-full max-w-[480px]">
        {children}
      </div>
    </PageContainer>
  );
}

// ─── Cards ───────────────────────────────────────────────────────────────────
export function DarkCard({ children, className = '', hoverColor = 'hover:bg-[var(--card-hover-bg)]', hoverGlow = false }) {
  const match = hoverColor?.match && hoverColor.match(/^hover:bg-([a-z]+)-(\d+)(?:\/(?:\[[\d.]+\]|\d+))?$/);
  
  let appliedHoverColor = hoverColor;
  let glow = hoverGlow ? 'hover:border-white/50 hover:shadow-[0_0_40px_rgba(255,255,255,0.15)]' : 'hover:border-white/20';
  let customStyle = {};
  let customClass = '';

  if (match) {
    const colorName = match[1];
    const shade = match[2];
    customStyle['--icon-color'] = `var(--color-${colorName}-${shade})`;
    customClass = 'shared-icon-hover-card ' + (hoverGlow ? 'shared-icon-hover-glow' : '');
    appliedHoverColor = ''; 
    glow = ''; 
  }

  return (
    <div 
      className={`p-8 rounded-lg bg-black/40 backdrop-blur-2xl border border-white/15 shadow-2xl transition-all duration-500 ${appliedHoverColor} ${glow} ${customClass} ${className}`}
      style={Object.keys(customStyle).length > 0 ? customStyle : undefined}
    >
      {children}
    </div>
  );
}

export function WhiteCard({ children, className = '', hoverColor = 'hover:bg-[var(--card-hover-bg)]', hoverGlow = false }) {
  const glow = hoverGlow ? 'hover:border-black/50 hover:shadow-[0_0_40px_rgba(255,255,255,0.15)]' : '';
  return (
    <div className={`p-8 rounded-lg bg-white/60 backdrop-blur-2xl border border-white/50 relative text-black shadow-2xl transition-all duration-500 ${hoverColor} ${glow} ${className}`}>
      {children}
    </div>
  );
}

// ─── Typography ──────────────────────────────────────────────────────────────
export function Heading({ children, className = '' }) {
  return (
    <h1 className={`text-3xl sm:text-4xl font-light tracking-[0.1em] uppercase text-white ${className}`}>
      {children}
    </h1>
  );
}

export function Subheading({ children, className = '' }) {
  return (
    <h2 className={`text-2xl sm:text-3xl font-light tracking-[0.15em] uppercase text-white ${className}`}>
      {children}
    </h2>
  );
}

export function Label({ children, className = '' }) {
  return (
    <label className={`text-[11px] font-medium text-white/70 tracking-[0.15em] uppercase ${className}`}>
      {children}
    </label>
  );
}

// ─── Form Controls ───────────────────────────────────────────────────────────
export function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full bg-white/[0.08] backdrop-blur-xl border border-white/15 rounded-md h-12 px-4 text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-white/40 focus:border-white/40 focus:bg-white/[0.14] transition-all text-sm font-light tracking-wide shadow-inner ${className}`}
      {...props}
    />
  );
}

export function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`w-full bg-white/[0.08] backdrop-blur-xl border border-white/15 rounded-md h-12 px-4 text-white focus:outline-none focus:ring-1 focus:ring-white/40 focus:border-white/40 focus:bg-white/[0.14] transition-all text-sm font-light tracking-wide shadow-inner [&>option]:bg-[#0a0d12] ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

// ─── Buttons ─────────────────────────────────────────────────────────────────
export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      className={`w-full py-3.5 bg-white text-black font-medium tracking-[0.15em] uppercase text-xs rounded-pill hover:bg-white/90 active:scale-[0.98] transition-all cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button
      className={`flex items-center justify-center gap-3 h-12 w-full bg-white/[0.08] hover:bg-white/[0.14] backdrop-blur-xl border border-white/15 hover:border-white/30 rounded-md transition-all cursor-pointer text-xs font-medium tracking-wider uppercase text-white/80 hover:text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
