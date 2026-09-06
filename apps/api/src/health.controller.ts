import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from './common/public.decorator';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  @Get()
  @ApiOkResponse({ description: 'API is available.' })
  check(): { status: 'ok'; service: 'api' } { return { status: 'ok', service: 'api' }; }
}
