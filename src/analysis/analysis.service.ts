import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class AnalysisService {
  constructor(private prisma: PrismaService) { }

  /**
   * Helper: Calculate passing score for a quiz
   */
  private async calculatePassingScore(quizId: number, thresholdPercent = 50): Promise<number> {
    const questions = await this.prisma.quizQuestion.findMany({
      where: { quizId },
      include: { question: true },
    });

    const maxScore = questions.reduce((sum, q) => sum + (q.question.score ?? 0), 0);
    return (maxScore * thresholdPercent) / 100;
  }

  // ===================== Student Analysis =====================
  async getStudentAnalysis(studentId: number, thresholdPercent = 50) {
    const memberships = await this.prisma.membership.findMany({
      where: { studentId, status: 'APPROVED' },
      select: { groupId: true },
    });
    const groupIds = memberships.map(m => m.groupId);

    const attempts = await this.prisma.quizAttempt.findMany({
      where: { studentId },
      include: { quiz: true },
    });

    const examsTaken = attempts.length;

    const totalQuizzes = await this.prisma.quiz.count({
      where: { groupId: { in: groupIds }, status: 'PUBLIC' as any },
    });
    const attendedQuizzes = await this.prisma.quizAttempt.count({
      where: {
        studentId,
        quiz: { groupId: { in: groupIds }, status: 'PUBLIC' as any },
      },
    });
    const attendancePercent =
      totalQuizzes > 0 ? Math.round((attendedQuizzes / totalQuizzes) * 100) : 0;

    Logger.error(`attendancePercent: ${attendancePercent} | totalQuizzes: ${totalQuizzes} | attendedQuizzes: ${attendedQuizzes}`);

    const results = await Promise.all(
      attempts
        .filter(r => r.quiz.status === ('PUBLIC' as any))
        .map(async r => {
          const passScore = await this.calculatePassingScore(r.quizId, thresholdPercent);
          let subject = await this.prisma.subject.findUnique({ where: { id: r.quiz.subjectId }, select: { title: true } });
          if (!subject) return null;

          let totalQuestions = await this.prisma.quizQuestion.count({ where: { quizId: r.quizId } });
          let totalmarkforquiz = await this.prisma.quizQuestion.findMany({
            where: { quizId: r.quizId }, select: {
              question: {
                select: {
                  score: true
                }
              }
            }
          });
          // ✅ الحل الصحيح: تجمع يدوي
          const questions = await this.prisma.quizQuestion.findMany({
            where: { quizId: r.quizId },
            select: { question: { select: { score: true } } },
          });
          const fullMark = questions.reduce((acc, q) => acc + (q.question.score ?? 0), 0);

          Logger.log(
            `fullMark: ${fullMark} | totalQuestions: ${totalQuestions} | studentScore: ${r.score ?? 0}`,
          );

          return {

            examId: r.quizId,
            examName: r.quiz.title,
            subjectname: subject.title,
            date: r.quiz.startsAt,
            score: r.score ?? 0,
            fullMark,
            totalQuestions,
            pass: (r.score ?? 0) >= passScore,
          };
        }),
    );

    return { totalQuizzes, examsTaken, attendancePercent, results };
  }

  // ===================== Group Analysis =====================
  async getGroupAnalysis(groupId: number, thresholdPercent = 50) {
    // Fetches students with their quiz attempts
    const groupMemberships = await this.prisma.membership.findMany({
      where: { groupId, status: 'APPROVED' },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            quizAttempts: {
              where: { quiz: { groupId, status: 'PUBLIC' as any } },
              select: { score: true },
            },
          },
        },
      },
    });

    const studentsCount = groupMemberships.length;

    const examsCount = await this.prisma.quiz.count({
      where: { groupId, status: 'PUBLIC' as any },
    });
    const materialsCount = await this.prisma.lesson.count({
      where: { groups: { some: { groupId } } },
    });

    const quizzes = await this.prisma.quiz.findMany({
      where: { groupId, status: 'PUBLIC' as any },
      include: {
        attempts: true,
        questions: {
          include: {
            question: true,
          },
        },
      },
    });

    const examsAttendance = await Promise.all(
      quizzes.map(async (q) => {
        const attended = q.attempts.length;
        const attendance = studentsCount > 0 ? Math.round((attended / studentsCount) * 100) : 0;
        const absence = 100 - attendance;

        const scores = q.attempts.map((a) => a.score ?? 0);
        const avg = scores.length
          ? Math.round((scores.reduce((s, n) => s + n, 0) / scores.length) * 100) / 100
          : 0;

        const passScore = await this.calculatePassingScore(q.id, thresholdPercent);

        const successAmongParticipants =
          attended > 0
            ? Math.round(
              (q.attempts.filter((a) => (a.score ?? 0) >= passScore).length / attended) * 100,
            )
            : 0;

        const successClassWide =
          studentsCount > 0
            ? Math.round(
              (q.attempts.filter((a) => (a.score ?? 0) >= passScore).length / studentsCount) * 100,
            )
            : 0;

        return {
          examId: q.id,
          name: q.title,
          attendance,
          absence,
          averageScore: avg,
          successAmongParticipants,
          successClassWide,
        };
      }),
    );

    // 1. Calculate the total possible score for all public quizzes
    const totalPossibleDegrees = quizzes.reduce((total, quiz) => {
      const quizTotalScore = quiz.questions.reduce((sum, qq) => sum + qq.question.score, 0);
      return total + quizTotalScore;
    }, 0);

    // 2. Map through group members to add per-student analysis
    const studentsWithAnalysis = groupMemberships.map((membership) => {
      const studentAttempts = membership.student.quizAttempts;
      const studentTotalScore = studentAttempts.reduce((sum, attempt) => sum + (attempt.score ?? 0), 0);
      const studentAverageScore =
        studentAttempts.length > 0
          ? Math.round((studentTotalScore / studentAttempts.length) * 100) / 100
          : 0;

      return {
        ...membership.student,
        totalPossibleDegrees,
        averageGroupScore: studentAverageScore,
      };
    });

    return {
      counts: {
        students: {
          total: studentsCount,
          data: studentsWithAnalysis, // 👈 Use the new array with analysis
        },
        exams: examsCount,
        materials: materialsCount,
      },
      exams: examsAttendance,
    };
  }

  // ===================== Exam Analysis =====================
  async getExamAnalysis(quizId: number, thresholdPercent = 50) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        attempts: {
          include: {
            studentAnswers: { include: { question: true } }
          }
        },
        group: {
          include: {
            memberships: { where: { status: 'APPROVED' } }
          }
        },
        questions: {
          include: { question: true }
        }
      }
    });

    const totalStudents = quiz?.group.memberships.length ?? 0;
    const participants = quiz?.attempts.length ?? 0;
    const attendance = totalStudents > 0 ? Math.round((participants / totalStudents) * 100) : 0;

    // إجمالي درجات الكويز
    const totalScore = quiz?.questions.reduce((sum, q) => sum + (q.question.score ?? 0), 0) ?? 0;
    const passScore = (totalScore * thresholdPercent) / 100;

    // درجات الطلاب (خام + نسبة مئوية)
    const studentsScores = (quiz?.attempts ?? []).map(a => {
      const rawScore = a.score ?? 0;
      const percent = totalScore > 0 ? (rawScore / totalScore) * 100 : 0;
      return { studentId: a.studentId, score: rawScore, percent };
    });

    // أصعب الأسئلة
    const wrongCount: Record<number, number> = {};
    for (const attempt of quiz?.attempts ?? []) {
      for (const ans of attempt.studentAnswers as any[]) {
        const isWrong = ans.question.type !== 'Written' && ans.answer !== ans.question.answer;
        if (isWrong) wrongCount[ans.questionId] = (wrongCount[ans.questionId] ?? 0) + 1;
      }
    }
    const hardestQuestions = Object.entries(wrongCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([questionId, count]) => ({ questionId: Number(questionId), wrongCount: count }));

    // توزيع الدرجات بناءً على النسبة المئوية
    const distribution = [0, 0, 0, 0];
    for (const s of studentsScores) {
      if (s.percent < 50) distribution[0]++;
      else if (s.percent < 70) distribution[1]++;
      else if (s.percent < 85) distribution[2]++;
      else distribution[3]++;
    }

    // نسب النجاح
    const successParticipants = participants > 0
      ? Math.round(((quiz?.attempts.filter(a => (a.score ?? 0) >= passScore).length ?? 0) / participants) * 100)
      : 0;

    const successClassWide = totalStudents > 0
      ? Math.round(((quiz?.attempts.filter(a => (a.score ?? 0) >= passScore).length ?? 0) / totalStudents) * 100)
      : 0;

    return {
      participants,
      attendancePercent: attendance,
      studentsScores,
      hardestQuestions,
      distribution: { ranges: ['0-50', '50-70', '70-85', '85-100'], counts: distribution },
      successParticipantsPercent: successParticipants,
      successClassWidePercent: successClassWide
    };
  }
  // ===================== home Analysis =====================

  async getStats(teacherId: number) {
    // عدد الطلاب (distinct students اللي في Membership)
    const studentsCount = await this.prisma.membership.count({
      where: { group: { createdById: teacherId } },
    });

    // عدد الدروس
    const lessonsCount = await this.prisma.lesson.count({
      where: {
        subject: { teacherId: teacherId },
      },
    });

    // عدد الجروبات
    const groupsCount = await this.prisma.group.count({
      where: { createdById: teacherId },
    });

    // عدد الكويزات
    const quizzesCount = await this.prisma.quiz.count({
      where: { createdById: teacherId },
    });

    return {
      students: studentsCount,
      materials: lessonsCount,
      classes: groupsCount,
      exams: quizzesCount,
    };
  }
}
