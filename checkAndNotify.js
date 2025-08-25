import admin from 'firebase-admin';
import serviceAccount from './firebase-key.json' assert { type: 'json' };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const enviarNotificacao = async (token, titulo, corpo) => {
  try {
    await admin.messaging().send({
      token: token,
      notification: {
        title: titulo,
        body: corpo,
      },
    });
    console.log(`Notificação enviada para ${token}`);
  } catch (err) {
    console.error('Erro ao enviar notificação:', err);
  }
};

const tokenTeste = 'SEU_TOKEN_DO_DISPOSITIVO_AQUI';

enviarNotificacao(tokenTeste, 'Teste Notificação', 'Essa é uma notificação de teste do backend')
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
