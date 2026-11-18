// How long someone's dot stays green, then orange, after the server last saw them in the app (#185, #226). The
// server reads the first too: back after longer than that, someone has come online again (`stampSeen`).
export const ONLINE_MINUTES = 5;
export const IDLE_MINUTES = 60;
