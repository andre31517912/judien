import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Optional,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EventsService } from './events.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  CreateEventSchema,
  UpdateEventSchema,
  EventListQuerySchema,
  type CreateEventDto,
  type UpdateEventDto,
  type EventListQuery,
} from '@judien/shared';
import type { User } from '../__generated__/prisma';

// Optional JWT guard – attaches user if token present, doesn't throw if missing
class OptionalJwtGuard extends AuthGuard('jwt') {
  handleRequest<T>(err: unknown, user: T): T {
    return user;
  }
}

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // GET /api/events?scope=future|past&page=1
  @UseGuards(new OptionalJwtGuard())
  @Get()
  list(
    @Query(new ZodValidationPipe(EventListQuerySchema)) query: EventListQuery,
    @CurrentUser() user?: User,
  ) {
    return this.eventsService.list(query, user?.id);
  }

  // GET /api/events/:id
  @UseGuards(new OptionalJwtGuard())
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user?: User) {
    return this.eventsService.findOne(id, user?.id);
  }

  // POST /api/events — admin only
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(
    @Body(new ZodValidationPipe(CreateEventSchema)) dto: CreateEventDto,
    @CurrentUser() user: User,
  ) {
    return this.eventsService.create(dto, user);
  }

  // PATCH /api/events/:id — admin only
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateEventSchema)) dto: UpdateEventDto,
  ) {
    return this.eventsService.update(id, dto);
  }

  // DELETE /api/events/:id — admin only
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }
}
