/**
 * Enforces the module boundaries from the Architecture Decision Document §1.1:
 *  - a module may only import another module's exported facade (modules/<m>/index.ts)
 *  - shared code lives in lib/ and components/ only
 */
module.exports = {
  forbidden: [
    {
      name: "no-cross-module-internals",
      severity: "error",
      from: { path: "^src/modules/([^/]+)/" },
      to: {
        path: "^src/modules/([^/]+)/.+",
        pathNot: "^src/modules/$1/|^src/modules/[^/]+/index\\.ts$",
      },
    },
    {
      name: "ui-cannot-import-modules",
      severity: "error",
      from: { path: "^src/components/" },
      to: { path: "^src/modules/" },
    },
  ],
  options: { tsPreCompilationDeps: true, tsConfig: { fileName: "tsconfig.json" } },
};
