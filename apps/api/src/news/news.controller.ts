import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, HttpCode, HttpStatus, Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NewsService } from './news.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  CreateNewsSchema, NewsListQuerySchema, UpdateNewsSchema,
  type CreateNewsDto, type NewsListQuery, type UpdateNewsDto,
} from '@judien/shared';
import type { User } from '../__generated__/prisma';

class OptionalJwtGuard extends AuthGuard('jwt') {
  handleRequest<T>(_err: unknown, user: T): T {
    return user;
  }
}

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @UseGuards(new OptionalJwtGuard())
  @Get()
  list(
    @Query(new ZodValidationPipe(NewsListQuerySchema)) query: NewsListQuery,
    @CurrentUser() user?: User,
  ) {
    return this.newsService.list(query, user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @Body(new ZodValidationPipe(CreateNewsSchema)) dto: CreateNewsDto,
    @CurrentUser() user: User,
  ) {
    return this.newsService.create(dto, user);
  }

  @UseGuards(new OptionalJwtGuard())
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.newsService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateNewsSchema)) dto: UpdateNewsDto,
    @CurrentUser() user: User,
  ) {
    return this.newsService.update(id, dto, user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.newsService.remove(id, user);
  }
}
