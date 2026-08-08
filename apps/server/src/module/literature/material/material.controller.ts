import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MaterialService } from './material.service';
import { CreateMaterialRequestDto, ListMaterialRequestDto, UpdateMaterialRequestDto } from './dto/requests';
import { MaterialResponseDto } from './dto/responses';
import { Api } from 'src/core/decorators/api.decorator';
import { User } from 'src/module/system/user/user.decorator';
import { UserType } from 'src/module/system/user/dto/user';

@ApiTags('文学编辑室-常用素材库')
@Controller('literature/material')
@ApiBearerAuth('Authorization')
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  @Api({
    summary: '素材-列表',
    description: '分页查询素材，可按类型/关键词筛选',
    type: MaterialResponseDto,
  })
  @Get('/list')
  list(@Query() query: ListMaterialRequestDto, @User() user: UserType) {
    return this.materialService.list(query, user.userId);
  }

  @Api({
    summary: '素材-详情',
    description: '根据 ID 获取素材详情',
    type: MaterialResponseDto,
    params: [{ name: 'id', description: '素材 ID', type: 'number' }],
  })
  @Get(':id')
  detail(@Param('id') id: string, @User() user: UserType) {
    return this.materialService.detail(+id, user.userId);
  }

  @Api({
    summary: '素材-新建',
    description: '新增素材',
    body: CreateMaterialRequestDto,
    type: MaterialResponseDto,
  })
  @Post()
  create(@Body() createDto: CreateMaterialRequestDto, @User() user: UserType) {
    return this.materialService.create(createDto, user.userId);
  }

  @Api({
    summary: '素材-更新',
    description: '更新素材',
    body: UpdateMaterialRequestDto,
  })
  @Put()
  update(@Body() updateDto: UpdateMaterialRequestDto, @User() user: UserType) {
    return this.materialService.update(updateDto, user.userId);
  }

  @Api({
    summary: '素材-删除',
    description: '删除素材（软删除）',
    params: [{ name: 'id', description: '素材 ID', type: 'number' }],
  })
  @Delete(':id')
  remove(@Param('id') id: string, @User() user: UserType) {
    return this.materialService.remove(+id, user.userId);
  }
}
