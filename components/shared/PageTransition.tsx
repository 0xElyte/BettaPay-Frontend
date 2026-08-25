"use client";

import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  return (
    // mode="sync" lets the incoming page mount immediately without waiting for
    // the previous page's exit — prevents layout-hold during fast navigation.
    // There is no exit animation: the nav active-state change is the only
    // visible indicator of navigation, keeping motion to one layer.
    <AnimatePresence mode="sync">
      <motion.div
        key={pathname}
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 1 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.15, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
