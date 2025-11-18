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
  console.log("Executado em:", hoje.toISOString());

  const snapshot = await db.collection("processos").get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const vencimento = data.dataTimestamp?.toDate?.();
    const token = data.token;

    if (!vencimento || !token) continue;

    const diffDias = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
    const status = data.notificacaoStatus || 0;
    const abriuApp = data.abriuApp || false;

    // ✅ se o cliente abriu o app → para tudo
    if (abriuApp) {
      console.log(`Cliente abriu o app. Não notificar ${data.numero}`);
      continue;
    }

    if (diffDias > 10) continue;

    let message = "";
    let nextStatus = status;

    if (status === 0) {
      message = `Primeiro aviso: o processo "${data.numero}" vence em ${diffDias} dias.`;
      nextStatus = 1;
    } else if (status === 1) {
      message = `Segundo aviso: o processo "${data.numero}" ainda está pendente.`;
      nextStatus = 2;
    } else if (status === 2) {
      message = `Atenção! Terceiro aviso: "${data.numero}" está quase vencendo!`;
      nextStatus = 3;
    } else {
      continue; // já enviou 3 notificações
    }

    try {
      await admin.messaging().send({
        token,
        notification: {
          title: "Aviso importante",
          body: message,
        },
      });

      await doc.ref.update({ notificacaoStatus: nextStatus });

      console.log(`✅ Notificação enviada (${nextStatus}) para ${data.numero}`);

    } catch (e) {
      console.error("Erro ao notificar:", e);
    }
  }
}

main().catch(console.error);
