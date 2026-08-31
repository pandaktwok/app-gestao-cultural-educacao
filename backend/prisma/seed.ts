import { runSeed } from '../src/services/seedService';

async function main() {
  try {
    await runSeed();
  } catch (e) {
    console.error('❌ Erro durante o seed do ambiente de testes:', e);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  main();
}
