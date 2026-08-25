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
      orderBy: { name: 'asc' },
    });

    return res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    return res.status(500).json({ error: 'Erro ao buscar alunos' });
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
