import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../prismaClient.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export const issueCertificate = async (req: AuthRequest, res: Response) => {
  const { studentId, eventSessionId } = req.body;

  if (!studentId || !eventSessionId) {
    return res.status(400).json({ error: 'studentId e eventSessionId são obrigatórios' });
  }

  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { school: true },
    });
    const eventSession = await prisma.eventSession.findUnique({
      where: { id: eventSessionId },
      include: { school: true, teacher: true },
    });

    if (!student || !eventSession) {
      return res.status(404).json({ error: 'Aluno ou evento não encontrado' });
    }

    // Calculate student attendance rate in their school
    const sessions = await prisma.attendanceSession.findMany({
      where: { schoolId: student.schoolId },
      include: { attendanceRecords: { where: { studentId } } },
    });

    let totalSessions = sessions.length;
    let presentCount = 0;
    sessions.forEach((s) => {
      if (s.attendanceRecords.some((r) => r.isPresent)) {
        presentCount++;
      }
    });

    const attendanceRate = totalSessions > 0 ? (presentCount / totalSessions) * 100 : 100.0;

    // Must be >= 75% for certificate eligibility
    if (attendanceRate < 75.0 && student.status !== 'ACTIVE') {
      return res.status(400).json({
        error: `Frequência de ${attendanceRate.toFixed(1)}% insuficiente para certificação (mínimo 75%).`,
      });
    }

    // Generate unique verification hash
    const rawData = `${studentId}_${eventSessionId}_CRUZEIRO_DO_SUL_2026`;
    const hash = crypto.createHash('sha256').update(rawData).digest('hex').substring(0, 16).toUpperCase();

    let cert = await prisma.certificateHash.findUnique({
      where: { hash },
    });

    if (!cert) {
      cert = await prisma.certificateHash.create({
        data: {
          hash,
          studentId,
          eventSessionId,
          attendanceRate: parseFloat(attendanceRate.toFixed(1)),
        },
      });
    }

    return res.json({
      certificate: cert,
      student,
      eventSession,
    });
  } catch (error) {
    console.error('Error issuing certificate:', error);
    return res.status(500).json({ error: 'Erro ao emitir certificado' });
  }
};

export const verifyCertificatePublic = async (req: Request, res: Response) => {
  const { hash } = req.params;

  try {
    const cert = await prisma.certificateHash.findUnique({
      where: { hash: hash.toUpperCase() },
      include: {
        student: {
          include: { school: true },
        },
        eventSession: {
          include: { school: true, teacher: true },
        },
      },
    });

    if (!cert) {
      return res.status(404).json({ valid: false, error: 'Certificado não encontrado ou código inválido.' });
    }

    return res.json({
      valid: true,
      hash: cert.hash,
      issueDate: cert.issueDate,
      attendanceRate: cert.attendanceRate,
      studentName: cert.student.name,
      schoolName: cert.student.school.name,
      eventName: cert.eventSession.name,
      eventDate: cert.eventSession.date,
      eventLocation: cert.eventSession.locationAddress || cert.student.school.address || 'São Paulo - SP',
      instructorName: cert.eventSession.teacher.name,
      projectName: 'Projeto Cultural & Arte nas Escolas',
    });
  } catch (error) {
    console.error('Error verifying certificate:', error);
    return res.status(500).json({ valid: false, error: 'Erro ao validar certificado' });
  }
};
