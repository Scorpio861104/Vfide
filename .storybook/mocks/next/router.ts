export type NextRouter = {
  pathname: string;
  query: Record<string, string | string[]>;
  asPath: string;
  push: (url: string) => Promise<boolean>;
  replace: (url: string) => Promise<boolean>;
  reload: () => void;
  back: () => void;
  prefetch: (url: string) => Promise<void>;
};

export function useRouter(): NextRouter {
  return {
    pathname: "/",
    query: {},
    asPath: "/",
    push: async () => true,
    replace: async () => true,
    reload: () => undefined,
    back: () => undefined,
    prefetch: async () => undefined,
  };
}
