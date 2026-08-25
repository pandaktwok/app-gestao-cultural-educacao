import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
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
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          name: 'Administrador Geral',
          email: 'admin@projeto.org',
          password: hashedPassword,
          role: 'ADMIN',
          mustChangePassword: false,
          avatarColor: '#4A90E2', // Institutional Pastel Blue for Admin
          initialAvatar: 'AD',
        },
      });
      console.log('✅ Admin inicial criado: admin@projeto.org / admin123');
    }
  } catch (err) {
    console.error('Error seeding initial admin:', err);
  }
};

export const login = async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      ENV.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
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
  const { name, email, role, schoolIds } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Nome e email são obrigatórios' });
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existing) {
      return res.status(400).json({ error: 'Email já cadastrado no sistema' });
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
        role: true,
        mustChangePassword: true,
        avatarColor: true,
        initialAvatar: true,
        createdAt: true,
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
