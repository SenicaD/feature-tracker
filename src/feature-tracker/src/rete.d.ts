// Type augmentation for rete - fixes module resolution issue with TS 5.9
declare module "rete" {
  export * from "rete/_types/editor";
  export * as ClassicPreset from "rete/_types/presets/classic";
  export type {
    CanAssignSignal,
    NestedScope,
    Pipe,
    ScopeAsParameter,
  } from "rete/_types/scope";
  export { Scope, Signal } from "rete/_types/scope";
  export * from "rete/_types/types";
  export * from "rete/_types/utils";
}
