import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { User } from '../__generated__/prisma';
import { NotificationsService } from './notifications.service';

@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.notificationsService.list(user);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: User) {
    return this.notificationsService.unreadCount(user);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notificationsService.markRead(id, user);
  }

  @Post('mark-all-read')
  markAllRead(@CurrentUser() user: User) {
    return this.notificationsService.markAllRead(user);
  }

  @Delete(':id')
  deleteOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notificationsService.deleteOne(id, user);
  }

  @Delete()
  deleteAll(@CurrentUser() user: User) {
    return this.notificationsService.deleteAll(user);
  }
}
