/**
 * Unit tests for EventBus
 */
import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../../js/core/EventBus.js';

describe('EventBus', () => {
  it('should call listener when event is emitted', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('test', handler);
    bus.emit('test', { value: 42 });
    expect(handler).toHaveBeenCalledWith({ value: 42 });
  });

  it('should support multiple listeners on the same event', () => {
    const bus = new EventBus();
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on('test', h1);
    bus.on('test', h2);
    bus.emit('test', 'data');
    expect(h1).toHaveBeenCalledWith('data');
    expect(h2).toHaveBeenCalledWith('data');
  });

  it('should not call listeners for other events', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('eventA', handler);
    bus.emit('eventB', 'data');
    expect(handler).not.toHaveBeenCalled();
  });

  it('should remove a listener with off()', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('test', handler);
    bus.off('test', handler);
    bus.emit('test', 'data');
    expect(handler).not.toHaveBeenCalled();
  });

  it('should not error when emitting an event with no listeners', () => {
    const bus = new EventBus();
    expect(() => bus.emit('nonexistent', {})).not.toThrow();
  });

  it('should not error when removing a listener that was never added', () => {
    const bus = new EventBus();
    expect(() => bus.off('test', () => {})).not.toThrow();
  });

  it('should call listener multiple times for multiple emissions', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('test', handler);
    bus.emit('test', 1);
    bus.emit('test', 2);
    bus.emit('test', 3);
    expect(handler).toHaveBeenCalledTimes(3);
  });

  it('should only remove the specific listener, not all', () => {
    const bus = new EventBus();
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on('test', h1);
    bus.on('test', h2);
    bus.off('test', h1);
    bus.emit('test', 'data');
    expect(h1).not.toHaveBeenCalled();
    expect(h2).toHaveBeenCalledWith('data');
  });
});
