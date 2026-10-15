import { useState, useEffect } from 'react';
import { checkHealth } from '../api/segmentation';

export function useServerStatus() {
  const [status, setStatus] = useState('checking'); // 'checking' | 'ready' | 'offline'
  const [lastCheck, setLastCheck] = useState(null);

  const verifyHealth = async () => {
    try {
      const res = await checkHealth();
      if (res && res.status === 'ok') {
        setStatus('ready');
      } else {
        setStatus('offline');
      }
    } catch {
      setStatus('offline');
    } finally {
      setLastCheck(new Date());
    }
  };

  useEffect(() => {
    verifyHealth();
    const interval = setInterval(verifyHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  return { status, lastCheck, refresh: verifyHealth };
}
