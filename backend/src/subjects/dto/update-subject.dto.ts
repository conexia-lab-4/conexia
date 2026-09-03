import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateSubjectDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
