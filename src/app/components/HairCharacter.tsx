import { motion } from "motion/react";

type MoodState = "feliz" | "sedenta" | "lavagem" | "cansada" | "perfeita";

interface HairCharacterProps {
  mood: MoodState;
}

export function HairCharacter({ mood }: HairCharacterProps) {
  const isTired = mood === "cansada";
  const isHappy = mood === "feliz" || mood === "perfeita";

  return (
    <svg viewBox="0 0 100 112" fill="none" className="w-full h-full">
      {/* Ground shadow */}
      <ellipse cx="50" cy="109" rx="21" ry="4" fill="#271711" opacity="0.1" />

      {/* Hair — dark underlay for depth */}
      <circle cx="50" cy="20" r="18" fill="#4A2410" />
      <circle cx="21" cy="33" r="15" fill="#4A2410" />
      <circle cx="79" cy="33" r="15" fill="#4A2410" />
      <circle cx="13" cy="52" r="12" fill="#4A2410" />
      <circle cx="87" cy="52" r="12" fill="#4A2410" />
      <circle cx="27" cy="63" r="10" fill="#4A2410" />
      <circle cx="73" cy="63" r="10" fill="#4A2410" />

      {/* Main hair color */}
      <circle cx="50" cy="43" r="32" fill="#7B4A2D" />
      <circle cx="50" cy="21" r="16" fill="#7B4A2D" />
      <circle cx="22" cy="34" r="13" fill="#7B4A2D" />
      <circle cx="78" cy="34" r="13" fill="#7B4A2D" />
      <circle cx="15" cy="51" r="10" fill="#7B4A2D" />
      <circle cx="85" cy="51" r="10" fill="#7B4A2D" />
      <circle cx="29" cy="62" r="8" fill="#7B4A2D" />
      <circle cx="71" cy="62" r="8" fill="#7B4A2D" />

      {/* Curl highlight texture */}
      <circle cx="34" cy="27" r="7" fill="#9B6040" opacity="0.55" />
      <circle cx="66" cy="21" r="5.5" fill="#9B6040" opacity="0.45" />
      <circle cx="81" cy="39" r="4.5" fill="#9B6040" opacity="0.4" />
      <circle cx="19" cy="46" r="4" fill="#9B6040" opacity="0.38" />
      <circle cx="50" cy="15" r="4" fill="#9B6040" opacity="0.35" />

      {/* Face */}
      <circle cx="50" cy="68" r="23" fill="#F5E6D3" />

      {/* Eyes */}
      {isTired ? (
        <>
          <path d="M38 65 Q42 61 46 65" stroke="#271711" strokeWidth="2.8" strokeLinecap="round" fill="none" />
          <path d="M54 65 Q58 61 62 65" stroke="#271711" strokeWidth="2.8" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx="42" cy="64" r="3.8" fill="#271711" />
          <circle cx="58" cy="64" r="3.8" fill="#271711" />
          <circle cx="43.6" cy="62.4" r="1.3" fill="white" />
          <circle cx="59.6" cy="62.4" r="1.3" fill="white" />
        </>
      )}

      {/* Mouth */}
      {isHappy ? (
        <path d="M41 74 Q50 82 59 74" stroke="#BC7A52" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      ) : isTired ? (
        <path d="M43 77 Q50 75 57 77" stroke="#BC7A52" strokeWidth="2" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M43 74 Q50 79 57 74" stroke="#BC7A52" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      )}

      {/* Blush cheeks (happy states) */}
      {isHappy && (
        <>
          <ellipse cx="35" cy="70" rx="5.5" ry="3" fill="#BC7A52" opacity="0.28" />
          <ellipse cx="65" cy="70" rx="5.5" ry="3" fill="#BC7A52" opacity="0.28" />
        </>
      )}
    </svg>
  );
}
