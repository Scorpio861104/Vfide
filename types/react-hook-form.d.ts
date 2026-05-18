declare module 'react-hook-form' {
  export interface FieldError {
    type: string;
    message?: string;
  }

  export type FieldValues = Record<string, unknown>;

  export type Path<_T extends FieldValues> = string;

  export type UseFormRegister<T extends FieldValues> = (
    name: Path<T>
  ) => {
    onChange: (event: unknown) => void;
    onBlur: (event: unknown) => void;
    ref: (instance: unknown) => void;
    name: string;
  };

  export type UseFormWatch<T extends FieldValues> = (name?: Path<T>) => unknown;

  export function useFormContext<T extends FieldValues>(): {
    register: UseFormRegister<T>;
    watch: UseFormWatch<T>;
    formState: {
      errors: Partial<Record<Path<T>, FieldError>>;
    };
  };
}
