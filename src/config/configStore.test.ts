import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadFromEnv, normalizeApiUrl, ConfigError } from '../config/configStore.js';

describe('loadFromEnv', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('loads ELLYGENT_API_URL from environment', () => {
    process.env.ELLYGENT_API_URL = 'https://api.example.com';
    
    const config = loadFromEnv();
    
    expect(config.apiUrl).toBe('https://api.example.com');
  });

  it('loads ELLYGENT_TOKEN as accessToken', () => {
    process.env.ELLYGENT_TOKEN = 'test_token_123';
    
    const config = loadFromEnv();
    
    expect(config.accessToken).toBe('test_token_123');
  });

  it('loads ELLYGENT_ORG as defaultOrg', () => {
    process.env.ELLYGENT_ORG = 'my-org';
    
    const config = loadFromEnv();
    
    expect(config.defaultOrg).toBe('my-org');
  });

  it('loads ELLYGENT_PROJECT as defaultProject', () => {
    process.env.ELLYGENT_PROJECT = 'my-project';
    
    const config = loadFromEnv();
    
    expect(config.defaultProject).toBe('my-project');
  });

  it('returns empty object when no env vars set', () => {
    delete process.env.ELLYGENT_API_URL;
    delete process.env.ELLYGENT_TOKEN;
    delete process.env.ELLYGENT_ORG;
    delete process.env.ELLYGENT_PROJECT;
    
    const config = loadFromEnv();
    
    expect(config).toEqual({});
  });

  it('trims whitespace from env vars', () => {
    process.env.ELLYGENT_ORG = '  my-org  ';
    process.env.ELLYGENT_TOKEN = ' token123 ';
    
    const config = loadFromEnv();
    
    expect(config.defaultOrg).toBe('my-org');
    expect(config.accessToken).toBe('token123');
  });

  it('ignores empty env vars', () => {
    process.env.ELLYGENT_ORG = '   ';
    process.env.ELLYGENT_TOKEN = '';
    
    const config = loadFromEnv();
    
    expect(config.defaultOrg).toBeUndefined();
    expect(config.accessToken).toBeUndefined();
  });

  it('warns on invalid API URL but continues', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    process.env.ELLYGENT_API_URL = 'not-a-url';
    
    const config = loadFromEnv();
    
    expect(config.apiUrl).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid ELLYGENT_API_URL'));
    
    warnSpy.mockRestore();
  });

  it('loads multiple env vars at once', () => {
    process.env.ELLYGENT_API_URL = 'https://api.test.com';
    process.env.ELLYGENT_TOKEN = 'token';
    process.env.ELLYGENT_ORG = 'org';
    process.env.ELLYGENT_PROJECT = 'proj';
    
    const config = loadFromEnv();
    
    expect(config).toEqual({
      apiUrl: 'https://api.test.com',
      accessToken: 'token',
      defaultOrg: 'org',
      defaultProject: 'proj'
    });
  });
});

describe('normalizeApiUrl', () => {
  it('normalizes valid URL', () => {
    const url = normalizeApiUrl('https://api.example.com');
    
    expect(url).toBe('https://api.example.com');
  });

  it('removes trailing slashes', () => {
    const url = normalizeApiUrl('https://api.example.com/');
    
    expect(url).toBe('https://api.example.com');
  });

  it('removes multiple trailing slashes', () => {
    const url = normalizeApiUrl('https://api.example.com///');
    
    expect(url).toBe('https://api.example.com');
  });

  it('removes pathname trailing slashes', () => {
    const url = normalizeApiUrl('https://api.example.com/api/v1/');
    
    expect(url).toBe('https://api.example.com/api/v1');
  });

  it('removes query string', () => {
    const url = normalizeApiUrl('https://api.example.com?foo=bar');
    
    expect(url).toBe('https://api.example.com');
  });

  it('removes hash fragment', () => {
    const url = normalizeApiUrl('https://api.example.com#section');
    
    expect(url).toBe('https://api.example.com');
  });

  it('preserves port', () => {
    const url = normalizeApiUrl('https://www.ellygent.com/api/');
    
    expect(url).toBe('https://www.ellygent.com/api/');
  });

  it('preserves pathname', () => {
    const url = normalizeApiUrl('https://api.example.com/v2');
    
    expect(url).toBe('https://api.example.com/v2');
  });

  it('throws on invalid URL', () => {
    expect(() => normalizeApiUrl('not-a-url')).toThrow(ConfigError);
    expect(() => normalizeApiUrl('not-a-url')).toThrow('must be a valid absolute URL');
  });

  it('throws on relative URL', () => {
    expect(() => normalizeApiUrl('/api/v1')).toThrow(ConfigError);
  });

  it('returns empty string for empty input', () => {
    const url = normalizeApiUrl('');
    
    expect(url).toBe('');
  });

  it('trims whitespace', () => {
    const url = normalizeApiUrl('  https://api.example.com  ');
    
    expect(url).toBe('https://api.example.com');
  });

  it('handles http and https', () => {
    expect(normalizeApiUrl('http://api.example.com')).toBe('http://api.example.com');
    expect(normalizeApiUrl('https://api.example.com')).toBe('https://api.example.com');
  });
});
