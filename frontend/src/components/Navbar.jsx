import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import DinoIcon from './DinoIcon'

export default function Navbar({ showBackButton = true }) {
  const navigate = useNavigate()

  return (
    <div className="p-4 relative z-50">
      <nav className="max-w-7xl mx-auto bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] px-8 py-5 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4 cursor-pointer group" onClick={() => navigate('/')}>
          {showBackButton && (
            <>
              <button className="text-white/60 hover:text-white transition-colors bg-transparent border-none">
                <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
              </button>
              <div className="h-6 w-px bg-white/20" />
            </>
          )}
          <div className="relative flex flex-col items-center">
            <DinoIcon className="w-10 h-8 -ml-1 text-white" style={{ fill: 'currentColor' }} />
            <div className="w-8 h-[2px] mt-0.5 bg-white" />
          </div>
          <span className="font-bold tracking-[0.1em] text-lg uppercase flex items-start gap-1 text-white">
            DOGFOOD<span className="text-[10px] mt-0.5 opacity-60">®</span>
          </span>
        </div>
      </nav>
    </div>
  )
}
