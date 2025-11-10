import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";
dotenv.config();


async function main() {
  const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
  
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  const db = getFirestore();
  const hoje = new Date();
  console.log("Iniciando verificação de processos em:", hoje.toISOString());

  const snapshot = await db.collection("processos").get();
  console.log(`Encontrados ${snapshot.size} processos no total.`);

  let notificados = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const vencimento = data.dataTimestamp?.toDate?.();
    const notificado = data.notificado;
    const token = data.token;
    const numero = data.numero || data.titulo || "Sem número";

    if (!vencimento || !token) {
      console.log(
        `Pulando processo ${doc.id} - faltam dados (dataTimestamp ou token)`
      );
      continue;
    }

    if (notificado) {
      console.log(`Pulando processo ${doc.id} - já notificado.`);
      continue;
    }

    const diffDias = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
    console.log(`Processo "${numero}" vence em ${diffDias} dias.`);

    if (diffDias <= 10) {
      try {
        await admin.messaging().send({
          token,
          notification: {
            title: "Processo próximo do vencimento",
            body: `O processo "${numero}" vence em ${diffDias} dias.`,
          },
          android: {
            notification: {
              icon: "ic_stat_notification",
              color: "#1976D2",
            },
          },
        });

        await doc.ref.update({ notificado: true });
        console.log(`✅ Notificação enviada para: ${numero}`);
        notificados++;
      } catch (error) {
        console.error("Erro ao enviar notificação:", error);
      }
    }
  }

  if (notificados === 0) {
    console.log(
      "Nenhuma notificação enviada. Nenhum processo com vencimento em 7 dias."
    );
  }
}

main().catch(console.error);