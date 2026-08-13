'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SkyDome } from './Sky';
import { Ocean } from './Ocean';
import { Terrain } from './Terrain';
import { Roads } from './Roads';
import { Streets } from './Streets';
import { Cityscape } from './Cityscape';
import { Props } from './Props';
import { StreetLife } from './StreetLife';
import { Landmarks } from './Landmarks';
import { Traffic } from './Traffic';
import { Player } from './Player';
import { setState } from '@/lib/store';

function Ready() {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    setState({ loaded: true });
  });
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
      <Streets />
      <Roads />
      <Cityscape />
      <Landmarks />
      <Props />
      <StreetLife />
      <Traffic />
      <Player />
      <Ready />
    </>
  );
}
