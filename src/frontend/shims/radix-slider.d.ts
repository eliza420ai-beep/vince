declare module "@radix-ui/react-slider" {
  import * as React from "react";
  export const Root: React.ComponentType<
    React.HTMLAttributes<HTMLSpanElement> & {
      value?: number[];
      defaultValue?: number[];
      min?: number;
      max?: number;
      step?: number;
      onValueChange?: (value: number[]) => void;
    }
  >;
  export const Track: React.ComponentType<React.HTMLAttributes<HTMLSpanElement>>;
  export const Range: React.ComponentType<React.HTMLAttributes<HTMLSpanElement>>;
  export const Thumb: React.ComponentType<React.HTMLAttributes<HTMLSpanElement>>;
}
