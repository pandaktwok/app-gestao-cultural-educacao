import { Response } from 'express';
import { prisma } from '../prismaClient.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export const createStudent = async (req: AuthRequest, res: Response) => {
  const { name, age, gender, schoolId } = req.body;

  if (!name || !age || !gender || !schoolId) {
    return res.status(400).json({ error: 'Nome, idade, sexo e ID da escola são obrigatórios' });
  }

  try {
    const student = await prisma.student.create({
      data: {
        name,
        age: parseInt(age, 10),
        gender: gender.toUpperCase(),
        schoolId,
        status: 'ACTIVE',
      },
    });

    return res.status(201).json(student);
  } catch (error) {
    console.error('Error creating student:', error);
    return res.status(500).json({ error: 'Erro ao cadastrar aluno' });
  }
};

export const getStudentsBySchool = async (req: AuthRequest, res: Response) => {
  const { schoolId } = req.params;

  try {
    const students = await prisma.student.findMany({
      where: { schoolId },
      include: {
        attendanceRecords: {
          include: {
            attendanceSession: {
              select: { date: true, category: true, type: true },
            },
          },
          orderBy: {
            attendanceSession: { date: 'desc' },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Calculate consecutive absences for each student
    const result = students.map((student) => {
      const records = student.attendanceRecords || [];
      let consecutiveAbsences = 0;
      let totalPresence = 0;
      let totalAbsence = 0;

      for (let i = 0; i < records.length; i++) {
        const isPresent = records[i].isPresent;
        if (isPresent) {
          totalPresence++;
          // Break consecutive count once a presence is found going backwards from latest
          if (i === consecutiveAbsences) {
            // Keep consecutiveAbsences as is
          }
        } else {
          totalAbsence++;
          if (i === consecutiveAbsences) {
            consecutiveAbsences++;
          }
        }
      }

      const totalSessions = records.length;
      const presenceRate = totalSessions > 0 ? Math.round((totalPresence / totalSessions) * 100) : 100;

      return {
        id: student.id,
        name: student.name,
        age: student.age,
        gender: student.gender,
        status: student.status,
        dropoutDate: student.dropoutDate,
        schoolId: student.schoolId,
        consecutiveAbsences,
        inRisk: consecutiveAbsences >= 3,
        totalPresence,
        totalAbsence,
        totalSessions,
        presenceRate,
      };
    });

    return res.json(result);
  } catch (error) {
    console.error('Error fetching students:', error);
    return res.status(500).json({ error: 'Erro ao buscar alunos' });
  }
};

export const getStudentHistory = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        school: {
          select: { id: true, name: true, themeColor: true },
        },
        attendanceRecords: {
          include: {
            attendanceSession: {
              select: { id: true, date: true, category: true, type: true },
            },
          },
          orderBy: {
            attendanceSession: { date: 'desc' },
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    const records = student.attendanceRecords || [];
    let consecutiveAbsences = 0;
    let totalPresence = 0;
    let totalAbsence = 0;

    for (let i = 0; i < records.length; i++) {
      const isPresent = records[i].isPresent;
      if (isPresent) {
        totalPresence++;
      } else {
        totalAbsence++;
        if (i === consecutiveAbsences) {
          consecutiveAbsences++;
        }
      }
    }

    const totalSessions = records.length;
    const presenceRate = totalSessions > 0 ? Math.round((totalPresence / totalSessions) * 100) : 100;

    const timeline = records.map((r) => ({
      id: r.id,
      sessionId: r.attendanceSession.id,
      date: r.attendanceSession.date,
      category: r.attendanceSession.category || 'Ensaio',
      type: r.attendanceSession.type,
      isPresent: r.isPresent,
      justification: r.justification || null,
    }));

    return res.json({
      student: {
        id: student.id,
        name: student.name,
        age: student.age,
        gender: student.gender,
        status: student.status,
        dropoutDate: student.dropoutDate,
        school: student.school,
      },
      stats: {
        presenceRate,
        totalPresence,
        totalAbsence,
        consecutiveAbsences,
        totalSessions,
      },
      timeline,
    });
  } catch (error) {
    console.error('Error fetching student history:', error);
    return res.status(500).json({ error: 'Erro ao carregar histórico do aluno' });
  }
};

export const markDropout = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { dropoutDate } = req.body;

  try {
    const student = await prisma.student.update({
      where: { id },
      data: {
        status: 'DROPOUT',
        dropoutDate: dropoutDate ? new Date(dropoutDate) : new Date(),
      },
    });

    return res.json({
      message: 'Desistência registrada com sucesso. Métricas anteriores foram preservadas.',
      student,
    });
  } catch (error) {
    console.error('Error marking student dropout:', error);
    return res.status(500).json({ error: 'Erro ao registrar desistência' });
  }
};

export const deleteStudent = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.student.delete({
      where: { id },
    });
    return res.json({ message: 'Aluno excluído com sucesso!' });
  } catch (error) {
    console.error('Error deleting student:', error);
    return res.status(500).json({ error: 'Erro ao excluir aluno' });
  }
};
