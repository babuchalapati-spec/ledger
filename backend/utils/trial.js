const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000; // 1 day

function isTrialExpired(account) {
  return account.status === 'trial' && account.trialEndsAt && Date.now() > new Date(account.trialEndsAt).getTime();
}

module.exports = { TRIAL_DURATION_MS, isTrialExpired };
