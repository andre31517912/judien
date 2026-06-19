import { Controller, Get, Patch, Delete, Body, Param, NotFoundException, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { UpdateProfileSchema, type UpdateProfileDto } from '@judien/shared';
import type { User } from '../__generated__/prisma';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  // GET /api/users/:id — public profile (display name only)
  @Get(':id')
  async getPublicProfile(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, displayName: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // PATCH /api/users/me
  @UseGuards(AuthGuard('jwt'))
  @Patch('me')
  updateProfile(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(UpdateProfileSchema)) dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  // DELETE /api/users/me
  @UseGuards(AuthGuard('jwt'))
  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAccount(@CurrentUser() user: User) {
    return this.usersService.deleteAccount(user.id);
  }
}
