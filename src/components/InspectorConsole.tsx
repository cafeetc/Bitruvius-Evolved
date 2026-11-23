import React, { useEffect, useRef, useState } from 'react';
import {
  ANGLE_PRECISION_STEP,
  ArmatureState,
  BONE_SCALE_MAX,
  BONE_SCALE_MIN,
  ComputedJoint,
  EnvironmentalAnchorId,
  GridConfig,
  GridOriginMode,
  JointId,
  JointMode,
  MEGAPYXL_PX,
  PAPER_HEIGHT,
  PAPER_WIDTH,
  PYXL_PX,
  PhysicsModeId,
  PosePresetId,
  PoseSnapshot,
  SUBPYXL_PX,
  SnapMode,
} from '../types';
import {
  ENVIRONMENTAL_ANCHORS,
  JOINT_SPECS,
  PHYSICS_MODE_INFO,
  applyJointAngleConstraint,
  computeModelWorkingSquare,
  formatSignedDeg,
  formatSignedNum,
  getPhysicsMultiplier,
} from '../utils/kinematics';

interface InspectorConsoleProps {
  armature: ArmatureState;
  computedJoints: Record<JointId, ComputedJoint>;
  selectedJointId: JointId;
  onSelectJoint: (id: JointId) => void;
  onChangeJointAngle: (id: JointId, nextLocalAngle: number, applyPhysicsDelta?: boolean) => void;
  onSetContinuousSpin: (enabled: boolean) => void;
  onChangePhysicsMode: (id: JointId, mode: PhysicsModeId) => void;
  onChangeModeERatio: (id: JointId, ratio: number) => void;
  onChangeBoneScale: (id: JointId, patch: { scaleLength?: number; scaleWidth?: number }) => void;
  onChangeEnvironmentalAnchor: (anchor: EnvironmentalAnchorId) => void;
  onToggleAnchorPin: () => void;
  onChangeRootPosition: (x: number, y: number) => void;
  onChangeJointMode: (id: JointId, mode: JointMode) => void;
  snapshots: PoseSnapshot[];
  onSaveSnapshot: () => void;
  onRecallSnapshot: (snapshot: PoseSnapshot) => void;
  onDeleteSnapshot: (id: string) => void;
  grid: GridConfig;
  onUpdateGrid: (patch: Partial<GridConfig>) => void;
  borderOpacity: number;
  onBorderOpacityChange: (val: number) => void;
  showFigure: boolean;
  onToggleFigure: () => void;
  showAllBadges: boolean;
  onToggleAllBadges: () => void;
  onSelectPreset: (preset: PosePresetId) => void;
}

type ConsoleTabId = 'pose' | 'physics' | 'rig' | 'stage';

const CONSOLE_TABS: { id: ConsoleTabId; label: string; requiresFigure?: boolean }[] = [
  { id: 'pose', label: 'Pose', requiresFigure: true },
  { id: 'physics', label: 'Physics', requiresFigure: true },
  { id: 'rig', label: 'Rig', requiresFigure: true },
  { id: 'stage', label: 'Stage' },
];

const MODE_OPTIONS: { mode: JointMode; glyph: string; label: string }[] = [
  { mode: 'FK', glyph: '○', label: 'FK' },
  { mode: 'IK', glyph: '●', label: 'IK' },
  { mode: 'PIN', glyph: '■', label: 'PIN' },
];

const PHYSICS_ORDER: PhysicsModeId[] = [
  'twins',
  'elastic_rubber',
  'damp',
  'rigid',
  'mode_e',
];

export const InspectorConsole: React.FC<InspectorConsoleProps> = ({
  armature,
  computedJoints,
  selectedJointId,
  onSelectJoint,
  onChangeJointAngle,
  onSetContinuousSpin,
  onChangePhysicsMode,
  onChangeModeERatio,
  onChangeBoneScale,
  onChangeEnvironmentalAnchor,
  onToggleAnchorPin,
  onChangeRootPosition,
  onChangeJointMode,
  snapshots,
  onSaveSnapshot,
  onRecallSnapshot,
  onDeleteSnapshot,
  grid,
  onUpdateGrid,
  borderOpacity,
  onBorderOpacityChange,
  showFigure,
  onToggleFigure,
  showAllBadges,
  onToggleAllBadges,
  onSelectPreset,
}) => {
  const [activeTab, setActiveTab] = useState<ConsoleTabId>('pose');

  useEffect(() => {
    if (!showFigure && activeTab !== 'stage') {
      setActiveTab('stage');
    }
  }, [activeTab, showFigure]);

  const selected = computedJoints[selectedJointId];
  const selectedRuntime = armature.joints[selectedJointId];
  const originX = grid.originMode === 'center' ? PAPER_WIDTH / 2 : 0;
  const originY = grid.originMode === 'center' ? PAPER_HEIGHT / 2 : 0;

  const relX = selected.x - originX;
  const relY = selected.y - originY;

  const [angleInput, setAngleInput] = useState(selected.localAngle.toFixed(2));
  const [rootXInput, setRootXInput] = useState((armature.rootX - originX).toFixed(2));
  const [rootYInput, setRootYInput] = useState((armature.rootY - originY).toFixed(2));
  const [editingModeE, setEditingModeE] = useState(false);
  const [modeEText, setModeEText] = useState(selectedRuntime.modeERatio.toFixed(2));
  const [sampleHover, setSampleHover] = useState(false);

  const sliderTrackRef = useRef<{ lastRaw: number; unquantizedAngle: number }>({
    lastRaw: selected.localAngle,
    unquantizedAngle: selected.localAngle,
  });

  useEffect(() => {
    setAngleInput(selected.localAngle.toFixed(2));
    sliderTrackRef.current = {
      lastRaw: selected.localAngle,
      unquantizedAngle: selected.localAngle,
    };
  }, [selected.id, selected.localAngle]);

  useEffect(() => {
    setRootXInput((armature.rootX - originX).toFixed(2));
    setRootYInput((armature.rootY - originY).toFixed(2));
  }, [armature.rootX, armature.rootY, originX, originY]);

  useEffect(() => {
    setEditingModeE(false);
    setModeEText(selectedRuntime.modeERatio.toFixed(2));
  }, [selected.id, selectedRuntime.modeERatio]);

  const physicsMultiplier = getPhysicsMultiplier(selectedRuntime);
  const isAngleLocked = selected.mode === 'PIN' || selectedRuntime.physicsMode === 'rigid';

  const commitAngleInput = () => {
    const parsed = parseFloat(angleInput);
    if (!Number.isNaN(parsed)) {
      const nextAngle = applyJointAngleConstraint(parsed, armature.continuousSpin);
      onChangeJointAngle(selected.id, nextAngle, false);
    } else {
      setAngleInput(selected.localAngle.toFixed(2));
    }
  };

  const handleSliderChange = (rawTarget: number) => {
    const delta = rawTarget - sliderTrackRef.current.lastRaw;
    sliderTrackRef.current.lastRaw = rawTarget;

    const scaledDelta = delta * physicsMultiplier;
    const nextUnquantized = sliderTrackRef.current.unquantizedAngle + scaledDelta;
    const boundedUnquantized = armature.continuousSpin
      ? nextUnquantized
      : Math.max(-180, Math.min(180, nextUnquantized));

    sliderTrackRef.current.unquantizedAngle = boundedUnquantized;
    const nextAngle = applyJointAngleConstraint(boundedUnquantized, armature.continuousSpin);
    onChangeJointAngle(selected.id, nextAngle, false);
  };

  const handleNudgeAngle = (dir: -1 | 1) => {
    if (isAngleLocked) return;
    const delta = dir * ANGLE_PRECISION_STEP * physicsMultiplier;
    const nextAngle = applyJointAngleConstraint(
      selected.localAngle + delta,
      armature.continuousSpin
    );
    onChangeJointAngle(selected.id, nextAngle, false);
  };

  const commitModeEText = () => {
    const parsed = parseFloat(modeEText.replace(/×|x/gi, '').trim());
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 10) {
      const rounded = Math.round(parsed * 100) / 100;
      onChangeModeERatio(selected.id, rounded);
      setModeEText(rounded.toFixed(2));
    } else {
      setModeEText(selectedRuntime.modeERatio.toFixed(2));
    }
    setEditingModeE(false);
  };

  const commitRootCoords = () => {
    if (armature.isAnchorPinned) {
      setRootXInput((armature.rootX - originX).toFixed(2));
      setRootYInput((armature.rootY - originY).toFixed(2));
      return;
    }
    const px = parseFloat(rootXInput);
    const py = parseFloat(rootYInput);
    if (!Number.isNaN(px) && !Number.isNaN(py)) {
      onChangeRootPosition(px + originX, py + originY);
    } else {
      setRootXInput((armature.rootX - originX).toFixed(2));
      setRootYInput((armature.rootY - originY).toFixed(2));
    }
  };

  const sliderMin = armature.continuousSpin
    ? Math.min(-360, Math.floor((selected.localAngle - 180) / 90) * 90)
    : -180;
  const sliderMax = armature.continuousSpin
    ? Math.max(360, Math.ceil((selected.localAngle + 180) / 90) * 90)
    : 180;

  return (
    <aside className="w-full h-[27vh] lg:h-full lg:w-[clamp(268px,24vw,324px)] console-panel border-b-0 border-r-0 lg:border-t-0 flex flex-col z-10 shrink-0 overflow-hidden">
      {/* Compact Sticky Tab Strip (eliminates long scrolling across stacked menus) */}
      <nav
        aria-label="Console Sections"
        className="grid grid-cols-4 border-b border-[#EBE0F5]/14 bg-[#0D0012]/90 shrink-0"
      >
        {CONSOLE_TABS.map((tab) => {
          const disabled = Boolean(tab.requiresFigure && !showFigure);
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              disabled={disabled}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 font-typewriter font-bold text-[11px] tracking-wide border-b-2 transition-colors ${
                disabled
                  ? 'border-transparent text-[#8B7B9E]/35 cursor-not-allowed'
                  : isActive
                  ? 'border-[#D8B4FE] bg-[#250A33]/75 text-[#FAF6FF] cursor-pointer'
                  : 'border-transparent text-[#B8A9C9] hover:text-[#FAF6FF] hover:bg-[#1B0426] cursor-pointer'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Focused Active Tab Content */}
      <div className="flex-1 overflow-y-auto console-scroll p-3 space-y-2.5">
        {/* TAB 1: POSE (FK/IK/PIN, 0.25° Angle, Continuous Spin, World X/Y, Pose Snapshots) */}
        {activeTab === 'pose' && showFigure && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-typewriter font-bold text-xs text-[#FAF6FF] truncate">
                  {selected.spec.label}
                </h3>
                <p className="font-vera text-[9.5px] text-[#B8A9C9] truncate">
                  {selected.spec.subtitle}
                </p>
              </div>
              <span className="font-typewriter font-bold text-[10.5px] px-1.5 py-0.5 bg-[#0D0012] border border-[#EBE0F5]/18 rounded-[2px] text-[#D8B4FE] shrink-0">
                {selected.spec.shortCode}
              </span>
            </div>

            {selected.id !== 'waist' && (
              <div className="grid grid-cols-3 gap-1 bg-[#0D0012]/80 p-0.5 border border-[#EBE0F5]/14 rounded-[2px]">
                {MODE_OPTIONS.map((opt) => {
                  const active = selected.mode === opt.mode;
                  const ikDisabled = opt.mode === 'IK' && !selected.spec.ikChain;
                  return (
                    <button
                      key={opt.mode}
                      type="button"
                      disabled={ikDisabled}
                      onClick={() => onChangeJointMode(selected.id, opt.mode)}
                      className={`py-1 text-[10px] font-typewriter font-bold rounded-[2px] flex items-center justify-center gap-1 ${
                        ikDisabled
                          ? 'opacity-30 cursor-not-allowed text-[#8B7B9E]'
                          : active
                          ? 'bg-[#361547] text-[#FAF6FF] border border-[#D8B4FE]/40 cursor-pointer'
                          : 'text-[#B8A9C9] hover:text-[#FAF6FF] border border-transparent cursor-pointer'
                      }`}
                    >
                      <span>{opt.glyph}</span>
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Precision 0.25° Rotation + Continuous Spin */}
            <div className="space-y-1.5 bg-[#0D0012]/70 border border-[#EBE0F5]/12 rounded-[2px] p-2.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="joint-angle-input"
                  className="font-typewriter font-bold text-[10.5px] text-[#D9CDE6]"
                >
                  {selected.id === 'waist' ? 'Root Tilt' : 'Local Angle'}
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={isAngleLocked}
                    onClick={() => handleNudgeAngle(-1)}
                    title="Step -0.25° (scaled by Physics Mode)"
                    className="px-1.5 py-0.5 font-typewriter font-bold text-[10px] bg-[#16001E] hover:bg-[#361547] border border-[#EBE0F5]/20 rounded-[2px] text-[#E9D5FF] disabled:opacity-35 cursor-pointer"
                  >
                    -0.25°
                  </button>
                  <input
                    id="joint-angle-input"
                    type="text"
                    disabled={isAngleLocked}
                    value={angleInput}
                    onChange={(e) => setAngleInput(e.target.value)}
                    onBlur={commitAngleInput}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitAngleInput();
                    }}
                    className="w-18 px-1.5 py-0.5 text-right font-typewriter font-bold text-[11px] text-[#FAF6FF] bg-[#16001E] border border-[#EBE0F5]/22 rounded-[2px] focus:outline-none focus:border-[#D8B4FE] disabled:opacity-50"
                  />
                  <button
                    type="button"
                    disabled={isAngleLocked}
                    onClick={() => handleNudgeAngle(1)}
                    title="Step +0.25° (scaled by Physics Mode)"
                    className="px-1.5 py-0.5 font-typewriter font-bold text-[10px] bg-[#16001E] hover:bg-[#361547] border border-[#EBE0F5]/20 rounded-[2px] text-[#E9D5FF] disabled:opacity-35 cursor-pointer"
                  >
                    +0.25°
                  </button>
                </div>
              </div>

              <input
                type="range"
                min={sliderMin}
                max={sliderMax}
                step={ANGLE_PRECISION_STEP}
                value={Math.max(sliderMin, Math.min(sliderMax, selected.localAngle))}
                disabled={isAngleLocked}
                onPointerDown={() => {
                  sliderTrackRef.current = {
                    lastRaw: selected.localAngle,
                    unquantizedAngle: selected.localAngle,
                  };
                }}
                onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
                className="w-full bitruvius-slider"
              />

              <div className="flex items-center justify-between pt-0.5">
                <span className="font-vera text-[9.5px] text-[#9E8EB3]">
                  {armature.continuousSpin ? '>360° Free Sweep' : '±180.00° Clamp'}
                </span>
                <button
                  type="button"
                  onClick={() => onSetContinuousSpin(!armature.continuousSpin)}
                  className={`px-2 py-0.5 text-[10px] font-typewriter font-bold rounded-[2px] border cursor-pointer transition-colors ${
                    armature.continuousSpin
                      ? 'bg-[#361547] border-[#D8B4FE]/45 text-[#FAF6FF]'
                      : 'bg-[#16001E] border-[#EBE0F5]/16 text-[#9E8EB3] hover:text-[#FAF6FF]'
                  }`}
                >
                  {armature.continuousSpin ? 'Spin: Continuous' : 'Spin: Clamped'}
                </button>
              </div>
            </div>

            {/* Compact X / Y Readout & Root Anchor Translation */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-[#0D0012]/65 border border-[#EBE0F5]/12 rounded-[2px] px-2 py-1">
                <div className="flex items-center justify-between">
                  <span className="font-vera text-[9.5px] text-[#9E8EB3]">World X</span>
                  <span className="font-typewriter text-[9.5px] text-[#C8B2E0]">
                    {formatSignedNum(relX / PYXL_PX)} pyx
                  </span>
                </div>
                {selected.id === 'waist' && !armature.isAnchorPinned ? (
                  <input
                    type="text"
                    value={rootXInput}
                    onChange={(e) => setRootXInput(e.target.value)}
                    onBlur={commitRootCoords}
                    onKeyDown={(e) => e.key === 'Enter' && commitRootCoords()}
                    className="w-full mt-0.5 px-1 py-0.5 font-typewriter font-bold text-[10.5px] text-[#FAF6FF] bg-[#16001E] border border-[#EBE0F5]/20 rounded-[2px]"
                  />
                ) : (
                  <div className="font-typewriter font-bold text-[10.5px] text-[#FAF6FF]">
                    {formatSignedNum(relX)} px
                  </div>
                )}
              </div>
              <div className="bg-[#0D0012]/65 border border-[#EBE0F5]/12 rounded-[2px] px-2 py-1">
                <div className="flex items-center justify-between">
                  <span className="font-vera text-[9.5px] text-[#9E8EB3]">World Y</span>
                  <span className="font-typewriter text-[9.5px] text-[#C8B2E0]">
                    {formatSignedNum(relY / PYXL_PX)} pyx
                  </span>
                </div>
                {selected.id === 'waist' && !armature.isAnchorPinned ? (
                  <input
                    type="text"
                    value={rootYInput}
                    onChange={(e) => setRootYInput(e.target.value)}
                    onBlur={commitRootCoords}
                    onKeyDown={(e) => e.key === 'Enter' && commitRootCoords()}
                    className="w-full mt-0.5 px-1 py-0.5 font-typewriter font-bold text-[10.5px] text-[#FAF6FF] bg-[#16001E] border border-[#EBE0F5]/20 rounded-[2px]"
                  />
                ) : (
                  <div className="font-typewriter font-bold text-[10.5px] text-[#FAF6FF]">
                    {formatSignedNum(relY)} px
                  </div>
                )}
              </div>
            </div>

            {/* Quick Presets (narrow screens) + Compact Pose Snapshots */}
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-typewriter font-bold text-[11px] text-[#FAF6FF]">
                  Pose Snapshots
                </span>
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-0.5 xl:hidden">
                    {(['vitruvian', 'contrapposto', 'tpose'] as PosePresetId[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => onSelectPreset(p)}
                        className="px-1.5 py-0.5 text-[9.5px] font-typewriter font-bold bg-[#21072B] border border-[#EBE0F5]/14 rounded-[2px] text-[#E6DCF0] cursor-pointer capitalize"
                      >
                        {p === 'contrapposto' ? 'Contra' : p}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={onSaveSnapshot}
                    className="px-2 py-0.5 font-typewriter font-bold text-[10px] bg-[#361547] hover:bg-[#491E60] border border-[#D8B4FE]/40 rounded-[2px] text-[#FAF6FF] cursor-pointer"
                  >
                    + Save Pose
                  </button>
                </div>
              </div>

              {snapshots.length === 0 ? (
                <div className="font-vera text-[10px] text-[#9E8EB3] bg-[#0D0012]/50 border border-[#EBE0F5]/10 rounded-[2px] px-2 py-1.5">
                  Save snapshots to transition poses via shortest-path angular wrapping.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1">
                  {snapshots.map((snap) => (
                    <div
                      key={snap.id}
                      className="px-2 py-1 flex items-center justify-between gap-1.5 bg-[#0D0012]/65 border border-[#EBE0F5]/14 rounded-[2px] hover:bg-[#21072B]/80"
                    >
                      <button
                        type="button"
                        onClick={() => onRecallSnapshot(snap)}
                        className="flex-1 text-left flex items-center justify-between gap-2 cursor-pointer min-w-0"
                      >
                        <span className="font-typewriter font-bold text-[10px] text-[#FAF6FF] truncate">
                          {snap.name}
                        </span>
                        <span className="font-vera text-[9px] text-[#C8B2E0] shrink-0">
                          {snap.normalizedOnSave ? 'Norm 180°' : 'Raw Sweep'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSnapshot(snap.id)}
                        title="Delete snapshot"
                        className="px-1 font-typewriter font-bold text-[11px] text-[#9E8EB3] hover:text-[#FCA5A5] cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PHYSICS (5 Physics Modes + Mode E Blend + Bone-Axis Scaling) */}
        {activeTab === 'physics' && showFigure && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-typewriter font-bold text-xs text-[#FAF6FF] truncate">
                {selected.spec.label}
              </span>
              <span className="font-typewriter font-bold text-[11px] text-[#D8B4FE] shrink-0">
                {physicsMultiplier.toFixed(2)}×
              </span>
            </div>

            {/* 5 Joint Physics Modes */}
            <div className="space-y-1.5 bg-[#0D0012]/70 border border-[#EBE0F5]/12 rounded-[2px] p-2.5">
              <div className="grid grid-cols-2 gap-1">
                {PHYSICS_ORDER.map((pmId) => {
                  const info = PHYSICS_MODE_INFO[pmId];
                  const active = selectedRuntime.physicsMode === pmId;
                  return (
                    <button
                      key={pmId}
                      type="button"
                      title={info.description}
                      onClick={() => onChangePhysicsMode(selected.id, pmId)}
                      className={`px-2 py-1 text-left rounded-[2px] border transition-colors cursor-pointer ${
                        pmId === 'mode_e' ? 'col-span-2 flex items-center justify-between' : ''
                      } ${
                        active
                          ? 'bg-[#361547] border-[#D8B4FE]/45 text-[#FAF6FF]'
                          : 'bg-[#16001E]/75 border-[#EBE0F5]/12 text-[#B8A9C9] hover:text-[#FAF6FF]'
                      }`}
                    >
                      <span className="font-typewriter font-bold text-[10px] block">
                        {info.label}
                      </span>
                      <span className="font-vera text-[9.5px] text-[#C8B2E0]">
                        {pmId === 'mode_e'
                          ? `${selectedRuntime.modeERatio.toFixed(2)}× Custom`
                          : info.shortLabel}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedRuntime.physicsMode === 'mode_e' && (
                <div className="pt-1.5 mt-1 border-t border-[#EBE0F5]/12 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-vera text-[10px] text-[#B8A9C9]">
                      Mode E Blend Factor
                    </span>
                    {editingModeE ? (
                      <input
                        type="text"
                        autoFocus
                        value={modeEText}
                        onChange={(e) => setModeEText(e.target.value)}
                        onBlur={commitModeEText}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitModeEText();
                          if (e.key === 'Escape') {
                            setModeEText(selectedRuntime.modeERatio.toFixed(2));
                            setEditingModeE(false);
                          }
                        }}
                        className="w-20 px-1.5 py-0.5 text-right font-typewriter font-bold text-[11px] text-[#FAF6FF] bg-[#16001E] border border-[#D8B4FE] rounded-[2px] focus:outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setModeEText(selectedRuntime.modeERatio.toFixed(2));
                          setEditingModeE(true);
                        }}
                        title="Click to type custom multiplier (e.g. 0.85, 2.20)"
                        className="px-2 py-0.5 font-typewriter font-bold text-[11px] text-[#FAF6FF] bg-[#250A33] hover:bg-[#361547] border border-[#D8B4FE]/35 rounded-[2px] cursor-text"
                      >
                        {selectedRuntime.modeERatio.toFixed(2)}×
                      </button>
                    )}
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={1.5}
                    step={0.01}
                    value={Math.max(0.5, Math.min(1.5, selectedRuntime.modeERatio))}
                    onChange={(e) =>
                      onChangeModeERatio(selected.id, parseFloat(e.target.value))
                    }
                    className="w-full bitruvius-slider"
                  />
                </div>
              )}
            </div>

            {/* Non-Uniform Bone-Axis Scaling (0.50x - 2.00x) */}
            <div className="space-y-1.5 bg-[#0D0012]/70 border border-[#EBE0F5]/12 rounded-[2px] p-2.5">
              <div className="flex items-center justify-between">
                <span className="font-typewriter font-bold text-[10.5px] text-[#D9CDE6]">
                  Bone-Axis Scaling
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onChangeBoneScale(selected.id, { scaleLength: 1.0, scaleWidth: 1.0 })
                  }
                  className="font-typewriter text-[10px] text-[#C8B2E0] hover:text-[#FAF6FF] cursor-pointer"
                >
                  1.00× Reset
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-vera text-[10px] text-[#B8A9C9]">Length Axis</span>
                    <span className="font-typewriter font-bold text-[10.5px] text-[#FAF6FF]">
                      {selectedRuntime.scaleLength.toFixed(2)}×
                    </span>
                  </div>
                  <input
                    type="range"
                    min={BONE_SCALE_MIN}
                    max={BONE_SCALE_MAX}
                    step={0.01}
                    value={selectedRuntime.scaleLength}
                    onChange={(e) =>
                      onChangeBoneScale(selected.id, { scaleLength: parseFloat(e.target.value) })
                    }
                    className="w-full bitruvius-slider"
                  />
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-vera text-[10px] text-[#B8A9C9]">Width Axis</span>
                    <span className="font-typewriter font-bold text-[10.5px] text-[#FAF6FF]">
                      {selectedRuntime.scaleWidth.toFixed(2)}×
                    </span>
                  </div>
                  <input
                    type="range"
                    min={BONE_SCALE_MIN}
                    max={BONE_SCALE_MAX}
                    step={0.01}
                    value={selectedRuntime.scaleWidth}
                    onChange={(e) =>
                      onChangeBoneScale(selected.id, { scaleWidth: parseFloat(e.target.value) })
                    }
                    className="w-full bitruvius-slider"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RIG (Keystone & Environmental Anchor + Compact 18-Joint Ledger) */}
        {activeTab === 'rig' && showFigure && (
          <div className="space-y-2.5">
            <div className="space-y-2 bg-[#0D0012]/70 border border-[#EBE0F5]/12 rounded-[2px] p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-typewriter font-bold text-[11px] text-[#FAF6FF]">
                  Environmental Anchor
                </span>
                <span className="font-typewriter text-[9.5px] px-1.5 py-0.5 bg-[#16001E] border border-[#FBBF24]/30 rounded-[2px] text-[#FDE68A]">
                  Keystone: Navel
                </span>
              </div>

              <div className="grid grid-cols-3 lg:grid-cols-2 gap-1">
                {ENVIRONMENTAL_ANCHORS.map((anc) => {
                  const active = armature.environmentalAnchor === anc.id;
                  return (
                    <button
                      key={anc.id}
                      type="button"
                      onClick={() => onChangeEnvironmentalAnchor(anc.id)}
                      className={`px-2 py-1 text-[10px] font-typewriter font-bold rounded-[2px] border text-left truncate cursor-pointer ${
                        active
                          ? 'bg-[#361547] border-[#D8B4FE]/45 text-[#FAF6FF]'
                          : 'bg-[#16001E]/75 border-[#EBE0F5]/12 text-[#B8A9C9] hover:text-[#FAF6FF]'
                      }`}
                    >
                      {anc.label}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={onToggleAnchorPin}
                  className={`py-1 px-2 rounded-[2px] border flex items-center justify-between text-[10px] font-typewriter font-bold cursor-pointer ${
                    armature.isAnchorPinned
                      ? 'bg-[#1D2B44]/75 border-[#7DD3FC]/45 text-[#E0F2FE]'
                      : 'bg-[#16001E]/75 border-[#FBBF24]/30 text-[#FDE68A]'
                  }`}
                >
                  <span>{armature.isAnchorPinned ? 'Pin: Locked' : 'Pin: Free'}</span>
                  <span>{armature.isAnchorPinned ? '■' : '○'}</span>
                </button>
                <button
                  type="button"
                  onClick={onToggleAllBadges}
                  className={`py-1 px-2 text-[10px] font-typewriter font-bold rounded-[2px] border cursor-pointer ${
                    showAllBadges
                      ? 'bg-[#361547] border-[#D8B4FE]/35 text-[#FAF6FF]'
                      : 'bg-[#16001E]/75 border-[#EBE0F5]/12 text-[#9E8EB3]'
                  }`}
                >
                  {showAllBadges ? 'Rails: All 18' : 'Rails: Focus'}
                </button>
              </div>
            </div>

            {/* Dense 2-Column 18-Joint Switcher (Zero long vertical list scrolling) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-typewriter font-bold text-[10.5px] text-[#D9CDE6]">
                  18-Joint Ledger
                </span>
                <span className="font-vera text-[9.5px] text-[#9E8EB3]">
                  Tap to select
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-1">
                {JOINT_SPECS.map((spec) => {
                  const j = computedJoints[spec.id];
                  const isSelected = selectedJointId === spec.id;
                  return (
                    <button
                      key={spec.id}
                      type="button"
                      onClick={() => onSelectJoint(spec.id)}
                      className={`px-2 py-1 rounded-[2px] border flex items-center justify-between text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#361547] border-[#D8B4FE]/45 text-[#FAF6FF]'
                          : 'bg-[#0D0012]/65 border-[#EBE0F5]/12 text-[#D9CDE6] hover:bg-[#21072B]/80'
                      }`}
                    >
                      <span className="font-typewriter font-bold text-[9.5px] text-[#C8B2E0]">
                        {spec.shortCode}
                      </span>
                      <span className="font-typewriter font-bold text-[10px] text-[#FAF6FF]">
                        {formatSignedDeg(j.localAngle)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: STAGE (Grid Tiers, mpyx Calibration, Origin, Snap, Borders & Styling) */}
        {activeTab === 'stage' && (
          <div className="space-y-2.5">
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-1.5">
              {[
                {
                  key: 'showMegapyxl' as const,
                  title: 'Megapyxl',
                  px: `${MEGAPYXL_PX.toFixed(0)} px`,
                  pyx: '1.00 mpyx',
                },
                {
                  key: 'showPyxl' as const,
                  title: 'Base Pyxl',
                  px: `${PYXL_PX.toFixed(0)} px`,
                  pyx: '1.00 pyx',
                },
                {
                  key: 'showSubpyxl' as const,
                  title: 'Subpyxl',
                  px: `${SUBPYXL_PX.toFixed(0)} px`,
                  pyx: '0.10 pyx',
                },
              ].map((tier) => {
                const enabled = grid[tier.key];
                return (
                  <button
                    key={tier.key}
                    type="button"
                    onClick={() => onUpdateGrid({ [tier.key]: !enabled })}
                    className={`px-2 py-1.5 rounded-[2px] border text-left transition-colors flex items-center justify-between cursor-pointer ${
                      enabled
                        ? 'bg-[#250A33] border-[#D8B4FE]/30 text-[#FAF6FF]'
                        : 'bg-[#0D0012]/50 border-[#EBE0F5]/10 text-[#8B7B9E] hover:text-[#D9CDE6]'
                    }`}
                  >
                    <span className="font-typewriter font-bold text-[10.5px] flex items-center gap-1">
                      <span>{enabled ? '■' : '□'}</span>
                      <span>{tier.title}</span>
                    </span>
                    <span className="font-typewriter text-[10px] text-[#C8B2E0]">
                      {tier.pyx}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div className="space-y-1">
                <span className="font-vera text-[9.5px] text-[#B8A9C9] block">Origin Datum</span>
                <div className="grid grid-cols-2 gap-1 bg-[#0D0012]/80 p-0.5 border border-[#EBE0F5]/14 rounded-[2px]">
                  {(['center', 'corner'] as GridOriginMode[]).map((orig) => (
                    <button
                      key={orig}
                      type="button"
                      onClick={() => onUpdateGrid({ originMode: orig })}
                      className={`py-1 text-[10px] font-typewriter font-bold rounded-[2px] capitalize cursor-pointer ${
                        grid.originMode === orig
                          ? 'bg-[#361547] text-[#FAF6FF]'
                          : 'text-[#9E8EB3] hover:text-[#FAF6FF]'
                      }`}
                    >
                      {orig}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-vera text-[9.5px] text-[#B8A9C9] block">Snap Increment</span>
                <div className="grid grid-cols-3 gap-0.5 bg-[#0D0012]/80 p-0.5 border border-[#EBE0F5]/14 rounded-[2px]">
                  {(
                    [
                      { id: 'none', label: 'Off' },
                      { id: 'subpyxl', label: '10' },
                      { id: 'pyxl', label: '100' },
                    ] as { id: SnapMode; label: string }[]
                  ).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onUpdateGrid({ snapMode: s.id })}
                      className={`py-1 text-[10px] font-typewriter font-bold rounded-[2px] cursor-pointer ${
                        grid.snapMode === s.id
                          ? 'bg-[#361547] text-[#FAF6FF]'
                          : 'text-[#9E8EB3] hover:text-[#FAF6FF]'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => onUpdateGrid({ showLabels: !grid.showLabels })}
                className={`py-1 px-1.5 text-[10px] font-typewriter font-bold rounded-[2px] border cursor-pointer ${
                  grid.showLabels
                    ? 'bg-[#361547] border-[#D8B4FE]/35 text-[#FAF6FF]'
                    : 'bg-[#0D0012]/60 border-[#EBE0F5]/12 text-[#9E8EB3]'
                }`}
              >
                Axis Ticks
              </button>
              <button
                type="button"
                onClick={() => onUpdateGrid({ showVitruvianGuide: !grid.showVitruvianGuide })}
                className={`py-1 px-1.5 text-[10px] font-typewriter font-bold rounded-[2px] border cursor-pointer ${
                  grid.showVitruvianGuide
                    ? 'bg-[#361547] border-[#D8B4FE]/35 text-[#FAF6FF]'
                    : 'bg-[#0D0012]/60 border-[#EBE0F5]/12 text-[#9E8EB3]'
                }`}
              >
                Vitruvian
              </button>
              <button
                type="button"
                onClick={onToggleFigure}
                className={`py-1 px-1.5 text-[10px] font-typewriter font-bold rounded-[2px] border cursor-pointer ${
                  showFigure
                    ? 'bg-[#361547] border-[#D8B4FE]/35 text-[#FAF6FF]'
                    : 'bg-[#0D0012]/60 border-[#EBE0F5]/12 text-[#9E8EB3]'
                }`}
              >
                {showFigure ? 'Hide Fig' : 'Show Fig'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 bg-[#0D0012]/65 border border-[#EBE0F5]/12 rounded-[2px] p-2.5">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-vera text-[10px] text-[#B8A9C9]">Border Opacity</span>
                  <span className="font-typewriter font-bold text-[10.5px] text-[#FAF6FF]">
                    {borderOpacity.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={borderOpacity}
                  onChange={(e) => onBorderOpacityChange(parseFloat(e.target.value))}
                  className="w-full bitruvius-slider"
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-typewriter">
                <span className="text-[#9E8EB3]">Base Envelope</span>
                <span className="text-[#FAF6FF] font-bold">
                  {computeModelWorkingSquare().sidePx.toFixed(0)} px ·{' '}
                  {(computeModelWorkingSquare().sidePx / PYXL_PX).toFixed(2)} pyx
                </span>
              </div>
            </div>

            {/* Compact Visual Styling Specimen */}
            <div
              onMouseEnter={() => setSampleHover(true)}
              onMouseLeave={() => setSampleHover(false)}
              className="bg-[#EAE8E4] rounded-[2px] px-2.5 py-1.5 flex items-center justify-between cursor-crosshair"
            >
              <svg width="96" height="26" viewBox="0 0 96 26" className="overflow-visible">
                <line x1="4" y1="7" x2="44" y2="7" stroke="#16001E" strokeWidth={3} strokeLinecap="round" />
                <line x1="4" y1="19" x2="44" y2="19" stroke="#2A0F3B" strokeWidth={3} strokeDasharray="8 6" strokeLinecap="round" />
                <g transform="translate(72, 13)">
                  {sampleHover && (
                    <circle r={11} fill="rgba(109, 40, 217, 0.14)" stroke="#4C1D95" strokeWidth={1.25} />
                  )}
                  <circle
                    r={sampleHover ? 7.5 : 5}
                    fill={sampleHover ? '#5B21B6' : '#16001E'}
                    stroke="#F6F2FA"
                    strokeWidth={1.75}
                    style={{ transition: 'r 140ms cubic-bezier(0.16, 1, 0.3, 1)' }}
                  />
                  <circle r={1.5} fill="#7DD3FC" />
                </g>
              </svg>
              <div className="px-1.5 py-0.5 bg-[#16001E]/90 border border-[#D8B4FE]/40 rounded-[2px] font-typewriter font-bold text-[9.5px] text-[#7DD3FC] whitespace-nowrap">
                #16001E Ink
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
