import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TagService } from './tag.service';
import { CreateTagRequestDto, ListTagRequestDto, UpdateTagRequestDto } from './dto/requests';
import { TagResponseDto } from './dto/responses';
import { Api } from 'src/core/decorators/api.decorator';
import { User } from 'src/module/system/user/user.decorator';
import { UserType } from 'src/module/system/user/dto/user';

@ApiTags('文学编辑室-标签管理')
@Controller('literature/tag')
@ApiBearerAuth('Authorization')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Api({
    summary: '标签-列表',
    description: '分页查询标签（含每标签关联文稿数）',
    type: TagResponseDto,
  })
  @Get('/list')
  list(@Query() query: ListTagRequestDto, @User() user: UserType) {
    return this.tagService.list(query, user.userId);
  }

  @Api({
    summary: '标签-详情',
    description: '根据 ID 获取标签详情',
    type: TagResponseDto,
    params: [{ name: 'id', description: '标签 ID', type: 'number' }],
  })
  @Get(':id')
  detail(@Param('id') id: string, @User() user: UserType) {
    return this.tagService.detail(+id, user.userId);
  }

  @Api({
    summary: '标签-新建',
    description: '创建新标签',
    body: CreateTagRequestDto,
    type: TagResponseDto,
  })
  @Post()
  create(@Body() createDto: CreateTagRequestDto, @User() user: UserType) {
    return this.tagService.create(createDto, user.userId);
  }

  @Api({
    summary: '标签-更新',
    description: '修改标签名称/颜色',
    body: UpdateTagRequestDto,
  })
  @Put()
  update(@Body() updateDto: UpdateTagRequestDto, @User() user: UserType) {
    return this.tagService.update(updateDto, user.userId);
  }

  @Api({
    summary: '标签-删除',
    description: '删除标签（同时解除关联）',
    params: [{ name: 'id', description: '标签 ID', type: 'number' }],
  })
  @Delete(':id')
  remove(@Param('id') id: string, @User() user: UserType) {
    return this.tagService.remove(+id, user.userId);
  }
}
