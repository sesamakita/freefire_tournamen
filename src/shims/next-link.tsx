// src/shims/next-link.tsx
import { Link as RRLink, type LinkProps as RRLinkProps } from "react-router";
import React from "react";

export interface LinkProps extends Omit<RRLinkProps, "to"> {
  href: string;
  children?: React.ReactNode;
  className?: string;
  target?: string;
  rel?: string;
}

export default function Link({ href, children, ...props }: LinkProps) {
  return (
    <RRLink to={href} {...(props as any)}>
      {children}
    </RRLink>
  );
}
