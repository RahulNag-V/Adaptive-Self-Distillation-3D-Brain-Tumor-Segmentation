import React, { useState } from 'react';
import AppLayout from './layouts/AppLayout';
import OverviewPage from './pages/OverviewPage';
import UploadPage from './pages/UploadPage';
import ViewerPage from './pages/ViewerPage';
import ResultsPage from './pages/ResultsPage';
import AboutPage from './pages/AboutPage';
import ClassificationPage from './pages/ClassificationPage';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [liveResult, setLiveResult] = useState(null);

  const handleSegmentationComplete = (result) => {
    setLiveResult(result);
    setActiveTab('results');
  };

  const renderActivePage = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewPage onNavigate={setActiveTab} />;
      case 'classify':
        return <ClassificationPage onNavigate={setActiveTab} />;
      case 'upload':
        return (
          <UploadPage 
            onNavigate={setActiveTab} 
            onSegmentationComplete={handleSegmentationComplete} 
          />
        );
      case 'viewer':
        return <ViewerPage currentResult={liveResult} onNavigate={setActiveTab} />;
      case 'results':
        return (
          <ResultsPage 
            currentResult={liveResult} 
            onNavigate={setActiveTab} 
            onClearLiveResult={() => setLiveResult(null)}
          />
        );
      case 'about':
        return <AboutPage />;
      default:
        return <OverviewPage onNavigate={setActiveTab} />;
    }
  };

  return (
    <AppLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderActivePage()}
    </AppLayout>
  );
}
