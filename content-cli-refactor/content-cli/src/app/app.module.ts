import { Module } from "@nestjs/common";
import { PacmanModule } from "@content-cli-refactor/pacman";
import { SharedModule } from "@content-cli-refactor/shared";

@Module({
  imports: [
      PacmanModule,
      SharedModule
  ],
  providers: [PacmanModule, SharedModule],
})
export class AppModule {}
