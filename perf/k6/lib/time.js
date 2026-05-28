export const resolvePeriodWindow = () => {
  if (__ENV.PERIOD_START && __ENV.PERIOD_END) {
    return {
      periodStart: __ENV.PERIOD_START,
      periodEnd: __ENV.PERIOD_END,
      periodKeys: [__ENV.PERIOD_START, __ENV.PERIOD_END].join(','),
    };
  }

  const now = new Date();
  const current = new Date(now.getFullYear(), now.getMonth(), 1);
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const beforePrevious = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  const toPeriodKey = (date) =>
    `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

  return {
    periodStart: toPeriodKey(beforePrevious),
    periodEnd: toPeriodKey(current),
    periodKeys: [toPeriodKey(previous), toPeriodKey(current)].join(','),
  };
};

export const randomThinkTime = (minSeconds = 1, maxSeconds = 3) =>
  Math.random() * (maxSeconds - minSeconds) + minSeconds;
