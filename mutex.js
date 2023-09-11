export class Mutex {
  constructor() {
    this._queue = []; // Queue of pending tasks
    this._locked = false; // Mutex state
  }

  lock() {
    if (this._locked) {
      // If locked, return a promise that resolves when the mutex is unlocked
      return new Promise((resolve) => this._queue.push(resolve));
    } else {
      // If not locked, set it to locked and return a resolved promise
      this._locked = true;
      return Promise.resolve();
    }
  }

  unlock() {
    if (this._queue.length > 0) {
      // If there are tasks waiting in the queue, pop the first task and resolve its promise
      const nextTask = this._queue.shift();
      nextTask();
    } else {
      // If no tasks in the queue, just unlock the mutex
      this._locked = false;
    }
  }
}
