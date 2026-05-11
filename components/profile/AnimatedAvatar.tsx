"use client";

import { motion } from "motion/react";
import { Avatar } from "@/components/ui/Avatar";

/* AnimatedAvatar — wrap l'Avatar avec un fade + scale-in à l'arrivée.
 * Donne une sensation de "qui pose" à l'arrivée sur le profil. */

type Props = {
  src: string | null;
  fullName: string;
  className?: string;
};

export function AnimatedAvatar({ src, fullName, className }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 220,
        damping: 22,
        delay: 0.1,
      }}
    >
      <Avatar
        src={src}
        fullName={fullName}
        size="xxl"
        className={className}
      />
    </motion.div>
  );
}
