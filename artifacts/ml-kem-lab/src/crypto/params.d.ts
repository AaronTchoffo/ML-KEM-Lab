export interface ParameterSet {
  name: string;
  k: number;
  du: number;
  dv: number;
  ek: number;
  dk: number;
  c: number;
  K: number;
  nist: number;
}
export const PARAMS: Record<string, ParameterSet>;
export const PARAM_KEYS: string[];
export const STEPS: string[];
