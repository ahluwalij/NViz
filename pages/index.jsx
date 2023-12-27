import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import ReactFlow, { addEdge, Background, Controls } from "react-flow-renderer";
import linspace from "exact-linspace";
import chroma from "chroma-js";
import prefix from "../utils/prefix";
import LayerList from "../components/LayerList";
import FlowInputNode from "../components/FlowInputNode";
import FlowBiasNode from "../components/FlowBiasNode";
import FlowOutputNode from "../components/FlowOutputNode";
import FlowLayerNode from "../components/FlowLayerNode";
import ErrorModal from "../components/ErrorModal";
import { MessageCode, ReturnCode } from "../public/codes";

const learningRateLimits = [0.01, 0.5];
const trainingSpeedLimits = [1, 100000];

const colorScale = chroma.scale(["#f00", "#0f0"]);

export default function Index() {
  const [learningRate, setLearningRate] = useState(0.1);
  const [trainingSpeed, setTrainingSpeed] = useState(100000);
  const [layerList, setLayerList] = useState([3, 2, 5, 3, 1]);
  const [elementList, setElementList] = useState();
  const [epochs, setEpochs] = useState(0);
  const [error, setError] = useState(0.0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCode, setModalCode] = useState();
  const [predictable, setPredictable] = useState(false);
  const [predicted, setPredicted] = useState(false);
  const [outputsDownloadURL, setOutputsDownloadURL] = useState();
  const [weightsDownloadURL, setWeightsDownloadURL] = useState();
  const [weightsDownloadable, setWeightsDownloadable] = useState(false);
  const [trainingState, setTrainingState] = useState(false);

  const nodeList = useRef();
  const nodeMatrix = useRef();
  const textLearningRate = useRef();
  const textTrainingSpeed = useRef();

  const worker = useRef(null);

  useEffect(() => {
    worker.current = new Worker(`${prefix}/worker.js`);
    worker.current.addEventListener("message", (message) => {
      switch (message.data.code) {
        case ReturnCode.ModuleReady:
          worker.current.postMessage({
            code: MessageCode.LayersSet,
            layers: layerList,
          });

          worker.current.postMessage({
            code: MessageCode.ValuesUpdate,
            learningRate: learningRate,
            trainingSpeed: trainingSpeed,
          });
          return;
        case ReturnCode.StartSuccess:
          setTrainingState(true);
          setWeightsDownloadable(true);
          return;
        case ReturnCode.StoppedTraining:
          if (message.data.weights) {
            updateWeights(message.data.weights, false);
            const weightsObject = { weights: message.data.weights },
              weightsBlob = new Blob([JSON.stringify(weightsObject, null, 4)], {
                type: "application/json",
              });
            setWeightsDownloadURL(URL.createObjectURL(weightsBlob));
          }
          setTrainingState(false);
          return;
        case ReturnCode.TrainingUpdate:
          if (message.data.weights) {
            setEpochs(message.data.epochs);
            setError(message.data.error);
            updateWeights(message.data.weights, true);
          }
          return;
        case ReturnCode.InputUploadSuccess:
          setPredictable(true);
          return;
        case ReturnCode.JSONSuccess:
          return;
        case ReturnCode.PredictionSuccess:
          setPredicted(true);
          const outputFile = new Blob(
            [JSON.stringify(message.data.outputs, null, 4)],
            { type: "application/json" }
          );
          setOutputsDownloadURL(URL.createObjectURL(outputFile));
          return;
        case ReturnCode.InvalidInputJSONFormat:
        case ReturnCode.InputFileEntrySizeError:
        case ReturnCode.InputFileFormatError:
        case ReturnCode.InputFileNumberError:
          setPredictable(false);
        default:
          setModalCode(message.data.code);
          setModalOpen(true);
          return;
      }
    });
  }, []);

  useEffect(() => {
    if (layerList.includes(0)) return;

    const layersWithBias = [layerList[0] + 1, ...layerList.slice(1)];
    const maxLayer = Math.max(...layersWithBias);

    const newNodes = [];
    const newNodeMatrix = [];
    let newEdges = [];

    let xCord = 100;
    let xDist = Math.min(Math.max(250, maxLayer * 40), 600);
    let nodeId = 1;
    for (const [layerIndex, layerCount] of layersWithBias.entries()) {
      newNodeMatrix.push([]);
      if (layerIndex == 0) {
        const space = linspace(0, maxLayer * 100, layerCount + 2);
        for (let i = 1; i < space.length - 2; i++) {
          newNodes.push({
            id: nodeId.toString(),
            type: "inputNode",
            draggable: false,
            position: { x: xCord, y: space[i] },
          });
          newNodeMatrix[newNodeMatrix.length - 1].push(nodeId++);
        }

        newNodes.push({
          id: nodeId.toString(),
          type: "biasNode",
          draggable: false,
          position: { x: xCord, y: space[space.length - 2] },
        });
        newNodeMatrix[newNodeMatrix.length - 1].push(nodeId++);
        xCord += xDist;
      } else if (layerIndex != layerList.length - 1) {
        const space = linspace(0, maxLayer * 100, layerCount + 2);
        for (let i = 1; i < space.length - 1; i++) {
          newNodes.push({
            id: nodeId.toString(),
            type: "layerNode",
            draggable: false,
            position: { x: xCord, y: space[i] },
          });
          newNodeMatrix[newNodeMatrix.length - 1].push(nodeId++);
        }

        xCord += xDist;
      } else {
        const space = linspace(0, maxLayer * 100, layerCount + 2);
        for (let i = 1; i < space.length - 1; i++) {
          newNodes.push({
            id: nodeId.toString(),
            type: "outputNode",
            draggable: false,
            position: { x: xCord, y: space[i] },
          });
          newNodeMatrix[newNodeMatrix.length - 1].push(nodeId++);
        }
      }
    }

    let edgeCount = 0;
    for (let i = 0; i < newNodeMatrix.length - 1; i++) {
      for (let j = 0; j < newNodeMatrix[i].length; j++) {
        for (let k = 0; k < newNodeMatrix[i + 1].length; k++) {
          newEdges = addEdge(
            {
              id: edgeCount.toString(),
              type: "straight",
              // animated: true,
              source: newNodeMatrix[i][j].toString(),
              target: newNodeMatrix[i + 1][k].toString(),
              style: { stroke: "#fff" },
            },
            newEdges
          );
          edgeCount++;
        }
      }
    }

    nodeMatrix.current = newNodeMatrix;
    nodeList.current = newNodes;
    setElementList([...newNodes, ...newEdges]);
    worker.current.postMessage({
      code: MessageCode.LayersSet,
      layers: layerList,
    });
  }, [layerList]);

  useEffect(() => {
    worker.current.postMessage({
      code: MessageCode.ValuesUpdate,
      learningRate: learningRate,
      trainingSpeed: trainingSpeed,
    });
  }, [learningRate, trainingSpeed, learningRate]);

  const updateWeights = (weights, running) => {
    const flattenedweights = weights.flat(Infinity),
      maxWeight = Math.max(...flattenedweights),
      minWeight = Math.min(...flattenedweights),
      scale = maxWeight - minWeight;

    const newEdges = [];
    let edgeId = 0;

    for (let i = 0; i < weights.length; i++) {
      for (let j = 0; j < weights[i].length; j++) {
        for (let k = 0; k < weights[i][j].length; k++) {
          newEdges = addEdge(
            {
              id: edgeId.toString(),
              type: "straight",
              animated: running,
              source: nodeMatrix.current[i][k].toString(),
              target: nodeMatrix.current[i + 1][j].toString(),
              style: {
                stroke: colorScale(
                  (weights[i][j][k] - minWeight) / scale
                ).toString(),
              },
            },
            newEdges
          );
          edgeId++;
        }
      }
    }

    setElementList([...nodeList.current, ...newEdges]);
  };

  const onTrainingUpload = async (fileList) => {
    const latestFile = fileList[fileList.length - 1];

    if (latestFile.type !== "application/json") {
      setModalCode(ReturnCode.JSONFormatError);
      setModalOpen(true);
      return;
    }

    const reader = new FileReader();
    reader.readAsText(latestFile);
    reader.addEventListener("load", async (event) => {
      const dataAsJson = JSON.parse(event.target.result);
      if (!dataAsJson?.data?.length) {
        setModalCode(ReturnCode.JSONFormatError);
        setModalOpen(true);
        return;
      }
      worker.current.postMessage({
        code: MessageCode.TrainingUpload,
        file: dataAsJson,
      });
    });
  };

  const onInputUpload = async (fileList) => {
    setPredicted(false);
    const uploadedFile = fileList[0];
    if (uploadedFile.type !== "application/json") {
      setPredictable(false);
      setModalCode(ReturnCode.InputFileFormatError);
      setModalOpen(true);
      return;
    }

    const reader = new FileReader();
    reader.readAsText(uploadedFile);
    reader.addEventListener("load", async (event) => {
      const dataAsJson = JSON.parse(event.target.result);
      if (!dataAsJson?.inputs?.length) {
        setPredictable(false);
        setModalCode(ReturnCode.InvalidInputJSONFormat);
        setModalOpen(true);
        return;
      }
      worker.current.postMessage({
        code: MessageCode.InputUpload,
        file: dataAsJson,
      });
    });
  };

  const setLearningRateSlider = (newRate) => {
    setLearningRate(Number.parseFloat(newRate));
    textLearningRate.current.value = newRate;
  };

  const setTrainingSpeedSlider = (newSpeed) => {
    setTrainingSpeed(Number.parseInt(newSpeed));
    textTrainingSpeed.current.value = newSpeed;
  };

  const validateLearningRate = (newRate) => {
    const newRateNum = Number.parseFloat(newRate);
    if (
      Number.isFinite(newRateNum) &&
      newRateNum <= learningRateLimits[1] &&
      newRateNum >= learningRateLimits[0]
    ) {
      setLearningRate(newRateNum);
      textLearningRate.current.value = newRateNum;
    } else {
      textLearningRate.current.value = learningRate;
    }
  };

  const validateTrainingSpeed = (newSpeed) => {
    const newSpeedNum = Number.parseFloat(newSpeed);
    if (
      Number.isInteger(newSpeedNum) &&
      newSpeedNum <= trainingSpeedLimits[1] &&
      newSpeedNum >= trainingSpeedLimits[0]
    ) {
      setTrainingSpeed(newSpeedNum);
      textTrainingSpeed.current.value = newSpeedNum;
    } else {
      textTrainingSpeed.current.value = trainingSpeed;
    }
  };

  const startTraining = () => {
    worker.current.postMessage({ code: MessageCode.StartTraining });
  };

  const stopTraining = () => {
    worker.current.postMessage({ code: MessageCode.StopTraining });
  };

  const onModalClose = () => {
    setModalOpen(false);
  };

  const runPrediction = () => {
    worker.current.postMessage({ code: MessageCode.RunPrediction });
  };

  return (
    <div className="site flex flex-col h-screen w-screen font-vietnam">
      <Head>
        <link rel="shortcut icon" href={`${prefix}/images/favicon.ico`} />
        <title>NViz | Home</title>
      </Head>

      <ErrorModal
        open={modalOpen}
        onClose={onModalClose}
        error={modalCode}
      ></ErrorModal>

      {/* Top Navigation Bar - Restyled for Mobile */}
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
                    <div className='flex flex-row w-fit h-1/3 justify-end mr-4'>
                        <a className='flex flex-row justify-end' target="_blank" href='https://github.com/ahluwalij/NViz'>
                            <p className='flex text-center items-center text-left justify-center mr-4 text-gray-500 cursor-default'>Made by Jasdeep Ahluwalia</p>
                            <img className='h-full cursor-pointer'
                                src={`${prefix}/images/github.svg`}
                                onMouseOver={event => event.target.src = `${prefix}/images/github-color.svg`}
                                onMouseOut={event => event.target.src = `${prefix}/images/github.svg`}
                            />
                        </a>
                    </div>
                </div>
            </div>
      {/* Main Content - Adjusted for mobile visibility */}
      <div className="flex flex-col md:flex-row w-full bg-gray-900 items-center border-y-2 border-teal-900 overflow-auto md:overflow-y-hidden py-4">
        {/* Training Data Section */}
        <div className="w-full md:w-1/6 flex flex-col shrink p-2">
          <label className="uppercase text-teal-600 text-sm mb-2">
            Training Data
          </label>
          <input
            type="file"
            className="text-sm p-2 rounded text-white hover:cursor-pointer"
            onChange={(event) => onTrainingUpload(event.target.files)}
            accept="application/json"
            disabled={trainingState}
          ></input>
        </div>

        {/* Layers Section */}
        <div className="w-full flex flex-col min-w-max p-4 mb-4 md:mb-0">
          <p className="uppercase text-teal-600 text-sm mb-2">Layers</p>
          <div className="flex flex-col">
            {/* LayerList component adjusted for balance */}
            <LayerList
              className="flex flex-col"
              inputs={layerList[0]}
              outputs={layerList[layerList.length - 1]}
              layers={layerList.slice(1, layerList.length - 1)}
              onLayersSet={setLayerList}
              editable={!trainingState}
            ></LayerList>
          </div>
        </div>

        {/* Learning Rate & Training Speed Section */}
        <div className="flex w-full md:min-w-fit h-full justify-center shrink p-4 mb-4 md:mb-0">
          <div className="flex flex-col h-full justify-center w-full text-white">
            <label className="uppercase text-teal-600 text-sm mb-2">
              Learning Rate
            </label>
            <div className="flex flex-row mb-2">
              <input
                type="range"
                className="range range-accent w-5/6"
                max={learningRateLimits[1]}
                min={learningRateLimits[0]}
                onChange={(event) => setLearningRateSlider(event.target.value)}
                step={0.001}
                value={learningRate}
              ></input>
              <input
                type="text"
                className="ml-4 w-8 bg-transparent text-sm p-1"
                defaultValue={learningRate}
                ref={textLearningRate}
                onBlur={(event) => validateLearningRate(event.target.value)}
              ></input>
            </div>

            <label className="uppercase text-teal-600 text-sm mb-2">
              Training Speed
            </label>
            <div className="flex flex-row mb-2">
              <input
                type="range"
                className="range range-accent w-3/5"
                max={trainingSpeedLimits[1]}
                min={trainingSpeedLimits[0]}
                onChange={(event) => setTrainingSpeedSlider(event.target.value)}
                value={trainingSpeed}
              ></input>
              <input
                type="text"
                className="ml-4 w-16 bg-transparent text-sm p-1"
                defaultValue={trainingSpeed}
                ref={textTrainingSpeed}
                onBlur={(event) => validateTrainingSpeed(event.target.value)}
              ></input>
            </div>
          </div>
        </div>

        {/* Train and Stop Buttons Section */}
        <div className="flex w-full max-w-[10rem] md:min-w-fit items-center justify-center shrink p-4">
          {!trainingState && (
            <button
              className="w-full h-3/5 border-teal-500 border-2 min-h-12 rounded-2xl text-center text-white hover:bg-teal-500 hover:text-gray-800 cursor-pointer p-2"
              onClick={startTraining}
            >
              <p className="text-lg md:text-2xl">TRAIN</p>
            </button>
          )}

          {trainingState && (
            <button
              className="w-full md:min-w-fit h-3/5 border-red-500 border-2 rounded-2xl text-center text-white hover:bg-red-500 cursor-pointer p-2"
              onClick={stopTraining}
            >
              <p className="text-lg md:text-2xl">STOP</p>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row h-full relative overflow-auto">
        <div className="w-full md:w-5/6 h-full p-2">
          {/* ReactFlow component adjusted for height and scrolling */}
          <ReactFlow
            className="flex bg-gray-900 h-full w-full"
            elements={elementList}
            minZoom={0.1}
            nodeTypes={{
              inputNode: FlowInputNode,
              biasNode: FlowBiasNode,
              outputNode: FlowOutputNode,
              layerNode: FlowLayerNode,
            }}
          >
            <Background color="#fff" />
            <Controls />
          </ReactFlow>
        </div>

        <div className="w-full md:w-1/6 h-full bg-gray-900 border-t-0 flex flex-col text-white p-4 overflow-auto">
          {/* Right Sidebar - Improved spacing and layout for mobile */}

          <div className="flex flex-col mb-4">
            <div className="text-xl mb-3">
              <p className="mb-2">Epochs: {epochs}</p>
              <p>
                Error: <span className="text-sm">{error}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col mb-4">
            <p className="uppercase text-teal-600 mb-2">Input File</p>
            <input
              type="file"
              className="text-sm p-2 rounded"
              onChange={(event) => onInputUpload(event.target.files)}
              accept="application/json"
            />
          </div>

          <div className="flex flex-col mb-4">
            {!trainingState && predictable && (
              <button
                className="text-sm py-2 px-4 border-teal-500 border-2 rounded-xl uppercase hover:bg-teal-500 hover:text-gray-800 w-full"
                onClick={runPrediction}
              >
                Predict
              </button>
            )}
            {(trainingState || !predictable) && (
              <button
                className="text-sm py-4 px-4 border-teal-500 border-2 rounded-xl uppercase cursor-not-allowed w-full"
                title={
                  !predictable
                    ? "Upload input file to make predictions"
                    : "Cannot run during training"
                }
              >
                Predict
              </button>
            )}
            <p
              className="text-green-500 mt-2 text-sm break-words"
              hidden={!predicted}
            >
              Success. Download outputs below.
            </p>
          </div>

          {!trainingState && (
            <div className="flex flex-col space-y-3 mb-4">
              {predicted && (
                <a
                  className="py-2 px-4 border-teal-500 border-2 rounded-xl uppercase hover:bg-teal-500 hover:text-gray-800 w-full flex justify-center items-center"
                  href={outputsDownloadURL}
                  download
                >
                  Download Outputs
                </a>
              )}
              {!predicted && (
                <button
                  className="py-2 px-4 border-teal-500 border-2 rounded-xl uppercase cursor-not-allowed w-full"
                  title="Upload input file and run prediction to download"
                >
                  Download Outputs
                </button>
              )}
              {weightsDownloadable && (
                <a
                  className="py-2 px-4 border-teal-500 border-2 rounded-xl uppercase hover:bg-teal-500 hover:text-gray-800 w-full flex justify-center items-center"
                  href={weightsDownloadURL}
                  download
                >
                  Download Model Weights
                </a>
              )}
              {!weightsDownloadable && (
                <button
                  className="py-2 px-4 border-teal-500 border-2 rounded-xl uppercase cursor-not-allowed w-full"
                  title="Cannot download before training"
                >
                  Download Model Weights
                </button>
              )}
            </div>
          )}

          {trainingState && (
            <div className="flex flex-col space-y-3">
              <button
                className="py-2 px-4 border-teal-500 border-2 rounded-xl uppercase cursor-not-allowed w-full"
                title="Cannot download during training"
              >
                Download Outputs
              </button>
              <button
                className="py-2 px-4 border-teal-500 border-2 rounded-xl uppercase cursor-not-allowed w-full"
                title="Cannot download during training"
              >
                Download Model Weights
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
