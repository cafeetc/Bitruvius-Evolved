import React from 'react';
import {
  Eye,
  EyeOff,
  FlipHorizontal2,
  RotateCcw,
} from 'lucide-react';
import { PosePresetId } from '../types/bitruvius';

interface TopConsoleBarProps {
  showFigure: boolean;
  onToggleFigure: () => void;
  activePreset: PosePresetId | null;
  onSelectPreset: (preset: PosePresetId) => void;
  onMirrorPose: () => void;
  onResetPose: () => void;
}

const POSE_PRESETS: { id: PosePresetId; label: string }[] = [
  { id: 'vitruvian', label: 'Vitruvian' },
  { id: 'contrapposto', label: 'Contrapposto' },
  { id: 'striding', label: 'Striding' },
  { id: 'tpose', label: 'T-Pose' },
];

export const TopConsoleBar: React.FC<TopConsoleBarProps> = ({
  showFigure,
  onToggleFigure,
  activePreset,
  onSelectPreset,
  onMirrorPose,
  onResetPose,
}) => {
  return (
    <header className="h-11 px-4 console-panel border-t-0 border-x-0 flex items-center justify-between gap-4 z-20 shrink-0">
      {/* Brand Wordmark */}
      <span className="font-typewriter font-bold text-sm sm:text-base tracking-[0.06em] text-[#F5EFFA] whitespace-nowrap shrink-0">
        BITRUVIUS EVOLVED
      </span>

      {/* Right Workspace Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {showFigure && (
          <>
            <div className="hidden xl:flex items-center gap-0.5 bg-[#0D0012]/80 border border-[#EBE0F5]/14 rounded-[3px] p-0.5">
              {POSE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectPreset(p.id)}
                  className={`px-2 py-1 text-[10.5px] font-typewriter font-bold rounded-[2px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activePreset === p.id
                      ? 'bg-[#361547] text-[#FAF6FF] border border-[#D8B4FE]/35'
                      : 'text-[#B8A9C9] hover:text-[#F5EFFA] hover:bg-[#240B31] border border-transparent'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onMirrorPose}
              title="Mirror armature horizontally"
              className="px-2 py-1 text-[10.5px] font-typewriter font-bold text-[#E6DCF0] bg-[#21072B] hover:bg-[#310E3F] border border-[#EBE0F5]/18 rounded-[3px] flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
          className={`px-2.5 py-1 text-[10.5px] font-typewriter font-bold rounded-[3px] border flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
          title="Reset stage view"
          className="px-2.5 py-1 text-[10.5px] font-typewriter font-bold text-[#E6DCF0] bg-[#21072B] hover:bg-[#310E3F] border border-[#EBE0F5]/18 rounded-[3px] flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>
    </header>
  );
};
