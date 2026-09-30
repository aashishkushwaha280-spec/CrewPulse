import React from 'react';
import { Activity } from 'lucide-react';

export default function CrewPulseLogo() {
  return (
    <div className="crewpulse-brand" aria-label="CrewPulse">
      <span className="crewpulse-brand-mark" aria-hidden="true">
        <Activity size={22} strokeWidth={2.5} />
      </span>
      <span className="crewpulse-brand-copy">
        <span className="crewpulse-wordmark"><span>Crew</span><strong>Pulse</strong></span>
        <span className="crewpulse-tagline">EVENT STAFFING &amp; ESCROW PAYOUTS</span>
      </span>
    </div>
  );
}
