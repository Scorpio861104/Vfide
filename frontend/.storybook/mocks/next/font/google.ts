export type NextFont = {
  className: string;
  style?: Record<string, string>;
  variable?: string;
};

type FontOptions = Record<string, unknown>;

function makeFont(_options: FontOptions = {}): NextFont {
  return { className: "" };
}

export function Inter(options: FontOptions = {}): NextFont {
  return makeFont(options);
}

export function Space_Grotesk(options: FontOptions = {}): NextFont {
  return makeFont(options);
}
