const Account = require('../models/Account');
const PlatformUser = require('../models/PlatformUser');
const { getTenantConnection } = require('../db/tenantConnections');
const getSettingsModel = require('../models/tenant/Settings');
const getAttendanceModel = require('../models/tenant/Attendance');
const { sendSms } = require('../utils/sms');
const { todayIST, currentTimeIST } = require('../utils/istTime');

// Checks every active tenant once a day, after its owner-configured cutoff time,
// and texts the owner naming any staff who haven't marked attendance yet.
// Safe to call repeatedly (e.g. every 15 min from a cron tick) — each tenant is
// only ever processed once per day, guarded by Settings.lastAbsenceCheckDate.
async function runAbsenceCheck() {
  const today = todayIST();
  const nowTime = currentTimeIST();

  const accounts = await Account.find({ status: { $in: ['trial', 'active'] } }).lean();

  for (const account of accounts) {
    try {
      const conn = getTenantConnection(account.dbName);
      const Settings = getSettingsModel(conn);
      const settings = await Settings.findOne();
      if (!settings) continue;

      if (!settings.attendanceCutoffTime || !settings.phone) continue;
      if (settings.lastAbsenceCheckDate === today) continue;
      if (nowTime < settings.attendanceCutoffTime) continue;

      const staff = await PlatformUser.find({ account: account._id, role: 'staff' }).select('email phone').lean();
      if (staff.length > 0) {
        const Attendance = getAttendanceModel(conn);
        const checkedInToday = await Attendance.find({ date: today, userEmail: { $in: staff.map((s) => s.email) } }).select('userEmail').lean();
        const checkedInEmails = new Set(checkedInToday.map((a) => a.userEmail));
        const absentees = staff.filter((s) => !checkedInEmails.has(s.email));

        if (absentees.length > 0) {
          const businessName = settings.businessName || 'your business';
          const ownerMessage = `${absentees.map((a) => a.email).join(', ')} not marked attendance today (${today}) at ${businessName}.`;
          await sendSms(settings.phone, ownerMessage);

          for (const absentee of absentees) {
            if (!absentee.phone) continue;
            const staffMessage = `You have been marked ABSENT today (${today}) at ${businessName}.`;
            await sendSms(absentee.phone, staffMessage);
          }
        }
      }

      settings.lastAbsenceCheckDate = today;
      await settings.save();
    } catch (err) {
      console.error(`Absence check failed for account ${account._id}:`, err.message);
    }
  }
}

module.exports = { runAbsenceCheck };
