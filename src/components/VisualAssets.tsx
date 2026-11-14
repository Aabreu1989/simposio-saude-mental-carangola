import React from 'react';

/**
 * High-tech Bio-Neural Mind & Sprout SVG
 * Faithfully recreating the graphic silhouette from the official poster:
 * - Human profile outline in deep petrol navy (#0a3641)
 * - Warm orange neural lobe (#ea7a38)
 * - Vibrant teal neural lobe (#028090)
 * - Budding green plant sprout (#80b996 / #2a9d8f)
 */
export const BrainMindIllustration: React.FC<{ className?: string; interactive?: boolean }> = ({
  className = 'w-64 h-64',
  interactive = false
}) => {
  return (
    <div className={`relative ${className} select-none`}>
      <svg
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-lg"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="orangeLobeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f39237" />
            <stop offset="100%" stopColor="#d96522" />
          </linearGradient>

          <linearGradient id="tealLobeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00a896" />
            <stop offset="100%" stopColor="#028090" />
          </linearGradient>

          <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a3d9b8" />
            <stop offset="100%" stopColor="#2a9d8f" />
          </linearGradient>

          <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient background soft glow */}
        <circle cx="210" cy="180" r="140" fill="#ea7a38" opacity="0.08" filter="url(#subtleGlow)" />
        <circle cx="270" cy="170" r="130" fill="#028090" opacity="0.08" filter="url(#subtleGlow)" />

        {/* Orange Brain Lobe (Poster Left Lobe) */}
        <path
          d="M 190 200 C 160 200 140 175 140 145 C 140 115 165 95 195 95 C 205 95 215 98 225 105 C 235 85 258 75 280 85 C 285 87 290 90 295 94 C 290 120 280 150 250 175 C 235 190 215 200 190 200 Z"
          fill="url(#orangeLobeGrad)"
          opacity="0.95"
        />

        {/* Teal Brain Lobe (Poster Right Lobe) */}
        <path
          d="M 260 210 C 240 195 240 170 255 145 C 270 120 295 105 320 115 C 340 125 348 145 345 168 C 360 175 368 192 362 210 C 355 228 338 238 318 235 C 310 248 290 255 272 250 C 255 245 248 230 252 215 C 255 213 257 211 260 210 Z"
          fill="url(#tealLobeGrad)"
          opacity="0.95"
        />

        {/* Sprouting Green Plant & Leaves in the Center */}
        {/* Stem */}
        <path
          d="M 285 280 Q 280 230 275 190 Q 272 165 270 140"
          stroke="#0a3641"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />

        {/* Left Leaf */}
        <path
          d="M 275 210 C 245 205 230 180 235 160 C 255 160 270 185 275 210 Z"
          fill="url(#leafGrad)"
          stroke="#0a3641"
          strokeWidth="2.5"
        />

        {/* Right Leaf */}
        <path
          d="M 273 175 C 275 140 298 125 315 132 C 315 155 295 170 273 175 Z"
          fill="url(#leafGrad)"
          stroke="#0a3641"
          strokeWidth="2.5"
        />

        {/* Human Profile Silhouette Outline (Poster Blue-Petrol Line) */}
        <path
          d="M 200 330 C 230 330 260 325 285 310 C 305 300 320 285 330 265 C 340 245 345 220 348 190 C 350 170 355 165 365 160 C 372 156 376 150 375 142 C 373 135 365 130 358 128 C 352 126 350 120 352 112 C 355 102 348 90 335 85 C 322 80 305 82 295 90 C 285 70 260 55 230 55 C 190 55 155 80 145 120 C 138 150 142 185 160 215 C 175 240 195 260 205 285 C 212 300 210 320 200 330"
          stroke="#0a3641"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* High-Tech Neural Synapse Points */}
        <circle cx="215" cy="130" r="3.5" fill="#ea7a38" />
        <circle cx="310" cy="180" r="3.5" fill="#028090" />
        <circle cx="270" cy="140" r="3.5" fill="#2a9d8f" />

        {/* Tech Connection Line */}
        <path
          d="M 215 130 Q 250 150 270 140 T 310 180"
          stroke="rgba(255, 255, 255, 0.6)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          fill="none"
        />
      </svg>
    </div>
  );
};

/**
 * Detailed Carangola Historic Church & Landscape Illustration
 * Faithfully capturing the watercolor church, trees, and mountain hills from the symposium flyer.
 */
export const CarangolaFlyerChurch: React.FC<{ className?: string }> = ({
  className = 'w-64 h-32'
}) => {
  return (
    <div className={`relative ${className} select-none pointer-events-none`}>
      <svg
        viewBox="0 0 500 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="hillGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#489d89" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#2a6f68" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="hillGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#028090" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0a3641" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="treeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2a9d8f" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#0a4b52" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Rolling Background Hills */}
        <path
          d="M 0 170 Q 120 70 260 120 T 500 90 L 500 220 L 0 220 Z"
          fill="url(#hillGrad1)"
        />
        <path
          d="M 50 180 Q 200 110 340 140 T 500 125 L 500 220 L 50 220 Z"
          fill="url(#hillGrad2)"
        />

        {/* Traditional Colonial Town Houses (Left of Church) */}
        <g stroke="#0a3641" strokeWidth="2.2" strokeLinejoin="round" fill="#ffffff">
          {/* House 1 */}
          <rect x="90" y="160" width="55" height="35" rx="1" fill="#ffffff" />
          <polygon points="85,160 117,142 150,160" fill="#faf8f5" />
          {/* Windows & Door */}
          <rect x="100" y="168" width="8" height="10" fill="#028090" opacity="0.8" />
          <rect x="114" y="168" width="8" height="10" fill="#028090" opacity="0.8" />
          <rect x="128" y="168" width="8" height="10" fill="#028090" opacity="0.8" />
          <rect x="112" y="183" width="9" height="12" fill="#0a3641" />

          {/* House 2 */}
          <rect x="150" y="152" width="60" height="43" rx="1" fill="#ffffff" />
          <polygon points="146,152 180,135 214,152" fill="#faf8f5" />
          <rect x="160" y="160" width="8" height="10" fill="#028090" opacity="0.8" />
          <rect x="174" y="160" width="8" height="10" fill="#028090" opacity="0.8" />
          <rect x="188" y="160" width="8" height="10" fill="#028090" opacity="0.8" />
        </g>

        {/* Watercolor Foliage / Trees */}
        <g fill="url(#treeGrad)">
          {/* Trees cluster near church */}
          <circle cx="270" cy="172" r="16" />
          <circle cx="288" cy="165" r="22" />
          <circle cx="310" cy="170" r="18" />
          <circle cx="330" cy="175" r="14" />
          <circle cx="48" cy="180" r="16" />
          <circle cx="70" cy="176" r="18" />
        </g>
        {/* Tree Trunks */}
        <path d="M 288 185 L 288 198 M 310 186 L 310 198 M 70 190 L 70 198" stroke="#0a3641" strokeWidth="2.5" strokeLinecap="round" />

        {/* Historic Igreja Matriz de Carangola */}
        <g stroke="#0a3641" strokeWidth="2.5" strokeLinejoin="round" fill="#ffffff">
          {/* Main Church Body */}
          <rect x="350" y="140" width="115" height="58" rx="1" fill="#ffffff" />
          
          {/* Main Nave Roof */}
          <polygon points="345,140 407,112 470,140" fill="#fcfbf9" />

          {/* Church Side Arched Windows */}
          <path d="M 420 162 C 420 156 426 152 430 152 C 434 152 440 156 440 162 L 440 178 L 420 178 Z" fill="#028090" opacity="0.85" />
          <path d="M 445 162 C 445 156 451 152 455 152 C 459 152 465 156 465 162 L 465 178 L 445 178 Z" fill="#028090" opacity="0.85" />

          {/* Bell Tower (Torre Central com Sineiro) */}
          <rect x="372" y="75" width="46" height="65" fill="#ffffff" />
          
          {/* Tower Belfry Arched Opening */}
          <path d="M 386 110 C 386 98 404 98 404 110 L 404 125 L 386 125 Z" fill="#0a3641" />
          {/* Tower Bell */}
          <circle cx="395" cy="112" r="3.5" fill="#ea7a38" />

          {/* Clock / Rose Window */}
          <circle cx="395" cy="88" r="5.5" fill="#ffffff" stroke="#0a3641" strokeWidth="2" />
          <circle cx="395" cy="88" r="1.5" fill="#0a3641" />

          {/* Steeple Pyramid Roof */}
          <polygon points="368,75 395,35 422,75" fill="#028090" opacity="0.9" />

          {/* Cross on Top */}
          <line x1="395" y1="20" x2="395" y2="35" stroke="#0a3641" strokeWidth="3" strokeLinecap="round" />
          <line x1="389" y1="26" x2="401" y2="26" stroke="#0a3641" strokeWidth="3" strokeLinecap="round" />

          {/* Church Main Entrance Portal */}
          <path d="M 364 198 L 364 165 C 364 156 386 156 386 165 L 386 198 Z" fill="#0a3641" />
          {/* Steps */}
          <line x1="358" y1="198" x2="392" y2="198" stroke="#0a3641" strokeWidth="3" />
        </g>
      </svg>
    </div>
  );
};

/**
 * Sinuous 3-Layer Bio-Tech Waves with Carangola Historic Silhouette
 * Recreating the exact bottom ribbon of the poster:
 * - Layer 1: Warm terracotta-orange (#ea7a38)
 * - Layer 2: Vibrant cyan-teal (#028090)
 * - Layer 3: Deep petrol marine (#0a3641)
 * - Town skyline with church tower & mountains
 */
export const CarangolaWavesRibbon: React.FC<{ className?: string; withSkyline?: boolean }> = ({
  className = 'w-full h-28',
  withSkyline = true
}) => {
  return (
    <div className={`relative overflow-hidden w-full ${className}`}>
      {withSkyline && (
        <div className="absolute right-4 sm:right-16 bottom-12 sm:bottom-14 w-64 sm:w-96 z-0 opacity-70">
          <CarangolaFlyerChurch className="w-full h-24 sm:h-32" />
        </div>
      )}

      <svg
        viewBox="0 0 1440 220"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10"
      >
        {/* Layer 1: Orange Wave */}
        <path
          d="M 0 130 C 280 80 480 180 800 130 C 1120 80 1300 140 1440 110 L 1440 220 L 0 220 Z"
          fill="#ea7a38"
          opacity="0.95"
        />

        {/* Layer 2: Vibrant Teal Wave */}
        <path
          d="M 0 150 C 320 100 520 200 860 145 C 1180 90 1340 170 1440 135 L 1440 220 L 0 220 Z"
          fill="#028090"
          opacity="0.95"
        />

        {/* Layer 3: Deep Petrol Navy Base Wave */}
        <path
          d="M 0 170 C 360 135 600 215 940 165 C 1220 120 1380 180 1440 160 L 1440 220 L 0 220 Z"
          fill="#0a3641"
        />
      </svg>
    </div>
  );
};

