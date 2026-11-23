import React from 'react';
import {
  Eye,
  EyeOff,
  FlipHorizontal2,
  History,
  Layers,
  Redo2,
  RotateCcw,
  Undo2,
} from 'lucide-react';
import { PosePresetId, SilhouetteDisplayMode } from '../types';

interface TopConsoleBarProps {
  showFigure: boolean;
  onToggleFigure: () => void;
  silhouetteMode: SilhouetteDisplayMode;
  onToggleSilhouetteMode: () => void;
  activePreset: PosePresetId | null;
  onSelectPreset: (preset: PosePresetId) => void;
  onMirrorPose: () => void;
  onResetPose: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasLastPose: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onToggleLastPose: () => void;
}

const POSE_PRESETS: { id: PosePresetId; label: string }[] = [
  { id: 'tpose', label: 'T-Pose' },
  { id: 'vitruvian', label: 'Vitruvian' },
  { id: 'contrapposto', label: 'Contrapposto' },
  { id: 'striding', label: 'Striding' },
];

export const TopConsoleBar: React.FC<TopConsoleBarProps> = ({
  showFigure,
  onToggleFigure,
  silhouetteMode,
  onToggleSilhouetteMode,
  activePreset,
  onSelectPreset,
  onMirrorPose,
  onResetPose,
  canUndo,
  canRedo,
  hasLastPose,
  onUndo,
  onRedo,
  onToggleLastPose,
}) => {
  return (
    <header className="h-11 px-4 console-panel border-t-0 border-x-0 flex items-center justify-between gap-4 z-20 shrink-0">
      {/* Brand Wordmark */}
      <span className="font-typewriter font-bold text-sm sm:text-base tracking-[0.06em] text-[#F5EFFA] whitespace-nowrap shrink-0">
        BITRUVIUS EVOLVED
      </span>

      {/* Right Workspace Actions (All controls docked strictly outside canvas) */}
      <div className="flex items-center gap-1.5 shrink-0">
        {showFigure && (
          <>
            <div className="hidden xl:flex items-center gap-0.5 bg-[#0D0012]/80 border border-[#EBE0F5]/14 rounded-[3px] p-0.5">
              {POSE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectPreset(p.id)}
                  className={`px-2 py-1 text-[10.5px] font-vera font-bold rounded-[2px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activePreset === p.id
                      ? 'bg-[#361547] text-[#FAF6FF] border border-[#D8B4FE]/35'
                      : 'text-[#B8A9C9] hover:text-[#F5EFFA] hover:bg-[#240B31] border border-transparent'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Session Pose Journey Controls: Undo / Redo / Last Pose */}
            <div className="flex items-center gap-0.5 bg-[#0D0012]/80 border border-[#EBE0F5]/14 rounded-[3px] p-0.5">
              <button
                type="button"
                disabled={!canUndo}
                onClick={onUndo}
                title="Undo pose change (Ctrl/Cmd+Z)"
                className="p-1 text-[#E6DCF0] hover:bg-[#310E3F] rounded-[2px] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={!hasLastPose}
                onClick={onToggleLastPose}
                title="Transition to Last Pose"
                className="px-1.5 py-0.5 text-[10px] font-vera font-bold text-[#C8B2E0] hover:text-[#FAF6FF] hover:bg-[#310E3F] rounded-[2px] flex items-center gap-1 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                <History className="w-3 h-3" />
                <span className="hidden sm:inline">Last</span>
              </button>
              <button
                type="button"
                disabled={!canRedo}
                onClick={onRedo}
                title="Redo pose change (Ctrl/Cmd+Shift+Z)"
                className="p-1 text-[#E6DCF0] hover:bg-[#310E3F] rounded-[2px] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={onToggleSilhouetteMode}
              title={
                silhouetteMode === 'wireframe'
                  ? 'Strip wireframe overlays for Pure Shadow display'
                  : 'Restore 10px red joint dots and 3px armature wireframe'
              }
              className={`px-2.5 py-1 text-[10.5px] font-vera font-bold rounded-[3px] border flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                silhouetteMode === 'pure_shadow'
                  ? 'bg-[#361547] text-[#FAF6FF] border-[#D8B4FE]/40'
                  : 'bg-[#21072B] text-[#E6DCF0] hover:bg-[#310E3F] border-[#EBE0F5]/18'
              }`}
            >
              <Layers className="w-3 h-3" />
              {silhouetteMode === 'wireframe' ? 'Wireframe' : 'Pure Shadow'}
            </button>

            <button
              type="button"
              onClick={onMirrorPose}
              title="Mirror armature horizontally"
              className="px-2 py-1 text-[10.5px] font-vera font-bold text-[#E6DCF0] bg-[#21072B] hover:bg-[#310E3F] border border-[#EBE0F5]/18 rounded-[3px] flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FlipHorizontal2 className="w-3 h-3" />
              Mirror
            </button>
          </>
        )}

        <button
          type="button"
          onClick={onToggleFigure}
          title={showFigure ? 'Hide figure armature' : 'Show figure armature'}
          className={`px-2.5 py-1 text-[10.5px] font-vera font-bold rounded-[3px] border flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            showFigure
              ? 'bg-[#361547] text-[#FAF6FF] border-[#D8B4FE]/40'
              : 'bg-[#21072B] text-[#C8B2E0] hover:text-[#FAF6FF] border-[#EBE0F5]/18'
          }`}
        >
          {showFigure ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          Figure
        </button>

        <button
          type="button"
          onClick={onResetPose}
          title="Reset to canonical Vitruvian T-Pose baseline"
          className="px-2.5 py-1 text-[10.5px] font-vera font-bold text-[#E6DCF0] bg-[#21072B] hover:bg-[#310E3F] border border-[#EBE0F5]/18 rounded-[3px] flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>
    </header>
  );
};
