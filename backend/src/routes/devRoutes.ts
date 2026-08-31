import { Router } from 'express';
import { runSeed } from '../services/seedService.js';

const router = Router();

// Endpoint para resetar e repovoar o banco de dados via API ou botão de DEV
router.all('/seed', async (req, res) => {
  try {
    await runSeed();
    return res.json({
      success: true,
      message: 'Ambiente de testes reseedado e repovoado com sucesso!',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Erro ao repovoar ambiente de testes:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao executar o seed do ambiente de testes',
      details: error.message,
    });
  }
});

export default router;
