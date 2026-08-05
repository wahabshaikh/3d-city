'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Hud } from './hud/Hud';
import { setState } from '@/lib/store';

// The world touches `document` while it builds its textures, so it is strictly
// client-side.
const World = dynamic(() => import('./world/World').then((m) => m.World), {
  ssr: false,
});

export function Explorer() {
  useEffect(() => {
    setState({ loaded: false, locked: false, paused: false, showMap: false, showHelp: false });
    return () => setState({ locked: false, paused: false, showMap: false, showHelp: false });
  }, []);

  return (
    <main style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#0a0710' }}>
      <World />
      <Hud />
    </main>
  );
}
