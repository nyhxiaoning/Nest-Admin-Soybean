import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Api } from 'src/core/decorators/api.decorator';
import { ApiThrottle } from 'src/core/decorators/throttle.decorator';
import { NotRequireAuth } from 'src/module/system/user/user.decorator';
import { Result } from 'src/shared/response';
import { IgnoreTenant } from 'src/tenant';
import { CreatorJwtGuard, CreatorSession, CreatorUser } from '../../common';
import { CreatorAuthService } from '../services/creator-auth.service';
import {
  CreatorCodeResponseDto,
  CreatorLoginRequestDto,
  CreatorLoginResponseDto,
  CreatorLogoutRequestDto,
  SendCreatorCodeRequestDto,
  SetCreatorPasswordRequestDto,
} from '../dto';

/** PC Creator Center 独立认证接口，不复用后台管理端登录模块。 */
@ApiTags('PC Creator Center - 认证')
@Controller('creator/auth')
@NotRequireAuth()
@IgnoreTenant()
export class CreatorAuthController {
  constructor(private readonly authService: CreatorAuthService) {}

  @Post('code')
  @HttpCode(200)
  @Api({
    summary: '发送 PC Creator Center 手机登录验证码',
    body: SendCreatorCodeRequestDto,
    type: CreatorCodeResponseDto,
    security: false,
  })
  @ApiThrottle({ ttl: 60_000, limit: 5 })
  async sendCode(@Body() dto: SendCreatorCodeRequestDto): Promise<Result> {
    return Result.ok(await this.authService.sendCode(dto));
  }

  @Post('login')
  @HttpCode(200)
  @Api({
    summary: 'PC Creator Center 手机验证码或密码登录',
    body: CreatorLoginRequestDto,
    type: CreatorLoginResponseDto,
    security: false,
  })
  @ApiThrottle({ ttl: 60_000, limit: 10 })
  async login(@Body() dto: CreatorLoginRequestDto): Promise<Result> {
    return Result.ok(await this.authService.login(dto), '登录成功');
  }

  @Post('password')
  @HttpCode(200)
  @ApiBearerAuth('Authorization')
  @ApiOperation({ summary: '设置或修改 PC Creator Center 密码' })
  @UseGuards(CreatorJwtGuard)
  async setPassword(
    @CreatorUser() session: CreatorSession,
    @Body() dto: SetCreatorPasswordRequestDto,
  ): Promise<Result> {
    await this.authService.setPassword(session, dto);
    return Result.ok(undefined, '密码设置成功');
  }

  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth('Authorization')
  @ApiOperation({ summary: '退出 PC Creator Center' })
  @UseGuards(CreatorJwtGuard)
  async logout(@CreatorUser() session: CreatorSession, @Body() _dto: CreatorLogoutRequestDto): Promise<Result> {
    await this.authService.logout(session);
    return Result.ok(undefined, '退出成功');
  }
}
