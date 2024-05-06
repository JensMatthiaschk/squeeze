
import { NextRequest } from 'next/server';
import { encodingForModel } from "js-tiktoken";
import { getChunkSummary, getSummary } from '@/app/utils/octoai';




if (!process.env.OCTOAI_TOKEN) {
    throw new Error('OCTOAI_TOKEN is not defined');
}

//export const dynamic = 'force-dynamic';
export const runtime = 'edge';


export const POST = async (req: NextRequest): Promise<Response> => {

    if (req.method !== 'POST') {
        return Response.json({
            error: 'Method not allowed',
        }, {
            status: 405,
        });
    }

    const { text, summaryMax, model } = await req.json();
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

            const chunkSummary = await getChunkSummary(parts[i], model);
            if (chunkSummary) {
                presummary = presummary + ' ' + chunkSummary;
            }
        }

        try {

            const summary = await getSummary(presummary + ' ' + parts[parts.length - 1], model, summaryMax);

            if (summary) {
                return Response.json({
                    success: true,
                    summary: summary
                });
            } else {
                return Response.json({
                    success: false,
                    error: "No summary"
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
            const summary = await getSummary(text, model, summaryMax);

            if (summary) {
                return Response.json({
                    success: true,
                    summary: summary
                });
            } else {
                return Response.json({
                    success: false,
                    error: "No summary"
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