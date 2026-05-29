import { useRef, useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import { SensorShowcaseOverlay } from './SensorShowcaseOverlay';

export type ModuleId = 'overview' | 'compression' | 'fusion' | 'dqn' | 'classroom' | 'ablation';

interface CameraKeyframe { time: number; pos: [number, number, number]; lookAt: [number, number, number]; }

const CAMERA_KEYFRAMES: CameraKeyframe[] = [
  { time: 0,  pos: [0, 5, 11],   lookAt: [0, 0.2, 0] },
  { time: 10, pos: [0, 2.5, 6],  lookAt: [0, 0.3, 0] },
  { time: 20, pos: [3.5, 1.5, 2.5], lookAt: [0, 0.2, 0] },
  { time: 30, pos: [-2, 2.5, 4], lookAt: [0, 1.2, -3] },
  { time: 40, pos: [1, 7, 2],    lookAt: [0, -0.5, 0] },
  { time: 50, pos: [5, 1.5, 7],  lookAt: [0, 0, -1.5] },
  { time: 57, pos: [0, 5, 11],   lookAt: [0, 0.2, 0] },
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
const GOLD = '#C8A96E';
const GOLD_DIM = '#A89050';
const WARM_WHITE = '#F5F0E8';
const WARM_GRAY = '#8A8578';
const PCB_GREEN = '#0B3A18';
const PCB_LIGHT = '#0F4A20';

// ═══════════════════════ LIGHTING ═══════════════════════
function LightingSetup() {
  return (
    <>
      <ambientLight intensity={0.15} color="#08080C" />
      <directionalLight position={[1, 9, 3]} intensity={2.8} color={WARM_WHITE} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-far={35} shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={10} shadow-camera-bottom={-10} />
      <directionalLight position={[-2, -1, 4]} intensity={0.3} color={WARM_GRAY} />
      <directionalLight position={[0, 4, -5]} intensity={1.6} color={GOLD} />
      <pointLight position={[0, 0.8, 0]} intensity={0} color={GOLD} distance={4} />
    </>
  );
}

// ═══════════════════════ ATMOSPHERIC DUST ═══════════════════════
function AtmosphericDust() {
  const count = 60;
  const meshRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => { const p = new Float32Array(count * 3); for (let i = 0; i < count; i++) { p[i * 3] = (Math.random() - 0.5) * 18; p[i * 3 + 1] = (Math.random() - 0.5) * 12; p[i * 3 + 2] = (Math.random() - 0.5) * 14; } return p; }, []);
  const speeds = useMemo(() => Array.from({ length: count }, () => 0.008 + Math.random() * 0.05), []);
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const pos = meshRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) { pos[i * 3 + 1] += speeds[i] * delta; if (pos[i * 3 + 1] > 6) pos[i * 3 + 1] = -6; if (pos[i * 3 + 1] < -6) pos[i * 3 + 1] = 6; }
    meshRef.current.geometry.attributes.position.needsUpdate = true;
  });
  return <points ref={meshRef}><bufferGeometry><bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} /></bufferGeometry><pointsMaterial size={0.01} color={GOLD} transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} /></points>;
}

// ═══════════════════════ SOLDER PAD HELPER ═══════════════════════
function SolderPads({ cols, rows, size, spacing, position }: { cols: number; rows: number; size: number; spacing: number; position: [number, number, number] }) {
  return (
    <group position={position}>
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => (
          <mesh key={`pad-${r}-${c}`} position={[(c - (cols - 1) / 2) * spacing, 0, (r - (rows - 1) / 2) * spacing]}>
            <boxGeometry args={[size, 0.006, size]} />
            <meshStandardMaterial color={GOLD} roughness={0.12} metalness={0.9} />
          </mesh>
        ))
      )}
    </group>
  );
}

// ═══════════════════════ SOLDER JOINT SPHERE ═══════════════════════
function SolderJoint({ position, count = 8 }: { position: [number, number, number]; count?: number }) {
  return (
    <group position={position}>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={`sj-${i}`} position={[(Math.random() - 0.5) * 1.2, 0.01, (Math.random() - 0.5) * 1.2]}>
          <sphereGeometry args={[0.015, 6, 6]} />
          <meshStandardMaterial color={GOLD} roughness={0.08} metalness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

// ═══════════════════════ VIA HOLE ═══════════════════════
function Via({ position, count = 3 }: { position: [number, number, number]; count?: number }) {
  return (
    <group position={position}>
      {Array.from({ length: count }).map((_, i) => (
        <group key={`v-${i}`} position={[(Math.random() - 0.5) * 0.5, 0, (Math.random() - 0.5) * 0.5]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.02, 0.035, 16]} />
            <meshStandardMaterial color={GOLD} roughness={0.1} metalness={0.9} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ═══════════════════════ REALISTIC CUSTOM PCB ═══════════════════════
function CustomPCBBoard({ npuActive = 0 }: { npuActive?: number }) {
  return (
    <group position={[0, 0.45, 0]}>
      {/* ══ BASE PCB SUBSTRATE ══ */}
      {/* Main FR4 board */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.2, 0.18, 3.0]} />
        <meshStandardMaterial color={PCB_GREEN} roughness={0.28} metalness={0.04} />
      </mesh>
      {/* Top copper/solder mask layer — slightly lighter green */}
      <mesh position={[0, 0.092, 0]}>
        <boxGeometry args={[4.15, 0.004, 2.95]} />
        <meshStandardMaterial color={PCB_LIGHT} roughness={0.25} metalness={0.02} />
      </mesh>
      {/* Bottom copper layer */}
      <mesh position={[0, -0.09, 0]}>
        <boxGeometry args={[4.15, 0.004, 2.95]} />
        <meshStandardMaterial color="#0A3016" roughness={0.3} metalness={0.02} />
      </mesh>

      {/* ══ COPPER POUR (large ground plane) ══ */}
      <mesh position={[0, 0.094, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.9, 2.7]} />
        <meshBasicMaterial color={GOLD_DIM} transparent opacity={0.04} side={THREE.DoubleSide} />
      </mesh>

      {/* ══ SILKSCREEN — board outline ══ */}
      <mesh position={[-1.95, 0.095, -1.35]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.16, 2.7]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.04} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[1.95, 0.095, -1.35]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.16, 2.7]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.04} side={THREE.DoubleSide} />
      </mesh>

      {/* ══ MOUNTING HOLES (4 corners) ══ */}
      {[[-1.9, -1.3], [1.9, -1.3], [-1.9, 1.3], [1.9, 1.3]].map(([x, z], i) => (
        <group key={`mount-${i}`} position={[x, 0, z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.15, 0.22, 64]} />
            <meshStandardMaterial color={GOLD} roughness={0.15} metalness={0.92} side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.20, 0.25, 64]} />
            <meshStandardMaterial color="#888" roughness={0.35} metalness={0.4} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      {/* ══ COPPER TRACE ROUTING (visible gold lines) ══ */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={`trace-v-${i}`} position={[-1.8 + i * 0.4, 0.093, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.03, 2.5]} />
          <meshBasicMaterial color={GOLD_DIM} transparent opacity={0.06} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={`trace-h-mid-${i}`} position={[0, 0.093, -0.5 + i * 0.2]} rotation={[-Math.PI / 2, Math.PI / 2, 0]}>
          <planeGeometry args={[0.03, 3.8]} />
          <meshBasicMaterial color={GOLD_DIM} transparent opacity={0.06} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* ══ VIAS scattered ══ */}
      <Via position={[-1.5, 0.093, -0.8]} count={5} />
      <Via position={[1.3, 0.093, 0.6]} count={4} />
      <Via position={[-0.5, 0.093, 1.0]} count={3} />
      <Via position={[0.8, 0.093, -1.0]} count={3} />

      {/* ══ SILKSCREEN COMPONENT OUTLINES ══ */}
      {[
        { x: -1.2, z: -0.7, w: 0.5, h: 0.5 },   // Sensor array area
        { x: 1.2, z: 0.7, w: 0.6, h: 0.4 },     // Power section
        { x: -0.2, z: 0.9, w: 0.3, h: 0.3 },     // I2C Hub area
        { x: 0.3, z: -0.9, w: 0.4, h: 0.5 },     // ADC section
        { x: 1.4, z: -0.6, w: 0.4, h: 0.45 },    // Flash/Storage
      ].map(({ x, z, w, h }, i) => (
        <mesh key={`outline-${i}`} position={[x, 0.094, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w + 0.08, h + 0.08]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.03} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* ══ Q6A SOCKET (40-pin dual row header) ══ */}
      <group position={[0, 0.22, 0.2]}>
        {/* Plastic shroud */}
        <mesh>
          <boxGeometry args={[0.14, 0.3, 2.2]} />
          <meshStandardMaterial color="#0C0C14" roughness={0.45} metalness={0.04} />
        </mesh>
        {/* Dual row pins (20×2) */}
        {Array.from({ length: 20 }).map((_, i) => (
          <group key={`q6a-pin-${i}`} position={[0, 0.1, -1.05 + i * 0.11]}>
            <mesh position={[-0.03, 0, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 0.16, 12]} />
              <meshStandardMaterial color={GOLD} roughness={0.12} metalness={0.93} />
            </mesh>
            <mesh position={[0.03, 0, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 0.16, 12]} />
              <meshStandardMaterial color={GOLD} roughness={0.12} metalness={0.93} />
            </mesh>
          </group>
        ))}
        {/* Solder joints at base */}
        <SolderJoint position={[0, -0.12, -0.1]} count={20} />
      </group>

      {/* ══ Q6A MODULE (floating above socket) ══ */}
      <group position={[0, 0.52, 0.2]}>
        {/* Q6A PCB */}
        <mesh castShadow>
          <boxGeometry args={[3.6, 0.14, 2.2]} />
          <meshStandardMaterial color="#141430" roughness={0.18} metalness={0.06} />
        </mesh>
        {/* Q6A top surface */}
        <mesh position={[0, 0.08, 0]}>
          <boxGeometry args={[3.55, 0.005, 2.15]} />
          <meshStandardMaterial color="#181838" roughness={0.2} metalness={0.04} />
        </mesh>

        {/* RK3588 SoC with heatsink */}
        <group position={[0, 0.28, 0]}>
          {/* Substrate */}
          <mesh castShadow>
            <boxGeometry args={[1.6, 0.13, 1.6]} />
            <meshStandardMaterial color="#1A1A2A" roughness={0.1} metalness={0.3} />
          </mesh>
          {/* Heatsink base */}
          <mesh position={[0, 0.09, 0]} castShadow>
            <boxGeometry args={[1.8, 0.06, 1.8]} />
            <meshStandardMaterial color="#3A3A44" roughness={0.2} metalness={0.72} />
          </mesh>
          {/* Fin array */}
          {Array.from({ length: 11 }).map((_, fi) => (
            <mesh key={`fin-${fi}`} position={[(fi - 5) * 0.16, 0.13, 0]} castShadow>
              <boxGeometry args={[0.05, 0.18, 1.7]} />
              <meshStandardMaterial color="#42424C" roughness={0.25} metalness={0.68} />
            </mesh>
          ))}
          {/* NPU core grid on heatsink */}
          <group position={[0, 0.23, 0]}>
            {Array.from({ length: 10 }).map((_, row) =>
              Array.from({ length: 10 }).map((_, col) => {
                const idx = row * 10 + col;
                const wave = Math.sin(idx * 0.28 + npuActive * 7) * 0.5 + 0.5;
                return (
                  <mesh key={`npu-${idx}`} position={[(col - 4.5) * 0.15, 0.006, (row - 4.5) * 0.15]}>
                    <boxGeometry args={[0.11, 0.014, 0.11]} />
                    <meshStandardMaterial color={GOLD} roughness={0.06} metalness={0.75} emissive={GOLD} emissiveIntensity={0.04 + wave * npuActive * 1.2} />
                  </mesh>
                );
              })
            )}
          </group>
        </group>

        {/* Q6A's own components */}
        {/* LPDDR4 chips */}
        {[[-1.0, -1.0], [1.0, -1.0], [-1.0, 1.0], [1.0, 1.0]].map(([dx, dz], i) => (
          <group key={`q6a-dram-${i}`} position={[dx, 0.11, dz]}>
            <mesh castShadow>
              <boxGeometry args={[0.45, 0.09, 0.35]} />
              <meshStandardMaterial color="#161622" roughness={0.1} metalness={0.25} />
            </mesh>
            <SolderJoint position={[0, -0.04, 0]} count={6} />
          </group>
        ))}

        {/* eMMC */}
        <group position={[1.2, 0.11, -0.6]}>
          <mesh castShadow>
            <boxGeometry args={[0.5, 0.1, 0.4]} />
            <meshStandardMaterial color="#141420" roughness={0.12} metalness={0.22} />
          </mesh>
        </group>

        {/* WiFi/BT */}
        <group position={[1.3, 0.11, 0.8]}>
          <mesh castShadow>
            <boxGeometry args={[0.38, 0.07, 0.35]} />
            <meshStandardMaterial color="#1A1A26" roughness={0.15} metalness={0.2} />
          </mesh>
          <mesh position={[0.12, 0.05, 0]}>
            <boxGeometry args={[0.1, 0.04, 0.07]} />
            <meshStandardMaterial color="#E8E8E0" roughness={0.28} metalness={0.04} />
          </mesh>
        </group>

        {/* Q6A Connectors (perimeter) */}
        {/* USB-C */}
        <group position={[-1.8, 0.02, 1.0]}>
          <mesh><boxGeometry args={[0.05, 0.1, 0.28]} /><meshStandardMaterial color="#999" roughness={0.22} metalness={0.6} /></mesh>
        </group>
        {/* HDMI */}
        <group position={[-1.8, 0.02, 0.55]}>
          <mesh><boxGeometry args={[0.05, 0.09, 0.34]} /><meshStandardMaterial color="#999" roughness={0.22} metalness={0.6} /></mesh>
        </group>
        {/* 3× CSI */}
        {[-0.7, -0.95, -1.2].map((z, i) => (
          <group key={`csi-${i}`} position={[-1.8, 0.02, z]}>
            <mesh><boxGeometry args={[0.05, 0.05, 0.16]} /><meshStandardMaterial color="#CCC" roughness={0.18} metalness={0.65} /></mesh>
          </group>
        ))}
        {/* Ethernet */}
        <group position={[1.8, 0.02, -1.0]}>
          <mesh><boxGeometry args={[0.07, 0.12, 0.35]} /><meshStandardMaterial color="#888" roughness={0.22} metalness={0.55} /></mesh>
        </group>
        {/* DC Jack */}
        <group position={[1.8, 0.02, 1.0]}>
          <mesh><cylinderGeometry args={[0.07, 0.07, 0.1, 20]} rotation={[0, 0, Math.PI / 2]} /><meshStandardMaterial color="#777" roughness={0.25} metalness={0.6} /></mesh>
        </group>

        {/* Status LEDs */}
        {[[-1.7, 0.09, -0.2], [-1.7, 0.09, -0.35], [1.7, 0.09, 0.1]].map(([lx, ly, lz], i) => (
          <mesh key={`led-${i}`} position={[lx, ly, lz]}>
            <boxGeometry args={[0.04, 0.025, 0.05]} />
            <meshStandardMaterial color={['#34C759', '#FFD700', '#00D4FF'][i]} roughness={0.05} emissive={['#34C759', '#FFD700', '#00D4FF'][i]} emissiveIntensity={0.7} />
          </mesh>
        ))}

        {/* Solder details on Q6A */}
        <SolderJoint position={[-1.5, -0.06, -0.8]} count={4} />
        <SolderJoint position={[1.5, -0.06, 0.5]} count={4} />
      </group>

      {/* ══ SENSOR BREAKOUT AREAS (on baseboard) ══ */}
      {/* BH1750 light sensor */}
      <group position={[-1.1, 0.13, -0.8]}>
        <mesh castShadow>
          <boxGeometry args={[0.35, 0.08, 0.3]} />
          <meshStandardMaterial color="#181822" roughness={0.15} metalness={0.15} />
        </mesh>
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[0.15, 0.03, 0.15]} />
          <meshStandardMaterial color={GOLD} roughness={0.08} metalness={0.8} />
        </mesh>
        <SolderJoint position={[0, -0.04, 0]} count={4} />
      </group>

      {/* SCD41 CO2 sensor */}
      <group position={[1.1, 0.13, -0.75]}>
        <mesh castShadow>
          <boxGeometry args={[0.4, 0.1, 0.35]} />
          <meshStandardMaterial color="#1A1A28" roughness={0.12} metalness={0.12} />
        </mesh>
        {[[-0.1, 0.06, -0.08], [0.1, 0.06, -0.08]].map(([hx, hy, hz], i) => (
          <mesh key={`co2-hole-${i}`} position={[hx, hy, hz]}>
            <cylinderGeometry args={[0.03, 0.03, 0.02, 12]} />
            <meshStandardMaterial color="#0A0A10" roughness={0.6} />
          </mesh>
        ))}
      </group>

      {/* INA226 ×3 power monitors */}
      {[-0.6, 0, 0.6].map((x, i) => (
        <group key={`ina-${i}`} position={[x, 0.13, 0.9]}>
          <mesh castShadow>
            <boxGeometry args={[0.25, 0.06, 0.2]} />
            <meshStandardMaterial color={i === 0 ? '#1A1A26' : i === 1 ? '#1E1E26' : '#221A1A'} roughness={0.15} metalness={0.12} />
          </mesh>
          <SolderJoint position={[0, -0.03, 0]} count={3} />
        </group>
      ))}

      {/* ADS1115 ADC */}
      <group position={[0.4, 0.12, -0.9]}>
        <mesh castShadow>
          <boxGeometry args={[0.3, 0.07, 0.3]} />
          <meshStandardMaterial color="#1C1C26" roughness={0.15} metalness={0.1} />
        </mesh>
      </group>

      {/* TCA9548A I2C Hub */}
      <group position={[-0.4, 0.12, 1.0]}>
        <mesh castShadow>
          <boxGeometry args={[0.35, 0.07, 0.35]} />
          <meshStandardMaterial color="#1A1A1A" roughness={0.18} metalness={0.1} />
        </mesh>
        <SolderJoint position={[0, -0.03, 0]} count={6} />
      </group>

      {/* AMS1117 voltage regulator */}
      <group position={[-1.6, 0.12, 0.4]}>
        <mesh castShadow>
          <boxGeometry args={[0.45, 0.1, 0.35]} />
          <meshStandardMaterial color="#0C0C14" roughness={0.25} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[0.35, 0.03, 0.25]} />
          <meshStandardMaterial color="#C0C0C8" roughness={0.15} metalness={0.7} />
        </mesh>
      </group>

      {/* ══ EXTERNAL CONNECTION TERMINALS ══ */}
      {/* 3× Relay output terminal blocks */}
      {[-1.0, 0, 1.0].map((z, i) => (
        <group key={`term-${i}`} position={[1.6, 0.12, z]}>
          <mesh>
            <boxGeometry args={[0.15, 0.12, 0.35]} />
            <meshStandardMaterial color="#2A2A2A" roughness={0.35} metalness={0.15} />
          </mesh>
          {/* Screw terminals */}
          {Array.from({ length: 3 }).map((_, j) => (
            <mesh key={`screw-${j}`} position={[0.06, 0.03, -0.12 + j * 0.12]}>
              <cylinderGeometry args={[0.03, 0.03, 0.02, 12]} />
              <meshStandardMaterial color={GOLD} roughness={0.15} metalness={0.9} />
            </mesh>
          ))}
        </group>
      ))}

      {/* UART header for LD2410B */}
      <group position={[-1.6, 0.12, -0.2]}>
        <mesh>
          <boxGeometry args={[0.1, 0.1, 0.3]} />
          <meshStandardMaterial color="#0A0A10" roughness={0.4} metalness={0.05} />
        </mesh>
        {Array.from({ length: 4 }).map((_, i) => (
          <mesh key={`uart-${i}`} position={[0, 0.04, -0.1 + i * 0.07]}>
            <cylinderGeometry args={[0.02, 0.02, 0.08, 10]} />
            <meshStandardMaterial color={GOLD} roughness={0.12} metalness={0.9} />
          </mesh>
        ))}
      </group>

      {/* I2S header for INMP441 */}
      <group position={[-1.6, 0.12, 0.8]}>
        <mesh>
          <boxGeometry args={[0.08, 0.08, 0.2]} />
          <meshStandardMaterial color="#0A0A10" roughness={0.4} metalness={0.05} />
        </mesh>
        {Array.from({ length: 3 }).map((_, i) => (
          <mesh key={`i2s-${i}`} position={[0, 0.03, -0.06 + i * 0.06]}>
            <cylinderGeometry args={[0.018, 0.018, 0.06, 8]} />
            <meshStandardMaterial color={GOLD} roughness={0.12} metalness={0.9} />
          </mesh>
        ))}
      </group>

      {/* ══ NPU ACTIVITY EFFECTS ══ */}
      {npuActive > 0.1 && (
        <>
          <mesh position={[0, 0.8, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.9, 1.0, 120]} />
            <meshBasicMaterial color={GOLD} side={THREE.DoubleSide} transparent opacity={0.1 + npuActive * 0.32} />
          </mesh>
          <mesh position={[0, 0.78, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.05, 1.12, 120]} />
            <meshBasicMaterial color={GOLD} side={THREE.DoubleSide} transparent opacity={0.035 + npuActive * 0.16} />
          </mesh>
          <mesh position={[0, 0.7, 0.2]}>
            <sphereGeometry args={[1.15, 32, 32]} />
            <meshBasicMaterial color={GOLD} transparent opacity={0.015 + npuActive * 0.035} />
          </mesh>
        </>
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

  return (
    <group position={[0, 2.0, -2.2]}>
      {/* Weight matrix (big model) */}
      <group position={[-2.2, 0, 0]} scale={[bigS, bigS, bigS]}>
        {Array.from({ length: 12 }).map((_, r) =>
          Array.from({ length: 12 }).map((_, c) => {
            const alive = (r + c) % 4 !== 0 || p < 0.4;
            return (
              <mesh key={`wt-${r}-${c}`} position={[(c - 5.5) * 0.13, (r - 5.5) * 0.13, 0]}>
                <boxGeometry args={[0.09, 0.09, 0.015]} />
                <meshStandardMaterial color={alive ? '#5A6A88' : '#1A1A22'} roughness={alive ? 0.35 : 0.9} emissive={alive ? '#000' : '#FF3B30'} emissiveIntensity={alive ? 0 : 0.6} transparent={!alive} opacity={alive ? 0.85 : 0.25} />
              </mesh>
            );
          })
        )}
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(1.5, 1.5, 0.02)]} />
          <lineBasicMaterial color={GOLD} transparent opacity={0.2 * bigS} />
        </lineSegments>
      </group>

      {/* Laser beams */}
      {laserOn && (
        <group position={[0, 0, 0]}>
          {[Math.PI / 4, -Math.PI / 4].map((angle, i) => (
            <mesh key={`laser-${i}`} rotation={[0, 0, angle]}>
              <planeGeometry args={[3.5, 0.012]} />
              <meshBasicMaterial color={GOLD} transparent opacity={0.85} side={THREE.DoubleSide} />
            </mesh>
          ))}
        </group>
      )}

      {/* Compressed model */}
      {smallS > 0 && (
        <group position={[2.2, 0, 0]} scale={[smallS, smallS, smallS]}>
          <mesh>
            <octahedronGeometry args={[0.35, 0]} />
            <meshStandardMaterial color={GOLD} roughness={0.05} metalness={0.55} emissive={GOLD} emissiveIntensity={0.25 + smallS * 0.6} />
          </mesh>
          {/* Sparkle ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.4, 0.02, 16, 48]} />
            <meshBasicMaterial color={GOLD} transparent opacity={smallS * 0.6} />
          </mesh>
        </group>
      )}

      {p > 0.3 && <Line points={[[-2.2 + p * 3.2, 0, 0], [2.2, 0, 0]]} color={GOLD} lineWidth={0.8} transparent opacity={smallS * 1.5} />}
    </group>
  );
}

// ═══════════════════════ D-S FUSION ═══════════════════════
function DSFusionStreams({ progress = 0 }: { progress: number }) {
  const particleGroupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!particleGroupRef.current) return;
    const t = performance.now() * 0.001;
    // Radar stream (red)
    const rp = (particleGroupRef.current.children[0] as THREE.Points).geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < 30; i++) {
      const ot = ((t * 0.6 + i * 0.1) % 1.5) / 1.5;
      rp[i * 3] = -3.5 + ot * 3.5;
      rp[i * 3 + 1] = 0.25 + Math.sin(ot * Math.PI) * 0.35;
      rp[i * 3 + 2] = 0;
    }
    (particleGroupRef.current.children[0] as THREE.Points).geometry.attributes.position.needsUpdate = true;
    // Vision stream (blue)
    const bp = (particleGroupRef.current.children[1] as THREE.Points).geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < 30; i++) {
      const ot = ((t * 0.55 + i * 0.09 + 0.75) % 1.5) / 1.5;
      bp[i * 3] = 3.5 - ot * 3.5;
      bp[i * 3 + 1] = 0.25 + Math.sin(ot * Math.PI) * 0.35;
      bp[i * 3 + 2] = 0;
    }
    (particleGroupRef.current.children[1] as THREE.Points).geometry.attributes.position.needsUpdate = true;
  });

  const initArr = (count: number) => { const a = new Float32Array(count * 3); for (let i = 0; i < count; i++) { a[i * 3] = (Math.random() - 0.5) * 7; a[i * 3 + 1] = 0.2 + Math.random() * 1; a[i * 3 + 2] = 0; } return a; };

  return (
    <group position={[0, 1.0, 0]}>
      {/* Bezier curve guides */}
      {[true, false].map((isRadar, si) => {
        const sx = si ? -3.5 : 3.5;
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(sx, 0.2, 0),
          new THREE.Vector3(sx * 0.2, 0.6, 0),
          new THREE.Vector3(0, 0.25, 0)
        );
        const pts = curve.getPoints(40);
        return (
          <Line key={`guide-${si}`}
            points={pts.map(p => [p.x, p.y, p.z] as [number, number, number])}
            color={si ? '#E89888' : '#88A8D8'}
            lineWidth={0.3}
            transparent
            opacity={0.5 * progress}
          />
        );
      })}

      {/* Particles */}
      <group ref={particleGroupRef}>
        <points>
          <bufferGeometry><bufferAttribute attach="attributes-position" count={30} array={initArr(30)} itemSize={3} /></bufferGeometry>
          <pointsMaterial size={0.035} color="#E89888" transparent opacity={0.8 * progress} depthWrite={false} blending={THREE.AdditiveBlending} />
        </points>
        <points>
          <bufferGeometry><bufferAttribute attach="attributes-position" count={30} array={initArr(30)} itemSize={3} /></bufferGeometry>
          <pointsMaterial size={0.035} color="#88A8D8" transparent opacity={0.8 * progress} depthWrite={false} blending={THREE.AdditiveBlending} />
        </points>
      </group>

      {/* Collision glow */}
      {progress > 0.35 && (
        <group position={[0, 0.25, 0]}>
          <mesh>
            <sphereGeometry args={[0.07 + progress * 0.13, 64, 64]} />
            <meshBasicMaterial color={WARM_WHITE} transparent opacity={progress * 0.95} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.15 + progress * 0.22, 48, 48]} />
            <meshBasicMaterial color={WARM_WHITE} transparent opacity={progress * 0.22} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.18 + progress * 0.2, 0.2 + progress * 0.22, 80]} />
            <meshBasicMaterial color={GOLD} side={THREE.DoubleSide} transparent opacity={progress * 0.45} />
          </mesh>
        </group>
      )}

      {/* K value indicator */}
      {progress > 0.5 && (
        <mesh position={[0.5, 0.5, 0]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshBasicMaterial color={progress > 0.7 ? '#34C759' : '#FFD700'} transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  );
}

// ═══════════════════════ DQN DECISION (COMPLETELY REDESIGNED) ═══════════════════════
function DQNLattice({ progress = 0, autoTime = 0 }: { progress?: number; autoTime?: number }) {
  const t = performance.now() * 0.001;
  const highlightIdx = Math.floor(autoTime * 5) % 288;
  const currentLight = highlightIdx % 8;
  const currentPeople = Math.floor((highlightIdx / 8) % 3);
  const currentTime = Math.floor((highlightIdx / 24) % 4);
  const currentWeather = Math.floor((highlightIdx / 96) % 3);

  // State space axes labels
  const stateDims = [
    { label: '光照', levels: 8, current: currentLight, color: '#FFD700', pos: [0, -0.6, 0] },
    { label: '人数', levels: 3, current: currentPeople, color: '#00D4FF', pos: [3, -0.6, 0] },
    { label: '时段', levels: 4, current: currentTime, color: '#34C759', pos: [6, -0.6, 0] },
    { label: '天气', levels: 3, current: currentWeather, color: '#FF9500', pos: [9, -0.6, 0] },
  ];

  return (
    <group position={[0, 0.8, -3.5]}>
      {/* ── Title ── */}
      <Text position={[0, 2.2, 0]} fontSize={0.25} color={GOLD} anchorX="center" anchorY="middle">
        DQN 强化学习 · 状态空间
      </Text>

      {/* ── 4 State dimension bars ── */}
      {stateDims.map((dim, di) => (
        <group key={`dim-${di}`} position={dim.pos}>
          {/* Level indicators */}
          {Array.from({ length: dim.levels }).map((_, li) => {
            const isActive = li === dim.current;
            return (
              <mesh key={`lvl-${li}`} position={[-1.5 + li * 0.4, 0, 0]}>
                <boxGeometry args={[0.25, isActive ? 0.5 : 0.08, 0.25]} />
                <meshStandardMaterial
                  color={dim.color}
                  roughness={isActive ? 0.1 : 0.5}
                  emissive={dim.color}
                  emissiveIntensity={isActive ? 1.2 : 0.1}
                  metalness={isActive ? 0.5 : 0.1}
                />
              </mesh>
            );
          })}
          {/* Dimension label */}
          <Text position={[0, 0.4, 0]} fontSize={0.15} color={dim.color} anchorX="center" anchorY="middle">
            {dim.label} [{dim.current + 1}/{dim.levels}]
          </Text>
        </group>
      ))}

      {/* ── Rewards decomposition ── */}
      <group position={[4.5, 1.2, 0]}>
        <Text position={[0, 0.5, 0]} fontSize={0.12} color={WARM_GRAY} anchorX="center" anchorY="middle">
          R = 0.4×节能 + 0.4×舒适 − 0.2×切换
        </Text>
        {/* Reward bars */}
        {[{ label: '节能', val: 0.72, color: '#34C759' }, { label: '舒适', val: 0.58, color: '#FFD700' }, { label: '切换', val: 0.15, color: '#FF3B30' }].map((r, ri) => (
          <group key={`rew-${ri}`} position={[-1.5 + ri * 1.5, 0, 0]}>
            <mesh position={[0, -r.val / 2, 0]}>
              <boxGeometry args={[0.6, r.val, 0.6]} />
              <meshStandardMaterial color={r.color} roughness={0.2} emissive={r.color} emissiveIntensity={0.4} transparent opacity={0.8} />
            </mesh>
            <Text position={[0, -r.val - 0.15, 0]} fontSize={0.1} color={r.color} anchorX="center" anchorY="top">
              {r.label}: {(ri === 2 ? -1 : 1) * r.val * (ri === 0 ? 0.4 : ri === 1 ? 0.4 : 0.2) * 100}%
            </Text>
          </group>
        ))}
      </group>

      {/* ── Action arrows radiating from best state ── */}
      {Array.from({ length: 9 }).map((_, ai) => {
        const angle = (ai / 9) * Math.PI * 2;
        const dx = Math.cos(angle) * 1.2;
        const dy = Math.sin(angle) * 1.2 + 0.5;
        const isBest = ai === 3;
        return (
          <group key={`act-${ai}`} position={[dx * 0.5, dy * 0.5, 0]}>
            <mesh position={[dx * 0.5, 0, 0]} rotation={[0, 0, angle]}>
              <coneGeometry args={[0.06, 0.18, 8]} />
              <meshStandardMaterial color={isBest ? GOLD : WARM_GRAY} roughness={0.08} metalness={isBest ? 0.6 : 0.2} emissive={isBest ? GOLD : '#000'} emissiveIntensity={isBest ? 1.4 : 0} />
            </mesh>
            {isBest && (
              <Text position={[dx * 0.8, 0.1, 0]} fontSize={0.1} color={GOLD} anchorX="center">
                最优动作
              </Text>
            )}
          </group>
        );
      })}

      {/* ── Q-value surface (simplified grid projection) ── */}
      <group position={[-1, -1.5, 0]}>
        {Array.from({ length: 8 }).map((_, row) =>
          Array.from({ length: 12 }).map((_, col) => {
            const qv = ((row * 12 + col + (autoTime * 10) % 96) * 7) % 100 / 100;
            const h = qv * 0.6;
            return (
              <mesh key={`qv-${row}-${col}`} position={[(col - 5.5) * 0.25, h / 2, (row - 3.5) * 0.25]}>
                <boxGeometry args={[0.2, Math.max(0.02, h), 0.2]} />
                <meshStandardMaterial color={new THREE.Color().setHSL(0.12, 0.3 + qv * 0.5, 0.15 + qv * 0.4)} roughness={0.2} emissive={new THREE.Color().setHSL(0.12, 0.3, 0.05 + qv * 0.25)} emissiveIntensity={0.4} />
              </mesh>
            );
          })
        )}
        <Text position={[0, -0.2, 2]} fontSize={0.12} color={WARM_GRAY} anchorX="center">
          Q-Value 分布 (96格投影)
        </Text>
      </group>
    </group>
  );
}

// ═══════════════════════ CLASSROOM (DEEPLY DETAILED) ═══════════════════════
function ClassroomZone({ activeZones = [true, true, false], naturalLight = 0.5, progress = 0 }: { activeZones?: boolean[]; naturalLight?: number; progress?: number }) {
  const t = performance.now() * 0.001;

  return (
    <group position={[0, 0.5, 0.5]}>
      {/* ══ ROOM SHELL ══ */}
      {/* Floor — detailed tile pattern */}
      <mesh position={[0, -1.3, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 6]} />
        <meshStandardMaterial color="#18181C" roughness={0.65} />
      </mesh>
      {/* Floor grid lines */}
      {Array.from({ length: 9 }).map((_, i) => (
        <Line key={`fg-${i}`} points={[[-4 + i, -1.29, -3], [-4 + i, -1.29, 3]]} color="#1A1A1F" lineWidth={0.2} transparent opacity={0.4} />
      ))}
      {Array.from({ length: 7 }).map((_, i) => (
        <Line key={`fgz-${i}`} points={[[-4, -1.29, -3 + i], [4, -1.29, -3 + i]]} color="#1A1A1F" lineWidth={0.2} transparent opacity={0.4} />
      ))}

      {/* Back wall (podium side) */}
      <mesh position={[0, 0.4, -3]} receiveShadow>
        <boxGeometry args={[8, 2.8, 0.1]} />
        <meshStandardMaterial color="#1C1C24" roughness={0.5} />
      </mesh>
      {/* Blackboard */}
      <mesh position={[0, 0.5, -2.94]}>
        <boxGeometry args={[3.5, 1.4, 0.02]} />
        <meshStandardMaterial color="#0A0A0E" roughness={0.3} />
      </mesh>
      {/* Blackboard frame */}
      <mesh position={[0, 0.5, -2.93]}>
        <boxGeometry args={[3.7, 1.5, 0.01]} />
        <meshStandardMaterial color="#888" roughness={0.3} metalness={0.5} />
      </mesh>

      {/* Front wall (door side) */}
      <mesh position={[0, 0.4, 3]} receiveShadow>
        <boxGeometry args={[8, 2.8, 0.1]} />
        <meshStandardMaterial color="#1E1E26" roughness={0.5} />
      </mesh>
      {/* Door */}
      <mesh position={[-3.2, -0.1, 3]}>
        <boxGeometry args={[0.8, 1.8, 0.02]} />
        <meshStandardMaterial color="#2A2A32" roughness={0.4} />
      </mesh>
      <mesh position={[-3.2, -0.1, 2.96]}>
        <boxGeometry args={[0.85, 1.85, 0.01]} />
        <meshStandardMaterial color="#666" roughness={0.3} metalness={0.5} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-4, 0.4, 0]}>
        <boxGeometry args={[0.1, 2.8, 6]} />
        <meshStandardMaterial color="#22222A" roughness={0.5} />
      </mesh>

      {/* Right wall — with windows */}
      <mesh position={[4, 0.4, 0]}>
        <boxGeometry args={[0.1, 2.8, 6]} />
        <meshStandardMaterial color="#24242C" roughness={0.5} />
      </mesh>
      {/* Window openings */}
      {[-1.5, 0, 1.5].map((wz, wi) => (
        <group key={`win-${wi}`} position={[4.04, 0.5, wz]}>
          {/* Glass */}
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[1.2, 1.6]} />
            <meshStandardMaterial color={WARM_WHITE} roughness={0.03} emissive={WARM_WHITE} emissiveIntensity={naturalLight * 1.6} transparent opacity={0.55} side={THREE.DoubleSide} />
          </mesh>
          {/* Window frame */}
          <mesh position={[0.01, 0, -0.6]}>
            <boxGeometry args={[0.02, 1.6, 0.04]} />
            <meshStandardMaterial color={GOLD} roughness={0.18} metalness={0.7} />
          </mesh>
          <mesh position={[0.01, 0, 0.6]}>
            <boxGeometry args={[0.02, 1.6, 0.04]} />
            <meshStandardMaterial color={GOLD} roughness={0.18} metalness={0.7} />
          </mesh>
          <mesh position={[0.01, 0.8, 0]}>
            <boxGeometry args={[0.02, 0.04, 1.2]} />
            <meshStandardMaterial color={GOLD} roughness={0.18} metalness={0.7} />
          </mesh>
          <mesh position={[0.01, -0.8, 0]}>
            <boxGeometry args={[0.02, 0.04, 1.2]} />
            <meshStandardMaterial color={GOLD} roughness={0.18} metalness={0.7} />
          </mesh>
          {/* Light beam from window */}
          <mesh position={[-2, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
            <planeGeometry args={[3, 1.2]} />
            <meshBasicMaterial color={WARM_WHITE} transparent opacity={naturalLight * 0.06} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        </group>
      ))}

      {/* ══ CEILING LIGHTS (3 ZONES) ══ */}
      {[-2.5, 0, 2.5].map((lx, zi) => {
        const active = activeZones[zi];
        const dimFactor = zi === 1 && naturalLight > 0.4 ? 0.35 : 1;
        const brightness = active ? dimFactor : 0;
        return (
          <group key={`zone-${zi}`} position={[0, 1.2, lx]}>
            {/* Fixture housing */}
            <mesh>
              <boxGeometry args={[1.6, 0.07, 0.3]} />
              <meshStandardMaterial color="#2E2E38" roughness={0.3} metalness={0.25} />
            </mesh>
            {/* Light panel */}
            <mesh position={[0, -0.04, 0]}>
              <boxGeometry args={[1.4, 0.02, 0.22]} />
              <meshStandardMaterial color={WARM_WHITE} roughness={0.04} emissive={WARM_WHITE} emissiveIntensity={brightness * 2.0} />
            </mesh>
            {/* Light cone */}
            {brightness > 0 && (
              <mesh position={[0, -0.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[1.4, 1.1, 8, 1, true]} />
                <meshBasicMaterial color={WARM_WHITE} transparent opacity={0.035 * brightness} side={THREE.DoubleSide} depthWrite={false} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* ══ DESKS (3 rows × 5 cols) ══ */}
      {Array.from({ length: 3 }).map((_, row) =>
        Array.from({ length: 5 }).map((_, col) => (
          <group key={`desk-${row}-${col}`} position={[-3 + col * 1.5, -0.95, -1.5 + row * 1.5]}>
            {/* Tabletop */}
            <mesh castShadow>
              <boxGeometry args={[1.2, 0.07, 0.6]} />
              <meshStandardMaterial color="#24242E" roughness={0.4} />
            </mesh>
            {/* Legs */}
            {[[-0.5, -0.2], [0.5, -0.2], [-0.5, 0.2], [0.5, 0.2]].map(([lx, lz], li) => (
              <mesh key={`leg-${li}`} position={[lx, -0.28, lz]}>
                <cylinderGeometry args={[0.022, 0.028, 0.5, 8]} />
                <meshStandardMaterial color="#3A3A44" roughness={0.3} metalness={0.4} />
              </mesh>
            ))}
          </group>
        ))
      )}

      {/* ══ PERSON FIGURES (silhouette-like) ══ */}
      {[[0, 0], [1, 0], [3, 0], [0, 1], [2, 1], [0, 2], [4, 2], [3, 1]].map(([col, row], i) => {
        const x = -3 + col * 1.5;
        const z = -1.5 + row * 1.5;
        const breathe = 1 + Math.sin(t * 2.5 + i) * 0.08;
        return (
          <group key={`person-${i}`} position={[x, -0.72, z]}>
            {/* Body */}
            <mesh>
              <capsuleGeometry args={[0.12, 0.35, 8, 12]} />
              <meshStandardMaterial color={GOLD} roughness={0.12} emissive={GOLD} emissiveIntensity={0.35} />
            </mesh>
            {/* Head */}
            <mesh position={[0, 0.35, 0]}>
              <sphereGeometry args={[0.09, 16, 16]} />
              <meshStandardMaterial color={GOLD} roughness={0.1} emissive={GOLD} emissiveIntensity={0.45} />
            </mesh>
            {/* Seat glow ring */}
            <mesh position={[0, -0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.15, 0.22, 32]} />
              <meshBasicMaterial color={GOLD} side={THREE.DoubleSide} transparent opacity={0.12 * breathe} />
            </mesh>
          </group>
        );
      })}

      {/* ══ PODIUM ══ */}
      <group position={[0, -0.92, -2.6]}>
        <mesh castShadow>
          <boxGeometry args={[2.5, 0.18, 0.7]} />
          <meshStandardMaterial color="#2C2C36" roughness={0.35} />
        </mesh>
        {/* Podium top surface */}
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[2.4, 0.025, 0.6]} />
          <meshStandardMaterial color="#343440" roughness={0.25} />
        </mesh>
      </group>

      {/* ══ LIGHT METER DISPLAY ══ */}
      <group position={[3.5, 1.0, 2.5]}>
        <mesh>
          <boxGeometry args={[0.6, 0.25, 0.08]} />
          <meshStandardMaterial color="#1A1A20" roughness={0.2} metalness={0.1} />
        </mesh>
        <Text position={[0, 0, 0.05]} fontSize={0.08} color={GOLD} anchorX="center" anchorY="middle">
          {Math.round(naturalLight * 850)} lux
        </Text>
      </group>

      {/* ══ ZONE LABELS ON FLOOR ══ */}
      {['左区', '中区', '右区'].map((label, zi) => (
        <Text key={`zl-${zi}`} position={[-2.5 + zi * 2.5, -1.28, 2.5]} fontSize={0.12} color={activeZones[zi] ? GOLD : '#333'} anchorX="center" anchorY="middle">
          {label} {activeZones[zi] ? '● 160W' : '○ OFF'}
        </Text>
      ))}
    </group>
  );
}

// ═══════════════════════ ABLATION ═══════════════════════
function AblationPillars({ progress = 0 }: { progress: number }) {
  const data = [
    { label: '纯红外', acc: 65, color: '#2A2A38', desc: '基线' },
    { label: '+雷达', acc: 76, color: '#3A3A48', desc: '+11%' },
    { label: '+视觉', acc: 85, color: '#505868', desc: '+9%' },
    { label: '+D-S融', acc: 93, color: '#687888', desc: '+8%' },
    { label: '+滞回', acc: 93, color: '#8098A0', desc: '开关减半' },
    { label: '+DQN', acc: 98.7, color: GOLD, desc: '+5.7%' },
  ];
  const t = performance.now() * 0.001;

  return (
    <group position={[0, -0.2, -1.5]}>
      {/* Base platform */}
      <mesh position={[0, -0.06, 0]} castShadow receiveShadow>
        <boxGeometry args={[9.5, 0.1, 1.4]} />
        <meshStandardMaterial color="#14141A" roughness={0.28} metalness={0.08} />
      </mesh>
      {/* Platform edge trim */}
      <mesh position={[0, -0.01, 0.68]}>
        <boxGeometry args={[9.5, 0.02, 0.04]} />
        <meshStandardMaterial color={GOLD} roughness={0.15} metalness={0.7} />
      </mesh>

      {data.map((d, i) => {
        const h = (d.acc / 100) * 5 * Math.min(1, Math.max(0, progress * 6 - i * 0.7));
        const isLast = i === 5;
        const complete = isLast && h > 4.5;
        return (
          <group key={i} position={[-4.2 + i * 1.7, h / 2, 0]}>
            {/* Pillar */}
            <mesh castShadow>
              <boxGeometry args={[0.7, Math.max(0.06, h), 0.7]} />
              <meshStandardMaterial color={d.color} roughness={0.22} metalness={0.12} emissive={complete ? GOLD : '#000'} emissiveIntensity={complete ? 0.9 : 0} />
            </mesh>
            {/* Glowing top cap */}
            <mesh position={[0, h / 2 + 0.04, 0]}>
              <boxGeometry args={[0.6, 0.04, 0.6]} />
              <meshStandardMaterial color={complete ? GOLD : d.color} roughness={0.1} emissive={complete ? GOLD : d.color} emissiveIntensity={0.6} />
            </mesh>
            {/* Ring glow for final pillar */}
            {complete && (
              <mesh position={[0, h / 2 + 0.1, 0]}>
                <torusGeometry args={[0.4, 0.035, 16, 48]} />
                <meshStandardMaterial color={GOLD} roughness={0.06} metalness={0.85} emissive={GOLD} emissiveIntensity={1.5} />
              </mesh>
            )}
            {/* Label */}
            <Text position={[0, -h / 2 - 0.2, 0]} fontSize={0.12} color={complete ? GOLD : WARM_GRAY} anchorX="center" anchorY="top">
              {d.label}
            </Text>
            {/* Accuracy value */}
            <Text position={[0, h / 2 + (complete ? 0.3 : 0.15), 0]} fontSize={0.1} color={complete ? GOLD : WARM_GRAY} anchorX="center" anchorY="bottom">
              {d.acc}%
            </Text>
            {/* Description */}
            <Text position={[0, -h / 2 - 0.4, 0]} fontSize={0.08} color="#555" anchorX="center" anchorY="top">
              {d.desc}
            </Text>
          </group>
        );
      })}

      {/* Rising gold particles from final pillar when complete */}
      {progress > 0.85 && (
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={30} array={(() => { const a = new Float32Array(90); for (let i = 0; i < 30; i++) { a[i * 3] = 4.3 + (Math.sin(t * 4 + i) * 0.3); a[i * 3 + 1] = 2.2 + ((t * 1.2 + i * 0.3) % 2.5); a[i * 3 + 2] = (Math.cos(t * 4 + i) * 0.3); } return a; })()} itemSize={3} />
          </bufferGeometry>
          <pointsMaterial size={0.04} color={GOLD} transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} />
        </points>
      )}
    </group>
  );
}

// ═══════════════════════ CAMERA RIG ═══════════════════════
function CameraRig({ mode, moduleId, autoTime }: { mode: 'auto' | 'free'; moduleId: ModuleId; autoTime: number }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const targetPos = useRef(new THREE.Vector3(0, 5, 11));
  const targetLook = useRef(new THREE.Vector3(0, 0.2, 0));

  const moduleCameras: Record<ModuleId, { pos: [number, number, number]; lookAt: [number, number, number] }> = {
    overview:    { pos: [0, 3.5, 9],   lookAt: [0, 0.4, 0] },
    compression: { pos: [-2.5, 2.2, 5], lookAt: [0, 2.0, -2.2] },
    fusion:      { pos: [3.5, 0.8, 2], lookAt: [0, 1.0, 0] },
    dqn:         { pos: [-2, 2, 5],    lookAt: [0, 0.8, -3.5] },
    classroom:   { pos: [2, 6.5, 2.5], lookAt: [0, -0.3, 0.5] },
    ablation:    { pos: [5.5, 1.8, 6.5], lookAt: [0, 0, -1.5] },
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

  return mode === 'free' ? <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.08} minDistance={2} maxDistance={16} target={[0, 0.5, 0]} /> : null;
}

// ═══════════════════════ SCENE CONTENT ═══════════════════════
function SceneContent({ moduleId, autoTime }: { moduleId: ModuleId; autoTime: number }) {
  const starts: Record<ModuleId, number> = { overview: 0, compression: 8, fusion: 18, dqn: 28, classroom: 38, ablation: 48 };
  const ends: Record<ModuleId, number> = { overview: 8, compression: 18, fusion: 28, dqn: 38, classroom: 48, ablation: 60 };
  const mp = Math.min(1, Math.max(0, (autoTime - (starts[moduleId] || 0)) / ((ends[moduleId] || 60) - (starts[moduleId] || 0))));

  const npuActive = useMemo(() => {
    if (moduleId === 'overview') return 0.2 + Math.sin(autoTime * 2.5) * 0.15;
    if (moduleId === 'fusion') return 0.4 + mp * 0.6;
    return 0.15;
  }, [moduleId, mp, autoTime]);

  return (
    <>
      {(moduleId === 'overview' || moduleId === 'compression' || moduleId === 'fusion') && <CustomPCBBoard npuActive={npuActive} />}
      {moduleId === 'compression' && <ModelCompressionVisual progress={mp} />}
      {moduleId === 'fusion' && <DSFusionStreams progress={mp} />}
      {moduleId === 'dqn' && <DQNLattice progress={mp} autoTime={autoTime} />}
      {moduleId === 'classroom' && <ClassroomZone activeZones={[true, mp > 0.3, mp > 0.6]} naturalLight={0.2 + mp * 0.7} progress={mp} />}
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
    <section ref={sectionRef} className="section-full relative overflow-hidden" style={{ background: '#060B14' }}>
      <div className="absolute top-0 left-0 right-0 h-24 z-10 pointer-events-none" style={{ background: 'linear-gradient(to bottom, #060B14 0%, transparent 100%)' }} />
      <div className="absolute inset-0" style={{ pointerEvents: mode === 'auto' ? 'none' : 'auto' }}>
        <Canvas camera={{ position: [0, 5, 11], fov: 38, near: 0.1, far: 55 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }} dpr={[1, 2]} style={{ pointerEvents: mode === 'auto' ? 'none' : 'auto' }}>
          <color attach="background" args={['#060B14']} />
          <fog attach="fog" args={['#060B14', 12, 50]} />
          <LightingSetup />
          <AtmosphericDust />
          <Suspense fallback={null}>
            <SceneContent moduleId={moduleId} autoTime={autoTime} />
          </Suspense>
          <CameraRig mode={mode} moduleId={moduleId} autoTime={autoTime} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.8, 0]} receiveShadow>
            <planeGeometry args={[25, 25]} />
            <shadowMaterial transparent opacity={0.1} />
          </mesh>
        </Canvas>
      </div>
      <SensorShowcaseOverlay mode={mode} moduleId={moduleId} autoTime={autoTime} modules={MODULE_LIST} onModuleClick={handleModuleClick} onModeToggle={() => setMode(m => m === 'auto' ? 'free' : 'auto')} onReset={handleReset} autoPlaying={autoPlaying} />
    </section>
  );
}
