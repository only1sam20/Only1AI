import Link from 'next/link';
import Image from 'next/image';

export function Brand() {
  return <Link className="brand" href="/" aria-label="Only1AI home">
    <Image
      className="brand-mark"
      src="/brand/only1ai-logo.jpg"
      alt="Only1AI logo"
      width={42}
      height={42}
      sizes="34px"
    />
    <span className="brand-wordmark">ONLY1AI</span>
  </Link>;
}
