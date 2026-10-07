/*
 * Minimal, working Jest config for this library.
 *
 * The repo-root jest.config.ts calls Nx's getJestProjects(), but the `@nx/jest`
 * package it imports is not actually a dependency of this project (it's not in
 * package.json, and isn't installed) - so `pnpm test` fails before running a
 * single test, independently of anything in this PR. This config lets the
 * nestjs-libraries tests run with plain Jest + ts-jest in the meantime.
 */
import type { Config } from 'jest';

const config: Config = {
  displayName: 'nestjs-libraries',
  rootDir: '.',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/../../tsconfig.base.json',
        // The Prisma client isn't generated in this environment (prisma
        // generate needs network access this sandbox doesn't have), so
        // `import { Integration } from '@prisma/client'` type-only imports
        // can't be resolved by full type-checking. isolatedModules skips
        // type-checking and transpiles file-by-file instead, which is fine
        // here since these are type-only imports that get erased anyway.
        isolatedModules: true,
      },
    ],
  },
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  moduleNameMapper: {
    '^@gitroom/helpers/(.*)$': '<rootDir>/../helpers/src/$1',
    '^@gitroom/nestjs-libraries/(.*)$': '<rootDir>/src/$1',
    // See test-stubs/prisma-client.stub.js for why this is stubbed.
    '^@prisma/client$': '<rootDir>/test-stubs/prisma-client.stub.js',
  },
};

export default config;
