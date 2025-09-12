import { ApiProperty } from '@nestjs/swagger';
import { GroupStatus } from '@prisma/client';

class StudentInfoDto {
  @ApiProperty()
  id: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  email: string;
}

export class ToggleGroupStatusResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  teacherId: string;

  @ApiProperty()
  subjectId: string;

  @ApiProperty()
  capacity: string;

  @ApiProperty({ type: [StudentInfoDto] })
  studentIds: StudentInfoDto[];

  @ApiProperty({ enum: ['active', 'inactive', 'complete'] })
  status: 'active' | 'inactive' | 'complete';

  @ApiProperty()
  createdAt: Date;
}