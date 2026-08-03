'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { Scene } from './Scene';

export function World() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.6]}
      camera={{ fov: 70, near: 0.4, far: 9500, position: [90, 1.7, 8] }}
      gl={{ antialias: true, powerPreference: 'high-performance', stencil: false }}
      style={{ position: 'fixed', inset: 0 }}
    >
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  );
}
