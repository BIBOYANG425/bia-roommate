import type { SVGProps } from "react";

type IllustrationProps = SVGProps<SVGSVGElement>;

/** Elegant arch bridge — hero section decoration */
export function BridgeIllustration(props: IllustrationProps) {
  return (
    <svg
      width="300"
      height="100"
      viewBox="0 0 300 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Left pillar */}
      <line
        x1="40"
        y1="30"
        x2="40"
        y2="95"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Right pillar */}
      <line
        x1="260"
        y1="30"
        x2="260"
        y2="95"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Main arch */}
      <path
        d="M40 70 Q150 5 260 70"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Inner arch (thinner, decorative) */}
      <path
        d="M55 75 Q150 20 245 75"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
      {/* Road line */}
      <line
        x1="20"
        y1="95"
        x2="280"
        y2="95"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Left base detail */}
      <line
        x1="30"
        y1="95"
        x2="50"
        y2="95"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Right base detail */}
      <line
        x1="250"
        y1="95"
        x2="270"
        y2="95"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Vertical support lines */}
      <line
        x1="100"
        y1="45"
        x2="100"
        y2="95"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.35"
      />
      <line
        x1="150"
        y1="22"
        x2="150"
        y2="95"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.35"
      />
      <line
        x1="200"
        y1="45"
        x2="200"
        y2="95"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.35"
      />
    </svg>
  );
}

/** Small geometric node — tech/innovation pillar */
export function CircuitNode(props: IllustrationProps) {
  return (
    <svg
      width="60"
      height="60"
      viewBox="0 0 60 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Central circle */}
      <circle
        cx="30"
        cy="30"
        r="6"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Top node */}
      <line
        x1="30"
        y1="24"
        x2="30"
        y2="8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle
        cx="30"
        cy="6"
        r="3"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Bottom-right node */}
      <line
        x1="35"
        y1="34"
        x2="48"
        y2="48"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle
        cx="50"
        cy="50"
        r="3"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Bottom-left node */}
      <line
        x1="25"
        y1="34"
        x2="12"
        y2="48"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle
        cx="10"
        cy="50"
        r="3"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Right node */}
      <line
        x1="36"
        y1="30"
        x2="50"
        y2="22"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle
        cx="52"
        cy="21"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}

/** Small compass rose — career direction pillar */
export function CompassRose(props: IllustrationProps) {
  return (
    <svg
      width="60"
      height="60"
      viewBox="0 0 60 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Outer circle */}
      <circle
        cx="30"
        cy="30"
        r="24"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Inner circle */}
      <circle
        cx="30"
        cy="30"
        r="4"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      {/* N line */}
      <line
        x1="30"
        y1="26"
        x2="30"
        y2="8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* S line */}
      <line
        x1="30"
        y1="34"
        x2="30"
        y2="52"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* E line */}
      <line
        x1="34"
        y1="30"
        x2="52"
        y2="30"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* W line */}
      <line
        x1="26"
        y1="30"
        x2="8"
        y2="30"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* North diamond pointer */}
      <path
        d="M30 8 L27 16 L30 14 L33 16 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Diagonal tick marks */}
      <line
        x1="43"
        y1="17"
        x2="46"
        y2="14"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.5"
      />
      <line
        x1="17"
        y1="17"
        x2="14"
        y2="14"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.5"
      />
      <line
        x1="43"
        y1="43"
        x2="46"
        y2="46"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.5"
      />
      <line
        x1="17"
        y1="43"
        x2="14"
        y2="46"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}

/** Two hands reaching — cultural exchange pillar */
export function CulturalBridge(props: IllustrationProps) {
  return (
    <svg
      width="60"
      height="60"
      viewBox="0 0 60 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Left hand — reaching from left */}
      <path
        d="M4 32 Q8 30 14 28 Q18 26 22 27 L26 28"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Left index finger */}
      <path
        d="M26 28 L29 27"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Left other fingers */}
      <path
        d="M24 29 L27 30"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M23 31 L26 32"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Right hand — reaching from right */}
      <path
        d="M56 32 Q52 30 46 28 Q42 26 38 27 L34 28"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Right index finger */}
      <path
        d="M34 28 L31 27"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Right other fingers */}
      <path
        d="M36 29 L33 30"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M37 31 L34 32"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Small spark/connection between fingers */}
      <circle
        cx="30"
        cy="27"
        r="1"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
        opacity="0.6"
      />
    </svg>
  );
}

/** Horizontal Chinese cloud/wave divider */
export function CloudDivider(props: IllustrationProps) {
  return (
    <svg
      width="100%"
      height="40"
      viewBox="0 0 800 40"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M0 20 Q25 8 50 20 Q75 32 100 20 Q125 8 150 20 Q175 32 200 20 Q225 8 250 20 Q275 32 300 20 Q325 8 350 20 Q375 32 400 20 Q425 8 450 20 Q475 32 500 20 Q525 8 550 20 Q575 32 600 20 Q625 8 650 20 Q675 32 700 20 Q725 8 750 20 Q775 32 800 20"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
      />
      {/* Secondary wave slightly offset */}
      <path
        d="M0 22 Q30 12 60 22 Q90 32 120 22 Q150 12 180 22 Q210 32 240 22 Q270 12 300 22 Q330 32 360 22 Q390 12 420 22 Q450 32 480 22 Q510 12 540 22 Q570 32 600 22 Q630 12 660 22 Q690 32 720 22 Q750 12 780 22"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.4"
      />
    </svg>
  );
}

/* ─── Service Icons (~24px line art) ─── */

/** Simple house outline */
export function IconHome(props: IllustrationProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M3 10.5L12 3L21 10.5V20C21 20.55 20.55 21 20 21H4C3.45 21 3 20.55 3 20V10.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M9 21V13H15V21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** Key outline */
export function IconKey(props: IllustrationProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle
        cx="8"
        cy="15"
        r="5"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M12 11L20 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M17 3L20 3L20 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M16 8L18 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Two people outline */
export function IconUsers(props: IllustrationProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle
        cx="9"
        cy="7"
        r="3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M2 20C2 16.5 5 14 9 14C13 14 16 16.5 16 20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle
        cx="17"
        cy="8"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M18 14C20.5 14.5 22 16.5 22 19"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/** Open book outline */
export function IconBook(props: IllustrationProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M2 4C4 3 7 2.5 12 5C17 2.5 20 3 22 4V19C20 18 17 17.5 12 20C7 17.5 4 18 2 19V4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line
        x1="12"
        y1="5"
        x2="12"
        y2="20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Star outline */
export function IconStar(props: IllustrationProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M12 2L14.9 8.6L22 9.3L16.8 14L18.2 21L12 17.5L5.8 21L7.2 14L2 9.3L9.1 8.6L12 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** Chat bubble outline */
export function IconChat(props: IllustrationProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M4 4H20C21.1 4 22 4.9 22 6V16C22 17.1 21.1 18 20 18H8L4 22V6C4 4.9 4.9 4 6 4H4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line
        x1="8"
        y1="9"
        x2="16"
        y2="9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
      <line
        x1="8"
        y1="13"
        x2="13"
        y2="13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}
