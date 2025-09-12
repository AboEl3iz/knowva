// group-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

class UserResponseDto {
    @ApiProperty()
    id: number;
    @ApiProperty()
    name: string;
    @ApiProperty()
    email: string;
}

class SubjectResponseDto {
    @ApiProperty()
    id: number;
    @ApiProperty()
    title: string;
    @ApiProperty()
    description: string;
}

class MembershipResponseDto {
    @ApiProperty({ type: UserResponseDto })
    student: UserResponseDto;
}

export class GroupResponseDto {
    @ApiProperty()
    id: number;
    @ApiProperty()
    name: string;
    @ApiProperty()
    capacity: number;
    @ApiProperty()
    status: string;
    @ApiProperty()
    subjectId: number;
    // ... other properties

    @ApiProperty({ type: [MembershipResponseDto] })
    memberships: MembershipResponseDto[];

    @ApiProperty({ type: SubjectResponseDto })
    subject: SubjectResponseDto;

    @ApiProperty({ type: UserResponseDto })
    createdBy: UserResponseDto;
}