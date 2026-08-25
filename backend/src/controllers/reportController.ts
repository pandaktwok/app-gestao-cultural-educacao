import { Response } from 'express';
import { prisma } from '../prismaClient.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { googleDriveService } from '../services/googleDriveService.js';

const STANDARD_NO_DIFFICULTIES_TEXT =
  'Durante as atividades desenvolvidas no mês de referência, não foram observadas ocorrências ou empecilhos de ordem pedagógica ou estrutural.';

export const getOrCreateMonthlyReport = async (req: AuthRequest, res: Response) => {
  const { schoolId, monthYear } = req.query; // e.g. schoolId, monthYear="08_2026"
  const teacherId = req.user?.id;

  if (!schoolId || !monthYear || !teacherId) {
    return res.status(400).json({ error: 'schoolId, monthYear e professor são obrigatórios' });
  }

  try {
    let report = await prisma.monthlyReport.findUnique({
      where: {
        schoolId_teacherId_monthYear: {
          schoolId: schoolId as string,
          teacherId,
          monthYear: monthYear as string,
        },
      },
      include: {
        school: true,
        teacher: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    if (!report) {
      report = await prisma.monthlyReport.create({
        data: {
          schoolId: schoolId as string,
          teacherId,
          monthYear: monthYear as string,
          hasDifficulties: false,
          difficultiesDetails: STANDARD_NO_DIFFICULTIES_TEXT,
          standardTextUsed: true,
          status: 'DRAFT',
        },
        include: {
          school: true,
          teacher: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });
    }

    // Also fetch all schools assigned to teacher for multi-school report metadata
    const teacherSchools = await prisma.teacherSchool.findMany({
      where: { teacherId },
      include: { school: true },
    });

    return res.json({
      ...report,
      teacherSchools: teacherSchools.map((ts) => ts.school),
    });
  } catch (error) {
    console.error('Error in getOrCreateMonthlyReport:', error);
    return res.status(500).json({ error: 'Erro ao buscar ou criar relatório mensal' });
  }
};

export const saveMonthlyReport = async (req: AuthRequest, res: Response) => {
  const {
    id,
    schoolId,
    monthYear,
    projectTitle,
    grantorName,
    fundingAgreementNo,
    responsibleName,
    activitiesFocus,
    eventPublicCounts,
    impactIndicators,
    monitoringEvaluation,
    hasDifficulties,
    difficultiesDetails,
    achievedResults,
    selectedRehearsalPhotos,
    selectedEventPhotos,
    referenceMonthLabel,
    locationCityDate,
    pdfUrl,
  } = req.body;

  const teacherId = req.user?.id;

  if (!schoolId || !monthYear || !teacherId) {
    return res.status(400).json({ error: 'schoolId, monthYear e professor são obrigatórios' });
  }

  try {
    const finalDifficultiesText = hasDifficulties
      ? difficultiesDetails
      : STANDARD_NO_DIFFICULTIES_TEXT;

    const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
    const school = await prisma.school.findUnique({ where: { id: schoolId } });

    // Ensure Google Drive folder for PDF
    const { relatoriosFolderId } = await googleDriveService.ensureFolderStructure(
      projectTitle || 'Projeto Cultural',
      teacher?.name || 'Professor',
      school?.name || 'Escola',
      monthYear
    );

    let googleDriveFileId = null;
    if (pdfUrl) {
      googleDriveFileId = await googleDriveService.uploadFile(
        pdfUrl,
        `Relatorio_${monthYear}.pdf`,
        'application/pdf',
        relatoriosFolderId
      );
    }

    const report = await prisma.monthlyReport.upsert({
      where: {
        schoolId_teacherId_monthYear: {
          schoolId,
          teacherId,
          monthYear,
        },
      },
      update: {
        projectTitle: projectTitle || 'Projeto Cultural',
        grantorName: grantorName || 'Órgão Concedente',
        fundingAgreementNo: fundingAgreementNo || '001/2026',
        responsibleName: responsibleName || 'Coordenação Geral',
        activitiesFocus: activitiesFocus || undefined,
        eventPublicCounts: typeof eventPublicCounts === 'object' ? JSON.stringify(eventPublicCounts) : (eventPublicCounts || undefined),
        impactIndicators: impactIndicators || undefined,
        monitoringEvaluation: monitoringEvaluation || undefined,
        hasDifficulties: !!hasDifficulties,
        difficultiesDetails: finalDifficultiesText,
        achievedResults: achievedResults || undefined,
        standardTextUsed: !hasDifficulties,
        selectedRehearsalPhotos: selectedRehearsalPhotos
          ? JSON.stringify(selectedRehearsalPhotos)
          : undefined,
        selectedEventPhotos: selectedEventPhotos
          ? JSON.stringify(selectedEventPhotos)
          : undefined,
        referenceMonthLabel: referenceMonthLabel || undefined,
        locationCityDate: locationCityDate || undefined,
        pdfUrl: pdfUrl || undefined,
        googleDriveFileId: googleDriveFileId || undefined,
        status: pdfUrl ? 'SUBMITTED' : 'DRAFT',
      },
      create: {
        id: id || undefined,
        schoolId,
        teacherId,
        monthYear,
        projectTitle: projectTitle || 'Projeto Cultural',
        grantorName: grantorName || 'Órgão Concedente',
        fundingAgreementNo: fundingAgreementNo || '001/2026',
        responsibleName: responsibleName || 'Coordenação Geral',
        activitiesFocus: activitiesFocus || null,
        eventPublicCounts: typeof eventPublicCounts === 'object' ? JSON.stringify(eventPublicCounts) : (eventPublicCounts || null),
        impactIndicators: impactIndicators || null,
        monitoringEvaluation: monitoringEvaluation || null,
        hasDifficulties: !!hasDifficulties,
        difficultiesDetails: finalDifficultiesText,
        achievedResults: achievedResults || null,
        standardTextUsed: !hasDifficulties,
        selectedRehearsalPhotos: selectedRehearsalPhotos
          ? JSON.stringify(selectedRehearsalPhotos)
          : null,
        selectedEventPhotos: selectedEventPhotos
          ? JSON.stringify(selectedEventPhotos)
          : null,
        referenceMonthLabel: referenceMonthLabel || null,
        locationCityDate: locationCityDate || null,
        pdfUrl: pdfUrl || null,
        googleDriveFileId: googleDriveFileId || null,
        status: pdfUrl ? 'SUBMITTED' : 'DRAFT',
      },
    });

    return res.json(report);
  } catch (error) {
    console.error('Error saving monthly report:', error);
    return res.status(500).json({ error: 'Erro ao salvar relatório mensal' });
  }
};

export const getAnnualConsolidatedReport = async (req: AuthRequest, res: Response) => {
  const { year } = req.query; // e.g. "2026"
  const targetYear = year || new Date().getFullYear().toString();

  try {
    const schools = await prisma.school.findMany({
      include: {
        students: true,
        attendanceSessions: true,
        rehearsalPhotos: true,
        eventSessions: {
          include: { photos: true },
        },
        monthlyReports: true,
      },
    });

    const summary = schools.map((school) => {
      const activeStudents = school.students.filter((s) => s.status === 'ACTIVE').length;
      const dropoutStudents = school.students.filter((s) => s.status === 'DROPOUT').length;

      let totalPresentCount = 0;
      let totalAbsentCount = 0;

      school.attendanceSessions.forEach((session) => {
        totalPresentCount += session.countPresent;
        totalAbsentCount += session.countAbsent;
      });

      const totalCalls = totalPresentCount + totalAbsentCount;
      const attendancePercentage =
        totalCalls > 0 ? ((totalPresentCount / totalCalls) * 100).toFixed(1) : '100.0';

      return {
        schoolId: school.id,
        schoolName: school.name,
        boardName: school.boardName,
        totalStudents: school.students.length,
        activeStudents,
        dropoutStudents,
        totalRehearsals: school.rehearsalPhotos.length,
        totalEvents: school.eventSessions.length,
        attendancePercentage: `${attendancePercentage}%`,
        submittedReportsCount: school.monthlyReports.filter((r) => r.status !== 'DRAFT').length,
      };
    });

    return res.json({
      year: targetYear,
      consolidatedSchools: summary,
    });
  } catch (error) {
    console.error('Error getting annual report:', error);
    return res.status(500).json({ error: 'Erro ao consolidar relatório anual' });
  }
};

export const questionReportField = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { fieldKey, comment } = req.body;

  if (!fieldKey || !comment) {
    return res.status(400).json({ error: 'fieldKey e comment são obrigatórios' });
  }

  try {
    const existing = await prisma.monthlyReport.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Relatório não encontrado' });
    }

    let feedbackList: any[] = [];
    if (existing.adminFeedback) {
      try {
        feedbackList = JSON.parse(existing.adminFeedback);
      } catch (e) {
        feedbackList = [];
      }
    }

    // Filter out previous feedback for same field if any, then add new item
    feedbackList = feedbackList.filter((item: any) => item.fieldKey !== fieldKey);
    feedbackList.push({
      fieldKey,
      comment,
      createdAt: new Date().toISOString(),
      status: 'PENDING_REVISION',
    });

    const updated = await prisma.monthlyReport.update({
      where: { id },
      data: {
        adminFeedback: JSON.stringify(feedbackList),
        status: 'REVISION_REQUESTED',
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error('Error questioning report field:', error);
    return res.status(500).json({ error: 'Erro ao questionar campo do relatório' });
  }
};

export const resetReportStatus = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const updated = await prisma.monthlyReport.update({
      where: { id },
      data: {
        status: 'DRAFT',
        pdfUrl: null,
        googleDriveFileId: null,
      },
    });
    return res.json({ message: 'Relatório resetado para DRAFT com sucesso', report: updated });
  } catch (error) {
    console.error('Error resetting report:', error);
    return res.status(500).json({ error: 'Erro ao resetar relatório' });
  }
};

export const getPendingFeedbackReports = async (req: AuthRequest, res: Response) => {
  const teacherId = req.user?.id;

  try {
    const reports = await prisma.monthlyReport.findMany({
      where: {
        teacherId,
        status: 'REVISION_REQUESTED',
      },
      include: {
        school: {
          select: { id: true, name: true },
        },
      },
    });

    return res.json(reports);
  } catch (error) {
    console.error('Error fetching pending feedback reports:', error);
    return res.status(500).json({ error: 'Erro ao buscar relatórios com revisão pendente' });
  }
};

export const deletePhotoAudit = async (req: AuthRequest, res: Response) => {
  const { type, id } = req.params; // type: 'rehearsal' | 'event'

  try {
    if (type === 'rehearsal') {
      await prisma.rehearsalPhoto.delete({ where: { id } });
    } else if (type === 'event') {
      await prisma.eventPhoto.delete({ where: { id } });
    } else {
      return res.status(400).json({ error: 'Tipo de foto inválido' });
    }

    return res.json({ message: 'Foto excluída com sucesso' });
  } catch (error) {
    console.error('Error deleting photo in audit:', error);
    return res.status(500).json({ error: 'Erro ao excluir foto' });
  }
};

