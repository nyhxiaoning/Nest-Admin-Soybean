import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ManuscriptService } from './manuscript.service';
import {
  BindTagsRequestDto,
  ChangeStatusRequestDto,
  CreateManuscriptRequestDto,
  ListManuscriptRequestDto,
  SaveManuscriptRequestDto,
  UpdateManuscriptRequestDto,
} from './dto/requests';
import { ManuscriptDetailResponseDto, ManuscriptResponseDto } from './dto/responses';
import { Api } from 'src/core/decorators/api.decorator';
import { User } from 'src/module/system/user/user.decorator';
import { UserType } from 'src/module/system/user/dto/user';

@ApiTags('文学编辑室-我的稿件')
@Controller('literature/manuscript')
@ApiBearerAuth('Authorization')
export class ManuscriptController {
  constructor(private readonly manuscriptService: ManuscriptService) {}

  @Api({
    summary: '文稿-列表',
    description: '分页查询我的文稿，可按状态/标签/关键词筛选',
    type: ManuscriptResponseDto,
  })
  @Get('/list')
  list(@Query() query: ListManuscriptRequestDto, @User() user: UserType) {
    return this.manuscriptService.list(query, user.userId);
  }

  @Api({
    summary: '文稿-最近列表',
    description: '最近 10 篇文稿（工作台用）',
  })
  @Get('/recent')
  recent(@User() user: UserType) {
    return this.manuscriptService.findRecent(user.userId);
  }

  @Api({
    summary: '文稿-详情',
    description: '根据 ID 获取文稿详情（含内容与标签）',
    type: ManuscriptDetailResponseDto,
    params: [{ name: 'id', description: '文稿 ID', type: 'number' }],
  })
  @Get(':id')
  detail(@Param('id') id: string, @User() user: UserType) {
    return this.manuscriptService.detail(+id, user.userId);
  }

  @Api({
    summary: '文稿-新建',
    description: '一键新建 Markdown 文稿（草稿）',
    body: CreateManuscriptRequestDto,
    type: ManuscriptResponseDto,
  })
  @Post()
  create(@Body() createDto: CreateManuscriptRequestDto, @User() user: UserType) {
    return this.manuscriptService.create(createDto, user.userId);
  }

  @Api({
    summary: '文稿-更新',
    description: '更新标题/内容/字数',
    body: UpdateManuscriptRequestDto,
  })
  @Put()
  update(@Body() updateDto: UpdateManuscriptRequestDto, @User() user: UserType) {
    return this.manuscriptService.update(updateDto, user.userId);
  }

  @Api({
    summary: '文稿-自动保存',
    description: '轻量保存内容与字数（编辑器自动保存）',
    body: SaveManuscriptRequestDto,
  })
  @Put('/save')
  save(@Body() saveDto: SaveManuscriptRequestDto, @User() user: UserType) {
    return this.manuscriptService.save(saveDto, user.userId);
  }

  @Api({
    summary: '文稿-修改状态',
    description: '发布/归档/移入回收站',
    body: ChangeStatusRequestDto,
  })
  @Put('/status')
  changeStatus(@Body() changeDto: ChangeStatusRequestDto, @User() user: UserType) {
    return this.manuscriptService.changeStatus(changeDto, user.userId);
  }

  @Api({
    summary: '文稿-复制',
    description: '复制文稿为草稿副本',
    params: [{ name: 'id', description: '文稿 ID', type: 'number' }],
  })
  @Post('/copy/:id')
  copy(@Param('id') id: string, @User() user: UserType) {
    return this.manuscriptService.copy(+id, user.userId);
  }

  @Api({
    summary: '文稿-绑定标签',
    description: '为文稿绑定/替换标签',
    body: BindTagsRequestDto,
  })
  @Put('/tags')
  bindTags(@Body() bindDto: BindTagsRequestDto, @User() user: UserType) {
    return this.manuscriptService.bindTags(bindDto, user.userId);
  }

  @Api({
    summary: '文稿-移入回收站',
    description: '软删除，移入回收站',
    params: [{ name: 'id', description: '文稿 ID', type: 'number' }],
  })
  @Delete(':id')
  remove(@Param('id') id: string, @User() user: UserType) {
    return this.manuscriptService.remove(+id, user.userId);
  }

  @Api({
    summary: '文稿-回收站恢复',
    description: '从回收站恢复为草稿',
    params: [{ name: 'id', description: '文稿 ID', type: 'number' }],
  })
  @Put('/restore/:id')
  restore(@Param('id') id: string, @User() user: UserType) {
    return this.manuscriptService.restore(+id, user.userId);
  }

  @Api({
    summary: '文稿-永久删除',
    description: '从回收站永久删除（不可恢复）',
    params: [{ name: 'id', description: '文稿 ID', type: 'number' }],
  })
  @Delete('/permanent/:id')
  permanentDelete(@Param('id') id: string, @User() user: UserType) {
    return this.manuscriptService.permanentDelete(+id, user.userId);
  }
}
