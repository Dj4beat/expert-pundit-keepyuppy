import type { Object3D, Quaternion } from 'three';

/** Restore procedural edits before sampling again. Three's PropertyMixer skips
 * writing unchanged tracks, so update(0) alone cannot reset gaze/IK transforms. */
export class PoseOverrides {
  private bases = new Map<Object3D, Quaternion>();
  remember(bone: Object3D) {
    if (!this.bases.has(bone)) this.bases.set(bone, bone.quaternion.clone());
  }
  restore() {
    for (const [bone, rotation] of this.bases) bone.quaternion.copy(rotation);
    this.bases.clear();
  }
}
