import nodemailer from 'https://esm.sh/nodemailer';
import { google } from 'https://esm.sh/googleapis';
const OAuth2 = google.auth.OAuth2;



export default async function sendMail(emailContent) {
    console.log("sendmail...");

    // const emailClient = new SMTPClient({
    //     connection: {
    //         hostname: Netlify.env.get("SMTP_HOST"),
    //         port: 465,
    //         secure: false,
    //         tls: true,
    //         auth: {
    //             username: Netlify.env.get("SMTP_USER"),
    //             password: Netlify.env.get("SMTP_PASS")
    //         },
    //     },
    // });

    const oauth2Client = new OAuth2(
        Netlify.env.get('OAUTH_CLIENT_ID'),
        Netlify.env.get('OAUTH_CLIENT_SECRET'),
        'https://developers.google.com/oauthplayground'
    );

    oauth2Client.setCredentials({
        refresh_token: Netlify.env.get('OAUTH_REFRESH_TOKEN')
    });

    // const accessToken = oauth2Client.getAccessToken()
    const accessToken = await new Promise((resolve, reject) => {
        oauth2Client.getAccessToken((err, token) => {
            if (err) {
                reject("Failed to create access token :(");
            }
            resolve(token);
        });
    });


    const smtpTransportOptions = {
        host: Netlify.env.get("SMTP_HOST"),
        port: 465,
        secure: true,
        service: Netlify.env.get('SMTP_SERVICE'),
        auth: {
            type: "OAuth2",
            clientId: Netlify.env.get('OAUTH_CLIENT_ID'),
            clientSecret: Netlify.env.get('OAUTH_CLIENT_SECRET'),
            //user: Netlify.env.get("SMTP_USER"),
            //pass: Netlify.env.get("SMTP_PASS"),
        },
        tls: {
            ciphers: "SSLv3",
        },
    };



    const transporter = await nodemailer.createTransport(smtpTransportOptions);

    const content = `
    <h3>Datei wurde erfolgreich verarbeitet:</h3>\n
    <br>\n
    <b>Dateiname:</b> <span>${emailContent.filename}</span>\n
    <br>\n
    <b>genutzte Token bei Abfrage:</b> <span>${emailContent.usedToken}</span>\n
    <br>\n
    <b>gesamte Länge der Abfrage:</b> <span>${emailContent.textLength}</span>\n
    <br>\n
    <b>Anzahl der Abfragen/Chunks:</b> <span>${emailContent.requests}</span>\n
    <br>\n
    <b>Modell:</b> <span>${emailContent.model}</span>\n
    `;

    const mailOptions = {
        from: Netlify.env.get('SMTP_USER'),
        to: Netlify.env.get('RECEIVING_EMAIL_ADDRESS'),
        subject: "Squeeze Log - " + new Date().toLocaleDateString('de-DE') + " " + new Date().toLocaleTimeString('de-DE'),
        html: content,
        auth: {
            user: Netlify.env.get("SMTP_USER"),
            accessToken: accessToken.toString(),
            refreshToken: Netlify.env.get('OAUTH_REFRESH_TOKEN'),
        }
    };


    try {
        console.log("try Sending email...")
        const info = await new Promise((resolve, reject) => {
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.error(err);
                    reject(err);
                } else {
                    resolve(info);
                }
            });
        });
        console.log("Message sent: %s", info.response);

        if (info.response.includes("250")) {
            return res.status(200).send({ message: "Email sent" });
        } else {
            return res.status(400).send({ message: "Email not sent" });
        }

        // const res = await emailClient.send({
        //     from: "squeeze@noreply.com",
        //     to: Netlify.env.get("RECEIVING_EMAIL_ADDRESS"),
        //     subject: "Squeeze Log - " + new Date().toLocaleDateString('de-DE') + " " + new Date().toLocaleTimeString('de-DE'),
        //     //content: content,
        //     html: content,
        // });

        // await emailClient.close();

        // if (res.status === 250) {
        //     return res.status(200).send({ message: "Email sent" });
        // } else {
        //     return res.status(400).send({ message: "Email not sent" });
        // }
    } catch (error) { return error }
}

export const config = {
    path: "/sendMail",
};