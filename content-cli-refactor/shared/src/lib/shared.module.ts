import {Global, Module} from '@nestjs/common';
import {LoggerService} from "./logger.service";
import {ProfileService} from "./profile/profile.service";
import {HttpClientService} from "./http/http-client.service";

@Global()
@Module({
	providers: [HttpClientService, LoggerService, ProfileService],
	exports: [HttpClientService, LoggerService, ProfileService],
})
export class SharedModule {}
