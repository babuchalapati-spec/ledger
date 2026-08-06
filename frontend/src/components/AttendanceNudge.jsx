import { useEffect, useRef, useState } from 'react';
import { getSettings, getTodayAttendance } from '../api/client';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // check every 5 minutes while the app is open
const NUDGE_THROTTLE_MS = 10 * 60 * 1000; // don't nudge more than once per 10 minutes

// Haversine distance in meters between two lat/lng points.
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function AttendanceNudge({ onOpenAttendance }) {
  const [banner, setBanner] = useState(null);
  const lastNudgeAtRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!navigator.geolocation) return;
      try {
        const [settings, today] = await Promise.all([getSettings(), getTodayAttendance()]);
        if (cancelled) return;
        if (today.checkedIn) return;
        if (settings.premisesLat == null || settings.premisesLng == null) return;

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (cancelled) return;
            const dist = distanceMeters(
              pos.coords.latitude, pos.coords.longitude,
              settings.premisesLat, settings.premisesLng
            );
            const radius = settings.premisesRadiusMeters || 200;
            if (dist <= radius) {
              const now = Date.now();
              if (now - lastNudgeAtRef.current < NUDGE_THROTTLE_MS) return;
              lastNudgeAtRef.current = now;
              navigator.vibrate?.([200, 100, 200]);
              setBanner(settings.businessName || 'your shop');
            }
          },
          () => {},
          { enableHighAccuracy: false, timeout: 8000 }
        );
      } catch {
        // best-effort only
      }
    };

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', check);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);

  if (!banner) return null;

  return (
    <div className="attendance-nudge-banner">
      <span>📍 You're at {banner} — don't forget to mark attendance.</span>
      <button
        className="btn-secondary"
        onClick={() => { setBanner(null); onOpenAttendance?.(); }}
      >
        Mark Now
      </button>
      <button className="btn-link" onClick={() => setBanner(null)}>Dismiss</button>
    </div>
  );
}
