import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../prismaClient.js';
import { ENV } from '../config/env.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

// Pastel theme colors for users
const PASTEL_COLORS = ['#FF85A1', '#FFB074', '#3D8A7E', '#8F94FB', '#FFD166', '#4E9F8E', '#FA7268', '#A5A6F6'];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getRandomColor(): string {
  return PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)];
}

export const seedAdminIfEmpty = async () => {
  try {
    const adminCount = await prisma.user.count();
    if (adminCount === 0) {
      const initialPassword =
        ENV.INITIAL_ADMIN_PASSWORD ||
        (ENV.IS_PRODUCTION ? crypto.randomBytes(12).toString('base64url') : 'admin123');
      const hashedPassword = await bcrypt.hash(initialPassword, 10);
      await prisma.user.create({
        data: {
          name: 'Administrador Geral',
          email: 'admin@projeto.org',
          cpf: '000.000.000-00',
          phone: '(11) 99999-9999',
          password: hashedPassword,
          role: 'ADMIN',
          mustChangePassword: ENV.IS_PRODUCTION,
          avatarColor: '#4A90E2', // Institutional Pastel Blue for Admin
          initialAvatar: 'AD',
        },
      });
      console.log(
        ENV.IS_PRODUCTION
          ? `✅ Admin inicial criado: admin@projeto.org / senha temporária: ${initialPassword} (troque no primeiro acesso)`
          : '✅ Admin inicial criado (ambiente de desenvolvimento): admin@projeto.org / admin123'
      );
    }
  } catch (err) {
    console.error('Error seeding initial admin:', err);
  }
};

export const login = async (req: AuthRequest, res: Response) => {
  const { email, cpf, password } = req.body;
  const loginInput = cpf || email;

  if (!loginInput || !password) {
    return res.status(400).json({ error: 'CPF/E-mail e senha são obrigatórios' });
  }

  try {
    const cleanInput = loginInput.trim();
    const cleanCpfDigits = cleanInput.replace(/\D/g, '');

    let user = null;
    if (cleanCpfDigits.length === 11) {
      // Find by CPF (with or without mask)
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { cpf: cleanInput },
            { cpf: cleanCpfDigits },
            { cpf: cleanInput.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') },
          ],
        },
      });
    }

    if (!user) {
      user = await prisma.user.findUnique({
        where: { email: cleanInput.toLowerCase() },
      });
    }

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique o CPF/E-mail e senha.' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ error: 'Este acesso está desativado. Fale com a coordenação.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique a senha.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, cpf: user.cpf, role: user.role },
      ENV.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        phone: user.phone,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        avatarColor: user.avatarColor,
        initialAvatar: user.initialAvatar || getInitials(user.name),
      },
    });
  } catch (error) {
    console.error('Error in login:', error);
    return res.status(500).json({ error: 'Erro interno ao realizar login' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  const { newPassword } = req.body;
  const userId = req.user?.id;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres' });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
      },
    });

    return res.json({
      message: 'Senha alterada com sucesso!',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        cpf: updatedUser.cpf,
        phone: updatedUser.phone,
        role: updatedUser.role,
        mustChangePassword: false,
      },
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(500).json({ error: 'Erro ao alterar senha' });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  const { name, email, cpf, phone, role, schoolIds } = req.body;

  if (!name || !email || !cpf) {
    return res.status(400).json({ error: 'Nome, e-mail e CPF são obrigatórios' });
  }

  const cleanCpfDigits = cpf.replace(/\D/g, '');
  if (cleanCpfDigits.length !== 11) {
    return res.status(400).json({ error: 'CPF inválido. Deve conter 11 dígitos no formato 000.000.000-00' });
  }

  const formattedCpf = cleanCpfDigits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

  try {
    const existingEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existingEmail) {
      return res.status(400).json({ error: 'E-mail já cadastrado no sistema' });
    }

    const existingCpf = await prisma.user.findFirst({
      where: {
        OR: [
          { cpf: formattedCpf },
          { cpf: cleanCpfDigits },
        ],
      },
    });
    if (existingCpf) {
      return res.status(400).json({ error: 'CPF já cadastrado no sistema' });
    }

    // Generate temporary password
    const tempPassword = `Mudar${Math.floor(1000 + Math.random() * 9000)}`;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const userRole = role === 'ADMIN' ? 'ADMIN' : 'TEACHER';
    const avatarColor = userRole === 'ADMIN' ? '#4A90E2' : getRandomColor();
    const initials = getInitials(name);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        cpf: formattedCpf,
        phone: phone || null,
        password: hashedPassword,
        role: userRole,
        mustChangePassword: true,
        avatarColor,
        initialAvatar: initials,
      },
    });

    // Link schools if teacher
    if (userRole === 'TEACHER' && Array.isArray(schoolIds) && schoolIds.length > 0) {
      await prisma.teacherSchool.createMany({
        data: schoolIds.map((schoolId: string) => ({
          teacherId: newUser.id,
          schoolId,
        })),
      });
    }

    return res.status(201).json({
      message: 'Usuário cadastrado com sucesso!',
      tempPassword,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        cpf: newUser.cpf,
        phone: newUser.phone,
        role: newUser.role,
        avatarColor: newUser.avatarColor,
        initialAvatar: newUser.initialAvatar,
        mustChangePassword: true,
      },
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ error: 'Erro ao cadastrar usuário' });
  }
};

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        phone: true,
        role: true,
        mustChangePassword: true,
        avatarColor: true,
        initialAvatar: true,
        createdAt: true,
        isActive: true,
        teacherSchools: {
          include: {
            school: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
};

export const updateUserSchools = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { schoolIds } = req.body;

  if (!Array.isArray(schoolIds)) {
    return res.status(400).json({ error: 'schoolIds deve ser um array de IDs' });
  }

  try {
    // Delete existing links
    await prisma.teacherSchool.deleteMany({
      where: { teacherId: id },
    });

    // Re-create links
    if (schoolIds.length > 0) {
      await prisma.teacherSchool.createMany({
        data: schoolIds.map((schoolId: string) => ({
          teacherId: id,
          schoolId,
        })),
      });
    }

    return res.json({ message: 'Vínculos de escolas atualizados com sucesso!' });
  } catch (error) {
    console.error('Error updating user schools:', error);
    return res.status(500).json({ error: 'Erro ao atualizar vínculos de escolas' });
  }
};


const formatCpf = (cpf: string) => cpf.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

const newTempPassword = () => `Mudar${Math.floor(1000 + Math.random() * 9000)}`;

// Editar dados do cadastro (nome, e-mail, CPF, telefone). A senha NÃO é alterada aqui.
export const updateUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, email, cpf, phone } = req.body;

  try {
    const current = await prisma.user.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ error: 'Usuário não encontrado' });

    const data: any = {};
    if (name !== undefined) {
      if (!String(name).trim()) return res.status(400).json({ error: 'O nome não pode ficar vazio' });
      data.name = String(name).trim();
      data.initialAvatar = getInitials(data.name);
    }
    if (email !== undefined) {
      const e = String(email).toLowerCase().trim();
      if (!e) return res.status(400).json({ error: 'O e-mail não pode ficar vazio' });
      const dup = await prisma.user.findFirst({ where: { email: e, NOT: { id } } });
      if (dup) return res.status(400).json({ error: 'E-mail já cadastrado para outro usuário' });
      data.email = e;
    }
    if (cpf !== undefined) {
      const digits = String(cpf).replace(/\D/g, '');
      if (digits.length !== 11) return res.status(400).json({ error: 'CPF inválido. Deve conter 11 dígitos' });
      const formatted = formatCpf(digits);
      const dup = await prisma.user.findFirst({
        where: { OR: [{ cpf: formatted }, { cpf: digits }], NOT: { id } },
      });
      if (dup) return res.status(400).json({ error: 'CPF já cadastrado para outro usuário' });
      data.cpf = formatted;
    }
    if (phone !== undefined) data.phone = phone ? String(phone).trim() : null;

    const user = await prisma.user.update({ where: { id }, data });
    return res.json({
      message: 'Cadastro atualizado!',
      user: { id: user.id, name: user.name, email: user.email, cpf: user.cpf, phone: user.phone, role: user.role, isActive: user.isActive },
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ error: 'Erro ao atualizar cadastro' });
  }
};

// Gera uma nova senha temporária e devolve os dados de acesso para o administrador repassar.
export const resetUserPassword = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const tempPassword = newTempPassword();
    await prisma.user.update({
      where: { id },
      data: { password: await bcrypt.hash(tempPassword, 10), mustChangePassword: true },
    });
    return res.json({
      message: 'Senha redefinida. O professor precisará trocá-la no primeiro acesso.',
      access: { name: user.name, cpf: user.cpf, email: user.email, tempPassword },
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return res.status(500).json({ error: 'Erro ao redefinir senha' });
  }
};

// Ativa/desativa o acesso (usado quando o professor já tem histórico e não pode ser apagado).
export const setUserActive = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const active = !!req.body.active;
  if (id === req.user?.id && !active) {
    return res.status(400).json({ error: 'Você não pode desativar o seu próprio acesso' });
  }
  try {
    const user = await prisma.user.update({ where: { id }, data: { isActive: active } });
    return res.json({ message: active ? 'Acesso reativado' : 'Acesso desativado', isActive: user.isActive });
  } catch (error) {
    console.error('Error toggling user:', error);
    return res.status(500).json({ error: 'Erro ao alterar acesso' });
  }
};

// Quantos registros o usuário tem (para o popup de confirmação).
export const getUserImpact = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const [sessions, reports, rehearsals, events] = await Promise.all([
      prisma.attendanceSession.count({ where: { teacherId: id } }),
      prisma.monthlyReport.count({ where: { teacherId: id } }),
      prisma.rehearsalPhoto.count({ where: { teacherId: id } }),
      prisma.eventSession.count({ where: { teacherId: id } }),
    ]);
    return res.json({ sessions, reports, rehearsals, events, hasHistory: sessions + reports + rehearsals + events > 0 });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao consultar histórico' });
  }
};

// Exclui o cadastro. Se houver histórico (chamadas, relatórios, fotos), bloqueia para não apagar estatísticas.
export const deleteUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (id === req.user?.id) return res.status(400).json({ error: 'Você não pode excluir o seu próprio cadastro' });

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    if (user.role === 'ADMIN') {
      const admins = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
      if (admins <= 1) return res.status(400).json({ error: 'Não é possível excluir o único administrador' });
    }

    const [s, r, p, e] = await Promise.all([
      prisma.attendanceSession.count({ where: { teacherId: id } }),
      prisma.monthlyReport.count({ where: { teacherId: id } }),
      prisma.rehearsalPhoto.count({ where: { teacherId: id } }),
      prisma.eventSession.count({ where: { teacherId: id } }),
    ]);
    if (s + r + p + e > 0) {
      return res.status(409).json({
        code: 'HAS_HISTORY',
        error: `Este professor já tem ${s} chamada(s), ${r} relatório(s), ${p} foto(s) de ensaio e ${e} evento(s). Para não perder as estatísticas, desative o acesso em vez de excluir.`,
      });
    }

    await prisma.user.delete({ where: { id } });
    return res.json({ message: 'Cadastro excluído' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ error: 'Erro ao excluir cadastro' });
  }
};
