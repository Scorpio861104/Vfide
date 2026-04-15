import { safeLocalStorageParse } from '../../lib/safeParse';

describe('safeParse storage safety', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the fallback when localStorage access throws', () => {
    jest.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });

    expect(safeLocalStorageParse('vfide:test', { ok: false })).toEqual({ ok: false });
  });

  it('returns the fallback when stored JSON is malformed', () => {
    jest.spyOn(window.localStorage.__proto__, 'getItem').mockReturnValue('{bad json');

    expect(safeLocalStorageParse('vfide:test', ['fallback'])).toEqual(['fallback']);
  });

  it('returns parsed data when storage contains valid JSON', () => {
    jest.spyOn(window.localStorage.__proto__, 'getItem').mockReturnValue('{"ok":true}');

    expect(safeLocalStorageParse('vfide:test', { ok: false })).toEqual({ ok: true });
  });
});