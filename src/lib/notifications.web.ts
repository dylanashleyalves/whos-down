// Push notifications are phone-only; on web these do nothing.
export function canUsePush() {
  return false;
}

export async function registerForPush() {
  return false;
}

export async function unregisterForPush() {}
