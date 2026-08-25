import { Response } from 'express';
import { prisma } from '../prismaClient.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { googleDriveService } from '../services/googleDriveService.js';

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
    const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
    const school = await prisma.school.findUnique({ where: { id: schoolId } });

    const sessionDate = new Date(date);
    const monthYear = `${String(sessionDate.getMonth() + 1).padStart(2, '0')}_${sessionDate.getFullYear()}`;

    // Ensure Google Drive folders exist
    const { ensaiosFolderId } = await googleDriveService.ensureFolderStructure(
      'Projeto Cultural',
      teacher?.name || 'Professor',
      school?.name || 'Escola',
      monthYear
    );

    const createdPhotos = [];

    for (let i = 0; i < photoUrls.length; i++) {
      const url = photoUrls[i];
      const photoTime = originalTimestamp ? new Date(originalTimestamp) : sessionDate;
      const formattedDateStr = photoTime.toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
      const fileName = `Ensaio_${formattedDateStr}_${i + 1}.jpg`;

      // Trigger Drive sync upload
      const googleDriveFileId = await googleDriveService.uploadFile(
        url, // If base64 or file path
        fileName,
        'image/jpeg',
        ensaiosFolderId
      );

      const photo = await prisma.rehearsalPhoto.create({
        data: {
          date: sessionDate,
          originalTimestamp: photoTime,
          photoUrl: url,
          googleDriveFileId,
          schoolId,
          teacherId,
        },
      });

      createdPhotos.push(photo);
    }

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
    const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
    const eventDate = new Date(date);
    const monthYear = `${String(eventDate.getMonth() + 1).padStart(2, '0')}_${eventDate.getFullYear()}`;

    const createdSessions = [];

    for (const targetSchoolId of targetSchoolIds) {
      const school = await prisma.school.findUnique({ where: { id: targetSchoolId } });

      const { eventosFolderId } = await googleDriveService.ensureFolderStructure(
        'Projeto Cultural',
        teacher?.name || 'Professor',
        school?.name || 'Escola',
        monthYear
      );

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
          const formattedDateStr = eventDate.toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
          const sanitizedEventName = name.replace(/[^a-zA-Z0-9]/g, '_');
          const fileName = `Evento_${sanitizedEventName}_${formattedDateStr}_${i + 1}.jpg`;

          const googleDriveFileId = await googleDriveService.uploadFile(
            url,
            fileName,
            'image/jpeg',
            eventosFolderId
          );

          const eventPhoto = await prisma.eventPhoto.create({
            data: {
              eventSessionId: eventSession.id,
              photoUrl: url,
              googleDriveFileId,
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

    const eventDate = eventSession.date;
    const monthYear = `${String(eventDate.getMonth() + 1).padStart(2, '0')}_${eventDate.getFullYear()}`;

    const { eventosFolderId } = await googleDriveService.ensureFolderStructure(
      'Projeto Cultural',
      eventSession.teacher?.name || 'Professor',
      eventSession.school?.name || 'Escola',
      monthYear
    );

    const createdPhotos = [];
    for (let i = 0; i < photoUrls.length; i++) {
      const url = photoUrls[i];
      const formattedDateStr = eventDate.toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
      const sanitizedEventName = eventSession.name.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Evento_${sanitizedEventName}_${formattedDateStr}_${Date.now()}_${i + 1}.jpg`;

      const googleDriveFileId = await googleDriveService.uploadFile(
        url,
        fileName,
        'image/jpeg',
        eventosFolderId
      );

      const eventPhoto = await prisma.eventPhoto.create({
        data: {
          eventSessionId: eventSession.id,
          photoUrl: url,
          googleDriveFileId,
        },
      });

      createdPhotos.push(eventPhoto);
    }

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
