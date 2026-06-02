/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        // Pages / features
        'auth', 'login', 'dashboard', 'datasets', 'contracts', 'policy',
        'transfer', 'audit', 'compliance', 'users', 'access', 'organizations',
        'participants', 'domains', 'onboarding', 'settings', 'vocabulary',
        'monitoring', 'agreements', 'pools', 'gateway',
        // V2 flows
        'v2', 'consumer', 'provider', 'authority',
        // Tech layers
        'api', 'components', 'hooks', 'context', 'router', 'layout', 'ui',
        // Infra / tooling
        'config', 'deps', 'ci', 'docker', 'infra', 'docs', 'release', 'test',
      ],
    ],
    'subject-case': [2, 'never', ['upper-case', 'pascal-case', 'start-case']],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [1, 'always', 200],
  },
};
