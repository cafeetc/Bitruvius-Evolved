import React from 'react';
import { BonePlateId, BoneRenderDescriptor, JointId } from '../types';

interface BoneProps {
  descriptor: BoneRenderDescriptor;
  isSelected: boolean;
  isHovered: boolean;
  pureShadow: boolean;
  onPointerDown?: (e: React.PointerEvent<SVGGElement>, jointId: JointId) => void;
  onPointerEnter?: (jointId: JointId) => void;
  onPointerLeave?: () => void;
}

/**
 * Canonical unscaled SVG bone-length (along local +X) matching buildSortedBoneDescriptors.
 */
const CANONICAL_BASE_LENGTH: Record<BonePlateId, number> = {
  waist: 75,
  r_thigh: 225,
  l_thigh: 225,
  r_calf: 215,
  l_calf: 215,
  r_foot: 65,
  l_foot: 65,
  torso: 215,
  collar: 42,
  r_upper_arm: 175,
  l_upper_arm: 175,
  r_forearm: 155,
  l_forearm: 155,
  r_hand: 92,
  l_hand: 92,
  neck: 90,
  head: 145,
};

/**
 * Classical charcoal-ink (#16001E) Vitruvian anatomical SVG silhouettes anchored at pivot (0,0)
 * extending along local +X. Asymmetric thigh (127° femoral neck) & upper arm (deltoid/bicep)
 * housings wrap (0,0) with circular articular heads shifted smoothly by pivotOffset (dx, dy)
 * so extreme rotations inside Waist & Collar housings produce zero seam gaps or clipping.
 */
function renderBoneSilhouette(id: BonePlateId, dx: number, dy: number): React.ReactNode {
  switch (id) {
    case 'waist':
      return (
        <path
          d={
            'M 75 -38 ' +
            'C 52 -46, 22 -64, 4 -66 ' +
            'C -14 -68, -32 -60, -40 -42 ' +
            'C -48 -24, -48 24, -40 42 ' +
            'C -32 60, -14 68, 4 66 ' +
            'C 22 64, 52 46, 75 38 ' +
            'Z'
          }
        />
      );

    case 'torso':
      return (
        <path
          d={
            'M -6 -40 ' +
            'C 26 -45, 58 -54, 98 -68 ' +
            'C 138 -80, 178 -80, 206 -58 ' +
            'L 215 -34 L 215 34 L 206 58 ' +
            'C 178 80, 138 80, 98 68 ' +
            'C 58 54, 26 45, -6 40 ' +
            'Z'
          }
        />
      );

    case 'collar':
      return (
        <path
          d={
            'M -34 -36 ' +
            'C -38 -68, -42 -106, -24 -126 ' +
            'C -10 -140, 14 -130, 24 -94 ' +
            'C 32 -62, 34 -38, 44 -26 ' +
            'L 44 26 ' +
            'C 34 38, 32 62, 24 94 ' +
            'C 14 130, -10 140, -24 126 ' +
            'C -42 106, -38 68, -34 36 ' +
            'Z'
          }
        />
      );

    case 'neck':
      return (
        <path
          d={
            'M -6 -28 ' +
            'C 14 -24, 34 -22, 62 -21 ' +
            'C 78 -20, 88 -23, 94 -26 ' +
            'L 94 26 ' +
            'C 88 23, 78 20, 62 21 ' +
            'C 34 22, 14 24, -6 28 ' +
            'Z'
          }
        />
      );

    case 'head':
      return (
        <path
          d={
            'M -12 -24 ' +
            'C 10 -36, 44 -48, 80 -48 ' +
            'C 118 -48, 145 -28, 145 0 ' +
            'C 145 28, 118 48, 80 48 ' +
            'C 44 48, 10 36, -12 24 ' +
            'C -18 14, -18 -14, -12 -24 ' +
            'Z'
          }
        />
      );

    case 'r_thigh': {
      // Right thigh: viewer left; greater trochanter & lateral quad flare outward along -Y
      const oy = -Math.abs(dy);
      return (
        <g>
          {/* Femoral head concentric inside Waist acetabulum */}
          <circle cx={0} cy={0} r={26} />
          {/* 127° femoral neck bridge & sculpted asymmetrical thigh silhouette */}
          <path
            d={
              `M ${dx - 10} ${oy * 0.4 - 16} ` +
              `C ${dx + 22} ${oy - 32}, 68 ${oy - 32}, 130 -27 ` +
              'C 176 -23, 206 -20, 225 -19 ' +
              'A 19 19 0 0 1 225 19 ' +
              'C 202 20, 170 22, 126 26 ' +
              `C 68 32, ${dx + 24} ${oy + 30}, ${dx - 4} ${oy + 22} ` +
              'Z'
            }
          />
        </g>
      );
    }

    case 'l_thigh': {
      // Left thigh: viewer right; greater trochanter & lateral quad flare outward along +Y
      const oy = Math.abs(dy);
      return (
        <g>
          <circle cx={0} cy={0} r={26} />
          <path
            d={
              `M ${dx - 4} ${oy - 22} ` +
              `C ${dx + 24} ${oy - 30}, 68 -32, 126 -26 ` +
              'C 170 -22, 202 -20, 225 -19 ' +
              'A 19 19 0 0 1 225 19 ' +
              `C 206 20, 176 23, 130 27 ` +
              `C 68 ${oy + 32}, ${dx + 22} ${oy + 32}, ${dx - 10} ${oy * 0.4 + 16} ` +
              'Z'
            }
          />
        </g>
      );
    }

    case 'r_calf':
    case 'l_calf': {
      const sgn = id === 'r_calf' ? -1 : 1;
      return (
        <g>
          <circle cx={0} cy={0} r={20} />
          <path
            d={
              `M 0 ${-20 * sgn} ` +
              `C 34 ${-26 * sgn}, 74 ${-30 * sgn}, 116 ${-22 * sgn} ` +
              `C 158 ${-15 * sgn}, 190 ${-12 * sgn}, 215 ${-11 * sgn} ` +
              `A 11 11 0 0 ${sgn < 0 ? 0 : 1} 215 ${11 * sgn} ` +
              `C 188 ${12 * sgn}, 152 ${16 * sgn}, 112 ${21 * sgn} ` +
              `C 70 ${25 * sgn}, 30 ${23 * sgn}, 0 ${20 * sgn} ` +
              'Z'
            }
          />
        </g>
      );
    }

    case 'r_foot':
    case 'l_foot': {
      const sgn = id === 'r_foot' ? 1 : -1;
      return (
        <path
          d={
            `M -18 ${-11 * sgn} ` +
            `C -22 0, -18 ${12 * sgn}, -4 ${14 * sgn} ` +
            `C 16 ${15 * sgn}, 42 ${17 * sgn}, 60 ${10 * sgn} ` +
            `C 66 ${6 * sgn}, 66 ${-5 * sgn}, 56 ${-10 * sgn} ` +
            `C 38 ${-16 * sgn}, 12 ${-14 * sgn}, -18 ${-11 * sgn} ` +
            'Z'
          }
        />
      );
    }

    case 'r_upper_arm': {
      // Right upper arm: viewer left shoulder -> -Y faces superior/deltoid cap when raised laterally
      const oy = -Math.abs(dy);
      return (
        <g>
          <circle cx={0} cy={0} r={21} />
          <path
            d={
              `M ${dx - 14} ${oy - 14} ` +
              `C ${dx + 16} ${oy - 28}, 52 ${oy - 26}, 96 -20 ` +
              'C 134 -16, 156 -15, 175 -15 ' +
              'A 15 15 0 0 1 175 15 ' +
              'C 152 16, 124 19, 86 21 ' +
              `C 46 23, ${dx + 14} ${oy * 0.3 + 22}, ${dx - 8} ${oy * 0.2 + 18} ` +
              'Z'
            }
          />
        </g>
      );
    }

    case 'l_upper_arm': {
      const oy = Math.abs(dy);
      return (
        <g>
          <circle cx={0} cy={0} r={21} />
          <path
            d={
              `M ${dx - 8} ${oy * 0.2 - 18} ` +
              `C ${dx + 14} ${oy * 0.3 - 22}, 46 -23, 86 -21 ` +
              'C 124 -19, 152 -16, 175 -15 ' +
              'A 15 15 0 0 1 175 15 ' +
              'C 156 15, 134 16, 96 20 ' +
              `C 52 ${oy + 26}, ${dx + 16} ${oy + 28}, ${dx - 14} ${oy + 14} ` +
              'Z'
            }
          />
        </g>
      );
    }

    case 'r_forearm':
    case 'l_forearm': {
      const sgn = id === 'r_forearm' ? -1 : 1;
      return (
        <g>
          <circle cx={0} cy={0} r={15} />
          <path
            d={
              `M 0 ${-15 * sgn} ` +
              `C 26 ${-20 * sgn}, 58 ${-21 * sgn}, 98 ${-15 * sgn} ` +
              `C 126 ${-11 * sgn}, 144 ${-10 * sgn}, 155 ${-10 * sgn} ` +
              `A 10 10 0 0 ${sgn < 0 ? 0 : 1} 155 ${10 * sgn} ` +
              `C 142 ${10 * sgn}, 120 ${12 * sgn}, 92 ${15 * sgn} ` +
              `C 54 ${17 * sgn}, 24 ${16 * sgn}, 0 ${15 * sgn} ` +
              'Z'
            }
          />
        </g>
      );
    }

    case 'r_hand':
    case 'l_hand': {
      const sgn = id === 'r_hand' ? 1 : -1;
      return (
        <path
          d={
            `M -4 ${-9 * sgn} ` +
            `C 14 ${-13 * sgn}, 32 ${-16 * sgn}, 48 ${-19 * sgn} ` +
            `C 56 ${-21 * sgn}, 60 ${-15 * sgn}, 44 ${-10 * sgn} ` +
            `C 64 ${-11 * sgn}, 92 ${-9 * sgn}, 92 ${-2 * sgn} ` +
            `C 92 ${5 * sgn}, 82 ${11 * sgn}, 56 ${12 * sgn} ` +
            `C 34 ${13 * sgn}, 14 ${11 * sgn}, -4 ${9 * sgn} ` +
            'Z'
          }
        />
      );
    }
  }
}

export const Bone: React.FC<BoneProps> = ({
  descriptor,
  isSelected,
  isHovered,
  pureShadow,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
}) => {
  const baseLen = CANONICAL_BASE_LENGTH[descriptor.id];
  const scaleX = Math.max(0.2, descriptor.lengthPx / baseLen);
  const scaleY = descriptor.scaleWidth;

  return (
    <g
      data-bone-id={descriptor.id}
      data-z-index={descriptor.zIndex.toFixed(2)}
      transform={`translate(${descriptor.originX}, ${descriptor.originY}) rotate(${descriptor.worldAngle}) scale(${scaleX}, ${scaleY})`}
      fill="#16001E"
      fillOpacity={pureShadow ? 0.96 : 0.9}
      stroke={
        isSelected
          ? '#A855F7'
          : isHovered
          ? '#7DD3FC'
          : pureShadow
          ? '#16001E'
          : 'rgba(246, 242, 250, 0.28)'
      }
      strokeWidth={isSelected ? 2 : isHovered ? 1.5 : pureShadow ? 0.5 : 0.85}
      vectorEffect="non-scaling-stroke"
      onPointerDown={onPointerDown ? (e) => onPointerDown(e, descriptor.jointId) : undefined}
      onPointerEnter={onPointerEnter ? () => onPointerEnter(descriptor.jointId) : undefined}
      onPointerLeave={onPointerLeave}
      style={{
        cursor: 'pointer',
        transition: 'fill-opacity 140ms ease, stroke 140ms ease',
      }}
    >
      {renderBoneSilhouette(
        descriptor.id,
        descriptor.pivotOffset.dx,
        descriptor.pivotOffset.dy
      )}
    </g>
  );
};
