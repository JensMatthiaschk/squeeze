import { Client } from 'https://esm.sh/@octoai/client';
import { encodingForModel } from 'https://esm.sh/js-tiktoken';
import sendMail from './sendMail.js';


if (!Netlify.env.get("OCTOAI_TOKEN")) {
    throw new Error('OCTOAI_TOKEN is not defined');
}

const client = new Client(Netlify.env.get("OCTOAI_TOKEN"));


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