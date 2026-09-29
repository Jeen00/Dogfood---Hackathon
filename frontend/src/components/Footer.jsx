import { forwardRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Footer = forwardRef((props, ref) => {
  const location = useLocation();

  const links = [
    { name: 'About Us', path: '/about' },
    { name: 'Our Motive', path: '/motive' },
    { name: 'Reviews', path: '/reviews' },
    { name: 'Contact Us', path: '/contact' }
  ];

  return (
    <footer ref={ref} className="relative z-20 w-full min-h-[50vh] flex items-center justify-end py-24 bg-transparent pointer-events-none">
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center pointer-events-auto px-6">
        <div className="flex flex-col items-center gap-8 mb-20">
          {links.map((link) => (
            <Link 
              key={link.name} 
              to={link.path}
              className={`text-2xl md:text-3xl font-light tracking-[0.2em] uppercase transition-all duration-500 hover:text-white hover:tracking-[0.25em] ${location.pathname === link.path ? 'text-white font-medium' : 'text-white/40'}`}
            >
              {link.name}
            </Link>
          ))}
        </div>
        <p className="text-white/30 text-xs md:text-sm tracking-[0.1em] font-bold uppercase">
          © 2026 DOGFOOD Hackathon Team. All rights reserved.
        </p>
      </div>
    </footer>
  );
});

export default Footer;
