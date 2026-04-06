import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../common/current-user.decorator';
import type { JwtUser } from '../common/request-user';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { AnswerQuestionDto } from './dto/answer-question.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { QaService } from './qa.service';

@Controller()
export class QaController {
  constructor(private readonly qa: QaService) {}

  @Get('cars/:id/questions')
  async listForCar(@Param('id') carId: string) {
    return this.qa.listPublicQuestions(carId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('BUYER')
  @Post('cars/:id/questions')
  async createQuestion(
    @CurrentUser() user: JwtUser,
    @Param('id') carId: string,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.qa.createQuestion(carId, user.sub, dto.text);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SELLER')
  @Post('questions/:id/answer')
  async answer(
    @CurrentUser() user: JwtUser,
    @Param('id') questionId: string,
    @Body() dto: AnswerQuestionDto,
  ) {
    return this.qa.answerQuestion(questionId, user.sub, dto.text);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SELLER')
  @Patch('questions/:id/hide')
  async hide(@CurrentUser() user: JwtUser, @Param('id') questionId: string) {
    return this.qa.hideQuestion(questionId, user.sub);
  }
}
