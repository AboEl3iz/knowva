import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
          data: studentsWithAnalysis,
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

    if (!quiz) {
      // Handle case where quiz is not found
      throw new NotFoundException('Quiz not found');
    }

    const totalStudents = quiz.group.memberships.length ?? 0;
    const participants = quiz.attempts.length ?? 0;
    const attendance = totalStudents > 0 ? Math.round((participants / totalStudents) * 100) : 0;

    // إجمالي درجات الكويز
    const totalScore = quiz.questions.reduce((sum, q) => sum + (q.question.score ?? 0), 0) ?? 0;
    const passScore = (totalScore * thresholdPercent) / 100;

    // درجات الطلاب (خام + نسبة مئوية)
    const studentsScores = (quiz.attempts ?? []).map(a => {
      const rawScore = a.score ?? 0;
      const percent = totalScore > 0 ? (rawScore / totalScore) * 100 : 0;
      return { studentId: a.studentId, score: rawScore, percent };
    });

    /**
     * اكتر السؤالات التي تم اجابتها بخطأ 
     * نسبه الى حلوها صح 
     * نسبه الى حلوها غلط
     */
    const questionAnalysis = quiz.questions.map(q => {
      const totalAttempts = quiz.attempts.reduce((count, attempt) => {
        // Check if this specific question was answered in this attempt
        const hasAnswer = attempt.studentAnswers.some(ans => ans.questionId === q.questionId);
        return count + (hasAnswer ? 1 : 0);
      }, 0);

      const successfulAttempts = quiz.attempts.reduce((count, attempt) => {
        // Find the specific answer for this question
        const answer = attempt.studentAnswers.find(ans => ans.questionId === q.questionId);
        // A successful attempt is one where the score matches the question's max score.
        const isSuccessful = answer && answer.score === q.question.score;
        return count + (isSuccessful ? 1 : 0);
      }, 0);

      const failedAttempts = totalAttempts - successfulAttempts;

      const successPercentage = totalAttempts > 0 ? Math.round((successfulAttempts / totalAttempts) * 100) : 0;
      const failurePercentage = totalAttempts > 0 ? Math.round((failedAttempts / totalAttempts) * 100) : 0;

      return {
        questionId: q.questionId,
        question: q.question.question,
        successPercentage,
        failurePercentage,
        totalAttempts,
        successfulAttempts,
        failedAttempts,
      };
    });

    const hardestQuestions = questionAnalysis
      .sort((a, b) => b.failurePercentage - a.failurePercentage)
      .slice(0, 10);

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
      ? Math.round(((quiz.attempts.filter(a => (a.score ?? 0) >= passScore).length ?? 0) / participants) * 100)
      : 0;

    const successClassWide = totalStudents > 0
      ? Math.round(((quiz.attempts.filter(a => (a.score ?? 0) >= passScore).length ?? 0) / totalStudents) * 100)
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

    //عدد الاختبارات draft 
    const draftsCount = await this.prisma.quiz.count({
      where: { createdById: teacherId, status: 'DRAFT' },
    });

    //عدد الاختبارات public 
    const publicsCount = await this.prisma.quiz.count({
      where: { createdById: teacherId, status: 'PUBLIC' },
    });

    //اخر امتحان عمله
    const lastQuiz = await this.prisma.quiz.findFirst({
      where: { createdById: teacherId },
      orderBy: { startsAt: 'desc' },
    });

    /**
     * get the count of onging quizzes
     * 
     * get the count of ended quizzes
     * get the cont of upcoming quizzes
     */

    const ongingQuizzesCount = await this.prisma.quiz.count({
      where: { createdById: teacherId, startsAt: { lte: new Date() }, endsAt: { gte: new Date(), }, status: 'PUBLIC' },
    });

    const endedQuizzesCount = await this.prisma.quiz.count({
      where: { createdById: teacherId, endsAt: { lte: new Date(), }, status: 'PUBLIC' },
    });

    const upcomingQuizzesCount = await this.prisma.quiz.count({
      where: { createdById: teacherId, startsAt: { gt: new Date() }, status: 'PUBLIC' },
    });

    return {
      students: studentsCount,
      materials: lessonsCount,
      classes: groupsCount,
      exams: quizzesCount,
      drafts: draftsCount,
      publics: publicsCount,
      lastExam: lastQuiz,
      ongingQuizzes: ongingQuizzesCount,
      endedQuizzes: endedQuizzesCount,
      upcomingQuizzes: upcomingQuizzesCount

    };
  }

  async getStudentStats(studentId: number) {
    let n_groups = await this.prisma.membership.count({
      where: {
        studentId: studentId
      }
    })
    let n_exams = await this.prisma.quizAttempt.count({
      where: {
        studentId: studentId
      }
    })

    let n_lessons = await this.prisma.lesson.count({
      where: {
        groups: {
          some: {
            group: {
              memberships: {
                some: {
                  studentId: studentId
                }
              }
            }
          }
        }
      }
    })

    return {
      groups: n_groups,
      exams: n_exams,
      lessons: n_lessons
    }


  }

  async getAllResults(studentId : number) {
    let results = await this.prisma.quizAttempt.findMany({
      where: {
        studentId: studentId
      },
      include: {
        quiz: true
      }
    });

    let n_exams_oncoming = await this.prisma.quiz.count({
      where: {
        status: 'PUBLIC',
        startsAt: {
          gt: new Date()
        },
        group : {
          memberships: {
            some: {
              studentId: studentId
            }
          }
        }
      }
    });
     
    let n_exams_ended = await this.prisma.quiz.count({
      where: {
        status: 'PUBLIC',
        endsAt: {
          lte: new Date()
        },
        group : {
          memberships: {
            some: {
              studentId: studentId
            }
          }
        }
      }
    });

    let n_exams_onging = await this.prisma.quiz.count({
      where: {
        status: 'PUBLIC',
        startsAt: {
          lte: new Date()
        },
        endsAt: {
          gte: new Date()
        },
        group : {
          memberships: {
            some: {
              studentId: studentId
            }
          }
        }
      }
    })
    return {results, n_exams_oncoming, n_exams_ended , n_exams_onging};
  }
   async getNextDueQuiz(userId: number) {
        const now = new Date();
        // Prefer currently ongoing quizzes
        const ongoing = await this.prisma.quiz.findFirst({
            where: {
                isActive: true,
                startsAt: { lte: now },
                endsAt: { gt: now },
                status: 'PUBLIC' as any,
                group: {
                    memberships: {
                        some: { studentId: userId, status: 'APPROVED' }
                    },

                    
                },
                
            },
            orderBy: { startsAt: 'asc' },
            include: { group: {
              select: { id: true, name: true , status: true }
            }, subject: true }
        });
        Logger.debug(ongoing);
        if (ongoing) return {...ongoing , currentStatus: 'ONGOING'};

        // Otherwise, return the next upcoming published quiz
        const upcoming = await this.prisma.quiz.findFirst({
            where: {
                startsAt: { gt: now },
                status: 'PUBLIC' as any,
                group: {
                    memberships: {
                        some: { studentId: userId, status: 'APPROVED' }
                    }
                }
            },
            orderBy: { startsAt: 'asc' },
            include: { group: true, subject: true }
        });
        Logger.debug(upcoming);
        return {
            ...upcoming,
            currentStatus: 'UPCOMING',
        };
    }
}
