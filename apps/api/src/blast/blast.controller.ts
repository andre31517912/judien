import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { BlastService } from './blast.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { BlastSchema, type BlastDto } from '@judien/shared';
import type { User } from '../__generated__/prisma';

@Controller('events/:eventId/blast')
@UseGuards(AuthGuard('jwt'))
export class BlastController {
  constructor(private readonly blastService: BlastService) {}

  // POST /api/events/:eventId/blast
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post()
  send(
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(BlastSchema)) dto: BlastDto,
    @CurrentUser() actor: User,
  ) {
    return this.blastService.send(eventId, dto, actor);
  }
}
