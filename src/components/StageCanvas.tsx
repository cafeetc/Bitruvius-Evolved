import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArmatureState,
  ComputedJoint,
  GridConfig,
  JointId,
  JointMode,
  MEGAPYXL_PX,
  PAPER_HEIGHT,
  PAPER_WIDTH,
  PYXL_PX,
  SUBPYXL_PX,
} from '../types/bitruvius';
import {
  JOINT_SPECS,
  formatSignedDeg,
  formatSignedNum,
  solveFKDrag,
  solveSpineCCDIK,
  solveTwoBoneIK,
} from '../engine/kinematics';
import { GridIntertitleLayer, IntertitleItem } from './IntertitleOverlay';

interface StageCanvasProps {
  armature: ArmatureState;
  computedJoints: Record<JointId, ComputedJoint>;
  selectedJointId: JointId;
  hoveredJointId: JointId | null;
  borderOpacity: number;
  grid: GridConfig;
  showFigure: boolean;
  showAllBadges: boolean;
  cameraUnlocked: boolean;
  onShiftHoldChange?: (held: boolean) => void;
  zoom: number;
  pan: { x: number; y: number };
  onZoomChange: (nextZoom: number) => void;
  onPanChange: (nextPan: { x: number; y: number }) => void;
  onSelectJoint: (id: JointId) => void;
  onHoverJoint: (id: JointId | null) => void;
  onUpdateArmature: (next: ArmatureState) => void;
  onCursorMove: (coords: { x: number; y: number } | null) => void;
  stageRef: React.RefObject<HTMLDivElement | null>;
  intertitleItem: IntertitleItem | null;
  intertitleDismissing: boolean;
  onTriggerDismissIntertitle: () => void;
  onIntertitleDismissComplete: () => void;
}

const MODE_GLYPH: Record<JointMode, string> = {
  ROOT: '◆',
  IK: '●',
  FK: '○',
  PIN: '■',
};

const MODE_ACCENT: Record<JointMode, string> = {
  ROOT: '#E9D5FF',
  IK: '#7DD3FC',
  FK: '#D8B4FE',
  PIN: '#FCA5A5',
};

export const StageCanvas: React.FC<StageCanvasProps> = ({
  armature,
  computedJoints,
  selectedJointId,
  hoveredJointId,
  borderOpacity,
  grid,
  showFigure,
  showAllBadges,
  cameraUnlocked,
  onShiftHoldChange,
  zoom,
  pan,
  onZoomChange,
  onPanChange,
  onSelectJoint,
  onHoverJoint,
  onUpdateArmature,
  onCursorMove,
  stageRef,
  intertitleItem,
  intertitleDismissing,
  onTriggerDismissIntertitle,
  onIntertitleDismissComplete,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 1440, height: 900 });

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setViewportSize({ width: rect.width, height: rect.height });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [stageRef]);

  const [dragState, setDragState] = useState<
    | { type: 'pan'; startClientX: number; startClientY: number; startPanX: number; startPanY: number }
    | { type: 'joint'; jointId: JointId; offsetX: number; offsetY: number }
    | null
  >(null);

  const [shiftPressed, setShiftPressed] = useState(false);

  useEffect(() => {
    const updateShift = (held: boolean) => {
      setShiftPressed(held);
      onShiftHoldChange?.(held);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' || e.shiftKey) {
        updateShift(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift' || !e.shiftKey) {
        updateShift(false);
      }
    };
    const handleBlur = () => updateShift(false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [onShiftHoldChange]);

  const cameraMoveActive = shiftPressed || cameraUnlocked;

  const clientToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      return {
        x: (sx - pan.x) / zoom,
        y: (sy - pan.y) / zoom,
      };
    },
    [pan.x, pan.y, zoom]
  );

  const originOffset = useMemo(() => {
    return grid.originMode === 'center'
      ? { x: PAPER_WIDTH / 2, y: PAPER_HEIGHT / 2 }
      : { x: 0, y: 0 };
  }, [grid.originMode]);

  const snapCoord = useCallback(
    (val: number, axisOrigin: number) => {
      if (grid.snapMode === 'none') return val;
      const step = grid.snapMode === 'pyxl' ? PYXL_PX : SUBPYXL_PX;
      return Math.round((val - axisOrigin) / step) * step + axisOrigin;
    },
    [grid.snapMode]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      e.preventDefault();
      if (!cameraMoveActive && !e.shiftKey) return;
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      const factor = e.deltaY < 0 ? 1.1 : 0.909;
      const nextZoom = Math.max(0.15, Math.min(4.0, zoom * factor));
      const worldX = (sx - pan.x) / zoom;
      const worldY = (sy - pan.y) / zoom;

      onZoomChange(nextZoom);
      onPanChange({
        x: sx - worldX * nextZoom,
        y: sy - worldY * nextZoom,
      });
    },
    [cameraMoveActive, zoom, pan.x, pan.y, onZoomChange, onPanChange]
  );

  const handlePointerDownStage = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!(cameraMoveActive || e.shiftKey)) return;
      if (
        e.button === 0 ||
        e.button === 1
      ) {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragState({
          type: 'pan',
          startClientX: e.clientX,
          startClientY: e.clientY,
          startPanX: pan.x,
          startPanY: pan.y,
        });
      }
    },
    [cameraMoveActive, pan.x, pan.y]
  );

  const handlePointerDownJoint = useCallback(
    (e: React.PointerEvent<SVGGElement>, jointId: JointId) => {
      e.stopPropagation();
      if (cameraMoveActive || e.shiftKey) {
        svgRef.current?.setPointerCapture(e.pointerId);
        setDragState({
          type: 'pan',
          startClientX: e.clientX,
          startClientY: e.clientY,
          startPanX: pan.x,
          startPanY: pan.y,
        });
        return;
      }

      onSelectJoint(jointId);
      const joint = computedJoints[jointId];
      if (joint.mode === 'PIN') return;

      const world = clientToWorld(e.clientX, e.clientY);
      svgRef.current?.setPointerCapture(e.pointerId);
      setDragState({
        type: 'joint',
        jointId,
        offsetX: joint.x - world.x,
        offsetY: joint.y - world.y,
      });
    },
    [cameraMoveActive, clientToWorld, computedJoints, onSelectJoint, pan.x, pan.y]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const world = clientToWorld(e.clientX, e.clientY);
      onCursorMove({
        x: world.x - originOffset.x,
        y: world.y - originOffset.y,
      });

      if (!dragState) return;

      if (dragState.type === 'pan') {
        onPanChange({
          x: dragState.startPanX + (e.clientX - dragState.startClientX),
          y: dragState.startPanY + (e.clientY - dragState.startClientY),
        });
        return;
      }

      if (dragState.type === 'joint') {
        const { jointId, offsetX, offsetY } = dragState;
        const targetX = snapCoord(world.x + offsetX, originOffset.x);
        const targetY = snapCoord(world.y + offsetY, originOffset.y);
        const joint = computedJoints[jointId];

        if (joint.mode === 'ROOT' || jointId === 'pelvis') {
          onUpdateArmature({
            ...armature,
            rootX: targetX,
            rootY: targetY,
          });
        } else if (joint.mode === 'IK') {
          if (joint.spec.ikChain === 'spine') {
            onUpdateArmature(solveSpineCCDIK(armature, targetX, targetY));
          } else if (joint.spec.ikChain) {
            onUpdateArmature(solveTwoBoneIK(armature, jointId, targetX, targetY));
          } else {
            onUpdateArmature(solveFKDrag(armature, jointId, targetX, targetY));
          }
        } else if (joint.mode === 'FK') {
          onUpdateArmature(solveFKDrag(armature, jointId, targetX, targetY));
        }
      }
    },
    [
      armature,
      clientToWorld,
      computedJoints,
      dragState,
      onCursorMove,
      onPanChange,
      onUpdateArmature,
      originOffset.x,
      originOffset.y,
      snapCoord,
    ]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (dragState) {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          // ignore if already released
        }
        setDragState(null);
      }
    },
    [dragState]
  );

  // Dynamic endless canvas bounds covering 100% of visible viewport + overscan at any pan/zoom
  const endlessBounds = useMemo(() => {
    const overscan = Math.max(2000, 1500 / zoom);
    const minX = -pan.x / zoom - overscan;
    const minY = -pan.y / zoom - overscan;
    const width = viewportSize.width / zoom + overscan * 2;
    const height = viewportSize.height / zoom + overscan * 2;
    return {
      minX,
      minY,
      width,
      height,
      maxX: minX + width,
      maxY: minY + height,
    };
  }, [pan.x, pan.y, zoom, viewportSize.width, viewportSize.height]);

  // Clean, non-overlapping endless ruler ticks aligned along the stretched viewport borders
  const rulerTicks = useMemo(() => {
    const xTicks: { screen: number; label: string | null; tier: 'mega' | 'major' | 'minor' }[] = [];
    const yTicks: { screen: number; label: string | null; tier: 'mega' | 'major' | 'minor' }[] = [];

    const showMinorLabels = PYXL_PX * zoom >= 72;
    const showMajorLabels = 5 * PYXL_PX * zoom >= 90;

    const minWorldX = -pan.x / zoom;
    const maxWorldX = (viewportSize.width - pan.x) / zoom;
    const minKx = Math.floor((minWorldX - originOffset.x) / PYXL_PX);
    const maxKx = Math.ceil((maxWorldX - originOffset.x) / PYXL_PX);

    for (let k = minKx; k <= maxKx; k++) {
      const world = originOffset.x + k * PYXL_PX;
      const screen = pan.x + world * zoom;
      if (screen < 74 || screen > viewportSize.width - 36) continue;

      const isMega = k % 10 === 0;
      const isMajor = !isMega && k % 5 === 0;
      let label: string | null = null;
      if (isMega) {
        label = `${(k / 10).toFixed(2)} Mpx`;
      } else if (isMajor && showMajorLabels) {
        label = `${formatSignedNum(k, 2)} pyx`;
      } else if (!isMajor && showMinorLabels) {
        label = formatSignedNum(k, 0);
      }
      xTicks.push({
        screen,
        label,
        tier: isMega ? 'mega' : isMajor ? 'major' : 'minor',
      });
    }

    const minWorldY = -pan.y / zoom;
    const maxWorldY = (viewportSize.height - pan.y) / zoom;
    const minKy = Math.floor((minWorldY - originOffset.y) / PYXL_PX);
    const maxKy = Math.ceil((maxWorldY - originOffset.y) / PYXL_PX);

    for (let k = minKy; k <= maxKy; k++) {
      const world = originOffset.y + k * PYXL_PX;
      const screen = pan.y + world * zoom;
      if (screen < 58 || screen > viewportSize.height - 36) continue;

      const isMega = k % 10 === 0;
      const isMajor = !isMega && k % 5 === 0;
      let label: string | null = null;
      if (isMega) {
        label = `${(k / 10).toFixed(2)} Mpx`;
      } else if (isMajor && showMajorLabels) {
        label = `${formatSignedNum(k, 2)} pyx`;
      } else if (!isMajor && showMinorLabels) {
        label = formatSignedNum(k, 0);
      }
      yTicks.push({
        screen,
        label,
        tier: isMega ? 'mega' : isMajor ? 'major' : 'minor',
      });
    }

    return { xTicks, yTicks };
  }, [originOffset.x, originOffset.y, pan.x, pan.y, viewportSize.height, viewportSize.width, zoom]);

  const selectedJoint = computedJoints[selectedJointId];
  const subpyxlOpacity = zoom < 0.3 ? 0.16 : zoom < 0.55 ? 0.48 : 1.0;

  return (
    <div
      ref={stageRef}
      className="relative w-full h-full overflow-hidden bg-[#E0E0E0] select-none"
      style={{
        cursor:
          dragState?.type === 'pan'
            ? 'grabbing'
            : cameraMoveActive
            ? 'grab'
            : 'crosshair',
      }}
    >
      <svg
        ref={svgRef}
        className="w-full h-full block touch-none"
        onWheel={handleWheel}
        onPointerDown={handlePointerDownStage}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => onCursorMove(null)}
      >
        <defs>
          {/* Subpyxl Grid Pattern: 10px = 0.10 pyx */}
          <pattern
            id="grid-subpyxl"
            width={SUBPYXL_PX}
            height={SUBPYXL_PX}
            patternUnits="userSpaceOnUse"
            x={originOffset.x}
            y={originOffset.y}
          >
            <path
              d={`M ${SUBPYXL_PX} 0 L 0 0 0 ${SUBPYXL_PX}`}
              fill="none"
              stroke="rgba(22, 0, 30, 0.10)"
              strokeWidth={0.5}
              vectorEffect="non-scaling-stroke"
            />
          </pattern>

          {/* Base Pyxl Grid Pattern: 100px = 1.00 pyx */}
          <pattern
            id="grid-pyxl"
            width={PYXL_PX}
            height={PYXL_PX}
            patternUnits="userSpaceOnUse"
            x={originOffset.x}
            y={originOffset.y}
          >
            <path
              d={`M ${PYXL_PX} 0 L 0 0 0 ${PYXL_PX}`}
              fill="none"
              stroke="rgba(22, 0, 30, 0.24)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          </pattern>

          {/* Megapyxl Grid Pattern: 1,000px = 10.00 pyx = 1.00 Mpx */}
          <pattern
            id="grid-megapyxl"
            width={MEGAPYXL_PX}
            height={MEGAPYXL_PX}
            patternUnits="userSpaceOnUse"
            x={originOffset.x}
            y={originOffset.y}
          >
            <path
              d={`M ${MEGAPYXL_PX} 0 L 0 0 0 ${MEGAPYXL_PX}`}
              fill="none"
              stroke="rgba(22, 0, 30, 0.52)"
              strokeWidth={1.75}
              vectorEffect="non-scaling-stroke"
            />
          </pattern>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`} style={{ isolation: 'isolate' }}>
          {/* Unified Neutral Grayscale Endless Canvas (#E0E0E0 inside and out) */}
          <rect
            x={endlessBounds.minX}
            y={endlessBounds.minY}
            width={endlessBounds.width}
            height={endlessBounds.height}
            fill="#E0E0E0"
            data-stage-pan="true"
          />

          {/* Continuous Unified Endless Grid Guidelines across entire canvas */}
          {grid.showSubpyxl && (
            <rect
              x={endlessBounds.minX}
              y={endlessBounds.minY}
              width={endlessBounds.width}
              height={endlessBounds.height}
              fill="url(#grid-subpyxl)"
              opacity={subpyxlOpacity}
              pointerEvents="none"
            />
          )}
          {grid.showPyxl && (
            <rect
              x={endlessBounds.minX}
              y={endlessBounds.minY}
              width={endlessBounds.width}
              height={endlessBounds.height}
              fill="url(#grid-pyxl)"
              pointerEvents="none"
            />
          )}
          {grid.showMegapyxl && (
            <rect
              x={endlessBounds.minX}
              y={endlessBounds.minY}
              width={endlessBounds.width}
              height={endlessBounds.height}
              fill="url(#grid-megapyxl)"
              pointerEvents="none"
            />
          )}

          {/* Endless Datum Axes extending infinitely from where Megapyxls meet */}
          <line
            x1={originOffset.x}
            y1={endlessBounds.minY}
            x2={originOffset.x}
            y2={endlessBounds.maxY}
            stroke="rgba(22, 0, 30, 0.45)"
            strokeWidth={1.25}
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
          <line
            x1={endlessBounds.minX}
            y1={originOffset.y}
            x2={endlessBounds.maxX}
            y2={originOffset.y}
            stroke="rgba(22, 0, 30, 0.45)"
            strokeWidth={1.25}
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />

          {/* Center Intersection Reticle (0.00 Mpx, 0.00 Mpx) */}
          <g
            transform={`translate(${originOffset.x}, ${originOffset.y}) scale(${1 / zoom})`}
            pointerEvents="none"
          >
            <circle r={7} fill="none" stroke="rgba(22, 0, 30, 0.65)" strokeWidth={1.25} />
            <circle r={2} fill="rgba(22, 0, 30, 0.85)" />
          </g>

          {/* Grid-Locked Movable Typeset Intertitle (2 pyxls letter height) */}
          <GridIntertitleLayer
            item={intertitleItem}
            dismissing={intertitleDismissing}
            originMode={grid.originMode}
            originOffset={originOffset}
            viewportWidth={viewportSize.width}
            zoom={zoom}
            onTriggerDismiss={onTriggerDismissIntertitle}
            onDismissComplete={onIntertitleDismissComplete}
          />

          {/* Vitruvian Proportions Classical Circle & Square Overlay */}
          {grid.showVitruvianGuide && (
            <g pointerEvents="none">
              <rect
                x={armature.rootX - 540}
                y={armature.rootY - 555}
                width={1080}
                height={1130}
                fill="none"
                stroke="rgba(22, 0, 30, 0.34)"
                strokeWidth={1.25}
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={computedJoints.lumbar.x}
                cy={computedJoints.lumbar.y}
                r={650}
                fill="none"
                stroke="rgba(22, 0, 30, 0.34)"
                strokeWidth={1.25}
                strokeDasharray="5 5"
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={armature.rootX}
                y1={armature.rootY - 620}
                x2={armature.rootX}
                y2={armature.rootY + 620}
                stroke="rgba(22, 0, 30, 0.22)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )}

          {/* World-space ticks removed; margin ticks now hug the stretched viewport border cleanly */}

          {/* Selected Joint Local Angle Arc Indicator */}
          {showFigure &&
            selectedJoint &&
            selectedJoint.parentX !== null &&
            selectedJoint.parentY !== null && (
              <g pointerEvents="none">
                <line
                  x1={selectedJoint.parentX}
                  y1={selectedJoint.parentY}
                  x2={
                    selectedJoint.parentX +
                    Math.cos(
                      ((selectedJoint.worldAngle - selectedJoint.localAngle) * Math.PI) / 180
                    ) *
                      Math.min(72, selectedJoint.spec.lengthPx * 0.75)
                  }
                  y2={
                    selectedJoint.parentY +
                    Math.sin(
                      ((selectedJoint.worldAngle - selectedJoint.localAngle) * Math.PI) / 180
                    ) *
                      Math.min(72, selectedJoint.spec.lengthPx * 0.75)
                  }
                  stroke="rgba(109, 40, 217, 0.55)"
                  strokeWidth={1.25}
                  strokeDasharray="3 3"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            )}

          {/* Armature Bone Lines: 3px solid primary bones / 3px dashed spine */}
          {showFigure && (
            <g>
              {JOINT_SPECS.map((spec) => {
                if (!spec.parentId) return null;
                const child = computedJoints[spec.id];
                const parent = computedJoints[spec.parentId];
                const isActive =
                  selectedJointId === spec.id ||
                  hoveredJointId === spec.id ||
                  selectedJointId === spec.parentId;

                return (
                  <g key={`bone-${spec.id}`}>
                    {isActive && (
                      <line
                        x1={parent.x}
                        y1={parent.y}
                        x2={child.x}
                        y2={child.y}
                        stroke="rgba(139, 92, 246, 0.3)"
                        strokeWidth={9}
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                        pointerEvents="none"
                      />
                    )}
                    <line
                      x1={parent.x}
                      y1={parent.y}
                      x2={child.x}
                      y2={child.y}
                      stroke={
                        isActive ? '#5B21B6' : spec.isSpine ? '#2A0F3B' : '#16001E'
                      }
                      strokeWidth={3}
                      strokeDasharray={spec.isSpine ? '8 6' : undefined}
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                      className="transition-colors duration-150"
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Joint Anchors: 10px default dot / 15px hover + active/hover halos + mode badges */}
          {showFigure && (
            <g>
              {JOINT_SPECS.map((spec) => {
                const joint = computedJoints[spec.id];
                const isSelected = selectedJointId === spec.id;
                const isHovered = hoveredJointId === spec.id;
                const dotRadius = isHovered ? 7.5 : 5;
                const showBadge =
                  showAllBadges || isSelected || isHovered || joint.mode === 'ROOT';

                return (
                  <g
                    key={`joint-${spec.id}`}
                    transform={`translate(${joint.x}, ${joint.y})`}
                    onPointerEnter={() => onHoverJoint(spec.id)}
                    onPointerLeave={() => onHoverJoint(null)}
                    onPointerDown={(e) => handlePointerDownJoint(e, spec.id)}
                    style={{
                      cursor:
                        dragState?.type === 'pan'
                          ? 'grabbing'
                          : cameraMoveActive
                          ? 'grab'
                          : joint.mode === 'PIN'
                          ? 'not-allowed'
                          : 'pointer',
                    }}
                  >
                    <g transform={`scale(${1 / zoom})`}>
                      <circle r={16} fill="transparent" />

                      {isSelected && (
                        <>
                          <circle
                            r={16}
                            fill="none"
                            stroke="#6D28D9"
                            strokeWidth={1.5}
                            strokeDasharray="3 3"
                          />
                          <circle
                            r={11.5}
                            fill="rgba(109, 40, 217, 0.14)"
                            stroke="#16001E"
                            strokeWidth={1.25}
                          />
                        </>
                      )}

                      {isHovered && !isSelected && (
                        <circle
                          r={13}
                          fill="rgba(22, 0, 30, 0.08)"
                          stroke="#4C1D95"
                          strokeWidth={1.25}
                        />
                      )}

                      <circle
                        r={dotRadius}
                        fill={
                          joint.mode === 'PIN'
                            ? '#991B1B'
                            : isSelected
                            ? '#5B21B6'
                            : '#16001E'
                        }
                        stroke="#F6F2FA"
                        strokeWidth={1.75}
                        style={{
                          transition:
                            'r 140ms cubic-bezier(0.16, 1, 0.3, 1), fill 140ms ease',
                        }}
                      />

                      <circle
                        r={1.5}
                        fill={joint.mode === 'IK' ? '#7DD3FC' : '#F6F2FA'}
                        pointerEvents="none"
                      />

                      {showBadge && (
                        <g transform="translate(13, -10)" pointerEvents="none">
                          <rect
                            x={0}
                            y={-10}
                            width={isSelected || isHovered ? 114 : 62}
                            height={20}
                            rx={2}
                            fill="rgba(22, 0, 30, 0.90)"
                            stroke={
                              isSelected
                                ? 'rgba(216, 180, 254, 0.6)'
                                : 'rgba(235, 224, 245, 0.24)'
                            }
                            strokeWidth={1}
                          />
                          <text
                            x={6}
                            y={3.5}
                            fill={MODE_ACCENT[joint.mode]}
                            fontSize={9.5}
                            fontWeight={700}
                            fontFamily="UMTypewriter, monospace"
                          >
                            {MODE_GLYPH[joint.mode]} {joint.mode}
                          </text>
                          {(isSelected || isHovered) && (
                            <text
                              x={54}
                              y={3.5}
                              fill="#F2EEF7"
                              fontSize={9.5}
                              fontWeight={700}
                              fontFamily="UMTypewriter, monospace"
                            >
                              {formatSignedDeg(joint.localAngle)}
                            </text>
                          )}
                        </g>
                      )}
                    </g>
                  </g>
                );
              })}
            </g>
          )}
        </g>
      </svg>

      {/* Isolated Vector Edge Borders stretched seamlessly to current view window edges */}
      {(() => {
        const vw = viewportSize.width;
        const vh = viewportSize.height;
        const SRC_CORNER = 48;
        const SRC_EDGE = 28;
        const s = Math.min(1, vw / (SRC_CORNER * 2), vh / (SRC_CORNER * 2));
        const c = SRC_CORNER * s;
        const e = SRC_EDGE * s;
        const midW = Math.max(0, vw - c * 2);
        const midH = Math.max(0, vh - c * 2);
        const srcMidW = PAPER_WIDTH - SRC_CORNER * 2;
        const srcMidH = PAPER_HEIGHT - SRC_CORNER * 2;

        return (
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 w-full h-full z-[5]"
            viewBox={`0 0 ${vw} ${vh}`}
            preserveAspectRatio="none"
          >
            <defs>
              <filter id="vector-border-grayscale">
                <feColorMatrix type="saturate" values="0" />
              </filter>
            </defs>
            <g opacity={borderOpacity} filter="url(#vector-border-grayscale)">
              {/* Top-left corner */}
              <svg x={0} y={0} width={c} height={c} viewBox={`0 0 ${SRC_CORNER} ${SRC_CORNER}`} preserveAspectRatio="none">
                <image href="/assets/aistudio/Vector_paper_2dac36ce.svg" x={0} y={0} width={PAPER_WIDTH} height={PAPER_HEIGHT} />
              </svg>
              {/* Top-right corner */}
              <svg x={vw - c} y={0} width={c} height={c} viewBox={`${PAPER_WIDTH - SRC_CORNER} 0 ${SRC_CORNER} ${SRC_CORNER}`} preserveAspectRatio="none">
                <image href="/assets/aistudio/Vector_paper_2dac36ce.svg" x={0} y={0} width={PAPER_WIDTH} height={PAPER_HEIGHT} />
              </svg>
              {/* Bottom-left corner */}
              <svg x={0} y={vh - c} width={c} height={c} viewBox={`0 ${PAPER_HEIGHT - SRC_CORNER} ${SRC_CORNER} ${SRC_CORNER}`} preserveAspectRatio="none">
                <image href="/assets/aistudio/Vector_paper_2dac36ce.svg" x={0} y={0} width={PAPER_WIDTH} height={PAPER_HEIGHT} />
              </svg>
              {/* Bottom-right corner */}
              <svg x={vw - c} y={vh - c} width={c} height={c} viewBox={`${PAPER_WIDTH - SRC_CORNER} ${PAPER_HEIGHT - SRC_CORNER} ${SRC_CORNER} ${SRC_CORNER}`} preserveAspectRatio="none">
                <image href="/assets/aistudio/Vector_paper_2dac36ce.svg" x={0} y={0} width={PAPER_WIDTH} height={PAPER_HEIGHT} />
              </svg>

              {/* Top stretched edge */}
              {midW > 0 && (
                <svg x={c} y={0} width={midW} height={e} viewBox={`${SRC_CORNER} 0 ${srcMidW} ${SRC_EDGE}`} preserveAspectRatio="none">
                  <image href="/assets/aistudio/Vector_paper_2dac36ce.svg" x={0} y={0} width={PAPER_WIDTH} height={PAPER_HEIGHT} />
                </svg>
              )}
              {/* Bottom stretched edge */}
              {midW > 0 && (
                <svg x={c} y={vh - e} width={midW} height={e} viewBox={`${SRC_CORNER} ${PAPER_HEIGHT - SRC_EDGE} ${srcMidW} ${SRC_EDGE}`} preserveAspectRatio="none">
                  <image href="/assets/aistudio/Vector_paper_2dac36ce.svg" x={0} y={0} width={PAPER_WIDTH} height={PAPER_HEIGHT} />
                </svg>
              )}
              {/* Left stretched edge */}
              {midH > 0 && (
                <svg x={0} y={c} width={e} height={midH} viewBox={`0 ${SRC_CORNER} ${SRC_EDGE} ${srcMidH}`} preserveAspectRatio="none">
                  <image href="/assets/aistudio/Vector_paper_2dac36ce.svg" x={0} y={0} width={PAPER_WIDTH} height={PAPER_HEIGHT} />
                </svg>
              )}
              {/* Right stretched edge */}
              {midH > 0 && (
                <svg x={vw - e} y={c} width={e} height={midH} viewBox={`${PAPER_WIDTH - SRC_EDGE} ${SRC_CORNER} ${SRC_EDGE} ${srcMidH}`} preserveAspectRatio="none">
                  <image href="/assets/aistudio/Vector_paper_2dac36ce.svg" x={0} y={0} width={PAPER_WIDTH} height={PAPER_HEIGHT} />
                </svg>
              )}
            </g>

            {/* Stretched Margin Ruler Ticks & Datum Labels hugging the inner border */}
            {grid.showLabels && (
              <g pointerEvents="none">
                {rulerTicks.xTicks.map((tick, idx) => (
                  <g key={`xt-${idx}`} transform={`translate(${tick.screen}, ${e})`}>
                    <line
                      x1={0}
                      y1={0}
                      x2={0}
                      y2={tick.tier === 'mega' ? 9 : tick.tier === 'major' ? 7 : 4}
                      stroke={
                        tick.tier === 'mega'
                          ? 'rgba(22, 0, 30, 0.82)'
                          : tick.tier === 'major'
                          ? 'rgba(22, 0, 30, 0.56)'
                          : 'rgba(22, 0, 30, 0.28)'
                      }
                      strokeWidth={tick.tier === 'mega' ? 1.5 : 1}
                    />
                    {tick.label && (
                      <text
                        x={0}
                        y={20}
                        textAnchor="middle"
                        fill={
                          tick.tier === 'mega'
                            ? '#16001E'
                            : tick.tier === 'major'
                            ? 'rgba(22, 0, 30, 0.78)'
                            : 'rgba(22, 0, 30, 0.55)'
                        }
                        fontSize={tick.tier === 'mega' ? 10.5 : 9.5}
                        fontWeight={tick.tier === 'mega' ? 700 : 400}
                        fontFamily="UMTypewriter, monospace"
                      >
                        {tick.label}
                      </text>
                    )}
                  </g>
                ))}
                {rulerTicks.yTicks.map((tick, idx) => (
                  <g key={`yt-${idx}`} transform={`translate(${e}, ${tick.screen})`}>
                    <line
                      x1={0}
                      y1={0}
                      x2={tick.tier === 'mega' ? 9 : tick.tier === 'major' ? 7 : 4}
                      y2={0}
                      stroke={
                        tick.tier === 'mega'
                          ? 'rgba(22, 0, 30, 0.82)'
                          : tick.tier === 'major'
                          ? 'rgba(22, 0, 30, 0.56)'
                          : 'rgba(22, 0, 30, 0.28)'
                      }
                      strokeWidth={tick.tier === 'mega' ? 1.5 : 1}
                    />
                    {tick.label && (
                      <text
                        x={13}
                        y={3.5}
                        textAnchor="start"
                        fill={
                          tick.tier === 'mega'
                            ? '#16001E'
                            : tick.tier === 'major'
                            ? 'rgba(22, 0, 30, 0.78)'
                            : 'rgba(22, 0, 30, 0.55)'
                        }
                        fontSize={tick.tier === 'mega' ? 10.5 : 9.5}
                        fontWeight={tick.tier === 'mega' ? 700 : 400}
                        fontFamily="UMTypewriter, monospace"
                      >
                        {tick.label}
                      </text>
                    )}
                  </g>
                ))}
              </g>
            )}
          </svg>
        );
      })()}
    </div>
  );
};
