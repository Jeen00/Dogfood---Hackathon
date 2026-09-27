import { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, InstagramLogo, TwitterLogo, Globe } from '@phosphor-icons/react'
import { motion, useScroll, useTransform, useMotionTemplate, useMotionValue } from 'motion/react'
import DinoIcon from './DinoIcon'

export default function HeroSection({ footerProgress }) {
  const videoRef = useRef(null)
  const frameRef = useRef(null)
  const fadingOutRef = useRef(false)
  const navigate = useNavigate()
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    fetch('/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.loggedIn) {
          setUserRole(data.role)
        }
      })
      .catch(err => console.error('Failed to fetch auth', err))
  }, [])

  // Framer motion scroll values
  const { scrollY } = useScroll()
  
  // Video physical bounding box (symmetric hero/footer states)
  const fallbackProgress = useMotionValue(0)
  const activeFooterProgress = footerProgress || fallbackProgress

  // Hero transitions (0 to 500px scroll)
  const topHero = useTransform(scrollY, [0, 500], [100, 0])
  const bottomHero = useTransform(scrollY, [0, 500], [24, 0])
  const leftHeroVw = useTransform(scrollY, [0, 500], [52, 0])
  const rightHeroPx = useTransform(scrollY, [0, 500], [24, 0])
  const radiusHero = useTransform(scrollY, [0, 500], [24, 0])
  
  // Footer transitions (0 to 1 progress)
  const topFooter = useTransform(activeFooterProgress, [0, 1], [0, 24])
  const bottomFooter = useTransform(activeFooterProgress, [0, 1], [0, 24])
  const leftFooterPx = useTransform(activeFooterProgress, [0, 1], [0, 24])
  const rightFooterVw = useTransform(activeFooterProgress, [0, 1], [0, 52])
  const radiusFooter = useTransform(activeFooterProgress, [0, 1], [0, 24])
  
  // Combined dynamic bounds using calc()
  const topStr = useMotionTemplate`calc(${topHero}px + ${topFooter}px)`
  const bottomStr = useMotionTemplate`calc(${bottomHero}px + ${bottomFooter}px)`
  const leftStr = useMotionTemplate`calc(${leftHeroVw}vw + ${leftFooterPx}px)`
  const rightStr = useMotionTemplate`calc(${rightHeroPx}px + ${rightFooterVw}vw)`
  const radiusStr = useMotionTemplate`calc(${radiusHero}px + ${radiusFooter}px)`

  const videoScale = useTransform(scrollY, [0, 500], [1, 1.05]) // Zoom in effect
  
  // Color transitions (Dark on light bg -> Light on dark bg)
  const textColor = useTransform(scrollY, [0, 400], ['#1A1A1A', '#FFFFFF'])
  const subTextColor = useTransform(scrollY, [0, 400], ['rgba(26,26,26,0.6)', 'rgba(255,255,255,0.7)'])
  const borderColor = useTransform(scrollY, [0, 400], ['rgba(26,26,26,0.1)', 'rgba(255,255,255,0.1)'])
  const glassBg = useTransform(scrollY, [0, 400], ['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.05)'])
  const buttonBg = useTransform(scrollY, [0, 400], ['#1A1A1A', '#FFFFFF'])
  const buttonText = useTransform(scrollY, [0, 400], ['#FFFFFF', '#1A1A1A'])
  const inputPlaceholderColor = useTransform(scrollY, [0, 400], ['rgba(26,26,26,0.4)', 'rgba(255,255,255,0.4)'])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    function cancelFrame() {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }

    function fadeIn() {
      cancelFrame()
      const startTime = performance.now()
      const startOpacity = parseFloat(video.style.opacity) || 0
      const duration = 500

      function step(now) {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        video.style.opacity = startOpacity + (1 - startOpacity) * progress
        if (progress < 1) {
          frameRef.current = requestAnimationFrame(step)
        }
      }
      frameRef.current = requestAnimationFrame(step)
    }

    function fadeOut() {
      cancelFrame()
      const startTime = performance.now()
      const startOpacity = parseFloat(video.style.opacity) || 1
      const duration = 500

      function step(now) {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        video.style.opacity = startOpacity * (1 - progress)
        if (progress < 1) {
          frameRef.current = requestAnimationFrame(step)
        }
      }
      frameRef.current = requestAnimationFrame(step)
    }

    function handleTimeUpdate() {
      if (!fadingOutRef.current && video.duration - video.currentTime <= 0.55) {
        fadingOutRef.current = true
        fadeOut()
      }
    }

    function handleEnded() {
      video.style.opacity = 0
      setTimeout(() => {
        fadingOutRef.current = false
        video.currentTime = 0
        video.play().then(fadeIn).catch(() => {})
      }, 100)
    }

    video.style.opacity = 0
    video.play().then(fadeIn).catch(() => {})

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleEnded)

    return () => {
      cancelFrame()
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleEnded)
    }
  }, [])

  return (
    <div className="min-h-screen relative flex font-sans w-full">
      
      {/* ── Dynamic Expanding Background Video ── */}
      <motion.div 
        className="fixed z-0 overflow-hidden bg-black shadow-2xl"
        style={{ 
          top: topStr,
          bottom: bottomStr,
          left: leftStr,
          right: rightStr,
          borderRadius: radiusStr
        }}
      >
        <motion.video
          ref={videoRef}
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_115001_bcdaa3b4-03de-47e7-ad63-ae3e392c32d4.mp4"
          muted
          playsInline
          loop={false}
          className="w-full h-full object-cover"
          style={{ scale: videoScale, opacity: 0 }}
        />
        <div className="absolute inset-0 bg-black/20" />
      </motion.div>

      {/* ── Full Width Navigation ── */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="absolute top-0 left-0 w-full z-50"
      >
        <motion.div 
          className="w-full flex items-center justify-between backdrop-blur-xl border-b shadow-sm px-8 py-5 rounded-none"
          style={{ backgroundColor: glassBg, borderColor: borderColor }}
        >
          {/* Logo */}
          <div className="w-1/3 flex justify-start">
            <motion.div 
              className="flex items-center gap-4 group cursor-pointer" 
              onClick={() => navigate('/')}
              style={{ color: textColor }}
            >
              <div className="relative flex flex-col items-center">
                <DinoIcon className="w-10 h-8 -ml-1 transition-transform group-hover:-translate-y-0.5 duration-300" style={{ fill: 'currentColor' }} />
                <div className="w-8 h-[2px] mt-0.5" style={{ backgroundColor: 'currentColor' }} />
              </div>
              <div className="h-6 w-px opacity-20" style={{ backgroundColor: 'currentColor' }} />
              <span className="font-bold tracking-[0.1em] text-lg md:text-xl uppercase flex items-start gap-1">
                DOGFOOD<span className="text-[10px] md:text-xs mt-0.5 opacity-60">®</span>
              </span>
            </motion.div>
          </div>
          
          {/* Centered Links */}
          <div className="w-1/3 hidden md:flex items-center justify-center gap-8 lg:gap-12">
            {[
              { label: 'Gallery', path: '/projects', external: true },
              { label: 'Tracks', path: '/#tracks' },
              { label: 'Rules', path: '/rules' },
              { label: 'FAQ', path: '/faq' }
            ].map((link) => (
              <motion.a 
                key={link.label} 
                href={link.path}
                onClick={(e) => {
                  if (!link.external && link.path.startsWith('/')) {
                    e.preventDefault();
                    navigate(link.path);
                  }
                }}
                className="text-sm font-medium tracking-wide transition-opacity hover:opacity-70"
                style={{ color: textColor }}
              >
                {link.label}
              </motion.a>
            ))}
          </div>

          {/* Action Button */}
          <div className="w-1/3 flex items-center justify-end">
            <motion.button 
              onClick={() => navigate('/login')}
              className="text-sm font-medium tracking-wide px-8 py-2.5 rounded-full shadow-sm transition-transform hover:scale-105 cursor-pointer"
              style={{ backgroundColor: buttonBg, color: buttonText }}
            >
              Portal Login
            </motion.button>
          </div>
        </motion.div>
      </motion.nav>

      {/* ── Left Half Container for Hero Content ── */}
      <div className="relative z-10 w-full lg:w-1/2 flex flex-col justify-center min-h-screen px-6 md:px-12 pt-24 pb-12">
        
        {/* ── Hero text ── */}
        <div className="flex-1 flex flex-col justify-center max-w-lg">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-5xl md:text-6xl tracking-tighter font-extrabold text-left mb-6"
            style={{ color: textColor }}
          >
            Build the platform<br/>that will judge you.
          </motion.h1>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className="space-y-8"
          >
            <motion.p 
              className="text-lg leading-relaxed font-medium text-left"
              style={{ color: subTextColor }}
            >
              The official open-source submission and evaluation portal for the 72-hour DOGFOOD 2026 Hackathon.
            </motion.p>

            {userRole === 'participant' && (
              <motion.div 
                className="flex items-center gap-3 pl-6 pr-2 py-2 rounded-full backdrop-blur-xl border shadow-sm w-full"
                style={{ backgroundColor: glassBg, borderColor: borderColor }}
              >
                <motion.input
                  type="text"
                  placeholder="Enter your invite code"
                  className="flex-1 bg-transparent text-base outline-none border-none font-medium placeholder:opacity-50"
                  style={{ color: textColor }}
                />
                <motion.button 
                  className="p-3 px-6 font-semibold rounded-full flex items-center gap-2 transition-transform hover:scale-105 cursor-pointer shadow-sm group"
                  style={{ backgroundColor: buttonBg, color: buttonText }}
                >
                  Join Team
                  <ArrowRight size={20} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* ── Social footer ── */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="flex justify-start gap-4 mt-auto pt-12"
        >
          {[
            { Icon: InstagramLogo, label: 'Instagram', color: '#F472B6' }, // pink-400
            { Icon: TwitterLogo, label: 'Twitter', color: '#38BDF8' }, // sky-400
            { Icon: Globe, label: 'Website', color: '#34D399' }, // emerald-400
          ].map(({ Icon, label, color }) => (
            <motion.button
              key={label}
              aria-label={label}
              className="p-4 rounded-full backdrop-blur-md border shadow-sm transition-transform hover:scale-110 cursor-pointer"
              style={{ backgroundColor: glassBg, borderColor: borderColor }}
            >
              <Icon size={20} weight="duotone" color={color} />
            </motion.button>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
