// In-memory request counters. Reset on process restart — this is a live
// status view, not a durable analytics store.
const requestTimestamps: number[] = [];
let requestsTotal = 0;

function trimOldEntries(): void {
  const cutoff = Date.now() - 60_000;
  while (requestTimestamps.length && requestTimestamps[0] < cutoff) {
    requestTimestamps.shift();
  }
}

export function recordRequest(): void {
  requestsTotal++;
  requestTimestamps.push(Date.now());
  trimOldEntries();
}

export function getRequestsPerMinute(): number {
  trimOldEntries();
  return requestTimestamps.length;
}

export function getRequestsTotal(): number {
  return requestsTotal;
}
