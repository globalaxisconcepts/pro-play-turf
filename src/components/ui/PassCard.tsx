export type PassTier = "champions" | "elite" | "advanced" | "intermediate";
export type PassStatus = "owned" | "listed" | "reserved";

const STATUS_LABEL: Record<PassStatus, string> = {
  owned: "Owned",
  listed: "Listed",
  reserved: "Reserved",
};
const STATUS_CLASS: Record<PassStatus, string> = {
  owned: "st-owned",
  listed: "st-listed",
  reserved: "st-reserved",
};

export interface PassCardProps {
  tier: PassTier;
  /** Large tier word, e.g. "Champions", "Elite", "Interm." */
  tierWord: string;
  /** Qualifier line, e.g. "League Pass", "Premier", "Regional". */
  qualifier: string;
  /** Descriptive name line, e.g. "Champions League Pass". */
  name: string;
  /** Gold face value, e.g. "$150.00". */
  faceValue: string;
  /** Mint-style serial/hex code. */
  serial: string;
  status?: PassStatus;
  className?: string;
}

/**
 * The signature "Official Pass" collectible card. Used on Home, Champions,
 * Store, Dashboard and Profile. Tier drives the surface + accent treatment.
 */
export function PassCard({
  tier,
  tierWord,
  qualifier,
  name,
  faceValue,
  serial,
  status,
  className,
}: PassCardProps) {
  return (
    <div className={`pass ${tier}${className ? ` ${className}` : ""}`}>
      <div className="glow" aria-hidden="true" />
      <div className="phead">
        <span>Official Pass</span>
        <span className="issuer">Pro Play Turf</span>
      </div>
      {status && (
        <span
          className={`status ${STATUS_CLASS[status]}`}
          style={{ position: "absolute", top: 20, right: 20, zIndex: 3 }}
        >
          {STATUS_LABEL[status]}
        </span>
      )}
      <div className="access">Access Level</div>
      <div className="tier">
        <div className="t1">{tierWord}</div>
        <div className="t2">{qualifier}</div>
      </div>
      <div className="pname">{name}</div>
      <div className="pfoot">
        <div className="fv">Face Value</div>
        <div className="amt">{faceValue}</div>
        <div className="serial">SERIAL · {serial}</div>
      </div>
    </div>
  );
}
