import { Response } from 'express';
import { prisma } from '../prismaClient.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

const PASTEL_COLORS = ['#3D8A7E', '#FF85A1', '#FFB074', '#8F94FB', '#FFD166', '#4E9F8E', '#FA7268', '#A5A6F6'];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getRandomColor(): string {
  return PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)];
}

export const createSchool = async (req: AuthRequest, res: Response) => {
  const { name, boardName, directorName, phone, email, address, logoUrl } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Nome da escola é obrigatório' });
  }

  try {
    const initials = getInitials(name);
    const themeColor = getRandomColor();

    const school = await prisma.school.create({
      data: {
        name,
        boardName: boardName || null,
        directorName: directorName || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        logoUrl: logoUrl || null,
        initialAvatar: initials,
        themeColor,
      },
    });

    return res.status(201).json(school);
  } catch (error) {
    console.error('Error creating school:', error);
    return res.status(500).json({ error: 'Erro ao cadastrar escola' });
  }
};

export const getSchools = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;

    let schools;

    if (userRole === 'ADMIN') {
      schools = await prisma.school.findMany({
        include: {
          teacherSchools: {
            include: {
              teacher: {
                select: { id: true, name: true, email: true, cpf: true, phone: true, avatarColor: true },
              },
            },
          },
          _count: {
            select: {
              students: true,
              attendanceSessions: true,
              rehearsalPhotos: true,
              eventSessions: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    } else {
      // Teacher: only linked schools
      const teacherSchools = await prisma.teacherSchool.findMany({
        where: { teacherId: userId },
        include: {
          school: {
            include: {
              _count: {
                select: { students: true },
              },
            },
          },
        },
      });
      schools = teacherSchools.map((ts) => ts.school);
    }

    return res.json(schools);
  } catch (error) {
    console.error('Error fetching schools:', error);
    return res.status(500).json({ error: 'Erro ao buscar escolas' });
  }
};

export const updateSchool = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, boardName, directorName, phone, email, address, logoUrl, themeColor } = req.body;

  try {
    const data: any = {};
    if (themeColor) data.themeColor = themeColor;
    if (name) {
      data.name = name;
      data.initialAvatar = getInitials(name);
    }
    if (boardName !== undefined) data.boardName = boardName;
    if (directorName !== undefined) data.directorName = directorName;
    if (phone !== undefined) data.phone = phone;
    if (email !== undefined) data.email = email;
    if (address !== undefined) data.address = address;
    if (logoUrl !== undefined) data.logoUrl = logoUrl;

    const school = await prisma.school.update({
      where: { id },
      data,
    });

    return res.json(school);
  } catch (error) {
    console.error('Error updating school:', error);
    return res.status(500).json({ error: 'Erro ao atualizar escola' });
  }
};

// Quanto será apagado junto com a escola (usado no popup de confirmação).
export const getSchoolImpact = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const [students, sessions, reports, rehearsals, events, teachers] = await Promise.all([
      prisma.student.count({ where: { schoolId: id } }),
      prisma.attendanceSession.count({ where: { schoolId: id } }),
      prisma.monthlyReport.count({ where: { schoolId: id } }),
      prisma.rehearsalPhoto.count({ where: { schoolId: id } }),
      prisma.eventSession.count({ where: { schoolId: id } }),
      prisma.teacherSchool.count({ where: { schoolId: id } }),
    ]);
    return res.json({ students, sessions, reports, rehearsals, events, teachers });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao consultar dados da escola' });
  }
};

export const deleteSchool = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.school.delete({
      where: { id },
    });
    return res.json({ message: 'Escola excluída com sucesso!' });
  } catch (error) {
    console.error('Error deleting school:', error);
    return res.status(500).json({ error: 'Erro ao excluir escola' });
  }
};

export const endVisit = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const updated = await prisma.school.update({
      where: { id },
      data: {
        lastVisitEndTimestamp: new Date(),
      },
    });
    return res.json({ message: 'Visita encerrada com sucesso', school: updated });
  } catch (error) {
    console.error('Error ending visit:', error);
    return res.status(500).json({ error: 'Erro ao encerrar visita da escola' });
  }
};

export const getSchoolDetails = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const school = await prisma.school.findUnique({
      where: { id },
      include: {
        teacherSchools: {
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                email: true,
                cpf: true,
                phone: true,
                avatarColor: true,
                initialAvatar: true,
              },
            },
          },
        },
        students: {
          orderBy: [{ status: 'asc' }, { name: 'asc' }],
        },
        attendanceSessions: {
          include: {
            attendanceRecords: true,
          },
          orderBy: { date: 'desc' },
        },
        eventSessions: {
          include: {
            photos: true,
          },
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!school) {
      return res.status(404).json({ error: 'Escola não encontrada' });
    }

    // Calculate Donut Chart stats
    let totalPresentRecords = 0;
    let totalAbsentRecords = 0;

    // Fonte da verdade: registros nominais da chamada; se a sessão não tiver
    // (lista externa), usa os totais informados.
    const sessionsWithCounts = school.attendanceSessions.map((session) => {
      const hasRecords = session.attendanceRecords.length > 0;
      const present = hasRecords
        ? session.attendanceRecords.filter((r) => r.isPresent).length
        : session.countPresent;
      const absent = hasRecords
        ? session.attendanceRecords.length - present
        : session.countAbsent;
      return { ...session, present, absent };
    });

    sessionsWithCounts.forEach((session) => {
      totalPresentRecords += session.present;
      totalAbsentRecords += session.absent;
    });

    const activeStudents = school.students.filter((s) => s.status === 'ACTIVE');
    const dropoutStudents = school.students.filter((s) => s.status === 'DROPOUT');

    const totalAttendanceOps = totalPresentRecords + totalAbsentRecords;
    const overallPresenceRate = totalAttendanceOps > 0
      ? Math.round((totalPresentRecords / totalAttendanceOps) * 100)
      : 100;

    return res.json({
      school: {
        id: school.id,
        name: school.name,
        boardName: school.boardName,
        directorName: school.directorName,
        phone: school.phone,
        email: school.email,
        address: school.address,
        logoUrl: school.logoUrl,
        themeColor: school.themeColor,
        initialAvatar: school.initialAvatar,
      },
      assignedTeachers: school.teacherSchools.map((ts) => ts.teacher),
      stats: {
        totalPresentRecords,
        totalAbsentRecords,
        activeCount: activeStudents.length,
        dropoutCount: dropoutStudents.length,
        overallPresenceRate,
      },
      students: school.students,
      events: school.eventSessions,
      sessions: sessionsWithCounts,
    });
  } catch (error) {
    console.error('Error fetching school details:', error);
    return res.status(500).json({ error: 'Erro ao carregar detalhes da escola' });
  }
};

export const getAlertsSummary = async (req: AuthRequest, res: Response) => {
  try {
    const schools = await prisma.school.findMany({
      include: {
        students: {
          where: { status: 'ACTIVE' },
          include: {
            attendanceRecords: {
              include: {
                attendanceSession: { select: { date: true } },
              },
              orderBy: {
                attendanceSession: { date: 'desc' },
              },
            },
          },
        },
        monthlyReports: {
          orderBy: { createdAt: 'desc' },
        },
        teacherSchools: {
          include: {
            teacher: {
              select: { id: true, name: true, phone: true },
            },
          },
        },
      },
    });

    let totalRiskStudents = 0;
    const schoolsSummary = schools.map((school) => {
      const riskStudents: any[] = [];

      school.students.forEach((student) => {
        const records = student.attendanceRecords || [];
        let consecutiveAbsences = 0;

        for (let i = 0; i < records.length; i++) {
          if (!records[i].isPresent) {
            consecutiveAbsences++;
          } else {
            break;
          }
        }

        if (consecutiveAbsences >= 3) {
          totalRiskStudents++;
          riskStudents.push({
            id: student.id,
            name: student.name,
            age: student.age,
            consecutiveAbsences,
            lastAbsenceDate: records[0]?.attendanceSession?.date || null,
          });
        }
      });

      const pendingReport = school.monthlyReports.find((r) => r.status === 'DRAFT' || r.status === 'REVISION_REQUESTED');

      return {
        schoolId: school.id,
        schoolName: school.name,
        boardName: school.boardName,
        assignedTeachers: school.teacherSchools.map((ts) => ts.teacher),
        riskStudentsCount: riskStudents.length,
        riskStudents,
        hasPendingReport: !!pendingReport,
        pendingReportStatus: pendingReport?.status || null,
      };
    });

    return res.json({
      totalRiskStudents,
      totalSchoolsCount: schools.length,
      schoolsWithRiskCount: schoolsSummary.filter((s) => s.riskStudentsCount > 0).length,
      schoolsSummary,
    });
  } catch (error) {
    console.error('Error fetching alerts summary:', error);
    return res.status(500).json({ error: 'Erro ao buscar resumo de alertas' });
  }
};


/**
 * Série real de atendimento para os gráficos do painel: uma linha por chamada
 * (presentes/faltas) e uma linha por desistência (na data em que ocorreu).
 */
export const getAttendanceTimeline = async (req: AuthRequest, res: Response) => {
  try {
    const year = parseInt(String(req.query.year ?? new Date().getFullYear()), 10);
    const from = new Date(Date.UTC(year, 0, 1));
    const to = new Date(Date.UTC(year + 1, 0, 1));

    const [sessions, dropouts] = await Promise.all([
      prisma.attendanceSession.findMany({
        where: { date: { gte: from, lt: to } },
        include: { attendanceRecords: { select: { isPresent: true } } },
        orderBy: { date: 'asc' },
      }),
      prisma.student.findMany({
        where: { status: 'DROPOUT', dropoutDate: { gte: from, lt: to } },
        select: { id: true, schoolId: true, dropoutDate: true },
      }),
    ]);

    const rows = [
      ...sessions.map((s) => {
        const hasRecords = s.attendanceRecords.length > 0;
        const attended = hasRecords ? s.attendanceRecords.filter((r) => r.isPresent).length : s.countPresent;
        const absent = hasRecords ? s.attendanceRecords.length - attended : s.countAbsent;
        return {
          id: s.id,
          professorId: s.teacherId,
          schoolId: s.schoolId,
          date: s.date.toISOString(),
          month: s.date.getUTCMonth(),
          attended,
          absent,
          dropped: 0,
        };
      }),
      ...dropouts.map((d) => ({
        id: `drop-${d.id}`,
        professorId: '',
        schoolId: d.schoolId,
        date: d.dropoutDate!.toISOString(),
        month: d.dropoutDate!.getUTCMonth(),
        attended: 0,
        absent: 0,
        dropped: 1,
      })),
    ];

    return res.json(rows);
  } catch (error) {
    console.error('Error building attendance timeline:', error);
    return res.status(500).json({ error: 'Erro ao montar a série de atendimento' });
  }
};
