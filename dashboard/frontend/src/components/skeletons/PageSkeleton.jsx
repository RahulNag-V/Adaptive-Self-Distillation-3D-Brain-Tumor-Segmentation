import React from 'react';
import UploadSkeleton from './UploadSkeleton';
import ViewerSkeleton from './ViewerSkeleton';
import AdaptiveSkeleton from './AdaptiveSkeleton';
import AnalyticsSkeleton from './AnalyticsSkeleton';
import ModelLabSkeleton from './ModelLabSkeleton';
import ResultsSkeleton from './ResultsSkeleton';
import ClassificationSkeleton from './ClassificationSkeleton';
import ReportSkeleton from './ReportSkeleton';
import SettingsSkeleton from './SettingsSkeleton';
import AboutSkeleton from './AboutSkeleton';
import FAQSkeleton from './FAQSkeleton';
import SecuritySkeleton from './SecuritySkeleton';

/**
 * PageSkeleton
 * Renders the exact page-specific skeleton matching the destination route.
 * CRITICAL: Returns null for 'overview' (Home page must NEVER display a skeleton).
 */
export default function PageSkeleton({ tab }) {
  // CRITICAL RULE: Home page must NEVER display a skeleton loader.
  if (tab === 'overview' || tab === 'home' || !tab) {
    return null;
  }

  switch (tab) {
    case 'upload':
      return <UploadSkeleton />;
    case 'viewer':
      return <ViewerSkeleton />;
    case 'adaptive':
      return <AdaptiveSkeleton />;
    case 'analytics':
      return <AnalyticsSkeleton />;
    case 'models':
      return <ModelLabSkeleton />;
    case 'results':
      return <ResultsSkeleton />;
    case 'classify':
      return <ClassificationSkeleton />;
    case 'reports':
      return <ReportSkeleton />;
    case 'settings':
      return <SettingsSkeleton />;
    case 'about':
      return <AboutSkeleton />;
    case 'faq':
      return <FAQSkeleton />;
    case 'security':
      return <SecuritySkeleton />;
    default:
      return <UploadSkeleton />;
  }
}
