// Sends a text via Fast2SMS's Quick SMS route. Never throws — a failed/unsent
// SMS should never break the caller (same philosophy as utils/activityLog.js).
async function sendSms(phone, message) {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) {
    console.log('FAST2SMS_API_KEY not set — skipping SMS send. Would have sent:', phone, message);
    return;
  }
  if (!phone) {
    console.log('sendSms: no phone number given — skipping. Message was:', message);
    return;
  }

  try {
    const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'q',
        message,
        language: 'english',
        flash: 0,
        numbers: phone,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.return === false) {
      console.error('Fast2SMS send failed:', res.status, JSON.stringify(body));
    }
  } catch (err) {
    console.error('Fast2SMS send error:', err.message);
  }
}

module.exports = { sendSms };
