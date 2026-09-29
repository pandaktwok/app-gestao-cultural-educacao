import { Response } from 'express';
import { prisma } from '../prismaClient.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { triggerSync } from '../services/driveSyncService.js';

export const createAttendanceSession = async (req: AuthRequest, res: Response) => {
  const {
    date,
    type, // 'MANUAL' | 'EXTERNAL'
    category, // 'Ensaio' | 'Reposição' | 'Reforço'
    schoolId,
    countPresent,
    countAbsent,
    records, // Array of { studentId, isPresent, justification } for MANUAL
    photoListUrl,
    pdfListUrl,
  } = req.body;

  const teacherId = req.user?.id;

  if (!date || !schoolId || !teacherId) {
    return res.status(400).json({ error: 'Data, ID da escola e professor são obrigatórios' });
  }

  try {
    const sessionDate = new Date(date);

    let calculatedPresent = countPresent || 0;
    let calculatedAbsent = countAbsent || 0;

    if (type === 'MANUAL' && Array.isArray(records)) {
      calculatedPresent = records.filter((r: any) => r.isPresent).length;
      calculatedAbsent = records.filter((r: any) => !r.isPresent).length;
    }

    const validCategory = ['Ensaio', 'Reposição', 'Reforço'].includes(category) ? category : 'Ensaio';

    const session = await prisma.attendanceSession.create({
      data: {
        date: sessionDate,
        type: type === 'EXTERNAL' ? 'EXTERNAL' : 'MANUAL',
        category: validCategory,
        schoolId,
        teacherId,
        countPresent: calculatedPresent,
        countAbsent: calculatedAbsent,
        photoListUrl: photoListUrl || null,
        pdfListUrl: pdfListUrl || null,
        attendanceRecords:
          type === 'MANUAL' && Array.isArray(records)
            ? {
                createMany: {
                  data: records.map((r: any) => ({
                    studentId: r.studentId,
                    isPresent: !!r.isPresent,
                    justification: r.justification || null,
                  })),
                },
              }
            : undefined,
      },
      include: {
        attendanceRecords: true,
      },
    });

    return res.json(session);
  } catch (error) {
    console.error('Error creating attendance session:', error);
    return res.status(500).json({ error: 'Erro ao registrar chamada' });
  }
};

export const addRehearsalPhotos = async (req: AuthRequest, res: Response) => {
  const { date, originalTimestamp, schoolId, photoUrls } = req.body;
  const teacherId = req.user?.id;

  if (!date || !schoolId || !teacherId || !Array.isArray(photoUrls) || photoUrls.length === 0) {
    return res.status(400).json({ error: 'Data, escola e ao menos 1 foto são obrigatórios' });
  }

  try {
    const sessionDate = new Date(date);

    const createdPhotos = [];

    for (let i = 0; i < photoUrls.length; i++) {
      const url = photoUrls[i];
      const photoTime = originalTimestamp ? new Date(originalTimestamp) : sessionDate;

      const photo = await prisma.rehearsalPhoto.create({
        data: {
          date: sessionDate,
          originalTimestamp: photoTime,
          photoUrl: url,
          schoolId,
          teacherId,
        },
      });

      createdPhotos.push(photo);
    }

    // Envio ao Google Drive em segundo plano (Escola / Mês / Ensaios)
    triggerSync();

    return res.status(201).json(createdPhotos);
  } catch (error) {
    console.error('Error adding rehearsal photos:', error);
    return res.status(500).json({ error: 'Erro ao salvar fotos do ensaio' });
  }
};

export const createEventSession = async (req: AuthRequest, res: Response) => {
  const { name, date, locationAddress, schoolId, schoolIds, photoUrls = [] } = req.body;
  const teacherId = req.user?.id;

  const targetSchoolIds: string[] = Array.isArray(schoolIds) && schoolIds.length > 0 
    ? schoolIds 
    : (schoolId ? [schoolId] : []);

  if (!name || !date || targetSchoolIds.length === 0 || !teacherId) {
    return res.status(400).json({ error: 'Nome do evento, data e ao menos uma escola são obrigatórios' });
  }

  try {
    const eventDate = new Date(date);

    const createdSessions = [];

    for (const targetSchoolId of targetSchoolIds) {
      const eventSession = await prisma.eventSession.create({
        data: {
          name,
          date: eventDate,
          locationAddress: locationAddress || null,
          schoolId: targetSchoolId,
          teacherId,
        },
      });

      const photoRecords = [];
      if (Array.isArray(photoUrls) && photoUrls.length > 0) {
        for (let i = 0; i < photoUrls.length; i++) {
          const url = photoUrls[i];
          const eventPhoto = await prisma.eventPhoto.create({
            data: {
              eventSessionId: eventSession.id,
              photoUrl: url,
            },
          });

          photoRecords.push(eventPhoto);
        }
      }

      createdSessions.push({
        ...eventSession,
        photos: photoRecords,
      });
    }

    triggerSync();
    return res.status(201).json(createdSessions.length === 1 ? createdSessions[0] : createdSessions);
  } catch (error) {
    console.error('Error creating event session:', error);
    return res.status(500).json({ error: 'Erro ao registrar evento' });
  }
};

export const addEventPhotos = async (req: AuthRequest, res: Response) => {
  const { eventId } = req.params;
  const { photoUrls } = req.body;
  const teacherId = req.user?.id;

  if (!eventId || !Array.isArray(photoUrls) || photoUrls.length === 0) {
    return res.status(400).json({ error: 'ID do evento e ao menos 1 foto são obrigatórios' });
  }

  try {
    const eventSession = await prisma.eventSession.findUnique({
      where: { id: eventId },
      include: { school: true, teacher: true },
    });

    if (!eventSession) {
      return res.status(404).json({ error: 'Evento não encontrado' });
    }

    const createdPhotos = [];
    for (let i = 0; i < photoUrls.length; i++) {
      const url = photoUrls[i];

      const eventPhoto = await prisma.eventPhoto.create({
        data: {
          eventSessionId: eventSession.id,
          photoUrl: url,
        },
      });

      createdPhotos.push(eventPhoto);
    }

    triggerSync();
    return res.status(200).json(createdPhotos);
  } catch (error) {
    console.error('Error adding event photos:', error);
    return res.status(500).json({ error: 'Erro ao adicionar fotos ao evento' });
  }
};

export const getSchoolSessionHistory = async (req: AuthRequest, res: Response) => {
  const { schoolId } = req.params;

  try {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
    });

    const attendanceSessions = await prisma.attendanceSession.findMany({
      where: { schoolId },
      include: { attendanceRecords: true },
      orderBy: { date: 'desc' },
    });

    const rehearsalPhotos = await prisma.rehearsalPhoto.findMany({
      where: { schoolId },
      include: { school: true },
      orderBy: { date: 'desc' },
    });

    const eventSessions = await prisma.eventSession.findMany({
      where: { schoolId },
      include: { photos: true, school: true },
      orderBy: { date: 'desc' },
    });

    return res.json({
      school,
      attendanceSessions,
      rehearsalPhotos,
      eventSessions,
    });
  } catch (error) {
    console.error('Error fetching session history:', error);
    return res.status(500).json({ error: 'Erro ao buscar histórico de sessões' });
  }
};

export const getAllEvents = async (req: AuthRequest, res: Response) => {
  try {
    const events = await prisma.eventSession.findMany({
      include: {
        school: true,
        teacher: true,
        photos: true,
      },
      orderBy: { date: 'asc' },
    });
    return res.json(events);
  } catch (error) {
    console.error('Error fetching all events:', error);
    return res.status(500).json({ error: 'Erro ao buscar eventos globais' });
  }
};
