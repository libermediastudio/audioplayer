import React from 'react';
import { createRoot } from 'react-dom/client';
import AudioVisualizer from './src/components/AudioVisualizer';
import './src/styles.css';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <AudioVisualizer />
  </React.StrictMode>
);