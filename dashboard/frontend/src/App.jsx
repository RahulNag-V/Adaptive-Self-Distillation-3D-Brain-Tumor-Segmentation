import React, { useState, Suspense, lazy } from 'react';
import AppLayout from './layouts/AppLayout';
import OverviewPage from './pages/OverviewPage';
import CinematicIntro from './components/CinematicIntro';
import PageTransition from './components/PageTransition';
import { smoothScrollToTop } from './utils/motion';
import { VoiceProvider } from './voice/VoiceContext';

// Route-level code splitting: heavy visualization and secondary pages are lazy-loaded
const UploadPage = lazy(() => import('./pages/UploadPage'));
const ViewerPage = lazy(() => import('./pages/ViewerPage'));
const ResultsPage = lazy(() => import('./pages/ResultsPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ClassificationPage = lazy(() => import('./pages/ClassificationPage'));
const AdaptiveDashboardPage = lazy(() => import('./pages/AdaptiveDashboardPage'));
const ModelLabPage = lazy(() => import('./pages/ModelLabPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const ReportPage = lazy(() => import('./pages/ReportPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function ClinicalLoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-400">
      <div className="w-8 h-8 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
      <span className="text-xs font-mono text-[#64748B]">Loading Clinical Module...</span>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App ErrorBoundary caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: '#ff6b6b', background: '#0a0f18', height: '100vh', overflow: 'auto', fontFamily: 'monospace' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Application Render Error:</h2>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: '1rem', background: '#141c2b', padding: '1rem', borderRadius: '8px', color: '#fca5a5' }}>
            {this.state.error?.toString()}
          </pre>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: '1rem', background: '#141c2b', padding: '1rem', borderRadius: '8px', color: '#94a3b8', fontSize: '0.85rem' }}>
            {this.state.errorInfo?.componentStack}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab) return tab;
    }
    return 'overview';
  });
  const [liveResult, setLiveResult] = useState(null);
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('nointro') === 'true' || params.get('tab')) return false;
    }
    return true;
  });

  const handleTabChange = (nextTab) => {
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
      smoothScrollToTop();
    }
  };

  const handleSegmentationComplete = (result) => {
    setLiveResult(result);
    handleTabChange('results');
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
            onOpenViewer={(sessionData) => {
              setLiveResult(sessionData);
              setActiveTab('viewer');
            }}
          />
        );
      case 'viewer':
        return <ViewerPage currentResult={liveResult} onNavigate={setActiveTab} />;
      case 'adaptive':
        return (
          <AdaptiveDashboardPage 
            onNavigate={setActiveTab}
            onOpenPatientInViewer={(patientId) => {
              setLiveResult({ session_id: patientId });
              setActiveTab('viewer');
            }}
          />
        );
      case 'models':
        return <ModelLabPage onNavigate={setActiveTab} />;
      case 'analytics':
        return <AnalyticsPage onNavigate={setActiveTab} />;
      case 'reports':
        return (
          <ReportPage 
            currentResult={liveResult} 
            onNavigate={setActiveTab} 
          />
        );
      case 'settings':
        return <SettingsPage onNavigate={setActiveTab} />;
      case 'results':
        return (
          <ResultsPage 
            currentResult={liveResult} 
            onNavigate={setActiveTab} 
            onClearLiveResult={() => setLiveResult(null)}
          />
        );
      case 'about':
        return <AboutPage onNavigate={setActiveTab} />;
      default:
        return <OverviewPage onNavigate={setActiveTab} />;
    }
  };

  return (
    <ErrorBoundary>
      {showIntro && (
        <CinematicIntro onComplete={() => setShowIntro(false)} />
      )}
      <VoiceProvider
        activeTab={activeTab}
        onNavigate={handleTabChange}
        onPlayIntro={() => setShowIntro(true)}
      >
        <AppLayout 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
          onPlayIntro={() => setShowIntro(true)}
        >
          <ErrorBoundary>
            <Suspense fallback={<ClinicalLoadingFallback />}>
              <PageTransition pageKey={activeTab}>
                {renderActivePage()}
              </PageTransition>
            </Suspense>
          </ErrorBoundary>
        </AppLayout>
      </VoiceProvider>
    </ErrorBoundary>
  );
}
