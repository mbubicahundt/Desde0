import { IsString, MinLength } from 'class-validator';

export class AnswerQuestionDto {
  @IsString()
  @MinLength(2)
  text!: string;
}
