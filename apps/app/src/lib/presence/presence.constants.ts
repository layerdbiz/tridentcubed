// How long someone's dot stays green, then orange, after the server last saw them in the app (#185, #226). The
// server reads the first too: back after longer than that, someone has come online again (`stampSeen`).
export const ONLINE_MINUTES = 5;
export const IDLE_MINUTES = 60;

// The cookie the app keeps its hint about its own device in, which the server reads as it stamps someone as seen
// (#331, `toDeviceHint`).
export const DEVICE_COOKIE = 'device-hint';
