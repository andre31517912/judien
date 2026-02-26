import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommentsService } from './comments.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  CreateCommentSchema,
  CommentListQuerySchema,
  type CreateCommentDto,
  type CommentListQuery,
} from '@judien/shared';
import type { User } from '@prisma/client';

class OptionalJwtGuard extends AuthGuard('jwt') {
  handleRequest<T>(_err: unknown, user: T): T { return user; }
}

@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  // GET /api/events/:eventId/comments
  @UseGuards(new OptionalJwtGuard())
  @Get('events/:eventId/comments')
  list(
    @Param('eventId') eventId: string,
    @Query(new ZodValidationPipe(CommentListQuerySchema)) query: CommentListQuery,
  ) {
    return this.commentsService.list(eventId, query);
  }

  // POST /api/events/:eventId/comments
  @UseGuards(AuthGuard('jwt'))
  @Post('events/:eventId/comments')
  create(
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(CreateCommentSchema)) dto: CreateCommentDto,
    @CurrentUser() user: User,
  ) {
    return this.commentsService.create(eventId, user, dto);
  }

  // DELETE /api/comments/:id — admin only
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Delete('comments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.commentsService.remove(id, user);
  }
}
