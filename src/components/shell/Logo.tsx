import Link from "next/link";

/** The Pro Play Turf wordmark lockup: PPT turf-blade mark + "Pro Play Turf". */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="logo" aria-label="Pro Play Turf — home">
      <span className="mark" aria-hidden="true" />
      Pro Play <b>Turf</b>
    </Link>
  );
}
