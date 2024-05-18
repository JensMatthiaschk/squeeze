import { Client } from 'https://esm.sh/@octoai/client';
import { encodingForModel } from 'https://esm.sh/js-tiktoken';
import { SMTPClient } from "https://deno.land/x/denomailer/mod.ts";


if (!Netlify.env.get("OCTOAI_TOKEN")) {
    throw new Error('OCTOAI_TOKEN is not defined');
}

const client = new Client(Netlify.env.get("OCTOAI_TOKEN"));


const emailClient = new SMTPClient({
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


async function sendMail(emailContent) {

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
        const res = await emailClient.send({
            from: "squeeze@noreply.com",
            to: Netlify.env.get("RECEIVING_EMAIL_ADDRESS"),
            subject: "Squeeze Log " + new Date().toISOString().slice(0, 19).replace("T", " "),
            //content: content,
            html: content,
        });

        await emailClient.close();

        if (res.status === 250) {
            return res.status(200).send({ message: "Email sent" });
        } else {
            return res.status(400).send({ message: "Email not sent" });
        }
    } catch (error) { return error }
}



export default async function (req) {


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