import React, { useEffect, useState } from "react";
import type { MemberDashboardData } from "./member-overview-data";
import { buildMembershipCardSvg, prepareCardImages, CARD_WIDTH, CARD_HEIGHT, type CardImages } from "./download-membership-card";

// Shows the exact same drawing that "Download membership card" saves as a PNG.
export function MemberDigitalCard({ data, onOpen }: { data: MemberDashboardData; onOpen?: () => void }) {
  const [images, setImages] = useState<CardImages>({ qr: null, photo: null });

  useEffect(() => {
    let cancelled = false;
    prepareCardImages(data).then((ready) => { if (!cancelled) setImages(ready); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [data.member.membershipNo, data.member.photoUrl]);

  return (
    <section
      aria-labelledby="digital-membership-card-title"
      className="relative w-full self-start overflow-hidden rounded-[4%/6.3%] shadow-[0_30px_60px_-24px_rgba(2,6,23,0.65)]"
      style={{ aspectRatio: `${CARD_WIDTH} / ${CARD_HEIGHT}` }}
    >
      <h2 id="digital-membership-card-title" className="sr-only">Membership card for {data.member.fullName}</h2>
      {/* All member text in the drawing is escaped by buildMembershipCardSvg. */}
      <div className="h-full w-full [&>svg]:block [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: buildMembershipCardSvg(data, images) }} />
      {onOpen && (
        <button type="button" onClick={onOpen} aria-label="Open your card in 3D" className="absolute inset-0 cursor-pointer rounded-[inherit] transition hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-400/60" />
      )}
    </section>
  );
}
