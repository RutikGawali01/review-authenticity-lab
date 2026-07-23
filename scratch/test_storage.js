import {
  saveSnapshot,
  getSnapshot,
  getAllSnapshots,
  deleteSnapshot,
  clearSnapshots
} from '../extension/storage/index.js';
import { DATABASE_NAME, DATABASE_VERSION, OBJECT_STORE_NAME } from '../extension/storage/schema.js';
import { openDatabase } from '../extension/storage/db.js';

console.log('--- 1. Storage Schema Constants ---');
console.log('DATABASE_NAME:', DATABASE_NAME);
console.log('DATABASE_VERSION:', DATABASE_VERSION);
console.log('OBJECT_STORE_NAME:', OBJECT_STORE_NAME);

if (
  DATABASE_NAME === 'review-authenticity-lab' &&
  DATABASE_VERSION === 1 &&
  OBJECT_STORE_NAME === 'snapshots'
) {
  console.log('✓ Schema constants match specification perfectly!');
} else {
  console.error('❌ Schema constants mismatch.');
}

console.log('\n--- 2. Repository Functions ---');
console.log('openDatabase:', typeof openDatabase === 'function');
console.log('saveSnapshot:', typeof saveSnapshot === 'function');
console.log('getSnapshot:', typeof getSnapshot === 'function');
console.log('getAllSnapshots:', typeof getAllSnapshots === 'function');
console.log('deleteSnapshot:', typeof deleteSnapshot === 'function');
console.log('clearSnapshots:', typeof clearSnapshots === 'function');

if (
  typeof openDatabase === 'function' &&
  typeof saveSnapshot === 'function' &&
  typeof getSnapshot === 'function' &&
  typeof getAllSnapshots === 'function' &&
  typeof deleteSnapshot === 'function' &&
  typeof clearSnapshots === 'function'
) {
  console.log('\n✓ All storage repository exports verified successfully!');
} else {
  console.error('\n❌ Repository exports missing.');
}
