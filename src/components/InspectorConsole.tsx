import React, { useEffect, useState } from 'react';
import {
  ArmatureState,
  ComputedJoint,
  GridConfig,
  GridOriginMode,
  JointId,
  JointMode,
  MEGAPYXL_PX,
  PAPER_HEIGHT,
  PAPER_WIDTH,
  PYXL_PX,
  PosePresetId,
  SUBPYXL_PX,
  SnapMode,
} from '../types/bitruvius';
import {
  JOINT_SPECS,
  computeModelWorkingSquare,
  formatSignedDeg,
  formatSignedNum,
  normalizeAngleDeg,
} from '../engine/kinematics';

interface InspectorConsoleProps {
  armature: ArmatureState;
  computedJoints: Record<JointId, ComputedJoint>;
  selectedJointId: JointId;
  onSelectJoint: (id: JointId) => void;
  onChangeJointAngle: (id: JointId, nextLocalAngle: number) => void;
  onChangeRootPosition: (x: number, y: number) => void;
  onChangeJointMode: (id: JointId, mode: JointMode) => void;
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

const MODE_OPTIONS: { mode: JointMode; glyph: string; label: string }[] = [
  { mode: 'FK', glyph: '○', label: 'FK' },
  { mode: 'IK', glyph: '●', label: 'IK' },
  { mode: 'PIN', glyph: '■', label: 'PIN' },
];

export const InspectorConsole: React.FC<InspectorConsoleProps> = ({
  armature,
  computedJoints,
  selectedJointId,
  onSelectJoint,
  onChangeJointAngle,
  onChangeRootPosition,
  onChangeJointMode,
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
  const selected = computedJoints[selectedJointId];
  const originX = grid.originMode === 'center' ? PAPER_WIDTH / 2 : 0;
  const originY = grid.originMode === 'center' ? PAPER_HEIGHT / 2 : 0;

  const relX = selected.x - originX;
  const relY = selected.y - originY;

  const [angleInput, setAngleInput] = useState(selected.localAngle.toFixed(2));
  const [rootXInput, setRootXInput] = useState((armature.rootX - originX).toFixed(2));
  const [rootYInput, setRootYInput] = useState((armature.rootY - originY).toFixed(2));
  const [sampleHover, setSampleHover] = useState(false);

  useEffect(() => {
    setAngleInput(selected.localAngle.toFixed(2));
  }, [selected.id, selected.localAngle]);

  useEffect(() => {
    setRootXInput((armature.rootX - originX).toFixed(2));
    setRootYInput((armature.rootY - originY).toFixed(2));
  }, [armature.rootX, armature.rootY, originX, originY]);

  const commitAngleInput = () => {
    const parsed = parseFloat(angleInput);
    if (!Number.isNaN(parsed)) {
      onChangeJointAngle(selected.id, normalizeAngleDeg(parsed));
    } else {
      setAngleInput(selected.localAngle.toFixed(2));
    }
  };

  const commitRootCoords = () => {
    const px = parseFloat(rootXInput);
    const py = parseFloat(rootYInput);
    if (!Number.isNaN(px) && !Number.isNaN(py)) {
      onChangeRootPosition(px + originX, py + originY);
    } else {
      setRootXInput((armature.rootX - originX).toFixed(2));
      setRootYInput((armature.rootY - originY).toFixed(2));
    }
  };

  return (
    <aside className="w-full h-[24vh] lg:h-full lg:w-[clamp(240px,23vw,308px)] console-panel border-b-0 border-r-0 lg:border-t-0 flex flex-col z-10 shrink-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto console-scroll divide-y divide-[#EBE0F5]/12">
        {/* 1. Vector Canvas Edge Calibration */}
        <section className="p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-typewriter font-bold text-xs text-[#FAF6FF] tracking-wide">
              Vector Edge Frame
            </h2>
            <span className="font-typewriter text-[11px] text-[#C8B2E0]">
              Viewport Edges
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-vera text-[10.5px] text-[#B8A9C9]">
                Border Opacity
              </span>
              <span className="font-typewriter font-bold text-xs text-[#FAF6FF]">
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
        </section>

        {/* 2. Grid Guidelines & Scale Calibration */}
        <section className="p-3.5 space-y-2.5">
          <div>
            <h3 className="font-typewriter font-bold text-xs text-[#FAF6FF] tracking-wide">
              Grid Guidelines
            </h3>
            <p className="font-vera text-[10px] text-[#B8A9C9] mt-0.5 leading-snug">
              10x10 hierarchical pyxl matrix anchored to sheet origin.
            </p>
          </div>

          <div className="space-y-1.5">
            {[
              {
                key: 'showMegapyxl' as const,
                title: 'Megapyxl',
                px: `${MEGAPYXL_PX.toFixed(2)} px`,
                pyx: '10.00 pyx',
                desc: '10x10 pyxl macro-grid',
              },
              {
                key: 'showPyxl' as const,
                title: 'Base Pyxl',
                px: `${PYXL_PX.toFixed(2)} px`,
                pyx: '1.00 pyx',
                desc: 'Primary drafting unit',
              },
              {
                key: 'showSubpyxl' as const,
                title: 'Subpyxl',
                px: `${SUBPYXL_PX.toFixed(2)} px`,
                pyx: '0.10 pyx',
                desc: '10x10 interior subdivision',
              },
            ].map((tier) => {
              const enabled = grid[tier.key];
              return (
                <button
                  key={tier.key}
                  type="button"
                  onClick={() => onUpdateGrid({ [tier.key]: !enabled })}
                  className={`w-full px-2.5 py-1.5 rounded-[2px] border text-left transition-colors flex items-center justify-between cursor-pointer ${
                    enabled
                      ? 'bg-[#250A33] border-[#D8B4FE]/30 text-[#FAF6FF]'
                      : 'bg-[#0D0012]/50 border-[#EBE0F5]/10 text-[#8B7B9E] hover:text-[#D9CDE6]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-typewriter font-bold text-[11.5px] flex items-center gap-1.5">
                      <span>{enabled ? '■' : '□'}</span>
                      <span>{tier.title}</span>
                    </div>
                    <div className="font-vera text-[9.5px] text-[#B8A9C9] pl-3.5 truncate">
                      {tier.desc}
                    </div>
                  </div>
                  <div className="text-right font-typewriter shrink-0 ml-2">
                    <div className="font-bold text-[11px]">{tier.px}</div>
                    <div className="text-[10px] text-[#C8B2E0]">{tier.pyx}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="bg-[#0D0012]/60 border border-[#EBE0F5]/12 rounded-[2px] px-2.5 py-1.5 flex items-center justify-between gap-2">
            <div>
              <div className="font-typewriter font-bold text-[10.5px] text-[#E9D5FF]">
                Working Base Square
              </div>
              <div className="font-vera text-[9.5px] text-[#9E8EB3]">
                Conceptual model-extreme envelope
              </div>
            </div>
            <div className="text-right font-typewriter">
              <div className="font-bold text-[10.5px] text-[#FAF6FF]">
                {computeModelWorkingSquare().sidePx.toFixed(2)} px
              </div>
              <div className="text-[10px] text-[#C8B2E0]">
                {(computeModelWorkingSquare().sidePx / PYXL_PX).toFixed(2)} pyx
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <div className="space-y-1">
              <span className="font-vera text-[10px] text-[#B8A9C9] block">Origin Datum</span>
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
              <span className="font-vera text-[10px] text-[#B8A9C9] block">Snap Increment</span>
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
        </section>

        {/* 3. Visual Styling Specification Specimen (Always inspectable even when figure is hidden) */}
        <section className="p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-typewriter font-bold text-xs text-[#FAF6FF] tracking-wide">
              Styling Rules
            </h3>
            <span className="font-typewriter text-[10.5px] text-[#C8B2E0]">#16001E</span>
          </div>

          <div className="bg-[#0D0012]/70 border border-[#EBE0F5]/12 rounded-[2px] p-2.5 space-y-2">
            {/* Interactive Anchor & Line Preview */}
            <div
              onMouseEnter={() => setSampleHover(true)}
              onMouseLeave={() => setSampleHover(false)}
              className="bg-[#EAE8E4] rounded-[2px] px-3 py-2 flex items-center justify-between cursor-crosshair"
            >
              <svg width="110" height="34" viewBox="0 0 110 34" className="overflow-visible">
                {/* 3px Solid Armature Line */}
                <line
                  x1="6"
                  y1="10"
                  x2="52"
                  y2="10"
                  stroke="#16001E"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                {/* 3px Dashed Spine Line */}
                <line
                  x1="6"
                  y1="25"
                  x2="52"
                  y2="25"
                  stroke="#2A0F3B"
                  strokeWidth={3}
                  strokeDasharray="8 6"
                  strokeLinecap="round"
                />
                {/* 10px / 15px Hover Anchor with Halo & Mode Badge */}
                <g transform="translate(82, 17)">
                  {sampleHover && (
                    <circle
                      r={13}
                      fill="rgba(109, 40, 217, 0.14)"
                      stroke="#4C1D95"
                      strokeWidth={1.25}
                    />
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
              <div className="px-1.5 py-0.5 bg-[#16001E]/90 border border-[#D8B4FE]/40 rounded-[2px] font-typewriter font-bold text-[10px] text-[#7DD3FC] whitespace-nowrap">
                ● IK +45.25°
              </div>
            </div>

            <div className="font-vera text-[10px] text-[#B8A9C9] space-y-0.5 leading-snug">
              <div>Anchors: 10px dot / 15px hover + halo + badge</div>
              <div>Armature: 3px solid limb · 3px dashed spine</div>
              <div>Type: UMTypewriter Bold · Bitstream Vera Mono</div>
            </div>
          </div>
        </section>

        {/* 4. Active Figure Controls (only when Figure is toggled visible) */}
        {showFigure && (
          <>
            <section className="p-3.5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-typewriter font-bold text-xs text-[#FAF6FF] tracking-wide">
                    {selected.spec.label}
                  </h3>
                  <p className="font-vera text-[10px] text-[#B8A9C9] mt-0.5 leading-snug">
                    {selected.spec.subtitle}
                  </p>
                </div>
                <span className="font-typewriter font-bold text-[11px] px-1.5 py-0.5 bg-[#0D0012] border border-[#EBE0F5]/18 rounded-[2px] text-[#D8B4FE] shrink-0">
                  {selected.spec.shortCode}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={onToggleAllBadges}
                  className={`px-2 py-1 text-[10px] font-typewriter font-bold rounded-[2px] border cursor-pointer ${
                    showAllBadges
                      ? 'bg-[#361547] border-[#D8B4FE]/35 text-[#FAF6FF]'
                      : 'bg-[#0D0012]/60 border-[#EBE0F5]/12 text-[#9E8EB3]'
                  }`}
                >
                  {showAllBadges ? 'All Badges: On' : 'All Badges: Off'}
                </button>
                <div className="flex items-center gap-1 xl:hidden">
                  {(['vitruvian', 'contrapposto', 'tpose'] as PosePresetId[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => onSelectPreset(p)}
                      className="px-1.5 py-1 text-[9.5px] font-typewriter font-bold bg-[#21072B] border border-[#EBE0F5]/14 rounded-[2px] text-[#E6DCF0] cursor-pointer capitalize"
                    >
                      {p === 'contrapposto' ? 'Contra' : p}
                    </button>
                  ))}
                </div>
              </div>

              {selected.id !== 'pelvis' && (
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
                        className={`py-1 text-[10.5px] font-typewriter font-bold rounded-[2px] flex items-center justify-center gap-1 ${
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

              <div className="space-y-1.5 bg-[#0D0012]/70 border border-[#EBE0F5]/12 rounded-[2px] p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="joint-angle-input"
                    className="font-typewriter font-bold text-[11px] text-[#D9CDE6]"
                  >
                    {selected.id === 'pelvis' ? 'Root Tilt' : 'Local Angle'}
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      id="joint-angle-input"
                      type="text"
                      value={angleInput}
                      onChange={(e) => setAngleInput(e.target.value)}
                      onBlur={commitAngleInput}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitAngleInput();
                      }}
                      className="w-20 px-1.5 py-0.5 text-right font-typewriter font-bold text-xs text-[#FAF6FF] bg-[#16001E] border border-[#EBE0F5]/22 rounded-[2px] focus:outline-none focus:border-[#D8B4FE]"
                    />
                    <span className="font-typewriter font-bold text-[11px] text-[#B8A9C9]">deg</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  step={0.25}
                  value={selected.localAngle}
                  disabled={selected.mode === 'PIN'}
                  onChange={(e) => onChangeJointAngle(selected.id, parseFloat(e.target.value))}
                  className="w-full bitruvius-slider"
                />
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <div className="bg-[#0D0012]/65 border border-[#EBE0F5]/12 rounded-[2px] px-2 py-1.5">
                  <div className="font-vera text-[9.5px] text-[#9E8EB3]">World X</div>
                  {selected.id === 'pelvis' ? (
                    <input
                      type="text"
                      value={rootXInput}
                      onChange={(e) => setRootXInput(e.target.value)}
                      onBlur={commitRootCoords}
                      onKeyDown={(e) => e.key === 'Enter' && commitRootCoords()}
                      className="w-full mt-0.5 px-1 py-0.5 font-typewriter font-bold text-[11px] text-[#FAF6FF] bg-[#16001E] border border-[#EBE0F5]/20 rounded-[2px]"
                    />
                  ) : (
                    <div className="font-typewriter font-bold text-[11px] text-[#FAF6FF]">
                      {formatSignedNum(relX)} px
                    </div>
                  )}
                  <div className="font-typewriter text-[10px] text-[#C8B2E0]">
                    {formatSignedNum(relX / PYXL_PX)} pyx
                  </div>
                </div>
                <div className="bg-[#0D0012]/65 border border-[#EBE0F5]/12 rounded-[2px] px-2 py-1.5">
                  <div className="font-vera text-[9.5px] text-[#9E8EB3]">World Y</div>
                  {selected.id === 'pelvis' ? (
                    <input
                      type="text"
                      value={rootYInput}
                      onChange={(e) => setRootYInput(e.target.value)}
                      onBlur={commitRootCoords}
                      onKeyDown={(e) => e.key === 'Enter' && commitRootCoords()}
                      className="w-full mt-0.5 px-1 py-0.5 font-typewriter font-bold text-[11px] text-[#FAF6FF] bg-[#16001E] border border-[#EBE0F5]/20 rounded-[2px]"
                    />
                  ) : (
                    <div className="font-typewriter font-bold text-[11px] text-[#FAF6FF]">
                      {formatSignedNum(relY)} px
                    </div>
                  )}
                  <div className="font-typewriter text-[10px] text-[#C8B2E0]">
                    {formatSignedNum(relY / PYXL_PX)} pyx
                  </div>
                </div>
              </div>
            </section>

            <section className="p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-typewriter font-bold text-xs text-[#FAF6FF] tracking-wide">
                  Armature Ledger
                </h3>
                <span className="font-vera text-[10px] text-[#B8A9C9]">
                  {JOINT_SPECS.length} anchors
                </span>
              </div>
              <div className="divide-y divide-[#EBE0F5]/10 border border-[#EBE0F5]/14 rounded-[2px] bg-[#0D0012]/65">
                {JOINT_SPECS.map((spec) => {
                  const j = computedJoints[spec.id];
                  const isSelected = selectedJointId === spec.id;
                  return (
                    <button
                      key={spec.id}
                      type="button"
                      onClick={() => onSelectJoint(spec.id)}
                      className={`w-full px-2 py-1 flex items-center justify-between text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#361547] text-[#FAF6FF]'
                          : 'hover:bg-[#21072B]/80 text-[#D9CDE6]'
                      }`}
                    >
                      <span className="font-typewriter font-bold text-[10px] text-[#C8B2E0] w-10 shrink-0">
                        {spec.shortCode}
                      </span>
                      <span className="font-vera text-[10px] truncate text-[#B8A9C9] flex-1">
                        {spec.label}
                      </span>
                      <span className="font-typewriter font-bold text-[10.5px] text-right text-[#FAF6FF] ml-2">
                        {formatSignedDeg(j.localAngle)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </aside>
  );
};
