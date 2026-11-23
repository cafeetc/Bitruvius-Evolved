export type GridOriginMode = 'corner' | 'center';

export type SnapMode = 'none' | 'subpyxl' | 'pyxl';

export type JointMode = 'ROOT' | 'FK' | 'IK' | 'PIN';

export type PosePresetId = 'vitruvian' | 'tpose' | 'contrapposto' | 'striding';

export type JointId =
  | 'pelvis'
  | 'lumbar'
  | 'thoracic'
  | 'cervical'
  | 'cranium'
  | 'crown'
  | 'r_clavicle'
  | 'r_shoulder'
  | 'r_elbow'
  | 'r_wrist'
  | 'r_hand'
  | 'l_clavicle'
  | 'l_shoulder'
  | 'l_elbow'
  | 'l_wrist'
  | 'l_hand'
  | 'r_hip'
  | 'r_knee'
  | 'r_ankle'
  | 'r_foot'
  | 'l_hip'
  | 'l_knee'
  | 'l_ankle'
  | 'l_foot';

export interface JointSpec {
  id: JointId;
  label: string;
  shortCode: string;
  subtitle: string;
  parentId: JointId | null;
  lengthPx: number;
  isSpine?: boolean;
  defaultLocalAngle: number;
  defaultMode: JointMode;
  ikChain?: [JointId, JointId, JointId] | 'spine';
  bendDirection?: 1 | -1;
}

export interface JointRuntimeState {
  localAngle: number; // degrees relative to parent worldAngle
  mode: JointMode;
}

export interface ComputedJoint {
  id: JointId;
  spec: JointSpec;
  x: number;
  y: number;
  parentX: number | null;
  parentY: number | null;
  localAngle: number;
  worldAngle: number;
  mode: JointMode;
}

export interface ArmatureState {
  rootX: number;
  rootY: number;
  rootRotation: number;
  joints: Record<JointId, JointRuntimeState>;
}

export interface GridConfig {
  showSubpyxl: boolean; // 10px = 0.10 pyx
  showPyxl: boolean;    // 100px = 1.00 pyx
  showMegapyxl: boolean; // 1,000px = 10.00 pyx
  showLabels: boolean;
  showVitruvianGuide: boolean;
  originMode: GridOriginMode;
  snapMode: SnapMode;
}

/**
 * Conceptual bounding square enclosing the figure model at all extremes
 * (left, right, top, bottom). Not rendered on canvas; acts as the base
 * coordinate/anchoring mechanism that the armature model connects to.
 */
export interface WorkingSquareBase {
  sidePx: number;
  halfSidePx: number;
  centerX: number;
  centerY: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  modelRootOffsetY: number;
  extremes: {
    horizontalSpanPx: number;
    verticalSpanPx: number;
    maxReachUpPx: number;
    maxReachDownPx: number;
  };
}

export const PAPER_WIDTH = 1363;
export const PAPER_HEIGHT = 1800;

export const SUBPYXL_PX = 10;
export const PYXL_PX = 100;
export const MEGAPYXL_PX = 1000;
