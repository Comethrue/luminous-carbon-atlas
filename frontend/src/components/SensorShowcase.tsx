import { useRef, useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';
import { SensorShowcaseOverlay } from './SensorShowcaseOverlay';

export type ModuleId = 'overview' | 'compression' | 'fusion' | 'dqn' | 'classroom' | 'ablation';

interface CameraKeyframe { time: number; pos: [number, number, number]; lookAt: [number, number, number]; }

const CAMERA_KEYFRAMES: CameraKeyframe[] = [
  { time: 0,  pos: [0, 4, 10],   lookAt: [0, 0.5, 0] },
  { time: 10, pos: [0, 2, 5.5],  lookAt: [0, 0.5, 0] },
  { time: 20, pos: [3.5, 1.2, 2.5], lookAt: [0, 0.4, 0] },
  { time: 30, pos: [-3, 2.5, 3], lookAt: [0, 0, 0] },
  { time: 40, pos: [0, 7, 1.5],  lookAt: [0, -0.5, 0] },
  { time: 50, pos: [5, 1.5, 7],  lookAt: [0, 0, -1] },
  { time: 57, pos: [0, 4, 10],   lookAt: [0, 0.5, 0] },
];

const MODULE_LIST: { id: ModuleId; label: string; sub: string }[] = [
  { id: 'overview', label: '总览', sub: '全链路' },
  { id: 'compression', label: '模型压缩', sub: '240→1.2MB' },
  { id: 'fusion', label: 'D-S 融合', sub: '证据理论' },
  { id: 'dqn', label: 'DQN 决策', sub: '288状态' },
  { id: 'classroom', label: '教室控灯', sub: '3区+自然光' },
  { id: 'ablation', label: '消融实验', sub: '65→98.7%' },
];

const AUTO_PLAY_DURATION = 60;
const CHIP_COLOR = '#1A1A28';
const PCB_COLOR = '#0D1628';
const GOLD = '#C8A96E';
const GOLD_DIM = '#A89050';
const WARM_WHITE = '#F5F0E8';
const WARM_GRAY = '#8A8578';

// ═══════════════════════ LIGHTING ═══════════════════════
function LightingSetup() {
  return (
    <>
      <ambientLight intensity={0.18} color="#08080C" />
      <directionalLight position={[0, 8, 2]} intensity={2.5} color={WARM_WHITE} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-far={30} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} />
      <directionalLight position={[0, -1, 3]} intensity={0.35} color={WARM_GRAY} />
      <directionalLight position={[0, 3, -4]} intensity={1.4} color={GOLD} />
      <pointLight position={[0, 0.6, 0]} intensity={0} color={GOLD} distance={3} />
    </>
  );
}

// ═══════════════════════ DUST ═══════════════════════
function AtmosphericDust() {
  const count = 60;
  const meshRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => { const p = new Float32Array(count * 3); for (let i = 0; i < count; i++) { p[i * 3] = (Math.random() - 0.5) * 16; p[i * 3 + 1] = (Math.random() - 0.5) * 10; p[i * 3 + 2] = (Math.random() - 0.5) * 12; } return p; }, []);
  const speeds = useMemo(() => Array.from({ length: count }, () => 0.01 + Math.random() * 0.06), []);
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const pos = meshRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) { pos[i * 3 + 1] += speeds[i] * delta; if (pos[i * 3 + 1] > 5) pos[i * 3 + 1] = -5; if (pos[i * 3 + 1] < -5) pos[i * 3 + 1] = 5; }
    meshRef.current.geometry.attributes.position.needsUpdate = true;
  });
  return <points ref={meshRef}><bufferGeometry><bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} /></bufferGeometry><pointsMaterial size={0.012} color={GOLD} transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} /></points>;
}

// ═══════════════════════ DETAILED Q6A BOARD ═══════════════════════
function DetailedQ6ABoard({ npuActive = 0 }: { npuActive?: number }) {
  const npuGridRef = useRef<THREE.Group>(null);
  const coreCount = 64; // Simulated NPU cores as a grid

  return (
    <group position={[0, 0.4, 0]}>
      {/* ── Main PCB ── */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.6, 0.14, 2.6]} />
        <meshStandardMaterial color={PCB_COLOR} roughness={0.22} metalness={0.08} />
      </mesh>
      {/* PCB edge chamfer - top */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[3.55, 0.02, 2.55]} />
        <meshStandardMaterial color="#162440" roughness={0.2} metalness={0.05} />
      </mesh>
      {/* Copper trace accent lines */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={`trace-${i}`} position={[-1.5 + i * 0.7, 0.075, -1]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.06, 1.8]} />
          <meshBasicMaterial color={GOLD_DIM} transparent opacity={0.12} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* ── Mounting holes ── */}
      {[[-1.6, -1.1], [1.6, -1.1], [-1.6, 1.1], [1.6, 1.1]].map(([x, z], i) => (
        <group key={`hole-${i}`} position={[x, 0, z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.12, 0.18, 32]} />
            <meshStandardMaterial color={GOLD} roughness={0.3} metalness={0.85} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      {/* ── RK3588 SoC (center) ── */}
      <group position={[0, 0.15, 0]}>
        {/* Chip substrate */}
        <mesh castShadow>
          <boxGeometry args={[1.4, 0.15, 1.4]} />
          <meshStandardMaterial color="#1E1E2E" roughness={0.12} metalness={0.35} />
        </mesh>
        {/* Die top surface */}
        <mesh position={[0, 0.09, 0]}>
          <boxGeometry args={[1.25, 0.04, 1.25]} />
          <meshStandardMaterial color="#252535" roughness={0.08} metalness={0.4} />
        </mesh>
        {/* Silicon die engraving */}
        <mesh position={[0, 0.115, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.9, 0.9]} />
          <meshBasicMaterial color="#2A2A38" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>

        {/* NPU Compute Unit Grid (64 cores) on die surface */}
        <group ref={npuGridRef} position={[0, 0.12, 0]}>
          {Array.from({ length: 8 }).map((_, row) =>
            Array.from({ length: 8 }).map((_, col) => {
              const idx = row * 8 + col;
              const wave = Math.sin(idx * 0.3 + npuActive * 8) * 0.5 + 0.5;
              return (
                <mesh key={`core-${idx}`} position={[(col - 3.5) * 0.12, 0, (row - 3.5) * 0.12]}>
                  <boxGeometry args={[0.08, 0.01, 0.08]} />
                  <meshStandardMaterial color={GOLD} roughness={0.1} metalness={0.6} emissive={GOLD} emissiveIntensity={0.1 + wave * npuActive * 0.9} />
                </mesh>
              );
            })
          )}
        </group>

        {/* Chip corner dot (pin 1 marker) */}
        <mesh position={[-0.65, 0.12, -0.65]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial color={GOLD} roughness={0.1} metalness={0.9} emissive={GOLD} emissiveIntensity={0.5} />
        </mesh>
      </group>

      {/* ── Surrounding DRAM chips (4x LPDDR4) ── */}
      {[[-0.9, -1], [0.9, -1], [-0.9, 1], [0.9, 1]].map(([dx, dz], i) => (
        <group key={`dram-${i}`} position={[dx, 0.11, dz]}>
          <mesh castShadow>
            <boxGeometry args={[0.35, 0.08, 0.25]} />
            <meshStandardMaterial color="#1A1A26" roughness={0.15} metalness={0.3} />
          </mesh>
          {/* DRAM top surface */}
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[0.3, 0.02, 0.2]} />
            <meshStandardMaterial color="#222230" roughness={0.1} metalness={0.35} />
          </mesh>
        </group>
      ))}

      {/* ── PMIC (power management) ── */}
      <group position={[-1.2, 0.11, -0.5]}>
        <mesh castShadow>
          <boxGeometry args={[0.3, 0.08, 0.3]} />
          <meshStandardMaterial color="#1A1A24" roughness={0.2} metalness={0.2} />
        </mesh>
        {/* Inductor coils (small silver cubes) */}
        {[[-0.08, 0.05, -0.08], [0.08, 0.05, -0.08], [-0.08, 0.05, 0.08], [0.08, 0.05, 0.08]].map(([ix, iy, iz], j) => (
          <mesh key={`ind-${j}`} position={[ix, iy, iz]}>
            <boxGeometry args={[0.08, 0.04, 0.08]} />
            <meshStandardMaterial color="#C0C0C8" roughness={0.2} metalness={0.7} />
          </mesh>
        ))}
      </group>

      {/* ── eMMC / Flash storage ── */}
      <group position={[1.15, 0.11, -0.5]}>
        <mesh castShadow>
          <boxGeometry args={[0.4, 0.08, 0.35]} />
          <meshStandardMaterial color="#181824" roughness={0.18} metalness={0.25} />
        </mesh>
      </group>

      {/* ── WiFi/BT module ── */}
      <group position={[1.3, 0.1, 0.8]}>
        <mesh castShadow>
          <boxGeometry args={[0.35, 0.06, 0.3]} />
          <meshStandardMaterial color="#1C1C28" roughness={0.2} metalness={0.25} />
        </mesh>
        {/* Antenna trace */}
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.2, 0.15]} />
          <meshBasicMaterial color={GOLD_DIM} transparent opacity={0.2} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* ── 40-Pin GPIO Header ── */}
      <group position={[-1.55, 0.18, -0.3]}>
        <mesh>
          <boxGeometry args={[0.1, 0.25, 1.5]} />
          <meshStandardMaterial color="#0A0A10" roughness={0.4} metalness={0.1} />
        </mesh>
        {Array.from({ length: 20 }).map((_, i) => (
          <group key={`gpio-${i}`} position={[0, 0.1, -0.7 + i * 0.074]}>
            <mesh>
              <cylinderGeometry args={[0.02, 0.02, 0.12, 8]} />
              <meshStandardMaterial color={GOLD} roughness={0.2} metalness={0.9} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ── Connectors ── */}
      {/* USB-C */}
      <group position={[-1.8, 0.05, 1]}>
        <mesh>
          <boxGeometry args={[0.08, 0.09, 0.25]} />
          <meshStandardMaterial color="#AAA" roughness={0.3} metalness={0.55} />
        </mesh>
      </group>
      {/* HDMI */}
      <group position={[-1.8, 0.05, 0.55]}>
        <mesh>
          <boxGeometry args={[0.08, 0.08, 0.3]} />
          <meshStandardMaterial color="#AAA" roughness={0.3} metalness={0.55} />
        </mesh>
      </group>
      {/* CSI camera connectors */}
      {[[-1.8, 0.05, -0.7], [-1.8, 0.05, -0.95]].map(([x, y, z], i) => (
        <group key={`csi-${i}`} position={[x, y, z]}>
          <mesh>
            <boxGeometry args={[0.06, 0.05, 0.15]} />
            <meshStandardMaterial color="#CCC" roughness={0.25} metalness={0.6} />
          </mesh>
        </group>
      ))}
      {/* Ethernet jack */}
      <group position={[1.8, 0.05, -1]}>
        <mesh>
          <boxGeometry args={[0.1, 0.11, 0.3]} />
          <meshStandardMaterial color="#999" roughness={0.25} metalness={0.5} />
        </mesh>
      </group>

      {/* ── NPU Activity Ring (pulses around the SoC when computing) ── */}
      {npuActive > 0.1 && (
        <mesh position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.65, 0.72, 80]} />
          <meshBasicMaterial color={GOLD} side={THREE.DoubleSide} transparent opacity={0.15 + npuActive * 0.35} />
        </mesh>
      )}
      {/* Outer activity ripple */}
      {npuActive > 0.3 && (
        <mesh position={[0, 0.21, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.73, 0.78, 80]} />
          <meshBasicMaterial color={GOLD} side={THREE.DoubleSide} transparent opacity={0.06 + npuActive * 0.2} />
        </mesh>
      )}
    </group>
  );
}

// ═══════════════════════ MODEL COMPRESSION ═══════════════════════
function ModelCompressionVisual({ progress = 0 }: { progress: number }) {
  const p = progress;
  const bigS = p < 0.5 ? 1 : Math.max(0.03, 1 - (p - 0.5) * 1.94);
  const smallS = p < 0.5 ? 0 : Math.min(1, (p - 0.5) * 2);
  const laserOn = p > 0.15 && p < 0.6;
  const sparkleCount = 30;

  return (
    <group position={[0, 1.8, -2]}>
      {/* Giant weight matrix (visual model representation) */}
      <group position={[-2, 0, 0]} scale={[bigS, bigS, bigS]}>
        {/* Weight value grid */}
        {Array.from({ length: 10 }).map((_, r) =>
          Array.from({ length: 10 }).map((_, c) => {
            const alive = (r + c) % 3 !== 0 || p < 0.4; // pruning removes every 3rd
            return (
              <mesh key={`w-${r}-${c}`} position={[(c - 4.5) * 0.16, (r - 4.5) * 0.16, 0]}>
                <boxGeometry args={[0.1, 0.1, 0.02]} />
                <meshStandardMaterial
                  color={alive ? '#5A6A85' : '#1A1A20'}
                  roughness={alive ? 0.4 : 0.9}
                  emissive={alive ? '#000' : '#FF3B3020'}
                  emissiveIntensity={alive ? 0 : 0.5}
                  transparent={!alive}
                  opacity={alive ? 1 : 0.2 + (1 - p) * 0.5}
                />
              </mesh>
            );
          })
        )}
        {/* Wireframe shell */}
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(1.5, 1.5, 0.02)]} />
          <lineBasicMaterial color={GOLD} transparent opacity={0.25 * bigS} />
        </lineSegments>
      </group>

      {/* Laser cutting line */}
      {laserOn && (
        <group position={[0, 0, 0]}>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <planeGeometry args={[3, 0.015]} />
            <meshBasicMaterial color={GOLD} transparent opacity={0.9} side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[0, 0, -Math.PI / 4]}>
            <planeGeometry args={[3, 0.015]} />
            <meshBasicMaterial color={GOLD} transparent opacity={0.9} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* Result: compact golden model */}
      {smallS > 0 && (
        <group position={[2, 0, 0]} scale={[smallS, smallS, smallS]}>
          <mesh>
            <boxGeometry args={[0.45, 0.45, 0.45]} />
            <meshStandardMaterial color={GOLD} roughness={0.08} metalness={0.5} emissive={GOLD} emissiveIntensity={0.3 + smallS * 0.5} />
          </mesh>
          {/* Sparkle particles around compressed model */}
          <points>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" count={sparkleCount} array={useMemo(() => { const a = new Float32Array(sparkleCount * 3); for (let i = 0; i < sparkleCount; i++) { a[i * 3] = (Math.random() - 0.5) * 0.8; a[i * 3 + 1] = (Math.random() - 0.5) * 0.8; a[i * 3 + 2] = (Math.random() - 0.5) * 0.8; } return a; }, [])} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={0.03} color={GOLD} transparent opacity={smallS * 0.7} depthWrite={false} blending={THREE.AdditiveBlending} />
          </points>
        </group>
      )}

      {/* Arrow from big to small */}
      {p > 0.3 && (
        <Line points={[[-2 + p * 3, 0, 0], [2, 0, 0]]} color={GOLD} lineWidth={0.8} transparent opacity={smallS * 1.5} />
      )}
    </group>
  );
}

// ═══════════════════════ D-S FUSION ═══════════════════════
function DSFusionStreams({ progress = 0 }: { progress: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const pCount = 60;

  return (
    <group ref={groupRef} position={[0, 0.85, 0]}>
      {/* Bezier paths for streams */}
      {(['radar', 'vision'] as const).map((source, si) => {
        const startX = si === 0 ? -3.5 : 3.5;
        const color = si === 0 ? '#E89888' : '#88A8D8';
        const label = si === 0 ? 'm1 雷达证据' : 'm2 视觉证据';

        return (
          <group key={source}>
            {/* Curved stream using multiple line segments */}
            {Array.from({ length: 8 }).map((_, li) => {
              const t0 = (li / 8);
              const t1 = ((li + 1) / 8);
              const cp = { x: startX * (1 - t0), y: 0.3 + Math.sin(t0 * Math.PI) * 0.4, z: 0 };
              const np = { x: startX * (1 - t1), y: 0.3 + Math.sin(t1 * Math.PI) * 0.4, z: 0 };
              const alpha = li / 8 * 0.8 + 0.2;
              return (
                <Line
                  key={`${source}-${li}`}
                  points={[[cp.x, cp.y, cp.z], [np.x, np.y, np.z]]}
                  color={color}
                  lineWidth={0.6 + (li / 8) * 0.8}
                  transparent
                  opacity={alpha * progress}
                />
              );
            })}
            {/* Flowing particles along the stream */}
            <StreamParticles startX={startX} color={color} progress={progress} />
          </group>
        );
      })}

      {/* Collision point on chip surface */}
      {progress > 0.35 && (
        <group position={[0, 0.22, 0]}>
          {/* Inner core */}
          <mesh>
            <sphereGeometry args={[0.06 + progress * 0.12, 48, 48]} />
            <meshBasicMaterial color={WARM_WHITE} transparent opacity={progress * 0.9} />
          </mesh>
          {/* Outer glow */}
          <mesh>
            <sphereGeometry args={[0.12 + progress * 0.2, 32, 32]} />
            <meshBasicMaterial color={WARM_WHITE} transparent opacity={progress * 0.25} />
          </mesh>
          {/* Outermost ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.16 + progress * 0.2, 0.18 + progress * 0.2, 64]} />
            <meshBasicMaterial color={GOLD} side={THREE.DoubleSide} transparent opacity={progress * 0.4} />
          </mesh>
        </group>
      )}

      {/* Confidence output number */}
      {progress > 0.5 && (
        <group position={[0, 0.4, 0]}>
          {/* Small glow indicating "decision made" */}
          <mesh>
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshBasicMaterial color="#34C759" transparent opacity={progress * 0.8} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function StreamParticles({ startX, color, progress }: { startX: number; color: string; progress: number }) {
  const count = 25;
  const positions = useMemo(() => new Float32Array(count * 3), []);
  const offsets = useMemo(() => Array.from({ length: count }, () => Math.random()), []);
  useFrame(() => {
    const t = performance.now() * 0.0008;
    for (let i = 0; i < count; i++) {
      const ot = ((offsets[i] + t) % 1);
      positions[i * 3] = startX * (1 - ot);
      positions[i * 3 + 1] = 0.22 + Math.sin(ot * Math.PI) * 0.4;
      positions[i * 3 + 2] = 0;
    }
  });
  return (
    <points>
      <bufferGeometry><bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} /></bufferGeometry>
      <pointsMaterial size={0.03} color={color} transparent opacity={0.75 * progress} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

// ═══════════════════════ DQN LATTICE ═══════════════════════
function DQNLattice({ progress = 0, autoTime = 0 }: { progress?: number; autoTime?: number }) {
  const cols = 8, rows = 4; // 8×4 projection of 288 states
  const highlightIdx = Math.floor(autoTime * 4) % (cols * rows);
  const waveCenter = highlightIdx;

  return (
    <group position={[0, 1.5, -2.5]}>
      {/* Lattice frame */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(cols * 0.3 + 0.3, rows * 0.3 + 0.3, 0.3)]} />
        <lineBasicMaterial color={GOLD_DIM} transparent opacity={0.15} />
      </lineSegments>

      {/* State cells */}
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => {
          const idx = r * cols + c;
          const dist = Math.sqrt((c - waveCenter % cols) ** 2 + (r - Math.floor(waveCenter / cols)) ** 2);
          const wave = Math.max(0, 1 - dist / 3) * (0.5 + 0.5 * Math.sin(progress * 8 - dist * 0.6));
          const isActive = idx === highlightIdx;
          const qValue = ((idx % 13) * 3 + (c % 5) * 2) % 100 / 100; // Pseudo Q-value

          return (
            <mesh key={`cell-${idx}`} position={[(c - (cols - 1) / 2) * 0.3, (r - (rows - 1) / 2) * 0.3, 0]}>
              <boxGeometry args={[0.22, 0.22, 0.18]} />
              <meshStandardMaterial
                color={isActive ? GOLD : new THREE.Color().setHSL(0.12, 0.3, 0.15 + qValue * 0.4)}
                roughness={isActive ? 0.1 : 0.5}
                metalness={isActive ? 0.5 : 0.1}
                emissive={isActive ? GOLD : new THREE.Color().setHSL(0.12, 0.5, 0.05 + qValue * 0.3)}
                emissiveIntensity={isActive ? 0.9 : wave * 0.4}
              />
            </mesh>
          );
        })
      )}

      {/* Action arrows radiating from active state */}
      {Array.from({ length: 9 }).map((_, i) => {
        const angle = (i / 9) * Math.PI * 2;
        const dx = Math.cos(angle) * 0.5;
        const dy = Math.sin(angle) * 0.5;
        const isBest = i === 3; // Simulate best action
        const col = highlightIdx % cols;
        const row = Math.floor(highlightIdx / cols);
        return (
          <group key={`arrow-${i}`} position={[(col - (cols - 1) / 2) * 0.3, (row - (rows - 1) / 2) * 0.3, 0]}>
            <mesh position={[dx * 0.5, dy * 0.5, 0.2]} rotation={[0, 0, angle]}>
              <coneGeometry args={[0.04, 0.12, 6]} />
              <meshStandardMaterial
                color={isBest ? GOLD : WARM_GRAY}
                roughness={0.1}
                metalness={isBest ? 0.6 : 0.2}
                emissive={isBest ? GOLD : '#000'}
                emissiveIntensity={isBest ? 1.0 : 0}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ═══════════════════════ CLASSROOM ═══════════════════════
function ClassroomZone({ activeZones = [true, true, false], naturalLight = 0.5, progress = 0 }: { activeZones?: boolean[]; naturalLight?: number; progress?: number }) {
  return (
    <group position={[0, 0.3, 0]}>
      {/* Floor with subtle grid */}
      <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[7, 5.5]} />
        <meshStandardMaterial color="#14141A" roughness={0.7} />
      </mesh>
      {/* Floor grid lines */}
      {Array.from({ length: 8 }).map((_, i) => (
        <Line key={`fg-${i}`} points={[[-3.5 + i, -0.99, -2.7], [-3.5 + i, -0.99, 2.7]]} color="#222" lineWidth={0.3} transparent opacity={0.3} />
      ))}

      {/* Back wall */}
      <mesh position={[0, 0.3, -2.7]} receiveShadow>
        <boxGeometry args={[7, 2.5, 0.08]} />
        <meshStandardMaterial color="#1A1A24" roughness={0.5} />
      </mesh>
      {/* Front wall (podium side) */}
      <mesh position={[0, 0.3, 2.7]}>
        <boxGeometry args={[7, 2.5, 0.08]} />
        <meshStandardMaterial color="#1C1C26" roughness={0.5} />
      </mesh>

      {/* Right wall with window cutout */}
      <mesh position={[3.5, 0.3, 0]}>
        <boxGeometry args={[0.08, 2.5, 5.5]} />
        <meshStandardMaterial color="#1E1E28" roughness={0.5} />
      </mesh>
      {/* Window frame (golden trim) */}
      <mesh position={[3.45, 0.4, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[4, 1.6]} />
        <meshStandardMaterial color={WARM_WHITE} roughness={0.05} emissive={WARM_WHITE} emissiveIntensity={naturalLight * 1.5} transparent opacity={0.65} side={THREE.DoubleSide} />
      </mesh>
      {/* Window golden frame */}
      <mesh position={[3.44, 0.4, -2]}>
        <boxGeometry args={[0.02, 1.6, 0.04]} />
        <meshStandardMaterial color={GOLD} roughness={0.2} metalness={0.7} />
      </mesh>
      <mesh position={[3.44, 0.4, 2]}>
        <boxGeometry args={[0.02, 1.6, 0.04]} />
        <meshStandardMaterial color={GOLD} roughness={0.2} metalness={0.7} />
      </mesh>

      {/* 3 Zone light bars */}
      {[-2, 0, 2].map((lx, i) => {
        const active = activeZones[i];
        const brightness = active ? (i === 1 && naturalLight > 0.4 ? 0.3 : 1) : 0;
        return (
          <group key={`zone-${i}`} position={[lx, 1.1, 0]}>
            {/* Light fixture housing */}
            <mesh>
              <boxGeometry args={[1.4, 0.06, 0.25]} />
              <meshStandardMaterial color="#2A2A35" roughness={0.3} metalness={0.3} />
            </mesh>
            {/* Light emitting surface */}
            <mesh position={[0, -0.04, 0]}>
              <boxGeometry args={[1.2, 0.02, 0.18]} />
              <meshStandardMaterial
                color={WARM_WHITE}
                roughness={0.05}
                emissive={WARM_WHITE}
                emissiveIntensity={brightness * 1.8}
              />
            </mesh>
            {/* Light cone */}
            {brightness > 0 && (
              <mesh position={[0, -0.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.5, 1.3, 1, 16, 1, true]} />
                <meshBasicMaterial color={WARM_WHITE} transparent opacity={0.04 * brightness} side={THREE.DoubleSide} depthWrite={false} />
              </mesh>
            )}
            {/* Zone label on floor */}
            <mesh position={[0, -1.1, 0.8]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.6, 0.3]} />
              <meshBasicMaterial color={active ? GOLD : '#333'} transparent opacity={0.6} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}

      {/* Desks (3 rows × 4 cols) */}
      {Array.from({ length: 3 }).map((_, r) =>
        Array.from({ length: 4 }).map((_, c) => (
          <group key={`desk-${r}-${c}`} position={[-2.25 + c * 1.5, -0.8, -1.3 + r * 1.3]}>
            <mesh castShadow>
              <boxGeometry args={[1.1, 0.08, 0.55]} />
              <meshStandardMaterial color="#22222C" roughness={0.45} />
            </mesh>
            {/* Desk legs */}
            {[[-0.45, 0, -0.2], [0.45, 0, -0.2], [-0.45, 0, 0.2], [0.45, 0, 0.2]].map(([lx, ly, lz], li) => (
              <mesh key={`leg-${li}`} position={[lx, -0.25, lz]}>
                <cylinderGeometry args={[0.02, 0.02, 0.45, 6]} />
                <meshStandardMaterial color="#444" roughness={0.3} metalness={0.4} />
              </mesh>
            ))}
          </group>
        ))
      )}

      {/* Person dots with breathing animation */}
      {[[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [0, 2], [2, 2], [3, 1]].map(([c, r], i) => {
        const breathe = 0.6 + 0.4 * Math.sin(performance.now() * 0.003 + i);
        return (
          <group key={`person-${i}`} position={[-2.25 + c * 1.5, -0.65, -1.3 + r * 1.3]}>
            <mesh>
              <sphereGeometry args={[0.14 * breathe, 20, 20]} />
              <meshStandardMaterial color={GOLD} roughness={0.15} emissive={GOLD} emissiveIntensity={0.3 + breathe * 0.4} />
            </mesh>
            {/* Subtle seat glow */}
            <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.1, 0.18, 24]} />
              <meshBasicMaterial color={GOLD} side={THREE.DoubleSide} transparent opacity={0.15 * breathe} />
            </mesh>
          </group>
        );
      })}

      {/* Podium */}
      <mesh position={[0, -0.75, 2.3]} castShadow>
        <boxGeometry args={[2, 0.15, 0.6]} />
        <meshStandardMaterial color="#2A2A32" roughness={0.4} />
      </mesh>
    </group>
  );
}

// ═══════════════════════ ABLATION PILLARS ═══════════════════════
function AblationPillars({ progress = 0 }: { progress: number }) {
  const data = [
    { label: '纯红外', acc: 65, color: '#2A2A38' },
    { label: '+雷达', acc: 76, color: '#3A3A48' },
    { label: '+视觉', acc: 85, color: '#505868' },
    { label: '+D-S融', acc: 93, color: '#687888' },
    { label: '+滞回', acc: 93, color: '#8098A0' },
    { label: '+DQN', acc: 98.7, color: GOLD },
  ];

  return (
    <group position={[0, -0.3, -1.5]}>
      {/* Base platform */}
      <mesh position={[0, -0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[8, 0.08, 1]} />
        <meshStandardMaterial color="#14141A" roughness={0.3} metalness={0.1} />
      </mesh>

      {data.map((d, i) => {
        const h = (d.acc / 100) * 4.5 * Math.min(1, Math.max(0, progress * 6 - i * 0.7));
        const isLast = i === 5;
        const finalComplete = isLast && progress > 0.85;
        return (
          <group key={i} position={[-3.5 + i * 1.4, h / 2, 0]}>
            {/* Pillar body */}
            <mesh castShadow>
              <boxGeometry args={[0.6, Math.max(0.08, h), 0.6]} />
              <meshStandardMaterial
                color={d.color}
                roughness={0.25}
                metalness={0.15}
                emissive={finalComplete ? GOLD : '#000'}
                emissiveIntensity={finalComplete ? 0.8 : 0}
              />
            </mesh>
            {/* Top cap (for the final pillar when complete) */}
            {finalComplete && (
              <mesh position={[0, h / 2 + 0.05, 0]}>
                <torusGeometry args={[0.35, 0.03, 8, 24]} />
                <meshStandardMaterial color={GOLD} roughness={0.1} metalness={0.8} emissive={GOLD} emissiveIntensity={1.2} />
              </mesh>
            )}
            {/* Pillar tip glow */}
            <mesh position={[0, h / 2, 0]}>
              <sphereGeometry args={[0.06, 16, 16]} />
              <meshBasicMaterial color={isLast && h > 3 ? GOLD : d.color} transparent opacity={0.6} />
            </mesh>
          </group>
        );
      })}

      {/* Rising particles from final pillar */}
      {progress > 0.85 && (
        <RisingParticles count={20} position={[4.9, 3, -0.2]} />
      )}
    </group>
  );
}

function RisingParticles({ count, position }: { count: number; position: [number, number, number] }) {
  const ptsRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => new Float32Array(count * 3), []);
  const offsets = useMemo(() => Array.from({ length: count }, () => Math.random()), []);
  useFrame(() => {
    if (!ptsRef.current) return;
    const t = performance.now() * 0.001;
    const p = ptsRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      p[i * 3] = position[0] + (Math.sin(t * 3 + offsets[i] * 10) * 0.3);
      p[i * 3 + 1] = position[1] + ((t * 0.8 + offsets[i] * 2) % 2);
      p[i * 3 + 2] = position[2] + (Math.cos(t * 3 + offsets[i] * 10) * 0.3);
    }
    ptsRef.current.geometry.attributes.position.needsUpdate = true;
  });
  return (
    <points ref={ptsRef}>
      <bufferGeometry><bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} /></bufferGeometry>
      <pointsMaterial size={0.03} color={GOLD} transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

// ═══════════════════════ CAMERA ═══════════════════════
function CameraRig({ mode, moduleId, autoTime }: { mode: 'auto' | 'free'; moduleId: ModuleId; autoTime: number }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const targetPos = useRef(new THREE.Vector3(0, 4, 10));
  const targetLook = useRef(new THREE.Vector3(0, 0.5, 0));

  const moduleCameras: Record<ModuleId, { pos: [number, number, number]; lookAt: [number, number, number] }> = {
    overview:    { pos: [0, 3.5, 8],   lookAt: [0, 0.4, 0] },
    compression: { pos: [-2, 2, 4.5],  lookAt: [0, 1.8, -2] },
    fusion:      { pos: [3, 0.7, 1.8], lookAt: [0, 0.8, 0] },
    dqn:         { pos: [-2.5, 2, 3],  lookAt: [0, 1.5, -2.5] },
    classroom:   { pos: [0, 6.5, 1],   lookAt: [0, -0.3, 0] },
    ablation:    { pos: [5, 1.5, 6],   lookAt: [0, 0, -1.5] },
  };

  useFrame((_, delta) => {
    if (mode === 'auto') {
      const t = autoTime / AUTO_PLAY_DURATION;
      const kfs = CAMERA_KEYFRAMES;
      let i0 = 0;
      for (let i = kfs.length - 1; i >= 0; i--) { if (kfs[i].time / AUTO_PLAY_DURATION <= t) { i0 = i; break; } }
      const i1 = Math.min(i0 + 1, kfs.length - 1);
      const t0 = kfs[i0].time / AUTO_PLAY_DURATION, t1 = kfs[i1].time / AUTO_PLAY_DURATION;
      const lt = t1 > t0 ? Math.min(1, Math.max(0, (t - t0) / (t1 - t0))) : 0;
      const ease = lt < 0.5 ? 4 * lt * lt * lt : 1 - Math.pow(-2 * lt + 2, 3) / 2;
      targetPos.current.lerpVectors(new THREE.Vector3(...kfs[i0].pos), new THREE.Vector3(...kfs[i1].pos), ease);
      targetLook.current.lerpVectors(new THREE.Vector3(...kfs[i0].lookAt), new THREE.Vector3(...kfs[i1].lookAt), ease);
    } else {
      const preset = moduleCameras[moduleId];
      targetPos.current.lerp(new THREE.Vector3(...preset.pos), 3.5 * delta);
      targetLook.current.lerp(new THREE.Vector3(...preset.lookAt), 3.5 * delta);
    }
    camera.position.lerp(targetPos.current, 2.8 * delta);
    const cl = new THREE.Vector3(); camera.getWorldDirection(cl);
    const dl = targetLook.current.clone().sub(camera.position).normalize();
    cl.lerp(dl, 2.8 * delta);
    camera.lookAt(camera.position.clone().add(cl.multiplyScalar(5)));
  });

  return mode === 'free' ? <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.08} minDistance={2} maxDistance={14} target={[0, 0.5, 0]} /> : null;
}

// ═══════════════════════ SCENE CONTENT ═══════════════════════
function SceneContent({ moduleId, autoTime }: { moduleId: ModuleId; autoTime: number }) {
  const modStarts: Record<ModuleId, number> = { overview: 0, compression: 8, fusion: 18, dqn: 28, classroom: 38, ablation: 48 };
  const modEnds: Record<ModuleId, number> = { overview: 8, compression: 18, fusion: 28, dqn: 38, classroom: 48, ablation: 60 };
  const mp = Math.min(1, Math.max(0, (autoTime - (modStarts[moduleId] || 0)) / ((modEnds[moduleId] || 60) - (modStarts[moduleId] || 0))));

  // NPU activity intensity
  const npuActive = useMemo(() => {
    if (moduleId === 'overview') return 0.2 + Math.sin(autoTime * 2.5) * 0.15;
    if (moduleId === 'fusion') return 0.4 + mp * 0.6;
    if (moduleId === 'compression') return 0.15 + mp * 0.2;
    return 0.1;
  }, [moduleId, mp, autoTime]);

  return (
    <>
      {(moduleId === 'overview' || moduleId === 'compression' || moduleId === 'fusion') && (
        <DetailedQ6ABoard npuActive={npuActive} />
      )}
      {moduleId === 'compression' && <ModelCompressionVisual progress={mp} />}
      {moduleId === 'fusion' && <DSFusionStreams progress={mp} />}
      {moduleId === 'dqn' && <DQNLattice progress={mp} autoTime={autoTime} />}
      {moduleId === 'classroom' && (
        <ClassroomZone
          activeZones={[true, mp > 0.3, mp > 0.6]}
          naturalLight={0.25 + mp * 0.65}
          progress={mp}
        />
      )}
      {moduleId === 'ablation' && <AblationPillars progress={mp} />}
    </>
  );
}

// ═══════════════════════ MAIN ═══════════════════════
export function SensorShowcase() {
  const [mode, setMode] = useState<'auto' | 'free'>('auto');
  const [moduleId, setModuleId] = useState<ModuleId>('overview');
  const [autoTime, setAutoTime] = useState(0);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef(0);

  useEffect(() => {
    const el = sectionRef.current; if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !autoPlaying) { setAutoPlaying(true); timeRef.current = 0; setAutoTime(0); setMode('auto'); setModuleId('overview'); }
      if (!entry.isIntersecting) setAutoPlaying(false);
    }, { threshold: 0.3 });
    obs.observe(el); return () => obs.disconnect();
  }, [autoPlaying]);

  useEffect(() => {
    if (!autoPlaying || mode !== 'auto') return;
    let raf: number, last = performance.now();
    const tick = () => {
      const dt = (performance.now() - last) / 1000; last = performance.now();
      timeRef.current += dt; const t = timeRef.current;
      setAutoTime(Math.min(t, AUTO_PLAY_DURATION));
      if (t < 8) setModuleId('overview');
      else if (t < 18) setModuleId('compression');
      else if (t < 28) setModuleId('fusion');
      else if (t < 38) setModuleId('dqn');
      else if (t < 48) setModuleId('classroom');
      else setModuleId('ablation');
      if (t >= AUTO_PLAY_DURATION) { setMode('free'); setAutoPlaying(false); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [autoPlaying, mode]);

  const handleModuleClick = useCallback((id: ModuleId) => { setMode('free'); setAutoPlaying(false); setModuleId(id); }, []);
  const handleReset = useCallback(() => { timeRef.current = 0; setAutoTime(0); setModuleId('overview'); setMode('auto'); setAutoPlaying(true); }, []);

  return (
    <section ref={sectionRef} className="section-full relative bg-black overflow-hidden">
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 4, 10], fov: 40, near: 0.1, far: 50 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }} dpr={[1, 2]}>
          <color attach="background" args={['#08080C']} />
          <fog attach="fog" args={['#08080C', 12, 45]} />
          <LightingSetup />
          <AtmosphericDust />
          <Suspense fallback={null}>
            <SceneContent moduleId={moduleId} autoTime={autoTime} />
          </Suspense>
          <CameraRig mode={mode} moduleId={moduleId} autoTime={autoTime} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]} receiveShadow>
            <planeGeometry args={[22, 22]} />
            <shadowMaterial transparent opacity={0.12} />
          </mesh>
        </Canvas>
      </div>
      <SensorShowcaseOverlay mode={mode} moduleId={moduleId} autoTime={autoTime} modules={MODULE_LIST} onModuleClick={handleModuleClick} onModeToggle={() => setMode(m => m === 'auto' ? 'free' : 'auto')} onReset={handleReset} autoPlaying={autoPlaying} />
    </section>
  );
}
