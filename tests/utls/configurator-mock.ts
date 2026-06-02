import { Configurator } from "../../src/core/command/module-handler";

/**
 * A chainable fake of Configurator + CommandConfig used by module-level smoke tests.
 *
 * Modules register their Commander commands via fluent chains
 * (`.command(...).option(...).action(...)`). To exercise the register() body without
 * spinning up Commander, every builder method on the chain returns the same proxy
 * instance and `.action()` is a no-op spy. This lets a test call
 * `module.register(context, mockConfigurator)` and assert on which commands were
 * registered, which flips the entire register() body to covered.
 */
export interface MockConfigurator extends Configurator {
    command: jest.Mock;
    description: jest.Mock;
    option: jest.Mock;
    requiredOption: jest.Mock;
    alias: jest.Mock;
    argument: jest.Mock;
    betaOption: jest.Mock;
    deprecationNotice: jest.Mock;
    beta: jest.Mock;
    action: jest.Mock;
}

export function createMockConfigurator(): MockConfigurator {
    const chain: Partial<MockConfigurator> = {};

    chain.command = jest.fn(() => chain);
    chain.description = jest.fn(() => chain);
    chain.option = jest.fn(() => chain);
    chain.requiredOption = jest.fn(() => chain);
    chain.alias = jest.fn(() => chain);
    chain.argument = jest.fn(() => chain);
    chain.betaOption = jest.fn(() => chain);
    chain.deprecationNotice = jest.fn(() => chain);
    chain.beta = jest.fn(() => chain);
    chain.action = jest.fn();

    return chain as MockConfigurator;
}
