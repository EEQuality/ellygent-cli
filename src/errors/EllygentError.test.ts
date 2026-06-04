import { describe, it, expect, vi } from 'vitest';
import { 
  EllygentError, 
  ValidationError, 
  AuthenticationError, 
  NetworkError, 
  ApiError,
  FileSystemError 
} from '../errors/EllygentError.js';
import { ErrorPresenter } from '../errors/ErrorPresenter.js';
import { OutputController, OutputMode } from '../output/OutputController.js';

describe('EllygentError', () => {
  it('creates base error with exit code 1', () => {
    const error = new EllygentError('Test error');
    
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('EllygentError');
    expect(error.exitCode).toBe(1);
    expect(error.suggestions).toBeUndefined();
  });

  it('creates error with suggestions', () => {
    const error = new EllygentError('Test error', {
      exitCode: 1,
      suggestions: ['Try this', 'Or that']
    });
    
    expect(error.suggestions).toEqual(['Try this', 'Or that']);
  });

  it('creates error with details', () => {
    const error = new EllygentError('Test error', {
      exitCode: 1,
      details: { foo: 'bar', count: 42 }
    });
    
    expect(error.details).toEqual({ foo: 'bar', count: 42 });
  });

  it('serializes to JSON correctly', () => {
    const error = new EllygentError('Test error', {
      exitCode: 1,
      suggestions: ['Fix it'],
      details: { code: 'TEST' }
    });
    
    const json = error.toJSON();
    
    expect(json).toEqual({
      error: 'EllygentError',
      message: 'Test error',
      exitCode: 1,
      suggestions: ['Fix it'],
      details: { code: 'TEST' }
    });
  });

  it('chains errors with cause', () => {
    const cause = new Error('Original error');
    const error = new EllygentError('Wrapped error', {
      exitCode: 1,
      cause
    });
    
    expect(error.cause).toBe(cause);
  });
});

describe('ValidationError', () => {
  it('creates validation error with exit code 3', () => {
    const error = new ValidationError('Missing option');
    
    expect(error.message).toBe('Missing option');
    expect(error.exitCode).toBe(3);
    expect(error.suggestions).toContain('Use --help to see required options');
  });

  it('allows custom suggestions', () => {
    const error = new ValidationError('Invalid format', {
      suggestions: ['Use JSON format', 'Check docs']
    });
    
    expect(error.suggestions).toEqual(['Use JSON format', 'Check docs']);
  });
});

describe('AuthenticationError', () => {
  it('creates auth error with exit code 2', () => {
    const error = new AuthenticationError('Token expired');
    
    expect(error.message).toBe('Token expired');
    expect(error.exitCode).toBe(2);
    expect(error.suggestions?.some(s => s.includes('login --token'))).toBe(true);
  });
});

describe('NetworkError', () => {
  it('creates network error with exit code 4', () => {
    const error = new NetworkError('Connection failed');
    
    expect(error.message).toBe('Connection failed');
    expect(error.exitCode).toBe(4);
    expect(error.suggestions?.some(s => s.includes('internet connection'))).toBe(true);
  });

  it('supports custom suggestions', () => {
    const error = new NetworkError('Timeout', {
      suggestions: ['Increase timeout', 'Try again']
    });
    
    expect(error.suggestions).toEqual(['Increase timeout', 'Try again']);
  });
});

describe('ApiError', () => {
  it('creates API error with exit code 5', () => {
    const error = new ApiError('Not found', 404);
    
    expect(error.message).toBe('Not found');
    expect(error.exitCode).toBe(5);
    expect(error.statusCode).toBe(404);
  });

  it('includes status code in JSON', () => {
    const error = new ApiError('Server error', 500);
    const json = error.toJSON();
    
    expect(json.statusCode).toBe(500);
  });

  it('includes response body in JSON', () => {
    const error = new ApiError('Bad request', 400, {
      responseBody: { detail: 'Invalid input' }
    });
    const json = error.toJSON();
    
    expect(json.responseBody).toEqual({ detail: 'Invalid input' });
  });
});

describe('FileSystemError', () => {
  it('creates filesystem error with exit code 6', () => {
    const error = new FileSystemError('File not found', {
      path: '/path/to/file.txt'
    });
    
    expect(error.message).toBe('File not found');
    expect(error.exitCode).toBe(6);
    expect(error.path).toBe('/path/to/file.txt');
  });
});

describe('ErrorPresenter', () => {
  it('presents error in JSON mode', () => {
    const output = new OutputController({ mode: OutputMode.JSON });
    const presenter = new ErrorPresenter(output);
    const error = new ValidationError('Test error', {
      details: { key: 'value' }
    });
    
    // Spy on data to check it was called
    const dataSpy = vi.spyOn(output, 'data');
    
    presenter.present(error);
    
    // Should call data with error JSON
    expect(dataSpy).toHaveBeenCalledWith(expect.objectContaining({
      error: 'ValidationError',
      message: 'Test error'
    }));
  });

  it('sets process exit code', () => {
    const output = new OutputController({ mode: OutputMode.QUIET });
    const presenter = new ErrorPresenter(output);
    
    const error = new NetworkError('Test');
    presenter.present(error);
    
    expect(process.exitCode).toBe(4);
  });

  it('converts generic errors to EllygentError', () => {
    const output = new OutputController({ mode: OutputMode.JSON });
    const presenter = new ErrorPresenter(output);
    const error = new Error('Generic error');
    
    const dataSpy = vi.spyOn(output, 'data');
    presenter.present(error);
    
    // Should convert to EllygentError
    expect(dataSpy).toHaveBeenCalledWith(expect.objectContaining({
      error: 'EllygentError',
      message: 'Generic error',
      exitCode: 1
    }));
  });

  it('converts unknown values to EllygentError', () => {
    const output = new OutputController({ mode: OutputMode.JSON });
    const presenter = new ErrorPresenter(output);
    
    const dataSpy = vi.spyOn(output, 'data');
    presenter.present('string error');
    
    // Should convert to EllygentError with appropriate message
    expect(dataSpy).toHaveBeenCalledWith(expect.objectContaining({
      error: 'EllygentError',
      exitCode: 1
    }));
  });
});
