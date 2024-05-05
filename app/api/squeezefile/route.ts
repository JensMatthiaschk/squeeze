import { NextResponse } from 'next/server';
import { Client } from '@octoai/client';
import { encodingForModel } from "js-tiktoken";



if (!process.env.OCTOAI_TOKEN) {
    throw new Error('OCTOAI_TOKEN is not defined');
}

// Create a new client with your API token
const client = new Client(process.env.OCTOAI_TOKEN);

export const POST = async (req: Request) => {

    const { text, summaryMax } = await req.json();
    const tokenMax: number = parseInt(process.env.OCTOAI_MAXTOKENS);
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
                'model': 'mixtral-8x7b-instruct',
                'messages': [
                    {
                        'role': 'system',
                        'content': "Summarize the following text: " + parts[i],
                    },
                ],
            });
            if (completion.choices[0].message.content) {
                presummary = presummary + ' ' + completion.choices[0].message.content;
            }
        }

        try {

            const completion = await client.chat.completions.create({
                //'"llama-2-13b-chat" | "llama-2-70b-chat" | "codellama-7b-instruct" | "codellama-13b-instruct" | "codellama-34b-instruct" | "codellama-70b-instruct" | "mistral-7b-instruct" | "mixtral-8x7b-instruct" | "nous-hermes-2-mixtral-8x7b-dpo" | "nous-hermes-2-mistral-7b-dpo"'
                'model': 'mixtral-8x7b-instruct',
                'messages': [
                    {
                        'role': 'system',
                        'content': "Summarize the following text into " + summaryMax + " sentences simple to understand: " + presummary + " " + parts[parts.length - 1],
                    },
                ],
            });


            return NextResponse.json({
                success: true,
                summary: completion.choices[0].message.content
            }, {
                status: 200
            });
        } catch (e) {
            console.error(e);
            return NextResponse.json({
                success: false,
                error: e
            });
        }
    } else {
        try {
            const completion = await client.chat.completions.create({
                //'"llama-2-13b-chat" | "llama-2-70b-chat" | "codellama-7b-instruct" | "codellama-13b-instruct" | "codellama-34b-instruct" | "codellama-70b-instruct" | "mistral-7b-instruct" | "mixtral-8x7b-instruct" | "nous-hermes-2-mixtral-8x7b-dpo" | "nous-hermes-2-mistral-7b-dpo"'
                'model': 'mixtral-8x7b-instruct',
                'messages': [
                    {
                        'role': 'system',
                        'content': "Summarize the following text into " + summaryMax + " sentences simple to understand: " + text,
                    },
                ],
            });

            return NextResponse.json({
                success: true,
                summary: completion.choices[0].message.content
            }, {
                status: 200
            });
        } catch (e) {
            console.error(e);
            return NextResponse.json({
                success: false,
                error: e
            });
        }
    }
}