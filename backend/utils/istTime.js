const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Plain offset-only conversion (no DST, no timezone library) — fine since this
// app only ever operates in India.
function nowIST() {
  return new Date(Date.now() + IST_OFFSET_MS);
}

function todayIST() {
  return nowIST().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

function currentTimeIST() {
  return nowIST().toISOString().slice(11, 16); // 'HH:mm'
}

module.exports = { todayIST, currentTimeIST };
