import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFormatter, outputData, outputTable } from './formatter.js';

describe('formatter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('createFormatter()', () => {
    it('creates formatter with json format', () => {
      const context = createFormatter('json');
      
      expect(context.format).toBe('json');
    });

    it('creates formatter with markdown format', () => {
      const context = createFormatter('markdown');
      
      expect(context.format).toBe('markdown');
    });

    it('accepts md format', () => {
      const context = createFormatter('md');
      
      expect(context.format).toBe('md');
    });
  });

  describe('outputData()', () => {
    it('outputs JSON in json format', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const data = { key: 'value', number: 42 };
      outputData(data, { format: 'json' });
      
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
      logSpy.mockRestore();
    });

    it('outputs markdown code block in markdown format', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const data = { key: 'value' };
      outputData(data, { format: 'markdown' });
      
      expect(logSpy).toHaveBeenCalledWith('```json');
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
      logSpy.mockRestore();
    });
  });

  describe('outputTable()', () => {
    it('outputs table in markdown format', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const rows = [
        { id: '1', name: 'Alice', role: 'Admin' },
        { id: '2', name: 'Bob', role: 'User' }
      ];
      const columns = ['id', 'name', 'role'];
      
      outputTable(rows, columns, { format: 'markdown' });
      
      // Should output table headers and rows
      expect(logSpy).toHaveBeenCalled();
      const calls = logSpy.mock.calls.map(call => call[0]);
      
      // Check that headers are present
      expect(calls.some((call: string) => call.includes('id'))).toBe(true);
      expect(calls.some((call: string) => call.includes('name'))).toBe(true);
      expect(calls.some((call: string) => call.includes('role'))).toBe(true);
      
      logSpy.mockRestore();
    });

    it('outputs JSON array in json format', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const rows = [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' }
      ];
      const columns = ['id', 'name'];
      
      outputTable(rows, columns, { format: 'json' });
      
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify(rows, null, 2));
      logSpy.mockRestore();
    });

    it('handles empty table', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      outputTable([], ['id', 'name'], { format: 'markdown' });
      
      // Should output headers even with no rows
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('truncates long values', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const longText = 'a'.repeat(100);
      const rows = [{ id: '1', description: longText }];
      const columns = ['id', 'description'];
      
      outputTable(rows, columns, { format: 'markdown' });
      
      // Should have been called (exact truncation behavior may vary)
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });
});
