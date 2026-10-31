/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'domain-depends-on-nothing-inside',
      comment: 'domain não conhece application, infrastructure nem interfaces',
      severity: 'error',
      from: { path: '^src/domain' },
      to: { path: '^src/(application|infrastructure|interfaces)' },
    },
    {
      name: 'domain-has-no-package-dependencies',
      comment: 'domain é TypeScript puro: nenhum import de node_modules',
      severity: 'error',
      from: { path: '^src/domain' },
      to: { dependencyTypes: ['npm', 'npm-dev', 'npm-peer', 'npm-optional', 'npm-bundled', 'core'] },
    },
    {
      name: 'application-depends-only-on-domain',
      comment: 'use cases e ports só conhecem o domínio; adapters entram por injeção',
      severity: 'error',
      from: { path: '^src/application' },
      to: { path: '^src/(infrastructure|interfaces)' },
    },
    {
      name: 'infrastructure-does-not-know-interfaces',
      comment: 'adapters não dependem de HTTP',
      severity: 'error',
      from: { path: '^src/infrastructure' },
      to: { path: '^src/interfaces' },
    },
    {
      name: 'only-main-wires-everything',
      comment: 'interfaces não instancia adapters: quem monta é o composition root',
      severity: 'error',
      from: { path: '^src/interfaces' },
      to: { path: '^src/infrastructure' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '\\.spec\\.ts$|^src/test/' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: { extensions: ['.ts', '.js'] },
  },
};