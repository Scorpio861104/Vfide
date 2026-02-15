import * as React from "react";

export type ImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  fill?: boolean;
  priority?: boolean;
  quality?: number;
};

export default function Image({ src, alt, ...rest }: ImageProps) {
  // Storybook-only lightweight replacement for next/image.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} {...rest} />;
}
