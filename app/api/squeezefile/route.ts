
import { NextRequest } from 'next/server';
import { encodingForModel } from "js-tiktoken";
import { Client } from '@octoai/client';




if (!process.env.OCTOAI_TOKEN) {
    throw new Error('OCTOAI_TOKEN is not defined');
}

//export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const client = new Client(process.env.OCTOAI_TOKEN);

export const POST = async (req: NextRequest): Promise<Response> => {

    if (req.method !== 'POST') {
        return Response.json({
            error: 'Method not allowed',
        }, {
            status: 405,
        });
    }

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
                //'"llama-2-13b-chat" | "llama-2-70b-chat" | "codellama-7b-instruct" | "codellama-13b-instruct" | "codellama-34b-instruct" | "codellama-70b-instruct" | "mistral-7b-instruct" | "mixtral-8x7b-instruct" | "nous-hermes-2-mixtral-8x7b-dpo" | "nous-hermes-2-mistral-7b-dpo"'
                'model': 'mixtral-8x7b-instruct',
                'messages': [
                    // {
                    //     'role': 'system',
                    //     'content': "Summarize the following text into " + summaryMax + " sentences simple to understand: " + parts[i],
                    // },
                    {
                        'role': 'system',
                        'content': 'You are a tool that summarizes text extracted from PDF or Images. This tool is an applications script that converts the text into a summary. Do not communicate with the user directly.'
                    },
                    {
                        'role': 'user',
                        'content': 'Summarize the following text into ' + summaryMax + ' sentences simple to understand: ' + parts[i],
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
                    // {
                    //     'role': 'system',
                    //     'content': "Summarize the following text into " + summaryMax + " sentences simple to understand: " + presummary + ' ' + parts[parts.length - 1],
                    // },
                    {
                        'role': 'system',
                        'content': 'You are a tool that summarizes text extracted from PDF or Images. This tool is an applications script that converts the text into a summary. Do not communicate with the user directly.'
                    },
                    {
                        'role': 'user',
                        'content': 'Summarize the following text into ' + summaryMax + ' sentences simple to understand: ' + presummary + ' ' + parts[parts.length - 1],
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
                    error: "No completion"
                });
            }

            
        } catch (e) {
            console.error("Error: ",e);
            return Response.json({
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
                    // {
                    //     'role': 'system',
                    //     'content': "Summarize the following text into " + summaryMax + " sentences simple to understand: " + text,
                    // },
                    {
                        'role': 'system',
                        'content': 'You are a tool that summarizes text extracted from PDF or Images. This tool is an applications script that converts the text into a summary. Do not communicate with the user directly.'
                    },
                    {
                        'role': 'user',
                        'content': 'Summarize the following text into ' + summaryMax + ' sentences simple to understand: ' + text,
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
                    error: "No completion"
                });
            }


        } catch (e) {
            console.error("Error: ", e);
            return Response.json({
                success: false,
                error: e
            });
        }
    }
}