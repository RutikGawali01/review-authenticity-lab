/**
 * @module storage
 * @description Public export interface for IndexedDB snapshot storage operations.
 */

export {
  saveSnapshot,
  getSnapshot,
  getAllSnapshots,
  deleteSnapshot,
  clearSnapshots,
} from './snapshotRepository.js';
