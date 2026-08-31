import { db } from './db';
import { api, isOnline } from './api';

export async function populateTestEnvironment(): Promise<{ success: boolean; message: string }> {
  console.log('⚡ Iniciando execução da Skill seed_test_environment...');

  try {
    // 1. Truncar / Limpar tabelas do IndexedDB local (Dexie)
    if (typeof window !== 'undefined' && db) {
      await Promise.all([
        db.pendingAttendance.clear(),
        db.pendingPhotos.clear(),
        db.pendingEvents.clear(),
        db.offlineStudents.clear(),
      ]);
      console.log('🧹 IndexedDB truncado com sucesso.');

      // 2. Limpar chaves de sessão e visitas no localStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith('visit_started_') ||
            key.startsWith('visit_completed_') ||
            key.startsWith('visit_ended_time_'))
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));

      // 3. Configurar flag de ambiente dev sem bloqueios de 24h
      localStorage.setItem('dev_disable_24h_lock', 'true');
      console.log('⚙️ Flag dev_disable_24h_lock ativada (Navegação sem bloqueio de 24h).');
    }

    // 4. Invocar endpoint do backend para repovoar SQLite/Prisma
    if (isOnline()) {
      const response = await api.post('/dev/seed');
      console.log('✅ Banco backend reseedado:', response.data);
    }

    return {
      success: true,
      message: 'Ambiente de testes reseedado e repovoado com sucesso!',
    };
  } catch (error: any) {
    console.error('❌ Erro durante seed_test_environment:', error);
    return {
      success: false,
      message: error.response?.data?.error || error.message || 'Falha ao reseedar ambiente de teste.',
    };
  }
}
