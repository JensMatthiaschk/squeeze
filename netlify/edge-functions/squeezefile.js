import { Client } from 'npm:@octoai/client';
import { encodingForModel } from 'npm:js-tiktoken';


if (!Netlify.env.get("OCTOAI_TOKEN")) {
    throw new Error('OCTOAI_TOKEN is not defined');
}

const client = new Client(Netlify.env.get("OCTOAI_TOKEN"));


export default async function (req, context) {



    if (req.method !== 'POST') {
        return Response.json({
            error: 'Method not allowed',
        }, {
            status: 405,
        });
    }

    const { text, summaryMax, model } = await req.json();
    const tokenMax = parseInt(Netlify.env.get("OCTOAI_MAXTOKENS"));
    const prompt = "Summarize the following text in " + summaryMax + " sentences simple to understand: " + text;
    const encoding = encodingForModel("gpt-4-turbo-preview");
    const tokens = encoding.encode(prompt).length;
    const faktor = Math.ceil(tokens / tokenMax);
    let parts = [];
    let presummary = "";


    if (faktor > 1) {
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
                    'content': "Summarize the following text into " + summaryMax + " sentences simple to understand: " + presummary + ' ' + parts[parts.length - 1],
                },
            ],
        });

        if (completion.choices[0].message.content) {
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

    } else {

        const completion = await client.chat.completions.create({

            'model': model,
            'messages': [
                {
                    'role': 'system',
                    'content': "Summarize the following text into " + summaryMax + " sentences simple to understand: " + text,
                },
            ],
        });

        if (completion.choices[0].message.content) {
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

    }
}

export const config = {
    path: "/squeezefile",
};