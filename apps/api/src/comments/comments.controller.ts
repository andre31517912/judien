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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommentsService } from './comments.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  CreateCommentSchema,
  UpdateCommentSchema,
  CommentListQuerySchema,
  type CreateCommentDto,
  type UpdateCommentDto,
  type CommentListQuery,
} from '@judien/shared';
import type { User } from '../__generated__/prisma';

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

  // PATCH /api/comments/:id — own comment only
  @UseGuards(AuthGuard('jwt'))
  @Patch('comments/:id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateCommentSchema)) dto: UpdateCommentDto,
    @CurrentUser() user: User,
  ) {
    return this.commentsService.update(id, user, dto);
  }

  // DELETE /api/comments/:id — own comment or admin
  @UseGuards(AuthGuard('jwt'))
  @Delete('comments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.commentsService.remove(id, user);
  }
}
