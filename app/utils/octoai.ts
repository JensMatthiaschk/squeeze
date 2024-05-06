
"use server";
import { Client } from '@octoai/client';

if (!process.env.OCTOAI_TOKEN) {
    throw new Error('OCTOAI_TOKEN is not defined');
}

const client = new Client(process.env.OCTOAI_TOKEN);

type model = "llama-2-13b-chat" | "llama-2-70b-chat" | "codellama-7b-instruct" | "codellama-13b-instruct" | "codellama-34b-instruct" | "codellama-70b-instruct" | "mistral-7b-instruct" | "mixtral-8x7b-instruct" | "nous-hermes-2-mixtral-8x7b-dpo" | "nous-hermes-2-mistral-7b-dpo";

export const getChunkSummary = async (chunk: String, model: model) => {

    try {
        const completion = await client.chat.completions.create({
            'model': model,
            'messages': [
                {
                    'role': 'system',
                    'content': "Summarize the following text: " + chunk,
                },
            ],
        });
        
            return completion.choices[0].message.content;
        

    } catch (e) {
        console.error("Error: ", e);
        return e;
    }
}

export const getSummary = async (text: String, model: model, summaryMax: Number) => {

    try {

        const completion = await client.chat.completions.create({
            
            'model': model,
            'messages': [
                {
                    'role': 'system',
                    'content': "Summarize the following text into " + summaryMax + " sentences simple to understand: " + text,
                },
            ],
        });


        return completion.choices[0].message.content

    } catch (e) {
        console.error("Error: ", e);
        return e;
    }
}