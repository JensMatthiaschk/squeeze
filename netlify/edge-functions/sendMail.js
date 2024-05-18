import { SMTPClient } from "https://deno.land/x/denomailer/mod.ts";

const client = new SMTPClient({
    connection: {
        hostname: Netlify.env.get("SMTP_HOST"),
        port: 465,
        tls: true,
        auth: {
            username: Netlify.env.get("SMTP_USER"),
            password: Netlify.env.get("SMTP_PASS")
        },
    },
});


export default async function sendMail(emailContent) {

    const content = `
    <h3>Datei wurde erfolgreich verarbeitet:</h3>\n
    <br>\n
    <h4><u>Dateiname:</u></h4> <p>${emailContent.filename}</p>\n
    <br>\n
    <h4><u>genutzte Token bei Abfrage:</u></h4> <p>${emailContent.usedToken}</p>\n
    <br>\n
    <h4><u>gesamte Länge der Abfrage:</u></h4> <p>${emailContent.textLength}</p>\n
    <br>\n
    <h4><u>Anzahl der Abfragen/Chunks:</u></h4> <p>${emailContent.faktor}</p>\n
    <br>\n
    <h4><u>Modell:</u></h4> <p>${emailContent.model}</p>\n
    `;

    try {
        const res = await client.send({
            from: "squeeze@noreply.com",
            to: Netlify.env.get("RECEIVING_EMAIL_ADDRESS"),
            subject: "Squeeze Log " + new Date().toISOString().slice(0, 19).replace("T", " "),
            //content: content,
            html: content,
        });

        await client.close();

        if (res.status === 250) {
            return res.status(200).send({ message: "Email sent" });
        } else {
            return res.status(400).send({ message: "Email not sent" });
        }
    } catch (error) { return error }
}


export const config = {
    path: "/sendmail",
};