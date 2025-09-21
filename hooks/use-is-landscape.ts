import { useEffect, useState } from "react";

export const useIsLandscape = () => {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const updateOrientation = () => {
      if (typeof window !== "undefined") {
        const { innerWidth: w, innerHeight: h } = window;
        setIsLandscape(w / Math.max(1, h) > 1.2);
      }
    };

    updateOrientation();
    window.addEventListener("resize", updateOrientation);
    return () => window.removeEventListener("resize", updateOrientation);
  }, []);

  return isLandscape;
};
