import React, { useState } from 'react';
import AppLayout from './layouts/AppLayout';
import OverviewPage from './pages/OverviewPage';
import UploadPage from './pages/UploadPage';
import ViewerPage from './pages/ViewerPage';
import ResultsPage from './pages/ResultsPage';
import AboutPage from './pages/AboutPage';
import ClassificationPage from './pages/ClassificationPage';
import AdaptiveDashboardPage from './pages/AdaptiveDashboardPage';
import ModelLabPage from './pages/ModelLabPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ReportPage from './pages/ReportPage';
import SettingsPage from './pages/SettingsPage';
import CinematicIntro from './components/CinematicIntro';
import { VoiceControlProvider } from './context/VoiceControlContext';
import { GestureControlProvider } from './context/GestureControlContext';

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
  const [activeTab, setActiveTab] = useState('overview');
  const [liveResult, setLiveResult] = useState(null);
  const [showIntro, setShowIntro] = useState(true);

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
      <GestureControlProvider>
        <VoiceControlProvider
          activeTab={activeTab}
          onNavigate={setActiveTab}
          onPlayIntro={() => setShowIntro(true)}
        >
          <AppLayout 
            activeTab={activeTab} 
            onTabChange={setActiveTab}
            onPlayIntro={() => setShowIntro(true)}
          >
            <ErrorBoundary>
              {renderActivePage()}
            </ErrorBoundary>
          </AppLayout>
        </VoiceControlProvider>
      </GestureControlProvider>
    </ErrorBoundary>
  );
}

