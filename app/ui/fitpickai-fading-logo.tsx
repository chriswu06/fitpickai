"use client";

import { motion } from "motion/react";
import FitPickAILogo from "./fitpickai-logo";

export default function FadingLogo() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="flex items-center justify-center"
    >
      <FitPickAILogo variant="hero" />
    </motion.div>
  );
}
