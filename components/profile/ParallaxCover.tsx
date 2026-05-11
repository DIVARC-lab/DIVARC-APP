"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

/* ParallaxCover — cover photo/gradient qui scroll plus lentement que le
 * contenu, créant un effet parallaxe subtil et premium.
 *
 * Le translateY est calculé en fonction du scroll vertical relatif au
 * conteneur. À 0px scroll : translate(0). À 200px scroll : translate(-50px). */

type Props = {
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export function ParallaxCover({ children, style }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  /* Translate cover de 0 à -60px sur les premiers 300px de scroll. */
  const y = useTransform(scrollY, [0, 300], [0, -60]);

  return (
    <motion.div
      ref={ref}
      style={{ ...style, y }}
      className="relative w-full aspect-[16/9] sm:aspect-[3/1] lg:aspect-[4/1] overflow-hidden bg-night/5"
    >
      {children}
    </motion.div>
  );
}
