import { Response } from 'express';
import { prisma } from '../prismaClient.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export const getQuestions = async (req: AuthRequest, res: Response) => {
  const { scopeType, scopeId } = req.query;

  try {
    const where: any = {};
    if (scopeType) where.scopeType = scopeType as string;
    if (scopeId) where.scopeId = scopeId as string;

    const questions = await prisma.customQuestion.findMany({
      where,
      orderBy: { order: 'asc' },
    });

    return res.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return res.status(500).json({ error: 'Erro ao buscar perguntas personalizadas' });
  }
};

const parseIds = (raw: string | null | undefined): string[] => {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
};

// Uma pergunta vale para o professor quando é de "todos" (sem professores vinculados) ou ele está na lista.
export const questionAppliesTo = (q: { scopeType: string; scopeId: string | null; teacherIds: string | null }, teacherId: string) => {
  const ids = parseIds(q.teacherIds);
  if (q.scopeType === 'TEACHER' && q.scopeId && !ids.includes(q.scopeId)) ids.push(q.scopeId); // legado
  if (ids.length === 0) return q.scopeType !== 'TEACHER';
  return ids.includes(teacherId);
};

// Perguntas ativas que o professor logado deve responder no relatório.
export const getMyQuestions = async (req: AuthRequest, res: Response) => {
  try {
    const all = await prisma.customQuestion.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } });
    return res.json(all.filter((q) => questionAppliesTo(q, req.user!.id)));
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar perguntas' });
  }
};

// teacherIds: array de professores (vazio = todos os professores)
const normalizeTeacherIds = (teacherIds: unknown): string | null => {
  if (!Array.isArray(teacherIds) || teacherIds.length === 0) return null;
  return JSON.stringify(teacherIds.map(String));
};

export const createQuestion = async (req: AuthRequest, res: Response) => {
  const { title, fieldType, isRequired, options, teacherIds, order } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'O título da pergunta é obrigatório' });
  }

  try {
    const question = await prisma.customQuestion.create({
      data: {
        title,
        fieldType: fieldType || 'TEXTAREA',
        isRequired: isRequired !== undefined ? !!isRequired : true,
        options: Array.isArray(options) ? JSON.stringify(options) : (options || null),
        teacherIds: normalizeTeacherIds(teacherIds),
        scopeType: Array.isArray(teacherIds) && teacherIds.length > 0 ? 'TEACHER' : 'GLOBAL',
        scopeId: null,
        order: order || 0,
      },
    });

    return res.status(201).json(question);
  } catch (error) {
    console.error('Error creating question:', error);
    return res.status(500).json({ error: 'Erro ao criar pergunta personalizada' });
  }
};

export const updateQuestion = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, fieldType, isRequired, options, teacherIds, order } = req.body;

  try {
    const data: any = {};
    if (title) data.title = title;
    if (fieldType) data.fieldType = fieldType;
    if (isRequired !== undefined) data.isRequired = !!isRequired;
    if (options !== undefined) {
      data.options = Array.isArray(options) ? JSON.stringify(options) : options;
    }
    if (teacherIds !== undefined) {
      data.teacherIds = normalizeTeacherIds(teacherIds);
      data.scopeType = data.teacherIds ? 'TEACHER' : 'GLOBAL';
      data.scopeId = null;
    }
    if (order !== undefined) data.order = Number(order);

    const question = await prisma.customQuestion.update({
      where: { id },
      data,
    });

    return res.json(question);
  } catch (error) {
    console.error('Error updating question:', error);
    return res.status(500).json({ error: 'Erro ao atualizar pergunta personalizada' });
  }
};

export const deleteQuestion = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.customQuestion.delete({ where: { id } });
    return res.json({ message: 'Pergunta personalizada excluída com sucesso' });
  } catch (error) {
    console.error('Error deleting question:', error);
    return res.status(500).json({ error: 'Erro ao excluir pergunta personalizada' });
  }
};

export const reorderQuestions = async (req: AuthRequest, res: Response) => {
  const { items } = req.body; // Array of { id: string, order: number }

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Array items é obrigatório' });
  }

  try {
    await Promise.all(
      items.map((item: { id: string; order: number }) =>
        prisma.customQuestion.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );

    return res.json({ message: 'Ordem das perguntas atualizada com sucesso' });
  } catch (error) {
    console.error('Error reordering questions:', error);
    return res.status(500).json({ error: 'Erro ao reordenar perguntas' });
  }
};

export const toggleQuestionActive = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const existing = await prisma.customQuestion.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Pergunta não encontrada' });
    }

    const updated = await prisma.customQuestion.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    return res.json(updated);
  } catch (error) {
    console.error('Error toggling question active status:', error);
    return res.status(500).json({ error: 'Erro ao alternar status da pergunta' });
  }
};
