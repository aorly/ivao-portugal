import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function PublicLayout({ children }: Props) {
  return <div className="mx-auto w-full max-w-6xl">{children}</div>;
}