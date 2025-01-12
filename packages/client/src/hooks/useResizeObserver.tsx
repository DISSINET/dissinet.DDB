import { useDebouncedCallback } from "hooks";
import { useLayoutEffect, useState, useRef, useCallback } from "react";

interface UseResizeObserverOptions {
  debounceDelay?: number;
}

interface Size {
  width: number | undefined;
  height: number | undefined;
}

export const useResizeObserver = <T extends HTMLElement>({
  debounceDelay = 0,
}: UseResizeObserverOptions = {}) => {
  const ref = useRef<T | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [size, setSize] = useState<Size>({
    width: undefined,
    height: undefined,
  });

  const debouncedCallback = useDebouncedCallback((newSize: Size) => {
    setSize((prevSize) => {
      if (
        prevSize.width === newSize.width &&
        prevSize.height === newSize.height
      ) {
        return prevSize; // No state update if size hasn't changed
      }
      return newSize;
    });
  }, debounceDelay);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      animationFrameRef.current = window.requestAnimationFrame(() => {
        if (!Array.isArray(entries) || entries.length === 0) {
          return;
        }

        const entry = entries[0];
        const { width, height } = entry.contentRect;

        debouncedCallback({
          width: Math.round(width),
          height: Math.round(height),
        });
      });
    });

    resizeObserver.observe(element);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [debouncedCallback]);

  return { ref, ...size };
};
