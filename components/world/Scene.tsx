'use client';

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SkyDome } from './Sky';
import { Ocean } from './Ocean';
import { Terrain } from './Terrain';
import { Roads } from './Roads';
import { Cityscape } from './Cityscape';
import { Props } from './Props';
import { Landmarks } from './Landmarks';
import { Traffic } from './Traffic';
import { Player } from './Player';
import { setState } from '@/lib/store';

function Ready() {
  useEffect(() => {
    const id = requestAnimationFrame(() => setState({ loaded: true }));
    return () => cancelAnimationFrame(id);
  }, []);
  return null;
}

export function Scene() {
  const { gl, camera, scene } = useThree();

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 0.92;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    (window as unknown as Record<string, unknown>).__three = { gl, camera, scene };
  }, [gl, camera, scene]);

  return (
    <>
      <SkyDome />
      <Terrain />
      <Ocean />
      <Roads />
      <Cityscape />
      <Landmarks />
      <Props />
      <Traffic />
      <Player />
      <Ready />
    </>
  );
}
