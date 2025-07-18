import React from "react";

const ViperLogo: React.FC<{ width?: number; height?: number }> = ({ width = 64, height = 64 }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >

    <polyline
      points="8,8 32,56 56,8"
      stroke="#222"
      strokeWidth="8"
      strokeLinejoin="round"
      fill="none"
    />
    <rect
      x="38"
      y="28"
      width="10"
      height="16"
      rx="3"
      transform="rotate(-25 38 28)"
      fill="#22c55e"
      opacity="0.85"
    />
  </svg>
);

export default ViperLogo; 