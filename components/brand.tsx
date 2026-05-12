import Image from "next/image";
import Link from "next/link";

export function Brand() {
  return (
    <Link className="brand-mark" href="/dashboard">
      <div className="brand-logo-wrap">
        <Image
          src="/sauti_logo.png"
          alt="Sauti Business Community"
          width={44}
          height={44}
        />
      </div>
      <div>
        <span className="brand-kicker">SBC Modern Core</span>
        <strong>Sauti Business Community</strong>
      </div>
    </Link>
  );
}