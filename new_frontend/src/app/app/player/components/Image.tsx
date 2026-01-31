'use client';
import { useState, useEffect } from "react";
import * as Img from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
export default function Image ({
  src,
  alt,
  className = "",
  width,
  height
}: {
    src: string;
    alt: string;
    className?: string;
    width?: number;
    height?: number;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative w-[${width}px] h-[${height}px] z-0`}>
    <Img.default
        src={src}
        alt={alt}
        unoptimized
        width={width}
        height={height}
        className={`object-cover transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        } ${className}`}
        onLoad={() => setLoaded(true)}
      />
    { loaded ? null : 
      (
        <Skeleton className={`absolute top-0 size-15`} />
      )
    }
    </div>
  );
}