import { loadApiEnvironment } from './environment';

// Run before Nest evaluates feature modules; do not log configuration values.
loadApiEnvironment();
