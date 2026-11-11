// src/shims/next-image.tsx
import React from "react";

export default function Image({
  src,
  alt = "",
  width,
  height,
  fill,
  priority,
  className,
  style,
  sizes,
  quality,
  placeholder,
  blurDataURL,
  ...props
}: any) {
  const imgSrc = typeof src === "string" ? src : src?.src || "";

  const fillStyle: React.CSSProperties = fill
    ? {
        position: "absolute",
        height: "100%",
        width: "100%",
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        ...style,
      }
    : style;

  return (
    <img
      src={imgSrc}
      alt={alt}
      width={!fill ? width : undefined}
      height={!fill ? height : undefined}
      className={className}
      style={fillStyle}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      {...props}
    />
  );
}
