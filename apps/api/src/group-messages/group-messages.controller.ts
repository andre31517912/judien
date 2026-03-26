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
import { GroupMessagesService } from './group-messages.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  CreateGroupMessageSchema,
  GroupMessageListQuerySchema,
  type CreateGroupMessageDto,
  type GroupMessageListQuery,
} from '@judien/shared';
import type { User } from '../__generated__/prisma';

class OptionalJwtGuard extends AuthGuard('jwt') {
  handleRequest<T>(_err: unknown, user: T): T { return user; }
}

@Controller()
export class GroupMessagesController {
  constructor(private readonly groupMessagesService: GroupMessagesService) {}

  // GET /api/groups/:groupId/messages
  @UseGuards(AuthGuard('jwt'))
  @Get('groups/:groupId/messages')
  list(
    @Param('groupId') groupId: string,
    @Query(new ZodValidationPipe(GroupMessageListQuerySchema)) query: GroupMessageListQuery,
    @CurrentUser() user: User,
  ) {
    return this.groupMessagesService.list(groupId, user, query);
  }

  // POST /api/groups/:groupId/messages
  @UseGuards(AuthGuard('jwt'))
  @Post('groups/:groupId/messages')
  create(
    @Param('groupId') groupId: string,
    @Body(new ZodValidationPipe(CreateGroupMessageSchema)) dto: CreateGroupMessageDto,
    @CurrentUser() user: User,
  ) {
    return this.groupMessagesService.create(groupId, user, dto);
  }

  // DELETE /api/group-messages/:id
  @UseGuards(AuthGuard('jwt'))
  @Delete('group-messages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.groupMessagesService.delete(id, user);
  }
}
