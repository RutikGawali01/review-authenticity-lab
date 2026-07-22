/**
 * @module content/observer
 * @description Public interface for lazy-loaded review observer.
 */

export {
  startObserver,
  stopObserver,
  isObserving,
  getProcessedCount,
} from './lazyLoadObserver.js';
