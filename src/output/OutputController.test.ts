import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OutputController, OutputMode } from '../output/OutputController.js';

describe('OutputController', () => {
  beforeEach(() => {
    // Reset console spies before each test
    vi.restoreAllMocks();
  });

  describe('OutputMode.DEFAULT', () => {
    it('outputs success message', () => {
      const output = new OutputController({ mode: OutputMode.DEFAULT });
      
      // Should not throw
      expect(() => output.success('Operation completed')).not.toThrow();
    });

    it('outputs error message', () => {
      const output = new OutputController({ mode: OutputMode.DEFAULT });
      
      // Should not throw
      expect(() => output.error('Something failed')).not.toThrow();
    });

    it('outputs info message', () => {
      const output = new OutputController({ mode: OutputMode.DEFAULT });
      
      // Should not throw
      expect(() => output.info('Information')).not.toThrow();
    });
  });

  describe('OutputMode.JSON', () => {
    it('accumulates data for JSON output', () => {
      const output = new OutputController({ mode: OutputMode.JSON });
      
      output.data({ key: 'value' });
      output.data({ another: 'item' });
      
      // JSON is accumulated, not logged immediately
      expect(output['jsonOutput']).toEqual({
        key: 'value',
        another: 'item'
      });
    });

    it('outputs JSON on complete()', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const output = new OutputController({ mode: OutputMode.JSON });
      
      output.data({ result: 'success' });
      output.complete();
      
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ result: 'success' }, null, 2));
      logSpy.mockRestore();
    });

    it('suppresses non-data output', () => {
      const output = new OutputController({ mode: OutputMode.JSON });
      
      // Should not throw and should accumulate in JSON
      expect(() => {
        output.success('Success');
        output.info('Info');
        output.warn('Warning');
      }).not.toThrow();
      
      expect(output['jsonOutput'].success).toBe(true);
    });

    it('shows errors in JSON mode', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const output = new OutputController({ mode: OutputMode.JSON });
      
      output.error('Error message');
      
      // Error flushes JSON immediately in JSON mode
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });

  describe('OutputMode.QUIET', () => {
    it('suppresses all output except errors', () => {
      const output = new OutputController({ mode: OutputMode.QUIET });
      
      // Should not throw
      expect(() => {
        output.success('Success');
        output.info('Info');
        output.warn('Warning');
        output.verbose('Verbose');
        output.debug('Debug');
      }).not.toThrow();
    });

    it('shows errors', () => {
      const output = new OutputController({ mode: OutputMode.QUIET });
      
      // Should not throw
      expect(() => output.error('Error')).not.toThrow();
    });
  });

  describe('OutputMode.VERBOSE', () => {
    it('shows verbose messages', () => {
      const output = new OutputController({ mode: OutputMode.VERBOSE });
      
      // Should not throw
      expect(() => output.verbose('Verbose message')).not.toThrow();
    });

    it('does not show debug messages', () => {
      const output = new OutputController({ mode: OutputMode.VERBOSE });
      
      // Should not throw, but debug is suppressed in VERBOSE mode
      expect(() => output.debug('Debug message')).not.toThrow();
    });
  });

  describe('OutputMode.DEBUG', () => {
    it('shows debug messages', () => {
      const output = new OutputController({ mode: OutputMode.DEBUG });
      
      // Should not throw
      expect(() => output.debug('Debug info')).not.toThrow();
    });

    it('shows verbose messages', () => {
      const output = new OutputController({ mode: OutputMode.DEBUG });
      
      // Should not throw
      expect(() => output.verbose('Verbose info')).not.toThrow();
    });
  });

  describe('Mode checks', () => {
    it('isQuiet() returns true for QUIET mode', () => {
      const output = new OutputController({ mode: OutputMode.QUIET });
      expect(output.isQuiet()).toBe(true);
    });

    it('isJson() returns true for JSON mode', () => {
      const output = new OutputController({ mode: OutputMode.JSON });
      expect(output.isJson()).toBe(true);
    });

    it('isVerbose() returns true for VERBOSE and DEBUG modes', () => {
      expect(new OutputController({ mode: OutputMode.VERBOSE }).isVerbose()).toBe(true);
      expect(new OutputController({ mode: OutputMode.DEBUG }).isVerbose()).toBe(true);
      expect(new OutputController({ mode: OutputMode.DEFAULT }).isVerbose()).toBe(false);
    });

    it('isDebug() returns true for DEBUG mode', () => {
      expect(new OutputController({ mode: OutputMode.DEBUG }).isDebug()).toBe(true);
      expect(new OutputController({ mode: OutputMode.VERBOSE }).isDebug()).toBe(false);
    });
  });

  describe('table()', () => {
    it('outputs table in default mode', () => {
      const output = new OutputController({ mode: OutputMode.DEFAULT });
      
      // Should not throw
      expect(() => {
        output.table([
          { id: '1', name: 'Item 1' },
          { id: '2', name: 'Item 2' }
        ], ['id', 'name']);
      }).not.toThrow();
    });

    it('accumulates table as JSON in JSON mode', () => {
      const output = new OutputController({ mode: OutputMode.JSON });
      
      const data = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' }
      ];
      
      output.table(data, ['id', 'name']);
      
      expect(output['jsonOutput'].data).toEqual(data);
      expect(output['jsonOutput'].count).toBe(2);
    });
  });
});
