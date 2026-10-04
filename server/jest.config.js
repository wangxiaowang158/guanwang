// Jest 配置 —— 单元测试只覆盖安全与数据边界逻辑，不做 e2e
// 用 ts-jest 而非先编译：TypeORM 实体依赖 emitDecoratorMetadata，
// 直接读项目 tsconfig 能保证装饰器元数据与运行时一致
/** @type {import('jest').Config} */
module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // 实体装饰器与 Nest 的 DI 元数据都依赖它，必须在任何 import 之前加载
  setupFiles: ['reflect-metadata'],
  clearMocks: true,
}
