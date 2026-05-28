'use strict';

const toPeriodKey = (date) =>
  `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

module.exports = {
  preparePeriodWindow(context, _events, done) {
    if (process.env.PERIOD_START && process.env.PERIOD_END) {
      context.vars.period_start = process.env.PERIOD_START;
      context.vars.period_end = process.env.PERIOD_END;
      return done();
    }

    const now = new Date();
    const current = new Date(now.getFullYear(), now.getMonth(), 1);
    const beforePrevious = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    context.vars.period_start = toPeriodKey(beforePrevious);
    context.vars.period_end = toPeriodKey(current);
    done();
  },
};
