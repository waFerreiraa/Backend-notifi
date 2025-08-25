import express from "express";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";

dotenv.config();

// Configuração do Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = getFirestore();
const app = express();
const PORT = process.env.PORT || 3000;

// Função que processa os processos
async function verificarProcessos() {
  const hoje = new Date();
  console.log("Iniciando verificação de processos em:", hoje.toISOString());

  const snapshot = await db.collection("processos").get();
  let notificados = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const vencimento = data.dataTimestamp?.toDate?.();
    const notificado = data.notificado;
    const token = data.token;
    const numero = data.numero || data.titulo || "Sem número";

    if (!vencimento || !token || notificado) continue;

    const diffDias = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
    if (diffDias <= 10) {
      await admin.messaging().send({
        token,
        notification: {
          title: `⚠️ Processo próximo do vencimento`, // pode adicionar emojis ou prefixos
          body: `O processo "${numero}" vence em ${diffDias} dias.`,
        },
        android: {
          notification: {
            color: "#722F37", // cor da barra de notificação
            click_action: "OPEN_PROCESS", // ação ao clicar (app precisa tratar)
            // small_icon: "ic_stat_notification" -> só funciona se já existir no app
          },
        },
        apns: {
          payload: {
            aps: {
              badge: 1, // número no ícone do app
              sound: "default", // som padrão ou customizado (app precisa ter)
            },
          },
        },
        data: {
          numero_processo: numero, // dados extras que o app pode ler
          diff_dias: diffDias.toString(),
        },
      });

      await doc.ref.update({ notificado: true });
      notificados++;
      console.log(`✅ Notificação enviada: ${numero}`);
    } else {
      console.log(
        `Pulando processo ${numero} - vencimento em ${diffDias} dias`
      );
    }
  }

  return notificados;
}

// Endpoint para cron-job.org
app.get("/api/cron", async (req, res) => {
  try {
    const notificados = await verificarProcessos();
    res
      .status(200)
      .send(`Execução concluída. Processos notificados: ${notificados}`);
  } catch (error) {
    console.error("Erro ao processar processos:", error);
    res.status(500).send("Erro ao processar os processos.");
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// Executar localmente ao rodar node server.js
if (import.meta.url === `file://${process.argv[1]}`) {
  verificarProcessos()
    .then((notificados) =>
      console.log(
        `Execução local concluída. Processos notificados: ${notificados}`
      )
    )
    .catch(console.error);
}
