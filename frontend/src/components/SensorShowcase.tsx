import { useRef, useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Line, Float } from '@react-three/drei';
import * as THREE from 'three';
import { SensorShowcaseOverlay } from './SensorShowcaseOverlay';

// ═══════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════
export type ModuleId = 'overview' | 'compression' | 'fusion' | 'dqn' | 'classroom' | 'ablation';

interface CameraKeyframe {
  time: number;
  pos: [number, number, number];
  lookAt: [number, number, number];
}

const CAMERA_KEYFRAMES: CameraKeyframe[] = [
  { time: 0,  pos: [0, 4, 10],   lookAt: [0, 0.5, 0] },
  { time: 10, pos: [0, 1.8, 5.5],lookAt: [0, 0.5, 0] },
  { time: 20, pos: [4, 1.2, 2.5],lookAt: [0, 0.3, 0] },
  { time: 30, pos: [-3, 2.5, 3],  lookAt: [0, 0, 0] },
  { time: 40, pos: [0, 7, 1.5], lookAt: [0, -0.5, 0] },
  { time: 50, pos: [5, 1.5, 7],  lookAt: [0, 0, 0] },
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

// ═══════════════════════════════════════════════════════
// Lighting
// ═══════════════════════════════════════════════════════
function LightingSetup() {
  return (
    <>
      <ambientLight intensity={0.2} color="#0A0A0C" />
      <directionalLight
        position={[0, 8, 2]}
        intensity={2.5}
        color="#F5F0E8"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[0, -1, 3]} intensity={0.4} color="#8A8578" />
      <directionalLight position={[0, 3, -4]} intensity={1.2} color="#C8A96E" />
    </>
  );
}

// ═══════════════════════════════════════════════════════
// Atmospheric Dust
// ═══════════════════════════════════════════════════════
function AtmosphericDust() {
  const count = 50;
  const meshRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 14;
      p[i * 3 + 1] = (Math.random() - 0.5) * 8;
      p[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return p;
  }, []);

  const speeds = useMemo(() => Array.from({ length: count }, () => 0.02 + Math.random() * 0.08), []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const pos = meshRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] += speeds[i] * delta;
      if (pos[i * 3 + 1] > 5) pos[i * 3 + 1] = -5;
      if (pos[i * 3 + 1] < -5) pos[i * 3 + 1] = 5;
    }
    meshRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.015} color="#C8A96E" transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

// ═══════════════════════════════════════════════════════
// Q6A Board Model (Overview)
// ═══════════════════════════════════════════════════════
function Q6ABoard({ pulseIntensity = 0 }: { pulseIntensity?: number }) {
  return (
    <group position={[0, 0.3, 0]}>
      {/* PCB base */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[3.2, 0.12, 2.4]} />
        <meshStandardMaterial color="#14142A" roughness={0.25} metalness={0.1} />
      </mesh>
      {/* Chip */}
      <mesh position={[0, 0.16, 0]} castShadow>
        <boxGeometry args={[1.2, 0.2, 1.2]} />
        <meshStandardMaterial
          color="#2A2A35"
          roughness={0.15}
          metalness={0.3}
          emissive="#C8A96E"
          emissiveIntensity={pulseIntensity * 0.6}
        />
      </mesh>
      {/* NPU label ring */}
      <mesh position={[0, 0.27, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.62, 64]} />
        <meshBasicMaterial color="#C8A96E" side={THREE.DoubleSide} transparent opacity={0.3 + pulseIntensity * 0.4} />
      </mesh>
      {/* Pins - left row */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={`pin-l-${i}`} position={[-1.5, -0.1, -1 + i * 0.22]}>
          <boxGeometry args={[0.06, 0.08, 0.06]} />
          <meshStandardMaterial color="#D4C8A0" roughness={0.2} metalness={0.9} />
        </mesh>
      ))}
      {/* Pins - right row */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={`pin-r-${i}`} position={[1.5, -0.1, -1 + i * 0.22]}>
          <boxGeometry args={[0.06, 0.08, 0.06]} />
          <meshStandardMaterial color="#D4C8A0" roughness={0.2} metalness={0.9} />
        </mesh>
      ))}
      {/* USB-C port */}
      <mesh position={[-1.6, 0, 0.8]}>
        <boxGeometry args={[0.15, 0.1, 0.3]} />
        <meshStandardMaterial color="#888" roughness={0.3} metalness={0.5} />
      </mesh>
      {/* HDMI port */}
      <mesh position={[-1.6, 0, 0.3]}>
        <boxGeometry args={[0.15, 0.1, 0.35]} />
        <meshStandardMaterial color="#888" roughness={0.3} metalness={0.5} />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════
// Model Compression (240MB → 1.2MB)
// ═══════════════════════════════════════════════════════
function ModelCompressionVisual({ progress = 0 }: { progress: number }) {
  // Phase: 0-0.25: show big cube, 0.25-0.5: laser cut, 0.5-0.75: shrink, 0.75-1.0: final
  const phase = progress;
  const bigScale = phase < 0.5 ? 1 : Math.max(0.05, 1 - (phase - 0.5) * 1.9);
  const smallScale = phase < 0.5 ? 0 : Math.min(1, (phase - 0.5) * 2);
  const laserOpacity = phase > 0.2 && phase < 0.55 ? 0.8 : 0;

  return (
    <group position={[0, 1.5, -1.5]}>
      {/* Big cube 240MB */}
      <mesh scale={[bigScale, bigScale, bigScale]} position={[-1.5, 0, 0]}>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial color="#3A3A45" roughness={0.3} metalness={0.2} wireframe={phase < 0.3} transparent opacity={0.85} />
      </mesh>
      {/* Laser cutting beams */}
      {laserOpacity > 0 && (
        <>
          <mesh position={[0, -1.5 * bigScale, 0]} rotation={[0, 0, 0]}>
            <planeGeometry args={[3, 0.02]} />
            <meshBasicMaterial color="#C8A96E" transparent opacity={laserOpacity} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 1.5 * bigScale, 0]} rotation={[0, 0, 0]}>
            <planeGeometry args={[2, 0.02]} />
            <meshBasicMaterial color="#C8A96E" transparent opacity={laserOpacity} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}
      {/* Small cube 1.2MB */}
      {smallScale > 0 && (
        <mesh scale={[smallScale, smallScale, smallScale]} position={[1.5, 0, 0]}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color="#C8A96E" roughness={0.1} metalness={0.4} emissive="#C8A96E" emissiveIntensity={smallScale * 0.5} />
        </mesh>
      )}
      {/* Connecting arrow line */}
      {phase > 0.3 && (
        <Line
          points={[[-1.5 + phase * 3, 0, 0], [1.5, 0, 0]]}
          color="#C8A96E"
          lineWidth={0.5}
          transparent
          opacity={Math.min(1, smallScale * 2)}
        />
      )}
    </group>
  );
}

// ═══════════════════════════════════════════════════════
// D-S Fusion Streams
// ═══════════════════════════════════════════════════════
function DSFusionStream({ progress = 0 }: { progress: number }) {
  const particleRef = useRef<THREE.Points>(null);
  const redCount = 40;
  const blueCount = 40;
  const redPositions = useMemo(() => new Float32Array(redCount * 3), []);
  const bluePositions = useMemo(() => new Float32Array(blueCount * 3), []);

  useFrame((_, delta) => {
    if (!particleRef.current) return;
    // Update red stream (radar → chip)
    const rp = (particleRef.current.children[0] as THREE.Points).geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < redCount; i++) {
      const t = ((performance.now() * 0.001 + i * 0.15) % 3) / 3;
      rp[i * 3] = -3 + t * 3;
      rp[i * 3 + 1] = 0.3 + Math.sin(t * Math.PI) * 0.5;
      rp[i * 3 + 2] = 0;
    }
    (particleRef.current.children[0] as THREE.Points).geometry.attributes.position.needsUpdate = true;
    // Update blue stream (vision → chip)
    const bp = (particleRef.current.children[1] as THREE.Points).geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < blueCount; i++) {
      const t = ((performance.now() * 0.001 + i * 0.13 + 1) % 3) / 3;
      bp[i * 3] = 3 - t * 3;
      bp[i * 3 + 1] = 0.3 + Math.sin(t * Math.PI) * 0.5;
      bp[i * 3 + 2] = 0;
    }
    (particleRef.current.children[1] as THREE.Points).geometry.attributes.position.needsUpdate = true;
  });

  return (
    <group position={[0, 0.9, 0]} ref={particleRef}>
      {/* Red stream - Radar evidence m1 */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={redCount} array={redPositions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.04} color="#E8A090" transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      {/* Blue stream - Vision evidence m2 */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={blueCount} array={bluePositions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.04} color="#90B8E8" transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      {/* Collision glow sphere */}
      {progress > 0.3 && (
        <mesh position={[0, 0.35, 0]}>
          <sphereGeometry args={[0.12 + progress * 0.15, 32, 32]} />
          <meshBasicMaterial color="#F5F0E8" transparent opacity={progress * 0.7} />
        </mesh>
      )}
    </group>
  );
}

// ═══════════════════════════════════════════════════════
// DQN Lattice (288 states)
// ═══════════════════════════════════════════════════════
function DQNLattice({ highlightIndex = 120 }: { highlightIndex?: number }) {
  return (
    <group position={[0, 1.2, -2]}>
      {/* 8×3 grid of small cubes (simplified from 8×3×4×3) */}
      {Array.from({ length: 8 }).map((_, x) =>
        Array.from({ length: 3 }).map((_, y) => {
          const idx = y * 8 + x;
          const isActive = idx === highlightIndex % 24;
          return (
            <mesh key={`${x}-${y}`} position={[(x - 3.5) * 0.35, y * 0.4, 0]}>
              <boxGeometry args={[0.25, 0.25, 0.25]} />
              <meshStandardMaterial
                color={isActive ? '#C8A96E' : '#2A2A35'}
                roughness={isActive ? 0.1 : 0.6}
                metalness={isActive ? 0.4 : 0.1}
                emissive={isActive ? '#C8A96E' : '#000'}
                emissiveIntensity={isActive ? 0.8 : 0}
              />
            </mesh>
          );
        })
      )}
      {/* Argmax action arrow */}
      <mesh position={[0, 1.8, 0]}>
        <coneGeometry args={[0.12, 0.3, 8]} />
        <meshStandardMaterial color="#C8A96E" roughness={0.1} metalness={0.5} emissive="#C8A96E" emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════
// Classroom Zone Lighting
// ═══════════════════════════════════════════════════════
function ClassroomZone({ activeZones = [true, true, false], naturalLight = 0.5 }: { activeZones?: boolean[]; naturalLight?: number }) {
  return (
    <group position={[0, 0.5, 0]}>
      {/* Floor */}
      <mesh position={[0, -0.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, 5]} />
        <meshStandardMaterial color="#1A1A20" roughness={0.8} />
      </mesh>
      {/* Walls */}
      <mesh position={[0, 0, -2.5]}>
        <boxGeometry args={[6, 2, 0.1]} />
        <meshStandardMaterial color="#1E1E28" roughness={0.6} />
      </mesh>
      {/* Window (right side) */}
      <mesh position={[3, 0.2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[5, 1.5]} />
        <meshStandardMaterial color="#F5F0E8" roughness={0.1} emissive="#F5F0E8" emissiveIntensity={naturalLight * 2} transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
      {/* 3 Zone lights */}
      {['left', 'center', 'right'].map((_, i) => (
        <group key={i} position={[-2 + i * 2, 0.8, 0]}>
          <mesh>
            <boxGeometry args={[1.2, 0.08, 0.3]} />
            <meshStandardMaterial
              color={activeZones[i] ? '#F5F0E8' : '#1A1A20'}
              roughness={0.2}
              emissive={activeZones[i] ? '#F5F0E8' : '#000'}
              emissiveIntensity={activeZones[i] ? 1.5 : 0}
            />
          </mesh>
          {/* Light cone down */}
          {activeZones[i] && (
            <mesh position={[0, -0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.6, 1.2, 1, 16, 1, true]} />
              <meshBasicMaterial color="#F5F0E8" transparent opacity={0.06} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
          )}
        </group>
      ))}
      {/* Desks */}
      {Array.from({ length: 3 }).map((_, r) =>
        Array.from({ length: 4 }).map((_, c) => (
          <mesh key={`desk-${r}-${c}`} position={[-2.2 + c * 1.5, -0.65, -1.2 + r * 1.2]}>
            <boxGeometry args={[1, 0.1, 0.6]} />
            <meshStandardMaterial color="#2A2A30" roughness={0.5} />
          </mesh>
        ))
      )}
      {/* Person dots */}
      {[[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [0, 2], [2, 2], [3, 1]].map(([c, r], i) => (
        <mesh key={`person-${i}`} position={[-2.2 + c * 1.5, -0.5, -1.2 + r * 1.2]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color="#C8A96E" roughness={0.2} emissive="#C8A96E" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════
// Ablation Pillars
// ═══════════════════════════════════════════════════════
function AblationPillars({ progress = 0 }: { progress: number }) {
  const data = [
    { label: '纯红外', acc: 65, color: '#3A3A45' },
    { label: '+雷达', acc: 76, color: '#5A5A65' },
    { label: '+视觉', acc: 85, color: '#7A8A95' },
    { label: '+D-S', acc: 93, color: '#90B8C0' },
    { label: '+滞回', acc: 93, color: '#A0C8C0' },
    { label: '+DQN', acc: 98.7, color: '#C8A96E' },
  ];

  return (
    <group position={[0, 0, -1]}>
      {data.map((d, i) => {
        const height = (d.acc / 100) * 4 * Math.min(1, progress * 6 - i * 0.8);
        return (
          <group key={i} position={[-3 + i * 1.2, 0, 0]}>
            <mesh position={[0, height / 2, 0]} castShadow>
              <boxGeometry args={[0.5, Math.max(0.1, height), 0.5]} />
              <meshStandardMaterial color={d.color} roughness={0.3} metalness={0.2} emissive={i === 5 ? '#C8A96E' : '#000'} emissiveIntensity={i === 5 && progress > 0.8 ? 0.6 : 0} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ═══════════════════════════════════════════════════════
// Camera Rig
// ═══════════════════════════════════════════════════════
function CameraRig({ mode, moduleId, autoTime }: { mode: 'auto' | 'free'; moduleId: ModuleId; autoTime: number }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const targetPos = useRef(new THREE.Vector3(0, 4, 10));
  const targetLook = useRef(new THREE.Vector3(0, 0.5, 0));

  // Module-specific camera presets for free mode
  const moduleCameras: Record<ModuleId, { pos: [number, number, number]; lookAt: [number, number, number] }> = {
    overview:    { pos: [0, 3.5, 8],   lookAt: [0, 0.3, 0] },
    compression: { pos: [-2, 1.8, 4],  lookAt: [0, 1.5, -1.5] },
    fusion:      { pos: [3, 0.8, 1.5], lookAt: [0, 0.9, 0] },
    dqn:         { pos: [-2, 2, 3],    lookAt: [0, 1.2, -2] },
    classroom:   { pos: [0, 6, 0.5],   lookAt: [0, 0, 0] },
    ablation:    { pos: [5, 1.5, 6],   lookAt: [0, 0, -1] },
  };

  // Auto mode: lerp camera along timeline
  useFrame((_, delta) => {
    if (mode === 'auto') {
      const t = autoTime / AUTO_PLAY_DURATION;
      // Find surrounding keyframes
      const kfs = CAMERA_KEYFRAMES;
      let i0 = 0;
      for (let i = kfs.length - 1; i >= 0; i--) {
        if (kfs[i].time / AUTO_PLAY_DURATION <= t) { i0 = i; break; }
      }
      const i1 = Math.min(i0 + 1, kfs.length - 1);
      const t0 = kfs[i0].time / AUTO_PLAY_DURATION;
      const t1 = kfs[i1].time / AUTO_PLAY_DURATION;
      const localT = t1 > t0 ? Math.min(1, Math.max(0, (t - t0) / (t1 - t0))) : 0;
      const ease = localT < 0.5 ? 4 * localT * localT * localT : 1 - Math.pow(-2 * localT + 2, 3) / 2;

      targetPos.current.lerpVectors(
        new THREE.Vector3(...kfs[i0].pos),
        new THREE.Vector3(...kfs[i1].pos),
        ease
      );
      targetLook.current.lerpVectors(
        new THREE.Vector3(...kfs[i0].lookAt),
        new THREE.Vector3(...kfs[i1].lookAt),
        ease
      );
    } else {
      // Free mode: lerp to module preset
      const preset = moduleCameras[moduleId];
      targetPos.current.lerp(new THREE.Vector3(...preset.pos), 3 * delta);
      targetLook.current.lerp(new THREE.Vector3(...preset.lookAt), 3 * delta);
    }

    camera.position.lerp(targetPos.current, 2.5 * delta);
    // Smooth lookAt
    const currentLook = new THREE.Vector3();
    camera.getWorldDirection(currentLook);
    const desiredLook = targetLook.current.clone().sub(camera.position).normalize();
    currentLook.lerp(desiredLook, 2.5 * delta);
    const lookPoint = camera.position.clone().add(currentLook.multiplyScalar(5));
    camera.lookAt(lookPoint);
  });

  return mode === 'free' ? <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.08} minDistance={2} maxDistance={14} target={[0, 0.5, 0]} /> : null;
}

// ═══════════════════════════════════════════════════════
// Scene Content - Renders current module's 3D content
// ═══════════════════════════════════════════════════════
function SceneContent({ moduleId, autoTime }: { moduleId: ModuleId; autoTime: number }) {
  const pulseIntensity = useMemo(() => 0.3 + Math.sin(autoTime * 2) * 0.2, [autoTime]);

  // Module progress (0-1 within each module's timeslot)
  const moduleProgress = useMemo(() => {
    const startTimes: Record<ModuleId, number> = { overview: 0, compression: 8, fusion: 18, dqn: 28, classroom: 38, ablation: 48 };
    const endTimes: Record<ModuleId, number> = { overview: 8, compression: 18, fusion: 28, dqn: 38, classroom: 48, ablation: 60 };
    const start = startTimes[moduleId] || 0;
    const end = endTimes[moduleId] || 60;
    return Math.min(1, Math.max(0, (autoTime - start) / (end - start)));
  }, [moduleId, autoTime]);

  const activeZones: boolean[] = moduleId === 'classroom'
    ? [true, moduleProgress > 0.3, false]
    : [true, true, false];

  return (
    <>
      {/* Always show Q6A board */}
      {(moduleId === 'overview' || moduleId === 'compression' || moduleId === 'fusion') && (
        <Q6ABoard pulseIntensity={moduleId === 'overview' ? pulseIntensity : moduleId === 'fusion' ? moduleProgress * 0.6 : 0.2} />
      )}

      {moduleId === 'compression' && <ModelCompressionVisual progress={moduleProgress} />}
      {moduleId === 'fusion' && <DSFusionStream progress={moduleProgress} />}
      {moduleId === 'dqn' && <DQNLattice highlightIndex={Math.floor(autoTime * 3) % 24} />}
      {moduleId === 'classroom' && <ClassroomZone activeZones={activeZones} naturalLight={0.3 + moduleProgress * 0.6} />}
      {moduleId === 'ablation' && <AblationPillars progress={moduleProgress} />}
    </>
  );
}

// ═══════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════
export function SensorShowcase() {
  const [mode, setMode] = useState<'auto' | 'free'>('auto');
  const [moduleId, setModuleId] = useState<ModuleId>('overview');
  const [autoTime, setAutoTime] = useState(0);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef(0);

  // IntersectionObserver: trigger auto-play when scrolled into view
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !autoPlaying) {
          setAutoPlaying(true);
          timeRef.current = 0;
          setAutoTime(0);
          setMode('auto');
          setModuleId('overview');
        }
        if (!entry.isIntersecting) {
          setAutoPlaying(false);
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [autoPlaying]);

  // Auto-play timer
  useEffect(() => {
    if (!autoPlaying || mode !== 'auto') return;
    let raf: number;
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      timeRef.current += dt;
      const t = timeRef.current;
      setAutoTime(Math.min(t, AUTO_PLAY_DURATION));

      // Update module based on time
      if (t < 8) setModuleId('overview');
      else if (t < 18) setModuleId('compression');
      else if (t < 28) setModuleId('fusion');
      else if (t < 38) setModuleId('dqn');
      else if (t < 48) setModuleId('classroom');
      else setModuleId('ablation');

      if (t >= AUTO_PLAY_DURATION) {
        setMode('free');
        setAutoPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoPlaying, mode]);

  const handleModuleClick = useCallback((id: ModuleId) => {
    setMode('free');
    setAutoPlaying(false);
    setModuleId(id);
  }, []);

  const handleReset = useCallback(() => {
    timeRef.current = 0;
    setAutoTime(0);
    setModuleId('overview');
    setMode('auto');
    setAutoPlaying(true);
  }, []);

  return (
    <section ref={sectionRef} className="section-full relative bg-black overflow-hidden">
      {/* 3D Canvas */}
      <div className="absolute inset-0">
        <Canvas
          camera={{ position: [0, 4, 10], fov: 42, near: 0.1, far: 50 }}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
          dpr={[1, 2]}
        >
          <color attach="background" args={['#08080C']} />
          <fog attach="fog" args={['#08080C', 12, 40]} />
          <LightingSetup />
          <AtmosphericDust />
          <Suspense fallback={null}>
            <SceneContent moduleId={moduleId} autoTime={autoTime} />
          </Suspense>
          <CameraRig mode={mode} moduleId={moduleId} autoTime={autoTime} />
          {/* Floor shadow plane */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]} receiveShadow>
            <planeGeometry args={[20, 20]} />
            <shadowMaterial transparent opacity={0.15} />
          </mesh>
        </Canvas>
      </div>

      {/* HTML Overlay */}
      <SensorShowcaseOverlay
        mode={mode}
        moduleId={moduleId}
        autoTime={autoTime}
        modules={MODULE_LIST}
        onModuleClick={handleModuleClick}
        onModeToggle={() => setMode(m => m === 'auto' ? 'free' : 'auto')}
        onReset={handleReset}
        autoPlaying={autoPlaying}
      />
    </section>
  );
}
