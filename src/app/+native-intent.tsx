// Links that open the app go through here before Expo Router matches them to a screen.
// Google sign-in comes back as …/auth-callback#access_token=…; the part after "#" stops
// it matching, so send it to the auth-callback screen, which reads the full link itself.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (path.includes('auth-callback')) return '/auth-callback';
    return path;
  } catch {
    return '/';
  }
}
