import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class GenerateAIQuestionsDto {
    @IsNotEmpty()
    @IsNumber()
    quizId: number;

    @IsNotEmpty()
    @IsNumber()
    startingFocusPage: number;

    @IsNotEmpty()
    @IsNumber()
    endingFocusPage: number;

    @IsNotEmpty()
    @IsNumber()
    noOfFocusQuestions: number;

    @IsOptional()
    @IsNumber()
    startingRemainPage?: number;

    @IsOptional()
    @IsNumber()
    endingRemainPage?: number;

    @IsOptional()
    @IsNumber()
    noOfRemainQuestions?: number;

    @IsNotEmpty()
    @IsString()
    @IsIn(["hard", "medium", "easy"])
    difficulty: "hard" | "medium" | "easy";

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    @Max(100)
    mcqFocusRatio?: number;

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    @Max(100)
    tfFocusRatio?: number;

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    @Max(100)
    writtenFocusRatio?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    mcqRemainRatio?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    tfRemainRatio?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    writtenRemainRatio?: number;

    @IsNotEmpty()
    @IsString()
    filePath: string;
}