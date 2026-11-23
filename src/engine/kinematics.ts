import {
  ArmatureState,
  ComputedJoint,
  JointId,
  JointMode,
  JointRuntimeState,
  JointSpec,
  PAPER_HEIGHT,
  PAPER_WIDTH,
  PosePresetId,
  WorkingSquareBase,
} from '../types/bitruvius';

export const JOINT_SPECS: JointSpec[] = [
  {
    id: 'pelvis',
    label: 'Pelvis Root',
    shortCode: 'PLV',
    subtitle: 'Primary center-of-mass root pivot',
    parentId: null,
    lengthPx: 0,
    isSpine: true,
    defaultLocalAngle: 0,
    defaultMode: 'ROOT',
  },
  // Spinal column (3px dashed spine)
  {
    id: 'lumbar',
    label: 'Lumbar Vertebra',
    shortCode: 'LMB',
    subtitle: 'Lower axial spine articulation',
    parentId: 'pelvis',
    lengthPx: 115,
    isSpine: true,
    defaultLocalAngle: -90,
    defaultMode: 'FK',
  },
  {
    id: 'thoracic',
    label: 'Thoracic Sternum',
    shortCode: 'THX',
    subtitle: 'Upper ribcage & shoulder girdle anchor',
    parentId: 'lumbar',
    lengthPx: 165,
    isSpine: true,
    defaultLocalAngle: 0,
    defaultMode: 'FK',
  },
  {
    id: 'cervical',
    label: 'Cervical Neck',
    shortCode: 'CRV',
    subtitle: 'Axial neck bridge',
    parentId: 'thoracic',
    lengthPx: 85,
    isSpine: true,
    defaultLocalAngle: 0,
    defaultMode: 'FK',
  },
  {
    id: 'cranium',
    label: 'Cranium Base',
    shortCode: 'CRN',
    subtitle: 'Atlanto-occipital pivot',
    parentId: 'cervical',
    lengthPx: 70,
    isSpine: true,
    defaultLocalAngle: 0,
    defaultMode: 'FK',
  },
  {
    id: 'crown',
    label: 'Vertex Crown',
    shortCode: 'VTX',
    subtitle: 'Superior cranial apex',
    parentId: 'cranium',
    lengthPx: 85,
    isSpine: true,
    defaultLocalAngle: 0,
    defaultMode: 'FK',
    ikChain: 'spine',
  },

  // Right Arm (Viewer Left)
  {
    id: 'r_clavicle',
    label: 'Right Clavicle',
    shortCode: 'R.CLV',
    subtitle: 'Right sternoclavicular link',
    parentId: 'thoracic',
    lengthPx: 45,
    defaultLocalAngle: -90,
    defaultMode: 'FK',
  },
  {
    id: 'r_shoulder',
    label: 'Right Shoulder',
    shortCode: 'R.SHD',
    subtitle: 'Right glenohumeral socket',
    parentId: 'r_clavicle',
    lengthPx: 65,
    defaultLocalAngle: 0,
    defaultMode: 'FK',
  },
  {
    id: 'r_elbow',
    label: 'Right Elbow',
    shortCode: 'R.ELB',
    subtitle: 'Right humeral-ulnar hinge',
    parentId: 'r_shoulder',
    lengthPx: 180,
    defaultLocalAngle: -16,
    defaultMode: 'FK',
  },
  {
    id: 'r_wrist',
    label: 'Right Wrist',
    shortCode: 'R.WRS',
    subtitle: 'Right radiocarpal effector',
    parentId: 'r_elbow',
    lengthPx: 165,
    defaultLocalAngle: 4,
    defaultMode: 'IK',
    ikChain: ['r_shoulder', 'r_elbow', 'r_wrist'],
    bendDirection: -1,
  },
  {
    id: 'r_hand',
    label: 'Right Metacarpal',
    shortCode: 'R.HND',
    subtitle: 'Right terminal hand tip',
    parentId: 'r_wrist',
    lengthPx: 75,
    defaultLocalAngle: 0,
    defaultMode: 'FK',
  },

  // Left Arm (Viewer Right)
  {
    id: 'l_clavicle',
    label: 'Left Clavicle',
    shortCode: 'L.CLV',
    subtitle: 'Left sternoclavicular link',
    parentId: 'thoracic',
    lengthPx: 45,
    defaultLocalAngle: 90,
    defaultMode: 'FK',
  },
  {
    id: 'l_shoulder',
    label: 'Left Shoulder',
    shortCode: 'L.SHD',
    subtitle: 'Left glenohumeral socket',
    parentId: 'l_clavicle',
    lengthPx: 65,
    defaultLocalAngle: 0,
    defaultMode: 'FK',
  },
  {
    id: 'l_elbow',
    label: 'Left Elbow',
    shortCode: 'L.ELB',
    subtitle: 'Left humeral-ulnar hinge',
    parentId: 'l_shoulder',
    lengthPx: 180,
    defaultLocalAngle: 16,
    defaultMode: 'FK',
  },
  {
    id: 'l_wrist',
    label: 'Left Wrist',
    shortCode: 'L.WRS',
    subtitle: 'Left radiocarpal effector',
    parentId: 'l_elbow',
    lengthPx: 165,
    defaultLocalAngle: -4,
    defaultMode: 'IK',
    ikChain: ['l_shoulder', 'l_elbow', 'l_wrist'],
    bendDirection: 1,
  },
  {
    id: 'l_hand',
    label: 'Left Metacarpal',
    shortCode: 'L.HND',
    subtitle: 'Left terminal hand tip',
    parentId: 'l_wrist',
    lengthPx: 75,
    defaultLocalAngle: 0,
    defaultMode: 'FK',
  },

  // Right Leg (Viewer Left)
  {
    id: 'r_hip',
    label: 'Right Hip',
    shortCode: 'R.HIP',
    subtitle: 'Right acetabular socket',
    parentId: 'pelvis',
    lengthPx: 68,
    defaultLocalAngle: 156,
    defaultMode: 'FK',
  },
  {
    id: 'r_knee',
    label: 'Right Knee',
    shortCode: 'R.KNE',
    subtitle: 'Right femorotibial hinge',
    parentId: 'r_hip',
    lengthPx: 245,
    defaultLocalAngle: -56,
    defaultMode: 'FK',
  },
  {
    id: 'r_ankle',
    label: 'Right Ankle',
    shortCode: 'R.ANK',
    subtitle: 'Right talocrural effector',
    parentId: 'r_knee',
    lengthPx: 235,
    defaultLocalAngle: -4,
    defaultMode: 'IK',
    ikChain: ['r_hip', 'r_knee', 'r_ankle'],
    bendDirection: 1,
  },
  {
    id: 'r_foot',
    label: 'Right Metatarsal',
    shortCode: 'R.FOT',
    subtitle: 'Right pedal base',
    parentId: 'r_ankle',
    lengthPx: 72,
    defaultLocalAngle: 35,
    defaultMode: 'FK',
  },

  // Left Leg (Viewer Right)
  {
    id: 'l_hip',
    label: 'Left Hip',
    shortCode: 'L.HIP',
    subtitle: 'Left acetabular socket',
    parentId: 'pelvis',
    lengthPx: 68,
    defaultLocalAngle: 24,
    defaultMode: 'FK',
  },
  {
    id: 'l_knee',
    label: 'Left Knee',
    shortCode: 'L.KNE',
    subtitle: 'Left femorotibial hinge',
    parentId: 'l_hip',
    lengthPx: 245,
    defaultLocalAngle: 56,
    defaultMode: 'FK',
  },
  {
    id: 'l_ankle',
    label: 'Left Ankle',
    shortCode: 'L.ANK',
    subtitle: 'Left talocrural effector',
    parentId: 'l_knee',
    lengthPx: 235,
    defaultLocalAngle: 4,
    defaultMode: 'IK',
    ikChain: ['l_hip', 'l_knee', 'l_ankle'],
    bendDirection: -1,
  },
  {
    id: 'l_foot',
    label: 'Left Metatarsal',
    shortCode: 'L.FOT',
    subtitle: 'Left pedal base',
    parentId: 'l_ankle',
    lengthPx: 72,
    defaultLocalAngle: -35,
    defaultMode: 'FK',
  },
];

export const JOINT_SPEC_MAP: Record<JointId, JointSpec> = JOINT_SPECS.reduce(
  (acc, spec) => {
    acc[spec.id] = spec;
    return acc;
  },
  {} as Record<JointId, JointSpec>
);

export function normalizeAngleDeg(deg: number): number {
  let a = ((deg + 180) % 360 + 360) % 360 - 180;
  if (a === -180) a = 180;
  return a;
}

export function formatSignedDeg(deg: number): string {
  const n = normalizeAngleDeg(deg);
  const abs = Math.abs(n).toFixed(2);
  const sign = n < -0.005 ? '-' : '+';
  return `${sign}${abs}°`;
}

export function formatSignedNum(val: number, decimals = 2): string {
  const abs = Math.abs(val).toFixed(decimals);
  const sign = val < -0.0005 ? '-' : '+';
  return `${sign}${abs}`;
}

/**
 * Derives the conceptual WorkingSquareBase directly from the armature model's
 * maximum physical reach across all extremes (left, right, top, bottom).
 * This square is conceptual (not drawn on canvas) and serves as the base
 * coordinate mechanism the figure connects to.
 */
export function computeModelWorkingSquare(
  centerX = PAPER_WIDTH / 2,
  centerY = PAPER_HEIGHT / 2
): WorkingSquareBase {
  const sumLengths = (ids: JointId[]) =>
    ids.reduce((sum, id) => sum + JOINT_SPEC_MAP[id].lengthPx, 0);

  const armSpanHalf = sumLengths([
    'r_clavicle',
    'r_shoulder',
    'r_elbow',
    'r_wrist',
    'r_hand',
  ]);
  const spineHeight = sumLengths([
    'lumbar',
    'thoracic',
    'cervical',
    'cranium',
    'crown',
  ]);
  const overheadArmReach =
    sumLengths(['lumbar', 'thoracic', 'r_shoulder', 'r_elbow', 'r_wrist', 'r_hand']);
  const maxReachUpPx = Math.max(spineHeight, overheadArmReach);
  const maxReachDownPx = sumLengths(['r_hip', 'r_knee', 'r_ankle', 'r_foot']);

  const horizontalSpanPx = armSpanHalf * 2;
  const verticalSpanPx = maxReachUpPx + maxReachDownPx;
  const sidePx = Math.max(horizontalSpanPx, verticalSpanPx);
  const halfSidePx = sidePx / 2;

  // Offset pelvis root from the square's geometric center so top & bottom extremes sit symmetrically inside
  const modelRootOffsetY = (maxReachUpPx - maxReachDownPx) / 2;

  return {
    sidePx,
    halfSidePx,
    centerX,
    centerY,
    minX: centerX - halfSidePx,
    maxX: centerX + halfSidePx,
    minY: centerY - halfSidePx,
    maxY: centerY + halfSidePx,
    modelRootOffsetY,
    extremes: {
      horizontalSpanPx,
      verticalSpanPx,
      maxReachUpPx,
      maxReachDownPx,
    },
  };
}

export function createPosePreset(preset: PosePresetId): ArmatureState {
  const joints = {} as Record<JointId, JointRuntimeState>;
  for (const spec of JOINT_SPECS) {
    joints[spec.id] = {
      localAngle: spec.defaultLocalAngle,
      mode: spec.defaultMode,
    };
  }

  const workingBase = computeModelWorkingSquare();
  const base: ArmatureState = {
    rootX: workingBase.centerX,
    rootY: workingBase.centerY + workingBase.modelRootOffsetY,
    rootRotation: 0,
    joints,
  };

  if (preset === 'tpose') {
    base.joints.r_elbow.localAngle = 0;
    base.joints.r_wrist.localAngle = 0;
    base.joints.l_elbow.localAngle = 0;
    base.joints.l_wrist.localAngle = 0;
    base.joints.r_knee.localAngle = -66;
    base.joints.r_ankle.localAngle = 0;
    base.joints.r_foot.localAngle = 48;
    base.joints.l_knee.localAngle = 66;
    base.joints.l_ankle.localAngle = 0;
    base.joints.l_foot.localAngle = -48;
  } else if (preset === 'contrapposto') {
    base.rootRotation = 4;
    base.joints.lumbar.localAngle = -94;
    base.joints.thoracic.localAngle = -4;
    base.joints.cervical.localAngle = 5;
    base.joints.cranium.localAngle = 4;
    base.joints.r_shoulder.localAngle = 6;
    base.joints.r_elbow.localAngle = -68;
    base.joints.r_wrist.localAngle = -14;
    base.joints.l_shoulder.localAngle = -4;
    base.joints.l_elbow.localAngle = 62;
    base.joints.l_wrist.localAngle = 18;
    base.joints.r_hip.localAngle = 152;
    base.joints.r_knee.localAngle = -60;
    base.joints.r_ankle.localAngle = 4;
    base.joints.r_foot.localAngle = 32;
    base.joints.l_hip.localAngle = 30;
    base.joints.l_knee.localAngle = 66;
    base.joints.l_ankle.localAngle = -22;
    base.joints.l_foot.localAngle = -14;
  } else if (preset === 'striding') {
    base.rootRotation = -6;
    base.joints.lumbar.localAngle = -82;
    base.joints.thoracic.localAngle = 8;
    base.joints.cervical.localAngle = -4;
    base.joints.r_elbow.localAngle = -52;
    base.joints.r_wrist.localAngle = -38;
    base.joints.l_elbow.localAngle = 48;
    base.joints.l_wrist.localAngle = 34;
    base.joints.r_hip.localAngle = 135;
    base.joints.r_knee.localAngle = -28;
    base.joints.r_ankle.localAngle = 22;
    base.joints.r_foot.localAngle = 42;
    base.joints.l_hip.localAngle = 42;
    base.joints.l_knee.localAngle = 30;
    base.joints.l_ankle.localAngle = 18;
    base.joints.l_foot.localAngle = -35;
  } else {
    // vitruvian (arms elevated symmetrically +18° above horizontal, legs splayed to circle rim)
    base.joints.r_elbow.localAngle = 14.5;
    base.joints.r_wrist.localAngle = 0;
    base.joints.l_elbow.localAngle = -14.5;
    base.joints.l_wrist.localAngle = 0;
    base.joints.r_hip.localAngle = 158;
    base.joints.r_knee.localAngle = -48;
    base.joints.r_ankle.localAngle = 0;
    base.joints.r_foot.localAngle = 38;
    base.joints.l_hip.localAngle = 22;
    base.joints.l_knee.localAngle = 48;
    base.joints.l_ankle.localAngle = 0;
    base.joints.l_foot.localAngle = -38;
  }

  return base;
}

export function computeArmature(state: ArmatureState): Record<JointId, ComputedJoint> {
  const computed = {} as Record<JointId, ComputedJoint>;

  for (const spec of JOINT_SPECS) {
    const runtime = state.joints[spec.id];
    if (spec.parentId === null) {
      computed[spec.id] = {
        id: spec.id,
        spec,
        x: state.rootX,
        y: state.rootY,
        parentX: null,
        parentY: null,
        localAngle: state.rootRotation,
        worldAngle: state.rootRotation,
        mode: runtime.mode,
      };
    } else {
      const parent = computed[spec.parentId];
      const worldAngle = normalizeAngleDeg(parent.worldAngle + runtime.localAngle);
      const rad = (worldAngle * Math.PI) / 180;
      const x = parent.x + Math.cos(rad) * spec.lengthPx;
      const y = parent.y + Math.sin(rad) * spec.lengthPx;
      computed[spec.id] = {
        id: spec.id,
        spec,
        x,
        y,
        parentX: parent.x,
        parentY: parent.y,
        localAngle: runtime.localAngle,
        worldAngle,
        mode: runtime.mode,
      };
    }
  }

  return computed;
}

export function getChildIds(parentId: JointId): JointId[] {
  return JOINT_SPECS.filter((s) => s.parentId === parentId).map((s) => s.id);
}

/**
 * Solves 2-bone analytical IK for chain [rootJoint -> midJoint -> endJoint]
 * where:
 *  - midJoint is child of rootJoint (length L1 = midJoint.lengthPx)
 *  - endJoint is child of midJoint (length L2 = endJoint.lengthPx)
 */
export function solveTwoBoneIK(
  state: ArmatureState,
  endId: JointId,
  targetX: number,
  targetY: number
): ArmatureState {
  const endSpec = JOINT_SPEC_MAP[endId];
  if (!endSpec.ikChain || endSpec.ikChain === 'spine') {
    return state;
  }

  const [rootId, midId] = endSpec.ikChain;
  const computed = computeArmature(state);
  const rootJoint = computed[rootId];
  const midSpec = JOINT_SPEC_MAP[midId];
  const L1 = midSpec.lengthPx;
  const L2 = endSpec.lengthPx;

  const dx = targetX - rootJoint.x;
  const dy = targetY - rootJoint.y;
  const rawDist = Math.hypot(dx, dy);
  const minDist = Math.abs(L1 - L2) + 2;
  const maxDist = L1 + L2 - 0.5;
  const d = Math.max(minDist, Math.min(maxDist, rawDist));

  const baseAngle = Math.atan2(dy, dx);
  const cosAlpha = Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)));
  const alpha = Math.acos(cosAlpha);

  const cosBeta = Math.max(-1, Math.min(1, (L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2)));
  const beta = Math.acos(cosBeta);

  const bendDir = endSpec.bendDirection ?? 1;
  const worldAngle1 = ((baseAngle + bendDir * alpha) * 180) / Math.PI;
  const worldAngle2 = ((baseAngle + bendDir * alpha - bendDir * (Math.PI - beta)) * 180) / Math.PI;

  const nextLocalMid = normalizeAngleDeg(worldAngle1 - rootJoint.worldAngle);
  const nextLocalEnd = normalizeAngleDeg(worldAngle2 - worldAngle1);

  return {
    ...state,
    joints: {
      ...state.joints,
      [midId]: { ...state.joints[midId], localAngle: nextLocalMid },
      [endId]: { ...state.joints[endId], localAngle: nextLocalEnd },
    },
  };
}

/**
 * Forward Kinematics drag: dragging `jointId` aims the bone from `parentId -> jointId`
 * directly toward `(targetX, targetY)`.
 */
export function solveFKDrag(
  state: ArmatureState,
  jointId: JointId,
  targetX: number,
  targetY: number
): ArmatureState {
  const spec = JOINT_SPEC_MAP[jointId];
  if (!spec.parentId) return state;

  const computed = computeArmature(state);
  const parent = computed[spec.parentId];
  const dx = targetX - parent.x;
  const dy = targetY - parent.y;
  if (Math.hypot(dx, dy) < 1e-3) return state;

  const targetWorldDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const nextLocal = normalizeAngleDeg(targetWorldDeg - parent.worldAngle);

  return {
    ...state,
    joints: {
      ...state.joints,
      [jointId]: { ...state.joints[jointId], localAngle: nextLocal },
    },
  };
}

/**
 * Spine CCD IK when dragging 'crown' in IK mode
 */
export function solveSpineCCDIK(
  state: ArmatureState,
  targetX: number,
  targetY: number
): ArmatureState {
  const chain: JointId[] = ['lumbar', 'thoracic', 'cervical', 'cranium'];
  let current: ArmatureState = {
    ...state,
    joints: { ...state.joints },
  };

  for (let iter = 0; iter < 8; iter++) {
    for (let i = chain.length - 1; i >= 0; i--) {
      const jointId = chain[i];
      if (current.joints[jointId].mode === 'PIN') continue;

      const computed = computeArmature(current);
      const pivot = computed[JOINT_SPEC_MAP[jointId].parentId!];
      const effector = computed.crown;

      const aEff = Math.atan2(effector.y - pivot.y, effector.x - pivot.x);
      const aTgt = Math.atan2(targetY - pivot.y, targetX - pivot.x);
      let deltaDeg = ((aTgt - aEff) * 180) / Math.PI;
      deltaDeg = normalizeAngleDeg(deltaDeg);
      // Dampen per step for natural curvature
      deltaDeg = Math.max(-18, Math.min(18, deltaDeg * 0.65));

      current = {
        ...current,
        joints: {
          ...current.joints,
          [jointId]: {
            ...current.joints[jointId],
            localAngle: normalizeAngleDeg(current.joints[jointId].localAngle + deltaDeg),
          },
        },
      };
    }
  }
  return current;
}

export function setJointMode(
  state: ArmatureState,
  jointId: JointId,
  mode: JointMode
): ArmatureState {
  return {
    ...state,
    joints: {
      ...state.joints,
      [jointId]: { ...state.joints[jointId], mode },
    },
  };
}

export function mirrorPose(state: ArmatureState): ArmatureState {
  const nextJoints = { ...state.joints };
  const pairs: [JointId, JointId][] = [
    ['r_clavicle', 'l_clavicle'],
    ['r_shoulder', 'l_shoulder'],
    ['r_elbow', 'l_elbow'],
    ['r_wrist', 'l_wrist'],
    ['r_hand', 'l_hand'],
    ['r_hip', 'l_hip'],
    ['r_knee', 'l_knee'],
    ['r_ankle', 'l_ankle'],
    ['r_foot', 'l_foot'],
  ];

  for (const [rId, lId] of pairs) {
    const r = state.joints[rId];
    const l = state.joints[lId];
    nextJoints[rId] = { ...r, localAngle: normalizeAngleDeg(-l.localAngle) };
    nextJoints[lId] = { ...l, localAngle: normalizeAngleDeg(-r.localAngle) };
  }

  const spineIds: JointId[] = ['lumbar', 'thoracic', 'cervical', 'cranium', 'crown'];
  for (const id of spineIds) {
    if (id === 'lumbar') {
      nextJoints[id] = {
        ...state.joints[id],
        localAngle: normalizeAngleDeg(-180 - state.joints[id].localAngle),
      };
    } else {
      nextJoints[id] = {
        ...state.joints[id],
        localAngle: normalizeAngleDeg(-state.joints[id].localAngle),
      };
    }
  }

  return {
    ...state,
    rootRotation: normalizeAngleDeg(-state.rootRotation),
    joints: nextJoints,
  };
}
