import Head from "next/head";
import Link from "next/link";
import { CodeBlock, obsidian } from "react-code-blocks";
import prefix from "../utils/prefix";

export default function Format() {

    const exampleTrainingObj = "{ \n\
        data: [ \n\
            { \n\
                input: [1.24, -0.53, 0.72],\n\
                output: [0.91, 0.65] \n\
            },  \n\
            { \n\
                input: [-0.66, 0.74, -0.04], \n\
                output: [1, 0] \n\
            }, \n\
            { \n\
                input: [-1.26, -0.43, 0.72], \n\
                output: [0.88, 0.36] \n\
            }, \n\
            ... \n\
        ] \n}";

    const exampleInputObj = "{ \n\
        inputs: [\n\
            [1.05, 0.74, 0.24],\n\
            [0.66, 0.40, 0.89],\n\
            [0.76, 0.54, 0.19],\n\
            ...\n\
        ] \n}";

    return (
        <div className='site flex flex-col h-full w-full bg-gray-900 font-vietnam'>
            <Head>
                <link rel='shortcut icon' href={`${prefix}/images/favicon.ico`}/>
                <title>NViz | Format</title>
            </Head>
            <div className='flex flex-row w-full bg-gray-900 h-20 items-center border-b-2 border-teal-900'>
                <div className='ml-6 mr-6'>
                    <Link href="/">
                        <a className='flex flex-row text-white text-2xl items-center hover:text-white'><img src={`${prefix}/images/favicon.ico`} className='h-10 mr-4'></img>NViz</a>
                    </Link>
                </div>
                <div className='items-center w-1/3'>
                    <Link href="/about">
                        <a className='text-white text-base hover:text-teal-400 hover:cursor-pointer mr-4'>
                        About
                        </a>
                    </Link>
                    <Link href="/format">
                        <a className='text-white text-base hover:text-teal-400 hover:cursor-pointer'>
                        File Format
                        </a>
                    </Link>
                </div>
                <div className='flex flex-row ml-auto w-1/4 h-full items-center justify-end'>
                    <div className='flex flex-row w-1/2 h-1/3 justify-end mr-4'>
                        <a className='flex flex-row justify-end' target="_blank" href='https://github.com/ahluwalij/NViz'>
                            <p className='flex text-center items-center justify-center mr-4 text-gray-500 cursor-default'>Made by Jasdeep Ahluwalia</p>
                            <img className='h-full cursor-pointer'
                                src={`${prefix}/images/github.svg`}
                                onMouseOver={event => event.target.src = `${prefix}/images/github-color.svg`}
                                onMouseOut={event => event.target.src = `${prefix}/images/github.svg`}
                            />
                        </a>
                    </div>
                </div>
            </div>


            <div className="flex flex-col w-full h-full bg-gray-900">
                <div className='flex flex-col mt-24 text-white justify-center items-center'>
                    <div className="flex items-center justify-center mb-8">
                        <h1 className="text-white text-4xl underline">Training Data Format</h1>
                    </div>
                    <div className="flex flex-col w-1/2 mb-12">
                        <p className="text-xl mb-8">The training data you upload must be in the format of a JSON file with several pairs of input and output vectors stored in an array with key &ldquo;data&rdquo;. 
                        <strong> Outputs must be normalized</strong> (scaled 0-1).</p>
                        <div className="rounded-2xl overflow-hidden px-4 bg-[#282B2E] mb-4">
                            <CodeBlock
                                text={exampleTrainingObj}
                                language="json"
                                showLineNumbers="true"
                                theme={obsidian}
                            />
                        </div>
                        <p className="text-xl">Several sample datasets can be found on the <a href="https://github.com/ahluwalij/NViz/tree/master/datasets" target="_blank">GitHub repository.</a></p> 
                    </div>
                    <div className="flex items-center justify-center mb-8">
                        <h1 className="text-white text-4xl underline">Input Format</h1>
                    </div>
                    <div className="flex flex-col w-1/2 mb-16">
                        <p className="text-xl mb-8">The input data you upload for prediction testing must be in the format of a JSON file with several input arrays 
                            (each of the size corresponding to your network's architecture) stored in an array with key &ldquo;inputs&rdquo;.</p>
                        <div className="rounded-2xl overflow-hidden px-4 bg-[#282B2E] mb-4">
                            <CodeBlock
                                text={exampleInputObj}
                                language="json"
                                showLineNumbers="true"
                                theme={obsidian}
                            />
                        </div>
                        <p className="text-xl">Sample input files for each of the sample training datasets can also be found on the <a href="https://github.com/ahluwalij/NViz/tree/master/datasets" target="_blank">GitHub repository.</a></p> 
                    </div>
                </div>
            </div>
        </div>
    );
}