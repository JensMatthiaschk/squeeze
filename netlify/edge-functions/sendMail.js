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
    <b><u>Dateiname:</u></b> <span>${emailContent.filename}</span>\n
    <br>\n
    <b><u>genutzte Token bei Abfrage:</u></b> <span>${emailContent.usedToken}</span>\n
    <br>\n
    <b><u>gesamte Länge der Abfrage:</u></b> <span>${emailContent.textLength}</span>\n
    <br>\n
    <b><u>Anzahl der Abfragen/Chunks:</u></b> <span>${emailContent.requests}</span>\n
    <br>\n
    <b><u>Modell:</u></b> <span>${emailContent.model}</span>\n
    `;

    try {
        const res = await client.send({
            from: "squeeze@noreply.com",
            to: Netlify.env.get("RECEIVING_EMAIL_ADDRESS"),
            subject: "Squeeze Log " + new Date().toLocaleDateString('DE-de') + " " + new Date().toLocaleTimeString('DE-de'),
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