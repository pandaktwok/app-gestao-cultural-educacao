import app from './app.js';
import { ENV } from './config/env.js';
import { seedAdminIfEmpty } from './controllers/authController.js';

app.listen(ENV.PORT, async () => {
  console.log(`🚀 Servidor Backend executando na porta ${ENV.PORT}`);
  await seedAdminIfEmpty();
});
