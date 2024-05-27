"use client";
import { useState, useRef } from "react";
import Tesseract from "tesseract.js";


export default function Home() {

  const [summary, setSummary] = useState("");
  const [progress, setProgress] = useState(0);
  const [ocrText, setOcrText] = useState("");
  const [language, setLanguage] = useState("eng");
  const [summaryMax, setSummaryMax] = useState(3);
  const [uploadedFile, setFile]: any = useState(null);
  const [thumbnail, setThumbnail] = useState(false);
  const [loadingThumbnail, setLoadingThumbnail] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [hideUpload, setHideUpload] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [themeDark, setThemeDark] = useState(false);
  const [model, setModel] = useState("nous-hermes-2-mixtral-8x7b-dpo");
  //'"llama-2-13b-chat" | "llama-2-70b-chat" | "codellama-7b-instruct" | "codellama-13b-instruct" | "codellama-34b-instruct" | "codellama-70b-instruct" | "mistral-7b-instruct" | "mixtral-8x7b-instruct" | "nous-hermes-2-mixtral-8x7b-dpo" | "nous-hermes-2-mistral-7b-dpo"'


  function resetAll() {
    setSummary("");
    setProgress(0);
    setOcrText("");
    setLanguage("eng");
    setSummaryMax(3);
    setHideUpload(false);
    setIsScanning(false);
    setSummarizing(false);
    setSettingsOpen(false);
    setThumbnail(false);
    setFile(null);
    let fileInput = document.getElementById("dropzone-file") as HTMLInputElement;
    if (fileInput !== null) fileInput.value = "";
    let summarizeMaxInput = document.getElementById("summarizeMax") as HTMLInputElement;
    if (summarizeMaxInput !== null) summarizeMaxInput.value = "3";
    let languageSelect = document.getElementById("languageSelect") as HTMLSelectElement;
    if (languageSelect !== null) languageSelect.value = "eng";
    const preview = document.getElementById("preview");
    if (preview !== null) {
      preview.innerHTML = "";
    }
  }

  function resetDropZone() {
    setFile(null);
    setThumbnail(false);
    setHideUpload(false);
    setSummary("");
    setProgress(0);
    setOcrText("");
    setSummarizing(false);
    setIsScanning(false);
    let fileInput = document.getElementById("dropzone-file") as HTMLInputElement;
    if (fileInput !== null) fileInput.value = "";
    let summarizeMaxInput = document.getElementById("summarizeMax") as HTMLInputElement;
    if (summarizeMaxInput !== null) summarizeMaxInput.value = "3";
    let languageSelect = document.getElementById("languageSelect") as HTMLSelectElement;
    if (languageSelect !== null) languageSelect.value = "eng";
    const preview = document.getElementById("preview");
    if (preview !== null) {
      preview.innerHTML = "";
    }
  }

  function renderThumbnail(file: File) {

    if (file.type === 'application/pdf') {
      setLoadingThumbnail(true);
      const fileReader = new FileReader();
      fileReader.onload = async function (e) {
        const pdfjsLib = await import("pdfjs-dist/webpack.mjs");
        pdfjsLib.getDocument({ data: new Uint8Array(e.target.result as ArrayBuffer), useSystemFonts: true }).promise.then((pdf) => {
          pdf.getPage(1).then((page) => {
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            page.render({ canvasContext: context, viewport: viewport }).promise.then(() => {
              const image = new Image();
              image.height = 100;
              image.title = file.name;
              image.src = canvas.toDataURL();
              setLoadingThumbnail(false);
              setThumbnail(true);
              setTimeout(() => document.getElementById("preview").appendChild(image), 100);
            });
          });
        });
      };
      fileReader.readAsArrayBuffer(file);
    } else if (/\.(jpe?g|png|gif)$/i.test(file.name)) {
      setLoadingThumbnail(true);
      const reader = new FileReader();

      reader.onload = function (e) {

        const image = new Image();
        image.height = 100;
        image.title = file.name;
        image.src = (reader.result as string).replace('application/octet-stream', 'image/jpeg');
        setThumbnail(true);
        setLoadingThumbnail(false);
        setTimeout(() => document.getElementById("preview").appendChild(image), 100);
      }

      reader.readAsDataURL(file);

    } else {
      alert("Invalid file type. Please upload a PDF, JPG, JPEG or PNG file.");
    }
  }

  function handleChange(e: any) {
    setFile(null);
    setThumbnail(false);
    e.preventDefault();
    setFile(e.target.files[0]);
    renderThumbnail(e.target.files[0]);
  }

  function handleDrop(e: any) {
    e.preventDefault();
    e.stopPropagation();
    resetDropZone();
   if (themeDark) {
      e.target.classList.remove('dark:border-indigo-600')
      e.target.classList.remove('dark:hover:border-indigo-500')
      e.target.classList.add('dark:border-gray-600')
      e.target.classList.add('dark:hover:border-gray-600')
    } else {
      e.target.classList.remove('dark:border-fuchsia-400')
      e.target.classList.remove('dark:hover:border-fuchsia-300')
      e.target.classList.add('dark:border-gray-400')
      e.target.classList.add('dark:hover:border-gray-300')
    }
    setFile(null);
    setThumbnail(false);
    const file = e.dataTransfer.items[0].getAsFile();
    setFile(file);
    renderThumbnail(file);
  }

  function handleDragLeave(e: any) {
    e.preventDefault();
    e.stopPropagation();
    if (themeDark) {
      e.target.classList.remove('dark:border-indigo-600')
      e.target.classList.remove('dark:hover:border-indigo-500')
      e.target.classList.add('dark:border-gray-600')
      e.target.classList.add('dark:hover:border-gray-600')
    } else {
      e.target.classList.remove('dark:border-fuchsia-400')
      e.target.classList.remove('dark:hover:border-fuchsia-300')
      e.target.classList.add('dark:border-gray-400')
      e.target.classList.add('dark:hover:border-gray-300')
    }
  }

  function handleDragOver(e: any) {
    e.preventDefault();
    e.stopPropagation();
    if (themeDark) {
      e.target.classList.remove('dark:border-gray-600')
      e.target.classList.remove('dark:hover:border-gray-500')
      e.target.classList.add('dark:border-indigo-600')
      e.target.classList.add('dark:hover:border-indigo-500')
    } else {
      e.target.classList.remove('dark:border-gray-400')
      e.target.classList.remove('dark:hover:border-gray-300')
      e.target.classList.add('dark:border-fuchsia-400')
      e.target.classList.add('dark:hover:border-fuchsia-300')
    }
  }

  function handleDragEnter(e: any) {
    e.preventDefault();
    e.stopPropagation();

  }

  const startSqueeze = () => {
    if (!uploadedFile) {
      alert("Please upload a file first.");
      return;
    }
    setHideUpload(true);
    setProgress(0);

    setIsScanning(true);
    setOcrText("");


    if (!uploadedFile) {

      setIsScanning(false);
      return;
    }
    if (uploadedFile.type === 'application/pdf') {
      const fileReader = new FileReader();
      fileReader.onload = onFileLoad;
      fileReader.readAsArrayBuffer(uploadedFile);
    } else {
      ocrScanImage(uploadedFile);
    }
  };

  const onFileLoad = async (event: ProgressEvent<FileReader>) => {

    if (event.target === null || event.target.result === null) {
      setIsScanning(false);
      return;
    }

    const typedArray = new Uint8Array(event.target.result as ArrayBuffer);
    const pdfjsLib = await import("pdfjs-dist/webpack.mjs");
    await pdfjsLib.getDocument({ data: typedArray, useSystemFonts: true }).promise.then(async (pdf) => {
      let readableText = "";

      // pdf.getMetadata().then((metadata) => {
      //   console.log(metadata);
      // });
      // pdf.getDownloadInfo().then((info) => {
      //   console.log(info);
      // });
      // pdf.getOutline().then((outline) => {
      //   console.log(outline);
      // });
      setIsReading(true);
      //try to extract text without ocr first
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        textContent.items.forEach((item: any) => {
          readableText += item.str + " ";
        });
        setProgress(i / pdf.numPages);
      }

      if (readableText.length > 1000) {
        setOcrText(readableText);
        setIsReading(false)
        setIsScanning(false);
        summarizeText(readableText);

      } else {

        setIsReading(false);
        readableText = "";

        for (let i = 1; i <= pdf.numPages; i++) {

          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport: viewport }).promise;
          const scanText = await Tesseract.recognize(
            canvas,
            language,
            {
              logger: (m: { status: string; progress: number; }) => {
                if (m.status === 'recognizing text') {
                  setProgress((i - 1) / pdf.numPages + m.progress / pdf.numPages);
                }
              }
            }
          ).then(({ data: { text } }: { data: { text: string } }) => text);

          readableText += scanText + ' ';
        }
        setOcrText(readableText);
        setIsScanning(false);
        summarizeText(readableText);

      }
    });

  }

  async function ocrScanImage(file: File) {

    const scanText = await Tesseract.recognize(
      file,
      language,
      {
        logger: (m: { status: string; progress: number; }) => {
          if (m.status === 'recognizing text') {
            setProgress(m.progress);
          }
        }
      }
    ).then(({ data: { text } }) => text);


    setOcrText(scanText);
    setIsScanning(false);
    summarizeText(scanText);
  }

  function summarizeText(text: string) {
    setSummarizing(true);
    fetch(`/squeezefile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ text, summaryMax, model, filename: uploadedFile?.name }),
    }).then((response) => response.json()).then((data) => {
      if (!data.success) {
        setSummarizing(false);
        setSummary('🥺...something went wrong, please try again');
        return;
      }
      setSummary(data.summary);
      setSummarizing(false);
    }).catch((error) => {
      console.error('Error:', error);
      setSummarizing(false);
      setSummary('🥺...something went wrong, please try again');
    });
  }

  const settingsContainer = useRef(null);
  const settingsButtonRef = useRef(null);
  function handleClickOutside(e: any) {

    if (settingsContainer.current &&
      !settingsContainer.current.contains(e.target) &&
      settingsButtonRef.current &&
      !settingsButtonRef.current.contains(e.target)
    ) {
      setSettingsOpen(false);
    }
  }


  return (
    <section className={`${themeDark ? 'dark bg-gradient-to-t from-fuchsia-900 from-0% via-indigo-900 via-25% to-stone-900 to-90%' : 'light bg-gradient-to-t from-fuchsia-300 from-0% via-indigo-300 via-25% to-stone-50 to-90%'} flex flex-col justify-center items-center h-svh w-svw text-base relative`} onClick={handleClickOutside}>

      <button className="absolute top-5 right-5 font" onClick={resetAll}>
        <svg width="1.5em" height="1.5em" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke={`${themeDark ? 'lightgray' : 'gray'}`} strokeLinecap="round" strokeLinejoin="round" transform="matrix(0 1 1 0 2.5 2.5)">
            <path d="m3.98652376 1.07807068c-2.38377179 1.38514556-3.98652376 3.96636605-3.98652376 6.92192932 0 4.418278 3.581722 8 8 8s8-3.581722 8-8-3.581722-8-8-8" />
            <path d="m4 1v4h-4" transform="matrix(1 0 0 -1 0 6)" />
          </g>
        </svg>
      </button>

      <button id="settingsButton" onClick={() => setSettingsOpen(!settingsOpen)} className="absolute top-5 left-5" ref={settingsButtonRef}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="1.5em" height="1.5em" fill={`${themeDark ? 'lightgray' : 'gray'}`}>
          <path d="M47.16,21.221l-5.91-0.966c-0.346-1.186-0.819-2.326-1.411-3.405l3.45-4.917c0.279-0.397,0.231-0.938-0.112-1.282 l-3.889-3.887c-0.347-0.346-0.893-0.391-1.291-0.104l-4.843,3.481c-1.089-0.602-2.239-1.08-3.432-1.427l-1.031-5.886 C28.607,2.35,28.192,2,27.706,2h-5.5c-0.49,0-0.908,0.355-0.987,0.839l-0.956,5.854c-1.2,0.345-2.352,0.818-3.437,1.412l-4.83-3.45 c-0.399-0.285-0.942-0.239-1.289,0.106L6.82,10.648c-0.343,0.343-0.391,0.883-0.112,1.28l3.399,4.863 c-0.605,1.095-1.087,2.254-1.438,3.46l-5.831,0.971c-0.482,0.08-0.836,0.498-0.836,0.986v5.5c0,0.485,0.348,0.9,0.825,0.985 l5.831,1.034c0.349,1.203,0.831,2.362,1.438,3.46l-3.441,4.813c-0.284,0.397-0.239,0.942,0.106,1.289l3.888,3.891 c0.343,0.343,0.884,0.391,1.281,0.112l4.87-3.411c1.093,0.601,2.248,1.078,3.445,1.424l0.976,5.861C21.3,47.647,21.717,48,22.206,48 h5.5c0.485,0,0.9-0.348,0.984-0.825l1.045-5.89c1.199-0.353,2.348-0.833,3.43-1.435l4.905,3.441 c0.398,0.281,0.938,0.232,1.282-0.111l3.888-3.891c0.346-0.347,0.391-0.894,0.104-1.292l-3.498-4.857 c0.593-1.08,1.064-2.222,1.407-3.408l5.918-1.039c0.479-0.084,0.827-0.5,0.827-0.985v-5.5C47.999,21.718,47.644,21.3,47.16,21.221z M25,32c-3.866,0-7-3.134-7-7c0-3.866,3.134-7,7-7s7,3.134,7,7C32,28.866,28.866,32,25,32z" />
        </svg>
      </button>
      <div className={`absolute top-11 left-11 ${themeDark ? 'bg-gray-600' : 'bg-gray-400'} p-3 rounded-md flex-col gap-2 w-[300px] z-20 ${settingsOpen ? 'flex' : 'hidden'}`} ref={settingsContainer}>
        <h1 className="w-fit text-sm">Which language is the PDF in?</h1>
        <select id="languageSelect" onChange={(e) => setLanguage(e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
          <option value="eng">English</option>
          <option value="deu">German</option>
          <option value="fra">French</option>
          <option value="spa">Spanish</option>
        </select>
        <p className="w-fit text-sm mt-3">In how many sentences do you want to summarize your text?</p>
        <input type="number" id="summarizeMax" placeholder="3" onChange={(e) => setSummaryMax(parseInt(e.target.value) || 3)}
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" />
        <p className="w-fit text-sm mt-3">Which model do you want to use for summarization?</p>
        <select id="modelSelect" onChange={(e) => setModel(e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
          {/* <option value="llama-2-13b-chat">llama-2-13b-chat</option>
          <option value="llama-2-70b-chat">llama-2-70b-chat</option>
          <option value="codellama-7b-instruct">codellama-7b-instruct</option>
          <option value="codellama-13b-instruct">codellama-13b-instruct</option>
          <option value="codellama-34b-instruct">codellama-34b-instruct</option>
          <option value="codellama-70b-instruct">codellama-70b-instruct</option> */}
          <option value="mistral-7b-instruct">mistral-7b-instruct</option>
          <option value="mixtral-8x7b-instruct">mixtral-8x7b-instruct</option>
          <option value="nous-hermes-2-mixtral-8x7b-dpo">nous-hermes-2-mixtral-8x7b-dpo</option>
          <option value="nous-hermes-2-mistral-7b-dpo">nous-hermes-2-mistral-7b-dpo</option>
          {/* <option value="gpt-3.5-turbo-0125">GPT-3.5 turbo</option> */}
        </select>
        <div className="themeControls flex gap-2 mt-2">
          <button onClick={() => setThemeDark(false)} className="bg-gray-300 text-gray-900 dark:bg-gray-700 dark:text-white px-3 py-1 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" fill="rgb(209 213 219)" height="1.2em" width="1.2em" version="1.1" id="Capa_1" viewBox="0 0 207.628 207.628" >
              <circle cx="103.814" cy="103.814" r="45.868" />
              <path d="M103.814,157.183c-29.427,0-53.368-23.941-53.368-53.368s23.941-53.368,53.368-53.368s53.368,23.941,53.368,53.368  S133.241,157.183,103.814,157.183z M103.814,65.446c-21.156,0-38.368,17.212-38.368,38.368s17.212,38.368,38.368,38.368  s38.368-17.212,38.368-38.368S124.97,65.446,103.814,65.446z" />
              <path d="M103.814,39.385c-4.142,0-7.5-3.358-7.5-7.5V7.5c0-4.142,3.358-7.5,7.5-7.5s7.5,3.358,7.5,7.5v24.385  C111.314,36.027,107.956,39.385,103.814,39.385z" />
              <path d="M103.814,207.628c-4.142,0-7.5-3.358-7.5-7.5v-24.385c0-4.142,3.358-7.5,7.5-7.5s7.5,3.358,7.5,7.5v24.385  C111.314,204.271,107.956,207.628,103.814,207.628z" />
              <path d="M200.128,111.314h-24.385c-4.142,0-7.5-3.358-7.5-7.5s3.358-7.5,7.5-7.5h24.385c4.142,0,7.5,3.358,7.5,7.5  S204.271,111.314,200.128,111.314z" />
              <path d="M31.885,111.314H7.5c-4.142,0-7.5-3.358-7.5-7.5s3.358-7.5,7.5-7.5h24.385c4.142,0,7.5,3.358,7.5,7.5  S36.027,111.314,31.885,111.314z" />
              <path d="M154.676,60.452c-1.919,0-3.839-0.732-5.303-2.197c-2.929-2.929-2.929-7.678,0-10.606l17.243-17.242  c2.929-2.929,7.678-2.93,10.606,0c2.929,2.929,2.929,7.678,0,10.606l-17.243,17.242C158.515,59.72,156.595,60.452,154.676,60.452z" />
              <path d="M35.709,179.419c-1.919,0-3.839-0.732-5.303-2.197c-2.929-2.929-2.929-7.678,0-10.606l17.243-17.243  c2.929-2.929,7.678-2.929,10.606,0c2.929,2.929,2.929,7.678,0,10.606l-17.243,17.243C39.548,178.687,37.629,179.419,35.709,179.419z  " />
              <path d="M171.918,179.419c-1.919,0-3.839-0.732-5.303-2.197l-17.243-17.243c-2.929-2.929-2.929-7.678,0-10.606  c2.929-2.929,7.678-2.929,10.606,0l17.243,17.243c2.929,2.929,2.929,7.678,0,10.606  C175.757,178.687,173.838,179.419,171.918,179.419z" />
              <path d="M52.952,60.452c-1.919,0-3.839-0.732-5.303-2.197L30.406,41.013c-2.929-2.929-2.929-7.677,0-10.606  c2.929-2.929,7.678-2.93,10.606,0l17.243,17.242c2.929,2.929,2.929,7.677,0,10.606C56.791,59.72,54.872,60.452,52.952,60.452z" />
            </svg>
          </button>
          <button onClick={() => setThemeDark(true)} className="bg-gray-700 text-white dark:bg-gray-300 dark:text-gray-900 px-3 py-1 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 24 24" fill="none">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 11.5373 21.3065 11.4608 21.0672 11.8568C19.9289 13.7406 17.8615 15 15.5 15C11.9101 15 9 12.0899 9 8.5C9 6.13845 10.2594 4.07105 12.1432 2.93276C12.5392 2.69347 12.4627 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="#1C274C" />
            </svg>
          </button>
        </div>
      </div>


      <div id="dropContainer" className={`w-full flex flex-col items-center ${hideUpload ? 'hidden' : ''}`}>
        <div className="flex items-center justify-center w-full mt-8 z-10"
          onDragEnter={handleDragEnter}
          onDrop={handleDrop}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
        >
          <label htmlFor="dropzone-file" className={`flex flex-col items-center justify-center w-[80%] h-64 border-2 ${themeDark ? 'border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600' : 'border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-600 dark:bg-gray-500 hover:bg-gray-100 dark:border-gray-400 dark:hover:border-gray-300 dark:hover:bg-gray-600'} relative`}>
            <div id="preview" className={`w-36 ${!thumbnail ? 'hidden' : ''}`} ></div>
            <div className={`loadingThumbnail ${loadingThumbnail ? '' : 'hidden'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="46" height="36" fill="#fff" viewBox="0 0 24 24">
                <circle className="spinner_qM83" cx="4" cy="12" r="3" />
                <circle className="spinner_qM83 spinner_oXPr" cx="12" cy="12" r="3" />
                <circle className="spinner_qM83 spinner_ZTLf" cx="20" cy="12" r="3" />
              </svg>
            </div>
            <div className={`flex flex-col items-center justify-center ${loadingThumbnail || thumbnail ? 'hidden' : ''}`}>
              <svg className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
              </svg>
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">PDF, PNG, JPG, JPEG or GIF</p>
            </div>
            <input id="dropzone-file" type="file"
              name="file"
              onChange={handleChange}
              accept=".pdf, .png, .jpg, .jpeg, .gif"
              className="hidden" />
          </label>
        </div>
        <button onClick={startSqueeze} className={`${themeDark ? "bg-indigo-500 hover:bg-indigo-700" : "bg-indigo-400 hover:bg-indigo-500"} text-white font-bold py-2 px-4 rounded mt-4`}>Start squeezing</button>
      </div>

      <div className={`relative size-40 ${!isScanning && 'hidden'}`}>
        <svg className="size-full" width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
          {/* <!-- Background Circle --> */}
          <circle cx="18" cy="18" r="16" fill="none" className="stroke-current text-gray-200 dark:text-neutral-700" strokeWidth="2"></circle>
          {/* <!-- Progress Circle inside a group with rotation --> */}
          <g className="origin-center -rotate-90 transform">
            <circle cx="18" cy="18" r="16" fill="none" className={`stroke-current ${themeDark ? 'text-fuchsia-600 dark:text-fuchsia-500' : 'text-fuchsia-300 dark:text-fuchsia-400'}`} strokeWidth="2" strokeDasharray="100" strokeDashoffset={100 - progress * 100}></circle>
          </g>
        </svg>
        {/* <!-- Percentage Text --> */}
        <div className="absolute top-1/2 start-1/2 transform -translate-y-1/2 -translate-x-1/2 flex flex-col gap-2">
          <span className="text-center text-xs text-gray-800 dark:text-white">{isReading ? 'reading document' : 'scanning document'}</span>
          <span className="text-center text-2xl font-bold text-gray-800 dark:text-white">{Math.round(progress * 100)}%</span>
        </div>
      </div>

      <div className="flex flex-col w-[90%] max-h-screen overflow-y-auto scroll-container gap-5">
        <div className={`promptBubble bubble left ${ocrText === "" ? 'hidden' : ''}`}>Dear AI, please summarize the content of my document "{uploadedFile?.name}" into {summaryMax} sentences.</div>

        <div className={`summaryContainer bubble right ${!summarizing && summary === "" ? 'hidden' : ''}`}>
          <svg className={`${!summarizing ? 'hidden' : ''}`} xmlns="http://www.w3.org/2000/svg" width="46" height="36" fill="#fff" viewBox="0 0 24 24">
            <circle className="spinner_qM83" cx="4" cy="12" r="3" />
            <circle className="spinner_qM83 spinner_oXPr" cx="12" cy="12" r="3" />
            <circle className="spinner_qM83 spinner_ZTLf" cx="20" cy="12" r="3" />
          </svg>
          <div className={`${summary === "" ? 'hidden' : ''}`}>
            {summary}
          </div>
        </div>

      </div>
    </section>
  );
}
