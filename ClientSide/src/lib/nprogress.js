import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import './nprogress-custom.css';

// Configure NProgress
NProgress.configure({
  showSpinner: false,
  speed: 500,
  minimum: 0.1,
  easing: 'ease',
  positionUsing: '',
  barSelector: '[role="bar"]',
  spinnerSelector: '[role="spinner"]',
  parent: 'body',
  template: '<div class="bar" role="bar"><div class="peg"></div></div><div class="spinner" role="spinner"><div class="spinner-icon"></div></div>'
});

// Custom methods for API loading
export const startLoading = () => {
  NProgress.start();
};

export const finishLoading = () => {
  NProgress.done();
};

export const incrementLoading = (amount = 0.1) => {
  NProgress.inc(amount);
};

export const setLoading = (progress) => {
  NProgress.set(progress);
};

export default NProgress;
