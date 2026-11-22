import React, { useEffect } from 'react';
import Faq05 from '../components/ui/faq-05';
import { smoothScrollToTop } from '../utils/motion';

export default function FAQPage({ onNavigate }) {
  useEffect(() => {
    smoothScrollToTop();
  }, []);

  return (
    <div className="faq-section max-w-6xl mx-auto w-full min-h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-3.5rem)] lg:max-h-[calc(100vh-3.5rem)] p-4 sm:p-6 lg:p-8 flex flex-col justify-center font-sans text-[#111827] dark:text-white lg:overflow-hidden">
      {/* MAIN HIRAEL FAQ-05 COMPONENT */}
      <Faq05 onNavigate={onNavigate} />
    </div>
  );
}
