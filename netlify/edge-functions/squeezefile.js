import { Client } from 'https://esm.sh/@octoai/client';
import { encodingForModel } from 'https://esm.sh/js-tiktoken';
// import { SMTPClient } from "https://deno.land/x/denomailer/mod.ts";
import nodemailer from 'https://esm.sh/nodemailer';
import { google } from 'npm:googleapis';
const OAuth2 = google.auth.OAuth2;


if (!Netlify.env.get("OCTOAI_TOKEN")) {
    throw new Error('OCTOAI_TOKEN is not defined');
}

const client = new Client(Netlify.env.get("OCTOAI_TOKEN"));


async function sendMail(emailContent) {

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
    
    const accessToken = oauth2Client.getAccessToken()
    
    
    const smtpTransportOptions = {
        //host: Netlify.env.get("SMTP_HOST"),
        service: Netlify.env.get('SMTP_SERVICE'),
        auth: {
            type: "OAuth2",
            user: Netlify.env.get("SMTP_USER"),
            accessToken: accessToken.toString(),
            clientId: Netlify.env.get('OAUTH_CLIENT_ID'),
            clientSecret: Netlify.env.get('OAUTH_CLIENT_SECRET'),
            refreshToken: Netlify.env.get('OAUTH_REFRESH_TOKEN'),
            //pass: Netlify.env.get("SMTP_PASS"),
        },
        // tls: {
        //     ciphers: "SSLv3",
        // },
        // port: 465,
        // secure: true,
    };
    
    const transporter = nodemailer.createTransport(smtpTransportOptions);

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
    };


    try {
        const info = await transporter.sendMail(mailOptions);

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



export default async function squeezefile (req) {


    if (req.method !== 'POST') {
        return Response.json({
            error: 'Method not allowed',
        }, {
            status: 405,
        });
    }

    const { text, summaryMax, model, filename } = await req.json();
    const tokenMax = parseInt(Netlify.env.get("OCTOAI_MAXTOKENS"));
    const prompt = "Summarize the following text into " + summaryMax + " sentences simple to understand: " + text;
    const encoding = encodingForModel("gpt-4-turbo-preview");
    const tokens = encoding.encode(prompt).length;
    const faktor = Math.ceil(tokens / tokenMax);
    let parts = [];
    let presummary = "";


    if (faktor > 1) {
        try {
            const partLength = Math.ceil(text.length / faktor);
            for (let i = 0; i < faktor; i++) {
                parts.push(text.slice(i * partLength, (i + 1) * partLength));
            }

            for (let i = 0; i < parts.length - 1; i++) {

                const completion = await client.chat.completions.create({
                    'model': model,
                    'messages': [
                        {
                            'role': 'system',
                            'content': "Summarize the following text: " + parts[i],
                        },
                    ],
                });


                if (completion.choices[0].message.content) {
                    presummary = presummary + ' ' + completion.choices[0].message.content
                }
            }


            const completion = await client.chat.completions.create({
                'model': model,
                'messages': [
                    {
                        'role': 'system',
                        'content': "Summarize the following text into " + summaryMax + " sentences and simple to understand: " + presummary + ' ' + parts[parts.length - 1],
                    },
                ],
            });

            if (completion.choices[0].message.content) {
                sendMail({
                    usedToken: tokens,
                    textLength: prompt.length,
                    model: model,
                    filename: filename,
                    requests: faktor
                })
                return Response.json({
                    success: true,
                    summary: completion.choices[0].message.content
                });
            } else {
                return Response.json({
                    success: false,
                    error: "No summary"
                });
            }
        } catch (error) {
            return Response.json({
                success: false,
                error: error
            });
        }

    } else {
        try {

            const completion = await client.chat.completions.create({

                'model': model,
                'messages': [
                    {
                        'role': 'system',
                        'content': "Summarize the following text into " + summaryMax + " sentences and simple to understand: " + text,
                    },
                ],
            });

            if (completion.choices[0].message.content) {
                sendMail({
                    usedToken: tokens,
                    textLength: prompt.length,
                    model: model,
                    filename: filename,
                    requests: faktor
                })
                return Response.json({
                    success: true,
                    summary: completion.choices[0].message.content
                });
            } else {
                return Response.json({
                    success: false,
                    error: "No summary"
                });
            }

        } catch (error) {
            return Response.json({
                success: false,
                error: error
            });
        }
    }
}

export const config = {
    path: "/squeezefile",
};