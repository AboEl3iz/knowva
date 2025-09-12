import { ApiProperty } from '@nestjs/swagger';
import { StudentInfoDto } from './student-info.dto';

export class GroupResponseDto {
  @ApiProperty({ example: '123' })
  id: string;

  @ApiProperty({ example: 'Math 101 Group' })
  name: string;

  @ApiProperty({ example: '456' })
  teacherId: string;

  @ApiProperty({ example: '789' })
  subjectId: string;

  @ApiProperty({ example: '30' })
  capacity: string;

  @ApiProperty({ type: [StudentInfoDto] })
  studentIds: StudentInfoDto[];

  @ApiProperty({
    enum: ['complete', 'active', 'inactive'],
    example: 'active',
  })
  status: 'complete' | 'active' | 'inactive';

  @ApiProperty({ example: '2025-09-12T10:00:00.000Z' })
  createdAt: Date;
}