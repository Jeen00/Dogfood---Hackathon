import { useEffect, useRef } from 'react'
import { UploadSimple, Scales, ChartBar, MathOperations } from '@phosphor-icons/react'
import { motion, useScroll } from 'motion/react'
import Lenis from 'lenis'
import HeroSection from '../components/HeroSection'
import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()
  const footerRef = useRef(null)
  const { scrollYProgress: footerProgress } = useScroll({
    target: footerRef,
    offset: ["start end", "end end"]
  })

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    })

    function raf(time) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)
    return () => lenis.destroy()
  }, [])

  return (
    <div className="bg-transparent min-h-screen text-white font-sans selection:bg-white/30">
      <div className="fixed inset-0 z-[-1] bg-[#F5F5F0]" />
      <HeroSection footerProgress={footerProgress} />

      {/* ── Background for scrolling sections ── */}
      {/* Removed the heavy black/90 background and blur so the video shines through continuously */}
      <div className="relative z-10 pt-16">
        
        {/* ── Features Section ── */}
        <section id="features" className="py-32 px-6">
          <div className="max-w-5xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="text-center mb-20"
            >
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                Built for builders and judges
              </h2>
              <p className="text-white/80 text-lg font-medium">
                The complete lifecycle from submission to cross-judge normalization.
              </p>
            </motion.div>

            {/* 2x2 Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { 
                  title: 'Seamless Submissions', 
                  desc: 'Teams can upload their projects, link repositories, and select tracks seamlessly.', 
                  Icon: UploadSimple,
                  color: 'text-sky-300',
                  bg: 'bg-sky-400/20',
                  cardBg: 'bg-black/60 hover:bg-sky-900/60'
                },
                { 
                  title: 'Track-based Judging', 
                  desc: 'Judges are automatically assigned to projects within their domain expertise.', 
                  Icon: Scales,
                  color: 'text-amber-300',
                  bg: 'bg-amber-400/20',
                  cardBg: 'bg-black/60 hover:bg-amber-900/60'
                },
                { 
                  title: 'Z-Score Normalization', 
                  desc: 'Eliminates strict/lenient judge bias using advanced statistical normalization.', 
                  Icon: MathOperations,
                  color: 'text-fuchsia-300',
                  bg: 'bg-fuchsia-400/20',
                  cardBg: 'bg-black/60 hover:bg-fuchsia-900/60'
                },
                { 
                  title: 'CSV Export', 
                  desc: 'Organizers can export the final scoring matrix with one click.', 
                  Icon: ChartBar,
                  color: 'text-teal-300',
                  bg: 'bg-teal-400/20',
                  cardBg: 'bg-black/60 hover:bg-teal-900/60'
                }
              ].map((feature, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className={`p-8 rounded-2xl ${feature.cardBg} backdrop-blur-2xl border border-white/20 shadow-2xl transition-colors duration-500 hover:border-white/50 hover:shadow-[0_0_40px_rgba(255,255,255,0.15)] cursor-pointer`}
                >
                  <div className={`h-12 w-12 rounded-full ${feature.bg} flex items-center justify-center mb-6`}>
                    <feature.Icon size={24} weight="duotone" className={feature.color} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-white/80 leading-relaxed font-medium">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works (Z-Score Normalization Engine) ── */}
        <section id="how-it-works" className="py-32 px-6 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="text-center mb-24"
            >
              <h2 className="text-3xl md:text-5xl font-light tracking-widest uppercase mb-6">
                The Transparency Engine
              </h2>
              <p className="text-white/60 text-lg md:text-xl max-w-2xl mx-auto tracking-wide">
                We believe hackathons should be won on pure merit, not luck. Discover how our backend mathematically eliminates judge bias.
              </p>
            </motion.div>

            <div className="space-y-32">
              {/* Step 1 */}
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="flex flex-col md:flex-row items-center gap-12"
              >
                <div className="flex-1 space-y-6">
                  <div className="text-sm font-bold tracking-[0.2em] text-white/50 uppercase">Phase 01</div>
                  <h3 className="text-3xl md:text-4xl font-medium tracking-wide">Raw Evaluation</h3>
                  <p className="text-white/70 text-lg leading-relaxed">
                    Judges are strictly isolated to projects within their assigned tracks. They evaluate submissions using a standardized, weighted rubric: <strong>Functionality (50%)</strong>, <strong>Quality (30%)</strong>, and <strong>Presentation (20%)</strong>.
                  </p>
                </div>
                <div className="flex-1 w-full relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-sky-500/10 to-transparent blur-3xl" />
                  <div className="relative bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 font-mono text-sm text-sky-300 shadow-2xl">
                    <div className="text-white/40 mb-4">// POST /api/judge/scores</div>
                    &#123;<br/>
                    &nbsp;&nbsp;"project_id": "prj_41",<br/>
                    &nbsp;&nbsp;"criteria_scores": &#123;<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;"functionality": 4,<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;"quality": 5,<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;"presentation": 3<br/>
                    &nbsp;&nbsp;&#125;,<br/>
                    &nbsp;&nbsp;"weighted_score": 4.1<br/>
                    &#125;
                  </div>
                </div>
              </motion.div>

              {/* Step 2 */}
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="flex flex-col md:flex-row-reverse items-center gap-12"
              >
                <div className="flex-1 space-y-6">
                  <div className="text-sm font-bold tracking-[0.2em] text-white/50 uppercase">Phase 02</div>
                  <h3 className="text-3xl md:text-4xl font-medium tracking-wide">Z-Score Normalization</h3>
                  <p className="text-white/70 text-lg leading-relaxed">
                    This is our killer feature. The platform calculates the mean (<span className="italic">μ</span>) and standard deviation (<span className="italic">σ</span>) for every individual judge. By converting raw scores into Z-scores, a mathematically identical scale is created. A 3 from a strict judge carries the exact same weight as a 5 from a generous judge.
                  </p>
                </div>
                <div className="flex-1 w-full relative">
                  <div className="absolute inset-0 bg-gradient-to-l from-fuchsia-500/10 to-transparent blur-3xl" />
                  <div className="relative bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 font-mono text-sm text-fuchsia-300 shadow-2xl flex flex-col items-center justify-center py-12">
                    <div className="text-3xl mb-4">z = (x - μ) / σ</div>
                    <div className="text-white/50 text-xs tracking-widest uppercase mt-4">Cross-Judge Equalization</div>
                  </div>
                </div>
              </motion.div>

              {/* Step 3 */}
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="flex flex-col md:flex-row items-center gap-12"
              >
                <div className="flex-1 space-y-6">
                  <div className="text-sm font-bold tracking-[0.2em] text-white/50 uppercase">Phase 03</div>
                  <h3 className="text-3xl md:text-4xl font-medium tracking-wide">Public Audit Trail</h3>
                  <p className="text-white/70 text-lg leading-relaxed">
                    Once the judging window closes, the platform automatically locks and renders the public gallery. Every normalized score, track assignment, and mathematical adjustment is published for 100% transparent verification.
                  </p>
                </div>
                <div className="flex-1 w-full relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent blur-3xl" />
                  <div className="relative bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 font-mono text-sm text-emerald-300 shadow-2xl">
                    <div className="text-white/40 mb-4">SELECT * FROM normalized_scores;</div>
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-white/40 border-b border-white/10">
                          <th className="pb-3 font-normal">project</th>
                          <th className="pb-3 font-normal">raw</th>
                          <th className="pb-3 font-normal">z_score</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr><td className="py-3 border-b border-white/5">prj_41</td><td className="py-3 border-b border-white/5">4.1</td><td className="py-3 border-b border-white/5 text-white">+1.24</td></tr>
                        <tr><td className="py-3 border-b border-white/5">prj_12</td><td className="py-3 border-b border-white/5">2.8</td><td className="py-3 border-b border-white/5 text-white">-0.82</td></tr>
                        <tr><td className="py-3">prj_07</td><td className="py-3">3.5</td><td className="py-3 text-white">+0.15</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Portal Access Section ── */}
        <section id="access" className="py-32 px-6">
          <div className="max-w-4xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="text-center mb-20"
            >
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                Portal Access
              </h2>
              <p className="text-white/60 text-lg">
                Role-based dashboards for everyone involved.
              </p>
            </motion.div>

            {/* 2 Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Participant */}
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="p-10 rounded-3xl bg-black/60 backdrop-blur-2xl border border-white/20 flex flex-col shadow-2xl"
              >
                <h3 className="text-2xl font-medium mb-2">Participant</h3>
                <p className="text-white/80 mb-8 flex-1">For hackers forming teams and submitting projects.</p>
                <ul className="space-y-4 mb-10 text-white/90">
                  <li className="flex items-center gap-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-white/60" /> Submit your repository
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-white/60" /> Manage team members
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-white/60" /> View public gallery
                  </li>
                </ul>
                <button 
                  onClick={() => navigate('/signup')}
                  className="w-full py-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors font-semibold cursor-pointer"
                >
                  Register Now
                </button>
              </motion.div>

              {/* Judge / Organizer */}
              <motion.div 
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="p-10 rounded-3xl bg-white/60 backdrop-blur-2xl border border-white/50 relative text-black flex flex-col shadow-2xl"
              >
                <div className="absolute top-0 right-10 -translate-y-1/2 bg-black text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                  OFFICIALS
                </div>
                <h3 className="text-2xl font-medium mb-2">Staff & Judges</h3>
                <p className="text-black/80 mb-8 flex-1">For organizers managing the event and judges reviewing projects.</p>
                <ul className="space-y-4 mb-10 text-black/90 font-medium">
                  <li className="flex items-center gap-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-black/60" /> Review assignments
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-black/60" /> Score against rubrics
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-black/60" /> Run normalization
                  </li>
                </ul>
                <button 
                  onClick={() => navigate('/login')}
                  className="w-full py-3 rounded-full bg-black/50 text-white hover:bg-black/60 transition-colors font-semibold cursor-pointer"
                >
                  Staff Login
                </button>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer ref={footerRef} className="relative z-20 w-full min-h-screen flex items-center justify-end py-24 bg-transparent pointer-events-none">
          <div className="w-full md:w-1/2 flex flex-col items-center justify-center pointer-events-auto px-6">
            <div className="flex flex-col items-center gap-8 mb-20">
              {['About Us', 'Our Motive', 'Reviews', 'Contact Us'].map((link) => (
                <a 
                  key={link} 
                  href="#" 
                  className="text-2xl md:text-3xl font-light tracking-[0.2em] uppercase text-black/60 hover:text-black hover:tracking-[0.25em] transition-all duration-500"
                >
                  {link}
                </a>
              ))}
            </div>
            <p className="text-black/40 text-xs md:text-sm tracking-[0.1em] font-bold uppercase">
              © 2026 DOGFOOD Hackathon Team. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
