import React, { useEffect } from 'react';
import Faq05 from '../components/ui/faq-05';
import { smoothScrollToTop } from '../utils/motion';

export default function FAQPage({ onNavigate }) {
  useEffect(() => {
    smoothScrollToTop();
  }, []);

  return (
    <div className="faq-section max-w-7xl mx-auto w-full h-[calc(100vh-3.5rem)] max-h-[calc(100vh-3.5rem)] px-4 sm:px-6 lg:px-8 py-1.5 sm:py-2 flex flex-col justify-center font-sans text-[#111827] dark:text-white lg:overflow-hidden">
      {/* MAIN HIRAEL FAQ-05 COMPONENT */}
      <Faq05 onNavigate={onNavigate} />
    </div>
  );
}
