import { encodingForModel } from "js-tiktoken";
import Mailjet from "node-mailjet";
import { NextRequest } from "next/server";

//RESULT EXAMPLE
// {"id":"gen-1768336601-WFKPSGguIZs3E7kGJ1pD",
//   "provider":"Venice",
//   "model":"mistralai/mistral-small-3.1-24b-instruct:free",
//   "object":"chat.completion.chunk",
//   "created":1768336601,
//   "choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null,"native_finish_reason":null,"logprobs":null}],
//   "usage":{"prompt_tokens":1428,"completion_tokens":90,"total_tokens":1518,"cost":0,"is_byok":false,"prompt_tokens_details":{"cached_tokens":0,"audio_tokens":0,"video_tokens":0},"cost_details":{"upstream_inference_cost":null,"upstream_inference_prompt_cost":0,"upstream_inference_completions_cost":0},"completion_tokens_details":{"reasoning_tokens":0,"image_tokens":0}}
// }

// type Usage = {
//   prompt_tokens: number;
//   completion_tokens: number;
//   total_tokens: number;
//   cost: number;
//   is_byok: boolean;
//   prompt_tokens_details: {
//     cached_tokens: number;
//     audio_tokens: number;
//     video_tokens: number;
//   };
//   cost_details: {
//     upstream_inference_cost: null;
//     upstream_inference_prompt_cost: number;
//     upstream_inference_completions_cost: number;
//   };
//   completion_tokens_details: {
//     reasoning_tokens: number;
//     image_tokens: number;
//   };
// }
type EmailContent = {
  filename: string;
  usedToken: number;
  textLength: number;
  requests: number;
  model: string;
  summary: string;
  usage: string
};

// STATUS_CODES
    // 400: Bad Request (invalid or missing params, CORS)
    // 401: Invalid credentials (OAuth session expired, disabled/invalid API key)
    // 402: Your account or API key has insufficient credits. Add more credits and retry the request.
    // 403: Your chosen model requires moderation and your input was flagged
    // 408: Your request timed out
    // 429: You are being rate limited
    // 502: Your chosen model is down or we received an invalid response from it
    // 503: There is no available model provider that meets your routing requirements


function sendMail(emailContent: EmailContent) {
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
    ${emailContent.usage ? `<br>\n
    <b>Usage:</b> <span>${emailContent.usage}</span>\n`: ''}
    `;


    const msg = {
      to: process.env.RECEIVING_EMAIL_ADDRESS,
      from: process.env.SMTP_USER,
      subject:
        "Squeeze Log - " +
        new Date().toLocaleDateString("de-DE") +
        " " +
        new Date().toLocaleTimeString("de-DE"),
      html: content,
    };

    const mailjet = Mailjet.apiConnect(
    process.env.MJ_APIKEY_PUBLIC,
    process.env.MJ_APIKEY_PRIVATE,
);

const request = mailjet
        .post('send', { version: 'v3.1' })
        .request({
          Messages: [
            {
              From: {
                Email: process.env.SMTP_USER,
                Name: "AiSqueeze"
              },
              To: [
                {
                  Email: process.env.RECEIVING_EMAIL_ADDRESS,
                  Name: "Jens Matthiaschk"
                }
              ],
              Subject: "Squeeze Log - " +
                new Date().toLocaleDateString("de-DE") +
                " " +
                new Date().toLocaleTimeString("de-DE"),
              // TextPart: "Dear passenger 1, welcome to Mailjet! May the delivery force be with you!",
              HTMLPart: content
            }
          ]
        })

request
    .then((result) => {
        console.log(result.body)
    })
    .catch((err) => {
        console.log(err.statusCode)
    })

}

export async function POST(req: NextRequest) {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Method not allowed",
      }),
      {
        status: 405,
      }
    );
  }

  if (!process.env.OPENROUTER_API_KEY) {
  return new Response(
    JSON.stringify({
      error: "OPENROUTER_API_KEY is not defined",
    }),
    {
      status: 500,
    }
  )
}

  const { text, summaryMax, model, filename } = await req.json();
  const llms = [
    // {
    //   name: "Mistral: Mistral 7B Instruct",
    //   val: "mistralai/mistral-7b-instruct:free",
    //   maxcontext: 32800,
    //   maxtokens: 16400,
    // },
    {
      name: "Mistral: Mistral Small 3.1 24B",
      val: "mistralai/mistral-small-3.1-24b-instruct:free",
      maxcontext: 128000,
      maxtokens: 128000,
    },
    {
      name: "Nous: Hermes 3 405B Instruct",
      val: "nousresearch/hermes-3-llama-3.1-405b:free",
      maxcontext: 131100,
      maxtokens: 131100,
    },
    // {
    //   name: "OpenAI: gpt-oss-120b",
    //   val: "openai/gpt-oss-120b:free",
    //   maxcontext: 131100,
    //   maxtokens: 131100,
    // },
    {
      name: "Meta: Llama 3.3 70B Instruct",
      val: "meta-llama/llama-3.3-70b-instruct:free",
      maxcontext: 65500,
      maxtokens: 65500,
    },
    {
      name: "Google: Gemma 3 27B",
      val: "google/gemma-3-27b-it:free",
      maxcontext: 131100,
      maxtokens: 131100,
    },
  ];
  // let api = "https://openrouter.ai/api/v1/chat/completions"; //remote
  let api = "http://127.0.0.1:12434/engines/llama.cpp/v1/chat/completions"; //local
  let bearer = process.env.OPENROUTER_API_KEY;
  // let tokenMax = 32800; //remote
  let tokenMax = 4096; //local (context length in bits)

  const prompt =
    "Summarize the following text into " +
    summaryMax +
    " sentences and simple to understand: " +
    text;
  const encoding = encodingForModel("gpt-4-turbo-preview");
  const tokens = encoding.encode(prompt).length;
  const faktor = Math.ceil(tokens / tokenMax);
  let parts = [];
  let presummary = "";
  const abortTimeout = 60000;

  // console.log({ tokens, faktor, model });

  if (faktor > 1) {
    try {
      const partLength = Math.ceil(text.length / faktor);
      for (let i = 0; i < faktor; i++) {
        parts.push(text.slice(i * partLength, (i + 1) * partLength));
      }

      await Promise.all(
        parts.map(async (part, i) => {
          await fetch(api, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              // Authorization: "Bearer " + bearer,
            },
            signal: AbortSignal.timeout(abortTimeout),
            body: JSON.stringify({
              model: model,
              messages: [
                {
                  role: "system",
                  content:
                    "You're an application which summarizes text which got extracted from pdfs or other files. Do not communicate with the user directly.",
                },
                {
                  role: "user",
                  // content: "Summarize the following text as part " + (i + 1) + " of " + parts.length + " in clear sentences: " + part,
                  content:
                    "Summarize the following text as part " +
                    (i + 1) +
                    " of " +
                    parts.length +
                    " in clear sentences, but don't include the part number: " +
                    part,
                },
              ],
              presence_penalty: 0,
              temperature: 0.1,
              top_p: 0.9,
              stream: false
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (
                data.choices &&
                data.choices.length > 0 &&
                data.choices[0].message.content
              ) {
                // console.log({
                //   ["part " + (i + 1) + " of " + parts.length]:
                //     data.choices[0].message.content,
                // });
                presummary += " " + data.choices[0].message.content;
              }
            })
            .catch((e) => {
              console.error(e);
            });
        })
      );



      const resp = await fetch(api, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Authorization: "Bearer " + bearer,
        },
        signal: AbortSignal.timeout(abortTimeout),
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "system",
              content:
                "You're an application which summarizes text which got extracted from pdfs or other files into a certain amount of sentences. Do not communicate with the user directly.",
            },
            {
              role: "user",
              content:
                "Summarize the following text into " +
                summaryMax +
                " clear and simple sentences: " +
                presummary,
            },
          ],
          presence_penalty: 0,
          temperature: 0.1,
          top_p: 0.9,
          stream: true,
        }),
      });



      if (!resp.ok) {
        const error = await resp.json();
        console.error(`Error: ${error.error.message}`);
        return new Response(error.error.message, { status: 500 });
      }

      const body = new ReadableStream({
        async start(controller) {
          const reader = resp.body?.getReader();
          if (!reader) throw new Error("No response body");
          const decoder = new TextDecoder();
          let buffer = "";
          let full = "";
          let usage = "";
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              while (true) {
                const lineEnd = buffer.indexOf("\n");
                if (lineEnd === -1) break;
                const line = buffer.slice(0, lineEnd).trim();
                buffer = buffer.slice(lineEnd + 1);
                if (line.startsWith("data: ")) {
                  const data = line.slice(6);
                  if (data === "[DONE]") {
                    sendMail({
                      usedToken: tokens,
                      textLength: prompt.length,
                      model: model,
                      filename: filename,
                      requests: faktor,
                      summary: full,
                      usage: usage,
                    });
                    return;
                  }
                  try {
                    const parsed = JSON.parse(data);
                    // Check for mid-stream error
                    if (parsed.error) {
                      console.error(`Stream error: ${parsed.error.message}`);
                      // Check finish_reason if needed
                      if (parsed.choices?.[0]?.finish_reason === "error") {
                        throw new Error(parsed.error.message);
                      }
                      return;
                    }
                    // Process normal content
                    if (parsed.usage) {
                      usage = JSON.stringify(parsed.usage);
                    }
                    const content = parsed.choices[0].delta.content;
                    if (content) {
                      controller.enqueue(content);
                      full = full + content;
                    }
                  } catch (e: any) {
                    return new Response(e.message, { status: 500 });
                  }
                }
              }
            }
          } catch (e: any) {
            return new Response(e.message, { status: 500 });
          } finally {
            reader.cancel();
            controller.close();
          }
        },
      });

      return new Response(body, {
        status: resp.status,
        headers: resp.headers,
      });
    } catch (error: any) {
      console.error("error occurred:", error);
      return new Response(error.message, {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }
  } else {
    try {
      const resp = await fetch(api, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Authorization: "Bearer " + bearer,
        },
        signal: AbortSignal.timeout(abortTimeout),
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "system",
              content:
                "You're an application which summarizes text which got extracted from pdfs or other files into a certain amount of sentences. Do not communicate with the user directly.",
            },
            {
              role: "user",
              content:
                "Summarize the following text into " +
                summaryMax +
                " sentences: " +
                text,
            },
          ],
          presence_penalty: 0,
          temperature: 0.1,
          top_p: 0.9,
          stream: true,
        }),
      });

      
      if (!resp.ok) {
        const error = await resp.json();
        console.error(`Error: ${error.error.message}`);
        return;
      }

      const body = new ReadableStream({
        async start(controller) {
          const reader = resp.body?.getReader();
          if (!reader) throw new Error("No response body");
          const decoder = new TextDecoder();
          let buffer = "";
          let full = "";
          let usage = "";
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              while (true) {
                const lineEnd = buffer.indexOf("\n");
                if (lineEnd === -1) break;
                const line = buffer.slice(0, lineEnd).trim();
                buffer = buffer.slice(lineEnd + 1);
                if (line.startsWith("data: ")) {
                  const data = line.slice(6);
                  if (data === "[DONE]") {
                    sendMail({
                      usedToken: tokens,
                      textLength: prompt.length,
                      model: model,
                      filename: filename,
                      requests: faktor,
                      summary: full,
                      usage: usage,
                    });
                    return;
                  }
                  try {
                    const parsed = JSON.parse(data);
                    // Check for mid-stream error
                    if (parsed.error) {
                      console.error(`Stream error: ${parsed.error.message}`);
                      // Check finish_reason if needed
                      if (parsed.choices?.[0]?.finish_reason === "error") {
                        throw new Error(parsed.error.message);
                      }
                      return;
                    }
                    // Process normal content
                    if (parsed.usage) {
                      usage = JSON.stringify(parsed.usage);
                    }
                    const content = parsed.choices[0].delta.content;
                    if (content) {
                      controller.enqueue(content);
                      full = full + content;
                    }
                  } catch (e: any) {
                    return new Response(e.message, { status: 500 });
                  }
                }
              }
            }
          } catch (e: any) {
            return new Response(e.message, { status: 500 });
          } finally {
            reader.cancel();
            controller.close();
          }
        },
      });

      return new Response(body, {
        status: resp.status,
        headers: resp.headers,
      });
    } catch (error: any) {
      console.error("error occurred:", error);
      return new Response(error.message, {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }
  }
}
