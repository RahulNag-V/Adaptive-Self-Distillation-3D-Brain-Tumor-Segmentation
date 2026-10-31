import React, { createContext, useContext } from 'react';
import { useGestureControl } from '../hooks/useGestureControl';

const GestureControlContext = createContext(null);

export function GestureControlProvider({ children }) {
  const gestureControl = useGestureControl();

  return (
    <GestureControlContext.Provider value={gestureControl}>
      {children}
    </GestureControlContext.Provider>
  );
}

export function useGestureContext() {
  const context = useContext(GestureControlContext);
  if (!context) {
    throw new Error('useGestureContext must be used within a GestureControlProvider');
  }
  return context;
}

