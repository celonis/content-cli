import { Module } from '@nestjs/common';
import {SharedModule} from "@content-cli-refactor/shared";
import {MainConfigCommand} from "./commands/config.base-command";
import {ConfigListCommand} from "./commands/config.commands";

@Module({
	imports: [
		SharedModule,
	],
	providers: [SharedModule, MainConfigCommand, ConfigListCommand],
	exports: [MainConfigCommand, ConfigListCommand],
})
export class PacmanModule {}
