
"use server";
import { Client } from '@octoai/client';


if (!process.env.OCTOAI_TOKEN) {
    throw new Error('OCTOAI_TOKEN is not defined');
}

// Create a new client with your API token
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
            // 'messages': [
            //     {
            //         'role': 'system',
            //         'content': 'You are a tool that summarizes text extracted from PDF or Images. This tool is an applications script that converts the text into a summary. Do not communicate with the user directly.'
            //     },
            //     {
            //         'role': 'assistant',
            //         'content': 'Summarize the following text: ' + chunk,
            //     },
            // ],
        });

        if (completion.choices[0].message.content) {
            
            return completion.choices[0].message.content;
        }

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
                // {
                //     'role': 'system',
                //     'content': 'You are a tool that summarizes text extracted from PDF or Images. This tool is an applications script that converts the text into a summary. Do not communicate with the user directly.'
                // },
                // {
                //     'role': 'user',
                //     'content': 'Summarize the following text into ' + summaryMax + ' sentences simple to understand: ' + text,
                // },
            ],
        });


        // maybe for later use if logs get implemented
        // if (completion.choices[0].message.content) {
        //     summary = completion.choices[0].message.content;
        // }

        return completion.choices[0].message.content

    } catch (e) {
        console.error("Error: ", e);
        return e;
    }
}