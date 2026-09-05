'use client';

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { cops } from '@/lib/game/police';
import { CarView } from './CarView';

/**
 * Whatever is currently chasing you. Never more than seven, so they are drawn
 * individually rather than instanced — they need their own light bars, and at
 * that count it costs nothing.
 */
export function Police() {
  // The roster is a plain array the simulation mutates, so React has to be
  // told when a unit joins or is left behind.
  const [, bump] = useState(0);
  const seen = useRef(0);
  useFrame(() => {
    if (cops.length !== seen.current) {
      seen.current = cops.length;
      bump((n) => n + 1);
    }
  });

  return (
    <group>
      {cops.map((c, i) => (
        <CarView key={i} car={c.car} />
      ))}
    </group>
  );
}
