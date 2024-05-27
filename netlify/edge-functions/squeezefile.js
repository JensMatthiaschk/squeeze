import { Client } from 'https://esm.sh/@octoai/client';
import OpenAi from 'https://esm.sh/openai';
import { encodingForModel } from 'https://esm.sh/js-tiktoken';
import sgMail from 'https://esm.sh/@sendgrid/mail';


if (!Netlify.env.get("OCTOAI_TOKEN")) {
    throw new Error('OCTOAI_TOKEN is not defined');
}



function sendMail(emailContent) {
    
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
    `;
    
    
    try {
        
        sgMail.setApiKey(Netlify.env.get("SENDGRID_API_KEY"));
        const msg = {
            to: Netlify.env.get('RECEIVING_EMAIL_ADDRESS'),
            from: Netlify.env.get('SMTP_USER'),
            subject: "Squeeze Log - " + new Date().toLocaleDateString('de-DE') + " " + new Date().toLocaleTimeString('de-DE'),
            // text: 'and easy to do anywhere, even with Node.js',
            html: content,
        }
        sgMail
        .send(msg)
        .then(() => {
            console.log('Log-Email sent')
        })
        .catch((error) => {
            console.error(error)
        })
        
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
    let client;
    let tokenMax;
    if (model.includes("gpt")) {
        client = new OpenAi({ apiKey: Netlify.env.get("OPENAI_API_KEY") });
        if (model.includes("4")) {
            tokenMax = parseInt(Netlify.env.get("OPENAI_MAXTOKENS_GPT4o"));
        } else {
        tokenMax = parseInt(Netlify.env.get("OPENAI_MAXTOKENS_GPT3_5"));
        }
    } else {
        client = new Client(Netlify.env.get("OCTOAI_TOKEN"));
        tokenMax = parseInt(Netlify.env.get("OCTOAI_MAXTOKENS"));
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
                
                const completion = await client.chat.completions.create({
                    'model': model,
                    'messages': [
                        {
                            'role': 'system',
                            'content': "Summarize the following text: " + parts[i],
                        },
                        // {
                        //     'role': 'user',
                        //     'content': "Summarize the following text: " + parts[i],
                        // }
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
                        'content': "You're an application which summarizes text which got extracted from pdfs or other files into a certain amount of sentences. Do not communicate with the user directly."
                    },
                    {
                        'role': 'user',
                        'content': "Summarize the following text into " + summaryMax + " sentences: " + presummary + ' ' + parts[parts.length - 1],
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
                        'content': "You're an application which summarizes text which got extracted from pdfs or other files into a certain amount of sentences. Do not communicate with the user directly."
                    },
                    {
                        'role': 'user',
                        'content': "Summarize the following text into " + summaryMax + " sentences: " + text,
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
// }
}

export const config = {
    path: "/squeezefile",
};