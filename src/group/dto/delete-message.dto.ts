import { ApiProperty } from '@nestjs/swagger';

export class DeleteMessageDto {
  @ApiProperty({ example: 'Group deleted successfully' })
  message: string;
}