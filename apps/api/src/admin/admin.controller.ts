import { Controller, Delete, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import type { User } from '../__generated__/prisma';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // GET /admin/search?q=&type=all|user|group
  @Get('search')
  search(
    @Query('q') q = '',
    @Query('type') type: 'user' | 'group' | 'all' = 'all',
  ) {
    return this.adminService.search(q, type);
  }

  // GET /admin/users?page=1&pageSize=50
  @Get('users')
  listUsers(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '50',
  ) {
    return this.adminService.listUsers(Number(page), Number(pageSize));
  }

  // GET /admin/groups?page=1&pageSize=50
  @Get('groups')
  listGroups(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '50',
  ) {
    return this.adminService.listGroups(Number(page), Number(pageSize));
  }

  // DELETE /admin/users/:userId
  @Delete('users/:userId')
  deleteUser(
    @Param('userId') userId: string,
    @CurrentUser() requestingUser: User,
  ) {
    return this.adminService.deleteUser(userId, requestingUser);
  }

  // DELETE /admin/groups/:groupId
  @Delete('groups/:groupId')
  deleteGroup(@Param('groupId') groupId: string) {
    return this.adminService.deleteGroup(groupId);
  }
}
