import { encodingForModel } from 'https://esm.sh/js-tiktoken';
import sgMail from 'https://esm.sh/@sendgrid/mail';

if (!Deno.env.get("OCTOAI_TOKEN")) {
    throw new Error('OCTOAI_TOKEN is not defined');
}

type emailContent = {
    usedToken: number,
    textLength: number,
    model: string,
    filename: string,
    requests: number,
    summary: string
}



function sendMail(emailContent: emailContent) {

    const content = `
    <h3>Datei wurde erfolgreich verarbeitet:</h3>\n
    <br>\n
    <b>Dateiname:</b> <span>${emailContent.filename}</span>\n
    <br>\n
    <b>genutzte Token bei Abfrage:</b> <span>${emailContent.usedToken}</span>\n
    <br>\n
    <b>gesamte Anzahl der Zeichen des Textes:</b> <span>${emailContent.textLength}</span>\n
    <br>\n
    <b>Anzahl der Abfragen/Chunks:</b> <span>${emailContent.requests}</span>\n
    <br>\n
    <b>Modell:</b> <span>${emailContent.model}</span>\n
    <br>\n
    <b>Summary:</b> <span>${emailContent.summary}</span>\n
    `;


    try {

        sgMail.setApiKey(Deno.env.get("SENDGRID_API_KEY"));
        const msg = {
            to: Deno.env.get('RECEIVING_EMAIL_ADDRESS'),
            from: Deno.env.get('SMTP_USER'),
            subject: "Squeeze Log - " + new Date().toLocaleDateString('de-DE') + " " + new Date().toLocaleTimeString('de-DE'),
            // text: 'and easy to do anywhere, even with Node.js',
            html: content,
        }
        sgMail
            .send(msg)
            .then(() => {
                console.log('Log-Email sent')
            })
            .catch((error: any) => {
                console.error(error)
            })

    } catch (error) { return error }
}



export default async function squeezefile(req: Request) {


    if (req.method !== 'POST') {
        return Response.json({
            error: 'Method not allowed',
        }, {
            status: 405,
        });
    }

    const { text, summaryMax, model, filename } = await req.json();
    let api;
    let bearer;
    let tokenMax;
    if (model.includes("gpt")) {
        api = Deno.env.get("OPENAI_API");
        bearer = Deno.env.get("OPENAI_API_KEY");
        if (model.includes("4")) {
            tokenMax = parseInt(Deno.env.get("OPENAI_MAXTOKENS_GPT4o"));
        } else {
            tokenMax = parseInt(Deno.env.get("OPENAI_MAXTOKENS_GPT3_5"));
        }
    } else {
        api = Deno.env.get("OCTOAI_API");
        bearer = Deno.env.get("OCTOAI_TOKEN")
        tokenMax = parseInt(Deno.env.get("OCTOAI_MAXTOKENS"));
    }
    const prompt = "Summarize the following text into " + summaryMax + " sentences and simple to understand: " + text;
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


                const completion = await fetch(api, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + bearer
                    },
                    body: JSON.stringify({
                        model: model,
                        'messages': [
                            {
                                'role': 'system',
                                'content': "You're an application which summarizes text which got extracted from pdfs or other files. Do not communicate with the user directly."
                            },
                            {
                                'role': 'user',
                                'content': "Summarize the following text: " + parts[i],
                            },
                        ],
                        "presence_penalty": 0,
                        "temperature": 0.1,
                        "top_p": 0.9
                    })
                }).then(res => res.json());


                if (completion.choices[0].message.content) {
                    presummary = presummary + ' ' + completion.choices[0].message.content
                }
            }


            const resp = await fetch(api, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + bearer
                },
                body: JSON.stringify({
                    model: model,
                    'messages': [
                        {
                            'role': 'system',
                            'content': "You're an application which summarizes text which got extracted from pdfs or other files into a certain amount of sentences. Do not communicate with the user directly."
                        },
                        {
                            'role': 'user',
                            'content': "Summarize the following text into " + summaryMax + " sentences: " + presummary + ' ' + parts[parts.length - 1],
                        },
                    ],
                    "presence_penalty": 0,
                    "temperature": 0.1,
                    "top_p": 0.9,
                    stream: true,
                })
            });

            let full = "";

            const body = resp.body
                .pipeThrough(new TextDecoderStream())
                .pipeThrough(
                    new TransformStream({
                        transform: (chunk, controller) => {
                            if (chunk && chunk.startsWith('data:')) {
                                try {
                                    if (chunk.includes('[DONE]')) {
                                        controller.enqueue('[DONE]');
                                    } else {
                                        const payload = JSON.parse(chunk.replace('data: ', '')) || null;
                                        if (payload.choices[0].finish_reason) {
                                            return;
                                        }
                                        if (payload) {
                                            const text = payload.choices[0].delta?.content || "";
                                            if (text) {
                                                controller.enqueue(text);
                                                full = full + text;
                                            }
                                        }
                                    }
                                } catch (e) {
                                    console.error(e);
                                }
                            }

                        }
                    }),
                )
                .pipeThrough(new TextEncoderStream());

            sendMail({
                usedToken: tokens,
                textLength: prompt.length,
                model: model,
                filename: filename,
                requests: faktor,
                summary: full
            })

            return new Response(body, {
                status: resp.status,
                headers: resp.headers,
            });


        } catch (e:any) {
            console.error("error occurred:", e);
            return new Response(JSON.stringify({ error: e.message }), {
                status: 500, headers: {
                    'Content-Type': 'application/json',
                },
            });
        }

    } else {

        try {

            const resp = await fetch(api, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + bearer
                },
                body: JSON.stringify({
                    model: model,
                    'messages': [
                        {
                            'role': 'system',
                            'content': "You're an application which summarizes text which got extracted from pdfs or other files into a certain amount of sentences. Do not communicate with the user directly."
                        },
                        {
                            'role': 'user',
                            'content': "Summarize the following text into " + summaryMax + " sentences: " + text,
                        },
                    ],
                    "presence_penalty": 0,
                    "temperature": 0.1,
                    "top_p": 0.9,
                    stream: true,
                })
            });

            let full = "";

            const body = resp.body
                .pipeThrough(new TextDecoderStream())
                .pipeThrough(
                    new TransformStream({
                        transform: (chunk, controller) => {
                            if (chunk && chunk.startsWith('data:')) {
                                try {
                                    if (chunk.includes('[DONE]')) {
                                        controller.enqueue('[DONE]');
                                    } else {
                                        const payload = JSON.parse(chunk.replace('data: ', '')) || null;
                                        if (payload.choices[0].finish_reason) {
                                            return;
                                        }
                                        if (payload) {
                                            const text = payload.choices[0].delta?.content || "";
                                            if (text) {
                                                controller.enqueue(text);
                                                full = full + text;
                                            }
                                        }
                                    }
                                } catch (e) {
                                    console.error(e);
                                }
                            }

                        }
                    }),
                )
                .pipeThrough(new TextEncoderStream());

            sendMail({
                usedToken: tokens,
                textLength: prompt.length,
                model: model,
                filename: filename,
                requests: faktor,
                summary: full
            })

            return new Response(body, {
                status: resp.status,
                headers: resp.headers,
            });


        } catch (e:any) {
            console.error("error occurred:", e);
            return new Response(JSON.stringify({ error: e.message }), {
                status: 500, headers: {
                    'Content-Type': 'application/json',
                },
            });
        }
    }
    // }
}

export const config = {
    path: "/squeezefile",
};