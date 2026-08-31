"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSeed = runSeed;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function runSeed() {
    console.log('🌱 Truncando/Limpando banco de dados para o ambiente de testes...');
    // Limpar tabelas existentes respeitando a integridade referencial (FKs)
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
    console.log('👤 Criando Administrador Padrão e Professores...');
    const passwordAdmin = await bcryptjs_1.default.hash('admin123', 10);
    const passwordTeacher = await bcryptjs_1.default.hash('prof123', 10);
    // 2.1. Administrador Padrão
    const admin = await prisma.user.create({
        data: {
            name: 'Coordenação Geral',
            email: 'admin@projetocultural.org.br',
            cpf: '000.000.000-00',
            phone: '(48) 99999-0000',
            password: passwordAdmin,
            role: 'ADMIN',
            mustChangePassword: false,
            avatarColor: '#4A90E2',
            initialAvatar: 'CG',
        },
    });
    // 2.2. Professores Cadastrados
    // Professor 1
    const teacher1 = await prisma.user.create({
        data: {
            name: 'Marcos Vinicius Firmino Ferreira',
            email: 'marcos.musica@projetocultural.org.br',
            cpf: '111.222.333-44',
            phone: '(48) 98888-1111',
            password: passwordTeacher,
            role: 'TEACHER',
            mustChangePassword: false,
            avatarColor: '#3D8A7E',
            initialAvatar: 'MF',
        },
    });
    // Professor 2
    const teacher2 = await prisma.user.create({
        data: {
            name: 'Mirella Sombrio',
            email: 'mirella.danca@projetocultural.org.br',
            cpf: '555.666.777-88',
            phone: '(48) 98888-2222',
            password: passwordTeacher,
            role: 'TEACHER',
            mustChangePassword: false,
            avatarColor: '#FF85A1',
            initialAvatar: 'MS',
        },
    });
    console.log('🏫 Criando Escolas Cadastradas...');
    // 2.3. Escolas Cadastradas
    // Escola 1: EMEB José Rosso
    const school1 = await prisma.school.create({
        data: {
            name: 'EMEB José Rosso',
            boardName: 'Secretaria Municipal de Educação',
            directorName: 'Simone Scotti dos Santos',
            phone: '(48) 3431-1001',
            email: 'emeb.joserosso@educacao.sc.gov.br',
            address: 'Rua Principal, 100 - Bairro Quarta Linha, Criciúma/SC',
            themeColor: '#3D8A7E',
            initialAvatar: 'JR',
        },
    });
    // Escola 2: EMEB Ludovico Coccolo
    const school2 = await prisma.school.create({
        data: {
            name: 'EMEB Ludovico Coccolo',
            boardName: 'Secretaria Municipal de Educação',
            directorName: 'Silvana Bento Marcineiro',
            phone: '(48) 3431-1002',
            email: 'emeb.ludovicococcolo@educacao.sc.gov.br',
            address: 'Av. Central, 500 - Bairro São Luiz, Criciúma/SC',
            themeColor: '#8F94FB',
            initialAvatar: 'LC',
        },
    });
    // Escola 3: Colégio Municipal Santos Dumont
    const school3 = await prisma.school.create({
        data: {
            name: 'Colégio Municipal Santos Dumont',
            boardName: 'Secretaria Municipal de Educação',
            directorName: 'Regina Maria da Silva',
            phone: '(48) 3431-1003',
            email: 'colegio.santosdumont@educacao.sc.gov.br',
            address: 'Rua Santos Dumont, 200 - Centro, Criciúma/SC',
            themeColor: '#FFB074',
            initialAvatar: 'SD',
        },
    });
    console.log('🔗 Vinculando Professores às Escolas...');
    // Marcos: EMEB José Rosso e EMEB Ludovico Coccolo
    // Mirella: Colégio Municipal Santos Dumont
    await prisma.teacherSchool.createMany({
        data: [
            { teacherId: teacher1.id, schoolId: school1.id },
            { teacherId: teacher1.id, schoolId: school2.id },
            { teacherId: teacher2.id, schoolId: school3.id },
        ],
    });
    console.log('👨‍🎓 Cadastrando Alunos nas Escolas...');
    // Alunos EMEB José Rosso (10 alunos)
    const studentsSchool1Data = [
        { name: 'Arthur Meireles', age: 11, gender: 'M', status: 'ACTIVE' },
        { name: 'Beatriz Lima', age: 10, gender: 'F', status: 'ACTIVE' },
        { name: 'Caio Silva', age: 12, gender: 'M', status: 'ACTIVE' },
        { name: 'Davi Santos', age: 11, gender: 'M', status: 'ACTIVE' },
        { name: 'Enzo Gabriel', age: 10, gender: 'M', status: 'ACTIVE' },
        { name: 'Fernanda Rocha', age: 12, gender: 'F', status: 'ACTIVE' },
        { name: 'Gabriel Souza', age: 11, gender: 'M', status: 'ACTIVE' },
        { name: 'Helena Costa', age: 10, gender: 'F', status: 'ACTIVE' }, // Alerta Amarelo: 2 Faltas Consecutivas
        { name: 'Igor Martins', age: 11, gender: 'M', status: 'ACTIVE' }, // Alerta Amarelo: 3 Faltas Consecutivas
        { name: 'Julia Silveira', age: 12, gender: 'F', status: 'DROPOUT', dropoutDate: new Date('2026-06-10T00:00:00Z') }, // Desistente - Data de Corte: 10/06/2026
    ];
    const studentsSchool1Map = new Map();
    for (const sData of studentsSchool1Data) {
        const s = await prisma.student.create({
            data: { ...sData, schoolId: school1.id },
        });
        studentsSchool1Map.set(s.name, s);
    }
    // Alunos EMEB Ludovico Coccolo (8 alunos)
    const studentsSchool2Data = [
        { name: 'Lucas Andrade', age: 11, gender: 'M', status: 'ACTIVE' },
        { name: 'Mariana Alves', age: 10, gender: 'F', status: 'ACTIVE' },
        { name: 'Nicolas Freitas', age: 12, gender: 'M', status: 'ACTIVE' },
        { name: 'Olivia Nunes', age: 11, gender: 'F', status: 'ACTIVE' },
        { name: 'Pedro Henrique', age: 12, gender: 'M', status: 'ACTIVE' },
        { name: 'Rafaela Dias', age: 10, gender: 'F', status: 'ACTIVE' }, // Alerta Amarelo: 2 Faltas Consecutivas
        { name: 'Samuel Reis', age: 11, gender: 'M', status: 'ACTIVE' },
        { name: 'Thiago Pereira', age: 12, gender: 'M', status: 'DROPOUT', dropoutDate: new Date('2026-07-05T00:00:00Z') }, // Desistente - Data de Corte: 05/07/2026
    ];
    const studentsSchool2Map = new Map();
    for (const sData of studentsSchool2Data) {
        const s = await prisma.student.create({
            data: { ...sData, schoolId: school2.id },
        });
        studentsSchool2Map.set(s.name, s);
    }
    // Alunos Colégio Municipal Santos Dumont (5 alunos para testes da Profa. Mirella)
    const studentsSchool3Data = [
        { name: 'Alice Mendes', age: 11, gender: 'F', status: 'ACTIVE' },
        { name: 'Bernardo Castro', age: 10, gender: 'M', status: 'ACTIVE' },
        { name: 'Clara Farias', age: 12, gender: 'F', status: 'ACTIVE' },
        { name: 'Diego Ramos', age: 11, gender: 'M', status: 'ACTIVE' },
        { name: 'Eduarda Viana', age: 10, gender: 'F', status: 'ACTIVE' },
    ];
    for (const sData of studentsSchool3Data) {
        await prisma.student.create({
            data: { ...sData, schoolId: school3.id },
        });
    }
    console.log('📅 Criando Histórico de Visitas, Chamadas e Fotos Simuladas...');
    // Mock URLs de fotos realistas
    const mockPhotoUrls = [
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1507838153414-b4b713384a76?auto=format&fit=crop&w=800&q=80',
    ];
    // 2.4. Registros da EMEB José Rosso (Professor Marcos)
    const visitsSchool1 = [
        { date: new Date('2026-06-24T13:15:00Z'), category: 'Ensaio', countPresent: 33 },
        { date: new Date('2026-07-08T13:10:00Z'), category: 'Ensaio', countPresent: 41 },
        { date: new Date('2026-07-15T09:15:00Z'), category: 'Reforço', countPresent: 49 },
        { date: new Date('2026-07-22T13:15:00Z'), category: 'Reposição', countPresent: 35 },
    ];
    const rehearsalPhotosSchool1 = [];
    for (let idx = 0; idx < visitsSchool1.length; idx++) {
        const v = visitsSchool1[idx];
        const session = await prisma.attendanceSession.create({
            data: {
                date: v.date,
                type: 'MANUAL',
                category: v.category,
                schoolId: school1.id,
                teacherId: teacher1.id,
                countPresent: v.countPresent,
                countAbsent: idx >= 1 ? 2 : 1,
            },
        });
        // Registros de Presença individuais dos 10 alunos
        for (const [studentName, studentObj] of studentsSchool1Map.entries()) {
            if (studentObj.status === 'DROPOUT')
                continue; // Julia Silveira desistente em 10/06
            let isPresent = true;
            let justification = null;
            // Helena Costa: 2 faltas consecutivas nas visitas 3 (15/07) e 4 (22/07)
            if (studentName === 'Helena Costa' && (idx === 2 || idx === 3)) {
                isPresent = false;
                justification = 'Falta não justificada';
            }
            // Igor Martins: 3 faltas consecutivas nas visitas 2 (08/07), 3 (15/07) e 4 (22/07)
            if (studentName === 'Igor Martins' && (idx === 1 || idx === 2 || idx === 3)) {
                isPresent = false;
                justification = 'Ausência consecutiva registrada';
            }
            await prisma.attendanceRecord.create({
                data: {
                    attendanceSessionId: session.id,
                    studentId: studentObj.id,
                    isPresent,
                    justification,
                },
            });
        }
        // Foto de ensaio vinculada
        const photo = await prisma.rehearsalPhoto.create({
            data: {
                date: v.date,
                originalTimestamp: v.date,
                photoUrl: mockPhotoUrls[idx % mockPhotoUrls.length],
                schoolId: school1.id,
                teacherId: teacher1.id,
            },
        });
        rehearsalPhotosSchool1.push(photo);
    }
    // 2.4. Registros da EMEB Ludovico Coccolo (Professor Marcos)
    const visitsSchool2 = [
        { date: new Date('2026-07-02T14:00:00Z'), category: 'Ensaio', countPresent: 20 },
        { date: new Date('2026-07-06T15:00:00Z'), category: 'Ensaio', countPresent: 23 },
        { date: new Date('2026-07-07T09:10:00Z'), category: 'Ensaio', countPresent: 27 },
        { date: new Date('2026-07-13T15:00:00Z'), category: 'Ensaio', countPresent: 26 },
    ];
    for (let idx = 0; idx < visitsSchool2.length; idx++) {
        const v = visitsSchool2[idx];
        const session = await prisma.attendanceSession.create({
            data: {
                date: v.date,
                type: 'MANUAL',
                category: v.category,
                schoolId: school2.id,
                teacherId: teacher1.id,
                countPresent: v.countPresent,
                countAbsent: idx >= 2 ? 1 : 0,
            },
        });
        // Registros de Presença individuais dos alunos da EMEB Ludovico Coccolo
        for (const [studentName, studentObj] of studentsSchool2Map.entries()) {
            if (studentObj.status === 'DROPOUT' && v.date > new Date('2026-07-05T00:00:00Z'))
                continue; // Thiago Pereira desistente em 05/07
            let isPresent = true;
            let justification = null;
            // Rafaela Dias: 2 faltas consecutivas nas visitas 3 (07/07) e 4 (13/07)
            if (studentName === 'Rafaela Dias' && (idx === 2 || idx === 3)) {
                isPresent = false;
                justification = 'Atestado / Falta sem aviso';
            }
            await prisma.attendanceRecord.create({
                data: {
                    attendanceSessionId: session.id,
                    studentId: studentObj.id,
                    isPresent,
                    justification,
                },
            });
        }
        // Foto de ensaio simulada
        await prisma.rehearsalPhoto.create({
            data: {
                date: v.date,
                originalTimestamp: v.date,
                photoUrl: mockPhotoUrls[(idx + 1) % mockPhotoUrls.length],
                schoolId: school2.id,
                teacherId: teacher1.id,
            },
        });
    }
    console.log('🎪 Cadastrando Eventos Simulados...');
    // 2.5. Evento 1 (Multi-Escolas): Desfile Cívico Municipal
    // Vinculado a EMEB José Rosso e EMEB Ludovico Coccolo (0 fotos anexadas = Pendente de foto / Laranja)
    const event1Date = new Date('2026-09-07T09:00:00Z');
    await prisma.eventSession.create({
        data: {
            name: 'Desfile Cívico Municipal',
            date: event1Date,
            locationAddress: 'Rua da Gente, Centro, Criciúma/SC',
            schoolId: school1.id,
            teacherId: teacher1.id,
        },
    });
    await prisma.eventSession.create({
        data: {
            name: 'Desfile Cívico Municipal',
            date: event1Date,
            locationAddress: 'Rua da Gente, Centro, Criciúma/SC',
            schoolId: school2.id,
            teacherId: teacher1.id,
        },
    });
    // 2.5. Evento 2 (Escola Individual): Apresentação Dia das Mães
    // Vinculado a EMEB José Rosso (1 foto anexada = Concluído / Verde)
    const event2Date = new Date('2026-05-10T14:00:00Z');
    const event2Session = await prisma.eventSession.create({
        data: {
            name: 'Apresentação Dia das Mães',
            date: event2Date,
            locationAddress: 'Pátio da EMEB José Rosso',
            schoolId: school1.id,
            teacherId: teacher1.id,
        },
    });
    const event2Photo = await prisma.eventPhoto.create({
        data: {
            eventSessionId: event2Session.id,
            photoUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
        },
    });
    console.log('⚠️ Configurando Cenário de Teste de Questionamento (Banner Amarelo)...');
    // 2.6. Relatório Mensal de Junho/Julho da EMEB José Rosso com Pergunta 4 Questionada pelo Admin
    const adminFeedbackData = [
        {
            fieldKey: 'monitoringEvaluation',
            comment: 'Favor especificar quais critérios foram usados para o remanejamento dos alunos suspensos.',
            createdAt: new Date('2026-07-25T10:00:00Z').toISOString(),
            status: 'PENDING_REVISION',
        },
    ];
    await prisma.monthlyReport.create({
        data: {
            monthYear: '07_2026',
            schoolId: school1.id,
            teacherId: teacher1.id,
            projectTitle: 'Projeto Cultural & Arte nas Escolas',
            grantorName: 'Secretaria Municipal de Cultura e Educação',
            fundingAgreementNo: 'Termo de Fomento nº 012/2026',
            responsibleName: 'Coordenação Geral',
            referenceMonthLabel: 'Junho/Julho',
            locationCityDate: 'Criciúma - SC, 25/07/2026',
            activitiesFocus: 'Aprimoramento da afinação vocal, postura cênica e sincronia rítmica dos alunos para apresentações municipais.',
            eventPublicCounts: JSON.stringify({ [event2Session.id]: 180 }),
            impactIndicators: 'Forte adesão dos alunos com evolução notável na percepção rítmica e presença constante dos responsáveis nos ensaios abertos.',
            monitoringEvaluation: 'Acompanhamento diário via chamada presencial no app. Alunos com faltas consecutivas receberam contato direto com a coordenação pedagógica.',
            hasDifficulties: false,
            difficultiesDetails: 'Durante as atividades desenvolvidas no mês de referência, não foram observadas ocorrências ou empecilhos de ordem pedagógica ou estrutural.',
            achievedResults: 'Manutenção do engajamento dos alunos e cumprimento integral das metas acordadas.',
            selectedRehearsalPhotos: JSON.stringify(rehearsalPhotosSchool1.map((p) => p.id)),
            selectedEventPhotos: JSON.stringify([event2Photo.id]),
            adminFeedback: JSON.stringify(adminFeedbackData),
            status: 'REVISION_REQUESTED', // Ativa o Banner Amarelo (⚠️ Revisão Necessária)
        },
    });
    console.log('✅ Ecossistema de testes semeado com sucesso!');
}
async function main() {
    try {
        await runSeed();
    }
    catch (e) {
        console.error('❌ Erro durante o seed do ambiente de testes:', e);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
if (process.env.NODE_ENV !== 'test' && require.main === module) {
    main();
}
