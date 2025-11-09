import {useEffect, useState} from 'react';
import { FilesetResolver, FaceLandmarker, HandLandmarker } from '@mediapipe/tasks-vision';

export function useVisionModels(){
    const [models, setModels] = useState<{face: FaceLandmarker|null, hand: HandLandmarker|null}>({face: null, hand: null});

    useEffect(()=>{
        let cancelled = false;
        (async ()=>{
            try{
                const resolver = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.11/wasm");
                const face = await FaceLandmarker.createFromOptions(resolver, {
                    baseOptions: {modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"},
                    runningMode: "VIDEO", numfaces: 1,
                });
                const hand = await HandLandmarker.createFromOptions(resolver, {
                    baseOptions: {modelAssetPath:"https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task" },
                    runningMode: "VIDEO", numHands: 2,
                });
                if(!cancelled) setModels({face, hand});
            }catch{
                if(!cancelled) setModels({face: null, hand: null});
            }
        })();
        return () =>{
            cancelled = true;
            try{models.face?.close?.();} catch{}
            try{models.hand?.close?.();} catch{}
        };
    },[])
    return models;
}