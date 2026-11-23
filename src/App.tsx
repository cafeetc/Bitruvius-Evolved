import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Maximize2,
  Minus,
  Move,
  PanelRightClose,
  PanelRightOpen,
  Plus,
} from 'lucide-react';
import {
  ArmatureState,
  GridConfig,
  JointId,
  JointMode,
  MEGAPYXL_PX,
  PAPER_HEIGHT,
  PAPER_WIDTH,
  PYXL_PX,
  PosePresetId,
} from './types/bitruvius';
import {
  computeArmature,
  computeModelWorkingSquare,
  createPosePreset,
  formatSignedNum,
  mirrorPose,
  normalizeAngleDeg,
  setJointMode,
} from './engine/kinematics';
import { StageCanvas } from './components/StageCanvas';
import { TopConsoleBar } from './components/TopConsoleBar';
import { InspectorConsole } from './components/InspectorConsole';
import { IntertitleItem } from './components/IntertitleOverlay';

const INITIAL_INTERTITLE: IntertitleItem = {
  id: 'welcome-bitruvius',
  lines: ['Welcome', 'Bitruvius'],
  position: 'top-half',
};

export default function App() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const autoFitRef = useRef<boolean>(true);

  const [armature, setArmature] = useState<ArmatureState>(() =>
    createPosePreset('vitruvian')
  );
  const [activePreset, setActivePreset] = useState<PosePresetId | null>('vitruvian');
  const [selectedJointId, setSelectedJointId] = useState<JointId>('r_wrist');
  const [hoveredJointId, setHoveredJointId] = useState<JointId | null>(null);

  const [borderOpacity, setBorderOpacity] = useState<number>(1.0);

  const [grid, setGrid] = useState<GridConfig>({
    showSubpyxl: true,
    showPyxl: true,
    showMegapyxl: true,
    showLabels: true,
    showVitruvianGuide: false,
    originMode: 'center',
    snapMode: 'none',
  });

  const [showFigure, setShowFigure] = useState(false);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);

  const [activeIntertitle, setActiveIntertitle] = useState<IntertitleItem | null>(
    INITIAL_INTERTITLE
  );
  const [intertitleDismissing, setIntertitleDismissing] = useState(false);

  const [zoom, setZoom] = useState(0.45);
  const [pan, setPan] = useState({ x: 160, y: 40 });
  const [cursorCoords, setCursorCoords] = useState<{ x: number; y: number } | null>(null);
  const [cameraUnlocked, setCameraUnlocked] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false);

  const computedJoints = useMemo(() => computeArmature(armature), [armature]);

  const fitPaperToStage = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const workingBase = computeModelWorkingSquare();
    const frameW = Math.max(PAPER_WIDTH, workingBase.sidePx);
    const frameH = Math.max(PAPER_HEIGHT, workingBase.sidePx);

    const padX = rect.width < 640 ? 48 : 72;
    const padY = rect.height < 520 ? 36 : 52;
    const availW = Math.max(140, rect.width - padX * 2);
    const availH = Math.max(140, rect.height - padY * 2);
    const nextZoom = Math.min(availW / frameW, availH / frameH, 1.25);

    const nextPanX = rect.width / 2 - workingBase.centerX * nextZoom;
    const nextPanY = rect.height / 2 - workingBase.centerY * nextZoom;

    setZoom(nextZoom);
    setPan({ x: nextPanX, y: nextPanY });
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      if (autoFitRef.current) {
        fitPaperToStage();
      }
    });

    observer.observe(el);
    fitPaperToStage();
    return () => observer.disconnect();
  }, [fitPaperToStage]);

  const handleManualZoom = useCallback((nextZoom: number) => {
    autoFitRef.current = false;
    setZoom(nextZoom);
  }, []);

  const handleManualPan = useCallback((nextPan: { x: number; y: number }) => {
    autoFitRef.current = false;
    setPan(nextPan);
  }, []);

  const handleFitClick = useCallback(() => {
    autoFitRef.current = true;
    fitPaperToStage();
  }, [fitPaperToStage]);

  const handleDismissIntertitle = useCallback(() => {
    if (activeIntertitle && !intertitleDismissing) {
      setIntertitleDismissing(true);
    }
  }, [activeIntertitle, intertitleDismissing]);

  const handleIntertitleComplete = useCallback(() => {
    setActiveIntertitle(null);
    setIntertitleDismissing(false);
  }, []);

  useEffect(() => {
    if (!activeIntertitle || intertitleDismissing) return;
    const onFirstClick = () => {
      setIntertitleDismissing(true);
    };
    window.addEventListener('pointerdown', onFirstClick, { capture: true, once: true });
    return () => {
      window.removeEventListener('pointerdown', onFirstClick, { capture: true });
    };
  }, [activeIntertitle, intertitleDismissing]);

  const handleUpdateArmature = useCallback((next: ArmatureState) => {
    setArmature(next);
    setActivePreset(null);
  }, []);

  const handleSelectPreset = useCallback((preset: PosePresetId) => {
    setArmature(createPosePreset(preset));
    setActivePreset(preset);
  }, []);

  const handleMirrorPose = useCallback(() => {
    setArmature((prev) => mirrorPose(prev));
    setActivePreset(null);
  }, []);

  const handleResetPose = useCallback(() => {
    setArmature(createPosePreset('vitruvian'));
    setActivePreset('vitruvian');
    autoFitRef.current = true;
    fitPaperToStage();
  }, [fitPaperToStage]);

  const handleChangeJointAngle = useCallback(
    (id: JointId, nextLocalAngle: number) => {
      setActivePreset(null);
      setArmature((prev) => {
        if (id === 'pelvis') {
          return { ...prev, rootRotation: normalizeAngleDeg(nextLocalAngle) };
        }
        return {
          ...prev,
          joints: {
            ...prev.joints,
            [id]: {
              ...prev.joints[id],
              localAngle: normalizeAngleDeg(nextLocalAngle),
            },
          },
        };
      });
    },
    []
  );

  const handleChangeRootPosition = useCallback((x: number, y: number) => {
    setActivePreset(null);
    setArmature((prev) => ({
      ...prev,
      rootX: x,
      rootY: y,
    }));
  }, []);

  const handleChangeJointMode = useCallback((id: JointId, mode: JointMode) => {
    setArmature((prev) => setJointMode(prev, id, mode));
  }, []);

  const handleUpdateGrid = useCallback((patch: Partial<GridConfig>) => {
    setGrid((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleZoomStep = useCallback(
    (factor: number) => {
      const el = stageRef.current;
      if (!el) return;
      autoFitRef.current = false;
      const rect = el.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const nextZoom = Math.max(0.15, Math.min(4.0, zoom * factor));
      const wx = (cx - pan.x) / zoom;
      const wy = (cy - pan.y) / zoom;
      setZoom(nextZoom);
      setPan({ x: cx - wx * nextZoom, y: cy - wy * nextZoom });
    },
    [pan.x, pan.y, zoom]
  );

  const handleSetExactZoom = useCallback(
    (targetZoom: number) => {
      const el = stageRef.current;
      if (!el) return;
      autoFitRef.current = false;
      const rect = el.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const wx = (cx - pan.x) / zoom;
      const wy = (cy - pan.y) / zoom;
      setZoom(targetZoom);
      setPan({ x: cx - wx * targetZoom, y: cy - wy * targetZoom });
    },
    [pan.x, pan.y, zoom]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || !showFigure) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const current = computedJoints[selectedJointId];
        if (!current || current.mode === 'PIN') return;
        e.preventDefault();
        const step = e.shiftKey ? 0.25 : 1.0;
        const delta = e.key === 'ArrowRight' ? step : -step;
        handleChangeJointAngle(selectedJointId, current.localAngle + delta);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [computedJoints, handleChangeJointAngle, selectedJointId, showFigure]);

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-[#E0E0E0] text-[#F2EEF7]">
      <TopConsoleBar
        showFigure={showFigure}
        onToggleFigure={() => setShowFigure((v) => !v)}
        activePreset={activePreset}
        onSelectPreset={handleSelectPreset}
        onMirrorPose={handleMirrorPose}
        onResetPose={handleResetPose}
      />

      {/* Responsive Workspace: Zero overlapping overlays; Canvas always >= 2/3 of viewing space */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          <div
            className="flex-1 relative min-h-0"
            onPointerDownCapture={handleDismissIntertitle}
          >
            <StageCanvas
              armature={armature}
              computedJoints={computedJoints}
              selectedJointId={selectedJointId}
              hoveredJointId={hoveredJointId}
              borderOpacity={borderOpacity}
              grid={grid}
              showFigure={showFigure}
              showAllBadges={showAllBadges}
              cameraUnlocked={cameraUnlocked}
              onShiftHoldChange={setShiftHeld}
              zoom={zoom}
              pan={pan}
              onZoomChange={handleManualZoom}
              onPanChange={handleManualPan}
              onSelectJoint={setSelectedJointId}
              onHoverJoint={setHoveredJointId}
              onUpdateArmature={handleUpdateArmature}
              onCursorMove={setCursorCoords}
              stageRef={stageRef}
              intertitleItem={activeIntertitle}
              intertitleDismissing={intertitleDismissing}
              onTriggerDismissIntertitle={handleDismissIntertitle}
              onIntertitleDismissComplete={handleIntertitleComplete}
            />
          </div>

          {/* Dedicated Bottom Status, Console Tab & Zoom Strip (Docked outside canvas, zero overlap) */}
          <div className="h-9 px-3 console-panel border-b-0 border-x-0 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-4 font-typewriter text-[11px] min-w-0 overflow-x-auto whitespace-nowrap">
              <div>
                <span className="text-[#9E8EB3] mr-1">X</span>
                <span className="font-bold text-[#FAF6FF]">
                  {cursorCoords ? `${formatSignedNum(cursorCoords.x)} px` : '+0.00 px'}
                </span>
                <span className="text-[#C8B2E0] ml-1">
                  ({cursorCoords ? `${formatSignedNum(cursorCoords.x / PYXL_PX)} pyx` : '+0.00 pyx'})
                </span>
              </div>
              <div>
                <span className="text-[#9E8EB3] mr-1">Y</span>
                <span className="font-bold text-[#FAF6FF]">
                  {cursorCoords ? `${formatSignedNum(cursorCoords.y)} px` : '+0.00 px'}
                </span>
                <span className="text-[#C8B2E0] ml-1">
                  ({cursorCoords ? `${formatSignedNum(cursorCoords.y / PYXL_PX)} pyx` : '+0.00 pyx'})
                </span>
              </div>
              <div className="hidden sm:block">
                <span className="text-[#9E8EB3] mr-1">Mpx</span>
                <span className="font-bold text-[#E9D5FF]">
                  {cursorCoords
                    ? `${formatSignedNum(cursorCoords.x / MEGAPYXL_PX)}, ${formatSignedNum(
                        cursorCoords.y / MEGAPYXL_PX
                      )}`
                    : '+0.00, +0.00'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setInspectorOpen((v) => !v)}
                title={inspectorOpen ? 'Collapse console inspector' : 'Expand console inspector'}
                className={`px-2.5 py-0.5 mr-1 font-typewriter font-bold text-[10.5px] rounded-[2px] border flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  inspectorOpen
                    ? 'bg-[#361547] border-[#D8B4FE]/40 text-[#FAF6FF]'
                    : 'bg-[#21072B]/80 border-[#EBE0F5]/18 text-[#C8B2E0] hover:text-[#FAF6FF]'
                }`}
              >
                {inspectorOpen ? (
                  <PanelRightClose className="w-3 h-3" />
                ) : (
                  <PanelRightOpen className="w-3 h-3" />
                )}
                Console
              </button>
              <button
                type="button"
                onClick={() => setCameraUnlocked((v) => !v)}
                title="Hold Shift or toggle to enable click-and-drag camera pan & wheel zoom"
                className={`px-2 py-0.5 mr-1 font-typewriter font-bold text-[10.5px] rounded-[2px] border flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  shiftHeld || cameraUnlocked
                    ? 'bg-[#361547] border-[#D8B4FE]/45 text-[#FAF6FF]'
                    : 'bg-[#21072B]/70 border-[#EBE0F5]/16 text-[#B8A9C9] hover:text-[#FAF6FF]'
                }`}
              >
                <Move className="w-3 h-3" />
                {shiftHeld || cameraUnlocked ? 'Cam: Shift On' : 'Cam: Static [Shift]'}
              </button>
              <button
                type="button"
                onClick={() => handleZoomStep(0.85)}
                title="Zoom out"
                className="p-1 text-[#E6DCF0] hover:bg-[#2A0E38] rounded-[2px] cursor-pointer"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => handleSetExactZoom(1.0)}
                title="Set 100.00% actual pixel scale"
                className="px-1.5 py-0.5 font-typewriter font-bold text-[11px] text-[#FAF6FF] hover:bg-[#2A0E38] rounded-[2px] cursor-pointer min-w-[58px] text-center"
              >
                {(zoom * 100).toFixed(2)}%
              </button>
              <button
                type="button"
                onClick={() => handleZoomStep(1.18)}
                title="Zoom in"
                className="p-1 text-[#E6DCF0] hover:bg-[#2A0E38] rounded-[2px] cursor-pointer"
              >
                <Plus className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={handleFitClick}
                title="Fit working frame to viewport"
                className="px-2 py-0.5 font-typewriter font-bold text-[10.5px] text-[#D8B4FE] hover:bg-[#2A0E38] rounded-[2px] flex items-center gap-1 cursor-pointer"
              >
                <Maximize2 className="w-3 h-3" />
                Fit
              </button>
            </div>
          </div>
        </main>

        {inspectorOpen && (
          <InspectorConsole
            armature={armature}
            computedJoints={computedJoints}
            selectedJointId={selectedJointId}
            onSelectJoint={setSelectedJointId}
            onChangeJointAngle={handleChangeJointAngle}
            onChangeRootPosition={handleChangeRootPosition}
            onChangeJointMode={handleChangeJointMode}
            grid={grid}
            onUpdateGrid={handleUpdateGrid}
            borderOpacity={borderOpacity}
            onBorderOpacityChange={setBorderOpacity}
            showFigure={showFigure}
            onToggleFigure={() => setShowFigure((v) => !v)}
            showAllBadges={showAllBadges}
            onToggleAllBadges={() => setShowAllBadges((v) => !v)}
            onSelectPreset={handleSelectPreset}
          />
        )}
      </div>
    </div>
  );
}
