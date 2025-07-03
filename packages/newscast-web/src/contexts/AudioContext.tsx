import React, { createContext, useContext, ReactNode } from 'react';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import type { AudioState, AudioActions } from '../types/newscast';

interface AudioContextValue {
  state: AudioState;
  actions: AudioActions;
  isLoading: boolean;
}

const AudioContext = createContext<AudioContextValue | undefined>(undefined);

interface AudioProviderProps {
  children: ReactNode;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
  const audioPlayer = useAudioPlayer();

  return (
    <AudioContext.Provider value={audioPlayer}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudioContext = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudioContext must be used within an AudioProvider');
  }
  return context;
};