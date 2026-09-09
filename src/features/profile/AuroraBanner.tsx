/**
 * The default banner, for anyone who has not put a picture there.
 *
 * Three soft lights drifting behind a grain of film, all painted in the active
 * season's own tokens — so it is emerald under Lantern and red under
 * Web-Slinger without anything here knowing which season is on. It replaced a
 * flat slab of grey that made an empty profile look unfinished.
 *
 * Pure CSS on purpose: this sits at the top of a page people open constantly,
 * and a requestAnimationFrame loop for background decoration is a battery bill.
 */
export default function AuroraBanner() {
  return (
    <div className="aurora absolute inset-0 z-0" aria-hidden="true">
      <span className="aurora-blob aurora-a" />
      <span className="aurora-blob aurora-b" />
      <span className="aurora-blob aurora-c" />
      <span className="aurora-beam" />
      <span className="aurora-grain" />
    </div>
  )
}
