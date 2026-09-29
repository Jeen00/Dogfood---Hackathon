import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Star, Quotes } from '@phosphor-icons/react';
import PageLayout from '../components/PageLayout';
import { Heading, Subheading, PrimaryButton } from '../components/Theme';
import { useNavigate } from 'react-router-dom';

export default function ReviewsPage() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    fetch('/api/reviews')
      .then(res => res.json())
      .then(data => {
        if (data.reviews) {
          setReviews(data.reviews);
        }
      })
      .catch(err => console.error(err));
  }, []);

  const fadeIn = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-100px" },
    transition: { duration: 0.8, ease: "easeOut" }
  };

  const cardStyle = "p-8 rounded-2xl bg-black/60 backdrop-blur-2xl border border-white/20 shadow-2xl transition-all duration-500 hover:bg-[var(--card-hover-bg)] hover:border-white/40";

  const renderStars = (rating) => {
    return (
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={16} weight={i < rating ? 'fill' : 'regular'} className={i < rating ? 'text-yellow-400' : 'text-white/20'} />
        ))}
      </div>
    );
  };

  const groupedReviews = {
    participant: reviews.filter(r => r.role === 'participant'),
    judge: reviews.filter(r => r.role === 'judge'),
    organizer: reviews.filter(r => r.role === 'organizer')
  };

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto px-6 py-12 space-y-32 mb-32 w-full">
        
        {/* Hero */}
        <motion.section {...fadeIn} className="text-center max-w-3xl mx-auto space-y-6 pt-12">
          <Heading className="!text-5xl lg:!text-7xl font-bold">Reviews</Heading>
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-2 text-2xl font-bold">
              <span className="text-4xl text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200">4.9</span>
              <span className="text-white/50">/</span>
              <span className="text-white/50">5.0</span>
            </div>
            {renderStars(5)}
            <p className="text-sm text-white/50 tracking-widest uppercase mt-2">Average Platform Rating</p>
          </div>
        </motion.section>

        {/* Big Quote */}
        <motion.section {...fadeIn} className="max-w-4xl mx-auto">
          <div className={`${cardStyle} text-center relative overflow-hidden py-16`} style={{ '--card-hover-bg': 'rgba(255,255,255,0.02)' }}>
            <Quotes size={80} weight="fill" className="absolute top-4 left-4 text-white/5 -rotate-12" />
            <Quotes size={80} weight="fill" className="absolute bottom-4 right-4 text-white/5 rotate-12" />
            
            <p className="text-2xl md:text-3xl font-light leading-relaxed text-white/90 mb-8 italic">
              "Finally, a hackathon platform that doesn't feel like a spreadsheet. The Z-score normalization for judging is an absolute game changer for fairness."
            </p>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-white/10 mb-3 border border-white/20 flex items-center justify-center">
                <span className="font-bold text-lg">J</span>
              </div>
              <h4 className="font-bold tracking-wider">Jane Doe</h4>
              <p className="text-sm text-white/50 font-light">Lead Judge, AI Sprint 2025</p>
            </div>
          </div>
        </motion.section>

        {/* Grouped Reviews */}
        {['participant', 'judge', 'organizer'].map((role) => (
          groupedReviews[role].length > 0 && (
            <motion.section {...fadeIn} key={role} className="space-y-8">
              <Subheading className="capitalize border-b border-white/10 pb-4">{role}s Say...</Subheading>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedReviews[role].map((review) => (
                  <motion.div key={review.id} className={`${cardStyle} flex flex-col`} style={{ '--card-hover-bg': 'rgba(255,255,255,0.05)' }} whileHover={{ y: -5 }}>
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/20 to-transparent flex items-center justify-center font-bold text-white/80 border border-white/10">
                          {review.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-semibold">{review.name}</h4>
                          <span className="text-[10px] uppercase tracking-widest text-white/40">{review.role}</span>
                        </div>
                      </div>
                      {renderStars(review.rating)}
                    </div>
                    <p className="text-white/70 font-light leading-relaxed flex-1">"{review.message}"</p>
                    {review.is_sample === 1 && (
                      <div className="mt-6 pt-4 border-t border-white/10 text-[10px] uppercase tracking-widest text-white/30 text-right">
                        Sample Content
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )
        ))}

        {/* CTA */}
        <motion.section {...fadeIn} className="flex justify-center pt-10">
          <PrimaryButton className="max-w-xs" onClick={() => navigate('/signup')}>
            Experience It Yourself
          </PrimaryButton>
        </motion.section>

      </div>
    </PageLayout>
  );
}
