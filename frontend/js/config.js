// Environment-aware API base URL
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isGitHubPages = window.location.hostname.includes('github.io');

export const CONFIG = {
  // DEV: Spring Boot local server
  // GITHUB PAGES: Direct ultra-fast simulated ledger (0ms latency, zero DNS timeouts)
  // PROD: Remote deployed Spring Boot REST API
  API_BASE_URL: isLocal
    ? 'http://localhost:8080/api'
    : (isGitHubPages ? null : 'https://nexgen-banking-api.onrender.com/api'),

  // Repository & Deployment Metadata
  GITHUB_USER: 'RoyalStar555',
  REPO_NAME: 'nexgen-banking-system-mini-project',
  REPO_URL: 'https://github.com/RoyalStar555/nexgen-banking-system-mini-project',
  PAGES_URL: 'https://royalstar555.github.io/nexgen-banking-system-mini-project/',

  DEFAULT_ACCOUNT: 'ACC001',
  PAGE_SIZE: 10,
  TOAST_DURATION: 4000,
  SKELETON_DELAY: 300,
};
