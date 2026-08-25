import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Limpando banco de dados para ambiente de teste...');

  // Limpar tabelas existentes em ordem respeitando FKs
  await prisma.monthlyReport.deleteMany();
  await prisma.eventPhoto.deleteMany();
  await prisma.eventSession.deleteMany();
  await prisma.rehearsalPhoto.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacherSchool.deleteMany();
  await prisma.school.deleteMany();
  await prisma.user.deleteMany();

  console.log('👤 Criando usuários de teste com CPFs...');
  
  const passwordAdmin = await bcrypt.hash('admin123', 10);
  const passwordTeacher = await bcrypt.hash('prof123', 10);
  const passwordTemp = await bcrypt.hash('temp123', 10);

  // 1. Usuário Administrador
  const admin = await prisma.user.create({
    data: {
      name: 'Administrador Geral',
      email: 'admin@projeto.org',
      cpf: '000.000.000-00',
      phone: '(11) 99999-9999',
      password: passwordAdmin,
      role: 'ADMIN',
      mustChangePassword: false,
      avatarColor: '#4A90E2',
      initialAvatar: 'AD',
    },
  });

  // 2. Professor Principal
  const teacher1 = await prisma.user.create({
    data: {
      name: 'Prof. Carlos Eduardo',
      email: 'professor@projeto.org',
      cpf: '111.222.333-44',
      phone: '(11) 98765-4321',
      password: passwordTeacher,
      role: 'TEACHER',
      mustChangePassword: false,
      avatarColor: '#3D8A7E',
      initialAvatar: 'CE',
    },
  });

  // 3. Professora Nova
  const teacher2 = await prisma.user.create({
    data: {
      name: 'Profa. Marina Silva',
      email: 'marina@projeto.org',
      cpf: '222.333.444-55',
      phone: '(11) 97654-3210',
      password: passwordTemp,
      role: 'TEACHER',
      mustChangePassword: true,
      avatarColor: '#FF85A1',
      initialAvatar: 'MS',
    },
  });

  console.log('🏫 Criando escolas de teste...');

  const school1 = await prisma.school.create({
    data: {
      name: 'Escola Municipal Villa-Lobos',
      boardName: 'Diretoria de Ensino Região Centro',
      directorName: 'Dra. Helena Magalhães',
      phone: '(11) 3241-5500',
      email: 'villalobos@educacao.sp.gov.br',
      address: 'Rua das Acácias, 120 - Centro, São Paulo - SP',
      themeColor: '#3D8A7E',
      initialAvatar: 'VL',
    },
  });

  const school2 = await prisma.school.create({
    data: {
      name: 'Instituto Cultural Anísio Teixeira',
      boardName: 'Fundação de Apoio à Educação e Cultura',
      directorName: 'Prof. Roberto Alencar',
      phone: '(11) 3105-8800',
      email: 'contato@anisioteixeira.org.br',
      address: 'Av. Paulista, 1500 - Bela Vista, São Paulo - SP',
      themeColor: '#8F94FB',
      initialAvatar: 'AT',
    },
  });

  console.log('🔗 Vinculando professores às escolas...');

  await prisma.teacherSchool.createMany({
    data: [
      { teacherId: teacher1.id, schoolId: school1.id },
      { teacherId: teacher1.id, schoolId: school2.id },
    ],
  });

  console.log('👨‍🎓 Criando alunos de teste...');

  const studentsData = [
    { name: 'Gabriel Souza Lima', age: 12, gender: 'M', status: 'ACTIVE' },
    { name: 'Beatriz Santos Oliveira', age: 11, gender: 'F', status: 'ACTIVE' },
    { name: 'Lucas Mendes Rocha', age: 13, gender: 'M', status: 'ACTIVE' }, // Will have 2+ consecutive absences
    { name: 'Sofia Ferreira Costa', age: 10, gender: 'F', status: 'ACTIVE' },
    { name: 'Matheus Alves Ribeiro', age: 14, gender: 'M', status: 'ACTIVE' },
    { name: 'Isabela Carvalho Martins', age: 12, gender: 'F', status: 'ACTIVE' },
    { name: 'Enzo Rodrigues Pereira', age: 9, gender: 'M', status: 'ACTIVE' },
    { name: 'Valentina Barbosa Lima', age: 11, gender: 'F', status: 'ACTIVE' },
    { name: 'Camila Teixeira Ramos', age: 13, gender: 'F', status: 'ACTIVE' },
    { name: 'Renato Nogueira Prado', age: 12, gender: 'M', status: 'DROPOUT', dropoutDate: new Date('2026-07-15T00:00:00Z') },
  ];

  const createdStudents = [];
  for (const s of studentsData) {
    const created = await prisma.student.create({
      data: { ...s, schoolId: school1.id },
    });
    createdStudents.push(created);
  }

  console.log('📅 Criando histórico de 4 ensaios presenciais no mês (Agosto/2026)...');

  const dates = [
    new Date('2026-08-04T14:00:00Z'),
    new Date('2026-08-11T14:00:00Z'),
    new Date('2026-08-18T14:00:00Z'),
    new Date('2026-08-22T14:00:00Z'),
  ];

  const categories = ['Ensaio', 'Ensaio', 'Reposição', 'Ensaio'];

  const sessions = [];
  const photos = [];

  const photoUrls = [
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1507838153414-b4b713384a76?auto=format&fit=crop&w=800&q=80',
  ];

  for (let i = 0; i < dates.length; i++) {
    const d = dates[i];
    const session = await prisma.attendanceSession.create({
      data: {
        date: d,
        type: 'MANUAL',
        category: categories[i],
        schoolId: school1.id,
        teacherId: teacher1.id,
        countPresent: 8,
        countAbsent: 1,
      },
    });
    sessions.push(session);

    // Create records for students
    // Lucas Mendes Rocha (index 2) absent in session 2 and 3 (consecutive)
    for (let j = 0; j < createdStudents.length; j++) {
      const student = createdStudents[j];
      if (student.status === 'DROPOUT') continue;

      let isPresent = true;
      if (student.name === 'Lucas Mendes Rocha' && (i === 2 || i === 3)) {
        isPresent = false;
      }

      await prisma.attendanceRecord.create({
        data: {
          attendanceSessionId: session.id,
          studentId: student.id,
          isPresent,
          justification: isPresent ? null : 'Atestado médico ou ausência justificada',
        },
      });
    }

    const photo = await prisma.rehearsalPhoto.create({
      data: {
        date: d,
        originalTimestamp: d,
        photoUrl: photoUrls[i],
        schoolId: school1.id,
        teacherId: teacher1.id,
      },
    });
    photos.push(photo);
  }

  console.log('🎪 Criando evento cultural e fotos de apresentação...');

  const eventDate = new Date('2026-08-20T16:00:00Z');
  const eventSession = await prisma.eventSession.create({
    data: {
      name: 'Mostra Cultural de Inverno 2026',
      date: eventDate,
      locationAddress: 'Teatro Municipal de São Paulo',
      schoolId: school1.id,
      teacherId: teacher1.id,
    },
  });

  const eventPhoto1 = await prisma.eventPhoto.create({
    data: {
      eventSessionId: eventSession.id,
      photoUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=800&q=80',
    },
  });

  const eventPhoto2 = await prisma.eventPhoto.create({
    data: {
      eventSessionId: eventSession.id,
      photoUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    },
  });

  console.log('📑 Criando Relatório Mensal Completo (Exemplo de Demonstração)...');

  const publicCounts = {
    [eventSession.id]: 250,
  };

  await prisma.monthlyReport.create({
    data: {
      monthYear: '08_2026',
      schoolId: school1.id,
      teacherId: teacher1.id,
      projectTitle: 'Projeto Cultural & Arte nas Escolas',
      grantorName: 'Secretaria de Estado da Cultura e Economia Criativa',
      fundingAgreementNo: 'Termo de Fomento nº 042/2026',
      responsibleName: 'Coordenação Geral de Projetos',
      referenceMonthLabel: 'Agosto / 2026',
      locationCityDate: 'São Paulo - SP, 23/08/2026',

      // Seções 1 a 6 com dados fictícios ricos
      activitiesFocus: 'Aprimoramento da afinação vocal, marcha rítmica para apresentações públicas, postura cênica e sincronia da linha de percussão.',
      eventPublicCounts: JSON.stringify(publicCounts),
      impactIndicators: 'Grande engajamento das famílias com aumento de 35% na assiduidade dos alunos. Evolução notável na percepção rítmica e integração entre as turmas parceiras.',
      monitoringEvaluation: 'Acompanhamento diário de frequência através da chamada digital, avaliação técnica individual semanal e reuniões quinzenais com a coordenação pedagógica.',
      hasDifficulties: false,
      difficultiesDetails: 'Durante as atividades desenvolvidas no mês de referência, não foram observadas ocorrências ou empecilhos de ordem pedagógica ou estrutural.',
      achievedResults: 'Constância de participação dos alunos, evolução técnica individual e cumprimento integral do cronograma pedagógico.',
      
      selectedRehearsalPhotos: JSON.stringify(photos.map((p) => p.id)),
      selectedEventPhotos: JSON.stringify([eventPhoto1.id, eventPhoto2.id]),
      status: 'SUBMITTED',
    },
  });

  console.log('✅ Banco populado com sucesso com dados fictícios para o relatório!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
