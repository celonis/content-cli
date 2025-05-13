import semverSatisfies from "semver/functions/satisfies";
import { CommandFactory } from "nest-commander";
import { AppModule } from "./app/app.module";
import {logger} from "nx/src/utils/logger";

async function bootstrap() {
  await CommandFactory.run(AppModule);
}

const requiredVersion = ">=10.10.0";
if (!semverSatisfies(process.version, requiredVersion)) {
  logger.error(
      `Node version ${process.version} not supported. Please upgrade your node version to ${requiredVersion}`
  );
  process.exit(1);
}

bootstrap();

// catch uncaught exceptions
process.on('uncaughtException', (error: Error, origin: NodeJS.UncaughtExceptionOrigin) => {
  console.error(`\n Uncaught Exception!\n`);
  console.error('Error:', error);
  console.error('Origin:', origin);
  process.exit(1);
});
